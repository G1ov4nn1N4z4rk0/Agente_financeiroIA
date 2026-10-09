"""Módulo de integração com o Agente Financeiro existente no Azure AI.

Utiliza DefaultAzureCredential e AIProjectClient da biblioteca azure-ai-projects,
conforme o padrão oficial recomendado para agentes existentes.
"""

import os
import logging
import threading
from typing import Dict, Optional, Tuple
from dotenv import load_dotenv

from azure.identity import DefaultAzureCredential
from azure.core.exceptions import ClientAuthenticationError, HttpResponseError, ResourceNotFoundError
from azure.ai.projects import AIProjectClient

# Carrega variáveis de ambiente se disponíveis
load_dotenv()

logger = logging.getLogger("azure_agent")
logger.setLevel(logging.INFO)
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] %(name)s: %(message)s"
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)


class AzureAgentManager:
    """Gerencia a conexão com o Azure AI Project Client e as sessões de conversas."""

    def __init__(
        self,
        endpoint: Optional[str] = None,
        agent_name: Optional[str] = None,
    ):
        self.endpoint = (
            endpoint
            or os.getenv("AZURE_AI_PROJECT_ENDPOINT")
            or "https://aula-agente-lucas-resource.services.ai.azure.com/api/projects/aula-agente-lucas"
        )
        self.agent_name = (
            agent_name
            or os.getenv("AZURE_AI_AGENT_NAME")
            or "giovanni01-agente"
        )

        self._credential: Optional[DefaultAzureCredential] = None
        self._project_client: Optional[AIProjectClient] = None
        self._openai_client = None

        # Mapeamento em memória de session_id -> conversation_id do Azure
        self._sessions: Dict[str, str] = {}
        self._lock = threading.Lock()

        logger.info(
            f"Inicializando AzureAgentManager para agente '{self.agent_name}' "
            f"no endpoint '{self.endpoint}'"
        )

    def _ensure_client(self):
        """Garante que a credencial e o cliente do Azure estejam instanciados."""
        if self._openai_client is not None:
            return

        with self._lock:
            if self._openai_client is not None:
                return

            try:
                logger.info("Autenticando via DefaultAzureCredential...")
                self._credential = DefaultAzureCredential()
                self._project_client = AIProjectClient(
                    endpoint=self.endpoint,
                    credential=self._credential,
                    allow_preview=True,
                )
                logger.info(f"Obtendo cliente OpenAI para o agente '{self.agent_name}'...")
                self._openai_client = self._project_client.get_openai_client(
                    agent_name=self.agent_name
                )
                logger.info("Cliente OpenAI do agente conectado com sucesso.")
            except ClientAuthenticationError as auth_err:
                logger.error(f"Erro de autenticação no Azure: {auth_err}")
                self._openai_client = None
                raise RuntimeError(
                    "Falha na autenticação do Azure. Certifique-se de executar 'az login' "
                    "no terminal antes de iniciar o servidor."
                ) from auth_err
            except Exception as ex:
                logger.error(f"Erro ao inicializar cliente do Azure: {ex}")
                self._openai_client = None
                raise

    def get_or_create_conversation(self, session_id: str) -> str:
        """Recupera o conversation_id da sessão ou cria uma nova conversa no Azure."""
        self._ensure_client()

        with self._lock:
            if session_id in self._sessions:
                return self._sessions[session_id]

            logger.info(f"Criando nova conversa no Azure para sessão {session_id}...")
            conv = self._openai_client.conversations.create()
            conv_id = conv.id
            self._sessions[session_id] = conv_id
            logger.info(f"Sessão {session_id} mapeada para Azure Conversation ID: {conv_id}")
            return conv_id

    def send_message(self, session_id: str, message: str) -> Tuple[str, str]:
        """Envia mensagem ao agente giovanni01-agente e retorna (resposta, conversation_id)."""
        if not message or not message.strip():
            raise ValueError("A mensagem não pode estar vazia.")

        self._ensure_client()
        conv_id = self.get_or_create_conversation(session_id)

        logger.info(f"[Sessão {session_id}] Enviando mensagem para conversa {conv_id}...")

        try:
            response = self._openai_client.responses.create(
                conversation=conv_id,
                input=[
                    {
                        "role": "user",
                        "content": message.strip(),
                    }
                ],
            )

            # Extrai o texto da resposta do agente
            reply_text = getattr(response, "output_text", None)

            # Fallback caso output_text não venha preenchido diretamente
            if not reply_text and hasattr(response, "output"):
                parts = []
                for item in response.output:
                    # Item do tipo ResponseOutputMessage
                    if getattr(item, "role", "") == "assistant":
                        for content_part in getattr(item, "content", []):
                            txt = getattr(content_part, "text", "")
                            if txt:
                                parts.append(txt)
                if parts:
                    reply_text = "\n".join(parts)

            if not reply_text:
                reply_text = "O agente processou a mensagem, mas não retornou conteúdo textual."

            logger.info(f"[Sessão {session_id}] Resposta recebida com sucesso ({len(reply_text)} caracteres).")
            return reply_text, conv_id

        except ClientAuthenticationError as auth_err:
            logger.error(f"Autenticação expirada ou inválida ao enviar mensagem: {auth_err}")
            raise RuntimeError(
                "Sessão do Azure expirada. Execute 'az login' no terminal para renovar suas credenciais."
            ) from auth_err
        except HttpResponseError as http_err:
            logger.error(f"Erro HTTP do Azure AI ({http_err.status_code}): {http_err.message}")
            if http_err.status_code == 403:
                raise RuntimeError(
                    "Acesso negado (403): Sua conta Azure não possui a função necessária (Azure AI Developer) "
                    "no projeto aula-agente-lucas."
                ) from http_err
            elif http_err.status_code == 404:
                raise RuntimeError(
                    f"Recurso não encontrado (404): Verifique se o agente '{self.agent_name}' ou "
                    "o endpoint do projeto estão corretos."
                ) from http_err
            raise RuntimeError(f"Erro do serviço Azure AI: {http_err.message}") from http_err
        except Exception as ex:
            logger.error(f"Erro inesperado ao consultar o agente: {ex}", exc_info=True)
            raise RuntimeError(f"Erro de comunicação com o Azure AI: {str(ex)}") from ex

    def reset_conversation(self, session_id: str) -> str:
        """Reinicia a conversa da sessão, criando um novo identificador no Azure."""
        self._ensure_client()
        with self._lock:
            logger.info(f"Reiniciando conversa para sessão {session_id}...")
            conv = self._openai_client.conversations.create()
            conv_id = conv.id
            self._sessions[session_id] = conv_id
            logger.info(f"Nova conversa Azure atribuída: {conv_id}")
            return conv_id

    def check_health(self) -> dict:
        """Verifica a saúde da conexão com o Azure AI."""
        try:
            self._ensure_client()
            return {
                "status": "connected",
                "agent_name": self.agent_name,
                "endpoint": self.endpoint,
                "active_sessions_count": len(self._sessions),
            }
        except Exception as e:
            return {
                "status": "error",
                "agent_name": self.agent_name,
                "endpoint": self.endpoint,
                "error": str(e),
                "active_sessions_count": len(self._sessions),
            }


# Instância global reutilizável
agent_manager = AzureAgentManager()

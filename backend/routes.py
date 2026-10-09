"""Rotas da API FastAPI para o chat com o agente financeiro."""

from datetime import datetime
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from .azure_agent import agent_manager

router = APIRouter(prefix="/api", tags=["Chat & Agente"])


class ChatMessageRequest(BaseModel):
    session_id: str = Field(..., description="ID exclusivo da sessão do usuário")
    message: str = Field(..., min_length=1, description="Texto da mensagem enviada pelo usuário")


class ChatMessageResponse(BaseModel):
    success: bool
    reply: str
    conversation_id: str
    session_id: str
    timestamp: str


class ResetSessionRequest(BaseModel):
    session_id: str = Field(..., description="ID da sessão a ser reiniciada")


class ResetSessionResponse(BaseModel):
    success: bool
    message: str
    session_id: str
    conversation_id: str


@router.post("/chat", response_model=ChatMessageResponse)
async def chat_endpoint(payload: ChatMessageRequest):
    """Envia uma mensagem para o agente financeiro no Azure AI e retorna a resposta."""
    clean_message = payload.message.strip()
    if not clean_message:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A mensagem não pode estar vazia.",
        )

    try:
        reply_text, conversation_id = agent_manager.send_message(
            session_id=payload.session_id,
            message=clean_message,
        )

        return ChatMessageResponse(
            success=True,
            reply=reply_text,
            conversation_id=conversation_id,
            session_id=payload.session_id,
            timestamp=datetime.now().strftime("%H:%M"),
        )
    except RuntimeError as r_err:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(r_err),
        )
    except Exception as ex:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro interno no processamento: {str(ex)}",
        )


@router.post("/chat/reset", response_model=ResetSessionResponse)
async def reset_chat_endpoint(payload: ResetSessionRequest):
    """Reinicia a conversa do usuário, gerando uma nova conversa no Azure AI."""
    try:
        new_conv_id = agent_manager.reset_conversation(payload.session_id)
        return ResetSessionResponse(
            success=True,
            message="Conversa reiniciada com sucesso. Uma nova sessão do Azure AI foi aberta.",
            session_id=payload.session_id,
            conversation_id=new_conv_id,
        )
    except Exception as ex:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Não foi possível reiniciar a conversa: {str(ex)}",
        )


@router.get("/status")
async def status_endpoint():
    """Retorna o status atual da conexão com o agente no Azure AI."""
    health = agent_manager.check_health()
    return health


@router.get("/health")
async def health_check():
    """Health check simples para monitoramento da API."""
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

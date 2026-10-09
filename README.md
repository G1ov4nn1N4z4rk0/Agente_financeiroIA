# 📱 Plataforma WhatsApp Web — Agente Financeiro Azure AI

Interface web que simula o visual e a experiência do **WhatsApp Web**, conectada em tempo real ao agente financeiro oficial **`giovanni01-agente`** hospedado no **Azure AI Foundry / Azure AI Studio**.

---

## 🏗️ Estrutura do Projeto

```text
agente-financeiro/
├── backend/
│   ├── app.py              # Inicialização do FastAPI e servidor de arquivos estáticos
│   ├── azure_agent.py      # Gerenciador do Azure AI (DefaultAzureCredential, sessões e chamadas)
│   ├── routes.py           # Endpoints da API REST (/api/chat, /api/chat/reset, /api/status)
│   ├── requirements.txt    # Dependências do backend Python
│   ├── .env                # Variáveis de ambiente configuradas
│   └── .env.example        # Modelo de configuração de ambiente
├── frontend/
│   ├── index.html          # Interface visual no estilo WhatsApp Web
│   ├── css/
│   │   └── style.css       # Estilos, balões de conversa, responsividade e layout
│   ├── js/
│   │   └── script.js       # Controle de mensagens, digitação, sessão e chamadas assíncronas
│   └── assets/
│       ├── avatar.svg      # Avatar oficial do Assistente Financeiro
│       └── user.svg        # Avatar do usuário
├── .gitignore
└── README.md
```

---

## 🚀 Como Executar o Projeto Passo a Passo

### 1. Pré-requisitos
- **Python 3.10 ou superior** instalado.
- **Azure CLI (`az`)** instalado.

---

### 2. Autenticação no Azure CLI
O backend utiliza `DefaultAzureCredential()`, que herda a autenticação local da sua conta no Azure CLI.

Abra o terminal (PowerShell ou Prompt de Comando) e execute:

```powershell
az login
```

Uma janela do navegador será aberta para você selecionar ou fazer login na sua conta da Microsoft/Azure associada ao projeto.

Para confirmar que sua conta está ativa:
```powershell
az account show
```

> **Importante:** A conta autenticada precisa ter permissão no recurso do Azure AI (função `Azure AI Developer` ou `Cognitive Services OpenAI User`).

---

### 3. Acessar o Diretório do Projeto

No PowerShell:

```powershell
cd C:\Users\50932630871\.gemini\antigravity\scratch\agente-financeiro
```

---

### 4. Ativar o Ambiente Virtual e Instalar Dependências

Se o ambiente virtual ainda não estiver criado:
```powershell
python -m venv .venv
```

Ative o ambiente virtual:
```powershell
.\.venv\Scripts\Activate.ps1
```

Instale as dependências:
```powershell
pip install -r backend/requirements.txt
```

---

### 5. Iniciar o Servidor Backend

Com o ambiente virtual ativado, execute:

```powershell
python backend/app.py
```

Você verá a seguinte mensagem de confirmação no terminal:

```text
=======================================================
🚀 Iniciando Servidor WhatsApp Web - Agente Azure AI
📡 Backend & Frontend disponíveis em: http://localhost:8000
📑 Documentação Swagger em: http://localhost:8000/docs
=======================================================
```

---

### 6. Acessar no Navegador

Abra seu navegador (Google Chrome, Edge, etc.) e acesse:

👉 **[http://localhost:8000](http://localhost:8000)**

---

## 💬 Como Demonstrar na Apresentação Acadêmica

1. **Mensagem Inicial:**  
   Ao carregar a página, a interface exibirá o contato **Assistente Financeiro IA** e a mensagem de boas-vindas.
2. **Definir Identificação e Orçamento:**  
   Digite no campo de mensagem:  
   > *"Meu nome é Lucas e meu orçamento mensal é de 3000 reais."*  
   Pressione **Enter** ou clique no botão de envio.
3. **Indicador de Digitação:**  
   Observe a animação de três pontos verdes/cinzas (*"Assistente financeiro digitando..."*) enquanto a requisição é processada no Azure AI.
4. **Memória de Conversa (Multi-turn):**  
   Envie um gasto:  
   > *"Hoje gastei 80 reais no supermercado. Quanto ainda me resta?"*  
   O agente responderá utilizando o histórico da conversa, subtraindo o gasto do orçamento anterior e mostrando o saldo restante.
5. **Botão Nova Conversa:**  
   Clique no botão **"Nova Conversa"** no topo ou na barra lateral para reiniciar o atendimento. Uma nova conversa será gerada no Azure mantendo a interface limpa.
6. **Diagnóstico da Conexão:**  
   Clique no ícone de informação `(i)` no cabeçalho para abrir o modal de diagnóstico e comprovar o Endpoint e o `Conversation ID` gerados pelo Azure AI.

---

## 🛠️ Diagnóstico de Problemas Comuns (Troubleshooting)

| Sintoma / Erro | Causa Provável | Solução |
| :--- | :--- | :--- |
| **Status "Desconectado" ou erro 401** | Sessão do Azure CLI expirada ou não logada | Execute `az login` no terminal e reinicie o servidor. |
| **Erro 403 Forbidden** | Falta de papel RBAC no Azure AI Foundry | Solicite ao administrador do Azure a atribuição da função `Azure AI Developer` ou `Cognitive Services OpenAI User`. |
| **Erro de porta em uso (8000)** | Outro processo está utilizando a porta 8000 | Altere a variável `PORT=8080` no arquivo `backend/.env` ou encerre o processo anterior. |
| **Módulos não encontrados** | Dependências instaladas fora do `.venv` | Certifique-se de ativar o ambiente virtual com `.\.venv\Scripts\Activate.ps1` antes de executar `python backend/app.py`. |

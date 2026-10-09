/**
 * WhatsApp Web - Cliente Frontend para Agente Financeiro Azure AI
 * Gerenciamento de Sessão, Envio/Recebimento de Mensagens e Diagnóstico
 */

(function () {
  'use strict';

  // Configuração da Sessão
  const STORAGE_KEY = 'wa_azure_session_id';
  let sessionId = localStorage.getItem(STORAGE_KEY);
  if (!sessionId) {
    sessionId = 'sess_' + (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2, 5));
    localStorage.setItem(STORAGE_KEY, sessionId);
  }

  let conversationId = null;
  let isSending = false;

  // Elementos do DOM
  const messageInput = document.getElementById('message-input');
  const btnSend = document.getElementById('btn-send');
  const messagesFlow = document.getElementById('messages-flow');
  const messagesContainer = document.getElementById('messages-container');
  const typingIndicator = document.getElementById('typing-indicator');
  const chatStatusSubtitle = document.getElementById('chat-status-subtitle');
  const sidebarPreview = document.getElementById('sidebar-preview');
  const sidebarLastTime = document.getElementById('sidebar-last-time');
  const btnResetChat = document.getElementById('btn-reset-chat');
  const btnSidebarReset = document.getElementById('btn-sidebar-reset');

  // Status e Diagnóstico
  const azureDot = document.getElementById('azure-dot');
  const azureStatusText = document.getElementById('azure-status-text');
  const azureAgentNameDisplay = document.getElementById('azure-agent-name-display');
  const btnCheckStatus = document.getElementById('btn-check-status');

  // Modal
  const diagModal = document.getElementById('diag-modal');
  const btnInfo = document.getElementById('btn-info');
  const btnHeaderInfo = document.getElementById('btn-header-info');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnModalOk = document.getElementById('btn-modal-ok');
  const btnRefreshDiag = document.getElementById('btn-refresh-diag');
  const modalSessionId = document.getElementById('modal-session-id');
  const modalConversationId = document.getElementById('modal-conversation-id');
  const modalStatusBadge = document.getElementById('modal-status-badge');
  const toastContainer = document.getElementById('toast-container');

  // Formatador de Horário (HH:MM)
  function getFormattedTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  // Sanitizador de HTML básico para segurança (anti-XSS)
  function escapeHTML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Renderizador simplificado de Markdown (negrito, itálico, listas, quebras de linha)
  function renderMarkdown(text) {
    if (!text) return '';
    let escaped = escapeHTML(text);

    // Negrito: **texto**
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Itálico: *texto* ou _texto_
    escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');
    escaped = escaped.replace(/_(.*?)_/g, '<em>$1</em>');

    // Código em linha: `código`
    escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Listas com marcadores (- item ou * item)
    const lines = escaped.split('\n');
    let inList = false;
    let formattedLines = [];

    for (let line of lines) {
      const matchBullet = line.match(/^(\s*)[-*]\s+(.*)$/);
      if (matchBullet) {
        if (!inList) {
          formattedLines.push('<ul>');
          inList = true;
        }
        formattedLines.push(`<li>${matchBullet[2]}</li>`);
      } else {
        if (inList) {
          formattedLines.push('</ul>');
          inList = false;
        }
        formattedLines.push(line);
      }
    }
    if (inList) {
      formattedLines.push('</ul>');
    }

    let finalHtml = formattedLines.join('<br>');
    // Limpa <br> redundantes ao redor de <ul> e </ul>
    finalHtml = finalHtml.replace(/<br>\s*<ul>/g, '<ul>');
    finalHtml = finalHtml.replace(/<\/ul>\s*<br>/g, '</ul>');
    finalHtml = finalHtml.replace(/(<br>){3,}/g, '<br><br>');

    return finalHtml;
  }

  // Rolar para a última mensagem com suavidade
  function scrollToBottom() {
    setTimeout(() => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 50);
  }

  // Exibe notificação Toast
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }

  // Cria bolha de mensagem enviada pelo Usuário
  function appendUserMessage(text) {
    const time = getFormattedTime();
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble outgoing';
    bubble.innerHTML = `
      <div class="bubble-content">
        <div class="message-text">${escapeHTML(text).replace(/\n/g, '<br>')}</div>
        <div class="message-time">
          ${time}
          <span class="double-check" title="Entregue e lida">
            <svg viewBox="0 0 16 15" width="16" height="15" fill="currentColor">
              <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>
            </svg>
          </span>
        </div>
      </div>
    `;
    messagesFlow.appendChild(bubble);

    // Atualiza preview na barra lateral
    sidebarPreview.textContent = text;
    sidebarLastTime.textContent = time;

    scrollToBottom();
  }

  // Cria bolha de resposta recebida do Agente Azure AI
  function appendAgentMessage(markdownText, timeStr = null) {
    const time = timeStr || getFormattedTime();
    const formattedHtml = renderMarkdown(markdownText);
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble incoming';
    bubble.innerHTML = `
      <div class="bubble-content">
        <div class="sender-name">Assistente Financeiro IA</div>
        <div class="message-text">${formattedHtml}</div>
        <div class="message-time">${time}</div>
      </div>
    `;
    messagesFlow.appendChild(bubble);

    // Atualiza preview na barra lateral
    sidebarPreview.textContent = markdownText.replace(/[*_#`]/g, '').trim().slice(0, 60) + '...';
    sidebarLastTime.textContent = time;

    scrollToBottom();
  }

  // Cria bolha de aviso de sistema ou erro
  function appendSystemBanner(text, isError = false) {
    const banner = document.createElement('div');
    banner.className = 'encryption-notice';
    if (isError) {
      banner.style.backgroundColor = '#ffebee';
      banner.style.color = '#c62828';
      banner.style.border = '1px solid #ffcdd2';
    }
    banner.innerHTML = `<span>${text}</span>`;
    messagesFlow.appendChild(banner);
    scrollToBottom();
  }

  // Envia mensagem para o backend
  async function sendMessage() {
    const rawText = messageInput.value.trim();
    if (!rawText || isSending) return;

    isSending = true;
    messageInput.value = '';
    messageInput.style.height = 'auto';
    btnSend.classList.remove('active');

    // 1. Adiciona a mensagem do usuário na tela
    appendUserMessage(rawText);

    // 2. Ativa indicador de digitação visual
    typingIndicator.style.display = 'block';
    chatStatusSubtitle.textContent = 'digitando...';
    scrollToBottom();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: rawText,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.detail || 'Falha ao contatar o Azure AI.';
        appendSystemBanner(`⚠️ Erro: ${errorMsg}`, true);
        showToast(`Erro na integração com Azure AI: ${errorMsg}`, 'error');
      } else {
        conversationId = data.conversation_id;
        modalConversationId.textContent = conversationId;
        appendAgentMessage(data.reply, data.timestamp);
      }
    } catch (err) {
      console.error('Falha de rede ou backend indisponível:', err);
      appendSystemBanner('⚠️ Não foi possível se conectar ao servidor backend. Verifique se o FastAPI está ativo na porta 8000.', true);
      showToast('Backend inacessível. Inicie o servidor Python.', 'error');
    } finally {
      isSending = false;
      typingIndicator.style.display = 'none';
      chatStatusSubtitle.textContent = 'online • Azure AI (giovanni01-agente)';
      messageInput.focus();
    }
  }

  // Reinicia a conversa
  async function resetConversation() {
    const confirmReset = confirm('Deseja iniciar uma nova conversa com o agente financeiro? O histórico anterior será encerrado.');
    if (!confirmReset) return;

    try {
      const response = await fetch('/api/chat/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        conversationId = data.conversation_id;
        modalConversationId.textContent = conversationId;
        messagesFlow.innerHTML = '';
        appendSystemBanner('🔄 Conversa reiniciada com sucesso. Uma nova sessão do Azure AI foi aberta.');
        
        // Mensagem de boas-vindas inicial após reset
        appendAgentMessage(
          'Olá novamente! Reiniciei nossa conversa. Como posso ajudar com suas finanças hoje?\n\n' +
          'Para começar, me informe seu nome e qual meta financeira ou orçamento deseja controlar.'
        );
        showToast('Conversa reiniciada com novo Conversation ID no Azure!', 'info');
      } else {
        showToast(`Erro ao reiniciar conversa: ${data.detail || 'Erro no servidor'}`, 'error');
      }
    } catch (err) {
      console.error('Erro ao reiniciar sessão:', err);
      showToast('Erro ao contatar o backend para reiniciar conversa.', 'error');
    }
  }

  // Verifica status da conexão com Azure AI
  async function checkAzureStatus() {
    azureDot.className = 'status-indicator-dot';
    azureStatusText.textContent = 'Verificando Azure...';
    modalStatusBadge.className = 'info-badge';
    modalStatusBadge.textContent = 'Consultando...';

    try {
      const response = await fetch('/api/status');
      const data = await response.json();

      if (response.ok && data.status === 'connected') {
        azureDot.className = 'status-indicator-dot online';
        azureStatusText.textContent = 'Azure AI: Conectado';
        azureAgentNameDisplay.textContent = data.agent_name || 'giovanni01-agente';
        
        modalStatusBadge.className = 'info-badge green';
        modalStatusBadge.textContent = 'Conectado e Autenticado';
      } else {
        azureDot.className = 'status-indicator-dot offline';
        azureStatusText.textContent = 'Azure AI: Desconectado';
        
        modalStatusBadge.className = 'info-badge red';
        modalStatusBadge.textContent = data.error || 'Erro de Autenticação/Permissão';
      }

      modalSessionId.textContent = sessionId;
      if (conversationId) {
        modalConversationId.textContent = conversationId;
      }
    } catch (err) {
      azureDot.className = 'status-indicator-dot offline';
      azureStatusText.textContent = 'Backend Offline';
      modalStatusBadge.className = 'info-badge red';
      modalStatusBadge.textContent = 'Backend indisponível na porta 8000';
    }
  }

  // Event Listeners para Envio de Mensagem
  btnSend.addEventListener('click', sendMessage);

  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Ajuste dinâmico de altura do textarea
  messageInput.addEventListener('input', () => {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
    if (messageInput.value.trim().length > 0) {
      btnSend.classList.add('active');
    } else {
      btnSend.classList.remove('active');
    }
  });

  // Botões de Reset
  btnResetChat.addEventListener('click', resetConversation);
  btnSidebarReset.addEventListener('click', resetConversation);
  btnCheckStatus.addEventListener('click', checkAzureStatus);

  // Modal de Diagnóstico
  function openModal() {
    checkAzureStatus();
    diagModal.style.display = 'flex';
  }

  function closeModal() {
    diagModal.style.display = 'none';
  }

  btnInfo.addEventListener('click', openModal);
  btnHeaderInfo.addEventListener('click', openModal);
  btnCloseModal.addEventListener('click', closeModal);
  btnModalOk.addEventListener('click', closeModal);
  btnRefreshDiag.addEventListener('click', checkAzureStatus);

  // Fecha modal ao clicar fora
  diagModal.addEventListener('click', (e) => {
    if (e.target === diagModal) {
      closeModal();
    }
  });

  // Botões informativos de emoji / anexo
  document.getElementById('btn-emoji').addEventListener('click', () => {
    showToast('Dica: Você pode usar emojis do seu teclado (Windows + . ou Mac Cmd + Ctrl + Espaço)', 'info');
  });

  document.getElementById('btn-attach').addEventListener('click', () => {
    showToast('Dica: Envie o comprovante ou descrição do gasto diretamente por texto!', 'info');
  });

  // Inicialização
  modalSessionId.textContent = sessionId;
  checkAzureStatus();

})();

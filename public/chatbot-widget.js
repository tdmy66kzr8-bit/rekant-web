// public/chatbot-widget.js
// Chatbot widget pro Rekant - vkládá se na všechny stránky

(function() {
  // Negeneruj widget pokud je localhost admin
  if (window.location.pathname.includes('/admin')) {
    return;
  }

  const styles = `
    #chat-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif;
    }
    
    #chat-widget {
      width: 380px;
      height: 550px;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,.15);
      display: none;
      flex-direction: column;
      overflow: hidden;
      animation: slideUp .3s ease-out;
    }
    
    #chat-widget.open {
      display: flex;
    }
    
    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    
    #chat-header {
      background: #cc1a1a;
      color: #fff;
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 700;
      font-size: 14px;
    }
    
    #chat-close {
      background: none;
      border: none;
      color: #fff;
      cursor: pointer;
      font-size: 20px;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    #chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      background: #f9fafb;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .chat-msg {
      padding: 12px 14px;
      border-radius: 8px;
      font-size: 13px;
      line-height: 1.5;
      word-break: break-word;
      animation: fadeIn .2s ease-out;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    .chat-user {
      background: #cc1a1a;
      color: #fff;
      align-self: flex-end;
      max-width: 80%;
    }
    
    .chat-bot {
      background: #fff;
      color: #333;
      border: 1px solid #e5e7eb;
      align-self: flex-start;
      max-width: 80%;
    }
    
    .chat-loading {
      display: flex;
      gap: 4px;
      align-items: center;
    }
    
    .chat-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #cc1a1a;
      animation: bounce .6s infinite;
    }
    
    .chat-dot:nth-child(2) {
      animation-delay: .1s;
    }
    
    .chat-dot:nth-child(3) {
      animation-delay: .2s;
    }
    
    @keyframes bounce {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 1; }
    }
    
    #chat-input-area {
      padding: 12px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      gap: 8px;
    }
    
    #chat-input {
      flex: 1;
      padding: 10px 12px;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      font-size: 13px;
      font-family: inherit;
      outline: none;
      transition: border-color .2s;
    }
    
    #chat-input:focus {
      border-color: #cc1a1a;
    }
    
    #chat-send {
      background: #cc1a1a;
      color: #fff;
      border: none;
      padding: 10px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 13px;
      transition: background .2s;
    }
    
    #chat-send:hover {
      background: #a51414;
    }
    
    #chat-send:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    #chat-toggle {
      width: 60px;
      height: 60px;
      background: #cc1a1a;
      color: #fff;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      font-size: 28px;
      font-weight: 700;
      box-shadow: 0 4px 16px rgba(204,26,26,.4);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform .2s, background .2s;
    }
    
    #chat-toggle:hover {
      transform: scale(1.1);
      background: #a51414;
    }
    
    #chat-toggle.open {
      display: none;
    }
    
    @media (max-width: 480px) {
      #chat-widget {
        width: calc(100% - 32px);
        height: 60vh;
        max-height: 500px;
      }
    }
  `;

  // Přidej CSS
  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);

  // Vytvoř HTML
  const container = document.createElement('div');
  container.id = 'chat-container';
  container.innerHTML = `
    <div id="chat-widget" class="open">
      <div id="chat-header">
        <div>💬 Asistent Rekant</div>
        <button id="chat-close">✕</button>
      </div>
      <div id="chat-messages">
        <div class="chat-msg chat-bot">
          👋 Ahoj! Jsem AI asistent Rekant. Ptej se mě na cokoliv - produkty, ceny, servis, bezpečnost a další. Jak ti mohu pomoci?
        </div>
      </div>
      <div id="chat-input-area">
        <input id="chat-input" type="text" placeholder="Napiš zprávu..." />
        <button id="chat-send">Odeslat</button>
      </div>
    </div>
    <button id="chat-toggle">💬</button>
  `;
  document.body.appendChild(container);

  // Stav chatbotu
  let messages = [
    { role: 'assistant', content: '👋 Ahoj! Jsem AI asistent Rekant. Ptej se mě na cokoliv - produkty, ceny, servis, bezpečnost a další. Jak ti mohu pomoci?' }
  ];
  let isLoading = false;

  // Event listenery
  const toggle = document.getElementById('chat-toggle');
  const widget = document.getElementById('chat-widget');
  const closeBtn = document.getElementById('chat-close');
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');
  const messagesDiv = document.getElementById('chat-messages');

  toggle.addEventListener('click', () => {
    widget.classList.add('open');
    toggle.classList.add('open');
    input.focus();
  });

  closeBtn.addEventListener('click', () => {
    widget.classList.remove('open');
    toggle.classList.remove('open');
  });

  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !isLoading) sendMessage();
  });

  sendBtn.addEventListener('click', sendMessage);

  async function sendMessage() {
    const text = input.value.trim();
    if (!text || isLoading) return;

    // Přidej zprávu uživatele
    addMessage('user', text);
    messages.push({ role: 'user', content: text });
    input.value = '';

    // Zobraz loading
    isLoading = true;
    sendBtn.disabled = true;
    const loadingEl = addMessage('loading', '');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages })
      });

      if (!response.ok) throw new Error('API error');
      const data = await response.json();

      // Smaž loading a přidej odpověď
      loadingEl.remove();
      addMessage('bot', data.reply);
      messages.push({ role: 'assistant', content: data.reply });

    } catch (error) {
      loadingEl.remove();
      addMessage('bot', '❌ Omlouvám se, něco se pokazilo. Zkus to později nebo nas kontaktuj na ' + (window.REKANT_PHONE || '244 471 760'));
    } finally {
      isLoading = false;
      sendBtn.disabled = false;
      input.focus();
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
  }

  function addMessage(type, text) {
    const el = document.createElement('div');
    el.className = `chat-msg chat-${type === 'user' ? 'user' : type === 'loading' ? 'loading' : 'bot'}`;
    
    if (type === 'loading') {
      el.innerHTML = '<div class="chat-loading"><span class="chat-dot"></span><span class="chat-dot"></span><span class="chat-dot"></span></div>';
    } else {
      el.textContent = text;
    }
    
    messagesDiv.appendChild(el);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    return el;
  }

  // Ulož globální funkci pro přístup z HTML
  window.REKANT_CHAT = {
    sendMessage: sendMessage,
    addMessage: addMessage,
    messages: messages
  };
})();

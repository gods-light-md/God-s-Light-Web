const Chatbot = (() => {
    const API_ENDPOINT = '/api/chat';
    const ESCALATION_KEYWORDS = ['payment', 'pay now', 'invoice', 'price', 'cost', 'quote final', 'contract', 'legal', 'refund', 'complaint', 'cancel', 'speak to someone', 'human', 'agent', 'urgent'];
    const MAX_HISTORY = 20;
    let conversationHistory = [];
    let isTyping = false;
    let panelOpen = false;
  
    function getElements() {
      return {
        launcher: document.getElementById('chatbot-launcher'),
        panel: document.getElementById('chatbot-panel'),
        closeBtn: document.getElementById('chatbot-close'),
        messages: document.getElementById('chat-messages'),
        input: document.getElementById('chat-input'),
        sendBtn: document.getElementById('chat-send'),
      };
    }
  
    function formatTime() {
      return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  
    function appendMessage(content, role) {
      const { messages } = getElements();
      if (!messages) return;
  
      const wrapper = document.createElement('div');
      wrapper.className = `chat-message chat-message--${role}`;
  
      const bubble = document.createElement('div');
      bubble.className = 'message-bubble';
      bubble.textContent = content;
  
      const time = document.createElement('span');
      time.className = 'message-time';
      time.textContent = formatTime();
  
      wrapper.appendChild(bubble);
      wrapper.appendChild(time);
      messages.appendChild(wrapper);
      messages.scrollTop = messages.scrollHeight;
      return wrapper;
    }
  
    function appendEscalationNotice() {
      const { messages } = getElements();
      if (!messages) return;
      const notice = document.createElement('div');
      notice.className = 'chat-escalate';
      notice.setAttribute('role', 'status');
      notice.textContent = '⚠ This topic has been flagged for human review. A team member will contact you shortly.';
      messages.appendChild(notice);
      messages.scrollTop = messages.scrollHeight;
    }
  
    function showTyping() {
      const { messages } = getElements();
      if (!messages || isTyping) return;
      isTyping = true;
      const wrapper = document.createElement('div');
      wrapper.className = 'chat-message chat-message--bot';
      wrapper.id = 'chat-typing-indicator';
      const indicator = document.createElement('div');
      indicator.className = 'chat-typing';
      indicator.setAttribute('aria-label', 'Assistant is typing');
      for (let i = 0; i < 3; i++) indicator.appendChild(document.createElement('span'));
      wrapper.appendChild(indicator);
      messages.appendChild(wrapper);
      messages.scrollTop = messages.scrollHeight;
    }
  
    function hideTyping() {
      const indicator = document.getElementById('chat-typing-indicator');
      if (indicator) indicator.remove();
      isTyping = false;
    }
  
    function shouldEscalate(text) {
      const lower = text.toLowerCase();
      return ESCALATION_KEYWORDS.some(kw => lower.includes(kw));
    }
  
    function addToHistory(role, content) {
      conversationHistory.push({ role, content });
      if (conversationHistory.length > MAX_HISTORY) conversationHistory.shift();
    }
  
    async function sendMessage(userText) {
      const { input, sendBtn } = getElements();
      const trimmed = userText.trim();
      if (!trimmed || isTyping) return;
  
      appendMessage(trimmed, 'user');
      addToHistory('user', trimmed);
      if (input) input.value = '';
      if (sendBtn) sendBtn.disabled = true;
  
      if (shouldEscalate(trimmed)) {
        showTyping();
        await delay(800);
        hideTyping();
        appendMessage('This topic requires attention from one of our specialists. I\'ve flagged your message and a team member will reach out to you within 1 business hour. You can also email us at hello@nexgentech.io.', 'bot');
        appendEscalationNotice();
        if (sendBtn) sendBtn.disabled = false;
        return;
      }
  
      showTyping();
  
      try {
        const res = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: trimmed, history: conversationHistory.slice(-10) }),
        });
  
        const data = await res.json();
        hideTyping();
  
        if (!res.ok || data.escalate) {
          appendMessage(data.message || 'I\'m unable to answer that from our documentation. I\'m connecting you with a human specialist now.', 'bot');
          if (data.escalate) appendEscalationNotice();
        } else {
          appendMessage(data.reply, 'bot');
          addToHistory('assistant', data.reply);
        }
      } catch {
        hideTyping();
        appendMessage('I\'m having trouble connecting right now. Please email us directly at hello@nexgentech.io or try again in a moment.', 'bot');
      }
  
      if (sendBtn) sendBtn.disabled = false;
    }
  
    function delay(ms) { return new Promise(res => setTimeout(res, ms)); }
  
    function openPanel() {
      const { launcher, panel } = getElements();
      panelOpen = true;
      if (panel) { panel.classList.add('open'); panel.setAttribute('aria-hidden', 'false'); }
      if (launcher) launcher.setAttribute('aria-expanded', 'true');
      const { input } = getElements();
      if (input) input.focus();
    }
  
    function closePanel() {
      const { launcher, panel } = getElements();
      panelOpen = false;
      if (panel) { panel.classList.remove('open'); panel.setAttribute('aria-hidden', 'true'); }
      if (launcher) launcher.setAttribute('aria-expanded', 'false');
    }
  
    function init() {
      const { launcher, panel, closeBtn, input, sendBtn } = getElements();
      if (!launcher || !panel) return;
  
      launcher.addEventListener('click', () => panelOpen ? closePanel() : openPanel());
      launcher.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); panelOpen ? closePanel() : openPanel(); } });
      if (closeBtn) closeBtn.addEventListener('click', closePanel);
  
      if (sendBtn) sendBtn.addEventListener('click', () => { if (input) sendMessage(input.value); });
      if (input) {
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input.value); }
        });
      }
  
      if (panel) {
        panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePanel(); });
      }
    }
  
    document.addEventListener('DOMContentLoaded', init);
  
    return Object.freeze({ openPanel, closePanel, sendMessage });
  })();
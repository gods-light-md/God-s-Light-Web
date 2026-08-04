/**
 * God's Light Tech Solutions — Chat Widget JS
 * Handles: open/close, message rendering, RAG API calls,
 * typing indicators, escalation to human agent.
 */

import { getToken, sanitiseText } from './utils.js';

const chatFab = document.getElementById('chat-fab');
const chatWidget = document.getElementById('chat-widget');
const chatClose = document.getElementById('chat-close');
const chatOverlay = document.getElementById('chat-overlay');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');

let conversationHistory = [];
let isOpen = false;
let isSending = false;

const WELCOME_MSG = 'Hello! I\'m the GL assistant. I can answer questions about our services, process, and documentation. How can I help you today?';

/* ---- OPEN / CLOSE ---- */
const openChat = () => {
  if (!chatWidget || !chatOverlay) return;
  chatWidget.hidden = false;
  chatOverlay.hidden = false;
  isOpen = true;
  chatFab.setAttribute('aria-label', 'Close support chat');
  chatInput.focus();
  if (chatMessages.children.length === 0) {
    appendBotMessage(WELCOME_MSG);
  }
};

const closeChat = () => {
  if (!chatWidget || !chatOverlay) return;
  chatWidget.hidden = true;
  chatOverlay.hidden = true;
  isOpen = false;
  chatFab.setAttribute('aria-label', 'Open support chat');
};

if (chatFab) {
  chatFab.addEventListener('click', () => {
    if (isOpen) closeChat();
    else openChat();
  });
}

if (chatClose) {
  chatClose.addEventListener('click', closeChat);
}

if (chatOverlay) {
  chatOverlay.addEventListener('click', closeChat);
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && isOpen) closeChat();
});

/* ---- MESSAGE RENDERING ---- */
const scrollToBottom = () => {
  if (chatMessages) {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
};

const appendBotMessage = (text) => {
  const wrapper = document.createElement('div');
  wrapper.className = 'chat-msg chat-msg--bot';

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.setAttribute('aria-hidden', 'true');
  avatar.textContent = 'N';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.textContent = text;

  wrapper.appendChild(avatar);
  wrapper.appendChild(bubble);
  chatMessages.appendChild(wrapper);
  scrollToBottom();
};

const appendUserMessage = (text) => {
  const wrapper = document.createElement('div');
  wrapper.className = 'chat-msg chat-msg--user';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.textContent = text;

  wrapper.appendChild(bubble);
  chatMessages.appendChild(wrapper);
  scrollToBottom();
};

const showTypingIndicator = () => {
  const wrapper = document.createElement('div');
  wrapper.className = 'chat-msg chat-msg--bot';
  wrapper.id = 'typing-indicator';

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.setAttribute('aria-hidden', 'true');
  avatar.textContent = 'N';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble msg-typing';

  for (let i = 0; i < 3; i++) {
    const dot = document.createElement('span');
    dot.className = 'typing-dot';
    dot.setAttribute('aria-hidden', 'true');
    bubble.appendChild(dot);
  }

  wrapper.appendChild(avatar);
  wrapper.appendChild(bubble);
  chatMessages.appendChild(wrapper);
  scrollToBottom();
};

const removeTypingIndicator = () => {
  const indicator = document.getElementById('typing-indicator');
  if (indicator) indicator.remove();
};

const appendEscalationCard = () => {
  const wrapper = document.createElement('div');
  wrapper.className = 'chat-msg chat-msg--escalate';

  const card = document.createElement('div');
  card.className = 'msg-escalate-card';

  const title = document.createElement('div');
  title.className = 'escalate-title';
  title.textContent = 'Connect with a human agent';

  const body = document.createElement('div');
  body.className = 'escalate-body';
  body.textContent = 'This question is outside my knowledge base. A member of our team will respond to you directly. You can also reach us at hello@nexagen.tech or by phone.';

  const btn = document.createElement('button');
  btn.className = 'escalate-btn';
  btn.textContent = 'Request Human Support';
  btn.addEventListener('click', requestHumanHandoff);

  card.appendChild(title);
  card.appendChild(body);
  card.appendChild(btn);
  wrapper.appendChild(card);
  chatMessages.appendChild(wrapper);
  scrollToBottom();
};

/* ---- HUMAN HANDOFF ---- */
const requestHumanHandoff = async () => {
  const token = getToken();
  try {
    await fetch('/api/chat/escalate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ history: conversationHistory }),
    });
    appendBotMessage('Done — a human agent has been notified and will follow up with you. Check your email or account messages.');
  } catch {
    appendBotMessage('Unable to reach our system right now. Please email hello@nexagen.tech directly.');
  }
};

/* ---- SEND MESSAGE ---- */
const sendMessage = async () => {
  if (!chatInput || isSending) return;
  const text = chatInput.value.trim();
  if (!text) return;

  isSending = true;
  chatSend.disabled = true;
  chatInput.value = '';

  appendUserMessage(text);

  conversationHistory.push({ role: 'user', content: text });

  showTypingIndicator();

  const token = getToken();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message: text, history: conversationHistory }),
    });

    removeTypingIndicator();

    if (!res.ok) {
      appendBotMessage('Something went wrong. Please try again or contact us directly.');
      return;
    }

    const data = await res.json();

    if (data.escalate) {
      if (data.reply) appendBotMessage(data.reply);
      appendEscalationCard();
      conversationHistory.push({ role: 'assistant', content: data.reply || '[escalated]' });
    } else {
      appendBotMessage(data.reply);
      conversationHistory.push({ role: 'assistant', content: data.reply });
    }
  } catch {
    removeTypingIndicator();
    appendBotMessage('Network error. Please check your connection and try again.');
  } finally {
    isSending = false;
    chatSend.disabled = false;
    chatInput.focus();
  }
};

/* ---- EVENT BINDING ---- */
if (chatSend) {
  chatSend.addEventListener('click', sendMessage);
}

if (chatInput) {
  chatInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
}
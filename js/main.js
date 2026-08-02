const Toast = (() => {
    const icons = {
      success: '<svg class="toast-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>',
      error: '<svg class="toast-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>',
      warning: '<svg class="toast-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>',
      info: '<svg class="toast-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>',
    };
  
    function show(type, title, message, duration = 4500) {
      const container = document.getElementById('toast-container');
      if (!container) return;
  
      const toast = document.createElement('div');
      toast.className = `toast toast--${type}`;
      toast.setAttribute('role', 'alert');
      toast.innerHTML = `
        ${icons[type] || ''}
        <div class="toast-content">
          <div class="toast-title">${title}</div>
          ${message ? `<div class="toast-message">${message}</div>` : ''}
        </div>
        <button class="toast-close" aria-label="Dismiss notification">&times;</button>
      `;
  
      toast.querySelector('.toast-close').addEventListener('click', () => dismiss(toast));
      container.appendChild(toast);
  
      const timer = setTimeout(() => dismiss(toast), duration);
      toast.dataset.timer = timer;
    }
  
    function dismiss(toast) {
      clearTimeout(toast.dataset.timer);
      toast.classList.add('toast--removing');
      setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 280);
    }
  
    const success = (title, msg, d) => show('success', title, msg, d);
    const error = (title, msg, d) => show('error', title, msg, d);
    const warning = (title, msg, d) => show('warning', title, msg, d);
    const info = (title, msg, d) => show('info', title, msg, d);
  
    return Object.freeze({ success, error, warning, info });
  })();
  
  window.Toast = Toast;
  
  function initLoader() {
    const loader = document.getElementById('page-loader');
    if (!loader) return;
    if (document.readyState === 'complete') {
      loader.classList.add('loaded');
    } else {
      window.addEventListener('load', () => loader.classList.add('loaded'));
    }
  }
  
  function initNavScroll() {
    const header = document.getElementById('site-header');
    if (!header) return;
    const toggle = () => header.classList.toggle('scrolled', window.scrollY > 20);
    toggle();
    window.addEventListener('scroll', toggle, { passive: true });
  }
  
  function initMobileNav() {
    const toggle = document.getElementById('nav-toggle');
    const links = document.getElementById('nav-links');
    if (!toggle || !links) return;
  
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      toggle.classList.toggle('active', !expanded);
      links.classList.toggle('open', !expanded);
    });
  
    links.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        toggle.setAttribute('aria-expanded', 'false');
        toggle.classList.remove('active');
        links.classList.remove('open');
      });
    });
  
    document.addEventListener('click', (e) => {
      if (!toggle.contains(e.target) && !links.contains(e.target)) {
        toggle.setAttribute('aria-expanded', 'false');
        toggle.classList.remove('active');
        links.classList.remove('open');
      }
    });
  }
  
  function initScrollReveal() {
    const items = document.querySelectorAll('.reveal');
    if (!items.length) return;
    if (!window.IntersectionObserver) {
      items.forEach(el => el.classList.add('visible'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach(el => observer.observe(el));
  }
  
  function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;
  
    Validator.attachLiveValidation(form);
  
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!Validator.validateForm(form)) return;
  
      const btn = document.getElementById('contact-submit');
      btn.classList.add('btn--loading');
      btn.disabled = true;
  
      const payload = {
        name: Validator.sanitise(form.name.value),
        email: Validator.sanitise(form.email.value),
        message: Validator.sanitise(form.message.value),
      };
  
      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.ok) {
          Toast.success('Message sent', 'We\'ll respond within 4 business hours.');
          form.reset();
          form.querySelectorAll('.form-input').forEach(f => f.classList.remove('input--success'));
        } else {
          Toast.error('Failed to send', data.message || 'Please try again or email us directly.');
        }
      } catch {
        Toast.error('Network error', 'Check your connection and try again.');
      } finally {
        btn.classList.remove('btn--loading');
        btn.disabled = false;
      }
    });
  }
  
  function initFooterYear() {
    const el = document.getElementById('footer-year');
    if (el) el.textContent = new Date().getFullYear();
  }
  
  function initRevealClasses() {
    document.querySelectorAll('.service-card, .process-step, .value-item, .about-badge, .stat').forEach((el, i) => {
      el.classList.add('reveal', `reveal-delay-${Math.min((i % 5) + 1, 5)}`);
    });
  }
  
  document.addEventListener('DOMContentLoaded', () => {
    initLoader();
    initNavScroll();
    initMobileNav();
    initRevealClasses();
    initScrollReveal();
    initContactForm();
    initFooterYear();
  });
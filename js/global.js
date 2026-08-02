/* Navigation, shared utilities, security helpers */

(function () {
  'use strict';

  const STORAGE_KEYS = {
    AUTH_TOKEN: 'tp_auth_token',
    USER_DATA:  'tp_user_data',
    CSRF_TOKEN: 'tp_csrf',
  };

  const API_BASE = '/api';

  /* Security: generate CSRF token */
  function generateCSRF() {
    const existing = sessionStorage.getItem(STORAGE_KEYS.CSRF_TOKEN);
    if (existing) return existing;
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    const token = Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
    sessionStorage.setItem(STORAGE_KEYS.CSRF_TOKEN, token);
    return token;
  }

  /* Security: sanitise HTML output to prevent XSS */
  function sanitise(str) {
    if (typeof str !== 'string') return '';
    const map = { '&': '&amp;', '<': '<', '>': '>', '"': '&quot;', "'": '&#039;' };
    return str.replace(/[&<>"']/g, ch => map[ch]);
  }

  /* Security: validate email format */
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  }

  /* Security: validate phone format */
  function isValidPhone(phone) {
    return /^[\+\d\s\-\(\)]{7,20}$/.test(phone.trim());
  }

  /* Security: validate password strength */
  function isStrongPassword(pw) {
    return pw.length >= 8 && /[0-9]/.test(pw) && /[^a-zA-Z0-9]/.test(pw);
  }

  /* Auth helpers */
  function getAuthToken() {
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  }

  function getCurrentUser() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.USER_DATA);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function isLoggedIn() {
    return !!getAuthToken();
  }

  function requireAuth(redirectTo) {
    if (!isLoggedIn()) {
      const target = redirectTo || 'login.html';
      const current = encodeURIComponent(window.location.pathname);
      window.location.href = target + '?next=' + current;
      return false;
    }
    return true;
  }

  function hasRole(role) {
    const user = getCurrentUser();
    if (!user) return false;
    if (Array.isArray(role)) return role.includes(user.role);
    return user.role === role;
  }

  /* Authenticated fetch wrapper */
  async function apiFetch(endpoint, options) {
    const defaults = {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': generateCSRF(),
      },
    };

    const token = getAuthToken();
    if (token) {
      defaults.headers['Authorization'] = 'Bearer ' + token;
    }

    const merged = {
      ...defaults,
      ...options,
      headers: { ...defaults.headers, ...(options && options.headers ? options.headers : {}) },
    };

    const res = await fetch(API_BASE + endpoint, merged);

    if (res.status === 401) {
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER_DATA);
      window.location.href = 'login.html?session=expired';
      return null;
    }

    return res;
  }

  /* Navigation: mobile toggle */
  function initNav() {
    const toggle = document.getElementById('nav-toggle');
    const navLinks = document.getElementById('nav-links');
    if (!toggle || !navLinks) return;

    toggle.addEventListener('click', function () {
      const isOpen = navLinks.classList.contains('is-open');
      navLinks.classList.toggle('is-open', !isOpen);
      toggle.setAttribute('aria-expanded', String(!isOpen));
    });

    document.addEventListener('click', function (e) {
      if (!toggle.contains(e.target) && !navLinks.contains(e.target)) {
        navLinks.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        navLinks.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* Header scroll shadow */
  function initHeaderScroll() {
    const header = document.getElementById('site-header');
    if (!header) return;
    const observer = new IntersectionObserver(
      ([entry]) => header.classList.toggle('is-scrolled', !entry.isIntersecting),
      { rootMargin: '-1px 0px 0px 0px', threshold: [1] }
    );
    const sentinel = document.createElement('div');
    document.body.prepend(sentinel);
    observer.observe(sentinel);
  }

  /* Footer year */
  function initFooterYear() {
    document.querySelectorAll('#footer-year, .footer-year').forEach(el => {
      el.textContent = new Date().getFullYear();
    });
  }

  /* Smooth scroll for hash links */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', function (e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  /* Password visibility toggle */
  function initPasswordToggles() {
    document.querySelectorAll('.field-toggle[data-target]').forEach(btn => {
      btn.addEventListener('click', function () {
        const input = document.getElementById(this.dataset.target);
        if (!input) return;
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        this.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
      });
    });
  }

  /* Pre-fill from query string (service selector etc.) */
  function initQueryPrefill() {
    const params = new URLSearchParams(window.location.search);
    params.forEach(function (val, key) {
      const el = document.querySelector('[name="' + key + '"]');
      if (el && el.tagName !== 'BUTTON') {
        el.value = sanitise(val);
      }
    });
  }

  /* Expose global utilities */
  window.TechPro = {
    sanitise,
    isValidEmail,
    isValidPhone,
    isStrongPassword,
    getAuthToken,
    getCurrentUser,
    isLoggedIn,
    requireAuth,
    hasRole,
    apiFetch,
    generateCSRF,
    STORAGE_KEYS,
  };

  /* Init */
  document.addEventListener('DOMContentLoaded', function () {
    initNav();
    initHeaderScroll();
    initFooterYear();
    initSmoothScroll();
    initPasswordToggles();
    initQueryPrefill();
  });

}());
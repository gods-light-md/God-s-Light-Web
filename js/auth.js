/**
 * God's Light Tech Solutions — Auth JS
 * Handles login and register form logic, password strength indicator,
 * show/hide password, and role-aware redirect after authentication.
 */

import {
  validateField,
  validatePassword,
  passwordStrength,
  sanitiseText,
  setAuth,
  getToken,
  showToast,
} from './utils.js';

/* ---- REDIRECT IF ALREADY LOGGED IN ---- */
if (getToken()) {
  window.location.replace('./dashboard.html');
}

/* ---- PASSWORD VISIBILITY TOGGLE ---- */
const wirePasswordToggle = (toggleId, inputId) => {
  const toggle = document.getElementById(toggleId);
  const input = document.getElementById(inputId);
  if (!toggle || !input) return;

  toggle.addEventListener('click', () => {
    const isVisible = input.type === 'text';
    input.type = isVisible ? 'password' : 'text';
    toggle.setAttribute('aria-pressed', String(!isVisible));
    toggle.setAttribute('aria-label', isVisible ? 'Show password' : 'Hide password');
  });
};

wirePasswordToggle('toggle-login-pw', 'login-password');
wirePasswordToggle('toggle-reg-pw', 'reg-password');

/* ---- PASSWORD STRENGTH METER ---- */
const regPasswordInput = document.getElementById('reg-password');
const strengthBars = [
  document.getElementById('bar-1'),
  document.getElementById('bar-2'),
  document.getElementById('bar-3'),
  document.getElementById('bar-4'),
];
const strengthLabel = document.getElementById('strength-label');

if (regPasswordInput) {
  regPasswordInput.addEventListener('input', () => {
    const val = regPasswordInput.value;
    const score = passwordStrength(val);
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    const classes = ['', 'active-weak', 'active-fair', 'active-strong', 'active-strong'];

    strengthBars.forEach((bar, i) => {
      if (!bar) return;
      bar.className = 'strength-bar';
      if (i < score && score > 0) bar.classList.add(classes[score]);
    });

    if (strengthLabel) {
      strengthLabel.textContent = val.length ? `Strength: ${labels[score]}` : '';
    }
  });
}

/* ---- LOGIN FORM ---- */
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const loginErrorMsg = document.getElementById('login-error-msg');

if (loginForm) {
  const showLoginError = (msg) => {
    if (loginError) loginError.hidden = false;
    if (loginErrorMsg) loginErrorMsg.textContent = msg;
  };

  const hideLoginError = () => {
    if (loginError) loginError.hidden = true;
  };

  const loginFields = [
    { id: 'login-email', type: 'email', errorId: 'login-email-error' },
    { id: 'login-password', type: 'text', errorId: 'login-password-error' },
  ];

  loginFields.forEach(({ id, type, errorId }) => {
    const input = document.getElementById(id);
    const errEl = document.getElementById(errorId);
    if (!input || !errEl) return;
    input.addEventListener('blur', () => {
      const msg = validateField(input, type);
      errEl.textContent = msg;
      input.classList.toggle('error', !!msg);
    });
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideLoginError();

    let hasErrors = false;
    loginFields.forEach(({ id, type, errorId }) => {
      const input = document.getElementById(id);
      const errEl = document.getElementById(errorId);
      if (!input || !errEl) return;
      const msg = validateField(input, type);
      errEl.textContent = msg;
      input.classList.toggle('error', !!msg);
      if (msg) hasErrors = true;
    });

    if (hasErrors) return;

    const submit = document.getElementById('login-submit');
    const btnText = submit?.querySelector('.btn-text');
    const spinner = submit?.querySelector('.btn-spinner');

    if (submit) submit.disabled = true;
    if (btnText) btnText.hidden = true;
    if (spinner) spinner.hidden = false;

    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        showLoginError(data.message || 'Invalid email or password.');
        return;
      }

      setAuth(data.token, data.user);

      if (data.user.role === 'admin') {
        window.location.href = './admin.html';
      } else {
        window.location.href = './dashboard.html';
      }
    } catch {
      showLoginError('Unable to connect. Please check your connection and try again.');
    } finally {
      if (submit) submit.disabled = false;
      if (btnText) btnText.hidden = false;
      if (spinner) spinner.hidden = true;
    }
  });
}

/* ---- REGISTER FORM ---- */
const registerForm = document.getElementById('register-form');
const registerError = document.getElementById('register-error');
const registerErrorMsg = document.getElementById('register-error-msg');

if (registerForm) {
  const showRegError = (msg) => {
    if (registerError) registerError.hidden = false;
    if (registerErrorMsg) registerErrorMsg.textContent = msg;
    registerError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const prefillService = () => {
    const params = new URLSearchParams(window.location.search);
    const service = params.get('service');
    const select = document.getElementById('reg-service');
    if (service && select) {
      const option = select.querySelector(`option[value="${CSS.escape(service)}"]`);
      if (option) select.value = service;
    }
  };

  prefillService();

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (registerError) registerError.hidden = true;

    const firstName = document.getElementById('reg-firstname');
    const lastName = document.getElementById('reg-lastname');
    const email = document.getElementById('reg-email');
    const phone = document.getElementById('reg-phone');
    const service = document.getElementById('reg-service');
    const password = document.getElementById('reg-password');
    const confirm = document.getElementById('reg-confirm');
    const terms = document.getElementById('reg-terms');

    let hasErrors = false;

    const setError = (inputEl, errorId, msg) => {
      const errEl = document.getElementById(errorId);
      if (errEl) errEl.textContent = msg;
      if (inputEl) inputEl.classList.toggle('error', !!msg);
      if (msg) hasErrors = true;
    };

    setError(firstName, 'reg-firstname-error', validateField(firstName, 'text'));
    setError(lastName, 'reg-lastname-error', validateField(lastName, 'text'));
    setError(email, 'reg-email-error', validateField(email, 'email'));
    setError(service, 'reg-service-error', validateField(service, 'select'));

    const phoneVal = phone?.value.trim();
    const phoneRe = /^\+?[\d\s\-()]{7,20}$/;
    const phoneMsg = !phoneVal ? 'Phone number is required.' : !phoneRe.test(phoneVal) ? 'Enter a valid phone number.' : '';
    setError(phone, 'reg-phone-error', phoneMsg);

    const pwMsg = validatePassword(password?.value || '');
    setError(password, 'reg-password-error', pwMsg);

    const confirmMsg = confirm?.value !== password?.value ? 'Passwords do not match.' : '';
    setError(confirm, 'reg-confirm-error', confirmMsg);

    const termsEl = document.getElementById('reg-terms-error');
    if (!terms?.checked) {
      if (termsEl) termsEl.textContent = 'You must accept the terms to continue.';
      hasErrors = true;
    } else {
      if (termsEl) termsEl.textContent = '';
    }

    if (hasErrors) return;

    const submit = document.getElementById('register-submit');
    const btnText = submit?.querySelector('.btn-text');
    const spinner = submit?.querySelector('.btn-spinner');

    if (submit) submit.disabled = true;
    if (btnText) btnText.hidden = true;
    if (spinner) spinner.hidden = false;

    const payload = {
      firstName: sanitiseText(firstName.value),
      lastName: sanitiseText(lastName.value),
      email: email.value.trim().toLowerCase(),
      phone: phone.value.trim(),
      company: sanitiseText(document.getElementById('reg-company')?.value || ''),
      serviceInterest: service.value,
      password: password.value,
    };

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        showRegError(data.message || 'Registration failed. Please try again.');
        return;
      }

      setAuth(data.token, data.user);
      showToast('Account created successfully. Welcome to God's Light!', 'success');
      window.location.href = './dashboard.html';
    } catch {
      showRegError('Network error. Please check your connection and try again.');
    } finally {
      if (submit) submit.disabled = false;
      if (btnText) btnText.hidden = false;
      if (spinner) spinner.hidden = true;
    }
  });
}
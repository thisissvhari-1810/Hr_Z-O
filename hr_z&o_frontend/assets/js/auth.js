/* PeopleFlow – auth.js
   Talks to the backend at /api/auth/*.
   The /api/* prefix is proxied to the Node service by nginx (see nginx.conf).
*/

(function () {
  'use strict';

  const TOKEN_KEY = 'peopleflow_token';
  const USER_KEY  = 'peopleflow_user';

  // ---------- Tiny API helper ----------
  async function api(path, options) {
    const opts = Object.assign({ method: 'GET', headers: {} }, options || {});
    opts.headers = Object.assign(
      { 'Content-Type': 'application/json' },
      opts.headers
    );
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;

    const res = await fetch(path, opts);
    let data = null;
    try { data = await res.json(); } catch (_) {}
    if (!res.ok) {
      const msg = (data && data.error) || ('Request failed: ' + res.status);
      throw new Error(msg);
    }
    return data;
  }

  function setSession(token, user) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (user)  localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  // ---------- Visual helpers ----------
  function showMessage(form, text, isError) {
    const msg = form.querySelector('.form-msg');
    if (!msg) { alert(text); return; }
    msg.textContent = text;
    msg.style.color = isError ? 'var(--danger, #C44A3A)' : 'var(--primary-dark)';
  }

  function setSubmitting(form, busy, busyLabel) {
    const btn = form.querySelector('button[type="submit"]');
    if (!btn) return;
    if (busy) {
      btn.dataset._label = btn.textContent;
      btn.disabled = true;
      btn.textContent = busyLabel || 'Working…';
    } else {
      btn.disabled = false;
      if (btn.dataset._label) btn.textContent = btn.dataset._label;
    }
  }

  // ---------- Wire up login form ----------
  const loginForm = document.querySelector('form[data-auth="login"]');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      showMessage(loginForm, '', false);
      setSubmitting(loginForm, true, 'Logging in…');
      try {
        const email = loginForm.querySelector('#email').value.trim();
        const password = loginForm.querySelector('#password').value;
        const data = await api('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        setSession(data.token, data.user);
        showMessage(
          loginForm,
          'Logged in. Welcome back, ' + (data.user.firstName || data.user.email) + '!',
          false
        );
        setTimeout(() => { window.location.href = '../index.html'; }, 800);
      } catch (err) {
        showMessage(loginForm, err.message || 'Login failed.', true);
      } finally {
        setSubmitting(loginForm, false);
      }
    });
  }

  // ---------- Wire up signup form ----------
  const signupForm = document.querySelector('form[data-auth="signup"]');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      showMessage(signupForm, '', false);
      setSubmitting(signupForm, true, 'Creating account…');
      try {
        const payload = {
          firstName: signupForm.querySelector('#fname').value.trim(),
          lastName:  signupForm.querySelector('#lname').value.trim(),
          email:     signupForm.querySelector('#email').value.trim(),
          company:   signupForm.querySelector('#company').value.trim(),
          size:      signupForm.querySelector('#size').value,
          phone:     signupForm.querySelector('#phone').value.trim(),
          password:  signupForm.querySelector('#password').value,
        };
        const data = await api('/api/auth/signup', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setSession(data.token, data.user);
        showMessage(
          signupForm,
          'Account created! Redirecting to your dashboard…',
          false
        );
        setTimeout(() => { window.location.href = '../index.html'; }, 900);
      } catch (err) {
        showMessage(signupForm, err.message || 'Signup failed.', true);
      } finally {
        setSubmitting(signupForm, false);
      }
    });
  }

  // ---------- Wire up contact form ----------
  const contactForm = document.querySelector('form[data-auth="contact"]');
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      showMessage(contactForm, '', false);
      setSubmitting(contactForm, true, 'Sending…');
      try {
        const payload = {
          name:    contactForm.querySelector('#name').value.trim(),
          email:   contactForm.querySelector('#email').value.trim(),
          company: contactForm.querySelector('#company').value.trim(),
          topic:   contactForm.querySelector('#topic').value,
          message: contactForm.querySelector('#msg').value.trim(),
        };
        await api('/api/contact', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        contactForm.reset();
        showMessage(
          contactForm,
          'Thanks! We will get back to you within 2 business hours.',
          false
        );
      } catch (err) {
        showMessage(contactForm, err.message || 'Could not send message.', true);
      } finally {
        setSubmitting(contactForm, false);
      }
    });
  }

  // ---------- Expose simple session helpers globally ----------
  window.PeopleFlowAuth = {
    isLoggedIn: () => !!localStorage.getItem(TOKEN_KEY),
    currentUser: () => {
      try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); }
      catch (_) { return null; }
    },
    logout: () => { clearSession(); window.location.href = '../index.html'; },
  };

  // ---------- Auto-wire any [data-logout] button ----------
  document.querySelectorAll('[data-logout]').forEach(b =>
    b.addEventListener('click', (e) => {
      e.preventDefault();
      window.PeopleFlowAuth.logout();
    })
  );
})();

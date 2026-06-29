/* PeopleFlow – shared client-side script.
   Handles: mobile nav toggle, footer year, simple form UX. */

(function () {
  'use strict';

  // ----- Mobile nav -----
  const ham = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  if (ham && navLinks) {
    ham.addEventListener('click', () => {
      ham.classList.toggle('open');
      navLinks.classList.toggle('mobile-open');
    });
    navLinks.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => {
        ham.classList.remove('open');
        navLinks.classList.remove('mobile-open');
      })
    );
  }

  // ----- Footer year -----
  document.querySelectorAll('[data-year]').forEach(el => {
    el.textContent = new Date().getFullYear();
  });

  // ----- Lightweight form handler (no backend wired up) -----
  document.querySelectorAll('form[data-mock-submit]').forEach(form => {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const msg = form.querySelector('.form-msg');
      if (btn) {
        const original = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Submitting…';
        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = original;
          if (msg) {
            msg.textContent =
              form.dataset.successMessage ||
              'Thanks! We will get back to you shortly.';
            msg.style.color = 'var(--primary-dark)';
          } else {
            alert(
              form.dataset.successMessage ||
                'Thanks! We will get back to you shortly.'
            );
          }
          form.reset();
        }, 900);
      }
    });
  });

  // ----- Password show/hide toggle -----
  document.querySelectorAll('[data-toggle-password]').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.togglePassword);
      if (!input) return;
      const isPwd = input.type === 'password';
      input.type = isPwd ? 'text' : 'password';
      btn.textContent = isPwd ? 'Hide' : 'Show';
    });
  });
})();

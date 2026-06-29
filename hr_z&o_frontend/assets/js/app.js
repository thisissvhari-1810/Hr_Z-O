/* PeopleFlow – in-app shell.
   Provides: auth guard, fetch wrapper, sidebar + topbar render,
   toast, modal, format helpers. */

(function () {
  'use strict';

  const TOKEN_KEY = 'peopleflow_token';
  const USER_KEY  = 'peopleflow_user';
  const LOGIN_URL = '../pages/login.html';

  // ---------- session ----------
  const Session = {
    token()  { return localStorage.getItem(TOKEN_KEY); },
    user()   {
      try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); }
      catch (_) { return null; }
    },
    set(token, user) {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      if (user)  localStorage.setItem(USER_KEY, JSON.stringify(user));
    },
    clear() {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    },
    logout() { this.clear(); window.location.href = LOGIN_URL; },
  };

  // ---------- API ----------
  async function api(path, options) {
    const opts = Object.assign({ method: 'GET', headers: {} }, options || {});
    opts.headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers);
    const token = Session.token();
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;

    let res;
    try {
      res = await fetch(path, opts);
    } catch (err) {
      throw new Error('Network error. Is the backend running?');
    }
    if (res.status === 401) { Session.logout(); throw new Error('Session expired.'); }

    let data = null;
    try { data = await res.json(); } catch (_) {}
    if (!res.ok) {
      const msg = (data && data.error) || ('Request failed: ' + res.status);
      throw new Error(msg);
    }
    return data;
  }

  // ---------- format helpers ----------
  const fmt = {
    date(d) {
      if (!d) return '—';
      const dt = new Date(d);
      return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    },
    time(d) {
      if (!d) return '—';
      return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    },
    datetime(d) {
      if (!d) return '—';
      return fmt.date(d) + ', ' + fmt.time(d);
    },
    duration(mins) {
      if (!mins || mins < 0) return '0m';
      const h = Math.floor(mins / 60), m = mins % 60;
      return (h ? h + 'h ' : '') + m + 'm';
    },
    initials(name) {
      if (!name) return '?';
      const parts = name.trim().split(/\s+/);
      return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
    },
    statusBadge(status) {
      const map = {
        pending:  'warn',  approved: 'success', rejected: 'danger',
        active:   'success', inactive: 'muted',
        IN:       'success', OUT:     'muted',
        in:       'success', out:     'muted', 'not-punched': 'muted',
      };
      const c = map[status] || 'muted';
      return `<span class="badge ${c}">${status}</span>`;
    },
    escape(s) {
      if (s === null || s === undefined) return '';
      return String(s).replace(/[&<>"']/g, c => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;',
      })[c]);
    },
  };

  // ---------- toast ----------
  let toastWrap;
  function toast(message, kind) {
    if (!toastWrap) {
      toastWrap = document.createElement('div');
      toastWrap.className = 'toast-wrap';
      document.body.appendChild(toastWrap);
    }
    const t = document.createElement('div');
    t.className = 'toast ' + (kind || '');
    t.textContent = message;
    toastWrap.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }

  // ---------- modal ----------
  function openModal({ title, body, footer }) {
    const back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-head"><h3></h3><button class="close" aria-label="Close">×</button></div>
        <div class="modal-body"></div>
        <div class="modal-foot"></div>
      </div>`;
    back.querySelector('.modal-head h3').textContent = title || '';
    const bodyEl = back.querySelector('.modal-body');
    const footEl = back.querySelector('.modal-foot');
    if (typeof body === 'string')   bodyEl.innerHTML = body;
    else if (body instanceof Node)  bodyEl.appendChild(body);
    if (typeof footer === 'string') footEl.innerHTML = footer;
    else if (footer instanceof Node) footEl.appendChild(footer);
    else footEl.style.display = 'none';

    function close() { back.classList.remove('open'); setTimeout(() => back.remove(), 150); }
    back.querySelector('.close').onclick = close;
    back.addEventListener('click', e => { if (e.target === back) close(); });
    document.body.appendChild(back);
    requestAnimationFrame(() => back.classList.add('open'));
    return { close, root: back, body: bodyEl, foot: footEl };
  }

  function confirmModal({ title, message, confirmLabel = 'Confirm', danger = false }) {
    return new Promise(resolve => {
      const foot = document.createElement('div');
      foot.style.display = 'flex'; foot.style.gap = '10px'; foot.style.justifyContent = 'flex-end';
      const cancel = document.createElement('button');
      cancel.className = 'btn btn-outline'; cancel.textContent = 'Cancel';
      const ok = document.createElement('button');
      ok.className = 'btn ' + (danger ? 'btn-danger' : 'btn-primary'); ok.textContent = confirmLabel;
      foot.append(cancel, ok);

      const m = openModal({ title: title || 'Are you sure?', body: `<p>${fmt.escape(message || '')}</p>`, footer: foot });
      cancel.onclick = () => { m.close(); resolve(false); };
      ok.onclick     = () => { m.close(); resolve(true);  };
    });
  }

  // ---------- layout render ----------
  const NAV = [
    { href: 'index.html',      label: 'Dashboard',  icon: '🏠' },
    { href: 'employees.html',  label: 'Employees',  icon: '🧑‍💼', adminOnly: false },
    { href: 'attendance.html', label: 'Attendance', icon: '📍' },
    { href: 'leave.html',      label: 'Leave',      icon: '🌴' },
    { href: 'profile.html',    label: 'My Profile', icon: '⚙️', group: 'Account' },
  ];

  function renderShell(active) {
    const user = Session.user();
    if (!user) return;

    if (user.role === 'admin') document.body.classList.add('is-admin');

    // sidebar
    const side = document.getElementById('sidebar');
    if (side) {
      const initials = fmt.initials(`${user.firstName} ${user.lastName}`);
      side.innerHTML = `
        <a class="sidebar-brand" href="index.html">
          <span class="mark">🌿</span> PeopleFlow
        </a>
        <nav class="sidebar-nav">
          ${NAV.filter(n => !n.group).map(n => `
            <a href="${n.href}" class="${active === n.href ? 'active' : ''}">
              <span class="ic">${n.icon}</span>${n.label}
            </a>`).join('')}
          <div class="group-label">Account</div>
          ${NAV.filter(n => n.group).map(n => `
            <a href="${n.href}" class="${active === n.href ? 'active' : ''}">
              <span class="ic">${n.icon}</span>${n.label}
            </a>`).join('')}
          <a href="#" data-logout><span class="ic">⏻</span>Sign out</a>
        </nav>
        <div class="sidebar-foot">
          Signed in as <strong style="color:#fff">${fmt.escape(user.email)}</strong>
        </div>`;
    }

    // top bar user menu
    const userMenuEl = document.getElementById('userMenu');
    if (userMenuEl) {
      const initials = fmt.initials(`${user.firstName} ${user.lastName}`);
      userMenuEl.innerHTML = `
        <span class="role-pill ${user.role === 'admin' ? 'admin' : ''}">${user.role}</span>
        <div class="user-menu">
          <button id="userBtn">
            <div class="avatar">${initials}</div>
            <span class="who">
              <span class="n">${fmt.escape(user.firstName)} ${fmt.escape(user.lastName)}</span>
              <span class="e">${fmt.escape(user.email)}</span>
            </span>
          </button>
          <div class="user-dd" id="userDd">
            <a href="profile.html">My profile</a>
            <hr/>
            <button data-logout>Sign out</button>
          </div>
        </div>`;
      const btn = document.getElementById('userBtn');
      const dd  = document.getElementById('userDd');
      btn.onclick = (e) => { e.stopPropagation(); dd.classList.toggle('open'); };
      document.addEventListener('click', () => dd.classList.remove('open'));
    }

    // mobile menu
    const mb = document.querySelector('.menu-btn');
    if (mb) mb.addEventListener('click', () => side?.classList.toggle('open'));

    document.querySelectorAll('[data-logout]').forEach(b =>
      b.addEventListener('click', e => { e.preventDefault(); Session.logout(); })
    );
  }

  // ---------- bootstrap ----------
  function bootstrap(opts) {
    opts = opts || {};
    if (!Session.token()) { window.location.href = LOGIN_URL; return; }
    document.addEventListener('DOMContentLoaded', async () => {
      renderShell(opts.active);

      // best-effort refresh of cached user (silent)
      try {
        const { user } = await api('/api/auth/me');
        Session.set(null, user);
        renderShell(opts.active);
      } catch (_) { /* ignored */ }
    });
  }

  // ---------- export ----------
  window.PF = {
    api, fmt, toast, openModal, confirmModal, renderShell, bootstrap, Session,
  };
})();

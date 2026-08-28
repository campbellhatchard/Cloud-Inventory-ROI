/* ═══════════════════════════════════════════════════════════════════
   api.js  —  Shared client-side API fetch helper

   Loaded by index.html via <script src="src/client/api.js">
   Provides:
   - apiFetch()  — injects Authorization header, handles 401 redirect
   - getUser()   — returns cached user object from sessionStorage
   - getToken()  — returns raw JWT from sessionStorage
   - logout()    — calls /api/auth/logout then redirects to /login.html
   - initAuth()  — call on page load to verify session and populate UI
   ═══════════════════════════════════════════════════════════════════ */

(function() {

  /* ── Token + user from sessionStorage ── */
  function getToken() {
    return sessionStorage.getItem('ci_token');
  }

  function getUser() {
    try { return JSON.parse(sessionStorage.getItem('ci_user') || '{}'); }
    catch(e) { return {}; }
  }

  /* ── apiFetch — wraps fetch with auth header and 401 handling ── */
  async function apiFetch(url, options = {}) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const resp = await fetch(url, { ...options, headers });

    if (resp.status === 401) {
      /* Session expired or invalid — show a clear modal, then redirect.
         Guard against re-entrancy so multiple in-flight 401s don't stack. */
      if (!window.__ciSessionExpiring) {
        window.__ciSessionExpiring = true;
        if (window.CIAIState) window.CIAIState.clearAll();
        sessionStorage.removeItem('ci_token');
        sessionStorage.removeItem('ci_user');
        /* Remember the current view so login can return the rep to it. */
        try {
          const returnTo = window.location.pathname + window.location.search + window.location.hash;
          if (returnTo && !returnTo.includes('login.html')) {
            sessionStorage.setItem('ci_return_to', returnTo);
          }
        } catch (e) {}
        showSessionExpiryModal();
      }
      return null;
    }

    return resp;
  }

  /* ── Session expiry modal ────────────────────────────────────────
     Shown instead of a fleeting toast when the server returns 401.
     Gives the rep a clear explanation and a deliberate sign-in button.
     Auto-redirects after 12 seconds if they don't click. */
  function showSessionExpiryModal() {
    /* Remove any existing instance */
    var old = document.getElementById('sessionExpiryModal');
    if (old) old.remove();

    var modal = document.createElement('div');
    modal.id = 'sessionExpiryModal';
    modal.style.cssText = [
      'position:fixed','inset:0','z-index:99999',
      'background:rgba(14,20,27,.72)',
      'display:flex','align-items:center','justify-content:center',
      'padding:20px','backdrop-filter:blur(3px)'
    ].join(';');

    modal.innerHTML = [
      '<div style="background:#fff;border-radius:16px;padding:32px 36px;max-width:420px;',
        'width:100%;box-shadow:0 24px 64px rgba(0,0,0,.22);text-align:center;">',
        '<div style="font-size:36px;margin-bottom:16px;">&#128274;</div>',
        '<div style="font-size:18px;font-weight:700;color:#1E2931;margin-bottom:8px;">',
          'Your session has expired',
        '</div>',
        '<div style="font-size:14px;color:#6B7A8D;line-height:1.6;margin-bottom:24px;">',
          'For security, sessions time out after a period of inactivity. ',
          'Your work is saved &mdash; sign in again to pick up right where you left off.',
        '</div>',
        '<button id="sessionExpiryBtn" onclick="window.location.href=\'/login.html?expired=1\'" ',
          'style="background:#00AECF;color:#fff;border:none;border-radius:10px;',
          'padding:12px 28px;font-size:15px;font-weight:700;cursor:pointer;',
          'width:100%;font-family:inherit;transition:background .15s;">',
          'Sign in again',
        '</button>',
        '<div id="sessionExpiryCountdown" style="font-size:12px;color:#A7B4C0;margin-top:14px;">',
          'Redirecting automatically in <span id="sessionExpirySecs">12</span> seconds\u2026',
        '</div>',
      '</div>'
    ].join('');

    document.body.appendChild(modal);

    /* Hover state on the button */
    var btn = document.getElementById('sessionExpiryBtn');
    if (btn) {
      btn.addEventListener('mouseenter', function(){ btn.style.background = '#0089A6'; });
      btn.addEventListener('mouseleave', function(){ btn.style.background = '#00AECF'; });
    }

    /* Countdown and auto-redirect */
    var secs = 12;
    var secsEl = document.getElementById('sessionExpirySecs');
    var interval = setInterval(function() {
      secs--;
      if (secsEl) secsEl.textContent = secs;
      if (secs <= 0) {
        clearInterval(interval);
        window.location.href = '/login.html?expired=1';
      }
    }, 1000);
  }
  async function logout() {
    /* Route through the same unsaved-changes gate as tab switching. */
    if (typeof window.confirmDiscardChanges === 'function' && !window.confirmDiscardChanges()) return;
    if (typeof window.clearCalcDirty === 'function') window.clearCalcDirty();
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch(e) {}
    if (window.CIAIState) window.CIAIState.clearAll();
    sessionStorage.removeItem('ci_token');
    sessionStorage.removeItem('ci_user');
    window.location.href = '/login.html';
  }

  /* ── initAuth — run on page load in index.html ──
     1. If no token: redirect to login
     2. If token: verify with /api/auth/me
     3. Populate topbar user avatar
     4. If firstLogin: redirect to change-password.html
  */
  async function initAuth() {
    const token = getToken();
    if (!token) {
      window.location.href = '/login.html';
      return null;
    }

    try {
      const resp = await apiFetch('/api/auth/me');
      if (!resp || !resp.ok) {
        sessionStorage.removeItem('ci_token');
        sessionStorage.removeItem('ci_user');
        window.location.href = '/login.html';
        return null;
      }

      const user = await resp.json();
      sessionStorage.setItem('ci_user', JSON.stringify(user));

      if (user.first_login) {
        window.location.href = '/change-password.html?first=1';
        return null;
      }

      /* Populate topbar */
      populateTopbar(user);
      return user;

    } catch(err) {
      console.error('Auth check failed:', err.message);
      /* Network error — don't redirect, let user continue */
      return getUser();
    }
  }

  /* ── Populate topbar with user avatar and name ── */
  function populateTopbar(user) {
    const right = document.getElementById('topbarRight');
    if (!right) return;

    const initials = (user.username || 'U')
      .trim().split(/\s+/)
      .map(w => w[0]).slice(0, 2).join('').toUpperCase();

    const roleColors = { admin: '#5B2D8E', rep: '#1E2931' };
    const roleLabels = { admin: 'Admin', rep: 'Rep/SE' };

    right.innerHTML = `
      <span class="topbar-date" id="todayDate"></span>
      <div class="topbar-user-menu" id="userMenuWrap">
        <button class="topbar-avatar" onclick="toggleUserMenu()" title="${user.username}">
          ${initials}
        </button>
        <div class="user-dropdown" id="userDropdown" style="display:none;">
          <div class="ud-header">
            <div class="ud-name">${user.username}</div>
            <div class="ud-role" style="background:${(roleColors[user.role]||'#1E2931')}20;color:${roleColors[user.role]||'#1E2931'}">${roleLabels[user.role]||user.role}</div>
            <div class="ud-email">${user.email || ''}</div>
          </div>
          <div class="ud-items">
            <button class="ud-item" onclick="switchTab('profile');closeUserMenu()">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" stroke-width="1.4"/><path d="M2 14c0-3.31 2.69-6 6-6s6 2.69 6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
              My profile
            </button>
            <button class="ud-item" onclick="switchTab('profile');closeUserMenu()">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="7" width="12" height="8" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
              Change password
            </button>
            <div class="ud-divider"></div>
            <button class="ud-item ud-signout" onclick="window.ciAuth.logout()">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M11 11l3-3-3-3M14 8H6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
              Sign out
            </button>
          </div>
        </div>
      </div>`;

    /* Set today's date */
    const dateEl = document.getElementById('todayDate');
    if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });
  }

  /* ── User menu toggle ── */
  function toggleUserMenu() {
    const dd = document.getElementById('userDropdown');
    if (dd) dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
  }

  function closeUserMenu() {
    const dd = document.getElementById('userDropdown');
    if (dd) dd.style.display = 'none';
  }

  /* Close menu on outside click */
  document.addEventListener('click', (e) => {
    const wrap = document.getElementById('userMenuWrap');
    if (wrap && !wrap.contains(e.target)) closeUserMenu();
  });

  /* ── Expose globally ── */
  window.ciAuth = { apiFetch, getToken, getUser, logout, initAuth };
  window.apiFetch    = apiFetch;
  window.toggleUserMenu = toggleUserMenu;
  window.closeUserMenu  = closeUserMenu;

})();

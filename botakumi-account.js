/* botakumi-account.js — shared nav account widget + login popup.
   ─────────────────────────────────────────────────────────────────────────
   Drops the SAME account UI (login button → modal popup, signed-in dropdown)
   onto every tool page, matching the home page (index.html). Depends on
   window.BOTAuth (botakumi-auth.js) being loaded first.

   Mount target, in priority order:
     1. an existing  #nav-acct  element  → replaced in place
     2. the first    .navlinks          → widget appended as last child
   Nothing happens if neither is present.

   Public API:
     window.BOTAccount.openLogin({ reason }) — open the login modal
     window.BOTAccount.closeLogin()          — dismiss it
*/
(function () {
  if (window.BOTAccount) return; // guard against double-load

  /* ----------------------------- icons ----------------------------- */
  var ICONS = {
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
    logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3"/><path d="M10 17l-5-5 5-5"/><path d="M5 12h11"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="1"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 9v5"/><path d="M12 17.5h.01"/></svg>'
  };

  /* ----------------------------- styles ----------------------------- */
  var CSS = '\
.navlinks { align-items: center; }\
.bot-nav-account { display: flex; align-items: center; padding-left: clamp(1.2rem, 2.6vw, 2rem); border-left: 1px solid var(--line); }\
.bot-login-btn { appearance: none; cursor: pointer; font-family: var(--font-mono); font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.18em; display: inline-flex; align-items: center; gap: 0.5rem; background: transparent; color: var(--ink-dim); border: 1px solid var(--line); padding: 0.55rem 0.9rem; transition: color 0.3s ease, border-color 0.3s ease; line-height: 1; }\
.bot-login-btn:hover { color: var(--accent); border-color: var(--accent); }\
.bot-login-btn svg { width: 14px; height: 14px; }\
.bot-acct { position: relative; }\
.bot-acct-btn { appearance: none; cursor: pointer; font-family: var(--font-body); display: flex; align-items: center; gap: 0.6rem; background: transparent; color: var(--ink); border: 1px solid var(--line); padding: 0.35rem 0.6rem 0.35rem 0.4rem; transition: border-color 0.3s ease; }\
.bot-acct-btn:hover { border-color: var(--accent); }\
.bot-acct-avatar { width: 26px; height: 26px; flex: none; background: var(--accent); color: #0a0a0a; font-family: var(--font-mono); font-size: 0.72rem; font-weight: 600; display: grid; place-items: center; }\
.bot-acct-name { font-size: 0.92rem; letter-spacing: 0.02em; max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\
.bot-acct-chev { color: var(--ink-faint); display: grid; place-items: center; transition: transform 0.2s ease; }\
.bot-acct-chev.up { transform: rotate(180deg); }\
.bot-acct-chev svg { width: 13px; height: 13px; }\
.bot-acct-menu { position: absolute; right: 0; top: calc(100% + 8px); min-width: 210px; background: var(--surface); border: 1px solid var(--line); box-shadow: 0 24px 60px rgba(0,0,0,0.6); padding: 0.4rem; z-index: 1200; }\
.bot-acct-greet { padding: 0.6rem 0.7rem; color: var(--ink-faint); font-family: var(--font-mono); font-size: 0.58rem; text-transform: uppercase; letter-spacing: 0.18em; }\
.bot-acct-greet b { color: var(--ink-dim); }\
.bot-acct-item { width: 100%; appearance: none; cursor: pointer; font-family: var(--font-body); text-align: left; display: flex; align-items: center; gap: 0.7rem; background: transparent; border: none; color: var(--ink); font-size: 0.98rem; padding: 0.7rem 0.7rem; transition: background 0.2s ease, color 0.2s ease; }\
.bot-acct-item svg { width: 15px; height: 15px; color: var(--ink-faint); }\
.bot-acct-item:hover { background: var(--surface-2); }\
.bot-acct-item.danger, .bot-acct-item.danger svg { color: #c98b6a; }\
.bot-acct-sep { height: 1px; background: var(--line); margin: 0.35rem 0.4rem; }\
.bot-auth-backdrop { position: fixed; inset: 0; z-index: 2000; background: radial-gradient(900px 600px at 80% -10%, var(--accent-soft), transparent 60%), rgba(8,8,8,0.86); backdrop-filter: blur(6px); display: grid; overflow-y: auto; padding: 1.4rem; }\
.bot-auth-card { width: 100%; max-width: 420px; margin: auto; background: var(--surface); border: 1px solid var(--line); box-shadow: 0 30px 80px rgba(0,0,0,0.7); padding: 2.4rem 2.2rem 2rem; opacity: 1; transform: none; }\
@media (prefers-reduced-motion: no-preference) { .bot-auth-card { animation: botauthrise 0.35s cubic-bezier(.2,.7,.3,1) both; } @keyframes botauthrise { from { transform: translateY(12px); } to { transform: none; } } }\
.bot-auth-brand { display: flex; align-items: center; gap: 0.7rem; margin-bottom: 1.6rem; }\
.bot-auth-brand .mark { width: 34px; height: 34px; flex: none; background: var(--accent); color: #0a0a0a; display: grid; place-items: center; font-family: var(--font-head); font-weight: 600; font-size: 1.1rem; }\
.bot-auth-brand .bn { font-family: var(--font-head); font-weight: var(--head-weight, 400); color: var(--ink); font-size: 1.1rem; letter-spacing: 0.03em; }\
.bot-auth-brand .bs { font-family: var(--font-mono); font-size: 0.56rem; text-transform: uppercase; letter-spacing: 0.2em; color: var(--ink-faint); margin-top: 2px; }\
.bot-auth-title { font-family: var(--font-head); font-weight: var(--head-weight, 400); font-size: 1.9rem; color: var(--ink); margin: 0 0 0.5rem; letter-spacing: 0.01em; }\
.bot-auth-desc { color: var(--ink-dim); font-size: 1.02rem; line-height: 1.5; margin: 0 0 1.6rem; }\
.bot-auth-fields { display: flex; flex-direction: column; gap: 1rem; }\
.bot-auth-field { display: flex; flex-direction: column; gap: 0.45rem; }\
.bot-auth-field label { font-family: var(--font-mono); font-size: 0.58rem; text-transform: uppercase; letter-spacing: 0.22em; color: var(--accent); }\
.bot-auth-field input { background: var(--bg); border: 1px solid var(--line); color: var(--ink); font-family: var(--font-body); font-size: 1.05rem; padding: 0.7rem 0.85rem; outline: none; transition: border-color 0.3s ease; width: 100%; }\
.bot-auth-field input:focus { border-color: var(--accent); }\
.bot-auth-field input::placeholder { color: var(--ink-faint); font-style: italic; }\
.bot-key-wrap { position: relative; }\
.bot-key-toggle { position: absolute; right: 0.5rem; top: 50%; transform: translateY(-50%); background: transparent; border: none; cursor: pointer; color: var(--ink-faint); font-family: var(--font-mono); font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.14em; padding: 0.4rem 0.5rem; }\
.bot-key-toggle:hover { color: var(--accent); }\
.bot-auth-err { display: flex; align-items: flex-start; gap: 0.6rem; background: rgba(201,139,106,0.12); border: 1px solid rgba(201,139,106,0.3); color: #d39a7c; font-size: 0.92rem; padding: 0.7rem 0.8rem; line-height: 1.4; }\
.bot-auth-err svg { width: 15px; height: 15px; flex: none; margin-top: 2px; }\
.bot-auth-submit { appearance: none; cursor: pointer; width: 100%; margin-top: 0.3rem; background: var(--accent); border: 1px solid var(--accent); color: #0a0a0a; font-family: var(--font-mono); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.18em; display: flex; align-items: center; justify-content: center; gap: 0.6rem; padding: 0.95rem 1rem; transition: background 0.3s ease; }\
.bot-auth-submit:hover { background: #c5a76b; }\
.bot-auth-submit:disabled { opacity: 0.6; cursor: default; }\
.bot-auth-submit svg { width: 15px; height: 15px; }\
.bot-auth-cancel { margin-top: 1.1rem; text-align: center; }\
.bot-auth-cancel button { appearance: none; background: none; border: none; cursor: pointer; color: var(--ink-dim); font-family: var(--font-body); font-size: 0.95rem; }\
.bot-auth-cancel button:hover { color: var(--accent); text-decoration: underline; }\
.bot-auth-note { margin-top: 1.2rem; font-size: 0.82rem; color: var(--ink-faint); text-align: center; line-height: 1.5; font-style: italic; }';

  function injectStyles() {
    if (document.getElementById('bot-account-styles')) return;
    var s = document.createElement('style');
    s.id = 'bot-account-styles';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ----------------------------- modal ----------------------------- */
  var modalEl = null;
  var escHandler = null;

  function closeLogin() {
    if (modalEl) { modalEl.remove(); modalEl = null; }
    if (escHandler) { document.removeEventListener('keydown', escHandler); escHandler = null; }
  }

  function openLogin(opts) {
    opts = opts || {};
    if (modalEl) closeLogin();
    var auth = window.BOTAuth;
    var ownerName = (auth && auth.ownerName && auth.ownerName()) || '';
    var isFb = !!(auth && auth.isFirebase);
    var note = isFb
      ? 'Secured by Firebase \u2014 your login works on any device.'
      : "Stored in this browser. Clearing this site's data resets the owner account.";
    var desc = opts.reason || 'Log in to reach the tools and features tied to your account.';

    var back = document.createElement('div');
    back.className = 'bot-auth-backdrop';
    back.innerHTML = '\
<div class="bot-auth-card" role="dialog" aria-modal="true">\
  <div class="bot-auth-brand"><span class="mark">B</span><div><div class="bn">Blade of Takumi</div><div class="bs">Owner Access</div></div></div>\
  <h2 class="bot-auth-title">Welcome back</h2>\
  <p class="bot-auth-desc"></p>\
  <form class="bot-auth-fields" novalidate>\
    <div class="bot-auth-field"><label for="bot-user">Username</label>\
      <input id="bot-user" autocomplete="username" placeholder="e.g. owner"></div>\
    <div class="bot-auth-field"><label for="bot-pass">Password</label>\
      <div class="bot-key-wrap"><input id="bot-pass" type="password" autocomplete="current-password" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022" style="padding-right:58px">\
        <button type="button" class="bot-key-toggle">Show</button></div></div>\
    <div class="bot-auth-err" hidden><span class="bot-auth-err-ic"></span><span class="bot-auth-err-msg"></span></div>\
    <button type="submit" class="bot-auth-submit">' + ICONS.lock + ' <span class="bot-submit-label">Log in</span></button>\
  </form>\
  <div class="bot-auth-cancel"><button type="button">Not now</button></div>\
  <p class="bot-auth-note"></p>\
</div>';

    back.querySelector('.bot-auth-desc').textContent = desc;
    back.querySelector('.bot-auth-note').textContent = note;
    back.querySelector('.bot-auth-err-ic').innerHTML = ICONS.warn;

    var userInput = back.querySelector('#bot-user');
    var passInput = back.querySelector('#bot-pass');
    var toggle = back.querySelector('.bot-key-toggle');
    var errBox = back.querySelector('.bot-auth-err');
    var errMsg = back.querySelector('.bot-auth-err-msg');
    var form = back.querySelector('.bot-auth-fields');
    var submitBtn = back.querySelector('.bot-auth-submit');
    var submitLabel = back.querySelector('.bot-submit-label');
    var cancelBtn = back.querySelector('.bot-auth-cancel button');

    userInput.value = ownerName;

    function showErr(m) { errMsg.textContent = m; errBox.hidden = false; }
    function clearErr() { errBox.hidden = true; }

    toggle.addEventListener('click', function () {
      var showing = passInput.type === 'text';
      passInput.type = showing ? 'password' : 'text';
      toggle.textContent = showing ? 'Show' : 'Hide';
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearErr();
      var username = userInput.value.trim();
      var password = passInput.value;
      if (!username) return showErr('Choose a username.');
      if (!password) return showErr('Enter your password.');
      if (!auth || !auth.signIn) return showErr('Login isn\u2019t available right now.');
      submitBtn.disabled = true;
      submitLabel.textContent = 'Logging in\u2026';
      auth.signIn({ username: username, password: password }).then(function () {
        closeLogin();
        if (typeof opts.onSuccess === 'function') opts.onSuccess();
      }).catch(function (err) {
        submitBtn.disabled = false;
        submitLabel.textContent = 'Log in';
        showErr(auth.mapError ? auth.mapError(err) : (err && err.message) || 'Something went wrong.');
      });
    });

    cancelBtn.addEventListener('click', closeLogin);
    back.addEventListener('mousedown', function (e) { if (e.target === back) closeLogin(); });
    escHandler = function (e) { if (e.key === 'Escape') closeLogin(); };
    document.addEventListener('keydown', escHandler);

    document.body.appendChild(back);
    modalEl = back;
    setTimeout(function () { passInput.focus(); }, 30);
  }

  /* ----------------------------- nav widget ----------------------------- */
  var container = null;
  var menuOpen = false;
  var outsideHandler = null;

  function render(user) {
    if (!container) return;
    container.innerHTML = '';
    menuOpen = false;
    if (outsideHandler) { document.removeEventListener('mousedown', outsideHandler); outsideHandler = null; }

    if (!user) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bot-login-btn';
      btn.innerHTML = ICONS.user + ' Log in';
      btn.addEventListener('click', function () { openLogin(); });
      container.appendChild(btn);
      return;
    }

    var name = user.username || 'Owner';
    var initial = name.slice(0, 1).toUpperCase();
    var acct = document.createElement('div');
    acct.className = 'bot-acct';
    acct.innerHTML = '\
<button type="button" class="bot-acct-btn">\
  <span class="bot-acct-avatar">' + initial + '</span>\
  <span class="bot-acct-name"></span>\
  <span class="bot-acct-chev">' + ICONS.chevron + '</span>\
</button>\
<div class="bot-acct-menu" hidden>\
  <div class="bot-acct-greet">Signed in as <b></b></div>\
  <div class="bot-acct-sep"></div>\
  <button type="button" class="bot-acct-item danger">' + ICONS.logout + ' Log out</button>\
</div>';
    acct.querySelector('.bot-acct-name').textContent = name;
    acct.querySelector('.bot-acct-greet b').textContent = name;

    var trigger = acct.querySelector('.bot-acct-btn');
    var chev = acct.querySelector('.bot-acct-chev');
    var menu = acct.querySelector('.bot-acct-menu');
    var logoutBtn = acct.querySelector('.bot-acct-item.danger');

    function setOpen(o) {
      menuOpen = o;
      menu.hidden = !o;
      chev.classList.toggle('up', o);
      if (o) {
        outsideHandler = function (e) { if (!acct.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', outsideHandler);
      } else if (outsideHandler) {
        document.removeEventListener('mousedown', outsideHandler);
        outsideHandler = null;
      }
    }

    trigger.addEventListener('click', function () { setOpen(!menuOpen); });
    logoutBtn.addEventListener('click', function () {
      setOpen(false);
      if (window.BOTAuth && window.BOTAuth.signOut) window.BOTAuth.signOut();
    });

    container.appendChild(acct);
  }

  function mount() {
    injectStyles();
    container = document.createElement('div');
    container.className = 'bot-nav-account';

    var existing = document.getElementById('nav-acct');
    if (existing && existing.parentNode) {
      existing.parentNode.replaceChild(container, existing);
    } else {
      var nav = document.querySelector('.navlinks');
      if (!nav) return; // nowhere to mount
      nav.appendChild(container);
    }

    if (window.BOTAuth && window.BOTAuth.onChange) {
      window.BOTAuth.onChange(render); // fires immediately with cached state
    } else {
      render(null);
    }
  }

  window.BOTAccount = { openLogin: openLogin, closeLogin: closeLogin };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();

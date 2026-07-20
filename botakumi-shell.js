/* ============================================================
   Blade of Takumi — shared admin shell
   Three modes:
   • host      — window.BOTShell = { host: true }
                 Builds the persistent sidebar + topbar + a content
                 <iframe> and routes tools into it via the URL hash
                 (#/Rihla.html). Used by Dashboard.html only.
   • embedded  — a tool page loaded INSIDE the host iframe. Injects the
                 shared token CSS so the page is styled, lets the body
                 scroll, but builds NO chrome (the host owns it).
   • standalone— a tool page opened directly (e.g. a deep GitHub link).
                 Injects CSS AND wraps the page in the full sidebar
                 chrome, so the tool still works on its own.

   Per page, before this script:
     <script>window.BOTShell = { active: "kaizen" };</script>   // tool
     <script>window.BOTShell = { host: true };</script>          // host
   active keys: home | presence | essays | connect | tools |
                rihla | suzuri | kaizen | teleprompter | finance | crm
   ============================================================ */
(function () {
  var cfg = window.BOTShell || {};
  var IS_HOST = !!cfg.host;
  if (IS_HOST) { try { window.__BOT_HOST = true; } catch (e) {} }

  /* embedded = running inside our own host's iframe (same origin) */
  var IS_EMBED = false;
  if (!IS_HOST) {
    try { IS_EMBED = !!(window.parent && window.parent !== window && window.parent.__BOT_HOST); } catch (e) { IS_EMBED = false; }
  }

  /* ---------- shared theme + chrome CSS ---------- */
  var CSS = `
  :root{
    --olive-950:#22201a; --olive-900:#302d22; --olive-800:#403c2d; --olive-700:#504b38; --olive-600:#625c45; --olive-500:#736c52; --olive-400:#928b6f;
    --gold-700:#8f875f; --gold-600:#d2971a; --gold-500:#ebae2b; --gold-300:#d8d3b6; --gold-200:#e7e3cf; --gold-100:#fcf2d6;
    --cream-50:#fbfaf3; --cream-100:#f7f5eb; --cream-200:#efecdc; --cream-300:#e5e1cb;
    --success-500:#6f7a4d; --success-100:#e7ead6; --warning-500:#c08a3e; --warning-100:#f4e7cf; --danger-500:#a4503f; --danger-100:#efd9d1; --info-500:#5f7a86; --info-100:#dbe6ea;
    --surface-page:#ffffff; --surface-card:#ffffff; --surface-sunken:#f6f5ef;
    --border-subtle:#e5e1cb;
    --text-strong:#302d22; --text-body:#504b38; --text-muted:#736c52; --text-subtle:#928b6f;
    --radius-sm:6px; --radius-md:10px; --radius-lg:16px; --radius-circle:50%;
    --shadow-xs:0 1px 2px rgba(80,75,56,0.06); --shadow-sm:0 2px 8px rgba(80,75,56,0.08); --shadow-md:0 8px 24px rgba(80,75,56,0.10); --shadow-lg:0 18px 48px rgba(80,75,56,0.14);
    --ease-out:cubic-bezier(0.16,1,0.3,1); --ease-standard:cubic-bezier(0.32,0.72,0.32,1);
    --font-sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    --font-brand:'Luxia Display',Georgia,serif;
  }
  *,*::before,*::after{ box-sizing:border-box; }
  html,body{ margin:0; height:100vh; overflow:hidden; background:var(--surface-page); color:var(--text-body); font-family:var(--font-sans); font-size:16px; line-height:1.5; -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility; }
  ::-webkit-scrollbar{ width:10px; height:10px; }
  ::-webkit-scrollbar-thumb{ background:var(--gold-200); border-radius:999px; border:3px solid #fff; }
  ::selection{ background:var(--gold-100); }
  .bot-shell h1,.bot-shell h2,.bot-shell h3{ font-weight:700; letter-spacing:-0.02em; margin:0; color:var(--text-strong); }
  .bot-shell a{ color:inherit; text-decoration:none; }

  .bot-shell{ display:flex; height:100vh; overflow:hidden; }
  .bot-sidebar{ width:244px; flex:0 0 244px; background:var(--surface-card); border-right:1px solid var(--border-subtle); display:flex; flex-direction:column; height:100%; overflow:hidden; transition:width 200ms var(--ease-out), flex-basis 200ms var(--ease-out), transform 240ms var(--ease-out); }
  .bot-brand{ display:flex; align-items:center; gap:11px; padding:20px 22px 22px; white-space:nowrap; }
  .bot-brand .mark{ width:32px; height:32px; flex:none; display:grid; place-items:center; background:var(--gold-500); color:var(--olive-900); border-radius:var(--radius-sm); font-family:var(--font-brand); font-weight:700; font-size:18px; overflow:hidden; }
  .bot-brand .mark img{ width:100%; height:100%; object-fit:contain; padding:4px; }
  .bot-brand .word{ font-family:var(--font-brand); font-size:22px; color:var(--olive-900); line-height:1; }
  .bot-nav{ display:flex; flex-direction:column; gap:4px; padding:0 14px; flex:1; overflow-y:auto; overflow-x:hidden; }
  .bot-group{ margin-top:12px; }
  .bot-group-h{ font-weight:600; font-size:10.5px; letter-spacing:0.12em; text-transform:uppercase; color:var(--text-subtle); padding:0 12px 8px; white-space:nowrap; }
  .bot-group-rule{ display:none; height:1px; background:var(--border-subtle); margin:4px 8px 8px; }
  .bot-navitem{ display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:var(--radius-md); cursor:pointer; position:relative; color:var(--olive-700); font-size:14px; font-weight:450; white-space:nowrap; transition:background 140ms var(--ease-standard); }
  .bot-navitem:hover{ background:var(--cream-100); color:var(--olive-900); }
  .bot-navitem svg{ width:18px; height:18px; flex:none; color:var(--olive-500); }
  .bot-navitem.current{ background:var(--gold-100); color:var(--olive-900); font-weight:600; }
  .bot-navitem.current svg{ color:var(--olive-900); }
  .bot-navitem .marker{ position:absolute; right:6px; top:9px; bottom:9px; width:3.5px; border-radius:3px; background:var(--gold-500); display:none; }
  .bot-navitem.current .marker{ display:block; }
  .bot-foot{ padding:14px; border-top:1px solid var(--border-subtle); }
  .bot-foot .pill{ display:flex; align-items:center; justify-content:space-between; gap:10px; padding:9px 12px; border-radius:var(--radius-md); background:var(--surface-sunken); font-size:12.5px; color:var(--olive-700); white-space:nowrap; }
  .bot-foot .pill svg{ width:15px; height:15px; flex:none; color:var(--olive-500); }

  .bot-shell.collapsed .bot-sidebar{ width:66px; flex-basis:66px; }
  .bot-shell.collapsed .bot-brand{ justify-content:center; padding:20px 0 22px; }
  .bot-shell.collapsed .bot-brand .word{ display:none; }
  .bot-shell.collapsed .bot-navitem{ justify-content:center; padding:10px 0; }
  .bot-shell.collapsed .bot-navitem .label,
  .bot-shell.collapsed .bot-navitem .marker,
  .bot-shell.collapsed .bot-group-h,
  .bot-shell.collapsed .bot-foot .pill span{ display:none; }
  .bot-shell.collapsed .bot-group-rule{ display:block; }
  .bot-shell.collapsed .bot-foot .pill{ justify-content:center; }

  .bot-main{ flex:1; display:flex; flex-direction:column; min-width:0; }
  .bot-topbar{ display:flex; align-items:center; gap:16px; padding:0 28px; height:62px; flex-shrink:0; border-bottom:1px solid var(--border-subtle); background:var(--surface-card); }
  .bot-iconbtn{ display:inline-flex; padding:8px; border-radius:var(--radius-sm); cursor:pointer; color:var(--olive-600); border:none; background:transparent; transition:background 140ms var(--ease-standard); }
  .bot-iconbtn:hover{ background:var(--cream-100); }
  .bot-iconbtn svg{ width:20px; height:20px; }
  .bot-title{ font-family:var(--font-brand); font-size:20px; color:var(--olive-900); letter-spacing:0; }
  .bot-topbar .spacer{ flex:1; }
  .bot-user{ display:flex; align-items:center; gap:8px; padding-left:12px; border-left:1px solid var(--border-subtle); }
  .bot-user .avatar{ width:34px; height:34px; flex:none; display:grid; place-items:center; border-radius:var(--radius-circle); background:var(--olive-700); color:var(--cream-100); font-weight:600; font-size:13px; }
  .bot-user .meta{ display:flex; flex-direction:column; line-height:1.15; }
  .bot-user .uname{ font-size:13px; font-weight:600; color:var(--olive-900); }
  .bot-user .urole{ font-size:11px; color:var(--gold-700); font-weight:500; }

  .bot-scroll{ flex:1; overflow-y:auto; }
  .bot-frame{ flex:1; width:100%; height:100%; border:0; display:block; background:var(--surface-page); }
  .bot-scrim{ display:none; position:fixed; inset:0; z-index:40; background:rgba(34,32,26,0.4); backdrop-filter:blur(2px); opacity:0; transition:opacity 240ms var(--ease-out); }

  /* content helpers pages can use */
  .bot-page{ padding:34px 40px 76px; }
  .bot-page a{ text-decoration:none; color:inherit; }
  .bot-back{ display:none; align-items:center; gap:6px; width:auto; font-family:var(--font-sans); font-size:13px; font-weight:600; color:var(--olive-700); padding:7px 12px 7px 9px; border:1px solid var(--border-subtle); border-radius:var(--radius-md); }
  .bot-back:hover{ background:var(--cream-100); color:var(--olive-900); }
  .bot-back svg{ width:16px; height:16px; }
  .bot-page-h{ font-size:48px; line-height:1.05; color:var(--olive-900); font-weight:700; letter-spacing:-0.02em; }
  .bot-page-sub{ font-size:16px; color:var(--text-muted); margin:8px 0 0; }

  @media (max-width:860px){
    .bot-sidebar{ position:fixed; top:0; left:0; z-index:50; transform:translateX(-100%); box-shadow:var(--shadow-lg); }
    .bot-shell.nav-open .bot-sidebar{ transform:translateX(0); }
    .bot-shell.nav-open .bot-scrim{ display:block; opacity:1; }
    .bot-shell.collapsed .bot-sidebar{ width:244px; flex-basis:244px; }
    .bot-shell.collapsed .bot-brand{ justify-content:flex-start; padding:20px 22px 22px; }
    .bot-shell.collapsed .bot-brand .word,
    .bot-shell.collapsed .bot-navitem .label,
    .bot-shell.collapsed .bot-group-h,
    .bot-shell.collapsed .bot-foot .pill span{ display:inline; }
    .bot-shell.collapsed .bot-navitem{ justify-content:flex-start; padding:10px 12px; }
    .bot-shell.collapsed .bot-group-rule{ display:none; }
    .bot-page{ padding:26px 20px 64px; }
    .bot-page-h{ font-size:38px; }
  }`;

  /* embedded pages have no shell wrapper, so let their own body scroll */
  var EMBED_CSS = `html,body{ height:auto !important; min-height:100% !important; overflow:auto !important; }`;

  /* ---------- icons ---------- */
  var IC = {
    home: '<path d="M3 11l9-8 9 8"></path><path d="M5 10v10h14V10"></path>',
    presence: '<circle cx="12" cy="8" r="3.5"></circle><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6"></path>',
    essays: '<path d="M4 5h16v14H4z"></path><path d="M8 9h8M8 13h8M8 17h5"></path>',
    connect: '<path d="M9 15l6-6"></path><path d="M13 7l1-1a3.5 3.5 0 0 1 5 5l-1 1"></path><path d="M11 17l-1 1a3.5 3.5 0 0 1-5-5l1-1"></path>',
    tools: '<rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect>',
    lock: '<rect x="4" y="10" width="16" height="10" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"></path>',
    back: '<path d="M15 6l-6 6 6 6"></path>'
  };
  function svg(name, sw) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw || 1.9) + '" stroke-linecap="round" stroke-linejoin="round">' + (IC[name] || "") + '</svg>'; }

  /* page = content doc loaded into the host frame.
     standalone = the real href when a page is opened on its own.
     ext = an off-shell site section (opens the whole window). */
  var GROUPS = [
    { heading: "Navigation", items: [
      { key: "home", label: "Home", page: "Dashboard Home.html", icon: "home" },
    ]},
    { heading: "Tools", items: [
      { key: "tools", label: "Tools", page: "Tools.html", standalone: "Dashboard.html", icon: "tools" },
    ]},
  ];
  var DEFAULT_PAGE = "Tools.html";

  function buildSidebar() {
    var groups = GROUPS.map(function (g) {
      var items = g.items.map(function (n) {
        var cur = n.key === cfg.active ? " current" : "";
        var attrs, dp = "";
        if (IS_HOST) {
          if (n.ext) attrs = 'href="' + n.href + '" target="_top"';
          else { attrs = 'href="#/' + encodeURIComponent(n.page) + '"'; dp = ' data-page="' + n.page + '"'; }
        } else {
          attrs = 'href="' + (n.ext ? n.href : (n.standalone || n.page)) + '"';
        }
        return '<a class="bot-navitem' + cur + '" ' + attrs + dp + ' data-key="' + n.key + '">' + svg(n.icon) +
          '<span class="label">' + n.label + '</span><span class="marker"></span></a>';
      }).join("");
      return '<div class="bot-group"><div class="bot-group-h">' + g.heading + '</div><div class="bot-group-rule"></div>' + items + '</div>';
    }).join("");
    return '<aside class="bot-sidebar">' +
      '<div class="bot-brand"><a href="https://bladeoftakumi.com" class="mark" target="_top"><img src="assets/logo-line.png" alt="Blade of Takumi" /></a><a href="https://bladeoftakumi.com" class="word" target="_top">Blade of Takumi</a></div>' +
      '<nav class="bot-nav">' + groups + '</nav>' +
      '<div class="bot-foot"><div class="pill"><span>Owner only</span>' + svg("lock", 1.8) + '</div></div>' +
      '</aside>';
  }
  function buildTopbar() {
    return '<header class="bot-topbar">' +
      '<button class="bot-iconbtn" id="bot-nav-toggle" type="button" aria-label="Toggle sidebar">' + svg("menu", 1.8) + '</button>' +
      '<button class="bot-iconbtn bot-back" id="bot-back" type="button">' + svg("back", 2) + '<span>Tools</span></button>' +
      '<div class="spacer"></div>' +
      '<div class="bot-user"><span class="avatar" id="bot-avatar">\u00b7</span>' +
        '<div class="meta"><span class="uname" id="bot-uname">Owner</span><span class="urole">Owner</span></div></div>' +
      '</header>';
  }

  function injectCSS() {
    if (!document.getElementById("bot-shell-css")) {
      var style = document.createElement("style");
      style.id = "bot-shell-css";
      style.textContent = CSS;
      document.head.appendChild(style);
    }
  }

  function wireCommon(shell) {
    var tgl = document.getElementById("bot-nav-toggle");
    var scrim = document.getElementById("bot-scrim");
    var mq = window.matchMedia("(max-width: 860px)");
    if (tgl) tgl.addEventListener("click", function () {
      if (mq.matches) shell.classList.toggle("nav-open");
      else shell.classList.toggle("collapsed");
    });
    if (scrim) scrim.addEventListener("click", function () { shell.classList.remove("nav-open"); });
    shell.querySelectorAll(".bot-navitem").forEach(function (a) {
      a.addEventListener("click", function () { shell.classList.remove("nav-open"); });
    });
    if (mq.addEventListener) mq.addEventListener("change", function () { shell.classList.remove("nav-open"); });
    if (window.BOTAuth && window.BOTAuth.ready) {
      window.BOTAuth.ready.then(function () {
        var u = window.BOTAuth.current && window.BOTAuth.current();
        if (!u) return;
        var name = u.username || "Owner";
        var un = document.getElementById("bot-uname"); if (un) un.textContent = name;
        var av = document.getElementById("bot-avatar"); if (av) av.textContent = (name[0] || "\u00b7").toUpperCase();
      }).catch(function () {});
    }
  }

  /* ---------- HOST: sidebar + topbar + routed iframe ---------- */
  function buildHost() {
    if (document.getElementById("bot-shell")) return;
    injectCSS();
    var shell = document.createElement("div");
    shell.className = "bot-shell";
    shell.id = "bot-shell";
    shell.innerHTML = buildSidebar() +
      '<div class="bot-scrim" id="bot-scrim"></div>' +
      '<div class="bot-main">' + buildTopbar() +
        '<iframe class="bot-frame" id="bot-frame" title="Tool" name="bot-frame"></iframe>' +
      '</div>';
    document.body.appendChild(shell);
    wireCommon(shell);

    var frame = document.getElementById("bot-frame");
    var syncing = false;

    function routePage() {
      var h = location.hash;
      if (h.indexOf("#/") === 0 && h.length > 2) return decodeURIComponent(h.slice(2));
      return DEFAULT_PAGE;
    }
    function pageOf(url) { try { var last = (url.split("#")[0].split("/").pop()) || DEFAULT_PAGE; return decodeURIComponent(last); } catch (e) { return DEFAULT_PAGE; } }
    var NAV_PAGES = {};
    GROUPS.forEach(function (g) { g.items.forEach(function (n) { if (n.page) NAV_PAGES[pageOf(n.page)] = 1; }); });
    var backBtn = document.getElementById("bot-back");
    if (backBtn) backBtn.addEventListener("click", function () { location.hash = "#/" + encodeURIComponent(DEFAULT_PAGE); });
    function setActive(page) {
      var key = null;
      GROUPS.forEach(function (g) { g.items.forEach(function (n) { if (n.page && pageOf(n.page) === pageOf(page)) key = n.key; }); });
      var launched = !NAV_PAGES[pageOf(page)]; // a tool opened from the grid
      if (!key) key = "tools";
      shell.querySelectorAll(".bot-navitem").forEach(function (a) {
        a.classList.toggle("current", a.getAttribute("data-key") === key);
      });
      if (backBtn) backBtn.style.display = launched ? "inline-flex" : "none";
    }
    function load(page) {
      var curPage = "";
      try { curPage = pageOf(frame.contentWindow.location.pathname); } catch (e) { curPage = ""; }
      if (curPage !== pageOf(page)) frame.src = page;
      setActive(page);
    }

    frame.addEventListener("load", function () {
      // mirror the frame's real page into the host hash (covers in-frame
      // <a> clicks and JS redirects) so refresh / back-forward work.
      var page;
      try { page = pageOf(frame.contentWindow.location.pathname); } catch (e) { return; }
      if (!page) return;
      setActive(page);
      var want = "#/" + encodeURIComponent(page);
      if (location.hash !== want) { syncing = true; location.hash = want; setTimeout(function () { syncing = false; }, 0); }
    });

    window.addEventListener("hashchange", function () {
      if (syncing) return;
      load(routePage());
    });

    // Always open the workshop on the Tools grid, not a stale deep-linked tool.
    if (location.hash && location.hash.indexOf("#/") === 0) {
      syncing = true;
      try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { location.hash = ""; }
      setTimeout(function () { syncing = false; }, 0);
    }
    load(DEFAULT_PAGE);
  }

  /* ---------- STANDALONE: wrap the page in full chrome ---------- */
  function buildStandalone() {
    if (document.getElementById("bot-shell")) return;
    injectCSS();
    var scroll = document.createElement("div");
    scroll.className = "bot-scroll";
    scroll.id = "bot-scroll";
    while (document.body.firstChild) scroll.appendChild(document.body.firstChild);
    var shell = document.createElement("div");
    shell.className = "bot-shell";
    shell.id = "bot-shell";
    shell.innerHTML = buildSidebar() +
      '<div class="bot-scrim" id="bot-scrim"></div>' +
      '<div class="bot-main">' + buildTopbar() + '</div>';
    shell.querySelector(".bot-main").appendChild(scroll);
    document.body.appendChild(shell);
    wireCommon(shell);

    // On an individual tool page, offer a back button to the Tools grid.
    var backBtn = document.getElementById("bot-back");
    if (backBtn && cfg.active && cfg.active !== "tools" && cfg.active !== "home") {
      backBtn.style.display = "inline-flex";
      backBtn.addEventListener("click", function () { window.location.href = "Dashboard.html"; });
    }
  }

  /* ---------- EMBEDDED: styling only, host owns the chrome ---------- */
  function buildEmbedded() {
    injectCSS();
    if (!document.getElementById("bot-embed-css")) {
      var e = document.createElement("style");
      e.id = "bot-embed-css";
      e.textContent = EMBED_CSS;
      document.head.appendChild(e);
    }
  }

  /* ---------- boot ---------- */
  function boot() {
    if (IS_HOST) buildHost();
    else if (IS_EMBED) buildEmbedded();
    else buildStandalone();
  }

  if (IS_EMBED) {
    // never build chrome inside the host frame, even for manual-mount pages
    window.BOTShellMount = function () {};
    injectCSS();
    buildEmbedded();
  } else if (cfg.manual) {
    window.BOTShellMount = boot;
    injectCSS(); // tokens available immediately for the page's own styles
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

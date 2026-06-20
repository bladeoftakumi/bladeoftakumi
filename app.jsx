const { useEffect, useState, useRef } = React;

/* ----------------------------- icons ----------------------------- */
const IconYouTube = () =>
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="4" /><path d="M10 9l5 3-5 3z" />
  </svg>;

const IconInstagram = () =>
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
  </svg>;

const IconPhoto = () =>
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="8.5" cy="9.5" r="1.6" />
    <path d="M3 16.5l5-4 4.5 3.5L17 11l4 4" />
  </svg>;

const IconTool = () =>
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a3.5 3.5 0 0 0-4.6 4.2L4 16.6a1.8 1.8 0 0 0 2.5 2.5l5.8-6.1a3.5 3.5 0 0 0 4.2-4.6l-2.2 2.2-2-.4-.4-2 2.2-2.2z" />
  </svg>;

const IconArrow = () =>
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h13" /><path d="M13 6l6 6-6 6" />
  </svg>;

const IconArrowUR = () =>
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 17L17 7" /><path d="M8 7h9v9" />
  </svg>;

const IconPen = () =>
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19l7-7 3 3-7 7-3-3z" />
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
    <path d="M2 2l7.586 7.586" />
    <circle cx="11" cy="11" r="2" />
  </svg>;

const IconLock = () =>
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="11" width="14" height="9" rx="1" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>;

const IconUser = () =>
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" /><path d="M5 20a7 7 0 0 1 14 0" />
  </svg>;

const IconChevron = () =>
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6" />
  </svg>;

const IconLogOut = () =>
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3" /><path d="M10 17l-5-5 5-5" /><path d="M5 12h11" />
  </svg>;

const IconWarn = () =>
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3 2.5 20h19L12 3Z" /><path d="M12 9v5" /><path d="M12 17.5h.01" />
  </svg>;

const IconCheck = () =>
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.5 10 17.5 19 7" />
  </svg>;

const IconPlus = () =>
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14" /><path d="M5 12h14" />
  </svg>;

const IconSearch = () =>
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
  </svg>;


/* ----------------------------- data ----------------------------- */
const LINKS = {
  instagram: "https://www.instagram.com/bladeoftakumi",
  unsplash: "https://unsplash.com/@bladeoftakumi",
  youtube: "https://www.youtube.com/@bladeoftakumi"
};

const PRESENCE = [
{ icon: <IconYouTube />, name: "YouTube", href: LINKS.youtube, kind: "ext", cue: "Watch" },
{ icon: <IconInstagram />, name: "Instagram", href: LINKS.instagram, kind: "ext", cue: "Follow" },
{ icon: <IconPen />, name: "Essays", href: "Essays.html", kind: "page", cue: "Read" },
{ icon: <IconPhoto />, name: "Unsplash", href: LINKS.unsplash, kind: "ext", cue: "Browse" }];

// RULE: the Tools section shows EXACTLY 5 tool cards + the "More" card (6 total).
// Do NOT add a 6th tool here. Any new tool goes in MORE_TOOLS below — it surfaces
// through the "More" search palette automatically.
const TOOLS = [
{ tag: "Reflection", name: "Ruminations on Death", desc: "A quiet meditation on mortality. Reflect on death to increase urgency.", href: "https://ruminationsondeath.com/", external: true },
{ tag: "Route Planner", name: "Rihla", desc: "My workflow for IRL outreach — plan routes, track visits, organize contacts.", href: "Rihla.html", account: true },
{ tag: "Essay Composer", name: "Suzuri", desc: "A tool that auto-formats my essays, ready to upload.", href: "Suzuri.html" },
{ tag: "Goal Monitor", name: "Kaizen", desc: "Track focused goals across a window of days — log progress and watch completion fill.", href: "Kaizen.html" },
{ tag: "Teleprompter", name: "Teleprompter", desc: "Paste a script, set the pace, and let the line carry your delivery on camera.", href: "Teleprompter.html" }];

// Additional / overflow tools — surfaced only through the "More" search palette.
// Add new tools here ({ tag, name, desc, href, external?, account? }) and they
// appear in the palette automatically.
const MORE_TOOLS = [
{ tag: "Finance Monitor", name: "Finance Monitor", desc: "Drop in a spreadsheet and read the month back as a clean P&L dashboard.", href: "Finance Monitor.html", gated: true }];

const ALL_TOOLS = TOOLS.concat(MORE_TOOLS);


const TYPE_SYSTEMS = {
  "Luxia": {
    head: "'Luxia Display', Georgia, serif", weight: 400,
    body: "'Luxia', Georgia, serif",
    mono: "'Luxia', Georgia, serif",
    note: "Your custom face — Luxia Display + Luxia throughout"
  },
  "Typewriter": {
    head: "'Special Elite', monospace", weight: 400,
    body: "'Cormorant Garamond', Georgia, serif",
    mono: "'Share Tech Mono', monospace",
    note: "Original — typewriter grit + literary italic"
  },
  "Couture": {
    head: "'Bodoni Moda', Georgia, serif", weight: 500,
    body: "'Cormorant Garamond', Georgia, serif",
    mono: "'Space Mono', monospace",
    note: "High-contrast Didone — fashion-editorial, bespoke"
  },
  "Atelier": {
    head: "'Instrument Serif', Georgia, serif", weight: 400,
    body: "'Spectral', Georgia, serif",
    mono: "'Space Mono', monospace",
    note: "Elegant editorial serif — quiet and assured"
  },
  "Modernist": {
    head: "'Bricolage Grotesque', system-ui, sans-serif", weight: 700,
    body: "'Newsreader', Georgia, serif",
    mono: "'Space Mono', monospace",
    note: "Characterful grotesque — gallery / contemporary"
  }
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#b4965a",
  "atmosphere": 55,
  "typeSystem": "Atelier"
} /*EDITMODE-END*/;

/* ----------------------------- auth UI ----------------------------- */
function AuthModal({ onClose, onAuthed, reason }) {
  // Owner account already exists — login only, no self-serve account creation.
  const mode = "login";
  const creating = false;
  const [username, setUsername] = useState(window.BOTAuth.ownerName() || "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!username.trim()) return setErr("Choose a username.");
    if (creating && password.length < 6) return setErr("Use a password of at least 6 characters.");
    if (!password) return setErr("Enter your password.");
    if (creating && password !== confirm) return setErr("Passwords don't match.");
    setBusy(true);
    try {
      const u = await window.BOTAuth.signIn({ username, password });
      onAuthed(u);
    } catch (e2) {
      setErr(window.BOTAuth.mapError ? window.BOTAuth.mapError(e2) : e2.message);
      setBusy(false);
    }
  };

  return (
    <div className="auth-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="auth-card" role="dialog" aria-modal="true">
        <div className="auth-brand">
          <span className="mark">B</span>
          <div>
            <div className="bn">Blade of Takumi</div>
            <div className="bs">Owner Access</div>
          </div>
        </div>
        <h2 className="auth-title">{creating ? "Create your account" : "Welcome back"}</h2>
        <p className="auth-desc">
          {reason
            ? reason
            : creating
              ? "Set up your private owner account once. It unlocks the tools that save your work \u2014 across the whole site."
              : "Log in to reach the tools and features tied to your account."}
        </p>
        <form className="auth-fields" onSubmit={submit} noValidate>
          <div className="auth-field">
            <label htmlFor="bot-user">Username</label>
            <input id="bot-user" autoComplete="username" value={username}
              onChange={(e) => setUsername(e.target.value)} placeholder="e.g. owner" />
          </div>
          <div className="auth-field">
            <label htmlFor="bot-pass">Password</label>
            <div className="key-wrap">
              <input id="bot-pass" type={show ? "text" : "password"}
                autoComplete={creating ? "new-password" : "current-password"} value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder="••••••"
                style={{ paddingRight: 58 }} />
              <button type="button" className="key-toggle" onClick={() => setShow((s) => !s)}>{show ? "Hide" : "Show"}</button>
            </div>
          </div>
          {creating && (
            <div className="auth-field">
              <label htmlFor="bot-conf">Confirm password</label>
              <input id="bot-conf" type={show ? "text" : "password"} value={confirm}
                onChange={(e) => setConfirm(e.target.value)} placeholder="••••••" />
            </div>
          )}
          {err && <div className="auth-err"><IconWarn /><span>{err}</span></div>}
          <button type="submit" className="auth-submit" disabled={busy}>
            <IconLock /> {busy ? (creating ? "Creating\u2026" : "Logging in\u2026") : (creating ? "Create account" : "Log in")}
          </button>
        </form>
        <div className="auth-cancel">
          <button type="button" onClick={onClose}>Not now</button>
        </div>
        <p className="auth-note">
          {window.BOTAuth.isFirebase
            ? "Secured by Firebase \u2014 your login works on any device."
            : (creating
              ? "Single owner \u2014 only this one account can be created. Stored in this browser for now."
              : "Stored in this browser. Clearing this site's data resets the owner account.")}
        </p>
      </div>
    </div>
  );
}

function AccountMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  const initial = (user.username || "?").slice(0, 1).toUpperCase();
  return (
    <div className="acct" ref={ref}>
      <button className="acct-btn" onClick={() => setOpen((o) => !o)}>
        <span className="acct-avatar">{initial}</span>
        <span className="acct-name">{user.username}</span>
        <span className={"acct-chev" + (open ? " up" : "")}><IconChevron /></span>
      </button>
      {open && (
        <div className="acct-menu">
          <div className="acct-greet">Signed in as <b>{user.username}</b></div>
          <div className="acct-sep"></div>
          <button className="acct-item danger" onClick={() => { setOpen(false); onLogout(); }}><IconLogOut /> Log out</button>
        </div>
      )}
    </div>
  );
}

/* ----------------------------- tool palette ----------------------------- */
function ToolPalette({ tools, onClose, user, onGated }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => { if (inputRef.current) inputRef.current.focus(); }, []);

  const query = q.trim().toLowerCase();
  const results = tools.filter((t) =>
    (t.name + " " + t.tag + " " + t.desc).toLowerCase().includes(query));

  useEffect(() => { setActive(0); }, [q]);

  const open = (t) => {
    if (!t) return;
    if (t.gated && !user) { onGated(t); return; }
    if (t.external) window.open(t.href, "_blank", "noopener");
    else window.location.href = t.href;
  };

  const onKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); open(results[active]); }
    else if (e.key === "Escape") { e.preventDefault(); onClose(); }
  };

  return (
    <div className="palette-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="palette-card" role="dialog" aria-modal="true" onKeyDown={onKey}>
        <div className="palette-search">
          <IconSearch />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tools…" />
          <span className="palette-esc">Esc</span>
        </div>
        <div className="palette-list">
          {results.length === 0
            ? <div className="palette-empty">No tools match “{q}”.</div>
            : results.map((t, i) =>
              <button
                key={t.name}
                className={"palette-item" + (i === active ? " active" : "")}
                onMouseEnter={() => setActive(i)}
                onClick={() => open(t)}>
                <span className="pi-main">
                  <span className="pi-tag">{t.tag}</span>
                  <h4 className="pi-name">{t.name}</h4>
                  <p className="pi-desc">{t.desc}</p>
                </span>
                <span className="pi-arrow">{t.external ? <IconArrowUR /> : <IconArrow />}</span>
              </button>
            )}
        </div>
      </div>
    </div>);

}

/* ----------------------------- app ----------------------------- */
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [user, setUser] = useState(() => (window.BOTAuth ? window.BOTAuth.current() : null));
  const [auth, setAuth] = useState(null); // null | { reason, pendingHref }
  const [palette, setPalette] = useState(false);
  const pendingRef = useRef(null);

  // Subscribe to the shared auth state (fires on Firebase restore + every change).
  useEffect(() => {
    if (!window.BOTAuth) return;
    const off = window.BOTAuth.onChange((u) => {
      setUser(u);
      if (u && pendingRef.current) {
        const dest = pendingRef.current;
        pendingRef.current = null;
        setAuth(null);
        window.location.href = dest;
      }
    });
    return off;
  }, []);

  useEffect(() => {
    const r = document.documentElement.style;
    r.setProperty("--accent", t.accent);
    r.setProperty("--atmo", (t.atmosphere / 100).toFixed(2));
    const ts = TYPE_SYSTEMS[t.typeSystem] || TYPE_SYSTEMS["Typewriter"];
    r.setProperty("--font-head", ts.head);
    r.setProperty("--font-body", ts.body);
    r.setProperty("--font-mono", ts.mono);
    r.setProperty("--head-weight", ts.weight);
    r.setProperty("--accent-soft", hexToSoft(t.accent, 0.14));
  }, [t.accent, t.atmosphere, t.typeSystem]);

  const scrollTo = (e, sel) => {
    e.preventDefault();
    const el = document.querySelector(sel);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openLogin = (opts) => { pendingRef.current = (opts && opts.pendingHref) || null; setAuth(opts || {}); };
  const handleAuthed = (u) => {
    setUser(u);
    const dest = pendingRef.current || (auth && auth.pendingHref);
    pendingRef.current = null;
    setAuth(null);
    if (dest) window.location.href = dest;
  };
  const logout = () => { window.BOTAuth.signOut(); };

  const handleToolClick = (e, tool) => {
    if (tool.external) return;     // external link — normal
    if (!tool.gated) return;       // account-aware or open tool — always navigate
    if (user) return;              // hard-gated + logged in — let it through
    e.preventDefault();            // hard-gated + logged out — prompt login first
    openLogin({
      reason: "Log in to open \u201c" + tool.name + "\u201d and the features tied to your account.",
      pendingHref: tool.href
    });
  };

  return (
    <React.Fragment>
      {/* NAV */}
      <nav className="site">
        <div className="wrap">
          <a href="#top" className="logo" onClick={(e) => scrollTo(e, "#top")}>Blade of Takumi</a>
          <div className="navlinks">
            <a className="mono" href="#presence" onClick={(e) => scrollTo(e, "#presence")}>Presence</a>
            <a className="mono" href="#tools" onClick={(e) => scrollTo(e, "#tools")}>Tools</a>
            <a className="mono" href="Essays.html">Essays</a>
            <a className="mono" href={LINKS.instagram} target="_blank" rel="noopener noreferrer">Connect</a>
            <div className="nav-account">
              {user
                ? <AccountMenu user={user} onLogout={logout} />
                : <button className="login-btn" onClick={() => openLogin()}><IconUser /> Log in</button>}
            </div>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="hero" id="top">
        <div className="hero-img">
          <div className="hero-photo"></div>
        </div>
        <div className="hero-atmo"></div>
        <div className="hero-content">
          <div className="wrap">
            <div className="hero-eyebrow mono">— Creative Mastery</div>
            <h1 className="hero-title">Blade of<br />Takumi</h1>
            <p className="hero-sub">My journey.</p>
          </div>
        </div>
      </header>

      {/* PRESENCE */}
      <section className="block" id="presence">
        <div className="wrap">
          <div className="sec-head">
            <span className="label mono">Presence</span>
            <span className="rule"></span>
          </div>
          <div className="presence-grid">
            {PRESENCE.map((p) =>
            <a
              key={p.name}
              className="link-card"
              href={p.href}
              target={p.kind === "ext" ? "_blank" : undefined}
              rel={p.kind === "ext" ? "noopener noreferrer" : undefined}
              onClick={p.kind === "scroll" ? (e) => scrollTo(e, p.href) : undefined}>
              
                <span className="lc-icon">{p.icon}</span>
                <h3 className="lc-name">{p.name}</h3>
                <span className="lc-arrow">{p.cue} <IconArrow /></span>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* TOOLS */}
      <section className="block" id="tools">
        <div className="wrap">
          <div className="sec-head">
            <span className="label mono">Tools</span>
            <span className="rule"></span>
          </div>
          <div className="tools-grid">
            {TOOLS.map((tool) => {
              const blocked = tool.gated && !user;          // hard-gated, logged out
              const accountAware = tool.account || tool.gated;
              const synced = accountAware && !!user;
              return (
                <a
                  key={tool.name}
                  className={"tool-card" + (accountAware ? " account" : "") + (synced ? " synced" : "") + (blocked ? " gated" : "")}
                  href={tool.href}
                  target={tool.external ? "_blank" : undefined}
                  rel={tool.external ? "noopener noreferrer" : undefined}
                  onClick={(e) => handleToolClick(e, tool)}>
                  {tool.gated && !synced && (
                    <span className="tool-lock"><IconLock /> Sign in</span>
                  )}
                  <span className="tool-tag mono">{tool.tag}</span>
                  <h3 className="tool-name">{tool.name}</h3>
                  <span className="tool-open">
                    {blocked ? "Log in to open" : "Open tool"} <IconArrowUR />
                  </span>
                </a>
              );
            })}
            <button type="button" className="tool-card more" onClick={() => setPalette(true)}>
              <span className="more-plus"><IconPlus /></span>
              <h3 className="more-name">More</h3>
              <span className="more-cue">Search tools</span>
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="site" id="connect">
        <div className="wrap">
          <span className="f-brand">Blade of Takumi</span>
          <div className="f-links">
            <a className="mono" href={LINKS.instagram} target="_blank" rel="noopener noreferrer">Instagram</a>
            <a className="mono" href={LINKS.unsplash} target="_blank" rel="noopener noreferrer">Unsplash</a>
          </div>
          <span className="f-copy mono">© 2026 — All rights reserved</span>
        </div>
      </footer>

      {/* AUTH MODAL */}
      {auth && (
        <AuthModal
          reason={auth.reason}
          onClose={() => setAuth(null)}
          onAuthed={handleAuthed} />
      )}

      {/* TOOL PALETTE */}
      {palette && (
        <ToolPalette
          tools={ALL_TOOLS}
          user={user}
          onGated={(tool) => {
            setPalette(false);
            openLogin({
              reason: "Log in to open \u201c" + tool.name + "\u201d and the features tied to your account.",
              pendingHref: tool.href
            });
          }}
          onClose={() => setPalette(false)} />
      )}

      {/* TWEAKS */}
      <TweaksPanel>
        <TweakSection label="Accent" />
        <TweakColor
          label="Gold tone"
          value={t.accent}
          options={["#b4965a", "#c08a52", "#a8a07a", "#9c7b8e"]}
          onChange={(v) => setTweak("accent", v)} />
        
        <TweakSection label="Hero" />
        <TweakSlider
          label="Atmosphere"
          value={t.atmosphere}
          min={0} max={100} unit="%"
          onChange={(v) => setTweak("atmosphere", v)} />
        
        <TweakSection label="Typeface" />
        <TweakSelect
          label="Type system"
          value={t.typeSystem}
          options={Object.keys(TYPE_SYSTEMS)}
          onChange={(v) => setTweak("typeSystem", v)} />
        
        <div style={{ fontSize: "11px", lineHeight: 1.4, color: "#9a948a", padding: "2px 2px 0", fontStyle: "italic" }}>
          {(TYPE_SYSTEMS[t.typeSystem] || {}).note}
        </div>
      </TweaksPanel>
    </React.Fragment>);

}

function hexToSoft(hex, a) {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
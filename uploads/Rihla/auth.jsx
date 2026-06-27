/* auth.jsx — OWNER-ONLY account layer (PROTOTYPE, no backend).
   ─────────────────────────────────────────────────────────────────────────
   This is a front-end-only mock so the logged-in experience can be designed
   and used with no server. Accounts + profile live in THIS browser via
   localStorage and the password is only lightly hashed — this is NOT real
   security. It is the single seam to swap for Firebase later:

     • replace AuthStore.signUp / signIn / signOut  -> Firebase Auth calls
     • replace AuthStore.saveProfile / current      -> Firestore read/write

   The rest of the app only ever talks to useAuth(), so nothing else changes.
   Single-owner by design: only ONE account can exist (you). Once created, the
   modal is login-only — there is no public sign-up. When you move to Firebase,
   lock sign-ups to your own email to keep it owner-only.                       */

const { useState: useAuState, useEffect: useAuEffect, useContext: useAuContext,
        createContext: createAuContext, useCallback: useAuCallback, useRef: useAuRef } = React;

const AUTH_KEY = "rihla_auth_v1";

function _readAuth() { try { return JSON.parse(localStorage.getItem(AUTH_KEY)) || {}; } catch (e) { return {}; } }
function _writeAuth(s) { localStorage.setItem(AUTH_KEY, JSON.stringify(s)); }
function _salt() { return Math.random().toString(36).slice(2, 10); }
function _hash(pw, salt) {
  // djb2 — adequate for a local prototype only, NOT production security.
  let h = 5381; const s = salt + "::" + pw;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return String(h >>> 0);
}

const AuthStore = {
  hasAccount() { return !!_readAuth().account; },
  ownerName() { const a = _readAuth().account; return a ? a.username : null; },
  signUp({ username, password }) {
    const s = _readAuth();
    if (s.account) throw new Error("An owner account already exists on this device.");
    const salt = _salt();
    s.account = { username: username.trim(), salt, hash: _hash(password, salt), profile: { apiKey: "" } };
    s.session = true; _writeAuth(s);
    return { username: s.account.username, ...s.account.profile };
  },
  signIn({ username, password }) {
    const s = _readAuth(); const a = s.account;
    if (!a) throw new Error("No account yet — create one first.");
    if (username.trim().toLowerCase() !== a.username.toLowerCase() || _hash(password, a.salt) !== a.hash)
      throw new Error("That username or password doesn't match.");
    s.session = true; _writeAuth(s);
    return { username: a.username, ...a.profile };
  },
  signInDemo() {
    const s = _readAuth();
    s.demoSession = true; s.demoProfile = { apiKey: "" };
    _writeAuth(s);
    // always a fresh showcase: reseed sample routes + visit history
    if (typeof seedDemoLibrary === "function") seedDemoLibrary(true);
    return AuthStore.current();
  },
  signOut() {
    const s = _readAuth();
    const wasDemo = !!s.demoSession;
    s.session = false; s.demoSession = false; s.demoProfile = null;
    _writeAuth(s);
    // demo auto-reverts: wipe the sandbox so the next demo login starts from the original sample data
    if (wasDemo && typeof resetDemoLibrary === "function") resetDemoLibrary();
    if (wasDemo && typeof resetDemoDirectory === "function") resetDemoDirectory();
  },
  current() {
    const s = _readAuth();
    if (s.demoSession) return { username: "Demo", demo: true, ...(s.demoProfile || { apiKey: "" }) };
    if (!s.account || !s.session) return null;
    return { username: s.account.username, ...(s.account.profile || {}) };
  },
  saveProfile(patch) {
    const s = _readAuth();
    if (s.demoSession) { s.demoProfile = { ...(s.demoProfile || {}), ...patch }; _writeAuth(s); return AuthStore.current(); }
    if (!s.account) return null;
    s.account.profile = { ...(s.account.profile || {}), ...patch };
    _writeAuth(s);
    return { username: s.account.username, ...s.account.profile };
  },
};

const AuthCtx = createAuContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useAuState(() => AuthStore.current());
  const signUp = useAuCallback((c) => { const u = AuthStore.signUp(c); setUser(u); return u; }, []);
  const signIn = useAuCallback((c) => { const u = AuthStore.signIn(c); setUser(u); return u; }, []);
  const signInDemo = useAuCallback(() => { const u = AuthStore.signInDemo(); setUser(u); return u; }, []);
  const signOut = useAuCallback(() => { AuthStore.signOut(); setUser(null); }, []);
  const saveApiKey = useAuCallback((apiKey) => { const u = AuthStore.saveProfile({ apiKey }); setUser(u); return u; }, []);
  const value = {
    user, signUp, signIn, signInDemo, signOut, saveApiKey,
    hasAccount: AuthStore.hasAccount(), ownerName: AuthStore.ownerName(),
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
function useAuth() { return useAuContext(AuthCtx); }

/* ---------- login / create modal ---------- */
function AuthModal({ onClose, onDemo }) {
  const { hasAccount, signIn, signUp, signInDemo } = useAuth();
  const creating = !hasAccount;
  const [username, setUsername] = useAuState("");
  const [password, setPassword] = useAuState("");
  const [confirm, setConfirm] = useAuState("");
  const [err, setErr] = useAuState("");
  const [show, setShow] = useAuState(false);
  const [demoBusy, setDemoBusy] = useAuState(false);

  const enterDemo = () => { signInDemo(); if (onDemo) onDemo(); else onClose(); };
  const fillDemo = () => {
    setErr(""); setShow(true); setDemoBusy(true);
    setUsername("demo"); setPassword("demo1234");
    if (creating) setConfirm("demo1234");
    setTimeout(() => { setDemoBusy(false); enterDemo(); }, 900);
  };

  const submit = (e) => {
    e.preventDefault(); setErr("");
    try {
      // typing the demo credentials by hand works too
      if (username.trim().toLowerCase() === "demo") {
        if (password !== "demo1234") throw new Error("The demo password is demo1234.");
        enterDemo(); return;
      }
      if (!username.trim()) throw new Error("Choose a username.");
      if (password.length < 4) throw new Error("Use a password of at least 4 characters.");
      if (creating && password !== confirm) throw new Error("Passwords don't match.");
      if (creating) signUp({ username, password }); else signIn({ username, password });
      onClose();
    } catch (e2) { setErr(e2.message); }
  };

  return (
    <div className="auth-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="auth-card" role="dialog" aria-modal="true">
        <div className="auth-brand">
          <BrandMark size={30} />
          <div><div className="brand-name">Rihla</div><div className="brand-sub">Outreach Toolkit</div></div>
        </div>
        <h2 className="auth-title">{creating ? "Create your account" : "Welcome back"}</h2>
        <p className="auth-desc">
          {creating
            ? "Set up your private owner account to save itineraries, store your API key, and reroute unvisited stops."
            : "Log in to reach your saved itineraries and settings."}
        </p>
        <form className="auth-fields" onSubmit={submit} noValidate>
          <div className="field">
            <label className="label" htmlFor="au-user">Username</label>
            <input id="au-user" className="input" autoComplete="username" value={username}
              onChange={(e) => setUsername(e.target.value)} placeholder="e.g. owner" />
          </div>
          <div className="field">
            <label className="label" htmlFor="au-pass">Password</label>
            <div className="key-wrap">
              <input id="au-pass" className="input" type={show ? "text" : "password"}
                autoComplete={creating ? "new-password" : "current-password"} value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder="••••••" style={{ paddingRight: 56 }} />
              <button type="button" className="key-toggle" onClick={() => setShow((s) => !s)}>{show ? "hide" : "show"}</button>
            </div>
          </div>
          {creating && (
            <div className="field">
              <label className="label" htmlFor="au-conf">Confirm password</label>
              <input id="au-conf" className="input" type={show ? "text" : "password"} value={confirm}
                onChange={(e) => setConfirm(e.target.value)} placeholder="••••••" />
            </div>
          )}
          {err && <div className="banner banner-danger"><span className="banner-icon"><IconWarn size={16} /></span><span>{err}</span></div>}
          <button type="submit" className="btn btn-primary btn-lg btn-block" style={{ marginTop: 4 }}>
            <IconLock size={16} /> {creating ? "Create account" : "Log in"}
          </button>
        </form>
        <div className="divider-or" style={{ margin: "18px 0 14px" }}>or</div>
        <button type="button" className="btn btn-ghost btn-block" disabled={demoBusy} onClick={fillDemo}>
          <IconSparkle size={15} /> {demoBusy ? "Logging into the demo…" : "Explore the demo account"}
        </button>
        <p className="auth-note" style={{ marginTop: 10, marginBottom: 0 }}>
          Fills in the demo credentials (<b>demo</b> / <b>demo1234</b>) and signs you into a sample account —
          saved routes, visit history and all. Reverts to the original sample data when you log out.
        </p>
        <div className="auth-switch">
          <button type="button" onClick={onClose}>Continue without an account →</button>
        </div>
        <p className="auth-note">
          {creating
            ? "Single-owner: only this one account can be created here. Stored in this browser for now."
            : "Stored in this browser. Forgot it? Clearing this site's data resets the owner account."}
        </p>
      </div>
    </div>
  );
}

/* ---------- nav account control ---------- */
function AccountMenu({ onNavigate }) {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useAuState(false);
  const ref = useAuRef(null);
  useAuEffect(() => {
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
        <span className={"acct-chev" + (open ? " up" : "")}><IconChevron size={15} /></span>
      </button>
      {open && (
        <div className="acct-menu">
          <button className="acct-item" onClick={() => { setOpen(false); onNavigate("account"); }}><IconKey size={15} /> Account &amp; API key</button>
          <div className="acct-sep" />
          <button className="acct-item danger" onClick={() => { setOpen(false); signOut(); onNavigate("home"); }}><IconLogOut size={15} /> Log out</button>
        </div>
      )}
    </div>
  );
}

/* ---------- account settings (API key) ---------- */
function AccountPanel({ onDone, onHome }) {
  const { user, saveApiKey, signOut } = useAuth();
  const [key, setKey] = useAuState(user.apiKey || "");
  const [show, setShow] = useAuState(false);
  const [saved, setSaved] = useAuState(false);
  const save = () => { saveApiKey(key.trim()); setSaved(true); setTimeout(() => setSaved(false), 1600); };
  return (
    <div className="page">
      {onHome && (
        <button className="btn btn-quiet page-back" onClick={onHome}>
          <IconArrowLeft size={15} /> Back to home
        </button>
      )}
      <div className="page-head">
        <h1 className="page-title">Account</h1>
        <p className="page-desc">Signed in as <b>{user.username}</b>. Save your Google Maps API key once and the planner and rerouting fill it in automatically.</p>
      </div>
      <div className="card card-pad">
        <div className="field field-full">
          <label className="label" htmlFor="ac-key">Google Maps API key</label>
          <div className="key-wrap">
            <input id="ac-key" className="input mono" type={show ? "text" : "password"} autoComplete="off"
              spellCheck="false" placeholder="AIza…" value={key} onChange={(e) => setKey(e.target.value)} style={{ paddingRight: 64 }} />
            <button type="button" className="key-toggle" onClick={() => setShow((s) => !s)}>{show ? "hide" : "show"}</button>
          </div>
          <span className="hint">Needs <b>Places API (New)</b> and <b>Routes API</b> enabled. Stored in this browser, tied to your account.</span>
        </div>
        <div className="form-foot">
          <button className="btn btn-quiet" onClick={() => { signOut(); onDone("home"); }}><IconLogOut size={15} /> Log out</button>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {saved && <span className="org-saved"><IconCheck size={13} /> Saved</span>}
            <button className="btn btn-primary" onClick={save}><IconKey size={16} /> Save API key</button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AuthProvider, useAuth, AuthModal, AccountMenu, AccountPanel });

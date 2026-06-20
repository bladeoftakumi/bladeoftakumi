/* app.jsx — orchestrator: auth, nav, mode routing, run pipeline */
const { useState: useAState, useEffect: useAEffect, useRef: useARef, useMemo: useAMemo } = React;

const STEPS = [
  { key: "locate", label: "Locating city center" },
  { key: "search", label: "Searching for sites" },
  { key: "optimize", label: "Optimizing routes with traffic" },
  { key: "done", label: "Building itinerary" },
];

const NAV_TABS = [
  { key: "planner", label: "Route Planner", Icon: IconRoute },
  { key: "library", label: "Itineraries", Icon: IconBookmark },
  { key: "directory", label: "Directory", Icon: IconFolder },
];

function Nav({ mode, user, onHome, onNavigate, onLogin }) {
  return (
    <nav className="nav">
      <button className="brand brand-btn" onClick={onHome} title="Home">
        <BrandMark size={42} />
        <div>
          <div className="brand-name">Rihla</div>
          <div className="brand-sub">Outreach Toolkit</div>
        </div>
      </button>
      {user && (
        <div className="nav-tabs">
          {NAV_TABS.map(({ key, label, Icon }) => (
            <button key={key} className={"nav-tab" + (mode === key ? " active" : "")}
              onClick={() => onNavigate(key)}>
              <Icon size={15} /> <span>{label}</span>
            </button>
          ))}
        </div>
      )}
      <div className="nav-right">
        <a className="btn btn-ghost btn-sm site-home" href="index.html" title="Back to Blade of Takumi">
          <IconHome size={15} /> <span>Home</span>
        </a>
        {user
          ? <AccountMenu onNavigate={onNavigate} />
          : <button className="btn btn-ghost btn-sm" onClick={onLogin}><IconUser size={15} /> Log in</button>}
      </div>
    </nav>
  );
}

/* ---------- logged-in home: outreach at a glance ---------- */
function HomeDashboard({ user, lib, onNavigate, onPlanUnvisited }) {
  const stats = useAMemo(() => {
    let routes = lib.items.length, sites = 0, visited = 0;
    lib.items.forEach((it) => (it.days || []).forEach((d) => d.stops.forEach((s) => {
      sites++;
      const k = typeof placeKey === "function" ? placeKey(s) : (s.id || s.name);
      if (it.visited && it.visited[k]) visited++;
    })));
    return { routes, sites, visited, remaining: Math.max(0, sites - visited) };
  }, [lib.items]);

  const pct = stats.sites ? Math.round((stats.visited / stats.sites) * 100) : 0;

  return (
    <div className="page page-wide home">
      <div className="home-head">
        <h1 className="home-title">Welcome back, {user.username}</h1>
        <p className="home-sub">
          {stats.routes > 0
            ? <React.Fragment>You&rsquo;ve planned <b>{stats.routes}</b> route{stats.routes !== 1 ? "s" : ""} and reached <b>{stats.visited}</b> of <b>{stats.sites}</b> sites so far.{stats.remaining > 0 ? <React.Fragment> <b>{stats.remaining}</b> still to visit.</React.Fragment> : " Every planned stop is visited \u2014 nice work."}</React.Fragment>
            : "Plan your first route to start tracking outreach across mosques, schools and Islamic centers."}
        </p>
      </div>

      <div className="home-stats">
        <div className="home-stat"><span className="home-stat-num">{stats.routes}</span><span className="home-stat-label">Saved routes</span></div>
        <div className="home-stat"><span className="home-stat-num">{stats.sites}</span><span className="home-stat-label">Sites planned</span></div>
        <div className="home-stat"><span className="home-stat-num accent">{stats.visited}</span><span className="home-stat-label">Outreaches done</span></div>
        <div className="home-stat"><span className="home-stat-num">{stats.remaining}</span><span className="home-stat-label">Still to visit</span></div>
      </div>

      {stats.sites > 0 && (
        <div className="home-progress">
          <div className="home-progress-bar"><div className="home-progress-fill" style={{ width: pct + "%" }} /></div>
          <span className="home-progress-label">{pct}% of planned sites visited</span>
        </div>
      )}

      {stats.remaining > 0 && (
        <div className="reroute-card home-reroute">
          <div className="reroute-head">
            <span className="reroute-icon"><IconShuffle size={20} /></span>
            <div>
              <div className="reroute-title">{stats.remaining} place{stats.remaining !== 1 ? "s" : ""} still to visit</div>
              <div className="reroute-sub">Build one efficient driving route that covers exactly the stops you haven&rsquo;t reached yet, gathered from across every saved itinerary.</div>
            </div>
          </div>
          <button className="btn btn-primary btn-lg" style={{ marginTop: 16 }} onClick={onPlanUnvisited}>
            <IconShuffle size={17} /> Plan route from unvisited
          </button>
        </div>
      )}

      <div className="home-section-label">Jump back in</div>
      <div className="choice-grid home-choice">
        <button className="choice-card" onClick={() => onNavigate("planner")}>
          <span className="choice-icon"><IconRoute size={24} /></span>
          <span className="choice-name">Route Planner</span>
          <span className="choice-desc">Find sites near a start location and route them across days for the least drive time.</span>
          <span className="choice-cta">Open planner <IconArrowRight size={15} /></span>
        </button>
        <button className="choice-card" onClick={() => onNavigate("directory")}>
          <span className="choice-icon"><IconFolder size={24} /></span>
          <span className="choice-name">Directory</span>
          <span className="choice-desc">Every place, contact and visit in one searchable record — import or export Excel, add notes and route from it.</span>
          <span className="choice-cta">Open directory <IconArrowRight size={15} /></span>
        </button>
        <button className="choice-card" onClick={() => onNavigate("library")}>
          <span className="choice-icon"><IconBookmark size={24} /></span>
          <span className="choice-name">Itineraries</span>
          <span className="choice-desc">Reopen saved routes, mark stops visited and reroute what&rsquo;s left.</span>
          <span className="choice-cta">Open itineraries <IconArrowRight size={15} /></span>
        </button>
      </div>
    </div>
  );
}

function Landing({ user, onPlanner, onOrganizer, onLibrary }) {
  return (
    <div className="page landing">
      <div className="landing-head">
        <h1 className="landing-title">Plan routes. Organize outreach.</h1>
        <p className="landing-sub">
          Build an optimized multi-day visiting route, then track every contact, appointment and note — all in one place.
        </p>
      </div>
      {user && (
        <div className="landing-acct">
          <span>Welcome back, <b>{user.username}</b>.</span>
          <button onClick={onLibrary}><IconFolder size={15} /> Open my itineraries</button>
        </div>
      )}
      <div className="choice-grid">
        <button className="choice-card" onClick={onPlanner}>
          <span className="choice-icon"><IconRoute size={24} /></span>
          <span className="choice-name">Route Planner</span>
          <span className="choice-desc">Find schools and sites near a start location and route them across days for the least drive time.</span>
          <span className="choice-cta">Start planning <IconArrowRight size={15} /></span>
        </button>
        <button className="choice-card" onClick={onOrganizer}>
          <span className="choice-icon"><IconClipboard size={24} /></span>
          <span className="choice-name">Outreach Organizer</span>
          <span className="choice-desc">Upload your planner export to log contacts, book appointments and track each school&rsquo;s status — no account needed.</span>
          <span className="choice-cta">Open organizer <IconArrowRight size={15} /></span>
        </button>
      </div>
      <div className="landing-flow">
        <span>Plan a route</span><IconArrowRight size={13} />
        <span>Save &amp; track visits</span><IconArrowRight size={13} />
        <span>Reroute what&rsquo;s left</span>
      </div>
    </div>
  );
}

function Loading({ step, usage }) {
  const activeIdx = STEPS.findIndex((s) => s.key === step);
  const pct = usage.cap && usage.cap !== Infinity ? Math.min(100, (usage.count / usage.cap) * 100) : 0;
  const warn = pct >= 80;
  return (
    <div className="page">
      <div className="card card-pad">
        <div className="loading-wrap">
          <div className="spinner" />
          <div className="loading-steps">
            {STEPS.map((s, i) => {
              const state = i < activeIdx ? "done" : i === activeIdx ? "active" : "";
              return (
                <div className={"lstep " + state} key={s.key}>
                  <span className="lstep-dot">{i < activeIdx ? <IconCheck size={11} /> : i + 1}</span>
                  {s.label}
                </div>
              );
            })}
          </div>
          {usage.cap !== Infinity && (
            <div className="usage-meter">
              <div className="usage-bar">
                <div className={"usage-fill" + (warn ? " warn" : "")} style={{ width: pct + "%" }} />
              </div>
              <div className="usage-label">
                <span>API calls used</span>
                <span>{usage.count} / {usage.cap}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlannerApp({ auth, lib, exclusions, onRequireLogin, onHome }) {
  const [view, setView] = useAState("form"); // form | loading | results
  const [step, setStep] = useAState("locate");
  const [usage, setUsage] = useAState({ count: 0, cap: Infinity });
  const [result, setResult] = useAState(null);
  const [error, setError] = useAState(null);
  const [warning, setWarning] = useAState(null);
  const [lastInput, setLastInput] = useAState(null);
  const user = auth.user;

  const run = async (input) => {
    setError(null); setWarning(null); setLastInput(input);
    setStep("locate");
    setUsage({ count: 0, cap: input.cap || Infinity });
    setView("loading");

    const tracker = new UsageTracker(input.cap, (count, cap) => {
      setUsage({ count, cap });
      if (cap !== Infinity && count >= cap * 0.8 && count < cap) {
        setWarning(`Heads up — ${count} of ${cap} API calls used (${Math.round((count / cap) * 100)}%).`);
      }
    });

    try {
      const res = input.mode === "mozi"
        ? await buildMoziItinerary(input, tracker, (s) => setStep(s))
        : await buildItinerary(input, tracker, (s) => setStep(s));
      setResult(res);
      setView("results");
    } catch (e) {
      setError(e.message || "Something went wrong while building the itinerary.");
      setView("form");
    }
  };

  const runSample = () => {
    setError(null); setWarning(null);
    setResult(sampleItinerary());
    setView("results");
  };

  const formInitial = lastInput
    ? {
        ...lastInput,
        radius: lastInput.units === "km" ? Math.round(lastInput.radiusMeters / 1000) : Math.round(lastInput.radiusMeters / 1609.344),
        keywords: lastInput.keywords.join(", "),
        cap: lastInput.cap,
      }
    : { apiKey: (user && user.apiKey) || "" };

  return (
    <React.Fragment>
      {view === "form" && (
        <React.Fragment>
          {onHome && (
            <div className="page" style={{ paddingBottom: 0 }}>
              <button className="btn btn-quiet page-back" onClick={onHome} style={{ marginBottom: 0 }}>
                <IconArrowLeft size={15} /> Back to home
              </button>
            </div>
          )}
          {error && (
            <div className="page" style={{ paddingBottom: 0 }}>
              <div className="banner banner-danger">
                <span className="banner-icon"><IconWarn size={16} /></span>
                <span><b>Couldn't build itinerary.</b> {error}</span>
              </div>
            </div>
          )}
          <PlannerForm
            initial={formInitial}
            savedApiKey={(user && user.apiKey) || ""}
            onSaveKey={user ? auth.saveApiKey : null}
            exclusions={user ? exclusions : []}
            onRun={run} onSample={runSample} />
        </React.Fragment>
      )}

      {view === "loading" && (
        <React.Fragment>
          {warning && (
            <div className="page" style={{ paddingBottom: 0 }}>
              <div className="banner banner-warn">
                <span className="banner-icon"><IconWarn size={16} /></span>
                <span>{warning}</span>
              </div>
            </div>
          )}
          <Loading step={step} usage={usage} />
        </React.Fragment>
      )}

      {view === "results" && result && (
        <ResultsView
          result={result}
          onBack={() => { setView("form"); }}
          onSave={user ? ((r) => { lib.save(r, r.city || "Saved route"); return true; }) : null}
          onRequireLogin={!user ? onRequireLogin : null} />
      )}
    </React.Fragment>
  );
}

function App() {
  const auth = useAuth();
  const lib = useLibrary();
  const [mode, setMode] = useAState("home"); // home | planner | organizer | library | account
  const [authOpen, setAuthOpen] = useAState(false);
  const exclusions = useAMemo(() => collectVisited(lib.items), [lib.items]);

  const go = (m) => {
    if ((m === "library" || m === "account" || m === "directory") && !auth.user) { setAuthOpen(true); return; }
    setMode(m);
  };

  const sendToDirectory = () => {
    try { const cur = _readDir().places; const { places } = consolidatePlaces(cur); _writeDir({ places }); } catch (e) { /* noop */ }
    setMode("directory");
  };

  return (
    <React.Fragment>
      <Nav mode={mode} user={auth.user}
        onHome={() => setMode("home")} onNavigate={go} onLogin={() => setAuthOpen(true)} />

      {auth.user && auth.user.demo && (
        <div className="demo-bar">
          <span><IconSparkle size={13} /> Demo account &mdash; sample data, kept separate from your real account.</span>
          <button onClick={() => { auth.signOut(); setMode("home"); }}>Exit demo</button>
        </div>
      )}

      {mode === "home" && (
        auth.user
          ? <HomeDashboard user={auth.user} lib={lib}
              onNavigate={go} onPlanUnvisited={() => go("library")} />
          : <Landing user={auth.user}
              onPlanner={() => setMode("planner")} onOrganizer={() => setMode("organizer")}
              onLibrary={() => go("library")} />
      )}
      {mode === "planner" && (
        <PlannerApp auth={auth} lib={lib} exclusions={exclusions}
          onRequireLogin={() => setAuthOpen(true)} onHome={() => setMode("home")} />
      )}
      {mode === "organizer" && (
        <Organizer loggedIn={!!auth.user} onHome={() => setMode("home")}
          onPlanUnvisited={auth.user ? (() => go("library")) : null}
          onSendToDirectory={auth.user ? sendToDirectory : null} />
      )}
      {mode === "library" && auth.user && (
        <Library lib={lib} apiKey={auth.user.apiKey || ""} onHome={() => setMode("home")}
          onNeedKey={() => setMode("account")} onPlanNew={() => setMode("planner")} />
      )}
      {mode === "directory" && auth.user && (
        <Directory apiKey={auth.user.apiKey || ""} onHome={() => setMode("home")}
          onNeedKey={() => setMode("account")} />
      )}
      {mode === "account" && auth.user && <AccountPanel onDone={setMode} onHome={() => setMode("home")} />}

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} onDemo={() => { setAuthOpen(false); setMode("home"); }} />}

      <div className="footer">
        Rihla &middot; routes &amp; traffic by Google Maps &middot; your data stays in your browser
      </div>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <AuthProvider><App /></AuthProvider>
);

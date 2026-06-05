const { useEffect } = React;

/* ----------------------------- icons ----------------------------- */
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

const IconPlus = () =>
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>;


/* ----------------------------- data ----------------------------- */
const LINKS = {
  instagram: "https://www.instagram.com/bladeoftakumi",
  unsplash: "https://unsplash.com/@bladeoftakumi"
};

const PRESENCE = [
{ icon: <IconInstagram />, name: "Instagram", desc: "Frames from the field — light, stillness, and the edge of the everyday.", href: LINKS.instagram, kind: "ext", cue: "Follow" },
{ icon: <IconPhoto />, name: "Unsplash", desc: "Open imagery, free to use. A library built one careful exposure at a time.", href: LINKS.unsplash, kind: "ext", cue: "Browse" },
{ icon: <IconTool />, name: "Tools", desc: "Small, sharpened utilities — made to do one thing, and do it cleanly.", href: "#tools", kind: "scroll", cue: "Explore" }];


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

/* ----------------------------- app ----------------------------- */
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

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

  return (
    <React.Fragment>
      {/* NAV */}
      <nav className="site">
        <div className="wrap">
          <a href="#top" className="logo" onClick={(e) => scrollTo(e, "#top")}>Blade of Takumi</a>
          <div className="navlinks">
            <a className="mono" href="#presence" onClick={(e) => scrollTo(e, "#presence")}>Work</a>
            <a className="mono" href="#tools" onClick={(e) => scrollTo(e, "#tools")}>Tools</a>
            <a className="mono" href="#connect" onClick={(e) => scrollTo(e, "#connect")}>Connect</a>
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
            <div className="hero-eyebrow mono">— Online Persona &amp; Brand</div>
            <h1 className="hero-title">Blade of<br />Takumi</h1>
            <p className="hero-sub">Craft over noise. Tools built with intention. A digital presence refined by hand.</p>
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
                <p className="lc-desc">{p.desc}</p>
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
            <a className="tool-card" href="https://ruminationsondeath.com/" target="_blank" rel="noopener noreferrer">
              <span className="tool-tag mono">Reflection · v1.0</span>
              <h3 className="tool-name">Ruminations on Death</h3>
              <p className="tool-desc">A quiet meditation on mortality — daily reflections to sharpen how you spend the time you have.</p>
              <span className="tool-open">Open tool <IconArrowUR /></span>
            </a>
            <div className="tool-soon">
              <span className="plus"><IconPlus /></span>
              <span className="soon-label mono">Coming soon</span>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="site" id="connect">
        <div className="wrap">
          <span className="f-brand">Blade of Takumi</span>
          <span className="f-copy mono">© 2026 — All rights reserved</span>
        </div>
      </footer>

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
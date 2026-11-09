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

/* ----------------------------- data ----------------------------- */
const LINKS = {
  substack: "https://bladeoftakumi.substack.com/",
  instagram: "https://www.instagram.com/bladeoftakumi",
  unsplash: "https://unsplash.com/@bladeoftakumi",
  youtube: "https://www.youtube.com/@bladeoftakumi"
};

const PRESENCE = [
{ icon: <IconYouTube />, name: "YouTube", href: LINKS.youtube, kind: "ext", cue: "Watch" },
{ icon: <IconInstagram />, name: "Instagram", href: LINKS.instagram, kind: "ext", cue: "Follow" },
{ icon: <IconPen />, name: "Essays", href: LINKS.substack, kind: "ext", cue: "Read" },
{ icon: <IconPhoto />, name: "Unsplash", href: LINKS.unsplash, kind: "ext", cue: "Browse" }];

const TOOLS = [
{ tag: "Reflection", name: "Ruminations on Death", desc: "A quiet meditation on mortality. Reflect on death to increase urgency.", href: "https://ruminationsondeath.com/", external: true },
{ tag: "orwellianthoughts", name: "Doublethink", desc: "", href: "https://orwellianthoughts.com/", external: true }];


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
            <a className="mono" href="#presence" onClick={(e) => scrollTo(e, "#presence")}>Presence</a>
            <a className="mono" href="#tools" onClick={(e) => scrollTo(e, "#tools")}>Tools</a>
            <a className="mono" href={LINKS.substack} target="_blank" rel="noopener noreferrer">Essays</a>
            <a className="mono" href={LINKS.instagram} target="_blank" rel="noopener noreferrer">Connect</a>
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
            {TOOLS.map((tool) =>
              <a
                key={tool.name}
                className="tool-card"
                href={tool.href}
                target="_blank"
                rel="noopener noreferrer">
                <span className="tool-tag mono">{tool.tag}</span>
                <h3 className="tool-name">{tool.name}</h3>
                <span className="tool-open">Open tool <IconArrowUR /></span>
              </a>
            )}
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
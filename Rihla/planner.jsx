/* planner.jsx — input form, validation, unit toggle, call estimate */
const { useState: usePState, useMemo: usePMemo } = React;

const DEFAULTS = {
  mode: "area",
  city: "",
  radius: 15,
  units: "mi",
  keywords: "mosque, Islamic center, Quran school",
  apiKey: "",
  cap: 250,
  startTime: "09:00",
  sitesPerDay: 5,
  days: 3,
  // Mozi Mode
  bearing: 0,
  directionLabel: "North",
  hours: 8,
  corridor: 10,
  dwellMin: 20,
  anchor: "",
  splayAuto: true,
  splayDeg: 26
};

function parseKeywords(str) {
  return [...new Set(str.split(",").map((s) => s.trim()).filter(Boolean))];
}

/* compass selector — click a point to set the outward bearing */
function Compass({ bearing, onPick }) {
  return (
    <div className="compass" role="group" aria-label="Direction to head">
      <div className="compass-rose">
        <div className="compass-needle" style={{ transform: `rotate(${bearing}deg)` }} aria-hidden="true">
          <span className="compass-needle-n" />
          <span className="compass-needle-s" />
        </div>
        {DIRECTIONS.map((d) => (
          <button type="button" key={d.key}
            className={"compass-pt compass-" + d.key + (bearing === d.bearing ? " on" : "")}
            onClick={() => onPick(d.bearing, d.label)} title={d.label} aria-pressed={bearing === d.bearing}>
            {d.key}
          </button>
        ))}
      </div>
    </div>
  );
}

function PlannerForm({ initial, onRun, onSample, exclusions = [], savedApiKey = "", onSaveKey }) {
  const [v, setV] = usePState({ ...DEFAULTS, ...(initial || {}) });
  const [err, setErr] = usePState({});
  const [skipVisited, setSkipVisited] = usePState(true);
  const [showExcl, setShowExcl] = usePState(false);
  const set = (k) => (e) => {
    const val = e && e.target ? e.target.type === "number" ? e.target.value : e.target.value : e;
    setV((p) => ({ ...p, [k]: val }));
  };

  const keywords = usePMemo(() => parseKeywords(v.keywords), [v.keywords]);
  const isMozi = v.mode === "mozi";
  const estimate = usePMemo(
    () => isMozi
      ? estimateMoziCalls(keywords.length || 1, Number(v.hours) || 1, toMeters(Number(v.corridor) || 1, v.units))
      : estimateCalls(keywords.length || 1, Number(v.sitesPerDay) || 1, Number(v.days) || 1),
    [isMozi, keywords.length, v.sitesPerDay, v.days, v.hours, v.corridor, v.units]
  );
  const overCap = Number(v.cap) > 0 && estimate > Number(v.cap);
  const nearCap = !overCap && Number(v.cap) > 0 && estimate >= Number(v.cap) * 0.8;

  function validate() {
    const n = {};
    if (!v.city.trim()) n.city = "A start location is required.";
    if (!keywords.length) n.keywords = "Add at least one keyword.";
    else if (keywords.length > 5) n.keywords = `Up to 5 keywords (you have ${keywords.length}) — each is a separate API search.`;
    if (!v.apiKey.trim()) n.apiKey = "A Google Maps API key is required for live results.";
    if (!(Number(v.cap) > 0)) n.cap = "Set a usage cap of at least 1.";
    if (!v.startTime) n.startTime = "Pick a start time.";
    if (isMozi) {
      if (!(Number(v.hours) >= 1)) n.hours = "Enter at least 1 hour for the day.";
      else if (Number(v.hours) > 16) n.hours = "Keep it to a single day (16 hours max).";
      if (!(Number(v.corridor) > 0)) n.corridor = "Set a corridor width greater than 0.";
      else if (toMeters(Number(v.corridor), v.units) > 50000) n.corridor = `Max corridor is ${v.units === "km" ? "50 km" : "31 mi"} (Places API limit).`;
    } else {
      if (!(Number(v.radius) > 0)) n.radius = "Enter a radius greater than 0.";
      else if (toMeters(Number(v.radius), v.units) > 50000) n.radius = `Max radius is ${v.units === "km" ? "50 km" : "31 mi"} (Places API limit).`;
      if (!(Number(v.sitesPerDay) >= 1)) n.sitesPerDay = "At least 1 site per day.";
      if (String(v.days).trim() !== "" && !(Number(v.days) >= 1)) n.days = "Enter 1 or more days, or leave blank for no limit.";
    }
    return n;
  }

  const submit = (e) => {
    e.preventDefault();
    const n = validate();
    if (overCap) n.cap = `Estimated ${estimate} calls exceeds your cap of ${v.cap}. Raise the cap or reduce the corridor/keywords.`;
    setErr(n);
    if (Object.keys(n).length) return;
    const base = {
      mode: v.mode,
      apiKey: v.apiKey.trim(),
      city: v.city.trim(),
      keywords,
      units: v.units,
      startTime: v.startTime,
      cap: Number(v.cap),
      excludeKeys: (exclusions.length && skipVisited) ? exclusions.map((x) => x.key) : []
    };
    if (isMozi) {
      onRun({
        ...base,
        bearing: Number(v.bearing),
        directionLabel: v.directionLabel,
        hours: Number(v.hours),
        corridorMeters: toMeters(Number(v.corridor), v.units),
        dwellMin: Number(v.dwellMin) || 20,
        anchor: v.anchor.trim(),
        splayAuto: !!v.splayAuto,
        splayDeg: Number(v.splayDeg)
      });
    } else {
      onRun({
        ...base,
        radiusMeters: toMeters(Number(v.radius), v.units),
        sitesPerDay: Number(v.sitesPerDay),
        days: String(v.days).trim() === "" ? null : Number(v.days)
      });
    }
  };

  const [showKey, setShowKey] = usePState(false);
  const F = ({ k, children }) => err[k] ? <span className="err-msg">{err[k]}</span> : children || null;

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">Plan an outreach route</h1>
      </div>

      <div className="mode-switch" role="tablist" aria-label="Planning mode">
        <button type="button" role="tab" aria-selected={!isMozi}
          className={"mode-tab" + (!isMozi ? " on" : "")} onClick={() => set("mode")("area")}>
          <IconRoute size={16} /> Around an area
        </button>
        <button type="button" role="tab" aria-selected={isMozi}
          className={"mode-tab" + (isMozi ? " on" : "")} onClick={() => set("mode")("mozi")}>
          <IconCompass size={16} /> Mozi Mode
        </button>
      </div>
      {isMozi && (
        <p className="mode-blurb">
          One-day push: head out in a direction and hit as many <b>new</b> places as fit in your hours — out and back, no retracing.
        </p>
      )}

      <form className="card card-pad" onSubmit={submit} noValidate>
        <div className="form-grid">
          {/* Start location */}
          <div className="field field-full">
            <label className="label" htmlFor="f-city">Start location <span className="req">*</span></label>
            <input id="f-city" className={"input" + (err.city ? " input-invalid" : "")}
            placeholder="e.g. 1200 Main St, Houston, TX — or just a city" value={v.city} onChange={set("city")} />
            <F k="city"><span className="hint">{isMozi ? "Home base — you'll head out from here and loop back by day's end." : "Your starting point — a home/office address or a city. Routes begin here and sites are searched around it."}</span></F>
          </div>

          {!isMozi && (
          <React.Fragment>
          {/* Radius + units */}
          <div className="field">
            <label className="label" htmlFor="f-radius">Search radius <span className="req">*</span></label>
            <div className="input-row">
              <input id="f-radius" type="number" min="1" step="1"
              className={"input" + (err.radius ? " input-invalid" : "")}
              value={v.radius} onChange={set("radius")} />
              <div className="seg" role="group" aria-label="Units">
                <button type="button" className={v.units === "mi" ? "on" : ""} onClick={() => set("units")("mi")}>mi</button>
                <button type="button" className={v.units === "km" ? "on" : ""} onClick={() => set("units")("km")}>km</button>
              </div>
            </div>
            <F k="radius"><span className="hint">Distance from the city center.</span></F>
          </div>

          {/* Start time */}
          <div className="field">
            <label className="label" htmlFor="f-time">Visit start time <span className="req">*</span></label>
            <input id="f-time" type="time" className={"input" + (err.startTime ? " input-invalid" : "")}
            value={v.startTime} onChange={set("startTime")} />
            <F k="startTime"><span className="hint">Used to factor in traffic for each day.</span></F>
          </div>
          </React.Fragment>
          )}

          {isMozi && (
          <React.Fragment>
          {/* Compass direction */}
          <div className="field field-full">
            <label className="label">Head toward <span className="req">*</span> <span className="hint-inline">{v.directionLabel}</span></label>
            <div className="mozi-dir">
              <Compass bearing={Number(v.bearing)} onPick={(b, label) => setV((p) => ({ ...p, bearing: b, directionLabel: label }))} />
              <div className="mozi-dir-note">
                <span className="hint">Pick a compass point. The planner sweeps a corridor outward this way, gathering places on the way out and different ones on the way home.</span>
              </div>
            </div>
          </div>

          {/* Hours available */}
          <div className="field">
            <label className="label" htmlFor="f-hours">Hours for the day <span className="req">*</span></label>
            <input id="f-hours" type="number" min="1" max="16" step="0.5"
            className={"input" + (err.hours ? " input-invalid" : "")}
            value={v.hours} onChange={set("hours")} />
            <F k="hours"><span className="hint">Drive out + 20 min per stop + drive home, all within this. Reach is figured from it.</span></F>
          </div>

          {/* Corridor width + units */}
          <div className="field">
            <label className="label" htmlFor="f-corridor">Corridor width <span className="req">*</span></label>
            <div className="input-row">
              <input id="f-corridor" type="number" min="1" step="1"
              className={"input" + (err.corridor ? " input-invalid" : "")}
              value={v.corridor} onChange={set("corridor")} />
              <div className="seg" role="group" aria-label="Units">
                <button type="button" className={v.units === "mi" ? "on" : ""} onClick={() => set("units")("mi")}>mi</button>
                <button type="button" className={v.units === "km" ? "on" : ""} onClick={() => set("units")("km")}>km</button>
              </div>
            </div>
            <F k="corridor"><span className="hint">How far off the straight line you'll wander for a stop.</span></F>
          </div>

          {/* Start time (mozi) */}
          <div className="field">
            <label className="label" htmlFor="f-time-m">Start time <span className="req">*</span></label>
            <input id="f-time-m" type="time" className={"input" + (err.startTime ? " input-invalid" : "")}
            value={v.startTime} onChange={set("startTime")} />
            <F k="startTime"><span className="hint">When you set off — factors in traffic.</span></F>
          </div>

          {/* Optional frontier anchor */}
          <div className="field field-full">
            <label className="label" htmlFor="f-anchor">Loop from <span className="hint-inline">(optional)</span></label>
            <input id="f-anchor" className="input"
            placeholder={v.city.trim() ? `Defaults to ${v.city.trim()}` : "Defaults to your start location"}
            value={v.anchor} onChange={set("anchor")} />
            <F k="anchor"><span className="hint">Once nearby places are visited, anchor the day&rsquo;s loop at a town out on the frontier — your whole budget goes to new ground instead of commuting to it. Leave blank to loop from home.</span></F>
          </div>

          {/* Wedge splay angle */}
          <div className="field field-full">
            <label className="label">
              Wedge spread
              <span className="hint-inline">{v.splayAuto ? `Auto · ${autoSplayDeg(Number(v.hours))}° each side` : `${v.splayDeg}° each side`}</span>
            </label>
            <div className="splay-row">
              <div className="seg" role="group" aria-label="Spread mode">
                <button type="button" className={v.splayAuto ? "on" : ""} onClick={() => set("splayAuto")(true)}>Auto</button>
                <button type="button" className={!v.splayAuto ? "on" : ""} onClick={() => set("splayAuto")(false)}>Manual</button>
              </div>
              <input type="range" className="splay-slider" min="8" max="50" step="1"
                disabled={v.splayAuto}
                value={v.splayAuto ? autoSplayDeg(Number(v.hours)) : v.splayDeg}
                onChange={set("splayDeg")} />
            </div>
            <span className="hint">How far the out and back legs fan apart. Wider covers more ground but adds cross-over driving at the far end; narrower keeps the loop tight. Auto scales it to your hours.</span>
          </div>
          </React.Fragment>
          )}

          {/* Keywords */}
          <div className="field field-full">
            <label className="label" htmlFor="f-kw">Keywords to search <span className="req">*</span></label>
            <input id="f-kw" className={"input" + (err.keywords ? " input-invalid" : "")}
            value={v.keywords} onChange={set("keywords")} placeholder="mosque, Islamic center, Quran school" />
            <F k="keywords">
              <span className="hint">
                Comma-separated, up to 5. {keywords.length > 0 && <b>{keywords.length} term{keywords.length > 1 ? "s" : ""}</b>} — each runs as a separate search.
              </span>
            </F>
          </div>

          {!isMozi && (
          <React.Fragment>
          {/* Sites per day */}
          <div className="field">
            <label className="label" htmlFor="f-spd">Sites per day <span className="req">*</span></label>
            <input id="f-spd" type="number" min="1" max="15" step="1"
            className={"input" + (err.sitesPerDay ? " input-invalid" : "")}
            value={v.sitesPerDay} onChange={set("sitesPerDay")} />
            <F k="sitesPerDay" />
          </div>

          {/* Days */}
          <div className="field">
            <label className="label" htmlFor="f-days">Days available <span className="hint-inline">(optional)</span></label>
            <input id="f-days" type="number" min="1" max="60" step="1" placeholder="No limit"
            className={"input" + (err.days ? " input-invalid" : "")}
            value={v.days == null ? "" : v.days} onChange={set("days")} />
            <F k="days"><span className="hint">
              {String(v.days).trim() === "" ?
                <React.Fragment>No limit — fits <b>every</b> site found, {Number(v.sitesPerDay) || 0} per day.</React.Fragment> :
                <React.Fragment>Up to <b>{(Number(v.sitesPerDay) || 0) * (Number(v.days) || 0)}</b> sites total.</React.Fragment>}
            </span></F>
          </div>
          </React.Fragment>
          )}
        </div>

        <div className="divider-or">API access</div>

        <div className="form-grid">
          {/* API key */}
          <div className="field field-full">
            <label className="label" htmlFor="f-key">Google Maps API key <span className="req">*</span></label>
            <div className="key-wrap">
              <input id="f-key" className={"input mono" + (err.apiKey ? " input-invalid" : "")}
              type={showKey ? "text" : "password"} autoComplete="off" spellCheck="false"
              placeholder="AIza…" value={v.apiKey} onChange={set("apiKey")} style={{ paddingRight: 64 }} />
              <button type="button" className="key-toggle" onClick={() => setShowKey((s) => !s)}>
                {showKey ? "hide" : "show"}
              </button>
            </div>
            <F k="apiKey">
              <span className="hint">
                Needs <b>Places API (New)</b> and <b>Routes API</b> enabled. Used in your browser to fetch live results.
              </span>
            </F>
            {onSaveKey && v.apiKey.trim() && v.apiKey.trim() !== savedApiKey && (
              <button type="button" className="excl-link" style={{ alignSelf: "flex-start", marginTop: 2 }} onClick={() => onSaveKey(v.apiKey.trim())}>Save this key to my account</button>
            )}
            {onSaveKey && savedApiKey && v.apiKey.trim() === savedApiKey && (
              <span className="hint" style={{ color: "var(--accent-ink)" }}>Loaded from your account.</span>
            )}
          </div>

          {/* Cap */}
          <div className="field">
            <label className="label" htmlFor="f-cap">API usage cap <span className="req">*</span></label>
            <input id="f-cap" type="number" min="1" step="1"
            className={"input" + (err.cap ? " input-invalid" : "")}
            value={v.cap} onChange={set("cap")} />
            <F k="cap"><span className="hint">Max API calls allowed for this run.</span></F>
          </div>

          <div className="field">
            <label className="label" aria-hidden="true" style={{ visibility: "hidden" }}>Estimate</label>
            <div className={"banner " + (overCap ? "banner-danger" : nearCap ? "banner-warn" : "banner-info")} style={{ padding: "10px 13px", flex: 1, alignItems: "center" }}>
              <span className="banner-icon">{overCap || nearCap ? <IconWarn size={16} /> : <IconInfo size={16} />}</span>
              <span>
                Estimated <b>{estimate}</b> call{estimate !== 1 ? "s" : ""} this run
                {overCap ? " — over your cap." : nearCap ? " — near your cap." : "."}
              </span>
            </div>
          </div>
        </div>

        {exclusions.length > 0 && (
          <React.Fragment>
            <div className="divider-or">Your history</div>
            <div className="excl-row">
              <button type="button" className={"switch" + (skipVisited ? " on" : "")} role="switch"
                aria-checked={skipVisited} aria-label="Skip visited places" onClick={() => setSkipVisited((s) => !s)}>
                <span className="switch-knob" />
              </button>
              <div className="excl-text">
                <div className="excl-title">Skip places I&rsquo;ve already visited</div>
                <div className="hint">
                  Excludes <b>{exclusions.length}</b> visited place{exclusions.length !== 1 ? "s" : ""} from this search so you only get new sites.{" "}
                  <button type="button" className="excl-link" onClick={() => setShowExcl((s) => !s)}>{showExcl ? "hide" : "view list"}</button>
                </div>
                {showExcl && <div className="excl-list">{exclusions.map((x) => <span className="excl-chip" key={x.key}>{x.name}</span>)}</div>}
              </div>
            </div>
          </React.Fragment>
        )}

        <div className="form-foot">
          <button type="button" className="btn btn-quiet" onClick={onSample}>
            <IconSparkle size={15} /> Preview a sample itinerary (no API calls)
          </button>
          <button type="submit" className="btn btn-primary btn-lg" disabled={overCap}>
            <IconRoute size={17} /> Build itinerary
          </button>
        </div>
      </form>
    </div>);

}

Object.assign(window, { PlannerForm });
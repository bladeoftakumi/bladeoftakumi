/* library.jsx — saved itineraries + visited tracking + "reroute unvisited".
   ─────────────────────────────────────────────────────────────────────────
   PROTOTYPE storage: per-owner in localStorage (rihla_library_v1). Swap the
   _readLib/_writeLib helpers for Firestore later; components only call the
   LibraryStore methods (via the useLibrary hook passed down from App).        */

const { useState: useLState, useMemo: useLMemo, useCallback: useLCallback } = React;

const LIB_KEY = "rihla_library_v1";
const LIB_DEMO_KEY = "rihla_library_demo_v1";

/* demo sessions read/write a separate key so sample data never touches real data */
function _libKey() {
  try { const s = JSON.parse(localStorage.getItem("rihla_auth_v1")) || {}; return s.demoSession ? LIB_DEMO_KEY : LIB_KEY; }
  catch (e) { return LIB_KEY; }
}
function _readLib() { try { return JSON.parse(localStorage.getItem(_libKey())) || { items: [] }; } catch (e) { return { items: [] }; } }
function _writeLib(s) { localStorage.setItem(_libKey(), JSON.stringify(s)); }
const _libUid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function itineraryFromResult(result, name) {
  return {
    id: _libUid(),
    name: name || result.city || "Untitled route",
    city: result.city || "",
    units: result.units || "mi",
    center: result.center || null,
    createdAt: Date.now(),
    days: (result.days || []).map((d) => ({
      totalSeconds: d.totalSeconds, totalMeters: d.totalMeters,
      stops: d.stops.map((s) => ({
        id: s.id, name: s.name, address: s.address, lat: s.lat, lng: s.lng,
        matched: s.matched || [], driveFromPrev: s.driveFromPrev || null,
      })),
    })),
    visited: {},
  };
}

/* ---------- demo showcase data ----------
   written to the demo key whenever the demo account signs in (always fresh) */
function seedDemoLibrary(force) {
  if (!force) { try { if (JSON.parse(localStorage.getItem(LIB_DEMO_KEY))) return; } catch (e) { /* reseed */ } }
  const D = (min, mi) => ({ seconds: min * 60, meters: Math.round(mi * 1609.344) });
  const S = (id, name, address, lat, lng, cats, drive) => ({ id, name, address, lat, lng, matched: cats, driveFromPrev: drive || null });
  const houston = {
    id: "demo-houston", name: "Houston — spring outreach", city: "Houston, TX", units: "mi",
    center: { lat: 29.7604, lng: -95.3698 }, createdAt: Date.now() - 12 * 864e5,
    days: [
      { totalSeconds: 2280, totalMeters: 24900, stops: [
        S("demo-h1", "Masjid Al-Noor Islamic Center", "3110 Eastside St, Houston, TX 77098", 29.7332, -95.4080, ["mosque"]),
        S("demo-h2", "Quba Institute & Quran Academy", "871 Westheimer Rd, Houston, TX 77006", 29.7430, -95.3850, ["Quran school"], D(9, 2.4)),
        S("demo-h3", "Madinah Institute", "9001 W Bellfort Ave, Houston, TX 77031", 29.6520, -95.5350, ["Islamic center", "Quran school"], D(18, 8.9)),
        S("demo-h4", "Bilal Masjid", "12815 Bissonnet St, Houston, TX 77099", 29.6660, -95.5900, ["mosque"], D(11, 4.2)),
      ]},
      { totalSeconds: 3360, totalMeters: 54400, stops: [
        S("demo-h5", "River Oaks Islamic Center", "3201 Allen Pkwy, Houston, TX 77019", 29.7610, -95.4030, ["Islamic center"]),
        S("demo-h6", "Masjid Hamza", "6233 Hartwick Rd, Houston, TX 77093", 29.8650, -95.3370, ["mosque"], D(21, 9.7)),
        S("demo-h7", "Clear Lake Islamic Center", "17511 El Camino Real, Houston, TX 77058", 29.5710, -95.1080, ["Islamic center"], D(35, 24.1)),
      ]},
    ],
    visited: {},
  };
  ["demo-h1", "demo-h2", "demo-h3", "demo-h5"].forEach((id) => { houston.visited["id:" + id] = true; });
  const sugarLand = {
    id: "demo-sugarland", name: "Sugar Land follow-ups", city: "Sugar Land, TX", units: "mi",
    center: { lat: 29.6197, lng: -95.6349 }, createdAt: Date.now() - 4 * 864e5,
    days: [
      { totalSeconds: 1740, totalMeters: 19000, stops: [
        S("demo-s1", "As-Salam Masjid & School", "10415 Synott Rd, Sugar Land, TX 77498", 29.6620, -95.6420, ["mosque", "Quran school"]),
        S("demo-s2", "Maryam Islamic Center", "504 Sartartia Rd, Sugar Land, TX 77479", 29.5850, -95.6520, ["Islamic center"], D(14, 6.0)),
        S("demo-s3", "Iman Academy SW", "13815 Beechnut St, Houston, TX 77083", 29.6870, -95.6090, ["Quran school"], D(15, 5.8)),
      ]},
    ],
    visited: { "id:demo-s1": true },
  };
  localStorage.setItem(LIB_DEMO_KEY, JSON.stringify({ items: [houston, sugarLand] }));
}

function resetDemoLibrary() { try { localStorage.removeItem(LIB_DEMO_KEY); } catch (e) { /* noop */ } }

const LibraryStore = {
  list() { return _readLib().items.slice().sort((a, b) => b.createdAt - a.createdAt); },
  get(id) { return _readLib().items.find((i) => i.id === id) || null; },
  save(result, name) { const s = _readLib(); const it = itineraryFromResult(result, name); s.items.push(it); _writeLib(s); return it; },
  rename(id, name) { const s = _readLib(); const it = s.items.find((i) => i.id === id); if (it) { it.name = name; _writeLib(s); } },
  remove(id) { const s = _readLib(); s.items = s.items.filter((i) => i.id !== id); _writeLib(s); },
  setVisited(id, key, val) {
    const s = _readLib(); const it = s.items.find((i) => i.id === id);
    if (it) { it.visited = it.visited || {}; if (val) it.visited[key] = true; else delete it.visited[key]; _writeLib(s); }
    return it;
  },
};

/* single shared instance is created in App and passed down */
function useLibrary() {
  const [, setV] = useLState(0);
  const bump = useLCallback(() => setV((x) => x + 1), []);
  return {
    items: LibraryStore.list(),
    save: (r, n) => { const it = LibraryStore.save(r, n); bump(); return it; },
    rename: (id, n) => { LibraryStore.rename(id, n); bump(); },
    remove: (id) => { LibraryStore.remove(id); bump(); },
    setVisited: (id, k, val) => { const it = LibraryStore.setVisited(id, k, val); bump(); return it; },
  };
}

/* all unvisited stops across every itinerary that have coordinates (need them to route) */
function collectUnvisited(items) {
  const out = []; const seen = new Set();
  (items || []).forEach((it) => (it.days || []).forEach((d) => d.stops.forEach((s) => {
    const k = placeKey(s);
    if (it.visited && it.visited[k]) return;
    if (seen.has(k)) return;
    if (!(typeof s.lat === "number" && typeof s.lng === "number" && (s.lat || s.lng))) return;
    seen.add(k); out.push({ ...s });
  })));
  return out;
}
/* visited stops -> exclusion list [{key,name,address}] */
function collectVisited(items) {
  const out = []; const seen = new Set();
  (items || []).forEach((it) => (it.days || []).forEach((d) => d.stops.forEach((s) => {
    const k = placeKey(s);
    if (!(it.visited && it.visited[k])) return;
    if (seen.has(k)) return;
    seen.add(k); out.push({ key: k, name: s.name, address: s.address });
  })));
  return out;
}
function itinProgress(it) {
  let total = 0, done = 0;
  (it.days || []).forEach((d) => d.stops.forEach((s) => { total++; if (it.visited && it.visited[placeKey(s)]) done++; }));
  return { total, done };
}

/* ---------- reroute panel ---------- */
function RerouteCard({ unvisited, items, apiKey, onNeedKey, onResult }) {
  const [busy, setBusy] = useLState(false);
  const [err, setErr] = useLState("");
  const [sitesPerDay, setSitesPerDay] = useLState(5);
  const [startTime, setStartTime] = useLState("09:00");
  const starts = items.filter((i) => i.center).map((i) => ({ id: i.id, label: i.city || i.name, center: i.center, units: i.units }));
  const [startId, setStartId] = useLState(() => (starts[0] ? starts[0].id : ""));
  const count = unvisited.length;

  const run = async () => {
    setErr("");
    if (!apiKey) { onNeedKey(); return; }
    const start = starts.find((s) => s.id === startId) || starts[0];
    if (!start) { setErr("Save a planned route first so there's a start location to route from."); return; }
    setBusy(true);
    try {
      const result = await rerouteStops({
        apiKey, stops: unvisited,
        start: { lat: start.center.lat, lng: start.center.lng, name: start.label },
        startTime, sitesPerDay: Number(sitesPerDay) || 5, units: start.units || "mi",
      });
      onResult(result);
    } catch (e) { setErr(e.message || "Couldn't build the route."); }
    finally { setBusy(false); }
  };

  return (
    <div className="reroute-card">
      <div className="reroute-head">
        <span className="reroute-icon"><IconShuffle size={20} /></span>
        <div>
          <div className="reroute-title">Reroute unvisited stops</div>
          <div className="reroute-sub">
            {count > 0
              ? <React.Fragment><b>{count}</b> place{count !== 1 ? "s" : ""} across your saved routes {count !== 1 ? "are" : "is"} still unvisited. Build one efficient driving route that covers exactly those.</React.Fragment>
              : "Nothing unvisited right now. As you mark stops visited, the rest collect here for a fresh optimized route."}
          </div>
        </div>
      </div>
      {count > 0 && (
        <React.Fragment>
          <div className="reroute-controls">
            <div className="rr-field">
              <label className="o-flabel"><IconPin size={13} /> Start from</label>
              <select className="input" value={startId} onChange={(e) => setStartId(e.target.value)}>
                {starts.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div className="rr-field rr-narrow">
              <label className="o-flabel"><IconRoute size={13} /> Sites / day</label>
              <input className="input" type="number" min="1" max="15" value={sitesPerDay} onChange={(e) => setSitesPerDay(e.target.value)} />
            </div>
            <div className="rr-field rr-narrow">
              <label className="o-flabel"><IconClock size={13} /> Start time</label>
              <input className="input" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
          </div>
          {err && <div className="banner banner-danger" style={{ marginTop: 14 }}><span className="banner-icon"><IconWarn size={16} /></span><span>{err}</span></div>}
          <button className="btn btn-primary btn-lg" style={{ marginTop: 16 }} onClick={run} disabled={busy}>
            <IconShuffle size={17} /> {busy ? "Optimizing…" : `Build route from ${count} unvisited`}
          </button>
          {!apiKey && <div className="hint" style={{ marginTop: 9 }}>Add your API key in <b>Account</b> to enable rerouting.</div>}
        </React.Fragment>
      )}
    </div>
  );
}

/* ---------- one saved itinerary row ---------- */
function ItineraryCard({ it, onOpen, onDelete, onRename }) {
  const { total, done } = itinProgress(it);
  const pct = total ? Math.round((done / total) * 100) : 0;
  const [editing, setEditing] = useLState(false);
  const [name, setName] = useLState(it.name);
  const date = new Date(it.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const commit = () => { setEditing(false); const n = name.trim(); if (n && n !== it.name) onRename(it.id, n); else setName(it.name); };
  return (
    <div className="lib-card">
      <button className="lib-card-main" onClick={() => onOpen(it.id)}>
        <span className="lib-card-icon"><IconBookmark size={18} /></span>
        <span className="lib-card-body">
          {editing
            ? <input className="input lib-rename" value={name} autoFocus onClick={(e) => e.stopPropagation()}
                onChange={(e) => setName(e.target.value)} onBlur={commit}
                onKeyDown={(e) => { if (e.key === "Enter") commit(); }} />
            : <span className="lib-card-name">{it.name}</span>}
          <span className="lib-card-meta">{it.city ? it.city + " · " : ""}{total} stop{total !== 1 ? "s" : ""} · {date}</span>
          <span className="lib-progress">
            <span className="lib-progress-bar"><span className="lib-progress-fill" style={{ width: pct + "%" }} /></span>
            <span className="lib-progress-label">{done}/{total} visited</span>
          </span>
        </span>
      </button>
      <div className="lib-card-actions">
        <button className="icon-btn" title="Rename" onClick={() => setEditing(true)}><IconEdit size={15} /></button>
        <button className="icon-btn danger" title="Delete" onClick={() => { if (confirm(`Delete "${it.name}"? This can't be undone.`)) onDelete(it.id); }}><IconTrash size={15} /></button>
      </div>
    </div>
  );
}

/* ---------- library container (list | detail | reroute result) ---------- */
function Library({ lib, apiKey, onNeedKey, onPlanNew, onHome }) {
  const [openId, setOpenId] = useLState(null);
  const [reroute, setReroute] = useLState(null);
  const unvisited = useLMemo(() => collectUnvisited(lib.items), [lib.items]);

  if (reroute) {
    return <ResultsView result={reroute} backLabel="Back to itineraries" onBack={() => setReroute(null)}
      onSave={(r) => { lib.save(r, r.city || "Rerouted unvisited"); setReroute(null); return true; }} />;
  }
  if (openId) {
    const it = lib.items.find((i) => i.id === openId);
    if (!it) { setOpenId(null); return null; }
    const result = { city: it.name, center: it.center, units: it.units, days: it.days, savedItinerary: true };
    return <ResultsView result={result} backLabel="Back to itineraries" onBack={() => setOpenId(null)}
      savedMode visited={it.visited || {}} onToggleVisited={(k, val) => lib.setVisited(it.id, k, val)} />;
  }

  return (
    <div className="page page-wide">
      {onHome && (
        <button className="btn btn-quiet page-back" onClick={onHome}>
          <IconArrowLeft size={15} /> Back to home
        </button>
      )}
      <div className="lib-top">
        <div>
          <h1 className="page-title" style={{ marginBottom: 2 }}>My itineraries</h1>
          <p className="page-desc" style={{ margin: 0 }}>{lib.items.length} saved route{lib.items.length !== 1 ? "s" : ""}. Mark stops visited as you go — they're excluded from new searches and gathered for rerouting.</p>
        </div>
        <button className="btn btn-primary" onClick={onPlanNew}><IconPlus size={16} /> Plan a new route</button>
      </div>

      <RerouteCard unvisited={unvisited} items={lib.items} apiKey={apiKey} onNeedKey={onNeedKey} onResult={setReroute} />

      {lib.items.length === 0 ? (
        <div className="lib-empty">
          <span className="lib-empty-icon"><IconBookmark size={26} /></span>
          <div className="lib-empty-title">No saved itineraries yet</div>
          <div className="lib-empty-sub">Build a route in the Planner, then choose <b>Save to my itineraries</b>.</div>
          <button className="btn btn-outline" style={{ marginTop: 16 }} onClick={onPlanNew}><IconRoute size={16} /> Open the planner</button>
        </div>
      ) : (
        <div className="lib-list">
          {lib.items.map((it) => <ItineraryCard key={it.id} it={it} onOpen={setOpenId} onDelete={lib.remove} onRename={lib.rename} />)}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { useLibrary, LibraryStore, Library, collectUnvisited, collectVisited, seedDemoLibrary, resetDemoLibrary });

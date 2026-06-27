/* directory.jsx — the Directory: one deduped record per place and the single
   source of truth. Merges saved-route stops + Organizer tracking + manual adds,
   each carrying its own contacts, visit history, status, tags and notes.
   ─────────────────────────────────────────────────────────────────────────
   PROTOTYPE storage: per-owner in localStorage (rihla_directory_v1), demo
   sessions sandboxed in rihla_directory_demo_v1. This is the model that maps
   1:1 onto a future Firestore `places` collection (with a `contacts` array). */

const { useState: useDState, useEffect: useDEffect, useMemo: useDMemo } = React;

const DIR_KEY = "rihla_directory_v1";
const DIR_DEMO_KEY = "rihla_directory_demo_v1";

function _dirStoreKey() {
  try { const s = JSON.parse(localStorage.getItem("rihla_auth_v1")) || {}; return s.demoSession ? DIR_DEMO_KEY : DIR_KEY; }
  catch (e) { return DIR_KEY; }
}
function _readDir() { try { return JSON.parse(localStorage.getItem(_dirStoreKey())) || { places: [] }; } catch (e) { return { places: [] }; } }
function _writeDir(s) { localStorage.setItem(_dirStoreKey(), JSON.stringify(s)); }
function resetDemoDirectory() { try { localStorage.removeItem(DIR_DEMO_KEY); } catch (e) { /* noop */ } }
const _dUid = (p = "p") => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const _today = () => new Date().toISOString().slice(0, 10);

/* a place is "visited" once it has any logged visit or its status says so */
function _isVisited(p) { return (p.visits && p.visits.length > 0) || statusOf(p.status) === "Visited"; }

function _emptyPlace(over) {
  return {
    id: _dUid(), placeKey: "", name: "", address: "", lat: null, lng: null,
    category: [], status: "Not Started", tags: [], bestTime: "", notes: "",
    contacts: [], visits: [], source: "manual",
    createdAt: Date.now(), updatedAt: Date.now(), ...over,
  };
}

/* ---------- consolidate: pull route stops + organizer records into places ---------- */
function _loadOrganizerRecords() {
  try { const d = JSON.parse(localStorage.getItem("rihla_organizer_v1")); return (d && d.records) || []; }
  catch (e) { return []; }
}

/* normalized dedup key shared across every source (Places id isn't on Excel rows,
   so name+address is the only reliable cross-source match). Blank places stay
   distinct via their own id. */
function _normKey(p) {
  const n = (p.name || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (!n) return "__" + (p.id || Math.random().toString(36).slice(2));
  const a = (p.address || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 28);
  return n + "|" + a;
}
const _statusRank = (s) => ["Not Started", "Declined", "Contacted", "Meeting Booked", "Visited", "Confirmed"].indexOf(statusOf(s));

function _mergeInto(t, s) {
  if (!t.name && s.name) t.name = s.name;
  if (!t.address && s.address) t.address = s.address;
  if (t.lat == null && typeof s.lat === "number" && s.lat) { t.lat = s.lat; t.lng = s.lng; }
  t.category = Array.from(new Set([...(t.category || []), ...(s.category || [])]));
  t.tags = Array.from(new Set([...(t.tags || []), ...(s.tags || [])]));
  (s.contacts || []).forEach((c) => { if (!t.contacts.some((x) => x.name === c.name && x.phone === c.phone && x.email === c.email)) t.contacts.push({ ...c, primary: false }); });
  (s.visits || []).forEach((v) => { if (!t.visits.some((x) => x.date === v.date && x.note === v.note)) t.visits.push(v); });
  if (!t.notes && s.notes) t.notes = s.notes;
  if (!t.bestTime && s.bestTime) t.bestTime = s.bestTime;
  if (_statusRank(s.status) > _statusRank(t.status)) t.status = statusOf(s.status);
}

function consolidatePlaces(existing) {
  const list = [];
  const byKey = new Map();
  // 1) load existing, collapsing any pre-existing duplicates
  existing.forEach((raw) => {
    const p = { ...raw, category: [...(raw.category || [])], tags: [...(raw.tags || [])], contacts: [...(raw.contacts || [])], visits: [...(raw.visits || [])] };
    const key = _normKey(p);
    const found = byKey.get(key);
    if (found) { _mergeInto(found, p); } else { byKey.set(key, p); list.push(p); }
  });
  let added = 0;
  const ensure = (base) => {
    const key = _normKey(base);
    let p = byKey.get(key);
    if (!p) { p = _emptyPlace({ ...base, placeKey: key }); byKey.set(key, p); list.push(p); added++; return { p, isNew: true }; }
    return { p, isNew: false };
  };

  // saved itineraries -> places; visited flags (keyed by Places placeKey) -> a visit
  if (typeof LibraryStore !== "undefined") {
    LibraryStore.list().forEach((it) => (it.days || []).forEach((d) => d.stops.forEach((s) => {
      const { p, isNew } = ensure({ name: s.name, address: s.address, lat: s.lat, lng: s.lng, category: (s.matched || []).slice(), source: "route" });
      if (!isNew) {
        if (!p.category.length && s.matched && s.matched.length) p.category = s.matched.slice();
        if (!p.address && s.address) p.address = s.address;
        if (p.lat == null && typeof s.lat === "number" && s.lat) { p.lat = s.lat; p.lng = s.lng; }
      }
      if (it.visited && it.visited[placeKey(s)]) {
        const tag = "Visited on the " + (it.name || "saved route");
        if (!p.visits.some((v) => v.note === tag)) p.visits.push({ id: _dUid("v"), date: "", note: tag });
        if (p.status === "Not Started" || p.status === "Contacted") p.status = "Visited";
      }
    })));
  }

  // organizer records -> places + a primary contact
  _loadOrganizerRecords().forEach((r) => {
    if (!r.name) return;
    const { p } = ensure({ name: r.name, address: r.address, lat: r.lat, lng: r.lng, source: "organizer" });
    if (r.status && _statusRank(r.status) > _statusRank(p.status)) p.status = statusOf(r.status);
    if ((r.contactName || r.phone || r.email) &&
        !p.contacts.some((c) => c.name === (r.contactName || "") && c.phone === (r.phone || "") && c.email === (r.email || ""))) {
      p.contacts.push({ id: _dUid("c"), name: r.contactName || "", role: r.contactRole || "", phone: r.phone || "", email: r.email || "", notes: "", primary: p.contacts.length === 0 });
    }
    if (r.notes && !p.notes) p.notes = r.notes;
    if ((r.apptDate || r.apptTime)) {
      const note = "Appointment " + [r.apptDate, r.apptTime].filter(Boolean).join(" ");
      if (!p.visits.some((v) => v.note === note)) p.visits.push({ id: _dUid("v"), date: r.apptDate || "", note });
    }
  });

  list.forEach((p) => {
    if (!p.placeKey) p.placeKey = _normKey(p);
    if (p.contacts.length && !p.contacts.some((c) => c.primary)) p.contacts[0].primary = true;
  });
  return { places: list, added };
}

/* ---------- place -> tracker record (for Excel export, primary contact) ---------- */
function placesToRecords(places) {
  return places.map((p) => {
    const c = p.contacts.find((x) => x.primary) || p.contacts[0] || {};
    const notes = [p.notes, p.bestTime && ("Best time: " + p.bestTime), (p.tags || []).length && ("Tags: " + p.tags.join(", "))].filter(Boolean).join("  |  ");
    return {
      uid: p.id, day: "", stop: "", name: p.name, address: p.address,
      lat: typeof p.lat === "number" ? p.lat : null, lng: typeof p.lng === "number" ? p.lng : null,
      driveMin: "", distance: "", status: p.status || "", priority: "",
      contactName: c.name || "", contactRole: c.role || "", phone: c.phone || "", email: c.email || "",
      apptDate: "", apptTime: "", materials: "", followUp: "", notes,
    };
  });
}

/* ---------- small bits ---------- */
const CAT_TONE = (c) => /quran|school|academy|institute/i.test(c) ? "cat-school" : /center|centre/i.test(c) ? "cat-center" : "cat-mosque";

function TagInput({ value, onChange, placeholder }) {
  const [draft, setDraft] = useDState("");
  const add = () => { const t = draft.trim(); if (t && !value.includes(t)) onChange([...value, t]); setDraft(""); };
  return (
    <div className="dir-tagedit">
      {value.map((t, i) => (
        <span className="dir-tag" key={i}>{t}<button onClick={() => onChange(value.filter((x) => x !== t))} aria-label="remove">×</button></span>
      ))}
      <input className="dir-taginput" value={draft} placeholder={value.length ? "" : placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1)); }}
        onBlur={add} />
    </div>
  );
}

function ContactRow({ c, onChange, onRemove, onPrimary }) {
  const set = (k) => (e) => onChange({ [k]: e.target.value });
  return (
    <div className={"dir-contact" + (c.primary ? " primary" : "")}>
      <div className="dir-contact-grid">
        <input className="input" value={c.name} onChange={set("name")} placeholder="Full name" />
        <input className="input" value={c.role} onChange={set("role")} placeholder="Role (imam, principal…)" />
        <input className="input" value={c.phone} onChange={set("phone")} placeholder="Phone" />
        <input className="input" type="email" value={c.email} onChange={set("email")} placeholder="Email" />
        <input className="input dir-contact-note" value={c.notes} onChange={set("notes")} placeholder="Note (optional)" />
      </div>
      <div className="dir-contact-actions">
        <button className={"dir-primary-btn" + (c.primary ? " on" : "")} onClick={onPrimary} title="Primary contact">
          <IconCheck size={12} /> {c.primary ? "Primary" : "Make primary"}
        </button>
        <div className="dir-contact-quick">
          {c.phone && <a className="icon-btn" href={"tel:" + c.phone.replace(/[^0-9+]/g, "")} title="Call"><IconPhone size={14} /></a>}
          {c.email && <a className="icon-btn" href={"mailto:" + c.email} title="Email"><IconMail size={14} /></a>}
          <button className="icon-btn danger" onClick={onRemove} title="Remove contact"><IconTrash size={14} /></button>
        </div>
      </div>
    </div>
  );
}

function PlaceCard({ p, api, staged, startOpen }) {
  const [open, setOpen] = useDState(!!startOpen);
  const st = statusOf(p.status);
  const meta = (typeof STATUS_META !== "undefined" && STATUS_META[st]) || { color: "var(--ink-3)", dot: "#687579" };
  const primary = p.contacts.find((c) => c.primary) || p.contacts[0];
  const mapsUrl = typeof stopMapsUrl === "function" ? stopMapsUrl(p) : "#";
  const lastVisit = p.visits.filter((v) => v.date).sort((a, b) => b.date.localeCompare(a.date))[0];

  return (
    <div className={"school-card dir-card" + (open ? " open" : "")}>
      <button className="sc-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="sc-dot" style={{ background: meta.dot }} />
        <span className="sc-head-main">
          <span className="sc-name">{p.name || "Untitled place"}</span>
          {p.address && <span className="sc-addr">{p.address}</span>}
          {!open && (
            <span className="sc-tags">
              {(p.category || []).slice(0, 2).map((c, i) => <span className={"sc-tag dir-cat " + CAT_TONE(c)} key={i}>{c}</span>)}
              {primary && primary.name && <span className="sc-tag"><IconUser size={11} />{primary.name}</span>}
              {p.contacts.length > 1 && <span className="sc-tag">+{p.contacts.length - 1} contact{p.contacts.length - 1 !== 1 ? "s" : ""}</span>}
              {p.visits.length > 0 && <span className="sc-tag sc-tag-appt"><IconCheck size={11} />{p.visits.length} visit{p.visits.length !== 1 ? "s" : ""}</span>}
            </span>
          )}
        </span>
        <span className="sc-head-right">
          <span className="sc-status-pill" style={{ color: meta.color, borderColor: meta.color }}>{st}</span>
          <span className={"sc-chev" + (open ? " up" : "")}><IconChevron size={16} /></span>
        </span>
      </button>

      {open && (
        <div className="sc-body">
          <div className="o-grid">
            <div className="o-field">
              <label className="o-flabel"><IconUser size={13} /> Place name</label>
              <input className="input" value={p.name} onChange={(e) => api.update(p.id, { name: e.target.value })} placeholder="e.g. Masjid Al-Noor" />
            </div>
            <div className="o-field">
              <label className="o-flabel"><IconCircleCheck size={13} /> Status</label>
              <select className="input" value={st} onChange={(e) => api.update(p.id, { status: e.target.value })}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="o-field o-field-full">
              <label className="o-flabel"><IconPin size={13} /> Address</label>
              <input className="input" value={p.address} onChange={(e) => api.update(p.id, { address: e.target.value })} placeholder="Street, city, state" />
            </div>
            <div className="o-field">
              <label className="o-flabel"><IconBookmark size={13} /> Category</label>
              <TagInput value={p.category || []} onChange={(v) => api.update(p.id, { category: v })} placeholder="mosque, school…" />
            </div>
            <div className="o-field">
              <label className="o-flabel"><IconEdit size={13} /> Tags</label>
              <TagInput value={p.tags || []} onChange={(v) => api.update(p.id, { tags: v })} placeholder="priority, arabic…" />
            </div>
            <div className="o-field">
              <label className="o-flabel"><IconClock size={13} /> Best time to visit</label>
              <input className="input" value={p.bestTime} onChange={(e) => api.update(p.id, { bestTime: e.target.value })} placeholder="e.g. Fridays after Jumu'ah" />
            </div>
            <div className="o-field">
              <label className="o-flabel"><IconPin size={13} /> Open location</label>
              <a className="o-maplink" href={mapsUrl} target="_blank" rel="noopener noreferrer">Google Maps <IconExternal size={12} /></a>
            </div>
          </div>

          {/* contacts */}
          <div className="dir-section">
            <div className="dir-section-head">
              <span className="dir-section-title"><IconUser size={13} /> Contacts</span>
              <button className="dir-add" onClick={() => api.addContact(p.id)}><IconPlus size={13} /> Add contact</button>
            </div>
            {p.contacts.length ? p.contacts.map((c) => (
              <ContactRow key={c.id} c={c}
                onChange={(patch) => api.updateContact(p.id, c.id, patch)}
                onRemove={() => api.removeContact(p.id, c.id)}
                onPrimary={() => api.setPrimary(p.id, c.id)} />
            )) : <div className="dir-mini-empty">No contacts yet — add the imam, principal or admin you spoke with.</div>}
          </div>

          {/* visit history */}
          <div className="dir-section">
            <div className="dir-section-head">
              <span className="dir-section-title"><IconCalendar size={13} /> Visit history</span>
              <button className="dir-add" onClick={() => api.addVisit(p.id)}><IconPlus size={13} /> Log a visit</button>
            </div>
            {p.visits.length ? (
              <div className="dir-visits">
                {p.visits.slice().sort((a, b) => (b.date || "").localeCompare(a.date || "")).map((v) => (
                  <div className="dir-visit" key={v.id}>
                    <input className="input dir-visit-date" type="date" value={v.date || ""} onChange={(e) => api.updateVisit(p.id, v.id, { date: e.target.value })} />
                    <input className="input" value={v.note || ""} onChange={(e) => api.updateVisit(p.id, v.id, { note: e.target.value })} placeholder="What happened on this visit?" />
                    <button className="icon-btn danger" onClick={() => api.removeVisit(p.id, v.id)} title="Remove"><IconTrash size={14} /></button>
                  </div>
                ))}
              </div>
            ) : <div className="dir-mini-empty">No visits logged yet.</div>}
          </div>

          <div className="o-field o-field-full" style={{ marginTop: 16 }}>
            <label className="o-flabel"><IconEdit size={13} /> Notes</label>
            <textarea className="input o-textarea" value={p.notes} onChange={(e) => api.update(p.id, { notes: e.target.value })} rows={3} placeholder="Anything worth remembering about this place…" />
          </div>

          <div className="sc-quick dir-quick">
            {primary && primary.phone && <a className="sc-quick-btn" href={"tel:" + primary.phone.replace(/[^0-9+]/g, "")}><IconPhone size={13} /> Call</a>}
            {primary && primary.email && <a className="sc-quick-btn" href={"mailto:" + primary.email}><IconMail size={13} /> Email</a>}
            <a className="sc-quick-btn" href={mapsUrl} target="_blank" rel="noopener noreferrer"><IconPin size={13} /> Directions</a>
            <button className="sc-quick-btn" onClick={() => api.addVisit(p.id)}><IconCheck size={13} /> Mark visited</button>
            <button className={"sc-quick-btn" + (staged ? " on" : "")} onClick={() => api.toggleStage(p.id)}>
              <IconRoute size={13} /> {staged ? "Added to route" : "Add to route"}
            </button>
            <button className="sc-quick-btn danger" onClick={() => { if (confirm(`Remove "${p.name || "this place"}" from the directory?`)) api.remove(p.id); }}><IconTrash size={13} /> Delete</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- main container ---------- */
function Directory({ apiKey, onNeedKey, onHome }) {
  const [places, setPlaces] = useDState(() => _readDir().places);
  const [query, setQuery] = useDState("");
  const [filter, setFilter] = useDState("All");
  const [staged, setStaged] = useDState([]);
  const [openId, setOpenId] = useDState(null);
  const [routeResult, setRouteResult] = useDState(null);
  const [busy, setBusy] = useDState(false);
  const [routeErr, setRouteErr] = useDState("");
  const [toast, setToast] = useDState("");

  useDEffect(() => { _writeDir({ places }); }, [places]);

  const mutate = (id, fn) => setPlaces((ps) => ps.map((p) => (p.id === id ? fn({ ...p }) : p)));
  const api = {
    update: (id, patch) => mutate(id, (p) => ({ ...p, ...patch, updatedAt: Date.now() })),
    remove: (id) => { setPlaces((ps) => ps.filter((p) => p.id !== id)); setStaged((s) => s.filter((x) => x !== id)); },
    addContact: (id) => mutate(id, (p) => ({ ...p, contacts: [...p.contacts, { id: _dUid("c"), name: "", role: "", phone: "", email: "", notes: "", primary: p.contacts.length === 0 }] })),
    updateContact: (id, cid, patch) => mutate(id, (p) => ({ ...p, contacts: p.contacts.map((c) => (c.id === cid ? { ...c, ...patch } : c)) })),
    removeContact: (id, cid) => mutate(id, (p) => { const cs = p.contacts.filter((c) => c.id !== cid); if (cs.length && !cs.some((c) => c.primary)) cs[0] = { ...cs[0], primary: true }; return { ...p, contacts: cs }; }),
    setPrimary: (id, cid) => mutate(id, (p) => ({ ...p, contacts: p.contacts.map((c) => ({ ...c, primary: c.id === cid })) })),
    addVisit: (id) => mutate(id, (p) => ({ ...p, visits: [{ id: _dUid("v"), date: _today(), note: "" }, ...p.visits], status: (p.status === "Not Started" || p.status === "Contacted") ? "Visited" : p.status })),
    updateVisit: (id, vid, patch) => mutate(id, (p) => ({ ...p, visits: p.visits.map((v) => (v.id === vid ? { ...v, ...patch } : v)) })),
    removeVisit: (id, vid) => mutate(id, (p) => ({ ...p, visits: p.visits.filter((v) => v.id !== vid) })),
    toggleStage: (id) => setStaged((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])),
  };

  const addPlace = () => { const p = _emptyPlace({}); setPlaces((ps) => [p, ...ps]); setOpenId(p.id); };
  const doConsolidate = () => {
    const { places: merged, added } = consolidatePlaces(places);
    setPlaces(merged);
    setToast(added > 0 ? `Added ${added} place${added !== 1 ? "s" : ""} from your routes and organizer.` : "Your directory is already up to date.");
    setTimeout(() => setToast(""), 2800);
  };
  const exportXlsx = () => {
    if (!filtered.length) return;
    try { exportTrackerFromRecords(placesToRecords(filtered), { city: "Directory", days: 0 }); }
    catch (e) { alert("Couldn't export Excel: " + e.message); }
  };

  const buildRoute = async () => {
    setRouteErr("");
    if (!apiKey) { onNeedKey(); return; }
    const sel = places.filter((p) => staged.includes(p.id) && typeof p.lat === "number" && typeof p.lng === "number" && (p.lat || p.lng));
    if (!sel.length) { setRouteErr("None of the selected places have map coordinates yet. Add them from a planned route to map them."); return; }
    setBusy(true);
    try {
      const result = await rerouteStops({
        apiKey, stops: sel,
        start: { lat: sel[0].lat, lng: sel[0].lng, name: sel[0].name || "Start" },
        startTime: "09:00", sitesPerDay: 5, units: "mi",
      });
      setRouteResult(result);
    } catch (e) { setRouteErr(e.message || "Couldn't build the route."); }
    finally { setBusy(false); }
  };

  const groups = useDMemo(() => {
    const q = query.trim().toLowerCase();
    const byName = (a, b) => (a.name || "").localeCompare(b.name || "");
    const base = places.filter((p) => {
      if (filter !== "All" && statusOf(p.status) !== filter) return false;
      if (!q) return true;
      const hay = [p.name, p.address, (p.category || []).join(" "), (p.tags || []).join(" "), p.notes,
        ...(p.contacts || []).flatMap((c) => [c.name, c.role, c.phone, c.email])];
      return hay.some((v) => String(v || "").toLowerCase().includes(q));
    });
    return { visited: base.filter(_isVisited).sort(byName), rest: base.filter((p) => !_isVisited(p)).sort(byName) };
  }, [places, query, filter]);
  const filtered = useDMemo(() => [...groups.visited, ...groups.rest], [groups]);

  if (routeResult) {
    return <ResultsView result={routeResult} backLabel="Back to directory" onBack={() => setRouteResult(null)} />;
  }

  const FILTERS = ["All", ...STATUS_OPTIONS];
  const stagedCount = staged.length;

  return (
    <React.Fragment>
      <div className="page page-wide">
        {onHome && (
          <button className="btn btn-quiet page-back" onClick={onHome}>
            <IconArrowLeft size={15} /> Back to home
          </button>
        )}

        <div className="org-top">
          <div>
            <h1 className="page-title" style={{ marginBottom: 2 }}>Directory</h1>
            <p className="page-desc" style={{ margin: 0 }}>
              {places.length} place{places.length !== 1 ? "s" : ""} · one record for every mosque, school and contact — your single source of truth.
            </p>
          </div>
          <div className="org-top-actions">
            <button className="btn btn-ghost" onClick={doConsolidate}><IconRefresh size={15} /> Consolidate</button>
            <button className="btn btn-ghost" onClick={addPlace}><IconPlus size={15} /> Add place</button>
            <button className="btn btn-primary" onClick={exportXlsx} disabled={!filtered.length}><IconTable size={16} /> Export</button>
          </div>
        </div>

        {toast && (
          <div className="banner banner-info dir-toast" style={{ marginBottom: 18 }}>
            <span className="banner-icon"><IconCheck size={16} /></span><span>{toast}</span>
          </div>
        )}

        {places.length === 0 ? (
          <div className="lib-empty dir-hero">
            <span className="lib-empty-icon"><IconFolder size={26} /></span>
            <div className="lib-empty-title">Build your directory in one click</div>
            <div className="lib-empty-sub">Pull every place from your saved routes and the Organizer into one searchable, editable list — then add contacts and visit notes to each.</div>
            <div className="dir-hero-actions">
              <button className="btn btn-primary btn-lg" onClick={doConsolidate}><IconRefresh size={16} /> Consolidate my places</button>
              <button className="btn btn-outline btn-lg" onClick={addPlace}><IconPlus size={16} /> Add one manually</button>
            </div>
          </div>
        ) : (
          <React.Fragment>
            <div className="org-controls">
              <div className="org-search">
                <IconSearch size={15} />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search places, contacts, tags, notes…" />
              </div>
              <div className="org-filters">
                {FILTERS.map((f) => (
                  <button key={f} className={"org-filter" + (filter === f ? " active" : "")} onClick={() => setFilter(f)}>{f}</button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="org-empty">No places match your search or filter.</div>
            ) : (
              <React.Fragment>
                {groups.visited.length > 0 && (
                  <div className="org-daygroup dir-group">
                    <div className="org-daylabel"><IconCheck size={12} /> Visited <span>{groups.visited.length}</span></div>
                    <div className="org-cards">
                      {groups.visited.map((p) => (
                        <PlaceCard key={p.id} p={p} api={api} staged={staged.includes(p.id)} startOpen={openId === p.id} />
                      ))}
                    </div>
                  </div>
                )}
                {groups.rest.length > 0 && (
                  <div className="org-daygroup dir-group">
                    <div className="org-daylabel">Not visited yet <span>{groups.rest.length}</span></div>
                    <div className="org-cards">
                      {groups.rest.map((p) => (
                        <PlaceCard key={p.id} p={p} api={api} staged={staged.includes(p.id)} startOpen={openId === p.id} />
                      ))}
                    </div>
                  </div>
                )}
              </React.Fragment>
            )}
          </React.Fragment>
        )}
      </div>

      {stagedCount > 0 && (
        <div className="download-bar dir-staged-bar">
          <span className="download-bar-info">
            <b>{stagedCount}</b> place{stagedCount !== 1 ? "s" : ""} staged for a new route
            {routeErr && <span className="dir-staged-err"> · {routeErr}</span>}
          </span>
          <div className="download-bar-actions">
            <button className="btn btn-outline" onClick={() => setStaged([])}>Clear</button>
            <button className="btn btn-primary" onClick={buildRoute} disabled={busy}>
              <IconRoute size={16} /> {busy ? "Optimizing…" : "Plan route from selected"}
            </button>
          </div>
        </div>
      )}
    </React.Fragment>
  );
}

Object.assign(window, { Directory, useDirectory: null, consolidatePlaces, resetDemoDirectory });

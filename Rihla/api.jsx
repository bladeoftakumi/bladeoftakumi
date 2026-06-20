/* api.jsx — Google Maps Places API (New) + Routes API helpers, usage tracking, sample data */

const PLACES_URL = "https://places.googleapis.com/v1/places:searchText";
const ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";
const MAX_OPTIMIZE_WAYPOINTS = 23; // single-call optimize ceiling

/* ---- unit + format helpers ---- */
const toMeters = (value, unit) => Math.round(value * (unit === "km" ? 1000 : 1609.344));
const metersToUnit = (m, unit) => unit === "km" ? m / 1000 : m / 1609.344;

function fmtDistance(meters, unit) {
  const v = metersToUnit(meters, unit);
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${unit === "km" ? "km" : "mi"}`;
}
function fmtDuration(seconds) {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} hr ${r} min` : `${h} hr`;
}
function parseSeconds(dur) {
  // Routes API durations look like "1234s"
  if (typeof dur === "string") return parseFloat(dur.replace("s", "")) || 0;
  return 0;
}
/* stable key for a place: prefer the Places id, else normalized name+address.
   used to match visited / excluded places across runs and reroutes. */
function placeKey(p) {
  if (!p) return "";
  if (p.id && String(p.id).length > 6) return "id:" + p.id;
  return "n:" + [(p.name || ""), (p.address || "")].join("|").toLowerCase().replace(/\s+/g, " ").trim();
}

function haversine(a, b) {
  const R = 6371000, toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/* departure time: next occurrence of HH:MM (today if still ahead, else tomorrow) */
function nextDeparture(timeStr) {
  const [h, m] = (timeStr || "09:00").split(":").map(Number);
  const now = new Date();
  const d = new Date();
  d.setHours(h, m || 0, 0, 0);
  if (d.getTime() <= now.getTime() + 60000) d.setDate(d.getDate() + 1);
  return d;
}

/* ---- usage tracker ---- */
class UsageTracker {
  constructor(cap, onUpdate) {
    this.cap = cap > 0 ? cap : Infinity;
    this.count = 0;
    this.onUpdate = onUpdate || (() => {});
  }
  // call before making a request; throws if it would exceed the cap
  reserve(label) {
    if (this.count + 1 > this.cap) {
      const e = new Error(`API usage cap reached (${this.cap} calls). Increase your cap to continue.`);
      e.code = "CAP";
      throw e;
    }
    this.count += 1;
    this.onUpdate(this.count, this.cap, label);
    return this.count;
  }
}

/* ---- low-level fetchers ---- */
async function placesSearch({ apiKey, textQuery, center, radiusMeters, maxResultCount = 20 }) {
  const body = {
    textQuery,
    maxResultCount,
    languageCode: "en",
  };
  if (center && radiusMeters) {
    // Text Search (places:searchText) only accepts a circle under locationBias.
    // locationRestriction on this endpoint supports a rectangle only — passing a
    // circle there returns: Unknown name "circle" at 'location_restriction'.
    body.locationBias = {
      circle: {
        center: { latitude: center.lat, longitude: center.lng },
        radius: Math.min(Math.max(radiusMeters, 1), 50000),
      },
    };
  }
  const res = await fetch(PLACES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.primaryTypeDisplayName",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await apiError(res, "Places");
  const data = await res.json();
  return (data.places || []).map((p) => ({
    id: p.id,
    name: p.displayName?.text || "Unnamed location",
    address: p.formattedAddress || "",
    type: p.primaryTypeDisplayName?.text || "",
    lat: p.location?.latitude,
    lng: p.location?.longitude,
  })).filter((p) => typeof p.lat === "number" && typeof p.lng === "number");
}

async function computeRoute({ apiKey, origin, destination, intermediates, departureTime, optimize }) {
  const wp = (pt) => ({ location: { latLng: { latitude: pt.lat, longitude: pt.lng } } });
  const body = {
    origin: wp(origin),
    destination: wp(destination),
    intermediates: intermediates.map(wp),
    travelMode: "DRIVE",
    // optimizeWaypointOrder is incompatible with TRAFFIC_AWARE_OPTIMAL — Google
    // rejects the pair. Use TRAFFIC_AWARE when optimizing the stop order,
    // and the higher-quality _OPTIMAL tier only when we aren't reordering.
    routingPreference: optimize ? "TRAFFIC_AWARE" : "TRAFFIC_AWARE_OPTIMAL",
    departureTime: departureTime.toISOString(),
    optimizeWaypointOrder: !!optimize,
    languageCode: "en",
  };
  const res = await fetch(ROUTES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "routes.optimizedIntermediateWaypointIndex,routes.legs.duration,routes.legs.distanceMeters,routes.duration,routes.distanceMeters",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await apiError(res, "Routes");
  const data = await res.json();
  const route = (data.routes || [])[0];
  if (!route) throw new Error("No drivable route found between these locations.");
  return {
    order: route.optimizedIntermediateWaypointIndex || intermediates.map((_, i) => i),
    legs: (route.legs || []).map((l) => ({
      seconds: parseSeconds(l.duration),
      meters: l.distanceMeters || 0,
    })),
  };
}

async function apiError(res, which) {
  let detail = "";
  try {
    const j = await res.json();
    detail = j?.error?.message || "";
  } catch (e) { /* ignore */ }
  const msg = `${which} API error (${res.status})${detail ? ": " + detail : ""}`;
  const e = new Error(msg);
  e.code = "API";
  e.status = res.status;
  return e;
}

/* ---- top-level pipeline ----
   returns { plan: { city, center, units, departure, days:[{stops, totalSeconds, totalMeters}], unplacedCount } } */
async function buildItinerary(input, usage, onStep) {
  const {
    apiKey, city, keywords, radiusMeters, units,
    sitesPerDay, days, startTime,
  } = input;

  // 1) locate the city center
  onStep("locate");
  usage.reserve("geocode city");
  const cityHits = await placesSearch({ apiKey, textQuery: city, maxResultCount: 1 });
  if (!cityHits.length) throw new Error(`Couldn't locate "${city}". Try a more specific city name.`);
  const center = { lat: cityHits[0].lat, lng: cityHits[0].lng };

  // 2) search each keyword within the radius
  onStep("search");
  const seen = new Map();
  for (const kw of keywords) {
    usage.reserve(`search: ${kw}`);
    const hits = await placesSearch({ apiKey, textQuery: kw, center, radiusMeters, maxResultCount: 20 });
    for (const h of hits) {
      if (!seen.has(h.id)) { h.matched = [kw]; seen.set(h.id, h); }
      else if (!seen.get(h.id).matched.includes(kw)) seen.get(h.id).matched.push(kw);
    }
  }
  let found = [...seen.values()];
  if (!found.length) throw new Error(`No matching locations found in ${city} within the radius. Try widening the radius or adjusting keywords.`);

  // exclude places already on the user's visited list (logged-in "skip visited")
  const exKeys = new Set(input.excludeKeys || []);
  if (exKeys.size) {
    found = found.filter((p) => !exKeys.has(placeKey(p)));
    if (!found.length) throw new Error(`Every matching site is already on your visited list — nothing new to plan here. Turn off "skip visited" or widen your search.`);
  }

  // distance from center for selection + ordering fallback
  found.forEach((p) => { p.distFromCenter = haversine(center, p); });
  found.sort((a, b) => a.distFromCenter - b.distFromCenter);

  // capacity: a fixed number of days caps the list; blank/auto fits every site found
  const autoDays = !(Number(days) > 0);
  const effDays = autoDays ? Math.max(1, Math.ceil(found.length / sitesPerDay)) : days;
  const capacity = sitesPerDay * effDays;
  const selected = found.slice(0, capacity);
  const unplacedCount = found.length - selected.length;

  // 3) optimize routes
  onStep("optimize");
  const departure = nextDeparture(startTime);
  let dayGroups;
  if (selected.length <= MAX_OPTIMIZE_WAYPOINTS) {
    dayGroups = await optimizeSingleCall(selected, center, departure, sitesPerDay, effDays, apiKey, usage);
  } else {
    dayGroups = await optimizePerDay(selected, center, departure, sitesPerDay, effDays, apiKey, usage);
  }

  onStep("done");
  return {
    city,
    center,
    units,
    departure,
    foundCount: found.length,
    placedCount: selected.length,
    unplacedCount,
    days: dayGroups,
  };
}

/* ---- reroute: optimize a fixed set of already-known stops (no Places search) ----
   used by the library's "reroute unvisited" — the stops already have coordinates,
   so this is a single Routes optimize call (or one per day for large sets). */
async function rerouteStops({ apiKey, stops, start, startTime, sitesPerDay, units }) {
  if (!stops || !stops.length) throw new Error("No unvisited stops to route.");
  const usage = new UsageTracker(Infinity, () => {});
  const center = start;
  const departure = nextDeparture(startTime);
  const per = Number(sitesPerDay) > 0 ? Number(sitesPerDay) : 5;
  const effDays = Math.max(1, Math.ceil(stops.length / per));
  const dayGroups = stops.length <= MAX_OPTIMIZE_WAYPOINTS
    ? await optimizeSingleCall(stops, center, departure, per, effDays, apiKey, usage)
    : await optimizePerDay(stops, center, departure, per, effDays, apiKey, usage);
  return {
    city: start.name || "Unvisited route", center, units: units || "mi", departure,
    foundCount: stops.length, placedCount: stops.length, unplacedCount: 0,
    days: dayGroups, isReroute: true,
  };
}

/* one optimize call across all selected, then chunk by sitesPerDay */
async function optimizeSingleCall(selected, center, departure, sitesPerDay, days, apiKey, usage) {
  usage.reserve("optimize route");
  const { order, legs } = await computeRoute({
    apiKey, origin: center, destination: center,
    intermediates: selected, departureTime: departure, optimize: true,
  });
  // ordered stops; leg[j] is the drive INTO ordered-stop j (leg 0 = center -> first stop)
  const ordered = order.map((origIdx, j) => ({
    ...selected[origIdx],
    driveFromPrev: legs[j] || null,
  }));
  return chunk(ordered, sitesPerDay, days);
}

/* per-day: chunk nearest-first list into days, optimize each day separately */
async function optimizePerDay(selected, center, departure, sitesPerDay, days, apiKey, usage) {
  const groups = [];
  const chunks = sliceChunks(selected, sitesPerDay, days);
  for (const grp of chunks) {
    if (!grp.length) continue;
    usage.reserve("optimize day route");
    const { order, legs } = await computeRoute({
      apiKey, origin: center, destination: center,
      intermediates: grp, departureTime: departure, optimize: true,
    });
    const ordered = order.map((origIdx, j) => ({
      ...grp[origIdx],
      driveFromPrev: legs[j] || null,
    }));
    groups.push(summarizeDay(ordered));
  }
  return groups;
}

function sliceChunks(arr, per, maxDays) {
  const out = [];
  for (let i = 0; i < arr.length && out.length < maxDays; i += per) out.push(arr.slice(i, i + per));
  return out;
}
function chunk(ordered, per, maxDays) {
  return sliceChunks(ordered, per, maxDays).map(summarizeDay);
}
function summarizeDay(stops) {
  // first stop of a day starts fresh — don't carry an inbound drive leg
  const clean = stops.map((s, i) => ({ ...s, driveFromPrev: i === 0 ? null : s.driveFromPrev }));
  const totalSeconds = clean.reduce((a, s) => a + (s.driveFromPrev?.seconds || 0), 0);
  const totalMeters = clean.reduce((a, s) => a + (s.driveFromPrev?.meters || 0), 0);
  return { stops: clean, totalSeconds, totalMeters };
}

/* estimate API calls for a given config (for the form footer + pre-flight) */
function estimateCalls(keywordCount, sitesPerDay, days) {
  const capacity = sitesPerDay * days;
  const routeCalls = capacity <= MAX_OPTIMIZE_WAYPOINTS ? 1 : days;
  return 1 /* city */ + keywordCount + routeCalls;
}

/* ---- sample itinerary (no API calls) for previewing the output ---- */
function sampleItinerary(city = "Houston, TX", units = "mi") {
  const D = (min, mi) => ({ seconds: min * 60, meters: Math.round(mi * 1609.344) });
  const mk = (name, address, cats) => ({ name, address, matched: cats, lat: 0, lng: 0 });
  const raw = [
    [mk("Masjid Al-Noor Islamic Center", "3110 Eastside St, Houston, TX 77098", ["mosque"]), null],
    [mk("Quba Institute & Quran Academy", "871 Westheimer Rd, Houston, TX 77006", ["Quran school"]), D(9, 2.4)],
    [mk("Bilal Masjid", "12815 Bissonnet St, Houston, TX 77099", ["mosque"]), D(14, 6.1)],
    [mk("Madinah Institute", "9001 W Bellfort Ave, Houston, TX 77031", ["Islamic center", "Quran school"]), D(11, 3.8)],
    [mk("Masjid Hamza", "6233 Hartwick Rd, Houston, TX 77093", ["mosque"]), D(21, 9.7)],
    [mk("River Oaks Islamic Center", "3201 Allen Pkwy, Houston, TX 77019", ["Islamic center"]), null],
    [mk("As-Salam Masjid & School", "10415 Synott Rd, Sugar Land, TX 77498", ["mosque", "Quran school"]), D(13, 5.5)],
    [mk("Clear Lake Islamic Center", "17511 El Camino Real, Houston, TX 77058", ["Islamic center"]), D(24, 12.3)],
  ];
  const stops = raw.map(([s, d]) => ({ ...s, driveFromPrev: d, id: Math.random().toString(36) }));
  const day1 = stops.slice(0, 5);
  const day2 = stops.slice(5);
  const sum = (arr) => ({
    stops: arr.map((s, i) => ({ ...s, driveFromPrev: i === 0 ? null : s.driveFromPrev })),
    totalSeconds: arr.reduce((a, s, i) => a + (i === 0 ? 0 : s.driveFromPrev?.seconds || 0), 0),
    totalMeters: arr.reduce((a, s, i) => a + (i === 0 ? 0 : s.driveFromPrev?.meters || 0), 0),
  });
  return {
    city, center: { lat: 29.76, lng: -95.37 }, units,
    departure: nextDeparture("09:00"),
    foundCount: 8, placedCount: 8, unplacedCount: 0,
    days: [sum(day1), sum(day2)],
    isSample: true,
  };
}

/* ---- Mozi Mode: directional one-day loop ----
   Head out from a start in a compass direction, hit as many NEW places as fit
   in the day's hours (drive out + 20-min stops + drive home), return by the
   route optimizer's own path (so you don't retrace). Reach is derived from the
   time budget, not a destination. */
const DIRECTIONS = [
  { key: "N",  label: "North",     bearing: 0 },
  { key: "NE", label: "Northeast", bearing: 45 },
  { key: "E",  label: "East",      bearing: 90 },
  { key: "SE", label: "Southeast", bearing: 135 },
  { key: "S",  label: "South",     bearing: 180 },
  { key: "SW", label: "Southwest", bearing: 225 },
  { key: "W",  label: "West",      bearing: 270 },
  { key: "NW", label: "Northwest", bearing: 315 },
];
const MOZI_AVG_MPS = 40 * 1609.344 / 3600;   // ~40 mph effective (traffic + surface streets)
const MOZI_ROAD_FACTOR = 1.25;               // straight-line -> road distance fudge

// move from origin by distMeters along a compass bearing -> {lat,lng}
function destinationPoint(origin, bearingDeg, distMeters) {
  const R = 6371000, rad = Math.PI / 180;
  const br = bearingDeg * rad, lat1 = origin.lat * rad, lng1 = origin.lng * rad, dr = distMeters / R;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(dr) + Math.cos(lat1) * Math.sin(dr) * Math.cos(br));
  const lng2 = lng1 + Math.atan2(Math.sin(br) * Math.sin(dr) * Math.cos(lat1), Math.cos(dr) - Math.sin(lat1) * Math.sin(lat2));
  return { lat: lat2 / rad, lng: ((lng2 / rad) + 540) % 360 - 180 };
}

// signed distance of p ALONG the bearing axis from origin, + perpendicular offset (meters)
function projectOnBearing(origin, bearingDeg, p) {
  const R = 6371000, rad = Math.PI / 180;
  const x = (p.lng - origin.lng) * rad * Math.cos(((origin.lat + p.lat) / 2) * rad) * R; // east
  const y = (p.lat - origin.lat) * rad * R;                                              // north
  const br = bearingDeg * rad, ux = Math.sin(br), uy = Math.cos(br);
  return { along: x * ux + y * uy, perp: -x * uy + y * ux };
}

// shared geometry so the estimate and the run agree on sampling density.
// Mozi favors REACH over thrift: a far search horizon + dense, overlapping
// circles so the 20-results-per-call cap truncates as little as possible.
// The trip is a WEDGE — an outbound leg splayed to one side of the heading and
// a return leg splayed to the other — so the way home covers NEW ground.
// Auto splay scales with the day: more hours can afford a wider wedge (more
// ground) without the far-end cross-over drive eating the budget.
function autoSplayDeg(hours) {
  const h = Number(hours) || 8;
  return Math.max(16, Math.min(34, Math.round(14 + h * 1.5)));
}

function moziPlan(hours, corridorMeters) {
  const budgetSec = (Number(hours) || 8) * 3600;
  const maxReach = Math.min(budgetSec * 0.85 * MOZI_AVG_MPS / 2, 350 * 1609.344); // most of the day's one-way reach, cap ~350mi out
  const spacing = Math.max(corridorMeters * 0.55, 3500);                          // tightly overlapped tiling -> richer coverage
  const perLeg = Math.max(1, Math.ceil(maxReach / spacing));
  const nSamples = perLeg * 2;                                                     // two legs (out + back)
  return { budgetSec, maxReach, spacing, perLeg, nSamples };
}
function estimateMoziCalls(keywordCount, hours, corridorMeters) {
  const { nSamples } = moziPlan(hours, corridorMeters);
  return 1 /* geocode start */ + nSamples * keywordCount + 1 /* optimize loop */;
}

// sample one leg's corridor along a bearing; merge hits into `seen`
async function moziSweepLeg({ apiKey, anchor, bearing, perLeg, maxReach, searchRadius, keywords, usage, seen, legTag }) {
  for (let i = 1; i <= perLeg; i++) {
    const center = destinationPoint(anchor, bearing, (i / perLeg) * maxReach);
    for (const kw of keywords) {
      usage.reserve(`search ${legTag}: ${kw}`);
      const hits = await placesSearch({ apiKey, textQuery: kw, center, radiusMeters: searchRadius, maxResultCount: 20 });
      for (const h of hits) {
        if (!seen.has(h.id)) { h.matched = [kw]; seen.set(h.id, h); }
        else if (!seen.get(h.id).matched.includes(kw)) seen.get(h.id).matched.push(kw);
      }
    }
  }
}

async function buildMoziItinerary(input, usage, onStep) {
  const { apiKey, city, keywords, units, startTime } = input;
  const heading = Number(input.bearing) || 0;
  const dwellSec = (Number(input.dwellMin) || 20) * 60;
  const corridor = input.corridorMeters;
  const { budgetSec, maxReach, perLeg } = moziPlan(input.hours, corridor);

  // two legs of the wedge — auto-derived from the day, or a manual override
  const splayDeg = (input.splayDeg != null && input.splayDeg !== "" && !input.splayAuto)
    ? Math.max(5, Math.min(60, Number(input.splayDeg)))
    : autoSplayDeg(input.hours);
  const outBearing = (heading - splayDeg + 360) % 360;  // go out on this side
  const backBearing = (heading + splayDeg) % 360;       // return on this side

  // 1) locate the loop anchor — an optional frontier start, else the home/city
  onStep("locate");
  const anchorQuery = (input.anchor && input.anchor.trim()) ? input.anchor.trim() : city;
  usage.reserve("geocode start");
  const hit = await placesSearch({ apiKey, textQuery: anchorQuery, maxResultCount: 1 });
  if (!hit.length) throw new Error(`Couldn't locate "${anchorQuery}". Try a more specific start location.`);
  const start = { lat: hit[0].lat, lng: hit[0].lng };
  const anchored = !!(input.anchor && input.anchor.trim() && anchorQuery !== city);

  // 2) sweep BOTH legs of the wedge
  onStep("search");
  const seen = new Map();
  const searchRadius = Math.min(Math.max(corridor * 1.2, 1500), 50000);
  await moziSweepLeg({ apiKey, anchor: start, bearing: outBearing, perLeg, maxReach, searchRadius, keywords, usage, seen, legTag: "out" });
  await moziSweepLeg({ apiKey, anchor: start, bearing: backBearing, perLeg, maxReach, searchRadius, keywords, usage, seen, legTag: "back" });
  let found = [...seen.values()];
  if (!found.length) throw new Error(`No matching places found heading ${input.directionLabel || "that way"} from ${anchorQuery}. Widen the corridor or adjust keywords.`);

  // 3) drop visited — and gauge the frontier: how much of what's out there is already done?
  const rawCount = found.length;
  const exKeys = new Set(input.excludeKeys || []);
  let visitedNearby = 0;
  if (exKeys.size) {
    const kept = [];
    for (const p of found) { if (exKeys.has(placeKey(p))) visitedNearby++; else kept.push(p); }
    found = kept;
  }
  if (!found.length) throw new Error(`Everything in that direction is already on your visited list — nothing new to plan.`);

  // 4) classify each survivor to a leg by which splay bearing it sits closest to;
  //    keep only what's ahead of the anchor and inside the corridor.
  found.forEach((p) => {
    const po = projectOnBearing(start, outBearing, p);
    const pb = projectOnBearing(start, backBearing, p);
    // assign to whichever leg it's most "on" (smaller perpendicular offset while ahead)
    const okOut = po.along > 0, okBack = pb.along > 0;
    let leg = "out", pr = po;
    if (okOut && okBack) { if (Math.abs(pb.perp) < Math.abs(po.perp)) { leg = "back"; pr = pb; } }
    else if (okBack && !okOut) { leg = "back"; pr = pb; }
    p._leg = leg; p._along = pr.along; p._perp = Math.abs(pr.perp);
  });
  found = found.filter((p) => p._along > 0 && p._perp <= corridor);
  if (!found.length) throw new Error(`Matches were found, but none fall within the corridor. Widen it and try again.`);

  // order: up the OUT leg (near->far), then down the BACK leg (far->near) => a clean loop
  const outLeg = found.filter((p) => p._leg === "out").sort((a, b) => a._along - b._along);
  const backLeg = found.filter((p) => p._leg === "back").sort((a, b) => b._along - a._along);
  const ordered0 = outLeg.concat(backLeg);

  // 5) greedily fit as many as the day allows (drive + dwell + return to anchor), estimated
  const selected = [];
  let accumDrive = 0, prev = start;
  for (const p of ordered0) {
    const legTo = haversine(prev, p) / MOZI_AVG_MPS * MOZI_ROAD_FACTOR;
    const back = haversine(p, start) / MOZI_AVG_MPS * MOZI_ROAD_FACTOR;
    const total = accumDrive + legTo + (selected.length + 1) * dwellSec + back;
    if (total <= budgetSec) { selected.push(p); accumDrive += legTo; prev = p; }
  }
  if (!selected.length) selected.push(ordered0[0]); // always give at least the nearest
  const capped = selected.slice(0, MAX_OPTIMIZE_WAYPOINTS);

  // 6) one optimize call for the loop (anchor -> ... -> anchor)
  onStep("optimize");
  const departure = nextDeparture(startTime);
  usage.reserve("optimize loop route");
  const { order, legs } = await computeRoute({
    apiKey, origin: start, destination: start,
    intermediates: capped, departureTime: departure, optimize: true,
  });
  const ordered = order.map((origIdx, j) => ({ ...capped[origIdx], driveFromPrev: legs[j] || null }));
  const returnLegFull = legs[capped.length] || null; // last stop -> anchor, full set

  // 7) trim anything that pushes the real day over budget (real legs + est. return)
  const finalStops = [];
  let t = 0;
  for (let j = 0; j < ordered.length; j++) {
    const into = ordered[j].driveFromPrev?.seconds || 0;
    const ret = haversine(ordered[j], start) / MOZI_AVG_MPS * MOZI_ROAD_FACTOR;
    if (finalStops.length && t + into + dwellSec + ret > budgetSec) break;
    t += into + dwellSec;
    finalStops.push(ordered[j]);
  }

  // 8) totals (drive + return + dwell)
  const driveSeconds = finalStops.reduce((a, s) => a + (s.driveFromPrev?.seconds || 0), 0);
  const driveMeters = finalStops.reduce((a, s) => a + (s.driveFromPrev?.meters || 0), 0);
  const full = finalStops.length === ordered.length;
  const back = full && returnLegFull
    ? { seconds: returnLegFull.seconds, meters: returnLegFull.meters }
    : (finalStops.length
        ? { seconds: haversine(finalStops[finalStops.length - 1], start) / MOZI_AVG_MPS * MOZI_ROAD_FACTOR,
            meters: haversine(finalStops[finalStops.length - 1], start) * MOZI_ROAD_FACTOR }
        : { seconds: 0, meters: 0 });
  const totalDriveSeconds = driveSeconds + back.seconds;
  const totalDriveMeters = driveMeters + back.meters;
  const dwellTotalSec = finalStops.length * dwellSec;

  const day = { stops: finalStops, totalSeconds: totalDriveSeconds, totalMeters: totalDriveMeters, returnLeg: back };

  // frontier hint: most of what's nearby in this direction is already visited
  const frontier = (rawCount >= 6 && visitedNearby / rawCount >= 0.6 && !anchored);

  onStep("done");
  return {
    city, center: start, units, departure,
    foundCount: found.length, placedCount: finalStops.length,
    unplacedCount: Math.max(0, found.length - finalStops.length),
    days: [day],
    isMozi: true,
    mozi: {
      direction: input.directionLabel || "", bearing: heading,
      hours: Number(input.hours) || 8, dwellMin: Number(input.dwellMin) || 20,
      reachMeters: maxReach, dayTimeSec: totalDriveSeconds + dwellTotalSec, dwellTotalSec,
      splayDeg, splayAuto: !!input.splayAuto,
      anchored, anchorName: anchored ? anchorQuery : null,
      outCount: finalStops.filter((s) => s._leg === "out").length,
      backCount: finalStops.filter((s) => s._leg === "back").length,
      frontier, visitedNearby, rawCount,
    },
  };
}

/* ---- Google Maps deep links ---- */
// A single location token for a Maps URL: prefer real coordinates, fall back to text.
function gmapsLoc(p) {
  if (p && typeof p.lat === "number" && typeof p.lng === "number" && (p.lat !== 0 || p.lng !== 0))
    return `${p.lat},${p.lng}`;
  return encodeURIComponent([p && p.name, p && p.address].filter(Boolean).join(", "));
}
// Full driving route for one day: start (home/city) -> each stop in order.
function gmapsDayLink(day, start) {
  const stops = (day && day.stops) || [];
  if (!stops.length) return null;
  const pts = [];
  if (start && (start.lat || start.lng || start.name)) pts.push(start);
  stops.forEach((s) => pts.push(s));
  if (pts.length < 2) return null; // need at least an origin + destination to draw a route
  const origin = gmapsLoc(pts[0]);
  const destination = gmapsLoc(pts[pts.length - 1]);
  const mid = pts.slice(1, -1).map(gmapsLoc);
  let url = `https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=${origin}&destination=${destination}`;
  if (mid.length) url += `&waypoints=${mid.join("%7C")}`;
  return url;
}

// A round-trip loop: start -> each stop in order -> back to start.
function gmapsLoopLink(stops, start) {
  const list = (stops || []).filter(Boolean);
  if (!list.length || !start) return null;
  const origin = gmapsLoc(start);
  const mid = list.map(gmapsLoc);
  let url = `https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=${origin}&destination=${origin}`;
  if (mid.length) url += `&waypoints=${mid.join("%7C")}`;
  return url;
}

Object.assign(window, {
  buildItinerary, buildMoziItinerary, estimateCalls, estimateMoziCalls, sampleItinerary, UsageTracker,
  fmtDistance, fmtDuration, toMeters, nextDeparture, haversine, DIRECTIONS, autoSplayDeg,
  gmapsLoc, gmapsDayLink, gmapsLoopLink, placeKey, rerouteStops,
});

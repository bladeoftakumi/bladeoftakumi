/* results.jsx — day-by-day itinerary view + download (+ save / visited tracking) */
const { useState: useRState } = React;

function gmapsLink(stop) {
  if (stop.lat && stop.lng) {
    return `https://www.google.com/maps/search/?api=1&query=${stop.lat},${stop.lng}&query_place_id=${stop.id || ""}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.name + " " + (stop.address || ""))}`;
}

function StopRow({ stop, index, units, savedMode, visited, onToggleVisited }) {
  const cats = (stop.matched || []).slice(0, 3);
  const key = typeof placeKey === "function" ? placeKey(stop) : (stop.id || stop.name);
  const isVisited = savedMode && visited && !!visited[key];
  return (
    <React.Fragment>
      {stop.driveFromPrev && (
        <div className="stop-drive">
          <IconCar size={14} />
          {fmtDuration(stop.driveFromPrev.seconds)} drive · {fmtDistance(stop.driveFromPrev.meters, units)}
        </div>
      )}
      <div className={"stop" + (isVisited ? " stop-visited" : "")}>
        <div className="stop-rail">
          <div className="stop-num">{index}</div>
          <div className="stop-line" />
        </div>
        <div className="stop-body">
          <div className="stop-name">{stop.name}</div>
          {stop.address && <div className="stop-addr">{stop.address}</div>}
          <div className="stop-cats">
            {cats.map((c, i) => <span className="chip" key={i}>{c}</span>)}
          </div>
          <a className="maplink" href={gmapsLink(stop)} target="_blank" rel="noopener noreferrer">
            Open in Google Maps <IconExternal size={12} />
          </a>
        </div>
        {savedMode && (
          <button className={"visit-btn" + (isVisited ? " on" : "")} onClick={() => onToggleVisited(key, !isVisited)}
            title={isVisited ? "Mark as not visited" : "Mark as visited"}>
            {isVisited ? <React.Fragment><IconCheck size={14} /> Visited</React.Fragment> : "Mark visited"}
          </button>
        )}
      </div>
    </React.Fragment>
  );
}

function DayCard({ day, index, units, start, savedMode, visited, onToggleVisited, loop, dayLabel }) {
  const routeUrl = loop ? gmapsLoopLink(day.stops, start) : gmapsDayLink(day, start);
  return (
    <div className="card day-card">
      <div className="day-head">
        <div className="day-head-l">
          <span className="day-badge">{dayLabel || ("Day " + (index + 1))}</span>
          <span className="day-title">{day.stops.length} site{day.stops.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="day-meta">
          {fmtDuration(day.totalSeconds)} drive · {fmtDistance(day.totalMeters, units)}
        </div>
      </div>
      <div className="stops">
        {day.stops.map((s, i) => (
          <StopRow key={s.id || i} stop={s} index={i + 1} units={units}
            savedMode={savedMode} visited={visited} onToggleVisited={onToggleVisited} />
        ))}
        {loop && day.returnLeg && day.stops.length > 0 && (
          <div className="stop-drive stop-return">
            <IconCar size={14} />
            {fmtDuration(day.returnLeg.seconds)} drive · {fmtDistance(day.returnLeg.meters, units)} — back home
          </div>
        )}
      </div>
      {routeUrl && (
        <div className="day-foot">
          <a className="day-route" href={routeUrl} target="_blank" rel="noopener noreferrer">
            <IconRoute size={15} /> {loop ? "Open the loop in Google Maps" : "Open this day\u2019s route in Google Maps"} <IconExternal size={12} />
          </a>
        </div>
      )}
    </div>
  );
}

function ResultsView({ result, onBack, backLabel, onSave, onRequireLogin, savedMode, visited, onToggleVisited }) {
  const [downloading, setDownloading] = useRState(false);
  const [saved, setSaved] = useRState(false);
  const totalStops = result.days.reduce((a, d) => a + d.stops.length, 0);
  const totalSeconds = result.days.reduce((a, d) => a + d.totalSeconds, 0);
  const visitedCount = savedMode
    ? result.days.reduce((a, d) => a + d.stops.filter((s) => visited && visited[placeKey(s)]).length, 0)
    : 0;
  const dep = result.departure
    ? new Date(result.departure).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : null;

  const download = () => {
    setDownloading(true);
    try { generatePDF(result, { isSample: !!result.isSample }); }
    catch (e) { alert("Couldn't generate PDF: " + e.message); }
    finally { setTimeout(() => setDownloading(false), 600); }
  };
  const downloadXlsx = () => {
    try { exportTrackerFromResult(result); }
    catch (e) { alert("Couldn't generate Excel: " + e.message); }
  };
  const doSave = () => { if (onSave && onSave(result)) setSaved(true); };

  return (
    <React.Fragment>
      <div className="page page-wide">
        <button className="btn btn-quiet" onClick={onBack} style={{ marginLeft: -8, marginBottom: 14 }}>
          <IconArrowLeft size={15} /> {backLabel || "New search"}
        </button>

        {result.isReroute && (
          <div className="banner banner-info" style={{ marginBottom: 18 }}>
            <span className="banner-icon"><IconShuffle size={16} /></span>
            <span><b>Rerouted.</b> One efficient route covering every place you hadn&rsquo;t visited yet. Save it to keep tracking.</span>
          </div>
        )}

        {result.isMozi && (
          <div className="banner banner-info" style={{ marginBottom: 18 }}>
            <span className="banner-icon"><IconCompass size={16} /></span>
            <span>
              <b>Mozi Mode — {result.mozi.direction}{result.mozi.anchored ? ` from ${result.mozi.anchorName}` : ""}.</b>{" "}
              A one-day loop out and back, fitting <b>{totalStops}</b> new place{totalStops !== 1 ? "s" : ""}
              {(result.mozi.outCount + result.mozi.backCount > 0) && (
                <> (<b>{result.mozi.outCount}</b> on the way out, <b>{result.mozi.backCount}</b> on the way home)</>
              )}{" "}
              into about <b>{fmtDuration(result.mozi.dayTimeSec)}</b> ({fmtDuration(totalSeconds)} driving + {fmtDuration(result.mozi.dwellTotalSec)} at stops). Already-visited places were skipped.
              {result.mozi.splayDeg != null && (
                <> Wedge spread <b>{result.mozi.splayDeg}°</b>{result.mozi.splayAuto ? " (auto)" : ""}.</>
              )}
            </span>
          </div>
        )}

        {result.isMozi && result.mozi.frontier && (
          <div className="banner banner-warn" style={{ marginBottom: 18 }}>
            <span className="banner-icon"><IconInfo size={16} /></span>
            <span>
              Most nearby places this way are already visited ({result.mozi.visitedNearby} of {result.mozi.rawCount} found).
              Your unvisited cluster is farther out — set a <b>“Loop from”</b> town on the frontier so the whole day goes to new ground instead of driving to it.
            </span>
          </div>
        )}

        {result.isSample && (
          <div className="banner banner-info" style={{ marginBottom: 18 }}>
            <span className="banner-icon"><IconSparkle size={16} /></span>
            <span><b>Sample preview.</b> This itinerary uses example data — no API calls were made. Run a real search from the form to use your own city and key.</span>
          </div>
        )}

        {!result.isSample && result.unplacedCount > 0 && (
          <div className="banner banner-warn" style={{ marginBottom: 18 }}>
            <span className="banner-icon"><IconInfo size={16} /></span>
            {result.isMozi ? (
              <span>
                Found <b>{result.foundCount}</b> new place{result.foundCount !== 1 ? "s" : ""} in that direction — <b>{result.placedCount}</b> fit your day.
                {" "}<b>{result.unplacedCount}</b> didn&rsquo;t fit. Add hours or narrow the corridor to reach more.
              </span>
            ) : (
              <span>
                Found <b>{result.foundCount}</b> matching sites — scheduled the <b>{result.placedCount}</b> closest
                across your {result.days.length} day{result.days.length !== 1 ? "s" : ""}.
                {" "}<b>{result.unplacedCount}</b> didn't fit. Add days or sites-per-day to include more.
              </span>
            )}
          </div>
        )}

        <div className="results-head">
          <div>
            <h1 className="page-title" style={{ marginBottom: 2 }}>{result.city}</h1>
            <div className="summary-stats">
              <div className="stat">
                <span className="stat-num">{result.isMozi ? fmtDuration(result.mozi.dayTimeSec) : result.days.length}</span>
                <span className="stat-label">{result.isMozi ? "Day total" : "Days"}</span>
              </div>
              <div className="stat">
                <span className="stat-num">{totalStops}</span>
                <span className="stat-label">Sites</span>
              </div>
              <div className="stat">
                <span className="stat-num">{fmtDuration(totalSeconds)}</span>
                <span className="stat-label">Total drive</span>
              </div>
              {savedMode && (
                <div className="stat">
                  <span className="stat-num">{visitedCount}/{totalStops}</span>
                  <span className="stat-label">Visited</span>
                </div>
              )}
            </div>
          </div>
          <div className="results-actions">
            {onSave && (
              <button className="btn btn-outline btn-lg" onClick={doSave} disabled={saved}>
                {saved ? <React.Fragment><IconCheck size={16} /> Saved</React.Fragment>
                       : <React.Fragment><IconBookmark size={16} /> Save to my itineraries</React.Fragment>}
              </button>
            )}
            {!onSave && onRequireLogin && (
              <button className="btn btn-outline btn-lg" onClick={onRequireLogin}>
                <IconBookmark size={16} /> Log in to save
              </button>
            )}
            <button className="btn btn-outline btn-lg" onClick={downloadXlsx}>
              <IconTable size={17} /> Excel
            </button>
            <button className="btn btn-primary btn-lg" onClick={download} disabled={downloading}>
              <IconDownload size={17} /> {downloading ? "Preparing…" : "Download PDF"}
            </button>
          </div>
        </div>

        <div>
          {result.days.map((d, i) => (
            <DayCard key={i} day={d} index={i} units={result.units}
              loop={!!result.isMozi}
              dayLabel={result.isMozi ? "One-day loop" : null}
              start={result.center ? { lat: result.center.lat, lng: result.center.lng, name: result.city } : null}
              savedMode={savedMode} visited={visited} onToggleVisited={onToggleVisited} />
          ))}
        </div>
      </div>

      <div className="download-bar">
        <span className="download-bar-info">
          {totalStops} sites · {result.days.length} day{result.days.length !== 1 ? "s" : ""} · {fmtDuration(totalSeconds)} total drive
          {savedMode ? ` · ${visitedCount} visited` : ""}
        </span>
        <div className="download-bar-actions">
          {onSave && (
            <button className="btn btn-outline" onClick={doSave} disabled={saved}>
              {saved ? <React.Fragment><IconCheck size={15} /> Saved</React.Fragment>
                     : <React.Fragment><IconBookmark size={15} /> Save</React.Fragment>}
            </button>
          )}
          <button className="btn btn-outline" onClick={downloadXlsx}>
            <IconTable size={16} /> Excel
          </button>
          <button className="btn btn-primary" onClick={download} disabled={downloading}>
            <IconDownload size={16} /> {downloading ? "Preparing…" : "Download itinerary PDF"}
          </button>
        </div>
      </div>
    </React.Fragment>
  );
}

Object.assign(window, { ResultsView });

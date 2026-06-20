/* Finance Monitor — read-only views, drop zone, app shell */

/* ---------- read-only table ---------- */
function ViewTable(props) {
  var cols = props.columns, rows = props.rows;
  var grid = cols.map(function (c) { return c.width || (c.type === "date" ? "150px" : c.type === "number" || c.compute ? "140px" : "1fr"); }).join(" ");
  var minW = Math.max(440, cols.length * 116);
  function footTotal(col) {
    return rows.reduce(function (a, r) { return a + SufahData.num(col.compute ? col.compute(r) : r[col.key]); }, 0);
  }
  return React.createElement(
    "div", { className: "ledger" },
    React.createElement(
      "div", { className: "ledger__scroll" },
      React.createElement(
        "div", { className: "table", style: { "--grid": grid, minWidth: minW } },
        React.createElement(
          "div", { className: "table__head" },
          cols.map(function (c) {
            return React.createElement("div", { key: c.key, className: "th th--" + (c.align || (c.type === "number" || c.compute ? "right" : "left")) }, c.label);
          })
        ),
        rows.length === 0
          ? React.createElement("div", { className: "table__empty" }, "No rows for this view in the loaded file.")
          : rows.map(function (r, ri) {
              return React.createElement(
                "div", { className: "tr tr--read", key: r.id || ri },
                cols.map(function (c) {
                  var content;
                  if (c.compute) content = React.createElement(Money, { value: c.compute(r), tone: c.tone || "sign" });
                  else if (c.type === "number") content = React.createElement(Money, { value: SufahData.num(r[c.key]), tone: c.tone || "neutral" });
                  else if (c.type === "date") content = React.createElement("span", { className: "vd" }, fmtDate(r[c.key]));
                  else content = React.createElement("span", { className: "vt" }, r[c.key] || React.createElement("span", { className: "vt--empty" }, "—"));
                  return React.createElement("div", { key: c.key, className: "td vcell vcell--" + (c.align || (c.type === "number" || c.compute ? "right" : "left")) }, content);
                })
              );
            }),
        React.createElement(
          "div", { className: "table__foot" },
          cols.map(function (c, i) {
            if (i === 0) return React.createElement("div", { key: c.key, className: "tf tf--label" }, "Total · " + rows.length);
            if (c.type === "number" || c.compute) return React.createElement("div", { key: c.key, className: "tf tf--right" }, React.createElement(Money, { value: footTotal(c), tone: c.tone || "neutral", strong: true }));
            return React.createElement("div", { key: c.key, className: "tf" });
          })
        )
      )
    )
  );
}

var VIEW_COLS = {
  revenue: [
    { key: "start", label: "Date start", type: "date" },
    { key: "end", label: "Date end", type: "date" },
    { key: "netRevenue", label: "Net revenue", type: "number" },
    { key: "stripe", label: "Stripe fees", type: "number" },
    { key: "refunds", label: "Refunds", type: "number" },
    { key: "tax", label: "Tax", type: "number" },
    { key: "commission", label: "Commission", type: "number" },
    { key: "profit", label: "Net profit", compute: SufahData.rowNetProfit, tone: "sign" }
  ],
  share: [
    { key: "date", label: "Date authorized", type: "date" },
    { key: "reason", label: "Reason", type: "text" },
    { key: "amount", label: "Amount", type: "number", tone: "negative" }
  ],
  authorizations: [
    { key: "date", label: "Date authorized", type: "date" },
    { key: "amount", label: "Amount authorized", type: "number" }
  ],
  investments: [
    { key: "date", label: "Date", type: "date" },
    { key: "amount", label: "Amount", type: "number", tone: "positive" }
  ],
  draws: [
    { key: "date", label: "Date authorized", type: "date" },
    { key: "note", label: "Reason", type: "text" },
    { key: "amount", label: "Amount", type: "number", tone: "negative" }
  ]
};

/* ---------- drop zone (empty state) ---------- */
function DropZone(props) {
  var _drag = React.useState(false); var drag = _drag[0], setDrag = _drag[1];
  var inputRef = React.useRef(null);
  function onFiles(files) { if (files && files[0]) props.onFile(files[0]); }
  return React.createElement(
    "div", { className: "landing" },
    React.createElement(
      "div", { className: "landing__inner" },
      React.createElement("div", { className: "landing__kicker" }, "Finance Monitor"),
      React.createElement("h1", { className: "landing__title" }, "A clean window onto your books."),
      React.createElement("p", { className: "landing__lede" }, "Drop your workbook in. It’s read live, in this tab — nothing is uploaded, nothing is stored. Update the file in Excel, drop it again, and the picture refreshes."),
      React.createElement(
        "div", {
          className: "drop" + (drag ? " is-drag" : ""),
          onDragOver: function (e) { e.preventDefault(); setDrag(true); },
          onDragLeave: function () { setDrag(false); },
          onDrop: function (e) { e.preventDefault(); setDrag(false); onFiles(e.dataTransfer.files); },
          onClick: function () { inputRef.current && inputRef.current.click(); }
        },
        React.createElement("div", { className: "drop__icon" }, fileGlyph()),
        React.createElement("div", { className: "drop__title" }, drag ? "Release to read" : "Drop your .xlsx or .csv here"),
        React.createElement("div", { className: "drop__sub" }, "or click to choose a file"),
        React.createElement("input", { ref: inputRef, type: "file", accept: ".xlsx,.csv", className: "drop__input", onChange: function (e) { onFiles(e.target.files); } })
      ),
      props.error ? React.createElement("div", { className: "landing__error" }, props.error) : null,
      React.createElement(
        "div", { className: "landing__actions" },
        React.createElement("button", { className: "linkbtn", onClick: props.onSample }, "View with sample data →")
      ),
      React.createElement(
        "div", { className: "formatcard" },
        React.createElement("div", { className: "formatcard__head" }, "Expected format"),
        React.createElement("p", { className: "formatcard__note" }, "One workbook, a sheet per ledger. The monitor matches sheet names and column headers loosely, so small naming differences are fine."),
        React.createElement(
          "ul", { className: "formatcard__list" },
          fmtRow("Revenue", "Date Start · Date End · Net Revenue · Stripe Fee · Refunds, Disputes & Fees · Tax Collected · Commission"),
          fmtRow("Contractor Fund Authorization", "Date Authorized · Amount Authorized"),
          fmtRow("Investment into Business", "Date · Amount"),
          fmtRow("Business Related Expenses", "Date Authorized · Amount · Reason"),
          fmtRow("Profit Taken", "Date Authorized · Amount · Reason")
        ),
        React.createElement("div", { className: "formatcard__foot" }, React.createElement("strong", null, "Net Profit"), " is computed for you: Net Revenue − Stripe − Refunds − Tax − Commission.")
      )
    )
  );
  function fmtRow(name, cols) {
    return React.createElement("li", { className: "formatcard__row", key: name },
      React.createElement("span", { className: "formatcard__sheet" }, name),
      React.createElement("span", { className: "formatcard__cols" }, cols));
  }
}

function fileGlyph() {
  return React.createElement("svg", { width: 40, height: 40, viewBox: "0 0 24 24", fill: "none" },
    React.createElement("path", { d: "M6 2.5h7L19 8v13.5H6z", stroke: "currentColor", strokeWidth: 1.3, strokeLinejoin: "round" }),
    React.createElement("path", { d: "M13 2.5V8h6", stroke: "currentColor", strokeWidth: 1.3, strokeLinejoin: "round" }),
    React.createElement("path", { d: "M9 13h6M9 16.5h6M9 9.5h2", stroke: "currentColor", strokeWidth: 1.3, strokeLinecap: "round" }));
}

/* ---------- summary strip ---------- */
function SummaryStrip(props) {
  var meta = props.meta || {}; var parsed = meta.parsed || {};
  var labels = { revenue: "Revenue", share: "Expenses", authorizations: "Authorizations", investments: "Investments", draws: "Profit taken" };
  var chips = Object.keys(labels).filter(function (k) { return parsed[k] != null; }).map(function (k) {
    return React.createElement("span", { className: "chip", key: k },
      React.createElement("span", { className: "chip__n" }, parsed[k]),
      React.createElement("span", { className: "chip__l" }, labels[k]));
  });
  return React.createElement(
    "div", { className: "summary" },
    React.createElement("div", { className: "summary__file" },
      fileGlyph(),
      React.createElement("div", null,
        React.createElement("div", { className: "summary__name" }, props.fileName || "Sample data"),
        React.createElement("div", { className: "summary__meta" }, (meta.source || "").toUpperCase() + (props.loadedAt ? " · read " + props.loadedAt : "")))),
    React.createElement("div", { className: "summary__chips" }, chips)
  );
}

/* ---------- period picker (year + months that have data) ---------- */
function PeriodPicker(props) {
  var periods = props.periods || []; // [{year, months:[{ym,m,label}]}]
  var value = props.value;
  var _o = React.useState(false); var open = _o[0], setOpen = _o[1];
  var ref = React.useRef(null);

  React.useEffect(function () {
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return function () { document.removeEventListener("mousedown", onDoc); };
  }, []);

  var MO = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  function labelFor(v) {
    if (v === "all" || v == null) return "All time";
    if (/^\d{4}-\d{2}$/.test(v)) return MO[parseInt(v.slice(5, 7), 10) - 1] + " " + v.slice(0, 4);
    return "All of " + v;
  }
  function pick(v) { setOpen(false); props.onChange(v); }

  var opts = [];
  opts.push(React.createElement("button", {
    key: "all", type: "button",
    className: "periodpick__opt periodpick__opt--year" + (value === "all" ? " is-active" : ""),
    onClick: function () { pick("all"); }
  }, "All time"));
  periods.forEach(function (yr) {
    var ys = String(yr.year);
    opts.push(React.createElement("button", {
      key: ys, type: "button",
      className: "periodpick__opt periodpick__opt--year" + (value === ys ? " is-active" : ""),
      onClick: function () { pick(ys); }
    }, "All of " + ys));
    yr.months.forEach(function (mo) {
      opts.push(React.createElement("button", {
        key: mo.ym, type: "button",
        className: "periodpick__opt periodpick__opt--month" + (value === mo.ym ? " is-active" : ""),
        onClick: function () { pick(mo.ym); }
      }, mo.label + " " + ys));
    });
  });

  return React.createElement(
    "div", { className: "periodpick", ref: ref },
    React.createElement("button", {
      type: "button", className: "periodpick__btn" + (open ? " is-open" : ""),
      onClick: function () { setOpen(!open); }
    }, React.createElement("span", null, labelFor(value)), React.createElement("span", { className: "periodpick__caret" })),
    open ? React.createElement("div", { className: "periodpick__menu" }, opts) : null
  );
}
PeriodPicker.labelFor = function (v) {
  var MO = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  if (v === "all" || v == null) return "All time";
  if (/^\d{4}-\d{2}$/.test(v)) return MO[parseInt(v.slice(5, 7), 10) - 1] + " " + v.slice(0, 4);
  return v;
};

/* ---------- app ---------- */
var MNAV = [
  { id: "dashboard", label: "Dashboard" },
  { id: "revenue", label: "Revenue" },
  { id: "authorizations", label: "Contractor Authorizations" },
  { id: "investments", label: "Investments" },
  { id: "share", label: "Business Expenses" },
  { id: "draws", label: "Profit Taken" }
];
var MPAGE = {
  revenue: { title: "Revenue", sub: "One row per period. Your net profit is computed: revenue − fees − refunds − tax − commission." },
  share: { title: "Business Related Expenses", sub: "Business spending logged out of your share." },
  authorizations: { title: "Contractor Fund Authorization", sub: "Amounts authorized to contractors — reconciled against commission on the dashboard." },
  investments: { title: "Investment into Business", sub: "Money put into the business." },
  draws: { title: "Profit Taken", sub: "Personal profit taken out of the business." }
};

function MonitorApp() {
  var _d = React.useState(null); var data = _d[0], setData = _d[1];
  var _v = React.useState("dashboard"); var view = _v[0], setView = _v[1];
  var _y = React.useState("all"); var period = _y[0], setPeriod = _y[1];
  var _f = React.useState(""); var fileName = _f[0], setFileName = _f[1];
  var _t = React.useState(""); var loadedAt = _t[0], setLoadedAt = _t[1];
  var _e = React.useState(""); var error = _e[0], setError = _e[1];

  function ingest(d, name) {
    setData(d); setFileName(name || "");
    setLoadedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    setView("dashboard"); setPeriod("all"); setError("");
  }
  async function handleFile(file) {
    try {
      setError("");
      var d = await MonitorParse.parseFile(file);
      var total = ["revenue", "share", "authorizations", "investments", "draws"].reduce(function (a, k) { return a + (d[k] ? d[k].length : 0); }, 0);
      if (total === 0) { setError("Couldn’t read any rows from “" + file.name + "”. Check sheet names and headers, or try the sample to see the expected shape."); return; }
      ingest(d, file.name);
    } catch (e) {
      setError("That file couldn’t be read (" + (e.message || "unknown error") + "). It should be a .xlsx or .csv.");
    }
  }
  function loadSample() { ingest(JSON.parse(JSON.stringify(window.SAMPLE_DATA)), ""); setFileName(""); }

  if (!data) return React.createElement(DropZone, { onFile: handleFile, onSample: loadSample, error: error });

  var periods = SufahData.availablePeriods(data);
  var filtered = SufahData.filterByPeriod(data, period);
  var hasView = function (k) { return data[k] && data[k].length > 0; };
  var navItems = MNAV.filter(function (it) { return it.id === "dashboard" || hasView(it.id); });

  function renderView() {
    if (view === "dashboard") return React.createElement(Dashboard, { data: filtered });
    var meta = MPAGE[view];
    return React.createElement(React.Fragment, null,
      React.createElement(PageHead, { title: meta.title, subtitle: meta.sub }),
      React.createElement(ViewTable, { columns: VIEW_COLS[view], rows: filtered[view] || [] }));
  }

  return React.createElement(
    React.Fragment, null,
    React.createElement(
    "div", { className: "app" },
    React.createElement(
      "aside", { className: "sidebar" },
      React.createElement("div", { className: "brand" },
        React.createElement("div", { className: "brand__mark" }, monitorGlyph()),
        React.createElement("div", null,
          React.createElement("div", { className: "brand__name" }, "Finance Monitor"),
          React.createElement("div", { className: "brand__sub" }, "Read-only viewer"))),
      React.createElement("nav", { className: "nav" },
        navItems.map(function (it) {
          return React.createElement("button", {
            key: it.id, className: "nav__item" + (view === it.id ? " is-active" : ""),
            onClick: function () { setView(it.id); }
          }, React.createElement("span", { className: "nav__dot" }), React.createElement("span", { className: "nav__label" }, it.label));
        })),
      React.createElement("div", { className: "sidebar__foot" },
        React.createElement("div", { className: "yearpick" },
          React.createElement("label", { className: "yearpick__label" }, "Period"),
          React.createElement(PeriodPicker, { periods: periods, value: period, onChange: setPeriod })),
        React.createElement("div", { className: "sidebar__actions" },
          React.createElement("button", { className: "pdfbtn", onClick: function () { downloadMonitorPdf(PeriodPicker.labelFor(period)); } },
            pdfGlyph(), React.createElement("span", null, "Download PDF")),
          React.createElement("button", { className: "ghostbtn", onClick: function () { setData(null); } }, "Load another file")))
    ),
    React.createElement(
      "main", { className: "main" },
      React.createElement(SummaryStrip, { meta: data.meta, fileName: fileName, loadedAt: loadedAt, onReplace: function () { setData(null); } }),
      (data.meta && data.meta.warnings && data.meta.warnings.length)
        ? React.createElement("div", { className: "warnbar" },
            React.createElement("strong", null, "Heads up — "),
            data.meta.warnings.join(" "))
        : null,
      view === "dashboard" ? React.createElement(PageHead, { title: "Dashboard", subtitle: period === "all" ? "All periods in the file" : PeriodPicker.labelFor(period) }) : null,
      renderView()
    )
    ),
    React.createElement(PrintDoc, { data: filtered, periodLabel: PeriodPicker.labelFor(period), fileName: fileName, meta: data.meta })
  );
}

function pdfGlyph() {
  return React.createElement("svg", { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none" },
    React.createElement("path", { d: "M12 3v11m0 0l-4-4m4 4l4-4", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" }),
    React.createElement("path", { d: "M5 16.5v3h14v-3", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" }));
}

function monitorGlyph() {
  return React.createElement("svg", { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none" },
    React.createElement("rect", { x: 3, y: 4, width: 18, height: 13, rx: 1.5, stroke: "currentColor", strokeWidth: 1.5 }),
    React.createElement("path", { d: "M7 13l3-3 2.5 2L17 8", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" }),
    React.createElement("path", { d: "M9 20h6", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" }));
}

ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(MonitorApp));

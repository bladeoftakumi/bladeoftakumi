/* Finance Monitor — print / PDF document.
   Hidden on screen, shown only in print. Reuses the dark-themed
   components so the PDF matches the on-screen report exactly.
   Reflects the currently selected period and includes every ledger. */

/* A real <table> so it paginates natively and never needs a scrollbar. */
function PrintTable(props) {
  var cols = props.columns, rows = props.rows || [];
  function val(c, r) {
    if (c.compute) return React.createElement(Money, { value: c.compute(r), tone: c.tone || "sign" });
    if (c.type === "number") return React.createElement(Money, { value: SufahData.num(r[c.key]), tone: c.tone || "neutral" });
    if (c.type === "date") return React.createElement("span", { className: "pvd" }, fmtDate(r[c.key]) || "—");
    return React.createElement("span", null, r[c.key] || "—");
  }
  function total(c) {
    return rows.reduce(function (a, r) { return a + SufahData.num(c.compute ? c.compute(r) : r[c.key]); }, 0);
  }
  var numeric = function (c) { return c.type === "number" || c.compute; };
  return React.createElement(
    "table", { className: "ptable" },
    React.createElement(
      "thead", null,
      React.createElement("tr", null, cols.map(function (c) {
        return React.createElement("th", { key: c.key, className: numeric(c) ? "pright" : "" }, c.label);
      }))
    ),
    React.createElement(
      "tbody", null,
      rows.length === 0
        ? React.createElement("tr", null, React.createElement("td", { className: "pempty", colSpan: cols.length }, "No rows in this period."))
        : rows.map(function (r, i) {
            return React.createElement("tr", { key: r.id || i }, cols.map(function (c) {
              return React.createElement("td", { key: c.key, className: numeric(c) ? "pright" : "" }, val(c, r));
            }));
          })
    ),
    rows.length
      ? React.createElement("tfoot", null, React.createElement("tr", null, cols.map(function (c, i) {
          if (i === 0) return React.createElement("td", { key: c.key, className: "pfoot-label" }, "Total · " + rows.length);
          if (numeric(c)) return React.createElement("td", { key: c.key, className: "pright" }, React.createElement(Money, { value: total(c), tone: c.tone || "neutral", strong: true }));
          return React.createElement("td", { key: c.key }, "");
        })))
      : null
  );
}

function PrintSectionBand(props) {
  return React.createElement(
    "div", { className: "psec__band" },
    React.createElement("div", { className: "psec__num" }, props.num),
    React.createElement(
      "div", null,
      React.createElement("div", { className: "psec__title" }, props.title),
      props.sub ? React.createElement("div", { className: "psec__sub" }, props.sub) : null
    )
  );
}

function PrintDoc(props) {
  var data = props.data;
  var periodLabel = props.periodLabel;
  var fileName = props.fileName;

  var LEDGERS = [
    { id: "revenue", title: "Revenue", sub: MPAGE.revenue.sub },
    { id: "authorizations", title: "Contractor Fund Authorization", sub: MPAGE.authorizations.sub },
    { id: "investments", title: "Investment into Business", sub: MPAGE.investments.sub },
    { id: "share", title: "Business Related Expenses", sub: MPAGE.share.sub },
    { id: "draws", title: "Profit Taken", sub: MPAGE.draws.sub }
  ].filter(function (l) { return data[l.id] && data[l.id].length > 0; });

  var now = new Date();
  var stamp = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) +
    " · " + now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  var secNum = 0;
  function nn() { secNum += 1; return secNum < 10 ? "0" + secNum : String(secNum); }

  return React.createElement(
    "div", { className: "printroot" },

    /* ---- cover ---- */
    React.createElement(
      "section", { className: "pcover" },
      React.createElement(
        "div", { className: "pcover__top" },
        React.createElement("div", { className: "pcover__mark" }, monitorGlyph()),
        React.createElement("div", { className: "pcover__brand" }, "Finance Monitor")
      ),
      React.createElement(
        "div", { className: "pcover__mid" },
        React.createElement("div", { className: "pcover__kicker" }, "Financial Report"),
        React.createElement("h1", { className: "pcover__title" }, periodLabel),
        React.createElement(
          "div", { className: "pcover__chips" },
          ["revenue", "authorizations", "investments", "share", "draws"]
            .filter(function (k) { return data[k] && data[k].length; })
            .map(function (k) {
              var lbl = { revenue: "Revenue", authorizations: "Authorizations", investments: "Investments", share: "Expenses", draws: "Profit taken" }[k];
              return React.createElement("span", { className: "pcover__chip", key: k },
                React.createElement("span", { className: "pcover__chipn" }, data[k].length),
                " ", lbl);
            })
        )
      ),
      React.createElement(
        "div", { className: "pcover__foot" },
        React.createElement("div", null,
          React.createElement("div", { className: "pcover__flabel" }, "Source"),
          React.createElement("div", { className: "pcover__fval" }, fileName || "Sample data")),
        React.createElement("div", null,
          React.createElement("div", { className: "pcover__flabel" }, "Generated"),
          React.createElement("div", { className: "pcover__fval" }, stamp))
      )
    ),

    /* ---- dashboard ---- */
    React.createElement(
      "section", { className: "psec" },
      React.createElement(PrintSectionBand, { num: nn(), title: "Dashboard", sub: periodLabel }),
      React.createElement(Dashboard, { data: data })
    ),

    /* ---- ledgers ---- */
    LEDGERS.map(function (l) {
      return React.createElement(
        "section", { className: "psec", key: l.id },
        React.createElement(PrintSectionBand, { num: nn(), title: l.title, sub: l.sub }),
        React.createElement("div", { className: "pbox" },
          React.createElement(PrintTable, { columns: VIEW_COLS[l.id], rows: data[l.id] || [] }))
      );
    }),

    React.createElement("div", { className: "pend" }, "End of report · ", periodLabel)
  );
}

window.PrintDoc = PrintDoc;

/* Trigger: name the PDF for the period, then open the print dialog. */
function downloadMonitorPdf(periodLabel) {
  var prev = document.title;
  document.title = "Finance Monitor — " + (periodLabel || "Report");
  function restore() { document.title = prev; window.removeEventListener("afterprint", restore); }
  window.addEventListener("afterprint", restore);
  window.print();
}
window.downloadMonitorPdf = downloadMonitorPdf;

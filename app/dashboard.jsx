/* Sufah LLC Finances — dashboard */

function Dashboard(props) {
  var d = props.data; // already year-filtered
  var m = SufahData.metrics(d);

  // monthly net-profit series from revenue
  var series = d.revenue.map(function (r) {
    var lbl = "";
    if (r.start) {
      var mo = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      var parts = r.start.split("-");
      lbl = mo[parseInt(parts[1], 10) - 1] + " ’" + parts[0].slice(2);
    }
    return { label: lbl, value: SufahData.rowNetProfit(r) };
  });

  var authPct = m.commission > 0 ? Math.min(100, Math.round((m.authorized / m.commission) * 100)) : 0;
  var inSync = Math.abs(m.authGap) < 0.01;

  return React.createElement(
    "div",
    { className: "dash" },
    // hero — your pool
    React.createElement(
      "section",
      { className: "hero" },
      React.createElement(
        "div",
        { className: "hero__main" },
        React.createElement("div", { className: "hero__label" }, "Profit available"),
        React.createElement(
          "div",
          { className: "hero__number" + (m.available < 0 ? " is-neg" : "") },
          fmtMoney(m.available)
        ),
        React.createElement(
          "div",
          { className: "hero__formula" },
          React.createElement("span", null, fmtMoney(m.shareEarned) + " net profit"),
          React.createElement("span", { className: "hero__op" }, "−"),
          React.createElement("span", null, fmtMoney(m.shareSpent) + " expenses"),
          m.draws > 0 ? React.createElement("span", { className: "hero__op" }, "−") : null,
          m.draws > 0 ? React.createElement("span", null, fmtMoney(m.draws) + " profit taken") : null
        )
      ),
      React.createElement(
        "div",
        { className: "hero__side" },
        React.createElement(Stat, { label: "Net profit earned", value: m.shareEarned, tone: "positive" }),
        React.createElement(Stat, { label: "Business expenses", value: m.shareSpent, tone: "negative" }),
        React.createElement(Stat, { label: "Profit taken", value: m.draws, tone: "negative" })
      )
    ),
    // contractor authorization — promoted spotlight (large), above the trend
    React.createElement(
      "section",
      { className: "spotlight" },
      React.createElement(
        "div",
        { className: "spotlight__main" },
        React.createElement(
          "div",
          { className: "spotlight__head" },
          React.createElement("div", { className: "spotlight__label" }, "Contractor authorizations"),
          React.createElement(
            "div",
            { className: "tag " + (inSync ? "tag--ok" : "tag--warn") },
            inSync ? "In sync" : (m.authGap > 0 ? "Under-authorized" : "Over-authorized")
          )
        ),
        React.createElement(
          "div",
          { className: "spotlight__number" },
          fmtMoney(m.authorized)
        ),
        React.createElement(
          "div",
          { className: "spotlight__sub" },
          "authorized of ", React.createElement("span", { className: "spotlight__sub-fig" }, fmtMoney(m.commission)), " commission owed"
        )
      ),
      React.createElement(
        "div",
        { className: "spotlight__side" },
        React.createElement(
          "div",
          { className: "recon" },
          React.createElement(
            "div",
            { className: "recon__row" },
            React.createElement("span", null, "Commission owed"),
            React.createElement(Money, { value: m.commission, tone: "neutral", strong: true })
          ),
          React.createElement(
            "div",
            { className: "recon__row" },
            React.createElement("span", null, "Authorized to contractors"),
            React.createElement(Money, { value: m.authorized, tone: "neutral", strong: true })
          ),
          React.createElement(
            "div",
            { className: "recon__bar" },
            React.createElement("div", { className: "recon__fill", style: { width: authPct + "%" } }),
            React.createElement("span", { className: "recon__pct" }, authPct + "% authorized")
          ),
          React.createElement(
            "div",
            { className: "recon__row recon__row--total" },
            React.createElement("span", null, m.authGap >= 0 ? "Still to authorize" : "Authorized beyond commission"),
            React.createElement(Money, { value: Math.abs(m.authGap), tone: m.authGap > 0 ? "negative" : "positive", strong: true })
          )
        )
      )
    ),
    // revenue waterfall — full width, above the trend
    React.createElement(
      "section",
      { className: "panel" },
      React.createElement(
        "div",
        { className: "panel__head" },
        React.createElement("h2", { className: "panel__title" }, "Where revenue goes")
      ),
      React.createElement(
        "div",
        { className: "flow" },
        flowRow("Net revenue", m.grossRevenue, "neutral", 100, m.grossRevenue),
        flowRow("Stripe fees", -m.stripe, "negative", pct(m.stripe, m.grossRevenue), m.grossRevenue),
        flowRow("Refunds & disputes", -m.refunds, "negative", pct(m.refunds, m.grossRevenue), m.grossRevenue),
        flowRow("Tax collected", -m.tax, "negative", pct(m.tax, m.grossRevenue), m.grossRevenue),
        flowRow("Contractor commission", -m.commission, "negative", pct(m.commission, m.grossRevenue), m.grossRevenue),
        flowRow("Net profit", m.shareEarned, "positive", pct(m.shareEarned, m.grossRevenue), m.grossRevenue, true)
      )
    ),
    // profit trend — at the bottom
    React.createElement(
      "section",
      { className: "panel" },
      React.createElement(
        "div",
        { className: "panel__head" },
        React.createElement("h2", { className: "panel__title" }, "Net profit by period"),
        React.createElement("div", { className: "panel__meta" }, series.length + " periods")
      ),
      series.length
        ? React.createElement(BarChart, { data: series })
        : React.createElement("div", { className: "panel__empty" }, "Add revenue periods to see your trend.")
    )
  );

  function pct(part, whole) { return whole > 0 ? Math.round((part / whole) * 100) : 0; }

  function flowRow(label, value, tone, widthPct, whole, isTotal) {
    return React.createElement(
      "div",
      { className: "flow__row" + (isTotal ? " flow__row--total" : ""), key: label },
      React.createElement("div", { className: "flow__label" }, label),
      React.createElement(
        "div",
        { className: "flow__track" },
        React.createElement("div", {
          className: "flow__bar flow__bar--" + tone,
          style: { width: Math.max(2, widthPct) + "%" }
        })
      ),
      React.createElement(
        "div",
        { className: "flow__val" },
        React.createElement(Money, { value: value, tone: tone === "neutral" ? "neutral" : tone })
      )
    );
  }
}

window.Dashboard = Dashboard;

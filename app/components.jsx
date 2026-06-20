/* Sufah LLC Finances — shared UI components */

function fmtMoney(v, opts) {
  opts = opts || {};
  var n = typeof v === "number" ? v : parseFloat(v);
  if (!isFinite(n)) n = 0;
  var neg = n < 0;
  var s = Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: opts.cents === false ? 0 : 2,
    maximumFractionDigits: 2
  });
  var out = "$" + s;
  return neg ? "−" + out : out;
}

function fmtDate(v) {
  if (!v) return "";
  var parts = String(v).split("-");
  if (parts.length !== 3) return v;
  var mo = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var m = parseInt(parts[1], 10);
  return mo[m - 1] + " " + parseInt(parts[2], 10) + ", " + parts[0];
}

/* Money value, colored by sign or role */
function Money(props) {
  var n = typeof props.value === "number" ? props.value : parseFloat(props.value) || 0;
  var cls = "money";
  if (props.tone === "positive" || (props.tone === "sign" && n > 0)) cls += " money--pos";
  if (props.tone === "negative" || (props.tone === "sign" && n < 0)) cls += " money--neg";
  if (props.strong) cls += " money--strong";
  if (props.big) cls += " money--big";
  return React.createElement("span", { className: cls }, fmtMoney(n, { cents: props.cents }));
}

/* Editable cell — borderless input that looks like a spreadsheet cell */
function Cell(props) {
  var type = props.type || "text";
  var align = props.align || (type === "number" ? "right" : "left");
  var common = {
    className: "cell cell--" + align + (props.muted ? " cell--muted" : ""),
    value: props.value == null ? "" : props.value,
    placeholder: props.placeholder || "",
    onChange: function (e) { props.onChange(e.target.value); },
    spellCheck: false
  };
  if (type === "number") {
    return React.createElement("input", Object.assign({}, common, {
      type: "text",
      inputMode: "decimal",
      onChange: function (e) {
        var val = e.target.value.replace(/[^0-9.\-]/g, "");
        props.onChange(val);
      }
    }));
  }
  if (type === "date") {
    return React.createElement("input", Object.assign({}, common, { type: "date" }));
  }
  return React.createElement("input", common);
}

/* A read-only computed cell (e.g. net profit) */
function ComputedCell(props) {
  return React.createElement(
    "div",
    { className: "cell cell--computed cell--right" },
    React.createElement(Money, { value: props.value, tone: props.tone || "sign" })
  );
}

/* Delete button shown on row hover */
function RowDelete(props) {
  return React.createElement(
    "button",
    { className: "rowdel", title: "Delete row", onClick: props.onClick },
    "×"
  );
}

/* Simple monthly bar chart (CSS bars, no SVG) */
function BarChart(props) {
  var data = props.data || []; // [{label, value}]
  var max = Math.max.apply(null, data.map(function (d) { return Math.abs(d.value); }).concat([1]));
  return React.createElement(
    "div",
    { className: "barchart" },
    data.map(function (d, i) {
      var h = Math.max(2, Math.round((Math.abs(d.value) / max) * 100));
      var tone = d.value < 0 ? "neg" : "pos";
      return React.createElement(
        "div",
        { className: "barchart__col", key: i },
        React.createElement(
          "div",
          { className: "barchart__track" },
          React.createElement("div", {
            className: "barchart__bar barchart__bar--" + tone,
            style: { height: h + "%" },
            title: fmtMoney(d.value)
          })
        ),
        React.createElement("div", { className: "barchart__val" }, fmtMoney(d.value, { cents: false })),
        React.createElement("div", { className: "barchart__lbl" }, d.label)
      );
    })
  );
}

/* Stat block */
function Stat(props) {
  return React.createElement(
    "div",
    { className: "stat" + (props.accent ? " stat--accent" : "") },
    React.createElement("div", { className: "stat__label" }, props.label),
    React.createElement(
      "div",
      { className: "stat__value" },
      typeof props.value === "number"
        ? React.createElement(Money, { value: props.value, tone: props.tone, cents: props.cents })
        : props.value
    ),
    props.sub ? React.createElement("div", { className: "stat__sub" }, props.sub) : null
  );
}

/* Sidebar nav */
function Sidebar(props) {
  var items = props.items;
  return React.createElement(
    "aside",
    { className: "sidebar" },
    React.createElement(
      "div",
      { className: "brand" },
      React.createElement("div", { className: "brand__mark" }, "S"),
      React.createElement(
        "div",
        null,
        React.createElement("div", { className: "brand__name" }, "Sufah LLC"),
        React.createElement("div", { className: "brand__sub" }, "Private ledger")
      )
    ),
    React.createElement(
      "nav",
      { className: "nav" },
      items.map(function (it) {
        return React.createElement(
          "button",
          {
            key: it.id,
            className: "nav__item" + (props.active === it.id ? " is-active" : ""),
            onClick: function () { props.onSelect(it.id); }
          },
          React.createElement("span", { className: "nav__dot" }),
          React.createElement("span", { className: "nav__label" }, it.label)
        );
      })
    ),
    React.createElement(
      "div",
      { className: "sidebar__foot" },
      React.createElement(
        "div",
        { className: "yearpick" },
        React.createElement("label", { className: "yearpick__label" }, "Book year"),
        React.createElement(
          "select",
          {
            className: "yearpick__select",
            value: props.year,
            onChange: function (e) { props.onYear(e.target.value); }
          },
          [React.createElement("option", { key: "all", value: "all" }, "All time")].concat(
            props.years.map(function (y) {
              return React.createElement("option", { key: y, value: String(y) }, String(y));
            })
          )
        )
      ),
      React.createElement(
        "div",
        { className: "sidebar__actions" },
        React.createElement("button", { className: "ghostbtn", onClick: props.onExport }, "Export backup"),
        React.createElement("button", { className: "ghostbtn", onClick: props.onImport }, "Import"),
        React.createElement("button", { className: "ghostbtn ghostbtn--csv", onClick: props.onCsv }, "Export CSV")
      )
    )
  );
}

/* Page header */
function PageHead(props) {
  return React.createElement(
    "header",
    { className: "pagehead" },
    React.createElement(
      "div",
      null,
      React.createElement("h1", { className: "pagehead__title" }, props.title),
      props.subtitle ? React.createElement("p", { className: "pagehead__sub" }, props.subtitle) : null
    ),
    props.right || null
  );
}

Object.assign(window, {
  fmtMoney: fmtMoney,
  fmtDate: fmtDate,
  Money: Money,
  Cell: Cell,
  ComputedCell: ComputedCell,
  RowDelete: RowDelete,
  BarChart: BarChart,
  Stat: Stat,
  Sidebar: Sidebar,
  PageHead: PageHead
});

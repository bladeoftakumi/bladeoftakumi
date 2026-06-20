/* Finance Monitor — compute + file parsing. Read-only; stores nothing. */
(function () {
  "use strict";

  function num(v) {
    if (typeof v === "number") return isFinite(v) ? v : 0;
    if (v == null) return 0;
    var n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
    return isFinite(n) ? n : 0;
  }
  function sum(arr, f) { return arr.reduce(function (a, x) { return a + num(f(x)); }, 0); }
  function rowNetProfit(r) {
    return num(r.netRevenue) - num(r.stripe) - num(r.refunds) - num(r.tax) - num(r.commission);
  }
  function yearOf(d) {
    if (!d) return null;
    var y = String(d).slice(0, 4);
    return /^\d{4}$/.test(y) ? parseInt(y, 10) : null;
  }
  function filterByYear(data, year) {
    if (year === "all" || year == null) return data;
    var y = parseInt(year, 10);
    function fy(rows, key) { return rows.filter(function (r) { return yearOf(r[key]) === y; }); }
    return {
      revenue: fy(data.revenue, "start"),
      share: fy(data.share, "date"),
      authorizations: fy(data.authorizations, "date"),
      investments: fy(data.investments, "date"),
      draws: fy(data.draws, "date"),
      meta: data.meta
    };
  }
  function availableYears(data) {
    var ys = {};
    data.revenue.forEach(function (r) { var y = yearOf(r.start); if (y) ys[y] = 1; });
    ["share", "authorizations", "investments", "draws"].forEach(function (k) {
      (data[k] || []).forEach(function (r) { var y = yearOf(r.date); if (y) ys[y] = 1; });
    });
    return Object.keys(ys).map(Number).sort();
  }
  function ymOf(d) {
    if (!d) return null;
    var s = String(d).slice(0, 7);
    return /^\d{4}-\d{2}$/.test(s) ? s : null;
  }
  function availablePeriods(data) {
    var MO = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    var set = {};
    data.revenue.forEach(function (r) { var k = ymOf(r.start); if (k) set[k] = 1; });
    ["share", "authorizations", "investments", "draws"].forEach(function (key) {
      (data[key] || []).forEach(function (r) { var k = ymOf(r.date); if (k) set[k] = 1; });
    });
    var byYear = {};
    Object.keys(set).forEach(function (ym) {
      var y = ym.slice(0, 4), m = parseInt(ym.slice(5, 7), 10);
      (byYear[y] = byYear[y] || []).push({ ym: ym, m: m, label: MO[m - 1] });
    });
    return Object.keys(byYear).sort().map(function (y) {
      return { year: parseInt(y, 10), months: byYear[y].sort(function (a, b) { return a.m - b.m; }) };
    });
  }
  function filterByPeriod(data, period) {
    if (period === "all" || period == null) return data;
    var isMonth = /^\d{4}-\d{2}$/.test(period);
    var isYear = /^\d{4}$/.test(period);
    function match(dateStr) {
      if (isMonth) return ymOf(dateStr) === period;
      if (isYear) return yearOf(dateStr) === parseInt(period, 10);
      return true;
    }
    function fy(rows, key) { return (rows || []).filter(function (r) { return match(r[key]); }); }
    return {
      revenue: fy(data.revenue, "start"),
      share: fy(data.share, "date"),
      authorizations: fy(data.authorizations, "date"),
      investments: fy(data.investments, "date"),
      draws: fy(data.draws, "date"),
      meta: data.meta
    };
  }
  function metrics(d) {
    var shareEarned = sum(d.revenue, rowNetProfit);
    var shareSpent = sum(d.share, function (r) { return r.amount; });
    var draws = sum(d.draws, function (r) { return r.amount; });
    var invested = sum(d.investments, function (r) { return r.amount; });
    var commission = sum(d.revenue, function (r) { return r.commission; });
    var authorized = sum(d.authorizations, function (r) { return r.amount; });
    var grossRevenue = sum(d.revenue, function (r) { return r.netRevenue; });
    var stripe = sum(d.revenue, function (r) { return r.stripe; });
    var refunds = sum(d.revenue, function (r) { return r.refunds; });
    var tax = sum(d.revenue, function (r) { return r.tax; });
    return {
      shareEarned: shareEarned, shareSpent: shareSpent, draws: draws, invested: invested,
      available: shareEarned - shareSpent - draws,
      commission: commission, authorized: authorized, authGap: commission - authorized,
      grossRevenue: grossRevenue, stripe: stripe, refunds: refunds, tax: tax
    };
  }

  // ---------- header / sheet matching ----------
  function norm(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, ""); }

  var SHEET_MATCHERS = [
    { key: "revenue", test: function (n) { return n.indexOf("revenue") >= 0 || n.indexOf("income") >= 0; } },
    { key: "share", test: function (n) { return n.indexOf("expense") >= 0 || n.indexOf("share") >= 0 || n.indexOf("hz") >= 0 || n.indexOf("spent") >= 0; } },
    { key: "authorizations", test: function (n) { return n.indexOf("auth") >= 0 || n.indexOf("contractorfund") >= 0; } },
    { key: "investments", test: function (n) { return n.indexOf("invest") >= 0; } },
    { key: "draws", test: function (n) { return n.indexOf("draw") >= 0 || n.indexOf("profittaken") >= 0 || n.indexOf("profit") >= 0; } }
  ];
  function classifySheet(name) {
    var n = norm(name);
    for (var i = 0; i < SHEET_MATCHERS.length; i++) if (SHEET_MATCHERS[i].test(n)) return SHEET_MATCHERS[i].key;
    return null;
  }

  // column synonyms per ledger -> internal key
  var COLS = {
    revenue: {
      start: ["periodstart", "datestart", "start", "from", "begin"],
      end: ["periodend", "dateend", "end", "to"],
      netRevenue: ["netrevenue", "revenue", "gross", "grossrevenue", "income"],
      stripe: ["stripefees", "stripe", "stripefeeandexpenses", "fees", "processingfees"],
      refunds: ["refunds", "refundsdisputes", "refundsdisputesandfees", "disputes", "chargebacks"],
      tax: ["tax", "taxcollected", "salestax"],
      commission: ["commission", "contractorcommission", "commissionforcontractors", "contractors"]
    },
    share: {
      date: ["date", "datespent", "when"],
      reason: ["reason", "note", "notes", "description", "for", "category", "memo"],
      amount: ["amount", "amountspent", "spent", "value", "total"]
    },
    authorizations: {
      date: ["dateauthorized", "date", "when"],
      amount: ["amountauthorized", "amount", "authorized", "value"]
    },
    investments: {
      date: ["date", "when"],
      amount: ["amountin", "amount", "invested", "value"]
    },
    draws: {
      date: ["dateauthorized", "date", "when"],
      note: ["reason", "note", "notes", "description"],
      amount: ["amounttaken", "amount", "drawn", "value"]
    }
  };

  function mapHeaders(headerRow, spec) {
    var normed = headerRow.map(norm);
    var map = {}; // internalKey -> columnIndex
    Object.keys(spec).forEach(function (internal) {
      var syns = spec[internal];
      for (var i = 0; i < normed.length; i++) {
        if (syns.indexOf(normed[i]) >= 0) { map[internal] = i; return; }
      }
      // fallback: partial contains
      for (var j = 0; j < normed.length; j++) {
        for (var k = 0; k < syns.length; k++) {
          if (normed[j] && (normed[j].indexOf(syns[k]) >= 0 || syns[k].indexOf(normed[j]) >= 0)) { map[internal] = j; return; }
        }
      }
    });
    return map;
  }

  function rowsFromGrid(grid, ledgerKey) {
    // grid = array of rows (arrays of cell values). Find header row = first row with >=2 non-empty cells.
    if (!grid || !grid.length) return { rows: [], missing: ["empty"] };
    var spec = COLS[ledgerKey];
    var headerIdx = -1;
    for (var i = 0; i < grid.length; i++) {
      var nonEmpty = grid[i].filter(function (c) { return String(c == null ? "" : c).trim() !== ""; });
      if (nonEmpty.length >= 2) { headerIdx = i; break; }
    }
    if (headerIdx < 0) return { rows: [], missing: ["no-header"] };
    var map = mapHeaders(grid[headerIdx], spec);
    var missing = Object.keys(spec).filter(function (k) { return !(k in map); });
    var out = [];
    for (var r = headerIdx + 1; r < grid.length; r++) {
      var row = grid[r];
      if (!row || row.every(function (c) { return String(c == null ? "" : c).trim() === ""; })) continue;
      var obj = { id: "r" + r + "_" + Math.random().toString(36).slice(2, 6) };
      Object.keys(map).forEach(function (internal) {
        var v = row[map[internal]];
        obj[internal] = v == null ? "" : v;
      });
      // skip rows that look like totals
      var firstText = norm(obj.start || obj.date || obj.reason || obj.note || "");
      if (firstText === "total" || firstText === "totals") continue;
      out.push(obj);
    }
    return { rows: out, missing: missing };
  }

  // ---------- XLSX ----------
  async function inflateRaw(bytes) {
    var ds = new DecompressionStream("deflate-raw");
    var writer = ds.writable.getWriter();
    writer.write(bytes); writer.close();
    var reader = ds.readable.getReader();
    var chunks = [], total = 0;
    while (true) { var x = await reader.read(); if (x.done) break; chunks.push(x.value); total += x.value.length; }
    var out = new Uint8Array(total), o = 0;
    chunks.forEach(function (c) { out.set(c, o); o += c.length; });
    return out;
  }

  async function unzip(buf) {
    var dv = new DataView(buf.buffer || buf);
    var u16 = function (o) { return dv.getUint16(o, true); };
    var u32 = function (o) { return dv.getUint32(o, true); };
    var eocd = -1;
    for (var i = buf.length - 22; i >= 0; i--) { if (u32(i) === 0x06054b50) { eocd = i; break; } }
    if (eocd < 0) throw new Error("Not a valid .xlsx (no zip directory)");
    var count = u16(eocd + 10), off = u32(eocd + 16), p = off;
    var entries = [];
    for (var c = 0; c < count; c++) {
      var method = u16(p + 10), cSize = u32(p + 20), nLen = u16(p + 28), xLen = u16(p + 30), cLen = u16(p + 32), lho = u32(p + 42);
      var name = new TextDecoder().decode(buf.slice(p + 46, p + 46 + nLen));
      entries.push({ name: name, method: method, cSize: cSize, lho: lho });
      p += 46 + nLen + xLen + cLen;
    }
    var files = {}, dec = new TextDecoder();
    for (var e = 0; e < entries.length; e++) {
      var en = entries[e], lp = en.lho;
      var nl = u16(lp + 26), xl = u16(lp + 28), start = lp + 30 + nl + xl;
      var raw = buf.slice(start, start + en.cSize);
      var data = en.method === 0 ? raw : await inflateRaw(raw);
      if (en.name.indexOf("sheet") >= 0 || en.name.indexOf("Strings") >= 0 || en.name.indexOf("workbook") >= 0)
        files[en.name] = dec.decode(data);
    }
    return files;
  }

  function colToNum(col) { var n = 0; for (var i = 0; i < col.length; i++) n = n * 26 + (col.charCodeAt(i) - 64); return n; }

  function parseSharedStrings(xml) {
    var out = [];
    if (!xml) return out;
    var m = xml.match(/<si>[\s\S]*?<\/si>/g) || [];
    m.forEach(function (si) {
      var txt = "";
      var ts = si.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || [];
      ts.forEach(function (t) { txt += t.replace(/<[^>]+>/g, ""); });
      txt = txt.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#10;/g, "\n").replace(/&#39;/g, "'");
      out.push(txt);
    });
    return out;
  }

  function sheetToGrid(xml, strings) {
    var grid = [];
    var rowMatches = xml.match(/<row[^>]*r="\d+"[^>]*>[\s\S]*?<\/row>|<row[^>]*\/>/g) || [];
    rowMatches.forEach(function (rowXml) {
      var rn = parseInt((rowXml.match(/r="(\d+)"/) || [])[1], 10);
      if (!rn) return;
      var cells = [];
      var cellRe = /<c r="([A-Z]+)(\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g, cm;
      while ((cm = cellRe.exec(rowXml))) {
        var col = colToNum(cm[1]);
        var attrs = cm[3] || "", inner = cm[4] || "";
        var t = (attrs.match(/t="([^"]*)"/) || [])[1] || "n";
        var vM = inner.match(/<v>([\s\S]*?)<\/v>/);
        var isM = inner.match(/<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>/);
        var val = "";
        if (isM) val = isM[1];
        else if (vM) {
          val = vM[1];
          if (t === "s") val = strings[parseInt(val, 10)] || "";
          else if (t !== "str") {
            var f = parseFloat(val);
            // Excel date serials handled later by views; keep raw number
            val = isFinite(f) ? f : val;
          } else {
            val = val.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
          }
        }
        cells[col - 1] = val;
      }
      grid[rn - 1] = cells;
    });
    // compact: remove undefined holes by filling
    var maxLen = grid.reduce(function (a, r) { return Math.max(a, r ? r.length : 0); }, 0);
    return grid.filter(function (r) { return r; }).map(function (r) {
      var full = [];
      for (var i = 0; i < maxLen; i++) full[i] = r[i] == null ? "" : r[i];
      return full;
    });
  }

  function excelSerialToISO(n) {
    if (typeof n !== "number" || n < 20000 || n > 80000) return n;
    var ms = Date.UTC(1899, 11, 30) + Math.round(n) * 86400000;
    return new Date(ms).toISOString().slice(0, 10);
  }
  function normalizeDates(rows, keys) {
    rows.forEach(function (r) { keys.forEach(function (k) { if (k in r) r[k] = excelSerialToISO(r[k]); }); });
  }

  async function parseXlsx(buf) {
    var files = await unzip(buf);
    var wb = files["xl/workbook.xml"] || "";
    var rels = files["xl/_rels/workbook.xml.rels"] || "";
    // sheet name -> rId
    var sheets = [];
    var sm = wb.match(/<sheet[^>]*\/>/g) || wb.match(/<sheet[^>]*>/g) || [];
    sm.forEach(function (s) {
      var name = (s.match(/name="([^"]*)"/) || [])[1];
      var rid = (s.match(/r:id="([^"]*)"/) || [])[1];
      if (name) sheets.push({ name: name, rid: rid });
    });
    // rId -> target file
    var relMap = {};
    (rels.match(/<Relationship[^>]*>/g) || []).forEach(function (r) {
      var id = (r.match(/Id="([^"]*)"/) || [])[1];
      var tgt = (r.match(/Target="([^"]*)"/) || [])[1];
      if (id && tgt) relMap[id] = tgt.replace(/^\//, "").replace(/^xl\//, "");
    });
    var strings = parseSharedStrings(files["xl/sharedStrings.xml"]);

    var data = emptyData();
    var parsed = {}, warnings = [], foundAny = false;
    sheets.forEach(function (sh) {
      var key = classifySheet(sh.name);
      if (!key) { warnings.push("Sheet \u201C" + sh.name + "\u201D wasn\u2019t recognized \u2014 skipped."); return; }
      var target = relMap[sh.rid];
      var path = target ? ("xl/" + target) : null;
      var xml = path && files[path];
      if (!xml) { // fallback: guess sheetN by order
        return;
      }
      var grid = sheetToGrid(xml, strings);
      var res = rowsFromGrid(grid, key);
      if (key === "revenue") normalizeDates(res.rows, ["start", "end"]);
      else normalizeDates(res.rows, ["date"]);
      data[key] = res.rows;
      parsed[key] = res.rows.length;
      foundAny = foundAny || res.rows.length > 0;
      if (res.missing && res.missing.length && res.rows.length)
        warnings.push("In \u201C" + sh.name + "\u201D, couldn\u2019t find column(s): " + res.missing.join(", ") + ".");
    });
    if (!foundAny) warnings.push("No recognizable rows found. Check the sheet names and headers.");
    data.meta = { parsed: parsed, warnings: warnings, source: "xlsx" };
    return data;
  }

  // ---------- CSV (single ledger or sectioned) ----------
  function splitCSVLine(line) {
    var out = [], cur = "", q = false;
    for (var i = 0; i < line.length; i++) {
      var c = line[i];
      if (q) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') q = false;
        else cur += c;
      } else {
        if (c === '"') q = true;
        else if (c === ",") { out.push(cur); cur = ""; }
        else cur += c;
      }
    }
    out.push(cur);
    return out;
  }
  function parseCsv(text) {
    var lines = text.replace(/\r\n/g, "\n").split("\n");
    var grid = lines.map(splitCSVLine);
    // Detect ledger by scanning header
    var data = emptyData(), parsed = {}, warnings = [];
    // Sectioned CSV: lines that are a single recognized ledger title
    var sections = [], current = null;
    grid.forEach(function (row) {
      var nonEmpty = row.filter(function (c) { return String(c).trim() !== ""; });
      if (nonEmpty.length === 1) {
        var k = classifySheet(nonEmpty[0]);
        if (k) { current = { key: k, rows: [] }; sections.push(current); return; }
      }
      if (current) current.rows.push(row);
    });
    if (sections.length) {
      sections.forEach(function (sec) {
        var res = rowsFromGrid(sec.rows, sec.key);
        if (sec.key === "revenue") normalizeDates(res.rows, ["start", "end"]); else normalizeDates(res.rows, ["date"]);
        data[sec.key] = res.rows; parsed[sec.key] = res.rows.length;
      });
    } else {
      // single ledger: classify by headers
      var headerRow = grid.find(function (r) { return r.filter(function (c) { return String(c).trim() !== ""; }).length >= 2; }) || [];
      var hn = headerRow.map(norm).join(" ");
      var key = "share";
      if (hn.indexOf("revenue") >= 0 || hn.indexOf("commission") >= 0 || hn.indexOf("stripe") >= 0) key = "revenue";
      else if (hn.indexOf("auth") >= 0) key = "authorizations";
      else if (hn.indexOf("invest") >= 0) key = "investments";
      else if (hn.indexOf("draw") >= 0) key = "draws";
      var res = rowsFromGrid(grid, key);
      if (key === "revenue") normalizeDates(res.rows, ["start", "end"]); else normalizeDates(res.rows, ["date"]);
      data[key] = res.rows; parsed[key] = res.rows.length;
      if (res.missing.length) warnings.push("Couldn\u2019t find column(s): " + res.missing.join(", ") + ".");
    }
    data.meta = { parsed: parsed, warnings: warnings, source: "csv" };
    return data;
  }

  function emptyData() {
    return { revenue: [], share: [], authorizations: [], investments: [], draws: [], meta: { parsed: {}, warnings: [] } };
  }

  async function parseFile(file) {
    var name = (file.name || "").toLowerCase();
    if (name.endsWith(".csv")) {
      var text = await file.text();
      return parseCsv(text);
    }
    // xlsx
    var buf = new Uint8Array(await file.arrayBuffer());
    if (buf[0] === 0x50 && buf[1] === 0x4b) return await parseXlsx(buf);
    // fallback try csv
    return parseCsv(new TextDecoder().decode(buf));
  }

  window.SufahData = {
    num: num, sum: sum, rowNetProfit: rowNetProfit, metrics: metrics,
    filterByYear: filterByYear, availableYears: availableYears, yearOf: yearOf,
    filterByPeriod: filterByPeriod, availablePeriods: availablePeriods, ymOf: ymOf
  };
  window.MonitorParse = { parseFile: parseFile, parseCsv: parseCsv, parseXlsx: parseXlsx, emptyData: emptyData };
})();

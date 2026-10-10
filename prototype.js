/* ============================================================
   Prototype — idea folders → free-canvas whiteboards
   Top level: "ideas" (folders). Open one → its own pannable,
   zoomable whiteboard of notes (title / date / notes / #tags /
   image / file). Cloud-synced to Firestore prototype/{uid};
   uploads to Storage prototype-files/{uid}/. Owner-only.
   AI chat stubbed (keys can be saved for later).
   ============================================================ */
(function () {
  "use strict";

  var owner = null, db = null, saveTimer = null;
  /* state.ideas: [{id,name,created,updated}]; state.boards: { ideaId: {cards:[], view:{}} } */
  var state = { ideas: [], boards: {} };
  var currentIdeaId = null;      // null → ideas grid; else → that board
  var board = null;              // shortcut to state.boards[currentIdeaId]
  var nextZ = 1;

  var $ = function (id) { return document.getElementById(id); };
  var stage = $("stage"), canvas = $("canvas"), savedEl = $("tl-saved"), ideasEl = $("ideas");

  /* ---------------- helpers ---------------- */
  function uid(p) { return (p || "x") + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function todayISO() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function relTime(ts) {
    if (!ts) return "just now";
    var s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return "just now";
    var m = Math.floor(s / 60); if (m < 60) return m + "m ago";
    var h = Math.floor(m / 60); if (h < 24) return h + "h ago";
    var d = Math.floor(h / 24); if (d < 7) return d + "d ago";
    return new Date(ts).toLocaleDateString();
  }
  function extractTags(html) {
    var text = String(html || "").replace(/<[^>]+>/g, " ");
    var out = [], seen = {}, m, re = /#([a-z0-9][a-z0-9_-]*)/gi;
    while ((m = re.exec(text))) { var t = m[1].toLowerCase(); if (!seen[t]) { seen[t] = 1; out.push(t); } }
    return out;
  }
  function ideaById(id) { return state.ideas.find(function (i) { return i.id === id; }); }
  function cardById(id) { return board && board.cards.find(function (c) { return c.id === id; }); }
  function touchIdea() { var i = ideaById(currentIdeaId); if (i) i.updated = Date.now(); }

  /* ---------------- persistence (whole state) ---------------- */
  function setSaved(t) { if (savedEl) savedEl.textContent = t; }
  function scheduleSave() {
    if (board) { board.view = { x: view.x, y: view.y, z: view.z }; }
    try { localStorage.setItem("botakumi-prototype-v1", JSON.stringify(state)); } catch (e) {}
    if (!owner || !db) { setSaved("Saved locally"); return; }
    setSaved("Saving…");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(pushCloud, 600);
  }
  function pushCloud() {
    if (!owner || !db) return;
    db.collection("prototype").doc(owner.uid).set({ ideas: state.ideas, boards: state.boards, updated: Date.now() })
      .then(function () { setSaved("Saved to cloud"); })
      .catch(function (e) { setSaved(e && e.code === "permission-denied" ? "Cloud blocked — add rule" : "Saved locally"); });
  }

  /* ---------------- mode switching ---------------- */
  function setMode(mode) {
    var boardMode = mode === "board";
    stage.hidden = !boardMode;
    ideasEl.hidden = boardMode;
    $("back-ideas").hidden = !boardMode;
    $("bar-title").hidden = boardMode;
    $("idea-name").hidden = !boardMode;
    $("add-idea").hidden = boardMode;
    $("add-card").hidden = !boardMode;
    $("zoombox").hidden = !boardMode;
  }

  /* ---------------- ideas grid ---------------- */
  var FOLDER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>';
  var PEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2 2 0 0 1 3 3L7 19l-4 1 1-4z"></path></svg>';
  var TRASH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13h10l1-13"></path></svg>';

  function renderIdeas() {
    var ideas = state.ideas.slice().sort(function (a, b) { return (b.updated || 0) - (a.updated || 0); });
    var cards = ideas.map(function (i) {
      var b = state.boards[i.id] || { cards: [] };
      var n = b.cards.length;
      var thumbs = b.cards.filter(function (c) { return c.image && c.image.url; }).slice(0, 4)
        .map(function (c) { return '<img src="' + esc(c.image.url) + '" alt="" />'; }).join("");
      return '<div class="pl-idea" data-idea="' + i.id + '">' +
          '<div class="acts">' +
            '<button class="tl-mini" data-rename="' + i.id + '" title="Rename">' + PEN + '</button>' +
            '<button class="tl-mini danger" data-delidea="' + i.id + '" title="Delete idea">' + TRASH + '</button>' +
          '</div>' +
          '<span class="fico">' + FOLDER + '</span>' +
          '<div class="nm">' + (esc(i.name) || "Untitled idea") + '</div>' +
          '<div class="meta">' + n + (n === 1 ? " note" : " notes") + " · " + relTime(i.updated) + '</div>' +
          (thumbs ? '<div class="thumbs">' + thumbs + '</div>' : '') +
        '</div>';
    }).join("");
    var addTile = '<div class="pl-new" id="new-idea-tile"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>New idea</div>';
    ideasEl.innerHTML = '<div class="pl-grid">' + cards + addTile + '</div>';

    ideasEl.querySelectorAll(".pl-idea").forEach(function (el) {
      el.addEventListener("click", function (ev) {
        if (ev.target.closest("[data-rename]") || ev.target.closest("[data-delidea]")) return;
        openIdea(el.getAttribute("data-idea"));
      });
    });
    ideasEl.querySelectorAll("[data-rename]").forEach(function (b) { b.addEventListener("click", function (e) { e.stopPropagation(); renameIdea(b.getAttribute("data-rename")); }); });
    ideasEl.querySelectorAll("[data-delidea]").forEach(function (b) { b.addEventListener("click", function (e) { e.stopPropagation(); deleteIdea(b.getAttribute("data-delidea")); }); });
    $("new-idea-tile").addEventListener("click", addIdea);
  }

  function addIdea() {
    var i = { id: uid("i"), name: "", created: Date.now(), updated: Date.now() };
    state.ideas.push(i); state.boards[i.id] = { cards: [], view: { x: 60, y: 60, z: 1 } };
    scheduleSave(); openIdea(i.id, true);
  }
  function renameIdea(id) {
    var i = ideaById(id); if (!i) return;
    var name = prompt("Rename idea", i.name || ""); if (name == null) return;
    i.name = name.trim(); i.updated = Date.now(); renderIdeas(); scheduleSave();
  }
  function deleteIdea(id) {
    var i = ideaById(id); if (!i) return;
    var b = state.boards[id] || { cards: [] };
    if (!confirm("Delete “" + (i.name || "Untitled idea") + "” and its " + b.cards.length + " note(s)?")) return;
    b.cards.forEach(function (c) { if (c.image) removeStored(c.image); if (c.file) removeStored(c.file); });
    state.ideas = state.ideas.filter(function (x) { return x.id !== id; });
    delete state.boards[id];
    renderIdeas(); scheduleSave();
  }

  function openIdea(id, focusName) {
    var i = ideaById(id); if (!i) return;
    currentIdeaId = id;
    if (!state.boards[id]) state.boards[id] = { cards: [], view: { x: 60, y: 60, z: 1 } };
    board = state.boards[id];
    activeFilter = null; $("filterbar").classList.remove("on"); drawer.classList.remove("open");
    var nm = $("idea-name"); nm.value = i.name || "";
    setMode("board");
    hydrate();
    try { history.replaceState(null, "", location.pathname + location.search + "#" + id); } catch (e) {}
    if (focusName) { nm.focus(); nm.select && nm.select(); }
  }
  function closeIdea() {
    currentIdeaId = null; board = null;
    setMode("grid"); renderIdeas();
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
  }
  $("back-ideas").addEventListener("click", closeIdea);
  $("add-idea").addEventListener("click", addIdea);
  $("idea-name").addEventListener("input", function () { var i = ideaById(currentIdeaId); if (i) { i.name = $("idea-name").value; i.updated = Date.now(); scheduleSave(); } });

  /* ---------------- view / pan / zoom ---------------- */
  var view = { x: 60, y: 60, z: 1 };
  function applyView() { canvas.style.transform = "translate(" + view.x + "px," + view.y + "px) scale(" + view.z + ")"; $("zoom-reset").textContent = Math.round(view.z * 100) + "%"; }
  function setZoom(z, cx, cy) {
    z = Math.max(0.3, Math.min(2.2, z));
    var r = stage.getBoundingClientRect();
    cx = cx == null ? r.width / 2 : cx - r.left; cy = cy == null ? r.height / 2 : cy - r.top;
    var wx = (cx - view.x) / view.z, wy = (cy - view.y) / view.z;
    view.z = z; view.x = cx - wx * z; view.y = cy - wy * z;
    applyView(); scheduleSave();
  }
  stage.addEventListener("wheel", function (ev) {
    if (ev.ctrlKey || ev.metaKey) { ev.preventDefault(); setZoom(view.z * (ev.deltaY < 0 ? 1.1 : 0.9), ev.clientX, ev.clientY); return; }
    view.x -= ev.deltaX; view.y -= ev.deltaY; applyView(); scheduleSave();
  }, { passive: false });
  var panning = false, panStart = null;
  stage.addEventListener("pointerdown", function (ev) {
    if (ev.target !== stage && ev.target !== canvas) return;
    panning = true; panStart = { x: ev.clientX, y: ev.clientY, vx: view.x, vy: view.y };
    stage.classList.add("panning"); stage.setPointerCapture(ev.pointerId);
    clearSelection();
  });
  stage.addEventListener("pointermove", function (ev) {
    if (!panning) return;
    view.x = panStart.vx + (ev.clientX - panStart.x); view.y = panStart.vy + (ev.clientY - panStart.y);
    applyView();
  });
  stage.addEventListener("pointerup", function () { if (panning) { panning = false; stage.classList.remove("panning"); scheduleSave(); } });
  $("zoom-in").addEventListener("click", function () { setZoom(view.z * 1.15); });
  $("zoom-out").addEventListener("click", function () { setZoom(view.z / 1.15); });
  $("zoom-reset").addEventListener("click", function () { view.z = 1; applyView(); scheduleSave(); });
  function viewportCenter() { var r = stage.getBoundingClientRect(); return { x: (r.width / 2 - view.x) / view.z, y: (r.height / 2 - view.y) / view.z }; }

  /* ---------------- selection ---------------- */
  var selId = null;
  function clearSelection() { selId = null; document.querySelectorAll(".tl-card.sel").forEach(function (e) { e.classList.remove("sel"); }); }
  function select(id) { clearSelection(); selId = id; var el = cardEl(id); if (el) { el.classList.add("sel"); bringFront(id); } }
  function bringFront(id) { var c = cardById(id); if (c) { c.z = ++nextZ; var el = cardEl(id); if (el) el.style.zIndex = c.z; } }

  /* ---------------- card render ---------------- */
  function cardEl(id) { return canvas.querySelector('.tl-card[data-id="' + id + '"]'); }
  var FILE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"></path><path d="M14 3v5h5"></path></svg>';

  function renderCard(c) {
    var el = document.createElement("div");
    el.className = "tl-card"; el.setAttribute("data-id", c.id);
    el.style.left = c.x + "px"; el.style.top = c.y + "px"; el.style.width = (c.w || 280) + "px"; el.style.zIndex = c.z || 1;
    el.innerHTML =
      '<div class="tl-head" data-drag>' +
        '<input class="tl-date" type="date" value="' + esc(c.date || "") + '" title="Date" />' +
        '<span class="grip"><svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg></span>' +
        '<button class="tl-mini danger" data-del title="Delete note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13h10l1-13"></path></svg></button>' +
      '</div>' +
      '<div class="tl-title" contenteditable="true" spellcheck="false" data-title>' + esc(c.title || "") + '</div>' +
      '<div class="tl-notes" contenteditable="true" spellcheck="false" data-notes></div>' +
      '<div class="tl-media" data-media></div>' +
      '<div class="tl-tags" data-tags></div>' +
      '<div class="tl-foot">' +
        '<button class="tl-mini" data-addimg title="Add image"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><path d="M21 15l-5-5L5 21"></path></svg></button>' +
        '<button class="tl-mini" data-addfile title="Attach file"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.5l-8.5 8.5a5 5 0 0 1-7-7L14 5.5a3.3 3.3 0 0 1 4.7 4.7L10 19"></path></svg></button>' +
        '<span class="tl-uprog" data-prog style="display:none"></span>' +
      '</div>' +
      '<span class="tl-resize" data-resize title="Drag to resize"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15l-6 6M21 9L9 21"></path></svg></span>';
    canvas.appendChild(el);
    el.querySelector("[data-notes]").innerHTML = c.notes || "";
    renderMedia(c, el); renderTags(c, el); wireCard(c, el);
    return el;
  }

  function renderMedia(c, el) {
    var m = el.querySelector("[data-media]"); m.innerHTML = "";
    el.classList.toggle("is-design", !!(c.image && c.image.url));
    if (c.image && c.image.url) {
      var img = document.createElement("img");
      img.className = "tl-img"; img.src = c.image.url; img.alt = c.title || "";
      img.addEventListener("click", function () { openLightbox(c.image.url); });
      m.appendChild(img);
    }
    if (c.file && c.file.url) {
      var a = document.createElement("a");
      a.className = "tl-file"; a.href = c.file.url; a.target = "_blank"; a.rel = "noopener";
      a.innerHTML = FILE_SVG + '<span class="fn">' + esc(c.file.name || "file") + '</span><span class="rm" data-rmfile title="Remove">✕</span>';
      m.appendChild(a);
      a.querySelector("[data-rmfile]").addEventListener("click", function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        removeStored(c.file); c.file = null; renderMedia(c, el); touchIdea(); scheduleSave();
      });
    }
  }
  function renderTags(c, el) {
    var box = el.querySelector("[data-tags]"); box.innerHTML = "";
    (c.tags || []).forEach(function (t) {
      var chip = document.createElement("span"); chip.className = "tl-chip"; chip.textContent = "#" + t;
      chip.addEventListener("click", function () { filterByTag(t); });
      box.appendChild(chip);
    });
  }
  function refreshTags(c, el) { c.tags = extractTags((el.querySelector("[data-notes]").innerHTML) + " " + (c.title || "")); renderTags(c, el); renderDrawer(); }

  /* ---------------- card interactions ---------------- */
  function wireCard(c, el) {
    el.addEventListener("pointerdown", function () { select(c.id); }, true);
    var head = el.querySelector("[data-drag]");
    head.addEventListener("pointerdown", function (ev) {
      if (ev.target.closest(".tl-date") || ev.target.closest("[data-del]")) return;
      ev.preventDefault();
      var sx = ev.clientX, sy = ev.clientY, ox = c.x, oy = c.y;
      el.classList.add("drag"); head.setPointerCapture(ev.pointerId);
      function mv(e) { c.x = ox + (e.clientX - sx) / view.z; c.y = oy + (e.clientY - sy) / view.z; el.style.left = c.x + "px"; el.style.top = c.y + "px"; }
      function up() { head.releasePointerCapture(ev.pointerId); head.removeEventListener("pointermove", mv); head.removeEventListener("pointerup", up); el.classList.remove("drag"); touchIdea(); scheduleSave(); }
      head.addEventListener("pointermove", mv); head.addEventListener("pointerup", up);
    });
    el.querySelector("[data-del]").addEventListener("click", function () { deleteCard(c.id); });
    el.querySelector(".tl-date").addEventListener("change", function (e) { c.date = e.target.value; touchIdea(); scheduleSave(); });
    var title = el.querySelector("[data-title]");
    title.addEventListener("input", function () { c.title = title.textContent; touchIdea(); scheduleSave(); });
    title.addEventListener("blur", function () { refreshTags(c, el); });
    title.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); el.querySelector("[data-notes]").focus(); } });
    var notes = el.querySelector("[data-notes]");
    notes.addEventListener("input", function () { c.notes = notes.innerHTML; touchIdea(); scheduleSave(); });
    notes.addEventListener("blur", function () { c.notes = notes.innerHTML; refreshTags(c, el); });
    notes.addEventListener("mouseup", queueSelToolbar);
    notes.addEventListener("keyup", queueSelToolbar);
    el.querySelector("[data-addimg]").addEventListener("click", function () { pickFor(c.id, "img"); });
    el.querySelector("[data-addfile]").addEventListener("click", function () { pickFor(c.id, "file"); });

    var rz = el.querySelector("[data-resize]");
    rz.addEventListener("pointerdown", function (ev) {
      ev.preventDefault(); ev.stopPropagation();
      var sx = ev.clientX, ow = c.w || 280;
      rz.setPointerCapture(ev.pointerId);
      function mv(e) { c.w = Math.max(200, Math.min(720, Math.round(ow + (e.clientX - sx) / view.z))); el.style.width = c.w + "px"; }
      function up() { rz.releasePointerCapture(ev.pointerId); rz.removeEventListener("pointermove", mv); rz.removeEventListener("pointerup", up); touchIdea(); scheduleSave(); }
      rz.addEventListener("pointermove", mv); rz.addEventListener("pointerup", up);
    });
  }

  function addCard(opts) {
    if (!board) return;
    opts = opts || {};
    var ctr = viewportCenter();
    var c = { id: uid("c"), x: Math.round(ctr.x - 140 + (Math.random() * 40 - 20)), y: Math.round(ctr.y - 80 + (Math.random() * 40 - 20)), w: 280, z: ++nextZ, title: "", notes: "", date: opts.date || "", tags: [], image: null, file: null };
    board.cards.push(c); renderCard(c); select(c.id);
    var el = cardEl(c.id); if (el) el.querySelector("[data-title]").focus();
    touchIdea(); scheduleSave();
  }
  function deleteCard(id) {
    var c = cardById(id); if (!c) return;
    if (!confirm("Delete this note" + (c.image || c.file ? " and its uploaded files" : "") + "?")) return;
    if (c.image) removeStored(c.image); if (c.file) removeStored(c.file);
    board.cards = board.cards.filter(function (x) { return x.id !== id; });
    var el = cardEl(id); if (el) el.remove();
    renderDrawer(); touchIdea(); scheduleSave();
  }

  /* ---------------- uploads ---------------- */
  var pendingPick = null;
  function pickFor(id, kind) { pendingPick = { id: id, kind: kind }; (kind === "img" ? $("img-input") : $("file-input")).click(); }
  function storageRef() {
    if (!window.firebase || !firebase.storage) return null;
    try { if (!firebase.apps.length && window.FIREBASE_CONFIG) firebase.initializeApp(window.FIREBASE_CONFIG); } catch (e) {}
    try { return firebase.storage(); } catch (e) { return null; }
  }
  function handlePicked(input, kind) {
    var f = input.files && input.files[0]; input.value = "";
    if (!f || !pendingPick) return;
    var c = cardById(pendingPick.id); if (!c) return;
    var el = cardEl(c.id), prog = el.querySelector("[data-prog]");
    var s = storageRef();
    if (!s || !owner) { setSaved("Upload needs cloud — enable Storage"); alert("File upload needs Firebase Storage + a published rule for prototype-files/. See the deploy note."); return; }
    var ext = (f.name.match(/\.[a-z0-9]+$/i) || [""])[0].toLowerCase();
    var path = "prototype-files/" + owner.uid + "/" + c.id + "-" + Date.now().toString(36) + ext;
    var ref = s.ref().child(path);
    prog.style.display = ""; prog.textContent = "0%";
    var task = ref.put(f, { contentType: f.type || "application/octet-stream" });
    task.on("state_changed",
      function (snap) { prog.textContent = Math.round((snap.bytesTransferred / snap.totalBytes) * 100) + "%"; },
      function (err) { prog.style.display = "none"; setSaved("Upload failed"); alert(uploadErr(err && err.code)); },
      function () {
        ref.getDownloadURL().then(function (url) {
          prog.style.display = "none";
          var meta = { url: url, path: path, name: f.name };
          if (kind === "img") { if (c.image) removeStored(c.image); c.image = meta; }
          else { if (c.file) removeStored(c.file); c.file = meta; }
          renderMedia(c, el); touchIdea(); scheduleSave();
        });
      });
  }
  function removeStored(meta) {
    if (!meta || !meta.path) return;
    var s = storageRef(); if (!s) return;
    try { s.ref().child(meta.path)["delete"]().catch(function () {}); } catch (e) {}
  }
  function uploadErr(code) {
    if (code === "storage/unauthorized") return "Storage denied the upload — publish a Storage rule allowing signed-in writes to prototype-files/.";
    if (code === "storage/unknown" || code === "storage/object-not-found") return "Storage isn't enabled — turn on Firebase Storage in the console.";
    return "Upload failed (" + (code || "unknown") + ").";
  }
  $("img-input").addEventListener("change", function () { handlePicked(this, "img"); });
  $("file-input").addEventListener("change", function () { handlePicked(this, "file"); });

  /* ---------------- select-text → hashtag ---------------- */
  var seltb = $("seltb"), selRange = null, selCardEl = null;
  function queueSelToolbar() { setTimeout(showSelToolbar, 1); }
  function showSelToolbar() {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) { seltb.classList.remove("on"); return; }
    var range = sel.getRangeAt(0);
    var host = range.commonAncestorContainer;
    var notesEl = (host.nodeType === 1 ? host : host.parentNode).closest ? (host.nodeType === 1 ? host : host.parentNode).closest("[data-notes]") : null;
    if (!notesEl) { seltb.classList.remove("on"); return; }
    var txt = sel.toString().trim();
    if (!txt || /\s/.test(txt) || txt[0] === "#") { seltb.classList.remove("on"); return; }
    selRange = range.cloneRange(); selCardEl = notesEl.closest(".tl-card");
    var r = range.getBoundingClientRect();
    seltb.style.left = (r.left + r.width / 2) + "px"; seltb.style.top = (r.top - 8) + "px";
    seltb.classList.add("on");
  }
  document.addEventListener("selectionchange", function () { var s = window.getSelection(); if (!s || s.isCollapsed) seltb.classList.remove("on"); });
  $("make-tag").addEventListener("click", function () {
    if (!selRange || !selCardEl) return;
    var word = selRange.toString().replace(/[^a-z0-9_-]/gi, "");
    if (!word) { seltb.classList.remove("on"); return; }
    selRange.deleteContents();
    var span = document.createElement("span"); span.className = "htag"; span.textContent = "#" + word.toLowerCase();
    selRange.insertNode(span);
    span.after(document.createTextNode(" "));
    seltb.classList.remove("on");
    var c = cardById(selCardEl.getAttribute("data-id"));
    if (c) { var notes = selCardEl.querySelector("[data-notes]"); c.notes = notes.innerHTML; refreshTags(c, selCardEl); touchIdea(); scheduleSave(); }
    window.getSelection().removeAllRanges();
  });

  /* ---------------- hashtag drawer + filter (board-scoped) ---------------- */
  var drawer = $("drawer"), activeFilter = null;
  function allTags() {
    var map = {};
    (board ? board.cards : []).forEach(function (c) { (c.tags || []).forEach(function (t) { map[t] = (map[t] || 0) + 1; }); });
    return Object.keys(map).sort().map(function (t) { return { tag: t, n: map[t] }; });
  }
  function renderDrawer() {
    var body = $("drawer-body"), tags = allTags();
    if (!tags.length) { body.innerHTML = '<p class="tl-drawer-empty">No hashtags yet. Type <b>#something</b> in a note, or select a word and hit “Make hashtag”.</p>'; return; }
    body.innerHTML = tags.map(function (o) {
      return '<span class="tl-tagitem' + (activeFilter === o.tag ? " active" : "") + '" data-tag="' + esc(o.tag) + '">#' + esc(o.tag) + ' <span class="n">' + o.n + '</span></span>';
    }).join("");
    body.querySelectorAll(".tl-tagitem").forEach(function (e) { e.addEventListener("click", function () { filterByTag(e.getAttribute("data-tag")); }); });
  }
  function filterByTag(t) {
    activeFilter = (activeFilter === t) ? null : t;
    document.querySelectorAll(".tl-card").forEach(function (el) {
      var c = cardById(el.getAttribute("data-id"));
      var hit = !activeFilter || (c && (c.tags || []).indexOf(activeFilter) !== -1);
      el.classList.toggle("dim", !hit);
    });
    $("filterbar").classList.toggle("on", !!activeFilter);
    $("filter-tag").textContent = "#" + (activeFilter || "");
    renderDrawer();
  }
  $("filter-clear").addEventListener("click", function () { if (activeFilter) filterByTag(activeFilter); });
  $("eye-toggle").addEventListener("click", function () { drawer.classList.toggle("open"); renderDrawer(); });
  $("drawer-close").addEventListener("click", function () { drawer.classList.remove("open"); });

  /* ---------------- lightbox ---------------- */
  function openLightbox(url) { $("lightbox-img").src = url; $("lightbox").classList.add("on"); }
  $("lightbox").addEventListener("click", function () { this.classList.remove("on"); $("lightbox-img").src = ""; });

  /* ---------------- settings / AI keys ---------------- */
  var back = $("settings-back");
  $("open-settings").addEventListener("click", function () { loadKeys(); back.classList.add("on"); });
  window.addEventListener("bot:settings", function () { loadKeys(); back.classList.add("on"); });
  $("settings-cancel").addEventListener("click", function () { back.classList.remove("on"); });
  back.addEventListener("click", function (e) { if (e.target === back) back.classList.remove("on"); });
  function loadKeys() {
    if (!owner || !db) return;
    db.collection("prototype").doc(owner.uid).collection("private").doc("keys").get().then(function (snap) {
      var d = snap.exists ? snap.data() : {};
      $("key-anthropic").value = d.anthropic || ""; $("key-openai").value = d.openai || "";
    }).catch(function () {});
  }
  $("keys-save").addEventListener("click", function () {
    if (!owner || !db) { alert("Cloud not available."); return; }
    db.collection("prototype").doc(owner.uid).collection("private").doc("keys")
      .set({ anthropic: $("key-anthropic").value.trim(), openai: $("key-openai").value.trim(), updated: Date.now() })
      .then(function () { back.classList.remove("on"); setSaved("Keys saved"); })
      .catch(function (e) { alert(e && e.code === "permission-denied" ? "Blocked — publish the prototype rule first." : "Couldn't save keys."); });
  });
  $("keys-clear").addEventListener("click", function () {
    if (!owner || !db) return;
    if (!confirm("Delete both stored API keys?")) return;
    db.collection("prototype").doc(owner.uid).collection("private").doc("keys").set({ anthropic: "", openai: "", updated: Date.now() })
      .then(function () { $("key-anthropic").value = ""; $("key-openai").value = ""; setSaved("Keys deleted"); }).catch(function () {});
  });

  /* ---------------- toolbar / keys ---------------- */
  $("add-card").addEventListener("click", function () { addCard({ date: todayISO() }); });
  document.addEventListener("keydown", function (e) {
    if (back.classList.contains("on")) return;
    var t = e.target;
    if (t && (t.isContentEditable || /input|textarea/i.test(t.tagName))) return;
    if (currentIdeaId) {
      if (e.key === "n" || e.key === "N") { e.preventDefault(); addCard({ date: todayISO() }); }
      if ((e.key === "Delete" || e.key === "Backspace") && selId) { e.preventDefault(); deleteCard(selId); }
      if (e.key === "Escape") { if (activeFilter) filterByTag(activeFilter); else if (drawer.classList.contains("open")) drawer.classList.remove("open"); else closeIdea(); }
    } else {
      if (e.key === "n" || e.key === "N") { e.preventDefault(); addIdea(); }
    }
  });

  /* ---------------- boot ---------------- */
  function hydrate() {
    canvas.innerHTML = ""; nextZ = 1;
    var cards = board ? board.cards : [];
    cards.forEach(function (c) { if ((c.z || 0) > nextZ) nextZ = c.z; renderCard(c); });
    var v = (board && board.view) || { x: 60, y: 60, z: 1 };
    view.x = v.x || 0; view.y = v.y || 0; view.z = v.z || 1;
    applyView(); renderDrawer();
  }
  function migrate(d) {
    // new shape
    if (d && Array.isArray(d.ideas) && d.boards) return { ideas: d.ideas, boards: d.boards };
    // old single-board shape { cards, view } → wrap as one idea
    if (d && Array.isArray(d.cards)) {
      var id = uid("i");
      var o = { ideas: [{ id: id, name: "My board", created: Date.now(), updated: Date.now() }], boards: {} };
      o.boards[id] = { cards: d.cards, view: d.view || { x: 60, y: 60, z: 1 } };
      return o;
    }
    return { ideas: [], boards: {} };
  }
  function loadLocal() { try { var raw = localStorage.getItem("botakumi-prototype-v1"); if (raw) state = migrate(JSON.parse(raw)); } catch (e) {} }

  function boot() {
    setMode("grid"); renderIdeas();
    // deep-link to an idea via hash
    var h = (location.hash || "").replace(/^#/, "");
    if (h && ideaById(h)) openIdea(h);
  }

  function guard() {
    if (!window.BOTAuth) { window.location.replace("index.html"); return; }
    window.BOTAuth.ready.then(function () {
      owner = window.BOTAuth.current();
      if (!owner) { window.location.replace("index.html"); return; }
      var g = $("auth-gate"); if (g) g.remove();
      loadLocal(); boot();
      try { db = firebase.firestore(); } catch (e) { db = null; }
      if (!db) { setSaved("Saved locally"); return; }
      db.collection("prototype").doc(owner.uid).get().then(function (snap) {
        if (snap.exists) {
          state = migrate(snap.data() || {});
          try { localStorage.setItem("botakumi-prototype-v1", JSON.stringify(state)); } catch (e) {}
          if (currentIdeaId && ideaById(currentIdeaId)) { board = state.boards[currentIdeaId]; hydrate(); }
          else renderIdeas();
          setSaved("Saved to cloud");
        } else { setSaved(state.ideas.length ? "Saved locally" : "No ideas yet"); }
      }).catch(function (e) { setSaved(e && e.code === "permission-denied" ? "Cloud blocked — add rule" : "Saved locally"); });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", guard);
  else guard();
})();

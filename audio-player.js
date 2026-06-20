/* audio-player.js — Blade of Takumi minimal audio player.
   A play/pause glyph, a thin seek line, and elapsed/total time. No chrome.
   Uses the page's theme vars (--accent, --line, --ink-faint, --font-mono).
     BOTAudio.html(src)   -> markup string for a player
     BOTAudio.wire(root)  -> attach behaviour to any unwired .aplayer in root
     BOTAudio.setSrc(p,s) -> swap the source of an existing player element
   The play/pause glyphs are exposed as BOTAudio.PLAY / BOTAudio.PAUSE. */
(function () {
  var PLAY  = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5l13 7.5-13 7.5z"></path></svg>';
  var PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14"></rect><rect x="14" y="5" width="4" height="14"></rect></svg>';

  function esc(s) { return String(s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;"); }
  function fmt(t) {
    if (!isFinite(t) || t < 0) t = 0;
    var m = Math.floor(t / 60), s = Math.floor(t % 60);
    return m + ":" + String(s).padStart(2, "0");
  }

  if (!document.getElementById("bot-audio-css")) {
    var st = document.createElement("style");
    st.id = "bot-audio-css";
    st.textContent =
      ".aplayer{display:flex;align-items:center;gap:0.9rem;width:100%;}" +
      ".aplayer .ap-play{appearance:none;background:transparent;border:none;padding:0;margin:0;cursor:pointer;color:var(--accent);display:flex;align-items:center;justify-content:center;flex:0 0 auto;transition:opacity .25s ease;}" +
      ".aplayer .ap-play:hover{opacity:0.65;}" +
      ".aplayer .ap-play svg{width:19px;height:19px;display:block;}" +
      ".aplayer .ap-track{flex:1 1 auto;height:1.5rem;display:flex;align-items:center;cursor:pointer;min-width:0;}" +
      ".aplayer .ap-line{position:relative;width:100%;height:2px;background:var(--line);}" +
      ".aplayer .ap-fill{position:absolute;left:0;top:0;bottom:0;width:0;background:var(--accent);}" +
      ".aplayer .ap-time{flex:0 0 auto;color:var(--ink-faint);font-family:var(--font-mono);font-size:0.62rem;letter-spacing:0.1em;white-space:nowrap;font-variant-numeric:tabular-nums;}" +
      ".aplayer audio{display:none;}";
    (document.head || document.documentElement).appendChild(st);
  }

  function refresh(p) {
    var a = p.querySelector("audio"), fill = p.querySelector(".ap-fill"),
        time = p.querySelector(".ap-time"), btn = p.querySelector(".ap-play");
    if (!a) return;
    var d = a.duration || 0, c = a.currentTime || 0;
    if (fill) fill.style.width = (d ? (c / d * 100) : 0) + "%";
    if (time) time.textContent = fmt(c) + " / " + fmt(d);
    if (btn) btn.innerHTML = a.paused ? PLAY : PAUSE;
  }

  function wire(root) {
    (root || document).querySelectorAll(".aplayer:not([data-wired])").forEach(function (p) {
      p.setAttribute("data-wired", "1");
      var a = p.querySelector("audio"), btn = p.querySelector(".ap-play"),
          track = p.querySelector(".ap-track"), line = p.querySelector(".ap-line");
      if (!a) return;
      if (btn) btn.addEventListener("click", function () {
        if (a.paused) { a.play().catch(function () {}); } else { a.pause(); }
        refresh(p);
      });
      ["loadedmetadata", "timeupdate", "play", "pause", "ended", "durationchange"].forEach(function (ev) {
        a.addEventListener(ev, function () { refresh(p); });
      });
      if (track) track.addEventListener("click", function (e) {
        var r = line.getBoundingClientRect();
        var ratio = r.width ? (e.clientX - r.left) / r.width : 0;
        ratio = Math.max(0, Math.min(1, ratio));
        if (a.duration) a.currentTime = ratio * a.duration;
        refresh(p);
      });
      refresh(p);
    });
  }

  function html(src) {
    return '<div class="aplayer">' +
      '<button class="ap-play" type="button" aria-label="Play">' + PLAY + '</button>' +
      '<div class="ap-track"><div class="ap-line"><div class="ap-fill"></div></div></div>' +
      '<span class="ap-time">0:00 / 0:00</span>' +
      '<audio preload="metadata" src="' + esc(src) + '"></audio>' +
    '</div>';
  }

  function setSrc(p, src) {
    var a = p && p.querySelector("audio");
    if (!a) return;
    if (src) { if (a.getAttribute("src") !== src) a.src = src; }
    else { a.removeAttribute("src"); }
    try { a.pause(); a.load(); } catch (e) {}
    refresh(p);
  }

  window.BOTAudio = { html: html, wire: wire, refresh: refresh, setSrc: setSrc, PLAY: PLAY, PAUSE: PAUSE };
})();

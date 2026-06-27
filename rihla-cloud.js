/* rihla-cloud.js — Rihla cloud persistence (logged-in owner only).
   ─────────────────────────────────────────────────────────────────────────
   Rihla's data stores (saved itineraries, Directory, API key) were originally
   localStorage-only. This thin layer mirrors them to Firestore so a logged-in
   owner's data follows them across devices, while localStorage stays the fast
   synchronous working cache the React components already read.

   One document per owner:
       rihla/{uid}  →  { library: {items:[...]}, directory: {places:[...]},
                         apiKey: "…", updatedAt }

   Flow
     • On login (real account, NOT the local demo): pull rihla/{uid}. Cloud
       wins when a field exists; any field MISSING in the cloud is seeded from
       whatever is already in this browser (first-time migration). localStorage
       is updated, then a `rihla-cloud-sync` window event tells React to re-read.
     • On every real write, _writeLib/_writeDir/saveApiKey call RihlaCloud.push(),
       which debounces a merge-write back to the cloud.

   Guards: no uid → no-op (logged-out Organizer stays local by design). Demo
   session → no-op (demo data is a throwaway local sandbox). Firestore SDK
   absent → no-op (falls back to localStorage-only, as before).

   Depends on: firebase-app-compat, firebase-firestore-compat, botakumi-auth.js
   (window.BOTAuth). Load AFTER those, BEFORE the Rihla babel scripts.            */
(function () {
  if (window.RihlaCloud) return;

  var LIB_KEY = "rihla_library_v1";
  var DIR_KEY = "rihla_directory_v1";
  var DEBOUNCE = 800;

  var timers = {};
  var uid = null;          // current real (non-demo) owner uid, or null
  var hydratedUid = null;  // uid we've already pulled from the cloud

  function isDemo() {
    try { if ((JSON.parse(localStorage.getItem("botakumi_demo_v1") || "{}") || {}).on) return true; } catch (e) {}
    try { if ((JSON.parse(localStorage.getItem("rihla_auth_v1") || "{}") || {}).demoSession) return true; } catch (e) {}
    return false;
  }
  function db() {
    return (window.firebase && typeof window.firebase.firestore === "function")
      ? window.firebase.firestore() : null;
  }
  function ref() {
    var d = db();
    return (d && uid) ? d.collection("rihla").doc(uid) : null;
  }
  function canSync() { return !!ref() && !isDemo(); }

  function readLS(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } }

  // Debounced merge-write of a single field to rihla/{uid}.
  function push(field, obj) {
    if (!canSync()) return;
    clearTimeout(timers[field]);
    timers[field] = setTimeout(function () {
      var r = ref();
      if (!r) return;
      var patch = {};
      patch[field] = obj;
      patch.updatedAt = Date.now();
      r.set(patch, { merge: true }).catch(function () {});
    }, DEBOUNCE);
  }

  // Pull cloud → localStorage; seed cloud from local for any missing field.
  function hydrate() {
    if (!canSync()) return Promise.resolve();
    if (hydratedUid === uid) return Promise.resolve();
    var r = ref();
    var thisUid = uid;
    return r.get().then(function (snap) {
      if (thisUid !== uid) return;       // auth changed mid-flight; bail
      hydratedUid = uid;
      var d = snap.exists ? snap.data() : null;
      var seed = {};

      // ---- saved itineraries ----
      if (d && d.library && Array.isArray(d.library.items)) {
        localStorage.setItem(LIB_KEY, JSON.stringify(d.library));
      } else {
        var l = readLS(LIB_KEY);
        if (l && Array.isArray(l.items) && l.items.length) seed.library = l;
      }

      // ---- directory ----
      if (d && d.directory && Array.isArray(d.directory.places)) {
        localStorage.setItem(DIR_KEY, JSON.stringify(d.directory));
      } else {
        var dir = readLS(DIR_KEY);
        if (dir && Array.isArray(dir.places) && dir.places.length) seed.directory = dir;
      }

      // ---- API key (lives in the BOTAuth per-uid profile) ----
      var cur = (window.BOTAuth && window.BOTAuth.current && window.BOTAuth.current()) || null;
      if (d && typeof d.apiKey === "string" && d.apiKey) {
        if (window.BOTAuth && window.BOTAuth.saveProfile && (!cur || cur.apiKey !== d.apiKey)) {
          // saveProfile emits onChange; hydratedUid is already set so it won't re-hydrate.
          window.BOTAuth.saveProfile({ apiKey: d.apiKey });
        }
      } else if (cur && cur.apiKey) {
        seed.apiKey = cur.apiKey;
      }

      if (Object.keys(seed).length) {
        seed.updatedAt = Date.now();
        r.set(seed, { merge: true }).catch(function () {});
      }

      // tell the React tree to re-read localStorage
      try { window.dispatchEvent(new CustomEvent("rihla-cloud-sync")); } catch (e) {}
    }).catch(function () {});
  }

  function onUser(u) {
    var newUid = (u && u.uid) ? u.uid : null;
    if (newUid !== uid) { uid = newUid; hydratedUid = null; }
    if (uid && !isDemo()) hydrate();
  }

  if (window.BOTAuth && window.BOTAuth.onChange) {
    window.BOTAuth.onChange(onUser);                       // fires immediately + on change
  } else if (window.BOTAuth && window.BOTAuth.ready) {
    window.BOTAuth.ready.then(function () { onUser(window.BOTAuth.current()); });
  }

  window.RihlaCloud = {
    push: push,
    hydrate: hydrate,
    _state: function () { return { uid: uid, hydratedUid: hydratedUid, canSync: canSync(), demo: isDemo() }; },
  };
})();

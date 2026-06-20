/* botakumi-auth.js — site-wide owner account layer.
   ─────────────────────────────────────────────────────────────────────────
   Now backed by FIREBASE AUTH when firebase-config.js holds real values
   (window.FIREBASE_READY === true). Falls back to a local browser-only mock
   otherwise, so the site keeps working before the config is in place.

   Shared across the whole site: the home page and every tool (Rihla, …) load
   this same module + the same Firebase config, on the same origin — so a login
   anywhere is shared everywhere and tools auto-log-in. No second sign-in.

   ── Username vs email ──────────────────────────────────────────────────────
   Firebase identifies accounts by EMAIL. We let the owner type a USERNAME and
   map it to a stable hidden email (<username>@bladeoftakumi.app). The typed
   username is stored as the Firebase displayName so it shows back nicely.

   ── API surface (all of signUp/signIn/signOut/saveProfile return Promises) ──
     BOTAuth.ready              Promise that resolves once initial auth known
     BOTAuth.isFirebase         true when running against Firebase
     BOTAuth.current()          sync → cached { username, email, uid, apiKey } | null
     BOTAuth.hasAccount()       best-effort hint (localStorage) for create vs login
     BOTAuth.onChange(cb)       subscribe to auth-state; fires immediately + on change
     BOTAuth.signUp({username,password})
     BOTAuth.signIn({username,password})
     BOTAuth.signOut()
     BOTAuth.saveProfile(patch) profile (e.g. apiKey) — local per-uid for now
     BOTAuth.mapError(err)      → friendly message string
*/
(function () {
  var EMAIL_DOMAIN = "@bladeoftakumi.app";
  var OWNER_HINT = "botakumi_owner_exists";
  var PROFILE_PREFIX = "botakumi_profile_";
  var LOCAL_KEY = "botakumi_auth_v1"; // legacy/local-fallback record

  var useFirebase = !!(window.FIREBASE_READY && window.firebase && window.firebase.auth);

  /* ---- shared helpers ---- */
  function toEmail(username) {
    var u = String(username || "").trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
    return u + EMAIL_DOMAIN;
  }
  function nameFromEmail(email) {
    return String(email || "").split("@")[0];
  }
  function profileFor(uid) {
    try { return JSON.parse(localStorage.getItem(PROFILE_PREFIX + uid)) || {}; } catch (e) { return {}; }
  }
  function setProfile(uid, p) { localStorage.setItem(PROFILE_PREFIX + uid, JSON.stringify(p)); }

  var listeners = [];
  var cached = null;
  function emit() { listeners.forEach(function (cb) { try { cb(cached); } catch (e) {} }); }

  /* ===================================================================== */
  /* FIREBASE-BACKED IMPLEMENTATION                                        */
  /* ===================================================================== */
  if (useFirebase) {
    if (!firebase.apps.length) firebase.initializeApp(window.FIREBASE_CONFIG);
    var auth = firebase.auth();
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(function () {});

    function shape(fbUser) {
      if (!fbUser) return null;
      var uid = fbUser.uid;
      var username = fbUser.displayName || nameFromEmail(fbUser.email);
      return Object.assign({ uid: uid, email: fbUser.email, username: username }, profileFor(uid));
    }

    var resolveReady;
    var ready = new Promise(function (res) { resolveReady = res; });
    var firstFired = false;
    auth.onAuthStateChanged(function (fbUser) {
      cached = shape(fbUser);
      if (cached) try { localStorage.setItem(OWNER_HINT, "1"); } catch (e) {}
      emit();
      if (!firstFired) { firstFired = true; resolveReady(cached); }
    });

    window.BOTAuth = {
      isFirebase: true,
      ready: ready,
      current: function () { return cached; },
      hasAccount: function () { try { return localStorage.getItem(OWNER_HINT) === "1"; } catch (e) { return false; } },
      ownerName: function () { return cached ? cached.username : null; },
      onChange: function (cb) {
        listeners.push(cb);
        cb(cached);
        return function () { listeners = listeners.filter(function (x) { return x !== cb; }); };
      },
      signUp: function (creds) {
        var email = toEmail(creds.username);
        return auth.createUserWithEmailAndPassword(email, creds.password).then(function (res) {
          try { localStorage.setItem(OWNER_HINT, "1"); } catch (e) {}
          return res.user.updateProfile({ displayName: String(creds.username || "").trim() })
            .catch(function () {})
            .then(function () { cached = shape(auth.currentUser); emit(); return cached; });
        });
      },
      signIn: function (creds) {
        var email = toEmail(creds.username);
        return auth.signInWithEmailAndPassword(email, creds.password).then(function () {
          cached = shape(auth.currentUser); emit(); return cached;
        });
      },
      signOut: function () { return auth.signOut(); },
      saveProfile: function (patch) {
        if (!cached) return Promise.resolve(null);
        var merged = Object.assign({}, profileFor(cached.uid), patch);
        setProfile(cached.uid, merged);
        cached = Object.assign({}, cached, merged); emit();
        return Promise.resolve(cached);
      },
      mapError: mapError
    };
    return;
  }

  /* ===================================================================== */
  /* LOCAL FALLBACK (no Firebase config yet) — promise-wrapped mock        */
  /* ===================================================================== */
  function read() { try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) || {}; } catch (e) { return {}; } }
  function write(s) { localStorage.setItem(LOCAL_KEY, JSON.stringify(s)); }
  function salt() { return Math.random().toString(36).slice(2, 10); }
  function hash(pw, slt) {
    var h = 5381, s = slt + "::" + pw;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return String(h >>> 0);
  }
  function localCurrent() {
    var s = read();
    if (!s.account || !s.session) return null;
    return Object.assign({ username: s.account.username }, s.account.profile || {});
  }
  cached = localCurrent();

  window.BOTAuth = {
    isFirebase: false,
    ready: Promise.resolve(cached),
    current: function () { return localCurrent(); },
    hasAccount: function () { return !!read().account; },
    ownerName: function () { var a = read().account; return a ? a.username : null; },
    onChange: function (cb) {
      listeners.push(cb); cb(localCurrent());
      return function () { listeners = listeners.filter(function (x) { return x !== cb; }); };
    },
    signUp: function (creds) {
      return new Promise(function (resolve, reject) {
        var s = read();
        if (s.account) return reject(new Error("An owner account already exists on this device."));
        var slt = salt();
        s.account = { username: String(creds.username || "").trim(), salt: slt, hash: hash(creds.password, slt), profile: {} };
        s.session = true; write(s);
        cached = localCurrent(); emit(); resolve(cached);
      });
    },
    signIn: function (creds) {
      return new Promise(function (resolve, reject) {
        var s = read(), a = s.account;
        if (!a) return reject(new Error("No account yet — create one first."));
        var u = String(creds.username || "").trim();
        if (u.toLowerCase() !== a.username.toLowerCase() || hash(creds.password, a.salt) !== a.hash)
          return reject(new Error("That username or password doesn't match."));
        s.session = true; write(s);
        cached = localCurrent(); emit(); resolve(cached);
      });
    },
    signOut: function () {
      var s = read(); s.session = false; write(s);
      cached = null; emit(); return Promise.resolve();
    },
    saveProfile: function (patch) {
      var s = read();
      if (!s.account) return Promise.resolve(null);
      s.account.profile = Object.assign({}, s.account.profile || {}, patch); write(s);
      cached = localCurrent(); emit(); return Promise.resolve(cached);
    },
    mapError: mapError
  };

  /* ---- friendly error text (shared) ---- */
  function mapError(err) {
    var code = (err && err.code) || "";
    switch (code) {
      case "auth/configuration-not-found":
      case "auth/operation-not-allowed":
        return "Almost there — turn on Email/Password sign-in: Firebase console → Build → Authentication → Get started → Sign-in method → enable Email/Password → Save.";
      case "auth/email-already-in-use":
        return "That account already exists — switch to Log in.";
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "That username or password doesn't match.";
      case "auth/weak-password":
        return "Use a password of at least 6 characters.";
      case "auth/too-many-requests":
        return "Too many attempts — wait a moment and try again.";
      case "auth/network-request-failed":
        return "Network error — check your connection and try again.";
      default:
        return (err && err.message) || "Something went wrong. Try again.";
    }
  }
})();

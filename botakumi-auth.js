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
  // Real, verifiable owner email — required for native MFA (Firebase refuses to
  // enroll a 2nd factor until the account email is verified). Login still accepts
  // the username; the single owner is mapped → this email behind the scenes.
  var OWNER_EMAIL = "bladeoftakumi@gmail.com";
  var OWNER_HINT = "botakumi_owner_exists";
  var TRUST_KEY = "botakumi_trust_device"; // "1" trusted (LOCAL), "0" not (SESSION)
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
    // Trusted device → persist across restarts (LOCAL). Untrusted (e.g. shared
    // computer) → SESSION, so the session is dropped when the browser closes.
    var trusted = (function () { try { return localStorage.getItem(TRUST_KEY) !== "0"; } catch (e) { return true; } })();
    var P = firebase.auth.Auth.Persistence;
    auth.setPersistence(trusted ? P.LOCAL : P.SESSION).catch(function () {});

    /* ---- SMS multi-factor helpers (compat) ---- */
    var pendingResolver = null; // set when a sign-in needs a 2nd factor

    function shapeHint(h, i) {
      return { index: i, uid: h.uid, factorId: h.factorId,
        label: h.displayName || "Text message", phone: h.phoneNumber || null };
    }
    function shapeFactor(f) {
      return { uid: f.uid, factorId: f.factorId,
        label: f.displayName || "Text message", phone: f.phoneNumber || null };
    }
    // Fresh invisible reCAPTCHA per phone flow (avoids "already rendered").
    var recaptcha = null;
    function getRecaptcha(containerId) {
      try { if (recaptcha) recaptcha.clear(); } catch (e) {}
      var el = document.getElementById(containerId);
      if (el) el.innerHTML = "";
      recaptcha = new firebase.auth.RecaptchaVerifier(containerId, { size: "invisible" });
      return recaptcha;
    }

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
        var pw = creds.password;
        // Try the real owner email first; fall back to the legacy synthetic email
        // for accounts created before the email migration. Either way the owner
        // types their username + password.
        return auth.signInWithEmailAndPassword(OWNER_EMAIL, pw).catch(function (e) {
          if (e && e.code === "auth/multi-factor-auth-required") throw e;
          if (e && (e.code === "auth/user-not-found" || e.code === "auth/invalid-credential" || e.code === "auth/wrong-password"))
            return auth.signInWithEmailAndPassword(toEmail(creds.username), pw);
          throw e;
        }).then(function () {
          cached = shape(auth.currentUser); emit(); return cached;
        }).catch(function (e) {
          if (e && e.code === "auth/multi-factor-auth-required") {
            pendingResolver = e.resolver;
            var info = new Error("Two-factor verification required.");
            info.code = e.code; info.mfa = true;
            info.hints = (e.resolver.hints || []).map(shapeHint);
            throw info;
          }
          throw e;
        });
      },

      /* ---- second-factor challenge at sign-in (SMS) ---- */
      mfa: {
        isPending: function () { return !!pendingResolver; },
        hints: function () { return pendingResolver ? pendingResolver.hints.map(shapeHint) : []; },
        cancel: function () { pendingResolver = null; },
        // Send the code (triggers reCAPTCHA + text); returns a verificationId.
        sendSms: function (hintIndex, containerId) {
          if (!pendingResolver) return Promise.reject(new Error("No pending sign-in."));
          var hint = pendingResolver.hints[hintIndex];
          var provider = new firebase.auth.PhoneAuthProvider(auth);
          return provider.verifyPhoneNumber(
            { multiFactorHint: hint, session: pendingResolver.session },
            getRecaptcha(containerId));
        },
        resolvePhone: function (verificationId, code) {
          if (!pendingResolver) return Promise.reject(new Error("No pending sign-in."));
          var cred = firebase.auth.PhoneAuthProvider.credential(verificationId, String(code).trim());
          var assertion = firebase.auth.PhoneMultiFactorGenerator.assertion(cred);
          return pendingResolver.resolveSignIn(assertion).then(function () {
            pendingResolver = null; cached = shape(auth.currentUser); emit(); return cached;
          });
        }
      },

      /* ---- owner enrollment (email migrate + SMS factor) ---- */
      enroll: {
        ownerEmail: OWNER_EMAIL,
        // Re-authenticate with the password — required by Firebase before
        // sensitive actions (changing email, enrolling/removing a 2nd factor)
        // when the saved session is older than a few minutes.
        reauth: function (password) {
          var u = auth.currentUser;
          if (!u) return Promise.reject(new Error("Log in first."));
          var cred = firebase.auth.EmailAuthProvider.credential(u.email, password);
          return u.reauthenticateWithCredential(cred);
        },
        status: function () {
          var u = auth.currentUser;
          if (!u) return { signedIn: false };
          return {
            signedIn: true,
            email: u.email,
            isOwnerEmail: (u.email || "").toLowerCase() === OWNER_EMAIL.toLowerCase(),
            emailVerified: !!u.emailVerified,
            factors: ((u.multiFactor && u.multiFactor.enrolledFactors) || []).map(shapeFactor)
          };
        },
        // Re-pull the user from the server (after the email link is clicked).
        refresh: function () {
          var u = auth.currentUser, self = this;
          if (!u) return Promise.resolve({ signedIn: false });
          return u.reload().then(function () { cached = shape(auth.currentUser); emit(); return self.status(); });
        },
        // Send a verify-and-update link to the real owner email.
        sendEmailVerification: function () {
          var u = auth.currentUser;
          if (!u) return Promise.reject(new Error("Log in first."));
          return u.verifyBeforeUpdateEmail(OWNER_EMAIL);
        },
        // SMS enrollment: send code, then confirm.
        startSms: function (phoneNumber, containerId) {
          var u = auth.currentUser;
          if (!u) return Promise.reject(new Error("Log in first."));
          return u.multiFactor.getSession().then(function (session) {
            var provider = new firebase.auth.PhoneAuthProvider(auth);
            return provider.verifyPhoneNumber({ phoneNumber: phoneNumber, session: session }, getRecaptcha(containerId));
          });
        },
        finishSms: function (verificationId, code, label) {
          var cred = firebase.auth.PhoneAuthProvider.credential(verificationId, String(code).trim());
          var assertion = firebase.auth.PhoneMultiFactorGenerator.assertion(cred);
          return auth.currentUser.multiFactor.enroll(assertion, label || "Text message");
        },
        list: function () {
          var u = auth.currentUser;
          return u ? ((u.multiFactor && u.multiFactor.enrolledFactors) || []).map(shapeFactor) : [];
        },
        remove: function (factorUid) {
          return auth.currentUser.multiFactor.unenroll(factorUid);
        }
      },
      signOut: function () { return auth.signOut(); },
      /* ---- trusted-device + lock ---- */
      isTrusted: function () { try { return localStorage.getItem(TRUST_KEY) !== "0"; } catch (e) { return true; } },
      setTrusted: function (v) {
        try { localStorage.setItem(TRUST_KEY, v ? "1" : "0"); } catch (e) {}
        return auth.setPersistence(v ? P.LOCAL : P.SESSION).catch(function () {});
      },
      // Verify the account password WITHOUT sending an SMS: reaching the MFA stage
      // proves the password was correct, so we treat that as success for unlock.
      verifyPassword: function (password) {
        var u = auth.currentUser;
        if (!u) return Promise.reject(new Error("Not signed in."));
        var cred = firebase.auth.EmailAuthProvider.credential(u.email, password);
        return u.reauthenticateWithCredential(cred).then(function () { return true; }).catch(function (e) {
          if (e && e.code === "auth/multi-factor-auth-required") return true;
          throw e;
        });
      },
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
    isTrusted: function () { try { return localStorage.getItem(TRUST_KEY) !== "0"; } catch (e) { return true; } },
    setTrusted: function (v) { try { localStorage.setItem(TRUST_KEY, v ? "1" : "0"); } catch (e) {} return Promise.resolve(); },
    verifyPassword: function (password) {
      var s = read(), a = s.account;
      if (!a) return Promise.reject(new Error("No account."));
      if (hash(password, a.salt) !== a.hash) { var e = new Error("Wrong password."); e.code = "auth/invalid-credential"; return Promise.reject(e); }
      return Promise.resolve(true);
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
      case "auth/multi-factor-auth-required":
        return "Enter the texted code to finish signing in.";
      case "auth/invalid-verification-code":
      case "auth/missing-code":
        return "That code didn't match \u2014 check the text and try again.";
      case "auth/code-expired":
        return "That code expired \u2014 send a fresh one and try again.";
      case "auth/unverified-email":
        return "Verify your email first (check bladeoftakumi@gmail.com), then set up text-message verification.";
      case "auth/requires-recent-login":
        return "For security, log out and back in, then try this again.";
      case "auth/second-factor-already-in-use":
        return "That phone is already enrolled.";
      case "auth/maximum-second-factor-count-exceeded":
        return "You've reached the maximum number of second factors.";
      case "auth/invalid-phone-number":
      case "auth/missing-phone-number":
        return "Enter the phone number in full international form, e.g. +15551234567.";
      case "auth/too-many-requests":
        return "Too many attempts — wait a moment and try again.";
      case "auth/network-request-failed":
        return "Network error — check your connection and try again.";
      default:
        return (err && err.message) || "Something went wrong. Try again.";
    }
  }
})();

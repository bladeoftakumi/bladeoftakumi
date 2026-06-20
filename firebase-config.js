/* firebase-config.js — Blade of Takumi Firebase Web config.
   ────────────────────────────────────────────────────────────────────────
   These values are PUBLIC by design (they identify your project to Google)
   and are safe in a public repo. Real protection comes from Firebase
   Authentication + Firestore security rules, configured separately.

   Analytics (measurementId) is intentionally NOT initialized here — it adds
   network noise and isn't needed for auth. We can switch it on later. */

window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyAxbuHDKEtCtAPh9DspDgwXcZJr-S_x3LI",
  authDomain: "blade-of-takumi.firebaseapp.com",
  projectId: "blade-of-takumi",
  storageBucket: "blade-of-takumi.firebasestorage.app",
  messagingSenderId: "32294615327",
  appId: "1:32294615327:web:35ab3018d5137aac96182a",
  measurementId: "G-6WX6ZJLLE8"
};

/* Detects whether real values have been pasted (vs the PASTE_ placeholders). */
window.FIREBASE_READY = !String(window.FIREBASE_CONFIG.apiKey || "").includes("PASTE_");

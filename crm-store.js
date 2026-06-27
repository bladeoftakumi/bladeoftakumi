// =============================================================
//  CRM data layer — Blade of Takumi
//  ------------------------------------------------------------
//  Owner-only tool. When Firebase is configured (firebase-config.js
//  → window.FIREBASE_READY) and the Firestore compat SDK is loaded,
//  contacts + pipeline stages live in a single per-owner document:
//        crm/{uid}  →  { contacts: [...], stages: [...] }
//  Otherwise it falls back to localStorage so the page still works.
//
//  The component only calls store.load() / save() / loadStages() /
//  saveStages() / subscribe() — nothing else changes.
// =============================================================

const LS_KEY = "crm_lms_v1";
const LS_STAGES_KEY = "crm_lms_stages_v1";

function localStore() {
  return {
    async load() {
      try {
        const v = JSON.parse(localStorage.getItem(LS_KEY));
        return Array.isArray(v) ? v : null;
      } catch (e) {
        return null;
      }
    },
    async save(contacts) {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(contacts));
      } catch (e) {}
    },
    async loadStages() {
      try {
        const v = JSON.parse(localStorage.getItem(LS_STAGES_KEY));
        return Array.isArray(v) ? v : null;
      } catch (e) {
        return null;
      }
    },
    async saveStages(stages) {
      try {
        localStorage.setItem(LS_STAGES_KEY, JSON.stringify(stages));
      } catch (e) {}
    },
    subscribe() {
      return () => {};
    },
  };
}

// --- Firebase (Firestore) implementation -----------------------------------
// Uses the compat SDK + the shared app initialized by botakumi-auth.js, and
// the signed-in owner's uid (the page is auth-gated, so a user is present).
function firebaseStore() {
  // Resolve auth + db lazily on each call so we never race the SDK / login.
  async function ctx() {
    if (window.BOTAuth && window.BOTAuth.ready) {
      try { await window.BOTAuth.ready; } catch (e) {}
    }
    const user = window.BOTAuth && window.BOTAuth.current && window.BOTAuth.current();
    if (!user || !user.uid) throw new Error("not-authenticated");
    return { db: window.firebase.firestore(), uid: user.uid };
  }
  const ref = (db, uid) => db.collection("crm").doc(uid);

  return {
    async load() {
      try {
        const { db, uid } = await ctx();
        const snap = await ref(db, uid).get();
        const d = snap.exists ? snap.data() : null;
        return d && Array.isArray(d.contacts) ? d.contacts : null;
      } catch (e) { return null; }
    },
    async save(contacts) {
      try {
        const { db, uid } = await ctx();
        await ref(db, uid).set({ contacts }, { merge: true });
      } catch (e) {}
    },
    async loadStages() {
      try {
        const { db, uid } = await ctx();
        const snap = await ref(db, uid).get();
        const d = snap.exists ? snap.data() : null;
        return d && Array.isArray(d.stages) ? d.stages : null;
      } catch (e) { return null; }
    },
    async saveStages(stages) {
      try {
        const { db, uid } = await ctx();
        await ref(db, uid).set({ stages }, { merge: true });
      } catch (e) {}
    },
    // Live updates across devices/tabs.
    subscribe(cb) {
      let unsub = () => {};
      ctx()
        .then(({ db, uid }) => {
          unsub = ref(db, uid).onSnapshot((snap) => {
            const d = snap.exists ? snap.data() : null;
            if (d && Array.isArray(d.contacts)) cb(d.contacts);
          });
        })
        .catch(() => {});
      return () => { try { unsub(); } catch (e) {} };
    },
  };
}

export function createStore() {
  const canFB = !!(
    window.FIREBASE_READY &&
    window.firebase &&
    typeof window.firebase.firestore === "function"
  );
  return canFB ? firebaseStore() : localStore();
}

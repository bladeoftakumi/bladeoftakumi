# Blade of Takumi — project notes for Claude

A static, client-only personal site (brand: **Blade of Takumi**) deployed from a public
GitHub repo. No build step — plain HTML + inline React (Babel) + vanilla JS. Firebase
(Auth + Firestore) provides the only backend.

## Voice & design
- Minimal, quiet, deliberate. Japanese tool/craft motifs (Suzuri = inkstone, Kaizen =
  improvement, Rihla = journey, Mozi). Dark theme, monospace accents, restrained palette.
- **Cut filler copy.** No explanatory subheadings under tool titles — the user removes
  these on sight. Keep live-data lines (counts, "saved" status), drop instructional prose.
- Single **owner** account (the user). Username/password via Firebase Auth; the site maps
  username → `<username>@bladeoftakumi.app` behind the scenes. The account email is now the
  **real, verified** `bladeoftakumi@gmail.com` (migrated 2026-06 so native MFA could enroll);
  username login still works (real email tried first, legacy synthetic email as fallback).
  **SMS two-factor is live** (phone enrolled): login = username + password → texted 6-digit
  code. **Trust-this-device + Lock** added — see auth layer below.

## Files (live site = project root + Rihla/)
- `index.html` + `app.jsx` — landing page / tool launcher.
- `Suzuri.html` — essay composer. **Publish to site** (login-only) writes essays to
  Firestore `essays` collection (keyed by title-slug). Falls back to .txt download for
  manual GitHub upload. Editing an essay from Essays.html hands off via
  `localStorage["suzuri-edit-v1"]` and preserves the slug.
- `Essays.html` — public blog. Reads file-based essays (essays/ folder) merged with
  Firestore essays (Firestore wins on slug clash). Owner-only **Manage** mode (eye/edit):
  per-essay **Edit text** (→ Suzuri) and **Make private/public**. Logged-out visitors run
  `where("private","==",false)` so private docs are never fetched.
- `Kaizen.html` — goal monitor. Goals sync to Firestore `kaizen/{uid}` when logged in,
  else localStorage. Features: **hours logged** per goal (+ summary stat), **temporary
  un-focus** (rest a goal until a date, auto-resumes), and a public **Progress** eye button
  that reads/writes a curated `public/progress` mirror (focus, %, pace, hours only).
- `Finance Monitor.html` — spreadsheet → P&L dashboard. **Owner-only**: surfaced via the
  home "More" palette where it's marked `gated` (clicking while logged out prompts login),
  and the page itself runs a `BOTAuth.ready` guard that redirects logged-out visitors to
  `index.html`. Client-side gating only (file is still public in the repo) — no secrets in it.
- `Rihla.html` + `Rihla/*.jsx` — outreach route planner (Google Maps Places + Routes API).
  **3 tabs when logged in:** Route Planner, Itineraries, Directory. The Excel-based
  **Outreach Organizer** is kept for LOGGED-OUT users (their tracker, no Firebase) and only
  hidden from the logged-in nav — do NOT delete it.
- `botakumi-auth.js` — shared site-wide auth layer (`window.BOTAuth`: `.ready`, `.onChange`,
  `.current()`). `firebase-config.js` — public Firebase web config (safe in public repo).
  **Auth/MFA additions (2026-06, compat SDK 10.12.5 — NOT modular):**
  - `signIn` tries real email `bladeoftakumi@gmail.com` first, falls back to legacy
    `<user>@bladeoftakumi.app`; catches `auth/multi-factor-auth-required` and surfaces
    `err.hints`. `mfa.{sendSms,resolvePhone,cancel,hints}` resolve the SMS challenge.
  - `enroll.*` is the temporary owner setup API (email verify + SMS enroll/remove +
    `reauth`). Surfaced via the **"Two-factor setup"** panel in the home account menu —
    **the user wants this enroll UI STRIPPED now that the phone is enrolled** (leave the
    login code-challenge). `SecurityModal` + the menu item in `app.jsx` are the temp bits.
  - **Trust this device:** `isTrusted()/setTrusted(bool)` switch Firebase persistence
    LOCAL (trusted, stay signed in → no code on future visits) vs SESSION (untrusted,
    drop on browser close). `TrustPrompt` shows after each interactive sign-in. Native
    Firebase MFA CANNOT skip the code per-device at a real sign-in; "no MFA every login"
    works purely because the trusted session persists (only a full Log out forces a new
    code). A true post-logout skip would need a Cloud Function (Admin custom token) —
    declined for cost/security.
  - **Lock:** account menu is **Two-factor setup · Lock · Log out**. Lock = `LockScreen`
    veil, persisted via `localStorage["botakumi_locked"]="1"` (survives reload). Unlock
    with **password only, NO code** — `verifyPassword()` reauths and treats
    `multi-factor-auth-required` as success (reaching MFA stage proves pw correct; no SMS
    sent unless resolver is called). ⚠️ **Lock is home-page (index.html) only** right now —
    does NOT veil the individual tools; extending site-wide is a pending follow-up the user
    may ask for (each page reads the same lock flag).
  - reCAPTCHA gotcha (compat): `new firebase.auth.RecaptchaVerifier(containerId,
    {size:"invisible"})` — do NOT pass auth as a 3rd arg (throws `auth/invalid-api-key`).
- Backups in `site/`, `BladeOfTakumi/`, `uploads/` are NOT live — don't edit them.

## Rihla — Mozi Mode (route planner mode toggle: "Around an area" vs "Mozi Mode")
One-day directional canvassing loop. Inputs: start location, **compass direction**, hours
for the day, corridor width, keywords, optional **"Loop from"** frontier anchor, **wedge
spread** (Auto/Manual). Dwell fixed at 20 min/stop.
- Builds a **two-leg wedge**: outbound leg splayed one side of the heading, return leg the
  other — so the way home covers NEW ground ("double effectiveness"). Real return-time leg.
- **Reach is derived from the time budget** (drive out + 20min×stops + drive home ≤ hours),
  not a fixed count. Greedy fit, then one optimize call for the loop, then trim over-budget.
- Excludes already-visited places (`excludeKeys`). **Frontier hint** when ≥60% of nearby
  results are already visited → suggests setting a "Loop from" town.
- **Auto wedge splay** scales with hours: 4h→20°, 8h→26°, 12h→32°. Manual = slider 8–50°.
- Deliberately **API-call-heavy** (maximize reach): dense overlapping corridor sampling,
  far horizon (~350mi cap), default usage cap raised to 250. Area mode unchanged (~5 calls).
- Engine lives in `Rihla/api.jsx` (`buildMoziItinerary`, `moziPlan`, `autoSplayDeg`).

## Firestore data model
- `essays/{slug}` — published essays. `private: false` by default. Optional `audio`
  (Storage download URL) + `audioName` — one audio file per essay, uploaded by Suzuri
  to Storage path `essays-audio/{slug}.{ext}`. File-based essays can set `audio: <file>`
  in their `.txt` header (resolved relative to `essays/`, e.g. `audio/foo.wav`).
- `kaizen/{uid}` — per-account goals.
- `public/progress` — curated Kaizen progress mirror for brand followers.

## ⚠️ Pending user (console) actions — NOT done by code
> **Note (2026-06-19):** this in-environment copy of `CLAUDE.md` is the MOST RECENT
> version — it's slightly ahead of GitHub (items #1 and #3 were confirmed live and marked
> done here but not yet re-pushed). Trust this copy over the repo's on the rules status.
0. **SMS-MFA console state (2026-06-27):** Phone enabled as a 2nd factor; **SMS region
   policy = US-only ✅ set**; account email verified ✅; phone factor enrolled ✅;
   `bladeoftakumi.com` added to Authorized domains ✅. **STILL TODO (user):** create a
   **Billing budget + alert** (GCP → Billing → Budgets & alerts; ~$5/mo, 50/90/100%
   email thresholds) — notify-only toll-fraud insurance, realistically ~$0. Also: the
   **temporary enroll panel should be removed from code** (see auth layer notes) once the
   user confirms a real login on the live site, and the 2FA code changes still need to be
   **deployed** (changed files: `botakumi-auth.js`, `app.jsx`, `index.html`).
   - **Recommended sequence for stripping the enroll panel:** (1) deploy the 3 changed
     files, (2) do ONE real username+password+SMS-code login on the live `bladeoftakumi.com`
     to confirm the whole flow works end-to-end, (3) THEN have Claude strip the temporary
     "Two-factor setup" UI (`SecurityModal` + its `app.jsx` account-menu item + the
     `#recaptcha-enroll` container), leaving only the login code-challenge + Trust/Lock.
     Do NOT strip before a confirmed live login — the panel is the recovery/re-enroll path
     if anything's off. Factors can also always be managed from the Firebase console.
1. **Publish Firestore rules** (full ruleset — replace everything in Firestore → Rules):
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /essays/{doc} {
         allow read:  if resource.data.private == false || request.auth != null;
         allow write: if request.auth != null;
       }
       match /kaizen/{uid} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
       match /crm/{uid} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
       match /rihla/{uid} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
       match /public/{doc} {
         allow read:  if true;
         allow write: if request.auth != null;
       }
       match /{doc=**} { allow read, write: if false; }
     }
   }
   ```
   **✅ Published & confirmed live (2026-06-19; `crm` + `rihla` blocks added &
   published by user 2026-06-27)** — verified from an unauthenticated client:
   logged-out reads of `public/progress` and public essays are ALLOWED, and a
   logged-out read of `kaizen/{uid}` returns `permission-denied` (correct). The
   `public/progress` mirror doc also exists, so Kaizen's public Progress view works
   for visitors. **`rihla/{uid}` was missing until 2026-06-27** — that's why Rihla
   saved itineraries / Directory / Maps key never synced to the cloud (writes hit the
   catch-all `if false` and `RihlaCloud.push()` swallowed the `permission-denied`).
   Now covered. Nothing left to do on this item.
2. **Mozi Mode has never been run against the live Google API key** — UI + logic verified,
   real corridor search untested. On first real run, sanity-check the wedge splay feel and
   call volume.
3. **Suzuri essay audio — live upload test still pending.** Firebase Storage is
   **✅ enabled and the rules are confirmed live (2026-06-19)**: verified from an
   unauthenticated client that reads/`listAll` on `essays-audio/**` are ALLOWED
   (`object-not-found` on a missing file, not `unauthorized`) — so `allow read: if true`
   is published. The folder is currently **empty (0 files)**, so the only thing untested
   is the end-to-end *write* path: publish one essay with audio from Suzuri (logged in)
   and confirm the upload + playback work. Rules already in place:
   ```
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /essays-audio/{file=**} {
         allow read:  if true;
         allow write: if request.auth != null;
       }
       match /{path=**} { allow read, write: if false; }
     }
   }
   ```

## Working notes
- **Always flag costs / potential costs.** Whenever a suggestion or feature could incur a
  charge (paid plan/tier, billing-gated service, per-use API, storage/bandwidth/egress,
  domain, etc.), proactively tell the user the cost up front — even if likely $0 in their
  free tier. Don't let a billing surprise slip through.
- User uses **Claude Code** separately for git push/deploy — this environment can't push.
  Flow: build here → user pushes to GitHub → Claude Code pulls/deploys.
- Verify changes with `ready_for_verification`; the user is often logged in in the preview,
  so Firestore round-trips can be tested live (always clean up test docs).

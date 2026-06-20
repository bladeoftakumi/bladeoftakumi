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
  username → `<username>@bladeoftakumi.app` behind the scenes. No email/reset flow.

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
       match /public/{doc} {
         allow read:  if true;
         allow write: if request.auth != null;
       }
       match /{doc=**} { allow read, write: if false; }
     }
   }
   ```
   **⚠️ Not yet published** — confirmed live: a logged-out read of `public/progress`
   returns `permission-denied`, so Kaizen's public Progress view shows the "not
   available yet" empty state for visitors. Publishing the ruleset above (it already
   has `match /public/{doc} { allow read: if true; }`) fixes it. After publishing,
   open Kaizen **logged in and save once** so the `public/progress` mirror doc exists
   — until a save happens there is nothing for visitors to load.
2. **Mozi Mode has never been run against the live Google API key** — UI + logic verified,
   real corridor search untested. On first real run, sanity-check the wedge splay feel and
   call volume.
3. **Enable Firebase Storage + publish Storage rules** (for Suzuri essay audio). In the
   Firebase console: Build → Storage → Get started. Then publish rules allowing public
   reads and signed-in writes to the audio folder:
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

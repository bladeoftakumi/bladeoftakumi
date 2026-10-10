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
- **Site IA (2026-07):** public = landing (index.html), Essays, Ruminations link, and Kaizen's
  visitor Progress view. EVERYTHING else is owner-only, launched from `Dashboard.html`
  (owner launcher: cards for Rihla, Suzuri, Kaizen, Teleprompter, Finance Monitor,
  En/CRM, Essays + light Firestore glances). All private pages (Suzuri, Teleprompter,
  Rihla, Finance Monitor, CRM Pipeline, Dashboard) carry the same `BOTAuth.ready`
  redirect-to-index guard. Landing Tools section shows ONLY Ruminations + Kaizen;
  Dashboard card appears only when logged in (see `TOOLS` / `DASHBOARD_TOOL` in app.jsx).
  Kaizen: logged-out = page IS the public progress view (`body.visitor`); logged-in = full tool.
- `index.html` + `app.jsx` — landing page / tool launcher.
- `City Place Finder.dc.html` (+ `support-v2.js`, newer DC runtime — kept separate so CRM's
  `support.js` is untouched) — owner-only, Dashboard card, light-only in shell. Added
  2026-09-27 from the user's clickable prototype. **Live mode wired 2026-09-28**: a real key
  → Places API (New) Text Search (rectangle restriction, 3 pages max, quadtree split at 60)
  + Place Details (phone/website/address parts). "Fill a sample key" → simulation. Key check
  = 1 IDs-only Text Search (free SKU). City boundaries via Nominatim (free). Email scraping
  disabled in live mode (CORS — needs the local helper). **First live run OK 2026-09-28**
  (after a console fix of an earlier bare 403): Kent WA × "Quran school" = 3 calls, 2 places.
  Live estimator = area×0.05 places/city (calibrated on that one run; refine as data grows).
  **Library (2026-09-28):** every finished run (live + simulated) auto-saves to
  `localStorage["cpf-library-v1"]` ({runs:[{id,date,live,kws,cities,calls,cost,results}]}).
  Library screen (header button): Places tab merges all runs by place ID (keywords unioned,
  Runs count, Last seen), flags "Possible duplicate" (same phone or street+ZIP), filters
  (search, city, keyword, run, has phone/website/email, dups, include simulated), .xls
  download of the filtered set; Runs tab: Open / Download / Delete, Clear library,
  **Download history (.xls)** — sheets Coverage (city×keyword: times run, last run, places),
  Keywords (yield), Cities, Runs, City runs. Live only unless "Include simulated" is on.
  **Never auto-deletes (2026-10-07):** Library is stored in localStorage + IndexedDB
  (`cpf-library`, persist() requested) + Firestore `cpf/{uid}/runs/{id}` (meta) with
  `parts/{n}` chunks (700KB each). Union-merged on load; local-only runs re-pushed.
  "Clear library" removed; Results "Delete run data" no longer touches the Library; only
  the per-run Delete (two-click) in Library → Runs removes a run (local + cloud).
  **Settings persist** (cities, keywords, options, limit) in `localStorage["cpf-settings-v1"]`.
  **API key comes from Rihla**: `BOTAuth.current().apiKey`, fallback Firestore `rihla/{uid}.apiKey`;
  auto-checked on load (1 IDs-only call) and kept between runs. Pasted keys still clear after a run.
  **Pre-split (2026-09-28):** "Split large cities into areas of" option (4/6/8/12 km/off,
  default 8, saved) tiles each boundary box into a grid BEFORE searching; each tile still
  quadtree-splits at 60. Estimator counts tiles.
  **From a state (2026-10-06):** Setup panel loads every incorporated place (+ optional CDPs)
  for a state from Census TIGERweb (free, CORS ok, layers 25/26 = Census 2020, paged 500)
  with population + boundary bbox, so no geocoding needed. Order (pop/N→S/W→E/A–Z),
  min population, block size (5–50); "Load next N" replaces the Cities list with the next
  cities NOT yet run (live Library runs) with ALL current keywords. Settings persisted.
  **Auto-run (2026-10-07):** "Run next N" loads the block → Confirm screen; dropdown chains
  0/1/2/4/9/all further blocks automatically (only after a clean, live, all-cities-finished
  run, and only with the Rihla key since pasted keys clear). Stop cancels the chain.
  "Done" = city ran with every current keyword in a non-partial live result; progress bar
  shows % done; Cities rows tagged "Already ran with these keywords".
  **Canada (2026-10-06):** provinces in the same picker ("Canada · Ontario"), list from
  Statistics Canada 2021 census subdivisions (public ArcGIS FeatureServer
  `zmLUiqh7X11gGV2d/.../Canadian_Population_and_Dwelling_Counts_2021`, layer 2); toggle adds
  reserves/unorganized. "City, ON" accepted everywhere; Nominatim/Photon switch to CA; address
  parser handles "ON M5V 2T6" + ", Canada".
  City lookups: queue 20 concurrent, 60s timeout, results cached in `cpf-geo-v1`. User watches call counts closely: test with 1 city, 1 keyword, low limit (~30).
- `Outreach Planner.html` + `outreach/data.jsx`, `outreach/app.jsx` (2026-10-07) — owner-only
  calling CRM, Dashboard card, light-only. Pool = every live City Place Finder Library row
  with a phone (deduped by last-10 digits, permanently-closed dropped); reads localStorage +
  IndexedDB + Firestore Library. Batches by City or Area (state → z-order) of N numbers;
  assignments stored so a contact keeps its original batch; "Rebuild batches" regroups.
  Stages editable (roles: new / recontact / closed). Outcomes: No answer/Voicemail →
  Recontact + call-back in N days; Spoke → first plain stage; Not interested → closed.
  Today list: N numbers, their-local-time window, my hours, min/call → due call-backs
  first, then ★ active batches; slot-scheduled by timezone (state map + split-state rules).
  State saved to `localStorage["op-state-v1"]` + Firestore `cpf/{uid}/outreach/state`
  (chunked parts; covered by the existing cpf rule).
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
- `habits/{uid}` — per-account habit tracker (`{ habits:[{id,name,done:{"YYYY-MM-DD":true}}], updated }`).
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
       match /habits/{uid} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
       match /cpf/{uid}/{doc=**} {
         allow read, write: if request.auth != null &amp;&amp; request.auth.uid == uid;
       }
       match /prototype/{uid} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
         match /private/{doc} {
           allow read, write: if request.auth != null && request.auth.uid == uid;
         }
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
       match /prototype-files/{uid}/{file=**} {
         allow read:  if true;
         allow write: if request.auth != null && request.auth.uid == uid;
       }
       match /{path=**} { allow read, write: if false; }
     }
   }
   ```

## ⚠️ Pending user (console) actions for the Prototype tool — NOT done by code
> Added 2026-07-25. The Prototype idea-board (`Prototype.html` + `prototype.js`) is built
> but its cloud sync + file upload will silently fall back to on-device localStorage until
> BOTH rules below are published. **Remind the user.**
4. **Publish the `prototype/{uid}` Firestore block** (already added to the ruleset above —
   the user needs to paste the updated ruleset into Firestore → Rules and Publish). Covers
   the board doc + the `private/keys` subdoc (AI API keys). No cost.
6. ✅ **`cpf/{uid}/{doc=**}` Firestore block published 2026-10-07** — verified: all 12
   Library runs uploaded to `cpf/{uid}/runs`.
5. **Publish the `prototype-files/{uid}/**` Storage block** (added to the Storage ruleset
   above). ⚠️ Firebase Storage has cost — storage + download bandwidth on uploaded design
   files. Likely pennies/mo at this scale but NOT $0; suggest a billing budget alert if
   many/large files. Until published, uploads fail with `storage/unauthorized`.

## Working notes
- **Always flag costs / potential costs.** Whenever a suggestion or feature could incur a
  charge (paid plan/tier, billing-gated service, per-use API, storage/bandwidth/egress,
  domain, etc.), proactively tell the user the cost up front — even if likely $0 in their
  free tier. Don't let a billing surprise slip through.
- User uses **Claude Code** separately for git push/deploy — this environment can't push.
  Flow: build here → user pushes to GitHub → Claude Code pulls/deploys.
- Verify changes with `ready_for_verification`; the user is often logged in in the preview,
  so Firestore round-trips can be tested live (always clean up test docs).

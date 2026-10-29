# Blade of Takumi — project notes for Claude

A single static public landing page (brand: **Blade of Takumi**), served from this repo at
`bladeoftakumi.com` (`CNAME` — never delete it). No build step: plain HTML + inline React
(Babel, loaded from unpkg). No backend, no login.

## Voice & design
- Minimal, quiet, deliberate. Japanese tool/craft motifs. Dark theme, monospace accents,
  restrained palette.
- **Cut filler copy.** No explanatory subheadings under titles — the user removes these on
  sight.

## Files
- `index.html` — page shell + all CSS; `app.jsx` — the page (nav, hero, Presence, Tools,
  footer). `LINKS`, `PRESENCE` and `TOOLS` in `app.jsx` hold every outbound link.
- Essays live on Substack (`LINKS.substack`). Tools are external sites (Ruminations on
  Death, Doublethink).
- `tweaks-panel.jsx` + `image-slot.js` — design-tool helpers the page loads.
- `manifest.webmanifest` + `assets/icons/` + the apple-mobile-web-app tags in `index.html`
  make "Add to Home Screen" open full-screen on iPhone. Keep the tags when the user sends a
  new export (their exports have dropped them before).

## History
- Until 2026-10-29 this repo also held owner-only tools (Dashboard, Rihla, Suzuri, Kaizen,
  Essays, CRM, City Place Finder, Outreach Planner, etc.) plus Firebase login. The user had
  them removed to keep the public site simple; they remain in git history (before the
  "Strip the site down to the public landing page" commit). Firebase data (Firestore/Storage)
  was not touched.

## Working notes
- **Always flag costs / potential costs** of any suggestion up front, even if likely $0.
- Deploy flow: commit to the working branch → PR → merge to `main` (GitHub Pages serves `main`).

# Blade of Takumi — project notes for Claude

A single static public landing page (brand: **Blade of Takumi**), served from this repo at
`bladeoftakumi.com` (`CNAME` — never delete it). No build step: plain HTML + inline React
(Babel, loaded from unpkg). No backend, no login.

## Voice & design
- Minimal, quiet, deliberate. Japanese tool/craft motifs. Dark theme, monospace accents,
  restrained palette.
- **Cut filler copy.** No explanatory subheadings under titles.

## Files
- `index.html` — page shell + all CSS; `app.jsx` — the page (nav, hero, Presence, Tools,
  footer). `LINKS`, `PRESENCE` and `TOOLS` in `app.jsx` hold every outbound link.
- `assets/hero-reading.jpg` — hero photo; `assets/logo-line.png` — logo; `fonts/` — Luxia.
- `tweaks-panel.jsx` + `image-slot.js` — design-tool helpers the page loads.
- `manifest.webmanifest` + `assets/icons/` + the apple-mobile-web-app tags in `index.html`
  make "Add to Home Screen" open full-screen on iPhone. Keep these tags in `index.html`.

## Working notes
- **Always flag costs / potential costs** of any suggestion up front, even if likely $0.
- Deploy flow: commit to the working branch → PR → merge to `main` (GitHub Pages serves `main`).

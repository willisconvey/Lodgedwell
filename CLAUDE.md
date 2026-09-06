# Lodgedwell website — project guide for Claude Code

Read this first in every session. It is the single source of truth for how the
site is built, edited, previewed and deployed. **Then read `docs/STATUS.md`**
for where work was left off, and update it before you finish.

## What this is

Marketing site + client portal for **Lodgedwell**, an online conveyancing brand
(Victoria, Australia only). Live at **https://lodgedwell.com.au** on Netlify.
The person you are working with runs the business (Willis Conveyancing /
Willis Property Group Pty Ltd). Astro 4 static site; no framework on the client.

## Layout

```
src/layouts/Base.astro      <head>, Google Fonts, Header + Footer, main.js. Props: title,
                            description, active (nav key), tally (load Tally embed), noindex
src/components/Header.astro sticky nav; pass active="home|how-it-works|services|pricing|about"
src/components/Footer.astro
src/pages/*.astro           one file per route (index, how-it-works, services, pricing,
                            about, get-started, privacy [noindex], portal [noindex])
public/assets/css/styles.css  THE design system stylesheet: tokens at the top, then components
public/assets/js/main.js    nav, reveal-on-scroll, FAQ, counters, form tabs, SMS gates
public/assets/js/roofline-scene.js  homepage hero tile animation (canvas-2D). Tune via CONFIG only.
public/assets/img/          real logo: lodgedwell-horizontal.svg, -reversed.svg (dark bg), -icon.svg
netlify/functions/          send-code, check-code (Twilio Verify), portal-login, portal-matters,
                            clio-progress + lib/ — see docs/client-portal.md
design/                     design-system source: canvas artboards + build script (see below)
design-system/              generated sync-ready bundle for claude.ai/design (do not hand-edit)
docs/STATUS.md              living status / resume-here notes (update every session)
docs/client-portal.md       portal architecture + env vars
```

## Edit → preview → deploy loop

1. Edit `src/pages/*.astro` for copy, `styles.css` for look, components for shared chrome.
2. Preview: `preview_start` with name **`lodgedwell-dev`** (defined in the parent folder's
   `.claude/launch.json`; it runs `npm --prefix <this dir> run dev` on port 4321). HMR is on.
   Verify in the browser pane (desktop + mobile width) before handing over.
3. Build check when touching config/layout: `npm run build` (outputs `dist/`).
4. Commit on `main` with a clear message. Committing from the CLI works.
5. **Push:** `git push` from the CLI has NO GitHub credentials on this Mac and will fail.
   The user pushes with **GitHub Desktop**. Tell them when a push is needed. Pushing `main`
   triggers Netlify's continuous deploy (`npm run build` → `dist`) automatically.
   Fallback: the Netlify MCP `deploy-site` action returns an `npx @netlify/mcp` command to run
   in this dir for a manual deploy (site id 66dc6618-dc19-49b0-9ffa-fdfc4d1b3941, team willisconvey).
6. Site-wide Netlify password protection was ON as a pre-launch gate (curl returns 401).
   Check `docs/STATUS.md` for whether it has been lifted before assuming the site is public.

Remote: github.com/willisconvey/lodgedwell (branch `main`). Never force-push.

## Brand and design rules (non-negotiable)

- Tokens live at the top of `styles.css`. Canvas is warm cream paper `#FAF6EF` (never white as
  page bg; white is for raised cards). Brand green `#1E5C4A` (`--green-600`), hover `#164C3B`,
  deep `#0E2C22` (footer/CTA band). Accent **ochre** `#E8A13A` — one loud CTA per page.
  Ink `#16241F`. Hairline `#E4DCCF`. Logo greens are `#0F6E56` (wordmark) and `#04342C` tile
  with chevrons `#5DCAA5 / #9FE1CB / #FFF` — these are the logo's own colours, not tokens.
- Type: Plus Jakarta Sans (display) / Public Sans (body) / IBM Plex Mono (references, chips).
  Sentence case everywhere. No emoji in UI. Lucide-style 2px stroke inline SVG icons.
- Radii: 10px controls, 16px cards, 24px panels/price cards. Warm-tinted shadows only.
  Flat surfaces: no gradients/blobs (`.blob` is display:none by design).
- Buttons: `.btn` (green), `.btn--coral` (ochre accent — the class name is legacy, it IS ochre),
  `.btn--ghost`, `.btn--dark`, `.btn--lg`, `.btn--block`. 42px tall, 52px for `--lg`.
- Header logo 36px, footer uses the reversed logo at 34px.
- Back-compat aliases (`--coral`, `--cream`, `--paper`, `--muted`, `--line`) exist so older
  inline styles keep working; prefer the real token names in new code.

## Copy rules (agreed with the user)

- No unverifiable claims: no star ratings with numbers, no settlement counts, no "thousands
  of clients", no fabricated team profiles or testimonials. "5-star service" wording is OK.
- Pre-purchase contract review is NOT offered — don't add it back.
- Pricing (real): **$1,000 + GST** for sale, purchase and transfer, disbursements included.
  Owners Corporation certificates extra; excludes PEXA fees and government charges incl.
  stamp duty. Billing: **$330 incl GST on engagement**, balance **$770 incl GST at settlement**.
- Contact: admin@lodgedwell.com.au only (no phone on the marketing site), Mon–Fri 9am–5pm.
  Privacy page has its own contact block (privacy@lodgedwell.com.au, 03 9071 3050,
  Willis Property Group Pty Ltd ABN 36 659 238 721, PO Box 35 Sassafras).
- Onboarding forms are Tally (workspace 3EZYWA): buying = merged purchase form `81gAgr`
  behind the on-site SMS gate; selling = Sale Form `D4942p` (the older `9q5aBQ` is closed). Tally submissions
  create InTouch matters via Make (see memory notes; not part of this repo).
- Copyright line is "Lodgedwell" (not "Lodgedwell Pty Ltd").

## Design system

- `design/sections/*.html` is the single editable source: one snippet per card, each with an
  `@section` header (group, name, subtitle, viewport). Snippets use the REAL `styles.css`
  classes and the real logo files, so they stay pixel-identical to production.
- `node design/build.mjs` regenerates BOTH `design/build/` (Claude Design canvas artboards +
  `canvas.json`, gitignored) and `design-system/` (committed bundle for claude.ai/design).
- Visual check of the bundle: `preview_start` name **`lodgedwell-ds`** (port 8899, serves
  `design-system/` via `design/serve.mjs`).
- Published Claude Design canvas (six artboards: brand/colour, typography, components,
  sections, desktop chrome, mobile chrome): URL in `docs/STATUS.md`. To update it, rebuild,
  re-seed with the `design` skill (`design/README.md` has the exact command) and republish to
  the SAME artifact URL.
- claude.ai/design project "Lodgedwell Design System" (projectId
  `fff4592d-ab0f-450d-b224-9a2f456d4249`) mirrors `design-system/`. Re-sync with the DesignSync
  tool (`design-system/` as localDir; writes globs `readme.md, SKILL.md, styles.css,
  tokens/tokens.css, assets/*.svg, guidelines/*.html, components/*.html, ui_kits/website/*.html`).
  Authorization is already stored on this Mac; if it ever lapses the user re-runs `/design-login`
  in `~/.local/bin/claude`. Sync is one-way from the repo.
- The older, pre-logo design system export lives in OneDrive
  (`~/Library/CloudStorage/OneDrive-WillisConveyancing/Desktop/WC/2026 Refresh/Lodgedwell Design System/`).
  It predates the real logo and the current greens; treat this repo as the source of truth.

## Gotchas

- This folder lives in iCloud Drive. `npm run dev` via `preview_start` works from here
  (confirmed 2026-09-07), but `python3 -m http.server` does NOT (its `os.getcwd()` hits
  "Operation not permitted" in the preview sandbox). For static previews use a Node server
  that never touches cwd, like `design/serve.mjs`.
- The browser pane caches `roofline-scene.js` hard; bust with `fetch(url,{cache:'reload'})`
  then reload.
- `roofline-scene.js` `renderFrame` must guard `stages.length` — the initial `resize()` paints
  before `seed()`.
- Old Tally three-step URLs redirect to `/get-started` (see `astro.config.mjs`).

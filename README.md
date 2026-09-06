# Lodgedwell — Astro site

Marketing site for **Lodgedwell** online conveyancing (Victoria), built with
[Astro](https://astro.build) on top of the **Lodgedwell Design System**.

## Structure

```
public/assets/         # design-system CSS, JS, favicon (served as-is)
  css/styles.css       #   ← the Lodgedwell Design System stylesheet (tokens + components)
  js/main.js           #   ← nav, reveal-on-scroll, FAQ, counters, form tabs
  img/favicon.svg
src/
  layouts/Base.astro   # <head>, fonts, Header + Footer, global scripts
  components/
    Header.astro       # sticky nav (pass `active` to highlight the current page)
    Footer.astro
  pages/               # one file per route → clean URLs
    index.astro            → /
    how-it-works.astro     → /how-it-works
    services.astro         → /services
    pricing.astro          → /pricing
    about.astro            → /about
    get-started.astro      → /get-started   (embeds the Tally onboarding forms)
astro.config.mjs
netlify.toml           # Netlify build config (command + publish dir)
```

## Develop

```bash
npm install
npm run dev        # http://localhost:4321
```

## Build

```bash
npm run build      # outputs static site to dist/
npm run preview    # preview the production build
```

## Deploy to Netlify

**Option A — Git (recommended):** push this folder to a GitHub repo, then in
Netlify: *Add new site → Import from Git → pick the repo*. `netlify.toml` already
sets `build = "npm run build"` and `publish = "dist"`. Done.

**Option B — CLI:**

```bash
npm i -g netlify-cli
netlify deploy --build --prod
```

Then point your domain (`lodgedwell.com.au`) at the Netlify site and update
`site:` in `astro.config.mjs` if the final domain differs.

> Vercel/Cloudflare Pages work too — same `npm run build` / publish `dist`.

## Editing content

Each page's copy lives in its `src/pages/*.astro` file. Shared header/footer are
in `src/components`. Brand tokens (colours, fonts, spacing, radii, shadows) live
at the top of `public/assets/css/styles.css` — change them there and the whole
site updates.

## Onboarding forms

`get-started.astro` embeds the onboarding forms. **Buying** uses the merged
Tally purchase form (`81gAgr`) — a single multi-page form (personal details +
purchase details) with Tally's built-in email verification, revealed after the
on-site SMS gate verifies the visitor's mobile (the verified number is passed
into the form's hidden `phone` field). This replaced the old three-step Tally
flow; the old `/purchase-flow/*`, `/purchase-verify` and `/purchase-details`
URLs now redirect to `/get-started`. **Selling** embeds the Tally property
form (`D4942p`; the older `9q5aBQ` is closed). The `<Base tally={true}>` prop loads Tally's embed
script. Deep links `/get-started#buy` and `/get-started#sell` open the right
tab.

The buying tab first verifies the visitor's mobile with an SMS code
(Twilio Verify, called from `netlify/functions/`). Set `TWILIO_ACCOUNT_SID`,
`TWILIO_AUTH_TOKEN` and `TWILIO_VERIFY_SERVICE_SID` as Netlify environment
variables (`TWILIO_VERIFY_SERVICE_SID` is a Verify Service SID, `VA...` —
create one in Twilio Console → Verify → Services if none exists). Until they
are set, the gate shows "Verification is not configured".

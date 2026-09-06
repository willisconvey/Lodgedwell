# Status — resume here

Update this file at the end of every session (date, what changed, what's next).
Keep it short; history lives in `git log`.

## Current state (2026-09-07)

- `main` is in sync with `origin/main`; working tree was clean at session start.
  Everything up to commit `1b1fdf1` (footer copyright wording) is on GitHub, so Netlify
  has auto-deployed it. The three-chevron roofline tile (`8824e37`) is therefore live.
- Netlify password protection: **assumed still ON** (curl to lodgedwell.com.au returns 401).
  Ask the user before assuming the site is public.
- Final copy/design pass: home, how-it-works, pricing, services, about — DONE.
  Get-started and portal received contact-detail updates only.
  **Remaining full passes: get-started, privacy, portal.**
- Homepage how-it-works "Sale" tab step wording is still draft — awaiting the user's final words.
- Testimonials section removed from the homepage for now (no verifiable reviews yet).
- Client portal (`/portal`): built, needs Clio→Make connection + Netlify env vars (see
  `docs/client-portal.md`). Twilio env vars must be set in Netlify for the SMS gates.

## Tooling set up this session (2026-09-07)

- `CLAUDE.md` written (project guide). Preview config `lodgedwell-dev` added to
  `../.claude/launch.json` (Astro dev on port 4321, runs from this iCloud folder — works).
- Design system: `design/` (source + build) and `design-system/` (generated bundle).
  Published Claude Design canvas: see "Design canvas" below.

## Design canvas

- Artifact URL: https://claude.ai/code/artifact/e413a449-b11e-47fd-9e85-039bf8f8f121 (published 2026-09-07; republish to this URL, never create a new one)
- Re-seed/republish steps: `design/README.md`.

## Next steps (suggested)

1. Copy pass on get-started, privacy, portal.
2. Confirm sale-tab step wording on the homepage.
3. Decide when to lift Netlify password protection (launch).
4. Optional: `/design-login` in an interactive terminal, then sync `design-system/` to
   claude.ai/design with DesignSync.

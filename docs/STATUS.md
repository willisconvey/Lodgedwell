# Status — resume here

Update this file at the end of every session (date, what changed, what's next).
Keep it short; history lives in `git log`.

## Current state (2026-09-07)

- `main` is in sync with `origin/main`; working tree was clean at session start.
  Everything up to commit `1b1fdf1` (footer copyright wording) is on GitHub, so Netlify
  has auto-deployed it. The three-chevron roofline tile (`8824e37`) is therefore live.
- Netlify password protection: **assumed still ON** (curl to lodgedwell.com.au returns 401).
  Ask the user before assuming the site is public.
- Final copy/design pass: home, how-it-works, pricing, services, about, get-started — DONE
  (get-started 2026-09-07: rating claim removed, fixed fee on trust strip, unverifiable
  "save and resume" claim dropped). Privacy page passed 2026-09-07 (light touch: removed references to calculators, call
  booking and quotes that the site doesn't offer; legal substance untouched).
  Portal page passed 2026-09-07 (meta description + the purchase 'contract review'
  milestone reworded to a post-signing check, matching the rest of the site).
  **All page copy passes are now DONE.**
- Privacy page items for the USER to confirm (not changed): "offices in Ferny Creek,
  Melbourne CBD and Bendigo"; "off-the-plan and commercial transactions"; the page is
  noindex and not linked from the footer — add a footer link before launch?
- Homepage how-it-works "Sale" tab step wording is still draft — awaiting the user's final words.
- Testimonials section removed from the homepage for now (no verifiable reviews yet).
- Client portal (`/portal`): built, needs Clio→Make connection + Netlify env vars (see
  `docs/client-portal.md`). Twilio env vars must be set in Netlify for the SMS gates.

## Facts corrected 2026-09-07

- The sell tab embeds Tally **Sale Form `D4942p`** (commit 13305f8); `9q5aBQ` is closed.
  README/CLAUDE.md updated to match.

## Tooling set up this session (2026-09-07)

- `CLAUDE.md` written (project guide). Preview config `lodgedwell-dev` added to
  `../.claude/launch.json` (Astro dev on port 4321, runs from this iCloud folder — works).
- Design system: `design/` (source + build) and `design-system/` (generated bundle).
  Published Claude Design canvas: see "Design canvas" below.

## Design canvas

- Artifact URL: https://claude.ai/code/artifact/e413a449-b11e-47fd-9e85-039bf8f8f121 (published 2026-09-07; republish to this URL, never create a new one)
- Re-seed/republish steps: `design/README.md`.
- **claude.ai/design project:** "Lodgedwell Design System", projectId
  `fff4592d-ab0f-450d-b224-9a2f456d4249` — all 26 bundle files synced 2026-09-07 via
  DesignSync (the user ran `/design-login` once in ~/.local/bin/claude). To re-sync after
  a rebuild: list_files → finalize_plan (same globs, deletes []) → write_files.
  Sync is ONE-WAY repo → Design; bring Design-side tweaks back into styles.css by hand.

## Next steps (suggested)

1. Confirm the privacy-page items above.
2. Confirm sale-tab step wording on the homepage.
3. Decide when to lift Netlify password protection (launch).
4. If the user tweaks things in claude.ai/design, port those changes back into
   `styles.css` / `design/sections/` and re-sync.

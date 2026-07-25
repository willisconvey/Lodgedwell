# Handoff — Tally → Jotform forms migration

_Working notes for the `claude/lodgedwell-forms-jotform-m8oimd` branch. Delete
this file before merging to `main`._

## What was done (2026-07-25)

- **New Jotform: "Purchase Form - Lodgedwell"** — ID `262051079065050`,
  https://form.jotform.com/262051079065050 (personal workspace of
  admin@willisconveyancing.com.au).
  - Merges the old three-form Tally purchase flow into ONE 12-page form:
    1. Your details (old Step 1, `ODeNGR`)
    2. Property address + purchase price
    3. Trusts
    4. Purchasers (more than one? person/company?)
    5. Company Details (skipped unless Company)
    6. Additional info — primary purchaser
    7. Second purchaser (skipped unless multiple purchasers)
    8. Third purchaser (skipped unless third person = Yes)
    9. Manner of holding (skipped unless multiple purchasers)
    10. First Home Owner questions (skipped unless an FHB duty
        exemption/concession is requested)
    11. Finance details
    12. Confirmation (4 required "I agree" checkboxes + signature)
  - All Tally show/require logic recreated (~65 rules), incl. the
    "purchase price < $750,000 AND PPR = Yes" first-home-buyer reveals.
  - **Email verification**: Jotform native verification code on the page-1
    Email field (replaces Tally's separate email verify).
  - **Mobile**: AU (+61) country-code validation only — **no SMS OTP**
    (see open items).
  - AU formats: DD/MM/YYYY past-only DOBs, "$" prefix on purchase price.

- **Site** (this branch, commit `8521d94`):
  - `/get-started` buying tab embeds the Jotform directly.
  - Deleted `purchase-flow/step-1..3`, `purchase-verify`, `purchase-details`
    pages and `FlowFrame`/`FlowStep` components (the old Tally iframe chain).
  - Old flow URLs redirect to `/get-started` (see `astro.config.mjs`).
  - Selling tab still embeds the Tally property sales form (`9q5aBQ`).

## Old Tally forms (left untouched, still published)

- `ODeNGR` Step 1 — Your Details (had 14 submissions)
- `0QgZZN` Step 2 — Verify Your Mobile (hidden fields `phone`, `first_name`,
  `sid` suggest a Twilio Verify integration, probably via Make — could not be
  inspected: Make MCP connector denied team access)
- `81gAgr` Step 3 — Purchase Details (the big 415-block form; full extracted
  spec was used to build the Jotform)
- `9q5aBQ` Property Sales Form — still live on the selling tab

## SMS verification (added 2026-07-25)

The buying tab on `/get-started` now has an on-site Twilio Verify gate:
enter mobile → SMS code → code checked → Jotform revealed with the verified
number prefilled (`?phone7[full]=...`). Implementation:

- `netlify/functions/send-code.mjs` / `check-code.mjs` (+ `lib/twilio.mjs`)
  call Twilio Verify's REST API directly — no npm dependency.
- **Required Netlify environment variables** (Site settings → Environment
  variables) — the gate returns "Verification is not configured" until set:
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_VERIFY_SERVICE_SID` (a Verify Service SID, `VA...` — create one
    in Twilio Console → Verify → Services if none exists)
- Verified state is kept in `sessionStorage` (`lw-verified-phone`), so the
  gate is skipped for the rest of the browser session. The gate is a
  data-quality measure, not a security boundary.

## Open items
2. **Property Sales Form** migration to Jotform (selling tab) — not started.
3. **Open/merge the PR** for this branch to deploy the site changes.
4. Recommended: a manual click-through of the live Jotform (this environment
   could not render jotform.com to preview it).
5. Once happy, close/unpublish the three old Tally purchase forms and delete
   this file.

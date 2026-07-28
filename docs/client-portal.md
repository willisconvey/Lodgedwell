# Client portal (`/portal`)

A gated dashboard where clients sign in with the mobile number on their file
(SMS code via Twilio Verify — the same service as the /get-started gate) and
see their matter's progress as a milestone timeline. Progress is driven by
task completions in Clio, pushed here via Make.com.

## How it fits together

```
Clio (task completed)
  → Make.com scenario (Clio connection — NOT YET CREATED, see below)
      → POST /.netlify/functions/clio-progress        (secret header)
          → Netlify Blobs store "portal"
              ← /.netlify/functions/portal-matters    (signed session token)
                  ← /portal page                       (SMS sign-in via
                     send-code + portal-login)
```

- `src/pages/portal.astro` — the page: SMS gate, then per-matter timelines.
- `netlify/functions/portal-login.mjs` — checks the SMS code, issues a signed
  12-hour session token (HMAC, no accounts/passwords).
- `netlify/functions/portal-matters.mjs` — returns the signed-in phone's
  matters + computed milestones. Raw Clio task names never leave the server.
- `netlify/functions/clio-progress.mjs` — ingest endpoint Make posts to.
- `netlify/functions/lib/portal.mjs` — session tokens, blobs keys, and the
  milestone model (edit `MILESTONES` here to tune labels/keywords).

## Netlify environment variables

Set in Netlify UI → Site settings → Environment variables (alongside the
existing `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_VERIFY_SERVICE_SID`):

| Variable | Value |
| --- | --- |
| `PORTAL_SESSION_SECRET` | any long random string (e.g. `openssl rand -hex 32`) |
| `PORTAL_INGEST_SECRET`  | a second long random string; also goes in the Make HTTP module header |

Without them, portal-login / clio-progress return clear "not configured" errors.

## Ingest contract

`POST https://<site>/.netlify/functions/clio-progress` with header
`x-portal-secret: <PORTAL_INGEST_SECRET>` and JSON body:

```json
{
  "matter": {
    "id": 123,
    "display_number": "00012-Smith",
    "description": "Purchase of 12 Example St, Suburb VIC",
    "type": "purchase",
    "address": "12 Example St, Suburb VIC 3000"
  },
  "client": { "name": "Jane Smith", "phone": "0412 345 678" },
  "tasks": [
    { "name": "Order searches", "complete": true, "completed_at": "2026-07-18" },
    { "name": "Create PEXA workspace", "complete": false }
  ]
}
```

Notes:
- Send the matter's **full task list** every time — the stored record is
  replaced, not merged. `status: "Complete"` is accepted instead of
  `complete: true` (matches Clio's field).
- `type` is fuzzy-matched: anything containing purchase/buy → purchase,
  sale/sell/vendor → sale, else a generic timeline.
- `client.phone` must be the client's mobile — it is the sign-in identity.
  If the phone on a matter changes, the next POST re-indexes it.
- Test with curl (replace secret + host); a `{"ok":true,...}` echo confirms storage.

## Make.com scenario (to build — blocked on a Clio connection)

There is **no Clio connection in the Make team (1829443) yet**. Once Clio is
connected (Make → Add connection → Clio, sign in as the firm):

1. Trigger: **Clio → Watch Tasks** (or a Clio webhook on task update),
   filtered to status = complete.
2. **Clio → Get a Matter** for the task's matter (id, display_number,
   description, client contact).
3. **Clio → List Tasks** for that matter (all of them, any status).
4. **HTTP → Make a request**: POST to the ingest URL above, header
   `x-portal-secret`, body per the contract (map the task array).

Optionally add a second route triggered on matter creation so new matters
appear in the portal before any task completes.

## Milestone mapping

`MILESTONES` in `lib/portal.mjs` defines the client-facing stages for
purchase and sale matters. A stage is "done" when any completed task name
contains one of its keyword phrases, or an explicit `[m:<key>]` tag (e.g. a
Clio task named `Confirm finance approval [m:conditions]`). Earlier stages
back-fill so the timeline never shows gaps. Tune the phrases to match the
firm's actual Clio task templates — or add `[m:...]` tags to the templates
for exact control.

## Caveats

- **Netlify site password protection is currently ON** — external webhooks
  (Make → clio-progress) will get the password wall, and clients can't reach
  /portal. The portal can only be tested end-to-end once protection is off
  (or via the local harness).
- The SMS gate proves possession of the phone number on file; anyone with
  that phone in hand sees milestone progress (labels only — no documents, no
  figures, no task names). Keep it that way: don't add sensitive data to the
  portal-matters response without upgrading auth.
- Local testing: `scratchpad/portal-preview/serve.mjs` (session-specific
  harness) serves `dist/` + the real functions backed by a local BlobsServer,
  with local-only secrets baked in.

// Shared helpers for the Twilio Verify functions. Uses Twilio's REST API
// directly (Basic auth + form encoding) so no npm dependency is needed.

export const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body),
});

// Accepts AU mobiles written as 04xx xxx xxx, 614xxxxxxxx or +614xxxxxxxx,
// or any full international number in +<digits> form. Returns E.164 or null.
export function normalisePhone(raw) {
  const s = String(raw || '').replace(/[\s().-]/g, '');
  if (/^04\d{8}$/.test(s)) return '+61' + s.slice(1);
  if (/^614\d{8}$/.test(s)) return '+' + s;
  if (/^\+614\d{8}$/.test(s)) return s;
  if (/^\+\d{8,15}$/.test(s)) return s;
  return null;
}

// POSTs to Twilio Verify. Returns the fetch Response, or null when the
// required environment variables are missing.
export async function twilioVerify(path, params) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) return null;

  return fetch(`https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}${path}`, {
    method: 'POST',
    headers: {
      Authorization:
        'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params),
  });
}

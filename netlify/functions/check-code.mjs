// POST { phone, code } → checks the SMS code with Twilio Verify.
// Needs env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID.
import { normalisePhone, twilioVerify, json } from './lib/twilio.mjs';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let phone = null;
  let code = '';
  try {
    const body = JSON.parse(event.body || '{}');
    phone = normalisePhone(body.phone);
    code = String(body.code || '').trim();
  } catch {
    /* fall through to the 400 below */
  }
  if (!phone || !/^\d{4,10}$/.test(code)) {
    return json(400, { error: 'Please enter the 6-digit code from the SMS.' });
  }

  const res = await twilioVerify('/VerificationCheck', { To: phone, Code: code });
  if (res === null) return json(500, { error: 'Verification is not configured. Please call our office.' });
  if (res.status === 429) return json(429, { error: 'Too many attempts. Please wait a few minutes and try again.' });
  // Twilio returns 404 when the verification expired or was never started.
  if (res.status === 404) return json(410, { error: 'That code has expired. Please request a new one.' });
  if (!res.ok) return json(502, { error: "We couldn't check the code just now. Please try again." });

  const data = await res.json();
  if (data.status !== 'approved') return json(400, { error: "That code doesn't match. Please try again." });

  return json(200, { ok: true, phone });
};

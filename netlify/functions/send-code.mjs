// POST { phone } → sends a 6-digit SMS code via Twilio Verify.
// Needs env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID.
import { normalisePhone, twilioVerify, json } from './lib/twilio.mjs';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let phone = null;
  try {
    phone = normalisePhone(JSON.parse(event.body || '{}').phone);
  } catch {
    /* fall through to the 400 below */
  }
  if (!phone) return json(400, { error: 'Please enter a valid mobile number, e.g. 0412 345 678.' });

  const res = await twilioVerify('/Verifications', { To: phone, Channel: 'sms' });
  if (res === null) return json(500, { error: 'Verification is not configured. Please call our office.' });
  if (res.status === 429) return json(429, { error: 'Too many attempts. Please wait a few minutes and try again.' });
  if (!res.ok) return json(502, { error: "We couldn't send the code. Please check the number and try again." });

  return json(200, { ok: true, phone });
};

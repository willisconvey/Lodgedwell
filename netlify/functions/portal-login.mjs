// POST { phone, code } → checks the SMS code with Twilio Verify and, if it
// matches, issues a signed portal session token for that phone number.
// The code is sent by the existing send-code function (shared with /get-started).
// Needs env vars: TWILIO_* (see lib/twilio.mjs) and PORTAL_SESSION_SECRET.
import { normalisePhone, twilioVerify } from './lib/twilio.mjs';
import { res, signSession } from './lib/portal.mjs';

export default async (req) => {
  if (req.method !== 'POST') return res(405, { error: 'Method not allowed' });

  let phone = null;
  let code = '';
  try {
    const body = await req.json();
    phone = normalisePhone(body.phone);
    code = String(body.code || '').trim();
  } catch {
    /* fall through to the 400 below */
  }
  if (!phone || !/^\d{4,10}$/.test(code)) {
    return res(400, { error: 'Please enter the 6-digit code from the SMS.' });
  }

  const check = await twilioVerify('/VerificationCheck', { To: phone, Code: code });
  if (check === null) return res(500, { error: 'Verification is not configured. Please call our office.' });
  if (check.status === 429) return res(429, { error: 'Too many attempts. Please wait a few minutes and try again.' });
  // Twilio returns 404 when the verification expired or was never started.
  if (check.status === 404) return res(410, { error: 'That code has expired. Please request a new one.' });
  if (!check.ok) return res(502, { error: "We couldn't check the code just now. Please try again." });

  const data = await check.json();
  if (data.status !== 'approved') return res(400, { error: "That code doesn't match. Please try again." });

  const token = signSession(phone);
  if (!token) return res(500, { error: 'The portal is not configured yet. Please call our office.' });

  return res(200, { ok: true, token, phone });
};

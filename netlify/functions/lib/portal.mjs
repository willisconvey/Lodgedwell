// Shared helpers for the client-portal functions: JSON responses for
// Functions 2.0 handlers, HMAC session tokens, the Netlify Blobs store,
// and the milestone model that turns Clio task completions into the
// client-facing timeline shown on /portal.
import crypto from 'node:crypto';
import { getStore } from '@netlify/blobs';

// Functions 2.0 (Request/Response) equivalent of lib/twilio.mjs's json().
export const res = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

// One store holds everything, under two key families:
//   matter/<clioMatterId>  → the matter record pushed by clio-progress
//   phone/<E164>           → { matterIds: [...] } index for portal-matters
export const portalStore = () => getStore('portal');

export const matterKey = (id) => 'matter/' + id;
export const phoneKey = (phone) => 'phone/' + phone;

/* ------------------------------------------------------------------ */
/* Session tokens — signed "<payload>.<hmac>", 12-hour expiry.        */
/* Needs env var: PORTAL_SESSION_SECRET (any long random string).     */
/* ------------------------------------------------------------------ */
const SESSION_HOURS = 12;

export function signSession(phone) {
  const secret = process.env.PORTAL_SESSION_SECRET;
  if (!secret) return null;
  const payload = Buffer.from(
    JSON.stringify({ p: phone, exp: Date.now() + SESSION_HOURS * 3600 * 1000 })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return payload + '.' + sig;
}

// Returns the verified phone number, or null for anything invalid/expired.
export function verifySession(token) {
  const secret = process.env.PORTAL_SESSION_SECRET;
  if (!secret || !token) return null;
  const [payload, sig] = String(token).split('.');
  if (!payload || !sig) return null;
  try {
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!data.p || Date.now() > data.exp) return null;
    return data.p;
  } catch {
    return null;
  }
}

export const bearerToken = (req) =>
  (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '') || null;

/* ------------------------------------------------------------------ */
/* Milestone model                                                    */
/*                                                                    */
/* Each matter type has an ordered timeline. A milestone is "done"    */
/* when any completed Clio task matches it — either explicitly via a  */
/* [m:<key>] tag anywhere in the task name (recommended: add the tag  */
/* to the task templates in Clio), or by one of the phrases below     */
/* appearing in the task name. Earlier milestones are back-filled so  */
/* the timeline never shows gaps.                                     */
/* ------------------------------------------------------------------ */
export const MILESTONES = {
  purchase: [
    { key: 'open', label: 'Getting started', blurb: 'Your matter is open and your conveyancer has your details.', match: ['matter open', 'file open', 'welcome', 'engagement', 'retainer', 'costs disclosure'] },
    { key: 'review', label: 'Contract & Section 32 check', blurb: 'We go through your contract and the vendor statement and tell you anything you need to know or do.', match: ['contract review', 'review contract', 'section 32', 's32', 'vendor statement', 'advice letter'] },
    { key: 'searches', label: 'Searches & certificates', blurb: 'We order title, planning, rates and other certificates over the property.', match: ['search', 'certificate', 'title', 'planning', 'land tax', 'owners corporation'] },
    { key: 'conditions', label: 'Finance & conditions', blurb: 'Finance approval and any special conditions are confirmed.', match: ['finance', 'loan approval', 'condition', 'building inspection', 'pest inspection', 'cooling off'] },
    { key: 'prep', label: 'Preparing for settlement', blurb: 'PEXA workspace, stamp duty and settlement figures are prepared and checked.', match: ['pexa', 'workspace', 'duty', 'duties', 'sro', 'transfer of land', 'statement of adjustments', 'adjustment', 'nomination', 'book settlement', 'settlement figures', 'funds'] },
    { key: 'settlement', label: 'Settlement', blurb: 'Settlement is completed and the property is yours.', match: ['settlement complete', 'settled', 'complete settlement', 'settlement day'] },
    { key: 'post', label: 'After settlement', blurb: 'Final notices are lodged and your file is wrapped up.', match: ['notice of acquisition', 'final letter', 'close file', 'registration', 'post settlement', 'post-settlement'] },
  ],
  sale: [
    { key: 'open', label: 'Getting started', blurb: 'Your matter is open and your conveyancer has your details.', match: ['matter open', 'file open', 'welcome', 'engagement', 'retainer', 'costs disclosure'] },
    { key: 'prep32', label: 'Contract & Section 32 preparation', blurb: 'We prepare the contract of sale and vendor statement for your property.', match: ['section 32', 's32', 'vendor statement', 'prepare contract', 'contract prep', 'draft contract'] },
    { key: 'exchange', label: 'Contract signed & exchanged', blurb: 'The buyer has signed and contracts are exchanged.', match: ['exchange', 'signed contract', 'contract signed', 'deposit received', 'deposit paid'] },
    { key: 'discharge', label: 'Mortgage discharge & payout', blurb: 'Your bank is arranging the discharge and payout figure.', match: ['discharge', 'payout', 'mortgagee', 'mortgage release'] },
    { key: 'prep', label: 'Preparing for settlement', blurb: 'PEXA workspace and settlement figures are prepared and checked.', match: ['pexa', 'workspace', 'statement of adjustments', 'adjustment', 'book settlement', 'settlement figures', 'transfer of land'] },
    { key: 'settlement', label: 'Settlement', blurb: 'Settlement is completed and the sale proceeds are disbursed.', match: ['settlement complete', 'settled', 'complete settlement', 'settlement day'] },
    { key: 'post', label: 'After settlement', blurb: 'Final notices are lodged and your file is wrapped up.', match: ['notice of disposition', 'final letter', 'close file', 'post settlement', 'post-settlement'] },
  ],
  other: [
    { key: 'open', label: 'Getting started', blurb: 'Your matter is open and your conveyancer has your details.', match: ['matter open', 'file open', 'welcome', 'engagement', 'retainer'] },
    { key: 'prep', label: 'Preparing documents', blurb: 'We prepare and lodge the documents for your matter.', match: ['prepare', 'draft', 'duty', 'duties', 'transfer', 'pexa', 'lodge'] },
    { key: 'settlement', label: 'Completion', blurb: 'Your matter is completed.', match: ['settled', 'settlement complete', 'complete', 'registered'] },
    { key: 'post', label: 'Wrap up', blurb: 'Final notices are lodged and your file is closed.', match: ['final letter', 'close file', 'post settlement'] },
  ],
};

export function normaliseMatterType(raw) {
  const s = String(raw || '').toLowerCase();
  if (/purchas|buy/.test(s)) return 'purchase';
  if (/sale|sell|vendor/.test(s)) return 'sale';
  return 'other';
}

// tasks: [{ name, complete, completed_at }] → timeline for the dashboard.
// Raw task names never leave the server; clients only see milestone labels.
export function computeMilestones(type, tasks) {
  const timeline = MILESTONES[type] || MILESTONES.other;
  const done = tasks.filter((t) => t.complete);

  const hits = timeline.map((m) => {
    const tag = '[m:' + m.key + ']';
    const matching = done.filter((t) => {
      const name = String(t.name || '').toLowerCase();
      return name.includes(tag) || m.match.some((phrase) => name.includes(phrase));
    });
    const dates = matching.map((t) => t.completed_at).filter(Boolean).sort();
    return { hit: matching.length > 0, completed_at: dates[dates.length - 1] || null };
  });

  // Back-fill so a completed later stage never leaves an earlier gap.
  const lastDone = hits.reduce((last, h, i) => (h.hit ? i : last), -1);

  return timeline.map((m, i) => ({
    key: m.key,
    label: m.label,
    blurb: m.blurb,
    state: i <= lastDone ? 'done' : i === lastDone + 1 ? 'current' : 'todo',
    completed_at: hits[i].completed_at,
  }));
}

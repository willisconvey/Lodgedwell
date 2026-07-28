// Ingest endpoint for matter progress. Make.com (fed by Clio) POSTs the
// matter, client and task list here whenever a task is completed; the
// record is stored in Netlify Blobs for the /portal dashboard to read.
//
// POST with header "x-portal-secret: $PORTAL_INGEST_SECRET" and body:
// {
//   "matter": { "id": 123, "display_number": "00012-Smith", "description": "...",
//               "type": "purchase" | "sale" | "...", "address": "12 Example St ..." },
//   "client": { "name": "Jane Smith", "phone": "0412 345 678" },
//   "tasks":  [ { "name": "Order searches", "complete": true, "completed_at": "2026-07-28" }, ... ]
// }
// Send the matter's FULL task list each time — the record is replaced, not merged.
import { normalisePhone } from './lib/twilio.mjs';
import { res, portalStore, matterKey, phoneKey, normaliseMatterType } from './lib/portal.mjs';

export default async (req) => {
  if (req.method !== 'POST') return res(405, { error: 'Method not allowed' });

  const secret = process.env.PORTAL_INGEST_SECRET;
  if (!secret) return res(500, { error: 'PORTAL_INGEST_SECRET is not set' });
  if (req.headers.get('x-portal-secret') !== secret) return res(401, { error: 'Unauthorized' });

  let body;
  try {
    body = await req.json();
  } catch {
    return res(400, { error: 'Body must be JSON' });
  }

  const matterId = String(body?.matter?.id || '').trim();
  const phone = normalisePhone(body?.client?.phone);
  if (!matterId) return res(400, { error: 'matter.id is required' });
  if (!phone) return res(400, { error: 'client.phone is missing or not a valid mobile number' });

  const tasks = (Array.isArray(body.tasks) ? body.tasks : [])
    .filter((t) => t && t.name)
    .map((t) => ({
      name: String(t.name),
      // Accept either a boolean `complete` or a Clio-style status string.
      complete: t.complete === true || /^(complete|completed|done)$/i.test(String(t.status || '')),
      completed_at: t.completed_at || null,
    }));

  const store = portalStore();
  const key = matterKey(matterId);
  const prev = await store.get(key, { type: 'json' });

  const record = {
    id: matterId,
    display_number: body.matter.display_number || null,
    description: body.matter.description || null,
    address: body.matter.address || null,
    type: normaliseMatterType(body.matter.type),
    client: { name: body.client.name || null, phone },
    tasks,
    updated_at: new Date().toISOString(),
  };
  await store.setJSON(key, record);

  // Maintain the phone → matters index, including when the phone on the
  // matter changes (remove it from the old number's list first).
  const oldPhone = prev?.client?.phone;
  if (oldPhone && oldPhone !== phone) {
    const oldIndex = await store.get(phoneKey(oldPhone), { type: 'json' });
    if (oldIndex?.matterIds?.includes(matterId)) {
      await store.setJSON(phoneKey(oldPhone), {
        matterIds: oldIndex.matterIds.filter((id) => id !== matterId),
      });
    }
  }
  const index = (await store.get(phoneKey(phone), { type: 'json' })) || { matterIds: [] };
  if (!index.matterIds.includes(matterId)) {
    index.matterIds.push(matterId);
    await store.setJSON(phoneKey(phone), index);
  }

  return res(200, {
    ok: true,
    matter: matterId,
    type: record.type,
    tasks: tasks.length,
    completed: tasks.filter((t) => t.complete).length,
  });
};

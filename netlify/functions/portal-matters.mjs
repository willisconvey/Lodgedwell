// GET with "Authorization: Bearer <token>" → the signed-in client's matters
// with their milestone timelines, read from the Netlify Blobs portal store.
// Raw Clio task names stay server-side; only milestone labels are returned.
import {
  res,
  bearerToken,
  verifySession,
  portalStore,
  phoneKey,
  matterKey,
  computeMilestones,
} from './lib/portal.mjs';

export default async (req) => {
  if (req.method !== 'GET') return res(405, { error: 'Method not allowed' });

  const phone = verifySession(bearerToken(req));
  if (!phone) return res(401, { error: 'Your session has expired. Please sign in again.' });

  const store = portalStore();
  const index = (await store.get(phoneKey(phone), { type: 'json' })) || { matterIds: [] };

  const matters = (
    await Promise.all(
      index.matterIds.map((id) => store.get(matterKey(id), { type: 'json' }))
    )
  )
    .filter(Boolean)
    .map((m) => {
      const milestones = computeMilestones(m.type, m.tasks || []);
      return {
        id: m.id,
        display_number: m.display_number || null,
        description: m.description || null,
        address: m.address || null,
        type: m.type,
        updated_at: m.updated_at || null,
        milestones,
        progress: {
          done: milestones.filter((s) => s.state === 'done').length,
          total: milestones.length,
        },
      };
    })
    .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));

  return res(200, { ok: true, phone, matters });
};

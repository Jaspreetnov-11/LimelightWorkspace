// Library > Videos (/api/renders): the finished renders of every Edit project this person may open.
// (The picture Library comes from Studio - see design.mjs.)
import { NEXT, send } from '../core.mjs';
import { apps, targetOf } from '../app-list.mjs';
import { editAs } from './edit.mjs';

// Library > Videos: the finished renders of every Edit project this person may open (Edit decides who sees what: asked as
// them, with the workspace key). Played straight from the Edit proxy (Range, so seeking works). Kept 2 minutes a person.
const rendersCache = new Map();
async function renders(user) {
  const hit = rendersCache.get(user.email);
  if (hit && Date.now() - hit.at < 120e3) return hit.list;
  const as = await editAs(user);
  if (!as) return { needEdit: true, items: [] };
  const t = new URL(targetOf(apps().find((x) => x.id === 'editor')));
  const get = async (p) => { const r = await fetch(t.origin + p, { headers: as, signal: AbortSignal.timeout(10000) }); if (!r.ok) throw new Error(`Edit said ${r.status}`); return r.json(); };
  const projects = await get('/api/projects');
  const items = [];
  for (let i = 0; i < projects.length; i += 6) { // (six projects at a time)
    await Promise.all(projects.slice(i, i + 6).map(async (p) => {
      const rs = await get(`/api/renders?p=${encodeURIComponent(p.name)}`).catch(() => []);
      for (const r of rs) if (/\.(mp4|mov|webm)$/i.test(r.name))
        items.push({ title: r.name.replace(/\.[^.]+$/, ''), file: r.name, project: p.name, by: p.by || '', aspect: p.aspect || '16:9',
          size: r.size, at: r.mtime, url: r.url, thumb: p.thumb || '' });
    }));
  }
  items.sort((a, b) => b.at - a.at);
  const list = { items, as: as['x-lh-edit'] };
  rendersCache.set(user.email, { at: Date.now(), list });
  return list;
}

export async function route(req, res, { u, p, user }) {
  if (p === '/api/renders') { if (u.searchParams.get('fresh')) rendersCache.delete(user.email); return send(res, 200, await renders(user)); }
  return NEXT;
}

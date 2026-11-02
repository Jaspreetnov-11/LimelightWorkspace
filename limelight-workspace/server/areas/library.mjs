// Library: one Reels-style feed of every finished output (/api/feed), for every signed-in person (owner, 2 Nov: "sabko
// dikhe" - everyone sees everything). Sources: Edit renders, Design's AI pictures / 3D renders / exports, Limelight AI's
// pictures and videos. Edit and the AI are streamed through here (/api/feed/file) so nobody needs their own access there.
// Not in it: raw uploads, AI fill options, project files, chats - anything that is not a finished output.
// (/api/renders, the older per-person list of Edit renders, stays for now.)
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { config, ROOT } from '../config.mjs';
import { NEXT, send } from '../core.mjs';
import { apps, targetOf } from '../app-list.mjs';
import { auth, isOwner } from '../state.mjs';
import { editAs } from './edit.mjs';
import { aiAs } from './ai.mjs';

const target = (id) => { const a = apps().find((x) => x.id === id); return a ? new URL(targetOf(a)).origin : ''; };
const getJson = async (url, headers, ms = 10000) => { const r = await fetch(url, { headers, signal: AbortSignal.timeout(ms) }); if (!r.ok) throw new Error(`said ${r.status}`); return r.json(); };

// Edit's finished renders of the projects `as` may open (Edit decides: asked with the workspace key and that Edit name)
async function editRenders(as) {
  const t = target('editor'), get = (p) => getJson(t + p, as);
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
  return items.sort((a, b) => b.at - a.at);
}

// Library > Videos (older list): the renders this person may open in Edit. Kept 2 minutes a person.
const rendersCache = new Map();
async function renders(user) {
  const hit = rendersCache.get(user.email);
  if (hit && Date.now() - hit.at < 120e3) return hit.list;
  const as = await editAs(user);
  if (!as) return { needEdit: true, items: [] };
  const list = { items: await editRenders(as), as: as['x-lh-edit'] };
  rendersCache.set(user.email, { at: Date.now(), list });
  return list;
}

// the feed sees Edit as an owner (Edit shows an owner every project); found among the owners signed in here
let ownerEdit = { at: 0, as: null };
async function editAsOwner() {
  if (ownerEdit.as && Date.now() - ownerEdit.at < 600e3) return ownerEdit.as;
  for (const u of auth.users().filter(isOwner)) {
    const as = await editAs(u).catch(() => null);
    if (as) { ownerEdit = { at: Date.now(), as }; return as; }
  }
  return null;
}

const STUDIO = path.resolve(ROOT, config.studioDir || '../limelight-studio');
const IMG = /\.(png|jpe?g|webp|gif)$/i;
const nice = (s) => s.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();

// Design: its finished pictures (Create / Design AI pictures ai_*, 3D renders 3d-render_*) and its exports (a design's
// "all formats" folder, shown by its PNG/JPG and downloaded as its .zip; or a single exported picture)
async function designItems() {
  const items = [];
  const lib = path.join(STUDIO, 'Library');
  for (const f of await fsp.readdir(lib).catch(() => [])) {
    const ai = /^ai_\d+/.test(f), r3 = /^3d-render_/.test(f);
    if (!(ai || r3) || !IMG.test(f)) continue;
    const st = await fsp.stat(path.join(lib, f)).catch(() => null); if (!st) continue;
    items.push({ kind: 'image', app: ai ? 'create' : 'design', title: ai ? 'AI picture' : '3D render', at: st.mtimeMs, size: st.size,
      src: `/library/${encodeURIComponent(f)}`, file: f, open: ai ? { view: 'create' } : { app: 'design' } });
  }
  const ex = path.join(STUDIO, 'Exports');
  for (const d of await fsp.readdir(ex, { withFileTypes: true }).catch(() => [])) {
    const url = (...p) => '/exports/' + p.map(encodeURIComponent).join('/');
    if (d.isDirectory()) {
      const files = await fsp.readdir(path.join(ex, d.name)).catch(() => []);
      const pic = files.find((f) => /\.png$/i.test(f)) || files.find((f) => IMG.test(f)); if (!pic) continue;
      const st = await fsp.stat(path.join(ex, d.name, pic)).catch(() => null); if (!st) continue;
      const zip = fs.existsSync(path.join(ex, d.name + '.zip'));
      items.push({ kind: 'image', app: 'design', title: nice(d.name.replace(/ - all formats.*$/i, '')), note: `${files.length} formats`,
        at: st.mtimeMs, src: url(d.name, pic), file: zip ? d.name + '.zip' : pic, dl: zip ? url(d.name + '.zip') : url(d.name, pic), open: { app: 'design' } });
    } else if (IMG.test(d.name)) {
      const st = await fsp.stat(path.join(ex, d.name)).catch(() => null); if (!st) continue;
      items.push({ kind: 'image', app: 'design', title: nice(d.name.replace(/\.[^.]+$/, '')), at: st.mtimeMs, size: st.size,
        src: url(d.name), file: d.name, open: { app: 'design' } });
    }
  }
  return items;
}

// Limelight AI (NAYA B): its picture and video galleries
async function aiItems(user) {
  const t = target('ai'), as = aiAs(user); if (!t || !as) return [];
  const [pics, vids] = await Promise.all([getJson(t + '/api/images', as, 6000).catch(() => []), getJson(t + '/api/videos', as, 6000).catch(() => [])]);
  const file = (u) => `/api/feed/file?from=ai&u=${encodeURIComponent(u)}`;
  return [
    ...(Array.isArray(pics) ? pics : []).filter((m) => m.url).map((m) => ({ kind: 'image', app: 'ai', title: m.prompt ? String(m.prompt).slice(0, 120) : 'AI picture',
      at: (m.created || 0) * 1000, src: file(m.url), file: m.file, open: { app: 'ai' }, share: m.url })),
    ...(Array.isArray(vids) ? vids : []).filter((m) => m.url).map((m) => ({ kind: 'video', app: 'ai', title: m.prompt ? String(m.prompt).slice(0, 120) : 'AI video',
      at: (m.created || 0) * 1000, src: file(m.url), poster: m.poster ? file(m.poster) : '', file: m.file, aspect: m.aspect, open: { app: 'ai' }, share: m.url })),
  ];
}

// the whole feed, newest first; kept 90 s for everyone (it is the same for everyone). A source that fails is named in `down`.
let feedCache = { at: 0, data: null, busy: null };
async function feed(user, fresh) {
  if (!fresh && feedCache.data && Date.now() - feedCache.at < 90e3) return feedCache.data;
  if (feedCache.busy) return feedCache.busy;
  feedCache.busy = (async () => {
    const down = [];
    const edit = (async () => {
      const as = await editAsOwner() || await editAs(user);
      if (!as) { down.push('Edit'); return []; }
      return (await editRenders(as)).map((r) => ({ kind: 'video', app: 'edit', title: r.title, project: r.project, by: r.by, at: r.at, size: r.size,
        aspect: r.aspect, file: r.file, src: `/api/feed/file?from=edit&u=${encodeURIComponent(r.url)}`,
        poster: r.thumb ? `/api/feed/file?from=edit&u=${encodeURIComponent(r.thumb)}` : '', open: { app: 'editor', path: '/#/p/' + encodeURIComponent(r.project) } }));
    })().catch(() => { down.push('Edit'); return []; });
    const design = designItems().catch(() => { down.push('Design'); return []; });
    const ai = aiItems(user).catch(() => { down.push('Limelight AI'); return []; });
    const items = (await Promise.all([edit, design, ai])).flat().sort((a, b) => b.at - a.at);
    const data = { items, down, at: Date.now() };
    feedCache = { at: Date.now(), data, busy: null };
    return data;
  })().finally(() => { feedCache.busy = null; });
  return feedCache.busy;
}

// a file of the feed from Edit or Limelight AI, streamed through here (Range passes through, so videos seek).
// Only render files and thumbnails of Edit, and the picture / video galleries of the AI.
const ALLOW = { edit: /^\/(pf\/[^/]+\/renders\/[^/]+\.(mp4|mov|webm)|pm\/[^/]+\/[^/]+\/thumb)$/i, ai: /^\/(images\/img_[\w.-]+\.png|videos\/vid_[\w.-]+\.(mp4|jpg))$/i };
async function feedFile(req, res, u, user) {
  const from = u.searchParams.get('from'), p = String(u.searchParams.get('u') || '').split('?')[0];
  if (!ALLOW[from]?.test(p) || p.includes('..')) return send(res, 404, { error: 'not in the Library' });
  const as = from === 'edit' ? (await editAsOwner() || await editAs(user)) : aiAs(user);
  if (!as) return send(res, 503, { error: `${from === 'edit' ? 'Edit' : 'Limelight AI'} is not reachable` });
  const headers = { ...as, ...(req.headers.range ? { range: req.headers.range } : {}) };
  let r;
  try { r = await fetch(target(from === 'edit' ? 'editor' : 'ai') + p, { headers, signal: AbortSignal.timeout(15000) }); }
  catch { return send(res, 502, { error: 'The app did not answer' }); }
  const out = { 'Cache-Control': 'private, max-age=3600', 'Accept-Ranges': 'bytes' };
  for (const h of ['content-type', 'content-length', 'content-range', 'last-modified', 'etag']) if (r.headers.get(h)) out[h] = r.headers.get(h);
  if (u.searchParams.get('dl')) out['Content-Disposition'] = `attachment; filename*=UTF-8''${encodeURIComponent(path.basename(decodeURIComponent(p)))}`;
  res.writeHead(r.status, out);
  if (!r.body || req.method === 'HEAD') return res.end();
  const s = Readable.fromWeb(r.body); s.on('error', () => res.destroy()); req.on('close', () => s.destroy()); s.pipe(res);
}

export async function route(req, res, { u, p, user }) {
  if (p === '/api/feed') return send(res, 200, await feed(user, !!u.searchParams.get('fresh')));
  if (p === '/api/feed/file') return feedFile(req, res, u, user);
  if (p === '/api/renders') { if (u.searchParams.get('fresh')) rendersCache.delete(user.email); return send(res, 200, await renders(user)); }
  return NEXT;
}

// Library: one Reels-style feed of every finished output (/api/feed), for every signed-in person (owner, 2 Nov: "sabko
// dikhe" - everyone sees everything). Sources: Edit renders, Design's AI pictures / 3D renders / exports, Limelight AI's
// pictures and videos. Edit and the AI are streamed through here (/api/feed/file) so nobody needs their own access there.
// Not in it: raw uploads, AI fill options, project files, chats - anything that is not a finished output.
// Speed (2 Nov, the site is reached through Cloudflare, ~0.6 s a request): pictures are shown as small WebP previews
// (1080 px on the long side, made once with ffmpeg and kept in cache/feed-previews; Download still gives the original),
// and the list is answered at once from the last one while a new one is built in the background.
// (/api/renders, the older per-person list of Edit renders, stays for now.)
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
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
      src: studioPreview(`Library/${f}`, st), dl: `/library/${encodeURIComponent(f)}`, file: f, open: ai ? { view: 'create' } : { app: 'design' } });
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
        at: st.mtimeMs, src: studioPreview(`Exports/${d.name}/${pic}`, st), file: zip ? d.name + '.zip' : pic, dl: zip ? url(d.name + '.zip') : url(d.name, pic), open: { app: 'design' } });
    } else if (IMG.test(d.name)) {
      const st = await fsp.stat(path.join(ex, d.name)).catch(() => null); if (!st) continue;
      items.push({ kind: 'image', app: 'design', title: nice(d.name.replace(/\.[^.]+$/, '')), at: st.mtimeMs, size: st.size,
        src: studioPreview(`Exports/${d.name}`, st), dl: url(d.name), file: d.name, open: { app: 'design' } });
    }
  }
  return items;
}

// Limelight AI (NAYA B): its picture and video galleries
async function aiItems(user) {
  const t = target('ai'), as = aiAs(user); if (!t || !as) return [];
  const [pics, vids] = await Promise.all([getJson(t + '/api/images', as, 6000).catch(() => []), getJson(t + '/api/videos', as, 6000).catch(() => [])]);
  const file = (u) => `/api/feed/file?from=ai&u=${encodeURIComponent(u)}`, prev = (u) => `/api/feed/preview?from=ai&u=${encodeURIComponent(u)}`;
  return [
    ...(Array.isArray(pics) ? pics : []).filter((m) => m.url).map((m) => ({ kind: 'image', app: 'ai', title: m.prompt ? String(m.prompt).slice(0, 120) : 'AI picture',
      at: (m.created || 0) * 1000, src: prev(m.url), dl: file(m.url) + '&dl=1', file: m.file, open: { app: 'ai' }, share: m.url })),
    ...(Array.isArray(vids) ? vids : []).filter((m) => m.url).map((m) => ({ kind: 'video', app: 'ai', title: m.prompt ? String(m.prompt).slice(0, 120) : 'AI video',
      at: (m.created || 0) * 1000, src: file(m.url), poster: m.poster ? prev(m.poster) : '', file: m.file, aspect: m.aspect, open: { app: 'ai' }, share: m.url })),
  ];
}

// the whole feed, newest first (the same for everyone). A source that fails is named in `down`.
// Answered at once from the last list; when that is over 90 s old a new one is built in the background for the next person.
let feedCache = { at: 0, data: null, busy: null };
function feed(user, fresh) {
  if (!fresh && feedCache.data) { if (Date.now() - feedCache.at > 90e3) buildFeed(user).catch(() => {}); return feedCache.data; }
  return buildFeed(user);
}
async function buildFeed(user) {
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
    warmPreviews(items);
    return data;
  })().finally(() => { feedCache.busy = null; });
  return feedCache.busy;
}

// ---- picture previews: 1080 px on the long side, WebP, made once (ffmpeg) and kept on disk ----
const PREV = path.join(ROOT, 'cache', 'feed-previews');
const FFMPEG = config.ffmpeg || 'ffmpeg';
// a Studio picture's preview link (its change time is in the link, so a changed picture gets a new preview)
function studioPreview(rel, st) { return `/api/feed/preview?from=studio&u=${encodeURIComponent(rel)}&t=${Math.round(st.mtimeMs).toString(36)}`; }
const STUDIO_OK = /^(Library\/(ai_\d|3d-render_)[^/]+|Exports\/[^/]+(\/[^/]+)?)\.(png|jpe?g|webp)$/i;
const AI_PIC = /^\/(images\/img_[\w.-]+\.png|videos\/vid_[\w.-]+\.jpg)$/i;
const making = new Map(); let running = 0; const waiting = [];
const slot = () => (running < 2 ? (running++, Promise.resolve()) : new Promise((r) => waiting.push(r)));
const free = () => { const next = waiting.shift(); if (next) next(); else running--; };
const ffmpeg = (args) => new Promise((resolve, reject) => execFile(FFMPEG, args, { windowsHide: true, timeout: 60000 }, (err) => (err ? reject(err) : resolve())));

// the preview file of one picture (made now if it is not there yet); null if that picture may not be in the feed
async function previewFile(from, u, t, user) {
  if (from === 'studio' ? !STUDIO_OK.test(u) : from === 'ai' ? !AI_PIC.test(u) : true) return null;
  if (u.includes('..')) return null;
  const out = path.join(PREV, crypto.createHash('sha1').update(`${from}|${u}|${t}`).digest('hex').slice(0, 24) + '.webp');
  if (fs.existsSync(out)) return out;
  if (!making.has(out)) making.set(out, (async () => {
    await slot();
    let tmp = '';
    try {
      await fsp.mkdir(PREV, { recursive: true });
      let src = path.join(STUDIO, ...u.split('/'));
      if (from === 'ai') { // (the AI's picture is fetched once into a temporary file)
        const as = aiAs(user); if (!as) throw new Error('Limelight AI is not reachable');
        const r = await fetch(target('ai') + u, { headers: as, signal: AbortSignal.timeout(30000) });
        if (!r.ok) throw new Error(`Limelight AI said ${r.status}`);
        src = tmp = out + '.src'; await fsp.writeFile(tmp, Buffer.from(await r.arrayBuffer()));
      }
      await ffmpeg(['-v', 'error', '-y', '-i', src, '-frames:v', '1', '-vf', "scale='min(1080,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease",
        '-c:v', 'libwebp', '-quality', '78', '-f', 'webp', out + '.part']);
      await fsp.rename(out + '.part', out);
      return out;
    } finally { free(); if (tmp) fsp.rm(tmp, { force: true }).catch(() => {}); making.delete(out); }
  })());
  return making.get(out);
}
// after each new list the pictures with no preview yet get one (two at a time), so nobody waits for one
function warmPreviews(items) {
  const u0 = auth.users().find(isOwner) || {};
  for (const v of items) {
    const m = /^\/api\/feed\/preview\?(.*)$/.exec((v.kind === 'image' ? v.src : v.poster) || ''); if (!m) continue;
    const q = new URLSearchParams(m[1]);
    previewFile(q.get('from'), q.get('u'), q.get('t') || '', u0).catch(() => {});
  }
}
async function feedPreview(req, res, u, user) {
  const from = u.searchParams.get('from'), p = String(u.searchParams.get('u') || ''), t = u.searchParams.get('t') || '';
  let file;
  try { file = await previewFile(from, p, t, user); }
  catch { // (no preview could be made: the original picture instead)
    const orig = from === 'studio' ? '/' + p.split('/').map((x, i) => (i ? encodeURIComponent(x) : x.toLowerCase())).join('/') : `/api/feed/file?from=ai&u=${encodeURIComponent(p)}`;
    res.writeHead(302, { Location: orig, 'Cache-Control': 'no-store' }); return res.end();
  }
  if (!file) return send(res, 404, { error: 'not in the Library' });
  const st = await fsp.stat(file);
  res.writeHead(200, { 'Content-Type': 'image/webp', 'Content-Length': st.size, 'Cache-Control': 'private, max-age=31536000, immutable' });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
}

// the list is made once soon after the server starts, so the first person does not wait for it
setTimeout(() => { const u0 = auth.users().find(isOwner); if (u0) buildFeed(u0).catch(() => {}); }, 4000);

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
  if (p === '/api/feed/preview') return feedPreview(req, res, u, user);
  if (p === '/api/renders') { if (u.searchParams.get('fresh')) rendersCache.delete(user.email); return send(res, 200, await renders(user)); }
  return NEXT;
}

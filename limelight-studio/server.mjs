// Limelight Studio - local design app server (no npm dependencies).
// node server.mjs [--open] [--lan]   ->  http://localhost:3330
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { exec, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');
const DIRS = {
  projects: path.join(ROOT, 'Projects'),
  library: path.join(ROOT, 'Library'),
  exports: path.join(ROOT, 'Exports'),
};
for (const d of Object.values(DIRS)) fs.mkdirSync(d, { recursive: true });

const CONFIG_FILE = path.join(ROOT, 'config.json');
const defaults = { port: 3330, aiUrl: 'http://192.168.0.205:8800', aiPassword: '' };
const config = { ...defaults, ...(fs.existsSync(CONFIG_FILE) ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) : {}) };
if (!fs.existsSync(CONFIG_FILE)) fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

const args = process.argv.slice(2);
const LAN = args.includes('--lan');
const PORT = Number(process.env.STUDIO_PORT || process.env.PORT || config.port);

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf', '.pdf': 'application/pdf',
  '.psd': 'image/vnd.adobe.photoshop',
};

const safeName = (s) => String(s || '').replace(/[<>:"/\\|?*\x00-\x1f]/g, '').trim().slice(0, 120) || 'Untitled';
const safeId = (s) => /^[a-z0-9_-]{1,64}$/i.test(s || '') ? s : null;

function send(res, code, body, type = 'application/json') {
  const data = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(data);
}

function readBody(req, limit = 300 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
const readJson = async (req) => JSON.parse((await readBody(req)).toString('utf8') || '{}');

// Exports, or a folder in it for one design's files in every format (made when first written)
function exportDir(folder) {
  if (!folder) return DIRS.exports;
  const d = path.join(DIRS.exports, safeName(folder));
  fs.mkdirSync(d, { recursive: true });
  return d;
}
const exportUrl = (f) => '/exports/' + path.relative(DIRS.exports, f).split(path.sep).map(encodeURIComponent).join('/');
// 🔤 the fonts as Windows (and so CorelDRAW) names them: a family is installed one file per weight ("Inter 18pt Black",
// "Mukta ExtraBold"), and CorelDRAW only finds the weight by that name - "Inter" at weight 900 would come out regular
const WEIGHTS = { 100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' };
// CorelDRAW's SVG reader knows only normal / bold, so tools/corel.vbs sets each text's font after the import, by the
// name in the Windows font list ("Inter 18pt Black (TrueType)" -> "Inter 18pt Black"): one line per <text>, in order,
// "font|bold|italic" (an empty line: leave it as read)
let faces = null;
function installedFaces() {
  if (faces) return faces;
  faces = new Map(); // lower case -> as written
  for (const hive of ['HKLM', 'HKCU']) {
    try {
      const out = execSync(`reg query "${hive}\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts"`, { encoding: 'utf8', windowsHide: true });
      for (const m of out.matchAll(/^\s+(.+?) \((TrueType|OpenType)\)\s+REG_SZ/gm)) for (const f of m[1].split(' & ')) faces.set(f.trim().toLowerCase(), f.trim());
    } catch { /* not Windows, or no access */ }
  }
  return faces;
}
function corelFonts(svg) {
  const have = installedFaces();
  return [...svg.matchAll(/<text\b[^>]*>/g)].map(([tag]) => {
    const fam = /font-family="([^"]+)"/.exec(tag)?.[1]?.replace(/^'|'$/g, ''); if (!fam || !have.size) return '';
    const raw = /font-weight="([^"]+)"/.exec(tag)?.[1] || '400', italic = /font-style="italic"/.test(tag);
    const w = raw === 'bold' ? 700 : raw === 'normal' ? 400 : Math.min(900, Math.max(100, Math.round((+raw || 400) / 100) * 100));
    const name = WEIGHTS[w], it = italic ? ' italic' : '';
    for (const opt of ['', ' 18pt', ' 24pt', ' 28pt', ' 36pt', ' 48pt', ' 72pt']) {
      const base = `${fam}${opt}`.toLowerCase();
      // Regular and Bold are the family itself (bold on); every other weight is a font of its own name
      if (name === 'Regular' && (have.has(base) || have.has(`${base} regular`) || (italic && have.has(`${base} italic`)))) return `${fam}${opt}|0|${italic ? 1 : 0}`;
      if (name === 'Bold' && have.has(`${base} bold${it}`)) return `${fam}${opt}|1|${italic ? 1 : 0}`;
      if (have.has(`${base} ${name.toLowerCase()}${it}`) || have.has(`${base} ${name.toLowerCase()}`)) return `${have.get(`${base} ${name.toLowerCase()}`) || `${fam}${opt} ${name}`}|0|${italic ? 1 : 0}`;
    }
    return '';
  });
}
// CorelDRAW runs one design at a time (tools/corel.vbs): -> [{ ext, path, url }] for the formats it made
let corelBusy = Promise.resolve();
function corel(svg, base, formats) {
  const run = () => new Promise((ok, bad) => exec(`cscript //nologo "${path.join(ROOT, 'tools', 'corel.vbs')}" "${svg}" "${base}" "${formats.join(',')}"`,
    { timeout: 900e3, windowsHide: true }, (e, out) => {
      const lines = String(out || '').split(/\r?\n/).filter(Boolean);
      const files = lines.filter((l) => l.startsWith('ok ')).map((l) => { const [, ext, ...f] = l.split(' '); const file = f.join(' '); return { ext, path: file, url: exportUrl(file) }; });
      const fails = lines.filter((l) => l.startsWith('fail '));
      if (!files.length) return bad(new Error(fails.join('; ').replace(/^fail \S+ /, '') || (e ? 'CorelDRAW is not available on this PC' : 'Nothing was made')));
      ok(files);
    }));
  const r = corelBusy.then(run, run); corelBusy = r.catch(() => {});
  return r;
}

function dataUrlToBuffer(dataUrl) {
  const m = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl || '');
  if (!m) throw new Error('bad data url');
  return { mime: m[1], buf: Buffer.from(m[2], 'base64') };
}
const extFor = (mime) => ({ 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/svg+xml': '.svg', 'image/gif': '.gif' }[mime] || '.bin');

async function serveFile(res, file, root) {
  const resolved = path.resolve(file);
  if (!resolved.startsWith(path.resolve(root))) return send(res, 403, { error: 'forbidden' });
  try {
    const st = await fsp.stat(resolved);
    if (st.isDirectory()) return serveFile(res, path.join(resolved, 'index.html'), root);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(resolved).toLowerCase()] || 'application/octet-stream',
      'Content-Length': st.size, 'Cache-Control': root === PUBLIC ? 'no-cache' : 'max-age=3600' });
    fs.createReadStream(resolved).pipe(res);
  } catch { send(res, 404, { error: 'not found' }); }
}

// ---------- projects ----------
async function listProjects() {
  const out = [];
  for (const f of await fsp.readdir(DIRS.projects)) {
    if (!f.endsWith('.json')) continue;
    try {
      const p = JSON.parse(await fsp.readFile(path.join(DIRS.projects, f), 'utf8'));
      out.push({ id: p.id, name: p.name, width: p.width, height: p.height, pages: p.pages?.length || 0,
        updated: p.updated, thumb: fs.existsSync(path.join(DIRS.projects, p.id + '.png')) ? `/projects/${p.id}.png?t=${p.updated}` : null });
    } catch { /* skip broken file */ }
  }
  return out.sort((a, b) => (b.updated || 0) - (a.updated || 0));
}

// ---------- AI (Limelight AI server on NAYA B) ----------
let aiCookie = '';
// (no AI password needed: the office key Lighthouse uses for the AI server, which B accepts in its place)
const aiKey = () => { try { return fs.readFileSync(config.aiKeyFile || path.join(ROOT, '..', 'limelight-workspace', 'Data', 'ai.key'), 'utf8').trim(); } catch { return ''; } };
// NAYA B first; it refusing (no password / key yet) or not answering = Limelight AI on this PC (no password, SDXL only).
// at: one server only (a picture is fetched from the server that made it); r.aiBase says which one answered.
const aiLocal = () => (config.aiLocalUrl ?? 'http://127.0.0.1:8800').replace(/\/$/, '');
async function aiFetch(p, opts = {}, at) {
  const key = aiKey();
  const one = async (base) => {
    const go = () => fetch(base + p, { ...opts, headers: { ...(opts.headers || {}), ...(aiCookie && base !== aiLocal() ? { Cookie: aiCookie } : {}),
      ...(key ? { 'x-lh-key': key, 'x-lh-user': 'studio' } : {}) } });
    let r = await go();
    if (r.status === 401 && config.aiPassword && base !== aiLocal()) {
      const l = await fetch(base + '/api/login', { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: config.aiPassword }) });
      const c = l.headers.get('set-cookie'); if (c) aiCookie = c.split(';')[0];
      r = await go();
    }
    r.aiBase = base;
    return r;
  };
  if (at) return one(at);
  const bases = [...new Set([config.aiUrl.replace(/\/$/, ''), aiLocal()].filter(Boolean))];
  let last;
  for (const [i, base] of bases.entries()) {
    try { last = await one(base); } catch (e) { if (i === bases.length - 1) throw e; continue; }
    if (last.status !== 401 || i === bases.length - 1) return last;
  }
  return last;
}

async function aiImage(body) {
  const r = await aiFetch('/api/images/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: body.prompt, negative: body.negative || '', preset: body.preset || 'fast',
      width: body.width, height: body.height, count: Math.min(4, body.count || 1) }) });
  if (!r.ok) throw new Error(`AI server: ${r.status} ${(await r.text()).slice(0, 200)}`);
  const list = await r.json();
  const saved = [];
  for (const it of list) {
    const img = await aiFetch(it.url, {}, r.aiBase);
    const buf = Buffer.from(await img.arrayBuffer());
    const name = `ai_${Date.now()}_${saved.length}.png`;
    await fsp.writeFile(path.join(DIRS.library, name), buf);
    saved.push({ name, url: `/library/${encodeURIComponent(name)}` });
  }
  return saved;
}
// a picture from the AI server's gallery, kept in Library
async function keepAiPicture(url, tag, at) {
  const img = await aiFetch(url, {}, at);
  if (!img.ok) throw new Error(`AI server: picture ${img.status}`);
  const name = `${tag}_${Date.now()}.png`;
  await fsp.writeFile(path.join(DIRS.library, name), Buffer.from(await img.arrayBuffer()));
  return { name, url: `/library/${encodeURIComponent(name)}` };
}
// ✨ generative fill: Qwen-Image-Edit on NAYA B changes the picture by the instruction. The AI server's own edit route
// when it has one, else its chat (which hands an attached photo + an edit to edit_image); the chat is deleted after.
async function aiEdit({ image, prompt }) {
  const b64 = String(image || '').split(',').pop();
  if (!b64) throw new Error('No picture to edit');
  const json = (body) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const direct = await aiFetch('/api/images/edit', json({ image: b64, instruction: prompt }));
  if (direct.ok) return keepAiPicture((await direct.json()).url, 'genfill', direct.aiBase);
  if (direct.status === 401) throw new Error('The AI server needs its password (Lighthouse account menu → AI password, or Studio AI settings)');
  // (never a fresh picture from the words in its place - that pasted unrelated pictures. Only a page from before
  // Generative Fill moved to /api/ai/inpaint still asks here)
  if (direct.aiBase === aiLocal() && direct.aiBase !== config.aiUrl.replace(/\/$/, '')) throw new Error('Studio was updated — reload the page (Ctrl+F5) and try again');
  if (![404, 405].includes(direct.status)) throw new Error(`AI server: ${direct.status} ${(await direct.text()).slice(0, 200)}`);
  const c = await aiFetch('/api/conversations', json({ mode: 'chat' }), direct.aiBase);
  if (!c.ok) throw new Error(c.status === 401 ? 'The AI server needs its password (Lighthouse account menu → AI password, or Studio AI settings)' : `AI server: ${c.status}`);
  const conv = await c.json();
  try {
    const r = await aiFetch(`/api/conversations/${conv.id}/chat`, json({ permission: 'auto', images: [b64],
      message: `Edit the attached photo with edit_image. Use exactly this instruction: ${prompt}` }), c.aiBase);
    if (!r.ok) throw new Error(`AI server: ${r.status}`);
    const events = (await r.text()).split('\n').filter((l) => l.startsWith('data: ')).map((l) => { try { return JSON.parse(l.slice(6)); } catch { return {}; } });
    const done = events.find((e) => e.type === 'tool_result' && e.name === 'edit_image' && e.ok);
    const url = /\/images\/img_\d+\.png/.exec(done?.result || '')?.[0];
    if (!url) {
      const why = events.find((e) => e.type === 'error')?.text || events.find((e) => e.type === 'tool_result' && !e.ok)?.result;
      throw new Error(why ? `AI server: ${why}` : 'The AI did not edit the picture - try other words');
    }
    return keepAiPicture(url, 'genfill', c.aiBase);
  } finally { aiFetch(`/api/conversations/${conv.id}`, { method: 'DELETE' }, c.aiBase).catch(() => {}); }
}

// ✨ Photoshop-style Generative Fill / Expand: the picture + a mask (white = paint new), `count` variations painted in
// place (SDXL inpainting). A server without the route (NAYA B today) = this PC's Limelight AI.
let fillAt = ''; // the AI server doing the fills (progress / cancel go there)
async function aiInpaint({ image, mask, prompt = '', count = 3, preset = 'fast', strength, describe = false }) {
  if (!image || !mask) throw new Error('No picture or selection');
  const req = () => ({ method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: String(image).split(',').pop(), mask: String(mask).split(',').pop(), prompt, count: Math.max(1, Math.min(4, count)), preset, strength, describe: !!describe }) });
  let r = await aiFetch('/api/images/inpaint', req());
  if ([404, 405].includes(r.status) && r.aiBase !== aiLocal()) r = await aiFetch('/api/images/inpaint', req(), aiLocal());
  fillAt = r.aiBase;
  if (r.status === 409) throw new Error('Cancelled');
  if (!r.ok) throw new Error(`AI server: ${r.status} ${(await r.text()).slice(0, 200)}`);
  const list = await r.json(), out = [];
  for (const it of list) out.push(await keepAiPicture(it.url, 'genfill', r.aiBase));
  return out;
}

// ---------- live editing: everyone with the same design open sees each other's changes, selections and cursors ----------
// GET /api/live/<project>?cid=  is an event stream (hello, presence, ops, cursor); POST /api/live/<project> sends to the
// others. Who: the workspace login (Lighthouse's proxy sends x-lh-as; Studio listens on this PC only), else ?name=.
const rooms = new Map(); // project id -> Map(client id -> { res, cid, who, color, page, sel })
const LIVE_COLORS = ['#ff3d8b', '#5b8cff', '#3ddc84', '#ff8a00', '#7c4dff', '#00bfa5', '#e91e63', '#ffc21a'];
function liveWho(req, u) {
  try { const h = req.headers['x-lh-as']; if (h) { const j = JSON.parse(Buffer.from(h, 'base64url').toString('utf8')); if (j.email || j.name) return { name: String(j.name || j.email).slice(0, 60), email: String(j.email || '') }; } } catch { /* not from the workspace */ }
  return { name: String(u.searchParams.get('name') || 'This PC').slice(0, 60), email: '' };
}
function liveSend(pid, ev, data, except) {
  const room = rooms.get(pid); if (!room) return;
  const msg = `event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const [cid, c] of room) if (cid !== except) c.res.write(msg);
}
const livePresence = (pid) => liveSend(pid, 'presence', [...(rooms.get(pid)?.values() || [])].map((c) => ({ cid: c.cid, ...c.who, color: c.color, page: c.page, sel: c.sel })));
function liveJoin(req, res, pid, u) {
  const cid = String(u.searchParams.get('cid') || '').slice(0, 40); if (!cid) return send(res, 400, { error: 'cid' });
  const room = rooms.get(pid) || new Map(); rooms.set(pid, room);
  const used = new Set([...room.values()].map((c) => c.color));
  const c = { res, cid, who: liveWho(req, u), color: LIVE_COLORS.find((x) => !used.has(x)) || LIVE_COLORS[room.size % LIVE_COLORS.length], page: null, sel: [] };
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.write(`retry: 2000\nevent: hello\ndata: ${JSON.stringify({ cid, ...c.who, color: c.color })}\n\n`);
  room.set(cid, c); livePresence(pid);
  const beat = setInterval(() => res.write(': beat\n\n'), 20000);
  req.on('close', () => { clearInterval(beat); if (room.get(cid) === c) room.delete(cid); if (!room.size) rooms.delete(pid); else livePresence(pid); });
}
async function livePost(req, res, pid) {
  const b = await readJson(req), c = rooms.get(pid)?.get(b.cid);
  if (!c) return send(res, 409, { error: 'not connected' });
  if (b.kind === 'state') { c.page = b.page ?? c.page; c.sel = Array.isArray(b.sel) ? b.sel.slice(0, 200) : []; livePresence(pid); }
  else if (b.kind === 'cursor') liveSend(pid, 'cursor', { cid: c.cid, page: b.page, x: b.x, y: b.y }, c.cid);
  else if (b.kind === 'ops') liveSend(pid, 'ops', { cid: c.cid, name: c.who.name, page: b.page, upserts: b.upserts || [], removes: b.removes || [], order: b.order, pages: b.pages, meta: b.meta }, c.cid);
  return send(res, 200, { ok: true });
}

// ---------- router ----------
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  const p = decodeURIComponent(u.pathname);
  try {
    if (p === '/api/health') return send(res, 200, { ok: true, app: 'Limelight Studio', version: '1.1.0' });

    if (p === '/api/projects' && req.method === 'GET') return send(res, 200, await listProjects());

    if (p.startsWith('/api/live/')) {
      const pid = safeId(p.split('/')[3]); if (!pid) return send(res, 400, { error: 'bad id' });
      return req.method === 'GET' ? liveJoin(req, res, pid, u) : livePost(req, res, pid);
    }

    if (p.startsWith('/api/projects/')) {
      const id = safeId(p.split('/')[3]);
      if (!id) return send(res, 400, { error: 'bad id' });
      const file = path.join(DIRS.projects, id + '.json');
      if (req.method === 'GET') {
        if (!fs.existsSync(file)) return send(res, 404, { error: 'not found' });
        return send(res, 200, await fsp.readFile(file, 'utf8'));
      }
      if (req.method === 'PUT') {
        const proj = await readJson(req);
        const thumb = proj.thumb; delete proj.thumb;
        proj.id = id; proj.name = safeName(proj.name); proj.updated = Date.now();
        await fsp.writeFile(file + '.tmp', JSON.stringify(proj));
        await fsp.rename(file + '.tmp', file);
        if (thumb) await fsp.writeFile(path.join(DIRS.projects, id + '.png'), dataUrlToBuffer(thumb).buf);
        return send(res, 200, { ok: true, updated: proj.updated });
      }
      if (req.method === 'DELETE') {
        // move to a trash folder instead of deleting outright
        const trash = path.join(DIRS.projects, '_trash'); await fsp.mkdir(trash, { recursive: true });
        for (const ext of ['.json', '.png']) {
          const f = path.join(DIRS.projects, id + ext);
          if (fs.existsSync(f)) await fsp.rename(f, path.join(trash, `${id}_${Date.now()}${ext}`));
        }
        return send(res, 200, { ok: true });
      }
    }

    if (p === '/api/library' && req.method === 'GET') {
      const files = (await fsp.readdir(DIRS.library)).filter((f) => /\.(png|jpe?g|webp|svg|gif)$/i.test(f));
      const withTime = await Promise.all(files.map(async (f) => ({ name: f, url: `/library/${encodeURIComponent(f)}`,
        t: (await fsp.stat(path.join(DIRS.library, f))).mtimeMs })));
      return send(res, 200, withTime.sort((a, b) => b.t - a.t));
    }
    // pixels of a painted Design layer (Photoshop tools): Library/_layers, kept out of the Uploads list
    if (p === '/api/pixels' && req.method === 'POST') {
      const { name, data } = await readJson(req);
      const { mime, buf } = dataUrlToBuffer(data);
      const dir = path.join(DIRS.library, '_layers');
      await fsp.mkdir(dir, { recursive: true });
      const fname = `${safeName(name || 'layer').replace(/\s+/g, '_')}_${Date.now().toString(36)}${extFor(mime)}`;
      await fsp.writeFile(path.join(dir, fname), buf);
      return send(res, 200, { url: `/library/_layers/${encodeURIComponent(fname)}` });
    }
    if (p === '/api/library' && req.method === 'POST') {
      const { name, data } = await readJson(req);
      const { mime, buf } = dataUrlToBuffer(data);
      const base = safeName(path.parse(name || 'image').name).replace(/\s+/g, '_');
      const fname = `${base}_${Date.now().toString(36)}${extFor(mime)}`;
      await fsp.writeFile(path.join(DIRS.library, fname), buf);
      return send(res, 200, { name: fname, url: `/library/${encodeURIComponent(fname)}` });
    }

    if (p === '/api/export' && req.method === 'POST') {
      const { name, data, ext, folder } = await readJson(req);
      const buf = data.startsWith('data:') ? dataUrlToBuffer(data).buf : Buffer.from(data, 'utf8');
      const e = /^(png|jpg|svg|pdf|psd|json)$/.test(ext) ? ext : 'png';
      const dir = exportDir(folder), fname = `${safeName(name)}.${e}`;
      let out = path.join(dir, fname);
      for (let i = 2; fs.existsSync(out); i++) out = path.join(dir, `${safeName(name)} (${i}).${e}`);
      await fsp.writeFile(out, buf);
      return send(res, 200, { ok: true, path: out, url: exportUrl(out) });
    }
    // 🎨 CorelDRAW (on this PC) makes the editable CDR / AI and the vector PDF from the design's SVG
    if (p === '/api/convert' && req.method === 'POST') {
      const { name, svg, svgs, formats, folder } = await readJson(req);
      const want = (Array.isArray(formats) ? formats : []).filter((f) => ['cdr', 'ai', 'pdf'].includes(f));
      // (several SVGs: one document, one page each - a book)
      const list = Array.isArray(svgs) ? svgs : [svg];
      if (!want.length || !list.length || list.some((s) => typeof s !== 'string' || !s.includes('<svg'))) return send(res, 400, { error: 'Nothing to convert' });
      // (never over a file that is there already: CorelDRAW would keep a "Backup_of_" copy and the old one is lost)
      const dir = exportDir(folder), taken = (b) => want.some((f) => fs.existsSync(`${b}.${f}`));
      let base = path.join(dir, safeName(name));
      for (let i = 2; taken(base); i++) base = path.join(dir, `${safeName(name)} (${i})`);
      const tmp = path.join(os.tmpdir(), `studio-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);
      const pages = list.map((_, i) => `${tmp}-${i + 1}.svg`), made = [...pages, ...pages.map((f) => f + '.fonts.txt')];
      for (let i = 0; i < list.length; i++) {
        await fsp.writeFile(pages[i], list[i]);
        await fsp.writeFile(pages[i] + '.fonts.txt', corelFonts(list[i]).join('\r\n'), 'utf16le');
      }
      // one page: the SVG itself; more: a .list file of them (tools/corel.vbs adds a page for each)
      const src = pages.length > 1 ? `${tmp}.list` : pages[0];
      if (pages.length > 1) { await fsp.writeFile(src, pages.join('\r\n'), 'utf16le'); made.push(src); }
      try { return send(res, 200, { files: await corel(src, base, want) }); }
      catch (e) { return send(res, 500, { error: e.message }); }
      finally { for (const f of made) fsp.rm(f, { force: true }).catch(() => {}); }
    }
    // a bundle folder (Exports/<name> - all formats) as one .zip
    if (p === '/api/zip' && req.method === 'POST') {
      const { folder } = await readJson(req);
      const dir = exportDir(folder);
      if (dir === DIRS.exports) return send(res, 400, { error: 'No folder' });
      const zip = dir + '.zip';
      await new Promise((ok, bad) => exec(`powershell -NoProfile -Command "Compress-Archive -Path '${dir.replace(/'/g, "''")}\\*' -DestinationPath '${zip.replace(/'/g, "''")}' -Force"`,
        { timeout: 600e3 }, (e) => (e ? bad(e) : ok())));
      return send(res, 200, { ok: true, path: zip, url: exportUrl(zip) });
    }
    if (p === '/api/open-exports' && req.method === 'POST') {
      if (process.platform === 'win32') exec(`explorer "${DIRS.exports}"`);
      return send(res, 200, { ok: true });
    }

    if (p === '/api/ai/status') {
      try {
        const r = await aiFetch('/api/status', { signal: AbortSignal.timeout(4000) });
        const s = r.ok ? await r.json() : null;
        return send(res, 200, { ok: r.ok, url: r.aiBase || config.aiUrl, images: s?.images ?? null,
          error: r.ok ? undefined : r.status === 401 ? 'password needed — enter it in AI settings' : `HTTP ${r.status}` });
      } catch (e) { return send(res, 200, { ok: false, url: config.aiUrl, error: e.message }); }
    }
    if (p === '/api/ai/image' && req.method === 'POST') return send(res, 200, await aiImage(await readJson(req)));
    if (p === '/api/ai/edit' && req.method === 'POST') return send(res, 200, await aiEdit(await readJson(req)));
    if (p === '/api/ai/inpaint/progress') { try { const r = await aiFetch('/api/images/inpaint/progress', { signal: AbortSignal.timeout(3000) }, fillAt || aiLocal()); return send(res, 200, r.ok ? await r.json() : {}); } catch { return send(res, 200, {}); } }
    if (p === '/api/ai/inpaint/cancel' && req.method === 'POST') { await aiFetch('/api/images/inpaint/cancel', { method: 'POST', signal: AbortSignal.timeout(3000) }, fillAt || aiLocal()).catch(() => {}); return send(res, 200, { ok: true }); }
    if (p === '/api/ai/inpaint' && req.method === 'POST') return send(res, 200, await aiInpaint(await readJson(req, 64 * 1024 * 1024)));


    if (p === '/api/config' && req.method === 'GET') return send(res, 200, { aiUrl: config.aiUrl });
    if (p === '/api/config' && req.method === 'POST') {
      const b = await readJson(req);
      if (typeof b.aiUrl === 'string' && /^https?:\/\//.test(b.aiUrl)) config.aiUrl = b.aiUrl;
      if (typeof b.aiPassword === 'string') { config.aiPassword = b.aiPassword; aiCookie = ''; }
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
      return send(res, 200, { ok: true });
    }

    if (p.startsWith('/library/')) return serveFile(res, path.join(DIRS.library, p.slice(9)), DIRS.library);
    if (p.startsWith('/exports/')) return serveFile(res, path.join(DIRS.exports, p.slice(9)), DIRS.exports);
    if (p.startsWith('/projects/')) return serveFile(res, path.join(DIRS.projects, p.slice(10)), DIRS.projects);
    if (p.startsWith('/api/')) return send(res, 404, { error: 'unknown api' });
    const page = p === '/' || p === '/design' ? 'index.html' : p;
    return serveFile(res, path.join(PUBLIC, page), PUBLIC);
  } catch (e) {
    console.error(new Date().toISOString(), p, e);
    send(res, 500, { error: e.message });
  }
});

server.listen(PORT, LAN ? '0.0.0.0' : '127.0.0.1', () => {
  const url = `http://localhost:${PORT}`;
  console.log(`Limelight Studio running at ${url}`);
  if (LAN) for (const n of Object.values(os.networkInterfaces()).flat())
    if (n.family === 'IPv4' && !n.internal) console.log(`  LAN: http://${n.address}:${PORT}`);
  if (args.includes('--open') && process.platform === 'win32') exec(`start "" "${url}"`);
});

// server.mjs - Limelight Office: Mail, Calendar, Task, Meetings, Document / Grid / Present, AI — for the Limelight team.
// node server.mjs [--open]   (login = the Lighthouse account; Lighthouse pages show inside the Office menu)
//   http://127.0.0.1:3300          this PC (the owner, signed in automatically)
//   https://<this PC's IP>:3443    the office LAN (team logins; https so cameras and mics work in Meetings)
import http from 'node:http';
import dns from 'node:dns/promises';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import fs from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { ROOT, DATA, load, save, publicView, ctx } from './engine/config.mjs';
import * as office from './engine/office.mjs';
import * as agent from './engine/agent.mjs';
import * as store from './engine/store.mjs';
import * as auth from './engine/auth.mjs';
import * as live from './engine/live.mjs';
import * as lmail from './engine/lmail.mjs';
import * as cal from './engine/lcal.mjs';
import { uid } from './engine/db.mjs';
import { news } from './engine/news.mjs';
import { lhUrl } from './engine/lighthouse.mjs';
const MIMES = { '.pdf': 'application/pdf', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation', '.png': 'image/png', '.jpg': 'image/jpeg' };
const mimeOf = (f) => MIMES[path.extname(f).toLowerCase()] || 'application/octet-stream';

const PUBLIC = path.join(ROOT, 'public');
const cfg = load();
const PORT = +process.env.PORT || cfg.port;
const LAN_PORT = +process.env.LAN_PORT || cfg.lanPort || 3443;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const LH_PORT = +process.env.LH_PORT || cfg.lhPort || 3301, LH_LAN_PORT = LH_PORT + 143; // 3301 on this PC, 3444 on the LAN
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const lanIps = () => Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address);
auth.owner();
// the Lighthouse workspace (same PC) signs each person in as themselves: it sends x-lh-as with this key
const WS_KEY_FILE = path.join(DATA, 'workspace.key');
if (!fs.existsSync(WS_KEY_FILE)) fs.writeFileSync(WS_KEY_FILE, crypto.randomBytes(32).toString('hex'));
const WS_KEY = Buffer.from(fs.readFileSync(WS_KEY_FILE, 'utf8').trim());
function vouched(req) {
  const k = Buffer.from(String(req.headers['x-lh-key'] || ''));
  if (k.length !== WS_KEY.length || !crypto.timingSafeEqual(k, WS_KEY)) return undefined;
  try { return auth.asPerson(JSON.parse(Buffer.from(String(req.headers['x-lh-as']), 'base64url').toString('utf8'))); } catch { return null; }
}

// ---------- routing ----------
const routes = [];
// who: 'user' (signed in), 'admin', 'public'
const on = (method, pattern, handler, who = 'user') => routes.push({ method, who, re: new RegExp(`^${pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)')}$`), handler });
function send(res, code, body, type = 'application/json', headers = {}) {
  res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store', ...headers });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
}
async function readBody(req, limit = 200 * 1024 * 1024) {
  const chunks = []; let n = 0;
  for await (const c of req) { n += c.length; if (n > limit) throw new Error('Too large'); chunks.push(c); }
  return Buffer.concat(chunks);
}
const json = async (req) => { const b = await readBody(req, 150 * 1024 * 1024); return b.length ? JSON.parse(b.toString('utf8')) : {}; };
function download(res, name, data, type = 'application/octet-stream', inline = false) {
  res.writeHead(200, { 'content-type': type || 'application/octet-stream', 'content-length': data.length,
    'content-disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(name)}` });
  res.end(data);
}
const me = () => ctx.getStore().user;
const cookie = (req, k) => (req.headers.cookie || '').split(/;\s*/).map((x) => x.split('=')).find(([a]) => a === k)?.[1];

// ---------- account & team ----------
on('GET', '/api/me', async (req, res) => {
  const s = ctx.getStore();
  send(res, 200, { user: auth.publicUser(s.user), local: s.local, lan: lanIps().map((ip) => `https://${ip}:${LAN_PORT}`) });
}, 'public');
on('POST', '/api/login', async (req, res) => {
  const b = await json(req), r = await auth.login(b.email || b.login, b.password);
  send(res, 200, { user: r.user }, 'application/json', { 'set-cookie': `llo_s=${r.token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${30 * 86400}` });
}, 'public');
on('POST', '/api/logout', async (req, res) => { auth.logout(cookie(req, 'llo_s')); send(res, 200, { ok: true }, 'application/json', { 'set-cookie': 'llo_s=; Path=/; Max-Age=0' }); }, 'public');
on('POST', '/api/me', async (req, res) => {
  const b = await json(req), u = me();
  if (b.password && u.pass && !ctx.getStore().local) {
    try { auth.login(u.login, b.current || ''); } catch { throw Object.assign(new Error('Current password is wrong'), { status: 400 }); }
  }
  send(res, 200, auth.updateUser(u.id, { name: b.name, title: b.title, email: b.email, password: b.password }));
});
// the owner on this PC links their Lighthouse account once (staff list, Lighthouse pages)
on('POST', '/api/me/lighthouse', async (req, res) => {
  if (!ctx.getStore().local) throw Object.assign(new Error('Only on the main PC'), { status: 400 });
  const b = await json(req);
  send(res, 200, await auth.linkOwner(me().id, b.email, b.password));
});
on('POST', '/api/me/mail', async (req, res) => { const b = await json(req); if (load().teamMailOnly !== false && !b.remove) return send(res, 400, { error: "Mail stays on Limelight's own server - team mail only" }); auth.setMailCfg(me().id, b.remove ? null : b); send(res, 200, { ok: true }); });
// (team mail only: nothing to set up - the Office setup page says so)
on('GET', '/api/me/mail', async (req, res) => { if (load().teamMailOnly !== false) return send(res, 200, { teamOnly: true }); const c = auth.getMailCfg(me().id); send(res, 200, c ? { ...c, pass: undefined, passSealed: undefined, hasPass: true } : null); });
on('POST', '/api/me/mail/test', async (req, res) => send(res, 200, await lmail.testMailbox(me().id)));
// which provider hosts a domain's mail (from its MX records), so My mail can fill in the servers
on('GET', '/api/me/mail/detect', async (req, res, q) => {
  const domain = String(q.get('domain') || '').toLowerCase().replace(/[^a-z0-9.-]/g, '');
  let mx = [];
  try { mx = (await dns.resolveMx(domain)).map((m) => m.exchange.toLowerCase()); } catch {}
  const has = (re) => mx.some((m) => re.test(m));
  const preset = has(/outlook\.com|office365|protection\.outlook/) ? 'm365' : has(/secureserver/) ? 'godaddyw'
    : has(/hostinger/) ? 'hostinger' : has(/zoho/) ? 'zoho' : mx.length ? 'custom' : '';
  send(res, 200, { domain, mx: mx.slice(0, 3), preset });
});
on('GET', '/api/team', async (req, res) => send(res, 200, { users: auth.team(), online: live.online() }));
on('POST', '/api/team/sync', async (req, res) => { const t = auth.lhToken(me()); if (!t) throw new Error('Sign in with your Limelight account first'); send(res, 200, { people: await auth.syncStaff(t) }); });
on('POST', '/api/team/:id', async (req, res, q, p) => send(res, 200, auth.updateUser(p.id, await json(req))), 'admin');

// ---------- live: notifications, presence, meeting signalling ----------
on('GET', '/api/stream', async (req, res, q) => live.connect(req, res, me(), q.get('cid') || uid()));
on('GET', '/api/notes', async (req, res) => send(res, 200, live.notes(me().id)));
on('POST', '/api/notes/seen', async (req, res) => { live.seenNotes(me().id); send(res, 200, { ok: true }); });

// ---------- status & settings ----------
on('GET', '/api/status', async (req, res, q) => send(res, 200, {
  me: auth.publicUser(me()), local: ctx.getStore().local, office: office.installed(), lighthouse: !!auth.lhToken(me()),
  lhBase: ctx.getStore().local ? `http://127.0.0.1:${LH_PORT}` : `https://${(req.headers.host || '').replace(/:\d+$/, '')}:${LH_LAN_PORT}`,
  llm: q.get('fresh') === '1' ? await agent.llmStatus(true) : agent.llmCached(), settings: publicView(),
  lan: lanIps().map((ip) => `https://${ip}:${LAN_PORT}`),
}));
on('POST', '/api/settings', async (req, res) => {
  const b = await json(req), patch = {};
  if (b.filesDir) { fs.mkdirSync(b.filesDir, { recursive: true }); patch.filesDir = b.filesDir; }
  if (b.timeZone) patch.timeZone = b.timeZone;
  if (b.llm) patch.llm = { urls: (b.llm.urls || []).map((u) => u.trim().replace(/\/$/, '')).filter(Boolean), model: b.llm.model || 'qwen3:8b' };
  if (b.lighthouseUrl) patch.lighthouseUrl = String(b.lighthouseUrl).trim().replace(/\/$/, '');
  save(patch);
  send(res, 200, { ok: true, settings: publicView() });
}, 'admin');

// ---------- Limelight Mail ----------
on('GET', '/api/lmail', async (req, res, q) => send(res, 200, await lmail.list(me().id, { box: q.get('box') || 'inbox', q: q.get('q') || '' })));
on('GET', '/api/lmail/unread', async (req, res) => send(res, 200, { unread: await lmail.unread(me().id) }));
on('GET', '/api/lmail/:id', async (req, res, q, p) => send(res, 200, await lmail.get(me().id, p.id)));
on('GET', '/api/lmail/:id/att/:n', async (req, res, q, p) => { const a = await lmail.attachment(me().id, p.id, +p.n); download(res, a.name, a.data, a.type); });
on('POST', '/api/lmail/:id/save-att/:n', async (req, res, q, p) => { const a = await lmail.attachment(me().id, p.id, +p.n); send(res, 200, office.saveUpload(a.name, a.data)); });
on('POST', '/api/lmail/send', async (req, res) => {
  const b = await json(req);
  // files picked from the person's own Office files
  const files = (b.files || []).map((f) => { const full = path.resolve(f); if (!full.startsWith(path.resolve(office.listFiles().dir) + path.sep)) throw new Error('Attachment is not in your files'); return full; });
  send(res, 200, await lmail.send(me().id, { ...b, files }));
});
on('POST', '/api/lmail/:id/flag', async (req, res, q, p) => { await lmail.flag(me().id, p.id, await json(req)); send(res, 200, { ok: true }); });
on('POST', '/api/lmail/:id/move', async (req, res, q, p) => { await lmail.move(me().id, p.id, (await json(req)).to); send(res, 200, { ok: true }); });

// ---------- Limelight Calendar ----------
on('GET', '/api/cal', async (req, res, q) => send(res, 200, cal.listEvents(me().id, +new Date(q.get('from') || Date.now()), +new Date(q.get('to') || Date.now() + 14 * 864e5))));
on('GET', '/api/cal/:id', async (req, res, q, p) => send(res, 200, cal.getEvent(me().id, p.id)));
on('POST', '/api/cal', async (req, res) => send(res, 200, cal.createEvent(me().id, await json(req))));
on('POST', '/api/cal/:id', async (req, res, q, p) => send(res, 200, cal.updateEvent(me().id, p.id, await json(req))));
on('DELETE', '/api/cal/:id', async (req, res, q, p) => { cal.deleteEvent(me().id, p.id); send(res, 200, { ok: true }); });
on('POST', '/api/cal/:id/rsvp', async (req, res, q, p) => send(res, 200, cal.rsvp(me().id, p.id, (await json(req)).answer)));

// ---------- Limelight Task ----------
on('GET', '/api/ltasks', async (req, res, q) => send(res, 200, cal.listTasks(me().id, q.get('scope') || 'mine')));
on('POST', '/api/ltasks', async (req, res) => send(res, 200, cal.createTask(me().id, await json(req))));
on('POST', '/api/ltasks/:id', async (req, res, q, p) => send(res, 200, cal.updateTask(me().id, p.id, await json(req))));
on('DELETE', '/api/ltasks/:id', async (req, res, q, p) => { cal.deleteTask(me().id, p.id, me().role === 'admin'); send(res, 200, { ok: true }); });

// ---------- Limelight Meetings (video calls inside the app) ----------
on('POST', '/api/rtc/new', async (req, res) => send(res, 200, { room: `ll-${uid().slice(0, 4)}-${uid().slice(0, 4)}`.toLowerCase().replace(/[^a-z0-9-]/g, 'x') }));
on('GET', '/api/rtc/live', async (req, res) => send(res, 200, live.liveRooms()));
on('POST', '/api/rtc/:room/join', async (req, res, q, p) => {
  const b = await json(req);
  send(res, 200, { peers: live.join(p.room, b.cid, me(), b), event: cal.eventByRoom(p.room) || null });
});
on('POST', '/api/rtc/:room/leave', async (req, res, q, p) => { live.leave(p.room, (await json(req)).cid); send(res, 200, { ok: true }); });
on('POST', '/api/rtc/:room/signal', async (req, res, q, p) => { const b = await json(req); live.signal(p.room, b.cid, b.to, b.data); send(res, 200, { ok: true }); });
on('POST', '/api/rtc/:room/state', async (req, res, q, p) => { const b = await json(req); live.state(p.room, b.cid, { cam: b.cam, mic: b.mic, screen: b.screen, hand: b.hand }); send(res, 200, { ok: true }); });
on('POST', '/api/rtc/:room/chat', async (req, res, q, p) => { const b = await json(req); live.chat(p.room, b.cid, b.text); send(res, 200, { ok: true }); });
on('POST', '/api/rtc/:room/invite', async (req, res, q, p) => {
  const b = await json(req);
  for (const id of b.users || []) live.notify(id, 'meet', `${me().name} is calling you into a meeting`, `#meet/${p.room}`);
  send(res, 200, { ok: true });
});

// ---------- Office files (each team member has an own folder; the owner has the main one) ----------
on('GET', '/api/files', async (req, res, q) => send(res, 200, office.listFiles({ q: q.get('q') || '' })));
on('POST', '/api/files/upload', async (req, res, q) => send(res, 200, office.saveUpload(q.get('name') || 'file', await readBody(req))));
on('POST', '/api/files/open', async (req, res) => send(res, 200, office.openFile((await json(req)).path)));
on('POST', '/api/files/reveal', async (req, res) => send(res, 200, office.showInFolder((await json(req)).path)));
on('POST', '/api/files/pdf', async (req, res) => send(res, 200, await office.toPdf((await json(req)).path)));
on('POST', '/api/files/read', async (req, res) => send(res, 200, await office.readText((await json(req)).path)));
on('GET', '/api/files/raw', async (req, res, q) => {
  const f = path.resolve(q.get('path') || ''), dir = path.resolve(office.listFiles().dir);
  if (!f.startsWith(dir + path.sep) || !fs.existsSync(f)) return send(res, 404, { error: 'not found' });
  download(res, path.basename(f), fs.readFileSync(f), mimeOf(f), q.get('inline') === '1');
});
on('POST', '/api/office/word', async (req, res) => send(res, 200, await office.createWord(await json(req))));
on('POST', '/api/office/excel', async (req, res) => send(res, 200, await office.createExcel(await json(req))));
on('POST', '/api/office/ppt', async (req, res) => send(res, 200, await office.createPpt(await json(req))));
on('POST', '/api/doc/open', async (req, res) => send(res, 200, await office.docOpen((await json(req)).path)));
on('POST', '/api/doc/save', async (req, res) => send(res, 200, await office.docSave(await json(req))));
on('POST', '/api/grid/open', async (req, res) => send(res, 200, await office.gridOpen((await json(req)).path)));
on('POST', '/api/grid/save', async (req, res) => send(res, 200, await office.gridSave(await json(req))));
on('POST', '/api/slides/open', async (req, res) => send(res, 200, await office.slidesOpen((await json(req)).path)));
on('POST', '/api/slides/save', async (req, res) => send(res, 200, await office.slidesSave(await json(req))));

// ---------- editing a file together: a live room per file; a file can be shared with teammates ----------
const coRoom = (file) => `co-${crypto.createHash('sha1').update(office.fileFor(file).toLowerCase()).digest('hex').slice(0, 16)}`;
on('POST', '/api/co/join', async (req, res) => { const b = await json(req), room = coRoom(b.path); send(res, 200, { room, peers: live.coJoin(room, b.cid, me()) }); });
on('POST', '/api/co/send', async (req, res) => { const b = await json(req); send(res, live.coRelay(b.room, b.cid, b.data || {}, b.to) ? 200 : 409, { ok: true }); });
on('POST', '/api/co/leave', async (req, res) => { const b = await json(req); live.coLeave(b.room, b.cid); send(res, 200, { ok: true }); });
on('POST', '/api/share', async (req, res) => {
  const b = await json(req), ids = (b.users || []).filter((id) => id !== me().id), full = office.share(b.path, ids);
  const mod = { '.docx': 'document', '.xlsx': 'grid', '.pptx': 'present' }[path.extname(full).toLowerCase()] || 'document';
  for (const id of ids) live.notify(id, 'share', `${me().name} shared “${path.basename(full)}” with you — open it to edit together`, `#${mod}/edit/${encodeURIComponent(full)}`);
  send(res, 200, { shared: ids.length });
});

// ---------- News, Attendance, Chats, Chatbot, AI Assistance, Agent ----------
on('GET', '/api/news', async (req, res, q) => send(res, 200, await news({ topic: q.get('topic') || 'top', q: q.get('q') || '', lang: q.get('lang') || 'en' })));
on('GET', '/api/attendance', async (req, res, q) => send(res, 200, store.attendanceMonth(q.get('month') || new Date().toISOString().slice(0, 7))), 'admin');
on('POST', '/api/attendance/person', async (req, res) => { const b = await json(req); send(res, 200, b.id ? store.updatePerson(b) : store.addPerson(b)); }, 'admin');
on('POST', '/api/attendance/mark', async (req, res) => send(res, 200, store.mark(await json(req))), 'admin');
on('POST', '/api/attendance/mark-all', async (req, res) => send(res, 200, store.markAll(await json(req))), 'admin');
on('POST', '/api/attendance/export', async (req, res) => {
  const { month } = await json(req);
  send(res, 200, await office.createExcel({ name: `Attendance ${month}`, sheets: [{ name: month, rows: store.monthRows(month) }] }));
}, 'admin');
on('GET', '/api/chats', async (req, res) => send(res, 200, store.listChats(me())));
on('GET', '/api/chats/:id', async (req, res, q, p) => send(res, 200, store.getChat(p.id, me())));
on('POST', '/api/chats', async (req, res) => send(res, 200, store.saveChat({ ...(await json(req)), owner: me().id }, me())));
on('DELETE', '/api/chats/:id', async (req, res, q, p) => { store.deleteChat(p.id, me()); send(res, 200, { ok: true }); });
on('POST', '/api/chatbot', async (req, res) => send(res, 200, await agent.chatbot((await json(req)).messages || [])));
on('GET', '/api/assist', async (req, res) => send(res, 200, Object.fromEntries(Object.entries(agent.ASSIST).map(([k, v]) => [k, v[0]]))));
on('POST', '/api/assist', async (req, res) => send(res, 200, await agent.assist(await json(req))));
on('POST', '/api/agent', async (req, res) => send(res, 200, await agent.chat((await json(req)).messages || [], me())));
on('POST', '/api/agent/approve', async (req, res) => { const b = await json(req); send(res, 200, await agent.approve(b.id, b.edits, me())); });
on('POST', '/api/agent/reject', async (req, res) => { agent.reject((await json(req)).id); send(res, 200, { ok: true }); });


// ---------- Lighthouse pages inside Office (same as the Lighthouse workspace: a proxy on its own port so the pages can
// be framed, the person's Lighthouse token put in place, and Lighthouse's own sidebar hidden inside the Office frame) ----------
// (the old Lighthouse app's full-screen splash loader is hidden too: the page just appears)
const LH_EMBED_CSS = '.app{grid-template-columns:1fr!important}.app>.side,.bnav{display:none!important}.splash{display:none!important}';
function lhProxy(local) {
  const strip = ['x-frame-options', 'content-security-policy', 'strict-transport-security'];
  return async (req, res) => {
    const user = local ? auth.owner() : auth.fromToken(cookie(req, 'llo_s'));
    if (!user) return send(res, 401, '<body style="font:15px system-ui;padding:40px">Please sign in to Limelight Office first.</body>', 'text/html; charset=utf-8');
    const t = new URL(lhUrl()), framed = req.headers['sec-fetch-dest'] === 'iframe';
    const isPage = req.method === 'GET' && /text\/html/.test(req.headers.accept || '');
    const headers = { ...req.headers, host: t.host };
    headers.cookie = (req.headers.cookie || '').split(/;\s*/).filter((c) => c && !c.startsWith('llo_s=')).join('; ');
    if (!headers.cookie) delete headers.cookie;
    for (const h of ['origin', 'referer']) if (headers[h]) headers[h] = headers[h].replace(/^https?:\/\/[^/]+/, t.origin);
    if (isPage) headers['accept-encoding'] = 'identity';
    const up = (t.protocol === 'https:' ? https : http).request({ protocol: t.protocol, hostname: t.hostname, port: t.port, method: req.method, path: req.url, headers }, async (r) => {
      const out = { ...r.headers };
      for (const h of strip) delete out[h];
      const here = `${local ? 'http' : 'https'}://${req.headers.host}`;
      if (out.location) out.location = out.location.replace(t.origin, here);
      if (out['set-cookie']) out['set-cookie'] = out['set-cookie'].map((c) => c.replace(/;\s*domain=[^;]+/i, ''));
      if (isPage && /text\/html/.test(out['content-type'] || '')) {
        const chunks = []; for await (const c of r) chunks.push(c);
        let inject = framed ? `<style>${LH_EMBED_CSS}</style>` : '';
        const tok = auth.lhToken(user);
        if (tok) inject += `<script>try{if(localStorage.getItem('lh-token')!==${JSON.stringify(tok)}){localStorage.setItem('lh-token',${JSON.stringify(tok)});localStorage.removeItem('lh-auth-user')}}catch(e){}</script>`;
        const html = Buffer.concat(chunks).toString('utf8').replace(/<head[^>]*>/i, (m) => m + inject);
        delete out['content-length']; delete out['content-encoding'];
        res.writeHead(r.statusCode, out); return res.end(html);
      }
      res.writeHead(r.statusCode, out); r.pipe(res);
    });
    up.on('error', () => { if (!res.headersSent) send(res, 502, '<body style="font:15px system-ui;padding:40px">Limelight HR is not reachable right now (internet?).</body>', 'text/html; charset=utf-8'); else res.end(); });
    req.pipe(up);
  };
}
function lhUpgrade(local) {
  return (req, sock, head) => {
    const user = local ? auth.owner() : auth.fromToken(cookie(req, 'llo_s'));
    if (!user) return sock.destroy();
    const t = new URL(lhUrl());
    const conn = t.protocol === 'https:' ? tls.connect({ host: t.hostname, port: t.port || 443, servername: t.hostname }) : net.connect({ host: t.hostname, port: t.port || 80 });
    conn.once(t.protocol === 'https:' ? 'secureConnect' : 'connect', () => {
      const lines = [`${req.method} ${req.url} HTTP/1.1`];
      for (let i = 0; i < req.rawHeaders.length; i += 2) lines.push(`${req.rawHeaders[i]}: ${/^host$/i.test(req.rawHeaders[i]) ? t.host : req.rawHeaders[i + 1]}`);
      conn.write(lines.join('\r\n') + '\r\n\r\n'); if (head?.length) conn.write(head);
      conn.pipe(sock); sock.pipe(conn);
    });
    conn.on('error', () => sock.destroy()); sock.on('error', () => conn.destroy());
  };
}
const lhLocal = http.createServer(lhProxy(true));
lhLocal.on('upgrade', lhUpgrade(true));
lhLocal.on('error', (e) => console.log(`Lighthouse pages (this PC) could not start on ${LH_PORT}: ${e.message}`));
lhLocal.listen(LH_PORT, '127.0.0.1');

// ---------- the two listeners ----------
async function handle(req, res, local) {
  const url = new URL(req.url, 'http://x');
  const host = (req.headers.host || '').toLowerCase().replace(/:\d+$/, '');
  // refuse other host names (DNS rebinding) and cross-site posts
  const okHosts = local ? ['127.0.0.1', 'localhost'] : ['localhost', '127.0.0.1', os.hostname().toLowerCase(), ...lanIps()];
  if (!okHosts.includes(host)) return send(res, 403, { error: 'unknown host' });
  if (url.pathname.startsWith('/api/') && req.method !== 'GET' && req.headers['x-llo'] !== '1') return send(res, 403, { error: 'missing header' });
  let user;
  if (local && req.headers['x-lh-as']) {
    // through the workspace: that person, with team-member limits (own files folder, no opening apps on this PC)
    user = vouched(req);
    if (user === undefined) return send(res, 403, { error: 'bad workspace key' });
    local = false;
  } else user = local ? auth.owner() : auth.fromToken(cookie(req, 'llo_s'));

  for (const r of routes) {
    if (r.method !== req.method) continue;
    const m = url.pathname.match(r.re);
    if (!m) continue;
    if (r.who !== 'public' && !user) return send(res, 401, { error: 'Please sign in', code: 'LOGIN' });
    if (r.who === 'admin' && user.role !== 'admin') return send(res, 403, { error: 'Only the admin can do this' });
    const params = Object.fromEntries(Object.entries(m.groups || {}).map(([k, v]) => [k, decodeURIComponent(v)]));
    return ctx.run({ user, local }, async () => {
      try { return await r.handler(req, res, url.searchParams, params); }
      catch (e) {
        console.error(`[${new Date().toISOString()}] ${req.method} ${url.pathname}: ${e.message}`);
        if (!res.headersSent) return send(res, e.status || (e.code === 'NO_GOOGLE' ? 401 : 500), { error: e.message, code: e.code });
        return res.end();
      }
    });
  }
  if (req.method !== 'GET') return send(res, 404, { error: 'not found' });
  const file = path.join(PUBLIC, url.pathname === '/' ? 'index.html' : path.normalize(decodeURIComponent(url.pathname)));
  if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return send(res, 404, 'Not found', 'text/plain');
  const st = fs.statSync(file), type = TYPES[path.extname(file)] || 'application/octet-stream';
  // the page: each /x.css and /x.js link gets ?v=<that file's last change>, so a phone may keep those a year (below)
  if (file.endsWith('index.html')) {
    let html = fs.readFileSync(file, 'utf8').replace(/(href|src)="\/([\w.-]+\.(?:css|js))(?:\?v=[^"]*)?"/g, (m, a, f) => {
      try { return `${a}="/${f}?v=${Math.round(fs.statSync(path.join(PUBLIC, f)).mtimeMs).toString(36)}"`; } catch { return m; } });
    res.writeHead(200, { 'content-type': type, 'cache-control': 'no-cache' }); return res.end(html);
  }
  // other files: a year when the link carries ?v=, else "ask first" - and "not changed" (304) when the copy is current
  const modified = st.mtime.toUTCString();
  if (!url.searchParams.has('v') && req.headers['if-modified-since'] === modified) { res.writeHead(304, { 'cache-control': 'no-cache', 'last-modified': modified }); return res.end(); }
  res.writeHead(200, { 'content-type': type, 'last-modified': modified,
    'cache-control': url.searchParams.has('v') ? 'private, max-age=31536000, immutable' : 'no-cache' });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer((req, res) => handle(req, res, true));
server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') { console.log(`Limelight Office is already running: ${ORIGIN}`); if (process.argv.includes('--open')) openBrowser(); process.exit(0); }
  throw e;
});
server.listen(PORT, '127.0.0.1', () => {
  console.log(`Limelight Office  ->  ${ORIGIN}   (this PC)`);
  console.log(`Files folder      ->  ${load().filesDir}`);
  if (process.argv.includes('--open')) openBrowser();
});

// a self-signed certificate for the LAN address (made once with OpenSSL; each team PC accepts it once)
function certificate() {
  const dir = path.join(DATA, 'ssl'), key = path.join(dir, 'key.pem'), crt = path.join(dir, 'cert.pem'), ipf = path.join(dir, 'ips.txt');
  const want = [...lanIps(), '127.0.0.1'].join(',');
  if (fs.existsSync(key) && fs.existsSync(crt) && fs.existsSync(ipf) && fs.readFileSync(ipf, 'utf8') === want) return { key: fs.readFileSync(key), cert: fs.readFileSync(crt) };
  const openssl = ['openssl', 'C:/Program Files/Git/usr/bin/openssl.exe', 'C:/Program Files/Git/mingw64/bin/openssl.exe'].find((p) => { try { execFileSync(p, ['version'], { stdio: 'ignore' }); return true; } catch { return false; } });
  if (!openssl) return null;
  fs.mkdirSync(dir, { recursive: true });
  const san = [...lanIps().map((ip) => `IP:${ip}`), 'IP:127.0.0.1', 'DNS:localhost', `DNS:${os.hostname()}`].join(',');
  execFileSync(openssl, ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-sha256', '-days', '825', '-keyout', key, '-out', crt, '-subj', '/CN=Limelight Office', '-addext', `subjectAltName=${san}`], { stdio: 'ignore' });
  fs.writeFileSync(ipf, want);
  return { key: fs.readFileSync(key), cert: fs.readFileSync(crt) };
}
try {
  const c = certificate();
  if (c) {
    const lan = https.createServer(c, (req, res) => handle(req, res, false));
    lan.on('error', (e) => console.log(`Team (LAN) server could not start on ${LAN_PORT}: ${e.message}`));
    lan.listen(LAN_PORT, '0.0.0.0', () => console.log(`Team on the LAN  ->  ${lanIps().map((ip) => `https://${ip}:${LAN_PORT}`).join('  ')}`));
    const lhLan = https.createServer(c, lhProxy(false));
    lhLan.on('upgrade', lhUpgrade(false));
    lhLan.on('error', (e) => console.log(`Lighthouse pages (LAN) could not start on ${LH_LAN_PORT}: ${e.message}`));
    lhLan.listen(LH_LAN_PORT, '0.0.0.0');
  } else console.log('Team (LAN) server off: OpenSSL not found to make the certificate.');
} catch (e) { console.log(`Team (LAN) server off: ${e.message}`); }

function openBrowser() { spawn('cmd.exe', ['/c', 'start', '""', ORIGIN], { detached: true, stdio: 'ignore', windowsHide: true }).unref(); }

// Lighthouse (Limelight's workspace) - every Limelight app in one window, behind one login (no npm dependencies).
// node server.mjs [--open] [--lan]   ->  http://localhost:3350
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import fs from 'node:fs';
import crypto from 'node:crypto';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createAuth } from './auth.mjs';
import { createChat } from './chat.mjs';
import { createActivity } from './activity.mjs';
import { createSalary } from './salary.mjs';
import { createOvertime } from './overtime.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');
const DATA = path.join(ROOT, 'Data');
fs.mkdirSync(DATA, { recursive: true });

const CONFIG_FILE = path.join(ROOT, 'config.json');
const defaults = {
  port: 3350,
  studioUrl: 'http://127.0.0.1:3330',          // Limelight Studio (design) - also serves projects, library and AI images
  lighthouseUrl: 'https://lighthouse.limelightcorp.in',
  editorUrl: 'http://192.168.0.200',
  editorStandbyUrl: 'http://192.168.0.205:3100',  // NAYA B runs the editor while NAYA A is down
  aiUrl: 'http://192.168.0.205:8800',
  aiLocalUrl: 'http://127.0.0.1:8800',             // Limelight AI on this PC: used while NAYA B is busy or off
  aiPassword: '',
  // public address (Cloudflare tunnel on this PC): the workspace and one host per app, all under one cookie domain
  publicDomain: 'limelightcorp.net',
  publicHost: 'limelightcorp.net',             // the workspace itself (www.limelightcorp.net too)
  appHosts: { editor: 'lh-edit.limelightcorp.net', office: 'lh-office.limelightcorp.net', lighthouse: 'lh-team.limelightcorp.net',
    ai: 'lh-ai.limelightcorp.net', design: 'lh-design.limelightcorp.net' },                              // office Limelight AI password: set once by an admin (account menu); everyone is signed in with it
};
const config = { ...defaults, ...(fs.existsSync(CONFIG_FILE) ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) : {}) };
if (!fs.existsSync(CONFIG_FILE)) fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

const args = process.argv.slice(2);
const LAN = args.includes('--lan');
const PORT = Number(process.env.WORKSPACE_PORT || process.env.PORT || config.port);
const HOST = LAN ? '0.0.0.0' : '127.0.0.1';

// Apps that open inside the workspace. Each `target` is served again on its own localhost `port` (see appProxy), so it
// is same-site with the workspace: the login cookie reaches it and X-Frame-Options no longer blocks the frame.
// `auth` = how the workspace signs the person in there; `start` = launcher for the Start button when the app is off.
// `embed` = a stylesheet in embed/ put into the app's pages when they are shown inside a workspace frame: it hides the
// app's own sidebar (the workspace draws one menu) and turns its solid black into the workspace's glass look - pages
// see-through over the aurora, frosted cards, Limelight yellow; pop-ups stay solid to be readable. Read on every page,
// so a change shows on the next reload.
// `part` = not an app of its own: its pages are part of another app's menu (Lighthouse pages live in Office).
const embedFile = (f) => { try { return fs.readFileSync(path.join(ROOT, 'embed', f), 'utf8'); } catch { return ''; } };
// (`embedJs` = a script in embed/ that tags the app's own elements for that stylesheet - see embed/office-hr.js)
const DEFAULT_APPS = [
  { id: 'editor', name: 'Edit', target: ['editorUrl', 'editorStandbyUrl'], port: 3341 },
  { id: 'design', name: 'Design', target: 'studioUrl', port: 3345,
    start: 'E:\\Limelight Ai\\limelight-studio\\Limelight Studio (no window).vbs' },
  { id: 'office', name: 'Office', target: 'http://127.0.0.1:3300', port: 3342,
    start: 'E:\\Limelight Ai\\limelight-office\\Limelight Office (no window).vbs',
    embed: 'office.css' },
  { id: 'lighthouse', name: 'Office', target: 'lighthouseUrl', port: 3343, auth: 'lighthouse', part: 'office',
    embed: 'office-hr.css', embedJs: 'office-hr.js' },
  { id: 'ai', name: 'Limelight AI', target: ['aiUrl', 'aiLocalUrl'], port: 3344, auth: 'ai' },
];
const apps = () => config.apps || DEFAULT_APPS;
// `target` may be a list (first that answers wins, checked every 20 s): the editor's line of PCs, AI on B or here
const urlOf = (t) => (config[t] || t || '').replace(/\/$/, '');
const live = new Map(); // app id -> url that answered last
const targetOf = (a) => (Array.isArray(a.target) ? live.get(a.id) || urlOf(a.target[0]) : urlOf(a.target));
async function resolveTargets() {
  for (const a of apps()) {
    if (!Array.isArray(a.target)) continue;
    for (const t of a.target) {
      const u = urlOf(t);
      try { const r = await fetch(u + '/', { signal: AbortSignal.timeout(2500), redirect: 'manual' }); if (r.status < 500) { live.set(a.id, u); break; } } catch { /* next */ }
    }
  }
}
resolveTargets(); setInterval(resolveTargets, 20000);

const auth = createAuth({ root: DATA, lighthouseUrl: () => config.lighthouseUrl, editorUrl: () => config.editorUrl,
  aiUrl: () => targetOf(apps().find((x) => x.id === 'ai') || { target: 'aiUrl' }), aiPassword: () => config.aiPassword,
  // (config.json "keepSignedIn": first names that sign in once per device and are never asked for the password again)
  keepSignedIn: (u) => (config.keepSignedIn || ['gurpreet']).map((n) => String(n).toLowerCase()).some((n) => n === firstName(u.name) || n === firstName(u.email)) });

const chat = createChat({ root: DATA });
const activity = createActivity({ root: DATA });
const salary = createSalary({ root: DATA });
const overtime = createOvertime({ root: DATA });
const dayAttendance = new Map(); // day -> { at, rows }: everyone's clock for a day, for the Overtime check (a minute)

// ---------- Lighthouse data for the signed-in person (their own token) ----------
async function lighthouse(user, p) {
  const r = await fetch(config.lighthouseUrl.replace(/\/$/, '') + p, { headers: { Authorization: `Bearer ${auth.lighthouseToken(user)}` },
    signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`Office server ${r.status}`);
  return (await r.json()).data;
}
const jwtId = (tok) => { try { return JSON.parse(Buffer.from(tok.split('.')[1], 'base64url').toString()).id; } catch { return null; } };
let peopleCache = { at: 0, list: [] };
// everyone who can be chatted with: Lighthouse staff, plus anyone who has signed in to the Workspace
async function people(user) {
  if (Date.now() - peopleCache.at > 5 * 60000) {
    try {
      const staff = await lighthouse(user, '/api/employees?limit=500');
      peopleCache = { at: Date.now(), list: (Array.isArray(staff) ? staff : staff?.items || []).filter((e) => e.email)
        .map((e) => ({ email: String(e.email).toLowerCase(), name: e.name || e.email.split('@')[0], dept: e.dept || e.department || '' })) };
    } catch { /* offline: workspace users only */ }
  }
  const byEmail = new Map(peopleCache.list.map((p) => [p.email, p]));
  for (const u of auth.users()) if (!byEmail.has(u.email)) byEmail.set(u.email, { email: u.email, name: u.name, dept: '' });
  const online = new Set(chat.online());
  return [...byEmail.values()].map((p) => ({ ...p, online: online.has(p.email), photo: fs.existsSync(photoFile(p.email)) })).sort((a, b) => a.name.localeCompare(b.name));
}
const nameMap = async (user) => Object.fromEntries((await people(user)).map((p) => [p.email, p.name]));
async function today(user) {
  const emp = jwtId(auth.lighthouseToken(user));
  const tasks = await lighthouse(user, `/api/tasks?assignee=${encodeURIComponent(emp || '')}&limit=50`);
  return (Array.isArray(tasks) ? tasks : []).filter((t) => !/done|complete|closed/i.test(t.status || ''))
    .slice(0, 6).map((t) => ({ title: t.title || t.name || 'Task', status: t.status || '', due: t.due_date || t.deadline || t.due || null }));
}

// Home dashboard: a little from every app in one call. Each part is null when its app does not answer.
// Home's numbers. Each source gets 3 s at most (a slow one shows "–", it never holds Home up), and the result is kept
// a minute per person: Home opens at once with it, and it is fetched again in the background after 15 s
const dashCache = new Map(); // email -> { at, data, busy }
async function dashboard(user) {
  const c = dashCache.get(user.email);
  if (c?.data && Date.now() - c.at < 60e3) {
    if (Date.now() - c.at > 15e3 && !c.busy) { c.busy = true; fetchDashboard(user).then((data) => dashCache.set(user.email, { at: Date.now(), data }), () => { c.busy = false; }); }
    return c.data;
  }
  const data = await fetchDashboard(user);
  dashCache.set(user.email, { at: Date.now(), data });
  return data;
}
async function fetchDashboard(user) {
  const within = (p, ms = 3000) => Promise.race([p, new Promise((_, bad) => setTimeout(() => bad(new Error('slow')), ms))]);
  const office = (p) => (officeAs(user) ? fetch('http://127.0.0.1:3300' + p, { headers: officeAs(user), signal: AbortSignal.timeout(3000) }).then((r) => (r.ok ? r.json() : null)) : Promise.resolve(null));
  const dayEnd = new Date().setHours(23, 59, 59, 999);
  const [tasks, punch, projects, activity, unread, meetings, status] = await Promise.allSettled([
    within(today(user)),
    within(lighthouse(user, '/api/attendance/today')),
    within(lighthouse(user, '/api/projects?limit=50')),
    within(lighthouse(user, '/api/activity?limit=8')),
    office('/api/lmail/unread'),
    office(`/api/cal?from=${new Date().toISOString()}&to=${new Date(dayEnd).toISOString()}`),
    Promise.all(apps().map(appStatus)),
  ]);
  const ok = (r) => (r.status === 'fulfilled' ? r.value : null);
  const mp = ok(punch)?.myPunch || ok(punch)?.punch || null;
  const plist = Array.isArray(ok(projects)) ? ok(projects) : ok(projects)?.items || null;
  return {
    tasks: ok(tasks),
    punch: ok(punch) ? { in: mp?.clock_in || null, out: mp?.clock_out || null } : null,
    projects: plist && plist.filter((x) => !/done|complete|closed|cancel/i.test(x.status || ''))
      .map((x) => ({ name: x.name, client: x.client || '', status: x.status || '' })),
    activity: Array.isArray(ok(activity)) ? ok(activity).slice(0, 8).map((a) => ({ text: a.text, at: a.created_at || a.at })) : null,
    mail: ok(unread) ? ok(unread).unread : null,
    meetings: Array.isArray(ok(meetings)) ? ok(meetings).map((e) => ({ title: e.title, start: e.start })) : null,
    status: Object.fromEntries((ok(status) || []).map((s) => [s.id, s.up])),
  };
}

// ---------- clock in / out (Lighthouse attendance) ----------
async function lighthouseSend(user, method, p, body) {
  const r = await fetch(config.lighthouseUrl.replace(/\/$/, '') + p, { method, body: JSON.stringify(body || {}),
    headers: { Authorization: `Bearer ${auth.lighthouseToken(user)}`, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(20000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j?.error?.message || j?.message || `Office server ${r.status}`), { status: r.status });
  return j.data;
}
async function punch(user) {
  const [t, st] = await Promise.all([lighthouse(user, '/api/attendance/today'), lighthouse(user, '/api/settings').catch(() => ({}))]);
  const mp = t?.myPunch || null;
  return { in: mp?.clock_in || null, out: mp?.clock_out || null, mode: mp?.mode || null, sessions: mp?.session_count || (mp ? 1 : 0),
    selfieIn: st?.selfieOnClockIn !== false, selfieOut: !!st?.selfieOnClockOut };
}

// ---------- profiles: only the safe fields (no salary, bank, IDs, phone) ----------
const SAFE = (e) => e && { id: e.id, name: e.name, title: e.role || '', dept: e.dept || '', email: String(e.email || '').toLowerCase(),
  empId: e.emp_id || '', joined: e.joined || '', shift: e.shift || '', ini: e.ini || '', active: e.active !== 0,
  leave: { casual: +(e.general_info?.casual_leave ?? 0) || null, sick: +(e.general_info?.sick_leave ?? 0) || null } };
let staffCache = { at: 0, list: [] };
async function staff(user) {
  if (Date.now() - staffCache.at > 5 * 60000 || !staffCache.list.length) {
    const r = await lighthouse(user, '/api/employees?limit=500');
    staffCache = { at: Date.now(), list: (Array.isArray(r) ? r : r?.items || []).map(SAFE).filter((e) => e.email && e.active) };
  }
  return staffCache.list;
}
const PHOTOS = path.join(DATA, 'photos');
const photoFile = (email) => path.join(PHOTOS, crypto.createHash('sha1').update(String(email).toLowerCase()).digest('hex') + '.jpg');
async function myProfile(user) {
  const me = await lighthouse(user, '/api/auth/me');
  const emp = SAFE(me?.employee) || { name: user.name, email: user.email, title: '', dept: '' };
  const month = new Date().toISOString().slice(0, 7);
  const [stats, leaves] = await Promise.allSettled([lighthouse(user, `/api/attendance/stats/${emp.id}?month=${month}`), lighthouse(user, '/api/leaves')]);
  const s = stats.status === 'fulfilled' ? stats.value : null;
  const mine = leaves.status === 'fulfilled' && Array.isArray(leaves.value) ? leaves.value.filter((l) => l.emp === emp.id) : [];
  return { ...emp, photo: fs.existsSync(photoFile(emp.email)),
    month: s && { month, present: s.present, half: s.half, absent: s.absent, late: s.late, leave: s.leave, workdays: s.workdaysSoFar, avgMin: s.avgWorkingMinutes, workedMin: s.totalWorkedMinutes },
    leaves: mine.slice(0, 20).map((l) => ({ kind: l.kind, from: String(l.from_date).slice(0, 10), to: String(l.to_date).slice(0, 10), status: l.status || 'pending', reason: l.reason || '' })) };
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.webmanifest': 'application/manifest+json',
};
function send(res, code, body, type = 'application/json', extra = {}) {
  const data = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', ...extra });
  res.end(data);
}
function readBody(req, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
const readJson = async (req) => JSON.parse((await readBody(req)).toString('utf8') || '{}');
// a page with each css/js link's ?v= set to that file's last change: an edited file gets a new link by itself, so the
// year-long cache below can never keep an old copy
async function servePage(res, name) {
  let html = await fsp.readFile(path.join(PUBLIC, name), 'utf8');
  const links = [...new Set([...html.matchAll(/(?:href|src)="((?:css|js)\/[\w.-]+)\?v=[^"]*"/g)].map((m) => m[1]))];
  const ver = await Promise.all(links.map((f) => fsp.stat(path.join(PUBLIC, f)).then((s) => Math.round(s.mtimeMs).toString(36), () => '0')));
  links.forEach((f, i) => { html = html.replace(new RegExp(`(["])${f.replace(/[.]/g, '\\.')}\\?v=[^"]*"`, 'g'), `$1${f}?v=${ver[i]}"`); });
  send(res, 200, html, MIME['.html'], { 'Cache-Control': 'no-cache' });
}
// cache: 'no-cache' (ask every time - the pages), or how long a phone / Cloudflare may keep the file without asking
async function serveFile(res, file, cache = 'no-cache', req = null) {
  const resolved = path.resolve(file);
  if (!resolved.startsWith(PUBLIC)) return send(res, 403, { error: 'forbidden' });
  try {
    const st = await fsp.stat(resolved), modified = st.mtime.toUTCString();
    // (the phone's copy is still current: "not changed", nothing sent again)
    if (req?.headers['if-modified-since'] === modified) { res.writeHead(304, { 'Cache-Control': cache, 'Last-Modified': modified }); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(resolved).toLowerCase()] || 'application/octet-stream',
      'Content-Length': st.size, 'Cache-Control': cache, 'Last-Modified': modified });
    fs.createReadStream(resolved).pipe(res);
  } catch { send(res, 404, { error: 'not found' }); }
}

// plain pass-through to another server (used for Studio's projects / library / AI image APIs)
function forward(req, res, base, extraHeaders = {}) {
  const t = new URL(base);
  const up = (t.protocol === 'https:' ? https : http).request({ hostname: t.hostname, port: t.port, method: req.method,
    path: req.url, headers: { ...req.headers, host: t.host, ...extraHeaders } }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
  up.on('error', () => { if (!res.headersSent) send(res, 502, { error: 'Limelight Studio is off - start the Design app' }); else res.end(); });
  req.pipe(up);
}

// ---------- workspace bits ----------
async function appStatus(a) {
  try {
    const r = await fetch(targetOf(a) + '/', { signal: AbortSignal.timeout(2500), redirect: 'manual' });
    return { id: a.id, up: r.status < 500 };
  } catch { return { id: a.id, up: false }; }
}

// Text-to-video is not installed yet: jobs are only recorded so the UI flow can be tried end to end.
const VIDEO_JOBS = path.join(DATA, 'video-requests.json');
async function videoRequest(b, user) {
  const list = fs.existsSync(VIDEO_JOBS) ? JSON.parse(await fsp.readFile(VIDEO_JOBS, 'utf8')) : [];
  const job = { id: Date.now().toString(36), prompt: String(b.prompt || '').slice(0, 2000), ratio: b.ratio, seconds: b.seconds,
    style: b.style, by: user.email, status: 'waiting-engine', created: Date.now() };
  list.unshift(job);
  await fsp.writeFile(VIDEO_JOBS, JSON.stringify(list.slice(0, 50), null, 2));
  return job;
}

// ---------- app proxies ----------
// a request that came in through the public domain (the tunnel sets the host and https)
const isPublic = (req) => { const h = String(req.headers.host || '').toLowerCase().split(':')[0];
  return h === config.publicDomain || h.endsWith('.' + config.publicDomain); };
const cookieDomain = (req) => (isPublic(req) ? config.publicDomain : '');
const proto = (req) => (isPublic(req) ? 'https' : 'http');
const homeUrl = (req) => (isPublic(req) ? `https://${config.publicHost}` : `http://localhost:${PORT}`);
const loginNeededPage = (req) => `<!doctype html><body style="margin:0;height:100vh;display:grid;place-content:center;text-align:center;
  background:#0b0c0f;color:#8b93a3;font:15px Segoe UI,sans-serif"><h2 style="color:#eceef2;margin:0 0 6px">Please sign in to Limelight first</h2>
  <p><a href="${homeUrl(req)}/login" target="_top" style="color:#ffc21a">Open the login page</a></p></body>`;
const offlinePage = (a) => `<!doctype html><body style="margin:0;height:100vh;display:grid;place-content:center;text-align:center;
  background:#0b0c0f;color:#8b93a3;font:15px Segoe UI,sans-serif"><h2 style="color:#eceef2;margin:0 0 6px">${a.name} is offline</h2>
  <p>${targetOf(a)} did not answer. Start the app, then press Reload.</p></body>`;

// the request's own cookies minus the workspace login, plus the app session the workspace holds for this person
// Limelight Office (this PC) signs each person in as themselves when Lighthouse vouches for them with Office's key
const OFFICE_KEY = 'E:/Limelight Ai/limelight-office/data/workspace.key';
function officeAs(user) {
  let key = ''; try { key = fs.readFileSync(OFFICE_KEY, 'utf8').trim(); } catch {}
  // no key: null, and the Office proxy refuses rather than letting the person in as the PC owner
  if (!key) return null;
  return { 'x-lh-key': key, 'x-lh-as': Buffer.from(JSON.stringify({ email: user.email, name: user.name, role: isAdmin(user) ? 'admin' : user.role, owner: isOwner(user) })).toString('base64url') };
}

// Edit (the editor PCs) signs a person in as their Edit team member when Lighthouse vouches with Edit's key. Who they are
// in Edit, the first of these that Edit has: config.json "editNames" (email -> an older Edit name), their office ID (the
// start of their email), their first name when no one else on the staff list shares it. Nobody gets Edit's own sign-in:
// no match means no Edit (noEditPage).
const EDIT_KEY = path.join(DATA, 'edit.key');
// Limelight AI (NAYA B) keeps each person's chats apart when the workspace says who it is, with the key it also has
// (D:\LimelightAI\app\data\workspace.key there); admins and owners also see the chats from before (no owner)
const AI_KEY = path.join(DATA, 'ai.key');
function aiAs(user) {
  let key = ''; try { key = fs.readFileSync(AI_KEY, 'utf8').trim(); } catch {}
  return key ? { 'x-lh-key': key, 'x-lh-user': user.email, 'x-lh-admin': isAdmin(user) ? '1' : '0' } : null;
}
const firstName = (s) => String(s || '').trim().split(/[\s._\-0-9@]+/)[0].toLowerCase();
// the owners (config.json "owners": first names): admins everywhere, and no clock-in, attendance or work-time tracking
const isOwner = (u) => !!u && (config.owners || ['jaspreet', 'gurpreet']).map((n) => String(n).toLowerCase()).some((n) => n === firstName(u.name) || n === firstName(u.email));
const isAdmin = (u) => !!u && (u.role === 'admin' || isOwner(u));
async function editAs(user) {
  let key = ''; try { key = fs.readFileSync(EDIT_KEY, 'utf8').trim(); } catch {}
  if (!key) return null;
  const list = await staff(user).catch(() => []);
  const count = (n) => list.filter((e) => firstName(e.name) === n || firstName(e.email) === n).length;
  const email = String(user.email || '').toLowerCase(), first = firstName(user.name);
  const names = [(config.editNames || {})[email], email.split('@')[0], first.length >= 3 && count(first) === 1 && first]
    .filter((n, i, all) => n && all.indexOf(n) === i);
  for (const name of names) {
    const vouch = { 'x-lh-key': key, 'x-lh-edit': name };
    if (await editMember(vouch)) return vouch;
  }
  return null;
}
// does Edit let this name in? (asked once a minute a name; an Edit that does not answer is given the benefit of the doubt)
const editMembers = new Map();
async function editMember(vouch) {
  const hit = editMembers.get(vouch['x-lh-edit']);
  if (hit && Date.now() - hit.at < 60e3) return hit.ok;
  let ok = true;
  try {
    const t = new URL(targetOf(apps().find((x) => x.id === 'editor')));
    const r = await fetch(t.origin + '/api/chat', { headers: vouch, signal: AbortSignal.timeout(5000) });
    r.body?.cancel?.();
    ok = r.status !== 401;
  } catch {}
  editMembers.set(vouch['x-lh-edit'], { at: Date.now(), ok });
  return ok;
}
const noEditPage = (user) => `<!doctype html><body style="margin:0;height:100vh;display:grid;place-content:center;text-align:center;
  background:#0b0c0f;color:#8b93a3;font:15px Segoe UI,sans-serif"><h2 style="color:#eceef2;margin:0 0 6px">Edit is not on for you yet</h2>
  <p>${String(user.name || user.email).replace(/[<>&"]/g, '')}, your Limelight login is used in Edit too - no second sign-in.<br>
  Ask the owner to add <b style="color:#ffc21a">${firstName(user.name) || firstName(user.email)}</b> to Edit's team, then press Reload.</p></body>`;

// put in every app page opened in a workspace frame: tells the workspace (the parent page) the page's path and title
const WHERE_JS = `<script>(function(){var last='';function t(){var w=location.pathname+location.search+location.hash,k=w+'|'+document.title;
if(k===last)return;last=k;try{parent.postMessage({lhWhere:w,title:document.title},'*');
if(parent!==top&&document.visibilityState==='visible')top.postMessage({lhWhere:w,title:document.title,inner:1},'*')}catch(e){}}
addEventListener('hashchange',t);addEventListener('popstate',t);addEventListener('load',t);setInterval(t,1500);
document.addEventListener('visibilitychange',function(){last='';t()});
var ao=location.ancestorOrigins,inLH=ao&&[].some.call(ao,function(o){return o!==location.origin});if(!inLH)return;
var la=0,act=function(){var n=Date.now();if(n-la>10000){la=n;try{top.postMessage({lhActive:1},'*')}catch(e){}}};
['mousemove','mousedown','keydown','wheel','touchstart'].forEach(function(k){addEventListener(k,act,{passive:true,capture:true})});
var go=function(h){top.postMessage({lhLaunch:h},'*')},ck=HTMLAnchorElement.prototype.click;
HTMLAnchorElement.prototype.click=function(){if(/^limelight:/i.test(this.href))return go(this.href);return ck.apply(this,arguments)};
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href^="limelight:"]');if(a){e.preventDefault();go(a.href)}},true)})()</script>`;
// "← Workspace" in the corner of Edit, Office and AI (Design has its own), in the app's own frame only (not in frames
// inside it, like Edit's project tabs): back to the workspace's Home
const HOME_JS = `<script>(function(){if(parent!==top)return;function add(){if(document.getElementById('lh-home'))return;
var b=document.createElement('button');b.id='lh-home';b.type='button';b.textContent='\\u2190 Workspace';b.title='Back to the Limelight workspace';
b.style.cssText='position:fixed;left:'+(window.__lhHomeLeft||10)+'px;bottom:'+(window.__lhHomeBottom||10)+'px;z-index:2147483000;font:600 12px Segoe UI,system-ui,sans-serif;color:#fff;background:rgba(18,16,28,.72);border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:6px 12px;cursor:pointer;backdrop-filter:blur(10px);opacity:.55;transition:opacity .15s';
b.onmouseenter=function(){b.style.opacity='1'};b.onmouseleave=function(){b.style.opacity='.55'};
b.onclick=function(){top.postMessage({lhHome:1},'*')};document.body.appendChild(b)}
if(document.body)add();else addEventListener('DOMContentLoaded',add)})()</script>`;
// (limelight:// links - Open in Premiere / DaVinci - go up to the workspace page: a frame may not start an app itself)

// Share: one card per person (a 1-to-1 chat) or group, that opens the thing inside the workspace. An Edit project is
// also shared in Edit itself with the people who have an Edit account (only its maker or the owner may do that).
const SHARE_APPS = ['editor', 'design', 'office', 'lighthouse', 'ai'];
async function editShare(user, project, emails) {
  const as = await editAs(user); if (!as) return 'Edit is not on for your login - the link was sent, but the project was not shared in Edit';
  const list = await staff(user).catch(() => []);
  const names = [];
  for (const e of emails) {
    const u = auth.users().find((x) => x.email === e), s = list.find((x) => x.email === e);
    const n = await editAs(u || { email: e, name: s?.name || '' }).catch(() => null);
    if (n) names.push(n['x-lh-edit']);
  }
  if (!names.length) return 'None of them has an Edit account';
  const t = new URL(targetOf(apps().find((x) => x.id === 'editor')));
  const call = async (method, body) => {
    const r = await fetch(`${t.origin}/api/projects/share?p=${encodeURIComponent(project)}`, { method,
      headers: { ...as, 'content-type': 'application/json' }, body: body && JSON.stringify(body), signal: AbortSignal.timeout(8000) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || `Edit said ${r.status}`);
    return j;
  };
  try {
    const now = await call('GET');
    const want = names.filter((n) => (now.people || []).some((p) => p.toLowerCase() === n.toLowerCase()))
      .map((n) => now.people.find((p) => p.toLowerCase() === n.toLowerCase()));
    if (!want.length) return 'None of them has an Edit account';
    await call('POST', { shared: [...new Set([...(now.shared || []), ...want])] });
    return `Shared in Edit with ${want.join(', ')}`;
  } catch (e) { return `Link sent, but Edit did not share the project: ${e.message}`; }
}
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

async function share(user, b) {
  const me = user.email;
  let body = { text: String(b.note || '').slice(0, 2000) };
  if (b.fromChat && b.fromMsg) { // forward a message from a chat the sender is in
    const m = chat.history(me, b.fromChat).find((x) => x.id === b.fromMsg);
    if (!m || m.deleted || m.system) throw Object.assign(new Error('That message is gone'), { code: 404 });
    body = { text: [b.note, m.text].filter((x) => String(x || '').trim()).join('\n\n').slice(0, 8000), fileRef: m.file, share: m.share, forwarded: true };
  } else {
    if (!SHARE_APPS.includes(b.app)) throw Object.assign(new Error('Nothing to share'), { code: 400 });
    body.share = { app: b.app, path: String(b.path || '/').slice(0, 600), title: String(b.title || '').slice(0, 140) };
  }
  const to = [...new Set((b.to || []).map((e) => String(e).toLowerCase()).filter((e) => e && e !== me))];
  const rooms = [];
  for (const e of to) rooms.push((await chat.direct(me, e)).id);
  for (const g of b.groups || []) rooms.push(chat.get(String(g), me).id);
  if (!rooms.length) throw Object.assign(new Error('Pick someone to share with'), { code: 400 });
  for (const r of new Set(rooms)) await chat.send(me, r, body);
  const proj = body.share?.app === 'editor' && /#\/p\/([^/?#]+)/.exec(body.share.path || '');
  let edit = null;
  if (proj) {
    const groupPeople = (b.groups || []).flatMap((g) => chat.get(String(g), me).members);
    edit = await editShare(user, decodeURIComponent(proj[1]), [...new Set([...to, ...groupPeople])].filter((e) => e !== me));
  }
  return { ok: true, sent: new Set(rooms).size, edit };
}

// jar: saved app cookies (Edit) added only where the browser has none of its own
function cookieHeader(req, inject, jar = {}) {
  const keep = (req.headers.cookie || '').split(/;\s*/).filter((c) => c && !c.startsWith('lw_sess=') && !(inject && c.startsWith(inject[0] + '=')));
  if (inject) keep.push(`${inject[0]}=${inject[1]}`);
  for (const [k, v] of Object.entries(jar)) if (!keep.some((c) => c.startsWith(k + '='))) keep.push(`${k}=${v}`);
  return keep.join('; ');
}

// Visitors who typed http://limelightcorp.net come through Cloudflare as plain http: send them to https first.
function toHttps(req, res) {
  const host = String(req.headers.host || '');
  const plain = req.headers['x-forwarded-proto'] === 'http' || /"scheme":"http"/.test(req.headers['cf-visitor'] || '');
  if (!plain ||!/(^|\.)limelightcorp\.net$/.test(host)) return false;
  res.writeHead(301, { location: 'https://' + host + req.url });
  res.end();
  return true;
}

// Reverse proxy: localhost:<a.port> -> target. Strips the headers that forbid framing, rewrites redirects and cookie
// domains, passes SSE / WebSocket through, and signs the person in (cookie for AI, saved token for Lighthouse).
function appProxy(a) {
  const strip = ['x-frame-options', 'content-security-policy', 'strict-transport-security'];
  const srv = http.createServer(async (req, res) => {
    if (toHttps(req, res)) return;
    const user = auth.userOf(req);
    if (!user) return send(res, 401, loginNeededPage(req), 'text/html; charset=utf-8');
    // the workspace's font, for the look put into the HR pages (embed/office-hr.css)
    if (req.url === '/__ll/inter.woff2') return serveFile(res, path.join(PUBLIC, 'fonts', 'inter-latin-wght-normal.woff2'));
    const t = new URL(targetOf(a));
    let inject = null;
    if (a.auth === 'ai') inject = await auth.appCookie(user, a.auth).catch(() => null);
    const vouch = a.id === 'editor' ? await editAs(user) : a.id === 'ai' ? aiAs(user) : null;
    // (no Edit team member for this person: say so - never Edit's own sign-in, never someone else's account)
    if (a.id === 'editor' && !vouch) return /text\/html/.test(req.headers.accept || '')
      ? send(res, 403, noEditPage(user), 'text/html; charset=utf-8') : send(res, 403, { error: 'No Edit access for this login' });
    const framed = req.headers['sec-fetch-dest'] === 'iframe';
    const isPage = (a.auth === 'lighthouse' || framed) && req.method === 'GET' && /text\/html/.test(req.headers.accept || '');
    const go = (retry) => {
      const headers = { ...req.headers, host: t.host, cookie: cookieHeader(req, inject) };
      // (Edit: the vouch alone - an Edit cookie left in this browser from an old sign-in is not passed on)
      if (a.id === 'editor') headers.cookie = String(headers.cookie || '').split(/;\s*/).filter((c) => c && !c.startsWith('ve_sess=')).join('; ');
      delete headers['x-lh-as']; delete headers['x-lh-key']; delete headers['x-lh-edit']; delete headers['x-lh-user']; delete headers['x-lh-admin'];
      if (vouch) Object.assign(headers, vouch);
      // Design (Studio, this PC only) shows who is editing a design live: the person signed in here
      if (a.id === 'design') headers['x-lh-as'] = Buffer.from(JSON.stringify({ email: user.email, name: user.name })).toString('base64url');
      if (a.id === 'office') { const as = officeAs(user); if (!as) return send(res, 503, offlinePage(a), 'text/html; charset=utf-8'); Object.assign(headers, as); }
      if (!headers.cookie) delete headers.cookie;
      for (const h of ['origin', 'referer']) if (headers[h]) headers[h] = headers[h].replace(/^https?:\/\/[^/]+/, t.origin);
      if (isPage) headers['accept-encoding'] = 'identity';
      // (a page we add to must come back in full - a "not modified" answer would skip what is added)
      if (isPage) { delete headers['if-none-match']; delete headers['if-modified-since']; }
      const up = (t.protocol === 'https:' ? https : http).request({ protocol: t.protocol, hostname: t.hostname, port: t.port,
        method: req.method, path: req.url, headers }, async (r) => {
        // our app session expired: sign in again once (only safe to repeat bodiless requests)
        if (r.statusCode === 401 && inject && retry && ['GET', 'HEAD'].includes(req.method)) {
          r.resume(); auth.forgetApp(user, a.auth);
          inject = await auth.appCookie(user, a.auth).catch(() => null);
          return go(false);
        }
        if (r.statusCode === 401 && inject) auth.forgetApp(user, a.auth);
        if (r.statusCode === 401 && a.id === 'editor') editMembers.delete(vouch['x-lh-edit']);
        const out = { ...r.headers };
        for (const h of strip) delete out[h];
        const here = `${proto(req)}://${req.headers.host}`;
        if (out.location) out.location = out.location.replace(t.origin, here);
        if (out['set-cookie']) out['set-cookie'] = out['set-cookie'].map((c) => c.replace(/;\s*domain=[^;]+/i, ''));
        if (isPage && /text\/html/.test(out['content-type'] || '')) {
          // Lighthouse keeps its login token in localStorage: put the person's token there before the app starts.
          // Inside a workspace frame the app's own sidebar is hidden and it takes the workspace's look (embed).
          const chunks = []; for await (const c of r) chunks.push(c);
          let inject = framed && a.embed ? `<style>${embedFile(a.embed)}</style>` : '';
          if (framed && a.embedJs) inject += `<script>${embedFile(a.embedJs).replace(/<\/script/gi, '<\\/script')}</script>`;
          // (inside the workspace every app says what is open in it, for the workspace's Share button)
          // (Edit's own logo is in its bottom-left corner: the button goes just right of it)
          if (framed) inject += WHERE_JS + (a.id === 'design' ? '' : (a.id === 'editor' ? '<script>window.__lhHomeLeft=128;window.__lhHomeBottom=8</script>' : '') + HOME_JS);
          if (a.auth === 'lighthouse') {
            const tok = JSON.stringify(auth.lighthouseToken(user));
            inject += `<script>try{if(localStorage.getItem('lh-token')!==${tok}){localStorage.setItem('lh-token',${tok});localStorage.removeItem('lh-auth-user')}}catch(e){}</script>`;
            // (in the workspace, no full-screen "Slide to clock in": the workspace's Home has the clock-in card)
            if (framed) inject += `<script>try{sessionStorage.setItem('lh-splash-seen','1')}catch(e){}</script>`;
          }
          // (Limelight AI shows a name in its corner from localStorage: the person who is signed in, not a fixed one)
          if (a.id === 'ai') inject += `<script>try{localStorage.setItem('ll_name',${JSON.stringify(String(user.name || user.email || '')).replace(/</g, '\\u003c')})}catch(e){}</script>`;
          let html = Buffer.concat(chunks).toString('utf8').replace(/<head[^>]*>/i, (m) => m + inject);
          // (an editor not yet redeployed shows its project tabs only when it is the top page: in the workspace frame
          // it counts as top too - its own tab frames sit one level deeper and stay plain editors)
          if (framed && a.id === 'editor') html = html.replace('const tabs = window.top === window &&', 'const tabs = (window.top === window || window.parent === window.top) &&');
          delete out['content-length']; delete out['content-encoding'];
          res.writeHead(r.statusCode, out); return res.end(html);
        }
        res.writeHead(r.statusCode, out);
        r.pipe(res);
      });
      up.on('error', () => { if (!res.headersSent) send(res, 502, offlinePage(a), 'text/html; charset=utf-8'); else res.end(); });
      if (retry) req.pipe(up); else up.end();
    };
    go(true);
  });
  srv.on('upgrade', async (req, sock, head) => {
    const user = auth.userOf(req);
    if (!user) return sock.destroy();
    const inject = a.auth === 'ai' ? await auth.appCookie(user, a.auth).catch(() => null) : null;
    const editVouch = a.id === 'editor' ? await editAs(user) : null;
    if (a.id === 'editor' && !editVouch) return sock.destroy();
    const t = new URL(targetOf(a));
    const conn = t.protocol === 'https:'
      ? tls.connect({ host: t.hostname, port: t.port || 443, servername: t.hostname })
      : net.connect({ host: t.hostname, port: t.port || 80 });
    conn.once(t.protocol === 'https:' ? 'secureConnect' : 'connect', () => {
      const lines = [`${req.method} ${req.url} HTTP/1.1`];
      for (let i = 0; i < req.rawHeaders.length; i += 2) {
        const k = req.rawHeaders[i];
        if (/^(cookie|x-lh-as|x-lh-key|x-lh-edit|x-lh-user|x-lh-admin)$/i.test(k)) continue;
        lines.push(`${k}: ${/^host$/i.test(k) ? t.host : req.rawHeaders[i + 1]}`);
      }
      const ck = cookieHeader(req, inject).split(/;\s*/).filter((c) => c && !(editVouch && c.startsWith('ve_sess='))).join('; ');
      if (ck) lines.push(`Cookie: ${ck}`);
      if (editVouch) for (const [k, v] of Object.entries(editVouch)) lines.push(`${k}: ${v}`);
      if (a.id === 'office') { const as = officeAs(user); if (!as) return sock.destroy(); for (const [k, v] of Object.entries(as)) lines.push(`${k}: ${v}`); }
      conn.write(lines.join('\r\n') + '\r\n\r\n'); if (head?.length) conn.write(head);
      conn.pipe(sock); sock.pipe(conn);
    });
    conn.on('error', () => sock.destroy()); sock.on('error', () => conn.destroy());
  });
  srv.on('error', (e) => console.error(`${a.name} proxy on ${a.port}:`, e.message));
  srv.listen(a.port, HOST);
}

// ---------- router ----------
const OPEN = /^\/(login|login\.html|options\.html|home-options\.html|bento-options\.html|dash-concepts\.html|header-options\.html|api\/login|api\/health|css\/|fonts\/|img\/|js\/theme-boot\.js$|js\/frame\.js$|manifest\.webmanifest$|sw\.js$|offline\.html$)/;
const server = http.createServer(async (req, res) => {
  if (toHttps(req, res)) return;
  const u = new URL(req.url, 'http://x');
  const p = decodeURIComponent(u.pathname);
  try {
    if (p === '/api/health') return send(res, 200, { ok: true, app: 'Lighthouse', version: '1.1.0' });
    if (p === '/api/login' && req.method === 'POST') {
      const b = await readJson(req);
      const s = await auth.login(b.email, b.password).catch((e) => { console.log(new Date().toISOString(), 'login failed', b.email, '-', e.message); throw e; });
      console.log(new Date().toISOString(), 'login ok', b.email, req.headers.host, String(req.headers['user-agent'] || '').slice(0, 60));
      return send(res, 200, { ok: true, offline: s.offline, user: s.user }, 'application/json', { 'Set-Cookie': auth.sessionCookie(s.token, cookieDomain(req), s.keep) });
    }
    if (p === '/api/logout' && req.method === 'POST') { auth.logout(req); return send(res, 200, { ok: true }, 'application/json', { 'Set-Cookie': auth.clearCookie(cookieDomain(req)) }); }

    const user = auth.userOf(req);
    // (signed in and used today: the 30 days start again, on this device's cookie too)
    if (user) { const c = auth.renew(req, cookieDomain(req)); if (c) res.setHeader('Set-Cookie', c); }
    if (!user && !OPEN.test(p)) {
      // (sign-in trouble: who gets sent back to the login page, and whether their browser sent the sign-in cookie at all)
      if (p === '/' || p === '/api/me') console.log(new Date().toISOString(), 'not signed in', p, req.headers.host, /lw_sess=/.test(req.headers.cookie || '') ? 'cookie sent (unknown/expired)' : 'no cookie', String(req.headers['user-agent'] || '').slice(0, 60));
      if (p.startsWith('/api/')) return send(res, 401, { error: 'login needed' });
      res.writeHead(302, { Location: '/login' }); return res.end();
    }
    if (p === '/login') return user ? (res.writeHead(302, { Location: '/' }), res.end()) : servePage(res, 'login.html');

    if (p === '/api/me') return send(res, 200, { ...auth.publicUser(user.email), admin: isAdmin(user), owner: isOwner(user), aiReady: !!config.aiPassword,
      hrId: jwtId(auth.lighthouseToken(user) || ''), owners: config.owners || ['jaspreet', 'gurpreet'] }); // (HR id and the owners, who do not clock in: the new Office pages)
    // one-time office setup by an admin: the Limelight AI password, so nobody ever sees the AI's own login.
    // Studio gets it too (it makes the AI pictures).
    if (p === '/api/settings/ai' && req.method === 'POST') {
      if (!isAdmin(user)) return send(res, 403, { error: 'Only an admin can set this' });
      const pw = String((await readJson(req)).password || '');
      if (!pw) return send(res, 400, { error: 'Enter the password' });
      config.aiPassword = pw; fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2)); auth.forgetAll('ai');
      let studio = true;
      try { await fetch(config.studioUrl + '/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aiPassword: pw }), signal: AbortSignal.timeout(4000) }); }
      catch { studio = false; }
      let check = 'The AI server is off right now — it will sign in by itself once it is on';
      try { await auth.appCookie(user, 'ai'); check = 'Connected to Limelight AI'; } catch (e) { if (!/fetch failed|timeout|aborted/i.test(e.message)) check = e.message; }
      return send(res, 200, { ok: true, check, studio });
    }
    let m;
    if (p === '/api/punch' && isOwner(user)) return send(res, 200, { owner: true }); // (owners do not clock in)
    if (p === '/api/punch' && req.method === 'GET') return send(res, 200, await punch(user));
    if (p === '/api/punch' && req.method === 'POST') {
      const b = JSON.parse((await readBody(req, 3 * 1024 * 1024)).toString('utf8') || '{}');
      const body = { addr: String(b.addr || '').slice(0, 200) };
      if (Number.isFinite(b.lat) && Number.isFinite(b.lng)) Object.assign(body, { lat: b.lat, lng: b.lng, acc: b.acc });
      if (typeof b.selfie === 'string' && b.selfie.startsWith('data:image/')) body.selfie = b.selfie;
      try {
        if (b.action === 'out') await lighthouseSend(user, 'POST', '/api/attendance/clock-out', body);
        else await lighthouseSend(user, 'POST', '/api/attendance/clock-in', { ...body, mode: ['office', 'wfh', 'field'].includes(b.mode) ? b.mode : 'office' });
      } catch (e) { return send(res, e.status && e.status < 500 ? 400 : 502, { error: e.message }); }
      return send(res, 200, await punch(user));
    }
    if (p === '/api/profile') return send(res, 200, await myProfile(user));
    if (p === '/api/team') {
      const list = await staff(user).catch(async () => (await people(user)).map((x) => ({ name: x.name, email: x.email, dept: x.dept, title: '' })));
      const online = new Set(chat.online());
      return send(res, 200, list.map(({ leave, ...e }) => ({ ...e, photo: fs.existsSync(photoFile(e.email)), online: online.has(e.email) })));
    }
    if ((m = /^\/api\/photo\/([^/]+)$/.exec(p)) && req.method === 'GET') {
      const f = photoFile(decodeURIComponent(m[1]));
      if (!fs.existsSync(f)) return send(res, 404, { error: 'no photo' });
      res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=60' });
      return fs.createReadStream(f).pipe(res);
    }
    // own photo; an admin may set anyone's
    if (p === '/api/photo' && req.method === 'POST') {
      const b = JSON.parse((await readBody(req, 3 * 1024 * 1024)).toString('utf8') || '{}');
      const who = String(b.email || user.email).toLowerCase();
      if (who !== user.email && !isAdmin(user)) return send(res, 403, { error: 'Only your own photo' });
      const mm = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(b.image || ''));
      if (!mm) return send(res, 400, { error: 'Send a JPEG picture' });
      fs.mkdirSync(PHOTOS, { recursive: true });
      await fsp.writeFile(photoFile(who), Buffer.from(mm[1], 'base64'));
      return send(res, 200, { ok: true });
    }
    if (p === '/api/today') return send(res, 200, { tasks: await today(user) });
    if (p === '/api/dashboard') return send(res, 200, await dashboard(user));

    // ---------- chats ----------
    const me = user?.email;
    if (p === '/api/chat/stream') return chat.stream(req, res, me);
    if (p === '/api/chat/people') return send(res, 200, await people(user));
    if (p === '/api/chat/list') return send(res, 200, chat.list(me));
    // ---------- work time (5 minutes without mouse / keyboard ends a session) ----------
    if (p === '/api/activity/beat' && req.method === 'POST') return send(res, 200, isOwner(user) ? { owner: true } : activity.beat(user.email, await readJson(req)));
    if (p === '/api/activity') {
      const who = String(u.searchParams.get('who') || user.email).toLowerCase(), d = u.searchParams.get('day') || undefined;
      if (who !== user.email && !isAdmin(user)) return send(res, 403, { error: 'Only your own time' });
      if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) return send(res, 400, { error: 'Bad day' });
      return send(res, 200, activity.report(who, d));
    }
    // Profile > Time. Staff: their own clock in / clock out for the day. Admins: everyone's day - clock in / out, active
    // work in Lighthouse's apps (sessions), and their tasks' time (planned vs taken). The owners are left out.
    // ---------- Salary (admins and owners): Lighthouse's payroll figures + typed OT / adjustments -> the month's pay ----------
    // ---------- Overtime (Office › Overtime): everyone writes their own OT a day; admins see everyone's and approve ----------
    // Each entry is checked against that day's clock-in / clock-out in the HR attendance.
    if (p.startsWith('/api/ot')) {
      const month = u.searchParams.get('month') || new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 7);
      if (!/^\d{4}-\d{2}$/.test(month)) return send(res, 400, { error: 'Bad month' });
      const emp = jwtId(auth.lighthouseToken(user) || '');
      if (!emp) return send(res, 400, { error: 'Your HR account is not linked yet' });
      const me = { emp, email: user.email, name: user.name }, admin = isAdmin(user);
      try {
        if (p === '/api/ot' && req.method === 'GET') {
          const all = admin && u.searchParams.get('all') === '1', entries = overtime.list(month, all ? {} : { emp });
          const st = await lighthouse(user, '/api/settings').catch(() => ({})), hpd = +st?.hoursPerDay || 8;
          const recs = new Map(), key = (e, d) => `${e}|${d}`;
          if (all) {
            for (const d of [...new Set(entries.map((e) => e.date))]) {
              let c = dayAttendance.get(d);
              if (!c || Date.now() - c.at > 60e3) { c = { at: Date.now(), rows: await lighthouse(user, `/api/attendance?date=${d}`).catch(() => []) }; dayAttendance.set(d, c); }
              for (const r of c.rows || []) recs.set(key(r.emp, r.date || d), r);
            }
          } else for (const r of await lighthouse(user, `/api/attendance?empId=${emp}&month=${month}`).catch(() => []) || []) recs.set(key(emp, r.date), r);
          const today = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
          return send(res, 200, { month, admin, hoursPerDay: hpd, me: emp, today: overtime.clockOf(recs.get(key(emp, today)), hpd),
            entries: entries.map((e) => { const c = overtime.clockOf(recs.get(key(e.emp, e.date)), hpd); return { ...e, clock: c, check: overtime.check(e, c) }; }) });
        }
        if (p === '/api/ot' && req.method === 'POST') return send(res, 200, overtime.save(me, await readJson(req)));
        if (p === '/api/ot/remove' && req.method === 'POST') { const b = await readJson(req); return send(res, 200, overtime.remove(me, b.month || month, b.id, admin)); }
        if (p === '/api/ot/review' && req.method === 'POST') {
          if (!admin) return send(res, 403, { error: 'Admins only' });
          const b = await readJson(req); return send(res, 200, overtime.review(user.name || user.email, b.month || month, b.id, b));
        }
      } catch (err) { return send(res, err.status || 500, { error: err.message }); }
    }
    if (p.startsWith('/api/salary')) {
      if (!isAdmin(user)) return send(res, 403, { error: 'Admins only' });
      const month = u.searchParams.get('month') || new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 7);
      if (!/^\d{4}-\d{2}$/.test(month)) return send(res, 400, { error: 'Bad month' });
      if (p === '/api/salary/input' && req.method === 'POST') return send(res, 200, salary.setInput(month, await readJson(req)));
      if (p === '/api/salary/rules' && req.method === 'POST') return send(res, 200, salary.setRules(await readJson(req)));
      if (p === '/api/salary') {
        const [pay, st] = await Promise.all([lighthouse(user, `/api/payroll?month=${month}`), lighthouse(user, '/api/settings').catch(() => ({}))]);
        return send(res, 200, salary.compute(pay, st, month, (e) => isOwner(e), overtime.approvedByEmp(month)));
      }
    }
    // ---------- Office's new Home, Tasks and Projects pages (public/js/office-pages.js): the HR data, as this person ----------
    // Reads from a short list; writes only to tasks, to-dos and projects (the HR server checks who may do what).
    if (p.startsWith('/api/hr/')) {
      const sub = p.slice(7) + u.search, top = p.split('/')[3];
      const READ = ['tasks', 'projects', 'todos', 'activity', 'employees', 'departments', 'productivity', 'performance', 'attendance', 'holidays', 'clients'];
      const WRITE = ['tasks', 'todos', 'projects'];
      if (req.method === 'GET') { if (!READ.includes(top)) return send(res, 403, { error: 'Not available' }); return send(res, 200, { data: await lighthouse(user, `/api${sub}`) }); }
      if (!WRITE.includes(top)) return send(res, 403, { error: 'Not available' });
      try { return send(res, 200, { data: await lighthouseSend(user, req.method, `/api${sub}`, await readJson(req).catch(() => ({}))) }); }
      catch (err) { return send(res, err.status || 500, { error: err.message }); }
    }
    if (p === '/api/timeboard') {
      const d = u.searchParams.get('day') || new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return send(res, 400, { error: 'Bad day' });
      const list = await staff(user).catch(() => []);
      const att = await lighthouse(user, `/api/attendance?date=${d}&limit=1000`).catch(() => []);
      const punchOf = (id) => { const a = (att || []).find((x) => x.emp === id); return a ? { in: a.clock_in || '', out: a.clock_out || '', status: a.status || '', late: !!a.late, mode: a.mode || '', breakMins: a.break_mins || 0 } : null; };
      if (!isAdmin(user)) {
        const me = list.find((e) => e.email === user.email);
        return send(res, 200, { day: d, me: { name: user.name, punch: me ? punchOf(me.id) : null } });
      }
      const tasks = await lighthouse(user, '/api/tasks?limit=1000').catch(() => []);
      const onDay = (t) => [t.assigned, t.started_at, t.completed_at, t.updated_at].some((x) => String(x || '').slice(0, 10) === d);
      const rows = list.filter((e) => !isOwner(e)).map((e) => {
        const a = activity.report(e.email, d), mine = (tasks || []).filter((t) => t.assignee === e.id && onDay(t));
        return { email: e.email, name: e.name, dept: e.dept, punch: punchOf(e.id), active: a.all, total: a.total, sessions: a.sessions,
          tasks: mine.map((t) => ({ title: t.title, type: t.type || '', status: t.status, planned: +t.mins || 0, taken: +t.taken_mins || 0 })),
          taskMins: mine.reduce((n, t) => n + (+t.taken_mins || 0), 0) };
      }).filter((r) => r.punch || r.active || r.tasks.length)
        .sort((x, y) => (y.active - x.active) || (y.taskMins - x.taskMins) || x.name.localeCompare(y.name));
      return send(res, 200, { day: d, rows });
    }
    if (p === '/api/activity/team') {
      if (!isAdmin(user)) return send(res, 403, { error: 'Admins only' });
      const d = u.searchParams.get('day') || undefined;
      if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) return send(res, 400, { error: 'Bad day' });
      return send(res, 200, { items: activity.team(d) });
    }
    if (p === '/api/renders') { if (u.searchParams.get('fresh')) rendersCache.delete(user.email); return send(res, 200, await renders(user)); }
    if (p === '/api/share' && req.method === 'POST') return send(res, 200, await share(user, await readJson(req)));
    if (p === '/api/chat/direct' && req.method === 'POST') return send(res, 200, await chat.direct(me, (await readJson(req)).email));
    if (p === '/api/chat/group' && req.method === 'POST') return send(res, 200, await chat.group(me, { ...(await readJson(req)), myName: user.name }));
    if ((m = /^\/api\/chat\/([a-z0-9]+)$/.exec(p)) && req.method === 'PATCH')
      return send(res, 200, await chat.update(me, m[1], await readJson(req), await nameMap(user)));
    if ((m = /^\/api\/chat\/([a-z0-9]+)\/messages$/.exec(p))) {
      if (req.method === 'GET') return send(res, 200, chat.history(me, m[1], u.searchParams.get('before')));
      if (req.method === 'POST') return send(res, 200, await chat.send(me, m[1], JSON.parse((await readBody(req, 40 * 1024 * 1024)).toString('utf8'))));
    }
    if ((m = /^\/api\/chat\/([a-z0-9]+)\/messages\/([a-z0-9]+)$/.exec(p)) && req.method === 'DELETE') return send(res, 200, await chat.remove(me, m[1], m[2]));
    if ((m = /^\/api\/chat\/([a-z0-9]+)\/read$/.exec(p)) && req.method === 'POST') return send(res, 200, await chat.read(me, m[1]));
    if ((m = /^\/api\/chat\/([a-z0-9]+)\/typing$/.exec(p)) && req.method === 'POST') return send(res, 200, chat.typing(me, m[1]));
    if (p.startsWith('/chatfiles/')) {
      const f = chat.fileOf(p.slice(11)); if (!f) return send(res, 404, { error: 'not found' });
      res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Cache-Control': 'private, max-age=86400',
        ...(/\.(png|jpe?g|gif|webp|mp4|pdf)$/i.test(f) ? { 'Content-Type': ({ png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', mp4: 'video/mp4', pdf: 'application/pdf' })[f.split('.').pop().toLowerCase()] } : {}) });
      return fs.createReadStream(f).pipe(res);
    }
    if (p === '/api/apps') return send(res, 200, apps().map(({ id, name, port, start, part }) => ({ id, name, port, part, canStart: !!start, host: config.appHosts?.[id] })));
    if (p === '/api/apps/status') return send(res, 200, await Promise.all(apps().map(appStatus)));
    if (/^\/api\/apps\/[a-z0-9_-]+\/start$/i.test(p) && req.method === 'POST') {
      const a = apps().find((x) => x.id === p.split('/')[3]);
      if (!a?.start || !fs.existsSync(a.start)) return send(res, 404, { error: 'no launcher' });
      exec(/\.vbs$/i.test(a.start) ? `wscript "${a.start}"` : `start "" /min "${a.start}"`, { cwd: path.dirname(a.start) });
      return send(res, 200, { ok: true });
    }
    if (p === '/api/ai/video' && req.method === 'GET')
      return send(res, 200, fs.existsSync(VIDEO_JOBS) ? JSON.parse(await fsp.readFile(VIDEO_JOBS, 'utf8')) : []);
    if (p === '/api/ai/video' && req.method === 'POST') return send(res, 200, await videoRequest(await readJson(req), user));

    // Studio owns designs, the picture library and AI images
    if (/^\/api\/(projects|library|ai\/)/.test(p) || /^\/(projects|library)\//.test(p)) return forward(req, res, config.studioUrl);
    if (p.startsWith('/api/')) return send(res, 404, { error: 'unknown api' });
    // a file with ?v= in its link changes name when it changes (index.html), so a phone keeps it a year without asking;
    // fonts and pictures for 30 days. (Behind the login only the phone keeps it - "private" - not Cloudflare.)
    const cache = u.searchParams.has('v') ? `${OPEN.test(p) ? 'public' : 'private'}, max-age=31536000, immutable`
      : /^\/(fonts|img)\//.test(p) ? 'public, max-age=2592000' : 'no-cache';
    if (p === '/' || p === '/index.html') return servePage(res, 'index.html');
    if (p === '/login.html') return servePage(res, 'login.html');
    return serveFile(res, path.join(PUBLIC, p), cache, req);
  } catch (e) {
    if (!e.code || e.code >= 500 || typeof e.code !== 'number') console.error(new Date().toISOString(), p, e);
    send(res, typeof e.code === 'number' && e.code >= 400 && e.code < 600 ? e.code : 500, { error: e.message });
  }
});

for (const a of apps()) if (a.port) appProxy(a);
server.listen(PORT, HOST, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`Lighthouse running at ${url}`);
  if (LAN) for (const n of Object.values(os.networkInterfaces()).flat())
    if (n.family === 'IPv4' && !n.internal) console.log(`  LAN: http://${n.address}:${PORT}`);
  if (args.includes('--open') && process.platform === 'win32') exec(`start "" "${url}"`);
});

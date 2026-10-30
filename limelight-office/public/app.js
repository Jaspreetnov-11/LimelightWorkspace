// Limelight Office - browser side. Plain modules, no build step.
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const view = $('#view');

// ---------- icons ----------
const P = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.5 2.5M15.2 15.2l2.5 2.5M6.3 17.7l2.5-2.5M15.2 8.8l2.5-2.5"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>',
  cal: '<rect x="3" y="4.5" width="18" height="16.5" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
  drive: '<path d="M8.5 3.5h7l6 10.5-3.5 6.5h-11L3 14z"/><path d="M8.5 3.5 15 14.5H3M15.5 3.5 9 14.5M18 20.5 15 14.5"/>',
  office: '<rect x="3.5" y="3" width="17" height="18" rx="2"/><path d="M7.5 8h9M7.5 12h9M7.5 16h5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  word: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M8.5 12l1.3 5 1.7-4 1.7 4 1.3-5"/>',
  excel: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 12l5 5M14 12l-5 5"/>',
  ppt: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9.5 17v-5h2.2a1.6 1.6 0 0 1 0 3.2H9.5"/>',
  pdf: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M8.5 16.5h7M8.5 13h7"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  send: '<path d="M21 3 10 14M21 3l-7 18-4-7-7-4z"/>',
  reply: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 6 6v4"/>',
  fwd: '<path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0-6 6v4"/>',
  archive: '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  unread: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="18" cy="6" r="3" fill="currentColor"/>',
  dl: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  up: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
  open: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  clip: '<path d="m21 11-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3z"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.6-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16M20 20v-4h-4"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  brief: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  leaf: '<path d="M5 19c0-9 6-14 15-14 0 9-5 15-14 15zM5 19l7-7"/>',
  build: '<path d="M4 21V5l8-3 8 3v16M9 21v-5h6v5M8 9h1M15 9h1M8 13h1M15 13h1"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0"/>',
  money: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9v.01M18 15v.01"/>',
  chart: '<path d="M4 20h16M7 16v-5M12 16V6M17 16v-8"/>',
  task: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="m8 12 3 3 5-6"/>',
  news: '<path d="M4 5h13v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M17 9h3v10a1 1 0 0 1-2 0M7.5 9h6M7.5 12.5h6M7.5 16h4"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  bot: '<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 4v4M9 13v1.5M15 13v1.5M2 13v3M22 13v3"/><circle cx="12" cy="3.5" r="1"/>',
  wand: '<path d="m4 20 11-11M14 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM19 11l.7 1.3L21 13l-1.3.7L19 15l-.7-1.3L17 13l1.3-.7z"/>',
  agent: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/><path d="m17 3 1 1.5L19.5 5 18 6l-1 1.5L16 6l-1.5-1L16 4.5z"/>',
  people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/>',
  storage: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  pdfout: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 11v6M9.5 14.5 12 17l2.5-2.5"/>',
};
const ic = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24">${P[n] || P.file}</svg>`;
const KIND = { word: ['word', 'c-word'], excel: ['excel', 'c-excel'], ppt: ['ppt', 'c-ppt'], pdf: ['pdf', 'c-pdf'], file: ['file', 'c-file'] };
const kindOf = (name = '', mime = '') => {
  if (/folder$/.test(mime)) return 'folder';
  if (/\.(docx?|rtf)$/i.test(name) || /document/.test(mime)) return 'word';
  if (/\.(xlsx?|xlsm|csv)$/i.test(name) || /spreadsheet|sheet/.test(mime)) return 'excel';
  if (/\.(pptx?)$/i.test(name) || /presentation/.test(mime)) return 'ppt';
  if (/\.pdf$/i.test(name) || /pdf/.test(mime)) return 'pdf';
  return 'file';
};
const fileIcon = (k) => k === 'folder' ? `<div class="ic c-cal">${ic('folder')}</div>` : `<div class="ic ${KIND[k]?.[1] || 'c-file'}">${ic(KIND[k]?.[0] || 'file')}</div>`;

// ---------- api ----------
async function api(method, url, body) {
  const opt = { method, headers: { 'x-llo': '1' } };
  if (body instanceof Blob || body instanceof ArrayBuffer) opt.body = body;
  else if (body !== undefined) { opt.headers['content-type'] = 'application/json'; opt.body = JSON.stringify(body); }
  const r = await fetch(url, opt);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.error || `Error ${r.status}`); e.code = j.code; throw e; }
  return j;
}
const GET = (u) => api('GET', u), POST = (u, b = {}) => api('POST', u, b);

function toast(msg, bad = false) {
  const t = document.createElement('div');
  t.className = `toast${bad ? ' bad' : ''}`; t.textContent = msg;
  $('#toasts').append(t);
  setTimeout(() => t.remove(), bad ? 6000 : 3200);
}
const fail = (e) => toast(e.message || String(e), true);

// ---------- time ----------
const TZ = 'Asia/Kolkata';
const dayKey = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: TZ });
const fmtT = (d) => new Date(d).toLocaleTimeString('en-IN', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });
const fmtD = (d, o = { weekday: 'short', day: 'numeric', month: 'short' }) => new Date(d).toLocaleDateString('en-IN', { timeZone: TZ, ...o });
function ago(t) {
  const d = new Date(t), now = new Date();
  if (dayKey(d) === dayKey(now)) return fmtT(d);
  if (now - d < 6 * 864e5) return fmtD(d, { weekday: 'short' });
  return fmtD(d, { day: 'numeric', month: 'short', ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}) });
}
const fromName = (f = '') => (f.match(/^"?([^"<]+?)"?\s*</)?.[1] || f.replace(/<.*>/, '')).trim() || f;
const fromEmail = (f = '') => f.match(/<([^>]+)>/)?.[1] || f;
const initials = (n = '') => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
const size = (b) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : b > 1e3 ? `${Math.round(b / 1e3)} KB` : `${b || 0} B`);

// ---------- tiny markdown for assistant replies ----------
function md(src = '') {
  const lines = esc(src).split('\n'); let out = '', list = null, table = [];
  const inline = (s) => s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/(https?:\/\/[^\s<)]+)/g, '<a href="$1" target="_blank" style="color:var(--accent)">$1</a>');
  const flushList = () => { if (list) { out += `</${list}>`; list = null; } };
  const flushTable = () => {
    if (!table.length) return;
    out += '<table>' + table.filter((r) => !/^\|[\s:|-]+\|$/.test(r)).map((r, i) => `<tr>${r.slice(1, -1).split('|').map((c) => `<${i ? 'td' : 'th'}>${inline(c.trim())}</${i ? 'td' : 'th'}>`).join('')}</tr>`).join('') + '</table>';
    table = [];
  };
  for (const raw of lines) {
    const l = raw.trim(); let m;
    if (/^\|.*\|$/.test(l)) { flushList(); table.push(l); continue; }
    flushTable();
    if ((m = l.match(/^[-*•]\s+(.*)/))) { if (list !== 'ul') { flushList(); out += '<ul>'; list = 'ul'; } out += `<li>${inline(m[1])}</li>`; }
    else if ((m = l.match(/^\d+[.)]\s+(.*)/))) { if (list !== 'ol') { flushList(); out += '<ol>'; list = 'ol'; } out += `<li>${inline(m[1])}</li>`; }
    else { flushList(); if ((m = l.match(/^#{1,4}\s+(.*)/))) out += `<p><b>${inline(m[1])}</b></p>`; else if (l) out += `<p>${inline(l)}</p>`; }
  }
  flushList(); flushTable();
  return out;
}

// ---------- shell ----------
let status = null, me = null, team = [], online = new Set();
const isAdmin = () => me?.role === 'admin';
const isLocal = () => !!status?.local;
// The same Office menu as the Lighthouse workspace (OFFICE_MENU there): [key, label, icon, 'o' | 'lh', route or Lighthouse path, admin only]
const NAV = [
  ['Work', ['home', 'Dashboard', 'home', 'lh', '/dashboard'], ['mail', 'Mail', 'mail', 'o', 'mail'], ['calendar', 'Calendar', 'cal', 'o', 'calendar'],
    ['meetings', 'Meetings', 'video', 'o', 'meetings'], ['tasks', 'Tasks', 'task', 'lh', '/tasks'], ['projects', 'Projects', 'brief', 'lh', '/projects'],
    ['files', 'Files', 'folder', 'o', 'storage']],
  ['Create', ['document', 'Document', 'word', 'o', 'document'], ['grid', 'Grid', 'excel', 'o', 'grid'], ['deck', 'Deck', 'ppt', 'o', 'present']],
  ['AI', ['agent', 'Agent', 'agent', 'o', 'agent'], ['assist', 'AI Assistance', 'wand', 'o', 'assist']],
  ['Team', ['attendance', 'Attendance', 'clock', 'lh', '/attendance'], ['leaves', 'Leaves / WFH', 'leaf', 'lh', '/leaves'], ['staff', 'Staff', 'people', 'lh', '/staff'],
    ['departments', 'Departments', 'build', 'lh', '/departments'], ['events', 'Events', 'flag', 'lh', '/events'], ['news', 'News', 'news', 'o', 'news'],
    ['alerts', 'Notifications', 'bell', 'lh', '/notifications']],
  ['Admin', ['payroll', 'Payroll', 'money', 'lh', '/payroll', true], ['payments', 'Payments', 'file', 'lh', '/payments', true], ['clients', 'Clients', 'brief', 'lh', '/clients', true],
    ['reports', 'Reports', 'chart', 'lh', '/reports', true], ['performance', 'Performance', 'flag', 'lh', '/performance', true]],
  ['', ['settings', 'Settings', 'gear', 'lh', '/settings'], ['setup', 'Office setup', 'gear', 'o', 'setup']],
];
const NAV_ITEMS = NAV.flatMap(([, ...items]) => items);
const navHref = (it) => (it[3] === 'lh' ? `#lh/${it[0]}` : `#${it[4]}`);
function drawNav(unread = 0) {
  const [cur, sub] = location.hash.slice(1).split('/');
  const on = (it) => (cur === 'lh' ? it[3] === 'lh' && it[0] === (sub || 'home') : it[3] === 'o' && (it[4] === (cur || 'home') || (cur === 'meet' && it[0] === 'meetings') || (cur === 'storage' && it[0] === 'files')))
    || (!cur && it[0] === 'home');
  $('#nav').innerHTML = NAV.map(([sec, ...items]) => {
    const vis = items.filter((i) => !i[5] || isAdmin());
    return vis.length ? `${sec ? `<div class="sec">${sec}</div>` : '<div class="sep"></div>'}${vis.map((it) => `<a href="${navHref(it)}" class="${on(it) ? 'on' : ''}">${ic(it[2])}<span>${it[1]}</span>${it[0] === 'mail' && unread ? `<i class="badge">${unread}</i>` : ''}</a>`).join('')}` : '';
  }).join('');
}
// a Lighthouse page inside Office (served through this app's Lighthouse proxy, its own sidebar hidden)
function lhPage(key = 'home') {
  const it = NAV_ITEMS.find((i) => i[0] === key && i[3] === 'lh') || NAV_ITEMS[0];
  if (it[5] && !isAdmin()) return lhPage('home');
  view.className = 'view full';
  const src = `${status?.lhBase || ''}${it[4]}`;
  const f = $('#lh-frame');
  if (f && f.dataset.src === src) return;
  view.innerHTML = `<div class="lh-wrap">${!status?.lighthouse && isLocal() ? `<div class="lh-note">${ic('people')}The HR pages ask you to sign in once here. To also bring the staff list into Mail, Calendar and Meetings, sign in under <a href="#setup/account">Office setup → My account</a>.</div>` : ''}
    <iframe id="lh-frame" data-src="${esc(src)}" src="${esc(src)}" allow="clipboard-read; clipboard-write; fullscreen; camera; microphone"></iframe></div>`;
}
const avatar = (u, cls = '') => `<div class="avatar ${cls}" style="background:${u?.color || 'var(--panel-3)'}22;color:${u?.color || 'var(--text)'}">${initials(u?.name || '?')}</div>`;
let notesList = [];
function drawAccount() {
  if (!me) { $('#account').innerHTML = ''; return; }
  const unseen = notesList.filter((n) => !n.seen).length;
  $('#account').innerHTML = `<button class="acct" id="acct" title="My account">${avatar(me)}<div class="who"><div>${esc(me.name)}</div><div>${esc(me.title || (isAdmin() ? 'Admin' : 'Team'))}</div></div></button>
    <button class="icon-btn bell" id="bell" title="Notifications">${ic('unread')}${unseen ? `<i class="dot-n">${unseen}</i>` : ''}</button>`;
  $('#acct').onclick = () => (location.hash = 'setup');
  $('#bell').onclick = openNotes;
}
async function openNotes() {
  try { notesList = await GET('/api/notes'); } catch {}
  const m = modal(`<h2>${ic('unread')} Notifications</h2><div class="list">${notesList.length ? notesList.map((n) => `<a class="item${n.seen ? '' : ' new'}" href="${esc(n.link || '#home')}" data-close><div class="ic ${{ mail: 'c-mail', invite: 'c-cal', meet: 'c-cal', task: 'c-excel', done: 'c-excel', share: 'c-word' }[n.kind] || 'c-file'}">${ic({ share: 'people', mail: 'mail', invite: 'cal', update: 'cal', cancel: 'cal', rsvp: 'cal', meet: 'video', task: 'task', done: 'check' }[n.kind] || 'spark')}</div><div class="main"><div class="t" style="white-space:normal">${esc(n.text)}</div><div class="s">${ago(n.created)}</div></div></a>`).join('') : '<div class="empty">Nothing new</div>'}</div><div class="foot"><button class="btn" data-close>Close</button></div>`);
  $$('a[data-close]', m).forEach((a) => (a.onclick = () => closeModal()));
  POST('/api/notes/seen').catch(() => {}); notesList.forEach((n) => (n.seen = 1)); drawAccount();
}
function drawTheme() {
  const light = document.documentElement.dataset.theme === 'light';
  $('#theme').innerHTML = ic(light ? 'moon' : 'sun');
}
$('#theme').onclick = () => {
  const t = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('llo-theme', t); } catch {}
  drawTheme();
};
async function refreshStatus(fresh = false) {
  status = await GET(`/api/status${fresh ? '?fresh=1' : ''}`).catch(() => status);
  if (status?.me) me = status.me;
  drawAccount();
  return status;
}
async function refreshTeam() { try { const t = await GET('/api/team'); team = t.users; online = new Set(t.online); } catch {} return team; }
let unread = 0;
async function refreshUnread() {
  if (!me) return;
  try { unread = (await GET('/api/lmail/unread')).unread; drawNav(unread); } catch {}
}

// one live connection per tab: notifications, who is online, meeting signals
const CID = Math.random().toString(36).slice(2, 12);
let stream = null;
function connectLive() {
  stream?.close();
  stream = new EventSource(`/api/stream?cid=${CID}`);
  stream.addEventListener('note', (e) => {
    const n = JSON.parse(e.data); notesList.unshift(n); drawAccount();
    toast(n.text);
    if (n.kind === 'mail') refreshUnread();
    if (n.kind === 'meet') ringing(n);
    try { if (document.hidden && Notification.permission === 'granted') new Notification('Limelight Office', { body: n.text, icon: '/img/limelight-triangle.svg' }); } catch {}
    window.dispatchEvent(new CustomEvent('llo-note', { detail: n }));
  });
  stream.addEventListener('presence', (e) => { online = new Set(JSON.parse(e.data)); window.dispatchEvent(new CustomEvent('llo-presence')); });
  stream.addEventListener('rtc', (e) => window.dispatchEvent(new CustomEvent('llo-rtc', { detail: JSON.parse(e.data) })));
  stream.addEventListener('co', (e) => window.dispatchEvent(new CustomEvent('llo-co', { detail: JSON.parse(e.data) })));
}
function ringing(n) {
  const m = modal(`<h2>${ic('video')} Incoming meeting</h2><p>${esc(n.text)}</p><div class="foot"><button class="btn ghost" data-close>Not now</button><a class="btn primary" href="${esc(n.link)}" id="ring-join">${ic('video')}Join</a></div>`);
  $('#ring-join', m).onclick = () => closeModal();
}
// calendar reminders: 10 minutes before
const reminded = new Set();
async function remind() {
  if (!me) return;
  try {
    const evs = await GET(`/api/cal?from=${new Date().toISOString()}&to=${new Date(Date.now() + 11 * 60e3).toISOString()}`);
    for (const e of evs) {
      const k = `${e.id}:${e.start}`; if (reminded.has(k) || e.allDay || e.rsvp === 'no') continue;
      reminded.add(k);
      const txt = `${e.title} — ${fmtT(e.start)}${e.room ? ' (video)' : ''}`;
      toast(`⏰ ${txt}`);
      try { if (Notification.permission === 'granted') new Notification('Starting soon', { body: txt, icon: '/img/limelight-triangle.svg' }); } catch {}
    }
  } catch {}
}

const loading = (t = 'Loading') => `<div class="loading"><span class="spin"></span>${t}…</div>`;

// ---------- sign in (team members on the office network) ----------
function loginPage(err = '') {
  document.body.classList.add('signin');
  view.innerHTML = `<div class="login"><form class="login-card" id="lg">
      <img src="/img/limelight-triangle.svg" alt=""><h1>Limelight <b>Office</b></h1><p>Sign in with your <b>Limelight</b> email and password.</p>
      <label class="f"><span>Email</span><input class="input" id="lg-u" type="email" autocomplete="username" autofocus></label>
      <label class="f"><span>Password</span><input class="input" id="lg-p" type="password" autocomplete="current-password"></label>
      ${err ? `<p class="lg-err">${esc(err)}</p>` : ''}
      <button class="btn primary" style="width:100%;justify-content:center;height:42px">Sign in</button></form></div>`;
  $('#lg').onsubmit = async (e) => {
    e.preventDefault();
    try { await POST('/api/login', { email: $('#lg-u').value, password: $('#lg-p').value }); location.reload(); }
    catch (er) { loginPage(er.message); }
  };
}

// ---------- modal ----------
function modal(html, { wide = false } = {}) {
  const m = $('#modal');
  m.innerHTML = `<div class="sheet${wide ? ' wide' : ''}">${html}</div>`;
  m.hidden = false;
  m.onclick = (e) => { if (e.target === m) closeModal(); };
  $$('[data-close]', m).forEach((b) => (b.onclick = closeModal));
  setTimeout(() => $('input, textarea', m)?.focus(), 30);
  return m;
}
function closeModal() { $('#modal').hidden = true; $('#modal').innerHTML = ''; }
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });

// ---------- shared actions ----------
async function openLocal(path) {
  if (!isLocal()) { location.href = `/api/files/raw?path=${encodeURIComponent(path)}`; return; }
  try { await POST('/api/files/open', { path }); toast('Opening…'); } catch (e) { fail(e); }
}
async function revealLocal(path) { try { await POST('/api/files/reveal', { path }); } catch (e) { fail(e); } }
async function pdfLocal(path) { toast('Making PDF…'); try { const r = await POST('/api/files/pdf', { path }); toast(`PDF ready: ${r.file.split('\\').pop()}`); return r; } catch (e) { fail(e); } }
function fileActions(path, { mail = true } = {}) {
  return `<button class="icon-btn" title="${isLocal() ? 'Open in Office' : 'Download'}" data-act="open" data-path="${esc(path)}">${ic(isLocal() ? 'open' : 'dl')}</button>
    ${isLocal() ? `<button class="icon-btn" title="Show in folder" data-act="reveal" data-path="${esc(path)}">${ic('folder')}</button>` : ''}
    ${/\.pdf$/i.test(path) ? '' : `<button class="icon-btn" title="Save as PDF" data-act="pdf" data-path="${esc(path)}">${ic('pdfout')}</button>`}

    ${mail ? `<button class="icon-btn" title="Send by mail" data-act="mail" data-path="${esc(path)}">${ic('send')}</button>` : ''}`;
}
function bindFileActions(root, after) {
  $$('[data-act]', root).forEach((b) => (b.onclick = async (e) => {
    e.stopPropagation();
    const p = b.dataset.path;
    if (b.dataset.act === 'open') openLocal(p);
    if (b.dataset.act === 'reveal') revealLocal(p);
    if (b.dataset.act === 'pdf') { await pdfLocal(p); after?.(); }
    if (b.dataset.act === 'mail') compose({ attachments: [p] });
  }));
}

// ---------- HOME ----------
async function home() {
  const hour = +new Date().toLocaleString('en-IN', { timeZone: TZ, hour: 'numeric', hour12: false });
  const hi = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  view.innerHTML = `<div class="page">
    <div class="head"><div class="grow"><h1>${hi}${me ? `, ${esc(me.name.split(' ')[0])}` : ''}</h1><p>${fmtD(Date.now(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p></div><div class="team-strip" id="h-team"></div></div>
    <form class="ask" id="ask"><img src="/img/limelight-triangle.svg" alt=""><input placeholder="Ask the Agent — “summarise today’s mail”, “set up a meeting with Ravi tomorrow at 3”, “make a proposal Document”"><button class="btn primary">${ic('send')}Ask</button></form>
    <div class="quick">
      <button class="tile" data-new="mail"><div class="ic c-mail">${ic('mail')}</div><div><b>New mail</b><small>Limelight Mail</small></div></button>
      <button class="tile" data-new="event"><div class="ic c-cal">${ic('cal')}</div><div><b>New event</b><small>Calendar</small></div></button>
      <button class="tile" data-new="meet"><div class="ic c-cal">${ic('video')}</div><div><b>Meet now</b><small>Video call</small></div></button>
      <button class="tile" data-new="word"><div class="ic c-word">${ic('word')}</div><div><b>Document</b><small>New document</small></div></button>
      <button class="tile" data-new="excel"><div class="ic c-excel">${ic('excel')}</div><div><b>Grid</b><small>New sheet</small></div></button>
      <button class="tile" data-new="ppt"><div class="ic c-ppt">${ic('ppt')}</div><div><b>Deck</b><small>New deck</small></div></button>
    </div>
    <div class="grid g4">
      <div class="card"><h3>${ic('cal')}Today & next<a href="#calendar">Calendar</a></h3><div id="h-ev">${loading()}</div></div>
      <div class="card"><h3>${ic('mail')}Unread<a href="#mail">Inbox</a></h3><div id="h-mail">${loading()}</div></div>
      <div class="card"><h3>${ic('task')}My tasks<a href="#task">All tasks</a></h3><div id="h-task">${loading()}</div></div>
      <div class="card"><h3>${ic('storage')}Recent files<a href="#storage/pc">Storage</a></h3><div id="h-files">${loading()}</div></div>
    </div></div>`;
  $('#ask').onsubmit = (e) => { e.preventDefault(); const v = $('#ask input').value.trim(); if (v) { pendingAsk = v; location.hash = 'agent/new'; } };
  $$('[data-new]').forEach((b) => (b.onclick = () => ({ mail: () => compose(), event: () => newEvent(), meet: () => meetNow(), word: () => (location.hash = 'document/new/blank'), excel: () => (location.hash = 'grid/new/blank'), ppt: () => (location.hash = 'present/new/blank') })[b.dataset.new]()));
  refreshTeam().then(() => { const el = $('#h-team'); if (el) el.innerHTML = team.filter((u) => u.id !== me.id).slice(0, 8).map((u) => `<span class="tm${online.has(u.id) ? ' on' : ''}" title="${esc(u.name)}${online.has(u.id) ? ' · online' : ''}">${avatar(u)}</span>`).join(''); });

  GET('/api/files').then(({ items }) => {
    $('#h-files').innerHTML = items.length ? `<div class="list">${items.slice(0, 6).map((f) => `<div class="item" data-path="${esc(f.path)}">${fileIcon(f.kind)}<div class="main"><div class="t">${esc(f.name)}</div><div class="s">${ago(f.modified)}</div></div></div>`).join('')}</div>` : '<div class="empty">No files yet — make one above</div>';
    $$('#h-files .item').forEach((el) => (el.onclick = () => editLocal(el.dataset.path)));
  }).catch(() => ($('#h-files').innerHTML = '<div class="empty">—</div>'));
  GET('/api/ltasks?scope=mine').then((ts) => {
    const open = ts.filter((t) => t.status !== 'done');
    $('#h-task').innerHTML = open.length ? `<div class="list">${open.slice(0, 6).map((t) => `<a class="item" href="#task"><span class="tick pr-${t.priority}"></span><div class="main"><div class="t">${esc(t.title)}</div><div class="s${t.due && t.due < dayKey(Date.now()) ? ' late' : ''}">${t.due ? fmtD(t.due + 'T12:00:00+05:30') : ''}${t.owner && t.owner.id !== me.id ? `${t.due ? ' · ' : ''}from ${esc(t.owner.name)}` : ''}</div></div></a>`).join('')}</div>` : '<div class="empty">All done ✨</div>';
  }).catch((e) => ($('#h-task').innerHTML = `<div class="empty">${esc(e.message)}</div>`));
  GET(`/api/cal?from=${new Date().toISOString()}&to=${new Date(Date.now() + 7 * 864e5).toISOString()}`).then((evs) => {
    $('#h-ev').innerHTML = evs.length ? `<div class="list">${evs.slice(0, 6).map((e) => `<a class="item" href="#calendar/${e.id}"><div class="when"><b>${e.allDay ? 'All' : fmtT(e.start).replace(/\s?[ap]m/i, '')}</b><small>${dayKey(e.start) === dayKey(Date.now()) ? 'Today' : fmtD(e.start, { weekday: 'short' })}</small></div><div class="main"><div class="t">${esc(e.title)}</div><div class="s">${e.allDay ? 'All day' : `${fmtT(e.start)} – ${fmtT(e.end)}`}${e.guests.length ? ` · ${e.guests.length + 1} people` : ''}</div></div>${e.room ? `<span class="icon-btn" title="Video meeting">${ic('video')}</span>` : ''}</a>`).join('')}</div>` : '<div class="empty">Nothing in the next 7 days</div>';
  }).catch((e) => ($('#h-ev').innerHTML = `<div class="empty">${esc(e.message)}</div>`));
  GET('/api/lmail?box=unread').then(({ items }) => {
    $('#h-mail').innerHTML = items.length ? `<div class="list">${items.slice(0, 6).map((m) => `<a class="item" href="#mail/${encodeURIComponent(m.id)}"><div class="avatar">${initials(m.from)}</div><div class="main"><div class="t">${esc(m.from)}</div><div class="s">${esc(m.subject || '(no subject)')}</div></div><span class="meta">${ago(m.date)}</span></a>`).join('')}</div>` : '<div class="empty">Inbox zero ✨</div>';
  }).catch((e) => ($('#h-mail').innerHTML = `<div class="empty">${esc(e.message)}</div>`));
}

// ---------- MAIL (Limelight Mail: team mail + the company mailbox) ----------
const BOXES = [['inbox', 'Inbox'], ['unread', 'Unread'], ['starred', 'Starred'], ['sent', 'Sent'], ['archive', 'Archive'], ['trash', 'Trash']];
let mailState = { box: 'inbox', q: '', items: [], open: null, domain: false };
async function mail(id) {
  id = id ? decodeURIComponent(id) : '';
  view.innerHTML = `<div class="mail${id ? ' reading' : ''}">
    <div class="mail-list">
      <div class="mail-top">
        <div class="row"><h2>Mail</h2><button class="icon-btn" id="m-ref" title="Refresh">${ic('refresh')}</button><button class="btn primary sm" id="m-new">${ic('plus')}Compose</button></div>
        <form class="search" id="m-s">${ic('search')}<input class="input" placeholder="Search mail" value="${esc(mailState.q)}"></form>
        <div class="tabs scroll">${BOXES.map((b) => `<button data-box="${b[0]}" class="${mailState.box === b[0] ? 'on' : ''}">${b[1]}</button>`).join('')}</div>
      </div>
      <div id="m-note"></div>
      <div class="mails" id="mails">${loading()}</div>
    </div>
    <div class="reader" id="reader"><div class="empty" style="margin:auto">${ic('mail')}<br>Select a mail</div></div>
  </div>`;
  $('#m-new').onclick = () => compose();
  $('#m-ref').onclick = () => loadMails();
  $('#m-s').onsubmit = (e) => { e.preventDefault(); mailState.q = $('#m-s input').value.trim(); loadMails(); };
  $$('[data-box]').forEach((b) => (b.onclick = () => { mailState.box = b.dataset.box; $$('[data-box]').forEach((x) => x.classList.toggle('on', x === b)); loadMails(); }));
  await loadMails();
  if (id) readMail(id);
}
async function loadMails() {
  const el = $('#mails'); if (!el) return;
  try {
    const r = await GET(`/api/lmail?${new URLSearchParams({ box: mailState.box, q: mailState.q })}`);
    mailState.items = r.items; mailState.domain = r.domain;
    $('#m-note').innerHTML = r.extError ? `<div class="m-banner bad">${ic('x')}Company mailbox: ${esc(r.extError)} — <a href="#setup">check My mail</a></div>`
      : !r.domain ? `<div class="m-banner">${ic('mail')}Team mail · kept on Limelight's own server</div>` : '';
    drawMails();
  } catch (e) { el.innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
}
function drawMails() {
  const el = $('#mails'); if (!el) return;
  el.innerHTML = mailState.items.length ? mailState.items.map((m) => `<div class="m${m.unread ? ' unread' : ''}${mailState.open === m.id ? ' on' : ''}" data-id="${esc(m.id)}">
      <span class="dot${m.unread ? '' : ' off'}"></span><span class="from">${esc(m.from || m.fromAddr)}${m.source === 'team' ? '<i class="src">Team</i>' : ''}</span><span class="date">${m.starred ? '★ ' : ''}${ago(m.date)}</span>
      <span></span><span class="subj">${m.hasAtt ? '📎 ' : ''}${esc(m.subject || '(no subject)')}</span><span></span><span class="snip">${esc(m.snippet || m.fromAddr || '')}</span></div>`).join('')
    : `<div class="empty">${mailState.q ? 'Nothing found' : 'No mail here'}</div>`;
  $$('.m', el).forEach((r) => (r.onclick = () => { history.replaceState(null, '', `#mail/${encodeURIComponent(r.dataset.id)}`); readMail(r.dataset.id); }));
}
async function readMail(id) {
  mailState.open = id; drawMails();
  $('.mail')?.classList.add('reading');
  const rd = $('#reader'); rd.innerHTML = loading('Opening');
  try {
    const m = await GET(`/api/lmail/${encodeURIComponent(id)}`);
    const it = mailState.items.find((x) => x.id === id); if (it?.unread) { it.unread = false; drawMails(); refreshUnread(); }
    rd.innerHTML = `<div class="bar">
        <button class="icon-btn" id="r-back" title="Back">${ic('back')}</button>
        <button class="btn sm" id="r-reply">${ic('reply')}Reply</button><button class="btn sm" id="r-all">${ic('reply')}Reply all</button><button class="btn sm" id="r-fwd">${ic('fwd')}Forward</button>
        <button class="btn sm ghost" id="r-ai">${ic('spark')}Ask AI</button><span class="grow"></span>
        <button class="icon-btn" id="r-star" title="Star">${m.starred ? '★' : '☆'}</button>
        <button class="icon-btn" id="r-unread" title="Mark unread">${ic('unread')}</button>
        <button class="icon-btn" id="r-arch" title="Archive">${ic('archive')}</button>
        <button class="icon-btn" id="r-bin" title="Move to Trash">${ic('trash')}</button></div>
      <div class="body"><h1>${esc(m.subject || '(no subject)')}</h1>
        <div class="sender"><div class="avatar">${initials(m.from)}</div><div class="who"><b>${esc(m.from)}</b> <span class="faint">&lt;${esc(m.fromAddr)}&gt;</span> ${m.source === 'team' ? '<i class="src">Team</i>' : ''}<div class="muted">to ${esc(m.to)}${m.cc ? `, cc ${esc(m.cc)}` : ''}</div></div><span class="faint">${new Date(m.date).toLocaleString('en-IN', { timeZone: TZ, dateStyle: 'medium', timeStyle: 'short' })}</span></div>
        ${m.html ? '<iframe class="mailframe" sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin" referrerpolicy="no-referrer"></iframe>' : `<div class="mailtext">${esc(m.text)}</div>`}
        ${m.atts.length ? `<div class="atts">${m.atts.map((a) => `<div class="att">${fileIcon(kindOf(a.name, a.type)).replace('class="ic', 'style="width:28px;height:28px" class="ic')}<div><div>${esc(a.name)}</div><div class="faint" style="font-size:11.5px">${size(a.size)}</div></div><div class="acts"><a class="icon-btn" title="Download" href="/api/lmail/${encodeURIComponent(id)}/att/${a.n}">${ic('dl')}</a><button class="icon-btn" title="Save to my files & open" data-att="${a.n}">${ic('open')}</button></div></div>`).join('')}</div>` : ''}
      </div>`;
    if (m.html) {
      const f = $('.mailframe', rd);
      f.srcdoc = `<base target="_blank"><style>body{font:14px/1.5 Arial,sans-serif;margin:16px;color:#222;word-break:break-word}img{max-width:100%;height:auto}</style>${m.html}`;
      f.onload = () => { try { f.style.height = `${f.contentDocument.documentElement.scrollHeight + 20}px`; } catch {} };
    }
    const quote = () => `\n\nOn ${new Date(m.date).toLocaleString('en-IN', { timeZone: TZ })}, ${m.from} wrote:\n${(m.text || '').split('\n').map((l) => `> ${l}`).join('\n').slice(0, 4000)}`;
    const re = /^re:/i.test(m.subject) ? m.subject : `Re: ${m.subject}`;
    $('#r-back').onclick = () => { $('.mail').classList.remove('reading'); history.replaceState(null, '', '#mail'); };
    $('#r-reply').onclick = () => compose({ to: m.source === 'team' ? m.from : m.fromAddr, subject: re, body: quote(), inReplyTo: m.messageId, references: m.references, thread: m.thread });
    $('#r-all').onclick = () => compose({ to: [m.source === 'team' ? m.from : m.fromAddr, ...m.to.split(',').map((s) => s.trim())].filter((x) => x && x !== me.name && x !== me.email).join(', '), cc: m.cc, subject: re, body: quote(), inReplyTo: m.messageId, thread: m.thread });
    $('#r-fwd').onclick = () => compose({ subject: `Fwd: ${m.subject}`, body: `\n\n---------- Forwarded message ----------\nFrom: ${m.from} <${m.fromAddr}>\nSubject: ${m.subject}\n\n${m.text || ''}` });
    $('#r-ai').onclick = () => { pendingAsk = `Give a short summary of this mail and suggest a reply (id ${m.id}): "${m.subject}" from ${m.from}`; location.hash = 'agent/new'; };
    $('#r-star').onclick = async () => { await POST(`/api/lmail/${encodeURIComponent(id)}/flag`, { starred: !m.starred }).catch(fail); readMail(id); loadMails(); };
    $('#r-unread').onclick = async () => { await POST(`/api/lmail/${encodeURIComponent(id)}/flag`, { seen: false }).catch(fail); loadMails(); refreshUnread(); };
    $('#r-arch').onclick = async () => { try { await POST(`/api/lmail/${encodeURIComponent(id)}/move`, { to: 'archive' }); toast('Archived'); rd.innerHTML = ''; loadMails(); } catch (e) { fail(e); } };
    $('#r-bin').onclick = async () => { try { await POST(`/api/lmail/${encodeURIComponent(id)}/move`, { to: 'trash' }); toast('Moved to Trash'); rd.innerHTML = ''; loadMails(); refreshUnread(); } catch (e) { fail(e); } };
    $$('[data-att]', rd).forEach((b) => (b.onclick = async () => { try { const r = await POST(`/api/lmail/${encodeURIComponent(id)}/save-att/${b.dataset.att}`); editLocal(r.path); } catch (e) { fail(e); } }));
  } catch (e) { rd.innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
}

async function compose(pre = {}) {
  let files = [];
  try { files = (await GET('/api/files')).items; } catch {}
  if (!team.length) await refreshTeam();
  const atts = new Set(pre.attachments || []), uploads = [];
  const m = modal(`<h2><span class="ic c-mail">${ic('mail')}</span>${pre.inReplyTo || pre.thread ? 'Reply' : 'New mail'}</h2>
    <datalist id="c-people">${team.filter((u) => u.id !== me.id).map((u) => `<option value="${esc(u.name)}">${esc(u.login)}${u.email ? ` · ${esc(u.email)}` : ''}</option>`).join('')}</datalist>
    <label class="f"><span>To — team names, or email addresses</span><input class="input" id="c-to" list="c-people" value="${esc(pre.to || '')}" placeholder="Ravi, ministry@gov.in"></label>
    <div class="row"><label class="f"><span>Cc</span><input class="input" id="c-cc" list="c-people" value="${esc(pre.cc || '')}"></label></div>
    <label class="f"><span>Subject</span><input class="input" id="c-sub" value="${esc(pre.subject || '')}"></label>
    <label class="f"><span>Message</span><textarea class="input" id="c-body" style="min-height:200px">${esc(pre.body || '')}</textarea></label>
    <div class="row" style="margin-bottom:12px"><select class="input" id="c-att"><option value="">+ Attach one of my files…</option>${files.map((f) => `<option value="${esc(f.path)}">${esc(f.name)}</option>`).join('')}</select><label class="btn" style="flex:none">${ic('clip')}From this computer<input type="file" id="c-up" multiple hidden></label></div>
    <div id="c-atts" class="atts" style="margin:-4px 0 14px"></div>
    <div class="foot"><button class="btn ghost" id="c-ai">${ic('spark')}Write with AI</button><span class="grow"></span><button class="btn ghost" data-close>Cancel</button><button class="btn primary" id="c-send">${ic('send')}Send</button></div>`, { wide: true });
  const drawAtts = () => {
    $('#c-atts', m).innerHTML = [...[...atts].map((p) => ['f', p, p.split('\\').pop()]), ...uploads.map((u, i) => ['u', i, u.name])].map(([k, v, n]) => `<div class="att">${ic('clip')}${esc(n)}<button class="icon-btn" data-rm="${k}:${esc(v)}">${ic('x')}</button></div>`).join('');
    $$('[data-rm]', m).forEach((b) => (b.onclick = () => { const [k, ...v] = b.dataset.rm.split(':'); if (k === 'f') atts.delete(v.join(':')); else uploads.splice(+v[0], 1); drawAtts(); }));
  };
  drawAtts();
  $('#c-att', m).onchange = (e) => { if (e.target.value) atts.add(e.target.value); e.target.value = ''; drawAtts(); };
  $('#c-up', m).onchange = async (e) => {
    for (const f of e.target.files) { if (f.size > 25e6) { toast(`${f.name} is over 25 MB`, true); continue; } uploads.push({ name: f.name, type: f.type, data: await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.readAsDataURL(f); }) }); }
    drawAtts();
  };
  $('#c-send', m).onclick = async (e) => {
    const x = { to: $('#c-to', m).value.trim(), cc: $('#c-cc', m).value.trim(), subject: $('#c-sub', m).value, body: $('#c-body', m).value, files: [...atts], attachments: uploads, inReplyTo: pre.inReplyTo, references: pre.references, thread: pre.thread };
    if (!x.to) return toast('Add who it goes to', true);
    busy((e.btn ||= e.currentTarget), true, 'Sending');
    try { const r = await POST('/api/lmail/send', x); closeModal(); toast(`Sent ✓${r.outside ? ` · ${r.outside} outside` : ''}${r.team ? ` · ${r.team} in team` : ''}`); if (location.hash.startsWith('#mail')) loadMails(); }
    catch (er) { fail(er); (e.btn ||= e.currentTarget).disabled = false; (e.btn ||= e.currentTarget).innerHTML = `${ic('send')}Send`; }
  };
  $('#c-ai', m).onclick = async (e) => {
    const brief = $('#c-body', m).value.trim() || $('#c-sub', m).value.trim();
    if (!brief) return toast('Write a line about what the mail should say', true);
    const b = (e.btn ||= e.currentTarget); busy(b, true, 'Writing');
    try {
      const r = await POST('/api/assist', { tool: 'email', text: `To: ${$('#c-to', m).value || 'recipient'}\nSubject: ${$('#c-sub', m).value}\nNotes:\n${brief}`, extra: 'Return only the mail body, no subject line.' });
      $('#c-body', m).value = r.reply.replace(/^subject:.*\n+/i, '');
    } catch (er) { fail(er); }
    b.disabled = false; b.innerHTML = `${ic('spark')}Write with AI`;
  };
}

// ---------- CALENDAR (Limelight Calendar) ----------
let calStart = startOfWeek(new Date()), calSel = dayKey(new Date());
function startOfWeek(d) { const x = new Date(new Date(d).toLocaleString('en-US', { timeZone: TZ })); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
const RSVP = { yes: 'Going', no: 'Not going', maybe: 'Maybe' };
async function calendar(openId) {
  const end = new Date(calStart.getTime() + 21 * 864e5);
  view.innerHTML = `<div class="page"><div class="head"><div class="grow"><h1>Calendar</h1><p>${fmtD(calStart, { month: 'long', year: 'numeric' })} · Limelight team calendar</p></div>
    <button class="icon-btn" id="k-prev" title="Previous week">${ic('back')}</button><button class="btn sm" id="k-today">Today</button><button class="icon-btn" id="k-next" title="Next week" style="transform:scaleX(-1)">${ic('back')}</button>
    <button class="btn primary" id="k-new">${ic('plus')}New event</button></div>
    <div class="week" id="week"></div><div class="agenda" id="agenda">${loading()}</div></div>`;
  $('#k-new').onclick = () => newEvent({ date: calSel });
  $('#k-prev').onclick = () => { calStart = new Date(calStart.getTime() - 7 * 864e5); calendar(); };
  $('#k-next').onclick = () => { calStart = new Date(calStart.getTime() + 7 * 864e5); calendar(); };
  $('#k-today').onclick = () => { calStart = startOfWeek(new Date()); calSel = dayKey(new Date()); calendar(); };
  let evs = [];
  try { evs = await GET(`/api/cal?from=${calStart.toISOString()}&to=${end.toISOString()}`); } catch (e) { $('#agenda').innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
  const byDay = {};
  for (const e of evs) (byDay[dayKey(e.start)] ||= []).push(e);
  const draw = () => {
    $('#week').innerHTML = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(calStart.getTime() + i * 864e5), k = dayKey(d), list = byDay[k] || [];
      return `<div class="day${k === calSel ? ' on' : ''}${k === dayKey(new Date()) ? ' today' : ''}" data-k="${k}"><div class="dn"><span>${fmtD(d, { weekday: 'short' })}</span>${list.length ? `<span>${list.length}</span>` : ''}</div><div class="dd">${d.getDate()}</div><div class="pips">${list.slice(0, 2).map((e) => `<div class="pip" style="border-left:3px solid ${e.color || 'var(--accent)'}">${esc(e.title)}</div>`).join('')}</div></div>`;
    }).join('');
    $$('.day').forEach((d) => { d.onclick = () => { calSel = d.dataset.k; draw(); }; d.ondblclick = () => newEvent({ date: d.dataset.k }); });
    const days = Object.keys(byDay).filter((k) => k >= calSel).sort().slice(0, 10);
    $('#agenda').innerHTML = days.length ? days.map((k) => `<h4>${fmtD(k + 'T12:00:00+05:30', { weekday: 'long', day: 'numeric', month: 'long' })}</h4>${byDay[k].map((e) => `<div class="ev" data-ev="${e.id}"><span class="bar" style="background:${e.color || 'var(--accent)'}"></span><div class="time">${e.allDay ? 'All day' : `${fmtT(e.start)} – ${fmtT(e.end)}`}</div>
      <div class="main"><div class="t">${esc(e.title)}${e.recur ? ' <span class="faint">↻</span>' : ''}</div><div class="s">${[!e.mine && `by ${esc(e.owner.name)}`, e.location && esc(e.location), e.guests.length && `${e.guests.length + 1} people`, e.rsvp !== null && (e.rsvp ? RSVP[e.rsvp] : 'Not answered')].filter(Boolean).join(' · ')}</div></div>
      <div class="ppl">${e.guests.slice(0, 4).map((g) => `<span title="${esc(g.name)}${g.rsvp ? ` · ${RSVP[g.rsvp]}` : ''}" class="rs-${g.rsvp || 'none'}">${avatar(g)}</span>`).join('')}</div>
      ${e.room ? `<a class="btn sm primary" href="#meet/${e.room}">${ic('video')}Join</a>` : ''}</div>`).join('')}`).join('') : '<div class="empty">No events from this day on — double-click a day to add one</div>';
    $$('[data-ev]').forEach((el) => (el.onclick = (ev) => { if (!ev.target.closest('a')) eventDetail(el.dataset.ev); }));
  };
  draw();
  if (openId) eventDetail(openId);
}
async function eventDetail(id) {
  let e; try { e = await GET(`/api/cal/${id}`); } catch (er) { return fail(er); }
  const m = modal(`<h2><span class="ic c-cal" style="color:${e.color || ''}">${ic('cal')}</span>${esc(e.title)}</h2>
    <div class="evd"><div>${ic('cal')}<span>${e.allDay ? fmtD(e.start, { weekday: 'long', day: 'numeric', month: 'long' }) : `${fmtD(e.start, { weekday: 'long', day: 'numeric', month: 'long' })} · ${fmtT(e.start)} – ${fmtT(e.end)}`}${e.recur ? ` · repeats ${e.recur}` : ''}</span></div>
      ${e.location ? `<div>${ic('pin')}<span>${esc(e.location)}</span></div>` : ''}
      ${e.room ? `<div>${ic('video')}<span>Limelight video room <b class="mono">${e.room}</b></span></div>` : ''}
      <div>${ic('people')}<span>${esc(e.owner.name)} (organiser)${e.guests.map((g) => `, ${esc(g.name)} <i class="rsv rs-${g.rsvp || 'none'}">${g.rsvp ? RSVP[g.rsvp] : 'no answer'}</i>`).join('')}</span></div>
      ${e.notes ? `<div>${ic('office')}<span style="white-space:pre-wrap">${esc(e.notes)}</span></div>` : ''}</div>
    ${e.rsvp !== null ? `<div class="row" style="margin:14px 0 4px;justify-content:flex-start"><span class="muted" style="flex:none">Going?</span>${Object.entries(RSVP).map(([k, l]) => `<button class="btn sm${e.rsvp === k ? ' primary' : ''}" data-rsvp="${k}" style="flex:none">${l}</button>`).join('')}</div>` : ''}
    <div class="foot">${e.mine ? `<button class="btn danger" id="ev-del">${ic('trash')}Delete</button><button class="btn" id="ev-edit">Edit</button>` : `<button class="btn ghost" id="ev-del">Remove from my calendar</button>`}<span class="grow"></span>
      ${e.room ? `<a class="btn primary" href="#meet/${e.room}" data-close>${ic('video')}Join</a>` : ''}<button class="btn" data-close>Close</button></div>`);
  $$('[data-rsvp]', m).forEach((b) => (b.onclick = async () => { try { await POST(`/api/cal/${id}/rsvp`, { answer: b.dataset.rsvp }); toast('Answer sent ✓'); closeModal(); if (location.hash.startsWith('#calendar')) calendar(); } catch (er) { fail(er); } }));
  $('#ev-del', m).onclick = async () => { if (!confirm(e.mine ? 'Delete this event? Guests will be told.' : 'Remove from your calendar?')) return; try { await api('DELETE', `/api/cal/${id}`); closeModal(); toast('Done'); calendar(); } catch (er) { fail(er); } };
  if ($('#ev-edit', m)) $('#ev-edit', m).onclick = () => newEvent({ edit: e });
}
async function newEvent(pre = {}) {
  if (!team.length) await refreshTeam();
  const e = pre.edit, d = e ? dayKey(e.start) : pre.date || dayKey(new Date());
  const t = (x) => new Date(x).toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
  const guests = new Set(e ? e.guests.map((g) => g.id) : pre.guests || []);
  const COLS = ['', '#ffc21a', '#4f8cff', '#2fbf71', '#ff7a45', '#b49cff', '#ff5a8a'];
  const m = modal(`<h2><span class="ic c-cal">${ic('cal')}</span>${e ? 'Edit event' : 'New event'}</h2>
    <label class="f"><span>Title</span><input class="input" id="e-t" value="${esc(e?.title || pre.title || '')}" placeholder="Team review, client call…"></label>
    <div class="row"><label class="f"><span>Date</span><input class="input" type="date" id="e-d" value="${d}"></label><label class="f"><span>Start</span><input class="input" type="time" id="e-s" value="${e ? t(e.start) : '11:00'}"></label><label class="f"><span>End</span><input class="input" type="time" id="e-e" value="${e ? t(e.end) : '12:00'}"></label></div>
    <div class="f"><span class="lbl">Invite team</span><div class="pick" id="e-g">${team.filter((u) => u.id !== me.id).map((u) => `<button type="button" class="pk${guests.has(u.id) ? ' on' : ''}" data-u="${u.id}">${avatar(u)}<span>${esc(u.name)}</span></button>`).join('') || '<span class="faint">No team members yet — the admin adds them in Setup</span>'}</div></div>
    <div class="row"><label class="f"><span>Location</span><input class="input" id="e-l" value="${esc(e?.location || '')}" placeholder="Conference room, venue…"></label><label class="f" style="flex:.6"><span>Repeat</span><select class="input" id="e-r">${[['', 'Does not repeat'], ['daily', 'Every day'], ['weekdays', 'Every weekday'], ['weekly', 'Every week'], ['monthly', 'Every month']].map(([k, l]) => `<option value="${k}"${(e?.recur || '') === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label></div>
    <label class="f"><span>Notes / agenda</span><textarea class="input" id="e-n" style="min-height:70px">${esc(e?.notes || '')}</textarea></label>
    <div class="row" style="margin-bottom:14px"><label class="check"><input type="checkbox" id="e-v" ${e ? (e.room ? 'checked' : '') : pre.video ? 'checked' : ''}> Limelight video meeting</label><label class="check"><input type="checkbox" id="e-all" ${e?.allDay ? 'checked' : ''}> All day</label>
      <div class="cols" style="flex:none">${COLS.map((c) => `<button type="button" class="cl${(e?.color || '') === c ? ' on' : ''}" data-c="${c}" style="background:${c || 'var(--panel-3)'}" title="${c ? 'Colour' : 'Default colour'}"></button>`).join('')}</div></div>
    <div class="foot"><button class="btn ghost" data-close>Cancel</button><button class="btn primary" id="e-go">${ic('check')}${e ? 'Save' : 'Add & invite'}</button></div>`, { wide: true });
  let color = e?.color || '';
  $$('[data-u]', m).forEach((b) => (b.onclick = () => { const id = b.dataset.u; guests.has(id) ? guests.delete(id) : guests.add(id); b.classList.toggle('on'); }));
  $$('[data-c]', m).forEach((b) => (b.onclick = () => { color = b.dataset.c; $$('[data-c]', m).forEach((x) => x.classList.toggle('on', x === b)); }));
  $('#e-go', m).onclick = async (ev) => {
    const title = $('#e-t', m).value.trim(); if (!title) return toast('Give it a title', true);
    const day = $('#e-d', m).value;
    const body = { title, start: `${day}T${$('#e-s', m).value}:00+05:30`, end: `${day}T${$('#e-e', m).value}:00+05:30`, allDay: $('#e-all', m).checked, guests: [...guests],
      location: $('#e-l', m).value, notes: $('#e-n', m).value, video: $('#e-v', m).checked, recur: $('#e-r', m).value, color };
    if (body.allDay) { body.start = `${day}T00:00:00+05:30`; body.end = `${day}T23:59:00+05:30`; }
    ev.currentTarget.disabled = true;
    try { await (e ? POST(`/api/cal/${e.id}`, body) : POST('/api/cal', body)); closeModal(); toast(e ? 'Saved ✓' : `Added ✓${guests.size ? ` · ${guests.size} invited` : ''}`); if (location.hash.startsWith('#calendar')) calendar(); if (location.hash.startsWith('#meetings')) meetings(); }
    catch (er) { fail(er); ev.currentTarget.disabled = false; }
  };
}

// ---------- FILES (on the Limelight Office PC; each team member has an own folder) ----------
let refreshDocs = null; // the file list on screen, reloaded after a new file is made
async function storage() {
  view.innerHTML = `<div class="page"><div class="head"><div class="grow"><h1>Files</h1><p>${isAdmin() ? `Files on this PC · <span class="mono">${esc(status?.settings?.filesDir || '')}</span>` : 'Your files on the Limelight Office PC'}</p></div></div><div id="st"></div></div>`;
  pcFiles($('#st'));
}

// the local files folder; kinds limits it to Documents / Grids / Decks
const EDITOR = { word: 'document', excel: 'grid', ppt: 'present' };
const editLocal = (f, kind = kindOf(f)) => { if (EDITOR[kind] && /\.(docx?|xlsx|xlsm|xls|pptx?)$/i.test(f)) location.hash = `${EDITOR[kind]}/edit/${encodeURIComponent(f)}`; else openLocal(f); };
function pcFiles(el, { kinds = null, drop = true, empty = 'No files yet', onOpen = editLocal } = {}) {
  el.innerHTML = `<form class="search" id="f-s" style="margin-bottom:14px">${ic('search')}<input class="input" placeholder="Find a file"></form>
    ${drop ? `<div class="drop" id="f-drop">${ic('up')} Drop any file here to keep it on this PC</div>` : ''}
    <div class="card" style="padding:8px"><div class="list" id="f-list">${loading()}</div></div>`;
  const load = async () => {
    const list = $('#f-list', el); if (!list) return;
    try {
      const { items } = await GET(`/api/files?q=${encodeURIComponent($('#f-s input', el).value.trim())}`);
      const show = kinds ? items.filter((f) => kinds.includes(f.kind)) : items;
      list.innerHTML = show.length ? show.map((f) => `<div class="item" data-path="${esc(f.path)}">${fileIcon(f.kind)}<div class="main"><div class="t">${esc(f.name)}</div><div class="s">${ago(f.modified)} · ${size(f.size)}</div></div><div class="acts">${fileActions(f.path)}</div></div>`).join('') : `<div class="empty">${empty}</div>`;
      $$('.item', list).forEach((r) => (r.onclick = (e) => { if (!e.target.closest('button')) onOpen(r.dataset.path); }));
      bindFileActions(list, load);
    } catch (e) { list.innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
  };
  $('#f-s', el).onsubmit = (e) => { e.preventDefault(); load(); };
  $('#f-s input', el).oninput = load;
  const dz = $('#f-drop', el);
  if (dz) {
    dz.ondragover = (e) => { e.preventDefault(); dz.classList.add('over'); };
    dz.ondragleave = () => dz.classList.remove('over');
    dz.ondrop = async (e) => {
      e.preventDefault(); dz.classList.remove('over');
      for (const f of e.dataTransfer.files) { try { await api('POST', `/api/files/upload?name=${encodeURIComponent(f.name)}`, f); } catch (er) { fail(er); } }
      load();
    };
  }
  refreshDocs = load;
  load();
}

// ---------- DOCUMENT / GRID / PRESENT ----------
// a start screen like Office (blank, templates, recent files); the editors themselves live in /editors/*.js
const DOCS = {
  document: { kind: 'word', title: 'Document', app: 'Word', sub: 'Write letters, proposals and reports', mod: 'document', blank: 'Blank document',
    tpl: [['letter', 'Letter', 'Formal letter'], ['proposal', 'Proposal', 'Client proposal'], ['report', 'Report', 'Summary report'], ['minutes', 'Minutes', 'Meeting minutes']] },
  grid: { kind: 'excel', title: 'Grid', app: 'Excel', sub: 'Sheets, budgets and trackers with formulas', mod: 'grid', blank: 'Blank grid',
    tpl: [['budget', 'Budget', 'Items × rate with GST'], ['invoice', 'Invoice', 'Tax invoice'], ['tracker', 'Tracker', 'Tasks and status']] },
  present: { kind: 'ppt', title: 'Deck', app: 'PowerPoint', sub: 'Decks, pitches and slide shows', mod: 'present', blank: 'Blank deck',
    tpl: [['limelight', 'Limelight', 'Black & yellow'], ['pitch', 'Pitch', '7-slide proposal'], ['bharat', 'Bharat', 'Saffron & green']] },
};
async function docsPage(key, mode, arg) {
  const d = DOCS[key];
  if (mode === 'new' || mode === 'edit') {
    view.className = 'view full';
    try { const m = await import(`/editors/${d.mod}.js`); await m.open(view, mode === 'new' ? { template: arg || 'blank' } : { path: decodeURIComponent(arg) }); }
    catch (e) { console.error(e); fail(e); }
    return;
  }
  const ok = status?.office?.[d.kind];
  const thumb = (cls, inner) => `<div class="tthumb ${cls}">${inner}</div>`;
  const preview = { word: (t) => thumb('tw', `<b></b><i></i><i></i><i class="s"></i>${t ? '<i></i><i class="s"></i>' : ''}`), excel: () => thumb('tx', '<span></span>'.repeat(24)), ppt: (t) => thumb(`tp tp-${t || 'blank'}`, '<b></b><i></i>') }[d.kind];
  view.innerHTML = `<div class="page"><div class="head"><div class="ic big ${{ word: 'c-word', excel: 'c-excel', ppt: 'c-ppt' }[d.kind]}">${ic(d.kind)}</div><div class="grow"><h1>${d.title}</h1><p>${d.sub} · saves as real ${d.app} files${ok === false ? ' · <span style="color:var(--bad)">Microsoft ' + d.app + ' not found on this PC</span>' : ''}</p></div></div>
    <h4 class="lbl-h">New</h4>
    <div class="tgal"><a class="tcard" href="#${key}/new/blank">${preview('')}<b>${d.blank}</b><small>Start from empty</small></a>
      ${d.tpl.map(([k, l, sub]) => `<a class="tcard" href="#${key}/new/${k}">${preview(k)}<b>${l}</b><small>${sub}</small></a>`).join('')}</div>
    <h4 class="lbl-h">Recent</h4><div id="st"></div></div>`;
  pcFiles($('#st'), { kinds: [d.kind], drop: false, empty: `No ${d.title.toLowerCase()} files yet — pick Blank above`, onOpen: (f) => (location.hash = `${key}/edit/${encodeURIComponent(f)}`) });
}

// ---------- MAKE FILES ----------
async function made(r) {
  closeModal();
  toast(`Ready: ${r.file.split('\\').pop()}`);
  editLocal(r.file);
  refreshDocs?.();
}
function busy(btn, on, label) { btn.disabled = on; btn.innerHTML = on ? `<span class="spin"></span>${label}` : label; }
function aiFill(kind, area, m) {
  return async (e) => {
    const topic = $('#ai-topic', m).value.trim(); if (!topic) return toast('Write what it is about', true);
    const btn = (e.btn ||= e.currentTarget); busy(btn, true, 'Writing');
    const ask = {
      word: `Write a complete, well-structured document in markdown (# headings, - bullets, | tables | if useful). No tools. Only the document. Topic / brief:\n${topic}`,
      excel: `Make a spreadsheet as CSV only (first row = headers, comma separated, no explanation, no code fence, no tools). Use realistic structure; leave values blank if unknown. Brief:\n${topic}`,
      ppt: `Write a presentation outline only, no tools. Format exactly: each slide starts with "# Slide title" then 3-5 lines "- bullet". 6-10 slides. Brief:\n${topic}`,
    }[kind];
    try { const r = await POST('/api/agent', { messages: [{ role: 'user', content: ask }] }); $(area, m).value = r.reply.replace(/^```\w*\n?|```$/g, '').trim(); }
    catch (er) { fail(er); }
    btn.disabled = false; btn.innerHTML = `${ic('spark')}Draft with AI`;
  };
}
const aiRow = (ph) => `<div class="row" style="margin-bottom:14px"><input class="input" id="ai-topic" placeholder="${ph}"><button class="btn" id="ai-go" style="flex:none">${ic('spark')}Draft with AI</button></div>`;
function makeWord() {
  const m = modal(`<h2><span class="ic c-word">${ic('word')}</span>New Document</h2>
    ${aiRow('What is it about? e.g. “Proposal for Khelo India digital campaign, 2 pages”')}
    <div class="row"><label class="f"><span>File name</span><input class="input" id="w-n" placeholder="Proposal"></label><label class="f"><span>Title on page</span><input class="input" id="w-t"></label></div>
    <label class="f"><span>Content — # heading, - bullet, 1. list, | table |</span><textarea class="input" id="w-c" style="min-height:240px" placeholder="# Introduction&#10;Write here…"></textarea></label>
    <div class="foot"><label class="check"><input type="checkbox" id="w-pdf"> Also save PDF</label><span class="grow"></span><button class="btn ghost" data-close>Cancel</button><button class="btn primary" id="w-go">${ic('word')}Create</button></div>`, { wide: true });
  $('#ai-go', m).onclick = aiFill('word', '#w-c', m);
  $('#w-go', m).onclick = async (e) => {
    const name = $('#w-n', m).value.trim() || $('#w-t', m).value.trim() || 'Document';
    busy((e.btn ||= e.currentTarget), true, 'Making');
    try { made(await POST('/api/office/word', { name, title: $('#w-t', m).value.trim(), content: $('#w-c', m).value, pdf: $('#w-pdf', m).checked })); } catch (er) { fail(er); busy((e.btn ||= e.currentTarget), false, `${ic('word')}Create`); }
  };
}
function parseTable(t) {
  const lines = t.replace(/\r/g, '').split('\n').filter((l) => l.trim());
  const sep = lines.some((l) => l.includes('\t')) ? '\t' : ',';
  return lines.map((l) => {
    if (sep === '\t') return l.split('\t');
    const out = []; let cur = '', q = false;
    for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { out.push(cur); cur = ''; } else cur += ch; }
    out.push(cur); return out.map((s) => s.trim());
  });
}
function makeExcel() {
  const m = modal(`<h2><span class="ic c-excel">${ic('excel')}</span>New Grid</h2>
    ${aiRow('What should it track? e.g. “Event budget sheet with item, qty, rate, amount”')}
    <label class="f"><span>File name</span><input class="input" id="x-n" placeholder="Budget"></label>
    <label class="f"><span>Data — paste from anywhere (tab or comma separated). First row = headers. =SUM(D2:D9) works.</span><textarea class="input mono" id="x-c" style="min-height:220px" placeholder="Item,Qty,Rate,Amount&#10;LED wall,1,85000,=B2*C2"></textarea></label>
    <div class="foot"><label class="check"><input type="checkbox" id="x-pdf"> Also save PDF</label><span class="grow"></span><button class="btn ghost" data-close>Cancel</button><button class="btn primary" id="x-go">${ic('excel')}Create</button></div>`, { wide: true });
  $('#ai-go', m).onclick = aiFill('excel', '#x-c', m);
  $('#x-go', m).onclick = async (e) => {
    const rows = parseTable($('#x-c', m).value);
    busy((e.btn ||= e.currentTarget), true, 'Making');
    try { made(await POST('/api/office/excel', { name: $('#x-n', m).value.trim() || 'Spreadsheet', rows: rows.length ? rows : [['']], pdf: $('#x-pdf', m).checked })); } catch (er) { fail(er); busy((e.btn ||= e.currentTarget), false, `${ic('excel')}Create`); }
  };
}
function parseSlides(t) {
  const slides = []; let cur = null;
  for (const raw of t.replace(/\r/g, '').split('\n')) {
    const l = raw.trim(); if (!l) continue; let m;
    if ((m = l.match(/^#+\s*(.*)/))) { cur = { title: m[1].replace(/^slide\s*\d+[:.)-]?\s*/i, ''), bullets: [] }; slides.push(cur); }
    else if ((m = l.match(/^(notes?|speaker notes?):\s*(.*)/i)) && cur) cur.notes = m[2];
    else { if (!cur) { cur = { title: l, bullets: [] }; slides.push(cur); continue; } cur.bullets.push(l.replace(/^[-*•\d.)]+\s*/, '').replace(/\*\*/g, '')); }
  }
  return slides;
}
function makePpt() {
  const m = modal(`<h2><span class="ic c-ppt">${ic('ppt')}</span>New Deck</h2>
    ${aiRow('What is the deck for? e.g. “Pitch for MY Bharat youth campaign, 8 slides”')}
    <div class="row"><label class="f"><span>Cover title</span><input class="input" id="p-t"></label><label class="f"><span>Subtitle</span><input class="input" id="p-s" placeholder="Limelight · ${fmtD(Date.now(), { month: 'long', year: 'numeric' })}"></label></div>
    <label class="f"><span>Slides — “# Slide title” then “- points”</span><textarea class="input" id="p-c" style="min-height:220px" placeholder="# Objective&#10;- Reach 1 crore youth&#10;- …"></textarea></label>
    <div class="foot"><label class="check"><input type="checkbox" id="p-dark" checked> Limelight dark theme</label><label class="check"><input type="checkbox" id="p-pdf"> PDF</label><span class="grow"></span><button class="btn ghost" data-close>Cancel</button><button class="btn primary" id="p-go">${ic('ppt')}Create</button></div>`, { wide: true });
  $('#ai-go', m).onclick = aiFill('ppt', '#p-c', m);
  $('#p-go', m).onclick = async (e) => {
    const title = $('#p-t', m).value.trim() || 'Presentation';
    busy((e.btn ||= e.currentTarget), true, 'Making');
    try { made(await POST('/api/office/ppt', { name: title, title, subtitle: $('#p-s', m).value.trim(), slides: parseSlides($('#p-c', m).value), theme: $('#p-dark', m).checked ? 'limelight' : 'plain', pdf: $('#p-pdf', m).checked })); } catch (er) { fail(er); busy((e.btn ||= e.currentTarget), false, `${ic('ppt')}Create`); }
  };
}

// ---------- AGENT & CHATBOT ----------
// Agent = acts for you through tools (mail, calendar, tasks, storage, files) with Approve for anything that goes out.
// Chatbot = plain AI chat. Both save every conversation on this PC (see Chats).
const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch {} };
const CHAT = {
  agent: { title: 'Agent', api: '/api/agent', icon: 'agent', hello: 'What should I do for you?', sub: 'I work your Mail, Calendar, Tasks, Storage, Documents, Grids and Decks. Nothing goes out without your Approve.',
    ph: 'Mail, calendar, tasks, files — tell me what to do',
    sugs: [['Inbox summary', 'Give me a short summary of today’s unread mail — which ones are urgent?'], ['My week', 'What’s on my calendar this week?'],
      ['Write a proposal', 'Make a Document: event management proposal, sections — about, scope, timeline, budget table'], ['Make a deck', 'Make a deck: Limelight company intro, 7 slides'],
      ['Schedule a meeting', 'Schedule a 1-hour team review meeting tomorrow at 3 pm, with a Meet link'], ['My tasks', 'Show my pending tasks and add a "Send invoice" task for tomorrow']] },
  chatbot: { title: 'Chatbot', api: '/api/chatbot', icon: 'bot', hello: 'Ask me anything', sub: 'Ideas, explanations, drafts, translations — a private AI chat on your own server.',
    ph: 'Ask anything…',
    sugs: [['Campaign ideas', 'Give me 10 creative activation ideas for the Fit India campaign'], ['Explain', 'What is a CBC rate card? Explain it simply'],
      ['Speech', 'Write a 2-minute anchor opening in Hindi for a Youth Day event'], ['Plan', 'Make a run-of-show plan for a 3-day youth festival']] },
};
let chat = { kind: null, id: null, log: [] }, pendingAsk = '', thinking = false;

async function chatPage(kind, id) {
  const c = CHAT[kind];
  if (id === 'new') { chat = { kind, id: null, log: [] }; lsSet(`llo-thread-${kind}`, ''); history.replaceState(null, '', `#${kind}`); }
  else if (id || chat.kind !== kind) {
    const want = id || lsGet(`llo-thread-${kind}`);
    chat = { kind, id: null, log: [] };
    if (want) {
      view.innerHTML = loading('Opening chat');
      try { const t = await GET(`/api/chats/${want}`); chat = { kind, id: want, log: t.messages }; lsSet(`llo-thread-${kind}`, want); } catch {}
    }
  }
  const llm = status?.llm || {};
  view.innerHTML = `<div class="chat"><div class="chat-top"><div class="ic">${ic(c.icon)}</div><b>${c.title}</b><span class="grow"></span>
      <a class="btn sm ghost" href="#chats">${ic('chat')}All chats</a><a class="btn sm" href="#${kind}/new">${ic('plus')}New chat</a></div>
    <div class="chat-log" id="log"><div class="chat-in" id="msgs"></div></div>
    <div class="chat-box"><form class="ask" id="c-f"><img src="/img/limelight-triangle.svg" alt=""><input id="c-in" placeholder="${c.ph}" autocomplete="off"><button class="btn primary">${ic('send')}</button></form>
    <div class="note">${llm.online ? `Local AI · ${esc(llm.model)}${kind === 'agent' ? ' · nothing is sent or added without your Approve' : ' · stays on your own server'}` : '<span style="color:var(--bad)">AI model offline</span> — <a href="#setup" style="color:var(--accent)">check Setup</a>'}</div></div></div>`;
  drawChat();
  $('#c-f').onsubmit = (e) => { e.preventDefault(); const v = $('#c-in').value.trim(); if (v && !thinking) { $('#c-in').value = ''; ask(v); } };
  $('#c-in').focus();
  if (pendingAsk && kind === 'agent') { const v = pendingAsk; pendingAsk = ''; ask(v); }
}
function drawChat() {
  const box = $('#msgs'); if (!box || !chat.kind) return;
  const c = CHAT[chat.kind];
  if (!chat.log.length && !thinking) {
    box.innerHTML = `<div class="hello"><div class="ic hello-ic">${ic(c.icon)}</div><h1>${c.hello}</h1><p>${c.sub}</p>
      <div class="sugs">${c.sugs.map((s) => `<button class="sug" data-q="${esc(s[1])}"><b>${s[0]}</b>${esc(s[1])}</button>`).join('')}</div></div>`;
    $$('.sug', box).forEach((b) => (b.onclick = () => ask(b.dataset.q)));
    return;
  }
  const ava = `<div class="ava">${ic(c.icon)}</div>`;
  box.innerHTML = chat.log.map((m, i) => m.role === 'user'
    ? `<div class="msg me"><div class="bub">${esc(m.content)}</div></div>`
    : `<div class="msg ai">${ava}<div class="bub">
        ${m.steps?.length ? `<div class="steps">${m.steps.map((s) => `<span class="step${s.ok ? '' : ' bad'}" title="${esc(s.error || '')}">${ic(s.ok ? 'check' : 'x')}${esc(s.summary)}</span>`).join('')}</div>` : ''}
        ${m.error ? `<p style="color:var(--bad)">${esc(m.error)}</p>` : md(m.content)}
        ${(m.steps || []).filter((s) => s.file).map((s) => [s.file, s.pdf].filter(Boolean).map((f) => `<div class="filechip">${fileIcon(kindOf(f))}<div class="main">${esc(f.split('\\').pop())}</div>${fileActions(f)}</div>`).join('')).join('')}
        ${(m.actions || []).map((a) => approvalCard(a, i)).join('')}
        ${!m.error && m.content && chat.kind === 'chatbot' ? `<div class="bub-acts"><button class="btn sm ghost" data-copy="${i}">${ic('copy')}Copy</button><button class="btn sm ghost" data-doc="${i}">${ic('word')}Save as Document</button></div>` : ''}
      </div></div>`).join('') + (thinking ? `<div class="msg ai">${ava}<div class="bub"><span class="typing"><i></i><i></i><i></i></span></div></div>` : '');
  bindFileActions(box);
  $$('[data-approve]', box).forEach((b) => (b.onclick = () => decide(b.dataset.approve, +b.dataset.i, true)));
  $$('[data-reject]', box).forEach((b) => (b.onclick = () => decide(b.dataset.reject, +b.dataset.i, false)));
  $$('[data-copy]', box).forEach((b) => (b.onclick = () => copyText(chat.log[+b.dataset.copy].content)));
  $$('[data-doc]', box).forEach((b) => (b.onclick = () => saveAsDocument(chat.log[+b.dataset.doc].content, chat.log[+b.dataset.doc - 1]?.content)));
  const log = $('#log'); log.scrollTop = log.scrollHeight;
}
async function copyText(t) { try { await navigator.clipboard.writeText(t); toast('Copied ✓'); } catch { toast('Could not copy', true); } }
async function saveAsDocument(content, name = 'AI draft') {
  toast('Making Document…');
  try { made(await POST('/api/office/word', { name: String(name).replace(/\s+/g, ' ').slice(0, 50) || 'AI draft', content })); } catch (e) { fail(e); }
}
function approvalCard(a, i) {
  const detail = a.tool === 'send_email' ? `To: ${a.args.to}${a.args.cc ? `\nCc: ${a.args.cc}` : ''}\nSubject: ${a.args.subject}\n\n${a.args.body}${a.args.attachments?.length ? `\n\n📎 ${a.args.attachments.map((p) => p.split('\\').pop()).join(', ')}` : ''}`
    : a.tool === 'create_event' ? [a.args.title, a.args.all_day ? fmtD(a.args.start) : `${fmtD(a.args.start)} · ${fmtT(a.args.start)}${a.args.end ? ` – ${fmtT(a.args.end)}` : ''}`, a.args.video && 'Limelight video room', a.args.location, a.args.guests?.length && `Invites: ${a.args.guests.join(', ')}`, a.args.notes].filter(Boolean).join('\n')
      : JSON.stringify(a.args, null, 2);
  if (a.state) return `<div class="approve done"><div class="lbl" style="color:${a.state === 'done' ? 'var(--good)' : 'var(--muted)'}">${a.state === 'done' ? '✓ Done' : a.state === 'failed' ? 'Failed' : a.state === 'working' ? 'Working…' : 'Cancelled'}</div><div class="what">${esc(a.summary)}</div>${a.note ? `<div class="muted">${esc(a.note)}</div>` : ''}</div>`;
  // the To / guests line stays editable: the agent drops addresses nobody mentioned, so it may be empty
  const edit = a.tool === 'send_email' ? `<label class="f"><span>To</span><input class="input" data-edit="to" value="${esc(a.args.to || '')}" placeholder="name@example.com"></label>`
    : a.tool === 'create_event' ? `<label class="f"><span>Invite (team names, optional)</span><input class="input" data-edit="guests" value="${esc((a.args.guests || []).join(', '))}" placeholder="Ravi, Neha"></label>` : '';
  return `<div class="approve" data-card="${a.id}"><div class="lbl">Needs your approval</div><div class="what">${esc(a.summary)}</div>${edit}<pre>${esc(detail)}</pre>
    <div class="row"><button class="btn primary sm" data-approve="${a.id}" data-i="${i}">${ic('check')}Approve</button><button class="btn sm" data-reject="${a.id}" data-i="${i}">Cancel</button></div></div>`;
}
const saveThread = async (c) => {
  try { const r = await POST('/api/chats', { id: c.id, kind: c.kind, messages: c.log }); c.id = r.id; lsSet(`llo-thread-${c.kind}`, r.id); } catch {}
};
async function decide(id, i, yes) {
  const cur = chat, a = cur.log[i].actions.find((x) => x.id === id);
  if (!yes) { POST('/api/agent/reject', { id }).catch(() => {}); a.state = 'cancelled'; saveThread(cur); return drawChat(); }
  const edits = {};
  $$(`[data-card="${id}"] [data-edit]`).forEach((inp) => {
    edits[inp.dataset.edit] = inp.dataset.edit === 'guests' ? inp.value.split(',').map((s) => s.trim()).filter(Boolean) : inp.value.trim();
  });
  if (a.tool === 'send_email' && !edits.to) return toast('Add who the mail goes to', true);
  Object.assign(a.args, edits);
  a.state = 'working'; drawChat();
  try {
    const r = await POST('/api/agent/approve', { id, edits });
    a.state = 'done'; a.note = r.result?.room ? `Video room ${r.result.room}` : '';
    toast(`${r.done} ✓`); refreshUnread();
  } catch (e) { a.state = 'failed'; a.note = e.message; fail(e); }
  saveThread(cur); if (chat === cur) drawChat();
}
async function ask(text) {
  const cur = chat;
  cur.log.push({ role: 'user', content: text }); thinking = true; drawChat();
  try {
    const history = cur.log.filter((m) => !m.error).map((m) => ({ role: m.role, content: m.content + (m.actions?.length ? `\n[actions: ${m.actions.map((a) => `${a.summary} — ${a.state || 'waiting'}`).join('; ')}]` : '') })).slice(-16);
    const r = await POST(CHAT[cur.kind].api, { messages: history });
    cur.log.push({ role: 'assistant', content: r.reply, steps: r.steps, actions: r.actions });
  } catch (e) { cur.log.push({ role: 'assistant', content: '', error: e.message }); }
  thinking = false;
  await saveThread(cur);
  if (chat === cur) drawChat();
}

// ---------- CHATS ----------
let chatsFilter = '';
async function chatsPage() {
  view.innerHTML = `<div class="page"><div class="head"><div class="grow"><h1>Chats</h1><p>Every Agent and Chatbot conversation, saved on this PC</p></div>
    <a class="btn" href="#chatbot/new">${ic('bot')}New Chatbot chat</a><a class="btn primary" href="#agent/new">${ic('agent')}New Agent chat</a></div>
    <div class="row" style="margin-bottom:14px"><form class="search" id="h-s">${ic('search')}<input class="input" placeholder="Search chats"></form>
      <div class="tabs" style="flex:none">${[['', 'All'], ['agent', 'Agent'], ['chatbot', 'Chatbot']].map(([k, l]) => `<button data-k="${k}" class="${chatsFilter === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
    <div class="card" style="padding:8px"><div class="list" id="h-list">${loading()}</div></div></div>`;
  let all = [];
  try { all = await GET('/api/chats'); } catch (e) { $('#h-list').innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
  const draw = () => {
    const q = $('#h-s input').value.trim().toLowerCase();
    const show = all.filter((c) => (!chatsFilter || c.kind === chatsFilter) && (!q || `${c.title} ${c.preview}`.toLowerCase().includes(q)));
    $('#h-list').innerHTML = show.length ? show.map((c) => `<a class="item" href="#${c.kind}/${c.id}"><div class="ic ${c.kind === 'agent' ? 'c-mail' : 'c-cal'}">${ic(c.kind === 'agent' ? 'agent' : 'bot')}</div><div class="main"><div class="t">${esc(c.title)}</div><div class="s">${esc(c.preview)}</div></div><span class="meta">${CHAT[c.kind]?.title || c.kind} · ${ago(c.updated)}</span><div class="acts"><button class="icon-btn" data-del="${c.id}" title="Delete">${ic('trash')}</button></div></a>`).join('')
      : '<div class="empty">No chats yet</div>';
    $$('[data-del]').forEach((b) => (b.onclick = async (e) => {
      e.preventDefault(); e.stopPropagation();
      if (!confirm('Delete this chat?')) return;
      await api('DELETE', `/api/chats/${b.dataset.del}`).catch(fail);
      all = all.filter((c) => c.id !== b.dataset.del); draw();
    }));
  };
  $('#h-s').onsubmit = (e) => e.preventDefault();
  $('#h-s input').oninput = draw;
  $$('[data-k]').forEach((b) => (b.onclick = () => { chatsFilter = b.dataset.k; $$('[data-k]').forEach((x) => x.classList.toggle('on', x === b)); draw(); }));
  draw();
}

// ---------- AI ASSISTANCE ----------
let assistTools = null, assistTool = 'summarize';
async function assistPage() {
  if (!assistTools) assistTools = await GET('/api/assist').catch(() => ({}));
  view.innerHTML = `<div class="page"><div class="head"><div class="grow"><h1>AI Assistance</h1><p>Paste any text, pick what you need — summary, rewrite, translation, reply, caption…</p></div></div>
    <div class="chips" id="a-tools">${Object.entries(assistTools).map(([k, l]) => `<button class="chip${k === assistTool ? ' on' : ''}" data-k="${k}">${esc(l)}</button>`).join('')}</div>
    <div class="grid g2e">
      <div class="card"><h3>${ic('office')}Your text</h3><textarea class="input" id="a-in" style="min-height:300px" placeholder="Paste a mail, notes, a paragraph, a circular…"></textarea>
        <input class="input" id="a-extra" style="margin-top:10px" placeholder="Extra instruction (optional) — e.g. “under 100 words”, “for Ministry of Youth Affairs”">
        <div class="row" style="margin-top:12px;justify-content:flex-end"><button class="btn primary" id="a-go" style="flex:none">${ic('wand')}Run</button></div></div>
      <div class="card"><h3>${ic('spark')}Result</h3><div id="a-out" class="out"><div class="empty">The result shows here</div></div>
        <div class="row" id="a-acts" style="margin-top:12px;justify-content:flex-end;display:none"><button class="btn sm" id="a-use" style="flex:none">Use as input</button><button class="btn sm" id="a-copy" style="flex:none">${ic('copy')}Copy</button><button class="btn sm" id="a-doc" style="flex:none">${ic('word')}Save as Document</button><button class="btn sm" id="a-mail" style="flex:none">${ic('send')}Mail it</button></div></div>
    </div></div>`;
  let out = '';
  $$('#a-tools .chip').forEach((b) => (b.onclick = () => { assistTool = b.dataset.k; $$('#a-tools .chip').forEach((x) => x.classList.toggle('on', x === b)); }));
  $('#a-go').onclick = async (e) => {
    const btn = (e.btn ||= e.currentTarget); busy(btn, true, 'Working');
    $('#a-out').innerHTML = `<span class="typing"><i></i><i></i><i></i></span>`;
    try {
      out = (await POST('/api/assist', { tool: assistTool, text: $('#a-in').value, extra: $('#a-extra').value.trim() })).reply;
      $('#a-out').innerHTML = md(out); $('#a-acts').style.display = '';
    } catch (er) { $('#a-out').innerHTML = `<div class="empty" style="color:var(--bad)">${esc(er.message)}</div>`; }
    btn.disabled = false; btn.innerHTML = `${ic('wand')}Run`;
  };
  $('#a-copy').onclick = () => copyText(out);
  $('#a-use').onclick = () => { $('#a-in').value = out; };
  $('#a-doc').onclick = () => saveAsDocument(out, assistTools[assistTool]);
  $('#a-mail').onclick = () => {
    const m = out.match(/^subject:\s*(.+)$/im);
    compose({ subject: m?.[1] || '', body: m ? out.replace(m[0], '').trim() : out });
  };
}

// ---------- SETUP: my account, my mail, look, team (admin), connections (admin) ----------
const MAIL_HELP = {
  m365: '<b>Microsoft 365:</b> if sign-in fails, the admin may need to turn on <i>Authenticated SMTP</i> and IMAP for this mailbox, or create an app password.',
  godaddyw: '<b>GoDaddy Workspace:</b> use the email password set in GoDaddy Email & Office.',
};
const MAIL_PRESETS = {
  godaddy: ['GoDaddy (Microsoft 365)', 'outlook.office365.com', 993, 'smtp.office365.com', 587],
  godaddyw: ['GoDaddy Workspace', 'imap.secureserver.net', 993, 'smtpout.secureserver.net', 465],
  hostinger: ['Hostinger', 'imap.hostinger.com', 993, 'smtp.hostinger.com', 465],
  zoho: ['Zoho Mail (India)', 'imappro.zoho.in', 993, 'smtppro.zoho.in', 465],
  m365: ['Microsoft 365 / Outlook', 'outlook.office365.com', 993, 'smtp.office365.com', 587],
  custom: ['Other / custom', '', 993, '', 465],
};
const LOOKS = [
  ['limelight', 'Limelight Black', 'dark', ['#070708', '#111114', '#ffc21a', '#f2f2f4']],
  ['paper', 'Paper', 'light', ['#f6f5f2', '#ffffff', '#f2b200', '#17171a']],
  ['midnight', 'Midnight Gold', 'dark', ['#0a0f1f', '#111a33', '#e8b94a', '#eef1fb']],
  ['aurora', 'Aurora Glass', 'dark', ['#0b0a14', '#15132a', '#9b7cff', '#f1efff']],
  ['graphite', 'Graphite', 'dark', ['#16171a', '#1f2024', '#4f8cff', '#e8e9ec']],
  ['saffron', 'Saffron', 'light', ['#fff8ef', '#ffffff', '#e86a10', '#1d1a16']],
  ['mono', 'Studio Mono', 'dark', ['#000000', '#0b0b0b', '#ffffff', '#ffffff']],
];
function applyLook(k) {
  const l = LOOKS.find((x) => x[0] === k) || LOOKS[0];
  document.documentElement.dataset.look = l[0];
  document.documentElement.dataset.theme = l[2];
  try { localStorage.setItem('llo-look', l[0]); localStorage.setItem('llo-theme', l[2]); } catch {}
  drawTheme();
}
let setupTab = 'account';
async function setup(tab) {
  setupTab = tab || setupTab;
  const tabs = [['account', 'My account'], ['mail', 'My mail'], ['look', 'Look'], ...(isAdmin() ? [['team', 'Team'], ['connections', 'Office']] : [])];
  if (!tabs.some((t) => t[0] === setupTab)) setupTab = 'account';
  view.innerHTML = `<div class="page" style="max-width:900px"><div class="head"><div class="grow"><h1>Office setup</h1><p>${esc(me.name)} · ${isAdmin() ? 'Admin' : 'Team member'}</p></div>${!isLocal() ? `<button class="btn" id="s-out">Sign out</button>` : ''}</div>
    <div class="tabs" style="margin-bottom:22px;display:inline-flex">${tabs.map(([k, l]) => `<button data-st="${k}" class="${setupTab === k ? 'on' : ''}">${l}</button>`).join('')}</div><div id="set-body"></div></div>`;
  $$('[data-st]').forEach((b) => (b.onclick = () => { history.replaceState(null, '', `#setup/${b.dataset.st}`); setup(b.dataset.st); }));
  if ($('#s-out')) $('#s-out').onclick = async () => { await POST('/api/logout'); location.reload(); };
  const el = $('#set-body');
  ({ account: setupAccount, mail: setupMail, look: setupLook, team: setupTeam, connections: setupConnections })[setupTab](el);
}
function setupAccount(el) {
  el.innerHTML = `<div class="card"><h3>${ic('people')}Profile</h3>
      <div class="row"><label class="f"><span>Name</span><input class="input" id="a-n" value="${esc(me.name)}"></label><label class="f"><span>Designation</span><input class="input" id="a-t" value="${esc(me.title || '')}" placeholder="Producer, Designer…"></label></div>
      <label class="f"><span>Login</span><input class="input mono" value="${esc(me.login)}" disabled></label>
      <button class="btn primary" id="a-save">Save</button></div>
    <div class="card" style="margin-top:16px"><h3>${ic('people')}Limelight account ${status?.lighthouse ? '<span class="pill ok">Signed in</span>' : ''}</h3>
      <p class="muted" style="margin-top:-6px">${isLocal() ? (status?.lighthouse ? `Signed in as <b>${esc(me.email)}</b>. Staff come from Limelight HR; HR pages open signed in.` : 'Sign in once with your Limelight email and password: the staff list comes into Mail, Calendar and Meetings, and the HR pages open already signed in.') : `You sign in with your Limelight account (<b>${esc(me.email)}</b>). Change the password in Office → Settings.`}</p>
      ${isLocal() ? `<div class="row"><label class="f"><span>Limelight email</span><input class="input" id="lh-e" type="email" value="${esc(me.email || '')}"></label><label class="f"><span>Password</span><input class="input" id="lh-p" type="password" autocomplete="current-password"></label></div>
      <button class="btn${status?.lighthouse ? '' : ' primary'}" id="lh-go">${status?.lighthouse ? 'Sign in again' : 'Sign in with Limelight'}</button>` : ''}</div>
    <div class="card" style="margin-top:16px"><h3>${ic('unread')}Desktop notifications</h3><p class="muted" style="margin-top:-6px">Get a pop-up for new mail, invites, tasks and incoming calls, even when this tab is in the background.</p>
      <button class="btn" id="a-nt">${typeof Notification !== 'undefined' && Notification.permission === 'granted' ? 'On ✓' : 'Turn on'}</button></div>`;
  $('#a-save').onclick = async () => { try { me = await POST('/api/me', { name: $('#a-n').value, title: $('#a-t').value }); toast('Saved ✓'); drawAccount(); } catch (e) { fail(e); } };
  if ($('#lh-go')) $('#lh-go').onclick = async (e) => {
    busy((e.btn ||= e.currentTarget), true, 'Signing in');
    try { const r = await POST('/api/me/lighthouse', { email: $('#lh-e').value, password: $('#lh-p').value }); me = r.user; toast(`Limelight ✓ · ${r.people} staff`); await refreshStatus(); refreshTeam(); setup('account'); }
    catch (er) { fail(er); (e.btn ||= e.currentTarget).disabled = false; (e.btn ||= e.currentTarget).innerHTML = 'Sign in with Limelight'; }
  };
  $('#a-nt').onclick = async () => { try { const p = await Notification.requestPermission(); toast(p === 'granted' ? 'Notifications on ✓' : 'The browser blocked notifications'); setup('account'); } catch { toast('This browser has no notifications', true); } };
}
async function setupMail(el) {
  el.innerHTML = loading();
  let c = null; try { c = await GET('/api/me/mail'); } catch {}
  // (team mail only: mail stays on Limelight's own server - no outside mailbox to set up)
  if (c?.teamOnly) {
    el.innerHTML = `<div class="card"><h3>${ic('mail')}Team mail</h3><p class="muted" style="margin:-6px 0 0">Mail between Limelight people, kept on Limelight's own server - nothing goes through Google or any outside mail service. Write their name in To. Your team address: <b class="mono">${esc(me.email || `${me.login}@limelight`)}</b></p></div>`;
    return;
  }
  el.innerHTML = `<div class="card"><h3>${ic('mail')}Team mail</h3><p class="muted" style="margin:-6px 0 0">Mail between Limelight people works already — write their name in To. Your team address: <b class="mono">${esc(me.email || `${me.login}@limelight`)}</b></p></div>
    <div class="card" style="margin-top:16px"><h3>${ic('send')}Company mailbox ${c ? '<span class="pill ok">Connected</span>' : ''}</h3>
      <p class="muted" style="margin-top:-6px">Your own @company email (e.g. name@limelightcorp.in), so you can mail ministries, clients and vendors from here. Ask whoever runs the domain for the IMAP/SMTP details if unsure.</p>
      <div class="mc-help" id="mc-help" hidden></div>
      <label class="f"><span>Mail provider</span><select class="input" id="mc-pre">${Object.entries(MAIL_PRESETS).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join('')}</select></label>
      <div class="row"><label class="f"><span>Email address</span><input class="input" id="mc-a" value="${esc(c?.address || '')}" placeholder="name@limelightcorp.in" autocomplete="off"></label><label class="f"><span>Name shown to others</span><input class="input" id="mc-n" value="${esc(c?.name || me.name)}"></label></div>
      <div class="row"><label class="f"><span>Login (usually the email)</span><input class="input" id="mc-u" value="${esc(c?.user || '')}"></label><label class="f"><span>Password ${c ? '(leave empty to keep)' : ''}</span><input class="input" id="mc-p" type="password" autocomplete="new-password"></label></div>
      <div class="row"><label class="f"><span>IMAP server (incoming)</span><input class="input mono" id="mc-ih" value="${esc(c?.imapHost || '')}"></label><label class="f" style="flex:.35"><span>Port</span><input class="input mono" id="mc-ip" value="${c?.imapPort || 993}"></label></div>
      <div class="row"><label class="f"><span>SMTP server (outgoing)</span><input class="input mono" id="mc-sh" value="${esc(c?.smtpHost || '')}"></label><label class="f" style="flex:.35"><span>Port</span><input class="input mono" id="mc-sp" value="${c?.smtpPort || 465}"></label></div>
      <div class="row" style="justify-content:flex-start;gap:8px"><button class="btn primary" id="mc-save" style="flex:none">Save & test</button>${c ? '<button class="btn danger" id="mc-del" style="flex:none">Remove</button>' : ''}<span id="mc-res" class="muted" style="flex:1"></span></div>
      <p class="faint" style="font-size:12px;margin-top:12px">The password is kept encrypted on the Limelight Office PC and used only to read and send your mail.</p></div>`;
  const pickPreset = (k) => {
    const p = MAIL_PRESETS[k]; if (!p) return;
    $('#mc-pre').value = k;
    if (p[1]) { $('#mc-ih').value = p[1]; $('#mc-ip').value = p[2]; $('#mc-sh').value = p[3]; $('#mc-sp').value = p[4]; }
    $('#mc-help').hidden = !MAIL_HELP[k]; $('#mc-help').innerHTML = MAIL_HELP[k] || '';
  };
  $('#mc-pre').onchange = (e) => pickPreset(e.target.value);
  $('#mc-a').oninput = (e) => { if (!$('#mc-u').dataset.touched) $('#mc-u').value = e.target.value; };
  // find the provider from the address's domain (its MX records)
  const detect = async () => {
    const d = $('#mc-a').value.split('@')[1]; if (!d || !d.includes('.')) return;
    try { const r = await GET(`/api/me/mail/detect?domain=${encodeURIComponent(d)}`); if (r.preset) { pickPreset(r.preset); toast(`${d}: ${MAIL_PRESETS[r.preset][0]} ✓`); } } catch {}
  };
  $('#mc-a').onchange = detect;
  if (c?.imapHost) { const k = Object.entries(MAIL_PRESETS).find(([, v]) => v[1] === c.imapHost)?.[0]; if (k) { $('#mc-pre').value = k; $('#mc-help').hidden = !MAIL_HELP[k]; $('#mc-help').innerHTML = MAIL_HELP[k] || ''; } }
  else if (!c) { $('#mc-a').value = me.email || ''; if ($('#mc-a').value) detect(); }
  $('#mc-u').oninput = (e) => (e.target.dataset.touched = 1);
  $('#mc-save').onclick = async (e) => {
    const b = { address: $('#mc-a').value, name: $('#mc-n').value, user: $('#mc-u').value || $('#mc-a').value, pass: $('#mc-p').value, imapHost: $('#mc-ih').value, imapPort: $('#mc-ip').value, smtpHost: $('#mc-sh').value, smtpPort: $('#mc-sp').value };
    busy((e.btn ||= e.currentTarget), true, 'Testing');
    try { await POST('/api/me/mail', b); const t = await POST('/api/me/mail/test'); $('#mc-res').innerHTML = `<span style="color:var(--good)">✓ Connected — ${t.messages} mails, ${t.unseen} unread</span>`; refreshUnread(); }
    catch (er) { $('#mc-res').innerHTML = `<span style="color:var(--bad)">${esc(er.message)}</span>`; }
    (e.btn ||= e.currentTarget).disabled = false; (e.btn ||= e.currentTarget).innerHTML = 'Save & test';
  };
  if ($('#mc-del')) $('#mc-del').onclick = async () => { if (!confirm('Remove your company mailbox from Limelight Office?')) return; await POST('/api/me/mail', { remove: true }); setup('mail'); };
}
function setupLook(el) {
  const cur = document.documentElement.dataset.look || 'limelight';
  el.innerHTML = `<p class="muted" style="margin:-8px 0 16px">Pick how Limelight Office looks on this computer.</p><div class="looks">${LOOKS.map(([k, l, mode, [bg, panel, acc, text]]) => `<button class="look${cur === k ? ' on' : ''}" data-look="${k}">
      <div class="lk" style="background:${bg};color:${text}"><div class="lk-side" style="background:${panel}"><i style="background:${acc}"></i><i></i><i></i><i></i></div><div class="lk-main"><b style="background:${text}"></b><div class="lk-cards"><span style="background:${panel}"></span><span style="background:${panel}"></span><span style="background:${panel}"><em style="background:${acc}"></em></span></div></div></div>
      <div class="lk-n"><b>${l}</b><small>${mode === 'light' ? 'Light' : 'Dark'}</small></div></button>`).join('')}</div>`;
  $$('[data-look]', el).forEach((b) => (b.onclick = () => { applyLook(b.dataset.look); setupLook(el); }));
}
async function setupTeam(el) {
  el.innerHTML = loading();
  await refreshTeam();
  el.innerHTML = `<div class="card"><h3>${ic('people')}People · from Limelight HR <a href="javascript:" id="tm-add">${ic('refresh')} Sync now</a></h3><div class="list">${team.map((u) => `<div class="item" data-u="${u.id}">${avatar(u)}<div class="main"><div class="t">${esc(u.name)} ${u.role === 'admin' ? '<span class="pill">Admin</span>' : ''}</div><div class="s">${esc(u.login)}${u.title ? ` · ${esc(u.title)}` : ''}${u.email ? ` · ${esc(u.email)}` : ''}${u.hasMail ? ' · company mail ✓' : ''}</div></div><span class="pill${online.has(u.id) ? ' ok' : ''}" style="flex:none">${online.has(u.id) ? 'Online' : 'Offline'}</span></div>`).join('')}</div></div>
    <div class="card" style="margin-top:16px"><h3>${ic('drive')}Team access on the office network</h3>
      <p class="muted" style="margin-top:-6px">Team members open this address on their own PC (Chrome or Edge) and sign in with their Limelight email and password:</p>
      <div class="lan">${(status.lan || []).map((u) => `<code>${esc(u)}</code>`).join('') || '<span class="faint">No network address found</span>'}</div>
      <ol class="muted" style="font-size:13px;line-height:1.7">
        <li>The first time, the browser says the connection is not private (the certificate is made by this PC). Press <b>Advanced → Continue</b> — once for this address and once for <code>${esc((status.lan?.[0] || '').replace(':3443', ':3444'))}</code> (HR pages).</li>
        <li>If other PCs cannot open it, allow the port in Windows Firewall on this PC (run once in an admin PowerShell):<br><code class="mono" style="user-select:all">New-NetFirewallRule -DisplayName "Limelight Office" -Direction Inbound -Protocol TCP -LocalPort 3443,3444 -RemoteAddress 192.168.0.0/24 -Action Allow</code></li>
        <li>This PC must stay on while the team uses it.</li></ol></div>`;
  $('#tm-add').onclick = async () => { try { const r = await POST('/api/team/sync'); toast(`${r.people} staff synced ✓`); setup('team'); } catch (e) { fail(e); } };
  $$('[data-u]', el).forEach((r) => (r.onclick = () => personForm(team.find((u) => u.id === r.dataset.u))));
}
function personForm(u) {
  const m = modal(`<h2>${ic('people')} ${u ? esc(u.name) : 'Add a team member'}</h2>
    <div class="row"><label class="f"><span>Name</span><input class="input" id="pf-n" value="${esc(u?.name || '')}"></label><label class="f"><span>Designation</span><input class="input" id="pf-t" value="${esc(u?.title || '')}"></label></div>
    <div class="row"><label class="f"><span>Work email (optional)</span><input class="input" id="pf-e" value="${esc(u?.email || '')}" placeholder="ravi@limelightcorp.in"></label><label class="f" style="flex:.5"><span>Role</span><select class="input" id="pf-r"><option value="member">Member</option><option value="admin"${u?.role === 'admin' ? ' selected' : ''}>Admin</option></select></label></div>
    ${u && u.id !== me.id ? '<label class="check" style="margin-bottom:14px"><input type="checkbox" id="pf-x"> Remove access</label>' : ''}
    <p class="faint" style="font-size:12.5px">They sign in with their Limelight email and password.</p>
    <div class="foot"><button class="btn ghost" data-close>Cancel</button><button class="btn primary" id="pf-go">${ic('check')}${u ? 'Save' : 'Add'}</button></div>`);
  $('#pf-go', m).onclick = async () => {
    const b = { name: $('#pf-n', m).value, title: $('#pf-t', m).value, email: $('#pf-e', m).value, role: $('#pf-r', m).value };
    if ($('#pf-x', m)?.checked) b.active = false;
    try { await (u ? POST(`/api/team/${u.id}`, b) : POST('/api/team', b)); closeModal(); toast(u ? 'Saved ✓' : `${b.name} added ✓`); setup('team'); } catch (e) { fail(e); }
  };
}

async function setupConnections(host) {
  host.innerHTML = loading('Checking connections');
  await refreshStatus(true);
  if (!location.hash.startsWith('#setup')) return;
  const s = status, set = s.settings;
  host.innerHTML = `<div class="steps-setup">
    <div class="card sstep ${s.office.word && s.office.excel && s.office.ppt ? 'ok' : ''}"><div class="num">${s.office.word ? '✓' : '1'}</div><div>
      <h2>Document · Grid · Deck</h2>
      <p class="muted">Uses Microsoft Word, Excel and PowerPoint installed on this PC.</p>
      <div class="row" style="justify-content:flex-start">${['word', 'excel', 'ppt'].map((k) => `<span class="pill ${s.office[k] ? 'ok' : 'bad'}" style="flex:none">${{ word: 'Word', excel: 'Excel', ppt: 'PowerPoint' }[k]}</span>`).join('')}</div>
      <label class="f" style="margin-top:16px"><span>Files folder</span><input class="input mono" id="o-dir" value="${esc(set.filesDir)}"></label>
    </div></div>
    <div class="card sstep ${s.llm.online ? 'ok' : ''}"><div class="num">${s.llm.online ? '✓' : '2'}</div><div>
      <h2>AI — Agent, Chatbot, AI Assistance <span class="pill ${s.llm.online ? 'ok' : 'bad'}">${s.llm.online ? `${esc(s.llm.model)} @ ${esc(s.llm.url)}` : 'Offline'}</span></h2>
      <p class="muted">A local model through Ollama — NAYA B first, then this PC. Use a model with tool support (qwen3:8b recommended).</p>
      <div class="row"><label class="f"><span>Ollama addresses (one per line, tried in order)</span><textarea class="input mono" id="l-urls" style="min-height:64px">${esc(set.llm.urls.join('\n'))}</textarea></label><label class="f" style="flex:.5"><span>Model</span><input class="input mono" id="l-model" value="${esc(set.llm.model)}"></label></div>
      ${s.llm.models?.length ? `<p class="faint" style="font-size:12.5px;margin-top:-6px">Available: ${s.llm.models.map(esc).join(', ')}</p>` : ''}
      <button class="btn" id="s-save">Save settings</button>
    </div></div>
  </div>`;
  $('#s-save').onclick = async () => {
    try { await POST('/api/settings', { filesDir: $('#o-dir').value.trim(), llm: { urls: $('#l-urls').value.split('\n'), model: $('#l-model').value.trim() } }); toast('Saved ✓'); setup('connections'); } catch (e) { fail(e); }
  };
}

// ---------- MEETINGS (Limelight video calls) ----------
async function meetNow() {
  try { const r = await POST('/api/rtc/new'); location.hash = `meet/${r.room}`; } catch (e) { fail(e); }
}
async function meetings() {
  view.innerHTML = `<div class="page"><div class="head"><div class="grow"><h1>Meetings</h1><p>Limelight video calls — camera, mic, screen share and chat, inside the office</p></div>
    <button class="btn" id="mt-new">${ic('cal')}Schedule</button><button class="btn primary" id="mt-now">${ic('video')}Meet now</button></div>
    <form class="ask" id="mt-join" style="margin-bottom:22px">${ic('video')}<input placeholder="Join with a room code — ll-abcd-efgh"><button class="btn">Join</button></form>
    <div id="mt-live"></div><div id="mt-list">${loading()}</div></div>`;
  $('#mt-now').onclick = meetNow;
  $('#mt-new').onclick = () => newEvent({ video: true });
  $('#mt-join').onsubmit = (e) => { e.preventDefault(); const v = $('#mt-join input').value.trim().replace(/^.*#meet\//, ''); if (v) location.hash = `meet/${v}`; };
  GET('/api/rtc/live').then((rooms) => {
    const el = $('#mt-live'); if (!el || !rooms.length) return;
    el.innerHTML = `<div class="agenda"><h4>Happening now</h4>${rooms.map((r) => `<div class="ev live"><span class="bar"></span><div class="main"><div class="t">Room <span class="mono">${esc(r.room)}</span></div><div class="s">${r.people.map(esc).join(', ')}</div></div><a class="btn sm primary" href="#meet/${esc(r.room)}">${ic('video')}Join</a></div>`).join('')}</div>`;
  }).catch(() => {});
  try {
    const evs = (await GET(`/api/cal?from=${new Date(Date.now() - 2 * 3600e3).toISOString()}&to=${new Date(Date.now() + 14 * 864e5).toISOString()}`)).filter((e) => e.room && !e.allDay && e.end > Date.now());
    const now = Date.now();
    $('#mt-list').innerHTML = `<div class="agenda"><h4>Upcoming video meetings</h4>${evs.length ? evs.map((e) => { const on = e.start - 10 * 60e3 <= now; return `<div class="ev${on ? ' live' : ''}"><span class="bar" style="background:${e.color || 'var(--accent)'}"></span><div class="time">${dayKey(e.start) === dayKey(now) ? 'Today' : fmtD(e.start)}<br>${fmtT(e.start)} – ${fmtT(e.end)}</div>
      <div class="main"><div class="t">${esc(e.title)}</div><div class="s">${esc(e.owner.name)}${e.guests.length ? ` + ${e.guests.map((g) => esc(g.name)).join(', ')}` : ''}</div></div>
      <button class="icon-btn" data-cp="${e.room}" title="Copy room code">${ic('copy')}</button><a class="btn sm${on ? ' primary' : ''}" href="#meet/${e.room}">${ic('video')}Join</a></div>`; }).join('') : '<div class="empty">No video meetings planned — press Schedule, or Meet now</div>'}</div>`;
    $$('[data-cp]').forEach((b) => (b.onclick = () => copyText(b.dataset.cp)));
  } catch (e) { $('#mt-list').innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
}
async function meetRoom(room) {
  if (!room) return meetings();
  // (the browser allows camera and mic on https and on localhost - e.g. inside the workspace on this PC)
  if (!window.isSecureContext || !navigator.mediaDevices) { view.innerHTML = `<div class="page">${'<div class="connect"><h2>Camera needs https</h2><p>Open the app at the https address to join video calls.</p></div>'}</div>`; return; }
  view.className = 'view full';
  const m = await import('/meet.js');
  m.open(view, { room, cid: CID, me, team: () => team, online: () => online });
}

// ---------- TASK (Limelight Task) ----------
let taskScope = 'mine', taskView = 'board';
const COLS = [['todo', 'To do'], ['doing', 'Doing'], ['done', 'Done']];
async function task() {
  if (!team.length) await refreshTeam();
  view.innerHTML = `<div class="page wide"><div class="head"><div class="grow"><h1>Task</h1><p>Team tasks — give work, track it, tick it off</p></div>
    <div class="tabs">${[['mine', 'My tasks'], ['created', 'I gave'], ['all', 'Everyone']].map(([k, l]) => `<button data-sc="${k}" class="${taskScope === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div class="tabs">${[['board', 'Board'], ['list', 'List']].map(([k, l]) => `<button data-tv="${k}" class="${taskView === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <button class="btn primary" id="t-new">${ic('plus')}New task</button></div>
    <form class="ask" id="t-quick">${ic('plus')}<input id="t-title" placeholder="Quick add — e.g. Send proforma to MY Bharat"><select class="input" id="t-who" style="width:170px;height:38px"><option value="">For me</option>${team.filter((u) => u.id !== me.id).map((u) => `<option value="${u.id}">For ${esc(u.name)}</option>`).join('')}</select><input type="date" id="t-due" class="input" style="width:160px;height:38px"><button class="btn primary">Add</button></form>
    <div id="t-body">${loading()}</div></div>`;
  $$('[data-sc]').forEach((b) => (b.onclick = () => { taskScope = b.dataset.sc; task(); }));
  $$('[data-tv]').forEach((b) => (b.onclick = () => { taskView = b.dataset.tv; task(); }));
  $('#t-new').onclick = () => taskDialog();
  $('#t-quick').onsubmit = async (e) => {
    e.preventDefault(); const title = $('#t-title').value.trim(); if (!title) return;
    try { await POST('/api/ltasks', { title, assignee: $('#t-who').value, due: $('#t-due').value }); $('#t-title').value = ''; loadTasks(); } catch (er) { fail(er); }
  };
  loadTasks();
}
async function loadTasks() {
  const el = $('#t-body'); if (!el) return;
  let ts; try { ts = await GET(`/api/ltasks?scope=${taskScope}`); } catch (e) { el.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
  const today = dayKey(Date.now());
  const card = (t) => `<div class="tcd${t.status === 'done' ? ' done' : ''}" draggable="true" data-id="${t.id}">
      <div class="row" style="gap:8px"><button class="tick${t.status === 'done' ? ' on' : ''}" data-tick="${t.id}" style="flex:none">${t.status === 'done' ? ic('check') : ''}</button><div class="tt">${esc(t.title)}</div></div>
      ${t.notes ? `<div class="tn">${esc(t.notes)}</div>` : ''}
      <div class="tm-row">${t.priority !== 'normal' ? `<span class="pri pr-${t.priority}">${t.priority === 'high' ? 'High' : 'Low'}</span>` : ''}${t.project ? `<span class="due">${esc(t.project)}</span>` : ''}${t.due ? `<span class="due${t.due < today && t.status !== 'done' ? ' late' : t.due === today ? ' today' : ''}">${t.due === today ? 'Today' : fmtD(t.due + 'T12:00:00+05:30')}</span>` : ''}<span class="grow"></span>
      ${t.owner && t.assignee && t.owner.id !== t.assignee.id ? `<span class="faint" title="Given by ${esc(t.owner.name)}" style="font-size:11.5px">${esc(t.owner.name.split(' ')[0])} →</span>` : ''}${t.assignee ? `<span title="${esc(t.assignee.name)}">${avatar(t.assignee, 'xs')}</span>` : ''}</div></div>`;
  if (taskView === 'board') {
    el.innerHTML = `<div class="board">${COLS.map(([k, l]) => { const list = ts.filter((t) => t.status === k); return `<div class="bcol" data-col="${k}"><div class="bh"><b>${l}</b><span>${list.length}</span></div><div class="bl">${list.map(card).join('') || '<div class="empty" style="padding:14px 0">—</div>'}</div></div>`; }).join('')}</div>`;
    $$('.tcd', el).forEach((c) => { c.ondragstart = (e) => { e.dataTransfer.setData('text/plain', c.dataset.id); c.classList.add('drag'); }; c.ondragend = () => c.classList.remove('drag'); });
    $$('.bcol', el).forEach((col) => {
      col.ondragover = (e) => { e.preventDefault(); col.classList.add('over'); };
      col.ondragleave = () => col.classList.remove('over');
      col.ondrop = async (e) => { e.preventDefault(); col.classList.remove('over'); try { await POST(`/api/ltasks/${e.dataTransfer.getData('text/plain')}`, { status: col.dataset.col }); loadTasks(); } catch (er) { fail(er); } };
    });
  } else {
    const open = ts.filter((t) => t.status !== 'done'), done = ts.filter((t) => t.status === 'done');
    el.innerHTML = `<div class="card tlist">${open.map(card).join('') || '<div class="empty">Nothing pending ✨</div>'}</div>${done.length ? `<h4 class="lbl-h" style="margin-top:20px">Done (${done.length})</h4><div class="card tlist">${done.slice(0, 50).map(card).join('')}</div>` : ''}`;
  }
  $$('[data-tick]', el).forEach((b) => (b.onclick = async (e) => { e.stopPropagation(); const t = ts.find((x) => x.id === b.dataset.tick); try { await POST(`/api/ltasks/${t.id}`, { status: t.status === 'done' ? 'todo' : 'done' }); loadTasks(); } catch (er) { fail(er); } }));
  $$('.tcd', el).forEach((c) => (c.onclick = (e) => { if (!e.target.closest('button')) taskDialog(ts.find((x) => x.id === c.dataset.id)); }));
}
function taskDialog(t) {
  const m = modal(`<h2><span class="ic c-excel">${ic('task')}</span>${t ? 'Task' : 'New task'}</h2>
    <label class="f"><span>Title</span><input class="input" id="td-t" value="${esc(t?.title || '')}"></label>
    <label class="f"><span>Notes</span><textarea class="input" id="td-n" style="min-height:80px">${esc(t?.notes || '')}</textarea></label>
    <div class="row"><label class="f"><span>For</span><select class="input" id="td-a">${team.map((u) => `<option value="${u.id}"${(t?.assignee?.id || me.id) === u.id ? ' selected' : ''}>${esc(u.name)}${u.id === me.id ? ' (me)' : ''}</option>`).join('')}</select></label>
      <label class="f"><span>Due</span><input class="input" type="date" id="td-d" value="${esc(t?.due || '')}"></label></div>
    <div class="row"><label class="f"><span>Priority</span><select class="input" id="td-p">${[['high', 'High'], ['normal', 'Normal'], ['low', 'Low']].map(([k, l]) => `<option value="${k}"${(t?.priority || 'normal') === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="f"><span>Status</span><select class="input" id="td-s">${COLS.map(([k, l]) => `<option value="${k}"${(t?.status || 'todo') === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="f"><span>Project</span><input class="input" id="td-j" value="${esc(t?.project || '')}" placeholder="Khelo India…"></label></div>
    ${t ? `<p class="faint" style="font-size:12.5px;margin-top:-4px">Made by ${esc(t.owner?.name || '—')} · ${ago(t.created)}${t.doneAt ? ` · done ${ago(t.doneAt)}` : ''}</p>` : ''}
    <div class="foot">${t ? `<button class="btn danger" id="td-del">${ic('trash')}Delete</button>` : ''}<span class="grow"></span><button class="btn ghost" data-close>Cancel</button><button class="btn primary" id="td-go">${ic('check')}${t ? 'Save' : 'Add task'}</button></div>`, { wide: true });
  $('#td-go', m).onclick = async () => {
    const b = { title: $('#td-t', m).value.trim(), notes: $('#td-n', m).value, assignee: $('#td-a', m).value, due: $('#td-d', m).value, priority: $('#td-p', m).value, status: $('#td-s', m).value, project: $('#td-j', m).value.trim() };
    if (!b.title) return toast('Give it a title', true);
    try { await (t ? POST(`/api/ltasks/${t.id}`, b) : POST('/api/ltasks', b)); closeModal(); toast(t ? 'Saved ✓' : 'Task added ✓'); loadTasks(); } catch (e) { fail(e); }
  };
  if ($('#td-del', m)) $('#td-del', m).onclick = async () => { if (!confirm('Delete this task?')) return; try { await api('DELETE', `/api/ltasks/${t.id}`); closeModal(); loadTasks(); } catch (e) { fail(e); } };
}

// ---------- NEWS ----------
const NEWS_TOPICS = [['top', 'Top'], ['india', 'India'], ['world', 'World'], ['business', 'Business'], ['tech', 'Tech'], ['sports', 'Sports'], ['entertainment', 'Entertainment'], ['science', 'Science'], ['health', 'Health']];
let newsState = { topic: 'top', lang: 'en', q: '' }, newsItems = [];
async function newsPage() {
  view.innerHTML = `<div class="page"><div class="head"><div class="grow"><h1>News</h1><p>Latest headlines from India and the world</p></div>
    <div class="tabs">${[['en', 'English'], ['hi', 'हिंदी']].map(([k, l]) => `<button data-lang="${k}" class="${newsState.lang === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <button class="btn" id="n-brief">${ic('spark')}Brief me</button></div>
    <div class="row" style="margin-bottom:16px"><form class="search" id="n-s">${ic('search')}<input class="input" placeholder="Search news — e.g. Khelo India, MY Bharat, Viksit Bharat" value="${esc(newsState.q)}"></form></div>
    <div class="chips" id="n-topics">${NEWS_TOPICS.map(([k, l]) => `<button class="chip${!newsState.q && newsState.topic === k ? ' on' : ''}" data-t="${k}">${l}</button>`).join('')}</div>
    <div id="n-brief-out"></div><div class="news" id="n-list">${loading()}</div></div>`;
  $$('[data-lang]').forEach((b) => (b.onclick = () => { newsState.lang = b.dataset.lang; newsPage(); }));
  $$('[data-t]').forEach((b) => (b.onclick = () => { newsState.topic = b.dataset.t; newsState.q = ''; newsPage(); }));
  $('#n-s').onsubmit = (e) => { e.preventDefault(); newsState.q = $('#n-s input').value.trim(); newsPage(); };
  $('#n-brief').onclick = async (e) => {
    if (!newsItems.length) return;
    const btn = (e.btn ||= e.currentTarget); busy(btn, true, 'Reading');
    $('#n-brief-out').innerHTML = `<div class="card brief"><span class="typing"><i></i><i></i><i></i></span></div>`;
    try {
      const r = await POST('/api/assist', { tool: 'summarize', text: newsItems.slice(0, 30).map((n) => `- ${n.title} (${n.source})`).join('\n'), extra: 'These are news headlines. Give a 6-8 point briefing grouped by theme; flag anything relevant to government communication, youth, sports or events in India.' + (newsState.lang === 'hi' ? ' Write in Hindi.' : '') });
      $('#n-brief-out').innerHTML = `<div class="card brief"><h3>${ic('spark')}Your briefing</h3>${md(r.reply)}</div>`;
    } catch (er) { $('#n-brief-out').innerHTML = ''; fail(er); }
    btn.disabled = false; btn.innerHTML = `${ic('spark')}Brief me`;
  };
  try {
    newsItems = await GET(`/api/news?${new URLSearchParams(newsState)}`);
    $('#n-list').innerHTML = newsItems.length ? newsItems.map((n, i) => `<a class="nitem${i === 0 ? ' lead' : ''}" href="${esc(n.link)}" target="_blank" rel="noreferrer"><div class="src">${esc(n.source)}<span>${n.date ? ago(n.date) : ''}</span></div><div class="nt">${esc(n.title)}</div></a>`).join('') : '<div class="empty">No news found</div>';
  } catch (e) { $('#n-list').innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
}

// ---------- ATTENDANCE ----------
const ATT = { P: ['Present', 'p'], A: ['Absent', 'a'], H: ['Half day', 'h'], L: ['Leave', 'l'], W: ['WFH', 'w'], O: ['Off', 'o'] };
let attDate = dayKey(Date.now()), attMode = 'day', attData = null;
const shiftDay = (d, n) => { const x = new Date(`${d}T12:00:00+05:30`); x.setDate(x.getDate() + n); return dayKey(x); };
async function attendance() {
  const month = attDate.slice(0, 7);
  view.innerHTML = `<div class="page"><div class="head"><div class="grow"><h1>Attendance</h1><p>Team register · kept on this PC</p></div>
    <div class="tabs"><button data-m="day" class="${attMode === 'day' ? 'on' : ''}">Day</button><button data-m="month" class="${attMode === 'month' ? 'on' : ''}">Month</button></div>
    <button class="btn" id="at-add">${ic('plus')}Add person</button><button class="btn" id="at-xl">${ic('excel')}Export to Grid</button></div><div id="at">${loading()}</div></div>`;
  $$('[data-m]').forEach((b) => (b.onclick = () => { attMode = b.dataset.m; attendance(); }));
  $('#at-add').onclick = () => personDialog();
  $('#at-xl').onclick = async (e) => { busy((e.btn ||= e.currentTarget), true, 'Making'); try { made(await POST('/api/attendance/export', { month })); } catch (er) { fail(er); } (e.btn ||= e.currentTarget).disabled = false; (e.btn ||= e.currentTarget).innerHTML = `${ic('excel')}Export to Grid`; };
  try { attData = await GET(`/api/attendance?month=${month}`); } catch (e) { $('#at').innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
  const people = attData.people.filter((p) => p.active);
  if (!attData.people.length) { $('#at').innerHTML = `<div class="connect"><h2>Add your team</h2><p>Add each person once, then mark the day in one tap.</p><button class="btn primary" id="at-first">${ic('plus')}Add person</button></div>`; $('#at-first').onclick = () => personDialog(); return; }
  if (attMode === 'month') return attMonth(people, month);
  const day = attData.days[attDate] || {};
  const count = (s) => people.filter((p) => day[p.id]?.status === s).length;
  $('#at').innerHTML = `<div class="row" style="margin-bottom:16px;flex-wrap:wrap"><div class="row" style="flex:none;gap:6px"><button class="icon-btn" id="at-prev">${ic('back')}</button><input type="date" class="input" id="at-date" value="${attDate}" style="width:170px"><button class="icon-btn" id="at-next" style="transform:scaleX(-1)">${ic('back')}</button><button class="btn sm" id="at-today">Today</button></div>
      <div class="row" style="flex:1;justify-content:flex-end;gap:6px;flex-wrap:wrap">${Object.entries(ATT).map(([k, [l, c]]) => `<span class="pill st-${c}" style="flex:none">${l} ${count(k)}</span>`).join('')}<span class="pill" style="flex:none">Not marked ${people.filter((p) => !day[p.id]).length}</span></div></div>
    <div class="card" style="padding:6px"><div class="att-head"><span>${fmtD(attDate + 'T12:00:00+05:30', { weekday: 'long', day: 'numeric', month: 'long' })}</span><button class="btn sm" id="at-all">${ic('check')}Mark rest Present</button></div>
    ${people.map((p) => { const d = day[p.id] || {}; return `<div class="att-row" data-id="${p.id}"><div class="who"><div class="avatar">${initials(p.name)}</div><div><b data-edit="${p.id}">${esc(p.name)}</b><div class="faint">${esc(p.role)}</div></div></div>
      <div class="seg">${Object.entries(ATT).map(([k, [l, c]]) => `<button class="st-${c}${d.status === k ? ' on' : ''}" data-s="${k}" title="${l}">${k === 'W' ? 'WFH' : l.split(' ')[0]}</button>`).join('')}</div>
      <input type="time" class="input tm" data-f="in" value="${esc(d.in || '')}" title="In"><input type="time" class="input tm" data-f="out" value="${esc(d.out || '')}" title="Out">
      <input class="input note" data-f="note" value="${esc(d.note || '')}" placeholder="Note"></div>`; }).join('')}</div>
    ${attData.people.some((p) => !p.active) ? `<p class="faint" style="font-size:12.5px">Hidden: ${attData.people.filter((p) => !p.active).map((p) => `<a href="javascript:" data-edit="${p.id}" style="color:var(--accent)">${esc(p.name)}</a>`).join(', ')}</p>` : ''}`;
  $('#at-prev').onclick = () => { attDate = shiftDay(attDate, -1); attendance(); };
  $('#at-next').onclick = () => { attDate = shiftDay(attDate, 1); attendance(); };
  $('#at-today').onclick = () => { attDate = dayKey(Date.now()); attendance(); };
  $('#at-date').onchange = (e) => { if (e.target.value) { attDate = e.target.value; attendance(); } };
  $('#at-all').onclick = async () => { await POST('/api/attendance/mark-all', { date: attDate, status: 'P' }).catch(fail); attendance(); };
  $$('[data-edit]').forEach((b) => (b.onclick = () => personDialog(attData.people.find((p) => p.id === b.dataset.edit))));
  $$('.att-row').forEach((r) => {
    const id = r.dataset.id;
    $$('[data-s]', r).forEach((b) => (b.onclick = async () => {
      const s = b.classList.contains('on') ? '' : b.dataset.s;
      try { await POST('/api/attendance/mark', { date: attDate, id, status: s }); attendance(); } catch (e) { fail(e); }
    }));
    $$('[data-f]', r).forEach((inp) => (inp.onchange = async () => {
      const cur = (attData.days[attDate] || {})[id]?.status || (inp.dataset.f === 'note' ? '' : 'P');
      if (!cur) return toast('Pick a status first', true);
      try { await POST('/api/attendance/mark', { date: attDate, id, status: cur, [inp.dataset.f]: inp.value }); (attData.days[attDate] ||= {})[id] = { ...(attData.days[attDate][id] || {}), status: cur, [inp.dataset.f]: inp.value }; toast('Saved ✓'); } catch (e) { fail(e); }
    }));
  });
}
function attMonth(people, month) {
  const [y, m] = month.split('-').map(Number), n = new Date(y, m, 0).getDate();
  const dates = Array.from({ length: n }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
  $('#at').innerHTML = `<div class="row" style="margin-bottom:14px;justify-content:flex-start"><button class="icon-btn" id="am-prev" style="flex:none">${ic('back')}</button><b style="flex:none;font-size:16px">${fmtD(month + '-15T12:00:00+05:30', { month: 'long', year: 'numeric' })}</b><button class="icon-btn" id="am-next" style="flex:none;transform:scaleX(-1)">${ic('back')}</button></div>
    <div class="card month-wrap"><table class="month"><thead><tr><th>Name</th>${dates.map((d) => { const wd = new Date(d + 'T12:00:00+05:30').getDay(); return `<th class="${wd === 0 ? 'sun' : ''}${d === dayKey(Date.now()) ? ' now' : ''}">${+d.slice(8)}<small>${'SMTWTFS'[wd]}</small></th>`; }).join('')}<th>P</th><th>H</th><th>L</th><th>A</th></tr></thead>
    <tbody>${people.map((p) => { const ms = dates.map((d) => attData.days[d]?.[p.id]?.status || ''); const c = (s) => ms.filter((x) => x === s).length;
      return `<tr><td>${esc(p.name)}</td>${ms.map((s, i) => `<td><a href="javascript:" data-d="${dates[i]}" class="mk${s ? ` st-${ATT[s][1]}` : ''}" title="${s ? ATT[s][0] : 'Not marked'}">${s}</a></td>`).join('')}<td><b>${c('P') + c('W')}</b></td><td>${c('H')}</td><td>${c('L')}</td><td>${c('A')}</td></tr>`; }).join('')}</tbody></table></div>
    <p class="faint" style="font-size:12.5px">P present · A absent · H half day · L leave · W work from home · O off. Click a day to open it.</p>`;
  $('#am-prev').onclick = () => { attDate = `${shiftDay(month + '-01', -1).slice(0, 7)}-01`; attendance(); };
  $('#am-next').onclick = () => { attDate = `${shiftDay(month + '-28', 5).slice(0, 7)}-01`; attendance(); };
  $$('[data-d]').forEach((a) => (a.onclick = () => { attDate = a.dataset.d; attMode = 'day'; attendance(); }));
}
function personDialog(p) {
  const m = modal(`<h2><span class="ic c-cal">${ic('people')}</span>${p ? 'Edit person' : 'Add person'}</h2>
    <div class="row"><label class="f"><span>Name</span><input class="input" id="pp-n" value="${esc(p?.name || '')}"></label><label class="f"><span>Role</span><input class="input" id="pp-r" value="${esc(p?.role || '')}" placeholder="Editor, Designer…"></label></div>
    ${p ? `<label class="check" style="margin-bottom:16px"><input type="checkbox" id="pp-a" ${p.active ? 'checked' : ''}> Active (show in the register)</label>` : ''}
    <div class="foot"><button class="btn ghost" data-close>Cancel</button><button class="btn primary" id="pp-go">${ic('check')}Save</button></div>`);
  $('#pp-go', m).onclick = async () => {
    const name = $('#pp-n', m).value.trim(); if (!name) return toast('Add a name', true);
    try { await POST('/api/attendance/person', { id: p?.id, name, role: $('#pp-r', m).value, ...(p && { active: $('#pp-a', m).checked }) }); closeModal(); attendance(); } catch (e) { fail(e); }
  };
  $('#pp-n', m).onkeydown = (e) => { if (e.key === 'Enter') $('#pp-go', m).click(); };
}

// ---------- router ----------
const ROUTES = {
  mail, calendar, meetings, storage,
  document: (a, b) => docsPage('document', a, b), grid: (a, b) => docsPage('grid', a, b), present: (a, b) => docsPage('present', a, b), office: () => docsPage('document'),
  meet: meetRoom, setup: (t) => setup(t), lh: (k) => lhPage(k),
  home: () => lhPage('home'), task: () => lhPage('tasks'), tasks: () => lhPage('tasks'), files: () => storage('pc'),
  agent: (id) => chatPage('agent', id), assistant: (id) => chatPage('agent', id), chatbot: (id) => chatPage('chatbot', id),
  assist: assistPage, chats: chatsPage, attendance: () => lhPage('attendance'), news: newsPage,
};
let lastHash = location.hash;
async function route() {
  // unsaved changes: our own pop-up, not confirm() - the browser blocks confirm() inside another site's frame (the
  // workspace), where it answered "no" by itself and every menu item stayed stuck on the editor
  if (window.__lloDirty && location.hash !== lastHash) {
    const to = location.hash;
    history.replaceState(null, '', lastHash);
    const m = modal(`<h2>Unsaved changes</h2><p>Leave without saving? Your changes in this file will be lost.</p>
      <div class="foot"><button class="btn ghost" data-close>Stay</button><button class="btn primary" id="leave-go">Leave without saving</button></div>`);
    $('#leave-go', m).onclick = () => { closeModal(); window.__lloDirty = false; location.hash = to; };
    return;
  }
  window.__lloDirty = false; lastHash = location.hash;
  document.body.classList.remove('editing'); document.onselectionchange = null; document.onkeydown = null; view.className = 'view';
  const [name, ...args] = location.hash.slice(1).split('/');
  drawNav(unread);
  (ROUTES[name] || (() => lhPage('home')))(...args);
}
window.addEventListener('beforeunload', (e) => { if (window.__lloDirty) { e.preventDefault(); e.returnValue = ''; } });
// helpers the editors (separate modules) use
window.LLO = { $, $$, esc, ic, md, toast, fail, GET, POST, api, modal, closeModal, openLocal, compose, kindOf, avatar, isLocal, isAdmin, copyText, cid: CID, me: () => me };
window.addEventListener('hashchange', route);
try { const lk = localStorage.getItem('llo-look'); if (lk) document.documentElement.dataset.look = lk; } catch {}
drawTheme();
// the theme button opens the looks
$('#theme').onclick = () => { location.hash = 'setup/look'; };
const who = await GET('/api/me').catch(() => ({}));
if (!who.user) { $('.side').hidden = true; loginPage(); }
else {
  me = who.user;
  await refreshStatus();
  connectLive();
  refreshTeam();
  route();
  refreshUnread();
  setInterval(refreshUnread, 90e3);
  setInterval(remind, 60e3); remind();
  GET('/api/notes').then((n) => { notesList = n; drawAccount(); }).catch(() => {});
}

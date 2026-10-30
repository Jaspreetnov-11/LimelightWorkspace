// Lighthouse (Limelight's workspace) - home, create (AI image/video), library, and every app inside one window.
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const api = (p, body, method) => fetch(p, body || method ? { method: method || 'POST', headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) } : {})
  .then(async (r) => {
    if (r.status === 401) { location.href = '/login'; throw new Error('login needed'); }
    const j = await r.json(); if (!r.ok) throw new Error(j.error || r.status); return j;
  });

const ICONS = {
  image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  video: '<rect x="3" y="5" width="13" height="14" rx="3"/><path d="M16 10l5-3v10l-5-3z"/>',
  design: '<path d="M14.5 4.5l5 5L10 19H5v-5z"/><path d="M12.5 6.5l5 5"/><circle cx="7.5" cy="16.5" r="1" fill="currentColor"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>',
  editor: '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5z"/><path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor"/><path d="M4 8.5h2.5M4 15.5h2.5M17.5 8.5H20M17.5 15.5H20"/>',
  office: '<rect x="4" y="5" width="16" height="14" rx="2.5"/><path d="M4 9h16"/><path d="M8 13h3M8 16h6"/><circle cx="16.5" cy="14.5" r="1.5"/>',
  lighthouse: '<path d="M12 2.8v2"/><path d="M9.5 6.5h5l1.6 13.5H7.9z"/><path d="M8.6 11h6.8M8.2 15.5h7.6"/><path d="M3.5 7.5l3 1M20.5 7.5l-3 1"/>',
  ai: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
  chat: '<path d="M5 5.5h11a2.5 2.5 0 0 1 2.5 2.5v5.5A2.5 2.5 0 0 1 16 16H10l-4.5 3.5V16H5a2.5 2.5 0 0 1-2.5-2.5V8A2.5 2.5 0 0 1 5 5.5z"/><path d="M7 10h7M7 12.8h4.5"/><path d="M21.5 10.5v6a2 2 0 0 1-2 2h-.5"/>',
  group: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/>',
  clip: '<path d="M20 11.5l-8.2 8.2a5 5 0 0 1-7.1-7.1L13 4.3a3.3 3.3 0 0 1 4.7 4.7l-8.3 8.3a1.7 1.7 0 0 1-2.4-2.4L14.6 7.3"/>',
  send: '<path d="M4 12l16-8-6 16-3-7z"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  reply: '<path d="M9 7L4 12l5 5"/><path d="M4 12h10a6 6 0 0 1 6 6"/>',
  fwd: '<path d="M15 7l5 5-5 5"/><path d="M20 12H10a6 6 0 0 0-6 6"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5"/><path d="M5 19h14"/>',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  file: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5"/>',
  home: '<path d="M4 11l8-6.5 8 6.5"/><path d="M6 9.5V19h12V9.5"/><path d="M10 19v-5h4v5"/>',
  mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="M4 7l8 6 8-6"/>',
  cal: '<rect x="4" y="5.5" width="16" height="14" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
  meet: '<rect x="3" y="6.5" width="12.5" height="11" rx="2.5"/><path d="M15.5 11l5-3v8l-5-3"/>',
  check: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><path d="M8.5 12.2l2.4 2.4 4.8-5"/>',
  brief: '<rect x="3.5" y="7.5" width="17" height="11.5" rx="2.5"/><path d="M9 7.5V5.5h6v2M3.5 12.5h17"/>',
  folder: '<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>',
  word: '<path d="M6 3.5h8l4.5 4.5v12.5H6z"/><path d="M9 12l1.2 5 1.8-4 1.8 4L15 12"/>',
  grid: '<rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="M4 9.5h16M4 15h16M10 4v16"/>',
  deck: '<rect x="3.5" y="4.5" width="17" height="11.5" rx="2"/><path d="M12 16v3.5M8.5 19.5h7M8 12l2.5-3 2 2 3.5-4"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  leaf: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19l7-7"/>',
  people: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M15.5 5.5a3 3 0 0 1 0 6M17 14a5.5 5.5 0 0 1 3.5 5"/>',
  build: '<rect x="5" y="3.5" width="14" height="17" rx="1.5"/><path d="M9 7.5h2M13 7.5h2M9 11h2M13 11h2M10.5 20.5v-4h3v4"/>',
  news: '<rect x="3.5" y="5" width="14" height="14.5" rx="2"/><path d="M17.5 9h3v8.5a2 2 0 0 1-4 0M7 9h7M7 12.5h7M7 16h4"/>',
  bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z"/><path d="M10 20.5h4"/>',
  flag: '<path d="M5.5 21V4M5.5 4.5h11l-2 4 2 4h-11"/>',
  money: '<rect x="3" y="6.5" width="18" height="11" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6.5 9.5v5M17.5 9.5v5"/>',
  chart: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-4M12 16V8M16 16v-6"/>',
  wand: '<path d="M4 20l10.5-10.5M13 5.5l1-2 1 2 2 1-2 1-1 2-1-2-2-1zM18.5 11l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z"/>',
  palette: '<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 1.8-.8 1.8-1.7 0-.5-.2-.9-.5-1.2-.3-.4-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8h2.1a4.3 4.3 0 0 0 4.3-4.3C21 6.9 17 3.5 12 3.5z"/><circle cx="7.5" cy="11.5" r="1.2" fill="currentColor"/><circle cx="10.5" cy="7.5" r="1.2" fill="currentColor"/><circle cx="15" cy="7.8" r="1.2" fill="currentColor"/>',
  reload: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4"/>',
  link: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  shrink: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.5M12 18v2.5M3.5 12H6M18 12h2.5M6 6l1.8 1.8M16.2 16.2L18 18M6 18l1.8-1.8M16.2 7.8L18 6"/>',
};
const icon = (n) => `<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICONS[n] || ''}</svg>`;
const paintIcons = (root = document) => $$('[data-i]', root).forEach((el) => { el.outerHTML = icon(el.dataset.i); });

const APP_META = {
  editor: { icon: 'editor', color: '#ffb547', dock: '#ff8a3d', desc: 'Video edit' },
  design: { icon: 'design', color: '#c4a7ff', dock: '#ffc21a', desc: 'Posts, PSD, 3D' },
  office: { icon: 'office', color: '#8fb0ff', dock: '#5b8cff', desc: 'Mail, tasks, team' },
  ai: { icon: 'ai', color: '#e9d5ff', dock: '#c084fc', desc: 'Ask anything' },
};
const STYLES = ['Photo', 'Cinematic', 'Poster', '3D render', 'Illustration', 'Minimal', 'Indian art'];
const RATIOS = [['1:1', 1024, 1024], ['4:5', 896, 1152], ['9:16', 768, 1344], ['16:9', 1344, 768]];
const CAMERAS = ['Static', 'Slow zoom in', 'Pan left', 'Drone', 'Orbit', 'Handheld'];
const timeAgo = (t) => { const d = new Date(t), n = new Date();
  return d.toDateString() === n.toDateString() ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : (n - d) < 6 * 864e5 ? d.toLocaleDateString([], { weekday: 'short' }) : d.toLocaleDateString([], { day: 'numeric', month: 'short' }); };

// the one search box: in the top tray on the pages, in the middle of the slim app bar while an app is open
let spotHome = null;
function placeSearch(inBar) {
  const spot = $('#spot'); if (!spot) return;
  spotHome ||= { parent: spot.parentNode, next: spot.nextSibling };
  if (inBar && spot.parentNode !== $('#pspot')) $('#pspot').append(spot);
  else if (!inBar && spot.parentNode !== spotHome.parent) spotHome.parent.insertBefore(spot, spotHome.next);
}
// ---------- navigation ----------
let CURRENT = 'home';
function show(view, appId) {
  if (view !== 'app' && document.body.classList.contains('focus')) setFull(false);
  CURRENT = view;
  // an open app fills the window: only the slim bar (logo = Home, page tabs, apps, Share) stays above it
  document.body.classList.toggle('appwin', view === 'app');
  placeSearch(view === 'app');
  $$('.view').forEach((v) => v.classList.toggle('hidden', v.id !== 'v-' + view));
  $$('.pill').forEach((b) => b.classList.toggle('on', b.dataset.view === view));
  $$('#dock [data-app], #pdock [data-app]').forEach((b) => b.classList.toggle('on', b.dataset.app === appId));
  history.replaceState(null, '', view === 'home' ? '/' : '#' + (appId || view));
  if (view === 'library') loadLibrary();
  if (view === 'home') loadHome();
  if (view === 'create' && createTab() === 'video') loadJobs();
  window.onViewShown?.(view);
}
document.addEventListener('click', (e) => {
  const v = e.target.closest('[data-view]'); if (v) { e.preventDefault(); return show(v.dataset.view); }
  const a = e.target.closest('[data-app]'); if (a) { e.preventDefault(); $('#viewer').classList.add('hidden'); openApp(a.dataset.app, a.dataset.sub); }
});

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.add('hidden'), 3500);
}
const segValue = (id) => $(`#${id} .on`)?.dataset.v;
function wireSeg(el, cb) { el.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; $$('button', el).forEach((x) => x.classList.toggle('on', x === b)); cb?.(b); }); }
function chips(id, list) {
  const el = $('#' + id);
  el.innerHTML = list.map((x, i) => { const v = Array.isArray(x) ? x[0] : x; return `<button type="button" data-v="${esc(v)}" class="${i ? '' : 'on'}">${esc(v)}</button>`; }).join('');
  wireSeg(el);
}

// ---------- Office: one menu over two apps (o = Limelight Office, lh = Lighthouse); every feature once ----------
// [key, label, icon, app, route, admin only]
const OFFICE_MENU = [
  ['Work', ['home', 'Dashboard', 'grid', 'ws', 'openOfficeHome'], ['mail', 'Mail', 'mail', 'o', '#mail'], ['calendar', 'Calendar', 'cal', 'o', '#calendar'],
    ['meetings', 'Meetings', 'meet', 'o', '#meetings'], ['tasks', 'Tasks', 'check', 'ws', 'openTasks'], ['projects', 'Projects', 'brief', 'ws', 'openProjects'], ['overtime', 'Overtime', 'clock', 'ws', 'openOvertime'],
    ['files', 'Files', 'folder', 'o', '#storage']],
  ['Create', ['document', 'Document', 'word', 'o', '#document'], ['grid', 'Grid', 'grid', 'o', '#grid'], ['deck', 'Deck', 'deck', 'o', '#present']],
  // Attendance and Leaves live in Profile now
  ['Team', ['staff', 'Staff', 'people', 'lh', '/staff'],
    ['departments', 'Departments', 'build', 'lh', '/departments'], ['events', 'Events', 'flag', 'lh', '/events'], ['news', 'News', 'news', 'o', '#news'],
    ['alerts', 'Notifications', 'bell', 'lh', '/notifications']],
  ['Admin', ['salary', 'Salary', 'money', 'ws', 'openSalary', true], ['payroll', 'Payroll', 'money', 'lh', '/payroll', true], ['payments', 'Payments', 'file', 'lh', '/payments', true], ['clients', 'Clients', 'brief', 'lh', '/clients', true],
    ['reports', 'Reports', 'chart', 'lh', '/reports', true], ['performance', 'Performance', 'flag', 'lh', '/performance', true]],
  ['', ['settings', 'Settings', 'gear', 'lh', '/settings'], ['setup', 'Office setup', 'gear', 'o', '#setup']],
];
const OFFICE_ITEMS = OFFICE_MENU.flatMap(([, ...items]) => items);
// the old HR pages behind the new Home / Tasks / Projects (office-pages.js links to them for what those do not have)
OFFICE_ITEMS.push(['home-classic', 'Dashboard (classic)', 'home', 'lh', '/dashboard'], ['tasks-classic', 'Tasks (classic)', 'check', 'lh', '/tasks'],
  ['projects-classic', 'Projects (classic)', 'brief', 'lh', '/projects']);
let officeKey = 'home';
function drawOfficeMenu() {
  const admin = ME?.admin, cur = OFFICE_ITEMS.find((i) => i[0] === officeKey);
  const up = STATUS[cur?.[3] === 'lh' ? 'lighthouse' : 'office'];
  $('#omenu').innerHTML = `<div class="ohead"><span class="oi">${icon('office')}</span><div><b>Office</b><small><span class="dot ${up ? 'up' : 'down'}" style="display:inline-block;margin-right:5px"></span>${esc(cur?.[1] || '')}</small></div></div>` + OFFICE_MENU.map(([sec, ...items]) => {
    const vis = items.filter((i) => !i[5] || admin);
    return vis.length ? `${sec ? `<div class="osec">${sec}</div>` : '<div class="osep"></div>'}${vis.map(([k, l, ic]) =>
      `<button class="${k === officeKey || officeKey === `${k}-classic` ? 'on' : ''}" data-okey="${k}">${icon(ic)}<span>${l}</span></button>`).join('')}` : '';
  }).join('') + `<div class="ofoot"><button data-oact="share" title="Share what is open with the team">${icon('share')}Share</button><button data-oact="full" title="Full screen">${icon('expand')}</button><button data-oact="reload" title="Reload">${icon('reload')}Reload</button><a data-oact="pop" target="_blank" rel="noopener" title="Alag window">${icon('link')}Window</a></div>`;
  const f = $(`#frames iframe:not(.hidden)`); if (f) $('#omenu [data-oact="pop"]').href = f.dataset.url || f.src;
  // (on a phone the menu is a sideways strip: keep the open page's tab in view)
  if (matchMedia('(max-width: 760px)').matches) requestAnimationFrame(() => $('#omenu button.on')?.scrollIntoView({ inline: 'center', block: 'nearest' }));
}
function openOffice(key = officeKey) {
  const it = OFFICE_ITEMS.find((i) => i[0] === key) || OFFICE_ITEMS[0];
  officeKey = it[0];
  // ('ws': a page the workspace draws itself, e.g. Salary - in the same place as the app frames, the Office menu beside it)
  $('#wsPane')?.classList.toggle('hidden', it[3] !== 'ws'); $('#frames').classList.toggle('hidden', it[3] === 'ws');
  if (it[3] === 'ws') {
    drawOfficeMenu(); $('#omenu').classList.remove('hidden'); $('#v-app').classList.add('office-mode');
    $('#v-app').dataset.app = 'office'; show('app', 'office');
    window[it[4]]?.($('#wsPane'));
    return;
  }
  const id = it[3] === 'lh' ? 'lighthouse' : 'office', a = APPS.find((x) => x.id === id);
  let f = $(`#frames iframe[data-for="${id}"]`);
  // ?v=<this page load>: the frame never reuses an old cached page (the glass styles are added when it is served)
  const url = appUrl(a).replace(/\/$/, '') + (it[3] === 'lh' ? `${it[4]}?v=${BOOT}` : `/?v=${BOOT}${it[4]}`);
  if (!f) { f = makeFrame(id, url); } else if (f.dataset.url !== url) { f.src = url; }
  f.dataset.url = url;
  $$('#frames iframe').forEach((x) => x.classList.toggle('hidden', x !== f));
  drawOfficeMenu(); $('#omenu').classList.remove('hidden'); $('#v-app').classList.add('office-mode');
  $('#appTitle').textContent = `Office · ${it[1]}`; $('#appPop').href = url;
  $('#appDot').className = 'dot ' + (STATUS[id] ? 'up' : 'down');
  $('#appStart').classList.toggle('hidden', !(a.canStart && !STATUS[id]));
  $('#v-app').dataset.app = id;
  show('app', 'office');
}
$('#omenu').addEventListener('click', (e) => {
  const b = e.target.closest('[data-okey]'); if (b) return openOffice(b.dataset.okey);
  if (e.target.closest('[data-oact="reload"]')) $('#appReload').click();
  if (e.target.closest('[data-oact="full"]')) setFull(true);
  if (e.target.closest('[data-oact="share"]')) window.openShare?.();
});
window.openOffice = openOffice;

// ---------- full screen for the open app ----------
// In Lighthouse.exe the window itself goes full screen (F11 there); in a browser, the page does (Fullscreen API).
const host = window.chrome && window.chrome.webview;
let hostFull = false;
function setFull(on) {
  if (document.body.classList.contains('focus') === on) return;
  document.body.classList.toggle('focus', on);
  $('#barFull').innerHTML = icon(on ? 'shrink' : 'expand'); $('#barFull').title = on ? 'Exit full screen (Esc)' : 'Full screen (Esc to come back)';
  if (host) { if (hostFull !== on) { host.postMessage('full'); hostFull = on; } }
  else if (on) document.documentElement.requestFullscreen?.().catch(() => {});
  else if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && !host) setFull(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('focus')) setFull(false); });

// ---------- apps inside the workspace ----------
function makeFrame(id, src) {
  const f = document.createElement('iframe');
  f.dataset.for = id; f.src = src; f.allow = 'clipboard-read; clipboard-write; fullscreen; microphone; camera; autoplay; display-capture';
  $('#frames').append(f);
  return f;
}
let APPS = [], STATUS = {};
const BOOT = Date.now().toString(36);
// on this PC / the LAN every app has its own port; on the public domain its own host (lh-*.limelightcorp.net)
const appUrl = (a) => (location.port || !a.host ? `${location.protocol}//${location.hostname}:${a.port}/` : `https://${a.host}/`);
function openApp(id, sub) {
  if (id === 'office' || id === 'lighthouse') return openOffice(sub || (id === 'lighthouse' ? 'home' : undefined));
  const a = APPS.find((x) => x.id === id); if (!a) return;
  $('#omenu').classList.add('hidden'); $('#v-app').classList.remove('office-mode');
  $('#wsPane')?.classList.add('hidden'); $('#frames').classList.remove('hidden');
  let f = $(`#frames iframe[data-for="${id}"]`);
  if (!f) {
    f = makeFrame(id, appUrl(a) + (sub || ''));
  } else if (sub) f.src = `${appUrl(a)}?o=${Date.now()}${sub}`; // design reads the project id from the hash only on load
  $$('#frames iframe').forEach((x) => x.classList.toggle('hidden', x !== f));
  $('#appTitle').textContent = a.name; $('#appPop').href = appUrl(a);
  $('#appDot').className = 'dot ' + (STATUS[id] ? 'up' : 'down');
  $('#appStart').classList.toggle('hidden', !(a.canStart && !STATUS[id]));
  $('#v-app').dataset.app = id;
  show('app', id);
}
$('#appFull').onclick = () => setFull(true);
$('#exitFull').onclick = () => setFull(false);
$('#barFull').onclick = () => setFull(!document.body.classList.contains('focus'));
$('#barReload').onclick = () => $('#appReload').click();
$('#barShare').onclick = () => window.openShare?.();
$('#appReload').onclick = () => { const f = $(`#frames iframe[data-for="${$('#v-app').dataset.app}"]`); if (f) f.src = f.src; };
$('#appStart').onclick = async () => {
  const id = $('#v-app').dataset.app;
  await api(`/api/apps/${id}/start`, {}).catch((e) => toast("Couldn't start: " + e.message));
  toast('Starting the app…');
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 1500)); await refreshStatus();
    if (STATUS[id]) { $('#appReload').click(); $('#appStart').classList.add('hidden'); return; }
  }
};

async function loadApps() {
  APPS = await api('/api/apps');
  const meta = (a) => APP_META[a.id] || { icon: 'ai', color: '#8b93a3', desc: '' };
  const shown = APPS.filter((a) => !a.part);
  if ($('#appGrid')) $('#appGrid').innerHTML = shown.map((a) => `<a class="app" href="#${a.id}" data-app="${a.id}" title="${esc(meta(a).desc)}" style="--c:${meta(a).color}"><span class="dot"></span>${icon(meta(a).icon)}${esc(a.name)}</a>`).join('')
    + `<a class="app" href="#chats" data-view="chats" title="Talk to the team" style="--c:#7ee0d3">${icon('chat')}Chats<span class="n cnt hidden" id="appChatN"></span></a>`;
  $('#dock').innerHTML = shown.map((a) => `<button data-app="${a.id}" title="${esc(a.name)}" style="background:${meta(a).dock || meta(a).color}">${icon(meta(a).icon)}</button>`).join('');
  $('#pdock').innerHTML = $('#dock').innerHTML; // (the same apps beside the page tabs, shown in full screen)
  await refreshStatus();
}
async function refreshStatus() {
  const st = await api('/api/apps/status').catch(() => []);
  for (const s of st) {
    STATUS[s.id] = s.up;
    $$(`.app[data-app="${s.id}"] .dot`).forEach((d) => { d.className = 'dot ' + (s.up ? 'up' : 'down'); d.title = s.up ? 'live' : 'offline'; });
  }
}

// ---------- home: widgets + "Aaj" feed ----------
const FEED_ICON = { chat: ['chat', '#2dd4bf'], task: ['lighthouse', '#3ddc84'], design: ['design', '#ffc21a'], image: ['image', '#c084fc'] };
let FEED = [];
const hhmm = (t) => (new Date(t).toDateString() === new Date().toDateString() ? new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : timeAgo(t));
async function loadHome() {
  $('#todayDate').textContent = new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
  const [chats, d, projects, lib] = await Promise.all([api('/api/chat/list').catch(() => []), api('/api/dashboard').catch(() => ({})),
    api('/api/projects').catch(() => []), api('/api/library').catch(() => [])]);
  const people = window.PEOPLE || {}, who = (c) => c.members.find((e) => e !== ME?.email);
  const title = (c) => (c.type === 'group' ? c.name : people[who(c)]?.name || (who(c) || '').split('@')[0]);
  const none = (t) => `<div class="none">${t}</div>`;
  const tm = (t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // stat tiles
  const unread = chats.filter((c) => c.unread), n = unread.reduce((a, c) => a + c.unread, 0);
  $('#dChats').textContent = n;
  $('#dChatsSub').textContent = unread.length ? unread.slice(0, 3).map(title).join(' · ') : 'All caught up';
  const tasks = d.tasks || [];
  $('#dTasks').textContent = d.tasks ? tasks.length : '–';
  $('#dTasksSub').textContent = !d.tasks ? "Couldn't load from the server" : tasks.length ? tasks.slice(0, 2).map((t) => t.title).join(' · ') : 'No pending tasks 🎉';
  $('#dMail').textContent = d.mail ?? '–';
  const next = (d.meetings || []).find((m) => m.start > Date.now());
  $('#dMailSub').textContent = next ? `Mail, calendar, files · next meeting ${tm(next.start)}` : 'Mail, calendar, files, docs';
  $('#dIn').textContent = d.punch?.in ? String(d.punch.in).slice(0, 5) : '–';
  $('#dInSub').textContent = !d.punch ? "Couldn't load from the server" : d.punch.in ? (d.punch.out ? `Out ${String(d.punch.out).slice(0, 5)}` : 'Checked in') : 'Not checked in yet';

  // lists
  $('#dProjects').innerHTML = !d.projects ? none("Couldn't load from the server") : d.projects.length
    ? d.projects.slice(0, 8).map((p) => `<div class="dl"><span class="pip"></span><span class="t"><b>${esc(p.name)}</b>${p.client ? ` · <span style="color:var(--muted)">${esc(p.client)}</span>` : ''}</span><em>${esc(p.status)}</em></div>`).join('') : none('No active projects');
  $('#dActivity').innerHTML = !d.activity ? none("Couldn't load from the server") : d.activity.length
    ? d.activity.map((a) => `<div class="dl"><span class="pip"></span><span class="t">${esc(a.text)}</span><em>${a.at ? timeAgo(new Date(a.at.replace(' ', 'T') + (a.at.includes('Z') || a.at.includes('+') ? '' : 'Z'))) : ''}</em></div>`).join('') : none('No updates yet');
  $('#dMeet').innerHTML = !d.meetings ? none('Office is offline') : d.meetings.length
    ? d.meetings.map((m) => `<div class="dl"><span class="pip"></span><span class="t">${esc(m.title)}</span><em>${tm(m.start)}</em></div>`).join('') : none('No meetings today');

  // app tiles
  const st = d.status || STATUS;
  const pill = (id, up, label) => { const p = $('#' + id); if (!p) return; p.className = 'ac-st ' + (up ? 'up' : 'down'); p.querySelector('span').textContent = label || (up ? 'Live' : 'Off'); };
  pill('dEditSt', st.editor); pill('dDesignSt', st.design !== false); pill('dOfficeSt', st.office !== false); pill('dAiSt', st.ai);
  $('#dEditN').textContent = st.editor ? 'Live' : 'Off';
  $('#dEdit').textContent = st.editor ? 'Reels, films, captions — edit together' : 'The editor PC is not answering';
  const week = projects.filter((p) => p.updated > Date.now() - 7 * 864e5);
  $('#dDesignN').textContent = week.length;
  $('#dDesign').textContent = week[0] ? `Posts, PSD, CDR, 3D · last: ${week[0].name}` : 'Posts, PSD, CDR, 3D';
  $('#dAi').textContent = st.ai ? 'Images, videos and answers' : 'The AI PC is not answering';
  $('#dAiN').textContent = st.ai ? '✦' : 'Off';

  // feed: chats, tasks, design edits, AI pictures - newest first (a task sits at its due time, else at the top)
  const since = new Date().setHours(0, 0, 0, 0) - 6 * 864e5;
  FEED = [
    ...chats.filter((c) => c.last).map((c) => ({ kind: 'chat', t: c.last.at, id: c.id, unread: c.unread,
      html: `<b>${esc(title(c))}</b> — ${esc(c.last.deleted ? 'message deleted' : c.last.text || '📎 ' + c.last.file)}` })),
    ...tasks.map((t) => ({ kind: 'task', t: t.due ? new Date(t.due).getTime() : Date.now(), html: `Task: <b>${esc(t.title)}</b>`, label: t.due ? '' : esc(t.status) })),
    ...projects.filter((p) => p.updated > since).map((p) => ({ kind: 'design', t: p.updated, id: p.id, html: `Design edited: <b>${esc(p.name)}</b>` })),
    ...lib.filter((f) => f.t > since && f.name.startsWith('ai_')).map((f) => ({ kind: 'image', t: f.t, url: f.url, html: 'AI picture made' })),
  ].sort((a, b) => b.t - a.t);
  renderFeed();
}
$('#dAiForm').addEventListener('submit', (e) => { e.preventDefault(); const t = $('#dAiIn').value.trim(); $('#dAiIn').value = ''; if (t) aiCreate('image', t); else openApp('ai'); });
$('#dAiForm').addEventListener('click', (e) => { if (!e.target.closest('input')) openApp('ai'); });
function renderFeed() {
  const f = $('#feedTabs .on').dataset.f;
  const list = FEED.filter((x) => f === 'all' || x.kind === f || (f === 'file' && (x.kind === 'design' || x.kind === 'image'))).slice(0, 40);
  $('#feed').innerHTML = list.length ? list.map((x) => `<div class="fi" data-feed="${FEED.indexOf(x)}"><i style="background:${FEED_ICON[x.kind][1]}">${icon(FEED_ICON[x.kind][0])}</i>
    <span class="ft">${x.html}</span>${x.unread ? `<span class="n">${x.unread}</span>` : ''}<em>${x.label || hhmm(x.t)}</em></div>`).join('')
    : `<div class="none">${f === 'task' ? 'No pending tasks' : 'Nothing here yet — start a chat or make something'}</div>`;
}
$('#feedTabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; $$('#feedTabs button').forEach((x) => x.classList.toggle('on', x === b)); renderFeed(); });
$('#feed').addEventListener('click', (e) => {
  const r = e.target.closest('[data-feed]'); if (!r) return;
  const x = FEED[r.dataset.feed];
  if (x.kind === 'chat') { show('chats'); window.openChat?.(x.id); }
  if (x.kind === 'task') openOffice('tasks');
  if (x.kind === 'design') openApp('design', '#' + x.id);
  if (x.kind === 'image') openViewer(x.url);
});


// ---------- create: AI image + AI video ----------
const createTab = () => segValue('createTab');
function setCreateTab(t) {
  $$('#createTab button').forEach((b) => b.classList.toggle('on', b.dataset.v === t));
  $('#c-image').classList.toggle('hidden', t !== 'image'); $('#c-video').classList.toggle('hidden', t !== 'video');
  $('#createTitle').innerHTML = t === 'image' ? 'AI Image' : 'AI Video <span class="tag">preview</span>';
  $('#createSub').textContent = t === 'image' ? 'Write a prompt and Limelight AI (NAYA B) will make the picture.' : "A short video clip from text (5–10 sec). The video engine isn't installed yet — the screen is ready.";
  if (t === 'video') loadJobs();
}
function setupImage() {
  wireSeg($('#createTab'), (b) => setCreateTab(b.dataset.v));
  chips('imgStyle', STYLES); chips('imgRatio', RATIOS);
  wireSeg($('#imgPreset')); wireSeg($('#imgCount'));
  $('#imgForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const prompt = $('#imgPrompt').value.trim();
    if (!prompt) { $('#imgPrompt').focus(); return; }
    const style = segValue('imgStyle'), [, width, height] = RATIOS.find((r) => r[0] === segValue('imgRatio'));
    const count = +segValue('imgCount');
    $('#imgGo').disabled = true; $('#imgNote').className = 'note'; $('#imgNote').textContent = 'Making it… the first time, loading the model can take 1–2 min.';
    const out = $('#imgOut'); const prev = out.querySelector('.results');
    out.innerHTML = `<div class="results">${Array.from({ length: count }, () => `<div class="loading" style="aspect-ratio:${width}/${height}">Generating…</div>`).join('')}${prev ? prev.innerHTML : ''}</div>`;
    try {
      const imgs = await api('/api/ai/image', { prompt: `${prompt}, ${style.toLowerCase()} style`, negative: $('#imgNeg').value,
        preset: segValue('imgPreset'), width, height, count });
      $$('.loading', out).forEach((l) => l.remove());
      $('.results', out).insertAdjacentHTML('afterbegin', imgs.map((i) => `<button data-img="${i.url}"><img src="${i.url}" alt=""></button>`).join(''));
      $('#imgNote').textContent = `${imgs.length} ready — saved to Library.`;
    } catch (err) {
      $$('.loading', out).forEach((l) => l.remove());
      if (!$('.results', out).children.length) out.innerHTML = `<div class="empty">${icon('image')}<p>Couldn't make the picture</p></div>`;
      $('#imgNote').className = 'note err';
      $('#imgNote').textContent = /401|password/.test(err.message) ? "The AI server is asking for its password — enter it in the Design app's AI settings." : 'Error: ' + err.message;
    } finally { $('#imgGo').disabled = false; }
  });
}
function setupVideo() {
  chips('vidCam', CAMERAS); wireSeg($('#vidRatio')); wireSeg($('#vidSec'));
  $('#vidImg').addEventListener('change', () => {
    const f = $('#vidImg').files[0]; if (!f) return;
    const d = $('#vidDrop'); d.style.backgroundImage = `url(${URL.createObjectURL(f)})`; d.classList.add('has'); $('span', d).textContent = f.name;
  });
  $('#vidForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const prompt = $('#vidPrompt').value.trim();
    if (!prompt) { $('#vidPrompt').focus(); return; }
    const ratio = segValue('vidRatio');
    $('#vidPlayer').style.aspectRatio = ratio.replace(':', ' / ');
    await api('/api/ai/video', { prompt, ratio, seconds: +segValue('vidSec'), style: segValue('vidCam') });
    toast('Request saved — the video will be made here once the video engine is installed.');
    loadJobs();
  });
}
async function loadJobs() {
  const jobs = await api('/api/ai/video').catch(() => []);
  $('#vidJobs').innerHTML = jobs.length ? jobs.slice(0, 8).map((j) => `<div class="job glass">${icon('video')}<p title="${esc(j.prompt)}">${esc(j.prompt)}</p>
    <small>${esc(j.ratio)} · ${j.seconds}s · ${esc(j.style)}</small><span class="tag">engine pending</span></div>`).join('')
    : '<div class="job glass"><p style="color:var(--muted)">No requests yet</p></div>';
}

// ---------- library + viewer ----------
async function loadLibrary() {
  window.loadVideos?.();
  const lib = await api('/api/library').catch(() => []);
  $('#libGrid').innerHTML = lib.length ? lib.map((f) => `<button data-img="${f.url}" title="${esc(f.name)}"><img src="${f.url}" alt="" loading="lazy"></button>`).join('')
    : '<p style="color:var(--muted)">Library is empty.</p>';
}
function openViewer(url) { $('#viewerImg').src = url; $('#viewerDl').href = url; $('#viewer').classList.remove('hidden'); }
document.addEventListener('click', (e) => { const b = e.target.closest('[data-img]'); if (b) openViewer(b.dataset.img); });
$('#viewerClose').onclick = () => $('#viewer').classList.add('hidden');
$('#viewer').addEventListener('click', (e) => { if (e.target.id === 'viewer') $('#viewer').classList.add('hidden'); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $('#viewer').classList.add('hidden'); });

// a new line every day under the greeting: the Bhagavad Gita, short, in English with the Hindi beside it
// [English, Hindi, chapter.verse]
const QUOTES = [
  ['You have a right to your work, never to its fruits.', 'कर्म पर तुम्हारा अधिकार है, फल पर नहीं।', '2.47'],
  ['Do your duty, without attachment to success or failure.', 'सफलता-असफलता से अनासक्त होकर कर्म करो।', '2.48'],
  ['Skill in action is yoga.', 'कर्म में कुशलता ही योग है।', '2.50'],
  ['Lift yourself by your own self.', 'अपने आप से ही अपना उद्धार करो।', '6.5'],
  ['The mind is restless, but practice steadies it.', 'मन चंचल है, पर अभ्यास से वश में आता है।', '6.35'],
  ['Action is better than inaction.', 'अकर्म से कर्म श्रेष्ठ है।', '3.8'],
  ['What the great do, others follow.', 'श्रेष्ठ जन जो करते हैं, लोग वही करते हैं।', '3.21'],
  ['Better your own path, done imperfectly, than another’s done well.', 'अपना धर्म अधूरा भी, पराए से श्रेष्ठ है।', '3.35'],
  ['Nothing in this world purifies like knowledge.', 'इस संसार में ज्ञान के समान पवित्र कुछ नहीं।', '4.38'],
  ['One who has faith gains knowledge.', 'श्रद्धावान को ज्ञान प्राप्त होता है।', '4.39'],
  ['Be steady in joy and in sorrow.', 'सुख और दुःख में सम रहो।', '2.38'],
  ['The calm mind sees clearly.', 'शांत मन में ही बुद्धि स्थिर होती है।', '2.65'],
  ['Give up doubt; rise and act.', 'संशय छोड़ो, उठो और कर्म करो।', '4.42'],
  ['Whatever you do, offer it as your best.', 'जो भी करो, उसे श्रेष्ठ भाव से अर्पण करो।', '9.27'],
  ['Moderation in work and rest brings balance.', 'कर्म और विश्राम में संयम से संतुलन आता है।', '6.17'],
  ['The wise work for the good of all.', 'ज्ञानी सबके हित के लिए कर्म करते हैं।', '3.25'],
  ['Anger clouds judgement.', 'क्रोध से बुद्धि भ्रमित होती है।', '2.63'],
  ['Change is the law of the world.', 'परिवर्तन ही संसार का नियम है।', '2.14'],
  ['A person becomes what they believe.', 'मनुष्य जैसा विश्वास करता है, वैसा बन जाता है।', '17.3'],
  ['Work done with a steady mind never goes to waste.', 'स्थिर मन से किया कर्म कभी व्यर्थ नहीं जाता।', '2.40'],
];

// ---------- one login: who is signed in ----------
let ME = null;
async function loadMe() {
  ME = await api('/api/me');
  $('#mmName').textContent = ME.name; $('#mmEmail').textContent = ME.email;
  $('#aiSet').classList.toggle('hidden', !ME.admin);
  $('#aiSetState').textContent = ME.aiReady ? 'Set for everyone ✓ (enter a new one to change it)' : 'Enter the password once — then no one sees the AI login';
  $('#meBtn').textContent = ME.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const h = new Date().getHours();
  $('#hello').textContent = `${h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'}, ${ME.name.split(' ')[0]}.`;
  const q = QUOTES[Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 864e5) % QUOTES.length];
  $('#quote').innerHTML = `“${esc(q[0])}” <em class="q-hi">${esc(q[1])}</em> <span class="q-src">— Bhagavad Gita ${q[2]}</span>`;
  const tick = () => { const d = new Date(); $('#nowDate').textContent = d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' });
    $('#nowTime').textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };
  tick(); setInterval(tick, 15000);
}
$('#meBtn').onclick = (e) => { e.stopPropagation(); $('#meMenu').classList.toggle('hidden'); };
document.addEventListener('click', (e) => { if (!e.target.closest('#meMenu')) $('#meMenu').classList.add('hidden'); });
$('#aiSet').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const r = await api('/api/settings/ai', { password: $('#aiPw').value });
    $('#aiPw').value = ''; $('#aiSetState').textContent = r.check; toast(r.check);
    const f = $('#frames iframe[data-for="ai"]'); if (f) f.src = f.src;
  } catch (err) { $('#aiSetState').textContent = err.message; }
});
$('#logoutBtn').onclick = async () => { await fetch('/api/logout', { method: 'POST' }); location.href = '/login'; };

// ---------- colour themes: new palettes + the old looks' colours + a custom one, saved per PC ----------
const LIGHT = { '--ink': '22 20 15', '--field': '#ffffffcc', '--pop': '#fffdf8f5', '--glass': '#ffffff99', '--glass-2': '#ffffffc4', '--glass-3': '#ffffff',
  '--edge': '#16140f1f', '--edge-2': '#16140f3d' };
const acc = (c, ink = '#1a1300') => ({ '--acc': c, '--acc-2': c, '--acc-ink': ink, '--acc-soft': c + '26' });
const THEMES = [
  ['black', 'Pure Black', {}],
  ['aurora', 'Aurora', { '--bg': '#1c1a2e', '--a1': '#8b5cf6', '--a2': '#fdba74', '--a3': '#38bdf8', '--a4': '#f472b6' }],
  ['ocean', 'Ocean', { '--bg': '#1c1a2e', '--a1': '#1d4ed8', '--a2': '#22d3ee', '--a3': '#0d9488', '--a4': '#6366f1', ...acc('#38bdf8', '#04223a') }],
  ['sunset', 'Sunrise', { '--bg': '#23141f', '--a1': '#fb7185', '--a2': '#fdba74', '--a3': '#a855f7', '--a4': '#f43f5e', '--brand': '#fdba74', ...acc('#fb923c', '#2a1000') }],
  ['forest', 'Forest', { '--bg': '#1c1a2e', '--a1': '#047857', '--a2': '#a3e635', '--a3': '#0891b2', '--a4': '#15803d', ...acc('#4ade80', '#03230f') }],
  ['rose', 'Rose', { '--bg': '#1c1a2e', '--a1': '#c026d3', '--a2': '#fb7185', '--a3': '#7c3aed', '--a4': '#f43f5e', ...acc('#f472b6', '#2e0619') }],
  ['midnight', 'Midnight', { '--bg': '#1c1a2e', '--a1': '#334155', '--a2': '#ffc21a66', '--a3': '#1e293b', '--a4': '#475569' }],
  // the earlier "Workspace looks", as colours
  ['classic', 'Classic', { '--bg': '#0b0c0f', '--a1': '#0b0c0f', '--a2': '#ffc21a55', '--a3': '#0b0c0f', '--a4': '#0b0c0f' }],
  ['bento', 'Bento', { '--bg': '#0a0a0c', '--a1': '#ff8a3d', '--a2': '#5b8cff', '--a3': '#3ddc84', '--a4': '#ffc21a' }],
  ['rosequartz', 'Rose Quartz', { ...LIGHT, '--bg': '#fbf7fb', '--a1': '#f9a8d4', '--a2': '#c4b5fd', '--a3': '#fde68a', '--a4': '#f9a8d4', '--brand': '#db2777', ...acc('#db2777', '#ffffff') }, true],
  ['editorial', 'Editorial', { ...LIGHT, '--bg': '#f6f3ec', '--a1': '#e8d9b8', '--a2': '#f3c35d', '--a3': '#d7e3ee', '--a4': '#f0d8c8', ...acc('#c48a00', '#ffffff') }, true],
  ['graphite', 'Graphite', { '--bg': '#1a1b20', '--a1': '#4a4b55', '--a2': '#ffc21a3d', '--a3': '#30313a', '--a4': '#3a3b44', '--base': 'linear-gradient(180deg,#2a2b31,#1a1b20)', '--brand': '#ffc21a' }],
  ['desktop', 'Desktop', { '--bg': '#1c1a2e', '--a1': '#5a3b0a', '--a2': '#ffc21a40', '--a3': '#0b3b5a', '--a4': '#1b1407', '--base': 'linear-gradient(160deg,#1b1407,#0b0c0f 45%,#06131f)' }],
];
// the default until someone picks: Pure Black everywhere (theme-boot.js paints the same before the page loads)
const DEFAULT_THEME = 'black';
const ALL_VARS = [...new Set(THEMES.flatMap((t) => Object.keys(t[2])))];
const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
function applyTheme(key, vars, light) {
  const root = document.documentElement;
  for (const v of ALL_VARS) root.style.removeProperty(v);
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  if (light) root.dataset.mode = 'light'; else delete root.dataset.mode;
  try { localStorage.setItem('lh-theme-vars', JSON.stringify({ key, vars, light: !!light, custom: savedTheme()?.custom })); } catch (e) { /* private window */ }
  drawSwatches();
}
const setTheme = (key) => { const t = THEMES.find((x) => x[0] === key) || THEMES[0]; applyTheme(t[0], t[2], t[3]); };
function savedTheme() { try { return JSON.parse(localStorage.getItem('lh-theme-vars') || 'null'); } catch (e) { return null; } }
function drawSwatches() {
  const cur = savedTheme()?.key || DEFAULT_THEME;
  const v = (t, k, d) => (t[2][k] || d);
  $('#swatches').innerHTML = THEMES.map((t) => `<button class="${t[0] === cur ? 'on' : ''}" data-theme="${t[0]}">
    <i style="background:radial-gradient(circle at 20% 25%,${v(t, '--a1', '#000')},transparent 62%),radial-gradient(circle at 85% 15%,${v(t, '--a2', '#000')},transparent 58%),radial-gradient(circle at 60% 100%,${v(t, '--a3', '#000')},transparent 62%),${v(t, '--base', v(t, '--bg', '#000'))}"></i>${t[1]}</button>`).join('')
    + `<button class="${cur === 'custom' ? 'on' : ''}" data-theme="custom"><i style="background:conic-gradient(from 90deg,#f43f5e,#f59e0b,#84cc16,#06b6d4,#8b5cf6,#f43f5e)"></i>Custom</button>`;
  const c = savedTheme()?.custom;
  if (c) for (const [id, val] of Object.entries(c)) if ($('#' + id)) $('#' + id).value = val;
}
function applyCustom() {
  const c = Object.fromEntries(['cBg', 'cA1', 'cA2', 'cA3', 'cAcc'].map((id) => [id, $('#' + id).value]));
  const light = lum(c.cBg) > 0.55;
  applyTheme('custom', { ...(light ? LIGHT : {}), '--bg': c.cBg, '--a1': c.cA1, '--a2': c.cA2, '--a3': c.cA3, '--a4': c.cA1, ...acc(c.cAcc, lum(c.cAcc) > 0.55 ? '#1a1300' : '#ffffff') }, light);
  try { const t = savedTheme(); t.custom = c; localStorage.setItem('lh-theme-vars', JSON.stringify(t)); } catch (e) { /* private window */ }
}
$('#themeBtn').onclick = (e) => { e.stopPropagation(); drawSwatches(); $('#themePop').classList.toggle('hidden'); $('#meMenu').classList.add('hidden'); };
$('#swatches').addEventListener('click', (e) => { const b = e.target.closest('[data-theme]'); if (!b) return; b.dataset.theme === 'custom' ? applyCustom() : setTheme(b.dataset.theme); });
$('#cApply').onclick = applyCustom;
$$('.custom input[type=color]').forEach((i) => i.addEventListener('input', () => { if (savedTheme()?.key === 'custom') applyCustom(); }));
document.addEventListener('click', (e) => { if (!e.target.closest('#themePop')) $('#themePop').classList.add('hidden'); });

// ---------- boot ----------
paintIcons();
setupImage(); setupVideo();
const ready = Promise.all([loadMe(), loadApps()]);
setInterval(refreshStatus, 30000);
// a saved ready-made theme is re-applied from THEMES, so changed colours reach everyone who picked it
// (no theme picked on this device yet: Desktop is the default)
// ("auto": the default, not a pick - it keeps following phone / computer)
{ const t = savedTheme(); if (!t || t.auto) { setTheme(DEFAULT_THEME); try { localStorage.setItem('lh-theme-vars', JSON.stringify({ ...savedTheme(), auto: true })); } catch (e) { /* private window */ } } else if (t.key !== 'custom' && THEMES.some((x) => x[0] === t.key)) setTheme(t.key); }
ready.then(() => {
  const start = location.hash.slice(1);
  if (['chats', 'create', 'library', 'profile'].includes(start)) show(start);
  else if (['attendance', 'leaves'].includes(start)) { show('profile'); document.querySelector(`#pfTabs [data-t="${start}"]`)?.click(); }
  else if (APPS.some((a) => a.id === start)) openApp(start);
  else if (OFFICE_ITEMS.some((i) => i[0] === start)) openOffice(start);
  else loadHome();
});

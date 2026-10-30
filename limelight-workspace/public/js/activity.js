// Limelight workspace - work time. The mouse / keyboard here and in every app inside (the app pages pass it up -
// WHERE_JS) keeps a session going; 5 minutes without either ends it. Every 30 s the server hears which app is open and
// when this person last touched anything (/api/activity/beat). Profile > Time: staff see their clock in / clock out;
// admins see everyone's day - clock in / out, work sessions, task time.
// Uses workspace.js ($, $$, api, esc, toast, CURRENT, APPS, ME).
const IDLE_MS = 5 * 60e3;
let lastTouch = Date.now(), wasIdle = false;
const APP_LABEL = { editor: 'Edit', design: 'Design', office: 'Office', lighthouse: 'Office', ai: 'Limelight AI', home: 'Home', chats: 'Chats', create: 'Create', library: 'Library', profile: 'Profile' };
const APP_COLOR = { editor: '#ff8a3d', design: '#ffc21a', office: '#5b8cff', lighthouse: '#5b8cff', ai: '#c084fc', chats: '#2dd4bf', home: '#8b93a3', create: '#f472b6', library: '#3ddc84', profile: '#94a3b8' };
const nowApp = () => { if (CURRENT !== 'app') return CURRENT; const a = $('#v-app').dataset.app; return a === 'lighthouse' ? 'office' : a; };

function touched() {
  const n = Date.now();
  if (n - lastTouch >= IDLE_MS) { wasIdle = true; }
  lastTouch = n;
  if (wasIdle) { wasIdle = false; beat(); } // (a new session starts quietly)
}
['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart'].forEach((k) => addEventListener(k, touched, { passive: true, capture: true }));
window.addEventListener('message', (e) => {
  if (!e.data?.lhActive) return;
  if (!APPS.some((a) => { try { return new URL(appUrl(a)).origin === e.origin; } catch { return false; } })) return;
  touched();
});
function beat() {
  if (!ME) return;
  api('/api/activity/beat', { app: nowApp(), last: lastTouch }).catch(() => {});
}
setInterval(beat, 30e3);
// (the page going away: the last touch still counts)
addEventListener('pagehide', () => { try { navigator.sendBeacon('/api/activity/beat', new Blob([JSON.stringify({ app: nowApp(), last: lastTouch })], { type: 'application/json' })); } catch {} });

// ---------- Profile > Time ----------
const dur = (ms) => { const m = Math.round(ms / 60e3); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`; };
const tmHm = (t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
function bars(total, all) {
  return Object.entries(total).sort((a, b) => b[1] - a[1]).map(([k, ms]) => `<div class="tm-row"><span class="tm-k"><i style="background:${APP_COLOR[k] || '#8b93a3'}"></i>${esc(APP_LABEL[k] || k)}</span>
    <span class="tm-bar"><b style="width:${Math.max(2, (ms / Math.max(1, all)) * 100)}%;background:${APP_COLOR[k] || '#8b93a3'}"></b></span><span class="tm-v">${dur(ms)}</span></div>`).join('');
}
const mins = (m) => (m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min` : `${m} min`);
const punchLine = (p) => (p ? `<div class="tm-clock"><span><small>Clock in</small><b>${esc(p.in || '—')}</b></span><span><small>Clock out</small><b>${esc(p.out || (p.in ? 'working' : '—'))}</b></span>
  ${p.status ? `<span><small>Status</small><b>${esc(p.status)}${p.late ? ' · late' : ''}</b></span>` : ''}${p.mode ? `<span><small>Mode</small><b>${esc(p.mode)}</b></span>` : ''}</div>` : '<p class="none">No clock in on this day.</p>');
let BOARD = null;
// staff: their own clock in / clock out for the day; admins: everyone's day (clock in / out, work sessions, task time)
async function loadTime() {
  const d = $('#tmDay').value || today(), box = $('#tmMine'), team = $('#tmTeam');
  box.innerHTML = '<p class="none">Loading…</p>'; team.innerHTML = '';
  let r; try { r = await api(`/api/timeboard?day=${d}`); } catch (err) { box.innerHTML = `<p class="none">${esc(err.message)}</p>`; return; }
  const when = d === today() ? 'today' : d;
  if (r.me) { box.innerHTML = `<div class="tm-head"><div><small>You · ${when}</small></div></div>${punchLine(r.me.punch)}`; return; }
  BOARD = r;
  box.innerHTML = `<div class="tm-head"><div><small>Everyone · ${when}</small><b>${r.rows.length} people</b><small>clock in / out, active work (a session ends after 5 min without mouse or keyboard) and task time</small></div></div>`;
  team.innerHTML = r.rows.length ? `<div class="tm-grid"><span>Name</span><span>Clock in</span><span>Clock out</span><span>Active work</span><span>Task time</span></div>` + r.rows.map((x, i) => `<button class="tm-p" data-row="${i}">
    <span class="tm-pn"><b>${esc(x.name)}</b><small>${esc(x.dept || '')}</small></span>
    <span class="tm-c">${esc(x.punch?.in || '—')}${x.punch?.late ? ' <em>late</em>' : ''}</span><span class="tm-c">${esc(x.punch?.out || (x.punch?.in ? 'working' : '—'))}</span>
    <span class="tm-c">${x.active ? dur(x.active) : '—'}<span class="tm-bar">${Object.entries(x.total).sort((a, b) => b[1] - a[1]).map(([k, ms]) => `<b title="${esc(APP_LABEL[k] || k)}: ${dur(ms)}" style="width:${(ms / x.active) * 100}%;background:${APP_COLOR[k] || '#8b93a3'}"></b>`).join('')}</span></span>
    <span class="tm-c">${x.tasks.length ? `${mins(x.taskMins)} <small>· ${x.tasks.length} task${x.tasks.length > 1 ? 's' : ''}</small>` : '—'}</span></button>
    <div class="tm-more hidden" data-more="${i}"></div>`).join('') : '<p class="none">Nobody clocked in or worked on this day.</p>';
}
function openRow(i) {
  const x = BOARD?.rows[i], box = $(`[data-more="${i}"]`); if (!x || !box) return;
  if (!box.classList.contains('hidden')) return box.classList.add('hidden');
  box.innerHTML = `<div class="tm-cols"><div><div class="shsec">Work sessions</div>${x.sessions.length ? x.sessions.slice().reverse().map((s) => `<div class="tm-s"><i style="background:${APP_COLOR[s.app] || '#8b93a3'}"></i><b>${esc(APP_LABEL[s.app] || s.app)}</b><span>${tmHm(s.start)} – ${tmHm(s.end)}</span><em>${dur(s.ms)}</em></div>`).join('') : '<p class="none">No active work in Limelight</p>'}</div>
    <div><div class="shsec">Tasks</div>${x.tasks.length ? x.tasks.map((t) => `<div class="tm-t"><b>${esc(t.title)}</b><span>${esc(t.type)} · ${esc(t.status)}</span><em class="${t.planned && t.taken > t.planned ? 'over' : ''}">${mins(t.taken)}${t.planned ? ` / ${mins(t.planned)} planned` : ''}</em></div>`).join('') : '<p class="none">No tasks on this day</p>'}</div></div>`;
  box.classList.remove('hidden');
}
$('#tmDay').value = today(); $('#tmDay').max = today();
$('#tmDay').addEventListener('change', () => loadTime());
$('#tmTeam').addEventListener('click', (e) => { const b = e.target.closest('[data-row]'); if (b) openRow(+b.dataset.row); });
// (Profile > Time loads when its tab opens - profile.js pfTab)

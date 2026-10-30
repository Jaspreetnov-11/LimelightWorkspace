// Lighthouse - clock in / out on Home (selfie + location, as Lighthouse asks), the welcome after clocking in,
// and Profile: my photo, details, attendance, leaves, and everyone's profile.

// ---------- clock in / out ----------
let PUNCH = null, punchTimer = 0;
const hm = (t) => { if (!t) return ''; const [h, m] = String(t).split(':').map(Number); const d = new Date(); d.setHours(h, m, 0, 0); return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); };
const since = (t) => { const [h, m] = String(t).split(':').map(Number), d = new Date(); let min = d.getHours() * 60 + d.getMinutes() - (h * 60 + m); if (min < 0) min += 1440; return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m`; };
const PUNCH_ICON = { in: '<svg viewBox="0 0 24 24"><path d="M12 3v9"/><path d="M6.3 7.5a8 8 0 1 0 11.4 0"/></svg>', done: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>' };

function drawPunch() {
  const el = $('#punch'), p = PUNCH;
  clearInterval(punchTimer);
  // (the owners do not clock in: no card, no attendance tab)
  el.classList.toggle('hidden', !!p?.owner);
  $('#pfTabs [data-t="attendance"]')?.classList.toggle('hidden', !!p?.owner);
  if (p?.owner) return;
  if (!p) { el.dataset.state = 'off'; $('#punchTitle').textContent = 'Attendance is not reachable'; $('#punchSub').textContent = 'The office server did not answer. Try again in a minute.'; $('#punchBtn').textContent = 'Retry'; $('#punchBtn').disabled = false; $('#punchIcon').innerHTML = PUNCH_ICON.in; return; }
  const working = p.in && !p.out;
  el.dataset.state = working ? 'in' : p.in ? 'done' : 'out';
  $('#punchIcon').innerHTML = p.in && p.out ? PUNCH_ICON.done : PUNCH_ICON.in;
  $('#punchBtn').disabled = false;
  if (!p.in) {
    $('#punchTitle').textContent = 'Start your day';
    $('#punchSub').textContent = 'Clock in to mark today’s attendance';
    $('#punchBtn').textContent = 'Clock in';
  } else if (working) {
    const tick = () => { $('#punchTitle').textContent = `Working · ${since(p.in)}`; };
    tick(); punchTimer = setInterval(tick, 30000);
    $('#punchSub').textContent = `Clocked in at ${hm(p.in)}${p.mode && p.mode !== 'office' ? ' · ' + ({ wfh: 'Work from home', field: 'Field' })[p.mode] : ''}`;
    $('#punchBtn').textContent = 'Clock out';
  } else {
    $('#punchTitle').textContent = 'Day complete';
    $('#punchSub').textContent = `${hm(p.in)} – ${hm(p.out)} · see you tomorrow`;
    $('#punchBtn').textContent = 'Clock in again';
  }
}
async function loadPunch() {
  try { PUNCH = await api('/api/punch'); } catch { PUNCH = null; }
  drawPunch();
}

// the clock-in window: front camera (or a picked photo), mode, location
let camStream = null, shot = '', punchAction = 'in';
function stopCam() { camStream?.getTracks().forEach((t) => t.stop()); camStream = null; }
function frameToJpeg(src, w, h, mirror) {
  // same size and quality as Lighthouse's own selfie (320 x 400 JPEG)
  const c = document.createElement('canvas'); c.width = 320; c.height = 400;
  const g = c.getContext('2d'), s = Math.max(320 / w, 400 / h);
  if (mirror) { g.translate(320, 0); g.scale(-1, 1); }
  g.drawImage(src, (320 - w * s) / 2, (400 - h * s) / 2, w * s, h * s);
  return c.toDataURL('image/jpeg', 0.55);
}
async function openPunch() {
  if (!PUNCH) return loadPunch();
  punchAction = PUNCH.in && !PUNCH.out ? 'out' : 'in';
  const needPhoto = punchAction === 'in' ? PUNCH.selfieIn : PUNCH.selfieOut;
  if (!needPhoto) return doPunch();
  shot = '';
  $('#pmTitle').textContent = punchAction === 'in' ? 'Clock in' : 'Clock out';
  $('#pmGo').textContent = punchAction === 'in' ? 'Clock in' : 'Clock out';
  $('#pmMode').classList.toggle('hidden', punchAction === 'out');
  $('#pmShot').classList.add('hidden'); $('#pmVideo').classList.remove('hidden'); $('#pmCamMsg').textContent = 'Starting camera…';
  $('#pmodal').classList.remove('hidden');
  try {
    camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 800 }, audio: false });
    $('#pmVideo').srcObject = camStream; $('#pmCamMsg').textContent = '';
  } catch { $('#pmCamMsg').textContent = 'Camera not available — use “Use a photo”.'; }
}
function closePunch() { stopCam(); $('#pmodal').classList.add('hidden'); }
$('#pmCancel').onclick = closePunch;
wireSeg($('#pmMode'));
$('#pmFile').onchange = (e) => {
  const f = e.target.files[0]; if (!f) return;
  const img = new Image();
  img.onload = () => { shot = frameToJpeg(img, img.naturalWidth, img.naturalHeight, false); $('#pmShot').src = shot; $('#pmShot').classList.remove('hidden'); $('#pmVideo').classList.add('hidden'); $('#pmCamMsg').textContent = ''; stopCam(); };
  img.src = URL.createObjectURL(f);
};
$('#pmGo').onclick = () => {
  const v = $('#pmVideo');
  if (!shot && camStream && v.videoWidth) shot = frameToJpeg(v, v.videoWidth, v.videoHeight, true);
  if (!shot) return toast('A photo is needed for attendance');
  closePunch(); doPunch(shot);
};
const where = () => new Promise((res) => {
  if (!navigator.geolocation) return res(null);
  const t = setTimeout(() => res(null), 9000);
  navigator.geolocation.getCurrentPosition((p) => { clearTimeout(t); res({ lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy) }); },
    () => { clearTimeout(t); res(null); }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 });
});
async function doPunch(selfie) {
  const btn = $('#punchBtn'); btn.disabled = true; btn.textContent = punchAction === 'in' ? 'Clocking in…' : 'Clocking out…';
  $('#punch').classList.add('busy');
  try {
    const loc = await where();
    PUNCH = await api('/api/punch', { action: punchAction, mode: segValue('pmMode') || 'office', selfie, ...(loc || {}), addr: '' });
    drawPunch();
    if (punchAction === 'in') welcome(); else toast(`Clocked out at ${hm(PUNCH.out)} · nice work today`);
    if (!loc) toast('Location was not shared — allow it next time so it is saved with the punch');
  } catch (e) { toast(e.message); drawPunch(); }
  $('#punch').classList.remove('busy');
}
$('#punchBtn').onclick = openPunch;

// on a phone: slide the knob to the end to clock in / out (the button stays for computers)
{
  const btn = $('#punchBtn'), track = $('#punchSlide'), knob = $('#punchKnob');
  let x0 = null, dx = 0;
  const room = () => track.clientWidth - knob.offsetWidth - 8;
  const put = (x, anim) => { dx = x; knob.style.transition = track.querySelector('.pfill').style.transition = anim ? 'transform .25s, width .25s' : 'none';
    knob.style.transform = `translateX(${x}px)`; track.style.setProperty('--px', x + knob.offsetWidth + 'px'); track.classList.toggle('far', x > room() * 0.5); };
  // the label follows the button: "Clock in" -> "Slide to clock in", "Clocking in…" while it works
  const sync = () => { const t = btn.textContent.trim();
    $('#punchSlideL').textContent = /…$/.test(t) || t === 'Retry' ? t : 'Slide to ' + t.toLowerCase();
    track.classList.toggle('off', btn.disabled); if (!btn.disabled && !/…$/.test(t)) put(0, true); };
  new MutationObserver(sync).observe(btn, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
  knob.addEventListener('pointerdown', (e) => { if (btn.disabled) return; x0 = e.clientX - dx; knob.setPointerCapture(e.pointerId); });
  knob.addEventListener('pointermove', (e) => { if (x0 !== null) put(Math.max(0, Math.min(room(), e.clientX - x0))); });
  const end = () => {
    if (x0 === null) return; x0 = null;
    if (dx >= room() * 0.85) { put(room(), true); navigator.vibrate?.(15); openPunch(); setTimeout(() => { if (!/…$/.test(btn.textContent)) put(0, true); }, 900); }
    else put(0, true);
  };
  knob.addEventListener('pointerup', end); knob.addEventListener('pointercancel', end);
  // "Retry" (server not reachable) stays a tap
  track.addEventListener('click', () => { if (btn.textContent.trim() === 'Retry') openPunch(); });
  sync();
}

// ---------- welcome ----------
const WELCOME = [
  'The future belongs to those who build it — let’s build something brilliant today.',
  'AI does the heavy lifting. Your ideas do the magic.',
  'Every great story starts with someone showing up. You just did.',
  'Machines learn fast. Curious people learn faster.',
  'Create boldly. The tools are ready when you are.',
  'Today’s small idea can be tomorrow’s big campaign.',
  'Think big, start now, finish beautifully.',
];
function welcome() {
  const w = $('#welcome'), first = (ME?.name || '').split(' ')[0];
  $('#wlTime').textContent = `Clocked in · ${hm(PUNCH.in) || new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  $('#wlHead').innerHTML = `Welcome to the AI world${first ? `, <span>${esc(first)}</span>` : ''}`;
  $('#wlQuote').textContent = `“${WELCOME[Math.floor(Math.random() * WELCOME.length)]}”`;
  $('#wlSub').textContent = 'Have a great day · Limelight';
  $('#wlSparks').innerHTML = Array.from({ length: 28 }, (_, i) => {
    const a = (i / 28) * Math.PI * 2, d = 160 + Math.random() * 220;
    return `<i style="--x:${Math.cos(a) * d}px;--y:${Math.sin(a) * d}px;--d:${(Math.random() * 0.25).toFixed(2)}s;--s:${(4 + Math.random() * 6).toFixed(1)}px"></i>`;
  }).join('');
  w.classList.remove('hidden', 'out'); void w.offsetWidth; w.classList.add('play');
  const close = () => { w.classList.add('out'); setTimeout(() => w.classList.add('hidden'), 500); w.onclick = null; };
  w.onclick = close; setTimeout(close, 5200);
}

// ---------- profile ----------
let PROFILE = null, TEAM = [];
const photoUrl = (email) => `/api/photo/${encodeURIComponent(email)}?t=${photoVer}`;
let photoVer = Date.now();
function face(p, cls = '') {
  return `<span class="face ${cls}" style="background:${colorOf(p.email)}">${p.photo ? `<img src="${photoUrl(p.email)}" alt="">` : esc(initials(p.name || p.email))}${p.online ? '<i class="on-dot"></i>' : ''}</span>`;
}
async function loadProfile() {
  try { PROFILE = await api('/api/profile'); } catch (e) { $('#pfName').textContent = ME?.name || ''; $('#pfTitle').textContent = 'The office server did not answer — try again in a minute.'; return; }
  const p = PROFILE;
  $('#pfName').textContent = p.name;
  $('#pfTitle').textContent = [p.title, p.dept].filter(Boolean).join(' · ');
  $('#pfTags').innerHTML = [p.empId && `ID ${p.empId}`, p.joined && `Joined ${new Date(p.joined).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}`,
    p.shift && `${p.shift[0].toUpperCase() + p.shift.slice(1)} shift`, p.email].filter(Boolean).map((t) => `<span>${esc(t)}</span>`).join('');
  if (p.photo) $('#pfImg').src = photoUrl(p.email); else $('#pfImg').removeAttribute('src'); $('#pfImg').classList.toggle('hidden', !p.photo);
  $('#pfIni').textContent = initials(p.name); $('#pfPhoto').style.background = colorOf(p.email);
  const pu = PUNCH;
  $('#pfToday').innerHTML = !pu ? '' : pu.in ? `<b>${pu.out ? 'Day complete' : 'Working'}</b><small>${hm(pu.in)}${pu.out ? ' – ' + hm(pu.out) : ' · ' + since(pu.in)}</small>` : `<b>Not clocked in</b><small><a href="/" data-view="home">Clock in on Home →</a></small>`;
  const m = p.month;
  $('#pfStats').innerHTML = !m ? '<div class="none">No attendance numbers yet</div>' : [
    ['Present', m.present + (m.half ? m.half / 2 : 0), '#3ddc84'], ['Late', m.late, '#ffc21a'], ['Leave', m.leave, '#5b8cff'], ['Absent', m.absent, '#ff6b6b'],
    ['Avg day', m.avgMin ? `${Math.floor(m.avgMin / 60)}h ${m.avgMin % 60}m` : '–', '#c084fc'],
  ].map(([l, v, c]) => `<div class="dt stat sm glass" style="--c:${c}"><span class="big">${esc(v)}</span><b>${l}</b><small>${new Date(m.month + '-01').toLocaleDateString([], { month: 'long' })}</small></div>`).join('');
  $('#pfBal').innerHTML = (p.leave?.casual || p.leave?.sick) ? [['Casual leave', p.leave.casual], ['Sick leave', p.leave.sick]].filter(([, n]) => n)
    .map(([l, n]) => `<div class="dl"><span class="pip"></span><span class="t">${l}</span><em>${n} a year</em></div>`).join('') : '<div class="none">Leave policy not set</div>';
  const KIND = { wfh: 'Work from home', half_day: 'Half day', leave: 'Leave' };
  $('#pfLeaves').innerHTML = p.leaves.length ? p.leaves.slice(0, 6).map((l) => `<div class="dl"><span class="pip"></span><span class="t"><b>${KIND[l.kind] || 'Leave'}</b> · ${esc(l.from === l.to ? l.from : `${l.from} → ${l.to}`)}</span><em class="st ${esc(l.status)}">${esc(l.status)}</em></div>`).join('') : '<div class="none">No leaves taken yet</div>';
}
async function loadTeam() {
  try { TEAM = await api('/api/team'); } catch { TEAM = []; }
  drawTeam();
}
function drawTeam() {
  const q = $('#pfFind').value.trim().toLowerCase();
  const list = TEAM.filter((p) => !q || `${p.name} ${p.title} ${p.dept}`.toLowerCase().includes(q));
  $('#pfGrid').innerHTML = list.length ? list.map((p) => `<div class="pcard glass">${face(p, 'lg')}<b>${esc(p.name)}</b><small>${esc([p.title, p.dept].filter(Boolean).join(' · '))}</small>
    ${p.empId ? `<em>${esc(p.empId)}</em>` : ''}${p.email !== ME?.email ? `<button class="btn sm ghost" data-msg="${esc(p.email)}">Message</button>` : ''}
    ${ME?.admin && p.email !== ME?.email ? `<label class="pc-set" title="Set photo">${icon('image')}<input type="file" accept="image/*" data-photo-for="${esc(p.email)}" hidden></label>` : ''}</div>`).join('') : '<div class="none">Nobody found</div>';
}
$('#pfFind').addEventListener('input', drawTeam);
$('#pfGrid').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-msg]'); if (!b) return;
  try { const c = await api('/api/chat/direct', { email: b.dataset.msg }); show('chats'); window.openChat?.(c.id); } catch (err) { toast(err.message); }
});

// a photo, cut to a square and kept small
function squareJpeg(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => { const s = Math.min(img.naturalWidth, img.naturalHeight), c = document.createElement('canvas'); c.width = c.height = 400;
      c.getContext('2d').drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, 400, 400); res(c.toDataURL('image/jpeg', 0.82)); };
    img.onerror = () => rej(new Error('Could not read that picture'));
    img.src = URL.createObjectURL(file);
  });
}
async function setPhoto(file, email) {
  try {
    await api('/api/photo', { image: await squareJpeg(file), email });
    photoVer = Date.now(); toast('Photo saved');
    if (!email || email === ME?.email) { await loadProfile(); paintMyFace(); }
    loadTeam();
  } catch (e) { toast(e.message); }
}
$('#pfFile').onchange = (e) => e.target.files[0] && setPhoto(e.target.files[0]);
$('#pfGrid').addEventListener('change', (e) => { const i = e.target.closest('[data-photo-for]'); if (i?.files[0]) setPhoto(i.files[0], i.dataset.photoFor); });

// the avatar in the top bar shows my photo
function paintMyFace() {
  if (!PROFILE?.photo) return;
  $('#meBtn').style.backgroundImage = `url(${photoUrl(PROFILE.email)})`; $('#meBtn').classList.add('has-photo');
}

// tabs: attendance and leaves are Lighthouse's own pages, opened inside the profile
function pfTab(t) {
  $$('#pfTabs button').forEach((b) => b.classList.toggle('on', b.dataset.t === t));
  $$('#v-profile .pf-pane').forEach((p) => p.classList.toggle('hidden', p.dataset.p !== t));
  const f = $(`#v-profile .pf-pane[data-p="${t}"] iframe`);
  if (f && !f.src) { const a = APPS.find((x) => x.id === 'lighthouse'); if (a) f.src = appUrl(a).replace(/\/$/, '') + f.dataset.lh + `?v=${BOOT}`; }
  if (t === 'team' && !TEAM.length) loadTeam();
  if (t === 'time') window.loadTime?.();
}
$('#pfTabs').addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (b) pfTab(b.dataset.t); });
document.addEventListener('click', (e) => { const b = e.target.closest('[data-pft]'); if (b) { e.preventDefault(); show('profile'); pfTab(b.dataset.pft); } });

const prevShown = window.onViewShown;
window.onViewShown = (v) => { prevShown?.(v); if (v === 'profile') { loadProfile(); if (!$('#pfTabs .on')) pfTab('overview'); } if (v === 'home') loadPunch(); };

ready.then(async () => {
  loadPunch();
  try { PROFILE = await api('/api/profile'); paintMyFace(); } catch { /* Lighthouse offline */ }
  if (location.hash === '#profile') show('profile');
});

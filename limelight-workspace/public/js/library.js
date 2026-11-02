// Limelight - Library: one Reels-style feed of every finished output (Edit renders, Create and Design pictures, Design
// exports, Limelight AI pictures and videos) - everyone sees everything (/api/feed). One item fills the screen: swipe on
// a phone, wheel or arrow keys on a computer. Videos play muted while on screen (the sound button turns sound on for all).
// Uses workspace.js ($, $$, api, esc, icon, toast, show, openApp, ME) and share.js (openShare, openShared).
let REELS = [], REELS_ON = [], reelsAt = 0, RF = 'all', SOUND = false;
const REEL_APP = { edit: 'Edit', design: 'Design', create: 'Create', ai: 'Limelight AI' };
const REEL_ICON = { edit: 'editor', design: 'design', create: 'wand', ai: 'ai' };
const rSize = (n) => (!n ? '' : n >= 1073741824 ? (n / 1073741824).toFixed(1) + ' GB' : n >= 1048576 ? (n / 1048576).toFixed(n > 1e8 ? 0 : 1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
const rWhen = (t) => { const d = Date.now() - t, day = 864e5;
  return d < 3600e3 ? `${Math.max(1, Math.round(d / 60e3))} min ago` : d < day ? `${Math.round(d / 3600e3)} h ago`
    : d < 7 * day ? (Math.round(d / day) === 1 ? 'Yesterday' : `${Math.round(d / day)} days ago`) : new Date(t).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }); };
// an Edit render's name without its project's name in front ("Project_reel_v1" -> "reel v1")
const rNice = (v) => (v.project ? v.title.replace(new RegExp('^' + v.project.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[ _-]*', 'i'), '') : v.title).replace(/_/g, ' ').trim() || v.title;
// "Mine": made by me (only Edit renders say who made them)
const reelMine = (v) => { const by = String(v.by || '').toLowerCase(); if (!by || !ME) return false;
  return [ME.name, ME.email, String(ME.email || '').split('@')[0], String(ME.name || '').split(/\s+/)[0]].some((n) => n && String(n).toLowerCase() === by); };
const SND = (on) => `<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z"/>${on ? '<path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>' : '<path d="M17 9l5 6M22 9l-5 6"/>'}</svg>`;
try { SOUND = localStorage.getItem('lh-reel-sound') === '1'; } catch (e) { /* private window */ }

async function loadFeed(fresh) {
  if (!fresh && REELS.length && Date.now() - reelsAt < 60e3) return reelResume();
  try {
    const r = await api('/api/feed' + (fresh ? '?fresh=1' : ''));
    REELS = r.items || []; reelsAt = Date.now();
    if (r.down?.length) toast(`${r.down.join(' and ')} did not answer - its files are missing for now`);
  } catch (err) { if (!REELS.length) $('#reels').innerHTML = `<div class="reels-empty">Could not load the Library: ${esc(err.message)}</div>`; return; }
  drawFeed();
}

function drawFeed() {
  const q = $('#reelSearch').value.trim().toLowerCase();
  REELS_ON = REELS.filter((v) => (RF === 'all' || v.kind === RF || v.app === RF || (RF === 'mine' && reelMine(v)))
    && (!q || [v.title, v.project, v.by, REEL_APP[v.app]].some((s) => String(s || '').toLowerCase().includes(q))));
  const box = $('#reels');
  box.innerHTML = REELS_ON.length ? REELS_ON.map((v, i) => {
    const tall = v.aspect === '9:16' ? ' tall' : '';
    const media = v.kind === 'video'
      ? `<video data-src="${esc(v.src)}" ${v.poster ? `poster="${esc(v.poster)}"` : ''} playsinline loop muted preload="none"></video><div class="reel-bar"><i></i></div>`
      : `<img data-src="${esc(v.src)}" alt="">`;
    const sub = [v.project, v.by && `by ${v.by}`, v.note, rSize(v.size)].filter(Boolean).map(esc).join(' · ');
    return `<article class="reel" data-ri="${i}">
      <div class="reel-stage${tall}">${media}
        <div class="reel-info"><span class="reel-app">${icon(REEL_ICON[v.app] || 'image')}${REEL_APP[v.app] || ''}</span><small>${rWhen(v.at)}</small>
          <b>${esc(rNice(v))}</b>${sub ? `<small class="reel-sub">${sub}</small>` : ''}</div>
      </div>
      <div class="reel-acts">
        <a href="${esc(v.dl || (v.app === 'edit' || v.app === 'ai' ? v.src + '&dl=1' : v.src))}" download="${esc(v.file || '')}" title="Download">${icon('download')}<span>Download</span></a>
        <button data-r="share" title="Share in Chats">${icon('share')}<span>Share</span></button>
        <button data-r="open" title="Open in ${REEL_APP[v.app]}">${icon(REEL_ICON[v.app] || 'expand')}<span>Open</span></button>
        ${v.kind === 'video' ? `<button data-r="sound" title="Sound on / off (M)">${SND(SOUND)}<span>${SOUND ? 'Sound' : 'Muted'}</span></button>` : ''}
      </div></article>`;
  }).join('') : `<div class="reels-empty">${REELS.length ? 'Nothing matches' : 'Nothing here yet. Finished renders, AI pictures and design exports show up here.'}</div>`;
  box.scrollTop = 0;
  $('#reelCount').textContent = REELS_ON.length ? `1 / ${REELS_ON.length}` : '';
  $$('.reel', box).forEach((el) => { nearObs.observe(el); playObs.observe(el); });
}

// files load when an item comes near the screen (and videos let go of theirs when far away again)
const nearObs = new IntersectionObserver((list) => list.forEach((en) => {
  const m = en.target.querySelector('[data-src]'); if (!m) return;
  if (en.isIntersecting && !m.getAttribute('src')) {
    m.src = m.dataset.src;
    if (m.tagName === 'IMG') m.onload = () => { const s = m.closest('.reel-stage'); s.classList.toggle('tall', m.naturalHeight > m.naturalWidth * 1.15); s.classList.toggle('wide', m.naturalWidth > m.naturalHeight * 1.3); };
  } else if (!en.isIntersecting && m.tagName === 'VIDEO' && m.getAttribute('src')) { m.pause(); m.removeAttribute('src'); m.load(); }
}), { root: $('#reels'), rootMargin: '150% 0px' });
// the item on screen plays (muted unless sound is on); the others stop
const playObs = new IntersectionObserver((list) => list.forEach((en) => {
  const v = en.target.querySelector('video');
  if (en.isIntersecting) $('#reelCount').textContent = `${+en.target.dataset.ri + 1} / ${REELS_ON.length}`;
  if (!v) return;
  if (en.isIntersecting && !$('#v-library').classList.contains('hidden')) { v.muted = !SOUND; v.play().catch(() => { v.muted = true; v.play().catch(() => {}); }); }
  else v.pause();
}), { root: $('#reels'), threshold: 0.6 });

// back on the Library: the item on screen plays again
function reelResume() { const v = $$('#reels .reel')[reelIndex()]?.querySelector('video'); if (v?.getAttribute('src')) { v.muted = !SOUND; v.play().catch(() => {}); } }
const reelIndex = () => Math.round($('#reels').scrollTop / ($('#reels').clientHeight || 1));
function reelGo(i) { const box = $('#reels'); i = Math.max(0, Math.min(REELS_ON.length - 1, i)); box.scrollTo({ top: i * box.clientHeight, behavior: 'smooth' }); }
function setSound(on) {
  SOUND = on; try { localStorage.setItem('lh-reel-sound', on ? '1' : '0'); } catch (e) { /* private window */ }
  $$('#reels video').forEach((v) => { v.muted = !on; });
  $$('#reels [data-r="sound"]').forEach((b) => { b.innerHTML = `${SND(on)}<span>${on ? 'Sound' : 'Muted'}</span>`; });
}

$('#reels').addEventListener('click', (e) => {
  const el = e.target.closest('.reel'), v = el && REELS_ON[+el.dataset.ri]; if (!v) return;
  const b = e.target.closest('[data-r]');
  if (!b) { // a tap on a video: pause / play; on its bar: jump there
    const vid = e.target.closest('.reel-stage')?.querySelector('video'); if (!vid || e.target.closest('a')) return;
    const bar = e.target.closest('.reel-bar');
    if (bar && vid.duration) { const r = bar.getBoundingClientRect(); vid.currentTime = vid.duration * (e.clientX - r.left) / r.width; return; }
    return vid.paused ? vid.play().catch(() => {}) : vid.pause();
  }
  if (b.dataset.r === 'sound') return setSound(!SOUND);
  if (b.dataset.r === 'share') {
    const what = v.app === 'edit' ? { app: 'editor', path: v.open.path, title: `${v.project} · ${rNice(v)}` }
      : v.app === 'ai' ? { app: 'ai', path: v.share, title: rNice(v) } : { app: 'design', path: v.dl || v.src, title: rNice(v) };
    return openShare(what);
  }
  if (b.dataset.r === 'open') {
    $$('#reels video').forEach((x) => x.pause());
    if (v.open.view) return show(v.open.view);
    if (v.open.path) return openShared(v.open.app, v.open.path);
    return openApp(v.open.app);
  }
});
$('#reels').addEventListener('timeupdate', (e) => {
  const v = e.target, bar = v.closest?.('.reel-stage')?.querySelector('.reel-bar i');
  if (bar && v.duration) bar.style.width = (100 * v.currentTime / v.duration) + '%';
}, true);
// a computer's wheel moves one item per turn (a trackpad fling does not skip ten)
let wheelLock = 0;
$('#reels').addEventListener('wheel', (e) => {
  if (Math.abs(e.deltaY) < 8 || e.ctrlKey) return;
  e.preventDefault();
  if (Date.now() < wheelLock) return;
  wheelLock = Date.now() + 550; reelGo(reelIndex() + (e.deltaY > 0 ? 1 : -1));
}, { passive: false });
document.addEventListener('keydown', (e) => {
  if ($('#v-library').classList.contains('hidden') || e.target.closest('input, textarea, [contenteditable]') || e.ctrlKey || e.metaKey || e.altKey) return;
  if (!$('#shareModal').classList.contains('hidden')) return;
  const k = e.key;
  if (['ArrowDown', 'PageDown', 'j'].includes(k)) { e.preventDefault(); reelGo(reelIndex() + 1); }
  else if (['ArrowUp', 'PageUp', 'k'].includes(k)) { e.preventDefault(); reelGo(reelIndex() - 1); }
  else if (k === 'Home') { e.preventDefault(); reelGo(0); }
  else if (k === 'End') { e.preventDefault(); reelGo(REELS_ON.length - 1); }
  else if (k === 'm' || k === 'M') setSound(!SOUND);
  else if (k === ' ') { const v = $$('.reel')[reelIndex()]?.querySelector('video'); if (v) { e.preventDefault(); v.paused ? v.play().catch(() => {}) : v.pause(); } }
});

$('#reelChips').addEventListener('click', (e) => {
  const b = e.target.closest('[data-rf]'); if (!b) return;
  RF = b.dataset.rf; $$('#reelChips [data-rf]').forEach((x) => x.classList.toggle('on', x === b)); drawFeed();
});
let rq; $('#reelSearch').addEventListener('input', () => { clearTimeout(rq); rq = setTimeout(drawFeed, 200); });
// leaving the Library stops its video
window.onViewShown = ((prev) => (view) => { prev?.(view); if (view !== 'library') $$('#reels video').forEach((v) => v.pause()); })(window.onViewShown);
window.loadFeed = loadFeed;

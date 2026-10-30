// Lighthouse - Library > Videos: a YouTube-style player for the finished renders of Edit (only the projects this person
// may open - /api/renders asks Edit as them). Big player and details on the left, the list on the right; a click plays,
// the next one follows when Autoplay is on. Files stream from the Edit proxy, so seeking works.
// Uses workspace.js ($, $$, api, esc, icon, toast, APPS, appUrl, openShared) and share.js (openShare).
let VIDS = [], VCUR = -1, vidsAt = 0;
const editBase = () => { const a = APPS.find((x) => x.id === 'editor'); return a ? appUrl(a).replace(/\/$/, '') : ''; };
const vSize = (n) => (n >= 1073741824 ? (n / 1073741824).toFixed(1) + ' GB' : (n / 1048576).toFixed(n > 1e8 ? 0 : 1) + ' MB');
const vWhen = (t) => { const d = Date.now() - t, day = 864e5;
  return d < 3600e3 ? `${Math.max(1, Math.round(d / 60e3))} min ago` : d < day ? `${Math.round(d / 3600e3)} h ago`
    : d < 7 * day ? `${Math.round(d / day)} days ago` : new Date(t).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }); };
const vNice = (v) => v.title.replace(new RegExp('^' + v.project.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[ _-]*', 'i'), '').replace(/_/g, ' ').trim() || v.title;

async function loadVideos(fresh) {
  if (!fresh && VIDS.length && Date.now() - vidsAt < 60e3) return drawVideos();
  if (!VIDS.length) $('#ytEmpty').textContent = 'Loading renders…';
  try {
    const r = await api('/api/renders' + (fresh ? '?fresh=1' : ''));
    if (r.needEdit) { $('#ytEmpty').textContent = 'Edit is not on for your login yet — ask the owner to add you to Edit\'s team.'; VIDS = []; return drawVideos(); }
    VIDS = r.items || []; vidsAt = Date.now();
  } catch (err) { $('#ytEmpty').textContent = 'Could not reach Edit: ' + err.message; }
  drawVideos();
  if (VCUR < 0 && VIDS.length) pick(0, false);
}
function drawVideos() {
  const q = $('#ytSearch').value.trim().toLowerCase();
  const list = VIDS.map((v, i) => [v, i]).filter(([v]) => !q || v.title.toLowerCase().includes(q) || v.project.toLowerCase().includes(q) || v.by.toLowerCase().includes(q));
  $('#ytList').innerHTML = list.length ? list.map(([v, i]) => `<button class="yt-item ${i === VCUR ? 'on' : ''}" data-vi="${i}">
      <span class="yt-th ${v.aspect === '9:16' ? 'tall' : ''}">${v.thumb ? `<img src="${editBase()}${v.thumb}" alt="" loading="lazy">` : icon('editor')}${i === VCUR ? '<i class="yt-now">Playing</i>' : ''}</span>
      <span class="yt-tx"><b>${esc(vNice(v))}</b><small>${esc(v.project)}</small><small>${esc(v.by || '—')} · ${vWhen(v.at)} · ${vSize(v.size)}</small></span></button>`).join('')
    : `<div class="none" style="padding:14px">${VIDS.length ? 'Nothing matches' : 'No renders yet. Finished renders from Edit show up here.'}</div>`;
  $('#ytEmpty').classList.toggle('hidden', VCUR >= 0);
  if (!VIDS.length && !$('#ytEmpty').textContent.startsWith('Your') && !$('#ytEmpty').textContent.startsWith('Could')) $('#ytEmpty').textContent = 'No renders yet';
}
function pick(i, play = true) {
  const v = VIDS[i]; if (!v) return;
  VCUR = i;
  const vid = $('#ytVideo');
  vid.src = editBase() + v.url;
  vid.poster = v.thumb ? editBase() + v.thumb : '';
  $('#ytStage').classList.toggle('tall', v.aspect === '9:16');
  if (play) vid.play().catch(() => {});
  $('#ytTitle').textContent = vNice(v);
  $('#ytMeta').innerHTML = `<div class="yt-who"><span class="yt-av">${esc((v.by || '?')[0].toUpperCase())}</span><span><b>${esc(v.project)}</b><small>Rendered by ${esc(v.by || '—')} · ${vWhen(v.at)} · ${vSize(v.size)}</small></span></div>
    <div class="yt-acts"><a class="btn sm" href="${editBase() + v.url}" download="${esc(v.file)}">${icon('download')}Download</a>
    <button class="btn sm" data-yt="share">${icon('share')}Share</button><button class="btn sm" data-yt="edit">${icon('editor')}Open in Edit</button></div>`;
  drawVideos();
}
$('#ytList').addEventListener('click', (e) => { const b = e.target.closest('[data-vi]'); if (b) { pick(+b.dataset.vi); $('#ytStage').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } });
$('#ytSearch').addEventListener('input', drawVideos);
$('#ytMeta').addEventListener('click', (e) => {
  const b = e.target.closest('[data-yt]'), v = VIDS[VCUR]; if (!b || !v) return;
  const proj = '/#/p/' + encodeURIComponent(v.project);
  if (b.dataset.yt === 'share') openShare({ app: 'editor', path: proj, title: `${v.project} · ${vNice(v)}` });
  if (b.dataset.yt === 'edit') openShared('editor', proj);
});
$('#ytVideo').addEventListener('ended', () => { if ($('#ytAuto').checked && VCUR + 1 < VIDS.length) pick(VCUR + 1); });
$('#ytVideo').addEventListener('error', () => { if (VCUR >= 0) toast('This video could not be played here — try Download'); });
try { $('#ytAuto').checked = localStorage.getItem('lh-yt-auto') !== '0'; } catch (e) { /* private window */ }
$('#ytAuto').addEventListener('change', () => { try { localStorage.setItem('lh-yt-auto', $('#ytAuto').checked ? '1' : '0'); } catch (e) { /* private window */ } });

// Videos | Images
$('#libTabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-v]'); if (!b) return;
  $$('#libTabs button').forEach((x) => x.classList.toggle('on', x === b));
  const vids = b.dataset.v === 'videos';
  $('#libVideos').classList.toggle('hidden', !vids); $('#libGrid').classList.toggle('hidden', vids);
  if (!vids) $('#ytVideo').pause();
});
window.loadVideos = loadVideos;

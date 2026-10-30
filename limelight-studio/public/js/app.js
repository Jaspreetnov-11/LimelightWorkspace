// Limelight Studio - home screen, navigation, export & settings dialogs, boot.
let editorReady = false;

function showScreen(name) {
  $('#home').classList.toggle('hidden', name !== 'home');
  $('#editor').classList.toggle('hidden', name !== 'editor');
}
function bootEditor() {
  if (editorReady) return;
  editorReady = true;
  $('#stage').appendChild($('#artbar')); // artboards float over the canvas
  initCanvas(); buildRail(); buildTabs(); showTab('templates'); setupKeys(); setupDropAndPaste();
  $('#btnUndo').innerHTML = icon('undo'); $('#btnRedo').innerHTML = icon('redo');
  $('#zoomIn').innerHTML = icon('plus'); $('#zoomOut').innerHTML = icon('minus');
  $('#btnUndo').onclick = undo; $('#btnRedo').onclick = redo;
  $('#zoomIn').onclick = () => setZoom(ED.zoom * 1.25); $('#zoomOut').onclick = () => setZoom(ED.zoom / 1.25); $('#zoomVal').onclick = fitView;
  $('#btnHome').onclick = goHome;
  $('#btnExport').onclick = openExport;
  $('#btn3d').onclick = () => window.Studio3D?.open();
  $('#addPage').onclick = () => addPage(false);
  $('#docName').onchange = (e) => { ED.project.name = e.target.value.trim() || 'Untitled design'; markDirty(); };
  $$('.tb').forEach((b) => b.onclick = (e) => { e.stopPropagation(); $('#dropdown').classList.contains('hidden') || !b.classList.contains('open') ? openMenu(b) : closeMenu(); });
  $$('.tb').forEach((b) => b.onmouseenter = () => { if (!$('#dropdown').classList.contains('hidden')) openMenu(b); });
  document.addEventListener('click', (e) => { if (!e.target.closest('#dropdown')) closeMenu(); });
  setTool('select');
}
// The open design is part of the address (#d/<id>), so a reload - or a link the workspace's Share button sends -
// opens that same design. Home has no hash. (A layer open in Vector / Book keeps its design's address.)
// The tab title is the design's name, so a shared card is named after it.
function setAddress(id) {
  const want = id ? '#d/' + encodeURIComponent(id) : '';
  if (location.hash !== want) history.replaceState(history.state, '', location.pathname + location.search + want);
  const P = ED.stack?.project || ED.project;
  document.title = id && P?.name ? P.name : 'Limelight Studio';
}
document.addEventListener('DOMContentLoaded', () => $('#docName').addEventListener('input', () => { if (ED.project && !ED.stack) document.title = ED.project.name || 'Limelight Studio'; }));
function addressDesign() {
  const h = decodeURIComponent(location.hash.slice(1));
  return h.startsWith('d/') ? h.slice(2) : h; // (#<id> is the older form)
}
ED.on('project', () => { const p = ED.project; if (p && !p.child) setAddress(p.id); });
async function openInEditor(proj) {
  showScreen('editor'); bootEditor();
  await openProject(proj);
  setAddress(proj.id);
}
async function startNew(w, h, name) {
  const s = SIZES.find((x) => x.w === w && x.h === h);
  await openInEditor(newProject(w, h, name || (s ? s.name : 'Untitled design')));
  markDirty();
}
async function goHome() {
  if (ED.project) { clearTimeout(dirtyTimer); await saveProject(); }
  ED.project = null; setAddress(null);
  showScreen('home'); renderHome();
}

// ---------------- home ----------------
function renderHome() {
  const box = (w, h, m) => { const r = w / h; return r >= 1 ? [m, m / r] : [m * r, m]; };
  $('#sizeGrid').innerHTML = SIZES.map((s, i) => {
    const [bw, bh] = box(s.w, s.h, 22);
    return `<button class="ed-size" data-size="${i}"><div class="r"><b>${s.name}</b><em style="width:${bw}px;height:${bh}px"></em></div><span>${s.w} × ${s.h} · ${s.cat}</span></button>`;
  }).join('');
  $$('[data-size]').forEach((b) => b.onclick = () => { const s = SIZES[b.dataset.size]; startNew(s.w, s.h, s.name); });
  $('#btnNewDesign').onclick = () => openModal('customModal');
  $$('#home [data-jump]').forEach((b) => b.onclick = () => {
    $('#' + b.dataset.jump).scrollIntoView({ behavior: 'smooth', block: 'start' });
    $$('.ed-nav button').forEach((x) => x.classList.toggle('on', x.dataset.jump === b.dataset.jump));
  });

  $('#tplGrid').innerHTML = TEMPLATES.map((t) => `<button class="ed-tpl" data-tpl="${t.id}"><img alt="" style="aspect-ratio:${t.w}/${t.h}"><b>${t.name}</b><span>${t.cat} · ${t.w}×${t.h}</span></button>`).join('');
  TEMPLATES.forEach(async (t) => { $(`[data-tpl="${t.id}"] img`).src = await templateThumb(t); });
  $$('[data-tpl]').forEach((b) => b.onclick = async () => { const t = TEMPLATES.find((x) => x.id === b.dataset.tpl); await openInEditor(templateProject(t)); markDirty(); });

  const ago = (t) => { const m = Math.max(1, Math.round((Date.now() - t) / 60000)); return m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : new Date(t).toLocaleDateString(); };
  fetch('/api/projects').then((r) => r.json()).then((list) => {
    $('#projCount').textContent = list.length ? String(list.length) : '';
    $('#projGrid').innerHTML = list.length ? list.map((p) => `<div class="ed-design" data-pid="${p.id}">
      <div class="thumb">${p.thumb ? `<img src="${p.thumb}" alt="">` : ''}</div>
      <b>${esc(p.name)}</b><span>${p.width}×${p.height} · ${p.pages} artboard${p.pages > 1 ? 's' : ''} · ${ago(p.updated)}</span>
      <button class="icon-btn del" data-pdel="${p.id}" title="Move to trash">${icon('trash')}</button></div>`).join('')
      : '<div class="ed-empty">No designs yet — pick a size above or start from a template.</div>';
    $$('[data-pid]').forEach((el) => el.onclick = async (e) => {
      if (e.target.closest('[data-pdel]')) return;
      const proj = await fetch(`/api/projects/${el.dataset.pid}`).then((r) => r.json());
      openInEditor(proj);
    });
    $$('[data-pdel]').forEach((b) => b.onclick = async () => { if (!confirm('Move this design to trash? (kept in Projects/_trash)')) return; await fetch(`/api/projects/${b.dataset.pdel}`, { method: 'DELETE' }); forgetDoc(b.dataset.pdel); renderHome(); });
  }).catch(() => { $('#projGrid').innerHTML = '<div class="ed-empty">Server not reachable.</div>'; });
}

// ---------------- modals ----------------
function openModal(id) { $('#' + id).classList.remove('hidden'); }
function closeModals() { $$('.modal').forEach((m) => m.classList.add('hidden')); }
$$('[data-close]').forEach((b) => b.onclick = closeModals);
$$('.modal').forEach((m) => m.onmousedown = (e) => { if (e.target === m) closeModals(); });

$('#cuGo').onclick = () => {
  const u = $('#cuUnit').value, f = { px: 1, mm: 300 / 25.4, in: 300, ft: 360 }[u];
  const w = Math.round(+$('#cuW').value * f), h = Math.round(+$('#cuH').value * f);
  if (w < 16 || h < 16 || w > 20000 || h > 20000) return toast('Size must be between 16 and 20000 px', true);
  closeModals(); startNew(w, h, `Custom ${w}×${h}`).then(() => { if (u !== 'px') { ED.project.dpi = u === 'ft' ? 30 : 300; markDirty(); } });
};

let exFormat = 'png';
function openExport() {
  if (!ED.project) return;
  openModal('exportModal'); syncExport();
}
function syncExport() {
  $$('#exFormat button').forEach((b) => b.classList.toggle('on', b.dataset.v === exFormat));
  $('#exScaleRow').classList.toggle('hidden', ['svg', 'ai', 'cdr'].includes(exFormat));
  $('#exQualRow').classList.toggle('hidden', exFormat !== 'jpg' && exFormat !== 'all');
  $('#exTransparent').parentElement.classList.toggle('hidden', exFormat !== 'png');
  $('#exNote').innerHTML = {
    png: 'Best for social media. Saved into <b>Exports</b> and downloaded.',
    jpg: 'Smaller files for WhatsApp / web.',
    svg: 'Vector file for Illustrator / CorelDRAW (text and shapes stay editable).',
    pdf: 'Print PDF sized from the design DPI. One page: an editable vector PDF made by CorelDRAW (text and shapes stay editable). Many pages: one picture PDF.',
    psd: 'Photoshop file — every object becomes its own named layer; text layers stay editable.',
    ai: 'Adobe Illustrator file, made by CorelDRAW on the Studio PC — text, shapes and photos stay separate and editable.',
    cdr: 'CorelDRAW file — text, shapes and photos stay separate and editable, at the design’s real size.',
    all: 'The same design as PSD, PDF, CDR, AI, PNG, JPG and SVG — all in one .zip (and in Exports). Takes a minute: CorelDRAW makes the CDR, AI and PDF.',
  }[exFormat];
}
$$('#exFormat button').forEach((b) => b.onclick = () => { exFormat = b.dataset.v; syncExport(); });
$('#exGo').onclick = async () => {
  const btn = $('#exGo'); btn.disabled = true; btn.textContent = 'Exporting…';
  try {
    const saved = await exportDesign({ format: exFormat, pages: $('#exPages').value, scale: +$('#exScale').value, quality: +$('#exQual').value, transparent: $('#exTransparent').checked });
    closeModals(); toast(saved.length ? `Saved: ${saved[saved.length - 1]}` : 'Downloaded');
  } catch (e) { console.error(e); toast('Export failed: ' + e.message, true); }
  btn.disabled = false; btn.textContent = 'Export';
};
$('#exOpenFolder').onclick = () => fetch('/api/open-exports', { method: 'POST' });

$('#btnSettings').onclick = async () => {
  const c = await fetch('/api/config').then((r) => r.json());
  $('#aiUrl').value = c.aiUrl; $('#aiPass').value = ''; $('#aiState').textContent = '';
  openModal('settingsModal');
};
$('#aiSave').onclick = async () => {
  const body = { aiUrl: $('#aiUrl').value.trim() }; if ($('#aiPass').value) body.aiPassword = $('#aiPass').value;
  await fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  $('#aiTest').click();
};
$('#aiTest').onclick = async () => {
  $('#aiState').textContent = 'Checking…';
  const s = await fetch('/api/ai/status').then((r) => r.json());
  $('#aiState').textContent = s.ok ? `✓ Connected to ${s.url}${s.images?.available === false ? ' — but images are off: ' + s.images.reason : ''}` : `✗ Not reachable: ${s.error || 'login needed?'}`;
};
$('#btnOpenFile').onclick = () => pickFiles('.json,.svg,.psd,image/*', async (files) => { bootEditor(); showScreen('editor'); await handleFiles(files); if (!ED.project) goHome(); });

// ---------------- boot ----------------
hydrateIcons();
// (after every script - the tabs in modes.js, genfill, vector, book and the 3D module - has set itself up)
window.addEventListener('DOMContentLoaded', async () => {
  await document.fonts.ready;
  const id = addressDesign();
  if (id) {
    const r = await fetch(`/api/projects/${encodeURIComponent(id)}`).catch(() => null);
    if (r?.ok) return openInEditor(await r.json());
    setAddress(null); // (that design is gone: show Home with a clean address)
  }
  renderHome();
});
window.addEventListener('beforeunload', (e) => {
  if (ED.project && $('#saveState').textContent !== 'Saved') { saveProject(); e.preventDefault(); e.returnValue = ''; }
});

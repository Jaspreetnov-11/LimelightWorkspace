// Limelight Studio - Photoshop-style document tabs (several files open and editable at once)
// and the artboard strip under them (each artboard has its own size).
const DOCS = { tabs: [], state: new Map() }; // tabs: [{ id, name }] · state: id -> live document left open in another tab
try { DOCS.tabs = JSON.parse(localStorage.getItem('ll-studio-tabs') || '[]'); } catch { /* private window */ }
const saveTabs = () => { try { localStorage.setItem('ll-studio-tabs', JSON.stringify(DOCS.tabs)); } catch { /* ignore */ } };

// keep the open document's live state (undo, artboard, zoom) so coming back to its tab feels instant
function rememberDoc() {
  if (!ED.project) return;
  storePage();
  DOCS.state.set(ED.project.id, { project: ED.project, undo: ED.undo, redo: ED.redo, pageIndex: ED.pageIndex,
    vpt: ED.canvas.viewportTransform.slice(), zoom: ED.zoom });
}
async function switchDoc(id) {
  if (ED.project?.id === id) return;
  if (ED.project) { clearTimeout(dirtyTimer); rememberDoc(); saveProject(); }
  const st = DOCS.state.get(id);
  let proj = st?.project;
  if (!proj) {
    const r = await fetch(`/api/projects/${id}`).catch(() => null);
    if (!r?.ok) { toast('That file is no longer in Projects'); return forgetDoc(id); }
    proj = await r.json();
  }
  await openInEditor(proj);
  if (st) {
    if (st.pageIndex && st.pageIndex < proj.pages.length) await loadPage(st.pageIndex);
    ED.undo = st.undo; ED.redo = st.redo; ED.emit('history');
    ED.canvas.setViewportTransform(st.vpt); ED.zoom = st.zoom; updateClip(); ED.emit('zoom');
  }
}
async function closeDoc(id) {
  const i = DOCS.tabs.findIndex((t) => t.id === id);
  if (ED.project?.id === id) {
    clearTimeout(dirtyTimer); await saveProject();
    const next = DOCS.tabs[i + 1] || DOCS.tabs[i - 1];
    forgetDoc(id);
    if (next) { ED.project = null; await switchDoc(next.id); } else goHome();
  } else forgetDoc(id);
}
function forgetDoc(id) {
  DOCS.tabs = DOCS.tabs.filter((t) => t.id !== id); DOCS.state.delete(id); saveTabs(); renderDocTabs();
}
ED.on('project', () => {
  const p = ED.project; if (!p || p.child) return; // (a layer open in Vector / Book belongs to its design's tab)
  const t = DOCS.tabs.find((x) => x.id === p.id);
  if (t) t.name = p.name; else DOCS.tabs.push({ id: p.id, name: p.name });
  saveTabs(); renderDocTabs();
});

function renderDocTabs() {
  const bar = $('#docTabs'); if (!bar) return;
  const cur = ED.stack?.project.id || ED.project?.id, dirty = $('#saveState')?.textContent !== 'Saved';
  bar.innerHTML = DOCS.tabs.map((t) => {
    const on = t.id === cur, name = on ? (ED.stack ? `${ED.stack.project.name} › ${ED.project.name}` : ED.project.name) : t.name;
    const ab = on ? ED.project.pages[ED.pageIndex] : null;
    return `<div class="dtab ${on ? 'on' : ''}" data-doc="${t.id}" title="${esc(name)}">
      <span class="dt-name">${esc(name)}${on && dirty ? ' •' : ''}</span>
      ${on ? `<span class="dt-meta">@ ${Math.round(ED.zoom * 100)}% (${esc(ab?.name || '')}, RGB/8)</span>` : ''}
      <button class="dt-x" data-close="${t.id}" title="Close">×</button></div>`;
  }).join('') + '<button class="dtab-add" id="docNew" title="New or open another file">+</button>';
  $$('.dtab', bar).forEach((el) => {
    el.onclick = (e) => { if (!e.target.closest('[data-close]')) switchDoc(el.dataset.doc); };
    el.onauxclick = (e) => { if (e.button === 1) closeDoc(el.dataset.doc); };
  });
  $$('[data-close]', bar).forEach((b) => b.onclick = (e) => { e.stopPropagation(); closeDoc(b.dataset.close); });
  $('#docNew').onclick = () => goHome();
}
['zoom', 'page', 'pages'].forEach((e) => ED.on(e, renderDocTabs));
document.addEventListener('DOMContentLoaded', () => {
  new MutationObserver(renderDocTabs).observe($('#saveState'), { childList: true });
  $('#docName').addEventListener('input', (e) => { if (ED.project) { ED.project.name = e.target.value; renderDocTabs(); } });
});

// ---------------- artboards ----------------
function renderArtboards() {
  const bar = $('#artbar'), P = ED.project; if (!bar || !P) return;
  bar.innerHTML = `<div class="ab-list">${P.pages.map((pg, i) => `
    <div class="ab ${i === ED.pageIndex ? 'on' : ''}" data-ab="${i}" draggable="true" title="${esc(pg.name)} — double-click to rename, drag to reorder">
      <i class="ab-th" style="${pg.thumb ? `background-image:url(${pg.thumb})` : ''}"></i>
      <span class="ab-name">${esc(pg.name)}</span><span class="ab-size">${pg.w || P.width}×${pg.h || P.height}</span>
      <button class="ab-x" data-abx="${i}" title="Delete artboard">×</button></div>`).join('')}</div>
    <button class="btn ghost ab-add" id="abAdd">${icon('frame', 'width="15" height="15"')}Artboard ▾</button>
    <button class="icon-btn" id="abDup" title="Duplicate this artboard">${icon('dup')}</button>
    <span class="muted small ab-count">${P.pages.length} artboard${P.pages.length > 1 ? 's' : ''}</span>`;
  $$('.ab', bar).forEach((el) => {
    const i = +el.dataset.ab;
    el.onclick = (e) => { if (!e.target.closest('[data-abx]') && !el.querySelector('[contenteditable=true]')) switchPage(i); };
    const nm = $('.ab-name', el);
    el.ondblclick = () => {
      nm.contentEditable = true; nm.focus(); document.getSelection().selectAllChildren(nm);
      const done = () => { nm.contentEditable = false; const v = nm.textContent.trim(); if (v) P.pages[i].name = v; markDirty(); renderArtboards(); renderDocTabs(); ED.canvas.requestRenderAll(); };
      nm.onblur = done; nm.onkeydown = (ev) => { ev.stopPropagation(); if (ev.key === 'Enter') { ev.preventDefault(); nm.blur(); } };
    };
    el.ondragstart = (e) => e.dataTransfer.setData('text/x-ll-ab', String(i));
    el.ondragover = (e) => { e.preventDefault(); el.classList.add('drag-over'); };
    el.ondragleave = () => el.classList.remove('drag-over');
    el.ondrop = (e) => {
      e.preventDefault(); el.classList.remove('drag-over');
      const from = +e.dataTransfer.getData('text/x-ll-ab'); if (Number.isNaN(from) || from === i) return;
      storePage();
      const curId = P.pages[ED.pageIndex].id, [moved] = P.pages.splice(from, 1);
      P.pages.splice(i, 0, moved);
      ED.pageIndex = P.pages.findIndex((p) => p.id === curId);
      markDirty(); renderArtboards();
    };
  });
  $$('[data-abx]', bar).forEach((b) => b.onclick = (e) => { e.stopPropagation(); if (confirm(`Delete “${P.pages[+b.dataset.abx].name}”?`)) deletePage(+b.dataset.abx); });
  $('#abAdd').onclick = (e) => { e.stopPropagation(); openArtboardMenu(e.currentTarget); };
  $('#abDup').onclick = () => addPage(true);
}
['page', 'pages', 'project'].forEach((e) => ED.on(e, renderArtboards));

function openArtboardMenu(anchor) {
  const dd = $('#dropdown'), P = ED.project, cur = P.pages[ED.pageIndex];
  dd.innerHTML = `<button data-abs="same">Same size<kbd>${cur.w}×${cur.h}</kbd></button><hr>
    ${SIZES.map((s, i) => `<button data-abs="${i}">${s.name}<kbd>${s.w}×${s.h}</kbd></button>`).join('')}<hr>
    <div class="ab-custom"><input type="number" id="abW" value="${cur.w}" min="16" max="20000"><span>×</span><input type="number" id="abH" value="${cur.h}" min="16" max="20000"><button class="btn primary" id="abGo">Add</button></div>`;
  const r = anchor.getBoundingClientRect();
  dd.style.left = Math.min(r.left, innerWidth - 260) + 'px'; dd.style.top = r.bottom + 4 + 'px'; dd.classList.remove('hidden');
  const add = (w, h, name) => { closeMenu(); addPage(false, { w, h }, name); };
  $$('[data-abs]', dd).forEach((b) => b.onclick = () => {
    const k = b.dataset.abs;
    if (k === 'same') add(cur.w, cur.h); else { const s = SIZES[+k]; add(s.w, s.h, s.name); }
  });
  $('#abGo', dd).onclick = () => {
    const w = Math.round(+$('#abW', dd).value), h = Math.round(+$('#abH', dd).value);
    if (w < 16 || h < 16 || w > 20000 || h > 20000) return toast('Size must be 16–20000 px', true);
    add(w, h);
  };
  $$('input', dd).forEach((i) => { i.onclick = (e) => e.stopPropagation(); i.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') $('#abGo', dd).click(); }; });
}
MENUS.file.splice(1, 0, ['New artboard…', () => setTimeout(() => openArtboardMenu($('#abAdd') || $('#docName')))], ['Duplicate artboard', () => addPage(true)]);

// drop tabs whose file was deleted or moved out of Projects
fetch('/api/projects').then((r) => r.json()).then((list) => {
  const ids = new Set(list.map((p) => p.id));
  const keep = DOCS.tabs.filter((t) => ids.has(t.id) || t.id === ED.project?.id);
  if (keep.length !== DOCS.tabs.length) { DOCS.tabs = keep; saveTabs(); renderDocTabs(); }
}).catch(() => { /* server offline: keep tabs */ });

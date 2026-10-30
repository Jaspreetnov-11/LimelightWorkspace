// Limelight Studio - the four workspaces over one file: Design (Photoshop-style photo work), Vector (Illustrator-style
// paths), Book (InDesign / QuarkXPress-style pages) and 3D (Blender-style scene). Every tab edits the same document,
// shares layers, undo and exports; each brings its own tools, panels and inspector sections.
Object.assign(ICONS, {
  marquee: '<path d="M4 7V4h3M10 4h4M17 4h3v3M20 10v4M20 17v3h-3M14 20h-4M7 20H4v-3M4 14v-4"/>',
  lasso: '<path d="M8.2 15.6C5.1 14.7 3 12.6 3 10c0-3.3 4-6 9-6s9 2.7 9 6-4 6-9 6c-1.3 0-2.6-.2-3.8-.4"/><path d="M8.2 15.6c-1.4.9-1.1 2.7.4 3.2 1.2.4 1.4 1.5.6 2.2"/>',
  node: '<path d="M5 3l12 7-5 1.4L9 17z"/><rect x="15.5" y="15.5" width="5" height="5"/>',
  addNode: '<path d="M11 3l5 9-5 9-5-9z"/><circle cx="11" cy="12" r="1.4"/><path d="M19.5 3v5M17 5.5h5"/>',
  unlink: '<path d="M9 15l-2 2a3 3 0 01-4.2-4.2l2-2M15 9l2-2a3 3 0 014.2 4.2l-2 2M4 4l16 16"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 016.5 3H20v15H6.5A2.5 2.5 0 004 20.5zM4 5.5v15M8 7h8"/>',
  vector: '<path d="M5 19C9 9 15 15 19 5"/><rect x="3" y="17" width="4" height="4"/><rect x="17" y="3" width="4" height="4"/>',
  textFrame: '<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M8 8h8M12 8v9"/>',
  picFrame: '<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 3l18 18M21 3L3 21"/>',
  unite: '<path d="M3 3h11v7h7v11H10v-7H3z"/>',
  minusFront: '<path d="M3 3h11v7h-4v4H3z"/><path d="M10 10h11v11H10z" stroke-dasharray="2 2.4"/>',
  intersect: '<rect x="3" y="3" width="11" height="11" stroke-dasharray="2 2.4"/><rect x="10" y="10" width="11" height="11" stroke-dasharray="2 2.4"/><path d="M10 10h4v4h-4z" fill="currentColor"/>',
  exclude: '<path d="M3 3h11v7h-4v4H3zM14 10h7v11H10v-7h4z"/><path d="M10 10h4v4h-4z" stroke-dasharray="2 2"/>',
});

const T = (key, ic, k, title) => [key, ic, k, title];
const MODES = {
  design: { name: 'Design', like: 'Photoshop', icon: 'image',
    tools: [T('select', 'select', 'V', 'Move / select (V)'), T('hand', 'hand', 'H', 'Hand (H, or hold Space)'), '-',
      T('genRect', 'marquee', 'M', 'Rectangular marquee for Generative fill (M)'), T('genLasso', 'lasso', 'L', 'Lasso for Generative fill (L)'), '-',
      T('brush', 'brush', 'B', 'Brush (B)'), T('pipette', 'pipette', 'I', 'Eyedropper (I)'), T('text', 'text', 'T', 'Type (T)'), '-',
      T('rect', 'rect', 'R', 'Rectangle (R)'), T('ellipse', 'ellipse', 'O', 'Ellipse (O)'), T('line', 'line', '', 'Line')],
    tabs: ['templates', 'elements', 'text', 'brand', 'uploads', 'gen', 'ai', 'layers'] },
  vector: { name: 'Vector', like: 'Illustrator', icon: 'vector',
    tools: [T('select', 'select', 'V', 'Selection (V)'), T('node', 'node', 'A', 'Direct selection – points and handles (A)'), T('hand', 'hand', 'H', 'Hand (H)'), '-',
      T('pen', 'pen', 'P', 'Pen – click corners, drag curves (P)'), T('addNode', 'addNode', '+', 'Add anchor point (+)'), T('brush', 'brush', 'N', 'Pencil – free paths (N)'), '-',
      T('rect', 'rect', 'M', 'Rectangle (M)'), T('ellipse', 'ellipse', 'L', 'Ellipse (L)'), T('polygon', 'polygon', '', 'Polygon'), T('star', 'star', '', 'Star'),
      T('triangle', 'triangle', '', 'Triangle'), T('line', 'line', '\\', 'Line segment (\\)'), T('arrow', 'arrow', '', 'Arrow'), '-',
      T('text', 'text', 'T', 'Type (T)'), T('pipette', 'pipette', 'I', 'Eyedropper (I)'), T('genRect', 'marquee', '', 'Generative fill area')],
    tabs: ['pathfinder', 'elements', 'text', 'brand', 'gen', 'layers'] },
  book: { name: 'Book', like: 'InDesign · QuarkXPress', icon: 'book',
    tools: [T('select', 'select', 'V', 'Selection (V)'), T('hand', 'hand', 'H', 'Hand (H)'), '-',
      T('frameText', 'textFrame', 'T', 'Text box – drag a frame; text flows from box to box (T)'), T('frameImage', 'picFrame', 'F', 'Picture box – drop a photo or Generative fill it (F)'),
      T('link', 'chain', 'K', 'Linking tool – click a text box, then the box the text continues in (K)'), '-',
      T('rect', 'rect', 'M', 'Rectangle (M)'), T('ellipse', 'ellipse', 'L', 'Ellipse (L)'), T('line', 'line', '\\', 'Line (\\)'), '-',
      T('pipette', 'pipette', 'I', 'Eyedropper (I)'), T('genRect', 'marquee', '', 'Generative fill area')],
    tabs: ['pages', 'text', 'uploads', 'gen', 'layers'] },
  '3d': { name: '3D', like: 'Blender', icon: 'cube', tools: [], tabs: [] },
};
// keys per tab (the rest are the editor's own: V H R O T B I P...)
const MODE_KEYS = { design: { m: 'genRect', l: 'genLasso' }, vector: { a: 'node', '+': 'addNode', '=': 'addNode', n: 'brush', m: 'rect', l: 'ellipse', '\\': 'line' },
  book: { t: 'frameText', f: 'frameImage', k: 'link', m: 'rect', l: 'ellipse', '\\': 'line' } };
const PANEL_FNS = {}; // extra side panels: key -> [icon, title, render(body)]
ED.mode = 'design';
ED.inspHooks = [];   // (el, objs) => html appended to the inspector; bind after
ED.overlays = [];    // (ctx, v) => drawn over the canvas after every render (screen only)

function renderModeTabs() {
  const bar = $('#modeTabs'); if (!bar) return;
  const tip = { design: 'the design itself', vector: 'opens the selected vector layer (or makes one from the selected shapes)', book: 'opens the selected book layer (or a new book)', '3d': 'opens the selected 3D layer (or a new scene)', color: 'develops the selected photo, Lightroom-style' };
  const where = ED.stack ? `<span class="mb-ctx">${esc(ED.stack.project.name)} ›<b>${esc(ED.project?.name || '')}</b></span>` : '';
  bar.innerHTML = where + Object.entries(MODES).map(([k, m]) => `<button class="mtab ${ED.mode === k ? 'on' : ''}" data-mode="${k}" title="${m.name} — ${tip[k]}">${m.name}</button>`).join('');
  $$('[data-mode]', bar).forEach((b) => b.onclick = () => setStudioMode(b.dataset.mode));
}
// ---------------- the tabs open layers ----------------
// The design is the file. Vector and Book open one of its layers on its own (Photoshop's Smart Object: double-click
// it, edit it in its app, come back): the layer keeps its own document (pages, masters...) and shows in the design as
// a group of its real vector objects, so every export of the design stays vector. 3D edits a 3D layer the same way.
ED.stack = null; // while a layer is open: { project, pageIndex, layerId, kind, vpt, zoom, undo, redo }
const SMART_NAME = { vector: 'Vector layer', book: 'Book' };
const stripThumbs = (p) => { const c = JSON.parse(JSON.stringify(p)); c.pages.forEach((pg) => delete pg.thumb); delete c.child; delete c.thumb; return c; };
async function openLayer(kind, layer) {
  const P = ED.project, c = ED.canvas, a = layer || c.getActiveObject();
  storePage();
  let child;
  if (a?.smart?.kind === kind) child = JSON.parse(JSON.stringify(a.smart.project));
  else {
    // a new layer the size of the page; in Vector the selected shapes move into it, where they are
    const pg = P.pages[ED.pageIndex], move = kind === 'vector' && a ? selected().filter((o) => !o.isPage && !o.fromMaster && o.type !== 'image' && !o.smart) : [];
    child = newProject(pg.w, pg.h, kind === 'book' ? 'Book' : 'Vector layer');
    child.pages[0].name = kind === 'book' ? 'Page 1' : 'Artboard 1';
    child.pages[0].json.objects[0].fill = kind === 'vector' ? 'rgba(255,255,255,0)' : '#ffffff';
    if (move.length) {
      c.discardActiveObject();
      child.pages[0].json.objects.push(...move.map((o) => o.toObject(PROPS)));
      ED.loading = true; move.forEach((o) => c.remove(o)); ED.loading = false; storePage();
    } else if (a) c.discardActiveObject();
  }
  ED.stack = { project: P, pageIndex: ED.pageIndex, layerId: a?.smart?.kind === kind ? a.id : null, kind, vpt: c.viewportTransform.slice(), zoom: ED.zoom, undo: ED.undo, redo: ED.redo };
  Object.assign(child, { id: `${P.id}_${kind}`, child: true, mode: kind, dpi: child.dpi || P.dpi });
  await openProject(child);
  toast(`${SMART_NAME[kind]} open — Design (below) puts it back in the design`);
}
// the open layer as a group for the design (a book: its first page, master items and numbers included)
async function layerGroup(child, kind) {
  const json = JSON.parse(JSON.stringify(pageJSONs('all')[0].json));
  json.objects.forEach((o) => { if (o.isPage) Object.assign(o, { isPage: false, selectable: true, evented: true, name: kind === 'book' ? 'Page' : 'Layer frame', smartFrame: true }); delete o.locked; });
  const objs = await new Promise((ok) => fabric.util.enlivenObjects(localSrcs(json).objects, ok));
  const n = child.pages.length;
  return new fabric.Group(objs, { name: kind === 'book' ? `${child.name || 'Book'} · ${n} page${n > 1 ? 's' : ''}` : child.name || 'Vector layer',
    smart: { kind, project: stripThumbs(child) }, subTargetCheck: false });
}
async function closeLayer() {
  const st = ED.stack; if (!st) return;
  storePage();
  const child = ED.project, g = await layerGroup(child, st.kind);
  ED.stack = null;
  await openProject(st.project);
  if (st.pageIndex) await loadPage(st.pageIndex);
  const c = ED.canvas, old = st.layerId && c.getObjects().find((o) => o.id === st.layerId), P = ED.project;
  if (old) {
    g.set({ left: old.left, top: old.top, scaleX: old.scaleX, scaleY: old.scaleY, angle: old.angle, flipX: old.flipX, flipY: old.flipY, originX: old.originX, originY: old.originY,
      opacity: old.opacity, shadow: old.shadow, globalCompositeOperation: old.globalCompositeOperation, visible: old.visible, id: old.id });
    const i = c.getObjects().indexOf(old); ED.loading = true; c.remove(old); ED.loading = false; c.insertAt(g, i);
  } else {
    g.id = uid();
    if (st.kind === 'book') { const k = Math.min((P.width * 0.7) / g.width, (P.height * 0.8) / g.height); g.set({ scaleX: k, scaleY: k, left: (P.width - g.width * k) / 2, top: (P.height - g.height * k) / 2 }); }
    else g.set({ left: 0, top: 0 });
    c.add(g);
  }
  g.setCoords();
  ED.undo = st.undo; ED.redo = st.redo; c.setViewportTransform(st.vpt); ED.zoom = st.zoom; updateClip(); ED.emit('zoom');
  c.setActiveObject(g); c.requestRenderAll(); scheduleHistory(); ED.emit('selection');
}

// switch tab: Design is the file; Vector / Book open the selected layer of their kind (or a new one); 3D the 3D layer
async function setStudioMode(m, opts = {}) {
  if (!MODES[m] || !ED.canvas || ED.switching) return;
  ED.switching = true;
  try {
    const was = ED.mode;
    if (was === '3d' && m !== '3d') window.Studio3D?.hideTab();
    if (m === 'design' || m === '3d') { if (ED.stack) await closeLayer(); }
    else if (!ED.stack || ED.stack.kind !== m) { if (ED.stack) await closeLayer(); ED.mode = 'design'; await openLayer(m, opts.layer); }
    if (m === '3d') {
      const a = ED.canvas.getActiveObject();
      if (!opts.data && a?.scene3d) opts = { data: a.scene3d, img: a };
      ED.mode = m; document.body.dataset.mode = m; renderModeTabs();
      window.Studio3D?.showTab(opts); ED.emit('mode'); return;
    }
    applyModeUI(m);
    if (was !== m) ED.emit('mode');
  } finally { ED.switching = false; }
}
function applyModeUI(m) {
  ED.mode = m; document.body.dataset.mode = m;
  renderModeTabs();
  if (ED.tool === 'pen') finishPen();
  TOOLS.length = 0; TOOLS.push(...MODES[m].tools);
  buildRail();
  TABS.length = 0;
  MODES[m].tabs.forEach((k) => TABS.push(ALL_TABS[k] || [k, PANEL_FNS[k]?.[0] || 'grid', PANEL_FNS[k]?.[1] || k]));
  buildTabs();
  showTab(MODES[m].tabs.includes(curTab) ? curTab : MODES[m].tabs[0]);
  setTool('select');
  ED.canvas.calcOffset(); ED.canvas.requestRenderAll();
}
window.setStudioMode = setStudioMode;
const ALL_TABS = Object.fromEntries(TABS.map((t) => [t[0], t]));

// side panels the tabs add (Pathfinder, Pages, Gen fill)
const _showTab = showTab;
showTab = function (k) {
  if (!PANEL_FNS[k]) return _showTab(k);
  curTab = k;
  $$('#sideTabs .side-tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === k));
  $('#sideTitle').textContent = PANEL_FNS[k][1];
  const body = $('#sideBody'); body.classList.remove('layers-mode');
  PANEL_FNS[k][2](body);
};
function refreshPanel(k) { if (curTab === k && !$('#editor').classList.contains('hidden')) showTab(k); }

// inspector sections from the tabs
const _renderInspector = renderInspector;
renderInspector = function () {
  _renderInspector();
  const el = $('#inspector'); if (!ED.canvas || !el) return;
  const objs = selected();
  for (const hook of ED.inspHooks) { try { hook(el, objs); } catch (e) { console.error(e); } }
};

// the tab's own shortcut keys, before the editor's (window listener added first)
window.addEventListener('keydown', (e) => {
  if ($('#editor').classList.contains('hidden') || ED.mode === '3d' || isTyping(e) || e.ctrlKey || e.metaKey || e.altKey) return;
  const t = MODE_KEYS[ED.mode]?.[e.key.toLowerCase()];
  if (!t) return;
  e.preventDefault(); e.stopImmediatePropagation();
  setTool(t);
});

// 3D: the rail button and the old "3D Studio" button open the 3D tab
const _boot = bootEditor;
bootEditor = function () {
  if (editorReady) return;
  _boot();
  $('#rail3d') && ($('#rail3d').onclick = () => setStudioMode('3d'));
  $('#btn3d').onclick = () => setStudioMode('3d');
  ED.canvas.on('after:render', () => {
    if (!ED.project || !ED.overlays.length) return;
    const c = ED.canvas, ctx = c.getContext(), v = c.viewportTransform;
    ctx.save(); ctx.setTransform(c.getRetinaScaling(), 0, 0, c.getRetinaScaling(), 0, 0);
    for (const f of ED.overlays) { ctx.save(); try { f(ctx, v); } catch (e) { console.error(e); } ctx.restore(); }
    ctx.restore();
  });
  renderModeTabs();
  // double-click a Vector / Book layer to open it in its tab
  ED.canvas.on('mouse:dblclick', (opt) => { const t = opt.target; if (t?.smart && !ED.stack) setStudioMode(t.smart.kind, { layer: t }); });
};
const _buildRail = buildRail;
buildRail = function () { _buildRail(); $('#rail3d') && ($('#rail3d').onclick = () => setStudioMode('3d')); };

// a design opens in Design; an open layer in its own tab
ED.on('project', () => { const p = ED.project; if (p) applyModeUI(p.child ? p.mode : 'design'); });
// leaving the editor or switching files puts an open layer back first
const _goHome = goHome;
goHome = async function () { if (ED.stack) await closeLayer(); return _goHome(); };
const _switchDoc = switchDoc;
switchDoc = async function (id) { if (ED.stack) await closeLayer(); return _switchDoc(id); };
PROPS.push('smart', 'smartFrame');
ED.inspHooks.push((el, objs) => {
  const o = objs.length === 1 ? objs[0] : null;
  if (ED.stack) {
    el.insertAdjacentHTML('afterbegin', sec(`${SMART_NAME[ED.stack.kind]} in “${esc(ED.stack.project.name)}”`, `<p class="muted small">You are editing one layer of the design.</p>
      <button class="btn primary full" data-sm="back">${icon('image', 'width="16" height="16"')}Back to Design</button>`));
    $('[data-sm=back]', el).onclick = () => setStudioMode('design');
  } else if (o?.smart) {
    el.insertAdjacentHTML('afterbegin', sec(SMART_NAME[o.smart.kind], `<p class="muted small">${o.smart.kind === 'book' ? `${o.smart.project.pages.length} pages · the design shows page 1` : 'Vector artwork — points, Pathfinder and more in Vector'} · double-click to open</p>
      <button class="btn primary full" data-sm="open">${icon(MODES[o.smart.kind].icon, 'width="16" height="16"')}Edit in ${MODES[o.smart.kind].name}</button>`));
    $('[data-sm=open]', el).onclick = () => setStudioMode(o.smart.kind, { layer: o });
  }
});

// Export in the 3D tab: the scene's render, in every format (the design's own export stays in the other tabs)
const _exportDesign = exportDesign;
exportDesign = async function (o) {
  if (ED.mode !== '3d' || !window.Studio3D) return _exportDesign(o);
  const { url, w, h } = await window.Studio3D.renderToLibrary();
  const json = { version: '5.3.0', objects: [{ ...pageRectJSON(w, h, 'rgba(0,0,0,0)') },
    { type: 'image', src: url, left: 0, top: 0, width: w, height: h, name: '3D render', id: uid(), crossOrigin: 'anonymous' }] };
  return _exportDesign({ ...o, list: [{ json, w, h, name: '3D scene' }], name: `${ED.project.name} - 3D` });
};
const _openExport = openExport;
openExport = function () {
  _openExport();
  $('#exPages').closest('.row').classList.toggle('hidden', ED.mode === '3d');
  if (ED.project?.book) $('#exPages').value = 'all';
  $('#exportModal h3').textContent = ED.mode === '3d' ? 'Export 3D render' : ED.project?.book ? 'Export book' : ED.stack ? 'Export vector layer' : 'Export';
};
// the 3D tab's scene is saved with the file
const _saveProject = saveProject;
saveProject = async function () {
  if (ED.mode === '3d') window.Studio3D?.stash();
  if (!ED.stack) return _saveProject();
  // an open layer is saved inside its design (the design shows its new look once you go back to Design)
  storePage();
  ED.project.pages[ED.pageIndex].thumb = pageThumb(); ED.emit('pages');
  const st = ED.stack, P = st.project, o = st.layerId && P.pages[st.pageIndex].json.objects.find((x) => x.id === st.layerId);
  if (o) {
    o.smart = { kind: st.kind, project: stripThumbs(ED.project) };
    try { await fetch(`/api/projects/${P.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(P) }); $('#saveState').textContent = 'Saved'; }
    catch { $('#saveState').textContent = 'Not saved (server offline?)'; }
  } else $('#saveState').textContent = 'Saved';
};

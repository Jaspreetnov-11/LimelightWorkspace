// Limelight Studio - canvas engine: project/pages, tools, pen, brush, history, snapping, clipboard.
const PROPS = ['id', 'name', 'isPage', 'selectable', 'evented', 'locked', 'hasControls', 'lockMovementX', 'lockMovementY',
  'lockScalingX', 'lockScalingY', 'lockRotation', 'scene3d', 'placeholder', 'textCase', 'cropPct', 'maskShape', 'strokeUniform', 'fxOff', 'gAngle', 'isFolder'];
const uid = () => Math.random().toString(36).slice(2, 10);

fabric.Object.prototype.set({
  transparentCorners: false, cornerColor: '#ffffff', cornerStrokeColor: '#ffc21a', borderColor: '#ffc21a',
  cornerSize: 10, cornerStyle: 'circle', borderScaleFactor: 1.5, padding: 2, strokeUniform: true,
});
fabric.textureSize = 4096;

const ED = {
  canvas: null, project: null, pageIndex: 0, tool: 'select', zoom: 1,
  undo: [], redo: [], loading: false, clipboard: null, clip: true, snap: true,
  listeners: {},
  on(ev, fn) { (this.listeners[ev] ||= []).push(fn); },
  emit(ev, a) { (this.listeners[ev] || []).forEach((f) => f(a)); },
};

// ---------------- setup ----------------
function initCanvas() {
  const stage = document.getElementById('stage');
  const c = new fabric.Canvas('c', { width: stage.clientWidth, height: stage.clientHeight, preserveObjectStacking: true,
    selectionColor: '#ffc21a14', selectionBorderColor: '#ffc21a', selectionLineWidth: 1, fireRightClick: true,
    stopContextMenu: true, backgroundColor: null, enableRetinaScaling: true });
  ED.canvas = c;
  new ResizeObserver(() => { c.setDimensions({ width: stage.clientWidth, height: stage.clientHeight }); updateClip(); c.requestRenderAll(); }).observe(stage);

  const changed = () => { if (!ED.loading) scheduleHistory(); };
  c.on('object:added', (e) => { if (!e.target.id) e.target.id = uid(); changed(); });
  c.on('object:removed', changed);
  c.on('object:modified', changed);
  c.on('path:created', (e) => { e.path.id = uid(); e.path.name = 'Brush stroke'; changed(); });
  c.on('text:changed', changed);
  ['selection:created', 'selection:updated', 'selection:cleared'].forEach((ev) => c.on(ev, () => ED.emit('selection')));
  c.on('object:moving', onMoving);
  c.on('object:modified', () => { ED.guides = []; ED.emit('selection'); });
  c.on('object:scaling', () => ED.emit('transform'));
  c.on('object:moving', () => ED.emit('transform'));
  c.on('object:rotating', () => ED.emit('transform'));
  c.on('before:render', drawArtboardShadow);
  c.on('after:render', drawOverlay);
  c.on('mouse:down', onDown);
  c.on('mouse:move', onMove);
  c.on('mouse:up', onUp);
  c.on('mouse:dblclick', onDbl);
  c.on('mouse:wheel', onWheel);
  c.on('mouse:down:before', (e) => {
    if (e.e.button === 1 || ED.spaceDown || ED.tool === 'hand') { c.skipTargetFind = true; startPan(e.e); }
  });
}

// ---------------- project & pages ----------------
function pageRectJSON(w, h, fill = '#ffffff') {
  return { type: 'rect', left: 0, top: 0, width: w, height: h, fill, isPage: true, selectable: false, evented: false,
    hasControls: false, strokeWidth: 0, name: 'Page', id: 'page', hoverCursor: 'default' };
}
function newProject(w, h, name = 'Untitled design', pages) {
  return { id: 'p' + Date.now().toString(36), name, width: w, height: h, dpi: w >= 2000 || h >= 2000 ? 300 : 96,
    pages: pages || [{ id: uid(), name: 'Artboard 1', w, h, json: { version: '5.3.0', objects: [pageRectJSON(w, h)] } }] };
}
function pageRect() { return ED.canvas.getObjects().find((o) => o.isPage); }

async function openProject(proj) {
  ED.project = proj; ED.pageIndex = 0;
  document.getElementById('docName').value = proj.name;
  await loadPage(0);
  fitView();
  ED.emit('project');
}

// Studio's own pictures (logos in /img, uploads in /library) saved with whichever address Studio was open at - this PC,
// Lighthouse's localhost:3345, lh-design.limelightcorp.net - point at the address in use: from another one they cannot
// load there, or they taint the canvas and every PNG / JPG / PDF / PSD export fails
function localSrcs(json) {
  const fix = (o) => {
    if (o && typeof o.src === 'string' && /^https?:\/\//.test(o.src)) {
      try { const u = new URL(o.src); if (u.origin !== location.origin && /^\/(img|library|fonts)\//.test(u.pathname)) o.src = u.pathname + u.search; } catch { /* left */ }
    }
    (o?.objects || []).forEach(fix);
    if (o?.clipPath) fix(o.clipPath);
  };
  (json?.objects || []).forEach(fix);
  return json;
}
function loadPage(i) {
  localSrcs(ED.project.pages[i].json);
  return new Promise((resolve) => {
    const c = ED.canvas; ED.loading = true; ED.pageIndex = i;
    // every artboard keeps its own size; ED.project.width/height always mirror the open one
    const pg = ED.project.pages[i];
    if (!pg.w) { pg.w = ED.project.width; pg.h = ED.project.height; }
    ED.project.width = pg.w; ED.project.height = pg.h;
    c.discardActiveObject();
    c.loadFromJSON(ED.project.pages[i].json, async () => {
      fixPageObjects();
      await ensureFonts();
      c.getObjects().forEach((o) => o.type?.includes('text') && o.initDimensions?.());
      ED.loading = false; ED.undo = [snapshot()]; ED.redo = [];
      updateClip(); c.requestRenderAll(); ED.emit('page'); ED.emit('history'); resolve();
    });
  });
}
function fixPageObjects() {
  const c = ED.canvas;
  let pr = pageRect();
  if (!pr) { pr = new fabric.Rect(pageRectJSON(ED.project.width, ED.project.height)); c.insertAt(pr, 0); }
  pr.set({ selectable: false, evented: false, hasControls: false, hoverCursor: 'default' });
  c.moveTo(pr, 0);
  c.getObjects().forEach(function fix(o) {
    if (o.locked) lockObj(o, true);
    if (o.type?.includes('text') && !o.styles) o.styles = {};
    o._objects?.forEach(fix);
  });
}
function ensureFonts() {
  const fams = new Set();
  ED.canvas.getObjects().forEach(function walk(o) { if (o.fontFamily) fams.add(o.fontFamily); o._objects?.forEach(walk); });
  return Promise.all([...fams].flatMap((f) => [document.fonts.load(`400 40px "${f}"`), document.fonts.load(`800 40px "${f}"`)]).map((p) => p.catch(() => 0)));
}
function storePage() {
  if (!ED.project) return;
  ED.project.pages[ED.pageIndex].json = ED.canvas.toJSON(PROPS);
}
async function switchPage(i) {
  if (i === ED.pageIndex) return;
  storePage(); await loadPage(i); fitView();
}
async function addPage(dup = false, size = null, name = null) {
  storePage();
  const src = ED.project.pages[ED.pageIndex];
  const w = size?.w || src.w, h = size?.h || src.h;
  const fill = typeof pageRect()?.fill === 'string' ? pageRect().fill : '#ffffff';
  const json = dup ? JSON.parse(JSON.stringify(src.json)) : { version: '5.3.0', objects: [pageRectJSON(w, h, fill)] };
  json.objects.forEach((o) => { if (!o.isPage) o.id = uid(); });
  const n = name || (dup ? `${src.name} copy` : `Artboard ${ED.project.pages.length + 1}`);
  ED.project.pages.splice(ED.pageIndex + 1, 0, { id: uid(), name: n, w, h, json, thumb: dup ? src.thumb : null });
  await loadPage(ED.pageIndex + 1); fitView(); markDirty();
}
async function deletePage(i) {
  if (ED.project.pages.length < 2) return toast('The last artboard cannot be deleted');
  storePage();
  ED.project.pages.splice(i, 1);
  await loadPage(Math.min(i, ED.project.pages.length - 1)); fitView(); markDirty();
}
// resizes the open artboard only (other artboards keep their sizes, like Photoshop)
function resizeProject(w, h) {
  storePage();
  const pg = ED.project.pages[ED.pageIndex];
  pg.w = w; pg.h = h;
  pg.json.objects.forEach((o) => { if (o.isPage) { o.width = w; o.height = h; } });
  loadPage(ED.pageIndex).then(fitView); markDirty();
}

// ---------------- view ----------------
function fitView() {
  const c = ED.canvas, p = ED.project; if (!p) return;
  const pad = 70, z = Math.min((c.width - pad * 2) / p.width, (c.height - pad * 2) / p.height);
  setZoom(z, false);
  const vpt = c.viewportTransform;
  vpt[4] = (c.width - p.width * z) / 2; vpt[5] = (c.height - p.height * z) / 2;
  c.setViewportTransform(vpt); updateClip();
}
function setZoom(z, keepCenter = true, point) {
  const c = ED.canvas;
  z = Math.max(0.02, Math.min(32, z));
  const pt = point || new fabric.Point(c.width / 2, c.height / 2);
  if (keepCenter || point) c.zoomToPoint(pt, z); else c.setZoom(z);
  ED.zoom = z; updateClip(); ED.emit('zoom');
}
function updateClip() {
  const c = ED.canvas, p = ED.project; if (!c || !p) return;
  c.clipPath = ED.clip ? new fabric.Rect({ left: 0, top: 0, width: p.width, height: p.height, absolutePositioned: true }) : null;
  c.requestRenderAll();
}
function onWheel(opt) {
  const e = opt.e; e.preventDefault(); e.stopPropagation();
  const c = ED.canvas;
  if (e.ctrlKey || e.metaKey) {
    setZoom(ED.zoom * Math.pow(0.999, e.deltaY * 2), false, new fabric.Point(e.offsetX, e.offsetY));
  } else {
    const v = c.viewportTransform;
    v[4] -= e.shiftKey ? e.deltaY : e.deltaX; v[5] -= e.shiftKey ? 0 : e.deltaY;
    c.setViewportTransform(v); c.requestRenderAll();
  }
}
let panState = null;
function startPan(e) {
  panState = { x: e.clientX, y: e.clientY };
  ED.canvas.selection = false; ED.canvas.setCursor('grabbing');
  const move = (ev) => {
    const v = ED.canvas.viewportTransform;
    v[4] += ev.clientX - panState.x; v[5] += ev.clientY - panState.y;
    panState = { x: ev.clientX, y: ev.clientY };
    ED.canvas.setViewportTransform(v); ED.canvas.requestRenderAll();
  };
  const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); panState = null;
    ED.canvas.selection = ED.tool === 'select'; ED.canvas.skipTargetFind = false; ED.canvas.setCursor(ED.canvas.defaultCursor); };
  window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
}

// ---------------- history ----------------
function snapshot() { return JSON.stringify(ED.canvas.toJSON(PROPS)); }
let histTimer;
function scheduleHistory() {
  clearTimeout(histTimer);
  histTimer = setTimeout(() => {
    const s = snapshot();
    if (ED.undo[ED.undo.length - 1] === s) return;
    ED.undo.push(s); if (ED.undo.length > 80) ED.undo.shift();
    ED.redo = []; ED.emit('history'); markDirty();
  }, 200);
}
function restore(s) {
  ED.loading = true;
  ED.canvas.loadFromJSON(s, () => { fixPageObjects(); ED.loading = false; ED.canvas.requestRenderAll(); ED.emit('history'); ED.emit('selection'); markDirty(); });
}
function undo() { if (ED.undo.length < 2) return; ED.redo.push(ED.undo.pop()); restore(ED.undo[ED.undo.length - 1]); }
function redo() { if (!ED.redo.length) return; const s = ED.redo.pop(); ED.undo.push(s); restore(s); }

let dirtyTimer;
function markDirty() {
  if (!ED.project) return;
  document.getElementById('saveState').textContent = 'Saving…';
  clearTimeout(dirtyTimer);
  dirtyTimer = setTimeout(saveProject, 1200);
}
async function saveProject() {
  storePage();
  const thumbs = pageThumb();
  ED.project.pages[ED.pageIndex].thumb = thumbs;
  ED.emit('pages');
  const body = { ...ED.project, thumb: ED.pageIndex === 0 ? thumbs : ED.project.pages[0].thumb };
  try {
    await fetch(`/api/projects/${ED.project.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    document.getElementById('saveState').textContent = 'Saved';
  } catch { document.getElementById('saveState').textContent = 'Not saved (server offline?)'; }
}
function pageThumb() {
  const c = ED.canvas, p = ED.project, v = c.viewportTransform.slice(), clip = c.clipPath;
  c.clipPath = null; c.setViewportTransform([1, 0, 0, 1, 0, 0]);
  const sel = c.getActiveObject(); if (sel) c.discardActiveObject();
  const url = c.toDataURL({ left: 0, top: 0, width: p.width, height: p.height, multiplier: 260 / Math.max(p.width, p.height), format: 'png' });
  c.setViewportTransform(v); c.clipPath = clip; if (sel) c.setActiveObject(sel); c.requestRenderAll();
  return url;
}

// ---------------- tools ----------------
const TOOL_HINTS = {
  hand: 'Drag to move around · Space = hand anytime',
  rect: 'Drag to draw a rectangle · click for default size', ellipse: 'Drag to draw a circle/ellipse · Shift = perfect circle',
  triangle: 'Drag to draw a triangle', polygon: 'Drag to draw a polygon', star: 'Drag to draw a star',
  line: 'Drag to draw a line · Shift = 45° steps', arrow: 'Drag to draw an arrow',
  pen: 'Pen: click = corner point · drag = curve · click first point to close · Enter = finish · Esc = cancel',
  brush: 'Brush: paint freely · set brush in the right panel', text: 'Click anywhere to type',
  pipette: 'Click any colour on the page to apply it to the selected object',
};
function setTool(t) {
  const c = ED.canvas;
  if (ED.tool === 'pen' && t !== 'pen') finishPen();
  ED.tool = t;
  c.isDrawingMode = t === 'brush';
  if (t === 'brush') applyBrush();
  c.selection = t === 'select';
  c.defaultCursor = t === 'hand' ? 'grab' : t === 'select' ? 'default' : t === 'text' ? 'text' : 'crosshair';
  c.getObjects().forEach((o) => { if (!o.isPage) o.evented = t === 'select'; });
  if (t !== 'select' && t !== 'pipette') c.discardActiveObject();
  c.requestRenderAll();
  document.getElementById('toolHint').textContent = TOOL_HINTS[t] || '';
  ED.emit('tool');
}
ED.brush = { type: 'pencil', color: '#ffc21a', width: 12, opacity: 1, shadow: 0 };
function applyBrush() {
  const c = ED.canvas, b = ED.brush;
  const B = { pencil: fabric.PencilBrush, spray: fabric.SprayBrush, circle: fabric.CircleBrush, marker: fabric.PencilBrush }[b.type] || fabric.PencilBrush;
  c.freeDrawingBrush = new B(c);
  const col = fabric.Color.fromHex(b.color.replace('#', '')); col.setAlpha(b.type === 'marker' ? 0.45 : b.opacity);
  c.freeDrawingBrush.color = col.toRgba();
  c.freeDrawingBrush.width = b.width;
  if (b.type === 'spray') c.freeDrawingBrush.density = 30;
  c.freeDrawingBrush.shadow = b.shadow ? new fabric.Shadow({ color: b.color, blur: b.shadow }) : null;
  if (b.type !== 'spray') c.freeDrawingBrush.decimate = 2;
}

const DEF_FILL = '#ffc21a';
let drawing = null;
function regularPoints(n, star) {
  const pts = [], k = star ? n * 2 : n;
  for (let i = 0; i < k; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / k, r = star && i % 2 ? 0.42 : 1;
    pts.push({ x: 50 + 50 * r * Math.cos(a), y: 50 + 50 * r * Math.sin(a) });
  }
  return pts;
}
function makeShape(kind, x, y) {
  const base = { left: x, top: y, fill: DEF_FILL, strokeWidth: 0, stroke: '#111111', id: uid() };
  switch (kind) {
    case 'rect': return new fabric.Rect({ ...base, width: 1, height: 1, name: 'Rectangle' });
    case 'ellipse': return new fabric.Ellipse({ ...base, rx: 0.5, ry: 0.5, name: 'Ellipse' });
    case 'triangle': return new fabric.Triangle({ ...base, width: 1, height: 1, name: 'Triangle' });
    case 'polygon': return new fabric.Polygon(regularPoints(6), { ...base, scaleX: 0.01, scaleY: 0.01, name: 'Polygon' });
    case 'star': return new fabric.Polygon(regularPoints(5, true), { ...base, scaleX: 0.01, scaleY: 0.01, name: 'Star' });
    case 'line': case 'arrow': return new fabric.Line([x, y, x, y], { stroke: '#ffffff', strokeWidth: 6, strokeLineCap: 'round', name: 'Line', id: uid(), fill: null });
  }
}
function sizeShape(o, kind, a, b, shift) {
  let w = b.x - a.x, h = b.y - a.y;
  if (kind === 'line' || kind === 'arrow') {
    if (shift) { const ang = Math.round(Math.atan2(h, w) / (Math.PI / 4)) * (Math.PI / 4), len = Math.hypot(w, h); w = len * Math.cos(ang); h = len * Math.sin(ang); }
    o.set({ x2: a.x + w, y2: a.y + h }); return;
  }
  if (shift) { const m = Math.max(Math.abs(w), Math.abs(h)); w = Math.sign(w || 1) * m; h = Math.sign(h || 1) * m; }
  const left = Math.min(a.x, a.x + w), top = Math.min(a.y, a.y + h), W = Math.abs(w), H = Math.abs(h);
  if (kind === 'ellipse') o.set({ left, top, rx: W / 2, ry: H / 2 });
  else if (kind === 'polygon' || kind === 'star') o.set({ left, top, scaleX: Math.max(W, 1) / 100, scaleY: Math.max(H, 1) / 100 });
  else o.set({ left, top, width: W, height: H });
}
function arrowFromLine(l) {
  const x1 = l.x1, y1 = l.y1, x2 = l.x2, y2 = l.y2, w = l.strokeWidth, ang = Math.atan2(y2 - y1, x2 - x1), hl = Math.max(18, w * 4);
  const p = (a) => `${x2 - hl * Math.cos(ang + a)} ${y2 - hl * Math.sin(ang + a)}`;
  return new fabric.Path(`M ${x1} ${y1} L ${x2} ${y2} M ${p(0.45)} L ${x2} ${y2} L ${p(-0.45)}`,
    { stroke: l.stroke, strokeWidth: w, fill: null, strokeLineCap: 'round', strokeLineJoin: 'round', name: 'Arrow', id: uid() });
}

function onDown(opt) {
  const c = ED.canvas, e = opt.e, p = c.getPointer(e);
  if (e.button === 1 || ED.tool === 'hand' || ED.spaceDown || panState) return;
  if (ED.tool === 'pipette') return pickColor(e);
  if (ED.tool === 'pen') return penDown(p);
  if (ED.tool === 'text') {
    const t = addText({ text: 'Type something', fontSize: Math.round(ED.project.width / 18), left: p.x, top: p.y });
    setTool('select'); c.setActiveObject(t); t.enterEditing(); t.selectAll(); return;
  }
  if (['rect', 'ellipse', 'triangle', 'polygon', 'star', 'line', 'arrow'].includes(ED.tool)) {
    const o = makeShape(ED.tool, p.x, p.y);
    ED.loading = true; c.add(o); ED.loading = false;
    drawing = { o, kind: ED.tool, start: p };
  }
}
function onMove(opt) {
  const p = ED.canvas.getPointer(opt.e);
  if (drawing) { sizeShape(drawing.o, drawing.kind, drawing.start, p, opt.e.shiftKey); drawing.o.setCoords(); ED.canvas.requestRenderAll(); }
  if (ED.tool === 'pen') penMove(p);
}
function onUp(opt) {
  if (!drawing) return;
  const c = ED.canvas, { o, kind, start } = drawing; drawing = null;
  const p = c.getPointer(opt.e);
  if (Math.hypot(p.x - start.x, p.y - start.y) < 4) {
    const s = Math.round(Math.min(ED.project.width, ED.project.height) / 4);
    sizeShape(o, kind, { x: start.x - s / 2, y: start.y - s / 2 }, { x: start.x + s / 2, y: start.y + (kind.match(/line|arrow/) ? -s / 2 : s / 2) }, false);
  }
  let final = o;
  if (kind === 'arrow') { ED.loading = true; c.remove(o); ED.loading = false; final = arrowFromLine(o); }
  if (kind !== 'arrow') { ED.loading = true; c.remove(o); ED.loading = false; }
  c.add(final); final.setCoords();
  setTool('select'); c.setActiveObject(final); c.requestRenderAll();
}
function onDbl(opt) {
  const t = opt.target;
  if (ED.tool === 'pen') return finishPen();
  if (t?.scene3d && window.Studio3D) return window.Studio3D.open(t.scene3d, t);
  if (t?.type === 'group' && opt.subTargets?.length) { /* drill into group */ }
}

// ---------------- text ----------------
function addText(o = {}) {
  const p = ED.project;
  const t = new fabric.Textbox(o.text || 'Heading', {
    left: o.left ?? p.width * 0.1, top: o.top ?? p.height * 0.4, width: o.width || p.width * 0.8,
    fontSize: o.fontSize || 64, fontFamily: o.fontFamily || 'Inter', fontWeight: o.fontWeight || 700,
    fill: o.fill || (isDarkPage() ? '#ffffff' : '#111111'), textAlign: o.textAlign || 'left', lineHeight: o.lineHeight || 1.15,
    charSpacing: o.charSpacing || 0, name: o.name || 'Text', id: uid(), splitByGrapheme: false,
  });
  document.fonts.load(`${t.fontWeight} 40px "${t.fontFamily}"`).then(() => { t.initDimensions(); ED.canvas.requestRenderAll(); });
  ED.canvas.add(t);
  return t;
}
function isDarkPage() {
  const f = pageRect()?.fill;
  if (typeof f !== 'string') return false;
  const c = new fabric.Color(f).getSource();
  return c ? (c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11) < 128 : false;
}

// ---------------- images ----------------
function loadImg(url) {
  return new Promise((res, rej) => fabric.Image.fromURL(url, (img) => (img && img.width ? res(img) : rej(new Error('image failed: ' + url))), { crossOrigin: 'anonymous' }));
}
async function addImage(url, opts = {}) {
  const img = await loadImg(url);
  const p = ED.project, c = ED.canvas;
  const target = opts.point && findPlaceholder(opts.point);
  if (target) return fillPlaceholder(target, img);
  const s = Math.min((p.width * (opts.fit || 0.6)) / img.width, (p.height * (opts.fit || 0.6)) / img.height, opts.noUpscale ? 1 : 99);
  img.set({ scaleX: s, scaleY: s, name: opts.name || 'Image', id: uid() });
  const cx = opts.point ? opts.point.x : p.width / 2, cy = opts.point ? opts.point.y : p.height / 2;
  img.set({ left: cx - (img.width * s) / 2, top: cy - (img.height * s) / 2 });
  c.add(img); c.setActiveObject(img); c.requestRenderAll();
  return img;
}
function findPlaceholder(pt) {
  const objs = ED.canvas.getObjects().slice().reverse();
  return objs.find((o) => o.placeholder && o.containsPoint(pt));
}
function fillPlaceholder(ph, img) {
  const c = ED.canvas, w = ph.getScaledWidth(), h = ph.getScaledHeight();
  const s = Math.max(w / img.width, h / img.height);
  img.set({ scaleX: s, scaleY: s, left: ph.left + w / 2, top: ph.top + h / 2, originX: 'center', originY: 'center', angle: ph.angle, name: 'Photo', id: uid() });
  // crop to the placeholder area using a clip path in object space
  const cw = w / s, ch = h / s;
  const shape = ph.type === 'ellipse' || ph.type === 'circle'
    ? new fabric.Ellipse({ rx: cw / 2, ry: ch / 2, originX: 'center', originY: 'center' })
    : new fabric.Rect({ width: cw, height: ch, rx: (ph.rx || 0) / s, ry: (ph.ry || 0) / s, originX: 'center', originY: 'center' });
  img.clipPath = shape;
  const idx = c.getObjects().indexOf(ph);
  c.remove(ph); c.insertAt(img, idx); c.setActiveObject(img); c.requestRenderAll();
  return img;
}
async function uploadToLibrary(file) {
  let dataUrl = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(file); });
  if (!file.type.includes('svg')) dataUrl = await downscale(dataUrl, 4096);
  const res = await fetch('/api/library', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: file.name, data: dataUrl }) });
  return res.json();
}
function downscale(dataUrl, max) {
  return new Promise((resolve) => {
    const im = new Image();
    im.onload = () => {
      const s = Math.min(1, max / Math.max(im.width, im.height));
      if (s === 1) return resolve(dataUrl);
      const cv = document.createElement('canvas'); cv.width = Math.round(im.width * s); cv.height = Math.round(im.height * s);
      cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
      resolve(cv.toDataURL(dataUrl.startsWith('data:image/png') ? 'image/png' : 'image/jpeg', 0.92));
    };
    im.src = dataUrl;
  });
}
function addSVG(svgText, name = 'Vector') {
  return new Promise((resolve) => fabric.loadSVGFromString(svgText, (objs, opts) => {
    const g = fabric.util.groupSVGElements(objs, opts);
    const p = ED.project, s = Math.min((p.width * 0.6) / (g.width || 1), (p.height * 0.6) / (g.height || 1));
    g.set({ scaleX: s, scaleY: s, name, id: uid() });
    g.set({ left: (p.width - g.getScaledWidth()) / 2, top: (p.height - g.getScaledHeight()) / 2 });
    ED.canvas.add(g); ED.canvas.setActiveObject(g); ED.canvas.requestRenderAll(); resolve(g);
  }));
}

// ---------------- pen tool ----------------
let pen = null; // { pts:[{x,y,hx,hy}], drag, cursor, preview }
function penDown(p) {
  if (!pen) pen = { pts: [], drag: false, cursor: p };
  const first = pen.pts[0];
  if (first && pen.pts.length > 1 && Math.hypot(p.x - first.x, p.y - first.y) < 10 / ED.zoom) { finishPen(true); return; }
  pen.pts.push({ x: p.x, y: p.y, hx: p.x, hy: p.y });
  pen.drag = true;
  const up = () => { pen && (pen.drag = false); window.removeEventListener('mouseup', up); };
  window.addEventListener('mouseup', up);
  ED.canvas.requestRenderAll();
}
function penMove(p) {
  if (!pen) return;
  pen.cursor = p;
  if (pen.drag) { const l = pen.pts[pen.pts.length - 1]; l.hx = p.x; l.hy = p.y; }
  ED.canvas.requestRenderAll();
}
function penPathD(pts, closed, extra) {
  const all = extra ? [...pts, extra] : pts;
  if (!all.length) return '';
  let d = `M ${all[0].x} ${all[0].y}`;
  const seg = (a, b) => {
    const inX = 2 * b.x - (b.hx ?? b.x), inY = 2 * b.y - (b.hy ?? b.y);
    d += ` C ${a.hx ?? a.x} ${a.hy ?? a.y} ${inX} ${inY} ${b.x} ${b.y}`;
  };
  for (let i = 1; i < all.length; i++) seg(all[i - 1], all[i]);
  if (closed) { seg(all[all.length - 1], all[0]); d += ' Z'; }
  return d;
}
function finishPen(closed = false) {
  if (!pen) return;
  const pts = pen.pts; pen = null;
  if (pts.length >= 2) {
    const path = new fabric.Path(penPathD(pts, closed), {
      fill: closed ? DEF_FILL : null, stroke: closed ? null : '#ffffff', strokeWidth: closed ? 0 : 5,
      strokeLineCap: 'round', strokeLineJoin: 'round', name: closed ? 'Vector shape' : 'Vector path', id: uid(),
    });
    ED.canvas.add(path); setTool('select'); ED.canvas.setActiveObject(path);
  }
  ED.canvas.requestRenderAll();
}
function cancelPen() { pen = null; ED.canvas.requestRenderAll(); }

// soft shadow under the artboard so it floats on the dark stage (screen only, never exported)
function drawArtboardShadow() {
  const c = ED.canvas, p = ED.project; if (!p) return;
  const ctx = c.getContext(), v = c.viewportTransform, r = c.getRetinaScaling();
  ctx.save(); ctx.setTransform(r, 0, 0, r, 0, 0);
  ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 14; ctx.fillStyle = '#000';
  ctx.fillRect(v[4], v[5], p.width * v[0], p.height * v[3]);
  ctx.restore();
}

// ---------------- overlay: pen preview, guides, page label ----------------
function drawOverlay() {
  const c = ED.canvas, ctx = c.getContext(), v = c.viewportTransform, p = ED.project; if (!p) return;
  ctx.save();
  ctx.setTransform(c.getRetinaScaling(), 0, 0, c.getRetinaScaling(), 0, 0);
  const tx = (x, y) => [x * v[0] + v[4], y * v[3] + v[5]];
  // page outline + label
  const [px, py] = tx(0, 0);
  ctx.strokeStyle = '#ffffff14'; ctx.lineWidth = 1; ctx.strokeRect(px - 0.5, py - 0.5, p.width * v[0] + 1, p.height * v[3] + 1);
  ctx.fillStyle = '#6f6f78'; ctx.font = '500 11px Inter';
  ctx.fillText(`${ED.project.pages[ED.pageIndex]?.name || ''}  ·  ${p.width} × ${p.height}`, px, py - 8);
  // smart guides
  ctx.strokeStyle = '#ff3d8b'; ctx.lineWidth = 1;
  (ED.guides || []).forEach((g) => {
    ctx.beginPath();
    if (g.x !== undefined) { const [gx] = tx(g.x, 0); ctx.moveTo(gx + 0.5, 0); ctx.lineTo(gx + 0.5, c.height); }
    else { const [, gy] = tx(0, g.y); ctx.moveTo(0, gy + 0.5); ctx.lineTo(c.width, gy + 0.5); }
    ctx.stroke();
  });
  // pen preview
  if (pen && pen.pts.length) {
    ctx.save(); ctx.transform(v[0], v[1], v[2], v[3], v[4], v[5]);
    const d = penPathD(pen.pts, false, pen.drag ? null : { x: pen.cursor.x, y: pen.cursor.y });
    ctx.strokeStyle = '#ffc21a'; ctx.lineWidth = 1.5 / ED.zoom; ctx.stroke(new Path2D(d));
    pen.pts.forEach((pt, i) => {
      if (pt.hx !== pt.x || pt.hy !== pt.y) {
        ctx.strokeStyle = '#5b8cff'; ctx.beginPath(); ctx.moveTo(2 * pt.x - pt.hx, 2 * pt.y - pt.hy); ctx.lineTo(pt.hx, pt.hy); ctx.stroke();
        ctx.fillStyle = '#5b8cff'; ctx.beginPath(); ctx.arc(pt.hx, pt.hy, 3.5 / ED.zoom, 0, 7); ctx.fill();
      }
      ctx.fillStyle = i === 0 ? '#ffc21a' : '#ffffff'; ctx.strokeStyle = '#ffc21a';
      const s = 7 / ED.zoom; ctx.fillRect(pt.x - s / 2, pt.y - s / 2, s, s); ctx.strokeRect(pt.x - s / 2, pt.y - s / 2, s, s);
    });
    ctx.restore();
  }
  ctx.restore();
}

// ---------------- snapping ----------------
function onMoving(e) {
  const o = e.target; ED.guides = [];
  if (!ED.snap || e.e.altKey) return;
  const p = ED.project, th = 6 / ED.zoom, br = o.getBoundingRect(true, true);
  const xs = [0, p.width / 2, p.width], ys = [0, p.height / 2, p.height];
  ED.canvas.getObjects().forEach((x) => {
    if (x === o || x.isPage || !x.visible || (o.type === 'activeSelection' && o.contains(x))) return;
    const b = x.getBoundingRect(true, true);
    xs.push(b.left, b.left + b.width / 2, b.left + b.width); ys.push(b.top, b.top + b.height / 2, b.top + b.height);
  });
  const mine = (v, w) => [v, v + w / 2, v + w];
  let dx = null, dy = null;
  mine(br.left, br.width).forEach((m) => xs.forEach((g) => { const d = g - m; if (Math.abs(d) < th && (dx === null || Math.abs(d) < Math.abs(dx.d))) dx = { d, g }; }));
  mine(br.top, br.height).forEach((m) => ys.forEach((g) => { const d = g - m; if (Math.abs(d) < th && (dy === null || Math.abs(d) < Math.abs(dy.d))) dy = { d, g }; }));
  if (dx) { o.left += dx.d; ED.guides.push({ x: dx.g }); }
  if (dy) { o.top += dy.d; ED.guides.push({ y: dy.g }); }
  o.setCoords();
}

// ---------------- pipette ----------------
function pickColor(e) {
  const c = ED.canvas, r = c.getRetinaScaling();
  const rect = c.upperCanvasEl.getBoundingClientRect();
  const x = Math.round((e.clientX - rect.left) * r), y = Math.round((e.clientY - rect.top) * r);
  const d = c.getContext().getImageData(x, y, 1, 1).data;
  const hex = '#' + [d[0], d[1], d[2]].map((n) => n.toString(16).padStart(2, '0')).join('');
  const targets = ED.pipetteTargets || [];
  targets.forEach((o) => { if (o.type === 'line' || (o.type === 'path' && !o.fill)) o.set('stroke', hex); else o.set('fill', hex); });
  ED.recentColors = [hex, ...(ED.recentColors || []).filter((x) => x !== hex)].slice(0, 8);
  if (targets.length) { c.fire('object:modified'); }
  navigator.clipboard?.writeText(hex).catch(() => 0);
  toast(`Colour ${hex}${targets.length ? ' applied' : ' copied'}`);
  setTool('select');
  if (targets.length === 1) c.setActiveObject(targets[0]);
  ED.emit('selection');
}

// ---------------- object commands ----------------
function selected() {
  const a = ED.canvas.getActiveObject();
  if (!a) return [];
  return a.type === 'activeSelection' ? a.getObjects() : [a];
}
function deleteSel() {
  const c = ED.canvas, a = c.getActiveObject();
  if (!a || a.isEditing) return;
  selected().forEach((o) => c.remove(o));
  c.discardActiveObject(); c.requestRenderAll();
}
function copySel() {
  const a = ED.canvas.getActiveObject(); if (!a) return;
  a.clone((cl) => { ED.clipboard = cl; }, PROPS);
}
function pasteSel(offset = 24) {
  const c = ED.canvas; if (!ED.clipboard) return;
  ED.clipboard.clone((cl) => {
    c.discardActiveObject();
    cl.set({ left: cl.left + offset, top: cl.top + offset, evented: true });
    if (cl.type === 'activeSelection') { cl.canvas = c; cl.forEachObject((o) => { o.id = uid(); c.add(o); }); cl.setCoords(); }
    else { cl.id = uid(); c.add(cl); }
    ED.clipboard.left += offset; ED.clipboard.top += offset;
    c.setActiveObject(cl); c.requestRenderAll();
  }, PROPS);
}
function duplicateSel() { copySel(); setTimeout(() => pasteSel(24), 0); }
function groupSel() {
  const c = ED.canvas, a = c.getActiveObject();
  if (!a || a.type !== 'activeSelection') return;
  const objs = c.getObjects(), top = Math.max(...a.getObjects().map((o) => objs.indexOf(o))), n = a.getObjects().length;
  const g = a.toGroup(); c.moveTo(g, top - n + 1); g.set({ name: 'Group', id: uid(), isFolder: true }); c.requestRenderAll(); scheduleHistory(); ED.emit('selection');
}
function ungroupSel() {
  const c = ED.canvas, a = c.getActiveObject();
  if (!a || a.type !== 'group') return;
  a.toActiveSelection(); c.requestRenderAll(); scheduleHistory(); ED.emit('selection');
}
function order(cmd) {
  const c = ED.canvas, objs = selected(); if (!objs.length) return;
  objs.forEach((o) => {
    if (cmd === 'front') c.bringToFront(o);
    if (cmd === 'forward') c.bringForward(o);
    if (cmd === 'backward') { c.sendBackwards(o); if (c.getObjects().indexOf(o) === 0) c.moveTo(o, 1); }
    if (cmd === 'back') c.moveTo(o, 1);
  });
  c.moveTo(pageRect(), 0); c.requestRenderAll(); scheduleHistory(); ED.emit('layers');
}
function lockObj(o, lock) {
  o.locked = lock;
  o.set({ lockMovementX: lock, lockMovementY: lock, lockScalingX: lock, lockScalingY: lock, lockRotation: lock, hasControls: !lock,
    hoverCursor: lock ? 'default' : null });
}
function align(where) {
  const c = ED.canvas, a = c.getActiveObject(); if (!a) return;
  const objs = selected(), multi = objs.length > 1;
  let box;
  if (multi) { const b = a.getBoundingRect(true, true); box = { l: b.left, t: b.top, w: b.width, h: b.height }; }
  else box = { l: 0, t: 0, w: ED.project.width, h: ED.project.height };
  c.discardActiveObject();
  objs.forEach((o) => {
    const b = o.getBoundingRect(true, true);
    if (where === 'left') o.left += box.l - b.left;
    if (where === 'centerH') o.left += box.l + box.w / 2 - (b.left + b.width / 2);
    if (where === 'right') o.left += box.l + box.w - (b.left + b.width);
    if (where === 'top') o.top += box.t - b.top;
    if (where === 'centerV') o.top += box.t + box.h / 2 - (b.top + b.height / 2);
    if (where === 'bottom') o.top += box.t + box.h - (b.top + b.height);
    o.setCoords();
  });
  if (multi) c.setActiveObject(new fabric.ActiveSelection(objs, { canvas: c })); else c.setActiveObject(objs[0]);
  c.requestRenderAll(); scheduleHistory(); ED.emit('selection');
}
function distribute(axis) {
  const c = ED.canvas, objs = selected(); if (objs.length < 3) return toast('Select 3 or more objects');
  c.discardActiveObject();
  const key = axis === 'h' ? 'left' : 'top', size = axis === 'h' ? 'width' : 'height';
  const items = objs.map((o) => ({ o, b: o.getBoundingRect(true, true) })).sort((a, b) => a.b[key] - b.b[key]);
  const start = items[0].b[key], end = items[items.length - 1].b[key] + items[items.length - 1].b[size];
  const total = items.reduce((s, i) => s + i.b[size], 0), gap = (end - start - total) / (items.length - 1);
  let pos = start;
  items.forEach(({ o, b }) => { o[key] += pos - b[key]; pos += b[size] + gap; o.setCoords(); });
  c.setActiveObject(new fabric.ActiveSelection(objs, { canvas: c })); c.requestRenderAll(); scheduleHistory();
}
function flip(axis) { selected().forEach((o) => o.set(axis === 'h' ? 'flipX' : 'flipY', !o[axis === 'h' ? 'flipX' : 'flipY'])); ED.canvas.requestRenderAll(); scheduleHistory(); }
function nudge(dx, dy) { const a = ED.canvas.getActiveObject(); if (!a) return; a.left += dx; a.top += dy; a.setCoords(); ED.canvas.requestRenderAll(); scheduleHistory(); ED.emit('transform'); }

// ---------------- image filters ----------------
const F = fabric.Image.filters;
const FILTERS = {
  Brightness: { key: 'brightness', min: -1, max: 1, def: 0 }, Contrast: { key: 'contrast', min: -1, max: 1, def: 0 },
  Saturation: { key: 'saturation', min: -1, max: 1, def: 0 }, Vibrance: { key: 'vibrance', min: -1, max: 1, def: 0 },
  HueRotation: { key: 'rotation', min: -1, max: 1, def: 0 }, Blur: { key: 'blur', min: 0, max: 1, def: 0 },
  Noise: { key: 'noise', min: 0, max: 600, def: 0 }, Pixelate: { key: 'blocksize', min: 1, max: 40, def: 1 },
};
function getFilter(img, type) { return (img.filters || []).find((f) => f && f.type === type); }
function setFilter(img, type, opts) {
  img.filters = (img.filters || []).filter((f) => f && f.type !== type);
  if (opts) img.filters.push(new F[type](opts));
  img.applyFilters(); ED.canvas.requestRenderAll();
}
function setCrop(img, pct) {
  const el = img.getElement(), nw = el.naturalWidth || el.width, nh = el.naturalHeight || el.height;
  const cx0 = img.cropX || 0, cy0 = img.cropY || 0;
  img.cropPct = pct;
  const cropX = nw * pct.l, cropY = nh * pct.t;
  img.set({ cropX, cropY, width: Math.max(4, nw * (1 - pct.l - pct.r)), height: Math.max(4, nh * (1 - pct.t - pct.b)) });
  img.left += (cropX - cx0) * img.scaleX; img.top += (cropY - cy0) * img.scaleY;
  img.setCoords(); ED.canvas.requestRenderAll();
}
const MASKS = {
  none: null,
  circle: (w, h) => new fabric.Ellipse({ rx: w / 2, ry: h / 2, originX: 'center', originY: 'center' }),
  rounded: (w, h) => new fabric.Rect({ width: w, height: h, rx: Math.min(w, h) * 0.12, ry: Math.min(w, h) * 0.12, originX: 'center', originY: 'center' }),
  arch: (w, h) => new fabric.Path(`M ${-w / 2} ${h / 2} L ${-w / 2} ${-h / 2 + w / 2} A ${w / 2} ${w / 2} 0 0 1 ${w / 2} ${-h / 2 + w / 2} L ${w / 2} ${h / 2} Z`, { originX: 'center', originY: 'center' }),
  hexagon: (w, h) => new fabric.Polygon(regularPoints(6).map((p) => ({ x: (p.x / 100 - 0.5) * w, y: (p.y / 100 - 0.5) * h })), { originX: 'center', originY: 'center' }),
  star: (w, h) => new fabric.Polygon(regularPoints(5, true).map((p) => ({ x: (p.x / 100 - 0.5) * w, y: (p.y / 100 - 0.5) * h })), { originX: 'center', originY: 'center' }),
  triangle: (w, h) => new fabric.Path('M3 30.5 92.6 3.4c3.3-1 6.4 2 5.6 5.3L76.4 93.6c-1.2 4.7-7.3 5.6-9.6 1.4C57.3 77.6 42 63.4 6 44.4 0.8 41.6 0 33.4 3 30.5z', { originX: 'center', originY: 'center', scaleX: w / 98, scaleY: h / 98 }),
};
function setMask(img, kind) {
  img.maskShape = kind;
  img.clipPath = MASKS[kind] ? MASKS[kind](img.width, img.height) : null;
  img.dirty = true; ED.canvas.requestRenderAll(); scheduleHistory();
}

// ---------------- gradient helper ----------------
function makeGradient(type, c1, c2, angle = 90) {
  const a = ((angle - 90) * Math.PI) / 180;
  const coords = type === 'radial'
    ? { x1: 0.5, y1: 0.5, r1: 0, x2: 0.5, y2: 0.5, r2: 0.7 }
    : { x1: 0.5 - Math.cos(a) / 2, y1: 0.5 - Math.sin(a) / 2, x2: 0.5 + Math.cos(a) / 2, y2: 0.5 + Math.sin(a) / 2 };
  return new fabric.Gradient({ type, gradientUnits: 'percentage', coords, colorStops: [{ offset: 0, color: c1 }, { offset: 1, color: c2 }] });
}

// ---------------- toast ----------------
let toastT;
function toast(msg, err = false) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.toggle('err', err); t.classList.remove('hidden');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.add('hidden'), err ? 6000 : 2400);
}

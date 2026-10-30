// Limelight Studio - the Design tab as Photoshop. The whole Photoshop toolbox, grouped like Photoshop (right-click or
// hold a tool for its flyout, Shift+key steps through a group), the options bar, foreground / background colours and
// Quick Mask. Pixel work happens on raster layers: the selected image layer, or a new empty "Layer N" the size of the
// artboard; other layers are rasterized first (asked). Painted pixels are saved to Library/_layers so undo and the
// project keep a short URL. Selections are a mask over the artboard (marching ants) that clips painting, fills,
// adjustments and filters. Menus (Image, Layer, Select, Filter), adjustments and filters live in ps-menus.js.
Object.assign(ICONS, {
  ellMarquee: '<ellipse cx="12" cy="12" rx="8.5" ry="6.5" stroke-dasharray="3 2.6"/>',
  rowSel: '<path d="M3 12h18" stroke-dasharray="2.5 2"/><path d="M3 8v8M21 8v8"/>',
  colSel: '<path d="M12 3v18" stroke-dasharray="2.5 2"/><path d="M8 3h8M8 21h8"/>',
  polyLasso: '<path d="M5 7l9-3 6 7-5 6-8-2z"/><path d="M7 15l-1 5"/>',
  magLasso: '<path d="M7.5 15.5C4.9 14.6 3 12.5 3 10c0-3.3 4-6 9-6s9 2.7 9 6c0 1.4-.7 2.6-1.9 3.6"/><path d="M12 13v4a2 2 0 004 0v-4M12 15h4"/>',
  objSel: '<rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="3 2.4"/><path d="M9 8l8 4.5-3.4 1-1.3 3.5z"/>',
  quickSel: '<path d="M15 3l6 6-8.5 8.5H6.5v-6z"/><circle cx="6" cy="18" r="3" stroke-dasharray="2 2"/>',
  wand: '<path d="M4 20L15 9"/><path d="M15 3v3M19.5 4.5l-2 2M21 9h-3M19.5 13.5l-2-2"/>',
  crop: '<path d="M6 2v16h16"/><path d="M2 6h16v16"/>',
  perspCrop: '<path d="M6 5l12 1.5 2 13.5H4z"/><path d="M2 9h3M18 2v3"/>',
  slice: '<path d="M4 20L17 4l3 2.5L8 20z"/><path d="M11 13l3 2.5"/>',
  sliceSel: '<path d="M4 20l9-10"/><path d="M12 4l8 6.5-4 .8-1.5 3.7z"/>',
  sampler: '<path d="M17 3l4 4-9 9-4 1 1-4z"/><path d="M5 19l-2 2"/><circle cx="5.5" cy="5.5" r="2.5"/>',
  ruler: '<path d="M3 17L17 3l4 4L7 21z"/><path d="M8 12l2 2M11 9l2 2M14 6l2 2"/>',
  note: '<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4M8 11h8M8 15h6"/>',
  count: '<path d="M5 7l3-2v14M14 9a3 3 0 016 0c0 3-6 5-6 10h6"/>',
  spotHeal: '<rect x="2.5" y="8" width="19" height="8" rx="4" transform="rotate(-45 12 12)"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="19" cy="19" r="2.5" stroke-dasharray="1.5 1.5"/>',
  heal: '<rect x="2.5" y="8" width="19" height="8" rx="4" transform="rotate(-45 12 12)"/><path d="M10.5 10.5l3 3M13.5 10.5l-3 3"/>',
  patch: '<path d="M5 6c3-3 7-2 8 1s6 3 7 7-4 7-8 5-8 0-8-5 0-6 1-8z" stroke-dasharray="3 2"/>',
  caMove: '<path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/>',
  redEye: '<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3" fill="currentColor"/>',
  pencil: '<path d="M4 20l1-5L16 4l4 4L9 19z"/><path d="M14 6l4 4"/>',
  colorRep: '<path d="M9 15l7-7 3 3-7 7"/><path d="M9 15c-3 0-4 2-4 4 2 0 4-1 4-4z"/><path d="M4 9a5 5 0 018-5M12 2v2.5h-2.5"/>',
  mixer: '<path d="M14 3l4 4-7 7-4-4z"/><path d="M7 10l-3 8 8-3"/><circle cx="19" cy="18" r="2.5"/>',
  stamp: '<path d="M9 3h6v5l-1.5 3.5H19v4H5v-4h5.5L9 8z"/><path d="M5 20h14"/>',
  patStamp: '<path d="M9 3h6v5l-1.5 3.5H19v4H5v-4h5.5L9 8z"/><path d="M5 20h2M9 20h2M13 20h2M17 20h2"/>',
  histBrush: '<path d="M3 12a9 9 0 109-9 9 9 0 00-7 3.5"/><path d="M3 3.5v4h4M12 7v5l3 2"/>',
  artHist: '<path d="M3 12a9 9 0 109-9 9 9 0 00-7 3.5"/><path d="M3 3.5v4h4"/><path d="M12 7c-3 2 3 3 0 5s3 3 0 5"/>',
  eraser: '<path d="M8 20h12M5 15l9-9 5 5-8 8H8z"/><path d="M10 10l5 5"/>',
  bgEraser: '<path d="M5 14l9-9 5 5-8 8H9z"/><path d="M3 21h3M9 21h3M15 21h3"/>',
  magicEraser: '<path d="M4 17l8-8 4 4-7 7H6z"/><path d="M18 2v5M15.5 4.5h5"/>',
  gradient: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 5v14"/><path d="M12.5 5v14" opacity=".55"/><path d="M17 5v14" opacity=".25"/>',
  bucket: '<path d="M4.5 11l7-7 7 7-7 7z"/><path d="M4.5 11h14"/><path d="M20.5 15s-2 2.4-2 3.6a2 2 0 004 0c0-1.2-2-3.6-2-3.6z"/>',
  blurDrop: '<path d="M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z"/>',
  sharpen: '<path d="M12 3l6 17H6z"/>',
  smudge: '<path d="M9 21v-8l-3-4a1.5 1.5 0 012.3-2L10 9V4a1.5 1.5 0 013 0v6"/><path d="M13 10h4a2 2 0 012 2v3a6 6 0 01-6 6h-4"/>',
  dodge: '<circle cx="9" cy="9" r="5.5"/><path d="M13 13l7.5 7.5"/>',
  burn: '<path d="M7 21v-5a5 5 0 0110 0v5"/><circle cx="12" cy="8" r="3"/>',
  sponge: '<rect x="3.5" y="6" width="17" height="12" rx="4"/><circle cx="9" cy="11" r="1"/><circle cx="14" cy="13.5" r="1"/><circle cx="15" cy="9.5" r=".8"/>',
  freePen: '<path d="M17 3l4 4-9.5 9.5-5 .5.5-5z"/><path d="M2 21c3-4 5 2 8-1"/>',
  curvPen: '<path d="M16 3l5 5-8 8-5-1-1-5z"/><path d="M3 21c2-6 5-7 8-8"/>',
  delNode: '<path d="M10 3l5 9-5 9-5-9z"/><path d="M17 5.5h5"/>',
  convNode: '<path d="M4 20L12 5l8 15"/><rect x="10.5" y="3.5" width="3" height="3"/>',
  vText: '<path d="M6 4h9M10.5 4v12"/><path d="M19 7v13M16.5 17.5L19 20l2.5-2.5"/>',
  typeMask: '<path d="M5 5h14M12 5v14" stroke-dasharray="3 2"/>',
  vTypeMask: '<path d="M4 5h10M9 5v14" stroke-dasharray="3 2"/><path d="M19 7v13"/>',
  rotView: '<path d="M20 12a8 8 0 11-2.3-5.6"/><path d="M20 4v5h-5"/>',
  zoom: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21M8 10.5h5M10.5 8v5"/>',
  quickMask: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="12" cy="12" r="4.5" stroke-dasharray="2.5 2"/>',
  artboard: '<rect x="6" y="6" width="12" height="12" rx="1"/><path d="M6 2v3M18 2v3M6 19v3M18 19v3M2 6h3M2 18h3M19 6h3M19 18h3"/>',
  custom: '<path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z"/>',
});

// ---------------- state ----------------
const PS = {
  fg: '#000000', bg: '#ffffff', cur: 'select', group: {}, layer: null, sel: null, lastSel: null, qm: false, qmS: null, qmCache: null,
  drag: null, stroke: null, poly: null, curv: null, crop: null, quad: null, grad: null, mouse: null, cloneSrc: null, cloneOff: null,
  samplers: [], ruler: null, viewAngle: 0, ver: 0, phase: 0, nodeMode: null, merged: null, sliceSel: -1, customPattern: null,
  o: Object.assign({ size: 40, hard: 0.7, opacity: 1, flow: 1, mode: 'source-over', tol: 32, contiguous: true, sampleAll: true,
    feather: 0, selMode: 'new', strength: 0.5, range: 'mid', exposure: 0.35, sponge: 'desat', aligned: true, pattern: 'checker',
    gradType: 'linear', gradColors: 'fgbg', gradReverse: false, ratio: 'free', sample: 3, frameShape: 'rect', custom: 'heart',
    font: 'Inter', fontSize: 96, shapeStroke: 0, smooth: 0.1, autoSelect: true, autoTarget: 'group', showTC: true, gridSize: 100, gridSub: 4 }, (() => { try { return JSON.parse(localStorage.getItem('ll-ps-opts') || '{}'); } catch { return {}; } })()),
};
const psSave = () => { try { localStorage.setItem('ll-ps-opts', JSON.stringify(PS.o)); } catch { /* private window */ } };

// the toolbox: [group, key, [[tool, icon, name], ...]]; '-' = separator. Tools without ps- are the editor's own.
const PSG = [
  ['move', 'V', [['select', 'select', 'Move'], ['psArtboard', 'artboard', 'Artboard']]], '-',
  ['marquee', 'M', [['psRectSel', 'marquee', 'Rectangular Marquee'], ['psEllSel', 'ellMarquee', 'Elliptical Marquee'], ['psRowSel', 'rowSel', 'Single Row Marquee'], ['psColSel', 'colSel', 'Single Column Marquee']]],
  ['lasso', 'L', [['psLasso', 'lasso', 'Lasso'], ['psPolyLasso', 'polyLasso', 'Polygonal Lasso'], ['psMagLasso', 'magLasso', 'Magnetic Lasso']]],
  ['wand', 'W', [['psObjSel', 'objSel', 'Object Selection'], ['psQuickSel', 'quickSel', 'Quick Selection'], ['psWand', 'wand', 'Magic Wand']]],
  ['crop', 'C', [['psCrop', 'crop', 'Crop'], ['psPerspCrop', 'perspCrop', 'Perspective Crop'], ['psSlice', 'slice', 'Slice'], ['psSliceSel', 'sliceSel', 'Slice Select']]],
  ['frame', 'K', [['psFrame', 'picFrame', 'Frame']]], '-',
  ['eyedrop', 'I', [['psEyedrop', 'pipette', 'Eyedropper'], ['psSampler', 'sampler', 'Color Sampler'], ['psRuler', 'ruler', 'Ruler'], ['psNote', 'note', 'Note'], ['psCount', 'count', 'Count']]],
  ['heal', 'J', [['psSpotHeal', 'spotHeal', 'Spot Healing Brush'], ['psHeal', 'heal', 'Healing Brush'], ['psPatch', 'patch', 'Patch'], ['psCAMove', 'caMove', 'Content-Aware Move'], ['psRedEye', 'redEye', 'Red Eye']]],
  ['brush', 'B', [['psBrush', 'brush', 'Brush'], ['psPencil', 'pencil', 'Pencil'], ['psColorRep', 'colorRep', 'Color Replacement'], ['psMixer', 'mixer', 'Mixer Brush']]],
  ['stamp', 'S', [['psClone', 'stamp', 'Clone Stamp'], ['psPattern', 'patStamp', 'Pattern Stamp']]],
  ['history', 'Y', [['psHistBrush', 'histBrush', 'History Brush'], ['psArtHist', 'artHist', 'Art History Brush']]],
  ['eraser', 'E', [['psEraser', 'eraser', 'Eraser'], ['psBgEraser', 'bgEraser', 'Background Eraser'], ['psMagicEraser', 'magicEraser', 'Magic Eraser']]],
  ['gradient', 'G', [['psGradient', 'gradient', 'Gradient'], ['psBucket', 'bucket', 'Paint Bucket']]],
  ['blur', '', [['psBlur', 'blurDrop', 'Blur'], ['psSharpen', 'sharpen', 'Sharpen'], ['psSmudge', 'smudge', 'Smudge']]],
  ['dodge', 'O', [['psDodge', 'dodge', 'Dodge'], ['psBurn', 'burn', 'Burn'], ['psSponge', 'sponge', 'Sponge']]], '-',
  ['pen', 'P', [['pen', 'pen', 'Pen'], ['psFreePen', 'freePen', 'Freeform Pen'], ['psCurvPen', 'curvPen', 'Curvature Pen'], ['addNode', 'addNode', 'Add Anchor Point'], ['psDelNode', 'delNode', 'Delete Anchor Point'], ['psConvNode', 'convNode', 'Convert Point']]],
  ['type', 'T', [['text', 'text', 'Horizontal Type'], ['psVText', 'vText', 'Vertical Type'], ['psHMask', 'typeMask', 'Horizontal Type Mask'], ['psVMask', 'vTypeMask', 'Vertical Type Mask']]],
  ['pathsel', 'A', [['psPathSel', 'select', 'Path Selection'], ['node', 'node', 'Direct Selection']]],
  ['shape', 'U', [['rect', 'rect', 'Rectangle'], ['ellipse', 'ellipse', 'Ellipse'], ['triangle', 'triangle', 'Triangle'], ['polygon', 'polygon', 'Polygon'], ['line', 'line', 'Line'], ['psCustom', 'custom', 'Custom Shape']]], '-',
  ['hand', 'H', [['hand', 'hand', 'Hand'], ['psRotView', 'rotView', 'Rotate View']]],
  ['zoom', 'Z', [['psZoom', 'zoom', 'Zoom']]], '-',
  ['genfill', '', [['genRect', 'sparkles', 'Generative Fill – box'], ['genLasso', 'lasso', 'Generative Fill – lasso']]],
];
const PS_ALIAS = { psPathSel: 'select', psDelNode: 'node', psConvNode: 'node' };
const psToolOf = (id) => PS_ALIAS[id] || id;
const psGroupOf = (id) => PSG.find((g) => g !== '-' && g[2].some((t) => t[0] === id));
const psToolInfo = (id) => { const g = psGroupOf(id); return g && g[2].find((t) => t[0] === id); };
const PS_PAINT = new Set(['psBrush', 'psPencil', 'psColorRep', 'psMixer', 'psClone', 'psPattern', 'psHistBrush', 'psArtHist', 'psEraser', 'psBgEraser',
  'psSpotHeal', 'psHeal', 'psBlur', 'psSharpen', 'psSmudge', 'psDodge', 'psBurn', 'psSponge']);
const PS_DIRECT = new Set(['psMixer', 'psBgEraser', 'psBlur', 'psSharpen', 'psSmudge', 'psDodge', 'psBurn', 'psSponge']);
const PS_BRUSHY = new Set([...PS_PAINT, 'psRedEye', 'psQuickSel']);
const PS_SELTOOLS = new Set(['psRectSel', 'psEllSel', 'psRowSel', 'psColSel', 'psLasso', 'psPolyLasso', 'psMagLasso', 'psObjSel', 'psQuickSel', 'psWand']);
Object.assign(TOOL_HINTS, {
  select: 'Move: drag layers · Ctrl+T free transform · arrows nudge', psArtboard: 'Artboard: drag to make a new artboard of that size',
  psRectSel: 'Drag a rectangle · Shift = add, Alt = subtract, Shift+Alt = intersect · drag inside to move the selection',
  psEllSel: 'Drag an ellipse · Shift = add, Alt = subtract', psRowSel: 'Click: a 1 px row across the artboard', psColSel: 'Click: a 1 px column down the artboard',
  psLasso: 'Draw freely around the area', psPolyLasso: 'Click corners · double-click, Enter or click the first point to close', psMagLasso: 'Draw near an edge — the line snaps to it',
  psObjSel: 'Drag around an object (or click it) to select its pixels', psQuickSel: 'Paint over the area — it grows to similar colours', psWand: 'Click a colour · Tolerance and Contiguous in the bar',
  psCrop: 'Drag the box or its handles · Enter = crop, Esc = cancel', psPerspCrop: 'Click 4 corners on a photo layer · drag them · Enter = straighten & crop',
  psSlice: 'Drag to cut the design into slices · export them from the bar', psSliceSel: 'Click a slice to select · drag to move · Delete removes it',
  psFrame: 'Drag a frame · drop a photo on it to fill it', psEyedrop: 'Click = foreground colour · Alt+click = background', psSampler: 'Click to place up to 10 colour samplers · Alt+click removes',
  psRuler: 'Drag to measure · Straighten Layer in the bar', psNote: 'Click to leave a note · click a note to edit it', psCount: 'Click to count · Alt+click removes',
  psSpotHeal: 'Paint over a spot — it is healed from around it', psHeal: 'Alt+click the good area, then paint over the bad one', psPatch: 'Draw around the bad area, then drag it onto a good area',
  psCAMove: 'Draw around something, then drag it — the old place is filled in', psRedEye: 'Click on a red eye',
  psBrush: 'Paint · [ ] size · Shift+[ ] hardness · 1-0 opacity · Alt = eyedropper', psPencil: 'Hard-edged pencil · [ ] size', psColorRep: 'Paints the foreground colour over the colours, keeping the shading',
  psMixer: 'Mixes paint with the colours already there', psClone: 'Alt+click the source, then paint', psPattern: 'Paints a pattern (choose in the bar)',
  psHistBrush: 'Paints back how the layer was (Set history state in the bar)', psArtHist: 'Paints back the old state in stylised dabs',
  psEraser: 'Erase to transparency', psBgEraser: 'Erases the colour under the brush centre', psMagicEraser: 'Click a colour to erase it',
  psGradient: 'Drag to draw a gradient · Shift = 45° steps', psBucket: 'Click to fill similar colour · on a shape it recolours the shape',
  psBlur: 'Paint to soften', psSharpen: 'Paint to sharpen', psSmudge: 'Drag to smear the paint', psDodge: 'Paint to lighten', psBurn: 'Paint to darken', psSponge: 'Paint to (de)saturate',
  psFreePen: 'Draw a free vector path', psCurvPen: 'Click points — the curve flows through them · Enter = finish · click the first point to close',
  psDelNode: 'Click a shape, then click a point to delete it', psConvNode: 'Click a shape, then click a point to switch corner / smooth',
  psVText: 'Click to type vertically', psHMask: 'Click and type — the text becomes a selection', psVMask: 'Click and type vertical text — it becomes a selection',
  psPathSel: 'Path selection: select whole shapes and paths', node: 'Direct selection: drag points and handles', addNode: 'Click a path to add a point',
  psCustom: 'Drag to draw the custom shape chosen in the bar', psRotView: 'Drag to rotate the view · Esc / the bar resets it', psZoom: 'Click = zoom in · Alt+click = zoom out · drag = zoom to area',
  hand: 'Drag to move around · Space = hand anytime',
});

// ---------------- small helpers ----------------
const psClamp = (v, a, b) => Math.max(a, Math.min(b, v));
const psTp = (m, p) => fabric.util.transformPoint(new fabric.Point(p.x, p.y), m);
const psCopy = (cv) => { const t = canvasEl(cv.width, cv.height); t.getContext('2d').drawImage(cv, 0, 0); return t; };
const psRGB = (hex) => { const c = new fabric.Color(hex).getSource() || [0, 0, 0, 1]; return [c[0], c[1], c[2]]; };
const psHexA = (hex, a) => { const [r, g, b] = psRGB(hex); return `rgba(${r},${g},${b},${a})`; };
const psLum = (hex) => { const [r, g, b] = psRGB(hex); return (r * 0.299 + g * 0.587 + b * 0.114) / 255; };
const psToHex = (r, g, b) => '#' + [r, g, b].map((n) => Math.round(n).toString(16).padStart(2, '0')).join('');
const isRaster = (o) => !!o && o.type === 'image' && !o.smart && !o.scene3d && !o.isPage;
function psLive(o) { if (!o) return false; let t = o; while (t.group) t = t.group; return ED.canvas.getObjects().includes(t); }
// layer pixel <-> design matrices (images: element pixels, crop included)
function psL2D(o) { return fabric.util.multiplyTransformMatrices(o.calcTransformMatrix(), [1, 0, 0, 1, -o.width / 2 - (o.cropX || 0), -o.height / 2 - (o.cropY || 0)]); }
function psD2L(o) { return fabric.util.invertTransform(psL2D(o)); }
const psDet = (m) => Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));

// renders objects in design coordinates into a canvas: crisp (no cache from the current zoom), off-screen ones too
function psRender(objs, x0, y0, pw, ph, k = 1) {
  const c = ED.canvas, vpt = c.viewportTransform, skip = c.skipOffscreen;
  const cv = canvasEl(Math.max(1, Math.round(pw)), Math.max(1, Math.round(ph))), x = cv.getContext('2d');
  const dirty = (o) => { o.dirty = true; o._objects?.forEach(dirty); };
  c.viewportTransform = [k, 0, 0, k, 0, 0]; c.skipOffscreen = false; objs.forEach(dirty);
  try { x.setTransform(k, 0, 0, k, -x0 * k, -y0 * k); objs.forEach((o) => { if (o.visible !== false) { x.save(); o.render(x); x.restore(); } }); }
  finally { c.viewportTransform = vpt; c.skipOffscreen = skip; objs.forEach(dirty); }
  return cv;
}
// the artboard as you see it, at the selection's resolution (cached until something changes)
function psMerged() {
  const s = psSelCanvas(), key = `${ED.pageIndex}|${ED.undo.length}|${ED.undo[ED.undo.length - 1]?.length}|${PS.ver}`;
  if (PS.merged?.key === key) return PS.merged;
  const cv = psRender(ED.canvas.getObjects().filter((o) => !o.fromMaster || true), 0, 0, s.cv.width, s.cv.height, s.k);
  PS.merged = { key, cv, k: s.k, data: null };
  return PS.merged;
}
const psMergedData = () => { const m = psMerged(); if (!m.data) m.data = m.cv.getContext('2d').getImageData(0, 0, m.cv.width, m.cv.height).data; return m; };

// ---------------- raster layers ----------------
const _getSrcPS = fabric.Image.prototype.getSrc;
fabric.Image.prototype.getSrc = function (filtered) {
  if (this._psUrl && !this._psDirty && this._originalElement === this._psCv) return this._psUrl;
  return _getSrcPS.call(this, filtered);
};
function psPrepare(o) {
  if (o._psCv && o._originalElement === o._psCv) return o._psCv;
  const el = o._originalElement || o.getElement(), w = el.naturalWidth || el.width, h = el.naturalHeight || el.height;
  const cv = canvasEl(w, h); cv.getContext('2d').drawImage(el, 0, 0);
  o.setElement(cv, { width: o.width, height: o.height });
  o._psCv = cv; o._psUrl = null;
  if (!o._psHist || o._psHist.width !== w || o._psHist.height !== h) o._psHist = psCopy(cv);
  return cv;
}
function psTouch(o) {
  if (!o) { PS.qmCache = null; ED.canvas.requestRenderAll(); return; }
  if (o.filters?.length) o.applyFilters();
  o.dirty = true; if (o.group) o.group.dirty = true;
  ED.canvas.requestRenderAll();
}
async function psCommit(o) {
  if (!o) return;
  psTouch(o); PS.ver++;
  const v = o._psVer = (o._psVer || 0) + 1; o._psDirty = true;
  try {
    const r = await postJSON('/api/pixels', { name: (o.name || 'layer').slice(0, 30), data: o._psCv.toDataURL('image/png') });
    if (o._psVer === v) { o._psUrl = r.url; o._psDirty = false; }
  } catch (e) { console.warn('pixels not saved as a file, kept in the project', e); }
  scheduleHistory(); ED.emit('layers');
}
function psSetElement(o, cv) { o.setElement(cv, { width: cv.width, height: cv.height }); o.set({ cropX: 0, cropY: 0 }); o._psCv = cv; o._psHist = psCopy(cv); o.setCoords(); }
function psNewLayer(name, cv) {
  const P = ED.project, c = ED.canvas;
  cv = cv || canvasEl(Math.round(P.width), Math.round(P.height));
  const n = c.getObjects().reduce((m, o) => Math.max(m, +(/^Layer (\d+)$/.exec(o.name || '')?.[1] || 0)), 0) + 1;
  const img = new fabric.Image(cv, { left: 0, top: 0, name: name || `Layer ${n}`, id: uid() });
  img._psCv = cv; img._psHist = psCopy(cv);
  const objs = c.getObjects(), at = PS.layer && objs.includes(PS.layer) ? objs.indexOf(PS.layer) + 1 : objs.length;
  c.insertAt(img, at); PS.layer = img; psBar();
  return img;
}
function psRasterize(o) {
  const c = ED.canvas;
  if (o.group) { toast('Ungroup first (Ctrl+Shift+G) to rasterize one part', true); return null; }
  const keep = { opacity: o.opacity, globalCompositeOperation: o.globalCompositeOperation, shadow: o.shadow, visible: o.visible };
  o.set({ opacity: 1, globalCompositeOperation: 'source-over', shadow: null, visible: true });
  const r = o.getBoundingRect(true, true), x0 = Math.floor(r.left), y0 = Math.floor(r.top);
  const cv = psRender([o], x0, y0, Math.ceil(r.left + r.width) - x0 + 1, Math.ceil(r.top + r.height) - y0 + 1, 1);
  o.set(keep);
  const img = new fabric.Image(cv, { left: x0, top: y0, name: o.name || 'Layer', id: uid(), ...keep });
  img._psCv = cv; img._psHist = psCopy(cv);
  const i = c.getObjects().indexOf(o);
  ED.loading = true; c.remove(o); ED.loading = false; c.insertAt(img, i);
  PS.layer = img; scheduleHistory(); psBar();
  return img;
}
// the layer a pixel tool works on: { o, cv, m (design -> layer px), k (layer px per design px) }
function psTarget(opts = {}) {
  const c = ED.canvas;
  if (PS.maskEdit && !opts.noMask && window.psMaskTarget) { const M = psMaskTarget(); if (M) return M; }
  if (PS.qm && !opts.noQM) { if (!PS.qmS) PS.qmS = psSelCanvas(); const s = PS.qmS; return { o: null, cv: s.cv, m: [s.k, 0, 0, s.k, 0, 0], k: s.k }; }
  let o = PS.layer;
  if (o && (!psLive(o) || o.isPage)) o = PS.layer = null;
  if (o && o.locked) { toast('This layer is locked', true); return null; }
  if (o && o.visible === false) { toast('This layer is hidden — show it first', true); return null; }
  if (o && !isRaster(o)) {
    if (opts.noRasterize) return null;
    if (!confirm(`“${o.name || o.type}” is not a pixel layer. Rasterize it (turn it into pixels) so this tool can work on it?`)) return null;
    if (psRasterize(o)) toast('Rasterized — use the tool again');
    return null;
  }
  if (!o) { if (opts.noNew) return null; o = psNewLayer(); c.discardActiveObject(); }
  const cv = psPrepare(o), m = psD2L(o);
  return { o, cv, m, k: psDet(m) };
}

// ---------------- selections ----------------
function psSelCanvas() { const P = ED.project, k = Math.min(1, 8192 / Math.max(P.width, P.height)); return { cv: canvasEl(Math.ceil(P.width * k), Math.ceil(P.height * k)), k }; }
function psShape(draw) { const s = psSelCanvas(), x = s.cv.getContext('2d'); x.setTransform(s.k, 0, 0, s.k, 0, 0); x.fillStyle = '#fff'; x.strokeStyle = '#fff'; draw(x); return s; }
const psPolyDraw = (pts) => (x) => { x.beginPath(); pts.forEach((p, i) => (i ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y))); x.closePath(); x.fill(); };
const psEllPts = (a, b) => { const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2, rx = Math.abs(b.x - a.x) / 2, ry = Math.abs(b.y - a.y) / 2; return Array.from({ length: 72 }, (_, i) => ({ x: cx + rx * Math.cos(i * Math.PI / 36), y: cy + ry * Math.sin(i * Math.PI / 36) })); };
function psMaskFrom(m, w, h) { const t = canvasEl(w, h), x = t.getContext('2d'), id = x.createImageData(w, h); for (let i = 0; i < m.length; i++) if (m[i]) { const j = i * 4; id.data[j] = id.data[j + 1] = id.data[j + 2] = 255; id.data[j + 3] = m[i] === 1 ? 255 : m[i]; } x.putImageData(id, 0, 0); return t; }
const psModeOf = (e) => (e?.shiftKey && e?.altKey ? 'int' : e?.shiftKey ? 'add' : e?.altKey ? 'sub' : PS.o.selMode);
function psSelCommit(shape, mode, polys) {
  const f = PS.o.feather;
  if (f > 0) { const t = psCopy(shape.cv), x = shape.cv.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, t.width, t.height); x.filter = `blur(${f * shape.k}px)`; x.drawImage(t, 0, 0); x.filter = 'none'; }
  let s = PS.sel;
  if (!s || mode === 'new') { if (s) PS.lastSel = s; s = { cv: shape.cv, k: shape.k, polys: f ? null : polys }; }
  else {
    const x = s.cv.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalCompositeOperation = { add: 'source-over', sub: 'destination-out', int: 'destination-in' }[mode] || 'source-over';
    x.drawImage(shape.cv, 0, 0); x.globalCompositeOperation = 'source-over';
    s = { cv: s.cv, k: s.k, polys: null };
  }
  psSelSet(s);
}
// analyses a selection: bounding box, marching-ants edges; an empty one is no selection
function psSelSet(s, keepLast) {
  if (!s) { if (PS.sel && !keepLast) PS.lastSel = PS.sel; PS.sel = null; psAfterSel(); return; }
  const { cv, k } = s, w = cv.width, h = cv.height, d = cv.getContext('2d').getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 127) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) { PS.sel = null; psAfterSel(); return; }
  s.bbox = { x: x0 / k, y: y0 / k, w: (x1 - x0 + 1) / k, h: (y1 - y0 + 1) / k };
  if (!s.polys) {
    const A = canvasEl(w, h), B = canvasEl(w, h), ia = A.getContext('2d').createImageData(w, h), ib = B.getContext('2d').createImageData(w, h);
    const inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 127;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (!inside(x, y) || (inside(x - 1, y) && inside(x + 1, y) && inside(x, y - 1) && inside(x, y + 1))) continue;
      const j = (y * w + x) * 4, on = ((x + y) >> 2) & 1, a = on ? 255 : 0, b = on ? 0 : 255;
      ia.data[j] = ia.data[j + 1] = ia.data[j + 2] = a; ia.data[j + 3] = 255; ib.data[j] = ib.data[j + 1] = ib.data[j + 2] = b; ib.data[j + 3] = 255;
    }
    A.getContext('2d').putImageData(ia, 0, 0); B.getContext('2d').putImageData(ib, 0, 0); s.edges = [A, B];
  }
  PS.sel = s; psAfterSel();
}
function psAfterSel() { psBar(); ED.canvas?.requestRenderAll(); psTaskBar(); }
function psSelAll() { psSelCommit(psShape((x) => x.fillRect(0, 0, ED.project.width, ED.project.height)), 'new', [rectPts({ x: 0, y: 0 }, { x: ED.project.width, y: ED.project.height })]); }
function psDeselect() { if (PS.qm) psToggleQM(); psSelSet(null); }
function psReselect() { if (PS.lastSel) { const s = PS.lastSel; PS.lastSel = PS.sel; psSelSet({ cv: s.cv, k: s.k, polys: s.polys }, true); } }
function psInverse() {
  const s0 = PS.sel, s = psSelCanvas(), x = s.cv.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, s.cv.width, s.cv.height);
  if (s0) { x.globalCompositeOperation = 'destination-out'; x.drawImage(s0.cv, 0, 0); x.globalCompositeOperation = 'source-over'; }
  if (s0) PS.lastSel = s0;
  psSelSet({ cv: s.cv, k: s.k, polys: null }, true);
}
// feather / expand / contract / smooth / border, by blur + threshold (n in design px)
function psSelMorph(op, n) {
  const s0 = PS.sel; if (!s0) return toast('Make a selection first');
  const r = Math.max(0.5, n * s0.k), t = psCopy(s0.cv), out = canvasEl(t.width, t.height), x = out.getContext('2d');
  x.filter = `blur(${op === 'smooth' ? r / 2 : r}px)`; x.drawImage(t, 0, 0); x.filter = 'none';
  if (op !== 'feather') {
    const id = x.getImageData(0, 0, out.width, out.height), d = id.data, src = t.getContext('2d').getImageData(0, 0, t.width, t.height).data;
    for (let i = 3; i < d.length; i += 4) {
      const a = d[i];
      const v = op === 'expand' ? a > 6 : op === 'contract' ? a > 249 : op === 'smooth' ? a > 127 : (a > 6 && !(a > 249 && src[i] > 127));
      d[i - 3] = d[i - 2] = d[i - 1] = 255; d[i] = v ? 255 : 0;
    }
    x.putImageData(id, 0, 0);
  }
  PS.lastSel = s0; psSelSet({ cv: out, k: s0.k, polys: null }, true);
}
// the selection in a layer's pixels (canvas, alpha = selected)
function psSelLocal(T, s = PS.sel) {
  if (!s) return null;
  const m = canvasEl(T.cv.width, T.cv.height), x = m.getContext('2d'), a = T.m;
  x.setTransform(a[0], a[1], a[2], a[3], a[4], a[5]); x.drawImage(s.cv, 0, 0, s.cv.width / s.k, s.cv.height / s.k);
  return m;
}
function psSelFromLocal(T, local, mode) {
  const s = psSelCanvas(), x = s.cv.getContext('2d'), a = fabric.util.multiplyTransformMatrices([s.k, 0, 0, s.k, 0, 0], fabric.util.invertTransform(T.m));
  x.setTransform(a[0], a[1], a[2], a[3], a[4], a[5]); x.drawImage(local, 0, 0);
  psSelCommit(s, mode);
}
// alpha of objects as a selection (Object selection, Select subject, load transparency)
function psSelFromObjects(objs, mode = 'new') {
  if (!objs.length) return toast('Nothing there to select');
  const s = psSelCanvas(), cv = psRender(objs, 0, 0, s.cv.width, s.cv.height, s.k), x = s.cv.getContext('2d');
  x.drawImage(cv, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, s.cv.width, s.cv.height); x.globalCompositeOperation = 'source-over';
  psSelCommit(s, mode);
}
function psSelToGen() {
  const s = PS.sel; if (!s) return;
  const b = s.bbox, pts = s.polys?.length === 1 ? s.polys[0] : rectPts({ x: b.x, y: b.y }, { x: b.x + b.w, y: b.y + b.h });
  psSelSet(null); setTool('genRect'); GF.sel = { kind: 'area', pts }; showGenBar(''); ED.canvas.requestRenderAll();
}
function psToggleQM() {
  if (!PS.qm) { PS.qmS = PS.sel ? { cv: psCopy(PS.sel.cv), k: PS.sel.k } : psSelCanvas(); PS.sel = null; PS.qm = true; }
  else { PS.qm = false; const s = PS.qmS; PS.qmS = null; s.polys = null; psSelSet(s, true); }
  PS.qmCache = null; $('#psQM')?.classList.toggle('on', PS.qm); psBar(); ED.canvas.requestRenderAll();
}

// ---------------- flood fill (magic wand, bucket, magic eraser) ----------------
function psFlood(d, W, H, sx, sy, tol, contiguous, lim) {
  const m = new Uint8Array(W * H); sx = Math.floor(sx); sy = Math.floor(sy);
  if (sx < 0 || sy < 0 || sx >= W || sy >= H) return m;
  const j0 = (sy * W + sx) * 4, r0 = d[j0], g0 = d[j0 + 1], b0 = d[j0 + 2], a0 = d[j0 + 3];
  const ok = (i) => { const j = i * 4; return Math.abs(d[j] - r0) <= tol && Math.abs(d[j + 1] - g0) <= tol && Math.abs(d[j + 2] - b0) <= tol && Math.abs(d[j + 3] - a0) <= tol
    && (!lim || ((i % W - lim.x) ** 2 + ((i / W | 0) - lim.y) ** 2 <= lim.r2)); };
  if (!contiguous) { for (let i = 0; i < m.length; i++) if (ok(i)) m[i] = 1; return m; }
  const stack = [sy * W + sx];
  while (stack.length) {
    let i = stack.pop(); if (m[i]) continue;
    const y = (i / W) | 0; let x = i - y * W;
    while (x > 0 && !m[i - 1] && ok(i - 1)) { x--; i--; }
    let up = false, dn = false;
    for (; x < W && !m[i] && ok(i); x++, i++) {
      m[i] = 1;
      if (y > 0) { const u = i - W; if (!m[u] && ok(u)) { if (!up) { stack.push(u); up = true; } } else up = false; }
      if (y < H - 1) { const v = i + W; if (!m[v] && ok(v)) { if (!dn) { stack.push(v); dn = true; } } else dn = false; }
    }
  }
  return m;
}

// ---------------- painting ----------------
function psStamp(x, cx, cy, r, hard, color, a) {
  x.globalAlpha = a;
  if (hard >= 0.98 || r < 1.5) x.fillStyle = color;
  else { const g = x.createRadialGradient(cx, cy, r * hard, cx, cy, r); g.addColorStop(0, color); g.addColorStop(1, psHexA(color.startsWith('#') ? color : '#ffffff', 0)); x.fillStyle = g; }
  if (r < 1) x.fillRect(Math.floor(cx), Math.floor(cy), 1, 1); else { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); }
  x.globalAlpha = 1;
}
const psFall = (d, hard) => (d <= hard ? 1 : 1 - (d - hard) / (1 - hard + 1e-6));
function psPattern(kind, W, H) {
  const t = canvasEl(24, 24), x = t.getContext('2d'), fg = PS.fg, bg = PS.bg;
  if (kind === 'custom' && PS.customPattern) { const big = canvasEl(W, H), bx = big.getContext('2d'); bx.fillStyle = bx.createPattern(PS.customPattern, 'repeat'); bx.fillRect(0, 0, W, H); return big; }
  x.fillStyle = bg; x.fillRect(0, 0, 24, 24); x.fillStyle = fg; x.strokeStyle = fg;
  if (kind === 'checker') { x.fillRect(0, 0, 12, 12); x.fillRect(12, 12, 12, 12); }
  else if (kind === 'stripes') { x.lineWidth = 6; for (let i = -24; i < 48; i += 12) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 24, 24); x.stroke(); } }
  else if (kind === 'dots') { x.beginPath(); x.arc(6, 6, 3.5, 0, 7); x.arc(18, 18, 3.5, 0, 7); x.fill(); }
  else if (kind === 'grid') { x.lineWidth = 2; x.strokeRect(0, 0, 24, 24); }
  else if (kind === 'bricks') { x.lineWidth = 2; x.beginPath(); x.moveTo(0, 1); x.lineTo(24, 1); x.moveTo(0, 13); x.lineTo(24, 13); x.moveTo(12, 1); x.lineTo(12, 13); x.moveTo(1, 13); x.lineTo(1, 24); x.stroke(); }
  else { const id = x.getImageData(0, 0, 24, 24); for (let i = 0; i < id.data.length; i += 4) if (Math.random() < 0.5) { const [r, g, b] = psRGB(fg); id.data[i] = r; id.data[i + 1] = g; id.data[i + 2] = b; } x.putImageData(id, 0, 0); }
  const big = canvasEl(W, H), bx = big.getContext('2d'); bx.fillStyle = bx.createPattern(t, 'repeat'); bx.fillRect(0, 0, W, H);
  return big;
}
function psStrokeDown(p, e) {
  const id = PS.cur;
  if ((id === 'psClone' || id === 'psHeal') && e.altKey) { PS.cloneSrc = { x: p.x, y: p.y }; PS.cloneOff = null; toast('Source set — now paint where it should go'); return; }
  if ((id === 'psBrush' || id === 'psPencil') && e.altKey) return psEyedrop(p, false);
  if (PS.qm && !['psBrush', 'psPencil', 'psEraser'].includes(id)) return toast('In Quick Mask paint with the Brush, Pencil or Eraser');
  if (PS.maskEdit && !['psBrush', 'psPencil', 'psEraser', 'psBlur', 'psSmudge', 'psSharpen'].includes(id)) return toast('On a mask paint with the Brush, Pencil, Eraser, Blur or Smudge (or the Gradient)');
  if ((id === 'psClone' || id === 'psHeal') && !PS.cloneSrc) return toast('Alt+click where to copy from first');
  const T = psTarget(); if (!T) return;
  ED.canvas.discardActiveObject();
  const lp = psTp(T.m, p), W = T.cv.width, H = T.cv.height;
  const S = PS.stroke = { id, T, r: Math.max(0.5, (PS.o.size / 2) * T.k), last: lp, acc: 0, base: psCopy(T.cv), mask: PS_DIRECT.has(id) ? null : canvasEl(W, H),
    sel: !PS.qm && PS.sel ? psSelLocal(T) : null };
  if (S.sel && PS_DIRECT.has(id)) S.selData = S.sel.getContext('2d').getImageData(0, 0, W, H).data;
  if (id === 'psClone' || id === 'psHeal') {
    if (!PS.o.aligned || !PS.cloneOff) PS.cloneOff = { x: PS.cloneSrc.x - p.x, y: PS.cloneSrc.y - p.y };
    const sl = psTp(T.m, { x: p.x + PS.cloneOff.x, y: p.y + PS.cloneOff.y });
    S.src = canvasEl(W, H); S.src.getContext('2d').drawImage(S.base, lp.x - sl.x, lp.y - sl.y);
  } else if (id === 'psPattern') S.src = psPattern(PS.o.pattern, W, H);
  else if (id === 'psHistBrush' || id === 'psArtHist') S.src = T.o?._psHist || S.base;
  psDab(S, lp.x, lp.y); psFrame(S);
}
function psStrokeMove(p) {
  const S = PS.stroke; if (!S) return;
  let lp = psTp(S.T.m, p);
  if (PS.o.smooth > 0) { const k = 1 - PS.o.smooth * 0.92; S.sm = S.sm ? { x: S.sm.x + (lp.x - S.sm.x) * k, y: S.sm.y + (lp.y - S.sm.y) * k } : lp; lp = S.sm; }
  const dx = lp.x - S.last.x, dy = lp.y - S.last.y, d = Math.hypot(dx, dy); if (!d) return;
  const sp = Math.max(0.6, S.r * (S.id === 'psArtHist' ? 0.6 : S.id === 'psSmudge' || S.id === 'psMixer' ? 0.12 : 0.22));
  let s = sp - S.acc;
  while (s <= d) { psDab(S, S.last.x + (dx * s) / d, S.last.y + (dy * s) / d); s += sp; }
  S.acc = d - (s - sp); S.last = lp;
  psFrame(S);
}
function psFrame(S) { if (S.raf) return; S.raf = requestAnimationFrame(() => { S.raf = 0; if (S.mask) psComposite(S); S.T.touch ? S.T.touch() : psTouch(S.T.o); }); }
function psDab(S, x, y) {
  if (PS_DIRECT.has(S.id)) return psRegionDab(S, x, y);
  const m = S.mask.getContext('2d'), id = S.id, flow = PS.o.flow;
  const color = (id === 'psBrush' || id === 'psPencil') && !PS.qm && !S.T.isMask ? PS.fg : '#ffffff';
  if (id === 'psArtHist') { for (let i = 0; i < 4; i++) { const a = Math.random() * 7, d = Math.random() * S.r; psStamp(m, x + Math.cos(a) * d, y + Math.sin(a) * d, S.r * (0.15 + Math.random() * 0.3), 0.3, color, flow * 0.8); } return; }
  psStamp(m, x, y, S.r, id === 'psPencil' ? 1 : PS.o.hard, color, flow);
}
function psMaskSel(S) {
  if (!S.sel) return S.mask;
  const t = S.t1 || (S.t1 = canvasEl(S.mask.width, S.mask.height)), x = t.getContext('2d');
  x.globalCompositeOperation = 'copy'; x.drawImage(S.mask, 0, 0); x.globalCompositeOperation = 'destination-in'; x.drawImage(S.sel, 0, 0); x.globalCompositeOperation = 'source-over';
  return t;
}
function psComposite(S) {
  const cv = S.T.cv, x = cv.getContext('2d'), W = cv.width, H = cv.height, id = S.id, m = psMaskSel(S);
  x.save(); x.globalCompositeOperation = 'copy'; x.drawImage(S.base, 0, 0); x.globalCompositeOperation = 'source-over';
  x.globalAlpha = PS.o.opacity;
  if (PS.qm || S.T.isMask) { const adds = id === 'psEraser' ? psLum(PS.fg) < 0.5 : psLum(PS.fg) >= 0.5; x.globalCompositeOperation = adds ? 'source-over' : 'destination-out'; x.drawImage(m, 0, 0); }
  else if (id === 'psBrush' || id === 'psPencil') { x.globalCompositeOperation = PS.o.mode; x.drawImage(m, 0, 0); }
  else if (id === 'psEraser') { x.globalCompositeOperation = 'destination-out'; x.drawImage(m, 0, 0); }
  else if (id === 'psSpotHeal') { const t = S.t2 || (S.t2 = canvasEl(W, H)), tx = t.getContext('2d'); tx.globalCompositeOperation = 'copy'; tx.drawImage(m, 0, 0); tx.globalCompositeOperation = 'source-in'; tx.fillStyle = '#000'; tx.fillRect(0, 0, W, H); x.globalAlpha = 0.35; x.drawImage(t, 0, 0); }
  else if (id === 'psColorRep') {
    const t = S.t2 || (S.t2 = canvasEl(W, H)), tx = t.getContext('2d'), u = S.t3 || (S.t3 = canvasEl(W, H)), ux = u.getContext('2d');
    tx.globalCompositeOperation = 'copy'; tx.drawImage(m, 0, 0); tx.globalCompositeOperation = 'source-in'; tx.fillStyle = PS.fg; tx.fillRect(0, 0, W, H);
    ux.globalCompositeOperation = 'copy'; ux.drawImage(S.base, 0, 0); ux.globalCompositeOperation = 'color'; ux.drawImage(t, 0, 0);
    ux.globalCompositeOperation = 'destination-in'; ux.drawImage(S.base, 0, 0); ux.globalCompositeOperation = 'source-over';
    x.drawImage(u, 0, 0);
  } else {
    const t = S.t2 || (S.t2 = canvasEl(W, H)), tx = t.getContext('2d');
    tx.globalCompositeOperation = 'copy'; tx.drawImage(S.src, 0, 0); tx.globalCompositeOperation = 'destination-in'; tx.drawImage(m, 0, 0); tx.globalCompositeOperation = 'source-over';
    x.drawImage(t, 0, 0);
  }
  x.restore();
}
// tools that change the pixels under the brush directly (blur, sharpen, smudge, toning, background eraser, mixer)
function psRegionDab(S, cx, cy) {
  const cv = S.T.cv, W = cv.width, H = cv.height, r = S.r, n = Math.ceil(r * 2) + 1, x0 = Math.round(cx - r), y0 = Math.round(cy - r);
  const ctx = cv.getContext('2d'), id = ctx.getImageData(x0, y0, n, n), s = id.data, src = new Uint8ClampedArray(s), hard = PS.o.hard, str = PS.o.strength, tool = S.id;
  let o = null;
  if (tool === 'psBlur' || tool === 'psSharpen') o = psBoxBlur(src, n, n, Math.max(1, Math.round(r * 0.15)));
  if (tool === 'psSmudge' || tool === 'psMixer') {
    if (!S.carry) { S.carry = src; return; }
    o = S.carry;
    if (tool === 'psMixer') { const [fr, fg, fb] = psRGB(PS.fg); for (let i = 0; i < o.length; i += 4) { o[i] += (fr - o[i]) * 0.12; o[i + 1] += (fg - o[i + 1]) * 0.12; o[i + 2] += (fb - o[i + 2]) * 0.12; if (o[i + 3] < 255) o[i + 3] += (255 - o[i + 3]) * 0.12; } }
  }
  let cr = 0, cg = 0, cb = 0;
  if (tool === 'psBgEraser') { const j = ((n >> 1) * n + (n >> 1)) * 4; cr = src[j]; cg = src[j + 1]; cb = src[j + 2]; }
  const tol = PS.o.tol, exp = PS.o.exposure, range = PS.o.range;
  for (let py = 0; py < n; py++) for (let px = 0; px < n; px++) {
    const gx = x0 + px, gy = y0 + py; if (gx < 0 || gy < 0 || gx >= W || gy >= H) continue;
    const d = Math.hypot(px + 0.5 - (cx - x0), py + 0.5 - (cy - y0)) / r; if (d >= 1) continue;
    let f = psFall(d, hard); if (S.selData) f *= S.selData[(gy * W + gx) * 4 + 3] / 255; if (f <= 0) continue;
    const j = (py * n + px) * 4;
    if (tool === 'psBlur') { const k = f * str * 0.7; for (let c = 0; c < 4; c++) s[j + c] = src[j + c] + (o[j + c] - src[j + c]) * k; }
    else if (tool === 'psSharpen') { const k = f * str * 0.6; for (let c = 0; c < 3; c++) s[j + c] = src[j + c] + (src[j + c] - o[j + c]) * k; }
    else if (tool === 'psSmudge' || tool === 'psMixer') { const k = f * str; for (let c = 0; c < 4; c++) s[j + c] = src[j + c] + (o[j + c] - src[j + c]) * k; }
    else if (tool === 'psDodge' || tool === 'psBurn') {
      const L = (src[j] * 0.299 + src[j + 1] * 0.587 + src[j + 2] * 0.114) / 255;
      const w = range === 'shadows' ? (1 - L) ** 2 : range === 'highlights' ? L ** 2 : 1 - Math.abs(2 * L - 1) * 0.7, k = f * exp * w * 0.25;
      for (let c = 0; c < 3; c++) s[j + c] = tool === 'psDodge' ? src[j + c] + (255 - src[j + c]) * k : src[j + c] * (1 - k);
    } else if (tool === 'psSponge') {
      const g = src[j] * 0.299 + src[j + 1] * 0.587 + src[j + 2] * 0.114, k = 1 + (PS.o.sponge === 'sat' ? 1 : -1) * f * PS.o.flow * 0.2;
      for (let c = 0; c < 3; c++) s[j + c] = g + (src[j + c] - g) * k;
    } else if (tool === 'psBgEraser') {
      if (Math.abs(src[j] - cr) <= tol && Math.abs(src[j + 1] - cg) <= tol && Math.abs(src[j + 2] - cb) <= tol) s[j + 3] = src[j + 3] * (1 - Math.min(1, f * 1.5));
    }
  }
  if (tool === 'psSmudge' || tool === 'psMixer') S.carry = new Uint8ClampedArray(s);
  ctx.putImageData(id, x0, y0);
}
function psBoxBlur(src, w, h, r) {
  const a = new Float32Array(src), b = new Float32Array(src.length);
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 4; c++) { let sum = 0, cnt = 0; for (let k = -r; k <= r; k++) { const xx = x + k; if (xx >= 0 && xx < w) { sum += a[(y * w + xx) * 4 + c]; cnt++; } } b[(y * w + x) * 4 + c] = sum / cnt; }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 4; c++) { let sum = 0, cnt = 0; for (let k = -r; k <= r; k++) { const yy = y + k; if (yy >= 0 && yy < h) { sum += b[(yy * w + x) * 4 + c]; cnt++; } } a[(y * w + x) * 4 + c] = sum / cnt; }
  }
  return a;
}
async function psStrokeUp() {
  const S = PS.stroke; if (!S) return; PS.stroke = null;
  if (S.raf) cancelAnimationFrame(S.raf);
  if (S.mask) psComposite(S);
  if (S.id === 'psHeal') psHealCompose(S.T.cv, S.base, S.src, psMaskSel(S), PS.o.opacity);
  if (S.id === 'psSpotHeal') {
    const m = psMaskSel(S), off = psBestOffset(S.base, m);
    S.T.cv.getContext('2d').drawImage(S.base, 0, 0);
    const x = S.T.cv.getContext('2d'); x.globalCompositeOperation = 'copy'; x.drawImage(S.base, 0, 0); x.globalCompositeOperation = 'source-over';
    if (off) psHealCompose(S.T.cv, S.base, psShifted(S.base, off), m, 1); else toast('Could not find a clean area nearby — try a smaller brush');
  }
  if (S.T.done) { S.T.touch(); S.T.done(); } else if (S.T.o) await psCommit(S.T.o); else psTouch(null);
}

// ---------------- healing: copy texture, take the colour of the surroundings ----------------
function psMaskBox(mask) {
  const w = mask.width, h = mask.height, d = mask.getContext('2d').getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, d };
}
function psShifted(base, off) { const t = canvasEl(base.width, base.height); t.getContext('2d').drawImage(base, -off.x, -off.y); return t; }
function psHealCompose(cv, base, src, mask, opacity = 1) {
  const W = cv.width, H = cv.height, mb = psMaskBox(mask); if (!mb) return;
  const pad = Math.ceil(Math.max(mb.w, mb.h) * 0.3) + 6, x0 = Math.max(0, mb.x - pad), y0 = Math.max(0, mb.y - pad);
  const w = Math.min(W, mb.x + mb.w + pad) - x0, h = Math.min(H, mb.y + mb.h + pad) - y0;
  const get = (c) => c.getContext('2d').getImageData(x0, y0, w, h);
  const B = get(base).data, Sd = get(src).data, M = get(mask).data;
  // the colour difference on the ring around the area, spread inside by a normalised blur (premultiplied alpha weighs it)
  const D = new ImageData(w, h), mean = [0, 0, 0]; let cnt = 0;
  for (let i = 0; i < M.length; i += 4) if (M[i + 3] < 8 && Sd[i + 3] > 0 && B[i + 3] > 0) {
    for (let c = 0; c < 3; c++) { const df = B[i + c] - Sd[i + c]; D.data[i + c] = psClamp(df / 2 + 128, 0, 255); mean[c] += df; }
    D.data[i + 3] = 255; cnt++;
  }
  if (cnt) for (let c = 0; c < 3; c++) mean[c] /= cnt;
  const dc = canvasEl(w, h); dc.getContext('2d').putImageData(D, 0, 0);
  const bc = canvasEl(w, h), bx = bc.getContext('2d'); bx.filter = `blur(${Math.max(3, Math.max(mb.w, mb.h) / 3)}px)`; bx.drawImage(dc, 0, 0); bx.drawImage(dc, 0, 0);
  const Db = bx.getImageData(0, 0, w, h).data, out = new ImageData(new Uint8ClampedArray(B), w, h), o = out.data;
  for (let i = 0; i < M.length; i += 4) {
    if (M[i + 3] < 1) continue;
    const a = (M[i + 3] / 255) * opacity;
    for (let c = 0; c < 3; c++) { const df = Db[i + 3] > 8 ? (Db[i + c] - 128) * 2 : mean[c]; o[i + c] = B[i + c] + (Sd[i + c] + df - B[i + c]) * a; }
    o[i + 3] = B[i + 3] + (Math.max(Sd[i + 3], B[i + 3]) - B[i + 3]) * a;
  }
  cv.getContext('2d').putImageData(out, x0, y0);
}
// the nearby offset whose surroundings match the area's surroundings best
function psBestOffset(base, mask) {
  const W = base.width, H = base.height, mb = psMaskBox(mask); if (!mb) return null;
  const Bd = base.getContext('2d').getImageData(0, 0, W, H).data, Md = mb.d, pad = 3 + Math.round(Math.max(mb.w, mb.h) * 0.1);
  const ring = []; const bx0 = mb.x - pad, by0 = mb.y - pad, bx1 = mb.x + mb.w + pad, by1 = mb.y + mb.h + pad;
  const step = Math.max(1, Math.round(Math.sqrt(((bx1 - bx0) * (by1 - by0)) / 1500)));
  for (let y = by0; y < by1; y += step) for (let x = bx0; x < bx1; x += step) if (x >= 0 && y >= 0 && x < W && y < H && Md[(y * W + x) * 4 + 3] < 8) ring.push(y * W + x);
  let best = null;
  for (const f of [1.15, 1.5, 2, 2.8, 3.8]) for (let a = 0; a < 16; a++) {
    const dx = Math.round(Math.cos((a * Math.PI) / 8) * f * (mb.w + pad)), dy = Math.round(Math.sin((a * Math.PI) / 8) * f * (mb.h + pad));
    if (bx0 + dx < 0 || by0 + dy < 0 || bx1 + dx > W || by1 + dy > H) continue;
    let sc = 0;
    for (const i of ring) { const j = i * 4, q = (i + dy * W + dx) * 4; sc += Math.abs(Bd[j] - Bd[q]) + Math.abs(Bd[j + 1] - Bd[q + 1]) + Math.abs(Bd[j + 2] - Bd[q + 2]) + Math.abs(Bd[j + 3] - Bd[q + 3]) * 2; }
    sc = sc / Math.max(1, ring.length) + f * 2;
    if (!best || sc < best.sc) best = { x: dx, y: dy, sc };
  }
  return best;
}
// fill the selection from its surroundings (Edit > Fill > Content-Aware, the patch / content-aware move tools)
function psContentFill(T, mask) {
  const base = psCopy(T.cv), off = psBestOffset(base, mask);
  if (!off) { toast('No clean area found around the selection', true); return false; }
  psHealCompose(T.cv, base, psShifted(base, off), mask, 1); return true;
}

// ---------------- other pixel tools ----------------
function psEyedrop(p, toBg) {
  const m = psMergedData(), W = m.cv.width, H = m.cv.height, n = PS.o.sample | 0 || 1, h = n >> 1;
  let r = 0, g = 0, b = 0, c = 0;
  for (let y = -h; y <= h; y++) for (let x = -h; x <= h; x++) {
    const px = Math.floor(p.x * m.k) + x, py = Math.floor(p.y * m.k) + y; if (px < 0 || py < 0 || px >= W || py >= H) continue;
    const j = (py * W + px) * 4; r += m.data[j]; g += m.data[j + 1]; b += m.data[j + 2]; c++;
  }
  if (!c) return;
  const hex = psToHex(r / c, g / c, b / c);
  if (toBg) PS.bg = hex; else PS.fg = hex;
  ED.recentColors = [hex, ...(ED.recentColors || []).filter((x) => x !== hex)].slice(0, 8);
  psColors(); toast(`${toBg ? 'Background' : 'Foreground'} ${hex}`);
}
function psHitObj(p) { return ED.canvas.getObjects().slice().reverse().find((o) => !o.isPage && o.visible !== false && !o.fromMaster && o.containsPoint(p)); }
async function psBucket(p, e, erase) {
  const hit = psHitObj(p);
  if (hit && !isRaster(hit)) {
    if (erase) { PS.layer = hit; psTarget(); return; }
    if (hit.type === 'line' || (hit.type === 'path' && !hit.fill)) hit.set('stroke', PS.fg); else if (hit.type === 'group') hit.getObjects().forEach((o) => o.set('fill', PS.fg)); else hit.set('fill', PS.fg);
    ED.canvas.requestRenderAll(); scheduleHistory(); return;
  }
  if (!hit && !erase && !PS.sel) { pageRect().set('fill', PS.fg); ED.canvas.requestRenderAll(); scheduleHistory(); return; }
  if (hit) PS.layer = hit;
  const T = psTarget({ noQM: true }); if (!T) return;
  const lp = psTp(T.m, p), W = T.cv.width, H = T.cv.height, x = T.cv.getContext('2d'), id = x.getImageData(0, 0, W, H), d = id.data;
  const m = psFlood(d, W, H, lp.x, lp.y, PS.o.tol, PS.o.contiguous);
  const sel = PS.sel ? psSelLocal(T).getContext('2d').getImageData(0, 0, W, H).data : null, [fr, fg, fb] = psRGB(PS.fg), op = PS.o.opacity;
  for (let i = 0; i < m.length; i++) {
    if (!m[i]) continue;
    const j = i * 4, a = (sel ? sel[j + 3] / 255 : 1) * op; if (!a) continue;
    if (erase) d[j + 3] *= 1 - a;
    else { d[j] += (fr - d[j]) * a; d[j + 1] += (fg - d[j + 1]) * a; d[j + 2] += (fb - d[j + 2]) * a; d[j + 3] += (255 - d[j + 3]) * a; }
  }
  x.putImageData(id, 0, 0); await psCommit(T.o);
}
async function psRedEye(p) {
  const T = psTarget({ noQM: true, noNew: true }); if (!T) return toast('Select the photo layer first');
  const lp = psTp(T.m, p), r = Math.max(4, (PS.o.size / 2) * T.k), x0 = Math.round(lp.x - r), y0 = Math.round(lp.y - r), n = Math.ceil(r * 2);
  const x = T.cv.getContext('2d'), id = x.getImageData(x0, y0, n, n), d = id.data; let hits = 0;
  for (let i = 0; i < d.length; i += 4) {
    const px = (i / 4) % n, py = (i / 4 / n) | 0; if (Math.hypot(px - n / 2, py - n / 2) > r) continue;
    const R = d[i], G = d[i + 1], B = d[i + 2];
    if (R > 60 && R > G * 1.5 && R > B * 1.5) { const v = (G + B) / 2 * 0.8; d[i] = v; d[i + 1] = G * 0.85; d[i + 2] = B * 0.85; hits++; }
  }
  x.putImageData(id, x0, y0);
  if (!hits) toast('No red eye found there'); else await psCommit(T.o);
}
// gradient
const PS_SPECTRUM = ['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ff0000'];
function psGradStops() {
  const c = PS.o.gradColors, st = c === 'fgtr' ? [PS.fg, psHexA(PS.fg, 0)] : c === 'bw' ? ['#000000', '#ffffff'] : c === 'spectrum' ? PS_SPECTRUM.slice() : [PS.fg, PS.bg];
  return PS.o.gradReverse ? st.reverse() : st;
}
function psGradDraw(G) {
  const cv = G.T.cv, W = cv.width, H = cv.height, a = psTp(G.T.m, G.a), b = psTp(G.T.m, G.b), stops = psGradStops();
  const t = G.t || (G.t = canvasEl(W, H)), x = t.getContext('2d'), len = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)), type = PS.o.gradType;
  x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, W, H);
  const add = (g, list, from = 0, to = 1) => list.forEach((s, i) => g.addColorStop(from + ((to - from) * i) / (list.length - 1), s));
  if (type === 'diamond') {
    const id = x.createImageData(W, H), ux = (b.x - a.x) / len, uy = (b.y - a.y) / len, cols = stops.map((s) => { const c = new fabric.Color(s).getSource(); return [c[0], c[1], c[2], c[3] * 255]; });
    for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
      const dx = px - a.x, dy = py - a.y, tt = Math.min(1, (Math.abs(dx * ux + dy * uy) + Math.abs(-dx * uy + dy * ux)) / len) * (cols.length - 1);
      const k = Math.min(cols.length - 2, Math.floor(tt)), f = tt - k, j = (py * W + px) * 4;
      for (let c = 0; c < 4; c++) id.data[j + c] = cols[k][c] + (cols[k + 1][c] - cols[k][c]) * f;
    }
    x.putImageData(id, 0, 0);
  } else {
    let g;
    if (type === 'radial') { g = x.createRadialGradient(a.x, a.y, 0, a.x, a.y, len); add(g, stops); }
    else if (type === 'angle') { g = x.createConicGradient(Math.atan2(b.y - a.y, b.x - a.x), a.x, a.y); add(g, stops); }
    else if (type === 'reflected') { g = x.createLinearGradient(2 * a.x - b.x, 2 * a.y - b.y, b.x, b.y); add(g, stops.slice().reverse(), 0, 0.5); add(g, stops, 0.5, 1); }
    else { g = x.createLinearGradient(a.x, a.y, b.x, b.y); add(g, stops); }
    x.fillStyle = g; x.fillRect(0, 0, W, H);
  }
  if (G.T.isMask) { const id = x.getImageData(0, 0, W, H), d = id.data; for (let i = 0; i < d.length; i += 4) { const a = ((d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) * d[i + 3]) / 255; d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = a; } x.putImageData(id, 0, 0); }
  if (G.sel) { x.globalCompositeOperation = 'destination-in'; x.drawImage(G.sel, 0, 0); x.globalCompositeOperation = 'source-over'; }
  const cx = cv.getContext('2d'); cx.save(); cx.globalCompositeOperation = 'copy'; cx.drawImage(G.base, 0, 0);
  if (G.T.isMask) { cx.globalCompositeOperation = 'destination-out'; if (G.sel) cx.drawImage(G.sel, 0, 0); else cx.fillRect(0, 0, W, H); cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = PS.o.opacity; cx.drawImage(t, 0, 0); }
  else { cx.globalCompositeOperation = PS.o.mode; cx.globalAlpha = PS.o.opacity; cx.drawImage(t, 0, 0); }
  cx.restore();
  G.T.touch ? G.T.touch() : psTouch(G.T.o);
}
// selection outline / fill helpers used by menus and keys
async function psFillSel(color, opts = {}) {
  const T = psTarget({ noQM: true }); if (!T) return;
  if (T.isMask) { // on a mask: white shows, black hides, grey partly
    const x = T.cv.getContext('2d'), m = PS.sel ? psSelLocal(T) : null, a = color === 'content' || color === 'pattern' ? 1 : psLum(color);
    x.save(); x.globalCompositeOperation = 'destination-out'; if (m) x.drawImage(m, 0, 0); else x.fillRect(0, 0, T.cv.width, T.cv.height);
    const t = canvasEl(T.cv.width, T.cv.height), tx = t.getContext('2d'); tx.fillStyle = `rgba(255,255,255,${a})`; tx.fillRect(0, 0, t.width, t.height); if (m) { tx.globalCompositeOperation = 'destination-in'; tx.drawImage(m, 0, 0); }
    x.globalCompositeOperation = 'source-over'; x.drawImage(t, 0, 0); x.restore(); T.touch(); T.done(); return;
  }
  const x = T.cv.getContext('2d'), W = T.cv.width, H = T.cv.height, mask = PS.sel ? psSelLocal(T) : null;
  if (color === 'content') { if (!mask) return toast('Select the area to fill first'); psContentFill(T, mask); return psCommit(T.o); }
  const t = canvasEl(W, H), tx = t.getContext('2d');
  if (color === 'pattern') tx.drawImage(psPattern(PS.o.pattern, W, H), 0, 0); else { tx.fillStyle = color; tx.fillRect(0, 0, W, H); }
  if (mask) { tx.globalCompositeOperation = 'destination-in'; tx.drawImage(mask, 0, 0); }
  else if (opts.preserve) { tx.globalCompositeOperation = 'destination-in'; tx.drawImage(psCopy(T.cv), 0, 0); }
  x.save(); x.globalAlpha = opts.opacity ?? 1; x.globalCompositeOperation = opts.mode || 'source-over'; x.drawImage(t, 0, 0); x.restore();
  await psCommit(T.o);
}
async function psStrokeSel(color, width, where = 'center') {
  if (!PS.sel) return toast('Make a selection first');
  const s0 = PS.sel, r = width * s0.k, src = s0.cv, ring = canvasEl(src.width, src.height), x = ring.getContext('2d');
  const grow = (rad) => { const t = canvasEl(src.width, src.height), tx = t.getContext('2d'); for (let a = 0; a < 24; a++) tx.drawImage(src, Math.cos((a * Math.PI) / 12) * rad, Math.sin((a * Math.PI) / 12) * rad); tx.drawImage(src, 0, 0); return t; };
  const shrink = (rad) => { const inv = canvasEl(src.width, src.height), ix = inv.getContext('2d'); ix.fillStyle = '#fff'; ix.fillRect(0, 0, inv.width, inv.height); ix.globalCompositeOperation = 'destination-out'; ix.drawImage(src, 0, 0);
    const t = canvasEl(src.width, src.height), tx = t.getContext('2d'); tx.fillStyle = '#fff'; tx.fillRect(0, 0, t.width, t.height); tx.globalCompositeOperation = 'destination-out'; for (let a = 0; a < 24; a++) tx.drawImage(inv, Math.cos((a * Math.PI) / 12) * rad, Math.sin((a * Math.PI) / 12) * rad); return t; };
  const outer = where === 'inside' ? src : grow(where === 'center' ? r / 2 : r), inner = where === 'outside' ? src : shrink(where === 'center' ? r / 2 : r);
  x.drawImage(outer, 0, 0); x.globalCompositeOperation = 'destination-out'; x.drawImage(inner, 0, 0);
  const keep = PS.sel; PS.sel = { cv: ring, k: s0.k }; await psFillSel(color); PS.sel = keep; ED.canvas.requestRenderAll();
}
async function psClearSel() {
  if (PS.maskEdit && PS.sel) { await psFillSel('#000000'); return true; }
  const o = PS.layer; if (!PS.sel || !isRaster(o) || !psLive(o)) return false;
  const T = psTarget({ noQM: true, noNew: true }); if (!T) return true;
  const x = T.cv.getContext('2d'); x.save(); x.globalCompositeOperation = 'destination-out'; x.drawImage(psSelLocal(T), 0, 0); x.restore();
  await psCommit(T.o); return true;
}
async function psLayerVia(cut) {
  if (!PS.sel) { const o = PS.layer; if (o && psLive(o)) { ED.canvas.setActiveObject(o); duplicateSel(); } return; }
  const T = psTarget({ noQM: true, noNew: true }); if (!T) return toast('Select a pixel layer first');
  const mask = psSelLocal(T), cp = psCopy(T.cv), cx = cp.getContext('2d');
  cx.globalCompositeOperation = 'destination-in'; cx.drawImage(mask, 0, 0);
  const o = T.o, img = new fabric.Image(cp, { left: o.left, top: o.top, scaleX: o.scaleX, scaleY: o.scaleY, angle: o.angle, flipX: o.flipX, flipY: o.flipY, originX: o.originX, originY: o.originY,
    skewX: o.skewX, skewY: o.skewY, cropX: o.cropX, cropY: o.cropY, width: o.width, height: o.height, name: `${o.name || 'Layer'} ${cut ? 'cut' : 'copy'}`, id: uid() });
  img._psCv = cp; img._psHist = psCopy(cp);
  if (cut) { const x = T.cv.getContext('2d'); x.save(); x.globalCompositeOperation = 'destination-out'; x.drawImage(mask, 0, 0); x.restore(); psTouch(o); }
  const c = ED.canvas; c.insertAt(img, c.getObjects().indexOf(o) + 1);
  PS.layer = img; psSelSet(null); await psCommit(img); if (cut) await psCommit(o);
  toast(cut ? 'Layer via cut' : 'Layer via copy');
}

// ---------------- perspective (crop & transform) ----------------
function psHomog(src, dst) { // 4 points -> 4 points, returns [a..h] for x' = (ax+by+c)/(gx+hy+1)
  const A = [], B = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i], { x: u, y: v } = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); B.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); B.push(v);
  }
  for (let c = 0; c < 8; c++) { // gaussian elimination
    let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; [B[c], B[p]] = [B[p], B[c]];
    for (let r = c + 1; r < 8; r++) { const f = A[r][c] / A[c][c]; for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k]; B[r] -= f * B[c]; }
  }
  const h = new Array(8);
  for (let r = 7; r >= 0; r--) { let s = B[r]; for (let k = r + 1; k < 8; k++) s -= A[r][k] * h[k]; h[r] = s / A[r][r]; }
  return h;
}
// out canvas (w x h): every pixel inside dstQuad samples src at the matching point of srcQuad
function psWarp(src, srcQuad, dstQuad, w, h) {
  const H = psHomog(dstQuad, srcQuad), sw = src.width, sh = src.height, sd = src.getContext('2d').getImageData(0, 0, sw, sh).data;
  const out = canvasEl(Math.max(1, Math.round(w)), Math.max(1, Math.round(h))), x = out.getContext('2d'), id = x.createImageData(out.width, out.height), d = id.data;
  for (let py = 0; py < out.height; py++) for (let px = 0; px < out.width; px++) {
    const X = px + 0.5, Y = py + 0.5, z = H[6] * X + H[7] * Y + 1, u = (H[0] * X + H[1] * Y + H[2]) / z - 0.5, v = (H[3] * X + H[4] * Y + H[5]) / z - 0.5;
    if (u < -0.5 || v < -0.5 || u > sw - 0.5 || v > sh - 0.5) continue;
    const x0 = psClamp(Math.floor(u), 0, sw - 1), y0 = psClamp(Math.floor(v), 0, sh - 1), x1 = Math.min(sw - 1, x0 + 1), y1 = Math.min(sh - 1, y0 + 1), fx = psClamp(u - x0, 0, 1), fy = psClamp(v - y0, 0, 1);
    const j = (py * out.width + px) * 4, a = (y0 * sw + x0) * 4, b = (y0 * sw + x1) * 4, c = (y1 * sw + x0) * 4, e = (y1 * sw + x1) * 4;
    for (let k = 0; k < 4; k++) d[j + k] = (sd[a + k] * (1 - fx) + sd[b + k] * fx) * (1 - fy) + (sd[c + k] * (1 - fx) + sd[e + k] * fx) * fy;
  }
  x.putImageData(id, 0, 0); return out;
}
function psQuadStart(mode) {
  const o = PS.layer;
  if (!isRaster(o) || !psLive(o)) { toast('Select a photo / pixel layer first (rasterize other layers)', true); return false; }
  const m = psL2D(o), cx = o.cropX || 0, cy = o.cropY || 0, W = o.width, H = o.height;
  PS.quad = { mode, o, pts: mode === 'warp' ? [[cx, cy], [cx + W, cy], [cx + W, cy + H], [cx, cy + H]].map(([x, y]) => psTp(m, { x, y })) : [] };
  ED.canvas.discardActiveObject(); ED.canvas.requestRenderAll(); return true;
}
async function psQuadApply() {
  const Q = PS.quad; if (!Q || Q.pts.length < 4) return toast('Place all 4 corners first');
  const o = Q.o; psPrepare(o); const T = { m: psD2L(o) }, k = psDet(T.m), src = o._psCv;
  if (Q.mode === 'crop') {
    const L = Q.pts.map((p) => psTp(T.m, p)), d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const w = (d(L[0], L[1]) + d(L[3], L[2])) / 2, h = (d(L[0], L[3]) + d(L[1], L[2])) / 2;
    const out = psWarp(src, L, [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }], w, h);
    const b = { x: Math.min(...Q.pts.map((p) => p.x)), y: Math.min(...Q.pts.map((p) => p.y)) };
    psSetElement(o, out); o.set({ left: b.x, top: b.y, angle: 0, scaleX: 1 / k, scaleY: 1 / k, skewX: 0, skewY: 0, flipX: false, flipY: false, originX: 'left', originY: 'top' });
  } else {
    const cx = o.cropX || 0, cy = o.cropY || 0, srcQ = [{ x: cx, y: cy }, { x: cx + o.width, y: cy }, { x: cx + o.width, y: cy + o.height }, { x: cx, y: cy + o.height }];
    const bx = Math.min(...Q.pts.map((p) => p.x)), by = Math.min(...Q.pts.map((p) => p.y)), bw = Math.max(...Q.pts.map((p) => p.x)) - bx, bh = Math.max(...Q.pts.map((p) => p.y)) - by;
    const out = psWarp(src, srcQ, Q.pts.map((p) => ({ x: (p.x - bx) * k, y: (p.y - by) * k })), bw * k, bh * k);
    psSetElement(o, out); o.set({ left: bx, top: by, angle: 0, scaleX: 1 / k, scaleY: 1 / k, skewX: 0, skewY: 0, flipX: false, flipY: false, originX: 'left', originY: 'top' });
  }
  PS.quad = null; o.setCoords(); await psCommit(o); toast(Q.mode === 'crop' ? 'Perspective cropped' : 'Transformed');
}

// ---------------- artboard: crop / shift / scale everything ----------------
function psShiftAll(dx, dy) {
  ED.canvas.discardActiveObject();
  ED.canvas.getObjects().forEach((o) => { if (o.isPage) return; o.left += dx; o.top += dy; if (o.clipPath?.absolutePositioned) { o.clipPath.left += dx; o.clipPath.top += dy; } o.setCoords(); });
  const pg = ED.project.pages[ED.pageIndex]; ['notes', 'counts', 'slices'].forEach((k) => (pg[k] || []).forEach((n) => { n.x += dx; n.y += dy; }));
}
function psCropTo(r) {
  r = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) };
  if (r.w < 2 || r.h < 2) return toast('The crop is too small');
  psShiftAll(-r.x, -r.y); PS.crop = null; psSelSet(null); resizeProject(r.w, r.h); toast(`Cropped to ${r.w} × ${r.h}`);
}

// ---------------- view: rotate & zoom ----------------
function psViewAt(screen, design, z, deg) {
  const c = ED.canvas, a = (deg * Math.PI) / 180, cs = Math.cos(a) * z, sn = Math.sin(a) * z;
  c.setViewportTransform([cs, sn, -sn, cs, screen.x - (cs * design.x - sn * design.y), screen.y - (sn * design.x + cs * design.y)]); updateClip();
}
function psSetViewAngle(deg) {
  const c = ED.canvas, ctr = new fabric.Point(c.width / 2, c.height / 2), d = psTp(fabric.util.invertTransform(c.viewportTransform), ctr);
  deg = ((deg % 360) + 540) % 360 - 180; PS.viewAngle = Math.abs(deg) < 0.01 ? 0 : deg;
  psViewAt(ctr, d, ED.zoom, PS.viewAngle); psBar();
}
const _setZoomPS = setZoom;
setZoom = function (z, keepCenter = true, point) {
  if (!PS.viewAngle) return _setZoomPS(z, keepCenter, point);
  if (keepCenter === false && !point) { PS.viewAngle = 0; return _setZoomPS(z, keepCenter, point); } // fit to screen straightens the view
  const c = ED.canvas; z = Math.max(0.02, Math.min(32, z));
  const pt = point || new fabric.Point(c.width / 2, c.height / 2), d = psTp(fabric.util.invertTransform(c.viewportTransform), pt);
  ED.zoom = z; psViewAt(pt, d, z, PS.viewAngle); ED.emit('zoom');
};
function psZoomRect(a, b) {
  const c = ED.canvas, w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y), z = Math.max(0.02, Math.min(32, Math.min(c.width / w, c.height / h) * 0.92));
  ED.zoom = z; psViewAt(new fabric.Point(c.width / 2, c.height / 2), { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, z, PS.viewAngle); ED.emit('zoom');
}

// ---------------- custom shapes & curvature pen ----------------
const PS_SHAPES = {
  heart: 'M50 92C22 72 0 54 0 30 0 13 13 2 28 2c10 0 18 6 22 14C54 8 62 2 72 2c15 0 28 11 28 28 0 24-22 42-50 62z',
  arrow: 'M0 35H58V8l42 42-42 42V65H0z', bubble: 'M12 0h76c7 0 12 5 12 12v46c0 7-5 12-12 12H42L18 96l6-26H12C5 70 0 65 0 58V12C0 5 5 0 12 0z',
  check: 'M0 56l15-15 23 22L85 10l15 15-62 66z', bolt: 'M62 0L8 58h36L32 100l60-62H56z', plus: 'M35 0h30v35h35v30H65v35H35V65H0V35h35z',
  burst: (() => { let d = ''; for (let i = 0; i < 24; i++) { const a = (i * Math.PI) / 12 - Math.PI / 2, r = i % 2 ? 36 : 50; d += `${i ? 'L' : 'M'}${(50 + r * Math.cos(a)).toFixed(1)} ${(50 + r * Math.sin(a)).toFixed(1)}`; } return d + 'z'; })(),
  ribbon: 'M0 20h100L86 50l14 30H0l14-30z', tag: 'M0 0h66l34 50-34 50H0z', cloud: 'M25 85C11 85 0 75 0 62s10-22 22-22C24 26 36 15 50 15c12 0 22 8 26 19 13 0 24 10 24 25 0 14-11 26-25 26z',
};
function psCurvD(pts, closed, extra) {
  const all = extra ? [...pts, extra] : pts; if (all.length < 2) return '';
  const P = (i) => (closed ? all[(i + all.length) % all.length] : all[psClamp(i, 0, all.length - 1)]);
  let d = `M ${all[0].x} ${all[0].y}`; const n = closed ? all.length : all.length - 1;
  for (let i = 0; i < n; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    d += ` C ${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6} ${p2.x - (p3.x - p1.x) / 6} ${p2.y - (p3.y - p1.y) / 6} ${p2.x} ${p2.y}`;
  }
  return d + (closed ? ' Z' : '');
}
function psCurvFinish(closed) {
  const C = PS.curv; PS.curv = null; if (!C || C.pts.length < 2) { ED.canvas.requestRenderAll(); return; }
  const path = new fabric.Path(psCurvD(C.pts, closed), { fill: closed ? PS.fg : null, stroke: closed ? null : PS.fg, strokeWidth: closed ? 0 : 4, strokeLineCap: 'round', strokeLineJoin: 'round', name: closed ? 'Curvature shape' : 'Curvature path', id: uid() });
  ED.canvas.add(path); ED.canvas.requestRenderAll();
}

// ---------------- notes / count / slices storage ----------------
const psPage = () => ED.project.pages[ED.pageIndex];
function psPrompt(title, value, at) {
  return new Promise((done) => {
    $('#psPrompt')?.remove();
    const v = ED.canvas.viewportTransform, s = at ? psTp(v, at) : { x: 200, y: 120 }, box = document.createElement('div');
    box.id = 'psPrompt'; box.className = 'ps-prompt';
    box.innerHTML = `<b>${esc(title)}</b><textarea rows="3">${esc(value || '')}</textarea><div><button class="btn ghost" data-x>Cancel</button><button class="btn primary" data-ok>OK</button></div>`;
    $('#stage').appendChild(box);
    box.style.left = Math.min($('#stage').clientWidth - 260, Math.max(8, s.x + 12)) + 'px'; box.style.top = Math.min($('#stage').clientHeight - 150, Math.max(8, s.y + 12)) + 'px';
    const ta = $('textarea', box), end = (r) => { box.remove(); done(r); };
    setTimeout(() => ta.focus(), 0);
    ta.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); end(ta.value); } if (e.key === 'Escape') end(null); };
    $('[data-ok]', box).onclick = () => end(ta.value); $('[data-x]', box).onclick = () => end(null);
  });
}
function psSaveMarks() { markDirty(); ED.canvas.requestRenderAll(); psBar(); }
async function psExportSlices() {
  const sl = psPage().slices || []; if (!sl.length) return toast('Draw slices with the Slice tool first');
  const objs = ED.canvas.getObjects();
  for (let i = 0; i < sl.length; i++) {
    const s = sl[i], cv = psRender(objs, s.x, s.y, s.w, s.h, 1);
    const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
    dl(blob, `${ED.project.name}_slice_${String(i + 1).padStart(2, '0')}.png`);
  }
  toast(`${sl.length} slice${sl.length > 1 ? 's' : ''} exported`);
}

// ---------------- mouse ----------------
const psNear = (a, b, px = 8) => Math.hypot(a.x - b.x, a.y - b.y) < px / ED.zoom;
function psCropHandle(p) {
  const r = PS.crop; if (!r) return null;
  const xs = { w: r.x, c: r.x + r.w / 2, e: r.x + r.w }, ys = { n: r.y, m: r.y + r.h / 2, s: r.y + r.h };
  for (const [hy, y] of Object.entries(ys)) for (const [hx, x] of Object.entries(xs)) { if (hy === 'm' && hx === 'c') continue; if (psNear(p, { x, y }, 10)) return (hy === 'm' ? '' : hy) + (hx === 'c' ? '' : hx); }
  return p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h ? 'move' : null;
}
const PS_RATIOS = { free: 0, '1:1': 1, '4:5': 0.8, '5:4': 1.25, '16:9': 16 / 9, '9:16': 9 / 16, '3:2': 1.5, '2:3': 2 / 3, '4:3': 4 / 3, artboard: -1 };
function psCropDrag(D, p, e) {
  const r = { ...D.r }, h = D.h, dx = p.x - D.start.x, dy = p.y - D.start.y;
  let ratio = PS_RATIOS[PS.o.ratio] || 0; if (ratio === -1) ratio = ED.project.width / ED.project.height; if (e.shiftKey && !ratio) ratio = D.r.w / D.r.h;
  if (h === 'move') { r.x += dx; r.y += dy; }
  else if (h === 'new') { r.x = Math.min(D.start.x, p.x); r.y = Math.min(D.start.y, p.y); r.w = Math.abs(dx); r.h = Math.abs(dy); if (ratio) { r.h = r.w / ratio; if (p.y < D.start.y) r.y = D.start.y - r.h; } }
  else {
    if (h.includes('w')) { r.x += dx; r.w -= dx; } if (h.includes('e')) r.w += dx;
    if (h.includes('n')) { r.y += dy; r.h -= dy; } if (h.includes('s')) r.h += dy;
    if (ratio) { if (h === 'n' || h === 's') r.w = r.h * ratio; else { const nh = r.w / ratio; if (h.includes('n')) r.y += r.h - nh; r.h = nh; } }
    if (r.w < 0) { r.x += r.w; r.w = -r.w; } if (r.h < 0) { r.y += r.h; r.h = -r.h; }
  }
  PS.crop = r;
}
function psDown(opt) {
  const e = opt.e, c = ED.canvas;
  if (ED.mode !== 'design' || !ED.project || e.button !== 0 || ED.spaceDown || panState) return;
  const id = PS.cur, p = c.getPointer(e);
  if (PS.nodeMode === 'del' && ED.tool === 'node' && VN.drag?.part === 'a' && VN.edit) { // after vector.js picked the point
    const E = VN.edit, sub = E.subs[VN.drag.s]; sub.nodes.splice(VN.drag.i, 1); VN.drag = null; E.sel = null;
    E.subs = E.subs.filter((s) => s.nodes.length > 1);
    if (!E.subs.length) { c.remove(E.obj); VN.edit = null; } else rebuild(E);
    scheduleHistory(); c.requestRenderAll(); return;
  }
  if (PS_PAINT.has(id)) return psStrokeDown(p, e);
  const mode = psModeOf(e);
  switch (id) {
    case 'psRectSel': case 'psEllSel': case 'psLasso': case 'psMagLasso': case 'psObjSel': {
      if (PS.sel && mode === PS.o.selMode && mode === 'new' && !e.shiftKey && !e.altKey && id !== 'psObjSel') {
        const k = PS.sel.k, d = PS.sel.cv.getContext('2d').getImageData(Math.floor(p.x * k), Math.floor(p.y * k), 1, 1).data;
        if (d[3] > 127) { PS.drag = { moveSel: true, start: p, d: { x: 0, y: 0 } }; return; }
      }
      PS.drag = { id, mode, start: p, end: p, pts: [p], shift0: e.shiftKey };
      if (id === 'psMagLasso') PS.drag.m = psMergedData();
      return;
    }
    case 'psRowSel': case 'psColSel': {
      const W = ED.project.width, H = ED.project.height, r = id === 'psRowSel' ? { x: 0, y: Math.floor(p.y), w: W, h: 1 } : { x: Math.floor(p.x), y: 0, w: 1, h: H };
      return psSelCommit(psShape((x) => x.fillRect(r.x, r.y, r.w, r.h)), mode, [rectPts({ x: r.x, y: r.y }, { x: r.x + r.w, y: r.y + r.h })]);
    }
    case 'psPolyLasso':
      if (!PS.poly) PS.poly = { pts: [p], mode };
      else if (PS.poly.pts.length > 2 && psNear(p, PS.poly.pts[0])) psPolyClose();
      else PS.poly.pts.push(p);
      c.requestRenderAll(); return;
    case 'psWand': return psWandAt(p, mode);
    case 'psQuickSel': {
      const m = psMergedData(), s = psSelCanvas();
      PS.drag = { quick: true, mode: e.shiftKey || e.altKey ? mode : PS.sel ? 'add' : 'new', m, s, last: null };
      psQuickDab(p); return;
    }
    case 'psCrop': {
      if (!PS.crop) PS.crop = { x: 0, y: 0, w: ED.project.width, h: ED.project.height };
      const h = psCropHandle(p) || 'new'; PS.drag = { crop: true, h, start: p, r: { ...PS.crop } }; return;
    }
    case 'psPerspCrop': {
      if (!PS.quad || PS.quad.mode !== 'crop') { const hit = psHitObj(p); if (isRaster(hit)) PS.layer = hit; if (!psQuadStart('crop')) return; }
      const Q = PS.quad, i = Q.pts.findIndex((q) => psNear(p, q, 10));
      if (i >= 0) PS.drag = { quadPt: i }; else if (Q.pts.length < 4) { Q.pts.push(p); if (Q.pts.length === 4) toast('Drag the corners onto the edges · Enter = crop'); }
      c.requestRenderAll(); return;
    }
    case 'psSlice': PS.drag = { box: 'slice', start: p, end: p }; return;
    case 'psSliceSel': {
      const sl = psPage().slices || []; PS.sliceSel = sl.findIndex((s) => p.x >= s.x && p.x <= s.x + s.w && p.y >= s.y && p.y <= s.y + s.h);
      if (PS.sliceSel >= 0) PS.drag = { moveSlice: PS.sliceSel, start: p, o: { ...sl[PS.sliceSel] } };
      c.requestRenderAll(); return;
    }
    case 'psFrame': case 'psArtboard': case 'psCustom': PS.drag = { box: id, start: p, end: p }; return;
    case 'psEyedrop': return psEyedrop(p, e.altKey);
    case 'psSampler': {
      if (e.altKey) { const i = PS.samplers.findIndex((s) => psNear(p, s, 12)); if (i >= 0) PS.samplers.splice(i, 1); }
      else if (PS.samplers.length < 10) PS.samplers.push({ x: p.x, y: p.y }); else toast('10 samplers at most');
      psBar(); c.requestRenderAll(); return;
    }
    case 'psRuler': PS.ruler = { a: p, b: p }; PS.drag = { ruler: true }; return;
    case 'psNote': {
      const pg = psPage(), list = pg.notes || (pg.notes = []), i = list.findIndex((n) => psNear(p, n, 12));
      psPrompt(i >= 0 ? 'Edit note (empty = delete)' : 'New note', i >= 0 ? list[i].text : '', p).then((t) => {
        if (t === null) return; if (i >= 0) { if (t.trim()) list[i].text = t; else list.splice(i, 1); } else if (t.trim()) list.push({ x: p.x, y: p.y, text: t });
        psSaveMarks();
      });
      return;
    }
    case 'psCount': {
      const pg = psPage(), list = pg.counts || (pg.counts = []);
      if (e.altKey) { const i = list.findIndex((n) => psNear(p, n, 12)); if (i >= 0) list.splice(i, 1); } else list.push({ x: p.x, y: p.y });
      return psSaveMarks();
    }
    case 'psPatch': case 'psCAMove': {
      if (PS.sel) { const k = PS.sel.k, d = PS.sel.cv.getContext('2d').getImageData(Math.floor(p.x * k), Math.floor(p.y * k), 1, 1).data; if (d[3] > 127) { PS.drag = { patch: id, start: p, d: { x: 0, y: 0 } }; return; } }
      PS.drag = { id: 'psLasso', mode, start: p, end: p, pts: [p] }; return;
    }
    case 'psRedEye': return psRedEye(p);
    case 'psGradient': {
      if (PS.qm) return toast('Leave Quick Mask (Q) to draw a gradient');
      if (PS.maskEdit) { const T = psTarget(); if (!T) return; PS.grad = { T, a: p, b: p, base: psCopy(T.cv), sel: PS.sel ? psSelLocal(T) : null }; return; }
      const T = psTarget(); if (!T) return; c.discardActiveObject();
      PS.grad = { T, a: p, b: p, base: psCopy(T.cv), sel: PS.sel ? psSelLocal(T) : null }; return;
    }
    case 'psBucket': return psBucket(p, e, false);
    case 'psMagicEraser': return psBucket(p, e, true);
    case 'psVText': case 'psHMask': case 'psVMask': return psTypeAt(p, id);
    case 'psCurvPen':
      if (!PS.curv) PS.curv = { pts: [p] };
      else if (PS.curv.pts.length > 2 && psNear(p, PS.curv.pts[0])) psCurvFinish(true);
      else PS.curv.pts.push(p);
      c.requestRenderAll(); return;
    case 'psRotView': { const ctr = { x: c.width / 2, y: c.height / 2 }, s = c.getPointer(e, true); PS.drag = { rot: true, a0: Math.atan2(s.y - ctr.y, s.x - ctr.x), ang: PS.viewAngle, ctr }; return; }
    case 'psZoom': PS.drag = { zoom: true, start: p, end: p, s: c.getPointer(e, true), alt: e.altKey }; return;
  }
}
function psMove(opt) {
  if (ED.mode !== 'design' || !ED.project) return;
  const c = ED.canvas, p = c.getPointer(opt.e), e = opt.e, D = PS.drag;
  PS.mouse = p;
  if (PS.stroke) return psStrokeMove(p);
  if (PS.grad) { let b = p; if (e.shiftKey) { const a = PS.grad.a, ang = Math.round(Math.atan2(p.y - a.y, p.x - a.x) / (Math.PI / 4)) * (Math.PI / 4), l = Math.hypot(p.x - a.x, p.y - a.y); b = { x: a.x + l * Math.cos(ang), y: a.y + l * Math.sin(ang) }; } PS.grad.b = b; psGradDraw(PS.grad); }
  else if (D?.moveSel || D?.patch) D.d = { x: p.x - D.start.x, y: p.y - D.start.y };
  else if (D?.quick) psQuickDab(p);
  else if (D?.crop) psCropDrag(D, p, e);
  else if (D?.quadPt !== undefined) PS.quad.pts[D.quadPt] = p;
  else if (D?.moveSlice !== undefined) { const s = psPage().slices[D.moveSlice]; s.x = D.o.x + p.x - D.start.x; s.y = D.o.y + p.y - D.start.y; }
  else if (D?.ruler) { let b = p; if (e.shiftKey) { const a = PS.ruler.a, ang = Math.round(Math.atan2(p.y - a.y, p.x - a.x) / (Math.PI / 4)) * (Math.PI / 4), l = Math.hypot(p.x - a.x, p.y - a.y); b = { x: a.x + l * Math.cos(ang), y: a.y + l * Math.sin(ang) }; } PS.ruler.b = b; psBar(); }
  else if (D?.rot) { const s = c.getPointer(e, true), a = Math.atan2(s.y - D.ctr.y, s.x - D.ctr.x); let deg = D.ang + ((a - D.a0) * 180) / Math.PI; if (e.shiftKey) deg = Math.round(deg / 15) * 15; psSetViewAngle(deg); }
  else if (D?.pts) {
    if (D.id === 'psLasso' || D.id === 'psMagLasso') { const l = D.pts[D.pts.length - 1]; if (Math.hypot(p.x - l.x, p.y - l.y) > 1.5 / ED.zoom) D.pts.push(D.id === 'psMagLasso' ? psSnapEdge(D.m, p) : p); }
    else { let b = p; if (e.shiftKey && !D.shift0) { const w = p.x - D.start.x, h = p.y - D.start.y, m = Math.max(Math.abs(w), Math.abs(h)); b = { x: D.start.x + Math.sign(w || 1) * m, y: D.start.y + Math.sign(h || 1) * m }; } D.end = b; }
  } else if (D?.box || D?.zoom) D.end = p;
  if (PS_BRUSHY.has(PS.cur) || D || PS.poly || PS.curv || PS.grad || PS.quad) c.requestRenderAll();
}
async function psUp(opt) {
  if (ED.mode !== 'design' || !ED.project) return;
  const c = ED.canvas, e = opt.e;
  if (PS.stroke) return psStrokeUp();
  if (PS.grad) { const G = PS.grad; PS.grad = null; if (Math.hypot(G.b.x - G.a.x, G.b.y - G.a.y) < 2 / ED.zoom) { const gx = G.T.cv.getContext('2d'); gx.globalCompositeOperation = 'copy'; gx.drawImage(G.base, 0, 0); gx.globalCompositeOperation = 'source-over'; G.T.touch ? G.T.touch() : psTouch(G.T.o); return; } if (G.T.done) { G.T.touch(); return G.T.done(); } return psCommit(G.T.o); }
  const D = PS.drag; PS.drag = null; if (!D) return;
  const tiny = (a, b) => Math.hypot(b.x - a.x, b.y - a.y) < 3 / ED.zoom;
  if (D.moveSel) {
    const s = PS.sel, dx = D.d.x, dy = D.d.y; if (!s || (!dx && !dy)) return c.requestRenderAll();
    const t = canvasEl(s.cv.width, s.cv.height); t.getContext('2d').drawImage(s.cv, dx * s.k, dy * s.k);
    return psSelSet({ cv: t, k: s.k, polys: s.polys?.map((pl) => pl.map((q) => ({ x: q.x + dx, y: q.y + dy }))) }, true);
  }
  if (D.patch) return psPatchDrop(D);
  if (D.quick) { if (D.s) psSelCommit(D.s, D.mode); return; }
  if (D.crop) { if (D.h === 'new' && (PS.crop.w < 2 || PS.crop.h < 2)) PS.crop = { x: 0, y: 0, w: ED.project.width, h: ED.project.height }; c.requestRenderAll(); psBar(); return; }
  if (D.quadPt !== undefined || D.moveSlice !== undefined) { if (D.moveSlice !== undefined) markDirty(); return c.requestRenderAll(); }
  if (D.ruler || D.rot) return psBar();
  if (D.zoom) {
    if (tiny(D.start, D.end)) setZoom(ED.zoom * (D.alt || e.altKey ? 1 / 1.5 : 1.5), false, new fabric.Point(D.s.x, D.s.y));
    else psZoomRect(D.start, D.end);
    return;
  }
  if (D.box) {
    const a = D.start, b = D.end, r = { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
    if (tiny(a, b)) return c.requestRenderAll();
    if (D.box === 'slice') { (psPage().slices || (psPage().slices = [])).push(r); return psSaveMarks(); }
    if (D.box === 'psArtboard') return addPage(false, { w: Math.round(r.w), h: Math.round(r.h) });
    if (D.box === 'psFrame') {
      const base = { left: r.x, top: r.y, fill: '#d9d9de', stroke: '#9a9aa5', strokeWidth: 2, strokeDashArray: [10, 8], placeholder: true, name: 'Frame', id: uid() };
      const f = PS.o.frameShape === 'ellipse' ? new fabric.Ellipse({ ...base, rx: r.w / 2, ry: r.h / 2 }) : new fabric.Rect({ ...base, width: r.w, height: r.h });
      c.add(f); return c.requestRenderAll();
    }
    if (D.box === 'psCustom') {
      const o = new fabric.Path(PS_SHAPES[PS.o.custom] || PS_SHAPES.heart, { fill: PS.fg, stroke: PS.o.shapeStroke ? PS.bg : null, strokeWidth: PS.o.shapeStroke, name: `${PS.o.custom[0].toUpperCase()}${PS.o.custom.slice(1)} shape`, id: uid() });
      const k = Math.max(o.width, o.height) || 100;
      o.set({ left: r.x, top: r.y, scaleX: (e.shiftKey ? Math.max(r.w, r.h) : r.w) / k * (k / o.width), scaleY: (e.shiftKey ? Math.max(r.w, r.h) : r.h) / o.height });
      c.add(o); return c.requestRenderAll();
    }
  }
  if (D.pts) {
    let pts = D.id === 'psRectSel' || D.id === 'psObjSel' ? rectPts(D.start, D.end) : D.id === 'psEllSel' ? psEllPts(D.start, D.end) : D.pts;
    if (D.id === 'psObjSel') {
      const r = { x: Math.min(D.start.x, D.end.x), y: Math.min(D.start.y, D.end.y), w: Math.abs(D.end.x - D.start.x), h: Math.abs(D.end.y - D.start.y) };
      const objs = tiny(D.start, D.end) ? [psHitObj(D.start)].filter(Boolean) : c.getObjects().filter((o) => { if (o.isPage || o.visible === false) return false; const b = o.getBoundingRect(true, true); return b.left < r.x + r.w && b.left + b.width > r.x && b.top < r.y + r.h && b.top + b.height > r.y; });
      return objs.length ? psSelFromObjects(objs, D.mode) : D.mode === 'new' && tiny(D.start, D.end) ? psSelSet(null) : psSelCommit(psShape(psPolyDraw(pts)), D.mode, [pts]);
    }
    const b = { w: Math.max(...pts.map((q) => q.x)) - Math.min(...pts.map((q) => q.x)), h: Math.max(...pts.map((q) => q.y)) - Math.min(...pts.map((q) => q.y)) };
    if (pts.length < 3 || (b.w < 2 / ED.zoom && b.h < 2 / ED.zoom)) { if (D.mode === 'new') psSelSet(null); return c.requestRenderAll(); }
    if (D.id === 'psLasso' || D.id === 'psMagLasso') pts = pts.filter((q, i) => i % Math.max(1, Math.floor(pts.length / 600)) === 0);
    psSelCommit(psShape(psPolyDraw(pts)), D.mode, [pts]);
  }
}
function psDbl() {
  if (ED.mode !== 'design') return;
  if (PS.cur === 'psPolyLasso' && PS.poly) psPolyClose();
  if (PS.cur === 'psCurvPen' && PS.curv) psCurvFinish(false);
}
function psPolyClose() { const P = PS.poly; PS.poly = null; if (P && P.pts.length > 2) psSelCommit(psShape(psPolyDraw(P.pts)), P.mode, [P.pts]); ED.canvas.requestRenderAll(); }
function psSnapEdge(m, p) {
  const W = m.cv.width, H = m.cv.height, d = m.data, cx = Math.round(p.x * m.k), cy = Math.round(p.y * m.k), R = Math.max(2, Math.round((6 / ED.zoom) * m.k));
  const lum = (x, y) => { x = psClamp(x, 0, W - 1); y = psClamp(y, 0, H - 1); const j = (y * W + x) * 4; return d[j] * 0.3 + d[j + 1] * 0.59 + d[j + 2] * 0.11; };
  let best = null;
  for (let y = cy - R; y <= cy + R; y++) for (let x = cx - R; x <= cx + R; x++) {
    const g = Math.abs(lum(x + 1, y) - lum(x - 1, y)) + Math.abs(lum(x, y + 1) - lum(x, y - 1)) - Math.hypot(x - cx, y - cy) * 2;
    if (!best || g > best.g) best = { g, x, y };
  }
  return best && best.g > 12 ? { x: best.x / m.k, y: best.y / m.k } : p;
}
function psWandAt(p, mode) {
  const s = psSelCanvas();
  if (PS.o.sampleAll || !isRaster(PS.layer) || !psLive(PS.layer)) {
    const m = psMergedData(), mm = psFlood(m.data, m.cv.width, m.cv.height, p.x * m.k, p.y * m.k, PS.o.tol, PS.o.contiguous);
    s.cv.getContext('2d').drawImage(psMaskFrom(mm, m.cv.width, m.cv.height), 0, 0);
    return psSelCommit(s, mode);
  }
  const T = psTarget({ noQM: true, noNew: true }); if (!T) return;
  const lp = psTp(T.m, p), d = T.cv.getContext('2d').getImageData(0, 0, T.cv.width, T.cv.height).data;
  psSelFromLocal(T, psMaskFrom(psFlood(d, T.cv.width, T.cv.height, lp.x, lp.y, PS.o.tol, PS.o.contiguous), T.cv.width, T.cv.height), mode);
}
function psQuickDab(p) {
  const D = PS.drag, m = D.m, W = m.cv.width, H = m.cv.height, r = Math.max(2, (PS.o.size / 2) * m.k);
  if (D.last && Math.hypot(p.x - D.last.x, p.y - D.last.y) * m.k < r * 0.5) return;
  D.last = p;
  const cx = p.x * m.k, cy = p.y * m.k, mm = psFlood(m.data, W, H, cx, cy, Math.max(20, PS.o.tol), true, { x: cx, y: cy, r2: (r * 3) ** 2 });
  const x = D.s.cv.getContext('2d'); x.drawImage(psMaskFrom(mm, W, H), 0, 0); x.fillStyle = '#fff'; x.beginPath(); x.arc(cx, cy, r * 0.6, 0, 7); x.fill();
  ED.canvas.requestRenderAll();
}
async function psPatchDrop(D) {
  const dx = D.d.x, dy = D.d.y; if (!PS.sel || (!dx && !dy)) return ED.canvas.requestRenderAll();
  const T = psTarget({ noQM: true, noNew: true }); if (!T) return toast('Select the photo layer first');
  const mask = psSelLocal(T), base = psCopy(T.cv), a = psTp(T.m, D.start), b = psTp(T.m, { x: D.start.x + dx, y: D.start.y + dy }), off = { x: Math.round(b.x - a.x), y: Math.round(b.y - a.y) };
  if (D.patch === 'psPatch') psHealCompose(T.cv, base, psShifted(base, off), mask, 1);
  else {
    const moved = psCopy(base), mx = moved.getContext('2d'); mx.globalCompositeOperation = 'destination-in'; mx.drawImage(mask, 0, 0);
    psContentFill(T, mask);
    const x = T.cv.getContext('2d'); x.drawImage(moved, off.x, off.y);
    const s = PS.sel, t = canvasEl(s.cv.width, s.cv.height); t.getContext('2d').drawImage(s.cv, dx * s.k, dy * s.k);
    PS.sel = { cv: t, k: s.k, polys: s.polys?.map((pl) => pl.map((q) => ({ x: q.x + dx, y: q.y + dy }))) }; psSelSet(PS.sel, true);
  }
  await psCommit(T.o);
}
function psTypeAt(p, id) {
  const vertical = id === 'psVText' || id === 'psVMask', mask = id !== 'psVText', fs = PS.o.fontSize;
  const t = addText({ text: mask ? 'Mask' : 'Type', fontSize: fs, left: p.x, top: p.y, fill: mask ? '#ff3b3b' : PS.fg, fontFamily: PS.o.font, name: vertical ? 'Vertical type' : 'Type' });
  if (vertical) t.set({ splitByGrapheme: true, width: fs * 1.15, textAlign: 'center', lineHeight: 1 });
  if (mask) { t._psMask = true; t.set({ opacity: 0.6 }); }
  setTool('select'); ED.canvas.setActiveObject(t); t.enterEditing(); t.selectAll(); ED.canvas.requestRenderAll();
}
function psTypeMaskDone(t) {
  const c = ED.canvas; t._psMask = false; t.set({ opacity: 1, fill: '#ffffff' });
  const s = psSelCanvas(), cv = psRender([t], 0, 0, s.cv.width, s.cv.height, s.k);
  s.cv.getContext('2d').drawImage(cv, 0, 0);
  ED.loading = true; c.remove(t); ED.loading = false; c.discardActiveObject();
  psSelCommit(s, 'new'); toast('Type mask → selection');
}

// ---------------- overlay ----------------
function psOverlay(ctx, v) {
  if (ED.mode !== 'design' || !ED.project) return;
  const z = ED.zoom, lw = 1 / z;
  ctx.save(); ctx.transform(v[0], v[1], v[2], v[3], v[4], v[5]);
  const ants = (draw) => { ctx.lineWidth = lw; ctx.setLineDash([4 / z, 4 / z]); ctx.lineDashOffset = -(PS.phase % 8) / z; ctx.strokeStyle = '#000'; draw(); ctx.stroke(); ctx.lineDashOffset = -(PS.phase % 8 + 4) / z; ctx.strokeStyle = '#fff'; draw(); ctx.stroke(); ctx.setLineDash([]); };
  const pathOf = (pts, closed = true) => () => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); if (closed) ctx.closePath(); };
  // quick mask
  if (PS.qm && PS.qmS) {
    const s = PS.qmS;
    if (!PS.qmCache) { const t = canvasEl(s.cv.width, s.cv.height), x = t.getContext('2d'); x.fillStyle = 'rgba(255,40,40,.5)'; x.fillRect(0, 0, t.width, t.height); x.globalCompositeOperation = 'destination-out'; x.drawImage(s.cv, 0, 0); PS.qmCache = t; }
    ctx.drawImage(PS.qmCache, 0, 0, s.cv.width / s.k, s.cv.height / s.k);
  }
  // selection
  const s = PS.sel, D = PS.drag;
  if (s && !PS.qm && !PS.hideExtras) {
    const dx = D?.moveSel || D?.patch ? D.d.x : 0, dy = D?.moveSel || D?.patch ? D.d.y : 0;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, ED.project.width, ED.project.height); ctx.clip(); ctx.translate(dx, dy);
    if (s.polys) s.polys.forEach((pl) => ants(pathOf(pl)));
    else { ctx.imageSmoothingEnabled = false; ctx.drawImage(s.edges[(PS.phase >> 2) & 1], 0, 0, s.cv.width / s.k, s.cv.height / s.k); }
    ctx.restore();
  }
  if (D?.quick && D.s) { ctx.globalAlpha = 0.35; ctx.drawImage(D.s.cv, 0, 0, D.s.cv.width / D.s.k, D.s.cv.height / D.s.k); ctx.globalAlpha = 1; }
  if (D?.pts) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, ED.project.width, ED.project.height); ctx.clip();
    const pts = D.id === 'psRectSel' || D.id === 'psObjSel' ? rectPts(D.start, D.end) : D.id === 'psEllSel' ? psEllPts(D.start, D.end) : D.pts;
    ants(pathOf(pts, D.id !== 'psLasso' && D.id !== 'psMagLasso'));
    ctx.restore();
  }
  if (PS.poly) { const pts = [...PS.poly.pts, PS.mouse || PS.poly.pts[PS.poly.pts.length - 1]]; ants(pathOf(pts, false)); ctx.fillStyle = '#ffc21a'; ctx.fillRect(PS.poly.pts[0].x - 3 * lw, PS.poly.pts[0].y - 3 * lw, 6 * lw, 6 * lw); }
  if (D?.box || D?.zoom) {
    const a = D.start, b = D.end; ctx.lineWidth = lw; ctx.strokeStyle = D.zoom ? '#fff' : '#5b8cff'; ctx.setLineDash(D.box === 'psFrame' ? [6 * lw, 4 * lw] : []);
    if (D.box === 'psCustom') { ctx.save(); ctx.translate(Math.min(a.x, b.x), Math.min(a.y, b.y)); ctx.scale(Math.abs(b.x - a.x) / 100 || 0.01, Math.abs(b.y - a.y) / 100 || 0.01); ctx.lineWidth = lw * 100 / Math.max(1, Math.abs(b.x - a.x)); ctx.stroke(new Path2D(PS_SHAPES[PS.o.custom] || PS_SHAPES.heart)); ctx.restore(); }
    else ctx.strokeRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
    ctx.setLineDash([]);
  }
  // crop
  if (PS.cur === 'psCrop' && PS.crop) {
    const r = PS.crop, P = ED.project;
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.beginPath(); ctx.rect(-1e5, -1e5, 2e5, 2e5); ctx.rect(r.x, r.y, r.w, r.h); ctx.fill('evenodd');
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5 * lw; ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = lw; ctx.beginPath();
    for (let i = 1; i < 3; i++) { ctx.moveTo(r.x + (r.w * i) / 3, r.y); ctx.lineTo(r.x + (r.w * i) / 3, r.y + r.h); ctx.moveTo(r.x, r.y + (r.h * i) / 3); ctx.lineTo(r.x + r.w, r.y + (r.h * i) / 3); }
    ctx.stroke(); ctx.fillStyle = '#fff';
    [[0, 0], [0.5, 0], [1, 0], [0, 0.5], [1, 0.5], [0, 1], [0.5, 1], [1, 1]].forEach(([a, b]) => ctx.fillRect(r.x + r.w * a - 4 * lw, r.y + r.h * b - 4 * lw, 8 * lw, 8 * lw));
    void P;
  }
  // perspective quad
  if (PS.quad) {
    const q = PS.quad.pts; ctx.strokeStyle = '#ffc21a'; ctx.lineWidth = 1.5 * lw;
    if (q.length) { ctx.beginPath(); q.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); if (q.length === 4) ctx.closePath(); else if (PS.mouse) ctx.lineTo(PS.mouse.x, PS.mouse.y); ctx.stroke(); }
    if (q.length === 4 && PS.quad.mode === 'crop') { ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = lw; ctx.beginPath(); for (let i = 1; i < 4; i++) { const t = i / 4, L = (a, b) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }); const a = L(q[0], q[1]), b = L(q[3], q[2]), c2 = L(q[0], q[3]), d = L(q[1], q[2]); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.moveTo(c2.x, c2.y); ctx.lineTo(d.x, d.y); } ctx.stroke(); }
    q.forEach((p) => { ctx.fillStyle = '#fff'; ctx.strokeStyle = '#ffc21a'; ctx.fillRect(p.x - 5 * lw, p.y - 5 * lw, 10 * lw, 10 * lw); ctx.strokeRect(p.x - 5 * lw, p.y - 5 * lw, 10 * lw, 10 * lw); });
  }
  // curvature pen
  if (PS.curv) {
    ctx.strokeStyle = '#ffc21a'; ctx.lineWidth = 1.5 * lw; const d = psCurvD(PS.curv.pts, false, PS.mouse); if (d) ctx.stroke(new Path2D(d));
    PS.curv.pts.forEach((p, i) => { ctx.fillStyle = i ? '#fff' : '#ffc21a'; ctx.beginPath(); ctx.arc(p.x, p.y, 4 * lw, 0, 7); ctx.fill(); });
  }
  // gradient line
  if (PS.grad) { const { a, b } = PS.grad; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5 * lw; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); [a, b].forEach((p) => { ctx.beginPath(); ctx.arc(p.x, p.y, 4 * lw, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); }); }
  // marks
  const pg = psPage();
  ctx.font = `600 ${11 * lw}px Inter`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  (pg.slices || []).forEach((r, i) => { ctx.strokeStyle = i === PS.sliceSel ? '#ffc21a' : '#5b8cff'; ctx.lineWidth = 1.5 * lw; ctx.strokeRect(r.x, r.y, r.w, r.h); ctx.fillStyle = ctx.strokeStyle; ctx.fillRect(r.x, r.y, 22 * lw, 16 * lw); ctx.fillStyle = '#000'; ctx.fillText(String(i + 1).padStart(2, '0'), r.x + 11 * lw, r.y + 8 * lw); });
  (pg.counts || []).forEach((n, i) => { ctx.fillStyle = '#00b3ff'; ctx.beginPath(); ctx.arc(n.x, n.y, 9 * lw, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(String(i + 1), n.x, n.y); });
  (pg.notes || []).forEach((n) => { ctx.fillStyle = '#ffd24d'; ctx.fillRect(n.x - 7 * lw, n.y - 8 * lw, 14 * lw, 16 * lw); ctx.strokeStyle = '#7a5c00'; ctx.lineWidth = lw; ctx.strokeRect(n.x - 7 * lw, n.y - 8 * lw, 14 * lw, 16 * lw); });
  PS.samplers.forEach((n, i) => { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5 * lw; ctx.beginPath(); ctx.arc(n.x, n.y, 6 * lw, 0, 7); ctx.moveTo(n.x - 10 * lw, n.y); ctx.lineTo(n.x + 10 * lw, n.y); ctx.moveTo(n.x, n.y - 10 * lw); ctx.lineTo(n.x, n.y + 10 * lw); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.fillText(String(i + 1), n.x + 12 * lw, n.y - 10 * lw); });
  if (PS.ruler && (PS.cur === 'psRuler')) { const { a, b } = PS.ruler; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5 * lw; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); [a, b].forEach((p) => { ctx.beginPath(); ctx.moveTo(p.x - 6 * lw, p.y); ctx.lineTo(p.x + 6 * lw, p.y); ctx.moveTo(p.x, p.y - 6 * lw); ctx.lineTo(p.x, p.y + 6 * lw); ctx.stroke(); }); }
  // brush cursor
  const M = PS.mouse;
  if (M && PS_BRUSHY.has(PS.cur)) {
    const r = PS.o.size / 2;
    ctx.lineWidth = lw; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.beginPath(); ctx.arc(M.x, M.y, r, 0, 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(M.x, M.y, r + lw, 0, 7); ctx.stroke();
    if (PS.cloneOff && (PS.cur === 'psClone' || PS.cur === 'psHeal')) { const sx = M.x + PS.cloneOff.x, sy = M.y + PS.cloneOff.y; ctx.beginPath(); ctx.moveTo(sx - 8 * lw, sy); ctx.lineTo(sx + 8 * lw, sy); ctx.moveTo(sx, sy - 8 * lw); ctx.lineTo(sx, sy + 8 * lw); ctx.stroke(); }
  }
  ctx.restore();
  psPlaceTaskBar(v);
}

// ---------------- UI: rail, colours, options bar, task bar ----------------
function psRail() {
  const rail = $('#rail');
  rail.innerHTML = PSG.map((g) => {
    if (g === '-') return '<div class="sep"></div>';
    const cur = g[2].find((t) => t[0] === (PS.group[g[0]] || g[2][0][0])) || g[2][0];
    return `<button class="icon-btn ps-tb" data-g="${g[0]}" title="${cur[2]}${g[1] ? ` (${g[1]})` : ''}${g[2].length > 1 ? ' · right-click for more' : ''}">${icon(cur[1])}${g[2].length > 1 ? '<i class="ps-more"></i>' : ''}</button>`;
  }).join('') + `<div class="sep"></div>
    <div class="ps-colors"><button class="ps-fg" title="Foreground colour (click to pick)"></button><button class="ps-bg" title="Background colour"></button>
    <button class="ps-swap" title="Swap colours (X)">⇄</button><button class="ps-def" title="Default black & white (D)"><i></i><i></i></button></div>
    <button class="icon-btn ${PS.qm ? 'on' : ''}" id="psQM" title="Quick Mask (Q)">${icon('quickMask')}</button>
    <button class="icon-btn" id="railImg" title="Place image">${icon('image')}</button><button class="icon-btn" id="rail3d" title="3D">${icon('cube')}</button>`;
  $$('.ps-tb', rail).forEach((b) => {
    const g = PSG.find((x) => x[0] === b.dataset.g);
    b.onclick = () => psPick(PS.group[g[0]] || g[2][0][0]);
    b.oncontextmenu = (e) => { e.preventDefault(); psFlyout(b, g); };
    let hold; b.onmousedown = () => { hold = setTimeout(() => psFlyout(b, g), 380); }; b.onmouseup = b.onmouseleave = () => clearTimeout(hold);
  });
  $('.ps-fg', rail).onclick = () => psPickColor('fg'); $('.ps-bg', rail).onclick = () => psPickColor('bg');
  $('.ps-swap', rail).onclick = () => { [PS.fg, PS.bg] = [PS.bg, PS.fg]; psColors(); };
  $('.ps-def', rail).onclick = () => { PS.fg = '#000000'; PS.bg = '#ffffff'; psColors(); };
  $('#psQM').onclick = psToggleQM;
  $('#railImg').onclick = () => pickFiles('image/*,.svg,.psd');
  psColors(); psRailOn();
}
function psRailOn() { const g = psGroupOf(PS.cur); $$('#rail .ps-tb').forEach((b) => b.classList.toggle('on', !!g && b.dataset.g === g[0])); }
function psFlyout(btn, g) {
  $('#psFly')?.remove();
  if (g[2].length < 2) return;
  const f = document.createElement('div'); f.id = 'psFly'; f.className = 'ps-fly';
  f.innerHTML = g[2].map((t) => `<button data-t="${t[0]}" class="${PS.cur === t[0] ? 'on' : ''}">${icon(t[1])}<span>${t[2]}</span><kbd>${g[1]}</kbd></button>`).join('');
  document.body.appendChild(f);
  const r = btn.getBoundingClientRect(); f.style.left = r.right + 6 + 'px'; f.style.top = Math.min(innerHeight - f.offsetHeight - 8, r.top) + 'px';
  $$('[data-t]', f).forEach((b) => b.onclick = () => { f.remove(); psPick(b.dataset.t); });
  setTimeout(() => document.addEventListener('mousedown', function off(e) { if (!f.contains(e.target)) { f.remove(); document.removeEventListener('mousedown', off); } }), 0);
}
function psPickColor(which) {
  let inp = $('#psColorIn');
  if (!inp) { inp = document.createElement('input'); inp.type = 'color'; inp.id = 'psColorIn'; inp.style.cssText = 'position:fixed;left:60px;top:60%;opacity:0;pointer-events:none'; document.body.appendChild(inp); }
  inp.value = PS[which]; inp.oninput = () => { PS[which] = inp.value; psColors(); }; inp.click();
}
function psColors() {
  const fg = $('#rail .ps-fg'), bg = $('#rail .ps-bg'); if (fg) fg.style.background = PS.fg; if (bg) bg.style.background = PS.bg;
  $$('#psBar [data-swatch]').forEach((s) => (s.style.background = PS[s.dataset.swatch]));
}
function psPick(id) {
  const g = psGroupOf(id); if (g) PS.group[g[0]] = id;
  PS.cur = id; PS.nodeMode = id === 'psDelNode' ? 'del' : id === 'psConvNode' ? 'conv' : null;
  if (id === 'select') { const o = PS.layer; setTool('select'); if (o && psLive(o) && !o.group) ED.canvas.setActiveObject(o); ED.canvas.requestRenderAll(); return; }
  setTool(psToolOf(id));
}
function psOnTool() {
  if (ED.mode !== 'design' || !ED.canvas) return;
  if (psToolOf(PS.cur) !== ED.tool) { PS.cur = ED.tool; PS.nodeMode = null; }
  const c = ED.canvas, id = PS.cur;
  if (id !== 'psPolyLasso') PS.poly = null;
  if (id !== 'psCurvPen' && PS.curv) psCurvFinish(false);
  if (id !== 'psCrop') PS.crop = null; else PS.crop = PS.crop || { x: 0, y: 0, w: ED.project.width, h: ED.project.height };
  if (id !== 'psPerspCrop' && PS.quad?.mode === 'crop') PS.quad = null;
  if (id === 'psFreePen') { c.isDrawingMode = true; c.freeDrawingBrush = new fabric.PencilBrush(c); c.freeDrawingBrush.color = PS.fg; c.freeDrawingBrush.width = Math.max(1, PS.o.shapeStroke || 4); }
  if (id.startsWith('ps') && id !== 'psPathSel') c.defaultCursor = id === 'psZoom' ? 'zoom-in' : id === 'psRotView' ? 'grab' : 'crosshair';
  const g = psGroupOf(id), info = g && g[2].find((t) => t[0] === id);
  if (g) { const b = $(`#rail .ps-tb[data-g="${g[0]}"]`); if (b && info) { b.innerHTML = icon(info[1]) + (g[2].length > 1 ? '<i class="ps-more"></i>' : ''); b.title = `${info[2]}${g[1] ? ` (${g[1]})` : ''}${g[2].length > 1 ? ' · right-click for more' : ''}`; } }
  $('#toolHint').textContent = TOOL_HINTS[id] || TOOL_HINTS[ED.tool] || '';
  psRailOn(); psBar(); c.requestRenderAll();
}

// options bar
const psR = (label, k, min, max, step, unit = '', pct = false) => `<label class="pso" title="${label}"><span>${label}</span><input type="range" data-o="${k}" min="${min}" max="${max}" step="${step}" value="${PS.o[k]}" ${pct ? 'data-pct' : ''}><b data-ov="${k}">${pct ? Math.round(PS.o[k] * 100) + '%' : PS.o[k] + unit}</b></label>`;
const psS = (label, k, opts) => `<label class="pso"><span>${label}</span><select data-o="${k}">${opts.map(([v, n]) => `<option value="${v}" ${String(PS.o[k]) === String(v) ? 'selected' : ''}>${n}</option>`).join('')}</select></label>`;
const psC = (label, k) => `<label class="pso chk"><input type="checkbox" data-o="${k}" ${PS.o[k] ? 'checked' : ''}><span>${label}</span></label>`;
const psBtn = (act, label, primary) => `<button class="btn ${primary ? 'primary' : 'ghost'} psb" data-a="${act}">${label}</button>`;
const PS_BLEND_NAMES = { 'source-over': 'Normal', multiply: 'Multiply', screen: 'Screen', overlay: 'Overlay', darken: 'Darken', lighten: 'Lighten', 'color-dodge': 'Color Dodge', 'color-burn': 'Color Burn',
  'hard-light': 'Hard Light', 'soft-light': 'Soft Light', difference: 'Difference', exclusion: 'Exclusion', hue: 'Hue', saturation: 'Saturation', color: 'Color', luminosity: 'Luminosity' };
const psBlendSel = () => psS('Mode', 'mode', BLENDS.map((b) => [b, PS_BLEND_NAMES[b] || b]));
const psBrushOpts = (extra = '') => psR('Size', 'size', 1, 500, 1, 'px') + psR('Hardness', 'hard', 0, 1, 0.01, '', true) + extra;
const psSelModes = () => `<div class="ps-seg" title="New / Add (Shift) / Subtract (Alt) / Intersect">${[['new', 'rect', 'New selection'], ['add', 'unite', 'Add to selection'], ['sub', 'minusFront', 'Subtract from selection'], ['int', 'intersect', 'Intersect with selection']]
  .map(([v, i, t]) => `<button class="icon-btn ${PS.o.selMode === v ? 'on' : ''}" data-selmode="${v}" title="${t}">${icon(i)}</button>`).join('')}</div>`;
const psSelActs = () => `${psBtn('selSubject', 'Select Subject')}${psBtn('sam', 'Select and Mask…')}${PS.sel ? psBtn('gen', '✨ Generative Fill', true) + psBtn('invert', 'Invert') + psBtn('deselect', 'Deselect') : ''}`;
function psToolOpts(id) {
  switch (id) {
    case 'psRectSel': case 'psEllSel': case 'psLasso': case 'psPolyLasso': case 'psMagLasso': case 'psRowSel': case 'psColSel':
      return psSelModes() + psR('Feather', 'feather', 0, 100, 1, 'px') + psSelActs();
    case 'psObjSel': return psSelModes() + psSelActs();
    case 'psQuickSel': return psSelModes() + psR('Size', 'size', 2, 300, 1, 'px') + psR('Tolerance', 'tol', 5, 120, 1) + psSelActs();
    case 'psWand': return psSelModes() + psR('Tolerance', 'tol', 0, 255, 1) + psC('Contiguous', 'contiguous') + psC('Sample All Layers', 'sampleAll') + psSelActs();
    case 'psCrop': { const r = PS.crop; return psS('Ratio', 'ratio', Object.keys(PS_RATIOS).map((k) => [k, k === 'free' ? 'Ratio (free)' : k === 'artboard' ? 'Original' : k])) + (r ? `<span class="ps-read">${Math.round(r.w)} × ${Math.round(r.h)} px</span>` : '') + psBtn('cropReset', 'Reset') + psBtn('cropSel', 'Crop to Selection') + psBtn('cropGo', '✓ Crop', true); }
    case 'psPerspCrop': return `<span class="ps-read">${PS.quad?.pts.length || 0}/4 corners</span>` + psBtn('quadClear', 'Clear') + psBtn('quadGo', '✓ Crop', true);
    case 'psSlice': case 'psSliceSel': return `<span class="ps-read">${(psPage().slices || []).length} slices</span>` + psBtn('slicesClear', 'Clear Slices') + psBtn('slicesExport', 'Export Slices (PNG)', true);
    case 'psFrame': return psS('Shape', 'frameShape', [['rect', 'Rectangle'], ['ellipse', 'Ellipse']]);
    case 'psEyedrop': return psS('Sample Size', 'sample', [[1, 'Point Sample'], [3, '3 by 3 Average'], [5, '5 by 5 Average'], [11, '11 by 11 Average'], [31, '31 by 31 Average']]) + psC('Sample All Layers', 'sampleAll');
    case 'psSampler': {
      const m = PS.samplers.length ? psMergedData() : null;
      return PS.samplers.map((s, i) => { const W = m.cv.width, x = Math.floor(s.x * m.k), y = Math.floor(s.y * m.k), j = (y * W + x) * 4, d = m.data; const hex = psToHex(d[j] || 0, d[j + 1] || 0, d[j + 2] || 0);
        return `<span class="ps-samp"><i style="background:${hex}"></i>#${i + 1} R${d[j] || 0} G${d[j + 1] || 0} B${d[j + 2] || 0}</span>`; }).join('') + (PS.samplers.length ? psBtn('samplersClear', 'Clear All') : '<span class="ps-read">Click to add colour samplers</span>');
    }
    case 'psRuler': {
      const R = PS.ruler; if (!R) return '<span class="ps-read">Drag to measure</span>';
      const w = R.b.x - R.a.x, h = R.b.y - R.a.y, ang = (-Math.atan2(h, w) * 180) / Math.PI;
      return `<span class="ps-read">X ${Math.round(R.a.x)} · Y ${Math.round(R.a.y)} · W ${Math.round(w)} · H ${Math.round(h)} · A ${ang.toFixed(1)}° · L ${Math.hypot(w, h).toFixed(1)} px</span>` + psBtn('straighten', 'Straighten Layer', true) + psBtn('rulerClear', 'Clear');
    }
    case 'psNote': return `<span class="ps-read">${(psPage().notes || []).length} notes</span>` + psBtn('notesClear', 'Clear All');
    case 'psCount': return `<span class="ps-read">Count: ${(psPage().counts || []).length}</span>` + psBtn('countClear', 'Clear');
    case 'psSpotHeal': return psBrushOpts();
    case 'psHeal': return psBrushOpts(psC('Aligned', 'aligned'));
    case 'psPatch': case 'psCAMove': return psSelModes() + (PS.sel ? '<span class="ps-read">Drag the selection</span>' + psBtn('deselect', 'Deselect') : '');
    case 'psRedEye': return psR('Size', 'size', 4, 300, 1, 'px');
    case 'psBrush': return psBrushOpts(psBlendSel() + psR('Opacity', 'opacity', 0.01, 1, 0.01, '', true) + psR('Flow', 'flow', 0.01, 1, 0.01, '', true));
    case 'psPencil': return psR('Size', 'size', 1, 500, 1, 'px') + psBlendSel() + psR('Opacity', 'opacity', 0.01, 1, 0.01, '', true);
    case 'psColorRep': return psBrushOpts(psR('Opacity', 'opacity', 0.01, 1, 0.01, '', true));
    case 'psMixer': return psBrushOpts(psR('Wet', 'strength', 0.05, 1, 0.01, '', true));
    case 'psClone': return psBrushOpts(psR('Opacity', 'opacity', 0.01, 1, 0.01, '', true) + psR('Flow', 'flow', 0.01, 1, 0.01, '', true) + psC('Aligned', 'aligned'));
    case 'psPattern': return psBrushOpts(psS('Pattern', 'pattern', [['checker', 'Checker'], ['stripes', 'Stripes'], ['dots', 'Dots'], ['grid', 'Grid'], ['bricks', 'Bricks'], ['noise', 'Noise'], ...(PS.customPattern ? [['custom', 'Defined pattern']] : [])]) + psR('Opacity', 'opacity', 0.01, 1, 0.01, '', true));
    case 'psHistBrush': case 'psArtHist': return psBrushOpts(psR('Opacity', 'opacity', 0.01, 1, 0.01, '', true)) + psBtn('histSet', 'Set History State');
    case 'psEraser': return psBrushOpts(psR('Opacity', 'opacity', 0.01, 1, 0.01, '', true) + psR('Flow', 'flow', 0.01, 1, 0.01, '', true));
    case 'psBgEraser': return psBrushOpts(psR('Tolerance', 'tol', 0, 255, 1));
    case 'psMagicEraser': return psR('Tolerance', 'tol', 0, 255, 1) + psC('Contiguous', 'contiguous') + psR('Opacity', 'opacity', 0.01, 1, 0.01, '', true);
    case 'psGradient': return `<div class="ps-seg">${['linear', 'radial', 'angle', 'reflected', 'diamond'].map((t) => `<button class="ps-gt ${PS.o.gradType === t ? 'on' : ''}" data-gt="${t}" title="${t[0].toUpperCase() + t.slice(1)} gradient"><i class="g-${t}"></i></button>`).join('')}</div>`
      + psS('Colours', 'gradColors', [['fgbg', 'Foreground → Background'], ['fgtr', 'Foreground → Transparent'], ['bw', 'Black → White'], ['spectrum', 'Spectrum']]) + psC('Reverse', 'gradReverse') + psBlendSel() + psR('Opacity', 'opacity', 0.01, 1, 0.01, '', true);
    case 'psBucket': return psS('Fill', 'bucketFill', [['fg', 'Foreground']]) + psBlendSel() + psR('Opacity', 'opacity', 0.01, 1, 0.01, '', true) + psR('Tolerance', 'tol', 0, 255, 1) + psC('Contiguous', 'contiguous');
    case 'psBlur': case 'psSharpen': case 'psSmudge': return psBrushOpts(psR('Strength', 'strength', 0.01, 1, 0.01, '', true));
    case 'psDodge': case 'psBurn': return psBrushOpts(psS('Range', 'range', [['shadows', 'Shadows'], ['mid', 'Midtones'], ['highlights', 'Highlights']]) + psR('Exposure', 'exposure', 0.01, 1, 0.01, '', true));
    case 'psSponge': return psBrushOpts(psS('Mode', 'sponge', [['desat', 'Desaturate'], ['sat', 'Saturate']]) + psR('Flow', 'flow', 0.01, 1, 0.01, '', true));
    case 'text': case 'psVText': case 'psHMask': case 'psVMask':
      return psS('Font', 'font', FONTS.map((f) => [f, f])) + `<label class="pso"><span>Size</span><input type="number" data-o="fontSize" min="4" max="2000" value="${PS.o.fontSize}" style="width:64px"></label><button class="ps-sw" data-swatch="fg" title="Text colour = foreground"></button>`;
    case 'rect': case 'ellipse': case 'triangle': case 'polygon': case 'line': case 'psCustom': case 'psFreePen': case 'psCurvPen': case 'pen':
      return `<span class="ps-read">Fill</span><button class="ps-sw" data-swatch="fg" title="Fill = foreground colour"></button>`
        + (id === 'psCustom' ? psS('Shape', 'custom', Object.keys(PS_SHAPES).map((k) => [k, k[0].toUpperCase() + k.slice(1)])) : '') + psR('Stroke', 'shapeStroke', 0, 40, 1, 'px');
    case 'psRotView': return `<label class="pso"><span>Rotation</span><input type="number" data-a-in="rot" value="${Math.round(PS.viewAngle)}" style="width:60px">°</label>` + psBtn('rotReset', 'Reset View');
    case 'psZoom': case 'hand': return psBtn('zoom100', '100%') + psBtn('fit', 'Fit Screen') + psBtn('rotReset', 'Reset Rotation');
    case 'select': case 'psPathSel': return psC('Auto-Select:', 'autoSelect') + psS('', 'autoTarget', [['layer', 'Layer'], ['group', 'Group']]) + psC('Show Transform Controls', 'showTC')
      + `<span class="ps-sep"></span>${[['left', 'alignL', 'Align left edges'], ['centerH', 'alignCH', 'Align horizontal centers'], ['right', 'alignR', 'Align right edges'], ['distH', 'distH', 'Distribute horizontally'], ['top', 'alignT', 'Align top edges'], ['centerV', 'alignCV', 'Align vertical centers'], ['bottom', 'alignB', 'Align bottom edges'], ['distV', 'distV', 'Distribute vertically']]
        .map(([a, i, t]) => `<button class="icon-btn ps-al" data-al="${a}" title="${t}">${icon(i)}</button>`).join('')}<span class="ps-sep"></span>`
      + psBtn('freeT', 'Free Transform') + psBtn('persp', 'Perspective / Distort') + psBtn('raster', 'Rasterize');
    default: return '';
  }
}
function psBar() {
  const bar = $('#psBar'); if (!bar) return;
  if (ED.mode !== 'design' || !ED.canvas) { bar.innerHTML = ''; return; }
  const id = PS.cur, info = psToolInfo(id), L = PS.layer && psLive(PS.layer) ? PS.layer : null;
  bar.innerHTML = `<button class="icon-btn ps-home" data-a="home" title="Home">${icon('home')}</button><span class="ps-tool">${icon(info?.[1] || 'select')}<b>${esc(info?.[2] || 'Move')}</b></span>${psToolOpts(id)}
    <span class="grow"></span>${PS.qm ? '<span class="ps-qm">Quick Mask</span>' : ''}${PS.sel ? `<span class="ps-read">Selection ${Math.round(PS.sel.bbox.w)} × ${Math.round(PS.sel.bbox.h)}</span>` : ''}
    <span class="ps-layer" title="The layer pixel tools work on — pick another in Layers">${L ? `${isRaster(L) ? '▦' : '◇'} ${esc(L.name || L.type)}${PS.maskEdit === L ? ' · <b class="ps-qm">Layer Mask</b>' : ''}` : 'New layer on paint'}</span>`;
  psColors();
  $$('[data-o]', bar).forEach((inp) => {
    const k = inp.dataset.o;
    inp.oninput = inp.onchange = () => {
      PS.o[k] = inp.type === 'checkbox' ? inp.checked : inp.type === 'range' || inp.type === 'number' ? +inp.value : (/^\d+$/.test(inp.value) ? +inp.value : inp.value);
      const ov = $(`[data-ov="${k}"]`, bar); if (ov) ov.textContent = inp.hasAttribute('data-pct') ? Math.round(PS.o[k] * 100) + '%' : PS.o[k] + (k === 'size' || k === 'feather' || k === 'shapeStroke' ? 'px' : '');
      psSave(); if (inp.tagName === 'SELECT' || inp.type === 'checkbox') psBar(); ED.canvas.requestRenderAll();
    };
  });
  $$('[data-selmode]', bar).forEach((b) => b.onclick = () => { PS.o.selMode = b.dataset.selmode; psSave(); psBar(); });
  $$('[data-gt]', bar).forEach((b) => b.onclick = () => { PS.o.gradType = b.dataset.gt; psSave(); psBar(); });
  $$('[data-swatch]', bar).forEach((b) => b.onclick = () => psPickColor(b.dataset.swatch));
  $$('[data-a]', bar).forEach((b) => b.onclick = () => psAct(b.dataset.a));
  $$('[data-al]', bar).forEach((b) => b.onclick = () => { const a = b.dataset.al; if (a === 'distH' || a === 'distV') distribute(a === 'distH' ? 'h' : 'v'); else align(a); });
  const rot = $('[data-a-in=rot]', bar); if (rot) rot.onchange = () => psSetViewAngle(+rot.value || 0);
}
function psAct(a) {
  const pg = psPage(), c = ED.canvas;
  ({
    home: () => goHome(), sam: () => window.psSamOpen?.(), gen: psSelToGen, invert: psInverse, deselect: psDeselect, selSubject: () => window.PSM?.selectSubject(),
    cropReset: () => { PS.crop = { x: 0, y: 0, w: ED.project.width, h: ED.project.height }; psBar(); c.requestRenderAll(); },
    cropSel: () => { if (PS.sel) psCropTo(PS.sel.bbox); else toast('Make a selection first'); }, cropGo: () => PS.crop && psCropTo(PS.crop),
    quadClear: () => { PS.quad = null; psBar(); c.requestRenderAll(); }, quadGo: psQuadApply,
    slicesClear: () => { pg.slices = []; psSaveMarks(); }, slicesExport: psExportSlices,
    samplersClear: () => { PS.samplers = []; psBar(); c.requestRenderAll(); }, notesClear: () => { pg.notes = []; psSaveMarks(); }, countClear: () => { pg.counts = []; psSaveMarks(); },
    rulerClear: () => { PS.ruler = null; psBar(); c.requestRenderAll(); },
    straighten: () => {
      const o = PS.layer, R = PS.ruler; if (!o || !psLive(o) || !R) return toast('Select a layer and draw a ruler line');
      let ang = (Math.atan2(R.b.y - R.a.y, R.b.x - R.a.x) * 180) / Math.PI; if (ang > 45) ang -= 90; if (ang < -45) ang += 90;
      const ctr = o.getCenterPoint(); o.set('angle', (o.angle || 0) - ang); o.setPositionByOrigin(ctr, 'center', 'center'); o.setCoords();
      PS.ruler = null; scheduleHistory(); psBar(); c.requestRenderAll(); toast(`Straightened by ${(-ang).toFixed(1)}°`);
    },
    histSet: () => { const o = PS.layer; if (isRaster(o) && psLive(o)) { psPrepare(o); o._psHist = psCopy(o._psCv); toast('History state set'); } else toast('Select a pixel layer'); },
    rotReset: () => psSetViewAngle(0), zoom100: () => setZoom(1), fit: () => { PS.viewAngle = 0; fitView(); psBar(); },
    freeT: () => psPick('select'), persp: () => { if (psQuadStart('warp')) { psPick('select'); c.discardActiveObject(); toast('Drag the corners · Enter = apply · Esc = cancel'); } },
    raster: () => { const o = PS.layer; if (o && psLive(o) && !isRaster(o)) psRasterize(o); else toast(isRaster(o) ? 'Already a pixel layer' : 'Select a layer'); },
  })[a]?.();
}
// the contextual task bar under a selection
function psTaskBar() {
  let tb = $('#psTask');
  if (!PS.sel || PS.qm || ED.mode !== 'design') { tb?.classList.add('hidden'); return; }
  if (!tb) { tb = document.createElement('div'); tb.id = 'psTask'; tb.className = 'ps-task'; $('#stage').appendChild(tb); }
  tb.innerHTML = `<button data-t="gen" class="pri">${icon('sparkles')}Generative fill</button><button data-t="sam">Refine</button><button data-t="invert">Invert</button><button data-t="feather">Feather</button>
    <button data-t="copy" title="Ctrl+J">New layer</button><button data-t="fill" title="Shift+F5">Fill</button><button data-t="crop">Crop</button><button data-t="deselect" title="Ctrl+D">×</button>`;
  tb.classList.remove('hidden');
  $$('[data-t]', tb).forEach((b) => b.onclick = () => ({ gen: psSelToGen, sam: () => window.psSamOpen?.(), invert: psInverse, feather: () => window.PSM?.feather(), copy: () => psLayerVia(false),
    fill: () => window.PSM?.fill(), crop: () => PS.sel && psCropTo(PS.sel.bbox), deselect: psDeselect })[b.dataset.t]());
}
function psPlaceTaskBar(v) {
  const tb = $('#psTask'); if (!tb || tb.classList.contains('hidden') || !PS.sel) return;
  const b = PS.sel.bbox, pts = [[b.x, b.y + b.h], [b.x + b.w, b.y + b.h], [b.x, b.y], [b.x + b.w, b.y]].map(([x, y]) => psTp(v, { x, y }));
  const W = $('#stage').clientWidth, H = $('#stage').clientHeight, x = (Math.min(...pts.map((p) => p.x)) + Math.max(...pts.map((p) => p.x))) / 2, y = Math.max(...pts.map((p) => p.y)) + 14;
  tb.style.left = psClamp(x - tb.offsetWidth / 2, 8, W - tb.offsetWidth - 8) + 'px'; tb.style.top = psClamp(y, 60, H - tb.offsetHeight - 54) + 'px';
}

// ---------------- keys ----------------
function psKeys(e) {
  if ($('#editor').classList.contains('hidden') || ED.mode !== 'design' || !ED.canvas || !ED.project || !$('#studio3d').classList.contains('hidden')) return;
  if (PS.sam || isTyping(e) || e.target.closest?.('.ps-dlg, .ps-prompt')) return;
  const k = e.key, kl = k.length === 1 ? k.toLowerCase() : k, ctrl = e.ctrlKey || e.metaKey, M = window.PSM || {};
  const stop = () => { e.preventDefault(); e.stopImmediatePropagation(); };
  if (ctrl) {
    const f = {
      d: e.shiftKey ? psReselect : PS.sel || PS.qm ? psDeselect : null,
      i: e.shiftKey ? psInverse : () => M.adjust?.('invert'),
      a: PS_SELTOOLS.has(PS.cur) || PS_PAINT.has(PS.cur) || PS.sel ? psSelAll : null,
      j: () => psLayerVia(e.shiftKey), n: e.shiftKey ? () => { psNewLayer(); scheduleHistory(); } : null,
      t: () => psPick('select'),
      l: e.altKey && e.shiftKey ? () => M.auto?.('contrast') : e.shiftKey ? () => M.auto?.('tone') : () => M.adjust?.('levels'),
      m: () => M.adjust?.('curves'), u: e.shiftKey ? () => M.adjust?.('desaturate') : () => M.adjust?.('hueSat'),
      b: e.shiftKey ? () => M.auto?.('color') : e.altKey ? () => M.adjust?.('bw') : () => M.adjust?.('colorBalance'),
      e: e.shiftKey ? () => M.mergeVisible?.() : null, f: e.altKey ? () => M.lastFilter?.() : null,
      backspace: () => psFillSel(PS.bg), delete: () => psFillSel(PS.bg),
    }[kl === 'Backspace' ? 'backspace' : kl === 'Delete' ? 'delete' : kl];
    if (e.altKey && kl === 'i') { stop(); return M.imageSize?.(); }
    if (e.altKey && kl === 'c') { stop(); return M.canvasSize?.(); }
    if (f) { stop(); f(); }
    return;
  }
  if (e.altKey && (k === 'Backspace' || k === 'Delete')) { stop(); return psFillSel(PS.fg); }
  if (k === 'Enter') {
    if (PS.cur === 'psCrop' && PS.crop) { stop(); return psCropTo(PS.crop); }
    if (PS.quad) { stop(); return psQuadApply(); }
    if (PS.poly) { stop(); return psPolyClose(); }
    if (PS.curv) { stop(); return psCurvFinish(false); }
    return;
  }
  if (k === 'Escape') {
    if (PS.poly || PS.curv || PS.quad || (PS.cur === 'psCrop' && PS.crop) || PS.drag) {
      stop(); PS.poly = null; PS.curv = null; PS.quad = null; PS.drag = null; if (PS.cur === 'psCrop') PS.crop = { x: 0, y: 0, w: ED.project.width, h: ED.project.height }; psBar(); ED.canvas.requestRenderAll(); return;
    }
    if (e.shiftKey && PS.viewAngle) { stop(); return psSetViewAngle(0); }
    return;
  }
  if (k === 'Delete' || k === 'Backspace') {
    if (PS.cur === 'psSliceSel' && PS.sliceSel >= 0) { stop(); psPage().slices.splice(PS.sliceSel, 1); PS.sliceSel = -1; return psSaveMarks(); }
    if (PS.sel && isRaster(PS.layer) && psLive(PS.layer)) { stop(); psClearSel(); }
    return;
  }
  if (k === 'F5' && e.shiftKey) { stop(); return M.fill?.(); }
  if (k === 'F6' && e.shiftKey) { stop(); return M.feather?.(); }
  if (k === '[' || k === ']') { stop(); const s = PS.o.size, st = s < 10 ? 1 : s < 50 ? 5 : s < 100 ? 10 : 25; PS.o.size = psClamp(s + (k === ']' ? st : -st), 1, 2000); psSave(); psBar(); return ED.canvas.requestRenderAll(); }
  if (k === '{' || k === '}') { stop(); PS.o.hard = psClamp(Math.round((PS.o.hard + (k === '}' ? 0.25 : -0.25)) * 4) / 4, 0, 1); psSave(); return psBar(); }
  if (/^[0-9]$/.test(k) && (PS_PAINT.has(PS.cur) || ['psGradient', 'psBucket'].includes(PS.cur))) { stop(); PS.o.opacity = k === '0' ? 1 : +k / 10; psSave(); return psBar(); }
  if (e.altKey) return;
  if (kl === 'd' && !e.shiftKey) { stop(); PS.fg = '#000000'; PS.bg = '#ffffff'; return psColors(); }
  if (kl === 'x' && !e.shiftKey) { stop(); [PS.fg, PS.bg] = [PS.bg, PS.fg]; return psColors(); }
  if (kl === 'q' && !e.shiftKey) { stop(); return psToggleQM(); }
  if (kl === 'r' && !e.shiftKey) { stop(); return psPick('psRotView'); }
  if (k.length !== 1 || k === ' ') return;
  const g = PSG.find((x) => x !== '-' && x[1] && x[1].toLowerCase() === kl); if (!g) return;
  stop();
  const cur = PS.group[g[0]] || g[2][0][0];
  if (e.shiftKey && g[2].length > 1) { const i = g[2].findIndex((t) => t[0] === cur); return psPick(g[2][(i + 1) % g[2].length][0]); }
  psPick(cur);
}

// ---------------- hooks into the editor ----------------
MODES.design.tools = PSG.filter((g) => g !== '-').map((g) => [g[2][0][0], g[2][0][1], g[1], g[2][0][2]]);
MODES.design.tabs = ['layers', 'templates', 'elements', 'text', 'brand', 'uploads', 'gen', 'ai'];
MODE_KEYS.design = {};
const _buildRailPS = buildRail;
buildRail = function () { if (ED.mode !== 'design') return _buildRailPS(); psRail(); $('#rail3d') && ($('#rail3d').onclick = () => setStudioMode('3d')); };
const _makeShapePS = makeShape;
makeShape = function (kind, x, y) {
  const o = _makeShapePS(kind, x, y);
  if (o && ED.mode === 'design') { if (kind === 'line' || kind === 'arrow') o.set({ stroke: PS.fg, strokeWidth: Math.max(1, PS.o.shapeStroke || 6) }); else o.set({ fill: PS.fg, stroke: PS.bg, strokeWidth: PS.o.shapeStroke || 0 }); }
  return o;
};
const _addTextPS = addText;
addText = function (o = {}) {
  if (ED.mode === 'design' && ED.tool === 'text') o = { ...o, fill: PS.fg, fontFamily: PS.o.font, fontSize: PS.o.fontSize };
  return _addTextPS(o);
};
const _setToolPS = setTool;
setTool = function (t) { if (PS.stroke) psStrokeUp(); return _setToolPS(t); };
const _bootPS = bootEditor;
bootEditor = function () {
  if (editorReady) return;
  _bootPS();
  const c = ED.canvas;
  const bar = document.createElement('div'); bar.id = 'psBar'; bar.className = 'psbar'; $('#docTabs').after(bar);
  c.on('mouse:down', psDown); c.on('mouse:move', psMove); c.on('mouse:up', psUp); c.on('mouse:dblclick', psDbl);
  c.on('mouse:out', () => { PS.mouse = null; if (PS_BRUSHY.has(PS.cur)) c.requestRenderAll(); });
  c.wrapperEl.addEventListener('mousedown', (e) => { if (PS.nodeMode === 'conv' && ED.tool === 'node') Object.defineProperty(e, 'altKey', { value: true }); }, true);
  c.on('path:created', (e) => { if (ED.mode === 'design' && PS.cur === 'psFreePen') e.path.set({ name: 'Freeform path', fill: null }); });
  c.on('text:editing:exited', (e) => { if (e.target?._psMask) setTimeout(() => psTypeMaskDone(e.target), 0); });
  ['selection:created', 'selection:updated'].forEach((ev) => c.on(ev, () => { const a = c.getActiveObject(); if (a && a.type !== 'activeSelection' && !a.isPage) { PS.layer = a; psBar(); } }));
  ED.overlays.push(psOverlay);
  ED.on('tool', psOnTool);
  ED.on('mode', () => { psBar(); psTaskBar(); if (ED.mode === 'design') psOnTool(); });
  const reset = () => { PS.sel = null; PS.lastSel = null; PS.qm = false; PS.qmS = null; PS.crop = null; PS.quad = null; PS.poly = null; PS.curv = null; PS.samplers = []; PS.ruler = null; PS.layer = null; PS.merged = null; PS.viewAngle = 0; psTaskBar(); psBar(); };
  ED.on('page', reset); ED.on('project', reset);
  ED.on('history', () => { if (PS.cur === 'psSampler') psBar(); });
  window.addEventListener('keydown', psKeys, true);
  setInterval(() => { if ((PS.sel || PS.drag || PS.poly) && !PS.qm && ED.mode === 'design' && !$('#editor').classList.contains('hidden') && document.visibilityState === 'visible') { PS.phase++; c.requestRenderAll(); } }, 120);
  psBar();
};
window.PS = PS;

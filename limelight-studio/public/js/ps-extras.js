// Limelight Studio - the rest of the Photoshop workspace in the Design tab: the Properties panel (Document: canvas, resolution,
// mode, fill, rulers & grids, guides; layer kind on top of the layer's own properties), rulers, grid, guides you drag out of
// the rulers, the right-click Transform menu, screen modes, the brush settings panel (F5) and Photoshop's keyboard shortcuts
// (Help > Keyboard Shortcuts lists them all).
PS.ext = Object.assign({ rulers: false, grid: false, guides: true, lockGuides: false, snapGuides: true, checker: true, units: 'px', guideColor: '#00e5ff', screen: 0 },
  (() => { try { return JSON.parse(localStorage.getItem('ll-ps-ext') || '{}'); } catch { return {}; } })());
const psExtSave = () => { try { localStorage.setItem('ll-ps-ext', JSON.stringify(PS.ext)); } catch { /* private */ } ED.canvas?.requestRenderAll(); };
const RULER = 18;
const psGuides = () => { const pg = ED.project?.pages[ED.pageIndex]; return pg ? (pg.guides || (pg.guides = [])) : []; };
const psUnit = (px) => { const dpi = ED.project?.dpi || 96, u = PS.ext.units; return u === 'in' ? px / dpi : u === 'cm' ? (px / dpi) * 2.54 : u === 'mm' ? (px / dpi) * 25.4 : u === '%' ? (px / ED.project.width) * 100 : px; };
Object.assign(ICONS, {
  doc: '<path d="M6 2h9l5 5v15H6z"/><path d="M15 2v5h5"/>', chain: ICONS.chain || '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
  portrait: '<rect x="6" y="3" width="12" height="18" rx="1.5"/><circle cx="12" cy="10" r="2.5"/><path d="M8 18c1-2.5 7-2.5 8 0"/>',
  landscape: '<rect x="3" y="6" width="18" height="12" rx="1.5"/><circle cx="12" cy="11" r="2.2"/><path d="M8.5 16.5c1-2 6-2 7 0"/>',
  rulers: '<path d="M3 3h18v5H8v13H3z"/><path d="M7 3v2M11 3v2M15 3v2M19 3v2M3 12h2M3 16h2"/>', gridI: '<rect x="3" y="3" width="18" height="18"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>',
  checker: '<rect x="3" y="3" width="18" height="18"/><path d="M3 9h6v6H3zM9 3h6v6H9zM15 9h6v6h-6zM9 15h6v6H9z" fill="currentColor" stroke="none"/>',
  guideI: '<path d="M8 3v18M3 15h18" stroke-dasharray="2.5 2"/>', guideLock: '<path d="M8 3v18M3 9h12" stroke-dasharray="2.5 2"/><rect x="14" y="14" width="7" height="6" rx="1"/><path d="M15.5 14v-1.5a2 2 0 014 0V14"/>',
  guideNew: '<path d="M10 3v18" stroke-dasharray="2.5 2"/><path d="M17 8v8M13 12h8"/>', guideClear: '<path d="M10 3v18" stroke-dasharray="2.5 2"/><path d="M14 9l6 6M20 9l-6 6"/>',
});

// ---------------- overlay: grid, guides, rulers ----------------
function psExtOverlay(ctx, v) {
  if (ED.mode !== 'design' || !ED.project || PS.hideExtras) return;
  const c = ED.canvas, P = ED.project, z = ED.zoom, W = c.width, H = c.height;
  if (PS.ext.grid) {
    ctx.save(); ctx.transform(v[0], v[1], v[2], v[3], v[4], v[5]);
    const g = PS.ext.gridSize || PS.o.gridSize || 100, sub = g / (PS.o.gridSub || 4);
    ctx.lineWidth = 1 / z;
    for (const [step, col] of [[sub, 'rgba(120,120,140,.18)'], [g, 'rgba(120,120,140,.45)']]) {
      if (step * z < 4) continue;
      ctx.strokeStyle = col; ctx.beginPath();
      for (let x = 0; x <= P.width; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, P.height); }
      for (let y = 0; y <= P.height; y += step) { ctx.moveTo(0, y); ctx.lineTo(P.width, y); }
      ctx.stroke();
    }
    ctx.restore();
  }
  if (PS.ext.guides) {
    ctx.save(); ctx.strokeStyle = PS.ext.guideColor; ctx.lineWidth = 1;
    const inv = fabric.util.invertTransform(v);
    psGuides().concat(PS.gdrag?.g && !psGuides().includes(PS.gdrag.g) ? [PS.gdrag.g] : []).forEach((g) => {
      ctx.beginPath();
      if (g.x !== undefined) { const a = psTp(v, { x: g.x, y: psTp(inv, { x: 0, y: 0 }).y }), b = psTp(v, { x: g.x, y: psTp(inv, { x: 0, y: H }).y }); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); if (!v[1]) { ctx.moveTo(Math.round(a.x) + 0.5, 0); ctx.lineTo(Math.round(a.x) + 0.5, H); } }
      else { const a = psTp(v, { x: psTp(inv, { x: 0, y: 0 }).x, y: g.y }), b = psTp(v, { x: psTp(inv, { x: W, y: 0 }).x, y: g.y }); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); if (!v[1]) { ctx.moveTo(0, Math.round(a.y) + 0.5); ctx.lineTo(W, Math.round(a.y) + 0.5); } }
      ctx.stroke();
    });
    ctx.restore();
  }
  if (PS.ext.rulers && !v[1]) {
    ctx.save(); ctx.fillStyle = '#16181d'; ctx.fillRect(0, 0, W, RULER); ctx.fillRect(0, 0, RULER, H);
    ctx.strokeStyle = '#5a5a63'; ctx.fillStyle = '#8e8e98'; ctx.font = '9px Inter'; ctx.lineWidth = 1;
    const unitPx = psUnit(1) || 1, nice = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000, 10000];
    const stepU = nice.find((s) => (s / unitPx) * z >= 60) || 10000, step = stepU / unitPx;
    const x0 = -v[4] / z, x1 = (W - v[4]) / z, y0 = -v[5] / z, y1 = (H - v[5]) / z;
    ctx.beginPath();
    for (let x = Math.floor(x0 / step) * step; x < x1; x += step) for (let i = 0; i < 10; i++) {
      const sx = Math.round((x + (step * i) / 10) * z + v[4]) + 0.5; if (sx < RULER) continue;
      const t = i === 0 ? RULER : i === 5 ? 7 : 4; ctx.moveTo(sx, RULER - t); ctx.lineTo(sx, RULER);
      if (!i) ctx.fillText(String(Math.round(psUnit(x) * 100) / 100), sx + 2, 9);
    }
    for (let y = Math.floor(y0 / step) * step; y < y1; y += step) for (let i = 0; i < 10; i++) {
      const sy = Math.round((y + (step * i) / 10) * z + v[5]) + 0.5; if (sy < RULER) continue;
      const t = i === 0 ? RULER : i === 5 ? 7 : 4; ctx.moveTo(RULER - t, sy); ctx.lineTo(RULER, sy);
      if (!i) { ctx.save(); ctx.translate(9, sy + 2); ctx.rotate(-Math.PI / 2); ctx.fillText(String(Math.round(psUnit(y) * 100) / 100), 0, 0); ctx.restore(); }
    }
    ctx.stroke();
    if (PS.mouse) { ctx.strokeStyle = '#ffc21a'; ctx.beginPath(); const mx = PS.mouse.x * z + v[4], my = PS.mouse.y * z + v[5]; ctx.moveTo(mx, 0); ctx.lineTo(mx, RULER); ctx.moveTo(0, my); ctx.lineTo(RULER, my); ctx.stroke(); }
    ctx.fillStyle = '#0b0c0f'; ctx.fillRect(0, 0, RULER, RULER);
    ctx.restore();
  }
}
// transparent artboard: Photoshop's checkerboard
function psChecker() {
  const c = ED.canvas, P = ED.project; if (!P || ED.mode !== 'design' || !PS.ext.checker) return;
  const f = pageRect()?.fill, clear = !f || f === 'transparent' || (typeof f === 'string' && new fabric.Color(f).getAlpha() === 0); if (!clear) return;
  const ctx = c.getContext(), v = c.viewportTransform, r = c.getRetinaScaling();
  if (!PS.checkPat) { const t = canvasEl(16, 16), x = t.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#cfcfd4'; x.fillRect(0, 0, 8, 8); x.fillRect(8, 8, 8, 8); PS.checkPat = ctx.createPattern(t, 'repeat'); }
  ctx.save(); ctx.setTransform(r * v[0], r * v[1], r * v[2], r * v[3], r * v[4], r * v[5]);
  ctx.beginPath(); ctx.rect(0, 0, P.width, P.height); ctx.clip(); ctx.setTransform(r, 0, 0, r, 0, 0); ctx.fillStyle = PS.checkPat; ctx.fillRect(0, 0, c.width, c.height); ctx.restore();
}
// dragging guides out of the rulers / moving them
function psGuideDown(opt) {
  if (ED.mode !== 'design' || !ED.project || opt.e.button !== 0) return;
  const c = ED.canvas, s = c.getPointer(opt.e, true), p = c.getPointer(opt.e), z = ED.zoom;
  let g = null;
  if (PS.ext.rulers && s.y < RULER && s.x > RULER) g = { y: p.y, isNew: true };
  else if (PS.ext.rulers && s.x < RULER && s.y > RULER) g = { x: p.x, isNew: true };
  else if (PS.ext.guides && !PS.ext.lockGuides && (ED.tool === 'select' || ED.tool === 'hand')) g = psGuides().find((q) => (q.x !== undefined ? Math.abs(q.x - p.x) : Math.abs(q.y - p.y)) * z < 4);
  if (!g) return;
  if (g.isNew) { delete g.isNew; g.fresh = true; }
  PS.gdrag = { g }; panState = { guide: true }; c.skipTargetFind = true; c.selection = false;
  const mv = (e) => { const q = c.getPointer(e); if (g.x !== undefined) g.x = Math.round(q.x); else g.y = Math.round(q.y); c.requestRenderAll(); };
  const up = (e) => {
    removeEventListener('mousemove', mv); removeEventListener('mouseup', up);
    const sc = c.getPointer(e, true), list = psGuides(), i = list.indexOf(g), out = (g.x !== undefined ? sc.x < RULER : sc.y < RULER) && PS.ext.rulers;
    if (out) { if (i >= 0) list.splice(i, 1); } else if (i < 0) { delete g.fresh; list.push(g); }
    PS.gdrag = null; panState = null; c.skipTargetFind = false; c.selection = ED.tool === 'select'; c.requestRenderAll(); markDirty();
  };
  addEventListener('mousemove', mv); addEventListener('mouseup', up);
}
function psGuideSnap(e) {
  if (!PS.ext.snapGuides || !PS.ext.guides || ED.mode !== 'design' || e.e?.altKey) return;
  const o = e.target, list = psGuides(); if (!list.length) return;
  const th = 6 / ED.zoom, b = o.getBoundingRect(true, true);
  let dx = null, dy = null;
  for (const g of list) {
    if (g.x !== undefined) for (const m of [b.left, b.left + b.width / 2, b.left + b.width]) { const d = g.x - m; if (Math.abs(d) < th && (dx === null || Math.abs(d) < Math.abs(dx))) dx = d; }
    else for (const m of [b.top, b.top + b.height / 2, b.top + b.height]) { const d = g.y - m; if (Math.abs(d) < th && (dy === null || Math.abs(d) < Math.abs(dy))) dy = d; }
  }
  if (dx !== null) o.left += dx; if (dy !== null) o.top += dy; o.setCoords();
}
PSM.newGuide = () => psForm('New Guide', [['dir', 'Orientation', 'select', 'h', [['h', 'Horizontal'], ['v', 'Vertical']]], ['pos', 'Position (px)', 'number', 0]], (v) => {
  psGuides().push(v.dir === 'h' ? { y: v.pos } : { x: v.pos }); PS.ext.guides = true; psExtSave(); markDirty();
});
PSM.newGuideLayout = () => psForm('New Guide Layout', [['cols', 'Columns', 'number', 3], ['rows', 'Rows', 'number', 0], ['margin', 'Margin (px)', 'number', 0]], (v) => {
  const P = ED.project, m = v.margin, list = psGuides();
  if (m) list.push({ x: m }, { x: P.width - m }, { y: m }, { y: P.height - m });
  for (let i = 1; i < v.cols; i++) list.push({ x: m + ((P.width - 2 * m) * i) / v.cols });
  for (let i = 1; i < v.rows; i++) list.push({ y: m + ((P.height - 2 * m) * i) / v.rows });
  PS.ext.guides = true; psExtSave(); markDirty();
});
PSM.clearGuides = () => { const pg = ED.project.pages[ED.pageIndex]; pg.guides = []; psExtSave(); markDirty(); };

// ---------------- Properties panel ----------------
function psDocPanel(el) {
  const P = ED.project, pr = pageRect(), f = pr?.fill, fstr = typeof f === 'string' ? f : '', clear = !f || fstr === 'transparent' || (fstr && new fabric.Color(fstr).getAlpha() === 0);
  const fillKey = clear ? 'transparent' : toHex(fstr) === '#ffffff' ? 'white' : toHex(fstr) === '#000000' ? 'black' : typeof f === 'object' ? 'gradient' : 'custom';
  const tg = (k, ic, t) => `<button class="icon-btn ps-pt ${PS.ext[k] ? 'on' : ''}" data-ext="${k}" title="${t}">${icon(ic)}</button>`;
  el.innerHTML = `<div class="ps-props-h"><span>Properties</span></div><div class="ps-kind">${icon('doc')}Document</div>`
    + sec('Canvas', `<div class="ps-canvas"><button class="icon-btn ps-link ${PS.linkWH ? 'on' : ''}" data-cv="link" title="Link width and height">${icon('chain')}</button>
      <div class="pair"><div class="num"><b>W</b><input type="number" data-cv="w" value="${P.width}"></div><div class="num"><b>X</b><input type="number" value="0" disabled></div></div>
      <div class="pair"><div class="num"><b>H</b><input type="number" data-cv="h" value="${P.height}"></div><div class="num"><b>Y</b><input type="number" value="0" disabled></div></div></div>
      <div class="btn-row ps-orient"><button class="icon-btn ${P.height >= P.width ? 'on' : ''}" data-cv="portrait" title="Portrait">${icon('portrait')}</button><button class="icon-btn ${P.width > P.height ? 'on' : ''}" data-cv="landscape" title="Landscape">${icon('landscape')}</button></div>
      <p class="muted small ps-res">Resolution: <select data-cv="dpi">${[72, 96, 150, 200, 300, 600].map((d) => `<option ${(P.dpi || 96) === d ? 'selected' : ''}>${d}</option>`).join('')}</select> pixels/inch</p>
      ${fld('Mode', `<select data-cv="mode">${['RGB Color', 'CMYK Color', 'Grayscale', 'Lab Color'].map((m) => `<option ${(P.colorMode || 'RGB Color') === m ? 'selected' : ''}>${m}</option>`).join('')}</select>`)}
      ${fld('', `<select data-cv="bits">${['8 Bits/Channel', '16 Bits/Channel', '32 Bits/Channel'].map((m) => `<option ${(P.bits || '8 Bits/Channel') === m ? 'selected' : ''}>${m}</option>`).join('')}</select>`)}
      ${fld('Fill', `<div class="ps-fillrow"><input type="color" data-cv="fillc" value="${clear ? '#ffffff' : toHex(fstr || '#ffffff')}"><select data-cv="fill">${[['white', 'White'], ['black', 'Black'], ['bg', 'Background Color'], ['transparent', 'Transparent'], ['custom', 'Custom'], ...(fillKey === 'gradient' ? [['gradient', 'Gradient']] : [])].map(([k, n]) => `<option value="${k}" ${fillKey === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>`)}`)
    + sec('Rulers &amp; Grids', `<div class="btn-row">${tg('rulers', 'rulers', 'Rulers (Ctrl+R)')}${tg('grid', 'gridI', "Grid (Ctrl+')")}${tg('checker', 'checker', 'Transparency checkerboard')}
      <select data-cv="units" style="flex:1">${[['px', 'Pixels'], ['in', 'Inches'], ['cm', 'Centimeters'], ['mm', 'Millimeters'], ['%', 'Percent']].map(([k, n]) => `<option value="${k}" ${PS.ext.units === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      ${PS.ext.grid ? `<div class="pair" style="margin-top:8px"><div class="num"><b>Grid</b><input type="number" data-cv="gridSize" value="${PS.o.gridSize}"></div><div class="num"><b>Sub</b><input type="number" data-cv="gridSub" value="${PS.o.gridSub}"></div></div>` : ''}`)
    + sec('Guides', `<div class="btn-row">${tg('guides', 'guideI', 'Show guides (Ctrl+;)')}${tg('lockGuides', 'guideLock', 'Lock guides (Alt+Ctrl+;)')}
      <button class="icon-btn ps-pt" data-cv="newGuide" title="New guide (Alt+Ctrl+N)">${icon('guideNew')}</button><button class="icon-btn ps-pt" data-cv="layout" title="New guide layout">${icon('gridI')}</button>
      <button class="icon-btn ps-pt" data-cv="clearG" title="Clear guides">${icon('guideClear')}</button>
      <input type="color" data-cv="gcol" value="${PS.ext.guideColor}" title="Guide colour" style="width:34px;height:28px;padding:2px"></div>
      <label class="ps-mini"><input type="checkbox" data-cv="snapG" ${PS.ext.snapGuides ? 'checked' : ''}> Snap to guides (Shift+Ctrl+;)</label>
      <p class="muted small">${psGuides().length} guide${psGuides().length === 1 ? '' : 's'} · drag one out of the rulers</p>`)
    + sec('Artboard', `${fld('Name', `<input data-cv="name" value="${esc(P.pages[ED.pageIndex].name)}">`)}
      <select data-cv="preset" style="width:100%"><option value="">Resize to preset…</option>${SIZES.map((s, i) => `<option value="${i}">${s.name} · ${s.w}×${s.h}</option>`).join('')}</select>
      <label class="ps-mini"><input type="checkbox" data-cv="clip" ${ED.clip ? 'checked' : ''}> Clip to artboard</label><label class="ps-mini"><input type="checkbox" data-cv="snap" ${ED.snap ? 'checked' : ''}> Smart guides</label>`)
    + sec('Quick Actions', `<div class="ps-qa">${[['Image Size…', 'imageSize'], ['Canvas Size…', 'canvasSize'], ['Trim', 'trim'], ['Flatten Image', 'flatten'], ['Auto Tone', 'autoTone'], ['Keyboard Shortcuts', 'keys']].map(([n, k]) => `<button class="btn" data-qa="${k}">${n}</button>`).join('')}</div>`);
  const q = (k) => $(`[data-cv="${k}"]`, el), redo = () => renderInspector();
  $$('[data-ext]', el).forEach((b) => b.onclick = () => { PS.ext[b.dataset.ext] = !PS.ext[b.dataset.ext]; psExtSave(); redo(); });
  q('link').onclick = () => { PS.linkWH = !PS.linkWH; redo(); };
  const resize = (w, h) => { w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h)); if (w !== P.width || h !== P.height) resizeProject(w, h); };
  q('w').onchange = () => resize(+q('w').value, PS.linkWH ? (+q('w').value * P.height) / P.width : P.height);
  q('h').onchange = () => resize(PS.linkWH ? (+q('h').value * P.width) / P.height : P.width, +q('h').value);
  q('portrait').onclick = () => { if (P.width > P.height) PSM.rotateCanvas('cw'); };
  q('landscape').onclick = () => { if (P.height > P.width) PSM.rotateCanvas('ccw'); };
  q('dpi').onchange = () => { P.dpi = +q('dpi').value; markDirty(); };
  q('mode').onchange = () => { P.colorMode = q('mode').value; markDirty(); if (P.colorMode === 'Grayscale' && confirm('Convert the pixel layers on this artboard to grayscale too?')) ED.canvas.getObjects().filter(isRaster).forEach((o) => { PS.layer = o; PSM.adjust('desaturate'); }); };
  q('bits').onchange = () => { P.bits = q('bits').value; markDirty(); };
  const setFill = (v) => { pr.set('fill', v); ED.canvas.requestRenderAll(); scheduleHistory(); };
  q('fill').onchange = () => { const k = q('fill').value; setFill(k === 'white' ? '#ffffff' : k === 'black' ? '#000000' : k === 'bg' ? PS.bg : k === 'transparent' ? 'rgba(255,255,255,0)' : q('fillc').value); redo(); };
  q('fillc').oninput = () => setFill(q('fillc').value);
  q('units').onchange = () => { PS.ext.units = q('units').value; psExtSave(); };
  q('gridSize') && (q('gridSize').onchange = () => { PS.o.gridSize = Math.max(2, +q('gridSize').value); psSave(); ED.canvas.requestRenderAll(); });
  q('gridSub') && (q('gridSub').onchange = () => { PS.o.gridSub = Math.max(1, +q('gridSub').value); psSave(); ED.canvas.requestRenderAll(); });
  q('newGuide').onclick = PSM.newGuide; q('layout').onclick = PSM.newGuideLayout; q('clearG').onclick = () => { PSM.clearGuides(); redo(); };
  q('gcol').oninput = () => { PS.ext.guideColor = q('gcol').value; psExtSave(); };
  q('snapG').onchange = () => { PS.ext.snapGuides = q('snapG').checked; psExtSave(); };
  q('name').onchange = () => { P.pages[ED.pageIndex].name = q('name').value; ED.emit('pages'); markDirty(); ED.canvas.requestRenderAll(); };
  q('preset').onchange = () => { const s = SIZES[q('preset').value]; if (s) resizeProject(s.w, s.h); };
  q('clip').onchange = () => { ED.clip = q('clip').checked; updateClip(); };
  q('snap').onchange = () => { ED.snap = q('snap').checked; };
  $$('[data-qa]', el).forEach((b) => b.onclick = () => ({ imageSize: PSM.imageSize, canvasSize: PSM.canvasSize, trim: PSM.trim, flatten: PSM.flatten, autoTone: () => PSM.auto('tone'), keys: psShowKeys })[b.dataset.qa]());
}
const psKind = (o) => (o.smart ? `${o.smart.kind === 'book' ? 'Book' : 'Vector'} Smart Object` : o.scene3d ? '3D Layer' : o.type?.includes('text') ? 'Type Layer' : o.type === 'image' ? (o.placeholder ? 'Frame' : 'Pixel Layer')
  : o.type === 'group' ? 'Group' : o.placeholder ? 'Frame' : o.type === 'activeSelection' ? 'Layers' : 'Shape Layer');
const _renderInspPS = renderInspector;
renderInspector = function () {
  const el = $('#inspector');
  if (ED.mode !== 'design' || !ED.canvas || !ED.project || ED.stack) return _renderInspPS();
  const objs = selected();
  if (!objs.length) return ED.tool === 'brush' ? _renderInspPS() : psDocPanel(el);
  _renderInspPS();
  const o = objs.length > 1 ? ED.canvas.getActiveObject() : objs[0];
  if (!o) return;
  el.insertAdjacentHTML('afterbegin', `<div class="ps-props-h"><span>Properties</span></div><div class="ps-kind">${icon(o.type === 'image' ? 'image' : o.type?.includes('text') ? 'text' : 'layers')}${psKind(o)}${o.clipPath && o.type !== 'activeSelection' ? ' · masked' : ''}</div>`);
};

// ---------------- right-click: Transform menu ----------------
function psCtxMenu(x, y, items) {
  $('#psCtx')?.remove();
  const m = document.createElement('div'); m.id = 'psCtx'; m.className = 'ps-fly ps-ctx';
  m.innerHTML = items.map((it, i) => (it === '-' ? '<hr>' : `<button data-i="${i}"><span>${it[0]}</span>${it[2] ? `<kbd>${it[2]}</kbd>` : ''}</button>`)).join('');
  document.body.appendChild(m);
  m.style.left = Math.min(innerWidth - m.offsetWidth - 8, x) + 'px'; m.style.top = Math.min(innerHeight - m.offsetHeight - 8, y) + 'px';
  $$('[data-i]', m).forEach((b) => b.onclick = () => { m.remove(); items[b.dataset.i][1](); });
  setTimeout(() => document.addEventListener('mousedown', function off(e) { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('mousedown', off); } }), 0);
}
function psSkew() {
  const o = PS.layer; if (!o || !psLive(o)) return toast('Select a layer');
  const dlg = psForm('Skew', [['sx', 'Horizontal skew (°)', 'number', Math.round(o.skewX || 0)], ['sy', 'Vertical skew (°)', 'number', Math.round(o.skewY || 0)]], (v) => { o.set({ skewX: v.sx, skewY: v.sy }); o.setCoords(); ED.canvas.requestRenderAll(); scheduleHistory(); });
  $$('input', dlg).forEach((i) => i.oninput = () => { o.set({ skewX: +$('[data-k=sx]', dlg).value || 0, skewY: +$('[data-k=sy]', dlg).value || 0 }); ED.canvas.requestRenderAll(); });
}
function psRotateLayer(deg) { const o = PS.layer; if (!o || !psLive(o)) return; const c = o.getCenterPoint(); o.set('angle', ((o.angle || 0) + deg) % 360); o.setPositionByOrigin(c, 'center', 'center'); o.setCoords(); ED.canvas.requestRenderAll(); scheduleHistory(); }
function psTransformMenu(e) {
  const o = PS.layer, raster = isRaster(o);
  const persp = () => { if (!raster) { if (!confirm('Perspective and Distort work on pixels. Rasterize this layer?')) return; psRasterize(o); } psAct('persp'); };
  psCtxMenu(e.clientX, e.clientY, [['Free Transform', () => psPick('select'), 'Ctrl+T'], '-', ['Scale', () => psPick('select')], ['Rotate', () => psPick('select')], ['Skew…', psSkew], ['Distort', persp], ['Perspective', persp], '-',
    ['Rotate 180°', () => psRotateLayer(180)], ['Rotate 90° Clockwise', () => psRotateLayer(90)], ['Rotate 90° Counter Clockwise', () => psRotateLayer(-90)], '-',
    ['Flip Horizontal', () => { ED.canvas.setActiveObject(o); flip('h'); }], ['Flip Vertical', () => { ED.canvas.setActiveObject(o); flip('v'); }], '-',
    ['Duplicate Layer', PSM.duplicate, 'Ctrl+J'], ['Rasterize Layer', PSM.rasterize], ['Merge Down', PSM.mergeDown, 'Ctrl+E'], ['Add Layer Mask', () => PSM.addMask(false)], ['Delete Layer', PSM.deleteLayer]]);
}
function psCanvasMenu(e) {
  const sel = !!PS.sel;
  psCtxMenu(e.clientX, e.clientY, sel ? [['Deselect', psDeselect, 'Ctrl+D'], ['Select Inverse', psInverse, 'Shift+Ctrl+I'], ['Feather…', PSM.feather, 'Shift+F6'], '-', ['Layer via Copy', () => psLayerVia(false), 'Ctrl+J'], ['Layer via Cut', () => psLayerVia(true), 'Shift+Ctrl+J'], '-',
    ['Fill…', PSM.fill, 'Shift+F5'], ['Stroke…', PSM.stroke], ['Content-Aware Fill', PSM.contentFill], ['✨ Generative Fill', psSelToGen]]
    : [['Select All', psSelAll, 'Ctrl+A'], ['Reselect', psReselect, 'Shift+Ctrl+D'], '-', ['New Layer', PSM.newLayer, 'Shift+Ctrl+N'], ['Paste', () => psPaste(false), 'Ctrl+V'], '-', ['Rulers', () => { PS.ext.rulers = !PS.ext.rulers; psExtSave(); }, 'Ctrl+R'], ['Grid', () => { PS.ext.grid = !PS.ext.grid; psExtSave(); }, "Ctrl+'"]]);
}

// ---------------- pixel clipboard ----------------
function psCopyPixels(cut) {
  if (!PS.sel || !isRaster(PS.layer) || !psLive(PS.layer)) return false;
  const T = psTarget({ noQM: true, noNew: true }); if (!T) return true;
  const cp = psCopy(T.cv), x = cp.getContext('2d'); x.globalCompositeOperation = 'destination-in'; x.drawImage(psSelLocal(T), 0, 0);
  const o = T.o; PS.pix = { cv: cp, props: { left: o.left, top: o.top, scaleX: o.scaleX, scaleY: o.scaleY, angle: o.angle, flipX: o.flipX, flipY: o.flipY, originX: o.originX, originY: o.originY, cropX: o.cropX, cropY: o.cropY, width: o.width, height: o.height } };
  ED.clipboard = null;
  if (cut) psClearSel();
  toast(cut ? 'Pixels cut' : 'Pixels copied'); return true;
}
function psPaste(inPlace) {
  if (PS.pix) {
    const cv = psCopy(PS.pix.cv), img = new fabric.Image(cv, { ...PS.pix.props, name: 'Pasted pixels', id: uid() }); img._psCv = cv; img._psHist = psCopy(cv);
    if (!inPlace && PS.sel) { /* Photoshop pastes into the same spot */ }
    const c = ED.canvas, objs = c.getObjects(); c.insertAt(img, PS.layer && objs.includes(PS.layer) ? objs.indexOf(PS.layer) + 1 : objs.length);
    PS.layer = img; psCommit(img); return;
  }
  pasteSel(inPlace ? 0 : 24);
}

// ---------------- brush settings panel (F5) ----------------
function psBrushPanel() {
  if ($('#psBrushPanel')) return $('#psBrushPanel').remove();
  const p = document.createElement('div'); p.id = 'psBrushPanel'; p.className = 'ps-dlg'; p.style.right = '16px'; p.style.top = '16px';
  const row = (k, n, min, max, step, pct) => `<label class="psd"><span>${n}<b data-bv="${k}">${pct ? Math.round(PS.o[k] * 100) + '%' : PS.o[k]}</b></span><input type="range" data-bk="${k}" min="${min}" max="${max}" step="${step}" value="${PS.o[k]}" ${pct ? 'data-pct' : ''}></label>`;
  p.innerHTML = `<header>Brush Settings<span class="grow"></span><button class="icon-btn" data-x>×</button></header><div class="ps-dlg-body"><canvas class="ps-hist" width="256" height="70"></canvas>
    ${row('size', 'Size (px)', 1, 1000, 1)}${row('hard', 'Hardness', 0, 1, 0.01, 1)}${row('opacity', 'Opacity', 0.01, 1, 0.01, 1)}${row('flow', 'Flow', 0.01, 1, 0.01, 1)}${row('smooth', 'Smoothing', 0, 1, 0.01, 1)}${row('strength', 'Strength', 0.01, 1, 0.01, 1)}
    <p class="muted small">[ ] size · Shift+[ ] hardness · 1-0 opacity · Shift+1-0 flow · Shift+Alt+1-0 smoothing</p></div>`;
  $('#stage').appendChild(p);
  const prev = () => { const cv = $('canvas', p), x = cv.getContext('2d'); x.clearRect(0, 0, 256, 70); const r = Math.min(30, PS.o.size / 2 + 1); for (let i = 0; i <= 40; i++) { const t = i / 40; psStamp(x, 20 + t * 216, 35 + Math.sin(t * 6.28) * 14, r, PS.o.hard, '#e8e8ee', PS.o.flow * PS.o.opacity * 0.5); } };
  $$('[data-bk]', p).forEach((i) => i.oninput = () => { const k = i.dataset.bk; PS.o[k] = +i.value; $(`[data-bv="${k}"]`, p).textContent = i.hasAttribute('data-pct') ? Math.round(PS.o[k] * 100) + '%' : PS.o[k]; psSave(); psBar(); prev(); });
  $('[data-x]', p).onclick = () => p.remove(); p.onkeydown = (e) => e.stopPropagation(); prev();
}

// ---------------- screen modes, file commands ----------------
function psScreen(next) { PS.ext.screen = next ?? (PS.ext.screen + 1) % 3; document.body.dataset.psScreen = PS.ext.screen; psExtSave(); toast(['Standard Screen Mode', 'Full Screen Mode with Menu Bar', 'Full Screen Mode (F to come back)'][PS.ext.screen]); }
async function psSaveAs() {
  psForm('Save As', [['name', 'Name', 'text', `${ED.project.name} copy`]], async (v) => {
    storePage(); const copy = JSON.parse(JSON.stringify(ED.project)); copy.id = 'p' + Date.now().toString(36); copy.name = v.name || copy.name;
    await fetch(`/api/projects/${copy.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(copy) });
    await openInEditor(copy); toast(`Saved as “${copy.name}”`);
  });
}
async function psRevert() { if (!confirm('Revert to the last saved version?')) return; clearTimeout(dirtyTimer); const p = await fetch(`/api/projects/${ED.project.id}`).then((r) => r.json()).catch(() => null); if (p?.pages) { await openProject(p); toast('Reverted'); } }
function psPrint() {
  const P = ED.project, cv = psRender(ED.canvas.getObjects(), 0, 0, P.width, P.height, 1), url = cv.toDataURL('image/png');
  const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;width:0;height:0;border:0'; document.body.appendChild(f);
  f.contentDocument.write(`<html><head><title>${esc(P.name)}</title><style>@page{margin:10mm}body{margin:0}img{max-width:100%;max-height:100vh;display:block;margin:auto}</style></head><body><img src="${url}"></body></html>`);
  f.contentDocument.close(); setTimeout(() => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 1000); }, 300);
}
function psCloseDoc(all) { if (!all && typeof closeDoc === 'function' && ED.project && !ED.stack) closeDoc(ED.project.id); else goHome(); }

// ---------------- keyboard shortcuts ----------------
const PS_KEYS = {
  'File': [['New', 'Ctrl+N'], ['Open', 'Ctrl+O'], ['Open As', 'Alt+Shift+Ctrl+O'], ['Save', 'Ctrl+S'], ['Save As', 'Shift+Ctrl+S'], ['Revert', 'F12'], ['Export As', 'Alt+Shift+Ctrl+W'], ['Export (quick)', 'Ctrl+E outside Design'], ['Close', 'Ctrl+W'], ['Close All', 'Alt+Ctrl+W'], ['Print', 'Ctrl+P'], ['Exit to Home', 'Ctrl+Q']],
  'Edit': [['Undo', 'Ctrl+Z'], ['Redo', 'Shift+Ctrl+Z / Ctrl+Y'], ['Cut', 'Ctrl+X'], ['Copy', 'Ctrl+C'], ['Paste', 'Ctrl+V'], ['Paste in Place', 'Shift+Ctrl+V'], ['Clear', 'Delete'], ['Fill', 'Shift+F5'], ['Fill with foreground', 'Alt+Backspace'], ['Fill with background', 'Ctrl+Backspace'], ['Content-Aware Fill', 'Alt+Shift+Ctrl+C'], ['Free Transform', 'Ctrl+T']],
  'Selection': [['Select All', 'Ctrl+A'], ['Deselect', 'Ctrl+D'], ['Reselect', 'Shift+Ctrl+D'], ['Inverse', 'Shift+Ctrl+I'], ['All Layers', 'Alt+Ctrl+A'], ['Feather', 'Shift+F6'], ['Add / Subtract / Intersect', 'Shift / Alt / Shift+Alt + drag'], ['Quick Mask', 'Q']],
  'View': [['Zoom In / Out', 'Ctrl++ / Ctrl+-'], ['Fit on Screen', 'Ctrl+0'], ['100%', 'Ctrl+1'], ['200%', 'Ctrl+2'], ['Rulers', 'Ctrl+R'], ['Show / Hide Guides', 'Ctrl+;'], ['Lock Guides', 'Alt+Ctrl+;'], ['Snap to Guides', 'Shift+Ctrl+;'], ['New Guide', 'Alt+Ctrl+N'], ['Grid', "Ctrl+'"], ['Extras', 'Ctrl+H'], ['Screen Mode', 'F'], ['Hide panels', 'Tab'], ['Rotate View', 'R · Shift+Esc resets'], ['Temporary Zoom', 'Ctrl+Space'], ['Pan', 'Hold Space']],
  'Tools': PSG.filter((g) => g !== '-' && g[1]).map((g) => [g[2].map((t) => t[2]).join(' · '), `${g[1]}${g[2].length > 1 ? ` (Shift+${g[1]} cycles)` : ''}`]).concat([['Default colours', 'D'], ['Swap colours', 'X'], ['Rotate View', 'R']]),
  'Layers': [['New Layer', 'Shift+Ctrl+N'], ['Layer via Copy', 'Ctrl+J'], ['Layer via Cut', 'Shift+Ctrl+J'], ['Merge Down', 'Ctrl+E'], ['Merge Visible', 'Shift+Ctrl+E'], ['Flatten Image', 'Shift+Ctrl+Alt+E'], ['New Fill Layer', 'Alt+Shift+Ctrl+N'], ['New Adjustment', 'Alt+Ctrl+J'], ['Group / Ungroup', 'Ctrl+G / Shift+Ctrl+G'], ['Hide Layer', 'Ctrl+,'], ['Show All Layers', 'Ctrl+.'], ['Lock / Unlock', '/'], ['Bring Forward / Back', 'Ctrl+] / Ctrl+['], ['Transform menu', 'Right-click a layer']],
  'Adjustments': [['Levels', 'Ctrl+L'], ['Curves', 'Ctrl+M'], ['Exposure', 'Alt+Shift+Ctrl+E'], ['Hue/Saturation', 'Ctrl+U'], ['Color Balance', 'Ctrl+B'], ['Black & White', 'Alt+Shift+Ctrl+B'], ['Photo Filter', 'Alt+Ctrl+F'], ['Channel Mixer', 'Alt+Shift+Ctrl+X'], ['Invert', 'Ctrl+I'], ['Desaturate', 'Shift+Ctrl+U'], ['Auto Tone', 'Shift+Ctrl+L'], ['Auto Contrast', 'Alt+Shift+Ctrl+L'], ['Auto Color', 'Shift+Ctrl+B'], ['Last Filter', 'Ctrl+F'], ['Image Size', 'Alt+Ctrl+I'], ['Canvas Size', 'Alt+Ctrl+C']],
  'Brush': [['Bigger / smaller', '] / ['], ['Harder / softer', 'Shift+] / Shift+['], ['Opacity', '1 … 0'], ['Flow', 'Shift+1 … 0'], ['Smoothing', 'Shift+Alt+1 … 0'], ['Brush Settings', 'F5'], ['Pick colour while painting', 'Alt+click'], ['Clone source', 'Alt+click']],
  'Type (text selected)': [['Font size +2 / -2', 'Shift+Ctrl+> / <'], ['Bold', 'Ctrl+B'], ['Italic', 'Ctrl+I'], ['Underline', 'Ctrl+U'], ['Align left / center / right', 'Shift+Ctrl+L / C / R'], ['Justify', 'Shift+Ctrl+J']],
};
function psShowKeys() {
  $('#psKeys')?.remove();
  const m = document.createElement('div'); m.id = 'psKeys'; m.className = 'modal';
  m.innerHTML = `<div class="dialog ps-keys"><h3>Keyboard Shortcuts <span class="muted small">— Design tab (Photoshop)</span></h3><div class="ps-keys-grid">${Object.entries(PS_KEYS).map(([g, list]) => `<section><h4>${g}</h4>${list.map(([n, k]) => `<div><span>${esc(n)}</span><kbd>${esc(k)}</kbd></div>`).join('')}</section>`).join('')}</div>
    <div class="dialog-actions"><div class="grow"></div><button class="btn primary" data-x>Close</button></div></div>`;
  document.body.appendChild(m);
  m.onclick = (e) => { if (e.target === m || e.target.closest('[data-x]')) m.remove(); };
}
function psTextKeys(e, t) {
  const kc = e.code, sh = e.shiftKey;
  const sel = t.isEditing && t.selectionStart !== t.selectionEnd, set = (k, v) => { if (sel) t.setSelectionStyles({ [k]: v }); else t.set(k, v); t.initDimensions?.(); ED.canvas.requestRenderAll(); scheduleHistory(); renderInspector(); };
  const cur = (k) => (sel ? t.getSelectionStyles(t.selectionStart, t.selectionStart + 1)[0]?.[k] ?? t[k] : t[k]);
  if (sh && (kc === 'Period' || kc === 'Comma')) return set('fontSize', Math.max(4, (cur('fontSize') || 40) + (kc === 'Period' ? 2 : -2))), true;
  if (!sh && kc === 'KeyB') return set('fontWeight', +cur('fontWeight') >= 600 || cur('fontWeight') === 'bold' ? 400 : 700), true;
  if (!sh && kc === 'KeyI') return set('fontStyle', cur('fontStyle') === 'italic' ? 'normal' : 'italic'), true;
  if (!sh && kc === 'KeyU') return set('underline', !cur('underline')), true;
  if (sh && ['KeyL', 'KeyC', 'KeyR', 'KeyJ'].includes(kc)) { t.set('textAlign', { KeyL: 'left', KeyC: 'center', KeyR: 'right', KeyJ: 'justify' }[kc]); ED.canvas.requestRenderAll(); scheduleHistory(); renderInspector(); return true; }
  return false;
}
window.addEventListener('keydown', (e) => {
  if ($('#editor').classList.contains('hidden') || ED.mode !== 'design' || !ED.canvas || !ED.project || !$('#studio3d').classList.contains('hidden')) return;
  if (PS.sam || e.target.closest?.('.ps-dlg, .ps-prompt, .modal')) return;
  const ctrl = e.ctrlKey || e.metaKey, alt = e.altKey, sh = e.shiftKey, kc = e.code, stop = () => { e.preventDefault(); e.stopImmediatePropagation(); };
  const a = ED.canvas.getActiveObject(), text = a && a.type?.includes('text') ? a : null;
  if (ctrl && !alt && text && psTextKeys(e, text)) return stop();
  if (isTyping(e)) return;
  const run = (f) => { stop(); f(); };
  if (ctrl) {
    const C = `${alt ? 'A' : ''}${sh ? 'S' : ''}:${kc}`;
    const map = {
      ':KeyN': () => openModal('customModal'), 'AS:KeyO': () => pickFiles('image/*,.svg,.psd'), 'S:KeyS': psSaveAs, 'AS:KeyW': () => openExport(), ':KeyW': () => psCloseDoc(false), 'A:KeyW': () => psCloseDoc(true),
      ':KeyP': psPrint, ':KeyQ': () => goHome(), 'S:KeyZ': redo,
      ':KeyX': () => { if (!psCopyPixels(true)) { copySel(); deleteSel(); } }, ':KeyC': () => { if (!psCopyPixels(false)) { PS.pix = null; copySel(); } }, ':KeyV': () => psPaste(false), 'S:KeyV': () => psPaste(true),
      'AS:KeyC': () => PSM.contentFill(), 'A:KeyA': () => { setTool('select'); selectAll(); },
      ':Semicolon': () => { PS.ext.guides = !PS.ext.guides; psExtSave(); renderInspector(); }, 'A:Semicolon': () => { PS.ext.lockGuides = !PS.ext.lockGuides; psExtSave(); toast(PS.ext.lockGuides ? 'Guides locked' : 'Guides unlocked'); },
      'S:Semicolon': () => { PS.ext.snapGuides = !PS.ext.snapGuides; psExtSave(); toast(`Snap ${PS.ext.snapGuides ? 'on' : 'off'}`); }, ':Quote': () => { PS.ext.grid = !PS.ext.grid; psExtSave(); renderInspector(); },
      'A:KeyN': PSM.newGuide, ':KeyR': () => { PS.ext.rulers = !PS.ext.rulers; psExtSave(); renderInspector(); }, ':KeyH': () => { PS.hideExtras = !PS.hideExtras; ED.canvas.requestRenderAll(); },
      ':Digit0': () => { PS.viewAngle = 0; fitView(); }, ':Numpad0': () => { PS.viewAngle = 0; fitView(); }, ':Digit1': () => setZoom(1), ':Digit2': () => setZoom(2),
      ':KeyE': () => PSM.mergeDown(), 'AS:KeyE': () => PSM.adjust('exposure'), 'AS:KeyN': () => PSM.fillLayer('solid'), 'A:KeyJ': () => psCanvasAdjMenu(), 'AS:KeyB': () => PSM.adjust('bw'), 'A:KeyF': () => PSM.adjust('photoFilter'),
      'AS:KeyX': () => PSM.adjust('channelMixer'), ':KeyF': () => PSM.lastFilter(), ':Comma': () => { const o = PS.layer; if (o && psLive(o)) { o.visible = false; ED.canvas.discardActiveObject(); ED.canvas.requestRenderAll(); scheduleHistory(); ED.emit('layers'); } },
      ':Period': () => { ED.canvas.getObjects().forEach((o) => { o.visible = true; }); ED.canvas.requestRenderAll(); scheduleHistory(); ED.emit('layers'); },
    };
    if (['S:KeyE', 'S:KeyJ', 'S:KeyN', 'S:KeyI', 'S:KeyD', 'S:KeyU', 'S:KeyL', 'S:KeyB', 'AS:KeyL'].includes(C)) return; // handled in ps-core
    if (map[C]) return run(map[C]);
    return;
  }
  if (kc === 'F12') return run(psRevert);
  if (kc === 'F5' && !sh) return run(psBrushPanel);
  if (kc === 'Tab' && !alt) return run(() => psScreen(PS.ext.screen ? 0 : 1));
  if (!alt && !sh && kc === 'KeyF') return run(() => psScreen());
  if (!alt && !sh && e.key === '/') return run(() => { const o = PS.layer; if (o && psLive(o)) { lockObj(o, !o.locked); ED.canvas.requestRenderAll(); scheduleHistory(); renderInspector(); toast(o.locked ? 'Layer locked' : 'Layer unlocked'); } });
  if (/^Digit\d$/.test(kc) && sh) {
    const n = +kc.slice(5), v = n === 0 ? 1 : n / 10;
    if (alt) return run(() => { PS.o.smooth = n === 0 ? 0 : v; psSave(); psBar(); toast(`Smoothing ${Math.round(PS.o.smooth * 100)}%`); });
    return run(() => { PS.o.flow = v; psSave(); psBar(); toast(`Flow ${Math.round(v * 100)}%`); });
  }
}, true);
function psCanvasAdjMenu() {
  const r = $('#stage').getBoundingClientRect();
  psCtxMenu(r.left + r.width / 2 - 110, r.top + 60, [['Brightness/Contrast…', () => PSM.adjust('brightness')], ['Levels…', () => PSM.adjust('levels')], ['Curves…', () => PSM.adjust('curves')], ['Exposure…', () => PSM.adjust('exposure')], ['Vibrance…', () => PSM.adjust('vibrance')],
    ['Hue/Saturation…', () => PSM.adjust('hueSat')], ['Color Balance…', () => PSM.adjust('colorBalance')], ['Black & White…', () => PSM.adjust('bw')], ['Photo Filter…', () => PSM.adjust('photoFilter')], ['Channel Mixer…', () => PSM.adjust('channelMixer')],
    ['Invert', () => PSM.adjust('invert')], ['Posterize…', () => PSM.adjust('posterize')], ['Threshold…', () => PSM.adjust('threshold')], ['Gradient Map…', () => PSM.adjust('gradientMap')], ['Selective Color…', () => PSM.adjust('selectiveColor')]]);
}
// Ctrl+Space: zoom tool while held
window.addEventListener('keydown', (e) => {
  if (ED.mode !== 'design' || !ED.project || isTyping(e) || e.code !== 'Space' || !(e.ctrlKey || e.metaKey) || PS.tmpTool) return;
  e.preventDefault(); e.stopImmediatePropagation(); PS.tmpTool = PS.cur; psPick('psZoom');
}, true);
window.addEventListener('keyup', (e) => {
  if (!PS.tmpTool || (e.code !== 'Space' && e.key !== 'Control' && e.key !== 'Meta')) return;
  const t = PS.tmpTool; PS.tmpTool = null; psPick(t);
});

// ---------------- menus: View additions, Help ----------------
MENUS.view.push(['-', , , PS_D], ['Rulers', () => { PS.ext.rulers = !PS.ext.rulers; psExtSave(); }, 'Ctrl+R', PS_D], ['Grid', () => { PS.ext.grid = !PS.ext.grid; psExtSave(); }, "Ctrl+'", PS_D],
  ['Guides', () => { PS.ext.guides = !PS.ext.guides; psExtSave(); }, 'Ctrl+;', PS_D], ['Lock Guides', () => { PS.ext.lockGuides = !PS.ext.lockGuides; psExtSave(); }, 'Alt+Ctrl+;', PS_D], ['New Guide…', PSM.newGuide, 'Alt+Ctrl+N', PS_D],
  ['New Guide Layout…', PSM.newGuideLayout, '', PS_D], ['Clear Guides', PSM.clearGuides, '', PS_D], ['Extras', () => { PS.hideExtras = !PS.hideExtras; ED.canvas.requestRenderAll(); }, 'Ctrl+H', PS_D],
  ['Screen Mode', [['Standard Screen Mode', () => psScreen(0)], ['Full Screen Mode With Menu Bar', () => psScreen(1)], ['Full Screen Mode', () => psScreen(2)]], 'F', PS_D], ['Fit on Screen', fitView, 'Ctrl+0', PS_D], ['200%', () => setZoom(2), 'Ctrl+2', PS_D]);
MENUS.file.push(['-', , , PS_D], ['Save As…', psSaveAs, 'Shift+Ctrl+S', PS_D], ['Revert', psRevert, 'F12', PS_D], ['Print…', psPrint, 'Ctrl+P', PS_D], ['Close', () => psCloseDoc(false), 'Ctrl+W', PS_D]);
MENUS.edit.push(['Cut', () => { if (!psCopyPixels(true)) { copySel(); deleteSel(); } }, 'Ctrl+X', PS_D], ['Paste in Place', () => psPaste(true), 'Shift+Ctrl+V', PS_D]);
MENUS.window = [['Brush Settings', psBrushPanel, 'F5'], ['Properties', () => { ED.canvas.discardActiveObject(); renderInspector(); }], ['Layers', () => showTab('layers')], ['Keyboard Shortcuts', psShowKeys, 'Alt+Shift+Ctrl+K']];
MENUS.help = [['Keyboard Shortcuts', psShowKeys, 'Alt+Shift+Ctrl+K'], ['Photoshop tools in the Design tab', () => toast('Right-click a tool for its group · Shift+its key cycles · the bar on top shows its options')]];
window.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.altKey && e.shiftKey && e.code === 'KeyK' && !$('#editor').classList.contains('hidden')) { e.preventDefault(); e.stopImmediatePropagation(); psShowKeys(); } }, true);
(() => {
  const wrap = $('.menu-wrap');
  [['window', 'Window', true], ['help', 'Help', false]].forEach(([k, n, only]) => { const b = document.createElement('button'); b.className = 'tb' + (only ? ' ps-only' : ''); b.dataset.menu = k; b.textContent = n; wrap.appendChild(b); });
})();

// ---------------- hooks ----------------
const _bootPSX = bootEditor;
bootEditor = function () {
  if (editorReady) return;
  _bootPSX();
  const c = ED.canvas;
  document.body.dataset.psScreen = PS.ext.screen;
  c.on('before:render', psChecker);
  ED.overlays.push(psExtOverlay);
  c.on('mouse:down:before', psGuideDown);
  c.on('object:moving', psGuideSnap);
  c.on('mouse:down', (opt) => {
    if (ED.mode !== 'design' || opt.e.button !== 2) return;
    const t = opt.target && !opt.target.isPage ? opt.target : null;
    if (t) { PS.layer = t; if (ED.tool === 'select') c.setActiveObject(t); psTransformMenu(opt.e); } else psCanvasMenu(opt.e);
  });
  // Move tool: Auto-Select off = only the chosen layer can be grabbed; Show Transform Controls
  const autoSel = () => {
    if (ED.mode !== 'design' || ED.tool !== 'select') return;
    c.getObjects().forEach((o) => { if (!o.isPage) o.evented = PS.o.autoSelect || o === PS.layer; });
    const a = c.getActiveObject(); if (a) { a.hasControls = !!PS.o.showTC && !a.locked; c.requestRenderAll(); }
  };
  ED.on('tool', autoSel); ED.on('selection', autoSel);
  $('#psBar').addEventListener('change', (e) => { if (['autoSelect', 'showTC'].includes(e.target.dataset?.o)) setTimeout(autoSel, 0); });
};

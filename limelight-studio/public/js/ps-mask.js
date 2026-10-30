// Limelight Studio - Photoshop layer masks and Select and Mask for the Design tab.
// A layer mask belongs to its layer: it is an image clip path in the layer's own space, so it moves, scales and rotates
// with the layer, at the layer's own resolution. Paint on it (click its thumbnail; black hides, white shows), set Density
// and Feather in Properties, disable it (Shift+click), load it as a selection (Ctrl+click), view it (Alt+click, \),
// drag it to another layer (Alt = copy) or onto the trash to delete it (Apply / Delete, like Photoshop).
// Select and Mask (Alt+Ctrl+R) refines a selection or a mask: edge detection radius + refine edge brush (colour-aware
// edge from the colours inside and outside), smooth, feather, contrast, shift edge, decontaminate colours, view modes,
// and output to selection, layer mask, new layer or new layer with mask.
PROPS.push('psMask', 'psMaskOff', 'psDensity', 'psFeather');
fabric.perfLimitSizeTotal = 16777216; fabric.maxCacheSideLimit = 8192; // masked layers keep their sharpness when zoomed in
Object.assign(ICONS, {
  refineBrush: '<path d="M14 4l6 6-8 8H6v-6z"/><path d="M3 21c1-2 2-3 4-3" stroke-dasharray="1.5 1.5"/>',
  maskIc: ICONS.maskIc || '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="12" cy="12" r="4.5"/>',
});
PS_BRUSHY.add('samQuick').add('samBrush').add('samRefine');

// ---------------- the mask of a layer ----------------
const psHasMask = (o) => !!o?.clipPath?.psMask;
function psMaskRes(o) {
  let q = isRaster(o) ? 1 : Math.min(1, Math.max(0.25, psDet(o.calcTransformMatrix()) * 1.25));
  const lim = 8192 / Math.max((o.width || 1) * q, (o.height || 1) * q); if (lim < 1) q *= lim;
  return q;
}
// design px -> mask px (the mask covers the layer's own box, centre based)
const psMaskD2M = (o, cv) => fabric.util.multiplyTransformMatrices([cv.width / (o.width || 1), 0, 0, cv.height / (o.height || 1), cv.width / 2, cv.height / 2], fabric.util.invertTransform(o.calcTransformMatrix()));
const psMaskM2D = (o, cv) => fabric.util.invertTransform(psMaskD2M(o, cv));
function psInvertAlpha(cv) { const t = psCopy(cv), x = cv.getContext('2d'); x.save(); x.globalCompositeOperation = 'copy'; x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height); x.globalCompositeOperation = 'destination-out'; x.drawImage(t, 0, 0); x.restore(); }
function psMaskFromSel(o, sel, hide) {
  const q = psMaskRes(o), cv = canvasEl(Math.max(1, Math.round((o.width || 1) * q)), Math.max(1, Math.round((o.height || 1) * q))), x = cv.getContext('2d');
  if (sel) { const m = psMaskD2M(o, cv); x.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]); x.drawImage(sel.cv, 0, 0, sel.cv.width / sel.k, sel.cv.height / sel.k); x.setTransform(1, 0, 0, 1, 0, 0); if (hide) psInvertAlpha(cv); }
  else if (!hide) { x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height); }
  return cv;
}
function psMaskSet(o, cv) {
  o.clipPath = new fabric.Image(cv, { originX: 'center', originY: 'center', left: 0, top: 0, scaleX: (o.width || 1) / cv.width, scaleY: (o.height || 1) / cv.height, psMask: true, psDensity: 1, psFeather: 0 });
  o.psMaskOff = null; o._maskOffObj = null; o.maskShape = null; psMaskDirty(o);
}
function psMaskDirty(o) { if (o.clipPath) o.clipPath.dirty = true; o.dirty = true; if (o.group) o.group.dirty = true; ED.canvas.requestRenderAll(); }
function psMaskEl(c) { // the mask's pixels as a canvas we can paint on
  const el = c._originalElement || c._element;
  if (el instanceof HTMLCanvasElement) return el;
  const cv = canvasEl(el.naturalWidth || el.width, el.naturalHeight || el.height); cv.getContext('2d').drawImage(el, 0, 0);
  c.setElement(cv, { width: c.width, height: c.height }); return cv;
}
// Density / Feather are kept apart from the painted mask (c._raw) like Photoshop's mask properties
function psMaskRebuild(o) {
  const c = o.clipPath; if (!c?.psMask) return;
  const E = psMaskEl(c); if (!c._raw) c._raw = psCopy(E);
  const k = E.width / (o.width || 1) / (psDet(o.calcTransformMatrix()) || 1), x = E.getContext('2d');
  x.save(); x.globalCompositeOperation = 'copy'; if (c.psFeather > 0) x.filter = `blur(${c.psFeather * k}px)`; x.drawImage(c._raw, 0, 0); x.filter = 'none';
  if ((c.psDensity ?? 1) < 1) { x.globalCompositeOperation = 'destination-over'; x.fillStyle = `rgba(255,255,255,${1 - c.psDensity})`; x.fillRect(0, 0, E.width, E.height); }
  x.restore(); psMaskDirty(o);
}
const psMaskWork = (c) => c._raw || psMaskEl(c);
function psSelFromMask(o) {
  const c = o.clipPath, s = psSelCanvas(), x = s.cv.getContext('2d'), E = psMaskEl(c), m = fabric.util.multiplyTransformMatrices([s.k, 0, 0, s.k, 0, 0], psMaskM2D(o, E));
  x.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]); x.drawImage(E, 0, 0); return s;
}
function psMaskTarget() {
  const o = PS.maskEdit;
  if (!o || !psLive(o) || !psHasMask(o)) { if (PS.maskEdit) { PS.maskEdit = null; psBar(); } return null; }
  const c = o.clipPath, cv = psMaskWork(c), m = psMaskD2M(o, cv);
  return { o: null, owner: o, isMask: true, cv, m, k: psDet(m), touch: () => (c._raw ? psMaskRebuild(o) : psMaskDirty(o)), done: () => { scheduleHistory(); ED.emit('layers'); } };
}

// ---------------- mask commands ----------------
function psAddMaskTo(o, hide) {
  if (!o || !psLive(o)) return toast('Select a layer first');
  if (psHasMask(o)) return toast('This layer already has a mask — paint on it, or drag it to the trash first');
  if (o.psMaskOff) return toast('This layer has a disabled mask — Shift+click its thumbnail to turn it back on');
  psMaskSet(o, psMaskFromSel(o, PS.sel, hide)); psSelSet(null);
  PS.layer = o; psMaskEdit(o, true); scheduleHistory(); ED.emit('layers'); toast(hide ? 'Layer mask added (hides the selection)' : 'Layer mask added — paint black to hide, white to show');
}
function psMaskEdit(o, on) {
  PS.maskEdit = on ? o : null;
  if (on && (new fabric.Color(PS.fg).getSource()[0] !== new fabric.Color(PS.fg).getSource()[1])) { PS.fg = '#ffffff'; PS.bg = '#000000'; psColors(); }
  psBar(); renderInspector(); ED.emit('layers'); ED.canvas.requestRenderAll();
}
function psMaskDisable(o, off) {
  if (off) { if (!psHasMask(o)) return; o._maskOffObj = o.clipPath; o.psMaskOff = o.clipPath.toObject(PROPS); o.clipPath = null; if (PS.maskEdit === o) PS.maskEdit = null; }
  else {
    const obj = o._maskOffObj, json = o.psMaskOff; o.psMaskOff = null; o._maskOffObj = null;
    if (obj) o.clipPath = obj;
    else if (json) fabric.Image.fromObject(json, (img) => { o.clipPath = img; psMaskDirty(o); scheduleHistory(); ED.emit('layers'); });
  }
  psMaskDirty(o); scheduleHistory(); ED.emit('layers'); renderInspector(); toast(off ? 'Mask disabled' : 'Mask enabled');
}
function psMaskRemove(o) { o.clipPath = null; o.psMaskOff = null; o._maskOffObj = null; o.maskShape = null; if (PS.maskEdit === o) PS.maskEdit = null; psMaskDirty(o); scheduleHistory(); ED.emit('layers'); renderInspector(); psBar(); }
async function psMaskApply(o) {
  if (!psHasMask(o)) return toast('This layer has no active mask');
  if (PS.maskEdit === o) PS.maskEdit = null;
  const r = psRasterize(o); if (r) { r.clipPath = null; await psCommit(r); toast('Mask applied'); }
}
function psAsk(title, msg, buttons) {
  return new Promise((done) => {
    const m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = `<div class="dialog small"><h3>${esc(title)}</h3><p class="muted">${esc(msg)}</p><div class="dialog-actions"><div class="grow"></div>${buttons.map(([k, n, p]) => `<button class="btn ${p ? 'primary' : 'ghost'}" data-b="${k}">${n}</button>`).join('')}</div></div>`;
    document.body.appendChild(m);
    const end = (v) => { m.remove(); removeEventListener('keydown', key, true); done(v); };
    const key = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); end(null); } if (e.key === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); end(buttons.find((b) => b[2])?.[0]); } };
    addEventListener('keydown', key, true);
    $$('[data-b]', m).forEach((b) => b.onclick = () => end(b.dataset.b));
  });
}
async function psMaskDelete(o) {
  if (!o) return;
  if (!psHasMask(o) && !o.psMaskOff) {
    if (o.clipPath) { psMaskRemove(o); return toast('Mask removed'); }
    return toast('This layer has no mask');
  }
  const a = await psAsk('Delete Layer Mask', 'Apply mask to layer before removing?', [['cancel', 'Cancel'], ['delete', 'Delete'], ['apply', 'Apply', true]]);
  if (a === 'apply') { if (o.psMaskOff) psMaskDisable(o, false); setTimeout(() => psMaskApply(o), 50); }
  else if (a === 'delete') { psMaskRemove(o); toast('Mask deleted'); }
}
function psMaskMove(from, to, copy) {
  if (!from || !to || from === to || !psHasMask(from)) return;
  if (psHasMask(to) && !confirm(`Replace the mask of “${to.name || to.type}”?`)) return;
  const s = psSelFromMask(from);
  psMaskSet(to, psMaskFromSel(to, s, false));
  if (!copy) psMaskRemove(from);
  scheduleHistory(); ED.emit('layers'); toast(copy ? 'Mask copied' : 'Mask moved');
}
function psMaskInvert(o) { const c = o?.clipPath; if (!c?.psMask) return toast('No mask selected'); psInvertAlpha(psMaskWork(c)); c._raw ? psMaskRebuild(o) : psMaskDirty(o); scheduleHistory(); ED.emit('layers'); }
function psMaskLoadSel(o, mode = 'new') { if (!psHasMask(o)) return toast('This layer has no active mask'); psSelCommit(psSelFromMask(o), mode); }

// thumbnail actions (Layers panel)
window.psMaskThumbClick = (o, e) => {
  if (e.ctrlKey || e.metaKey) return psMaskLoadSel(o, e.shiftKey && e.altKey ? 'int' : e.shiftKey ? 'add' : e.altKey ? 'sub' : 'new');
  if (e.shiftKey) return psMaskDisable(o, !o.psMaskOff);
  if (e.altKey) { PS.maskSolo = PS.maskSolo === o ? null : o; ED.canvas.requestRenderAll(); return toast(PS.maskSolo ? 'Showing the mask only — Alt+click again to go back' : 'Mask view off'); }
  if (o.psMaskOff) return psMaskDisable(o, false);
  PS.layer = o; if (!PS_PAINT.has(PS.cur) && PS.cur !== 'psGradient') psPick('psBrush');
  psMaskEdit(o, true); toast('Editing the mask — paint black to hide, white to show · click the layer thumbnail to go back');
};
window.psLayerThumbClick = (o) => { if (PS.maskEdit) psMaskEdit(o, false); };
window.psMaskMenu = (o, e) => psCtxMenu(e.clientX, e.clientY, [
  [o.psMaskOff ? 'Enable Layer Mask' : 'Disable Layer Mask', () => psMaskDisable(o, !o.psMaskOff), 'Shift+click'], ['Delete Layer Mask', () => psMaskDelete(o)], ['Apply Layer Mask', () => psMaskApply(o)], '-',
  ['Edit Mask (paint)', () => window.psMaskThumbClick(o, {})], ['View Mask Only', () => window.psMaskThumbClick(o, { altKey: true }), 'Alt+click'], ['Invert Mask', () => psMaskInvert(o)], '-',
  ['Add Mask To Selection', () => psMaskLoadSel(o, 'add')], ['Subtract Mask From Selection', () => psMaskLoadSel(o, 'sub')], ['Intersect Mask With Selection', () => psMaskLoadSel(o, 'int')], ['Load as Selection', () => psMaskLoadSel(o), 'Ctrl+click'], '-',
  ['Select and Mask…', () => psSamOpen({ layer: o, fromMask: true })], ['Mask Options…', () => { PS.maskRuby = !PS.maskRuby; ED.canvas.requestRenderAll(); }]]);
window.psAddMaskBtn = (o, alt) => psAddMaskTo(o, alt);
window.psMaskDelete = psMaskDelete; window.psMaskMove = psMaskMove;

// Properties: the Layer Mask section
function psMaskSection(o) {
  const c = o.clipPath, on = psHasMask(o), off = !!o.psMaskOff;
  if (!on && !off) return sec('Layer Mask', `<p class="muted small">${PS.sel ? 'Add a mask from the selection' : 'No mask yet — add one, then paint black to hide'}</p>
    <div class="ps-qa"><button class="btn" data-mk="reveal">${PS.sel ? 'Reveal Selection' : 'Reveal All'}</button><button class="btn" data-mk="hide">${PS.sel ? 'Hide Selection' : 'Hide All'}</button></div>`);
  const edit = PS.maskEdit === o;
  return sec(`Layer Mask${edit ? ' <span class="ps-badge">editing</span>' : ''}${off ? ' <span class="ps-badge off">disabled</span>' : ''}`, `
    ${on ? `<label class="psd"><span>Density<b data-mv="d">${Math.round((c.psDensity ?? 1) * 100)}%</b></span><input type="range" min="0" max="100" value="${Math.round((c.psDensity ?? 1) * 100)}" data-mr="d"></label>
    <label class="psd"><span>Feather<b data-mv="f">${(c.psFeather || 0).toFixed(1)} px</b></span><input type="range" min="0" max="250" step="0.1" value="${c.psFeather || 0}" data-mr="f"></label>` : ''}
    <div class="ps-label">Refine</div>
    <div class="ps-qa"><button class="btn" data-mk="sam">Select and Mask…</button><button class="btn" data-mk="range">Color Range…</button><button class="btn" data-mk="invert">Invert</button>
      <button class="btn ${edit ? 'primary' : ''}" data-mk="edit">${edit ? 'Back to Layer' : 'Paint on Mask'}</button></div>
    <div class="btn-row ps-mk-row"><button class="icon-btn" data-mk="load" title="Load selection from mask (Ctrl+click thumbnail)">${icon('marquee')}</button>
      <button class="icon-btn" data-mk="apply" title="Apply mask">${icon('check')}</button><button class="icon-btn" data-mk="toggle" title="${off ? 'Enable' : 'Disable'} mask (Shift+click thumbnail)">${icon(off ? 'eye' : 'eyeOff')}</button>
      <button class="icon-btn" data-mk="view" title="View mask only (Alt+click thumbnail)">${icon('maskIc')}</button><button class="icon-btn" data-mk="del" title="Delete mask (or drag the thumbnail to the trash)">${icon('trash')}</button></div>`);
}
function psMaskBind(el, o) {
  const c = o.clipPath;
  $$('[data-mr]', el).forEach((r) => r.oninput = () => {
    if (r.dataset.mr === 'd') { c.psDensity = +r.value / 100; $('[data-mv=d]', el).textContent = r.value + '%'; } else { c.psFeather = +r.value; $('[data-mv=f]', el).textContent = (+r.value).toFixed(1) + ' px'; }
    psMaskRebuild(o);
  });
  $$('[data-mr]', el).forEach((r) => r.onchange = () => scheduleHistory());
  $$('[data-mk]', el).forEach((b) => b.onclick = () => ({
    reveal: () => psAddMaskTo(o, false), hide: () => psAddMaskTo(o, true), sam: () => psSamOpen({ layer: o, fromMask: true }), range: () => { psMaskLoadSel(o); PSM.colorRange(); },
    invert: () => psMaskInvert(o), edit: () => (PS.maskEdit === o ? psMaskEdit(o, false) : window.psMaskThumbClick(o, {})), load: () => psMaskLoadSel(o), apply: () => psMaskApply(o),
    toggle: () => psMaskDisable(o, !o.psMaskOff), view: () => window.psMaskThumbClick(o, { altKey: true }), del: () => psMaskDelete(o),
  })[b.dataset.mk]());
}
ED.inspHooks.push((el, objs) => {
  if (ED.mode !== 'design' || objs.length !== 1 || objs[0].isPage) return;
  const o = objs[0]; el.insertAdjacentHTML('afterbegin', `<div class="ps-masksec">${psMaskSection(o)}</div>`); psMaskBind($('.ps-masksec', el), o);
});
const _renderInspMask = renderInspector;
renderInspector = function () {
  const o = PS.maskEdit;
  if (ED.mode === 'design' && o && psLive(o) && !selected().length) {
    const el = $('#inspector');
    el.innerHTML = `<div class="ps-props-h"><span>Properties</span></div><div class="ps-kind">${icon('maskIc')}Layer Mask · ${esc(o.name || o.type)}</div><div class="ps-masksec">${psMaskSection(o)}</div>`;
    return psMaskBind($('.ps-masksec', el), o);
  }
  return _renderInspMask();
};

// mask views: Alt+click = the mask alone, \ = red overlay where it hides
function psMaskOverlay(ctx, v) {
  if (ED.mode !== 'design') return;
  for (const [o, ruby] of [[PS.maskSolo, false], [PS.maskRuby && PS.maskEdit, true]]) {
    if (!o || !psLive(o) || !psHasMask(o)) continue;
    const E = psMaskEl(o.clipPath), m = psMaskM2D(o, E);
    ctx.save(); ctx.transform(v[0], v[1], v[2], v[3], v[4], v[5]); ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
    if (ruby) {
      if (!o._rubyCv || o._rubyVer !== PS.ver + ED.undo.length) { const t = canvasEl(E.width, E.height), x = t.getContext('2d'); x.fillStyle = 'rgba(255,40,40,.5)'; x.fillRect(0, 0, t.width, t.height); x.globalCompositeOperation = 'destination-out'; x.drawImage(E, 0, 0); o._rubyCv = t; o._rubyVer = PS.ver + ED.undo.length; }
      ctx.drawImage(o._rubyCv, 0, 0);
    } else { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, E.width, E.height); ctx.drawImage(E, 0, 0); }
    ctx.restore();
  }
}

// ---------------- Select and Mask ----------------
const SAM_DEF = { view: 'overlay', opacity: 0.5, radius: 0, smart: false, smooth: 0, feather: 0, contrast: 0, shift: 0, decon: false, deconAmt: 1, output: 'selection', sampleAll: true, showEdge: false, showOrig: false };
function psSamOpen(opt = {}) {
  if (!ED.project || ED.mode !== 'design') return;
  if (PS.sam) return;
  if (PS.qm) psToggleQM();
  const layer = opt.layer || (PS.layer && psLive(PS.layer) && !PS.layer.isPage ? PS.layer : null);
  const s0 = psSelCanvas(), base = s0.cv, x = base.getContext('2d');
  if (opt.fromMask && layer && psHasMask(layer)) x.drawImage(psSelFromMask(layer).cv, 0, 0);
  else if (PS.sel) x.drawImage(PS.sel.cv, 0, 0);
  let saved = {}; try { saved = JSON.parse(localStorage.getItem('ll-sam') || '{}'); } catch { /* none */ }
  const p = { ...SAM_DEF, ...(saved.remember ? saved : {}), remember: !!saved.remember };
  p.output = opt.fromMask ? 'mask' : saved.remember && saved.output ? saved.output : layer && psHasMask(layer) ? 'mask' : 'selection';
  PS.sam = { k: s0.k, W: base.width, H: base.height, base, refine: canvasEl(base.width, base.height), layer, fromMask: !!opt.fromMask, p, prevTool: PS.cur, prevExtras: PS.hideExtras, result: null, view: null, img: null };
  PS.hideExtras = true; psTaskBar(); $('#psTask')?.classList.add('hidden');
  psSamSample(); psSamPanel(); psPick('samQuick'); psSamRun(true);
}
function psSamSample() {
  const S = PS.sam, objs = S.p.sampleAll || !S.layer ? ED.canvas.getObjects() : [S.layer];
  S.imgCv = psRender(objs, 0, 0, S.W, S.H, S.k); S.img = S.imgCv.getContext('2d').getImageData(0, 0, S.W, S.H).data;
}
const samBlur = (cv, r) => { const t = canvasEl(cv.width, cv.height), x = t.getContext('2d'); if (r > 0) x.filter = `blur(${r}px)`; x.drawImage(cv, 0, 0); return t; };
const samAlpha = (cv) => cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
function samFromAlpha(a, W, H) { const t = canvasEl(W, H), x = t.getContext('2d'), id = x.createImageData(W, H); for (let i = 3, j = 0; j < a.length; i += 4, j++) { id.data[i - 3] = id.data[i - 2] = id.data[i - 1] = 255; id.data[i] = a[j]; } x.putImageData(id, 0, 0); return t; }
// the refinement: smooth -> colour-aware edge in the detection band -> feather -> contrast -> shift edge
function psSamCompute() {
  const S = PS.sam, { W, H, k, p } = S, n = W * H, I = S.img;
  let A = new Uint8ClampedArray(n); { const d = samAlpha(S.base); for (let j = 0; j < n; j++) A[j] = d[j * 4 + 3]; }
  if (p.smooth > 0) { const d = samAlpha(samBlur(samFromAlpha(A, W, H), (p.smooth / 100) * 8 + 0.5)); for (let j = 0; j < n; j++) A[j] = psClamp((d[j * 4 + 3] - 128) * 3 + 128, 0, 255); }
  const R = p.radius * k, ref = samAlpha(S.refine); let band = null, hasRef = false;
  for (let j = 0; j < n && !hasRef; j += 7) if (ref[j * 4 + 3]) hasRef = true;
  if (R > 0.5 || hasRef) {
    band = new Uint8Array(n);
    const mc = samFromAlpha(A, W, H), bl = R > 0.5 ? samAlpha(samBlur(mc, R)) : null;
    const inner = canvasEl(W, H), outer = canvasEl(W, H), ia = inner.getContext('2d').createImageData(W, H), oa = outer.getContext('2d').createImageData(W, H);
    for (let j = 0; j < n; j++) {
      const b = bl ? bl[j * 4 + 3] : A[j], inBand = (bl && b > 6 && b < 249) || ref[j * 4 + 3] > 20;
      band[j] = inBand ? 1 : 0;
      if (!inBand && A[j] > 200) { ia.data[j * 4 + 3] = 255; } else if (!inBand && A[j] < 55) { oa.data[j * 4 + 3] = 255; }
    }
    inner.getContext('2d').putImageData(ia, 0, 0); outer.getContext('2d').putImageData(oa, 0, 0);
    // average colour inside / outside around every pixel (normalised blur through premultiplied alpha)
    const avg = (mask) => { const t = canvasEl(W, H), x = t.getContext('2d'); x.drawImage(S.imgCv, 0, 0); x.globalCompositeOperation = 'destination-in'; x.drawImage(mask, 0, 0); return samAlpha(samBlur(samBlur(t, Math.max(3, R * 1.5 + 4)), Math.max(2, R))); };
    const F = avg(inner), B = avg(outer);
    for (let j = 0; j < n; j++) {
      if (!band[j]) continue;
      const i = j * 4; if (F[i + 3] < 3 || B[i + 3] < 3) continue;
      const fr = F[i] - B[i], fg = F[i + 1] - B[i + 1], fb = F[i + 2] - B[i + 2], dd = fr * fr + fg * fg + fb * fb;
      if (dd < 500) continue; // inside and outside look alike here: keep the selection as it is
      let a = ((I[i] - B[i]) * fr + (I[i + 1] - B[i + 1]) * fg + (I[i + 2] - B[i + 2]) * fb) / dd;
      a = psClamp(a, 0, 1) * 255;
      if (p.smart) { const w = psClamp(Math.sqrt(dd) / 120, 0, 1); a = A[j] + (a - A[j]) * w; }
      A[j] = a;
    }
    S.F = F; S.B = B;
  } else { S.F = null; S.B = null; }
  S.band = band;
  if (p.feather > 0) { const d = samAlpha(samBlur(samFromAlpha(A, W, H), p.feather * k)); for (let j = 0; j < n; j++) A[j] = d[j * 4 + 3]; }
  if (p.contrast > 0) { const f = 1 + (p.contrast / 100) * 12; for (let j = 0; j < n; j++) A[j] = psClamp((A[j] - 128) * f + 128, 0, 255); }
  if (p.shift) { const d = samAlpha(samBlur(samFromAlpha(A, W, H), Math.max(1, (Math.abs(p.shift) / 100) * 10 * Math.max(1, k * 2)))), t = 128 - p.shift * 1.15; for (let j = 0; j < n; j++) A[j] = psClamp((d[j * 4 + 3] - t) * 3 + 128, 0, 255); }
  S.A = A; S.result = samFromAlpha(A, W, H);
}
function psSamView() {
  const S = PS.sam, { W, H, p } = S, v = canvasEl(W, H), x = v.getContext('2d');
  if (p.showOrig) { S.view = null; return; }
  if (p.showEdge && S.band) { const id = x.createImageData(W, H); for (let j = 0; j < S.band.length; j++) { const i = j * 4; id.data[i + 3] = 255; if (S.band[j]) id.data[i] = id.data[i + 1] = id.data[i + 2] = S.A[j]; } x.putImageData(id, 0, 0); S.view = v; return; }
  const masked = () => { const t = canvasEl(W, H), tx = t.getContext('2d'); tx.drawImage(S.imgCv, 0, 0); tx.globalCompositeOperation = 'destination-in'; tx.drawImage(S.result, 0, 0); return t; };
  if (p.view === 'overlay') { x.globalAlpha = p.opacity; x.fillStyle = '#ff2626'; x.fillRect(0, 0, W, H); x.globalAlpha = 1; x.globalCompositeOperation = 'destination-out'; x.drawImage(S.result, 0, 0); }
  else if (p.view === 'black' || p.view === 'white') { x.globalAlpha = p.opacity; x.fillStyle = p.view === 'black' ? '#000' : '#fff'; x.fillRect(0, 0, W, H); x.globalAlpha = 1; x.drawImage(masked(), 0, 0); }
  else if (p.view === 'bw') { x.fillStyle = '#000'; x.fillRect(0, 0, W, H); x.drawImage(S.result, 0, 0); }
  else if (p.view === 'layers') {
    const t = canvasEl(16, 16), tx = t.getContext('2d'); tx.fillStyle = '#fff'; tx.fillRect(0, 0, 16, 16); tx.fillStyle = '#cfcfd4'; tx.fillRect(0, 0, 8, 8); tx.fillRect(8, 8, 8, 8);
    x.globalAlpha = p.opacity; x.fillStyle = x.createPattern(t, 'repeat'); x.fillRect(0, 0, W, H); x.globalAlpha = 1; x.drawImage(masked(), 0, 0);
  } else if (p.view === 'ants') { S.view = null; S.antsSel = { cv: S.result, k: S.k }; return; }
  S.view = v;
}
let samT = 0;
function psSamRun(now) {
  clearTimeout(samT);
  const go = () => { if (!PS.sam) return; psSamCompute(); psSamView(); ED.canvas.requestRenderAll(); };
  if (now) go(); else samT = setTimeout(go, 90);
}
function psSamOverlay(ctx, v) {
  const S = PS.sam; if (!S || ED.mode !== 'design') return;
  ctx.save(); ctx.transform(v[0], v[1], v[2], v[3], v[4], v[5]);
  ctx.beginPath(); ctx.rect(0, 0, ED.project.width, ED.project.height); ctx.clip();
  if (S.view) ctx.drawImage(S.view, 0, 0, S.W / S.k, S.H / S.k);
  else if (S.p.view === 'overlay' && S.dragging) { ctx.globalAlpha = 0.35; ctx.drawImage(S.base, 0, 0, S.W / S.k, S.H / S.k); }
  if (S.dragging && S.p.view !== 'overlay') { ctx.globalAlpha = 0.3; ctx.drawImage(S.base, 0, 0, S.W / S.k, S.H / S.k); }
  if (S.lasso?.length > 1) { ctx.globalAlpha = 1; ctx.lineWidth = 1 / ED.zoom; ctx.strokeStyle = '#fff'; ctx.setLineDash([4 / ED.zoom, 4 / ED.zoom]); ctx.beginPath(); S.lasso.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.stroke(); }
  ctx.restore();
}
// tools inside Select and Mask
function samDab(p, alt) {
  const S = PS.sam, x = (S.tool === 'samRefine' ? S.refine : S.base).getContext('2d'), r = Math.max(1, (PS.o.size / 2) * S.k), cx = p.x * S.k, cy = p.y * S.k;
  x.globalCompositeOperation = alt ? 'destination-out' : 'source-over';
  if (S.tool === 'samQuick') {
    if (alt) { x.fillStyle = '#fff'; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); }
    else { const m = psFlood(S.img, S.W, S.H, cx, cy, Math.max(20, PS.o.tol), true, { x: cx, y: cy, r2: (r * 3) ** 2 }); x.drawImage(psMaskFrom(m, S.W, S.H), 0, 0); x.fillStyle = '#fff'; x.beginPath(); x.arc(cx, cy, r * 0.6, 0, 7); x.fill(); }
  } else { x.fillStyle = '#fff'; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); }
  x.globalCompositeOperation = 'source-over';
}
function samDown(opt) {
  const S = PS.sam; if (!S || opt.e.button !== 0 || ED.spaceDown) return;
  const p = ED.canvas.getPointer(opt.e), t = PS.cur; S.tool = t;
  if (t === 'samQuick' || t === 'samBrush' || t === 'samRefine') { S.dragging = { alt: opt.e.altKey, last: p }; samDab(p, opt.e.altKey); ED.canvas.requestRenderAll(); }
  else if (t === 'samLasso') { S.lasso = [p]; S.dragging = { alt: opt.e.altKey }; }
}
function samMove(opt) {
  const S = PS.sam, D = S?.dragging; if (!D) return;
  const p = ED.canvas.getPointer(opt.e);
  if (S.lasso) { S.lasso.push(p); return ED.canvas.requestRenderAll(); }
  const step = Math.max(1, PS.o.size * 0.2), d = Math.hypot(p.x - D.last.x, p.y - D.last.y);
  for (let s = step; s <= d; s += step) samDab({ x: D.last.x + ((p.x - D.last.x) * s) / d, y: D.last.y + ((p.y - D.last.y) * s) / d }, D.alt);
  if (d >= step) D.last = p;
  ED.canvas.requestRenderAll();
}
function samUp() {
  const S = PS.sam; if (!S?.dragging) return;
  if (S.lasso?.length > 2) { const x = S.base.getContext('2d'); x.save(); x.setTransform(S.k, 0, 0, S.k, 0, 0); x.globalCompositeOperation = S.dragging.alt ? 'destination-out' : 'source-over'; x.fillStyle = '#fff'; x.beginPath(); S.lasso.forEach((q, i) => (i ? x.lineTo(q.x, q.y) : x.moveTo(q.x, q.y))); x.closePath(); x.fill(); x.restore(); }
  S.lasso = null; S.dragging = null; psSamRun();
}
function psSamPanel() {
  const S = PS.sam, p = S.p;
  $('#psSam')?.remove();
  const d = document.createElement('div'); d.id = 'psSam'; d.className = 'ps-dlg ps-sam';
  const rg = (k, n, min, max, step, unit = '') => `<label class="psd"><span>${n}<b data-sv="${k}">${p[k]}${unit}</b></span><input type="range" data-sk="${k}" min="${min}" max="${max}" step="${step}" value="${p[k]}"></label>`;
  const tools = [['samQuick', 'quickSel', 'Quick Selection (W) · Alt = subtract'], ['samRefine', 'refineBrush', 'Refine Edge Brush (R) · paint over hair / soft edges · Alt = remove'], ['samBrush', 'brush', 'Brush (B) · paint the selection · Alt = erase'], ['samLasso', 'lasso', 'Lasso (L) · Alt = subtract'], ['hand', 'hand', 'Hand (H)'], ['psZoom', 'zoom', 'Zoom (Z)']];
  d.innerHTML = `<header>Select and Mask<span class="grow"></span><button class="icon-btn" data-sx>×</button></header><div class="ps-dlg-body">
    <div class="ps-sam-tools">${tools.map(([t, i, n]) => `<button class="icon-btn ${PS.cur === t ? 'on' : ''}" data-st="${t}" title="${n}">${icon(i)}</button>`).join('')}</div>
    <label class="psd"><span>Brush Size<b data-sv="size">${PS.o.size}px</b></span><input type="range" data-sk="size" min="1" max="500" step="1" value="${PS.o.size}"></label>
    <div class="ps-label">View Mode</div>
    <div class="ps-sam-row"><select data-sk="view">${[['overlay', 'Overlay (V)'], ['black', 'On Black (A)'], ['white', 'On White (T)'], ['bw', 'Black & White (K)'], ['layers', 'On Layers (Y)'], ['ants', 'Marching Ants (M)']].map(([v, n]) => `<option value="${v}" ${p.view === v ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
    ${rg('opacity', 'Opacity', 0, 1, 0.01)}
    <label class="psd chk"><input type="checkbox" data-sk="showEdge" ${p.showEdge ? 'checked' : ''}> Show Edge (J)</label><label class="psd chk"><input type="checkbox" data-sk="showOrig" ${p.showOrig ? 'checked' : ''}> Show Original (P)</label>
    <label class="psd chk"><input type="checkbox" data-sk="sampleAll" ${p.sampleAll ? 'checked' : ''}> Sample All Layers</label>
    <div class="ps-label">Edge Detection</div>${rg('radius', 'Radius', 0, 250, 1, ' px')}<label class="psd chk"><input type="checkbox" data-sk="smart" ${p.smart ? 'checked' : ''}> Smart Radius</label>
    <div class="ps-label">Global Refinements</div>${rg('smooth', 'Smooth', 0, 100, 1)}${rg('feather', 'Feather', 0, 250, 0.1, ' px')}${rg('contrast', 'Contrast', 0, 100, 1, '%')}${rg('shift', 'Shift Edge', -100, 100, 1, '%')}
    <div class="ps-qa"><button class="btn" data-sa="clear">Clear Selection</button><button class="btn" data-sa="invert">Invert</button></div>
    <div class="ps-label">Output Settings</div>
    <label class="psd chk"><input type="checkbox" data-sk="decon" ${p.decon ? 'checked' : ''}> Decontaminate Colors</label>${p.decon ? rg('deconAmt', 'Amount', 0, 1, 0.01) : ''}
    <label class="psd"><span>Output To</span><select data-sk="output">${[['selection', 'Selection'], ['mask', 'Layer Mask'], ['layer', 'New Layer'], ['layermask', 'New Layer with Layer Mask']].map(([v, n]) => `<option value="${v}" ${p.output === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    <label class="psd chk"><input type="checkbox" data-sk="remember" ${p.remember ? 'checked' : ''}> Remember Settings</label>
    <p class="muted small">${S.layer ? `Layer: ${esc(S.layer.name || S.layer.type)}` : 'No layer — outputs to the selection or a new layer'}</p>
    </div><footer><button class="btn ghost" data-sa="reset">Reset</button><span class="grow"></span><button class="btn ghost" data-sx>Cancel</button><button class="btn primary" data-sa="ok">OK</button></footer>`;
  $('#stage').appendChild(d);
  $$('[data-sk]', d).forEach((i) => i.oninput = i.onchange = () => {
    const k = i.dataset.sk, v = i.type === 'checkbox' ? i.checked : i.type === 'range' ? +i.value : i.value;
    if (k === 'size') { PS.o.size = v; psSave(); $('[data-sv=size]', d).textContent = v + 'px'; return; }
    p[k] = v; const b = $(`[data-sv="${k}"]`, d); if (b) b.textContent = v + ({ radius: ' px', feather: ' px', contrast: '%', shift: '%' }[k] || '');
    if (k === 'sampleAll') psSamSample();
    if (k === 'decon') return psSamPanel();
    if (['view', 'opacity', 'showEdge', 'showOrig'].includes(k)) { psSamView(); ED.canvas.requestRenderAll(); } else if (!['output', 'remember', 'deconAmt'].includes(k)) psSamRun();
  });
  $$('[data-st]', d).forEach((b) => b.onclick = () => { psPick(b.dataset.st); $$('[data-st]', d).forEach((x) => x.classList.toggle('on', x === b)); });
  $$('[data-sx]', d).forEach((b) => b.onclick = () => psSamClose(false));
  $$('[data-sa]', d).forEach((b) => b.onclick = () => ({
    ok: () => psSamClose(true), reset: () => { Object.assign(p, SAM_DEF, { output: p.output, remember: p.remember }); psSamPanel(); psSamRun(); },
    clear: () => { S.base.getContext('2d').clearRect(0, 0, S.W, S.H); S.refine.getContext('2d').clearRect(0, 0, S.W, S.H); psSamRun(); },
    invert: () => { psInvertAlpha(S.base); psSamRun(); },
  })[b.dataset.sa]());
  d.onkeydown = (e) => { if (e.target.tagName === 'SELECT' || e.target.type === 'range') return; e.stopPropagation(); };
}
async function psSamClose(ok) {
  const S = PS.sam; if (!S) return;
  clearTimeout(samT);
  if (ok) {
    psSamCompute();
    const p = S.p; try { localStorage.setItem('ll-sam', JSON.stringify(p.remember ? p : { remember: false })); } catch { /* private */ }
    const sel = { cv: S.result, k: S.k }, L = S.layer && psLive(S.layer) ? S.layer : null;
    if (p.output === 'selection' || (!L && p.output !== 'layer')) psSelSet({ cv: S.result, k: S.k, polys: null });
    else if (p.output === 'mask') { psMaskSet(L, psMaskFromSel(L, sel, false)); PS.layer = L; psSelSet(null); scheduleHistory(); }
    else {
      // new layer: the sampled pixels cut out (decontaminated at the edge), or a copy of the layer with the mask
      if (p.output === 'layer') {
        const out = canvasEl(S.W, S.H), x = out.getContext('2d'), id = x.createImageData(S.W, S.H), d = id.data, I = S.img, A = S.A;
        for (let j = 0; j < A.length; j++) {
          const i = j * 4; let r = I[i], g = I[i + 1], b = I[i + 2]; const a = A[j] / 255;
          if (p.decon && S.F && S.B && S.band?.[j] && a > 0) {
            const est = (c) => (a < 0.3 ? S.F[i + c] : psClamp((I[i + c] - (1 - a) * S.B[i + c]) / a, 0, 255)), t = p.deconAmt;
            r += (est(0) - r) * t; g += (est(1) - g) * t; b += (est(2) - b) * t;
          }
          d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = (I[i + 3] * A[j]) / 255;
        }
        x.putImageData(id, 0, 0);
        const img = new fabric.Image(out, { left: 0, top: 0, scaleX: 1 / S.k, scaleY: 1 / S.k, name: `${L?.name || 'Selection'} (refined)`, id: uid() }); img._psCv = out; img._psHist = psCopy(out);
        const c = ED.canvas, objs = c.getObjects(); c.insertAt(img, L ? objs.indexOf(L) + 1 : objs.length);
        if (L) L.visible = false; PS.layer = img; psSelSet(null); await psCommit(img);
      } else {
        L.clone((cl) => {
          cl.set({ id: uid(), name: `${L.name || 'Layer'} copy` }); cl.clipPath = null;
          const c = ED.canvas; c.insertAt(cl, c.getObjects().indexOf(L) + 1); psMaskSet(cl, psMaskFromSel(cl, sel, false)); L.visible = false; PS.layer = cl; psSelSet(null); scheduleHistory(); ED.emit('layers');
        }, PROPS);
      }
    }
    toast({ selection: 'Refined selection', mask: 'Layer mask refined', layer: 'New layer from the refined selection', layermask: 'New layer with the refined mask' }[p.output] || 'Done');
  }
  PS.sam = null; PS.hideExtras = S.prevExtras; $('#psSam')?.remove();
  psPick(PS_SELTOOLS.has(S.prevTool) || PS_PAINT.has(S.prevTool) ? S.prevTool : 'psQuickSel');
  ED.canvas.requestRenderAll(); psTaskBar(); renderInspector(); ED.emit('layers');
}
window.psSamOpen = psSamOpen;
window.addEventListener('keydown', (e) => {
  if (!PS.sam || isTyping(e) || e.target.closest?.('#psSam select, #psSam input[type=range]')) return;
  const k = e.key.toLowerCase(), stop = () => { e.preventDefault(); e.stopImmediatePropagation(); }, S = PS.sam;
  if (e.ctrlKey || e.metaKey) { if (e.code === 'KeyZ' || e.code === 'KeyY') { stop(); toast('Undo is not available inside Select and Mask — use Alt to subtract, or Reset'); } return; }
  if (e.key === 'Enter') { stop(); return psSamClose(true); }
  if (e.key === 'Escape') { stop(); return psSamClose(false); }
  const tool = { w: 'samQuick', r: 'samRefine', b: 'samBrush', l: 'samLasso', h: 'hand', z: 'psZoom' }[k];
  if (tool) { stop(); psPick(tool); return $$('#psSam [data-st]').forEach((x) => x.classList.toggle('on', x.dataset.st === tool)); }
  const view = { v: 'overlay', a: 'black', t: 'white', k: 'bw', y: 'layers', m: 'ants' }[k];
  if (view) { stop(); S.p.view = view; const sel = $('#psSam [data-sk=view]'); if (sel) sel.value = view; psSamView(); return ED.canvas.requestRenderAll(); }
  if (k === 'f') { stop(); const order = ['overlay', 'black', 'white', 'bw', 'layers', 'ants'], v = order[(order.indexOf(S.p.view) + 1) % order.length]; S.p.view = v; const sel = $('#psSam [data-sk=view]'); if (sel) sel.value = v; psSamView(); return ED.canvas.requestRenderAll(); }
  if (k === 'p' || k === 'j') { stop(); const key = k === 'p' ? 'showOrig' : 'showEdge'; S.p[key] = !S.p[key]; const c = $(`#psSam [data-sk=${key}]`); if (c) c.checked = S.p[key]; psSamView(); return ED.canvas.requestRenderAll(); }
  if (e.key === '[' || e.key === ']') { stop(); PS.o.size = psClamp(PS.o.size + (e.key === ']' ? 5 : -5), 1, 500); psSave(); const r = $('#psSam [data-sk=size]'); if (r) { r.value = PS.o.size; $('#psSam [data-sv=size]').textContent = PS.o.size + 'px'; } return ED.canvas.requestRenderAll(); }
  if (k === ' ') return;
  if (k.length === 1) stop(); // the other tool keys do nothing while refining
}, true);
// '\' : show the mask being edited as a red overlay
window.addEventListener('keydown', (e) => {
  if (ED.mode !== 'design' || isTyping(e) || e.key !== '\\' || e.ctrlKey || PS.sam) return;
  if (!PS.maskEdit) return; e.preventDefault(); e.stopImmediatePropagation(); PS.maskRuby = !PS.maskRuby; ED.canvas.requestRenderAll();
}, true);
window.addEventListener('keydown', (e) => {
  if (ED.mode !== 'design' || !(e.ctrlKey || e.metaKey) || !e.altKey || e.code !== 'KeyR' || isTyping(e) || $('#editor').classList.contains('hidden')) return;
  e.preventDefault(); e.stopImmediatePropagation(); psSamOpen();
}, true);

// ---------------- menus ----------------
PSM.addMask = (hide) => psAddMaskTo(PS.layer, hide);
PSM.deleteMask = () => psMaskDelete(PS.layer);
PSM.applyMask = () => psMaskApply(PS.layer);
PSM.fillLayer = ((orig) => (kind) => { const sel = PS.sel; orig(kind); const r = PS.layer; if (sel && r) { r.clipPath = null; psMaskSet(r, psMaskFromSel(r, sel, false)); scheduleHistory(); } })(PSM.fillLayer);
{
  const i = MENUS.layer.findIndex((it) => Array.isArray(it) && it[0] === 'Layer Mask');
  if (i >= 0) MENUS.layer[i] = ['Layer Mask', [['Reveal All / Reveal Selection', () => PSM.addMask(false)], ['Hide All / Hide Selection', () => PSM.addMask(true)], '-',
    ['Delete', () => PSM.deleteMask()], ['Apply', () => PSM.applyMask()], ['Disable / Enable', () => PS.layer && psMaskDisable(PS.layer, !PS.layer.psMaskOff)], ['Edit Mask (paint)', () => PS.layer && window.psMaskThumbClick(PS.layer, {})], ['Invert Mask', () => psMaskInvert(PS.layer)], ['Load as Selection', () => psMaskLoadSel(PS.layer)]]];
  const s = MENUS.select.findIndex((it) => Array.isArray(it) && it[0] === 'Color Range…');
  MENUS.select.splice(s + 1, 0, ['Select and Mask…', () => psSamOpen(), 'Alt+Ctrl+R']);
}
// adjustments while the mask is targeted: Invert works on the mask
const _adjustMask = PSM.adjust;
PSM.adjust = (key) => { if (PS.maskEdit && psLive(PS.maskEdit)) { if (key === 'invert') return psMaskInvert(PS.maskEdit); return toast('On a mask: paint, Invert (Ctrl+I), Density / Feather in Properties, or Select and Mask'); } return _adjustMask(key); };

// ---------------- hooks ----------------
const _bootMask = bootEditor;
bootEditor = function () {
  if (editorReady) return;
  _bootMask();
  const c = ED.canvas;
  ED.overlays.push(psMaskOverlay, psSamOverlay);
  c.on('mouse:down', (o) => { if (PS.sam) samDown(o); });
  c.on('mouse:move', (o) => { if (PS.sam) samMove(o); });
  c.on('mouse:up', () => { if (PS.sam) samUp(); });
  ['selection:created', 'selection:updated'].forEach((ev) => c.on(ev, () => { const a = c.getActiveObject(); if (PS.maskEdit && a && a !== PS.maskEdit) psMaskEdit(null, false); }));
  ED.on('page', () => { PS.maskEdit = null; PS.maskSolo = null; if (PS.sam) { PS.sam = null; $('#psSam')?.remove(); } });
};

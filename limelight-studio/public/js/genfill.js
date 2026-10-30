// Limelight Studio - ✨ Generative Fill and Generative Expand, like Photoshop's (Design; Vector and Book use the same bar,
// 3D has its own in studio3d.js). Make a selection (marquee / lasso / Select Subject / Select Background, feather or
// expand it), press Generative Fill in the task bar under it, type what goes there - or leave it empty to remove what is
// there - and the AI paints the selected part in place, matching its surroundings (SDXL inpainting on Limelight AI:
// NAYA B, else this PC). Three variations land on a new Generative layer, masked to the selection; the original is
// untouched. The layer keeps its prompt, variations (pick / delete / Generate again) and mask (feather, load as a
// selection, replace by a selection), opacity and visibility like any layer. Crop (C) past the artboard's edge and the
// bar says Generative Expand: the new edges are painted the same way. A picture box gets a fresh photo; Vector traces.
PROPS.push('genfill');
Object.assign(TOOL_HINTS, {
  genRect: 'Generative fill: drag a box around the area, then type what should be there (empty = remove it)',
  genLasso: 'Generative fill lasso: draw around the area, then type what should be there (empty = remove it)',
});
const GF = { sel: null, drag: null, busy: false, vectorize: true, t0: 0 };

// ---------------- selecting ----------------
const gfBounds = (pts) => {
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
};
const rectPts = (a, b) => [{ x: a.x, y: a.y }, { x: b.x, y: a.y }, { x: b.x, y: b.y }, { x: a.x, y: b.y }];
function objPts(o) { const r = o.getBoundingRect(true, true); return rectPts({ x: r.left, y: r.top }, { x: r.left + r.width, y: r.top + r.height }); }

function genFromObject(o) {
  if (!o || o.isPage) return toast('Select an object, or draw an area with the marquee (M)');
  if (o.type === 'activeSelection') return toast('Select one object for Generative fill');
  GF.sel = { kind: 'object', obj: o, pts: objPts(o) };
  showGenBar(o.genfill?.prompt || '');
}
// a pixel selection (ps-core.js: a mask over the artboard, feathered or not) as the area to fill
function genFromPsSel() {
  const s = typeof PS !== 'undefined' && PS.sel; if (!s) return toast('Make a selection first (M, L, W or Select Subject)');
  const b = s.bbox;
  GF.sel = { kind: 'mask', cv: psCopy(s.cv), k: s.k, edges: s.edges, polys: s.polys, pts: s.polys?.length === 1 ? s.polys[0] : rectPts({ x: b.x, y: b.y }, { x: b.x + b.w, y: b.y + b.h }) };
  psSelSet(null); // (its task bar makes way for the prompt)
  showGenBar('');
}
function clearGenSel() { GF.sel = null; GF.drag = null; hideGenBar(); ED.canvas?.requestRenderAll(); }

function gfInit() {
  const c = ED.canvas;
  c.on('mouse:down', (opt) => {
    if (!['genRect', 'genLasso'].includes(ED.tool) || opt.e.button !== 0 || ED.spaceDown || GF.busy) return;
    const p = c.getPointer(opt.e);
    GF.drag = { start: p, pts: [p] }; GF.sel = null; hideGenBar();
  });
  c.on('mouse:move', (opt) => {
    if (!GF.drag) return;
    const p = c.getPointer(opt.e);
    if (ED.tool === 'genRect') GF.drag.pts = rectPts(GF.drag.start, p); else GF.drag.pts.push(p);
    c.requestRenderAll();
  });
  c.on('mouse:up', () => {
    if (!GF.drag) return;
    const pts = GF.drag.pts; GF.drag = null;
    const b = gfBounds(pts);
    if (pts.length < 3 || b.w < 6 / ED.zoom || b.h < 6 / ED.zoom) { c.requestRenderAll(); return; }
    GF.sel = { kind: 'area', pts };
    showGenBar(''); c.requestRenderAll();
  });
  c.on('selection:created', () => { if (GF.sel?.kind === 'object' && c.getActiveObject() !== GF.sel.obj) clearGenSel(); });
  c.on('selection:updated', () => { if (GF.sel?.kind === 'object' && c.getActiveObject() !== GF.sel.obj) clearGenSel(); });
  // marching ants (a pixel selection: its own edges)
  ED.overlays.push((ctx, v) => {
    gfWatchCrop();
    const s = GF.sel;
    if (s?.kind === 'expand' && !GF.drag) return;
    if (s?.kind === 'mask' && s.edges && !GF.drag) {
      ctx.save(); ctx.transform(v[0], v[1], v[2], v[3], v[4], v[5]); ctx.scale(1 / s.k, 1 / s.k); ctx.imageSmoothingEnabled = false;
      ctx.drawImage(s.edges[(Date.now() >> 9) & 1], 0, 0); ctx.restore(); return;
    }
    const pts = GF.drag?.pts || s?.pts; if (!pts || pts.length < 2) return;
    const tx = (p) => [p.x * v[0] + p.y * v[2] + v[4], p.x * v[1] + p.y * v[3] + v[5]];
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(...tx(p)) : ctx.moveTo(...tx(p)))); ctx.closePath();
    ctx.lineWidth = 1.2; ctx.setLineDash([5, 4]);
    ctx.strokeStyle = '#000'; ctx.stroke(); ctx.lineDashOffset = 4.5; ctx.strokeStyle = '#fff'; ctx.stroke();
    if (s && !GF.drag) { ctx.fillStyle = '#ffc21a14'; ctx.fill(); }
  });
  ['zoom', 'transform'].forEach((e) => ED.on(e, placeGenBar));
  ED.on('page', () => { if (!GF.busy) clearGenSel(); });
}

// Crop past the artboard's edge (ps-core.js crop tool): the bar offers Generative Expand for the new edges
function gfCropOut() {
  if (typeof PS === 'undefined' || ED.mode !== 'design' || PS.cur !== 'psCrop' || !PS.crop || !ED.project) return null;
  const r = PS.crop, W = ED.project.width, H = ED.project.height;
  return r.x < -1 || r.y < -1 || r.x + r.w > W + 1 || r.y + r.h > H + 1 ? r : null;
}
function gfWatchCrop() {
  if (GF.busy) return;
  const r = gfCropOut();
  if (r) {
    const pts = rectPts({ x: r.x, y: r.y }, { x: r.x + r.w, y: r.y + r.h });
    if (GF.sel?.kind !== 'expand') { GF.sel = { kind: 'expand', pts }; setTimeout(() => showGenBar(''), 0); }
    else { GF.sel.pts = pts; setTimeout(placeGenBar, 0); }
  } else if (GF.sel?.kind === 'expand') setTimeout(clearGenSel, 0);
}

// ---------------- the contextual task bar ----------------
function showGenBar(prompt) {
  let bar = $('#genBar');
  if (!bar) {
    bar = document.createElement('div'); bar.id = 'genBar'; bar.className = 'genbar';
    $('#stage').appendChild(bar);
  }
  const vec = ED.mode === 'vector', s = GF.sel, expand = s?.kind === 'expand';
  const hint = expand ? 'Describe what goes in the new area — leave empty to continue the picture'
    : s?.kind === 'object' && s.obj.placeholder ? 'What photo goes in this box?' : 'Describe what goes here — leave empty to remove it';
  bar.innerHTML = `<span class="gb-ic">${icon('sparkles')}</span>
    <input id="gbPrompt" spellcheck="false" placeholder="${hint}" value="${esc(prompt)}">
    ${vec ? `<label class="gb-vec" title="Trace the AI picture into editable vector paths"><input type="checkbox" id="gbVec" ${GF.vectorize ? 'checked' : ''}> Vector</label>` : ''}
    <button class="btn primary" id="gbGo">${expand ? 'Generative Expand' : 'Generate'}</button><button class="icon-btn" id="gbX" title="Cancel (Esc)">×</button>`;
  bar.classList.remove('hidden');
  const inp = $('#gbPrompt'); setTimeout(() => inp.focus(), 0);
  inp.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') runGenFill(); if (e.key === 'Escape') (GF.busy ? GF.cancel?.() : clearGenSel()); };
  $('#gbVec') && ($('#gbVec').onchange = (e) => { GF.vectorize = e.target.checked; });
  $('#gbGo').onclick = runGenFill;
  $('#gbX').onclick = () => { if (GF.busy) return GF.cancel?.(); if (expand && typeof PS !== 'undefined') { PS.crop = null; ED.canvas.requestRenderAll(); } clearGenSel(); };
  placeGenBar();
}
function hideGenBar() { if (!GF.busy) $('#genBar')?.classList.add('hidden'); }
function placeGenBar() {
  const bar = $('#genBar'), s = GF.sel; if (!bar || bar.classList.contains('hidden') || !s) return;
  if (s.kind === 'object') s.pts = objPts(s.obj);
  const b = gfBounds(s.pts), v = ED.canvas.viewportTransform;
  const x = (b.x + b.w / 2) * v[0] + v[4], y = (b.y + b.h) * v[3] + v[5] + 14;
  const W = $('#stage').clientWidth, H = $('#stage').clientHeight;
  bar.style.left = Math.max(8, Math.min(W - bar.offsetWidth - 8, x - bar.offsetWidth / 2)) + 'px';
  bar.style.top = Math.max(60, Math.min(H - bar.offsetHeight - 54, y)) + 'px';
}
// busy: the button shows the step (Generating 2/4) and seconds, × becomes Cancel
function genBusy(on, msg) {
  GF.busy = on; GF.label = msg; const bar = $('#genBar'); if (!bar) return;
  bar.classList.toggle('busy', on);
  $$('input, button', bar).forEach((x) => { x.disabled = on && x.id !== 'gbX'; });
  const x = $('#gbX');
  if (x) { x.textContent = on ? 'Cancel' : '×'; x.classList.toggle('btn', on); x.classList.toggle('icon-btn', !on); x.title = on ? 'Stop generating' : 'Cancel (Esc)'; }
  if (on && GF.t0 && GF.timer) return; // (already counting: only the words change)
  clearInterval(GF.timer); GF.timer = null;
  if (on) {
    GF.t0 = Date.now();
    const tick = () => { const s = Math.round((Date.now() - GF.t0) / 1000), b = $('#gbGo'); if (b) b.textContent = `${GF.label} · ${s}s`; };
    tick(); GF.timer = setInterval(tick, 250);
  } else { GF.t0 = 0; if ($('#gbGo')) $('#gbGo').textContent = GF.sel?.kind === 'expand' ? 'Generative Expand' : 'Generate'; }
}

// ---------------- helpers ----------------
const canvasEl = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const loadEl = (url) => new Promise((ok, bad) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => ok(im); im.onerror = () => bad(new Error('could not load ' + url)); im.src = url; });
const r64 = (n) => Math.max(256, Math.round(n / 64) * 64);
async function postJSON(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
  return j;
}
const keepPng = async (name, cv) => (await postJSON('/api/library', { name, data: cv.toDataURL('image/png') })).url;
// the selection's shape as white on transparent, in crop pixels (m: pixels per design unit, R: the crop in the design)
function selMask(s, R, m, cw, ch) {
  const mk = canvasEl(cw, ch), mx = mk.getContext('2d');
  if (s.kind === 'mask') { mx.drawImage(s.cv, R.x * s.k, R.y * s.k, R.w * s.k, R.h * s.k, 0, 0, cw, ch); return mk; }
  mx.setTransform(m, 0, 0, m, -R.x * m, -R.y * m);
  if (s.kind === 'object') {
    const o = s.obj, keep = { opacity: o.opacity, shadow: o.shadow, visible: o.visible, globalCompositeOperation: o.globalCompositeOperation };
    Object.assign(o, { opacity: 1, shadow: null, visible: true, globalCompositeOperation: 'source-over' });
    if (o.placeholder || o.type === 'textbox' || o.type?.includes('text')) {
      // a box (picture box, text frame): its whole area, not the letters
      mx.save(); mx.transform(...o.calcTransformMatrix()); mx.fillStyle = '#fff';
      mx.fillRect(-o.width / 2, -o.height / 2, o.width, o.height); mx.restore();
    } else { o.dirty = true; o.render(mx); }
    Object.assign(o, keep); o.dirty = true;
    mx.setTransform(1, 0, 0, 1, 0, 0); mx.globalCompositeOperation = 'source-in'; mx.fillStyle = '#fff'; mx.fillRect(0, 0, cw, ch);
    const id = mx.getImageData(0, 0, cw, ch), d = id.data;
    for (let i = 3; i < d.length; i += 4) d[i] = d[i] > 100 ? 255 : 0;
    mx.putImageData(id, 0, 0);
  } else {
    mx.beginPath(); s.pts.forEach((p, i) => (i ? mx.lineTo(p.x, p.y) : mx.moveTo(p.x, p.y))); mx.closePath();
    mx.fillStyle = '#fff'; mx.fill();
  }
  return mk;
}
function maskBox(mask) {
  const d = mask.getContext('2d').getImageData(0, 0, mask.width, mask.height).data, w = mask.width;
  let x0 = w, y0 = mask.height, x1 = -1, y1 = -1;
  for (let y = 0; y < mask.height; y += 2) for (let x = 0; x < w; x += 2) if (d[(y * w + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return null;
  x0 = Math.max(0, x0 - 3); y0 = Math.max(0, y0 - 3); x1 = Math.min(w, x1 + 4); y1 = Math.min(mask.height, y1 + 4);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
// the mask's box with room for the outward feather (up to 40 px)
const gfGrow = (b, cw, ch, g = 84) => b && { x: Math.max(0, b.x - g), y: Math.max(0, b.y - g), w: Math.min(cw, b.x + b.w + g) - Math.max(0, b.x - g), h: Math.min(ch, b.y + b.h + g) - Math.max(0, b.y - g) };
// the page as it looks in R (layers in `skip` left out), m pixels per design unit
async function gfLook(R, m, skip = []) {
  const cur = pageJSONs('current')[0];
  const sc = await renderPageCanvas({ ...cur.json, objects: cur.json.objects.filter((o) => !skip.includes(o.id)) }, cur.w, cur.h);
  const crop = sc.toCanvasElement(m, { left: R.x, top: R.y, width: R.w, height: R.h }); sc.dispose();
  return crop;
}
// the area plus enough of its surroundings for the AI to match them, inside the page
function gfFrame(b, W, H) {
  const pad = Math.max(48, 0.6 * Math.max(b.w, b.h));
  const R = { x: Math.max(0, b.x - pad), y: Math.max(0, b.y - pad) }; R.w = Math.min(W, b.x + b.w + pad) - R.x; R.h = Math.min(H, b.y + b.h + pad) - R.y;
  const m = Math.min(2, 1024 / Math.max(R.w, R.h));
  return { R, m, cw: Math.round(R.w * m), ch: Math.round(R.h * m) };
}

// ---------------- generating ----------------
async function runGenFill() {
  const s = GF.sel; if (!s || GF.busy) return;
  let prompt = ($('#gbPrompt')?.value || '').trim();
  if (gfRemoveWords.test(prompt)) prompt = '';
  try {
    if (s.kind === 'expand') return await gfExpand(prompt);
    if (s.kind === 'object' && s.obj.genfill?.v === 2) return await gfAgain(s.obj, prompt);
    const vec = ED.mode === 'vector' && GF.vectorize && s.kind === 'object' && !s.obj.genfill;
    if (vec || (s.kind === 'object' && (s.obj.placeholder || s.obj.genfill?.box))) return await gfFresh(s, prompt, vec);
    return await gfFill(s, prompt);
  } catch (e) {
    console.error(e); genBusy(false); toast('Generative fill: ' + e.message, true);
  }
}
const gfName = (kind, p) => `✨ ${p ? p.slice(0, 40) : kind === 'expand' ? 'Expanded' : 'Removed'}`;
const gfNote = (vars) => `${vars} variation${vars > 1 ? 's' : ''} — pick one in Properties`;

// fill a selection in place: SDXL inpainting of the area in its surroundings, 3 variations on a new layer
async function gfFill(s, prompt) {
  const cur = pageJSONs('current')[0], W = cur.w, H = cur.h;
  const b0 = gfBounds(s.pts), b = { x: Math.max(0, b0.x), y: Math.max(0, b0.y) };
  b.w = Math.min(W, b0.x + b0.w) - b.x; b.h = Math.min(H, b0.y + b0.h) - b.y;
  if (b.w < 4 || b.h < 4) throw new Error('The selection is outside the page');
  const old = s.kind === 'object' && s.obj.genfill ? s.obj : null; // (an older generative layer: replaced)
  const { R, m, cw, ch } = gfFrame(b, W, H);
  genBusy(true, 'Looking…');
  const crop = await gfLook(R, m, old ? [old.id] : []);
  const mask = selMask(s, R, m, cw, ch);
  const box = gfGrow(maskBox(mask), cw, ch); if (!box) throw new Error('The selection is empty');
  // (above everything the area shows, so what is seen there is what gets changed)
  const hits = (o) => { const r = o.getBoundingRect(true, true); return r.left < b.x + b.w && r.left + r.width > b.x && r.top < b.y + b.h && r.top + r.height > b.y; };
  const above = s.kind === 'object' ? s.obj : ED.canvas.getObjects().filter((o) => !o.isPage && o.visible !== false && hits(o)).at(-1) || null;
  await gfMake({ kind: 'fill', prompt, R, m, cw, ch, box, crop, mask, above, replace: old });
}
// the selected part first filled with the colours around it, spread smoothly (halved down to a few pixels, then built
// back up, each level filling the holes of the one above) - so the AI continues the picture instead of inventing
// robust: pixels just outside the area that are far from its usual colour (an object the selection's edge cuts
// through, like a neighbour's rotor) are left out too, so they do not smear into the fill
function gfPrefill(crop, mask, robust) {
  const W = crop.width, H = crop.height, holed = canvasEl(W, H), hx = holed.getContext('2d');
  hx.drawImage(crop, 0, 0); hx.globalCompositeOperation = 'destination-out'; hx.drawImage(mask, 0, 0);
  if (robust) {
    const r = Math.max(6, Math.round(Math.min(W, H) / 40));
    const band = canvasEl(W, H), bx = band.getContext('2d'); bx.filter = `blur(${r}px)`; bx.drawImage(mask, 0, 0); bx.drawImage(mask, 0, 0);
    const b = bx.getImageData(0, 0, W, H).data, m = mask.getContext('2d').getImageData(0, 0, W, H).data;
    const id = hx.getImageData(0, 0, W, H), d = id.data, hist = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (b[i + 3] > 3 && m[i + 3] < 8 && d[i + 3]) { n++; for (let c = 0; c < 3; c++) hist[c][d[i + c]]++; }
    if (n > 50) {
      const pct = (h, f) => { let s = 0; for (let v = 0; v < 256; v++) { s += h[v]; if (s >= n * f) return v; } return 255; };
      const med = hist.map((h) => pct(h, 0.5)), spread = hist.map((h) => Math.max(40, 3 * (pct(h, 0.75) - pct(h, 0.25))));
      for (let i = 0; i < d.length; i += 4) if (b[i + 3] > 3 && d[i + 3] && (Math.abs(d[i] - med[0]) > spread[0] || Math.abs(d[i + 1] - med[1]) > spread[1] || Math.abs(d[i + 2] - med[2]) > spread[2])) d[i + 3] = 0;
      hx.globalCompositeOperation = 'source-over'; hx.putImageData(id, 0, 0);
    }
  }
  return gfPullPush(holed);
}
// the transparent pixels of a picture filled smoothly from the opaque ones
function gfPullPush(holed) {
  const lv = [holed];
  while (lv.at(-1).width > 6 && lv.at(-1).height > 6) { const p = lv.at(-1), c = canvasEl(Math.ceil(p.width / 2), Math.ceil(p.height / 2)); c.getContext('2d').drawImage(p, 0, 0, c.width, c.height); lv.push(c); }
  for (let i = lv.length - 2; i >= 0; i--) { const up = canvasEl(lv[i].width, lv[i].height), ux = up.getContext('2d'); ux.drawImage(lv[i + 1], 0, 0, up.width, up.height); ux.drawImage(lv[i], 0, 0); lv[i] = up; }
  return lv[0];
}
// "remove", "erase", "hata do"... = an empty prompt (what Photoshop users type)
const gfRemoveWords = /^\s*(remove|erase|delete|clean( up)?|get rid of|hata\w*|mita\w*)(\s+(it|this|that|the \w+|object|ye|isko|is ko))?\s*[.!]*\s*$/i;
// the AI paints the masked part. Removing: the area smoothed over from its surroundings first, then lightly textured
// (a few seconds); with words: something new in its place; expanding without words: the AI first says what the
// picture shows and continues that. 3 variations in one pass; progress, Cancel and a 60 s limit in the bar.
async function gfPaint(kind, prompt, crop, mask) {
  const remove = kind === 'fill' && !prompt;
  if (remove) return gfRemove(crop, mask);
  // (always from the surroundings' colours, a little of them kept: the new thing gets this picture's sky / wall /
  // floor behind it instead of a backdrop of its own, which showed as a box)
  const body = { image: gfPrefill(crop, mask).toDataURL('image/png'), mask: mask.toDataURL('image/png'),
    prompt, count: 3, strength: kind === 'expand' && !prompt ? 0.95 : GF.strength || 0.88 };
  const ac = new AbortController(); GF.abort = ac;
  let why = null;
  const stop = (reason) => { why = reason; ac.abort(); fetch('/api/ai/inpaint/cancel', { method: 'POST' }).catch(() => 0); };
  const limit = setTimeout(() => stop('It took more than 60 seconds, so it was stopped — try a smaller area'), 60e3);
  GF.cancel = () => stop('Cancelled');
  const poll = setInterval(() => fetch('/api/ai/inpaint/progress').then((r) => r.json()).then((p) => {
    if (GF.busy && p.busy && p.total) GF.label = `${kind === 'expand' && !prompt && !p.step ? 'Looking' : 'Generating'} ${p.step}/${p.total}`;
  }).catch(() => 0), 400);
  try {
    const r = await fetch('/api/ai/inpaint', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ac.signal });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
    const ok = await gfCheck(j, crop, mask);
    genBusy(true, 'Blending…');
    return await gfHarmonize(ok, crop, mask);
  } catch (e) { throw why ? new Error(why) : e; }
  finally { clearTimeout(limit); clearInterval(poll); GF.cancel = GF.abort = null; }
}
// Remove (empty prompt): content-aware, in the browser, about a second. The hole gets the colours around it spread
// smoothly (gfPrefill) plus the fine texture (grain, paper, noise) of a clean patch nearby, mirror-tiled - each of the
// 3 variations from another patch. Done at the picture's own resolution, so the grain matches.
async function gfRemove(crop, mask) {
  genBusy(true, 'Removing…');
  const W = crop.width, H = crop.height, R = Math.max(3, Math.round(Math.min(W, H) / 120));
  const px = (cv) => cv.getContext('2d').getImageData(0, 0, W, H).data;
  const blur = canvasEl(W, H), bx = blur.getContext('2d'); bx.filter = `blur(${R}px)`; bx.drawImage(crop, 0, 0);
  const a = px(crop), ab = px(blur), m = px(mask), low = px(gfPrefill(crop, mask, true));
  const mb = maskBox(mask); if (!mb) throw new Error('The selection is empty');
  const tex = gfTexture(crop, mask, a, ab, R), out = [];
  for (const T of tex.length ? tex : [null]) {
    const c = canvasEl(W, H), x = c.getContext('2d'), id = x.createImageData(W, H), d = id.data;
    d.set(a);
    for (let yy = mb.y; yy < mb.y + mb.h; yy++) for (let xx = mb.x; xx < mb.x + mb.w; xx++) {
      const p = (yy * W + xx) * 4, t = m[p + 3] / 255; if (!t) continue;
      const q = T ? T(xx, yy) : -1;
      for (let ch = 0; ch < 3; ch++) d[p + ch] = a[p + ch] + (low[p + ch] + (q >= 0 ? Math.max(-10, Math.min(10, a[q + ch] - ab[q + ch])) : 0) - a[p + ch]) * t; // (grain only: shapes in the patch are capped away)
      d[p + 3] = 255;
    }
    x.putImageData(id, 0, 0);
    out.push({ url: await keepPng('genfill_remove.png', c) });
  }
  return out;
}
// a smooth fill of the unknown pixels of a float picture (3 channels) from the known ones: averaged down level by level,
// then built back up with smooth (bilinear) steps, so no blocks or rings
function gfMembrane(val, known, W, H) {
  const lv = [{ v: val, k: known, w: W, h: H }];
  while (lv.at(-1).w > 1 || lv.at(-1).h > 1) {
    const p = lv.at(-1), w = Math.ceil(p.w / 2), h = Math.ceil(p.h / 2), v = new Float32Array(w * h * 3), k = new Float32Array(w * h);
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
      const i = y * p.w + x, kk = p.k[i]; if (!kk) continue;
      const j = (y >> 1) * w + (x >> 1);
      k[j] += kk; v[j * 3] += p.v[i * 3] * kk; v[j * 3 + 1] += p.v[i * 3 + 1] * kk; v[j * 3 + 2] += p.v[i * 3 + 2] * kk;
    }
    for (let j = 0; j < w * h; j++) if (k[j]) { v[j * 3] /= k[j]; v[j * 3 + 1] /= k[j]; v[j * 3 + 2] /= k[j]; k[j] = Math.min(1, k[j]); }
    lv.push({ v, k, w, h });
  }
  for (let l = lv.length - 2; l >= 0; l--) {
    const p = lv[l], q = lv[l + 1];
    for (let y = 0; y < p.h; y++) {
      const cy = Math.max(0, Math.min(q.h - 1, (y + 0.5) / 2 - 0.5)), y0 = Math.floor(cy), y1 = Math.min(q.h - 1, y0 + 1), fy = cy - y0;
      for (let x = 0; x < p.w; x++) {
        const i = y * p.w + x, kk = p.k[i]; if (kk >= 1) continue;
        const cx = Math.max(0, Math.min(q.w - 1, (x + 0.5) / 2 - 0.5)), x0 = Math.floor(cx), x1 = Math.min(q.w - 1, x0 + 1), fx = cx - x0;
        for (let c = 0; c < 3; c++) {
          const s = (q.v[(y0 * q.w + x0) * 3 + c] * (1 - fx) + q.v[(y0 * q.w + x1) * 3 + c] * fx) * (1 - fy)
            + (q.v[(y1 * q.w + x0) * 3 + c] * (1 - fx) + q.v[(y1 * q.w + x1) * 3 + c] * fx) * fy;
          p.v[i * 3 + c] = p.v[i * 3 + c] * kk + s * (1 - kk);
        }
        p.k[i] = 1;
      }
    }
  }
  return lv[0].v;
}
// what the AI painted, made to sit in the picture: its tone shifted so it meets the surroundings exactly at the edge,
// the shift fading smoothly inward (no box)
async function gfHarmonize(list, crop, mask) {
  const W = crop.width, H = crop.height, N = W * H, R = Math.max(3, Math.round(Math.min(W, H) / 120));
  const px = (cv) => cv.getContext('2d').getImageData(0, 0, W, H).data;
  const part = (src, keep) => { const c = canvasEl(W, H), x = c.getContext('2d'); x.drawImage(src, 0, 0, W, H); x.globalCompositeOperation = keep ? 'destination-in' : 'destination-out'; x.drawImage(mask, 0, 0); return c; };
  const soft = (src, r) => { const c = canvasEl(W, H), x = c.getContext('2d'); x.filter = `blur(${r}px)`; x.drawImage(src, 0, 0); return c; };
  const m = px(mask), out = px(soft(part(crop, false), R * 2)), a = px(crop), ab = px(soft(crop, R));
  const tex = gfTexture(crop, mask, a, ab, R)[0]; // (the picture's own grain, for the smooth parts of the painting)
  const res = [];
  for (const it of list) {
    const gcv = canvasEl(W, H); gcv.getContext('2d').drawImage(await loadEl(it.url), 0, 0, W, H);
    const g = px(gcv), gb = px(soft(gcv, R)), gin = px(soft(part(gcv, true), R * 2));
    // the tone difference along the inside of the edge (surroundings minus painting), spread over the area
    const val = new Float32Array(N * 3), known = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const p = i * 4; if (m[p + 3] < 128 || out[p + 3] < 40 || gin[p + 3] < 40) continue;
      known[i] = 1; for (let c = 0; c < 3; c++) val[i * 3 + c] = out[p + c] - gin[p + c];
    }
    const d = gfMembrane(val, known, W, H);
    const c = canvasEl(W, H), x = c.getContext('2d'), id = x.createImageData(W, H), o = id.data;
    o.set(g);
    for (let i = 0; i < N; i++) {
      const p = i * 4, t = m[p + 3] / 255; if (!t) continue;
      const busy = (Math.abs(g[p] - gb[p]) + Math.abs(g[p + 1] - gb[p + 1]) + Math.abs(g[p + 2] - gb[p + 2])) / 3;
      const q = tex ? tex(i % W, (i / W) | 0) : -1, gr = q >= 0 ? Math.max(0, 1 - busy / 6) : 0;
      for (let ch = 0; ch < 3; ch++) o[p + ch] = g[p + ch] + (d[i * 3 + ch] + (gr ? Math.max(-10, Math.min(10, a[q + ch] - ab[q + ch])) * gr : 0)) * t;
    }
    x.putImageData(id, 0, 0);
    res.push({ url: await keepPng('genfill.png', c) });
  }
  return res;
}
// clean patches near the area for its texture: functions (x, y) -> the pixel index of the patch's texture there
function gfTexture(crop, mask, a, ab, R) {
  const W = crop.width, H = crop.height;
  const near = canvasEl(W, H), nx = near.getContext('2d'); nx.filter = `blur(${R * 2}px)`; nx.drawImage(mask, 0, 0); nx.drawImage(mask, 0, 0);
  const nm = near.getContext('2d').getImageData(0, 0, W, H).data;
  const mb = maskBox(mask); if (!mb) return [];
  const S = Math.max(32, Math.min(192, Math.round(Math.min(mb.w, mb.h) / 2), Math.floor(Math.min(W, H) / 3)));
  const cand = [];
  for (let y = 0; y + S <= H; y += Math.max(8, S >> 2)) for (let x = 0; x + S <= W; x += Math.max(8, S >> 2)) {
    let clear = true, e = 0, n = 0;
    for (let j = 0; j < S && clear; j += 4) for (let i = 0; i < S; i += 4) {
      const p = ((y + j) * W + x + i) * 4;
      if (nm[p + 3] > 4 || a[p + 3] < 250) { clear = false; break; }
      e += Math.abs(a[p] - ab[p]) + Math.abs(a[p + 1] - ab[p + 1]) + Math.abs(a[p + 2] - ab[p + 2]); n++;
    }
    if (clear && n) cand.push({ x, y, e: e / n, d: Math.hypot(x + S / 2 - (mb.x + mb.w / 2), y + S / 2 - (mb.y + mb.h / 2)) });
  }
  // the most typical texture: the calmest third (no objects or edges in it), closest to the area first
  cand.sort((p, q) => p.e - q.e);
  const calm = cand.slice(0, Math.max(1, Math.ceil(cand.length * 0.3))).sort((p, q) => p.d - q.d);
  const mir = (v) => { const k = ((v % (2 * S)) + 2 * S) % (2 * S); return k < S ? k : 2 * S - 1 - k; };
  return [calm[0], calm[Math.floor(calm.length / 3)], calm[Math.floor((2 * calm.length) / 3)]].filter(Boolean)
    .map((P, vi) => (x, y) => ((P.y + mir(y - mb.y + vi * 7)) * W + P.x + mir(x - mb.x + vi * 11)) * 4);
}
// guard: a variation whose picture outside the area is not this picture (a wrong or mixed-up result) is never pasted
async function gfCheck(list, crop, mask) {
  const W = crop.width, H = crop.height, step = 7;
  const a = crop.getContext('2d').getImageData(0, 0, W, H).data, m = mask.getContext('2d').getImageData(0, 0, W, H).data;
  const near = canvasEl(W, H), nx = near.getContext('2d'); nx.filter = `blur(${Math.max(4, W / 60)}px)`; nx.drawImage(mask, 0, 0);
  const n = nx.getImageData(0, 0, W, H).data;
  const ok = [];
  for (const it of list) {
    const c = canvasEl(W, H), x = c.getContext('2d'); x.drawImage(await loadEl(it.url), 0, 0, W, H);
    const b = x.getImageData(0, 0, W, H).data;
    let s = 0, k = 0;
    for (let i = 0; i < a.length; i += 4 * step) if (m[i + 3] < 8 && n[i + 3] < 8 && a[i + 3] > 200) { s += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); k++; }
    if (!k || s / k / 3 < 14) ok.push(it); else console.warn('genfill: variation rejected, differs outside the area by', (s / k / 3).toFixed(1));
  }
  if (!ok.length) throw new Error('The AI sent back a picture that does not match this one — nothing was pasted. Try again.');
  return ok;
}
async function gfMake({ kind, prompt, R, m, cw, ch, box, crop, mask, above, replace }) {
  genBusy(true, 'Generating…');
  const list = await gfPaint(kind, prompt, crop, mask);
  if (!list.length) throw new Error('The AI sent nothing back');
  genBusy(true, 'Blending…');
  const meta = { v: 2, kind, prompt, R, m, cw, ch, box, mask: await keepPng('genfill_mask.png', mask), variants: list.map((x) => ({ raw: x.url })), vi: 0 };
  meta.variants[0].url = await gfBake(meta, 0);
  const layer = await loadImg(meta.variants[0].url);
  layer.set({ left: R.x + box.x / m, top: R.y + box.y / m, scaleX: 1 / m, scaleY: 1 / m, name: gfName(kind, prompt), id: uid() });
  layer.genfill = meta;
  const c = ED.canvas, objs = c.getObjects();
  c.insertAt(layer, above && objs.includes(above) ? objs.indexOf(above) + 1 : objs.length);
  if (replace) c.remove(replace);
  gfDone(layer, kind === 'expand' ? `Generative Expand done — ${gfNote(list.length)}` : `Generative fill done — ${gfNote(list.length)}; the original is untouched`);
}
function gfDone(layer, msg) {
  const c = ED.canvas;
  setTool('select'); c.setActiveObject(layer); c.requestRenderAll(); scheduleHistory();
  genBusy(false); clearGenSel(); ED.emit('selection'); refreshLibrary(); toast(msg);
}
// one variation as the layer's picture: the AI's whole crop cut to the mask (feathered outward), trimmed to the mask
async function gfBake(meta, i) {
  const [im, mk] = await Promise.all([loadEl(meta.variants[i].raw), loadEl(meta.mask)]);
  const { cw, ch, box } = meta, out = canvasEl(cw, ch), ox = out.getContext('2d');
  ox.drawImage(im, 0, 0, cw, ch);
  const f = meta.feather ?? Math.max(2, Math.round(Math.min(cw, ch) * 0.012));
  // (outward: the AI's picture is this picture outside the area, so the soft edge falls on matching pixels - no seam)
  const fm = canvasEl(cw, ch), fx = fm.getContext('2d');
  if (f) fx.filter = `blur(${f}px)`;
  fx.drawImage(mk, 0, 0, cw, ch); fx.filter = 'none'; fx.drawImage(mk, 0, 0, cw, ch);
  ox.globalCompositeOperation = 'destination-in'; ox.drawImage(fm, 0, 0);
  const t = canvasEl(box.w, box.h); t.getContext('2d').drawImage(out, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
  return keepPng(`genfill_${(meta.prompt || meta.kind).slice(0, 30)}.png`, t);
}
// where the layer's crop is now (it may have been moved since)
const gfR = (o, g) => ({ x: o.left - g.box.x / g.m, y: o.top - g.box.y / g.m, w: g.R.w, h: g.R.h });
const gfSet = (o, url) => new Promise((ok) => o.setSrc(url, () => { ED.canvas.requestRenderAll(); ok(); }, { crossOrigin: 'anonymous' }));
// Generate again: 3 more variations of the same area (the prompt may be new), the newest one shown
async function gfAgain(o, prompt) {
  const g = o.genfill, R = gfR(o, g);
  genBusy(true, 'Looking…');
  const crop = await gfLook(R, g.m, [o.id]);
  const mask = canvasEl(g.cw, g.ch); mask.getContext('2d').drawImage(await loadEl(g.mask), 0, 0, g.cw, g.ch);
  genBusy(true, 'Generating…');
  const list = await gfPaint(g.kind, prompt, crop, mask);
  genBusy(true, 'Blending…');
  const first = g.variants.length;
  g.variants.push(...list.map((x) => ({ raw: x.url }))); g.prompt = prompt; g.vi = first;
  g.variants[first].url = await gfBake(g, first);
  await gfSet(o, g.variants[first].url); o.name = gfName(g.kind, prompt);
  gfDone(o, `${list.length} new variations — ${g.variants.length} in all`);
}
async function gfPick(o, i) {
  const g = o.genfill, v = g.variants[i]; if (!v) return;
  if (!v.url) { toast('Blending…'); v.url = await gfBake(g, i); }
  g.vi = i; await gfSet(o, v.url); scheduleHistory(); renderInspector();
}
async function gfDrop(o, i) {
  const g = o.genfill;
  if (g.variants.length < 2) return toast('The last variation — delete the layer instead');
  g.variants.splice(i, 1);
  if (g.vi === i) await gfPick(o, Math.min(i, g.variants.length - 1)); // (the shown one: the next takes its place)
  else { if (g.vi > i) g.vi--; scheduleHistory(); renderInspector(); }
}
// the mask: feather (re-cut from the AI's pictures), load as a selection, replace by the current selection
async function gfRebake(o) {
  const g = o.genfill; g.variants.forEach((v) => { delete v.url; });
  g.variants[g.vi].url = await gfBake(g, g.vi); await gfSet(o, g.variants[g.vi].url); scheduleHistory();
}
async function gfMaskToSel(o) {
  const g = o.genfill, R = gfR(o, g), s = psSelCanvas(), x = s.cv.getContext('2d');
  x.drawImage(await loadEl(g.mask), R.x * s.k, R.y * s.k, R.w * s.k, R.h * s.k);
  psSelSet(s); toast('Layer mask loaded as a selection — change it, then “Use selection as mask”');
}
async function gfSelToMask(o) {
  const g = o.genfill, s = PS.sel; if (!s) return toast('Make a selection first');
  const R = gfR(o, g), mk = canvasEl(g.cw, g.ch);
  mk.getContext('2d').drawImage(s.cv, R.x * s.k, R.y * s.k, R.w * s.k, R.h * s.k, 0, 0, g.cw, g.ch);
  const box = gfGrow(maskBox(mk), g.cw, g.ch); if (!box) return toast('The selection does not touch this layer', true);
  g.mask = await keepPng('genfill_mask.png', mk); g.box = box;
  await gfRebake(o); o.set({ left: R.x + box.x / g.m, top: R.y + box.y / g.m }); o.setCoords(); psSelSet(null);
  ED.canvas.requestRenderAll(); scheduleHistory(); renderInspector(); toast('Mask replaced');
}

// Generative Expand: crop to the bigger box, then paint the new edges to continue the picture
async function gfExpand(prompt) {
  const r0 = PS.crop; if (!r0) return;
  const r = { x: Math.round(r0.x), y: Math.round(r0.y), w: Math.round(r0.w), h: Math.round(r0.h) };
  const W0 = ED.project.width, H0 = ED.project.height;
  genBusy(true, 'Expanding…');
  psCropTo(r);
  for (let i = 0; i < 60 && !(ED.canvas.getObjects().find((o) => o.isPage)?.width === r.w && !ED.loading); i++) await new Promise((ok) => setTimeout(ok, 50));
  const W = r.w, H = r.h, old = { x: -r.x, y: -r.y, w: W0, h: H0 };
  const R = { x: 0, y: 0, w: W, h: H }, m = Math.min(2, 1024 / Math.max(W, H)), cw = Math.round(W * m), ch = Math.round(H * m);
  genBusy(true, 'Looking…');
  const crop = await gfLook(R, m);
  const o = { x: old.x * m, y: old.y * m, w: old.w * m, h: old.h * m };
  const mask = canvasEl(cw, ch), mx = mask.getContext('2d'), lap = Math.max(3, Math.round(6 * m));
  mx.fillStyle = '#fff'; mx.fillRect(0, 0, cw, ch); mx.clearRect(o.x + lap, o.y + lap, o.w - 2 * lap, o.h - 2 * lap);
  const box = gfGrow(maskBox(mask), cw, ch); if (!box) throw new Error('Nothing new to fill');
  await gfMake({ kind: 'expand', prompt, R, m, cw, ch, box, crop, mask, above: null });
}

// a picture box or a Vector shape: a fresh picture painted for it (Qwen-Image / SDXL), traced in Vector
async function gfFresh(s, prompt, vec) {
  if (!prompt) throw new Error('Type what should be there — the box is empty, there is nothing to remove');
  const regen = s.kind === 'object' && s.obj.genfill;
  const b = gfBounds(s.pts);
  genBusy(true, 'Painting…');
  const ar = b.w / b.h, gw = r64(ar >= 1 ? 1024 : 1024 * ar), gh = r64(ar >= 1 ? 1024 / ar : 1024);
  const words = vec ? `${prompt}, flat vector illustration, clean solid colour shapes, no text` : prompt;
  const pic = (await postJSON('/api/ai/image', { prompt: words, preset: 'quality', width: gw, height: gh, count: 1 }))[0].url;
  genBusy(true, 'Blending…');
  const meta = { prompt, kind: 'generate', src: pic, box: true, variants: [...(regen ? s.obj.genfill.variants || [] : []), pic] };
  let layer;
  if (regen) {
    layer = s.obj;
    await new Promise((ok) => layer.setSrc(pic, ok, { crossOrigin: 'anonymous' }));
    layer.genfill = meta; layer.name = gfName('fill', prompt); layer.dirty = true; layer.setCoords();
  } else if (s.obj.placeholder) {
    // a picture box takes the picture itself, cropped to it (like dropping a photo on it)
    layer = fillPlaceholder(s.obj, await loadImg(pic)); layer.genfill = meta; layer.name = gfName('fill', prompt);
  } else {
    layer = await loadImg(pic);
    const k = Math.max(b.w / layer.width, b.h / layer.height);
    layer.set({ left: b.x + (b.w - layer.width * k) / 2, top: b.y + (b.h - layer.height * k) / 2, scaleX: k, scaleY: k, name: gfName('fill', prompt), id: uid() });
    layer.genfill = { ...meta, box: false };
    const c = ED.canvas; c.insertAt(layer, c.getObjects().indexOf(s.obj) + 1);
    if (vec) layer = await traceInto(layer, s.obj);
  }
  gfDone(layer, 'Generated — select it to try another variation');
}

// Vector: the painted picture traced into editable paths, clipped to the shape it fills
async function traceInto(img, shape) {
  const el = img.getElement(), k = Math.min(1, 520 / Math.max(el.naturalWidth || el.width, el.naturalHeight || el.height));
  const cv = canvasEl(Math.round((el.naturalWidth || el.width) * k), Math.round((el.naturalHeight || el.height) * k));
  cv.getContext('2d').drawImage(el, 0, 0, cv.width, cv.height);
  const svg = ImageTracer.imagedataToSVG(cv.getContext('2d').getImageData(0, 0, cv.width, cv.height),
    { numberofcolors: 16, pathomit: 10, ltres: 1, qtres: 1, roundcoords: 1, blurradius: 0, strokewidth: 0, viewbox: true, linefilter: true });
  const objs = await new Promise((ok) => fabric.loadSVGFromString(svg, (list) => ok(list)));
  const keep = objs.filter((o) => (o.opacity ?? 1) > 0.5 && o.fill && o.fill !== 'none');
  if (!keep.length) return img;
  const g = new fabric.Group(keep, { name: img.name + ' (vector)', id: uid(), isFolder: true });
  const sx = img.getScaledWidth() / cv.width, sy = img.getScaledHeight() / cv.height;
  g.set({ scaleX: sx, scaleY: sy, left: img.left, top: img.top });
  g.genfill = img.genfill;
  if (shape && !shape.placeholder) shape.clone((cl) => { cl.set({ absolutePositioned: true, fill: '#000', stroke: null, shadow: null, opacity: 1 }); g.clipPath = cl; g.dirty = true; ED.canvas.requestRenderAll(); });
  const c = ED.canvas, i = c.getObjects().indexOf(img);
  ED.loading = true; c.remove(img); ED.loading = false; c.insertAt(g, i);
  return g;
}

// ---------------- panel, Properties, context bar ----------------
const gfSubject = (bg) => { if (!window.PSM?.selectSubject) return toast('Select Subject is in the Design tab'); PSM.selectSubject(); if (bg && PS.sel) psInverse(); };
PANEL_FNS.gen = ['sparkles', 'Generative fill', (body) => {
  const vec = ED.mode === 'vector', book = ED.mode === 'book', ps = !vec && !book && typeof PS !== 'undefined';
  body.innerHTML = `<h4>Generative fill</h4>
    <p class="note">${vec ? 'Select a shape and the AI fills it with artwork, traced into editable paths (or draw an area).'
      : book ? 'Select a picture box and the AI paints a photo into it, or draw an area on the page.'
        : 'Select an area, press <b>Generative Fill</b> and type what goes there — leave it empty to remove what is there. Three variations land on a new layer. Crop (C) past the edge for <b>Generative Expand</b>.'}
      It runs on Limelight AI in the office — nothing goes to the cloud.</p>
    <div class="btn-row" style="margin-bottom:8px">
      <button class="btn" data-gf="genRect">${icon('marquee', 'width="16" height="16"')}Area</button>
      ${vec || book ? '' : `<button class="btn" data-gf="genLasso">${icon('lasso', 'width="16" height="16"')}Lasso</button>`}
      <button class="btn" data-gf="obj">${icon('select', 'width="16" height="16"')}Selected object</button></div>
    ${ps ? `<div class="btn-row" style="margin-bottom:8px"><button class="btn" data-gf="subj">Select Subject</button><button class="btn" data-gf="bg">Select Background</button>
      <button class="btn primary" data-gf="sel">${icon('sparkles', 'width="16" height="16"')}Fill selection</button></div>` : ''}
    <h4>On this page</h4><div id="gfList"></div>
    <p class="note" id="gfState"></p>`;
  $$('[data-gf]', body).forEach((b) => b.onclick = () => ({ obj: () => genFromObject(ED.canvas.getActiveObject()), subj: () => gfSubject(false), bg: () => gfSubject(true), sel: genFromPsSel })[b.dataset.gf]?.() ?? setTool(b.dataset.gf));
  const layers = ED.canvas.getObjects().filter((o) => o.genfill);
  $('#gfList').innerHTML = layers.length ? layers.map((o) => `<button class="text-preset" data-gfl="${o.id}">${esc(o.name)}<br><span class="muted small">${o.genfill.variants?.length || 1} variation(s)</span></button>`).join('') : '<p class="note">None yet.</p>';
  $$('[data-gfl]', body).forEach((b) => b.onclick = () => { const o = ED.canvas.getObjects().find((x) => x.id === b.dataset.gfl); if (o) { setTool('select'); ED.canvas.setActiveObject(o); ED.canvas.requestRenderAll(); ED.emit('selection'); } });
  fetch('/api/ai/status').then((r) => r.json()).then((s) => { const el = $('#gfState'); if (el) el.textContent = s.ok ? `AI online · ${/127\.0\.0\.1|localhost/.test(s.url) ? 'this PC' : s.url}` : `AI ${s.url}: ${s.error || 'not reachable'}`; }).catch(() => 0);
}];

ED.inspHooks.push((el, objs) => {
  const o = objs.length === 1 ? objs[0] : null;
  if (!o || !o.genfill || o.locked) return;
  const g = o.genfill, vars = g.variants || [];
  if (g.v === 2) {
    const f = g.feather ?? Math.max(2, Math.round(Math.min(g.cw, g.ch) * 0.012));
    el.insertAdjacentHTML('afterbegin', sec('✨ Generative layer', `<label class="f"><span>Prompt</span><input id="gfiP" spellcheck="false" placeholder="Empty = remove / continue the picture" value="${esc(g.prompt || '')}"></label>
      <div class="gf-vars">${vars.map((v, i) => `<div class="gf-var ${i === g.vi ? 'on' : ''}"><button class="tile img ${i === g.vi ? 'on' : ''}" data-gfv="${i}" title="Variation ${i + 1}"><img src="${esc(v.raw)}"></button><button class="gf-del" data-gfd="${i}" title="Delete this variation">×</button></div>`).join('')}</div>
      <button class="btn primary full" data-gfa="again">${icon('sparkles', 'width="16" height="16"')}Generate (3 more)</button>
      <h5 style="margin-top:10px">Mask</h5>
      <label class="f"><span>Feather <b id="gfiFv">${f}</b> px</span><input type="range" id="gfiF" min="0" max="40" value="${f}"></label>
      <div class="btn-row"><button class="btn" data-gfa="tosel">Load as selection</button><button class="btn" data-gfa="fromsel" ${typeof PS !== 'undefined' && PS.sel ? '' : 'disabled'}>Use selection as mask</button></div>
      <p class="muted small">${g.kind === 'expand' ? 'Generative Expand' : 'Generative Fill'} · ${vars.length} variation${vars.length > 1 ? 's' : ''} · opacity and visibility as for any layer</p>`));
    const inp = $('#gfiP', el); inp.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') $('[data-gfa=again]', el).click(); };
    $('[data-gfa=again]', el).onclick = async () => { GF.sel = { kind: 'object', obj: o, pts: objPts(o) }; showGenBar(inp.value); await runGenFill(); };
    $$('[data-gfv]', el).forEach((b) => b.onclick = () => gfPick(o, +b.dataset.gfv).catch((e) => toast(e.message, true)));
    $$('[data-gfd]', el).forEach((b) => b.onclick = () => gfDrop(o, +b.dataset.gfd).catch((e) => toast(e.message, true)));
    const fr = $('#gfiF', el); fr.oninput = () => { $('#gfiFv', el).textContent = fr.value; };
    fr.onchange = () => { g.feather = +fr.value; gfRebake(o).catch((e) => toast(e.message, true)); };
    $('[data-gfa=tosel]', el).onclick = () => gfMaskToSel(o).catch((e) => toast(e.message, true));
    $('[data-gfa=fromsel]', el).onclick = () => gfSelToMask(o).catch((e) => toast(e.message, true));
    return;
  }
  el.insertAdjacentHTML('afterbegin', sec('✨ Generative layer', `<p class="muted small">“${esc(g.prompt || 'Removed')}” · ${g.kind === 'generate' ? 'painted fresh' : 'edited'}</p>
    ${vars.length > 1 && o.type === 'image' ? `<div class="gf-vars">${vars.map((u, i) => `<button class="tile img ${o.getSrc?.().endsWith(u) ? 'on' : ''}" data-gfv="${i}"><img src="${esc(u)}"></button>`).join('')}</div>` : ''}
    <button class="btn primary full" data-gfa="again">${icon('sparkles', 'width="16" height="16"')}Generate again</button>`));
  $('[data-gfa=again]', el).onclick = () => genFromObject(o);
  $$('[data-gfv]', el).forEach((b) => b.onclick = () => o.setSrc(vars[+b.dataset.gfv], () => { ED.canvas.requestRenderAll(); scheduleHistory(); renderInspector(); }, { crossOrigin: 'anonymous' }));
});

const _placeCtxBar = placeCtxBar;
placeCtxBar = function () {
  _placeCtxBar();
  const bar = $('#ctxBar'); if (bar.classList.contains('hidden') || ED.mode === '3d') return;
  bar.insertAdjacentHTML('afterbegin', `<button class="icon-btn gen" data-cb="gen" title="Generative fill">${icon('sparkles')}</button>`);
  $('[data-cb=gen]', bar).onmousedown = (e) => { e.preventDefault(); genFromObject(ED.canvas.getActiveObject()); };
  bar.style.left = Math.max(8, parseFloat(bar.style.left) - 18) + 'px';
};
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && GF.sel && !isTyping(e)) (GF.busy ? GF.cancel?.() : clearGenSel()); });

const _bootGF = bootEditor;
bootEditor = function () {
  if (editorReady) return; _bootGF(); gfInit();
  // the Design tab's selections (ps-core.js) go to this Generative Fill, mask and feather included
  if (typeof psSelToGen === 'function') psSelToGen = genFromPsSel;
};

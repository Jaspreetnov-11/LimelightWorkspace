// Limelight Studio - Photoshop menus for the Design tab: Image (adjustments, image / canvas size, rotation, crop, trim),
// Layer (new, via copy / cut, fill layers, masks, rasterize, merge, flatten), Select (all, inverse, colour range, modify,
// subject) and Filter (blur, sharpen, noise, pixelate, stylize, distort, render). Adjustments and filters work on the
// selected pixel layer, inside the selection when there is one, with a live preview in a floating panel.
const PSM = {};
const psDlgClose = () => $('#psDlg')?.remove();

// ---------------- the floating panel with live preview ----------------
// fields: [key, label, min, max, step, default] | [key, label, 'check', default] | [key, label, 'select', default, [[v, name]...]] | [key, label, 'color', default]
function psDialog(title, fields, run, opts = {}) {
  const o = PS.layer;
  if (!o || !psLive(o)) return toast('Select a layer first (in Layers)', true);
  if (!isRaster(o)) {
    if (!confirm(`“${o.name || o.type}” is not a pixel layer. Rasterize it so “${title}” can change its pixels?`)) return;
    if (!psRasterize(o)) return;
  }
  const T = psTarget({ noQM: true, noNew: true }); if (!T) return;
  const W = T.cv.width, H = T.cv.height, x = T.cv.getContext('2d'), base = x.getImageData(0, 0, W, H), baseCv = psCopy(T.cv);
  const selA = PS.sel ? psSelLocal(T).getContext('2d').getImageData(0, 0, W, H).data : null;
  const v = Object.fromEntries(fields.map((f) => [f[0], f[2] === 'check' || f[2] === 'select' || f[2] === 'color' ? f[3] : f[5]]));
  const info = { W, H, src: base.data, cv: baseCv, T };
  const apply = () => {
    const out = new ImageData(new Uint8ClampedArray(base.data), W, H), r = run(out.data, v, info);
    if (r && r !== out.data) out.data.set(r);
    if (selA) { const d = out.data, s = base.data; for (let i = 0; i < d.length; i += 4) { const a = selA[i + 3] / 255; if (a >= 1) continue; for (let c = 0; c < 4; c++) d[i + c] = s[i + c] + (d[i + c] - s[i + c]) * a; } }
    x.putImageData(out, 0, 0); psTouch(o);
  };
  PSM.last = { title, fields, run, v };
  if (!fields.length || opts.now) { apply(); psCommit(o); return; }
  psDlgClose();
  const dlg = document.createElement('div'); dlg.id = 'psDlg'; dlg.className = 'ps-dlg';
  dlg.innerHTML = `<header>${esc(title)}<span class="grow"></span><button class="icon-btn" data-x>×</button></header><div class="ps-dlg-body">${opts.top || ''}${fields.map((f) => {
    const [k, label, a, def] = f;
    if (a === 'check') return `<label class="psd chk"><input type="checkbox" data-k="${k}" ${def ? 'checked' : ''}> ${label}</label>`;
    if (a === 'select') return `<label class="psd"><span>${label}</span><select data-k="${k}">${f[4].map(([val, n]) => `<option value="${val}" ${val === def ? 'selected' : ''}>${n}</option>`).join('')}</select></label>`;
    if (a === 'color') return `<label class="psd"><span>${label}</span><input type="color" data-k="${k}" value="${def}"></label>`;
    return `<label class="psd"><span>${label}<b data-kv="${k}">${f[5]}</b></span><input type="range" data-k="${k}" min="${f[2]}" max="${f[3]}" step="${f[4]}" value="${f[5]}"></label>`;
  }).join('')}</div><footer><label class="chk"><input type="checkbox" data-prev checked> Preview</label><span class="grow"></span><button class="btn ghost" data-x>Cancel</button><button class="btn primary" data-ok>OK</button></footer>`;
  $('#stage').appendChild(dlg);
  let raf = 0, preview = true;
  const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { if (preview) apply(); }); };
  $$('[data-k]', dlg).forEach((inp) => inp.oninput = inp.onchange = () => {
    const k = inp.dataset.k; v[k] = inp.type === 'checkbox' ? inp.checked : inp.type === 'range' ? +inp.value : inp.value;
    const b = $(`[data-kv="${k}"]`, dlg); if (b) b.textContent = inp.value; schedule();
  });
  $('[data-prev]', dlg).onchange = (e) => { preview = e.target.checked; if (preview) apply(); else { x.putImageData(base, 0, 0); psTouch(o); } };
  const cancel = () => { cancelAnimationFrame(raf); x.putImageData(base, 0, 0); psTouch(o); psDlgClose(); };
  $$('[data-x]', dlg).forEach((b) => b.onclick = cancel);
  $('[data-ok]', dlg).onclick = () => { cancelAnimationFrame(raf); apply(); psDlgClose(); psCommit(o); };
  dlg.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') $('[data-ok]', dlg).click(); if (e.key === 'Escape') cancel(); };
  opts.mount?.(dlg, v, schedule, info);
  // drag by the header
  $('header', dlg).onmousedown = (e) => {
    if (e.target.closest('button')) return;
    const r = dlg.getBoundingClientRect(), sr = $('#stage').getBoundingClientRect(), ox = e.clientX - r.left, oy = e.clientY - r.top;
    const mv = (ev) => { dlg.style.left = ev.clientX - sr.left - ox + 'px'; dlg.style.top = ev.clientY - sr.top - oy + 'px'; dlg.style.right = 'auto'; };
    const up = () => { removeEventListener('mousemove', mv); removeEventListener('mouseup', up); };
    addEventListener('mousemove', mv); addEventListener('mouseup', up);
  };
  apply();
}
// a small settings panel without pixels (sizes, feather...)
function psForm(title, fields, ok) {
  psDlgClose();
  const dlg = document.createElement('div'); dlg.id = 'psDlg'; dlg.className = 'ps-dlg';
  dlg.innerHTML = `<header>${esc(title)}<span class="grow"></span><button class="icon-btn" data-x>×</button></header><div class="ps-dlg-body">${fields.map(([k, label, type, val, list]) =>
    type === 'select' ? `<label class="psd"><span>${label}</span><select data-k="${k}">${list.map(([a, n]) => `<option value="${a}" ${a === val ? 'selected' : ''}>${n}</option>`).join('')}</select></label>`
      : type === 'check' ? `<label class="psd chk"><input type="checkbox" data-k="${k}" ${val ? 'checked' : ''}> ${label}</label>`
        : type === 'anchor' ? `<div class="psd"><span>${label}</span><div class="ps-anchor">${[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => `<button data-anc="${i}" class="${i === 4 ? 'on' : ''}"></button>`).join('')}</div></div>`
          : `<label class="psd"><span>${label}</span><input type="${type}" data-k="${k}" value="${val}"></label>`).join('')}</div>
    <footer><span class="grow"></span><button class="btn ghost" data-x>Cancel</button><button class="btn primary" data-ok>OK</button></footer>`;
  $('#stage').appendChild(dlg);
  let anchor = 4;
  $$('[data-anc]', dlg).forEach((b) => b.onclick = () => { anchor = +b.dataset.anc; $$('[data-anc]', dlg).forEach((x) => x.classList.toggle('on', x === b)); });
  const read = () => Object.fromEntries($$('[data-k]', dlg).map((i) => [i.dataset.k, i.type === 'checkbox' ? i.checked : i.type === 'number' ? +i.value : i.value]).concat([['anchor', anchor]]));
  $$('[data-x]', dlg).forEach((b) => b.onclick = psDlgClose);
  $('[data-ok]', dlg).onclick = () => { const v = read(); psDlgClose(); ok(v); };
  dlg.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') $('[data-ok]', dlg).click(); if (e.key === 'Escape') psDlgClose(); };
  setTimeout(() => $('input, select', dlg)?.focus(), 0);
  return dlg;
}

// ---------------- pixel maths ----------------
const c255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
const lumOf = (d, i) => d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
function lutAll(d, lut, ch = [0, 1, 2]) { for (let i = 0; i < d.length; i += 4) for (const c of ch) d[i + c] = lut[d[i + c]]; }
function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0;
  if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; }
  return [h, s, l];
}
function hsl2rgb(h, s, l) {
  if (!s) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
// blur with edges clamped (no dark rim on opaque photos)
function blurCv(cv, r) {
  if (r <= 0) return psCopy(cv);
  const W = cv.width, H = cv.height, p = Math.ceil(r * 3), t = canvasEl(W + 2 * p, H + 2 * p), x = t.getContext('2d');
  x.drawImage(cv, p, p);
  x.drawImage(cv, 0, 0, 1, H, 0, p, p, H); x.drawImage(cv, W - 1, 0, 1, H, W + p, p, p, H);
  x.drawImage(t, 0, p, W + 2 * p, 1, 0, 0, W + 2 * p, p); x.drawImage(t, 0, H + p - 1, W + 2 * p, 1, 0, H + p, W + 2 * p, p);
  const o = canvasEl(W, H), ox = o.getContext('2d'); ox.filter = `blur(${r}px)`; ox.drawImage(t, -p, -p); ox.filter = 'none';
  return o;
}
const dataOf = (cv) => cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
// curve / levels helpers
function monoLUT(pts) {
  pts = pts.slice().sort((a, b) => a[0] - b[0]);
  const n = pts.length, xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), m = new Array(n).fill(0), dl = [];
  for (let i = 0; i < n - 1; i++) dl.push((ys[i + 1] - ys[i]) / Math.max(1e-6, xs[i + 1] - xs[i]));
  m[0] = dl[0] || 0; m[n - 1] = dl[n - 2] || 0;
  for (let i = 1; i < n - 1; i++) m[i] = dl[i - 1] * dl[i] <= 0 ? 0 : (dl[i - 1] + dl[i]) / 2;
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) {
    if (v <= xs[0]) { lut[v] = ys[0]; continue; } if (v >= xs[n - 1]) { lut[v] = ys[n - 1]; continue; }
    let i = 0; while (xs[i + 1] < v) i++;
    const h = xs[i + 1] - xs[i], t = (v - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    lut[v] = (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  }
  return lut;
}
function histogram(src, ch) { const h = new Array(256).fill(0); for (let i = 0; i < src.length; i += 4) { if (!src[i + 3]) continue; h[ch === 'rgb' ? Math.round(lumOf(src, i)) : src[i + { r: 0, g: 1, b: 2 }[ch]]]++; } return h; }
function drawHist(cvs, h, color = '#9aa') {
  const x = cvs.getContext('2d'), W = cvs.width, H = cvs.height, mx = Math.max(...h.slice(1, 255)) || 1;
  x.clearRect(0, 0, W, H); x.fillStyle = color;
  for (let i = 0; i < 256; i++) { const v = Math.min(1, h[i] / mx) * H; x.fillRect((i * W) / 256, H - v, W / 256 + 0.5, v); }
}
function stretchLUT(hist, clip = 0.001) {
  const total = hist.reduce((a, b) => a + b, 0) || 1; let lo = 0, hi = 255, acc = 0;
  for (; lo < 255; lo++) { acc += hist[lo]; if (acc / total > clip) break; } acc = 0;
  for (; hi > 0; hi--) { acc += hist[hi]; if (acc / total > clip) break; }
  const lut = new Uint8ClampedArray(256); for (let v = 0; v < 256; v++) lut[v] = hi > lo ? ((v - lo) * 255) / (hi - lo) : v; return lut;
}

// ---------------- adjustments ----------------
const ADJ = {
  brightness: ['Brightness/Contrast', [['b', 'Brightness', -150, 150, 1, 0], ['c', 'Contrast', -50, 100, 1, 0]], (d, v) => {
    const f = (259 * (v.c * 1.27 + 255)) / (255 * (259 - v.c * 1.27)), lut = new Uint8ClampedArray(256).map((_, i) => f * (i + v.b * 0.6 - 128) + 128); lutAll(d, lut);
  }],
  levels: ['Levels', [['ch', 'Channel', 'select', 'rgb', [['rgb', 'RGB'], ['r', 'Red'], ['g', 'Green'], ['b', 'Blue']]], ['ib', 'Input black', 0, 253, 1, 0], ['gm', 'Midtones (gamma)', 0.1, 4, 0.01, 1], ['iw', 'Input white', 2, 255, 1, 255],
    ['ob', 'Output black', 0, 255, 1, 0], ['ow', 'Output white', 0, 255, 1, 255]], (d, v) => {
    const lut = new Uint8ClampedArray(256).map((_, i) => { const t = Math.max(0, Math.min(1, (i - v.ib) / Math.max(1, v.iw - v.ib))); return v.ob + Math.pow(t, 1 / v.gm) * (v.ow - v.ob); });
    lutAll(d, lut, v.ch === 'rgb' ? [0, 1, 2] : [{ r: 0, g: 1, b: 2 }[v.ch]]);
  }, { hist: true }],
  curves: ['Curves', [['ch', 'Channel', 'select', 'rgb', [['rgb', 'RGB'], ['r', 'Red'], ['g', 'Green'], ['b', 'Blue']]]], null, { curves: true }],
  exposure: ['Exposure', [['e', 'Exposure', -5, 5, 0.01, 0], ['o', 'Offset', -0.5, 0.5, 0.001, 0], ['g', 'Gamma', 0.1, 3, 0.01, 1]], (d, v) => {
    const lut = new Uint8ClampedArray(256).map((_, i) => Math.pow(Math.max(0, (i / 255) * Math.pow(2, v.e) + v.o), 1 / v.g) * 255); lutAll(d, lut);
  }],
  vibrance: ['Vibrance', [['vib', 'Vibrance', -100, 100, 1, 0], ['sat', 'Saturation', -100, 100, 1, 0]], (d, v) => {
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b), s = mx ? (mx - mn) / mx : 0, L = lumOf(d, i);
      const k = 1 + v.sat / 100 + (v.vib / 100) * (1 - s);
      d[i] = c255(L + (r - L) * k); d[i + 1] = c255(L + (g - L) * k); d[i + 2] = c255(L + (b - L) * k);
    }
  }],
  hueSat: ['Hue/Saturation', [['h', 'Hue', -180, 180, 1, 0], ['s', 'Saturation', -100, 100, 1, 0], ['l', 'Lightness', -100, 100, 1, 0], ['col', 'Colorize', 'check', false]], (d, v) => {
    for (let i = 0; i < d.length; i += 4) {
      let [h, s, l] = rgb2hsl(d[i], d[i + 1], d[i + 2]);
      if (v.col) { h = ((v.h + 180) / 360); s = Math.max(0, (v.s + 100) / 200); } else { h = (h + v.h / 360 + 1) % 1; s = Math.max(0, Math.min(1, s * (1 + v.s / 100))); }
      l = v.l >= 0 ? l + (1 - l) * (v.l / 100) : l * (1 + v.l / 100);
      const [r, g, b] = hsl2rgb(h, s, l); d[i] = r; d[i + 1] = g; d[i + 2] = b;
    }
  }],
  colorBalance: ['Color Balance', [['tone', 'Tone', 'select', 'mid', [['shadows', 'Shadows'], ['mid', 'Midtones'], ['highlights', 'Highlights']]], ['cr', 'Cyan ↔ Red', -100, 100, 1, 0], ['mg', 'Magenta ↔ Green', -100, 100, 1, 0], ['yb', 'Yellow ↔ Blue', -100, 100, 1, 0], ['pl', 'Preserve Luminosity', 'check', true]], (d, v) => {
    for (let i = 0; i < d.length; i += 4) {
      const L = lumOf(d, i) / 255, w = v.tone === 'shadows' ? (1 - L) ** 2 : v.tone === 'highlights' ? L ** 2 : 1 - Math.abs(2 * L - 1);
      let r = d[i] + v.cr * w * 0.9, g = d[i + 1] + v.mg * w * 0.9, b = d[i + 2] + v.yb * w * 0.9;
      if (v.pl) { const L2 = r * 0.299 + g * 0.587 + b * 0.114, dl = L * 255 - L2; r += dl; g += dl; b += dl; }
      d[i] = c255(r); d[i + 1] = c255(g); d[i + 2] = c255(b);
    }
  }],
  bw: ['Black & White', [['re', 'Reds', -200, 300, 1, 40], ['ye', 'Yellows', -200, 300, 1, 60], ['gr', 'Greens', -200, 300, 1, 40], ['cy', 'Cyans', -200, 300, 1, 60], ['bl', 'Blues', -200, 300, 1, 20], ['ma', 'Magentas', -200, 300, 1, 80],
    ['tint', 'Tint', 'check', false], ['tc', 'Tint colour', 'color', '#e0c89a']], (d, v) => {
    const [tr, tg, tb] = psRGB(v.tc);
    for (let i = 0; i < d.length; i += 4) {
      const c = [d[i], d[i + 1], d[i + 2]], idx = [0, 1, 2].sort((a, b) => c[b] - c[a]), mx = c[idx[0]], md = c[idx[1]], mn = c[idx[2]];
      const prim = [v.re, v.gr, v.bl][idx[0]] / 100, pair = idx[0] + idx[1], sec = (pair === 1 ? v.ye : pair === 3 ? v.cy : v.ma) / 100;
      const g = c255(mn + (md - mn) * sec + (mx - md) * prim);
      if (v.tint) { d[i] = c255((g * tr) / 200 + g / 2); d[i + 1] = c255((g * tg) / 200 + g / 2); d[i + 2] = c255((g * tb) / 200 + g / 2); } else d[i] = d[i + 1] = d[i + 2] = g;
    }
  }],
  photoFilter: ['Photo Filter', [['c', 'Filter colour', 'color', '#ec8a00'], ['dn', 'Density', 0, 100, 1, 25], ['pl', 'Preserve Luminosity', 'check', true]], (d, v) => {
    const [fr, fg, fb] = psRGB(v.c), k = v.dn / 100;
    for (let i = 0; i < d.length; i += 4) {
      const L = lumOf(d, i); let r = d[i] + ((d[i] * fr) / 255 - d[i]) * k * 1.4, g = d[i + 1] + ((d[i + 1] * fg) / 255 - d[i + 1]) * k * 1.4, b = d[i + 2] + ((d[i + 2] * fb) / 255 - d[i + 2]) * k * 1.4;
      if (v.pl) { const dl = L - (r * 0.299 + g * 0.587 + b * 0.114); r += dl; g += dl; b += dl; }
      d[i] = c255(r); d[i + 1] = c255(g); d[i + 2] = c255(b);
    }
  }],
  channelMixer: ['Channel Mixer', [['rr', 'Red ← Red %', -200, 200, 1, 100], ['rg', 'Red ← Green %', -200, 200, 1, 0], ['rb', 'Red ← Blue %', -200, 200, 1, 0],
    ['gr', 'Green ← Red %', -200, 200, 1, 0], ['gg', 'Green ← Green %', -200, 200, 1, 100], ['gb', 'Green ← Blue %', -200, 200, 1, 0],
    ['br', 'Blue ← Red %', -200, 200, 1, 0], ['bg', 'Blue ← Green %', -200, 200, 1, 0], ['bb', 'Blue ← Blue %', -200, 200, 1, 100], ['mono', 'Monochrome', 'check', false]], (d, v) => {
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2], R = (r * v.rr + g * v.rg + b * v.rb) / 100;
      if (v.mono) { d[i] = d[i + 1] = d[i + 2] = c255(R); continue; }
      d[i] = c255(R); d[i + 1] = c255((r * v.gr + g * v.gg + b * v.gb) / 100); d[i + 2] = c255((r * v.br + g * v.bg + b * v.bb) / 100);
    }
  }],
  invert: ['Invert', [], (d) => { for (let i = 0; i < d.length; i += 4) { d[i] = 255 - d[i]; d[i + 1] = 255 - d[i + 1]; d[i + 2] = 255 - d[i + 2]; } }],
  posterize: ['Posterize', [['n', 'Levels', 2, 32, 1, 4]], (d, v) => { const lut = new Uint8ClampedArray(256).map((_, i) => Math.round((i / 255) * (v.n - 1)) * (255 / (v.n - 1))); lutAll(d, lut); }],
  threshold: ['Threshold', [['t', 'Threshold Level', 1, 255, 1, 128]], (d, v) => { for (let i = 0; i < d.length; i += 4) d[i] = d[i + 1] = d[i + 2] = lumOf(d, i) >= v.t ? 255 : 0; }],
  gradientMap: ['Gradient Map', [['a', 'Shadows', 'color', '#000000'], ['b', 'Highlights', 'color', '#ffffff'], ['rev', 'Reverse', 'check', false]], (d, v) => {
    const A = psRGB(v.rev ? v.b : v.a), B = psRGB(v.rev ? v.a : v.b);
    for (let i = 0; i < d.length; i += 4) { const t = lumOf(d, i) / 255; d[i] = A[0] + (B[0] - A[0]) * t; d[i + 1] = A[1] + (B[1] - A[1]) * t; d[i + 2] = A[2] + (B[2] - A[2]) * t; }
  }],
  selectiveColor: ['Selective Color', [['tgt', 'Colors', 'select', 'reds', [['reds', 'Reds'], ['yellows', 'Yellows'], ['greens', 'Greens'], ['cyans', 'Cyans'], ['blues', 'Blues'], ['magentas', 'Magentas'], ['neutrals', 'Neutrals']]],
    ['c', 'Cyan', -100, 100, 1, 0], ['m', 'Magenta', -100, 100, 1, 0], ['y', 'Yellow', -100, 100, 1, 0], ['k', 'Black', -100, 100, 1, 0]], (d, v) => {
    const H = { reds: 0, yellows: 1 / 6, greens: 1 / 3, cyans: 0.5, blues: 2 / 3, magentas: 5 / 6 }[v.tgt];
    for (let i = 0; i < d.length; i += 4) {
      const [h, s] = rgb2hsl(d[i], d[i + 1], d[i + 2]);
      const w = v.tgt === 'neutrals' ? 1 - s : Math.max(0, 1 - Math.min(Math.abs(h - H), 1 - Math.abs(h - H)) * 6) * s;
      if (w <= 0) continue;
      d[i] = c255(d[i] - v.c * 1.5 * w - v.k * w); d[i + 1] = c255(d[i + 1] - v.m * 1.5 * w - v.k * w); d[i + 2] = c255(d[i + 2] - v.y * 1.5 * w - v.k * w);
    }
  }],
  shadowsHighlights: ['Shadows/Highlights', [['sh', 'Shadows amount %', 0, 100, 1, 35], ['hi', 'Highlights amount %', 0, 100, 1, 0], ['r', 'Radius', 2, 200, 1, 30]], (d, v, info) => {
    const bl = dataOf(blurCv(info.cv, v.r));
    for (let i = 0; i < d.length; i += 4) {
      const L = lumOf(bl, i) / 255, up = (v.sh / 100) * (1 - L) ** 2, dn = (v.hi / 100) * L ** 2;
      for (let c = 0; c < 3; c++) d[i + c] = c255(d[i + c] + (255 - d[i + c]) * up - d[i + c] * dn);
    }
  }],
  desaturate: ['Desaturate', [], (d) => { for (let i = 0; i < d.length; i += 4) d[i] = d[i + 1] = d[i + 2] = lumOf(d, i); }],
  equalize: ['Equalize', [], (d) => {
    const h = histogram(d, 'rgb'), tot = h.reduce((a, b) => a + b, 0) || 1, lut = new Uint8ClampedArray(256); let acc = 0;
    for (let i = 0; i < 256; i++) { acc += h[i]; lut[i] = (acc / tot) * 255; }
    for (let i = 0; i < d.length; i += 4) { const L = Math.round(lumOf(d, i)), k = L ? lut[L] / L : 1; for (let c = 0; c < 3; c++) d[i + c] = c255(d[i + c] * k); }
  }],
  replaceColor: ['Replace Color', [['from', 'Colour to replace', 'color', '#ff0000'], ['fz', 'Fuzziness', 0, 200, 1, 40], ['h', 'Hue', -180, 180, 1, 0], ['s', 'Saturation', -100, 100, 1, 0], ['l', 'Lightness', -100, 100, 1, 0]], (d, v) => {
    const [fr, fg, fb] = psRGB(v.from);
    for (let i = 0; i < d.length; i += 4) {
      const dist = Math.hypot(d[i] - fr, d[i + 1] - fg, d[i + 2] - fb), w = Math.max(0, 1 - dist / Math.max(1, v.fz * 1.5)); if (!w) continue;
      let [h, s, l] = rgb2hsl(d[i], d[i + 1], d[i + 2]); h = (h + v.h / 360 + 1) % 1; s = Math.max(0, Math.min(1, s * (1 + v.s / 100))); l = Math.max(0, Math.min(1, l + v.l / 200));
      const [r, g, b] = hsl2rgb(h, s, l); d[i] += (r - d[i]) * w; d[i + 1] += (g - d[i + 1]) * w; d[i + 2] += (b - d[i + 2]) * w;
    }
  }],
};
PSM.adjust = (key) => {
  const a = ADJ[key]; if (!a) return;
  const [title, fields, fn, opts = {}] = a;
  if (opts.curves) return curvesDialog();
  psDialog(title, fields, fn, opts.hist ? { mount: (dlg, v, schedule, info) => {
    const hc = document.createElement('canvas'); hc.width = 256; hc.height = 70; hc.className = 'ps-hist'; $('.ps-dlg-body', dlg).prepend(hc);
    const draw = () => drawHist(hc, histogram(info.src, v.ch), { r: '#ff6b6b', g: '#5bd47a', b: '#5b8cff' }[v.ch] || '#b8b8c2'); draw();
    $('[data-k=ch]', dlg).addEventListener('change', draw);
  } } : {});
};
function curvesDialog() {
  const pts = { rgb: [[0, 0], [255, 255]], r: [[0, 0], [255, 255]], g: [[0, 0], [255, 255]], b: [[0, 0], [255, 255]] };
  psDialog('Curves', [['ch', 'Channel', 'select', 'rgb', [['rgb', 'RGB'], ['r', 'Red'], ['g', 'Green'], ['b', 'Blue']]]], (d) => {
    const L = { rgb: monoLUT(pts.rgb), r: monoLUT(pts.r), g: monoLUT(pts.g), b: monoLUT(pts.b) };
    for (let i = 0; i < d.length; i += 4) { d[i] = L.rgb[L.r[d[i]]]; d[i + 1] = L.rgb[L.g[d[i + 1]]]; d[i + 2] = L.rgb[L.b[d[i + 2]]]; }
  }, { mount: (dlg, v, schedule, info) => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 256; cv.className = 'ps-curve'; $('.ps-dlg-body', dlg).append(cv);
    $('.ps-dlg-body', dlg).insertAdjacentHTML('beforeend', '<p class="muted small">Click to add a point · drag it · drag it out of the box to remove</p>');
    const x = cv.getContext('2d'); let drag = -1;
    const draw = () => {
      const P = pts[v.ch], lut = monoLUT(P), col = { rgb: '#e8e8ee', r: '#ff6b6b', g: '#5bd47a', b: '#5b8cff' }[v.ch];
      x.clearRect(0, 0, 256, 256); drawHist(cv, histogram(info.src, v.ch), '#ffffff14');
      x.strokeStyle = '#ffffff1f'; x.beginPath(); for (let i = 64; i < 256; i += 64) { x.moveTo(i, 0); x.lineTo(i, 256); x.moveTo(0, i); x.lineTo(256, i); } x.moveTo(0, 256); x.lineTo(256, 0); x.stroke();
      x.strokeStyle = col; x.lineWidth = 2; x.beginPath(); for (let i = 0; i < 256; i++) (i ? x.lineTo(i, 255 - lut[i]) : x.moveTo(i, 255 - lut[i])); x.stroke(); x.lineWidth = 1;
      P.forEach(([px, py]) => { x.fillStyle = '#fff'; x.fillRect(px - 4, 251 - py, 8, 8); });
    };
    const at = (e) => { const r = cv.getBoundingClientRect(); return [Math.round(((e.clientX - r.left) / r.width) * 255), Math.round(255 - ((e.clientY - r.top) / r.height) * 255)]; };
    cv.onmousedown = (e) => {
      const P = pts[v.ch], [px, py] = at(e); drag = P.findIndex(([a, b]) => Math.abs(a - px) < 8 && Math.abs(b - py) < 8);
      if (drag < 0) { P.push([px, py]); P.sort((a, b) => a[0] - b[0]); drag = P.findIndex(([a, b]) => a === px && b === py); }
      const mv = (ev) => { const [qx, qy] = at(ev); const out = qx < -20 || qx > 275 || qy < -20 || qy > 275; if (out && P.length > 2 && drag > 0 && drag < P.length - 1) { P.splice(drag, 1); drag = -1; up(); } else if (drag >= 0) { P[drag] = [Math.max(0, Math.min(255, qx)), Math.max(0, Math.min(255, qy))]; } draw(); schedule(); };
      const up = () => { removeEventListener('mousemove', mv); removeEventListener('mouseup', up); };
      addEventListener('mousemove', mv); addEventListener('mouseup', up); draw(); schedule();
    };
    $('[data-k=ch]', dlg).addEventListener('change', draw); draw();
  } });
}
PSM.auto = (kind) => {
  psDialog(`Auto ${kind[0].toUpperCase() + kind.slice(1)}`, [], (d) => {
    if (kind === 'contrast') { const lut = stretchLUT(histogram(d, 'rgb'), 0.001); lutAll(d, lut); return; }
    const L = ['r', 'g', 'b'].map((c) => stretchLUT(histogram(d, c), 0.001));
    for (let i = 0; i < d.length; i += 4) { d[i] = L[0][d[i]]; d[i + 1] = L[1][d[i + 1]]; d[i + 2] = L[2][d[i + 2]]; }
    if (kind === 'color') { // neutralise the midtones: every channel's mean to the common mean
      const m = [0, 0, 0]; let n = 0; for (let i = 0; i < d.length; i += 16) if (d[i + 3]) { m[0] += d[i]; m[1] += d[i + 1]; m[2] += d[i + 2]; n++; }
      const avg = (m[0] + m[1] + m[2]) / 3 / Math.max(1, n), g = m.map((s) => Math.log(avg / 255) / Math.log(Math.max(1, s / Math.max(1, n)) / 255 || 0.5));
      const lut = g.map((gg) => new Uint8ClampedArray(256).map((_, v) => Math.pow(v / 255, isFinite(gg) && gg > 0 ? gg : 1) * 255));
      for (let i = 0; i < d.length; i += 4) { d[i] = lut[0][d[i]]; d[i + 1] = lut[1][d[i + 1]]; d[i + 2] = lut[2][d[i + 2]]; }
    }
  });
};

// ---------------- filters ----------------
function convolve(src, W, H, k, div = 1, bias = 0, ch = 3) {
  const out = new Uint8ClampedArray(src), n = Math.sqrt(k.length) | 0, h = n >> 1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    for (let c = 0; c < ch; c++) {
      let s = 0;
      for (let ky = 0; ky < n; ky++) for (let kx = 0; kx < n; kx++) { const yy = Math.min(H - 1, Math.max(0, y + ky - h)), xx = Math.min(W - 1, Math.max(0, x + kx - h)); s += src[(yy * W + xx) * 4 + c] * k[ky * n + kx]; }
      out[i + c] = s / div + bias;
    }
  }
  return out;
}
function sampler(src, W, H) { // bilinear, clamped
  return (u, v, out, j) => {
    u = Math.max(0, Math.min(W - 1.001, u)); v = Math.max(0, Math.min(H - 1.001, v));
    const x0 = u | 0, y0 = v | 0, fx = u - x0, fy = v - y0, a = (y0 * W + x0) * 4, b = a + 4, c = a + W * 4, e = c + 4;
    for (let k = 0; k < 4; k++) out[j + k] = (src[a + k] * (1 - fx) + src[b + k] * fx) * (1 - fy) + (src[c + k] * (1 - fx) + src[e + k] * fx) * fy;
  };
}
function distort(d, info, map) { const { W, H, src } = info, s = sampler(src, W, H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const [u, v] = map(x, y); s(u, v, d, (y * W + x) * 4); } }
const FILT = {
  gaussian: ['Gaussian Blur', [['r', 'Radius (px)', 0.1, 250, 0.1, 4]], (d, v, info) => dataOf(blurCv(info.cv, v.r))],
  boxBlur: ['Box Blur', [['r', 'Radius (px)', 1, 60, 1, 6]], (d, v, info) => { const a = psBoxBlur(info.src, info.W, info.H, Math.round(v.r / 2)); return Uint8ClampedArray.from(a); }],
  motion: ['Motion Blur', [['a', 'Angle', -90, 90, 1, 0], ['dist', 'Distance (px)', 1, 400, 1, 30]], (d, v, info) => {
    const o = canvasEl(info.W, info.H), x = o.getContext('2d'), n = Math.max(2, Math.round(v.dist / 2)), r = (v.a * Math.PI) / 180;
    for (let i = 0; i < n; i++) { const t = (i / (n - 1) - 0.5) * v.dist; x.globalAlpha = 1 / (i + 1); x.drawImage(info.cv, Math.cos(r) * t, -Math.sin(r) * t); }
    return dataOf(o);
  }],
  radial: ['Radial Blur (Zoom)', [['amt', 'Amount', 1, 100, 1, 20], ['cx', 'Centre X %', 0, 100, 1, 50], ['cy', 'Centre Y %', 0, 100, 1, 50]], (d, v, info) => {
    const o = canvasEl(info.W, info.H), x = o.getContext('2d'), n = 24, cx = (info.W * v.cx) / 100, cy = (info.H * v.cy) / 100;
    for (let i = 0; i < n; i++) { const s = 1 + (i / n) * (v.amt / 100) * 0.6; x.globalAlpha = 1 / (i + 1); x.setTransform(s, 0, 0, s, cx - cx * s, cy - cy * s); x.drawImage(info.cv, 0, 0); }
    return dataOf(o);
  }],
  lensBlur: ['Lens Blur', [['r', 'Radius', 1, 100, 1, 10], ['bright', 'Specular brightness', 0, 100, 1, 30]], (d, v, info) => {
    const b = dataOf(blurCv(info.cv, v.r)); for (let i = 0; i < b.length; i += 4) { const L = lumOf(b, i) / 255, k = 1 + (v.bright / 100) * L ** 4 * 2; for (let c = 0; c < 3; c++) b[i + c] = c255(b[i + c] * k); } return b;
  }],
  sharpen: ['Sharpen', [], (d, v, info) => convolve(info.src, info.W, info.H, [0, -1, 0, -1, 5, -1, 0, -1, 0])],
  sharpenMore: ['Sharpen More', [], (d, v, info) => convolve(info.src, info.W, info.H, [-1, -1, -1, -1, 9, -1, -1, -1, -1])],
  unsharp: ['Unsharp Mask', [['amt', 'Amount %', 1, 500, 1, 100], ['r', 'Radius (px)', 0.1, 50, 0.1, 1.5], ['th', 'Threshold', 0, 255, 1, 0]], (d, v, info) => {
    const b = dataOf(blurCv(info.cv, v.r)), s = info.src, k = v.amt / 100;
    for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) { const df = s[i + c] - b[i + c]; if (Math.abs(df) >= v.th) d[i + c] = c255(s[i + c] + df * k); }
  }],
  highPass: ['High Pass', [['r', 'Radius (px)', 0.1, 100, 0.1, 10]], (d, v, info) => { const b = dataOf(blurCv(info.cv, v.r)), s = info.src; for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) d[i + c] = c255(s[i + c] - b[i + c] + 128); }],
  noise: ['Add Noise', [['amt', 'Amount %', 0, 100, 0.5, 8], ['gauss', 'Gaussian', 'check', true], ['mono', 'Monochromatic', 'check', false]], (d, v) => {
    const a = v.amt * 2.55, rnd = () => (v.gauss ? (Math.random() + Math.random() + Math.random() - 1.5) / 1.5 : Math.random() * 2 - 1) * a;
    for (let i = 0; i < d.length; i += 4) { if (v.mono) { const n = rnd(); for (let c = 0; c < 3; c++) d[i + c] = c255(d[i + c] + n); } else for (let c = 0; c < 3; c++) d[i + c] = c255(d[i + c] + rnd()); }
  }],
  median: ['Median (Reduce Noise)', [['r', 'Radius', 1, 3, 1, 1]], (d, v, info) => {
    const { W, H, src } = info, r = v.r, buf = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) for (let c = 0; c < 3; c++) {
      buf.length = 0; for (let yy = Math.max(0, y - r); yy <= Math.min(H - 1, y + r); yy++) for (let xx = Math.max(0, x - r); xx <= Math.min(W - 1, x + r); xx++) buf.push(src[(yy * W + xx) * 4 + c]);
      buf.sort((a, b) => a - b); d[(y * W + x) * 4 + c] = buf[buf.length >> 1];
    }
  }],
  dust: ['Dust & Scratches', [['r', 'Radius', 1, 3, 1, 1], ['th', 'Threshold', 0, 255, 1, 20]], (d, v, info) => {
    const { W, H, src } = info, r = v.r, buf = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) for (let c = 0; c < 3; c++) {
      buf.length = 0; for (let yy = Math.max(0, y - r); yy <= Math.min(H - 1, y + r); yy++) for (let xx = Math.max(0, x - r); xx <= Math.min(W - 1, x + r); xx++) buf.push(src[(yy * W + xx) * 4 + c]);
      buf.sort((a, b) => a - b); const i = (y * W + x) * 4 + c, m = buf[buf.length >> 1]; if (Math.abs(src[i] - m) > v.th) d[i] = m;
    }
  }],
  mosaic: ['Mosaic', [['s', 'Cell size (px)', 2, 200, 1, 16]], (d, v, info) => {
    const { W, H, src } = info, s = v.s;
    for (let by = 0; by < H; by += s) for (let bx = 0; bx < W; bx += s) {
      const m = [0, 0, 0, 0]; let n = 0;
      for (let y = by; y < Math.min(H, by + s); y++) for (let x = bx; x < Math.min(W, bx + s); x++) { const j = (y * W + x) * 4; for (let c = 0; c < 4; c++) m[c] += src[j + c]; n++; }
      for (let y = by; y < Math.min(H, by + s); y++) for (let x = bx; x < Math.min(W, bx + s); x++) { const j = (y * W + x) * 4; for (let c = 0; c < 4; c++) d[j + c] = m[c] / n; }
    }
  }],
  halftone: ['Color Halftone', [['s', 'Max radius (px)', 3, 40, 1, 8]], (d, v, info) => {
    const { W, H, src } = info, o = canvasEl(W, H), x = o.getContext('2d'), s = v.s * 2; x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
    [['#00ffff', 0, 15], ['#ff00ff', 1, 75], ['#ffff00', 2, 0], ['#000', 3, 45]].forEach(([col, ch, ang]) => {
      x.globalCompositeOperation = 'multiply'; x.fillStyle = col; const a = (ang * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a), R = Math.hypot(W, H);
      for (let gy = -R; gy < R; gy += s) for (let gx = -R; gx < R; gx += s) {
        const px = gx * ca - gy * sa + W / 2, py = gx * sa + gy * ca + H / 2; if (px < -s || py < -s || px > W + s || py > H + s) continue;
        const j = (Math.min(H - 1, Math.max(0, py | 0)) * W + Math.min(W - 1, Math.max(0, px | 0))) * 4, r = src[j] / 255, g = src[j + 1] / 255, b = src[j + 2] / 255, k = 1 - Math.max(r, g, b);
        const val = ch === 3 ? k : (1 - [r, g, b][ch] - k) / Math.max(0.001, 1 - k);
        if (val > 0.02) { x.beginPath(); x.arc(px, py, (Math.sqrt(val) * s) / 1.6, 0, 7); x.fill(); }
      }
    });
    const out = dataOf(o); for (let i = 3; i < out.length; i += 4) out[i] = src[i]; return out;
  }],
  crystallize: ['Crystallize', [['s', 'Cell size', 4, 120, 1, 20]], (d, v, info) => {
    const { W, H, src } = info, s = v.s, gw = Math.ceil(W / s) + 1, gh = Math.ceil(H / s) + 1, pts = [];
    for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) pts.push([(gx + Math.random()) * s, (gy + Math.random()) * s]);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const gx = (x / s) | 0, gy = (y / s) | 0; let best = 1e9, bp = null;
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) { const p = pts[(gy + oy) * gw + gx + ox]; if (!p) continue; const dd = (p[0] - x) ** 2 + (p[1] - y) ** 2; if (dd < best) { best = dd; bp = p; } }
      const j = (Math.min(H - 1, bp[1] | 0) * W + Math.min(W - 1, bp[0] | 0)) * 4, i = (y * W + x) * 4; for (let c = 0; c < 4; c++) d[i + c] = src[j + c];
    }
  }],
  emboss: ['Emboss', [['a', 'Angle', -180, 180, 1, 135], ['h', 'Height (px)', 1, 10, 1, 2], ['amt', 'Amount %', 1, 500, 1, 100]], (d, v, info) => {
    const { W, H, src } = info, r = (v.a * Math.PI) / 180, dx = Math.round(Math.cos(r) * v.h), dy = Math.round(-Math.sin(r) * v.h), k = v.amt / 100;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4, a = ((Math.min(H - 1, Math.max(0, y + dy)) * W) + Math.min(W - 1, Math.max(0, x + dx))) * 4, b = ((Math.min(H - 1, Math.max(0, y - dy)) * W) + Math.min(W - 1, Math.max(0, x - dx))) * 4;
      const g = c255(128 + (lumOf(src, a) - lumOf(src, b)) * k); d[i] = d[i + 1] = d[i + 2] = g;
    }
  }],
  findEdges: ['Find Edges', [], (d, v, info) => {
    const { W, H, src } = info;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) for (let c = 0; c < 3; c++) {
      const p = (xx, yy) => src[(Math.min(H - 1, Math.max(0, yy)) * W + Math.min(W - 1, Math.max(0, xx))) * 4 + c];
      const gx = -p(x - 1, y - 1) - 2 * p(x - 1, y) - p(x - 1, y + 1) + p(x + 1, y - 1) + 2 * p(x + 1, y) + p(x + 1, y + 1);
      const gy = -p(x - 1, y - 1) - 2 * p(x, y - 1) - p(x + 1, y - 1) + p(x - 1, y + 1) + 2 * p(x, y + 1) + p(x + 1, y + 1);
      d[(y * W + x) * 4 + c] = c255(255 - Math.hypot(gx, gy) / 2);
    }
  }],
  glowEdges: ['Glowing Edges', [['br', 'Brightness', 1, 20, 1, 6]], (d, v, info) => {
    const { W, H, src } = info;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) for (let c = 0; c < 3; c++) {
      const p = (xx, yy) => src[(Math.min(H - 1, Math.max(0, yy)) * W + Math.min(W - 1, Math.max(0, xx))) * 4 + c];
      d[(y * W + x) * 4 + c] = c255((Math.abs(p(x + 1, y) - p(x - 1, y)) + Math.abs(p(x, y + 1) - p(x, y - 1))) * v.br / 2);
    }
  }],
  solarize: ['Solarize', [], (d) => { for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) if (d[i + c] > 128) d[i + c] = 255 - d[i + c]; }],
  oilPaint: ['Oil Paint', [['r', 'Radius', 1, 6, 1, 3], ['lv', 'Levels', 4, 40, 1, 20]], (d, v, info) => {
    const { W, H, src } = info, r = v.r, L = v.lv, cnt = new Int32Array(L), sr = new Float32Array(L), sg = new Float32Array(L), sb = new Float32Array(L);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      cnt.fill(0); sr.fill(0); sg.fill(0); sb.fill(0);
      for (let yy = Math.max(0, y - r); yy <= Math.min(H - 1, y + r); yy++) for (let xx = Math.max(0, x - r); xx <= Math.min(W - 1, x + r); xx++) {
        const j = (yy * W + xx) * 4, b = Math.min(L - 1, ((lumOf(src, j) / 256) * L) | 0); cnt[b]++; sr[b] += src[j]; sg[b] += src[j + 1]; sb[b] += src[j + 2];
      }
      let m = 0; for (let b = 1; b < L; b++) if (cnt[b] > cnt[m]) m = b;
      const i = (y * W + x) * 4; d[i] = sr[m] / cnt[m]; d[i + 1] = sg[m] / cnt[m]; d[i + 2] = sb[m] / cnt[m];
    }
  }],
  twirl: ['Twirl', [['a', 'Angle', -999, 999, 1, 120]], (d, v, info) => {
    const cx = info.W / 2, cy = info.H / 2, R = Math.min(cx, cy);
    distort(d, info, (x, y) => { const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy); if (r >= R) return [x, y]; const t = ((v.a * Math.PI) / 180) * (1 - r / R) ** 2, cs = Math.cos(t), sn = Math.sin(t); return [cx + dx * cs - dy * sn, cy + dx * sn + dy * cs]; });
  }],
  pinch: ['Pinch', [['amt', 'Amount %', -100, 100, 1, 50]], (d, v, info) => {
    const cx = info.W / 2, cy = info.H / 2, R = Math.min(cx, cy), k = v.amt / 100;
    distort(d, info, (x, y) => { const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy); if (r >= R || !r) return [x, y]; const f = Math.pow(r / R, k > 0 ? 1 - k * 0.6 : 1 - k * 0.6) / (r / R); return [cx + dx * f, cy + dy * f]; });
  }],
  spherize: ['Spherize', [['amt', 'Amount %', -100, 100, 1, 60]], (d, v, info) => {
    const cx = info.W / 2, cy = info.H / 2, R = Math.min(cx, cy), k = v.amt / 100;
    distort(d, info, (x, y) => { const dx = (x - cx) / R, dy = (y - cy) / R, r = Math.hypot(dx, dy); if (r >= 1 || !r) return [x, y]; const s = Math.asin(r) / (Math.PI / 2) / r, f = 1 + (s - 1) * k; return [cx + dx * f * R, cy + dy * f * R]; });
  }],
  ripple: ['Ripple / Wave', [['amp', 'Amplitude (px)', 0, 100, 1, 10], ['len', 'Wavelength (px)', 4, 400, 1, 60]], (d, v, info) => {
    distort(d, info, (x, y) => [x + Math.sin((y / v.len) * Math.PI * 2) * v.amp, y + Math.sin((x / v.len) * Math.PI * 2) * v.amp]);
  }],
  polar: ['Polar Coordinates', [['inv', 'Polar to Rectangular', 'check', false]], (d, v, info) => {
    const { W, H } = info, cx = W / 2, cy = H / 2, R = Math.min(cx, cy);
    distort(d, info, v.inv ? (x, y) => { const a = (x / W) * Math.PI * 2, r = (1 - y / H) * R; return [cx + Math.sin(a) * r, cy - Math.cos(a) * r]; }
      : (x, y) => { const dx = x - cx, dy = y - cy; return [((Math.atan2(dx, -dy) / (Math.PI * 2) + 1) % 1) * W, (1 - Math.hypot(dx, dy) / R) * H]; });
  }],
  vignette: ['Vignette', [['amt', 'Amount', -100, 100, 1, -50], ['mid', 'Midpoint', 0, 100, 1, 50], ['round', 'Roundness', 0, 100, 1, 50]], (d, v, info) => {
    const { W, H } = info, cx = W / 2, cy = H / 2, ry = H / 2, rx = (W / 2) * (v.round / 100) + Math.max(cx, cy) * (1 - v.round / 100) * (W / Math.max(W, H)), m = 0.2 + (v.mid / 100) * 0.8;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const r = Math.hypot((x - cx) / rx, (y - cy) / ry), t = Math.max(0, Math.min(1, (r - m) / (1.42 - m))), k = t * t * (3 - 2 * t) * (v.amt / 100), i = (y * W + x) * 4;
      for (let c = 0; c < 3; c++) d[i + c] = c255(k < 0 ? d[i + c] * (1 + k) : d[i + c] + (255 - d[i + c]) * k);
    }
  }],
  clouds: ['Render Clouds', [['sc', 'Scale', 10, 400, 1, 120]], (d, v, info) => {
    const { W, H } = info, rnd = new Float32Array(256 * 256).map(Math.random), A = psRGB(PS.fg), B = psRGB(PS.bg);
    const n = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, g = (a, b) => rnd[((b & 255) << 8) | (a & 255)], s = (t) => t * t * (3 - 2 * t);
      return (g(xi, yi) * (1 - s(fx)) + g(xi + 1, yi) * s(fx)) * (1 - s(fy)) + (g(xi, yi + 1) * (1 - s(fx)) + g(xi + 1, yi + 1) * s(fx)) * s(fy); };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let t = 0, amp = 0.5, f = 1 / v.sc; for (let o = 0; o < 6; o++) { t += n(x * f, y * f) * amp; amp /= 2; f *= 2; }
      const i = (y * W + x) * 4; for (let c = 0; c < 3; c++) d[i + c] = A[c] + (B[c] - A[c]) * t; d[i + 3] = 255;
    }
  }],
  lensFlare: ['Lens Flare', [['x', 'Centre X %', 0, 100, 1, 30], ['y', 'Centre Y %', 0, 100, 1, 30], ['br', 'Brightness %', 10, 300, 1, 100]], (d, v, info) => {
    const { W, H } = info, o = psCopy(info.cv), x = o.getContext('2d'), cx = (W * v.x) / 100, cy = (H * v.y) / 100, R = Math.max(W, H) * 0.25 * (v.br / 100);
    x.globalCompositeOperation = 'screen';
    const glow = (px, py, r, col, a) => { const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`); x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2); };
    glow(cx, cy, R, '255,250,230', 1); glow(cx, cy, R * 0.25, '255,255,255', 1);
    [[0.4, 0.12, '120,200,255', 0.4], [0.7, 0.06, '255,180,90', 0.5], [1.1, 0.2, '160,255,180', 0.25], [1.5, 0.1, '255,120,200', 0.35]].forEach(([t, r, col, a]) => glow(cx + (W / 2 - cx) * t * 2, cy + (H / 2 - cy) * t * 2, R * r * 2, col, a));
    return dataOf(o);
  }],
};
PSM.filter = (key) => { const f = FILT[key]; if (f) { PSM.lastKey = key; psDialog(f[0], f[1], f[2]); } };
PSM.lastFilter = () => { if (PSM.lastKey) psDialog(FILT[PSM.lastKey][0], FILT[PSM.lastKey][1], FILT[PSM.lastKey][2], { now: true }); else toast('No filter used yet'); };

// ---------------- edit: fill, stroke, define pattern ----------------
PSM.fill = () => psForm('Fill', [['use', 'Contents', 'select', 'fg', [['fg', 'Foreground Color'], ['bg', 'Background Color'], ['content', 'Content-Aware'], ['pattern', 'Pattern'], ['#000000', 'Black'], ['#808080', '50% Gray'], ['#ffffff', 'White']]],
  ['mode', 'Mode', 'select', 'source-over', BLENDS.map((b) => [b, PS_BLEND_NAMES[b] || b])], ['opacity', 'Opacity %', 'number', 100], ['preserve', 'Preserve Transparency', 'check', false]],
(v) => psFillSel(v.use === 'fg' ? PS.fg : v.use === 'bg' ? PS.bg : v.use, { mode: v.mode, opacity: psClamp(v.opacity / 100, 0, 1), preserve: v.preserve }));
PSM.stroke = () => psForm('Stroke', [['w', 'Width (px)', 'number', 4], ['where', 'Location', 'select', 'center', [['inside', 'Inside'], ['center', 'Center'], ['outside', 'Outside']]]], (v) => psStrokeSel(PS.fg, Math.max(1, v.w), v.where));
PSM.contentFill = () => { if (!PS.sel) return toast('Select the area to remove first'); psFillSel('content'); };
PSM.definePattern = () => {
  const T = psTarget({ noQM: true, noNew: true }); if (!T) return toast('Select a pixel layer');
  let r = { x: 0, y: 0, w: T.cv.width, h: T.cv.height };
  if (PS.sel) { const b = PS.sel.bbox, a = psTp(T.m, { x: b.x, y: b.y }), c = psTp(T.m, { x: b.x + b.w, y: b.y + b.h }); r = { x: Math.min(a.x, c.x), y: Math.min(a.y, c.y), w: Math.abs(c.x - a.x), h: Math.abs(c.y - a.y) }; }
  const t = canvasEl(Math.max(1, Math.round(Math.min(r.w, 1024))), Math.max(1, Math.round(Math.min(r.h, 1024)))); t.getContext('2d').drawImage(T.cv, r.x, r.y, r.w, r.h, 0, 0, t.width, t.height);
  PS.customPattern = t; PS.o.pattern = 'custom'; psBar(); toast('Pattern defined — Pattern Stamp / Fill > Pattern use it');
};
PSM.feather = () => psForm('Feather Selection', [['r', 'Feather Radius (px)', 'number', 10]], (v) => psSelMorph('feather', Math.max(0.1, v.r)));
PSM.modify = (op) => psForm(`${op[0].toUpperCase() + op.slice(1)} Selection`, [['r', `${op === 'border' ? 'Width' : op === 'smooth' ? 'Sample Radius' : `${op[0].toUpperCase() + op.slice(1)} By`} (px)`, 'number', op === 'smooth' ? 4 : 8]], (v) => psSelMorph(op, Math.max(1, v.r)));
PSM.colorRange = () => {
  const m = psMergedData(), W = m.cv.width, H = m.cv.height, [fr, fg, fb] = psRGB(PS.fg);
  psForm('Color Range', [['fz', 'Fuzziness (0-200) — uses the foreground colour', 'number', 40], ['mode', 'Selection', 'select', 'new', [['new', 'New'], ['add', 'Add'], ['sub', 'Subtract'], ['int', 'Intersect']]]], (v) => {
    const s = psSelCanvas(), x = s.cv.getContext('2d'), id = x.createImageData(W, H), fz = Math.max(1, v.fz * 1.6);
    for (let i = 0; i < m.data.length; i += 4) { const dd = Math.hypot(m.data[i] - fr, m.data[i + 1] - fg, m.data[i + 2] - fb), a = Math.max(0, 1 - dd / fz); id.data[i] = id.data[i + 1] = id.data[i + 2] = 255; id.data[i + 3] = a * 255; }
    x.putImageData(id, 0, 0); psSelCommit(s, v.mode);
  });
};
PSM.selectSubject = () => {
  const L = PS.layer, objs = ED.canvas.getObjects().filter((o) => !o.isPage && o.visible !== false);
  if (isRaster(L) && psLive(L)) { // a photo with transparency: its pixels; an opaque photo: what stands out from its border colour
    const T = psTarget({ noQM: true, noNew: true }); if (!T) return;
    const W = T.cv.width, H = T.cv.height, d = T.cv.getContext('2d').getImageData(0, 0, W, H).data; let transparent = 0;
    for (let i = 3; i < d.length; i += 40) if (d[i] < 250) transparent++;
    if (transparent > d.length / 4000) return psSelFromObjects([L]);
    const bg = new Uint8Array(W * H), tol = 38;
    [[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1], [W >> 1, 0], [0, H >> 1], [W - 1, H >> 1], [W >> 1, H - 1]].forEach(([x, y]) => { const f = psFlood(d, W, H, x, y, tol, true); for (let i = 0; i < f.length; i++) if (f[i]) bg[i] = 1; });
    const m = new Uint8Array(W * H); for (let i = 0; i < m.length; i++) m[i] = bg[i] ? 0 : 1;
    psSelFromLocal(T, psMaskFrom(m, W, H), 'new'); psSelMorph('smooth', 2); toast('Subject selected (by contrast with the background — refine with Quick Selection)');
    return;
  }
  psSelFromObjects(objs.length > 1 ? objs.filter((o) => !(o.type === 'rect' && o.left <= 1 && o.top <= 1 && o.getScaledWidth() >= ED.project.width - 2)) : objs);
};
PSM.loadTransparency = () => { const o = PS.layer; if (!o || !psLive(o)) return toast('Select a layer'); psSelFromObjects([o]); };

// ---------------- image: size, canvas, rotation, crop, trim ----------------
function scaleAll(sx, sy) {
  ED.canvas.discardActiveObject();
  ED.canvas.getObjects().forEach((o) => {
    if (o.isPage) return;
    o.set({ left: o.left * sx, top: o.top * sy, scaleX: o.scaleX * sx, scaleY: o.scaleY * sy });
    if (o.clipPath?.absolutePositioned) o.clipPath.set({ left: o.clipPath.left * sx, top: o.clipPath.top * sy, scaleX: o.clipPath.scaleX * sx, scaleY: o.clipPath.scaleY * sy });
    o.setCoords();
  });
}
PSM.imageSize = () => {
  const P = ED.project;
  const dlg = psForm('Image Size', [['w', 'Width (px)', 'number', P.width], ['h', 'Height (px)', 'number', P.height], ['keep', 'Constrain proportions', 'check', true], ['resample', 'Resample (scale the layers)', 'check', true]], (v) => {
    const w = Math.max(1, Math.round(v.w)), h = Math.max(1, Math.round(v.h)); if (v.resample) scaleAll(w / P.width, h / P.height); resizeProject(w, h); toast(`Image size ${w} × ${h}`);
  });
  const W = $('[data-k=w]', dlg), H = $('[data-k=h]', dlg), K = $('[data-k=keep]', dlg);
  W.oninput = () => { if (K.checked) H.value = Math.round((+W.value * P.height) / P.width); };
  H.oninput = () => { if (K.checked) W.value = Math.round((+H.value * P.width) / P.height); };
};
PSM.canvasSize = () => {
  const P = ED.project;
  psForm('Canvas Size', [['w', 'Width (px)', 'number', P.width], ['h', 'Height (px)', 'number', P.height], ['anchor', 'Anchor', 'anchor']], (v) => {
    const w = Math.max(1, Math.round(v.w)), h = Math.max(1, Math.round(v.h)), ax = v.anchor % 3, ay = (v.anchor / 3) | 0;
    psShiftAll(((w - P.width) * ax) / 2, ((h - P.height) * ay) / 2); resizeProject(w, h); toast(`Canvas ${w} × ${h}`);
  });
};
PSM.rotateCanvas = (how) => {
  const P = ED.project, W = P.width, H = P.height, c = ED.canvas; c.discardActiveObject();
  c.getObjects().forEach((o) => {
    if (o.isPage) return;
    const ctr = o.getCenterPoint(); let n;
    if (how === 'cw') { n = { x: H - ctr.y, y: ctr.x }; o.angle = (o.angle || 0) + 90; }
    else if (how === 'ccw') { n = { x: ctr.y, y: W - ctr.x }; o.angle = (o.angle || 0) - 90; }
    else if (how === '180') { n = { x: W - ctr.x, y: H - ctr.y }; o.angle = (o.angle || 0) + 180; }
    else if (how === 'flipH') { n = { x: W - ctr.x, y: ctr.y }; o.set({ flipX: !o.flipX, angle: -(o.angle || 0) }); }
    else { n = { x: ctr.x, y: H - ctr.y }; o.set({ flipY: !o.flipY, angle: -(o.angle || 0) }); }
    o.setPositionByOrigin(new fabric.Point(n.x, n.y), 'center', 'center'); o.setCoords();
  });
  if (how === 'cw' || how === 'ccw') resizeProject(H, W); else { c.requestRenderAll(); scheduleHistory(); }
};
PSM.trim = () => {
  const m = psMergedData(), W = m.cv.width, H = m.cv.height, d = m.data, r0 = d[0], g0 = d[1], b0 = d[2];
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const j = (y * W + x) * 4; if (Math.abs(d[j] - r0) + Math.abs(d[j + 1] - g0) + Math.abs(d[j + 2] - b0) > 6) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
  if (x1 < 0) return toast('Nothing to trim');
  psCropTo({ x: x0 / m.k, y: y0 / m.k, w: (x1 - x0 + 1) / m.k, h: (y1 - y0 + 1) / m.k });
};
PSM.revealAll = () => {
  const objs = ED.canvas.getObjects().filter((o) => !o.isPage && o.visible !== false); if (!objs.length) return;
  const bs = objs.map((o) => o.getBoundingRect(true, true)), x0 = Math.min(0, ...bs.map((b) => b.left)), y0 = Math.min(0, ...bs.map((b) => b.top));
  const x1 = Math.max(ED.project.width, ...bs.map((b) => b.left + b.width)), y1 = Math.max(ED.project.height, ...bs.map((b) => b.top + b.height));
  psCropTo({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
};

// ---------------- layers ----------------
PSM.fillLayer = (kind) => {
  const P = ED.project, c = ED.canvas;
  const r = new fabric.Rect({ left: 0, top: 0, width: P.width, height: P.height, strokeWidth: 0, id: uid(), name: kind === 'solid' ? 'Color Fill' : kind === 'gradient' ? 'Gradient Fill' : 'Pattern Fill',
    fill: kind === 'solid' ? PS.fg : kind === 'gradient' ? makeGradient('linear', PS.fg, PS.bg, 90) : new fabric.Pattern({ source: psPattern(PS.o.pattern, 48, 48), repeat: 'repeat' }) });
  const objs = c.getObjects(); c.insertAt(r, PS.layer && objs.includes(PS.layer) ? objs.indexOf(PS.layer) + 1 : objs.length);
  if (PS.sel) { r.clipPath = maskImage(PS.sel); }
  PS.layer = r; c.requestRenderAll(); scheduleHistory();
};
function maskImage(s) { return new fabric.Image(psCopy(s.cv), { left: 0, top: 0, scaleX: 1 / s.k, scaleY: 1 / s.k, absolutePositioned: true, originX: 'left', originY: 'top' }); }
PSM.addMask = (hide) => {
  const o = PS.layer; if (!o || !psLive(o)) return toast('Select a layer');
  let s = PS.sel;
  if (!s) { const t = psSelCanvas(); if (!hide) { const x = t.cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, t.cv.width, t.cv.height); } s = t; }
  else if (hide) { const t = psSelCanvas(), x = t.cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, t.cv.width, t.cv.height); x.globalCompositeOperation = 'destination-out'; x.drawImage(s.cv, 0, 0); s = t; }
  o.clipPath = maskImage(s); o.dirty = true; psSelSet(null); ED.canvas.requestRenderAll(); scheduleHistory(); toast('Layer mask added');
};
PSM.deleteMask = () => { const o = PS.layer; if (!o?.clipPath) return toast('This layer has no mask'); o.clipPath = null; o.maskShape = null; o.dirty = true; ED.canvas.requestRenderAll(); scheduleHistory(); };
PSM.applyMask = async () => {
  const o = PS.layer; if (!o?.clipPath) return toast('This layer has no mask');
  const r = psRasterize(o); if (r) { r.clipPath = null; await psCommit(r); }
};
PSM.newLayer = () => { psNewLayer(); scheduleHistory(); };
PSM.duplicate = () => { const o = PS.layer; if (!o || !psLive(o)) return toast('Select a layer'); ED.canvas.setActiveObject(o); duplicateSel(); };
PSM.deleteLayer = () => { const o = PS.layer; if (!o || !psLive(o)) return toast('Select a layer'); ED.canvas.remove(o); PS.layer = null; ED.canvas.requestRenderAll(); psBar(); };
PSM.rasterize = () => { const o = PS.layer; if (!o || !psLive(o)) return toast('Select a layer'); if (isRaster(o) && !o.clipPath && !o.filters?.length) return toast('Already a pixel layer'); psRasterize(o); };
function mergeInto(objs, name, rect, at) {
  const c = ED.canvas, r = rect || (() => { const bs = objs.map((o) => o.getBoundingRect(true, true)); const x0 = Math.floor(Math.min(...bs.map((b) => b.left))), y0 = Math.floor(Math.min(...bs.map((b) => b.top))); return { x: x0, y: y0, w: Math.ceil(Math.max(...bs.map((b) => b.left + b.width))) - x0 + 1, h: Math.ceil(Math.max(...bs.map((b) => b.top + b.height))) - y0 + 1 }; })();
  const cv = psRender(objs, r.x, r.y, r.w, r.h, 1), img = new fabric.Image(cv, { left: r.x, top: r.y, name, id: uid() });
  img._psCv = cv; img._psHist = psCopy(cv);
  const i = at ?? Math.min(...objs.map((o) => c.getObjects().indexOf(o)));
  ED.loading = true; objs.forEach((o) => c.remove(o)); ED.loading = false; c.insertAt(img, i);
  PS.layer = img; c.discardActiveObject(); psCommit(img); return img;
}
PSM.mergeDown = () => {
  const c = ED.canvas, o = PS.layer, objs = c.getObjects(); if (!o || !psLive(o) || o.group) return toast('Select a layer');
  const below = objs[objs.indexOf(o) - 1]; if (!below || below.isPage) return toast('There is no layer below to merge into');
  mergeInto([below, o], below.name || 'Merged');
};
PSM.mergeVisible = () => { const objs = ED.canvas.getObjects().filter((o) => !o.isPage && o.visible !== false); if (objs.length < 2) return toast('Nothing to merge'); mergeInto(objs, 'Merged', { x: 0, y: 0, w: ED.project.width, h: ED.project.height }); };
PSM.flatten = () => {
  const c = ED.canvas, hidden = c.getObjects().filter((o) => !o.isPage && o.visible === false);
  if (hidden.length && !confirm(`Discard ${hidden.length} hidden layer${hidden.length > 1 ? 's' : ''}?`)) return;
  ED.loading = true; hidden.forEach((o) => c.remove(o)); ED.loading = false;
  const objs = c.getObjects().filter((o) => o.visible !== false);
  const img = mergeInto(objs.filter((o) => !o.isPage), 'Background', { x: 0, y: 0, w: ED.project.width, h: ED.project.height }, 1);
  const bgc = psRender([pageRect()], 0, 0, ED.project.width, ED.project.height, 1), x = bgc.getContext('2d'); x.drawImage(img._psCv, 0, 0);
  psSetElement(img, bgc); psCommit(img);
};

// ---------------- menus ----------------
const PS_D = 'design';
Object.assign(MENUS, {
  image: [['Adjustments', [['Brightness/Contrast…', () => PSM.adjust('brightness')], ['Levels…', () => PSM.adjust('levels'), 'Ctrl+L'], ['Curves…', () => PSM.adjust('curves'), 'Ctrl+M'], ['Exposure…', () => PSM.adjust('exposure')], '-',
    ['Vibrance…', () => PSM.adjust('vibrance')], ['Hue/Saturation…', () => PSM.adjust('hueSat'), 'Ctrl+U'], ['Color Balance…', () => PSM.adjust('colorBalance'), 'Ctrl+B'], ['Black & White…', () => PSM.adjust('bw'), 'Alt+Ctrl+B'],
    ['Photo Filter…', () => PSM.adjust('photoFilter')], ['Channel Mixer…', () => PSM.adjust('channelMixer')], '-', ['Invert', () => PSM.adjust('invert'), 'Ctrl+I'], ['Posterize…', () => PSM.adjust('posterize')],
    ['Threshold…', () => PSM.adjust('threshold')], ['Gradient Map…', () => PSM.adjust('gradientMap')], ['Selective Color…', () => PSM.adjust('selectiveColor')], '-',
    ['Shadows/Highlights…', () => PSM.adjust('shadowsHighlights')], ['Desaturate', () => PSM.adjust('desaturate'), 'Shift+Ctrl+U'], ['Replace Color…', () => PSM.adjust('replaceColor')], ['Equalize', () => PSM.adjust('equalize')]]],
  '-', ['Auto Tone', () => PSM.auto('tone'), 'Shift+Ctrl+L'], ['Auto Contrast', () => PSM.auto('contrast'), 'Alt+Shift+Ctrl+L'], ['Auto Color', () => PSM.auto('color'), 'Shift+Ctrl+B'], '-',
  ['Image Size…', PSM.imageSize, 'Alt+Ctrl+I'], ['Canvas Size…', PSM.canvasSize, 'Alt+Ctrl+C'],
  ['Image Rotation', [['180°', () => PSM.rotateCanvas('180')], ['90° Clockwise', () => PSM.rotateCanvas('cw')], ['90° Counter Clockwise', () => PSM.rotateCanvas('ccw')], '-', ['Flip Canvas Horizontal', () => PSM.rotateCanvas('flipH')], ['Flip Canvas Vertical', () => PSM.rotateCanvas('flipV')]]],
  ['Crop (to selection)', () => (PS.sel ? psCropTo(PS.sel.bbox) : toast('Make a selection first'))], ['Trim', PSM.trim], ['Reveal All', PSM.revealAll], '-', ['Duplicate artboard', () => addPage(true)]],
  layer: [['New Layer', PSM.newLayer, 'Shift+Ctrl+N'], ['Duplicate Layer', PSM.duplicate], ['Delete Layer', PSM.deleteLayer], '-', ['Layer via Copy', () => psLayerVia(false), 'Ctrl+J'], ['Layer via Cut', () => psLayerVia(true), 'Shift+Ctrl+J'], '-',
    ['New Fill Layer', [['Solid Color', () => PSM.fillLayer('solid')], ['Gradient', () => PSM.fillLayer('gradient')], ['Pattern', () => PSM.fillLayer('pattern')]]],
    ['Layer Mask', [['Reveal All / Reveal Selection', () => PSM.addMask(false)], ['Hide All / Hide Selection', () => PSM.addMask(true)], '-', ['Delete', PSM.deleteMask], ['Apply', PSM.applyMask]]], '-',
    ['Rasterize Layer', PSM.rasterize], ['Group Layers', groupSel, 'Ctrl+G'], ['Ungroup Layers', ungroupSel, 'Shift+Ctrl+G'], '-',
    ['Merge Down', PSM.mergeDown], ['Merge Visible', PSM.mergeVisible, 'Shift+Ctrl+E'], ['Flatten Image', PSM.flatten]],
  select: [['All', psSelAll, 'Ctrl+A'], ['Deselect', psDeselect, 'Ctrl+D'], ['Reselect', psReselect, 'Shift+Ctrl+D'], ['Inverse', psInverse, 'Shift+Ctrl+I'], '-',
    ['Subject', PSM.selectSubject], ['Color Range…', PSM.colorRange], ['Load Layer Transparency', PSM.loadTransparency], '-',
    ['Modify', [['Border…', () => PSM.modify('border')], ['Smooth…', () => PSM.modify('smooth')], ['Expand…', () => PSM.modify('expand')], ['Contract…', () => PSM.modify('contract')], ['Feather…', PSM.feather, 'Shift+F6']]], '-',
    ['Quick Mask Mode', psToggleQM, 'Q'], ['✨ Generative Fill…', () => (PS.sel ? psSelToGen() : toast('Make a selection first'))]],
  filter: [['Last Filter', () => PSM.lastFilter(), 'Alt+Ctrl+F'], '-',
    ['Blur', [['Gaussian Blur…', () => PSM.filter('gaussian')], ['Box Blur…', () => PSM.filter('boxBlur')], ['Motion Blur…', () => PSM.filter('motion')], ['Radial Blur…', () => PSM.filter('radial')], ['Lens Blur…', () => PSM.filter('lensBlur')]]],
    ['Distort', [['Twirl…', () => PSM.filter('twirl')], ['Pinch…', () => PSM.filter('pinch')], ['Spherize…', () => PSM.filter('spherize')], ['Ripple / Wave…', () => PSM.filter('ripple')], ['Polar Coordinates…', () => PSM.filter('polar')]]],
    ['Noise', [['Add Noise…', () => PSM.filter('noise')], ['Median…', () => PSM.filter('median')], ['Dust & Scratches…', () => PSM.filter('dust')]]],
    ['Pixelate', [['Mosaic…', () => PSM.filter('mosaic')], ['Color Halftone…', () => PSM.filter('halftone')], ['Crystallize…', () => PSM.filter('crystallize')]]],
    ['Render', [['Clouds…', () => PSM.filter('clouds')], ['Lens Flare…', () => PSM.filter('lensFlare')], ['Vignette…', () => PSM.filter('vignette')]]],
    ['Sharpen', [['Sharpen', () => PSM.filter('sharpen')], ['Sharpen More', () => PSM.filter('sharpenMore')], ['Unsharp Mask…', () => PSM.filter('unsharp')]]],
    ['Stylize', [['Emboss…', () => PSM.filter('emboss')], ['Find Edges', () => PSM.filter('findEdges')], ['Glowing Edges…', () => PSM.filter('glowEdges')], ['Oil Paint…', () => PSM.filter('oilPaint')], ['Solarize', () => PSM.filter('solarize')]]],
    ['Other', [['High Pass…', () => PSM.filter('highPass')]]]],
});
MENUS.edit.push(['-', , , PS_D], ['Fill…', PSM.fill, 'Shift+F5', PS_D], ['Stroke…', PSM.stroke, '', PS_D], ['Content-Aware Fill', PSM.contentFill, '', PS_D], '-',
  ['Free Transform', () => psPick('select'), 'Ctrl+T', PS_D], ['Transform: Perspective / Distort', () => psAct('persp'), '', PS_D], ['Define Pattern', PSM.definePattern, '', PS_D]);
MENUS.view.push(['-', , , PS_D], ['Rotate View: Reset', () => psSetViewAngle(0), 'Shift+Esc', PS_D], ['Rotate View: 90°', () => psSetViewAngle(PS.viewAngle + 90), '', PS_D], ['Quick Mask', psToggleQM, 'Q', PS_D]);

// menus with submenus, design-only items hidden in the other tabs
openMenu = function (btn) {
  const dd = $('#dropdown');
  const clean = (list) => list.filter((it) => it === '-' || !it[3] || it[3] === ED.mode).map((it) => (Array.isArray(it) && it[0] === '-' ? '-' : it))
    .filter((it, i, a) => it !== '-' || (i > 0 && a[i - 1] !== '-' && i < a.length - 1));
  const items = clean(MENUS[btn.dataset.menu] || []);
  const render = (box, list) => {
    box.innerHTML = list.map((it, i) => it === '-' ? '<hr>' : `<button data-mi="${i}" class="${Array.isArray(it[1]) ? 'sub' : ''}">${it[0]}${Array.isArray(it[1]) ? '<kbd>▸</kbd>' : it[2] ? `<kbd>${it[2]}</kbd>` : ''}</button>`).join('');
    $$('[data-mi]', box).forEach((b) => {
      const it = list[b.dataset.mi];
      if (Array.isArray(it[1])) b.onmouseenter = b.onclick = (e) => { e.stopPropagation(); openSub(b, it[1]); };
      else { b.onmouseenter = () => { if (box === dd) $('#dropdown2')?.classList.add('hidden'); }; b.onclick = () => { closeMenu(); it[1](); }; }
    });
  };
  const openSub = (b, list) => {
    let d2 = $('#dropdown2'); if (!d2) { d2 = document.createElement('div'); d2.id = 'dropdown2'; d2.className = 'dropdown'; document.body.appendChild(d2); d2.onclick = (e) => e.stopPropagation(); }
    render(d2, clean(list)); d2.classList.remove('hidden');
    const r = b.getBoundingClientRect(); d2.style.left = r.right + 2 + 'px'; d2.style.top = Math.min(innerHeight - d2.offsetHeight - 8, r.top - 6) + 'px';
  };
  render(dd, items);
  const r = btn.getBoundingClientRect(); dd.style.left = r.left + 'px'; dd.style.top = r.bottom + 4 + 'px'; dd.classList.remove('hidden');
  $('#dropdown2')?.classList.add('hidden');
  $$('.tb').forEach((b) => b.classList.toggle('open', b === btn));
};
const _closeMenuPS = closeMenu;
closeMenu = function () { _closeMenuPS(); $('#dropdown2')?.classList.add('hidden'); };
document.addEventListener('click', (e) => { if (!e.target.closest('#dropdown, #dropdown2, .tb')) $('#dropdown2')?.classList.add('hidden'); });
// Image / Layer / Select / Filter in the top bar (shown in the Design tab)
(() => {
  const wrap = $('.menu-wrap'), view = $('[data-menu=view]', wrap);
  [['image', 'Image'], ['layer', 'Layer'], ['select', 'Select'], ['filter', 'Filter']].forEach(([k, n]) => {
    const b = document.createElement('button'); b.className = 'tb ps-only'; b.dataset.menu = k; b.textContent = n; wrap.insertBefore(b, view);
  });
})();
window.PSM = PSM;

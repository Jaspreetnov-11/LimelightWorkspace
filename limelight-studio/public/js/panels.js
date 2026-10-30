// Limelight Studio - UI: tool rail, side panels, inspector, layers, pages, menus, shortcuts, drag & drop.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const toHex = (c) => { try { return '#' + new fabric.Color(c || '#000').toHex().toLowerCase(); } catch { return '#000000'; } };
const FONTS = ['Inter', 'Mukta', 'Rozha One', 'Yatra One', 'Arial', 'Segoe UI', 'Georgia', 'Times New Roman', 'Impact', 'Trebuchet MS', 'Verdana', 'Courier New', 'Comic Sans MS', 'Nirmala UI', 'Mangal'];
const BLENDS = ['source-over', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'];
const BRAND = ['#ffc21a', '#0b0c0f', '#ffffff', '#f6f1e6', '#ff8a00', '#ff3d8b', '#5b8cff', '#3ddc84', '#7c4dff', '#ff5d5d', '#1e88e5', '#00bfa5', '#8b93a3', '#2a2f3a', '#fde68a', '#c2185b'];

// ================= tool rail =================
const TOOLS = [
  ['select', 'select', 'V', 'Select (V)'], ['hand', 'hand', 'H', 'Hand / pan (H, or hold Space)'], '-',
  ['rect', 'rect', 'R', 'Rectangle (R)'], ['ellipse', 'ellipse', 'O', 'Ellipse (O)'], ['triangle', 'triangle', '', 'Triangle'],
  ['polygon', 'polygon', '', 'Polygon'], ['star', 'star', '', 'Star'], ['line', 'line', 'L', 'Line (L)'], ['arrow', 'arrow', 'A', 'Arrow (A)'], '-',
  ['pen', 'pen', 'P', 'Pen – bezier paths (P)'], ['brush', 'brush', 'B', 'Brush – paint freely (B)'],
  ['text', 'text', 'T', 'Text (T)'], ['pipette', 'pipette', 'I', 'Eyedropper (I)'],
];
function buildRail() {
  $('#rail').innerHTML = TOOLS.map((t) => t === '-' ? '<div class="sep"></div>'
    : `<button class="icon-btn" data-tool="${t[0]}" data-key="${t[2]}" title="${t[3]}">${icon(t[1])}</button>`).join('')
    + '<div class="sep"></div><button class="icon-btn" id="railImg" title="Add image">' + icon('image') + '</button>'
    + `<button class="icon-btn" id="rail3d" title="3D Studio">${icon('cube')}</button>`;
  $$('#rail [data-tool]').forEach((b) => b.onclick = () => {
    if (b.dataset.tool === 'pipette') ED.pipetteTargets = selected();
    setTool(b.dataset.tool);
  });
  $('#railImg').onclick = () => pickFiles('image/*,.svg');
  $('#rail3d').onclick = () => window.Studio3D?.open();
}
ED.on('tool', () => {
  $$('#rail [data-tool]').forEach((b) => b.classList.toggle('on', b.dataset.tool === ED.tool));
  renderInspector();
});

// ================= side panels =================
const TABS = [['templates', 'layout', 'Templates'], ['elements', 'shapes', 'Elements'], ['text', 'text', 'Text'], ['brand', 'palette', 'Brand'],
  ['uploads', 'upload', 'Uploads'], ['ai', 'sparkles', 'AI Image'], ['layers', 'layers', 'Layers'], ['3d', 'cube', '3D']];
let curTab = 'templates';
function buildTabs() {
  $('#sideTabs').innerHTML = TABS.map(([k, i, n]) => `<button class="side-tab" data-tab="${k}" title="${n}">${icon(i)}<span>${n}</span></button>`).join('');
  $$('#sideTabs .side-tab').forEach((b) => b.onclick = () => showTab(b.dataset.tab));
}
function showTab(k) {
  curTab = k;
  $$('#sideTabs .side-tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === k));
  $('#sideTitle').textContent = TABS.find((t) => t[0] === k)[2];
  const body = $('#sideBody'); body.classList.toggle('layers-mode', k === 'layers');
  ({ templates: panelTemplates, elements: panelElements, text: panelText, brand: panelBrand, uploads: panelUploads,
    ai: panelAI, layers: panelLayers, '3d': panel3D })[k](body);
}

const tplThumbs = {};
async function templateThumb(t) {
  if (tplThumbs[t.id]) return tplThumbs[t.id];
  const sc = await renderPageCanvas({ version: '5.3.0', objects: t.build(t.w, t.h) }, t.w, t.h);
  return (tplThumbs[t.id] = sc.toDataURL({ format: 'jpeg', quality: 0.85, multiplier: 360 / Math.max(t.w, t.h) }));
}
function panelTemplates(body) {
  body.innerHTML = '<h4>Limelight templates</h4><p class="note">Click to add as a new artboard in this file.</p><div class="grid2" id="tplSide"></div>';
  TEMPLATES.forEach(async (t) => {
    const b = document.createElement('button'); b.className = 'tile img'; b.title = `${t.name} · ${t.w}×${t.h}`;
    $('#tplSide').appendChild(b);
    b.innerHTML = `<img src="${await templateThumb(t)}" style="object-fit:contain">`;
    b.onclick = () => applyTemplate(t);
  });
}
async function applyTemplate(t) {
  // artboards can have different sizes, so a template always lands as a new artboard in this file
  storePage();
  ED.project.pages.splice(ED.pageIndex + 1, 0, { id: uid(), name: t.name, w: t.w, h: t.h, json: { version: '5.3.0', objects: t.build(t.w, t.h).map((o) => ({ ...o, id: o.id || uid() })) } });
  await loadPage(ED.pageIndex + 1); fitView(); markDirty(); toast(`Added “${t.name}” as a new artboard`);
}

// ---- elements ----
const SHAPE_SVGS = {
  rect: ['<rect x="8" y="8" width="84" height="84" fill="#ffc21a"/>', 'Square'],
  rounded: ['<rect x="8" y="8" width="84" height="84" rx="18" fill="#ffc21a"/>', 'Rounded square'],
  circle: ['<circle cx="50" cy="50" r="42" fill="#ffc21a"/>', 'Circle'],
  triangle: ['<path d="M50 8 92 88H8z" fill="#ffc21a"/>', 'Triangle'],
  diamond: ['<path d="M50 6 94 50 50 94 6 50z" fill="#ffc21a"/>', 'Diamond'],
  hexagon: ['<path d="M50 6 88 28v44L50 94 12 72V28z" fill="#ffc21a"/>', 'Hexagon'],
  star: ['<path d="M50 6l12.9 26.2 28.9 4.2-20.9 20.4 4.9 28.8L50 72 24.2 85.6l4.9-28.8L8.2 36.4l28.9-4.2z" fill="#ffc21a"/>', 'Star'],
  heart: ['<path d="M50 88S8 62 8 34a20 20 0 0142-8 20 20 0 0142 8c0 28-42 54-42 54z" fill="#ff3d8b"/>', 'Heart'],
  burst: ['<path d="M50 4l9 14 16-6 1 17 17 3-8 15 11 13-16 6 2 17-17-2-8 15-12-12-14 10-4-17-17-4 9-15-12-12 16-7-3-17 17 1z" fill="#ffc21a"/>', 'Badge burst'],
  bubble: ['<path d="M14 10h72a8 8 0 018 8v46a8 8 0 01-8 8H44L24 90V72H14a8 8 0 01-8-8V18a8 8 0 018-8z" fill="#ffffff"/>', 'Speech bubble'],
  arrowR: ['<path d="M6 38h56V18l32 32-32 32V62H6z" fill="#ffc21a"/>', 'Arrow'],
  blob: ['<path d="M71 13c13 8 23 24 20 40s-15 33-33 36-37-6-46-21S6 31 17 20 58 5 71 13z" fill="#7c4dff"/>', 'Blob'],
  ring: ['<circle cx="50" cy="50" r="38" fill="none" stroke="#ffc21a" stroke-width="12"/>', 'Ring'],
  pill: ['<rect x="4" y="30" width="92" height="40" rx="20" fill="#ffc21a"/>', 'Pill / button'],
  line: ['<path d="M6 50h88" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/>', 'Line'],
  dashed: ['<path d="M6 50h88" stroke="#ffffff" stroke-width="8" stroke-dasharray="14 10" stroke-linecap="round"/>', 'Dashed line'],
  llTri: [`<path d="${LL.tri}" fill="#ffc21a"/>`, 'Limelight triangle'],
};
const FRAMES = [['rect', 'Photo frame'], ['rounded', 'Rounded frame'], ['circle', 'Circle frame'], ['arch', 'Arch frame']];
const GRADS = [['#ffc21a', '#ff6a00'], ['#0b0c0f', '#2b2200'], ['#ff8a00', '#c2185b'], ['#5b8cff', '#7c4dff'], ['#00bfa5', '#1e88e5'], ['#141e30', '#243b55'], ['#f6f1e6', '#ffd75c'], ['#ff3d8b', '#ffc21a'], ['#0f2027', '#2c5364']];
const ICON_LIST = ['star', 'sparkles', 'light', 'home', 'image', 'upload', 'download', 'eye', 'lock', 'palette', 'scissors', 'rotate', 'cube', 'gem', 'layers', 'grid', 'file', 'arrow', 'pen', 'brush', 'text'];

function panelElements(body) {
  const tile = (k, [svg, n]) => `<button class="tile" data-shape="${k}" title="${n}" draggable="true"><svg viewBox="0 0 100 100">${svg}</svg></button>`;
  body.innerHTML = `<h4>Shapes</h4><div class="grid3">${Object.entries(SHAPE_SVGS).map(([k, v]) => tile(k, v)).join('')}</div>
    <h4>Photo frames <span class="muted small" style="text-transform:none;letter-spacing:0">— drop a photo on them</span></h4>
    <div class="grid3">${FRAMES.map(([k, n]) => `<button class="tile" data-frame="${k}" title="${n}"><svg viewBox="0 0 100 100">${k === 'circle' ? '<circle cx="50" cy="50" r="40"' : k === 'arch' ? '<path d="M14 92V46a36 36 0 0172 0v46z"' : `<rect x="12" y="16" width="76" height="68" rx="${k === 'rounded' ? 14 : 0}"`} fill="#2a2f3a" stroke="#ffc21a" stroke-width="3" stroke-dasharray="6 5"/></svg></button>`).join('')}</div>
    <h4>Background gradients</h4><div class="grid3">${GRADS.map(([a, b], i) => `<button class="tile" data-grad="${i}" style="background:linear-gradient(160deg,${a},${b})"></button>`).join('')}</div>
    <h4>Icons</h4><div class="grid3" style="grid-template-columns:repeat(5,1fr)">${ICON_LIST.map((n) => `<button class="tile" data-icon="${n}" style="padding:9px;color:#e6e8ed">${icon(n)}</button>`).join('')}</div>`;
  $$('[data-shape]', body).forEach((b) => b.onclick = () => addShapeSVG(b.dataset.shape));
  $$('[data-frame]', body).forEach((b) => b.onclick = () => addFrame(b.dataset.frame));
  $$('[data-grad]', body).forEach((b) => b.onclick = () => { const [a, c] = GRADS[b.dataset.grad]; pageRect().set('fill', makeGradient('linear', a, c, 160)); ED.canvas.requestRenderAll(); scheduleHistory(); renderInspector(); });
  $$('[data-icon]', body).forEach((b) => b.onclick = () => addSVG(icon(b.dataset.icon).replace('currentColor', isDarkPage() ? '#ffffff' : '#111111').replace('stroke-width="1.8"', 'stroke-width="1.8" width="24" height="24"'), b.dataset.icon + ' icon'));
}
async function addShapeSVG(k) {
  const [svg, n] = SHAPE_SVGS[k];
  const g = await addSVG(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">${svg}</svg>`, n);
  const s = Math.min(ED.project.width, ED.project.height) * 0.3 / Math.max(g.width, g.height);
  g.set({ scaleX: s, scaleY: s, left: (ED.project.width - g.width * s) / 2, top: (ED.project.height - g.height * s) / 2 }); g.setCoords(); ED.canvas.requestRenderAll();
}
function addFrame(k) {
  const p = ED.project, s = Math.min(p.width, p.height) * 0.5;
  const base = { left: (p.width - s) / 2, top: (p.height - s) / 2, fill: '#2a2f3a', stroke: '#ffc21a', strokeWidth: 3, strokeDashArray: [14, 10], placeholder: true, name: 'Photo frame (drop image)', id: uid() };
  let o;
  if (k === 'circle') o = new fabric.Ellipse({ ...base, rx: s / 2, ry: s / 2 });
  else if (k === 'arch') o = new fabric.Rect({ ...base, width: s * 0.8, height: s, rx: s * 0.4, ry: s * 0.4 });
  else o = new fabric.Rect({ ...base, width: s, height: s * 0.8, rx: k === 'rounded' ? s * 0.08 : 0, ry: k === 'rounded' ? s * 0.08 : 0 });
  ED.canvas.add(o); ED.canvas.setActiveObject(o); ED.canvas.requestRenderAll();
}

// ---- text ----
function panelText(body) {
  const P = ED.project || { width: 1080 }, u = P.width / 1080;
  const presets = [
    ['Add a heading', { fontSize: 96 * u, fontWeight: 900 }, 'font-size:24px;font-weight:900'],
    ['Add a subheading', { fontSize: 56 * u, fontWeight: 700 }, 'font-size:18px;font-weight:700'],
    ['Add body text', { fontSize: 34 * u, fontWeight: 400, lineHeight: 1.4 }, 'font-size:13px'],
    ['हिंदी शीर्षक जोड़ें', { fontSize: 96 * u, fontFamily: 'Rozha One', fontWeight: 400 }, "font-family:'Rozha One';font-size:22px"],
    ['हिंदी उप-शीर्षक', { fontSize: 56 * u, fontFamily: 'Mukta', fontWeight: 800 }, 'font-family:Mukta;font-weight:800;font-size:18px'],
    ['उत्सव शैली', { fontSize: 80 * u, fontFamily: 'Yatra One', fontWeight: 400 }, "font-family:'Yatra One';font-size:20px"],
  ];
  body.innerHTML = '<h4>Click to add</h4>' + presets.map(([t, , css], i) => `<button class="text-preset" data-tp="${i}" style="${css}">${t}</button>`).join('')
    + `<h4>Combos</h4>
    <button class="text-preset" data-combo="sale"><b style="font-size:20px;font-weight:900">SALE</b> <span style="color:var(--acc);font-weight:800">50% OFF</span></button>
    <button class="text-preset" data-combo="date"><span style="color:var(--acc);font-weight:800;letter-spacing:.1em">20 NOV · 10 AM</span><br><span class="muted">Venue line</span></button>
    <button class="text-preset" data-combo="cta"><span style="background:var(--acc);color:#1a1300;padding:4px 12px;border-radius:20px;font-weight:800">Register now →</span></button>
    <h4>Fonts on this PC</h4><p class="note">Hindi: Mukta, Rozha One, Yatra One, Nirmala UI, Mangal. Select text and change font on the right.</p>`;
  $$('[data-tp]', body).forEach((b) => b.onclick = () => { const [t, o] = presets[b.dataset.tp]; const x = addText({ text: t.replace('Add a ', '').replace('Add ', ''), ...o, left: P.width * 0.1, top: P.height * 0.42 }); ED.canvas.setActiveObject(x); });
  $$('[data-combo]', body).forEach((b) => b.onclick = () => addCombo(b.dataset.combo));
}
function addCombo(k) {
  const p = ED.project, u = p.width / 1080, cx = p.width * 0.1, cy = p.height * 0.4, dark = isDarkPage();
  const fg = dark ? '#ffffff' : '#111111', objs = [];
  if (k === 'sale') {
    objs.push(new fabric.Textbox('SALE', { left: cx, top: cy, width: 600 * u, fontSize: 180 * u, fontWeight: 900, fontFamily: 'Inter', fill: fg }));
    objs.push(new fabric.Rect({ left: cx, top: cy + 200 * u, width: 420 * u, height: 100 * u, fill: '#ffc21a', rx: 12 * u, ry: 12 * u }));
    objs.push(new fabric.Textbox('50% OFF', { left: cx, top: cy + 212 * u, width: 420 * u, fontSize: 70 * u, fontWeight: 900, fontFamily: 'Inter', fill: '#111111', textAlign: 'center' }));
  } else if (k === 'date') {
    objs.push(new fabric.Textbox('20 NOV · 10:00 AM', { left: cx, top: cy, width: 800 * u, fontSize: 56 * u, fontWeight: 800, fontFamily: 'Inter', fill: '#ffc21a', charSpacing: 60 }));
    objs.push(new fabric.Textbox('Venue name, City', { left: cx, top: cy + 75 * u, width: 800 * u, fontSize: 40 * u, fontWeight: 500, fontFamily: 'Inter', fill: fg }));
  } else {
    objs.push(new fabric.Rect({ left: cx, top: cy, width: 440 * u, height: 100 * u, rx: 50 * u, ry: 50 * u, fill: '#ffc21a' }));
    objs.push(new fabric.Textbox('Register now →', { left: cx, top: cy + 26 * u, width: 440 * u, fontSize: 42 * u, fontWeight: 800, fontFamily: 'Inter', fill: '#111111', textAlign: 'center' }));
  }
  const g = new fabric.Group(objs, { name: 'Text combo', id: uid() });
  ED.canvas.add(g); ED.canvas.setActiveObject(g); ED.canvas.requestRenderAll();
}

// ---- brand ----
function panelBrand(body) {
  body.innerHTML = `<h4>Limelight logo</h4>
    <div class="grid2">
      <button class="tile" data-logo="white" style="background:#0b0c0f"><img src="img/limelight-logo-white.png"></button>
      <button class="tile" data-logo="black" style="background:#fff"><img src="img/limelight-logo-black.png"></button>
      <button class="tile" data-logo="mark" style="background:#0b0c0f"><img src="img/limelight-mark.svg"></button>
      <button class="tile" data-shape2="llTri" style="background:#0b0c0f"><img src="img/limelight-triangle.svg"></button>
    </div>
    <p class="note">The triangle is a vector — recolour it from the right panel.</p>
    <h4>Brand colours <span class="muted small" style="text-transform:none;letter-spacing:0">— click to apply</span></h4>
    <div class="swatches">${BRAND.map((c) => `<button class="sw" data-col="${c}" style="background:${c}" title="${c}"></button>`).join('')}</div>
    ${(ED.recentColors || []).length ? `<h4>Picked colours</h4><div class="swatches">${ED.recentColors.map((c) => `<button class="sw" data-col="${c}" style="background:${c}" title="${c}"></button>`).join('')}</div>` : ''}
    <h4>Brand fonts</h4>
    <button class="text-preset" style="font-weight:900;font-size:18px" data-bf="Inter">Inter Black — headlines</button>
    <button class="text-preset" style="font-family:Mukta;font-weight:800;font-size:18px" data-bf="Mukta">Mukta — हिंदी</button>
    <button class="text-preset" style="font-family:'Rozha One';font-size:18px" data-bf="Rozha One">Rozha One — शीर्षक</button>`;
  $$('[data-logo]', body).forEach((b) => b.onclick = () => {
    const k = b.dataset.logo, url = k === 'mark' ? 'img/limelight-mark.svg' : `img/limelight-logo-${k}.png`;
    addImage(url, { fit: k === 'mark' ? 0.25 : 0.45, name: k === 'mark' ? 'Limelight mark' : 'Limelight logo' });
  });
  $('[data-shape2]', body).onclick = () => addShapeSVG('llTri');
  $$('[data-col]', body).forEach((b) => b.onclick = () => applyColor(b.dataset.col));
  $$('[data-bf]', body).forEach((b) => b.onclick = () => { const objs = selected().filter((o) => o.type?.includes('text')); if (!objs.length) return toast('Select a text first'); objs.forEach((o) => o.set('fontFamily', b.dataset.bf)); ensureFonts().then(() => { objs.forEach((o) => o.initDimensions()); ED.canvas.requestRenderAll(); }); scheduleHistory(); });
}
function applyColor(c) {
  const objs = selected();
  if (!objs.length) { pageRect().set('fill', c); }
  objs.forEach(function paint(o) {
    if (o.type === 'group') return o.getObjects().forEach((x) => paint(x));
    if (o.type === 'line' || (o.type === 'path' && !o.fill)) o.set('stroke', c); else if (o.type !== 'image') o.set('fill', c);
  });
  ED.canvas.requestRenderAll(); scheduleHistory(); renderInspector();
}

// ---- uploads ----
function panelUploads(body) {
  body.innerHTML = `<div class="drop" id="upDrop">Drop photos, SVG, PSD here<br><span class="small">or</span><br><button class="btn primary" id="upBtn" style="margin-top:8px">Upload files</button></div>
    <h4>Library</h4><div class="grid2" id="libGrid"><p class="note">Loading…</p></div>`;
  $('#upBtn').onclick = () => pickFiles('image/*,.svg,.psd');
  const d = $('#upDrop');
  d.ondragover = (e) => { e.preventDefault(); d.classList.add('over'); };
  d.ondragleave = () => d.classList.remove('over');
  d.ondrop = (e) => { e.preventDefault(); d.classList.remove('over'); handleFiles([...e.dataTransfer.files]); };
  refreshLibrary();
}
async function refreshLibrary() {
  const g = $('#libGrid'); if (!g) return;
  const list = await fetch('/api/library').then((r) => r.json()).catch(() => []);
  g.innerHTML = list.length ? list.map((f) => `<button class="tile img" data-url="${esc(f.url)}" title="${esc(f.name)}" draggable="true"><img loading="lazy" src="${esc(f.url)}"></button>`).join('') : '<p class="note">No uploads yet.</p>';
  $$('[data-url]', g).forEach((b) => {
    b.onclick = () => addImage(b.dataset.url, { name: b.title });
    b.ondragstart = (e) => e.dataTransfer.setData('text/x-ll-url', b.dataset.url);
  });
}

// ---- AI ----
function panelAI(body) {
  body.innerHTML = `<h4>Generate an image</h4>
    <textarea id="aiPrompt" rows="4" style="width:100%" placeholder="e.g. golden diya on dark background, cinematic light, bokeh"></textarea>
    <div class="pair" style="margin-top:8px">
      <select id="aiShape"><option value="page">Page shape</option><option value="1:1">Square</option><option value="4:5">Portrait</option><option value="16:9">Landscape</option><option value="9:16">Story</option></select>
      <select id="aiPreset"><option value="fast">Fast</option><option value="quality">High quality</option></select>
    </div>
    <button class="btn primary full" id="aiGo">${icon('sparkles', 'width="16" height="16"')}Generate</button>
    <p class="note" id="aiMsg">Runs on your Limelight AI server (NAYA B). Nothing goes to the cloud.</p>
    <div class="ai-out" id="aiOut"></div>`;
  fetch('/api/ai/status').then((r) => r.json()).then((s) => {
    $('#aiMsg').textContent = s.ok ? (s.images?.available === false ? `AI server online, but images are off: ${s.images.reason}` : `AI server online · ${s.url}`) : `AI server ${s.url}: ${s.error || 'not reachable'}. Set it in Home → AI settings.`;
  }).catch(() => 0);
  $('#aiGo').onclick = async () => {
    const prompt = $('#aiPrompt').value.trim(); if (!prompt) return;
    const shape = $('#aiShape').value, P = ED.project;
    let r = shape === 'page' ? P.width / P.height : ({ '1:1': 1, '4:5': 0.8, '16:9': 16 / 9, '9:16': 9 / 16 })[shape];
    const base = 1024, width = Math.round((r >= 1 ? base : base * r) / 64) * 64, height = Math.round((r >= 1 ? base / r : base) / 64) * 64;
    $('#aiGo').disabled = true; $('#aiMsg').textContent = 'Generating… (first run loads the model, can take a minute)';
    try {
      const res = await fetch('/api/ai/image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, preset: $('#aiPreset').value, width, height, count: 2 }) });
      const out = await res.json(); if (!res.ok || out.error) throw new Error(out.error || `HTTP ${res.status}`);
      $('#aiOut').insertAdjacentHTML('afterbegin', out.map((f) => `<button class="tile img" data-url="${esc(f.url)}"><img src="${esc(f.url)}"></button>`).join(''));
      $$('#aiOut [data-url]').forEach((b) => b.onclick = () => addImage(b.dataset.url, { name: 'AI image', point: undefined }));
      $('#aiMsg').textContent = 'Done — click an image to add it. Saved in Library too.';
    } catch (e) { $('#aiMsg').textContent = 'Failed: ' + e.message; }
    $('#aiGo').disabled = false;
  };
}

// ---- 3D tab ----
function panel3D(body) {
  body.innerHTML = `<h4>3D Studio</h4><p class="note">Make 3D objects like in Blender — materials, lights, shadows — then place them in your design as a sharp image. Double-click a 3D image later to edit it again.</p>
    <button class="btn primary full" id="o3d">${icon('cube', 'width="16" height="16"')}Open 3D Studio</button>
    <h4>Quick start</h4>
    <div class="grid2">${[['mark', 'Gold Limelight mark'], ['chrome', 'Chrome shapes'], ['podium', 'Product podium'], ['neon', 'Neon torus']].map(([k, n]) => `<button class="text-preset" data-p3="${k}">${n}</button>`).join('')}</div>`;
  $('#o3d').onclick = () => window.Studio3D?.open();
  $$('[data-p3]', body).forEach((b) => b.onclick = () => window.Studio3D?.open(window.Studio3D.preset(b.dataset.p3)));
}


// ================= inspector =================
const sec = (title, inner, extra = '') => `<div class="sec"><h5>${title}<span class="grow"></span>${extra}</h5>${inner}</div>`;
const fld = (label, inner) => `<div class="f"><label>${label}</label>${inner}</div>`;
const rng = (k, min, max, step, v, unit = '') => `<input type="range" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${v}"><span class="val" data-v="${k}">${Math.round(v * 100) / 100}${unit}</span>`;
const col = (k, v) => `<input type="color" data-k="${k}" value="${toHex(v)}">`;

function renderInspector() {
  const el = $('#inspector'); if (!ED.canvas) return;
  const objs = selected(), o = objs[0];
  if (ED.tool === 'brush') return renderBrushInsp(el);
  if (!o) return renderPageInsp(el);
  const multi = objs.length > 1;
  let h = '';
  if (o.locked && !multi) {
    el.innerHTML = sec('Locked', `<p class="muted small">This layer is locked.</p><button class="btn full" data-act="unlock">${icon('unlock', 'width="16" height="16"')}Unlock</button>`);
    return bindInsp(el);
  }
  // transform
  const tl = topLeft(multi ? ED.canvas.getActiveObject() : o);
  const W = (multi ? ED.canvas.getActiveObject() : o).getScaledWidth(), H = (multi ? ED.canvas.getActiveObject() : o).getScaledHeight();
  h += sec(multi ? `${objs.length} selected` : esc(o.name || o.type), `
    <div class="pair"><div class="num"><b>X</b><input type="number" data-t="x" value="${Math.round(tl.x)}"></div><div class="num"><b>Y</b><input type="number" data-t="y" value="${Math.round(tl.y)}"></div></div>
    <div class="pair"><div class="num"><b>W</b><input type="number" data-t="w" value="${Math.round(W)}"></div><div class="num"><b>H</b><input type="number" data-t="h" value="${Math.round(H)}"></div></div>
    <div class="pair"><div class="num"><b>∠</b><input type="number" data-t="angle" value="${Math.round(multi ? 0 : o.angle || 0)}"></div>
      <div class="btn-row"><button class="icon-btn" data-act="flipH" title="Flip horizontal">${icon('flipH')}</button><button class="icon-btn" data-act="flipV" title="Flip vertical">${icon('flipV')}</button></div></div>`);
  h += sec(multi ? 'Align selection' : 'Align to page', `<div class="btn-row">
    ${[['left', 'alignL'], ['centerH', 'alignCH'], ['right', 'alignR'], ['top', 'alignT'], ['centerV', 'alignCV'], ['bottom', 'alignB']].map(([a, i]) => `<button class="icon-btn" data-align="${a}" title="Align ${a}">${icon(i)}</button>`).join('')}
    ${multi ? `<button class="icon-btn" data-act="distH" title="Distribute horizontally">${icon('distH')}</button><button class="icon-btn" data-act="distV" title="Distribute vertically">${icon('distV')}</button>` : ''}</div>
    <div class="btn-row" style="margin-top:6px">
    <button class="icon-btn" data-act="front" title="Bring to front">${icon('toFront')}</button><button class="icon-btn" data-act="forward" title="Forward">${icon('up')}</button>
    <button class="icon-btn" data-act="backward" title="Backward">${icon('down')}</button><button class="icon-btn" data-act="back" title="Send to back">${icon('toBack')}</button>
    ${multi ? `<button class="icon-btn" data-act="group" title="Group (Ctrl+G)">${icon('group')}</button>` : o.type === 'group' ? `<button class="icon-btn" data-act="ungroup" title="Ungroup (Ctrl+Shift+G)">${icon('group')}</button>` : ''}
    <button class="icon-btn" data-act="lock" title="Lock">${icon('lock')}</button><button class="icon-btn" data-act="dup" title="Duplicate (Ctrl+D)">${icon('copy')}</button><button class="icon-btn" data-act="del" title="Delete">${icon('trash')}</button></div>`);
  if (!multi && o.type?.includes('text')) h += textSection(o);
  if (!multi && o.type === 'image') h += imageSection(o);
  if (multi || (o.type !== 'image' && o.type !== 'group')) h += fillSection(o, multi);
  if (!multi && o.type === 'group') h += sec('Group', `<p class="muted small">Colour applies to every part.</p>${fld('Colour', col('groupFill', firstFill(o)))}<button class="btn full" data-act="ungroup">Ungroup</button>`);
  if (!multi && o.type !== 'image') h += strokeSection(o);
  h += sec('Layer', `${fld('Opacity', rng('opacity', 0, 1, 0.01, o.opacity ?? 1))}
    ${fld('Blend', `<select data-k="globalCompositeOperation">${BLENDS.map((b) => `<option ${o.globalCompositeOperation === b ? 'selected' : ''} value="${b}">${b === 'source-over' ? 'Normal' : b}</option>`).join('')}</select>`)}`);
  const sh = o.shadow || {};
  h += sec('Shadow', `${fld('On', `<input type="checkbox" data-sh="on" ${o.shadow ? 'checked' : ''}>`)}
    ${o.shadow ? `${fld('Colour', col('shColor', sh.color || '#000'))}${fld('Blur', rng('shBlur', 0, 120, 1, sh.blur || 0))}${fld('X', rng('shX', -100, 100, 1, sh.offsetX || 0))}${fld('Y', rng('shY', -100, 100, 1, sh.offsetY || 0))}` : ''}`);
  el.innerHTML = h; bindInsp(el);
}
function firstFill(g) { const x = g.getObjects().find((y) => typeof y.fill === 'string' && y.fill) || {}; return x.fill || '#ffc21a'; }
function topLeft(o) { return o.translateToOriginPoint(o.getCenterPoint(), 'left', 'top'); }

function fillSection(o, multi) {
  const f = o.fill, isG = f && typeof f === 'object' && f.colorStops;
  const type = isG ? f.type : 'solid';
  const stops = isG ? f.colorStops : [{ color: f || '#ffc21a' }, { color: '#ff6a00' }];
  return sec('Fill', `<div class="seg full small" style="margin-bottom:9px">${['solid', 'linear', 'radial'].map((t) => `<button data-fillt="${t}" class="${type === t ? 'on' : ''}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div>
    ${type === 'solid' ? fld('Colour', `${col('fill', f || '#ffc21a')}<input data-k="fillHex" value="${f ? toHex(f) : 'none'}">`)
      : fld('From', col('g1', stops[0].color)) + fld('To', col('g2', stops[stops.length - 1].color)) + (type === 'linear' ? fld('Angle', rng('gAngle', 0, 360, 1, o.gAngle ?? 90, '°')) : '')}
    ${!multi && o.type === 'rect' ? fld('Corners', rng('rx', 0, Math.round(Math.min(o.width, o.height) / 2), 1, o.rx || 0)) : ''}
    <div class="swatches" style="margin-top:8px">${BRAND.slice(0, 8).map((c) => `<button class="sw" data-col="${c}" style="background:${c}"></button>`).join('')}</div>`);
}
function strokeSection(o) {
  const dash = (o.strokeDashArray || []).length ? 'dash' : 'solid';
  return sec('Stroke', `${fld('Colour', col('stroke', o.stroke || '#000'))}${fld('Width', rng('strokeWidth', 0, 60, 1, o.strokeWidth || 0))}
    ${fld('Style', `<select data-k="dash"><option value="solid" ${dash === 'solid' ? 'selected' : ''}>Solid</option><option value="dash" ${dash === 'dash' ? 'selected' : ''}>Dashed</option><option value="dot">Dotted</option></select>`)}`);
}
function textSection(o) {
  const wv = o.fontWeight === 'bold' ? 700 : +o.fontWeight || 400;
  return sec('Text', `
    ${fld('Font', `<select data-k="fontFamily">${FONTS.map((f) => `<option style="font-family:'${f}'" ${o.fontFamily === f ? 'selected' : ''}>${f}</option>`).join('')}</select>`)}
    <div class="pair"><div class="num"><b>Aa</b><input type="number" data-k="fontSize" value="${Math.round(o.fontSize * (o.scaleY || 1))}"></div>
      <select data-k="fontWeight">${[300, 400, 500, 600, 700, 800, 900].map((w) => `<option value="${w}" ${wv === w ? 'selected' : ''}>${({ 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extra bold', 900: 'Black' })[w]}</option>`).join('')}</select></div>
    ${fld('Colour', `${col('fill', typeof o.fill === 'string' ? o.fill : '#fff')}<input data-k="fillHex" value="${typeof o.fill === 'string' ? toHex(o.fill) : ''}">`)}
    <div class="btn-row" style="margin-bottom:8px">
      <button class="icon-btn ${wv >= 700 ? 'on' : ''}" data-act="bold">${icon('bold')}</button><button class="icon-btn ${o.fontStyle === 'italic' ? 'on' : ''}" data-act="italic">${icon('italic')}</button>
      <button class="icon-btn ${o.underline ? 'on' : ''}" data-act="underline">${icon('underline')}</button><button class="icon-btn ${o.textCase === 'upper' ? 'on' : ''}" data-act="caps" title="UPPERCASE">${icon('caps')}</button>
      ${['left', 'center', 'right', 'justify'].map((a, i) => `<button class="icon-btn ${o.textAlign === a ? 'on' : ''}" data-talign="${a}">${icon(['tAlignL', 'tAlignC', 'tAlignR', 'tAlignJ'][i])}</button>`).join('')}</div>
    ${fld('Line height', rng('lineHeight', 0.6, 3, 0.01, o.lineHeight || 1.16))}
    ${fld('Spacing', rng('charSpacing', -200, 1000, 5, o.charSpacing || 0))}
    ${fld('Outline', `${col('stroke', o.stroke || '#000')}${rng('strokeWidthT', 0, 20, 0.5, o.stroke ? o.strokeWidth : 0)}`)}
    ${fld('Highlight', `<input type="checkbox" data-hl ${o.textBackgroundColor ? 'checked' : ''}>${o.textBackgroundColor ? col('textBackgroundColor', o.textBackgroundColor) : ''}`)}`);
}
function imageSection(o) {
  const f = (t) => getFilter(o, t);
  const v = (t) => { const x = f(t); return x ? x[FILTERS[t].key] : FILTERS[t].def; };
  const toggles = ['Grayscale', 'Sepia', 'Invert', 'Vintage', 'Kodachrome', 'Technicolor', 'Polaroid', 'Brownie'];
  const rc = f('RemoveColor'), cp = o.cropPct || { l: 0, t: 0, r: 0, b: 0 };
  return (o.scene3d ? sec('3D object', `<button class="btn primary full" data-act="edit3d">${icon('cube', 'width="16" height="16"')}Edit in 3D Studio</button>`) : '')
    + sec('Adjust', Object.entries({ Brightness: 'Brightness', Contrast: 'Contrast', Saturation: 'Saturation', Vibrance: 'Vibrance', HueRotation: 'Hue', Blur: 'Blur', Noise: 'Grain', Pixelate: 'Pixelate' })
      .map(([t, n]) => fld(n, rng('flt:' + t, FILTERS[t].min, FILTERS[t].max, t === 'Noise' ? 5 : t === 'Pixelate' ? 1 : 0.01, v(t)))).join('')
      + '<button class="btn ghost full small" data-act="resetFilters">Reset adjustments</button>', '')
    + sec('Filters', toggles.map((t) => `<button class="chip ${f(t) ? 'on' : ''}" data-tog="${t}">${t}</button>`).join(''))
    + sec('Cut-out', `${fld('Remove colour', `<input type="checkbox" data-rc ${rc ? 'checked' : ''}>${rc ? col('rcColor', rc.color) : ''}`)}
      ${rc ? fld('Tolerance', rng('rcDist', 0, 1, 0.01, rc.distance)) : '<p class="note">Removes a plain background (white wall, green screen). Pick its colour after turning on.</p>'}`)
    + sec('Crop', ['l', 't', 'r', 'b'].map((k) => fld({ l: 'Left', t: 'Top', r: 'Right', b: 'Bottom' }[k], rng('crop:' + k, 0, 0.45, 0.005, cp[k]))).join(''))
    + sec('Mask shape', `<div class="btn-row">${Object.keys(MASKS).map((m) => `<button class="chip ${(o.maskShape || 'none') === m ? 'on' : ''}" data-mask="${m}">${m}</button>`).join('')}</div>`)
    + sec('Image', `<button class="btn full" data-act="replace">${icon('replace', 'width="16" height="16"')}Replace image</button>
      <button class="btn ghost full" style="margin-top:6px" data-act="asBg">Set as page background</button>`);
}
function renderPageInsp(el) {
  const p = ED.project; if (!p) return;
  const f = pageRect()?.fill, isG = f && typeof f === 'object';
  el.innerHTML = sec('Artboard', `
    ${fld('Name', `<input data-page="name" value="${esc(p.pages[ED.pageIndex].name)}">`)}
    <div class="pair"><div class="num"><b>W</b><input type="number" data-psize="w" value="${p.width}"></div><div class="num"><b>H</b><input type="number" data-psize="h" value="${p.height}"></div></div>
    <select data-presize style="width:100%"><option value="">Resize to preset…</option>${SIZES.map((s, i) => `<option value="${i}">${s.name} · ${s.w}×${s.h}</option>`).join('')}</select>`)
    + sec('Background', `<div class="seg full small" style="margin-bottom:9px">${['solid', 'linear', 'radial'].map((t) => `<button data-bgt="${t}" class="${(isG ? f.type : 'solid') === t ? 'on' : ''}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div>
      ${isG ? fld('From', col('bg1', f.colorStops[0].color)) + fld('To', col('bg2', f.colorStops[f.colorStops.length - 1].color)) : fld('Colour', col('bg', f || '#fff'))}
      <div class="swatches">${BRAND.map((c) => `<button class="sw" data-bgc="${c}" style="background:${c}"></button>`).join('')}</div>`)
    + sec('Canvas', `${fld('Clip to page', `<input type="checkbox" data-view="clip" ${ED.clip ? 'checked' : ''}>`)}${fld('Smart guides', `<input type="checkbox" data-view="snap" ${ED.snap ? 'checked' : ''}>`)}`)
    + `<div class="insp-empty">Select something to edit it.<br><br><b>Tips</b><br><span class="small">Drop photos on frames · Ctrl+wheel zoom · Space+drag pan · Alt while moving = no snap</span></div>`;
  const pr = pageRect();
  $$('[data-psize]', el).forEach((i) => i.onchange = () => resizeProject(+$('[data-psize=w]', el).value || p.width, +$('[data-psize=h]', el).value || p.height));
  $('[data-presize]', el).onchange = (e) => { const s = SIZES[e.target.value]; if (s) resizeProject(s.w, s.h); };
  $('[data-page=name]', el).onchange = (e) => { p.pages[ED.pageIndex].name = e.target.value; ED.emit('pages'); markDirty(); ED.canvas.requestRenderAll(); };
  const setBg = (v) => { pr.set('fill', v); ED.canvas.requestRenderAll(); scheduleHistory(); };
  $$('[data-bgt]', el).forEach((b) => b.onclick = () => { const c1 = isG ? f.colorStops[0].color : f || '#ffffff'; setBg(b.dataset.bgt === 'solid' ? toHex(c1) : makeGradient(b.dataset.bgt, c1, '#ffc21a', 160)); renderInspector(); });
  $$('[data-bgc]', el).forEach((b) => b.onclick = () => { setBg(b.dataset.bgc); renderInspector(); });
  $('[data-k=bg]', el)?.addEventListener('input', (e) => setBg(e.target.value));
  ['bg1', 'bg2'].forEach((k) => $(`[data-k=${k}]`, el)?.addEventListener('input', () => setBg(makeGradient(f.type, $('[data-k=bg1]', el).value, $('[data-k=bg2]', el).value, 160))));
  $$('[data-view]', el).forEach((i) => i.onchange = () => { ED[i.dataset.view] = i.checked; updateClip(); });
}
function renderBrushInsp(el) {
  const b = ED.brush;
  el.innerHTML = sec('Brush', `<div class="seg full small" style="margin-bottom:10px">${['pencil', 'marker', 'spray', 'circle'].map((t) => `<button data-bt="${t}" class="${b.type === t ? 'on' : ''}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div>
    ${fld('Colour', col('bColor', b.color))}${fld('Size', rng('bWidth', 1, 200, 1, b.width))}${fld('Opacity', rng('bOpacity', 0.05, 1, 0.01, b.opacity))}${fld('Glow', rng('bShadow', 0, 60, 1, b.shadow))}
    <div class="swatches" style="margin-top:8px">${BRAND.map((c) => `<button class="sw" data-bc="${c}" style="background:${c}"></button>`).join('')}</div>
    <p class="note">Each stroke becomes its own layer. Press V to stop painting.</p>`);
  $$('[data-bt]', el).forEach((x) => x.onclick = () => { b.type = x.dataset.bt; applyBrush(); renderInspector(); });
  $$('[data-bc]', el).forEach((x) => x.onclick = () => { b.color = x.dataset.bc; applyBrush(); renderInspector(); });
  const map = { bColor: 'color', bWidth: 'width', bOpacity: 'opacity', bShadow: 'shadow' };
  $$('[data-k]', el).forEach((i) => i.oninput = () => { b[map[i.dataset.k]] = i.type === 'color' ? i.value : +i.value; const v = $(`[data-v="${i.dataset.k}"]`, el); if (v) v.textContent = i.value; applyBrush(); });
}

function bindInsp(el) {
  const c = ED.canvas, objs = selected(), o = objs[0], a = c.getActiveObject();
  const done = () => { c.requestRenderAll(); scheduleHistory(); };
  const each = (fn) => { objs.forEach(fn); done(); };
  // transform
  $$('[data-t]', el).forEach((i) => i.onchange = () => {
    const v = +i.value, t = i.dataset.t, tgt = a;
    if (t === 'x' || t === 'y') { const tl = topLeft(tgt); tgt.setPositionByOrigin(new fabric.Point(t === 'x' ? v : tl.x, t === 'y' ? v : tl.y), 'left', 'top'); }
    if (t === 'w') { if (tgt.type === 'textbox') tgt.set('width', v / tgt.scaleX); else tgt.set('scaleX', v / tgt.width); }
    if (t === 'h') { if (tgt.type !== 'textbox') tgt.set('scaleY', v / tgt.height); }
    if (t === 'angle') tgt.rotate(v);
    tgt.setCoords(); done();
  });
  $$('[data-align]', el).forEach((b) => b.onclick = () => align(b.dataset.align));
  // generic props
  $$('[data-k]', el).forEach((i) => {
    const k = i.dataset.k;
    const handler = () => {
      const val = i.type === 'range' || i.type === 'number' ? +i.value : i.value;
      const out = $(`[data-v="${k}"]`, el); if (out) out.textContent = Math.round(val * 100) / 100 + (k === 'gAngle' ? '°' : '');
      if (k.startsWith('flt:')) { const t = k.slice(4), d = FILTERS[t]; setFilter(o, t, val === d.def ? null : { [d.key]: val }); return; }
      if (k.startsWith('crop:')) { const cp = { ...(o.cropPct || { l: 0, t: 0, r: 0, b: 0 }) }; cp[k.slice(5)] = val; setCrop(o, cp); return; }
      switch (k) {
        case 'fill': objs.forEach((x) => x.set('fill', val)); { const hx = $('[data-k=fillHex]', el); if (hx) hx.value = val; } break;
        case 'fillHex': if (/^#?[0-9a-f]{3,8}$/i.test(val)) objs.forEach((x) => x.set('fill', val.startsWith('#') ? val : '#' + val)); break;
        case 'g1': case 'g2': case 'gAngle': objs.forEach((x) => { x.gAngle = +($('[data-k=gAngle]', el)?.value ?? 90); x.set('fill', makeGradient(x.fill?.type || 'linear', $('[data-k=g1]', el).value, $('[data-k=g2]', el).value, x.gAngle)); }); break;
        case 'rx': o.set({ rx: val, ry: val }); break;
        case 'dash': objs.forEach((x) => x.set('strokeDashArray', val === 'dash' ? [x.strokeWidth * 3 || 12, x.strokeWidth * 2 || 8] : val === 'dot' ? [0.1, (x.strokeWidth || 4) * 2] : null)); objs.forEach((x) => val === 'dot' && x.set('strokeLineCap', 'round')); break;
        case 'stroke': objs.forEach((x) => { x.set('stroke', val); if (x.type?.includes('text') && !x.strokeWidth) x.set('strokeWidth', 2); }); break;
        case 'strokeWidthT': o.set({ strokeWidth: val, stroke: val ? (o.stroke || '#000000') : null, paintFirst: 'stroke' }); break;
        case 'fontSize': o.set({ fontSize: val / (o.scaleY || 1) }); break;
        case 'fontFamily': objs.forEach((x) => x.set('fontFamily', val)); document.fonts.load(`700 40px "${val}"`).then(() => { objs.forEach((x) => x.initDimensions?.()); c.requestRenderAll(); }); break;
        case 'fontWeight': objs.forEach((x) => x.set('fontWeight', +val)); document.fonts.load(`${val} 40px "${o.fontFamily}"`).then(() => { o.initDimensions(); c.requestRenderAll(); }); break;
        case 'groupFill': o.getObjects().forEach((x) => { if (x.fill && typeof x.fill === 'string') x.set('fill', val); else if (x.stroke) x.set('stroke', val); }); o.dirty = true; break;
        case 'shColor': case 'shBlur': case 'shX': case 'shY': objs.forEach((x) => x.set('shadow', new fabric.Shadow({ color: $('[data-k=shColor]', el).value, blur: +$('[data-k=shBlur]', el).value, offsetX: +$('[data-k=shX]', el).value, offsetY: +$('[data-k=shY]', el).value }))); break;
        case 'rcColor': case 'rcDist': setFilter(o, 'RemoveColor', { color: $('[data-k=rcColor]', el).value, distance: +($('[data-k=rcDist]', el)?.value ?? 0.15) }); return;
        default: objs.forEach((x) => x.set(k, val));
      }
      if (o.type?.includes('text')) o.initDimensions?.();
      c.requestRenderAll();
    };
    i.addEventListener(i.type === 'range' || i.type === 'color' ? 'input' : 'change', handler);
    i.addEventListener('change', () => scheduleHistory());
  });
  $$('[data-fillt]', el).forEach((b) => b.onclick = () => {
    const t = b.dataset.fillt;
    objs.forEach((x) => { const cur = typeof x.fill === 'string' ? x.fill : x.fill?.colorStops?.[0]?.color || '#ffc21a'; x.set('fill', t === 'solid' ? cur : makeGradient(t, cur, '#ff6a00', x.gAngle ?? 90)); });
    done(); renderInspector();
  });
  $$('[data-col]', el).forEach((b) => b.onclick = () => applyColor(b.dataset.col));
  $$('[data-talign]', el).forEach((b) => b.onclick = () => { objs.forEach((x) => x.set('textAlign', b.dataset.talign)); done(); renderInspector(); });
  $('[data-hl]', el)?.addEventListener('change', (e) => { o.set('textBackgroundColor', e.target.checked ? '#ffc21a' : ''); done(); renderInspector(); });
  $('[data-sh=on]', el)?.addEventListener('change', (e) => { objs.forEach((x) => x.set('shadow', e.target.checked ? new fabric.Shadow({ color: '#00000088', blur: 30, offsetX: 0, offsetY: 12 }) : null)); done(); renderInspector(); });
  $('[data-rc]', el)?.addEventListener('change', (e) => {
    if (e.target.checked) { const el2 = o.getElement(), cv = document.createElement('canvas'); cv.width = cv.height = 1; cv.getContext('2d').drawImage(el2, 0, 0, 1, 1, 0, 0, 1, 1); const d = cv.getContext('2d').getImageData(0, 0, 1, 1).data; setFilter(o, 'RemoveColor', { color: toHex(`rgb(${d[0]},${d[1]},${d[2]})`), distance: 0.15 }); }
    else setFilter(o, 'RemoveColor', null);
    done(); renderInspector();
  });
  $$('[data-tog]', el).forEach((b) => b.onclick = () => { const t = b.dataset.tog; setFilter(o, t, getFilter(o, t) ? null : {}); done(); renderInspector(); });
  $$('[data-mask]', el).forEach((b) => b.onclick = () => { setMask(o, b.dataset.mask); renderInspector(); });
  $$('[data-act]', el).forEach((b) => b.onclick = () => runAct(b.dataset.act));
}
function runAct(act) {
  const c = ED.canvas, objs = selected(), o = objs[0];
  const done = () => { c.requestRenderAll(); scheduleHistory(); renderInspector(); };
  switch (act) {
    case 'flipH': return flip('h'); case 'flipV': return flip('v');
    case 'distH': return distribute('h'); case 'distV': return distribute('v');
    case 'front': case 'forward': case 'backward': case 'back': return order(act);
    case 'group': return groupSel(); case 'ungroup': return ungroupSel();
    case 'lock': objs.forEach((x) => lockObj(x, true)); c.discardActiveObject(); if (objs.length === 1) c.setActiveObject(objs[0]); return done();
    case 'unlock': objs.forEach((x) => lockObj(x, false)); return done();
    case 'dup': return duplicateSel(); case 'del': return deleteSel();
    case 'bold': o.set('fontWeight', (+o.fontWeight || 400) >= 700 ? 400 : 700); return done();
    case 'italic': o.set('fontStyle', o.fontStyle === 'italic' ? 'normal' : 'italic'); return done();
    case 'underline': o.set('underline', !o.underline); return done();
    case 'caps': o.textCase = o.textCase === 'upper' ? '' : 'upper'; o.set('text', o.textCase ? o.text.toUpperCase() : o.text); return done();
    case 'resetFilters': o.filters = []; o.applyFilters(); return done();
    case 'replace': return pickFiles('image/*', async (files) => { const up = await uploadToLibrary(files[0]); const w = o.getScaledWidth(); o.setSrc(up.url, () => { o.cropX = o.cropY = 0; o.cropPct = null; o.scaleToWidth(w); o.applyFilters(); done(); }, { crossOrigin: 'anonymous' }); });
    case 'asBg': { const P = ED.project, s = Math.max(P.width / o.width, P.height / o.height); o.set({ originX: 'left', originY: 'top', angle: 0, scaleX: s, scaleY: s, left: (P.width - o.width * s) / 2, top: (P.height - o.height * s) / 2 }); o.setCoords(); c.moveTo(o, 1); return done(); }
    case 'edit3d': return window.Studio3D?.open(o.scene3d, o);
  }
}
ED.on('selection', () => { renderInspector(); placeCtxBar(); });
ED.on('transform', () => {
  const a = ED.canvas.getActiveObject(); placeCtxBar(); if (!a) return;
  const tl = topLeft(a), set = (k, v) => { const i = $(`#inspector [data-t=${k}]`); if (i && document.activeElement !== i) i.value = Math.round(v); };
  set('x', tl.x); set('y', tl.y); set('w', a.getScaledWidth()); set('h', a.getScaledHeight()); set('angle', a.angle || 0);
});
ED.on('zoom', () => { $('#zoomVal').textContent = Math.round(ED.zoom * 100) + '%'; placeCtxBar(); });

// floating context bar (Canva style)
function placeCtxBar() {
  const bar = $('#ctxBar'), a = ED.canvas.getActiveObject();
  if (!a || a.isEditing || ED.tool !== 'select') return bar.classList.add('hidden');
  bar.innerHTML = [['dup', 'copy', 'Duplicate'], ['lock', 'lock', 'Lock'], ['front', 'toFront', 'Bring to front'], ['back', 'toBack', 'Send to back'], ['del', 'trash', 'Delete']]
    .map(([k, i, t]) => `<button class="icon-btn" data-cb="${k}" title="${t}">${icon(i)}</button>`).join('');
  $$('[data-cb]', bar).forEach((b) => b.onmousedown = (e) => { e.preventDefault(); runAct(b.dataset.cb); });
  const r = a.getBoundingRect();
  bar.classList.remove('hidden');
  const x = Math.max(8, Math.min(ED.canvas.width - bar.offsetWidth - 8, r.left + r.width / 2 - bar.offsetWidth / 2));
  const y = r.top - 52 > 6 ? r.top - 52 : r.top + r.height + 14;
  bar.style.left = x + 'px'; bar.style.top = Math.min(ED.canvas.height - 44, y) + 'px';
}

// pages / artboards and document tabs live in doctabs.js
ED.on('page', () => { renderInspector(); if (curTab === 'layers') refreshLayers(); });
ED.on('history', () => { $('#btnUndo').disabled = ED.undo.length < 2; $('#btnRedo').disabled = !ED.redo.length; });

// ================= menus =================
const MENUS = {
  file: [['Home / new design', () => goHome()], ['Save now', saveProject, 'Ctrl+S'], '-', ['Import image / SVG / PSD…', () => pickFiles('image/*,.svg,.psd'), 'Ctrl+O'],
    ['Export…', () => openExport(), 'Ctrl+E'], ['Download project file (.json)', downloadProject], '-', ['Open Exports folder', () => fetch('/api/open-exports', { method: 'POST' })]],
  edit: [['Undo', undo, 'Ctrl+Z'], ['Redo', redo, 'Ctrl+Y'], '-', ['Copy', copySel, 'Ctrl+C'], ['Paste', () => pasteSel(), 'Ctrl+V'], ['Duplicate', duplicateSel, 'Ctrl+D'],
    ['Delete', deleteSel, 'Del'], ['Select all', selectAll, 'Ctrl+A']],
  object: [['Group', groupSel, 'Ctrl+G'], ['Ungroup', ungroupSel, 'Ctrl+Shift+G'], '-', ['Bring to front', () => order('front'), 'Ctrl+Shift+]'],
    ['Bring forward', () => order('forward'), 'Ctrl+]'], ['Send backward', () => order('backward'), 'Ctrl+['], ['Send to back', () => order('back'), 'Ctrl+Shift+['], '-',
    ['Flip horizontal', () => flip('h'), 'Shift+H'], ['Flip vertical', () => flip('v'), 'Shift+V'], ['Lock / unlock', () => { selected().forEach((o) => lockObj(o, !o.locked)); renderInspector(); scheduleHistory(); }, 'Ctrl+L']],
  view: [['Fit to screen', fitView, 'Shift+1'], ['Zoom 100%', () => setZoom(1), 'Ctrl+0'], ['Zoom in', () => setZoom(ED.zoom * 1.25), 'Ctrl+='], ['Zoom out', () => setZoom(ED.zoom / 1.25), 'Ctrl+-'], '-',
    ['Toggle clip to page', () => { ED.clip = !ED.clip; updateClip(); renderInspector(); }], ['Toggle smart guides', () => { ED.snap = !ED.snap; toast('Smart guides ' + (ED.snap ? 'on' : 'off')); }]],
};
function openMenu(btn) {
  const dd = $('#dropdown'), items = MENUS[btn.dataset.menu];
  dd.innerHTML = items.map((it, i) => it === '-' ? '<hr>' : `<button data-mi="${i}">${it[0]}${it[2] ? `<kbd>${it[2]}</kbd>` : ''}</button>`).join('');
  const r = btn.getBoundingClientRect(); dd.style.left = r.left + 'px'; dd.style.top = r.bottom + 4 + 'px'; dd.classList.remove('hidden');
  $$('.tb').forEach((b) => b.classList.toggle('open', b === btn));
  $$('[data-mi]', dd).forEach((b) => b.onclick = () => { closeMenu(); items[b.dataset.mi][1](); });
}
function closeMenu() { $('#dropdown').classList.add('hidden'); $$('.tb').forEach((b) => b.classList.remove('open')); }
function selectAll() {
  const c = ED.canvas; c.discardActiveObject();
  const objs = c.getObjects().filter((o) => !o.isPage && !o.locked && o.visible);
  if (objs.length) c.setActiveObject(objs.length > 1 ? new fabric.ActiveSelection(objs, { canvas: c }) : objs[0]);
  c.requestRenderAll(); ED.emit('selection');
}
function downloadProject() { storePage(); dl(new Blob([JSON.stringify(ED.project)], { type: 'application/json' }), `${ED.project.name}.limelight.json`); }

// ================= files: pick, drop, paste =================
function pickFiles(accept, cb) {
  const f = $('#filePick'); f.accept = accept; f.value = '';
  f.onchange = () => (cb || handleFiles)([...f.files]);
  f.click();
}
async function handleFiles(files, point) {
  for (const file of files) {
    const n = file.name.toLowerCase();
    try {
      if (n.endsWith('.psd')) { toast('Opening PSD…'); if (ED.project) await saveProject(); const proj = await importPSD(file); await openProject(proj); markDirty(); toast(`PSD opened · ${proj.pages[0].json.objects.length - 1} layers`); }
      else if (n.endsWith('.json')) { const proj = JSON.parse(await file.text()); proj.id = 'p' + Date.now().toString(36); await openProject(proj); markDirty(); }
      else if (n.endsWith('.svg')) { if (!ED.project) await startNew(1080, 1080); await addSVG(await file.text(), file.name.replace(/\.svg$/i, '')); }
      else if (file.type.startsWith('image/')) { if (!ED.project) await startNew(1080, 1080); const up = await uploadToLibrary(file); await addImage(up.url, { point, name: file.name.replace(/\.\w+$/, '') }); refreshLibrary(); }
      else toast(`Can't open ${file.name}`, true);
    } catch (e) { console.error(e); toast(`Failed: ${file.name} — ${e.message}`, true); }
  }
}
function setupDropAndPaste() {
  const stage = $('#stage');
  stage.ondragover = (e) => e.preventDefault();
  stage.ondrop = (e) => {
    e.preventDefault();
    const pt = ED.canvas.getPointer(e);
    const url = e.dataTransfer.getData('text/x-ll-url');
    if (url) return addImage(url, { point: pt });
    if (e.dataTransfer.files.length) handleFiles([...e.dataTransfer.files], pt);
  };
  document.addEventListener('paste', async (e) => {
    if ($('#editor').classList.contains('hidden') || isTyping(e)) return;
    const files = [...(e.clipboardData?.files || [])];
    if (files.length) { e.preventDefault(); return handleFiles(files); }
    if (ED.clipboard) return pasteSel();
    const t = e.clipboardData?.getData('text/plain');
    if (t) { if (t.trim().startsWith('<svg')) addSVG(t); else ED.canvas.setActiveObject(addText({ text: t, fontSize: 48, fontWeight: 500 })); }
  });
}
const isTyping = (e) => { const t = e.target; return t.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(t.tagName) || ED.canvas?.getActiveObject()?.isEditing; };

// ================= keyboard =================
function setupKeys() {
  const KEYMAP = { v: 'select', h: 'hand', r: 'rect', o: 'ellipse', l: 'line', a: 'arrow', p: 'pen', b: 'brush', t: 'text', i: 'pipette' };
  window.addEventListener('keydown', (e) => {
    if ($('#editor').classList.contains('hidden') || !$('#studio3d').classList.contains('hidden')) return;
    if (isTyping(e)) { if (e.key === 'Escape') ED.canvas.getActiveObject()?.exitEditing?.(); return; }
    const k = e.key.toLowerCase(), ctrl = e.ctrlKey || e.metaKey;
    if (k === ' ' && !ED.spaceDown) { ED.spaceDown = true; ED.canvas.defaultCursor = 'grab'; ED.canvas.setCursor('grab'); e.preventDefault(); return; }
    if (ctrl) {
      const m = { z: e.shiftKey ? redo : undo, y: redo, c: copySel, d: duplicateSel, a: selectAll, s: saveProject, e: openExport, o: () => pickFiles('image/*,.svg,.psd'),
        g: e.shiftKey ? ungroupSel : groupSel, ']': () => order(e.shiftKey ? 'front' : 'forward'), '[': () => order(e.shiftKey ? 'back' : 'backward'),
        '=': () => setZoom(ED.zoom * 1.25), '+': () => setZoom(ED.zoom * 1.25), '-': () => setZoom(ED.zoom / 1.25), '0': () => setZoom(1),
        l: () => { selected().forEach((o) => lockObj(o, !o.locked)); renderInspector(); } }[k];
      if (m) { e.preventDefault(); m(); }
      return;
    }
    if (k === 'delete' || k === 'backspace') { e.preventDefault(); return deleteSel(); }
    if (k === 'escape') { if (ED.tool === 'pen') cancelPen(); ED.canvas.discardActiveObject(); ED.canvas.requestRenderAll(); setTool('select'); closeMenu(); return; }
    if (k === 'enter') { if (ED.tool === 'pen') return finishPen(); const a = ED.canvas.getActiveObject(); if (a?.type === 'textbox') { a.enterEditing(); a.selectAll(); } return; }
    if (k.startsWith('arrow')) { e.preventDefault(); const s = e.shiftKey ? 10 : 1; return nudge(k === 'arrowleft' ? -s : k === 'arrowright' ? s : 0, k === 'arrowup' ? -s : k === 'arrowdown' ? s : 0); }
    if (e.shiftKey && k === '!') return fitView();
    if (e.shiftKey && e.code === 'Digit1') return fitView();
    if (e.shiftKey && k === 'h') return flip('h');
    if (e.shiftKey && k === 'v') return flip('v');
    if (KEYMAP[k]) { if (k === 'i') ED.pipetteTargets = selected(); setTool(KEYMAP[k]); }
  });
  window.addEventListener('keyup', (e) => { if (e.key === ' ') { ED.spaceDown = false; ED.canvas.defaultCursor = ED.tool === 'hand' ? 'grab' : 'default'; } });
}

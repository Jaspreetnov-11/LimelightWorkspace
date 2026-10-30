// Export (PNG/JPG/SVG/PDF/PSD) and import (PSD/SVG/project JSON) - renders each page on an offscreen canvas.
function renderPageCanvas(json, w, h) {
  return new Promise((resolve) => {
    const sc = new fabric.StaticCanvas(null, { width: w, height: h, enableRetinaScaling: false });
    sc.loadFromJSON(localSrcs(json), async () => {
      const fams = new Set(); sc.getObjects().forEach((o) => o.fontFamily && fams.add(o.fontFamily));
      await Promise.all([...fams].map((f) => document.fonts.load(`700 40px "${f}"`).catch(() => 0)));
      sc.getObjects().forEach((o) => o.initDimensions?.());
      sc.renderAll(); resolve(sc);
    });
  });
}
function pageJSONs(which) {
  storePage();
  const P = ED.project, one = (p) => ({ json: p.json, w: p.w || P.width, h: p.h || P.height, name: p.name });
  return which === 'all' ? P.pages.map(one) : [one(P.pages[ED.pageIndex])];
}
function dl(blobOrUrl, name) {
  const a = document.createElement('a');
  a.href = typeof blobOrUrl === 'string' ? blobOrUrl : URL.createObjectURL(blobOrUrl);
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
}
async function saveToExports(name, ext, data) {
  try {
    const r = await fetch('/api/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, ext, data }) });
    return (await r.json()).path;
  } catch { return null; }
}
const blobToDataURL = (b) => new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); });

// the page as a vector SVG for CorelDRAW / Illustrator: its real size in inches (from the design DPI) and every photo
// inside the file (a link to /library/... would be lost on another PC)
async function designSVG(json, w, h, dpi) {
  const sc = await renderPageCanvas(json, w, h);
  let svg = sc.toSVG({ width: `${(w / dpi).toFixed(4)}in`, height: `${(h / dpi).toFixed(4)}in`, viewBox: { x: 0, y: 0, width: w, height: h } });
  sc.dispose();
  // (Fabric clips the whole page to itself; CorelDRAW would make that one PowerClip holding everything - the page is
  // already its size, so the clip goes and every object comes in on its own)
  const clip = /<g clip-path="url\(#(CLIPPATH_\d+)\)"\s*>/.exec(svg);
  if (clip) {
    svg = svg.replace(clip[0], '<g>');
    svg = svg.replace(new RegExp(`<clipPath id="${clip[1]}"\\s*>[\\s\\S]*?</clipPath>`), '');
  }
  svg = forCorel(svg);
  const links =[...new Set([...svg.matchAll(/(?:xlink:)?href="([^"#][^"]*)"/g)].map((m) => m[1]).filter((u) => !u.startsWith('data:')))];
  for (const u of links) {
    try { const d = await blobToDataURL(await (await fetch(u.replace(/&amp;/g, '&'))).blob()); svg = svg.split(`"${u}"`).join(`"${d}"`); } catch { /* left as a link */ }
  }
  return svg;
}
// what CorelDRAW reads wrongly in Fabric's SVG, written its way: a rectangle with rx="0" ry="0" throws its whole
// position off; the lines of one text run into each other (so each line becomes its own text, in place); a space alone
// in a letter-spaced line is dropped (so it becomes a no-break space)
function forCorel(svg) {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  if (doc.querySelector('parsererror')) return svg.replace(/ rx="0" ry="0"/g, '');
  doc.querySelectorAll('rect').forEach((r) => { if (+r.getAttribute('rx') === 0 && +r.getAttribute('ry') === 0) { r.removeAttribute('rx'); r.removeAttribute('ry'); } });
  // a photo in a scaled group: CorelDRAW applies the scale twice (a logo at 15% came in at 2%) - so the scale moves onto
  // the photo's own size, and the group only turns and places it
  doc.querySelectorAll('image').forEach((im) => {
    const g = im.parentNode, m = /matrix\(([^)]+)\)/.exec(g?.getAttribute?.('transform') || '');
    if (!m) return;
    const [a, b, c, d, e, f] = m[1].trim().split(/[\s,]+/).map(Number), sx = Math.hypot(a, b), sy = Math.hypot(c, d);
    if (!sx || !sy || (Math.abs(sx - 1) < 1e-6 && Math.abs(sy - 1) < 1e-6)) return;
    g.setAttribute('transform', `matrix(${a / sx} ${b / sx} ${c / sy} ${d / sy} ${e} ${f})`);
    for (const [k, s] of [['x', sx], ['width', sx], ['y', sy], ['height', sy]]) im.setAttribute(k, (+im.getAttribute(k) || 0) * s);
  });
  doc.querySelectorAll('text').forEach((t) => {
    const spans = [...t.querySelectorAll('tspan')];
    spans.forEach((s) => { if (s.textContent && !s.textContent.trim()) s.textContent = s.textContent.replace(/ /g, ' '); });
    const lines = [];
    for (const s of spans) { const y = s.getAttribute('y'); let l = lines.find((x) => x.y === y); if (!l) lines.push(l = { y, spans: [] }); l.spans.push(s); }
    if (lines.length < 2) return;
    for (const l of lines) {
      const one = t.cloneNode(false);
      l.spans.forEach((s) => one.appendChild(s));
      t.parentNode.insertBefore(one, t);
    }
    t.remove();
  });
  return new XMLSerializer().serializeToString(doc);
}
// CorelDRAW on the Studio PC: SVG -> editable .cdr / .ai / vector .pdf, saved in Exports (or a bundle folder)
async function convertSVG(name, svg, formats, folder) {
  const one = Array.isArray(svg) ? { svgs: svg } : { svg };
  const r = await fetch('/api/convert', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, ...one, formats, folder }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'CorelDRAW could not make the file');
  return j.files;
}

// 📦 every format of the same design in one go: PSD, PDF, CDR, AI, PNG, JPG, SVG - in Exports/<name> (all formats)
// and downloaded as one .zip
async function exportAll({ pages, scale, quality, list: given, name: asName }) {
  const p = ED.project, list = given || pageJSONs(pages), dpi = p.dpi || 96;
  const base = (asName || p.name || 'design').replace(/[\\/:*?"<>|]/g, '');
  const book = isBookExport(list), svgs = [];
  const t = new Date(), two = (n) => String(n).padStart(2, '0');
  const folder = `${base} - all formats ${t.getFullYear()}-${two(t.getMonth() + 1)}-${two(t.getDate())} ${two(t.getHours())}${two(t.getMinutes())}`;
  const put = (name, ext, data) => fetch('/api/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, ext, data, folder }) }).then((r) => r.json());
  const notes = [];
  for (let i = 0; i < list.length; i++) {
    const { json, w, h, name } = list[i], n = pageFile(base, list, i);
    exProgress(`Page ${i + 1} of ${list.length}: PNG, JPG and SVG…`);
    const sc = await renderPageCanvas(json, w, h);
    await put(n, 'png', sc.toDataURL({ format: 'png', multiplier: scale }));
    await put(n, 'jpg', sc.toDataURL({ format: 'jpeg', quality, multiplier: scale }));
    sc.dispose();
    const svg = await designSVG(json, w, h, dpi);
    await put(n, 'svg', 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg))));
    exProgress(`Page ${i + 1} of ${list.length}: layered PSD…`);
    await put(n, 'psd', await blobToDataURL(await makePSD(json, w, h, scale)));
    exProgress(`Page ${i + 1} of ${list.length}: CorelDRAW is making the ${book ? 'AI' : 'CDR, AI and PDF'}…`);
    try { await convertSVG(n, svg, book ? ['ai'] : ['cdr', 'ai', 'pdf'], folder); }
    catch (e) { notes.push(e.message); if (!book) await put(n, 'pdf', await blobToDataURL(await rasterPDF([list[i]], scale, dpi))); }
    svgs.push(svg);
  }
  // 📖 a book: one CorelDRAW document and one PDF with every page in it
  if (book) {
    exProgress(`CorelDRAW is making the ${list.length}-page CDR and PDF…`);
    try { await convertSVG(base, svgs, ['cdr', 'pdf'], folder); }
    catch (e) { notes.push(e.message); await put(base, 'pdf', await blobToDataURL(await rasterPDF(list, scale, dpi))); }
  }
  exProgress('Packing the .zip…');
  const z = await fetch('/api/zip', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folder }) }).then((r) => r.json());
  if (!z.url) throw new Error(z.error || 'Could not pack the files');
  dl(z.url, `${folder}.zip`);
  return { saved: [z.path], notes };
}
async function rasterPDF(list, scale, dpi) {
  const imgs = [];
  for (const { json, w, h } of list) {
    const sc = await renderPageCanvas(json, w, h);
    imgs.push({ data: sc.toDataURL({ format: 'jpeg', quality: 0.95, multiplier: scale }), pxW: w * scale, pxH: h * scale, ptW: (w * 72) / dpi, ptH: (h * 72) / dpi }); sc.dispose();
  }
  return makePDF(imgs);
}
// one page: the design's name; more: its number too - two artboards may have the same name, and must not overwrite
const pageFile = (base, list, i) => (list.length > 1 ? `${base} - ${String(i + 1).padStart(2, '0')} ${list[i].name || 'Page'}` : base);
const exProgress = (t) => { const b = document.getElementById('exGo'); if (b) b.textContent = t; };

// a Book's pages go to CorelDRAW together: one multi-page CDR / PDF (a design's artboards stay a file each)
const isBookExport = (list) => list.length > 1 && !!ED.project?.book;
// (list / name: pages made elsewhere - the 3D tab's render - instead of the open design's)
async function exportDesign({ format, pages, scale, quality, transparent, list: given, name: asName }) {
  const p = ED.project, list = given || pageJSONs(pages), dpi = p.dpi || 96;
  const base = (asName || p.name || 'design').replace(/[\\/:*?"<>|]/g, '');
  const saved = [];
  if (format === 'all') return (await exportAll({ pages, scale, quality, list: given, name: asName })).saved;
  if ((format === 'cdr' || format === 'pdf') && isBookExport(list)) {
    try {
      exProgress(`CorelDRAW is making the ${list.length}-page ${format.toUpperCase()}…`);
      const svgs = [];
      for (const { json, w, h } of list) svgs.push(await designSVG(json, w, h, dpi));
      for (const f of await convertSVG(base, svgs, [format])) { dl(f.url, `${base}.${f.ext}`); saved.push(f.path); }
      return saved;
    } catch (e) { if (format !== 'pdf') throw e; toast('Vector PDF not possible (' + e.message + ') - making a picture PDF', true); }
  }
  if ((format === 'cdr' || format === 'ai' || (format === 'pdf' && list.length === 1)) && !(format === 'pdf' && isBookExport(list))) {
    // (a vector PDF from CorelDRAW for one page; a picture PDF when CorelDRAW cannot, or for many pages in one file)
    try {
      for (let i = 0; i < list.length; i++) {
        const { json, w, h, name } = list[i], n = pageFile(base, list, i);
        exProgress(`CorelDRAW is making the ${format.toUpperCase()}${list.length > 1 ? ` (${i + 1} of ${list.length})` : ''}…`);
        const files = await convertSVG(n, await designSVG(json, w, h, dpi), [format]);
        for (const f of files) { dl(f.url, `${n}.${f.ext}`); saved.push(f.path); }
      }
      return saved;
    } catch (e) { if (format !== 'pdf') throw e; toast('Vector PDF not possible (' + e.message + ') - making a picture PDF', true); }
  }
  if (format === 'pdf') {
    const imgs = [];
    for (const { json, w, h } of list) {
      const sc = await renderPageCanvas(json, w, h);
      imgs.push({ data: sc.toDataURL({ format: 'jpeg', quality: 0.95, multiplier: scale }), pxW: w * scale, pxH: h * scale, ptW: (w * 72) / dpi, ptH: (h * 72) / dpi }); sc.dispose();
    }
    const blob = makePDF(imgs);
    dl(blob, base + '.pdf'); saved.push(await saveToExports(base, 'pdf', await blobToDataURL(blob)));
  } else if (format === 'psd') {
    for (let i = 0; i < list.length; i++) {
      const { json, w, h, name } = list[i];
      const blob = await makePSD(json, w, h, scale);
      const n = pageFile(base, list, i);
      dl(blob, n + '.psd'); saved.push(await saveToExports(n, 'psd', await blobToDataURL(blob)));
    }
  } else {
    for (let i = 0; i < list.length; i++) {
      const { json, w, h, name } = list[i];
      const sc = await renderPageCanvas(json, w, h);
      const n = pageFile(base, list, i);
      let data, ext = format;
      if (format === 'svg') {
        const svg = sc.toSVG({ width: w, height: h, viewBox: { x: 0, y: 0, width: w, height: h } });
        data = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
        dl(new Blob([svg], { type: 'image/svg+xml' }), n + '.svg');
      } else {
        if (transparent && format === 'png') { sc.getObjects().forEach((o) => { if (o.isPage) o.visible = false; }); sc.renderAll(); }
        data = sc.toDataURL({ format: format === 'jpg' ? 'jpeg' : 'png', quality, multiplier: scale });
        dl(data, `${n}.${ext}`);
      }
      saved.push(await saveToExports(n, ext, data)); sc.dispose();
    }
  }
  return saved.filter(Boolean);
}

// ---- minimal PDF writer: one JPEG per page ----
function makePDF(pages) {
  const enc = new TextEncoder(), parts = [], offsets = [];
  let len = 0;
  const push = (x) => { const b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); len += b.length; };
  const obj = (n, body) => { offsets[n] = len; push(`${n} 0 obj\n`); body(); push('\nendobj\n'); };
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  const n = pages.length, pageIds = pages.map((_, i) => 3 + i * 3);
  obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
  obj(2, () => push(`<< /Type /Pages /Count ${n} /Kids [${pageIds.map((i) => `${i} 0 R`).join(' ')}] >>`));
  pages.forEach(({ data: d, pxW, pxH, ptW, ptH }, i) => {
    const bin = Uint8Array.from(atob(d.split(',')[1]), (c) => c.charCodeAt(0));
    const pid = 3 + i * 3, cid = pid + 1, iid = pid + 2;
    const content = `q ${ptW.toFixed(2)} 0 0 ${ptH.toFixed(2)} 0 0 cm /Im0 Do Q`;
    obj(pid, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ptW.toFixed(2)} ${ptH.toFixed(2)}] /Resources << /XObject << /Im0 ${iid} 0 R >> >> /Contents ${cid} 0 R >>`));
    obj(cid, () => push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`));
    obj(iid, () => { push(`<< /Type /XObject /Subtype /Image /Width ${Math.round(pxW)} /Height ${Math.round(pxH)} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bin.length} >>\nstream\n`); push(bin); push('\nendstream'); });
  });
  const xref = len, total = 3 + n * 3;
  push(`xref\n0 ${total}\n0000000000 65535 f \n`);
  for (let i = 1; i < total; i++) push(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  push(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(parts, { type: 'application/pdf' });
}

// ---- PSD: groups become folders, shadow/stroke become editable layer effects, clip shapes become layer masks ----
const PSD_BLEND = { 'source-over': 'normal', multiply: 'multiply', screen: 'screen', overlay: 'overlay', darken: 'darken', lighten: 'lighten',
  'color-dodge': 'color dodge', 'color-burn': 'color burn', 'hard-light': 'hard light', 'soft-light': 'soft light', difference: 'difference',
  exclusion: 'exclusion', hue: 'hue', saturation: 'saturation', color: 'color', luminosity: 'luminosity' };
const psdColor = (c) => { const s = new fabric.Color(c || '#000').getSource() || [0, 0, 0, 1]; return { col: { r: s[0], g: s[1], b: s[2] }, a: s[3] ?? 1 }; };
const PS_FONTS = { Inter: ['Inter-Regular', 'Inter-Bold'], Mukta: ['Mukta-Medium', 'Mukta-ExtraBold'], 'Rozha One': ['RozhaOne-Regular'], 'Yatra One': ['YatraOne-Regular'],
  Arial: ['ArialMT', 'Arial-BoldMT'], Georgia: ['Georgia', 'Georgia-Bold'], 'Segoe UI': ['SegoeUI', 'SegoeUI-Bold'], 'Times New Roman': ['TimesNewRomanPSMT', 'TimesNewRomanPS-BoldMT'],
  Impact: ['Impact'], 'Trebuchet MS': ['TrebuchetMS', 'TrebuchetMS-Bold'], Verdana: ['Verdana', 'Verdana-Bold'], 'Courier New': ['CourierNewPSMT', 'CourierNewPS-BoldMT'],
  'Comic Sans MS': ['ComicSansMS', 'ComicSansMS-Bold'], 'Nirmala UI': ['NirmalaUI', 'NirmalaUI-Bold'], Mangal: ['Mangal', 'Mangal-Bold'] };
const psFont = (fam, w) => { const f = PS_FONTS[fam]; return f ? f[(+w || 400) >= 700 && f[1] ? 1 : 0] : (fam || 'Arial').replace(/\s/g, ''); };
const psdName = (o) => (o.name || (o.text ? o.text : o.type)).replace(/\s*\n\s*/g, ' ').slice(0, 60);

// draw one object alone at document size; effects, opacity, blend and mask are left to Photoshop
function drawAlone(o, W, H, scale, noStroke) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d'); ctx.scale(scale, scale);
  const keep = { opacity: o.opacity, shadow: o.shadow, clipPath: o.clipPath, globalCompositeOperation: o.globalCompositeOperation, visible: o.visible, strokeWidth: o.strokeWidth };
  o.opacity = 1; o.shadow = null; o.clipPath = o.type === 'group' ? o.clipPath : null; o.globalCompositeOperation = 'source-over'; o.visible = true;
  if (noStroke) o.strokeWidth = 0;
  o.dirty = true; o.render(ctx);
  Object.assign(o, keep); o.dirty = true;
  return cv;
}
function maskCanvas(o, W, H, scale) {
  const cp = o.clipPath, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d'); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.scale(scale, scale);
  if (!cp.absolutePositioned) ctx.transform(...o.calcTransformMatrix());
  ctx.transform(...cp.calcOwnMatrix());
  const keep = { fill: cp.fill, stroke: cp.stroke }; cp.fill = '#ffffff'; cp.stroke = null;
  ctx.fillStyle = '#ffffff'; cp._render(ctx); ctx.fill();
  Object.assign(cp, keep);
  return cv;
}
function psdEffects(o, isText) {
  const fx = {}, off = o.fxOff || {};
  const sh = o.shadow || (off.shadow && new fabric.Shadow(off.shadow));
  if (sh) {
    const { col, a } = psdColor(sh.color), dx = sh.offsetX || 0, dy = sh.offsetY || 0;
    fx.dropShadow = [{ enabled: !!o.shadow, present: true, showInDialog: true, color: col, opacity: a, blendMode: 'multiply', useGlobalLight: false,
      angle: Math.round((Math.atan2(dy, -dx) * 180) / Math.PI), distance: { units: 'Pixels', value: Math.round(Math.hypot(dx, dy)) },
      size: { units: 'Pixels', value: Math.round(sh.blur || 0) }, choke: { units: 'Pixels', value: 0 } }];
  }
  const st = off.stroke || (isText && o.stroke && o.strokeWidth > 0 ? { stroke: o.stroke, strokeWidth: o.strokeWidth } : null);
  if (st) {
    const { col, a } = psdColor(st.stroke);
    fx.stroke = [{ enabled: !off.stroke, present: true, showInDialog: true, position: 'outside', fillType: 'color', blendMode: 'normal',
      color: col, opacity: a, size: { units: 'Pixels', value: Math.max(1, Math.round(st.strokeWidth / 2)) } }];
  }
  return Object.keys(fx).length ? fx : null;
}
function psdLayer(o, W, H, scale) {
  const base = { name: psdName(o), hidden: !o.visible, opacity: o.opacity ?? 1, blendMode: PSD_BLEND[o.globalCompositeOperation] || 'normal' };
  if (o.type === 'group' && !o.scene3d) {
    return { ...base, opened: true, children: o.getObjects().map((c) => psdLayer(c, W, H, scale)) };
  }
  const isText = o.type?.includes('text');
  const layer = { ...base, canvas: drawAlone(o, W, H, scale, isText) };
  const fx = psdEffects(o, isText); if (fx) layer.effects = fx;
  if (o.clipPath) layer.mask = { canvas: maskCanvas(o, W, H, scale), left: 0, top: 0, right: W, bottom: H, defaultColor: 0 };
  if (isText && typeof o.fill === 'string') {
    const d = fabric.util.qrDecompose(o.calcTransformMatrix());
    if (Math.abs(d.angle % 360) < 0.5) {
      const { col } = psdColor(o.fill), fs = o.fontSize * d.scaleY;
      const left = d.translateX - (o.width * d.scaleX) / 2, top = d.translateY - (o.height * d.scaleY) / 2;
      layer.text = { text: o.text.replace(/\n/g, '\r'), transform: [1, 0, 0, 1, left * scale, (top + fs * 0.9) * scale],
        style: { font: { name: psFont(o.fontFamily, o.fontWeight) }, fontSize: fs * scale, fillColor: col },
        paragraphStyle: { justification: o.textAlign === 'center' ? 'center' : o.textAlign === 'right' ? 'right' : 'left' } };
    }
  }
  return layer;
}
async function makePSD(json, w, h, scale) {
  const sc = await renderPageCanvas(json, w, h);
  const W = Math.round(w * scale), H = Math.round(h * scale);
  const children = sc.getObjects().map((o) => o.isPage ? { name: 'Background', canvas: drawAlone(o, W, H, scale) } : psdLayer(o, W, H, scale));
  const composite = sc.toCanvasElement(scale); sc.dispose();
  const psd = { width: W, height: H, canvas: composite, children };
  let buf;
  try { buf = agPsd.writePsd(psd, { invalidateTextLayers: true, generateThumbnail: true }); }
  catch (e) {
    console.warn('PSD text layers failed, writing pixels only', e);
    (function strip(list) { list.forEach((c) => { delete c.text; if (c.children) strip(c.children); }); })(psd.children);
    buf = agPsd.writePsd(psd, { generateThumbnail: true });
  }
  return new Blob([buf], { type: 'image/vnd.adobe.photoshop' });
}

// ---- PSD import: layers -> images, text layers -> editable text ----
async function importPSD(file) {
  const psd = agPsd.readPsd(await file.arrayBuffer(), { skipThumbnail: true });
  const proj = newProject(psd.width, psd.height, file.name.replace(/\.psd$/i, ''));
  const objects = [pageRectJSON(psd.width, psd.height, '#ffffff')];
  const flat = [];
  (function walk(list, hidden) { (list || []).forEach((l) => { if (l.children) walk(l.children, hidden || l.hidden); else flat.push({ l, hidden: hidden || l.hidden }); }); })(psd.children, false);
  for (const { l, hidden } of flat) {
    if (l.text && l.text.text) {
      const st = l.text.style || {}, fc = st.fillColor || { r: 0, g: 0, b: 0 }, t = l.text.transform || [1, 0, 0, 1, l.left, l.top];
      const fs = (st.fontSize || 24) * (t[3] || 1);
      objects.push({ type: 'textbox', text: l.text.text.replace(/\r/g, '\n'), left: l.left ?? t[4], top: l.top ?? t[5] - fs,
        width: Math.max(40, (l.right - l.left) || 400) + 4, fontSize: fs, fill: `rgb(${fc.r | 0},${fc.g | 0},${fc.b | 0})`,
        fontFamily: /Mukta|Rozha|Yatra/i.test(st.font?.name) ? st.font.name.replace(/-.*/, '') : 'Inter',
        fontWeight: /bold|black|heavy/i.test(st.font?.name || '') ? 800 : 400, styles: {}, name: l.name, visible: !hidden, id: uid(), opacity: (l.opacity ?? 1) });
      continue;
    }
    if (!l.canvas || !l.canvas.width) continue;
    const up = await fetch('/api/library', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `${file.name}_${l.name}.png`, data: l.canvas.toDataURL('image/png') }) }).then((r) => r.json());
    objects.push({ type: 'image', src: up.url, left: l.left, top: l.top, width: l.canvas.width, height: l.canvas.height,
      name: l.name, visible: !hidden, opacity: l.opacity ?? 1, id: uid() });
  }
  proj.pages[0].json = { version: '5.3.0', objects };
  return proj;
}

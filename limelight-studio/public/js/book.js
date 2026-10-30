// Limelight Studio - Book tab (InDesign + QuarkXPress style): a document of pages with margins and columns, master pages
// (A-Master...) under every page, automatic page numbers ("#"), text boxes linked from box to box so one story flows
// across pages (Quark's linking tool, InDesign's threads and autoflow), picture boxes, text styles, Place text.
// Pages are the file's artboards, so layers, undo, Generative fill and every export work as in the other tabs; exports
// put the master items and numbers onto each page, and CDR / PDF come out as one multi-page document.
PROPS.push('fromMaster', 'frameH', 'storyId', 'storyIdx', 'flowSep', 'pageNum', 'mirror');
Object.assign(TOOL_HINTS, {
  frameText: 'Text box: drag a frame · link boxes with the Linking tool (K) so the story flows on',
  frameImage: 'Picture box: drag a box · drop a photo on it, or Generative fill it',
  link: 'Linking tool: click the text box the story comes from, then the box it continues in',
});
const MM = (mm, dpi = 300) => Math.round((mm * dpi) / 25.4);
const PT = (pt) => Math.round((pt * (ED.project?.dpi || 300)) / 72);
const BOOK_SIZES = [['A4', 210, 297], ['A5', 148, 210], ['Letter', 215.9, 279.4], ['6 × 9 in', 152.4, 228.6], ['B5', 176, 250], ['Square 210', 210, 210], ['A4 landscape', 297, 210]];

// a frame's box stays its drawn height even when its text is shorter (text sits at the top, like InDesign)
const _tbInit = fabric.Textbox.prototype.initDimensions;
fabric.Textbox.prototype.initDimensions = function () { _tbInit.call(this); if (this.frameH) this.height = Math.max(this.height, this.frameH); };

const isBook = () => !!ED.project?.book;
const masters = () => (ED.project.masters ||= []);
const masterOf = (pg) => (pg.master === null ? null : masters().find((m) => m.id === (pg.master || masters()[0]?.id)) || null);
const pageNo = (i) => (ED.project.book.start || 1) + i;
const isLeft = (i) => ED.project.book.facing && pageNo(i) % 2 === 0;
// the margin box of page i (inside / outside swap on left pages)
function marginBox(i) {
  const b = ED.project.book, pg = ED.project.pages[i] || ED.project.pages[0], W = pg.w, H = pg.h, m = b.margins;
  const left = b.facing ? (isLeft(i) ? m.out : m.in) : m.in, right = b.facing ? (isLeft(i) ? m.in : m.out) : m.out;
  return { x: left, y: m.t, w: W - left - right, h: H - m.t - m.b };
}

// ---------------- master items on pages ----------------
function masterObjects(i) {
  const pg = ED.project.pages[i], m = pg && masterOf(pg); if (!m?.json) return [];
  const W = pg.w, n = String(pageNo(i));
  return JSON.parse(JSON.stringify(m.json.objects)).filter((o) => !o.isPage).map((o) => {
    if (o.pageNum && typeof o.text === 'string') { o.text = o.text.replace(/#/g, n).replace(/\{title\}/g, ED.project.name); o.styles = {}; }
    if (o.mirror && isLeft(i)) {
      o.left = W - o.left - (o.width || 0) * (o.scaleX || 1);
      if (o.textAlign === 'right') o.textAlign = 'left'; else if (o.textAlign === 'left') o.textAlign = 'right';
    }
    return { ...o, fromMaster: true, locked: true, selectable: false, evented: false, hasControls: false, id: 'm_' + (o.id || uid()) };
  });
}
function withMaster(objects, i) {
  const k = objects.findIndex((o) => o.isPage);
  return [...objects.slice(0, k + 1), ...masterObjects(i), ...objects.slice(k + 1)];
}
function injectMaster(i) {
  const objs = masterObjects(i); if (!objs.length) return Promise.resolve();
  return new Promise((ok) => fabric.util.enlivenObjects(objs, (live) => {
    const c = ED.canvas; ED.loading = true;
    live.forEach((o, k) => { lockObj(o, true); o.set({ selectable: false, evented: false, hoverCursor: 'default' }); c.insertAt(o, 1 + k); });
    ED.loading = false; ED.undo = [snapshot()]; c.requestRenderAll(); ok();
  }));
}

const _storePage = storePage;
storePage = function () {
  if (!ED.project) return;
  const json = ED.canvas.toJSON(PROPS);
  json.objects = json.objects.filter((o) => !o.fromMaster);
  if (ED.editingMaster) { const m = masters().find((x) => x.id === ED.editingMaster); if (m) m.json = json; return; }
  ED.project.pages[ED.pageIndex].json = json;
};
const _loadPage = loadPage;
loadPage = async function (i) {
  ED.editingMaster = null;
  await _loadPage(i);
  if (isBook()) { await injectMaster(i); ED.emit('page'); }
};
const _pageJSONs = pageJSONs;
pageJSONs = function (which) {
  const list = _pageJSONs(which);
  if (!isBook()) return list;
  return list.map((x, k) => {
    const i = which === 'all' ? k : ED.pageIndex;
    return { ...x, json: { ...x.json, objects: withMaster(x.json.objects, i) } };
  });
};
// master items stay unselectable whatever tool is picked
const _setTool = setTool;
setTool = function (t) {
  _setTool(t);
  ED.canvas?.getObjects().forEach((o) => { if (o.fromMaster) o.evented = false; });
};
const _pageThumb = pageThumb;
pageThumb = function () { return ED.editingMaster ? ED.project.pages[ED.pageIndex].thumb : _pageThumb(); };

function editMaster(id) {
  const m = masters().find((x) => x.id === id); if (!m) return;
  storePage();
  ED.editingMaster = id;
  const pg = ED.project.pages[0];
  m.json ||= { version: '5.3.0', objects: [pageRectJSON(pg.w, pg.h)] };
  const c = ED.canvas; ED.loading = true; c.discardActiveObject();
  c.loadFromJSON(localSrcs(m.json), async () => {
    fixPageObjects(); await ensureFonts();
    ED.loading = false; ED.undo = [snapshot()]; ED.redo = [];
    updateClip(); c.requestRenderAll(); ED.emit('history'); renderInspector(); refreshPanel('pages');
  });
}
async function goPage(i) {
  if (ED.editingMaster) { storePage(); ED.editingMaster = null; await loadPage(i); fitView(); }
  else await switchPage(i);
  refreshPanel('pages');
}

// ---------------- making a book ----------------
function bookSettings(f) {
  const dpi = 300;
  return { margins: { t: MM(f.mt, dpi), b: MM(f.mb, dpi), in: MM(f.mi, dpi), out: MM(f.mo, dpi) }, cols: Math.max(1, f.cols | 0), gutter: MM(f.gutter, dpi),
    facing: !!f.facing, start: Math.max(1, f.start | 0) };
}
function masterA(W, H, b) {
  const fs = Math.round((9 * 300) / 72), y = H - b.margins.b + fs * 1.6;
  const num = { type: 'textbox', text: '#', left: W - b.margins.out - 300, top: y, width: 300, fontSize: fs, fontFamily: 'Inter', fontWeight: 600, fill: '#333333',
    textAlign: 'right', pageNum: true, mirror: true, name: 'Page number', id: uid(), styles: {} };
  const head = { type: 'textbox', text: '{title}', left: W - b.margins.out - 1400, top: b.margins.t - fs * 2.6, width: 1400, fontSize: fs, fontFamily: 'Inter', fontWeight: 500,
    fill: '#777777', textAlign: 'right', charSpacing: 80, pageNum: true, mirror: true, name: 'Running head', id: uid(), styles: {} };
  return { id: 'A', name: 'A-Master', json: { version: '5.3.0', objects: [pageRectJSON(W, H), head, num] } };
}
async function newBook(f) {
  const [, wmm, hmm] = BOOK_SIZES[f.size] || BOOK_SIZES[0], W = MM(wmm), H = MM(hmm), n = Math.max(1, Math.min(500, f.pages | 0));
  const pages = Array.from({ length: n }, (_, i) => ({ id: uid(), name: `Page ${i + 1}`, w: W, h: H, json: { version: '5.3.0', objects: [pageRectJSON(W, H)] } }));
  const proj = newProject(W, H, f.name || 'Untitled book', pages);
  proj.dpi = 300; proj.book = bookSettings(f); proj.mode = 'book'; proj.masters = [masterA(W, H, proj.book)];
  if (ED.stack) {
    // the Book layer open in the Book tab becomes this book (it lands in the design when you go back to Design)
    Object.assign(ED.project, { name: proj.name, width: W, height: H, dpi: 300, pages, book: proj.book, masters: proj.masters, stories: {} });
    $('#docName').value = proj.name;
    await loadPage(0); fitView(); markDirty(); refreshPanel('pages');
  } else { await openInEditor(proj); markDirty(); }
  toast(`${n}-page book ready · A-Master has the page numbers`);
}
function makeThisABook(f) {
  const P = ED.project, pg = P.pages[ED.pageIndex];
  storePage();
  P.book = bookSettings(f); P.dpi = P.dpi || 300; P.masters = [masterA(pg.w, pg.h, P.book)];
  loadPage(ED.pageIndex).then(() => { markDirty(); refreshPanel('pages'); });
}

// ---------------- threaded text (stories) ----------------
const STYLE_SYNC = ['fontSize', 'fontFamily', 'fontWeight', 'fontStyle', 'lineHeight', 'charSpacing', 'textAlign', 'fill', 'underline'];
// every frame of a story, in reading order: { pi, o, live }
function storyFrames(id) {
  const out = [];
  ED.project.pages.forEach((pg, pi) => {
    const list = pi === ED.pageIndex && !ED.editingMaster ? ED.canvas.getObjects() : pg.json.objects;
    list.forEach((o) => { if (o.storyId === id) out.push({ pi, o, live: list !== pg.json.objects }); });
  });
  return out.sort((a, b) => (a.o.storyIdx ?? 0) - (b.o.storyIdx ?? 0) || a.pi - b.pi);
}
const measure = (style, width, text) => new fabric.Textbox(text || ' ', { width, ...Object.fromEntries(STYLE_SYNC.map((k) => [k, style[k]])), splitByGrapheme: false });
const fits = (style, width, maxH, text) => measure(style, width, text).calcTextHeight() <= maxH + 0.5;
// how many of tokens[at...] fit a box: Fabric wraps a generous slice once and the lines that fit the height give the
// count (its wrapped lines + one separator each are the text, exactly)
function fitCount(o, tokens, at, maxH) {
  const left = tokens.length - at;
  if (maxH === Infinity || !left) return left;
  let cap = (o.width / ((o.fontSize || 40) * 0.38)) * (maxH / ((o.fontSize || 40) * (o.lineHeight || 1.16))) * 1.3 + 40;
  for (;;) {
    let n = 0, chars = 0;
    while (n < left && chars < cap) chars += tokens[at + n++].length;
    const t = measure(o, o.width, tokens.slice(at, at + n).join('').trimEnd());
    let h = 0, lines = 0;
    // (a box's last line has no line gap under it - as Fabric measures a box's height)
    for (; lines < t.textLines.length; lines++) { if (h + t.getHeightOfLine(lines) / t.lineHeight > maxH + 0.5) break; h += t.getHeightOfLine(lines); }
    if (lines >= t.textLines.length && n < left) { cap *= 2; continue; } // all of it fits: take a bigger slice
    let want = 0; for (let i = 0; i < lines; i++) want += t.textLines[i].length + 1;
    // (lines wrap one after another, so the slice's first lines are exactly the lines of the words that fit)
    let k = 0, c = 0;
    while (k < n && c + tokens[at + k].trimEnd().length <= want) c += tokens[at + k++].length;
    return k;
  }
}
// pour the story's text box by box: each box takes the words that fit, what is left is "overset" (red + on the last box)
function reflow(id, source) {
  if (!ED.project || ED.reflowing) return;
  ED.reflowing = true;
  try {
    storePage();
    const frames = storyFrames(id); if (!frames.length) return;
    const stories = (ED.project.stories ||= {}), story = (stories[id] ||= { overset: '' });
    let changed = false;
    // one story, one look: the box just edited sets the type of all its boxes
    if (source) frames.forEach((f) => { if (f.o !== source) STYLE_SYNC.forEach((k) => { if (f.o[k] === source[k]) return; changed = true; if (f.live) f.o.set(k, source[k]); else f.o[k] = source[k]; }); });
    const full = frames.map((f) => (f.o.text || '') + (f.o.flowSep || '')).join('') + (story.overset || '');
    const tokens = full.match(/\s+|\S+\s*/g) || [];
    let at = 0;
    frames.forEach((f, k) => {
      const o = f.o, last = k === frames.length - 1, maxH = o.frameH || Infinity;
      const lo = fitCount(o, tokens, at, maxH);
      const raw = tokens.slice(at, at + lo).join(''), text = raw.trimEnd(), sep = raw.slice(text.length);
      at += lo;
      if (o.text !== text || (o.flowSep || '') !== sep) changed = true;
      if (f.live) { o.set({ text }); o.styles = {}; o.flowSep = sep; o.initDimensions(); } else { o.text = text; o.flowSep = sep; o.styles = {}; }
      if (last) { const rest = tokens.slice(at).join(''); if (rest !== story.overset) changed = true; story.overset = rest; }
    });
    // (the boxes of other pages live in their stored pages)
    if (changed) { ED.canvas.requestRenderAll(); _scheduleHistory(); ED.emit('pages'); }
  } finally { ED.reflowing = false; }
}
let reflowT;
function reflowSoon(o) { clearTimeout(reflowT); if (o?.storyId) reflowT = setTimeout(() => reflow(o.storyId, o), 250); }
const _scheduleHistory = scheduleHistory;
scheduleHistory = function () {
  _scheduleHistory();
  const a = ED.canvas?.getActiveObject();
  if (isBook() && !ED.reflowing && a?.storyId && !a.isEditing) reflowSoon(a);
};
function newFrame(x, y, w, h, opts = {}) {
  const t = new fabric.Textbox(opts.text ?? '', {
    left: x, top: y, width: Math.max(40, w), frameH: Math.max(40, h), fontSize: PT(11), fontFamily: 'Inter', fontWeight: 400, lineHeight: 1.35,
    fill: '#1a1a1a', name: 'Text box', id: uid(), storyId: opts.storyId || uid(), storyIdx: opts.storyIdx ?? 0, styles: {}, ...opts.style,
  });
  return t;
}
function frameJSON(o) { return typeof o.toObject === 'function' ? o.toObject(PROPS) : JSON.parse(JSON.stringify(o)); }
// a box at the same place (margins on facing pages) on page i, the story's next box
function frameOnPage(i, after) {
  const b = marginBox(i), style = Object.fromEntries(STYLE_SYNC.map((k) => [k, after[k]]));
  const j = frameJSON(newFrame(b.x, b.y, b.w, b.h, { storyId: after.storyId, storyIdx: (after.storyIdx ?? 0) + 1, style }));
  return j;
}
function renumber(id, list) { list.forEach((f, k) => { f.o.storyIdx = k; }); }
function addBookPage(at) {
  const P = ED.project, pg = P.pages[0], W = pg.w, H = pg.h;
  P.pages.splice(at, 0, { id: uid(), name: `Page ${at + 1}`, w: W, h: H, json: { version: '5.3.0', objects: [pageRectJSON(W, H)] } });
  if (at <= ED.pageIndex) ED.pageIndex++;
}
// continue the story on the next page (InDesign: click the out-port, place on the next page)
function continueNext(o) {
  storePage();
  const frames = storyFrames(o.storyId), lastF = frames[frames.length - 1];
  const next = lastF.pi + 1;
  if (next >= ED.project.pages.length) addBookPage(next);
  ED.project.pages[next].json.objects.push(frameOnPage(next, lastF.o));
  reflow(o.storyId); ED.emit('pages'); refreshPanel('pages');
  toast(`The story continues on page ${pageNo(next)}`);
}
// Autoflow: add pages and boxes until the whole story fits (each new box takes what is left over)
function autoflow(o) {
  reflow(o.storyId);
  const st = () => ED.project.stories?.[o.storyId];
  let guard = 0;
  while ((st()?.overset || '').trim() && guard++ < 500) {
    storePage();
    const frames = storyFrames(o.storyId), lastF = frames[frames.length - 1], next = lastF.pi + 1;
    if (next >= ED.project.pages.length || ED.project.pages[next].json.objects.some((x) => x.storyId === o.storyId)) addBookPage(next);
    const box = frameOnPage(next, lastF.o), tokens = st().overset.match(/\s+|\S+\s*/g) || [];
    const k = fitCount(box, tokens, 0, box.frameH);
    if (!k) { toast('The text box is too small for the next word', true); break; }
    const raw = tokens.slice(0, k).join(''), text = raw.trimEnd();
    Object.assign(box, { text, flowSep: raw.slice(text.length) });
    st().overset = tokens.slice(k).join('');
    ED.project.pages[next].json.objects.push(box);
  }
  _scheduleHistory(); ED.emit('pages'); refreshPanel('pages'); markDirty(); ED.canvas.requestRenderAll();
  toast(`Story placed in ${storyFrames(o.storyId).length} boxes · ${ED.project.pages.length} pages`);
}
function linkFrames(a, b) {
  if (a === b) return;
  if (b.storyId === a.storyId) return toast('Those boxes are already linked');
  const extra = (b.text || '') + (b.flowSep || '');
  const bFrames = storyFrames(b.storyId).filter((f) => f.o !== b);
  if (bFrames.length) return toast('That box is already part of another story — unlink it first', true);
  const list = storyFrames(a.storyId), at = list.findIndex((f) => f.o === a);
  b.set({ storyId: a.storyId, text: '' }); b.flowSep = '';
  b.frameH ||= b.height;
  list.splice(at + 1, 0, { o: b, live: true });
  renumber(a.storyId, list);
  const st = ((ED.project.stories ||= {})[a.storyId] ||= { overset: '' });
  st.overset = (st.overset || '') + (st.overset && extra ? ' ' : '') + extra;
  reflow(a.storyId, a);
}
function unlinkAfter(o) {
  storePage();
  const list = storyFrames(o.storyId), k = list.findIndex((f) => f.o === o);
  const rest = list.slice(k + 1); if (!rest.length) return toast('No boxes after this one');
  const st = ((ED.project.stories ||= {})[o.storyId] ||= { overset: '' });
  st.overset = rest.map((f) => (f.o.text || '') + (f.o.flowSep || '')).join('') + (st.overset || '');
  rest.forEach((f) => { const id = uid(); if (f.live) { f.o.set({ text: '' }); f.o.storyId = id; f.o.storyIdx = 0; } else { f.o.text = ''; f.o.storyId = id; f.o.storyIdx = 0; } });
  reflow(o.storyId); toast('Unlinked — the text after this box is overset (red +) until you link again');
}
async function placeText(o) {
  pickFiles('.txt,.md,text/plain', async (files) => {
    const text = (await files[0].text()).replace(/\r\n/g, '\n');
    let f = o;
    if (!f?.storyId) {
      const b = marginBox(ED.pageIndex); f = newFrame(b.x, b.y, b.w, b.h); ED.canvas.add(f);
    }
    (ED.project.stories ||= {})[f.storyId] = { overset: text };
    storyFrames(f.storyId).forEach((x) => { if (x.live) x.o.set({ text: '' }); else x.o.text = ''; x.o.flowSep = ''; });
    autoflow(f); ED.canvas.setActiveObject(f); ED.emit('selection');
  });
}

// ---------------- tools: text box, picture box, linking ----------------
function bkInit() {
  const c = ED.canvas; let drag = null;
  ED.on('tool', () => { if (ED.tool !== 'link') ED.linkFrom = null; });
  c.on('mouse:down', (opt) => {
    if (opt.e.button !== 0 || ED.spaceDown) return;
    const p = c.getPointer(opt.e);
    if (ED.tool === 'link') {
      const hit = c.getObjects().slice().reverse().find((o) => o.type === 'textbox' && !o.fromMaster && o.containsPoint(p));
      if (!hit) { ED.linkFrom = null; c.requestRenderAll(); return toast('Click a text box'); }
      if (!ED.linkFrom) { if (!hit.storyId) { hit.storyId = uid(); hit.storyIdx = 0; hit.frameH ||= hit.height; } ED.linkFrom = hit; c.requestRenderAll(); return toast('Now click the box the text continues in'); }
      const from = ED.linkFrom; linkFrames(from, hit); setTool('select'); c.setActiveObject(hit); ED.emit('selection'); return;
    }
    if (ED.tool !== 'frameText' && ED.tool !== 'frameImage') return;
    drag = { a: p, b: p }; c.requestRenderAll();
  });
  c.on('mouse:move', (opt) => { if (drag) { drag.b = c.getPointer(opt.e); ED.bookDrag = drag; c.requestRenderAll(); } });
  c.on('mouse:up', () => {
    if (!drag) return;
    const { a, b } = drag; drag = ED.bookDrag = null;
    let x = Math.min(a.x, b.x), y = Math.min(a.y, b.y), w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y);
    if (w < 10 || h < 10) { const m = marginBox(ED.pageIndex); if (ED.tool === 'frameText') ({ x, y, w, h } = { x: a.x, y: a.y, w: Math.min(m.w, m.x + m.w - a.x), h: Math.min(m.h, m.y + m.h - a.y) }); else { w = h = Math.min(m.w, m.h) / 2; } }
    let o;
    if (ED.tool === 'frameText') o = newFrame(x, y, w, h, { text: 'Type here, or use Place text… to pour a story into linked boxes.' });
    else o = new fabric.Rect({ left: x, top: y, width: w, height: h, fill: '#e9e6df', stroke: '#9aa0aa', strokeWidth: 2, strokeDashArray: [12, 8], placeholder: true, name: 'Picture box', id: uid() });
    c.add(o); setTool('select'); c.setActiveObject(o);
    if (o.type === 'textbox') { o.enterEditing(); o.selectAll(); }
    c.requestRenderAll();
  });
  // frames: resizing changes the box, not the letters
  c.on('object:scaling', (e) => {
    const o = e.target; if (!o?.frameH || o.type !== 'textbox') return;
    o.set({ width: Math.max(40, o.width * o.scaleX), frameH: Math.max(40, o.height * o.scaleY), scaleX: 1, scaleY: 1 });
    o.initDimensions();
  });
  c.on('object:modified', (e) => { if (isBook() && e.target?.storyId) reflowSoon(e.target); });
  c.on('text:editing:exited', (e) => { if (e.target?.storyId) reflow(e.target.storyId, e.target); });
  ED.overlays.push(drawBookOverlay);
}
function drawBookOverlay(ctx, v) {
  if (!isBook() && !ED.bookDrag) return;
  const tx = (x, y) => [x * v[0] + v[4], y * v[3] + v[5]], S = v[0];
  const c = ED.canvas;
  if (isBook()) {
    const P = ED.project, b = P.book, mb = marginBox(ED.pageIndex), [x, y] = tx(mb.x, mb.y);
    if (ED.bookGuides !== false) {
      ctx.strokeStyle = '#d946ef99'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, mb.w * S, mb.h * S);
      if (b.cols > 1) {
        const cw = (mb.w - b.gutter * (b.cols - 1)) / b.cols; ctx.strokeStyle = '#7c4dff99';
        for (let k = 1; k < b.cols; k++) { const gx = mb.x + k * cw + (k - 1) * b.gutter; for (const xx of [gx, gx + b.gutter]) { const [sx] = tx(xx, 0); ctx.beginPath(); ctx.moveTo(sx + 0.5, y); ctx.lineTo(sx + 0.5, y + mb.h * S); ctx.stroke(); } }
      }
      if (ED.baseline) {
        const step = PT(11) * 1.35; ctx.strokeStyle = '#5b8cff33';
        for (let yy = mb.y + step; yy < mb.y + mb.h; yy += step) { const [, sy] = tx(0, yy); ctx.beginPath(); ctx.moveTo(x, sy + 0.5); ctx.lineTo(x + mb.w * S, sy + 0.5); ctx.stroke(); }
      }
    }
    // page label
    const pg = P.pages[ED.pageIndex], [px, py] = tx(0, 0);
    ctx.fillStyle = ED.editingMaster ? '#ffc21a' : '#8b93a3'; ctx.font = '600 11px Inter';
    const label = ED.editingMaster ? `${masters().find((m) => m.id === ED.editingMaster)?.name || 'Master'} — items here show on every page using it · # = page number`
      : `Page ${pageNo(ED.pageIndex)}${b.facing ? (isLeft(ED.pageIndex) ? ' (left)' : ' (right)') : ''} · ${masterOf(pg)?.name || 'no master'}`;
    ctx.fillText(label, px, py + pg.h * S + 18);
  }
  // text frames: their box, threads between them, overset
  const frames = c.getObjects().filter((o) => o.type === 'textbox' && o.frameH && !o.fromMaster);
  frames.forEach((o) => {
    const r = o.getBoundingRect(), act = c.getActiveObject() === o || ED.linkFrom === o;
    ctx.setLineDash([4, 3]); ctx.strokeStyle = act ? '#ffc21a' : '#8b93a366'; ctx.lineWidth = 1; ctx.strokeRect(r.left + 0.5, r.top + 0.5, r.width, r.height); ctx.setLineDash([]);
    const st = ED.project.stories?.[o.storyId], list = o.storyId ? storyFrames(o.storyId) : [], last = list[list.length - 1]?.o === o;
    // in / out ports
    const port = (px, py, red, filled) => { ctx.fillStyle = '#fff'; ctx.strokeStyle = red ? '#ff3b3b' : '#5b8cff'; ctx.lineWidth = 1.2; ctx.fillRect(px - 5, py - 5, 10, 10); ctx.strokeRect(px - 5, py - 5, 10, 10);
      if (red) { ctx.beginPath(); ctx.moveTo(px - 3, py); ctx.lineTo(px + 3, py); ctx.moveTo(px, py - 3); ctx.lineTo(px, py + 3); ctx.stroke(); } else if (filled) { ctx.fillStyle = '#5b8cff'; ctx.fillRect(px - 2.5, py - 2.5, 5, 5); } };
    const k = list.findIndex((f) => f.o === o);
    port(r.left + 14, r.top, false, k > 0);
    port(r.left + r.width - 14, r.top + r.height, last && (st?.overset || '').trim(), !last);
  });
  // threads on this page
  const sel = c.getActiveObject();
  if (sel?.storyId) {
    const list = storyFrames(sel.storyId).filter((f) => f.live);
    ctx.strokeStyle = '#5b8cff'; ctx.lineWidth = 1.2;
    for (let k = 1; k < list.length; k++) {
      const a = list[k - 1].o.getBoundingRect(), b2 = list[k].o.getBoundingRect();
      ctx.beginPath(); ctx.moveTo(a.left + a.width - 14, a.top + a.height); ctx.lineTo(b2.left + 14, b2.top); ctx.stroke();
    }
  }
  if (ED.bookDrag) {
    const { a, b } = ED.bookDrag, [x1, y1] = tx(a.x, a.y), [x2, y2] = tx(b.x, b.y);
    ctx.setLineDash([5, 4]); ctx.strokeStyle = '#ffc21a'; ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
  }
}

// ---------------- Pages panel ----------------
const TEXT_STYLES = [['Body', { fontSize: 11, fontWeight: 400, lineHeight: 1.35, fontFamily: 'Inter', fontStyle: 'normal' }], ['Heading 1', { fontSize: 28, fontWeight: 800, lineHeight: 1.1, fontFamily: 'Inter', fontStyle: 'normal' }],
  ['Heading 2', { fontSize: 18, fontWeight: 700, lineHeight: 1.2, fontFamily: 'Inter', fontStyle: 'normal' }], ['Caption', { fontSize: 8, fontWeight: 500, lineHeight: 1.3, fontFamily: 'Inter', fontStyle: 'italic' }],
  ['Quote', { fontSize: 15, fontWeight: 400, lineHeight: 1.4, fontFamily: 'Georgia', fontStyle: 'italic' }], ['हिंदी पाठ', { fontSize: 12, fontWeight: 500, lineHeight: 1.5, fontFamily: 'Mukta', fontStyle: 'normal' }],
  ['हिंदी शीर्षक', { fontSize: 28, fontWeight: 400, lineHeight: 1.2, fontFamily: 'Rozha One', fontStyle: 'normal' }]];
function applyTextStyle(k) {
  const o = ED.canvas.getActiveObject(); if (!o || !o.type?.includes('text')) return toast('Select a text box first');
  const st = TEXT_STYLES[k][1];
  o.set({ ...st, fontSize: PT(st.fontSize) }); o.initDimensions();
  ensureFonts().then(() => { o.initDimensions(); ED.canvas.requestRenderAll(); if (o.storyId) reflow(o.storyId, o); });
  ED.canvas.requestRenderAll(); scheduleHistory(); renderInspector();
}
function bookForm(body) {
  const name = ED.project?.name && ED.project.pages.length > 1 ? ED.project.name : 'Untitled book';
  body.innerHTML = `<h4>New book</h4><p class="note">Magazine and book layout: pages with margins and columns, master pages with page numbers, text that flows from box to box. The book is a layer of the design: Design (below) shows its first page.</p>
    <div class="f"><label>Name</label><input id="bkName" value="${esc(name)}"></div>
    <div class="f"><label>Page size</label><select id="bkSize">${BOOK_SIZES.map(([n, w, h], i) => `<option value="${i}">${n} · ${w}×${h} mm</option>`).join('')}</select></div>
    <div class="pair"><div class="num"><b>Pages</b><input type="number" id="bkPages" value="8" min="1" max="500"></div><div class="num"><b>Start #</b><input type="number" id="bkStart" value="1" min="1"></div></div>
    <div class="f"><label>Facing pages</label><input type="checkbox" id="bkFacing" checked></div>
    <h4>Margins (mm)</h4>
    <div class="pair"><div class="num"><b>Top</b><input type="number" id="bkMt" value="20"></div><div class="num"><b>Bottom</b><input type="number" id="bkMb" value="22"></div></div>
    <div class="pair"><div class="num"><b>Inside</b><input type="number" id="bkMi" value="22"></div><div class="num"><b>Outside</b><input type="number" id="bkMo" value="16"></div></div>
    <div class="pair"><div class="num"><b>Columns</b><input type="number" id="bkCols" value="1" min="1" max="6"></div><div class="num"><b>Gutter</b><input type="number" id="bkGut" value="5"></div></div>
    <button class="btn primary full" id="bkNew">${icon('book', 'width="16" height="16"')}Create book</button>`;
  const f = () => ({ name: $('#bkName').value.trim(), size: +$('#bkSize').value, pages: +$('#bkPages').value, start: +$('#bkStart').value, facing: $('#bkFacing').checked,
    mt: +$('#bkMt').value, mb: +$('#bkMb').value, mi: +$('#bkMi').value, mo: +$('#bkMo').value, cols: +$('#bkCols').value, gutter: +$('#bkGut').value });
  $('#bkNew').onclick = () => newBook(f());
}
PANEL_FNS.pages = ['page', 'Pages', (body) => {
  if (!isBook()) return bookForm(body);
  const P = ED.project, b = P.book, cur = ED.pageIndex;
  const th = (pg) => pg.thumb ? `style="background-image:url(${pg.thumb})"` : '';
  // spreads: the first page alone on the right, then pairs (facing); one by one otherwise
  const rows = []; const n = P.pages.length;
  if (b.facing) { let i = 0; if (pageNo(0) % 2 === 1) { rows.push([null, 0]); i = 1; } for (; i < n; i += 2) rows.push([i, i + 1 < n ? i + 1 : null]); }
  else for (let i = 0; i < n; i++) rows.push([i]);
  const cell = (i) => i === null ? '<span class="bk-pg empty"></span>' : `<button class="bk-pg ${i === cur && !ED.editingMaster ? 'on' : ''}" data-pg="${i}" title="Page ${pageNo(i)}">
      <i ${th(P.pages[i])}></i><b>${pageNo(i)}</b><em>${esc(masterOf(P.pages[i])?.id || '–')}</em></button>`;
  body.innerHTML = `<h4>Masters</h4><div class="bk-masters">${masters().map((m) => `<button class="text-preset ${ED.editingMaster === m.id ? 'on' : ''}" data-ms="${m.id}">${esc(m.name)}</button>`).join('')}
      <button class="text-preset" data-msnew>+ New master</button></div>
    <div class="f"><label>This page</label><select id="bkPgMaster"><option value="">${esc(masters()[0]?.name || 'None')} (default)</option>${masters().slice(1).map((m) => `<option value="${m.id}" ${P.pages[cur].master === m.id ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}<option value="none" ${P.pages[cur].master === null ? 'selected' : ''}>None</option></select></div>
    <h4>Pages <span class="muted small" style="text-transform:none;letter-spacing:0">${n} · ${b.facing ? 'spreads' : 'single'}</span></h4>
    <div class="bk-spreads">${rows.map((r) => `<div class="bk-spread">${r.map(cell).join('')}</div>`).join('')}</div>
    <div class="btn-row" style="margin:8px 0"><button class="btn" data-bk="add">+ Page</button><button class="btn" data-bk="dup">Duplicate</button><button class="btn" data-bk="del">Delete</button></div>
    <h4>Story</h4>
    <div class="btn-row"><button class="btn" data-bk="place">Place text…</button><button class="btn" data-bk="frame">${icon('textFrame', 'width="16" height="16"')}Text box</button></div>
    <h4>Text styles</h4><div class="bk-styles">${TEXT_STYLES.map(([nm, s], i) => `<button class="text-preset" data-ts="${i}" style="font-family:'${s.fontFamily}';font-weight:${s.fontWeight};font-style:${s.fontStyle}">${nm} <span class="muted small">${s.fontSize} pt</span></button>`).join('')}</div>
    <h4>Layout</h4>
    <div class="pair"><div class="num"><b>Cols</b><input type="number" data-bs="cols" value="${b.cols}" min="1" max="6"></div><div class="num"><b>Start #</b><input type="number" data-bs="start" value="${b.start || 1}" min="1"></div></div>
    <div class="f"><label>Facing pages</label><input type="checkbox" data-bs="facing" ${b.facing ? 'checked' : ''}></div>
    <div class="f"><label>Guides</label><input type="checkbox" data-bv="guides" ${ED.bookGuides !== false ? 'checked' : ''}></div>
    <div class="f"><label>Baseline grid</label><input type="checkbox" data-bv="baseline" ${ED.baseline ? 'checked' : ''}></div>
    <p class="note">Export → All pages makes one multi-page PDF and CDR (CorelDRAW), plus AI, PSD, PNG, JPG and SVG per page.</p>`;
  $$('[data-pg]', body).forEach((el) => el.onclick = () => goPage(+el.dataset.pg));
  $$('[data-ms]', body).forEach((el) => el.onclick = () => editMaster(el.dataset.ms));
  $('[data-msnew]', body).onclick = () => {
    const id = String.fromCharCode(65 + masters().length), pg = P.pages[0];
    masters().push({ id, name: `${id}-Master`, json: { version: '5.3.0', objects: [pageRectJSON(pg.w, pg.h)] } });
    markDirty(); editMaster(id);
  };
  $('#bkPgMaster').onchange = (e) => { const v = e.target.value; P.pages[cur].master = v === 'none' ? null : v || undefined; storePage(); loadPage(cur).then(() => { markDirty(); refreshPanel('pages'); }); };
  $$('[data-bk]', body).forEach((el) => el.onclick = async () => {
    const k = el.dataset.bk, a = ED.canvas.getActiveObject();
    if (k === 'add') { storePage(); addBookPage(ED.pageIndex + 1); await loadPage(ED.pageIndex + 1); fitView(); markDirty(); }
    if (k === 'dup') await addPage(true);
    if (k === 'del') { if (confirm(`Delete page ${pageNo(cur)}?`)) await deletePage(cur); }
    if (k === 'place') placeText(a?.storyId ? a : null);
    if (k === 'frame') setTool('frameText');
    refreshPanel('pages');
  });
  $$('[data-ts]', body).forEach((el) => el.onclick = () => applyTextStyle(+el.dataset.ts));
  $$('[data-bs]', body).forEach((el) => el.onchange = () => { b[el.dataset.bs] = el.type === 'checkbox' ? el.checked : Math.max(1, +el.value | 0); storePage(); loadPage(ED.pageIndex).then(() => { markDirty(); refreshPanel('pages'); }); });
  $$('[data-bv]', body).forEach((el) => el.onchange = () => { if (el.dataset.bv === 'guides') ED.bookGuides = el.checked; else ED.baseline = el.checked; ED.canvas.requestRenderAll(); });
}];
['pages', 'page'].forEach((e) => ED.on(e, () => refreshPanel('pages')));

// ---------------- inspector: the text box's story ----------------
ED.inspHooks.push((el, objs) => {
  if (ED.mode !== 'book' || objs.length !== 1) return;
  const o = objs[0];
  if (o.type === 'textbox') {
    const list = o.storyId ? storyFrames(o.storyId) : [], k = list.findIndex((f) => f.o === o), over = (ED.project.stories?.[o.storyId]?.overset || '').trim();
    el.insertAdjacentHTML('afterbegin', sec('Text box', `<p class="muted small">${list.length > 1 ? `Box ${k + 1} of ${list.length} in this story` : 'A story of its own'}${over ? ` · <b style="color:#ff5d5d">${over.split(/\s+/).length} words overset</b>` : ''}</p>
      <div class="btn-row"><button class="btn small" data-tf="next">Continue on next page</button><button class="btn small" data-tf="flow">Autoflow</button></div>
      <div class="btn-row" style="margin-top:6px"><button class="btn small" data-tf="link">${icon('chain', 'width="14" height="14"')}Link to box…</button><button class="btn small" data-tf="unlink">${icon('unlink', 'width="14" height="14"')}Unlink after</button></div>
      <div class="btn-row" style="margin-top:6px"><button class="btn small" data-tf="place">Place text…</button>${o.frameH ? '' : '<button class="btn small" data-tf="frame">Make it a frame</button>'}${o.pageNum !== undefined || ED.editingMaster ? `<button class="btn small" data-tf="num">${o.pageNum ? 'Plain text' : 'Page number #'}</button>` : ''}</div>`));
    const ensure = () => { if (!o.storyId) { o.storyId = uid(); o.storyIdx = 0; } o.frameH ||= o.height; };
    $$('[data-tf]', el).forEach((b) => b.onclick = () => {
      const k2 = b.dataset.tf; ensure();
      if (k2 === 'next') continueNext(o); if (k2 === 'flow') autoflow(o); if (k2 === 'unlink') unlinkAfter(o); if (k2 === 'place') placeText(o);
      if (k2 === 'link') { setTool('link'); ED.linkFrom = o; ED.canvas.requestRenderAll(); toast('Now click the box the text continues in'); return; }
      if (k2 === 'frame') { o.initDimensions(); ED.canvas.requestRenderAll(); scheduleHistory(); }
      if (k2 === 'num') { o.pageNum = !o.pageNum; o.mirror = o.pageNum; if (o.pageNum && !o.text.includes('#')) o.set('text', '#'); ED.canvas.requestRenderAll(); scheduleHistory(); }
      renderInspector();
    });
  }
  if (o.placeholder) {
    el.insertAdjacentHTML('afterbegin', sec('Picture box', `<p class="muted small">Drop a photo on it, or let the AI paint one.</p>
      <button class="btn primary full" data-pb="gen">${icon('sparkles', 'width="16" height="16"')}Generative fill</button>
      <button class="btn full" style="margin-top:6px" data-pb="pick">Place photo…</button>`));
    $('[data-pb=gen]', el).onclick = () => genFromObject(o);
    $('[data-pb=pick]', el).onclick = () => pickFiles('image/*', async (files) => { const up = await uploadToLibrary(files[0]); fillPlaceholder(o, await loadImg(up.url)); scheduleHistory(); ED.emit('selection'); });
  }
});

// Book key: Ctrl+Shift+Alt+N in InDesign; here: the page-number button on a master text box, or this:
MENUS.object.push('-', ['Insert page number (#)', () => {
  const o = ED.canvas.getActiveObject();
  if (o?.type === 'textbox') { o.pageNum = true; o.mirror = true; if (!o.text.includes('#')) o.set('text', o.text + ' #'); ED.canvas.requestRenderAll(); scheduleHistory(); }
  else toast('Select a text box (on a master page it numbers every page)');
}]);

const _bootBK = bootEditor;
bootEditor = function () { if (editorReady) return; _bootBK(); bkInit(); };


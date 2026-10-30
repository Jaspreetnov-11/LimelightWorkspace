// present.js - the Present editor: PowerPoint-style slides (thumbnails, 16:9 canvas with movable text / shapes / pictures,
// themes, speaker notes, slide show). Saves real .pptx through PowerPoint.
import { $, $$, esc, ic, toast, fail, POST, btn, tbtn, group, select, color, I, frame, setDirty, fileMenu, tabsWire, ask, pickFile } from './shell.js';
import { live, layer } from './live.js';
const L = window.LLO;
const W = 960, Hh = 540;

export const THEMES = {
  limelight: { name: 'Limelight', bg: '#0a0a0a', title: '#ffc21a', text: '#f2f2f2', accent: '#ffc21a', ink: '#111111' },
  clean: { name: 'Clean', bg: '#ffffff', title: '#1f1f1f', text: '#404040', accent: '#b7472a', ink: '#ffffff' },
  bharat: { name: 'Bharat', bg: '#fffaf2', title: '#d35400', text: '#2b2b2b', accent: '#138808', ink: '#ffffff' },
  navy: { name: 'Navy', bg: '#0f1c3f', title: '#ffffff', text: '#cdd6ff', accent: '#4f8cff', ink: '#ffffff' },
  mint: { name: 'Mint', bg: '#eefaf3', title: '#0f5132', text: '#24443a', accent: '#2fbf71', ink: '#ffffff' },
  dusk: { name: 'Dusk', bg: '#2a1028', title: '#ffb36b', text: '#ffe6d5', accent: '#ff7a45', ink: '#2a1028' },
};
const LAYOUTS = {
  title: ['Title slide', (t) => [{ type: 'text', x: 80, y: 170, w: 800, h: 110, text: 'Click to add title', size: 54, bold: 1, color: t.title, align: 'center' }, { type: 'text', x: 80, y: 295, w: 800, h: 60, text: 'Subtitle', size: 24, color: t.text, align: 'center' }]],
  content: ['Title and content', (t) => [{ type: 'text', x: 60, y: 36, w: 840, h: 80, text: 'Title', size: 36, bold: 1, color: t.title }, { type: 'text', x: 60, y: 130, w: 840, h: 370, text: 'First point\nSecond point\nThird point', size: 24, color: t.text, bullets: 1 }]],
  two: ['Two content', (t) => [{ type: 'text', x: 60, y: 36, w: 840, h: 80, text: 'Title', size: 36, bold: 1, color: t.title }, { type: 'text', x: 60, y: 130, w: 405, h: 370, text: 'Point\nPoint', size: 22, color: t.text, bullets: 1 }, { type: 'text', x: 495, y: 130, w: 405, h: 370, text: 'Point\nPoint', size: 22, color: t.text, bullets: 1 }]],
  section: ['Section header', (t) => [{ type: 'shape', shape: 'rect', x: 60, y: 200, w: 12, h: 140, fill: t.accent, text: '', size: 12, color: t.ink }, { type: 'text', x: 96, y: 196, w: 800, h: 90, text: 'Section title', size: 48, bold: 1, color: t.title }, { type: 'text', x: 96, y: 290, w: 800, h: 50, text: 'A line about this section', size: 22, color: t.text }]],
  picture: ['Title and picture', (t) => [{ type: 'text', x: 60, y: 36, w: 840, h: 80, text: 'Title', size: 36, bold: 1, color: t.title }, { type: 'shape', shape: 'rect', x: 60, y: 130, w: 840, h: 370, fill: t.accent + '22', text: 'Insert → Picture', size: 20, color: t.text }]],
  blank: ['Blank', () => []],
};
const SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 44, 48, 54, 60, 72, 96];
const FONTS = ['Segoe UI', 'Calibri', 'Arial', 'Georgia', 'Bahnschrift', 'Nirmala UI', 'Times New Roman', 'Verdana'];

const newSlide = (layout, theme) => ({ bg: theme.bg, notes: '', items: LAYOUTS[layout][1](theme) });
export const TEMPLATES = {
  blank: () => ({ theme: 'clean', slides: [newSlide('title', THEMES.clean)] }),
  limelight: () => ({ theme: 'limelight', slides: [newSlide('title', THEMES.limelight), newSlide('content', THEMES.limelight)] }),
  pitch: () => {
    const t = THEMES.limelight, s = (title, pts) => ({ bg: t.bg, notes: '', items: [{ ...LAYOUTS.content[1](t)[0], text: title }, { ...LAYOUTS.content[1](t)[1], text: pts.join('\n') }] });
    return { theme: 'limelight', slides: [{ bg: t.bg, notes: '', items: [{ ...LAYOUTS.title[1](t)[0], text: '[Campaign name]' }, { ...LAYOUTS.title[1](t)[1], text: 'Proposal by Limelight' }] },
      s('The brief', ['[What the client wants]', '[Audience]', '[Timeline]']), s('Our idea', ['[Big idea in one line]', '[Why it works]']), s('Activations', ['[On-ground]', '[Digital]', '[Media]']), s('Timeline', ['[Phase 1]', '[Phase 2]', '[Phase 3]']), s('Budget', ['[Line items]', '[Total]']), s('Thank you', ['[Contact]'])] };
  },
  bharat: () => ({ theme: 'bharat', slides: [newSlide('title', THEMES.bharat), newSlide('content', THEMES.bharat)] }),
};

export async function open(view, { path, template = 'blank' }) {
  let file = null, name = 'Presentation', deck = (TEMPLATES[template] || TEMPLATES.blank)();
  if (path) {
    view.innerHTML = `<div class="loading"><span class="spin"></span>Opening in PowerPoint…</div>`;
    try { const r = await POST('/api/slides/open', { path }); file = r.path; name = r.name.replace(/\.[^.]+$/, ''); deck = { theme: '', slides: r.slides.length ? r.slides : [newSlide('title', THEMES.clean)] }; }
    catch (e) { fail(e); location.hash = 'present'; return; }
  } else if (template !== 'blank') name = template[0].toUpperCase() + template.slice(1);
  const slides = deck.slides;
  let theme = THEMES[deck.theme] || THEMES.clean, transition = deck.transition || '';
  for (const s of slides) { s.items ||= []; s.notes ||= ''; s.bg ||= '#ffffff'; }

  const parts = frame(view, { kind: 'ppt', name, tabs: ['File', 'Home', 'Insert', 'Design', 'Transitions', 'Slide Show', 'View', 'AI'], saved: !!path });
  parts.body.innerHTML = `<div class="pp"><div class="pp-thumbs" id="p-th"></div>
    <div class="pp-main"><div class="pp-stage" id="p-st"><div class="slide" id="p-sl"></div></div>
    <textarea class="pp-notes" id="p-notes" placeholder="Click to add speaker notes"></textarea></div></div>`;
  const stage = $('#p-st'), sl = $('#p-sl'), thumbs = $('#p-th'), notes = $('#p-notes');
  let cur = 0, sel = -1, editingEl = null, undo = [], redo = [], scale = 1, clip = null;

  const dirty = () => { setDirty(parts, true); drawThumbs(); };
  const snap = () => { undo.push(JSON.stringify(slides)); if (undo.length > 40) undo.shift(); redo = []; };
  const restoreSnap = (from, to) => { if (!from.length) return; to.push(JSON.stringify(slides)); const s = JSON.parse(from.pop()); slides.splice(0, slides.length, ...s); cur = Math.min(cur, slides.length - 1); sel = -1; dirty(); drawSlide(); };

  // ---------- drawing ----------
  const CLIP = { tri: 'polygon(50% 0,100% 100%,0 100%)', arrow: 'polygon(0 30%,62% 30%,62% 0,100% 50%,62% 100%,62% 70%,0 70%)', star: 'polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)' };
  function itemHtml(it, i, live) {
    const box = `left:${it.x}px;top:${it.y}px;width:${it.w}px;height:${it.h}px`;
    const hd = live ? handles() : '';
    if (it.type === 'image') return `<div class="it img" data-i="${i}" style="${box}"><img src="${it.src}" draggable="false">${hd}</div>`;
    if (it.type === 'line') return `<div class="it line" data-i="${i}" style="${box}"><svg viewBox="0 0 ${Math.max(1, it.w)} ${Math.max(1, it.h)}" preserveAspectRatio="none"><line x1="0" y1="${it.flip ? it.h : 0}" x2="${it.w}" y2="${it.flip ? 0 : it.h}" stroke="${it.color || '#333'}" stroke-width="${it.weight || 3}" vector-effect="non-scaling-stroke"/></svg>${hd}</div>`;
    const font = `font-size:${it.size || 20}px;color:${it.color || '#000'};font-family:'${it.font || 'Segoe UI'}','Nirmala UI',sans-serif;`;
    if (it.type === 'table') return `<div class="it table" data-i="${i}" style="${box}"><table class="ptable" style="${font}">${(it.rows || []).map((r, ri) => `<tr>${r.map((c) => `<${ri ? 'td' : 'th'}>${esc(c)}</${ri ? 'td' : 'th'}>`).join('')}</tr>`).join('')}</table>${hd}</div>`;
    const txt = `${font}text-align:${it.align || 'left'};${it.bold ? 'font-weight:700;' : ''}${it.italic ? 'font-style:italic;' : ''}${it.underline ? 'text-decoration:underline;' : ''}${it.lh ? `line-height:${it.lh * 1.2};` : ''}`;
    const lines = String(it.text ?? '').split('\n').map((l) => `<div>${esc(l) || '<br>'}</div>`).join('');
    const shape = it.type === 'shape' ? `background:${it.fill};border-radius:${it.shape === 'oval' ? '50%' : it.shape === 'round' ? '18px' : '0'};${CLIP[it.shape] ? `clip-path:${CLIP[it.shape]};justify-content:center;` : ''}${it.outline ? `box-shadow:inset 0 0 0 3px ${it.outline};` : ''}` : '';
    return `<div class="it ${it.type}" data-i="${i}" style="${box};${shape}"><div class="tx${it.bullets ? ' bul' : ''}" style="${txt}">${lines}</div>${hd}</div>`;
  }
  const handles = () => '<i class="h nw" data-h="nw"></i><i class="h ne" data-h="ne"></i><i class="h sw" data-h="sw"></i><i class="h se" data-h="se"></i>';
  const slideHtml = (s, live) => s.items.map((it, i) => itemHtml(it, i, live)).join('');
  const bgCss = (s) => (s.bgImg ? `${s.bg} url(${s.bgImg}) center/cover no-repeat` : s.bg);
  function fit() {
    const r = stage.getBoundingClientRect();
    scale = Math.min((r.width - 40) / W, (r.height - 30) / Hh);
    sl.style.transform = `scale(${scale})`;
    sl.style.left = `${(r.width - W * scale) / 2}px`; sl.style.top = `${(r.height - Hh * scale) / 2}px`;
  }
  function drawSlide() {
    const s = slides[cur];
    sl.style.background = bgCss(s);
    sl.innerHTML = slideHtml(s, true);
    $$('.it', sl).forEach((el) => el.classList.toggle('on', +el.dataset.i === sel));
    notes.value = s.notes || '';
    fit(); drawThumbs(); syncRibbon();
    parts.status.innerHTML = `<span>Slide ${cur + 1} of ${slides.length}</span><span class="grow"></span><span>${theme.name ? `Theme: ${theme.name}` : ''}</span><span>16:9</span>`;
  }
  let thumbTimer = 0;
  function drawThumbs() {
    clearTimeout(thumbTimer);
    thumbTimer = setTimeout(() => {
      thumbs.innerHTML = slides.map((s, i) => `<div class="th${i === cur ? ' on' : ''}" data-s="${i}"><span>${i + 1}</span><div class="mini"><div class="slide" style="background:${bgCss(s)}">${slideHtml(s, false)}</div></div></div>`).join('')
        + `<button class="th-add" id="p-add">${ic('plus')}New slide</button>`;
      $$('.th', thumbs).forEach((t) => (t.onclick = () => go(+t.dataset.s)));
      $('#p-add').onclick = () => addSlide('content');
      thumbs.querySelector('.th.on')?.scrollIntoView({ block: 'nearest' });
    }, 60);
  }
  const go = (i) => { endEdit(); cur = Math.max(0, Math.min(slides.length - 1, i)); sel = -1; drawSlide(); };
  function addSlide(layout, at = cur + 1) { snap(); slides.splice(at, 0, newSlide(layout, theme)); cur = at; sel = -1; dirty(); drawSlide(); }
  new ResizeObserver(fit).observe(stage);

  // ---------- select, move, resize, edit ----------
  const item = () => slides[cur].items[sel];
  const pick = (i) => { sel = i; $$('.it', sl).forEach((el) => el.classList.toggle('on', +el.dataset.i === sel)); syncRibbon(); };
  sl.addEventListener('mousedown', (e) => {
    const el = e.target.closest('.it');
    if (editingEl && el && el.contains(editingEl)) return; // clicking inside the text being edited
    endEdit();
    if (!el) { pick(-1); return; }
    e.preventDefault();
    const i = +el.dataset.i, it = slides[cur].items[i], h = e.target.dataset.h;
    pick(i);
    const x0 = e.clientX, y0 = e.clientY, start = { ...it };
    let moved = false;
    const mv = (ev) => {
      const dx = (ev.clientX - x0) / scale, dy = (ev.clientY - y0) / scale;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 2) return;
      if (!moved) { snap(); moved = true; }
      if (!h) { it.x = Math.round(start.x + dx); it.y = Math.round(start.y + dy); }
      else {
        if (h.includes('e')) it.w = Math.max(20, Math.round(start.w + dx));
        if (h.includes('s')) it.h = Math.max(16, Math.round(start.h + dy));
        if (h.includes('w')) { it.w = Math.max(20, Math.round(start.w - dx)); it.x = Math.round(start.x + start.w - it.w); }
        if (h.includes('n')) { it.h = Math.max(16, Math.round(start.h - dy)); it.y = Math.round(start.y + start.h - it.h); }
        if (it.type === 'image' && ev.shiftKey === false && (h === 'se' || h === 'nw' || h === 'ne' || h === 'sw')) { it.h = Math.round(it.w * start.h / start.w); if (h.includes('n')) it.y = Math.round(start.y + start.h - it.h); }
      }
      Object.assign(el.style, { left: `${it.x}px`, top: `${it.y}px`, width: `${it.w}px`, height: `${it.h}px` });
    };
    const up = () => { removeEventListener('mousemove', mv); removeEventListener('mouseup', up); if (moved) dirty(); };
    addEventListener('mousemove', mv); addEventListener('mouseup', up);
  });
  sl.addEventListener('dblclick', (e) => { const el = e.target.closest('.it'); if (el && !el.classList.contains('img') && !el.classList.contains('line')) startEdit(el); });
  function startEdit(el) {
    const tx = $('.tx', el) || $('table', el); if (!tx) return;
    snap(); editingEl = tx; el.classList.add('editing');
    tx.contentEditable = 'true'; tx.focus();
    const r = document.createRange(); r.selectNodeContents(tx); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  }
  function endEdit() {
    if (!editingEl) return;
    const el = editingEl.closest('.it'), it = slides[cur].items[+el.dataset.i];
    if (editingEl.tagName === 'TABLE') {
      const rows = [...editingEl.rows].map((r) => [...r.cells].map((c) => c.innerText.trim()));
      editingEl.contentEditable = 'false'; el.classList.remove('editing'); editingEl = null;
      if (it && JSON.stringify(rows) !== JSON.stringify(it.rows)) { it.rows = rows; dirty(); } else undo.pop();
      return;
    }
    const text = editingEl.innerText.replace(/\n$/, '');
    editingEl.contentEditable = 'false'; el.classList.remove('editing'); editingEl = null;
    if (it && it.text !== text) { it.text = text; dirty(); } else undo.pop();
  }
  notes.oninput = () => { slides[cur].notes = notes.value; setDirty(parts, true); };

  document.onkeydown = (e) => {
    if (!document.body.contains(sl)) { document.onkeydown = null; return; }
    if (e.target.closest?.('input, textarea, select, [contenteditable="true"]')) { if (e.key === 'Escape' && editingEl) { endEdit(); pick(sel); } return; }
    const ctrl = e.ctrlKey || e.metaKey, k = e.key;
    if (ctrl && k.toLowerCase() === 's') { e.preventDefault(); return save(); }
    if (ctrl && k.toLowerCase() === 'z') { e.preventDefault(); return restoreSnap(undo, redo); }
    if (ctrl && k.toLowerCase() === 'y') { e.preventDefault(); return restoreSnap(redo, undo); }
    if (k === 'F5') { e.preventDefault(); return show(e.shiftKey ? cur : 0); }
    if (k === 'PageDown') return go(cur + 1);
    if (k === 'PageUp') return go(cur - 1);
    if (sel < 0) { if (k === 'ArrowDown' || k === 'ArrowRight') go(cur + 1); if (k === 'ArrowUp' || k === 'ArrowLeft') go(cur - 1); if (ctrl && k.toLowerCase() === 'v' && clip) paste(); return; }
    const it = item();
    if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); snap(); slides[cur].items.splice(sel, 1); sel = -1; dirty(); return drawSlide(); }
    const nud = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[k];
    if (nud) { e.preventDefault(); snap(); it.x += nud[0] * (e.shiftKey ? 10 : 2); it.y += nud[1] * (e.shiftKey ? 10 : 2); dirty(); return drawSlide(); }
    if (k === 'Enter' || k === 'F2') { e.preventDefault(); const el = $(`.it[data-i="${sel}"]`, sl); if (el) startEdit(el); return; }
    if (ctrl && k.toLowerCase() === 'd') { e.preventDefault(); snap(); slides[cur].items.push({ ...it, x: it.x + 20, y: it.y + 20 }); sel = slides[cur].items.length - 1; dirty(); return drawSlide(); }
    if (ctrl && k.toLowerCase() === 'c') { clip = JSON.stringify(it); return; }
    if (ctrl && k.toLowerCase() === 'v' && clip) return paste();
    if (k === 'Escape') pick(-1);
  };
  function paste() { snap(); const it = JSON.parse(clip); it.x += 20; it.y += 20; slides[cur].items.push(it); sel = slides[cur].items.length - 1; dirty(); drawSlide(); }

  // ---------- changes from the ribbon ----------
  function setItem(fn) { const it = item(); if (!it) return toast('Select a text box or shape first', true); snap(); fn(it); dirty(); const s = sel; drawSlide(); pick(s); }
  function addItem(it) { snap(); slides[cur].items.push(it); sel = slides[cur].items.length - 1; dirty(); drawSlide(); }
  function applyTheme(key) {
    const t = THEMES[key]; snap(); theme = t;
    for (const s of slides) {
      s.bg = t.bg;
      for (const it of s.items) {
        if (it.type === 'text') it.color = it.bold && (it.size || 0) >= 30 ? t.title : t.text;
        if (it.type === 'shape') { it.fill = t.accent; it.color = t.ink; }
      }
    }
    dirty(); drawSlide();
  }
  function syncRibbon() {
    const it = item();
    for (const k of ['bold', 'italic', 'underline', 'bullets']) $(`[data-cmd="${k}"]`, parts.ribbon)?.classList.toggle('on', !!it?.[k]);
    $$('[data-tr]', parts.ribbon).forEach((b) => b.classList.toggle('on', b.dataset.tr === transition));
    for (const [k, a] of [['al', 'left'], ['ac', 'center'], ['ar', 'right']]) $(`[data-cmd="${k}"]`, parts.ribbon)?.classList.toggle('on', (it?.align || 'left') === a && !!it);
    const z = $('[data-sel="size"]', parts.ribbon); if (z) z.value = it?.size && SIZES.includes(it.size) ? it.size : '';
    const f = $('[data-sel="font"]', parts.ribbon); if (f) f.value = it?.font && FONTS.includes(it.font) ? it.font : 'Segoe UI';
    const bg = $('[data-color="bg"]', parts.ribbon); if (bg) { bg.value = slides[cur].bg.slice(0, 7); $('[data-swatch="bg"]').style.background = slides[cur].bg; }
  }

  // ---------- slide show ----------
  function show(from = 0) {
    endEdit();
    const ov = document.createElement('div'); ov.className = 'pp-show';
    ov.innerHTML = `<div class="slide" id="ss"></div><div class="ss-hint">← → to move · Esc to exit</div>`;
    document.body.append(ov);
    let i = from;
    const ss = $('#ss', ov);
    const paint = () => { ss.style.background = bgCss(slides[i]); ss.innerHTML = slideHtml(slides[i], false); if (transition) { ss.classList.remove('tr-fade', 'tr-push', 'tr-wipe', 'tr-zoom'); void ss.offsetWidth; ss.classList.add(`tr-${transition}`); } const k = Math.min(innerWidth / W, innerHeight / Hh); ss.style.transform = `scale(${k})`; ss.style.left = `${(innerWidth - W * k) / 2}px`; ss.style.top = `${(innerHeight - Hh * k) / 2}px`; };
    const close = () => { removeEventListener('keydown', key, true); removeEventListener('resize', paint); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); ov.remove(); };
    const key = (e) => { e.stopPropagation(); e.preventDefault(); if (e.key === 'Escape') close(); else if (['ArrowRight', 'ArrowDown', ' ', 'PageDown', 'Enter'].includes(e.key)) { if (i < slides.length - 1) { i++; paint(); } else close(); } else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key) && i > 0) { i--; paint(); } };
    ov.onclick = () => { if (i < slides.length - 1) { i++; paint(); } else close(); };
    addEventListener('keydown', key, true); addEventListener('resize', paint);
    ov.requestFullscreen?.().catch(() => {}).finally(paint);
    paint();
  }

  // ---------- ribbon ----------
  const render = (t) => ({
    Home: group('Slides', btn('newSlide', I.slideAdd, 'New slide', { big: true }) + `<div class="rcol">${select('layout', Object.entries(LAYOUTS).map(([k, v]) => [k, v[0]]), 'Layout for new slides', 140)}<div class="rrow">${btn('dupSlide', I.dup, '', { title: 'Duplicate slide' })}${btn('delSlide', I.del, '', { title: 'Delete slide' })}${btn('upSlide', ic('up'), '', { title: 'Move slide up' })}${btn('downSlide', ic('dl'), '', { title: 'Move slide down' })}</div></div>`)
      + group('Font', `<div class="rrow">${select('font', FONTS, 'Font', 120)}${select('size', [['', '—'], ...SIZES.map((x) => [x, x])], 'Font size', 58)}${tbtn('bigger', 'A+', 'Bigger')}${tbtn('smaller', 'A−', 'Smaller')}</div><div class="rrow">${btn('bold', I.bold, '', { title: 'Bold' })}${btn('italic', I.italic, '', { title: 'Italic' })}${btn('underline', I.under, '', { title: 'Underline' })}${color('color', I.color, 'Font colour', '#c00000')}</div>`)
      + group('Paragraph', `<div class="rrow">${btn('bullets', I.ul, '', { title: 'Bullets' })}${select('lh', [['', 'Line'], ['1', '1.0'], ['1.2', '1.2'], ['1.5', '1.5'], ['2', '2.0']], 'Line spacing', 60)}</div><div class="rrow">${btn('al', I.left, '', { title: 'Left' })}${btn('ac', I.center, '', { title: 'Center' })}${btn('ar', I.right, '', { title: 'Right' })}</div>`)
      + group('Drawing', `<div class="rrow">${btn('text', I.text, '', { title: 'Text box' })}${btn('rect', I.rect, '', { title: 'Rectangle' })}${btn('round', I.round, '', { title: 'Rounded rectangle' })}${btn('oval', I.oval, '', { title: 'Oval' })}${btn('tri', I.tri, '', { title: 'Triangle' })}${btn('arrow', I.arrow, '', { title: 'Arrow' })}${btn('star', I.star, '', { title: 'Star' })}${btn('line', I.line, '', { title: 'Line' })}</div><div class="rrow">${color('fill', I.fill, 'Shape fill', theme.accent)}${color('outline', I.outline, 'Shape outline', '#ffffff')}${btn('noOutline', I.clear, '', { title: 'No outline' })}${btn('front', I.front, '', { title: 'Bring to front' })}${btn('back', I.back, '', { title: 'Send to back' })}${btn('delItem', I.del, '', { title: 'Delete selected' })}</div>`)
      + group('Arrange', `<div class="rrow">${btn('aL', I.aLeft, '', { title: 'Align left on slide' })}${btn('aC', I.aCenter, '', { title: 'Centre on slide' })}${btn('aR', I.aRight, '', { title: 'Align right on slide' })}</div><div class="rrow">${btn('aT', I.aTop, '', { title: 'Align top' })}${btn('aM', I.aMiddle, '', { title: 'Middle' })}${btn('aB', I.aBottom, '', { title: 'Align bottom' })}</div>`),
    Insert: group('Slides', btn('newSlide', I.slideAdd, 'New slide', { big: true }))
      + group('Tables', btn('tbl', I.table, 'Table', { big: true }))
      + group('Images', btn('pic', I.image, 'Picture', { big: true }) + btn('bgPic', I.image, 'Background picture', { big: true }))
      + group('Shapes', btn('rect', I.rect, 'Rectangle', { big: true }) + btn('round', I.round, 'Rounded', { big: true }) + btn('oval', I.oval, 'Oval', { big: true }) + btn('tri', I.tri, 'Triangle', { big: true }) + btn('arrow', I.arrow, 'Arrow', { big: true }) + btn('star', I.star, 'Star', { big: true }) + btn('line', I.line, 'Line', { big: true }))
      + group('Text', btn('text', I.text, 'Text box', { big: true }) + btn('slnum', I.ol, 'Slide number', { big: true }) + btn('date', I.date, 'Date', { big: true })),
    Design: group('Themes', `<div class="themes">${Object.entries(THEMES).map(([k, t]) => `<button class="thm" data-theme="${k}" title="${t.name}" style="background:${t.bg}"><b style="color:${t.title}">Aa</b><i style="background:${t.accent}"></i><small>${t.name}</small></button>`).join('')}</div>`)
      + group('Background', `<div class="rrow">${color('bg', I.fill, 'This slide’s background', slides[cur].bg.slice(0, 7))}${btn('bgAll', I.theme, 'Apply to all', { title: 'Use this background on every slide' })}</div><div class="rrow">${btn('bgPic', I.image, 'Picture')}${btn('bgNone', I.clear, 'No picture')}</div>`),
    Transitions: group('Transition to every slide', ['', 'fade', 'push', 'wipe', 'zoom'].map((k) => `<button class="rb big" data-tr="${k}">${k ? I.fade : I.clear}<span>${k ? k[0].toUpperCase() + k.slice(1) : 'None'}</span></button>`).join('')) + group('Preview', btn('show0', I.play, 'Play', { big: true })),
    'Slide Show': group('Start', btn('show0', I.play, 'From beginning', { big: true }) + btn('showCur', I.playCur, 'From current slide', { big: true })),
    View: group('Views', btn('normal', I.slideAdd, 'Normal', { big: true }) + btn('sorter', I.sorter, 'Slide sorter', { big: true })) + group('Show', btn('notesTog', I.text, 'Notes', { big: true })),
    AI: group('Create', btn('aiDeck', ic('spark'), 'Draft deck with AI', { big: true }) + btn('aiSlide', ic('spark'), 'Add a slide on…', { big: true }))
      + group('This slide', btn('aiRewrite', ic('wand'), 'Improve text', { big: true }) + btn('aiHindi', ic('wand'), 'To Hindi', { big: true }) + btn('aiNotes', ic('wand'), 'Speaker notes', { big: true })),
  })[t] || '';
  function sorter() {
    const m = L.modal(`<h2>${I.sorter} Slide sorter</h2><div class="sorter">${slides.map((s, i) => `<button class="srt${i === cur ? ' on' : ''}" data-s="${i}"><div class="mini"><div class="slide" style="background:${bgCss(s)}">${slideHtml(s, false)}</div></div><span>${i + 1}</span></button>`).join('')}</div><div class="foot"><span class="faint grow" style="font-size:12.5px">Click a slide to open it</span><button class="btn" data-close>Close</button></div>`, { wide: true });
    $$('[data-s]', m).forEach((b) => (b.onclick = () => { L.closeModal(); go(+b.dataset.s); }));
  }
  const outline = (txt) => {
    const out = []; let s = null;
    for (const raw of txt.replace(/\r/g, '').split('\n')) {
      const l = raw.trim(); if (!l) continue; let m;
      if ((m = l.match(/^#+\s*(.*)/))) { s = { title: m[1].replace(/^slide\s*\d+[:.)-]?\s*/i, '').replace(/\*\*/g, ''), bullets: [] }; out.push(s); }
      else if (s) s.bullets.push(l.replace(/^[-*•\d.)]+\s*/, '').replace(/\*\*/g, ''));
    }
    return out;
  };
  const contentSlide = (o) => { const s = newSlide('content', theme); s.items[0].text = o.title; s.items[1].text = o.bullets.slice(0, 6).join('\n') || ' '; return s; };
  async function aiBusy(b, fn) { const old = b.innerHTML; b.disabled = true; b.innerHTML = '<span class="spin"></span><span>Working…</span>'; try { await fn(); } catch (e) { fail(e); } b.disabled = false; b.innerHTML = old; }
  function bind() {
    $$('[data-cmd]', parts.ribbon).forEach((b) => {
      b.onmousedown = (e) => e.preventDefault();
      b.onclick = async () => {
        const k = b.dataset.cmd;
        const lay = $('[data-sel="layout"]', parts.ribbon)?.value || 'content';
        if (k === 'newSlide') return addSlide(lay);
        if (k === 'dupSlide') { snap(); slides.splice(cur + 1, 0, JSON.parse(JSON.stringify(slides[cur]))); cur++; dirty(); return drawSlide(); }
        if (k === 'delSlide') { if (slides.length < 2) return toast('A deck needs one slide', true); snap(); slides.splice(cur, 1); cur = Math.min(cur, slides.length - 1); sel = -1; dirty(); return drawSlide(); }
        if (k === 'upSlide' && cur > 0) { snap(); [slides[cur - 1], slides[cur]] = [slides[cur], slides[cur - 1]]; cur--; dirty(); return drawSlide(); }
        if (k === 'downSlide' && cur < slides.length - 1) { snap(); [slides[cur + 1], slides[cur]] = [slides[cur], slides[cur + 1]]; cur++; dirty(); return drawSlide(); }
        if (k === 'bold' || k === 'italic' || k === 'bullets') return setItem((it) => { it[k] = it[k] ? 0 : 1; });
        if (k === 'al' || k === 'ac' || k === 'ar') return setItem((it) => { it.align = { al: 'left', ac: 'center', ar: 'right' }[k]; });
        if (k === 'bigger' || k === 'smaller') return setItem((it) => { it.size = Math.max(6, Math.round((it.size || 20) * (k === 'bigger' ? 1.15 : 0.87))); });
        if (k === 'text') return addItem({ type: 'text', x: 280, y: 220, w: 400, h: 70, text: 'Your text here', size: 24, color: theme.text });
        if (['rect', 'round', 'oval', 'tri', 'arrow', 'star'].includes(k)) return addItem({ type: 'shape', shape: k, x: 360, y: 190, w: k === 'arrow' ? 260 : 200, h: k === 'arrow' ? 120 : 180, fill: theme.accent, text: '', size: 20, color: theme.ink, align: 'center' });
        if (k === 'line') return addItem({ type: 'line', x: 280, y: 270, w: 400, h: 0, color: theme.text, weight: 3 });
        if (k === 'tbl') { const r = +prompt('Rows', '4') || 0, c = +prompt('Columns', '3') || 0; if (r < 1 || c < 1) return; return addItem({ type: 'table', x: 80, y: 140, w: 800, h: 40 * r, size: 18, color: theme.text, rows: Array.from({ length: r }, (_, ri) => Array.from({ length: c }, (_, ci) => (ri ? '' : `Heading ${ci + 1}`))) }); }
        if (k === 'slnum') return addItem({ type: 'text', x: 860, y: 495, w: 80, h: 30, text: String(cur + 1), size: 14, color: theme.text, align: 'right' });
        if (k === 'date') return addItem({ type: 'text', x: 20, y: 495, w: 260, h: 30, text: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }), size: 14, color: theme.text });
        if (k === 'underline') return setItem((it) => { it.underline = it.underline ? 0 : 1; });
        if (k === 'noOutline') return setItem((it) => { delete it.outline; });
        if (['aL', 'aC', 'aR', 'aT', 'aM', 'aB'].includes(k)) return setItem((it) => { if (k === 'aL') it.x = 40; if (k === 'aC') it.x = Math.round((W - it.w) / 2); if (k === 'aR') it.x = W - 40 - it.w; if (k === 'aT') it.y = 30; if (k === 'aM') it.y = Math.round((Hh - it.h) / 2); if (k === 'aB') it.y = Hh - 30 - it.h; });
        if (k === 'bgPic') { const f = await pickFile('image/*'); if (!f) return; snap(); slides[cur].bgImg = f.data; dirty(); return drawSlide(); }
        if (k === 'bgNone') { snap(); delete slides[cur].bgImg; dirty(); return drawSlide(); }
        if (k === 'sorter') return sorter();
        if (k === 'normal') return drawSlide();
        if (k === 'notesTog') { notes.hidden = !notes.hidden; return fit(); }
        if (k === 'pic') {
          const f = await pickFile('image/*'); if (!f) return;
          const img = new Image(); img.onload = () => { const w = Math.min(560, img.width), h = Math.round(w * img.height / img.width); addItem({ type: 'image', x: Math.round((W - w) / 2), y: Math.max(20, Math.round((Hh - h) / 2)), w, h, src: f.data }); }; img.src = f.data; return;
        }
        if (k === 'front' || k === 'back') return setItem(() => { const arr = slides[cur].items, [it] = arr.splice(sel, 1); if (k === 'front') { arr.push(it); sel = arr.length - 1; } else { arr.unshift(it); sel = 0; } });
        if (k === 'delItem') { if (sel < 0) return; snap(); slides[cur].items.splice(sel, 1); sel = -1; dirty(); return drawSlide(); }
        if (k === 'bgAll') { snap(); for (const s of slides) s.bg = slides[cur].bg; dirty(); return drawSlide(); }
        if (k === 'show0') return show(0);
        if (k === 'showCur') return show(cur);
        if (k === 'aiDeck') {
          const brief = prompt('What is the deck about? e.g. “MY Bharat youth volunteering campaign pitch, 8 slides”'); if (!brief) return;
          return aiBusy(b, async () => {
            const o = outline(await ask(brief, 'Write a presentation outline. Format exactly: each slide starts with "# Slide title" followed by 3-5 lines "- short point". 6-10 slides, the first is the title slide (its points = subtitle). No other text.'));
            if (!o.length) return toast('AI gave no slides — try again', true);
            snap();
            const first = newSlide('title', theme); first.items[0].text = o[0].title; first.items[1].text = o[0].bullets[0] || '';
            slides.splice(0, slides.length, first, ...o.slice(1).map(contentSlide)); cur = 0; sel = -1; dirty(); drawSlide();
          });
        }
        if (k === 'aiSlide') {
          const topic = prompt('Slide about what?'); if (!topic) return;
          return aiBusy(b, async () => { const o = outline(await ask(`Deck so far: ${slides.map((s) => s.items[0]?.text).join(' | ')}\nNew slide topic: ${topic}`, 'Write ONE slide: "# Title" then 3-5 lines "- point". Nothing else.')); if (!o[0]) return; snap(); slides.splice(cur + 1, 0, contentSlide(o[0])); cur++; dirty(); drawSlide(); });
        }
        if (k === 'aiRewrite' || k === 'aiHindi') {
          const it = item(); if (!it || it.type === 'image') return toast('Select a text box first', true);
          return aiBusy(b, async () => { const r = await POST('/api/assist', { tool: k === 'aiHindi' ? 'hindi' : 'rewrite', text: it.text, extra: 'This is text on a presentation slide: keep it short, keep the same number of lines.' }); setItem((x) => { x.text = r.reply.replace(/^[-*•]\s*/gm, ''); }); });
        }
        if (k === 'aiNotes') return aiBusy(b, async () => {
          const txt = slides[cur].items.filter((x) => x.text).map((x) => x.text).join('\n');
          const r = await ask(txt, 'Write short speaker notes (4-6 sentences, natural spoken style) for a slide with this text. Only the notes.');
          slides[cur].notes = r; notes.value = r; setDirty(parts, true);
        });
      };
    });
    $$('[data-theme]', parts.ribbon).forEach((b) => (b.onclick = () => applyTheme(b.dataset.theme)));
    $$('[data-tr]', parts.ribbon).forEach((b) => (b.onclick = () => { transition = b.dataset.tr; setDirty(parts, true); syncRibbon(); toast(transition ? `${transition} transition on every slide` : 'No transition'); }));
    $$('[data-sel]', parts.ribbon).forEach((s) => (s.onchange = () => {
      if (s.dataset.sel === 'size' && s.value) setItem((it) => { it.size = +s.value; });
      if (s.dataset.sel === 'font') setItem((it) => { it.font = s.value; });
      if (s.dataset.sel === 'lh' && s.value) { setItem((it) => { it.lh = +s.value; }); s.value = ''; }
    }));
    $$('[data-color]', parts.ribbon).forEach((ci) => (ci.oninput = () => {
      $(`[data-swatch="${ci.dataset.color}"]`).style.background = ci.value;
      if (ci.dataset.color === 'color') setItem((it) => { it.color = ci.value; });
      if (ci.dataset.color === 'fill') setItem((it) => { if (it.type !== 'shape') return; it.fill = ci.value; });
      if (ci.dataset.color === 'outline') setItem((it) => { if (it.type === 'line') it.color = ci.value; else if (it.type === 'shape') it.outline = ci.value; });
      if (ci.dataset.color === 'bg') { slides[cur].bg = ci.value; sl.style.background = ci.value; dirty(); }
    }));
    syncRibbon();
  }
  tabsWire(parts, render, bind);

  // ---------- save ----------
  async function save({ quiet = false, pdf = false, copyName } = {}) {
    endEdit();
    const nm = (copyName || parts.name.value).trim() || 'Presentation';
    $('#ed-save').disabled = true;
    try {
      const r = await POST('/api/slides/save', { path: copyName ? null : file, name: nm, slides: slides.map((s) => ({ ...s, bg: s.bg.slice(0, 7), items: s.items.map((it) => ({ ...it, fill: it.fill?.slice(0, 7) })) })), transition, pdf });
      if (!copyName) { file = r.file; parts.name.value = r.file.split('\\').pop().replace(/\.pptx$/i, ''); setDirty(parts, false); }
      if (!quiet) toast(`Saved · ${r.file.split('\\').pop()}`);
      return r;
    } catch (e) { fail(e); return null; } finally { $('#ed-save').disabled = false; }
  }
  $('#ed-save').onclick = () => save();
  $('#ed-office').onclick = async () => { const r = file && !window.__lloDirty ? { file } : await save({ quiet: true }); if (r) L.openLocal(r.file); };
  parts.name.oninput = () => setDirty(parts, true);
  parts.onFile = () => fileMenu(parts, { save, kindLabel: 'PowerPoint' });
  parts.extra.innerHTML = `<button class="btn sm" id="p-play">${I.play}Present</button>`;
  $('#p-play').onclick = () => show(cur);

  // ---------- editing together (live.js): every slide travels on its own, plus the theme and transition ----------
  live(parts, {
    file: () => file,
    units() {
      const u = { '@n': String(slides.length), '@t': transition, '@th': Object.keys(THEMES).find((k) => THEMES[k] === theme) || '' };
      slides.forEach((s, i) => { u[`s${i}`] = JSON.stringify(s); });
      return u;
    },
    apply(u) {
      if (u['@n'] != null) { const n = +u['@n']; while (slides.length < n) slides.push(newSlide('content', theme)); slides.length = n; }
      for (const [k, v] of Object.entries(u)) {
        const m = k.match(/^s(\d+)$/); if (!m || v == null || +m[1] >= slides.length) continue;
        const s = JSON.parse(v); s.items ||= []; s.notes ||= ''; s.bg ||= '#ffffff'; slides[+m[1]] = s;
      }
      if (u['@t'] != null) transition = u['@t'];
      if (u['@th'] && THEMES[u['@th']]) theme = THEMES[u['@th']];
      cur = Math.min(cur, slides.length - 1); if (sel >= slides[cur].items.length) sel = -1;
      drawSlide();
    },
    // (others' changes wait while I type in a text box or the notes)
    busy: () => !!editingEl || document.activeElement === notes,
    cursor: () => ({ s: cur, i: sel }),
    drawPeers(peers) {
      const lt = layer(thumbs), ls = layer(stage);
      for (const p of peers) {
        const th = $(`.th[data-s="${p.cur?.s}"]`, thumbs);
        if (th) lt.add('co-cell', th.getBoundingClientRect(), p, true);
        const it = p.cur?.s === cur && p.cur.i >= 0 && $(`.it[data-i="${p.cur.i}"]`, sl);
        if (it) ls.add('co-cell', it.getBoundingClientRect(), p, true);
      }
    },
    saved: (f) => { if (f) file = f; },
  });

  drawSlide();
}

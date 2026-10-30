// document.js - the Document editor: a Word-style ribbon over an A4 page. Saves real .docx through Microsoft Word.
import { $, $$, esc, ic, toast, fail, POST, btn, tbtn, group, select, color, I, frame, setDirty, fileMenu, tabsWire, ask, pickFile, findBar } from './shell.js';
import { live, layer } from './live.js';
const L = window.LLO;

const FONTS = ['Calibri', 'Arial', 'Times New Roman', 'Georgia', 'Segoe UI', 'Verdana', 'Cambria', 'Garamond', 'Nirmala UI', 'Mangal', 'Kokila', 'Courier New'];
const SIZES = [8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];
const STYLES = [['p', 'Normal', ''], ['title', 'Title', 'font-size:26px;font-weight:300'], ['h1', 'Heading 1', 'font-size:19px;color:#2f5496'], ['h2', 'Heading 2', 'font-size:16px;color:#2f5496'],
  ['h3', 'Heading 3', 'font-size:14px;color:#1f3763'], ['blockquote', 'Quote', 'font-style:italic;color:#555']];
export const TEMPLATES = {
  blank: '<p><br></p>',
  letter: `<p style="text-align:right">Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p><p>To,<br>[Name]<br>[Designation]<br>[Organisation, Address]</p><p><b>Subject: [Subject of the letter]</b></p><p>Respected Sir / Madam,</p><p>[Body of the letter]</p><p>Thanking you,</p><p>Yours sincerely,<br><br>[Name]<br>Limelight</p>`,
  proposal: '<h1 class="title">Proposal: [Project name]</h1><p>Prepared for [Client] · Prepared by Limelight</p><h1>About Limelight</h1><p>[Who we are]</p><h1>Objectives</h1><ul><li>[Objective one]</li><li>[Objective two]</li></ul><h1>Scope of work</h1><p>[Deliverables]</p><h1>Timeline</h1><table style="border-collapse:collapse;width:100%"><tr><th style="border:1px solid #999;padding:4px 8px;background:#f2f2f2">Phase</th><th style="border:1px solid #999;padding:4px 8px;background:#f2f2f2">Dates</th></tr><tr><td style="border:1px solid #999;padding:4px 8px">[Phase]</td><td style="border:1px solid #999;padding:4px 8px">[Dates]</td></tr></table><h1>Budget</h1><p>[Budget]</p>',
  report: '<h1 class="title">[Report title]</h1><p>[Date] · [Author]</p><h1>Summary</h1><p>[Key points in brief]</p><h1>Details</h1><p>[Details]</p><h1>Next steps</h1><ol><li>[Step]</li></ol>',
  minutes: '<h1 class="title">Minutes of Meeting</h1><p><b>Date:</b> [ ] · <b>Venue:</b> [ ]<br><b>Attendees:</b> [ ]</p><h2>Agenda</h2><ol><li>[ ]</li></ol><h2>Discussion</h2><p>[ ]</p><h2>Decisions</h2><ul><li>[ ]</li></ul><h2>Action items</h2><table style="border-collapse:collapse;width:100%"><tr><th style="border:1px solid #999;padding:4px 8px;background:#f2f2f2">Action</th><th style="border:1px solid #999;padding:4px 8px;background:#f2f2f2">Owner</th><th style="border:1px solid #999;padding:4px 8px;background:#f2f2f2">By</th></tr><tr><td style="border:1px solid #999;padding:4px 8px">[ ]</td><td style="border:1px solid #999;padding:4px 8px">[ ]</td><td style="border:1px solid #999;padding:4px 8px">[ ]</td></tr></table>',
};

export async function open(view, { path, template = 'blank' }) {
  let file = null, html = TEMPLATES[template] || TEMPLATES.blank, name = 'Document';
  let meta = { header: '', footer: '', pageNumbers: 0, columns: 1, landscape: 0, margin: '' };
  if (path) {
    view.innerHTML = `<div class="loading"><span class="spin"></span>Opening in Word…</div>`;
    try { const r = await POST('/api/doc/open', { path }); file = r.path; html = r.html; name = r.name.replace(/\.[^.]+$/, ''); meta = { ...meta, ...r.meta }; }
    catch (e) { fail(e); location.hash = 'document'; return; }
  } else if (template !== 'blank') name = template[0].toUpperCase() + template.slice(1);

  const parts = frame(view, { kind: 'word', name, tabs: ['File', 'Home', 'Insert', 'Layout', 'View', 'Review', 'AI'], saved: !!path });
  parts.body.innerHTML = `<div class="ed-ruler"></div><div class="ed-scroll"><div class="dwrap">
      <div class="dhf top" contenteditable="true" data-hf="header" data-ph="Header"></div>
      <div class="dpage" contenteditable="true" spellcheck="true">${html}</div>
      <div class="dhf bot" contenteditable="true" data-hf="footer" data-ph="Footer"></div><div class="dpn">Page 1</div></div></div>`;
  const page = $('.dpage', parts.body), wrapEl = $('.dwrap', parts.body), hdr = $('[data-hf="header"]', parts.body), ftr = $('[data-hf="footer"]', parts.body);
  // page set-up: header / footer / page numbers / columns / orientation / margins (all saved into the .docx)
  function applyMeta() {
    hdr.textContent = meta.header || ''; ftr.textContent = meta.footer || '';
    wrapEl.classList.toggle('has-h', !!meta.header || hdr === document.activeElement);
    wrapEl.classList.toggle('has-f', !!meta.footer || ftr === document.activeElement);
    wrapEl.classList.toggle('has-pn', !!meta.pageNumbers);
    page.classList.toggle('land', !!meta.landscape); wrapEl.classList.toggle('land', !!meta.landscape);
    page.dataset.margin = meta.margin || ''; page.style.columnCount = meta.columns > 1 ? meta.columns : '';
  }
  for (const el of [hdr, ftr]) {
    el.oninput = () => { meta[el.dataset.hf] = el.innerText.trim(); setDirty(parts, true); };
    el.onblur = () => applyMeta();
  }
  applyMeta();
  document.execCommand('styleWithCSS', false, true);
  document.execCommand('defaultParagraphSeparator', false, 'p');

  // keep the selection while ribbon controls take focus
  let range = null;
  document.onselectionchange = () => { const s = getSelection(); if (s.rangeCount && page.contains(s.anchorNode)) { range = s.getRangeAt(0).cloneRange(); syncRibbon(); } };
  const restore = () => { page.focus({ preventScroll: true }); if (range) { const s = getSelection(); s.removeAllRanges(); s.addRange(range); } };
  const exec = (c, v = null) => { restore(); document.execCommand(c, false, v); dirty(); };
  const dirty = () => { setDirty(parts, true); count(); };
  page.addEventListener('input', dirty);

  // sizes in pt: execCommand only knows 1-7, so mark with 7 and turn it into pt
  function setSize(pt) {
    restore(); document.execCommand('fontSize', false, '7');
    $$('[style*="xxx-large"], font[size="7"]', page).forEach((el) => { el.removeAttribute('size'); el.style.fontSize = `${pt}pt`; });
    dirty();
  }
  function setStyle(k) {
    if (k === 'title') { exec('formatBlock', 'h1'); const b = blockAtCursor(); if (b) b.className = 'title'; return; }
    exec('formatBlock', k);
    const b = blockAtCursor(); if (b) b.className = '';
  }
  const blockAtCursor = () => { let n = getSelection().anchorNode; while (n && n !== page && !(n.nodeType === 1 && /^(P|H\d|BLOCKQUOTE|DIV|LI)$/.test(n.tagName))) n = n.parentNode; return n !== page ? n : null; };

  function insertTable(rows, cols) {
    const td = 'border:1px solid #999;padding:4px 8px;min-width:40px';
    exec('insertHTML', `<table style="border-collapse:collapse;width:100%">${Array.from({ length: rows }, (_, r) => `<tr>${Array.from({ length: cols }, () => (r === 0 ? `<th style="${td};background:#f2f2f2">&nbsp;</th>` : `<td style="${td}">&nbsp;</td>`)).join('')}</tr>`).join('')}</table><p><br></p>`);
  }

  function syncRibbon() {
    const q = (c) => { try { return document.queryCommandState(c); } catch { return false; } };
    for (const [c, k] of [['bold', 'b'], ['italic', 'i'], ['underline', 'u'], ['strikeThrough', 's'], ['insertUnorderedList', 'ul'], ['insertOrderedList', 'ol'], ['justifyLeft', 'al'], ['justifyCenter', 'ac'], ['justifyRight', 'ar'], ['justifyFull', 'aj']]) {
      const b = $(`[data-cmd="${k}"]`, parts.ribbon); if (b) b.classList.toggle('on', q(c));
    }
    const el = getSelection().anchorNode?.parentElement;
    if (el && page.contains(el)) {
      const cs = getComputedStyle(el);
      const f = $('[data-sel="font"]', parts.ribbon); if (f) { const fam = cs.fontFamily.split(',')[0].replace(/["']/g, ''); if (FONTS.includes(fam)) f.value = fam; }
      const z = $('[data-sel="size"]', parts.ribbon); if (z) { const pt = Math.round(parseFloat(cs.fontSize) * 0.75 * 2) / 2; z.value = SIZES.includes(pt) ? pt : ''; }
    }
  }

  const render = (t) => ({
    Home: group('Clipboard', btn('undo', I.undo, '', { title: 'Undo (Ctrl+Z)' }) + btn('redo', I.redo, '', { title: 'Redo (Ctrl+Y)' }) + `<div class="rcol">${btn('painter', I.painter, 'Format painter', { title: 'Copy formatting, then select text to paint it' })}${btn('selall', I.sorter, 'Select all')}</div>`)
      + group('Font', `<div class="rrow">${select('font', FONTS, 'Font', 138)}${select('size', [['', '—'], ...SIZES.map((s) => [s, s])], 'Font size', 58)}${btn('grow', '<b style="font-size:13px">A</b><b style="font-size:9px">▲</b>', '', { title: 'Grow font' })}${btn('shrink', '<b style="font-size:11px">A</b><b style="font-size:9px">▼</b>', '', { title: 'Shrink font' })}${select('case', [['', 'Aa'], ['upper', 'UPPERCASE'], ['lower', 'lowercase'], ['title', 'Title Case'], ['sentence', 'Sentence case']], 'Change case', 56)}</div>
        <div class="rrow">${btn('b', I.bold, '', { title: 'Bold (Ctrl+B)' })}${btn('i', I.italic, '', { title: 'Italic (Ctrl+I)' })}${btn('u', I.under, '', { title: 'Underline (Ctrl+U)' })}${btn('s', I.strike, '', { title: 'Strikethrough' })}
        ${tbtn('sub', 'x₂', 'Subscript')}${tbtn('sup', 'x²', 'Superscript')}${color('fore', I.color, 'Font colour', '#c00000')}${color('hilite', I.marker, 'Highlight', '#ffff00')}${btn('clear', I.clear, '', { title: 'Clear formatting' })}</div>`)
      + group('Paragraph', `<div class="rrow">${btn('ul', I.ul, '', { title: 'Bullets' })}${btn('ol', I.ol, '', { title: 'Numbering' })}${btn('outdent', I.outdent, '', { title: 'Decrease indent' })}${btn('indent', I.indent, '', { title: 'Increase indent' })}${select('lh', [['', 'Line'], ['1', '1.0'], ['1.15', '1.15'], ['1.5', '1.5'], ['2', '2.0'], ['2.5', '2.5']], 'Line spacing', 62)}</div>
        <div class="rrow">${btn('al', I.left, '', { title: 'Align left' })}${btn('ac', I.center, '', { title: 'Center' })}${btn('ar', I.right, '', { title: 'Align right' })}${btn('aj', I.justify, '', { title: 'Justify' })}${select('sp', [['', 'Space'], ['0', 'None'], ['6', '6 pt after'], ['12', '12 pt after'], ['24', '24 pt after']], 'Paragraph spacing', 62)}${color('shade', I.fill, 'Paragraph shading', '#fff2cc')}</div>`)
      + group('Styles', `<div class="styles">${STYLES.map(([k, l, st]) => `<button class="sty" data-style="${k}"><span style="${st}">${l === 'Normal' ? 'AaBbCc' : 'AaBb'}</span><small>${l}</small></button>`).join('')}</div>`)
      + group('Editing', `<div class="rcol">${btn('find', I.find, 'Find')}${btn('replace', I.replace, 'Replace')}</div>`),
    Insert: group('Tables', `<div class="tpick-wrap">${btn('table', I.table, 'Table', { big: true })}<div class="tpick" id="tpick">${Array.from({ length: 64 }, (_, i) => `<i data-r="${Math.floor(i / 8) + 1}" data-c="${(i % 8) + 1}"></i>`).join('')}<div class="tpick-l">Insert table</div></div></div>`
        + `<div class="rcol">${btn('rowA', I.rowAdd, 'Row above')}${btn('rowB', I.rowAdd, 'Row below')}${btn('rowD', I.del, 'Delete row')}</div><div class="rcol">${btn('colL', I.colAdd, 'Column left')}${btn('colR', I.colAdd, 'Column right')}${btn('colD', I.del, 'Delete column')}</div>`)
      + group('Illustrations', btn('img', I.image, 'Picture', { big: true }) + btn('shape', I.round, 'Box', { big: true, title: 'A shaded call-out box' }))
      + group('Links', btn('link', I.link, 'Link', { big: true }))
      + group('Header & Footer', btn('header', I.aTop, 'Header', { big: true }) + btn('footer', I.aBottom, 'Footer', { big: true }) + btn('pnum', I.ol, 'Page number', { big: true }))
      + group('Page', btn('hr', I.hr, 'Line', { big: true }) + btn('pb', I.pagebreak, 'Page break', { big: true }) + btn('cover', I.margin, 'Cover page', { big: true }))
      + group('Text', btn('date', I.date, 'Date', { big: true }) + btn('sign', I.text, 'Signature', { big: true }) + `<div class="rcol"><div class="rrow">${['₹', '©', '™', '•'].map((x) => tbtn(`sym:${x}`, x, `Insert ${x}`)).join('')}</div><div class="rrow">${['→', '✓', '—', '°'].map((x) => tbtn(`sym:${x}`, x, `Insert ${x}`)).join('')}</div></div>`),
    Layout: group('Margins', btn('mg:', I.margin, 'Normal', { big: true }) + btn('mg:narrow', I.margin, 'Narrow', { big: true }) + btn('mg:wide', I.margin, 'Wide', { big: true }))
      + group('Orientation', btn('portrait', I.orient, 'Portrait', { big: true }) + btn('landscape', I.orient, 'Landscape', { big: true }))
      + group('Columns', btn('col:1', I.justify, 'One', { big: true }) + btn('col:2', I.sorter, 'Two', { big: true }) + btn('col:3', I.sorter, 'Three', { big: true })),
    View: group('Views', btn('read', I.read, 'Read mode', { big: true }) + btn('print', I.print, 'Print', { big: true }))
      + group('Zoom', `<div class="rrow">${select('zoom', [['0.5', '50%'], ['0.75', '75%'], ['1', '100%'], ['1.25', '125%'], ['1.5', '150%'], ['2', '200%']], 'Zoom', 80)}</div><div class="rrow">${btn('fitw', I.zoom, 'Page width')}</div>`),
    Review: group('Proofing', btn('spell', I.spell, 'Spelling', { big: true, title: 'Underline spelling mistakes on / off' }) + btn('wc', I.ol, 'Word count', { big: true }) + btn('aiCheck', I.spell, 'Proofread (AI)', { big: true }))
      + group('Language', btn('aiHiDoc', ic('wand'), 'Translate doc to Hindi', { big: true }) + btn('aiEnDoc', ic('wand'), 'Translate doc to English', { big: true })),
    AI: group('Write', btn('aiWrite', ic('spark'), 'Write with AI', { big: true }) + btn('aiCont', ic('spark'), 'Continue writing', { big: true }))
      + group('Selected text', btn('aiImprove', ic('wand'), 'Improve', { big: true }) + btn('aiShort', ic('wand'), 'Shorten', { big: true }) + btn('aiHi', ic('wand'), 'To Hindi', { big: true }) + btn('aiEn', ic('wand'), 'To English', { big: true }))
      + group('Whole document', btn('aiSum', ic('wand'), 'Summary', { big: true }) + btn('aiCheck', I.spell, 'Proofread', { big: true })),
  })[t] || '';

  // ---------- tables at the cursor ----------
  const cellAt = () => { let n = range?.startContainer; while (n && n !== page && !(n.nodeType === 1 && /^(TD|TH)$/.test(n.tagName))) n = n.parentNode; return n && n !== page ? n : null; };
  function tableOp(op) {
    const cell = cellAt(); if (!cell) return toast('Put the cursor inside a table first', true);
    const tr = cell.parentNode, table = tr.closest('table'), ci = [...tr.children].indexOf(cell);
    const blank = (src) => { const c = src.cloneNode(false); c.innerHTML = '&nbsp;'; return c; };
    if (op === 'rowA' || op === 'rowB') { const nr = document.createElement('tr'); [...tr.children].forEach((c) => nr.append(blank(c.tagName === 'TH' ? Object.assign(document.createElement('td'), { style: c.getAttribute('style')?.replace(/background[^;]*;?/, '') || '' }) : c))); tr.parentNode.insertBefore(nr, op === 'rowA' ? tr : tr.nextSibling); }
    if (op === 'colL' || op === 'colR') for (const row of table.rows) { const ref = row.children[Math.min(ci, row.children.length - 1)]; row.insertBefore(blank(ref), op === 'colL' ? ref : ref.nextSibling); }
    if (op === 'rowD') { tr.remove(); if (!table.rows.length) table.remove(); }
    if (op === 'colD') { for (const row of [...table.rows]) row.children[ci]?.remove(); if (!table.rows[0]?.children.length) table.remove(); }
    dirty();
  }

  // ---------- find & replace (CSS highlights, so the text itself is not changed while searching) ----------
  let hits = [], hitAt = -1;
  function find(q) {
    hits = []; hitAt = -1;
    CSS.highlights?.delete('find'); CSS.highlights?.delete('find-cur');
    if (!q) return 0;
    const walker = document.createTreeWalker(page, NodeFilter.SHOW_TEXT), lq = q.toLowerCase();
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const t = n.data.toLowerCase(); let i = t.indexOf(lq);
      while (i >= 0) { const r = new Range(); r.setStart(n, i); r.setEnd(n, i + q.length); hits.push(r); i = t.indexOf(lq, i + q.length); }
    }
    if (window.Highlight) CSS.highlights.set('find', new Highlight(...hits));
    if (hits.length) step(1);
    return hits.length;
  }
  function step(d) {
    if (!hits.length) return;
    hitAt = (hitAt + d + hits.length) % hits.length;
    if (window.Highlight) CSS.highlights.set('find-cur', new Highlight(hits[hitAt]));
    hits[hitAt].startContainer.parentElement?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    range = hits[hitAt].cloneRange();
  }
  function replaceHits(q, w, all) {
    if (!hits.length) return 0;
    const list = all ? [...hits].reverse() : [hits[hitAt]];
    for (const r of list) { r.deleteContents(); r.insertNode(document.createTextNode(w)); }
    page.normalize(); dirty();
    const n = list.length; find(q); return n;
  }

  // ---------- format painter ----------
  let painter = null;
  function copyFormat() {
    const el = range?.startContainer?.parentElement; if (!el || !page.contains(el)) return toast('Click inside the text you want to copy from', true);
    const cs = getComputedStyle(el);
    painter = { font: cs.fontFamily.split(',')[0].replace(/["']/g, ''), size: Math.round(parseFloat(cs.fontSize) * 0.75 * 2) / 2, color: cs.color, bg: cs.backgroundColor,
      bold: +cs.fontWeight >= 600, italic: cs.fontStyle === 'italic', underline: cs.textDecorationLine.includes('underline') };
    page.classList.add('painting'); toast('Now select the text to paint');
  }
  page.addEventListener('mouseup', () => {
    if (!painter) return;
    setTimeout(() => {
      const p = painter; painter = null; page.classList.remove('painting');
      if (!range || range.collapsed) return;
      exec('removeFormat'); exec('fontName', p.font); setSize(p.size); exec('foreColor', p.color);
      if (p.bg && p.bg !== 'rgba(0, 0, 0, 0)') exec('hiliteColor', p.bg);
      if (p.bold) exec('bold'); if (p.italic) exec('italic'); if (p.underline) exec('underline');
    });
  });

  const changeCase = (k) => {
    const t = range?.toString(); if (!t) return toast('Select some text first', true);
    const out = { upper: t.toUpperCase(), lower: t.toLowerCase(), title: t.toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase()), sentence: t.toLowerCase().replace(/(^\s*|[.!?]\s+)\S/g, (m) => m.toUpperCase()) }[k];
    exec('insertText', out);
  };

  const selectedText = () => (range ? range.toString() : '');
  const mdToHtml = (md) => L.md(md).replace(/<p><b>(.*?)<\/b><\/p>/g, '<h2>$1</h2>');
  async function aiRun(b, fn) {
    const old = b.innerHTML; b.disabled = true; b.innerHTML = `<span class="spin"></span><span>Working…</span>`;
    try { await fn(); } catch (e) { fail(e); }
    b.disabled = false; b.innerHTML = old;
  }
  async function aiSelection(b, tool, extra = '') {
    const t = selectedText(); if (!t.trim()) return toast('Select some text first', true);
    await aiRun(b, async () => { const r = await POST('/api/assist', { tool, text: t, extra }); exec('insertHTML', mdToHtml(r.reply)); });
  }

  function bind() {
    $$('[data-cmd]', parts.ribbon).forEach((b) => {
      b.onmousedown = (e) => e.preventDefault(); // keep the text selection
      b.onclick = async () => {
        const c = b.dataset.cmd;
        const map = { undo: 'undo', redo: 'redo', b: 'bold', i: 'italic', u: 'underline', s: 'strikeThrough', sub: 'subscript', sup: 'superscript', clear: 'removeFormat',
          ul: 'insertUnorderedList', ol: 'insertOrderedList', indent: 'indent', outdent: 'outdent', al: 'justifyLeft', ac: 'justifyCenter', ar: 'justifyRight', aj: 'justifyFull' };
        if (map[c]) { exec(map[c]); if (c === 'clear') exec('formatBlock', 'p'); return syncRibbon(); }
        if (c.startsWith('sym:')) return exec('insertText', c.slice(4));
        if (c === 'table') { const tp = $('#tpick'), r = b.getBoundingClientRect(); tp.style.left = `${r.left}px`; tp.style.top = `${r.bottom + 6}px`; return tp.classList.toggle('open'); }
        if (['rowA', 'rowB', 'rowD', 'colL', 'colR', 'colD'].includes(c)) return tableOp(c);
        if (c === 'img') { const f = await pickFile('image/*'); if (f) exec('insertHTML', `<img src="${f.data}" style="max-width:100%">`); return; }
        if (c === 'shape') return exec('insertHTML', '<table style="border-collapse:collapse;width:100%;margin:8pt 0"><tr><td style="background:#f3f6fb;border:0;border-left:4px solid #2f5496;padding:10pt 14pt">Call-out text</td></tr></table><p><br></p>');
        if (c === 'link') { const u = prompt('Link address (https://…)'); if (u) exec('createLink', u); return; }
        if (c === 'hr') return exec('insertHTML', '<hr>');
        if (c === 'pb') return exec('insertHTML', '<br style="page-break-before:always;clear:both" class="pb"><p><br></p>');
        if (c === 'cover') { page.insertAdjacentHTML('afterbegin', `<p style="margin-top:180pt"><br></p><h1 class="title" style="font-size:36pt">${esc(parts.name.value)}</h1><p style="font-size:14pt;color:#595959">Subtitle</p><p style="margin-top:200pt;color:#595959">Limelight · ${new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p><br style="page-break-before:always;clear:both" class="pb">`); return dirty(); }
        if (c === 'date') return exec('insertText', new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }));
        if (c === 'sign') return exec('insertHTML', '<p><br></p><p>______________________<br>(Signature)<br>Name:<br>Designation:<br>Date:</p>');
        if (c === 'header') { wrapEl.classList.add('has-h'); hdr.focus(); return; }
        if (c === 'footer') { wrapEl.classList.add('has-f'); ftr.focus(); return; }
        if (c === 'pnum') { meta.pageNumbers = meta.pageNumbers ? 0 : 1; applyMeta(); setDirty(parts, true); return toast(meta.pageNumbers ? 'Page numbers on (bottom centre)' : 'Page numbers off'); }
        if (c.startsWith('mg:')) { meta.margin = c.slice(3); applyMeta(); return setDirty(parts, true); }
        if (c === 'portrait' || c === 'landscape') { meta.landscape = c === 'landscape' ? 1 : 0; applyMeta(); return setDirty(parts, true); }
        if (c.startsWith('col:')) { meta.columns = +c.slice(4); applyMeta(); return setDirty(parts, true); }
        if (c === 'painter') return copyFormat();
        if (c === 'selall') { page.focus(); return document.execCommand('selectAll'); }
        if (c === 'grow' || c === 'shrink') { const cur = parseFloat(getComputedStyle(range?.startContainer?.parentElement || page).fontSize) * 0.75; const i = SIZES.findIndex((x) => x >= Math.round(cur)); return setSize(SIZES[Math.max(0, Math.min(SIZES.length - 1, i + (c === 'grow' ? 1 : -1)))]); }
        if (c === 'find' || c === 'replace') return findBar(parts.body, { onFind: find, onStep: step, onReplace: replaceHits, replace: c === 'replace' });
        if (c === 'read') { parts.root.classList.toggle('reading'); return toast(parts.root.classList.contains('reading') ? 'Read mode — press Esc to edit' : 'Edit mode'); }
        if (c === 'print') return printPage(page, meta);
        if (c === 'fitw') { const w = $('.ed-scroll', parts.body).clientWidth - 60; page.style.zoom = ''; wrapEl.style.zoom = Math.min(2, w / page.offsetWidth).toFixed(2); return; }
        if (c === 'spell') { page.spellcheck = !page.spellcheck; b.classList.toggle('on', page.spellcheck); page.blur(); page.focus(); return; }
        if (c === 'wc') {
          const t = page.innerText.trim(), words = t ? t.split(/\s+/).length : 0;
          return L.modal(`<h2>${ic('file')} Word count</h2><table class="wc">${[['Pages (approx.)', Math.max(1, Math.ceil(page.scrollHeight / (meta.landscape ? 794 : 1123)))], ['Words', words], ['Characters (no spaces)', t.replace(/\s/g, '').length], ['Characters (with spaces)', t.length], ['Paragraphs', $$('p,h1,h2,h3,li', page).filter((x) => x.innerText.trim()).length], ['Reading time', `${Math.max(1, Math.round(words / 200))} min`]].map(([k, v]) => `<tr><td>${k}</td><td><b>${v}</b></td></tr>`).join('')}</table><div class="foot"><button class="btn" data-close>Close</button></div>`);
        }
        if (c === 'aiHiDoc' || c === 'aiEnDoc') return aiRun(b, async () => {
          const r = await POST('/api/assist', { tool: c === 'aiHiDoc' ? 'hindi' : 'english', text: page.innerText.slice(0, 15000), extra: 'Keep the headings and lists as markdown (# and -).' });
          if (confirm('Replace the document with the translation? (Cancel = add it at the end)')) page.innerHTML = mdToHtml(r.reply); else page.insertAdjacentHTML('beforeend', '<br class="pb" style="page-break-before:always;clear:both">' + mdToHtml(r.reply));
          dirty();
        });
        if (c === 'aiWrite') {
          const brief = prompt('What should I write? e.g. “2 paragraph intro about Khelo India Youth Games 2026”'); if (!brief) return;
          return aiRun(b, async () => exec('insertHTML', mdToHtml(await ask(brief, 'Write this as part of a document, in markdown (## headings, - bullets, | tables | if useful). Only the content, no preamble.'))));
        }
        if (c === 'aiCont') return aiRun(b, async () => exec('insertHTML', mdToHtml(await ask(page.innerText.slice(-3000), 'Continue this document naturally for 1-2 more paragraphs in the same language and tone. Return only the new text.'))));
        if (c === 'aiImprove') return aiSelection(b, 'rewrite');
        if (c === 'aiShort') return aiSelection(b, 'rewrite', 'Make it about half as long.');
        if (c === 'aiHi') return aiSelection(b, 'hindi');
        if (c === 'aiEn') return aiSelection(b, 'english');
        if (c === 'aiSum' || c === 'aiCheck') return aiRun(b, async () => {
          const r = await POST('/api/assist', { tool: c === 'aiSum' ? 'summarize' : 'grammar', text: page.innerText.slice(0, 20000), extra: c === 'aiCheck' ? 'List the mistakes you found as bullets: "wrong → right". Do not return the whole text.' : '' });
          L.modal(`<h2>${ic('spark')} ${c === 'aiSum' ? 'Summary' : 'Proofreading'}</h2><div class="out" style="max-height:60vh;overflow:auto">${L.md(r.reply)}</div><div class="foot"><button class="btn" data-close>Close</button></div>`, { wide: true });
        });
      };
    });
    $$('#tpick i', parts.ribbon).forEach((cell) => {
      cell.onmouseenter = () => { const r = +cell.dataset.r, c = +cell.dataset.c; $$('#tpick i').forEach((x) => x.classList.toggle('on', +x.dataset.r <= r && +x.dataset.c <= c)); $('.tpick-l').textContent = `${c} × ${r} table`; };
      cell.onmousedown = (e) => e.preventDefault();
      cell.onclick = () => { $('#tpick').classList.remove('open'); insertTable(+cell.dataset.r, +cell.dataset.c); };
    });
    $$('[data-style]', parts.ribbon).forEach((b) => { b.onmousedown = (e) => e.preventDefault(); b.onclick = () => setStyle(b.dataset.style); });
    $$('[data-sel]', parts.ribbon).forEach((s) => (s.onchange = () => {
      const v = s.value; if (!v) return;
      if (s.dataset.sel === 'font') exec('fontName', v);
      if (s.dataset.sel === 'size') setSize(+v);
      if (s.dataset.sel === 'lh') { const bl = blockAtCursor(); if (bl) { bl.style.lineHeight = v; dirty(); } s.value = ''; }
      if (s.dataset.sel === 'sp') { const bl = blockAtCursor(); if (bl) { bl.style.marginBottom = `${v}pt`; dirty(); } s.value = ''; }
      if (s.dataset.sel === 'case') { changeCase(v); s.value = ''; }
      if (s.dataset.sel === 'zoom') { wrapEl.style.zoom = v; }
    }));
    $$('[data-color]', parts.ribbon).forEach((inp) => (inp.oninput = () => {
      $(`[data-swatch="${inp.dataset.color}"]`).style.background = inp.value;
      if (inp.dataset.color === 'shade') { const bl = blockAtCursor(); if (bl) { bl.style.background = inp.value; bl.style.padding = '4pt 6pt'; dirty(); } return; }
      exec(inp.dataset.color === 'fore' ? 'foreColor' : 'hiliteColor', inp.value);
    }));
    const z = $('[data-sel="zoom"]', parts.ribbon); if (z) z.value = wrapEl.style.zoom || '1';
    $('[data-cmd="spell"]', parts.ribbon)?.classList.toggle('on', page.spellcheck);
    syncRibbon();
  }
  tabsWire(parts, render, bind);

  function count() {
    const t = page.innerText.trim();
    const pages = Math.max(1, Math.ceil(page.scrollHeight / (meta.landscape ? 794 : 1123)));
    parts.status.innerHTML = `<span>Page <b>${pages}</b></span><span><b>${t ? t.split(/\s+/).length : 0}</b> words</span><span>${t.length} characters</span><span class="grow"></span><span>English (India) · हिन्दी</span><span>A4 ${meta.landscape ? 'landscape' : 'portrait'}</span>`;
  }
  count();

  async function save({ quiet = false, pdf = false, copyName } = {}) {
    const name = (copyName || parts.name.value).trim() || 'Document';
    $('#ed-save').disabled = true;
    try {
      const html = page.innerHTML.replace(/<h1 class="title">/g, '<h1 class="title" style="font-size:26pt;font-weight:normal;color:#1f1f1f">');
      const r = await POST('/api/doc/save', { path: copyName ? null : file, name, html, meta, pdf });
      if (!copyName) { file = r.file; parts.name.value = r.file.split('\\').pop().replace(/\.docx$/i, ''); setDirty(parts, false); }
      if (!quiet) toast(`Saved · ${r.file.split('\\').pop()}`);
      return r;
    } catch (e) { fail(e); return null; } finally { $('#ed-save').disabled = false; }
  }
  $('#ed-save').onclick = () => save();
  $('#ed-office').onclick = async () => { const r = file && !window.__lloDirty ? { file } : await save({ quiet: true }); if (r) L.openLocal(r.file); };
  parts.name.oninput = () => setDirty(parts, true);
  parts.onFile = () => fileMenu(parts, { save, kindLabel: 'Word', print: () => printPage(page, meta) });
  page.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
    if (e.key === 'Tab') { e.preventDefault(); if (cellAt()) { const c = cellAt(), all = [...c.closest('table').querySelectorAll('td,th')], n = all[all.indexOf(c) + (e.shiftKey ? -1 : 1)]; if (n) { const r = new Range(); r.selectNodeContents(n); getSelection().removeAllRanges(); getSelection().addRange(r); } return; } exec(e.shiftKey ? 'outdent' : 'insertHTML', e.shiftKey ? null : '&emsp;'); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') { e.preventDefault(); findBar(parts.body, { onFind: find, onStep: step, onReplace: replaceHits, replace: false }); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') { e.preventDefault(); findBar(parts.body, { onFind: find, onStep: step, onReplace: replaceHits }); }
  });
  document.onkeydown = (e) => { if (e.key === 'Escape' && parts.root.classList.contains('reading')) parts.root.classList.remove('reading'); };

  // ---------- editing together (live.js): the page travels as its top-level blocks, each with a key ----------
  const newKey = () => Math.random().toString(36).slice(2, 9);
  const blockOf = (n) => { while (n && n.parentNode !== page) n = n.parentNode; return n; };
  const offsetIn = (b, node, off) => { const r = document.createRange(); r.setStart(b, 0); r.setEnd(node, off); return r.toString().length; };
  function pointIn(b, o) {
    const w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT);
    for (let t = w.nextNode(); t; t = w.nextNode()) { if (o <= t.data.length) return [t, o]; o -= t.data.length; }
    return [b, b.childNodes.length];
  }
  const where = (node, off) => {
    if (node === page) { const b = page.childNodes[Math.min(off, page.childNodes.length - 1)]; return b?.dataset?.k ? { k: b.dataset.k, o: 0 } : null; }
    const b = blockOf(node); return b?.dataset?.k ? { k: b.dataset.k, o: offsetIn(b, node, off) } : null;
  };
  const blockByKey = (k) => [...page.children].find((el) => el.dataset.k === k);
  const toPoint = (p) => { const b = p && blockByKey(p.k); return b ? pointIn(b, p.o) : null; };
  function myCursor() {
    const s = getSelection(); if (!s.rangeCount || !page.contains(s.anchorNode)) return null;
    const a = where(s.anchorNode, s.anchorOffset), f = where(s.focusNode, s.focusOffset);
    return a && f ? { a, f } : null;
  }
  function keyBlocks() {
    // stray text at the top level goes into a paragraph; every block gets a key (Enter copies the key: re-key the copy)
    const keep = myCursor(), seen = new Set(); let wrapped = false;
    for (const n of [...page.childNodes]) {
      if (n.nodeType === 3 && n.data.trim()) { const p = document.createElement('p'); n.before(p); p.append(n); wrapped = true; }
    }
    for (const el of page.children) { if (!el.dataset.k || seen.has(el.dataset.k)) el.dataset.k = newKey(); seen.add(el.dataset.k); }
    if (wrapped && keep) setCursor(keep);
  }
  function setCursor(c) {
    const a = toPoint(c.a), f = toPoint(c.f); if (!a || !f) return;
    try { getSelection().setBaseAndExtent(a[0], a[1], f[0], f[1]); } catch {}
  }
  live(parts, {
    file: () => file,
    units() {
      keyBlocks();
      const u = { '@o': [...page.children].map((el) => el.dataset.k).join(','), '@m': JSON.stringify(meta) };
      for (const el of page.children) u[`b:${el.dataset.k}`] = el.outerHTML;
      return u;
    },
    apply(u, full) {
      const keep = myCursor(), make = (html) => { const t = document.createElement('template'); t.innerHTML = html; return t.content.firstElementChild; };
      const made = new Map();
      for (const [k, v] of Object.entries(u)) {
        if (!k.startsWith('b:')) continue;
        const key = k.slice(2), el = blockByKey(key);
        if (v === null) { el?.remove(); continue; }
        if (el && el.outerHTML === v) continue;
        const nu = make(v); if (!nu) continue;
        if (el) el.replaceWith(nu); else made.set(key, nu);
      }
      if (u['@o'] != null) {
        const order = u['@o'] ? u['@o'].split(',') : [], want = new Set(order);
        if (full) for (const el of [...page.children]) if (!want.has(el.dataset.k)) el.remove();
        const now = [...page.children].map((el) => el.dataset.k).join(',');
        if (now !== u['@o']) { let prev = null; for (const k of order) { const el = made.get(k) || blockByKey(k); if (!el) continue; if (prev ? prev.nextElementSibling !== el : page.firstElementChild !== el) (prev ? prev.after(el) : page.prepend(el)); prev = el; } }
      }
      for (const el of made.values()) if (!el.isConnected) page.append(el);
      if (u['@m'] != null) {
        const m = JSON.parse(u['@m']), act = document.activeElement;
        if (act === hdr) m.header = meta.header; if (act === ftr) m.footer = meta.footer;
        Object.assign(meta, m); if (act !== hdr && act !== ftr) applyMeta();
      }
      if (keep) setCursor(keep);
      count();
    },
    cursor: myCursor,
    drawPeers(peers) {
      const ly = layer($('.ed-scroll', parts.body));
      for (const p of peers) {
        const a = toPoint(p.cur?.a), f = toPoint(p.cur?.f); if (!a || !f) continue;
        const r = document.createRange();
        try { r.setStart(...a); r.setEnd(...f); if (r.collapsed && (a[0] !== f[0] || a[1] !== f[1])) { r.setStart(...f); r.setEnd(...a); } } catch { continue; }
        for (const rc of r.getClientRects()) if (rc.width > 1) ly.add('co-sel', rc, p);
        const c = document.createRange(); c.setStart(...f); c.collapse(true);
        let rc = c.getBoundingClientRect();
        if (!rc.height) { const b = blockByKey(p.cur.f.k).getBoundingClientRect(); rc = new DOMRect(b.left, b.top, 0, Math.min(b.height, 22)); }
        ly.add('co-caret', new DOMRect(rc.left, rc.top, 2, rc.height || 18), p, true);
      }
    },
    saved: (f) => { if (f) file = f; },
  });
  page.focus();
}

function printPage(page, meta = {}) {
  const w = window.open('', '_blank');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><style>body{font:11pt Calibri,"Nirmala UI",sans-serif;margin:0;column-count:${meta.columns || 1}}@page{size:A4 ${meta.landscape ? 'landscape' : 'portrait'};margin:${meta.margin === 'narrow' ? '1.27cm' : '2.54cm'}}table{border-collapse:collapse}td,th{border:1px solid #999;padding:4px 8px}img{max-width:100%}.pb{page-break-before:always}</style></head><body>${page.innerHTML}</body></html>`);
  w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
}

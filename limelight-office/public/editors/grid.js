// grid.js - the Grid editor: an Excel-style sheet (cells, formula bar, formulas, sheets, formatting). Saves real .xlsx through Excel.
import { $, $$, esc, ic, toast, fail, POST, btn, tbtn, group, select, color, I, frame, setDirty, fileMenu, tabsWire, ask, findBar } from './shell.js';
import { evaluate, isErr, colName, colNum, parseRef, refName, shiftRefs, formatValue } from './formula.js';
import { live, layer } from './live.js';
const L = window.LLO;

const DEF_W = 100;
const NF = [['', 'General'], ['0.00', 'Number'], ['#,##0', 'Comma'], ['"₹"#,##0.00', 'Rupee ₹'], ['0%', 'Percent'], ['0.00%', 'Percent 0.00'], ['dd/mm/yyyy', 'Date'], ['dd-mmm-yyyy', 'Date (long)'], ['@', 'Text']];
const GFONTS = ['Calibri', 'Arial', 'Segoe UI', 'Times New Roman', 'Georgia', 'Verdana', 'Nirmala UI', 'Mangal', 'Courier New'];
const GSIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36];
const FUNCS = ['SUM', 'AVERAGE', 'COUNT', 'COUNTA', 'MAX', 'MIN', 'IF', 'IFERROR', 'SUMIF', 'COUNTIF', 'VLOOKUP', 'ROUND', 'CONCAT', 'TODAY', 'LEN', 'UPPER', 'PROPER', 'TRIM', 'AND', 'OR'];
const H = { b: 'font-weight:700', i: 'font-style:italic', u: 'text-decoration:underline' };
export const TEMPLATES = {
  blank: () => [{ name: 'Sheet1', cells: {}, cols: {} }],
  budget: () => [{ name: 'Budget', cols: { A: 220, B: 70, C: 110, D: 130 }, cells: {
    A1: { v: 'Item', b: 1, bg: '#217346', color: '#ffffff' }, B1: { v: 'Qty', b: 1, bg: '#217346', color: '#ffffff', al: 'center' }, C1: { v: 'Rate (₹)', b: 1, bg: '#217346', color: '#ffffff', al: 'right' }, D1: { v: 'Amount (₹)', b: 1, bg: '#217346', color: '#ffffff', al: 'right' },
    ...Object.fromEntries([2, 3, 4, 5, 6].flatMap((r) => [[`D${r}`, { f: `=B${r}*C${r}`, nf: '#,##0' }], [`C${r}`, { nf: '#,##0' }]])),
    A2: { v: 'LED wall' }, B2: { v: 1 }, C2: { v: 85000, nf: '#,##0' }, A3: { v: 'Reels' }, B3: { v: 10 }, C3: { v: 5000, nf: '#,##0' },
    A8: { v: 'Total', b: 1 }, D8: { f: '=SUM(D2:D6)', b: 1, nf: '"₹"#,##0.00', bg: '#e2efda' },
    A9: { v: 'GST 18%' }, D9: { f: '=D8*18%', nf: '"₹"#,##0.00' }, A10: { v: 'Grand total', b: 1 }, D10: { f: '=D8+D9', b: 1, nf: '"₹"#,##0.00', bg: '#e2efda' } } }],
  tracker: () => [{ name: 'Tracker', cols: { A: 50, B: 260, C: 120, D: 110, E: 110 }, cells: {
    A1: { v: '#', b: 1, bg: '#1f1f1f', color: '#ffc21a' }, B1: { v: 'Task', b: 1, bg: '#1f1f1f', color: '#ffc21a' }, C1: { v: 'Owner', b: 1, bg: '#1f1f1f', color: '#ffc21a' }, D1: { v: 'Due', b: 1, bg: '#1f1f1f', color: '#ffc21a' }, E1: { v: 'Status', b: 1, bg: '#1f1f1f', color: '#ffc21a' },
    A2: { v: 1 }, A3: { v: 2 }, A4: { v: 3 }, G1: { v: 'Done', b: 1 }, H1: { f: '=COUNTIF(E2:E100,"Done")' }, G2: { v: 'Pending', b: 1 }, H2: { f: '=COUNTA(B2:B100)-H1' } } }],
  invoice: () => [{ name: 'Invoice', cols: { A: 50, B: 280, C: 70, D: 110, E: 130 }, cells: {
    A1: { v: 'TAX INVOICE', b: 1 }, A2: { v: 'Limelight' }, D2: { v: 'Invoice no.' }, E2: { v: 'LL/2026/001' }, D3: { v: 'Date' }, E3: { f: '=TODAY()', nf: 'dd/mm/yyyy' }, A4: { v: 'Bill to: [Client]' },
    A6: { v: 'S.No', b: 1, bg: '#f2f2f2' }, B6: { v: 'Description', b: 1, bg: '#f2f2f2' }, C6: { v: 'Qty', b: 1, bg: '#f2f2f2' }, D6: { v: 'Rate', b: 1, bg: '#f2f2f2' }, E6: { v: 'Amount', b: 1, bg: '#f2f2f2' },
    A7: { v: 1 }, E7: { f: '=C7*D7', nf: '#,##0.00' }, A8: { v: 2 }, E8: { f: '=C8*D8', nf: '#,##0.00' },
    D11: { v: 'Subtotal', b: 1 }, E11: { f: '=SUM(E7:E10)', nf: '#,##0.00' }, D12: { v: 'GST 18%' }, E12: { f: '=ROUND(E11*0.18,2)', nf: '#,##0.00' }, D13: { v: 'Total', b: 1 }, E13: { f: '=E11+E12', b: 1, nf: '"₹"#,##0.00' } } }],
};

export async function open(view, { path, template = 'blank' }) {
  let file = null, name = 'Book', sheets = (TEMPLATES[template] || TEMPLATES.blank)();
  if (path) {
    view.innerHTML = `<div class="loading"><span class="spin"></span>Opening in Excel…</div>`;
    try { const r = await POST('/api/grid/open', { path }); file = r.path; name = r.name.replace(/\.[^.]+$/, ''); sheets = r.sheets.length ? r.sheets : TEMPLATES.blank(); }
    catch (e) { fail(e); location.hash = 'grid'; return; }
  } else if (template !== 'blank') name = template[0].toUpperCase() + template.slice(1);
  for (const s of sheets) { s.cells ||= {}; s.cols ||= {}; s.charts ||= []; s.cf ||= []; }
  if (sheets.some((s) => s.extras)) setTimeout(() => toast('This file has pictures or charts made in Excel. They show only in Excel — save a copy here to keep the original safe.', true), 600);

  const parts = frame(view, { kind: 'excel', name, tabs: ['File', 'Home', 'Insert', 'Formulas', 'Data', 'View', 'AI'], saved: !!path });
  parts.body.innerHTML = `<div class="fbar"><input class="nbox" id="g-nb" spellcheck="false"><span class="fx">${I.fx}</span><input class="fin" id="g-fx" spellcheck="false"></div>
    <div class="gwrap" id="g-wrap" tabindex="0"><table class="gt" id="g-t"></table><input class="gin idle" id="g-in" spellcheck="false" autocomplete="off"></div>
    <div class="stabs" id="g-tabs"></div>`;
  const wrap = $('#g-wrap'), table = $('#g-t'), inp = $('#g-in'), fx = $('#g-fx'), nb = $('#g-nb');
  let si = 0, sh = sheets[0];
  let act = { c: 1, r: 1 }, anc = { c: 1, r: 1 }, editing = false, undo = [], redo = [];
  let nR = 0, nC = 0, cache = new Map(), busySet = new Set();

  // ---------- values ----------
  function val(ref) {
    if (cache.has(ref)) return cache.get(ref);
    const c = sh.cells[ref];
    let v = '';
    if (c?.f) {
      if (busySet.has(ref)) return { err: '#CIRC!' };
      busySet.add(ref);
      v = evaluate(c.f.slice(1), val);
      busySet.delete(ref);
      if (isErr(v) && v.err === '#NAME?' && c.v !== undefined) v = c.v; // a function only Excel knows: keep Excel's answer
    } else if (c) v = c.v ?? '';
    cache.set(ref, v);
    return v;
  }
  const show = (ref) => { const v = val(ref); return isErr(v) ? v.err : formatValue(v, sh.cells[ref]?.nf); };

  // ---------- drawing ----------
  function used() { let mr = 0, mc = 0; for (const k of Object.keys(sh.cells)) { const p = parseRef(k); if (p) { mr = Math.max(mr, p.r); mc = Math.max(mc, p.c); } } return { mr, mc }; }
  const cw = (c) => sh.cols[colName(c)] || DEF_W;
  function draw() {
    const u = used(); nR = Math.max(60, u.mr + 25, act.r + 5); nC = Math.max(18, u.mc + 6, act.c + 3);
    let h = `<colgroup><col style="width:46px">${Array.from({ length: nC }, (_, i) => `<col style="width:${cw(i + 1)}px">`).join('')}</colgroup><thead><tr><th class="corner"></th>`;
    for (let c = 1; c <= nC; c++) h += `<th data-hc="${c}">${colName(c)}<span class="rz" data-rz="${c}"></span></th>`;
    h += '</tr></thead><tbody>';
    for (let r = 1; r <= nR; r++) {
      h += `<tr><th data-hr="${r}">${r}</th>`;
      for (let c = 1; c <= nC; c++) h += `<td data-c="${c}" data-r="${r}"></td>`;
      h += '</tr>';
    }
    table.innerHTML = h + '</tbody>';
    table.classList.toggle('nogrid', !!sh.nogrid);
    paint(); paintSel(); drawTabs();
  }
  const td = (c, r) => table.rows[r]?.cells[c];
  const inRange = (range, c, r) => { const [a, b] = range.split(':').map(parseRef); const z = b || a; return c >= Math.min(a.c, z.c) && c <= Math.max(a.c, z.c) && r >= Math.min(a.r, z.r) && r <= Math.max(a.r, z.r); };
  function cfColor(c, r, v) {
    for (const f of sh.cf) {
      if (!inRange(f.range, c, r) || typeof v !== 'number') continue;
      const n = +f.value;
      if ({ gt: v > n, lt: v < n, eq: v === n, ge: v >= n, le: v <= n }[f.op]) return f.color;
    }
    return '';
  }
  function paintCell(c, r) {
    const el = td(c, r); if (!el) return;
    const ref = refName(c, r), cell = sh.cells[ref];
    const text = cell ? show(ref) : '';
    el.textContent = text;
    const v = cell ? val(ref) : '';
    const st = [];
    if (cell) {
      for (const k of ['b', 'i', 'u']) if (cell[k]) st.push(H[k]);
      if (cell.color) st.push(`color:${cell.color}`);
      if (cell.bg) st.push(`background:${cell.bg}`);
      if (cell.ff) st.push(`font-family:'${cell.ff}','Nirmala UI',sans-serif`);
      if (cell.fs) st.push(`font-size:${(cell.fs * 4 / 3).toFixed(1)}px`);
      if (cell.wr) st.push('white-space:normal;line-height:1.25;vertical-align:top;padding-top:2px');
      if (cell.bd) st.push('border:1px solid #8c8c8c');
    }
    const cfc = cfColor(c, r, v); if (cfc) st.push(`background:${cfc}`);
    const al = cell?.al || (typeof v === 'number' ? 'right' : isErr(v) ? 'center' : '');
    if (al) st.push(`text-align:${al}`);
    if (sh.freeze && (r <= sh.freeze.r || c <= sh.freeze.c)) {
      st.push('position:sticky;z-index:1');
      if (r <= sh.freeze.r) st.push(`top:${24 + (r - 1) * 24}px`);
      if (c <= sh.freeze.c) { let x = 46; for (let k = 1; k < c; k++) x += cw(k); st.push(`left:${x}px`); }
      st.push(`box-shadow:${r === sh.freeze.r ? 'inset 0 -2px 0 #9ab' : ''}${r === sh.freeze.r && c === sh.freeze.c ? ',' : ''}${c === sh.freeze.c ? 'inset -2px 0 0 #9ab' : ''}`.replace(/box-shadow:$/, ''));
    }
    el.style.cssText = st.join(';');
    el.colSpan = 1; el.rowSpan = 1;
    el.classList.toggle('err', isErr(v));
  }
  function paintMerges() {
    for (const [ref, cell] of Object.entries(sh.cells)) {
      if (!cell.mg) continue;
      const [a, b] = cell.mg.split(':').map(parseRef); if (!b) continue;
      for (let r = a.r; r <= b.r; r++) for (let c = a.c; c <= b.c; c++) if (r !== a.r || c !== a.c) { const x = td(c, r); if (x) x.style.display = 'none'; }
      const el = td(a.c, a.r); if (el) { el.colSpan = b.c - a.c + 1; el.rowSpan = b.r - a.r + 1; el.style.textAlign ||= 'center'; el.style.verticalAlign = 'middle'; }
    }
  }
  function paintRows() { for (let r = 1; r <= nR; r++) { const tr = table.rows[r]; if (tr) tr.style.display = sh.hidden?.includes(r) ? 'none' : ''; } }
  function paint() { cache = new Map(); for (let r = 1; r <= nR; r++) for (let c = 1; c <= nC; c++) paintCell(c, r); paintMerges(); paintRows(); drawCharts(); }

  // ---------- charts (drawn here as SVG, saved into the .xlsx as real Excel charts) ----------
  const PAL = ['#4472c4', '#ed7d31', '#a5a5a5', '#ffc000', '#5b9bd5', '#70ad47', '#264478', '#9e480e'];
  function chartData(range) {
    const [a, b] = range.split(':').map(parseRef);
    const rows = []; for (let r = a.r; r <= b.r; r++) { const row = []; for (let c = a.c; c <= b.c; c++) row.push(val(refName(c, r))); rows.push(row); }
    const head = rows[0].slice(1).some((x) => typeof x === 'string') ? rows.shift() : null;
    const labels = rows.map((r) => String(r[0] ?? '')), series = rows[0] ? rows[0].slice(1).map((_, i) => ({ name: head?.[i + 1] || `Series ${i + 1}`, data: rows.map((r) => (typeof r[i + 1] === 'number' ? r[i + 1] : 0)) })) : [];
    return { labels, series };
  }
  function chartSvg(ch) {
    const { labels, series } = chartData(ch.range), W = ch.w, H = ch.h, pad = { l: 46, r: 14, t: ch.title ? 34 : 14, b: 34 };
    const t = ch.title ? `<text x="${W / 2}" y="22" text-anchor="middle" font-size="14" font-weight="600" fill="#333">${esc(ch.title)}</text>` : '';
    if (!series.length) return `<svg viewBox="0 0 ${W} ${H}">${t}<text x="${W / 2}" y="${H / 2}" text-anchor="middle" fill="#999" font-size="12">No numbers in ${ch.range}</text></svg>`;
    if (ch.type === 'pie') {
      const d = series[0].data, tot = d.reduce((a, b) => a + Math.max(0, b), 0) || 1, cx = W / 2 - 50, cy = (H + pad.t) / 2, R = Math.min(W - 160, H - pad.t - 20) / 2;
      let a0 = -Math.PI / 2, out = '';
      d.forEach((v, i) => { const a1 = a0 + (Math.max(0, v) / tot) * Math.PI * 2, big = a1 - a0 > Math.PI ? 1 : 0; out += `<path d="M${cx},${cy} L${cx + R * Math.cos(a0)},${cy + R * Math.sin(a0)} A${R},${R} 0 ${big} 1 ${cx + R * Math.cos(a1)},${cy + R * Math.sin(a1)} Z" fill="${PAL[i % 8]}" stroke="#fff" stroke-width="1.5"/>`; a0 = a1; });
      const leg = labels.map((l, i) => `<rect x="${W - 120}" y="${pad.t + i * 18}" width="10" height="10" fill="${PAL[i % 8]}"/><text x="${W - 104}" y="${pad.t + 9 + i * 18}" font-size="11" fill="#444">${esc(l.slice(0, 16))}</text>`).join('');
      return `<svg viewBox="0 0 ${W} ${H}">${t}${out}${leg}</svg>`;
    }
    const all = series.flatMap((x) => x.data), max = Math.max(0, ...all), min = Math.min(0, ...all), span = max - min || 1;
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b, n = labels.length;
    const y = (v) => pad.t + ih - ((v - min) / span) * ih;
    let g = '';
    for (let k = 0; k <= 4; k++) { const v = min + (span * k) / 4; g += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}" stroke="#e5e5e5"/><text x="${pad.l - 6}" y="${y(v) + 4}" text-anchor="end" font-size="10" fill="#777">${formatValue(Math.round(v * 100) / 100, '#,##0')}</text>`; }
    labels.forEach((l, i) => { g += `<text x="${pad.l + (i + .5) * iw / n}" y="${H - 14}" text-anchor="middle" font-size="10" fill="#555">${esc(l.slice(0, 12))}</text>`; });
    let marks = '';
    if (ch.type === 'line') series.forEach((se, si) => { const pts = se.data.map((v, i) => `${pad.l + (i + .5) * iw / n},${y(v)}`).join(' '); marks += `<polyline points="${pts}" fill="none" stroke="${PAL[si % 8]}" stroke-width="2.5"/>` + se.data.map((v, i) => `<circle cx="${pad.l + (i + .5) * iw / n}" cy="${y(v)}" r="3" fill="${PAL[si % 8]}"/>`).join(''); });
    else { const bw = (iw / n) * 0.7 / series.length; series.forEach((se, si) => se.data.forEach((v, i) => { const x = pad.l + i * iw / n + (iw / n) * 0.15 + si * bw; marks += `<rect x="${x}" y="${Math.min(y(v), y(0))}" width="${bw - 2}" height="${Math.abs(y(v) - y(0))}" fill="${PAL[si % 8]}" rx="2"/>`; })); }
    const leg = series.length > 1 ? series.map((se, i) => `<rect x="${pad.l + i * 110}" y="${H - 8}" width="9" height="9" fill="${PAL[i % 8]}"/><text x="${pad.l + 13 + i * 110}" y="${H}" font-size="10" fill="#444">${esc(String(se.name).slice(0, 14))}</text>`).join('') : '';
    return `<svg viewBox="0 0 ${W} ${H}">${t}${g}${marks}${leg}</svg>`;
  }
  function drawCharts() {
    $$('.chart-box', wrap).forEach((x) => x.remove());
    sh.charts.forEach((ch, i) => {
      const box = document.createElement('div'); box.className = 'chart-box'; box.dataset.i = i;
      Object.assign(box.style, { left: `${ch.x}px`, top: `${ch.y}px`, width: `${ch.w}px`, height: `${ch.h}px` });
      box.innerHTML = chartSvg(ch) + `<button class="x" title="Remove chart">✕</button>`;
      wrap.append(box);
      box.querySelector('.x').onclick = (e) => { e.stopPropagation(); snap(); sh.charts.splice(i, 1); dirty(); drawCharts(); };
      box.ondblclick = () => { const tt = prompt('Chart title', ch.title || ''); if (tt !== null) { ch.title = tt; dirty(); drawCharts(); } };
      box.onmousedown = (e) => {
        if (e.target.closest('.x')) return; e.preventDefault();
        const x0 = e.clientX, y0 = e.clientY, sx = ch.x, sy = ch.y, corner = e.offsetX > ch.w - 16 && e.offsetY > ch.h - 16;
        const mv = (ev) => { if (corner) { ch.w = Math.max(220, ch.w + ev.movementX); ch.h = Math.max(150, ch.h + ev.movementY); box.style.width = `${ch.w}px`; box.style.height = `${ch.h}px`; } else { ch.x = Math.max(46, sx + ev.clientX - x0); ch.y = Math.max(24, sy + ev.clientY - y0); box.style.left = `${ch.x}px`; box.style.top = `${ch.y}px`; } };
        const up = () => { removeEventListener('mousemove', mv); removeEventListener('mouseup', up); if (corner) drawCharts(); dirty(); };
        addEventListener('mousemove', mv); addEventListener('mouseup', up);
      };
    });
  }
  function addChart(type) {
    let { c1, c2, r1, r2 } = rng();
    if (c1 === c2 && r1 === r2) { const u = used(); c1 = 1; r1 = 1; c2 = Math.max(2, u.mc); r2 = Math.max(2, u.mr); }
    const range = `${refName(c1, r1)}:${refName(c2, r2)}`;
    let x = 46; for (let k = 1; k <= c2 + 1; k++) x += cw(k);
    snap(); sh.charts.push({ type, range, x, y: 24 + (r1 - 1) * 24, w: 460, h: 280, title: '' }); dirty(); drawCharts();
    toast(`Chart of ${range} — drag to move, corner to resize, double-click for a title`);
  }

  // ---------- find & replace ----------
  let found = [], foundAt = -1;
  function gfind(q) {
    found = []; foundAt = -1; if (!q) return 0;
    const lq = q.toLowerCase();
    for (const ref of Object.keys(sh.cells)) if (show(ref).toLowerCase().includes(lq)) found.push(parseRef(ref));
    found.sort((a, b) => a.r - b.r || a.c - b.c);
    if (found.length) gstep(1);
    return found.length;
  }
  function gstep(d) { if (!found.length) return; foundAt = (foundAt + d + found.length) % found.length; act = anc = { ...found[foundAt] }; paintSel(); scrollTo(act.c, act.r); }
  function greplace(q, w, all) {
    if (!found.length) return 0;
    snap(); let n = 0; const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    for (const p of all ? found : [found[foundAt]]) { const c = sh.cells[refName(p.c, p.r)]; if (c && typeof c.v === 'string') { c.v = c.v.replace(re, w); n++; } }
    dirty(); paint(); return n;
  }

  // ---------- data tools ----------
  function removeDupes() {
    const u = used(); const head = typeof val(refName(1, 1)) === 'string' ? 2 : 1, seen = new Set(), keep = [];
    for (let r = head; r <= u.mr; r++) { const key = Array.from({ length: u.mc }, (_, i) => show(refName(i + 1, r))).join('\u0001'); if (key.replace(/\u0001/g, '') && seen.has(key)) continue; seen.add(key); keep.push(r); }
    const removed = u.mr - head + 1 - keep.length; if (!removed) return toast('No duplicate rows');
    snap(); const next = {};
    for (const [ref, cell] of Object.entries(sh.cells)) { const p = parseRef(ref); if (p.r < head) next[ref] = cell; }
    keep.forEach((r, i) => { for (let c = 1; c <= u.mc; c++) { const cell = sh.cells[refName(c, r)]; if (cell) next[refName(c, head + i)] = cell; } });
    sh.cells = next; dirty(); draw(); toast(`${removed} duplicate row${removed > 1 ? 's' : ''} removed`);
  }
  function formatAsTable() {
    let { c1, c2, r1, r2 } = rng(); if (c1 === c2 && r1 === r2) { const u = used(); c1 = 1; r1 = 1; c2 = u.mc; r2 = u.mr; }
    snap();
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) {
      const ref = refName(c, r), cell = { ...(sh.cells[ref] || {}), bd: 1 };
      if (r === r1) Object.assign(cell, { b: 1, bg: '#1f3864', color: '#ffffff' }); else cell.bg = (r - r1) % 2 ? '#ffffff' : '#dde6f4';
      sh.cells[ref] = cell;
    }
    dirty(); paint(); paintSel();
  }
  function condFormat() {
    let { c1, c2, r1, r2 } = rng(); const range = `${refName(c1, r1)}:${refName(c2, r2)}`;
    const m = L.modal(`<h2>${I.cond} Highlight cells</h2><p class="muted" style="margin-top:-8px">Range ${range} — colour cells whose value is…</p>
      <div class="row"><select class="input" id="cf-op"><option value="gt">greater than</option><option value="lt">less than</option><option value="ge">at least</option><option value="le">at most</option><option value="eq">equal to</option></select>
      <input class="input" id="cf-v" type="number" placeholder="Value"><input class="input" id="cf-c" type="color" value="#ffc7ce" style="max-width:70px;padding:3px"></div>
      ${sh.cf.length ? `<p class="faint" style="font-size:12.5px">${sh.cf.length} rule(s) on this sheet · <a href="javascript:" id="cf-clear" style="color:var(--accent)">clear all</a></p>` : ''}
      <div class="foot"><button class="btn ghost" data-close>Cancel</button><button class="btn primary" id="cf-go">Apply</button></div>`);
    $('#cf-go', m).onclick = () => { const v = $('#cf-v', m).value; if (v === '') return toast('Give a value', true); snap(); sh.cf.push({ range, op: $('#cf-op', m).value, value: +v, color: $('#cf-c', m).value }); L.closeModal(); dirty(); paint(); };
    if ($('#cf-clear', m)) $('#cf-clear', m).onclick = () => { snap(); sh.cf = []; L.closeModal(); dirty(); paint(); };
  }
  function decimals(d) {
    setFmt((c) => {
      const f = c.nf || '0', cur = (/0\.(0+)/.exec(f)?.[1] || '').length, n = Math.max(0, Math.min(6, cur + d));
      const base = f.replace(/0(\.0+)?/, '0' + (n ? '.' + '0'.repeat(n) : ''));
      c.nf = /0/.test(f) ? base : (n ? '0.' + '0'.repeat(n) : '0');
    });
  }
  const rng = () => ({ c1: Math.min(act.c, anc.c), c2: Math.max(act.c, anc.c), r1: Math.min(act.r, anc.r), r2: Math.max(act.r, anc.r) });
  function paintSel() {
    $$('.sel, .act', table).forEach((e) => e.classList.remove('sel', 'act'));
    $$('th.hs', table).forEach((e) => e.classList.remove('hs'));
    const { c1, c2, r1, r2 } = rng();
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) td(c, r)?.classList.add('sel');
    td(act.c, act.r)?.classList.add('act');
    for (let c = c1; c <= c2; c++) $(`[data-hc="${c}"]`, table)?.classList.add('hs');
    for (let r = r1; r <= r2; r++) $(`[data-hr="${r}"]`, table)?.classList.add('hs');
    const ref = refName(act.c, act.r), cell = sh.cells[ref];
    nb.value = r1 === r2 && c1 === c2 ? ref : `${refName(c1, r1)}:${refName(c2, r2)}`;
    if (document.activeElement !== fx) fx.value = cell?.f || (cell?.v ?? '');
    if (!editing) placeInput();
    status(); syncRibbon();
  }
  function scrollTo(c, r) {
    const el = td(c, r); if (!el) return;
    const w = wrap.getBoundingClientRect(), b = el.getBoundingClientRect();
    if (b.right > w.right) wrap.scrollLeft += b.right - w.right + 10; else if (b.left < w.left + 46) wrap.scrollLeft -= w.left + 46 - b.left;
    if (b.bottom > w.bottom) wrap.scrollTop += b.bottom - w.bottom + 10; else if (b.top < w.top + 24) wrap.scrollTop -= w.top + 24 - b.top;
  }
  function status() {
    const { c1, c2, r1, r2 } = rng(), n = [];
    if ((c2 - c1) + (r2 - r1) > 0) for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) { const v = val(refName(c, r)); if (typeof v === 'number') n.push(v); }
    parts.status.innerHTML = n.length ? `<span class="grow"></span><span>Average: ${formatValue(n.reduce((a, b) => a + b, 0) / n.length)}</span><span>Count: ${n.length}</span><span>Sum: ${formatValue(n.reduce((a, b) => a + b, 0))}</span>` : `<span>Ready</span><span class="grow"></span><span>${sh.name}</span>`;
  }
  function drawTabs() {
    $('#g-tabs').innerHTML = sheets.map((s, i) => `<button data-s="${i}" class="${i === si ? 'on' : ''}" title="Double-click to rename, right-click to delete">${esc(s.name)}</button>`).join('') + `<button class="add" id="g-add" title="New sheet">${ic('plus')}</button>`;
    $$('[data-s]', $('#g-tabs')).forEach((b) => {
      b.onclick = () => { commit(); si = +b.dataset.s; sh = sheets[si]; act = anc = { c: 1, r: 1 }; undo = []; redo = []; draw(); focusGrid(); };
      b.ondblclick = () => { const n = prompt('Sheet name', sheets[+b.dataset.s].name); if (n?.trim()) { sheets[+b.dataset.s].name = n.trim().slice(0, 31); dirty(); drawTabs(); } };
      b.oncontextmenu = (e) => { e.preventDefault(); if (sheets.length < 2 || !confirm(`Delete sheet "${sheets[+b.dataset.s].name}"?`)) return; sheets.splice(+b.dataset.s, 1); si = 0; sh = sheets[0]; dirty(); draw(); };
    });
    $('#g-add').onclick = () => addSheet();
  }
  function addSheet() { let n = sheets.length + 1; while (sheets.some((s) => s.name === `Sheet${n}`)) n++; sheets.push({ name: `Sheet${n}`, cells: {}, cols: {} }); si = sheets.length - 1; sh = sheets[si]; act = anc = { c: 1, r: 1 }; dirty(); draw(); }

  // ---------- changes ----------
  const dirty = () => setDirty(parts, true);
  const snap = () => { undo.push(JSON.stringify(sh)); if (undo.length > 80) undo.shift(); redo = []; };
  function restoreSnap(from, to) { if (!from.length) return; to.push(JSON.stringify(sh)); const s = JSON.parse(from.pop()); sh.cells = s.cells; sh.cols = s.cols; sh.name = s.name; dirty(); draw(); }
  function setRaw(ref, raw) {
    const old = sh.cells[ref] || {}, c = { ...old };
    delete c.v; delete c.f;
    const t = String(raw ?? '');
    if (t.startsWith('=') && t.length > 1) c.f = t.replace(/("[^"]*")|([a-z]+(?=\())|(\$?[a-z]{1,3}\$?\d+)/gi, (m, q) => (q ? m : m.toUpperCase()));
    else if (t.trim() === '') { /* empty */ }
    else if (old.nf === '@') c.v = t;
    else {
      const clean = t.replace(/[,₹\s]/g, '');
      if (/^-?\d+(\.\d+)?%$/.test(clean)) { c.v = parseFloat(clean) / 100; c.nf ||= '0%'; }
      else if (/^-?\d+(\.\d+)?$/.test(clean)) { c.v = parseFloat(clean); if (t.includes('₹')) c.nf ||= '"₹"#,##0.00'; else if (t.includes(',')) c.nf ||= '#,##0'; }
      else if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(t)) { const [d, m, y] = t.split(/[/-]/).map(Number); c.v = (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 864e5; c.nf ||= 'dd/mm/yyyy'; }
      else if (/^(true|false)$/i.test(t)) c.v = /^true$/i.test(t);
      else c.v = t;
    }
    if (Object.keys(c).length) sh.cells[ref] = c; else delete sh.cells[ref];
  }
  function setFmt(fn) {
    snap(); const { c1, c2, r1, r2 } = rng();
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) { const ref = refName(c, r), cell = { ...(sh.cells[ref] || {}) }; fn(cell); for (const k in cell) if (cell[k] === undefined || cell[k] === '' || cell[k] === 0 && k !== 'v') delete cell[k]; if (Object.keys(cell).length) sh.cells[ref] = cell; else delete sh.cells[ref]; }
    dirty(); paint(); paintSel();
  }
  const toggle = (k) => { const on = !sh.cells[refName(act.c, act.r)]?.[k]; setFmt((c) => { c[k] = on ? 1 : undefined; }); };

  // ---------- editing ----------
  const focusGrid = () => inp.focus({ preventScroll: true });
  function placeInput() {
    const el = td(act.c, act.r); if (!el) return;
    const w = wrap.getBoundingClientRect(), b = el.getBoundingClientRect();
    Object.assign(inp.style, { left: `${b.left - w.left + wrap.scrollLeft}px`, top: `${b.top - w.top + wrap.scrollTop}px`, width: `${Math.max(b.width, 120)}px`, height: `${b.height}px` });
  }
  function startEdit(initial) {
    if (!td(act.c, act.r)) return;
    editing = true;
    const cell = sh.cells[refName(act.c, act.r)];
    inp.value = initial ?? (cell?.f || (cell?.v ?? ''));
    placeInput(); inp.classList.remove('idle'); inp.focus();
    if (initial == null) inp.setSelectionRange(inp.value.length, inp.value.length);
    fx.value = inp.value;
  }
  function commit(value) {
    if (!editing && value === undefined) return;
    const v = value !== undefined ? value : inp.value;
    editing = false; inp.value = ''; inp.classList.add('idle');
    const ref = refName(act.c, act.r), before = sh.cells[ref];
    if ((before?.f || (before?.v ?? '')) + '' === v + '') { focusGrid(); return; }
    snap(); setRaw(ref, v); dirty(); paint(); paintSel(); focusGrid();
  }
  const cancel = () => { editing = false; inp.value = ''; inp.classList.add('idle'); paintSel(); focusGrid(); };
  function move(dc, dr, extend = false) {
    act = { c: Math.max(1, act.c + dc), r: Math.max(1, act.r + dr) };
    if (!extend) anc = { ...act };
    if (act.r > nR - 3 || act.c > nC - 2) draw(); else paintSel();
    scrollTo(act.c, act.r);
  }
  // typing into the idle box starts editing the active cell
  inp.oninput = () => { if (!editing) { editing = true; placeInput(); inp.classList.remove('idle'); } fx.value = inp.value; };
  inp.onkeydown = (e) => {
    if (!editing) return navKey(e);
    if (e.key === 'Enter') { e.preventDefault(); commit(); move(0, e.shiftKey ? -1 : 1); }
    else if (e.key === 'Tab') { e.preventDefault(); commit(); move(e.shiftKey ? -1 : 1, 0); }
    else if (e.key === 'Escape') cancel();
  };
  inp.onblur = () => { if (editing) commit(); };
  fx.onfocus = () => { if (!editing) fx.value = sh.cells[refName(act.c, act.r)]?.f || (sh.cells[refName(act.c, act.r)]?.v ?? ''); };
  fx.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); editing = false; commit(fx.value); move(0, 1); } if (e.key === 'Escape') { fx.blur(); paintSel(); focusGrid(); } };
  nb.onkeydown = (e) => { if (e.key !== 'Enter') return; const [a, b] = nb.value.toUpperCase().split(':').map(parseRef); if (a) { anc = a; act = b || a; draw(); scrollTo(act.c, act.r); focusGrid(); } };

  function navKey(e) {
    if (e.isComposing) return;
    const k = e.key, ctrl = e.ctrlKey || e.metaKey;
    const arrows = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    if (arrows[k]) { e.preventDefault(); return move(...arrows[k], e.shiftKey); }
    if (k === 'Enter') { e.preventDefault(); return move(0, e.shiftKey ? -1 : 1); }
    if (k === 'Tab') { e.preventDefault(); return move(e.shiftKey ? -1 : 1, 0); }
    if (k === 'F2') { e.preventDefault(); return startEdit(); }
    if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); return setFmt((c) => { delete c.v; delete c.f; }); }
    if (ctrl && k.toLowerCase() === 'z') { e.preventDefault(); return restoreSnap(undo, redo); }
    if (ctrl && k.toLowerCase() === 'y') { e.preventDefault(); return restoreSnap(redo, undo); }
    if (ctrl && k.toLowerCase() === 'b') { e.preventDefault(); return toggle('b'); }
    if (ctrl && k.toLowerCase() === 'i') { e.preventDefault(); return toggle('i'); }
    if (ctrl && k.toLowerCase() === 'u') { e.preventDefault(); return toggle('u'); }
    if (ctrl && k.toLowerCase() === 's') { e.preventDefault(); return save(); }
    if (ctrl && (k.toLowerCase() === 'f' || k.toLowerCase() === 'h')) { e.preventDefault(); return findBar(parts.body, { onFind: gfind, onStep: gstep, onReplace: greplace, replace: k.toLowerCase() === 'h' }); }
    if (ctrl && k.toLowerCase() === 'a') { e.preventDefault(); const u = used(); anc = { c: 1, r: 1 }; act = { c: Math.max(1, u.mc), r: Math.max(1, u.mr) }; return paintSel(); }
  }
  // copy / cut / paste as tab-separated text (works with Excel and Google Sheets)
  const selTsv = (raw) => { const { c1, c2, r1, r2 } = rng(), out = []; for (let r = r1; r <= r2; r++) { const row = []; for (let c = c1; c <= c2; c++) { const cell = sh.cells[refName(c, r)]; row.push(raw ? (cell?.f || (cell?.v ?? '')) : show(refName(c, r))); } out.push(row.join('\t')); } return out.join('\n'); };
  inp.addEventListener('copy', (e) => { if (editing) return; e.preventDefault(); e.clipboardData.setData('text/plain', selTsv(false)); internalClip = { text: selTsv(false), raw: selTsv(true), from: { ...rng() } }; });
  inp.addEventListener('cut', (e) => { if (editing) return; e.preventDefault(); e.clipboardData.setData('text/plain', selTsv(false)); internalClip = { text: selTsv(false), raw: selTsv(true), from: { ...rng() } }; setFmt((c) => { delete c.v; delete c.f; }); });
  let internalClip = null;
  inp.addEventListener('paste', (e) => {
    if (editing) return; e.preventDefault();
    let text = e.clipboardData.getData('text/plain'); if (!text) return;
    let shift = null;
    if (internalClip && internalClip.text === text.replace(/\r/g, '')) { shift = { dc: act.c - internalClip.from.c1, dr: act.r - internalClip.from.r1 }; text = internalClip.raw; }
    snap();
    text.replace(/\r/g, '').replace(/\n$/, '').split('\n').forEach((line, ri) => line.split('\t').forEach((v, ci) => {
      if (shift && v.startsWith('=')) v = shiftRefs(shiftRefs(v, 'r', 1, shift.dr), 'c', 1, shift.dc);
      setRaw(refName(act.c + ci, act.r + ri), v);
    }));
    dirty(); draw();
  });

  // mouse: select, drag-select, double-click to edit, resize columns
  let dragging = false;
  table.addEventListener('mousedown', (e) => {
    const rz = e.target.closest('[data-rz]');
    if (rz) {
      e.preventDefault(); const c = +rz.dataset.rz, x0 = e.clientX, w0 = cw(c), col = table.querySelectorAll('col')[c];
      const mv = (ev) => { const w = Math.max(30, w0 + ev.clientX - x0); col.style.width = `${w}px`; sh.cols[colName(c)] = w; };
      const up = () => { removeEventListener('mousemove', mv); removeEventListener('mouseup', up); dirty(); };
      addEventListener('mousemove', mv); addEventListener('mouseup', up); return;
    }
    const cell = e.target.closest('td'), hc = e.target.closest('[data-hc]'), hr = e.target.closest('[data-hr]');
    if (editing) commit();
    if (cell) { act = { c: +cell.dataset.c, r: +cell.dataset.r }; if (!e.shiftKey) anc = { ...act }; dragging = true; paintSel(); }
    else if (hc) { anc = { c: +hc.dataset.hc, r: 1 }; act = { c: +hc.dataset.hc, r: nR }; paintSel(); }
    else if (hr) { anc = { c: 1, r: +hr.dataset.hr }; act = { c: nC, r: +hr.dataset.hr }; paintSel(); }
    setTimeout(() => focusGrid());
  });
  table.addEventListener('mouseover', (e) => { if (!dragging) return; const cell = e.target.closest('td'); if (cell) { act = { c: +cell.dataset.c, r: +cell.dataset.r }; paintSel(); } });
  addEventListener('mouseup', () => (dragging = false));
  table.addEventListener('dblclick', (e) => { if (e.target.closest('td')) startEdit(); });

  // ---------- rows, columns, sort ----------
  function shiftCells(axis, at, by) {
    snap();
    for (const s of [sh]) {
      const next = {};
      for (const [ref, cell] of Object.entries(s.cells)) {
        const p = parseRef(ref); let { c, r } = p;
        const pos = axis === 'r' ? r : c;
        if (by < 0 && pos >= at && pos < at - by) continue; // deleted
        if (pos >= at) { if (axis === 'r') r += by; else c += by; }
        const nc = { ...cell }; if (nc.f) nc.f = shiftRefs(nc.f, axis, by < 0 ? at - by : at, by);
        next[refName(c, r)] = nc;
      }
      s.cells = next;
    }
    dirty(); draw();
  }
  function sortBy(desc) {
    const u = used(); const { c1 } = rng(); const col = act.c || c1;
    const head = typeof val(refName(col, 1)) === 'string' && u.mr > 1 ? 2 : 1;
    const rows = [];
    for (let r = head; r <= u.mr; r++) { const row = {}; for (let c = 1; c <= u.mc; c++) { const cell = sh.cells[refName(c, r)]; if (cell) row[c] = cell; } rows.push({ row, key: val(refName(col, r)) }); }
    rows.sort((a, b) => { const x = a.key, y = b.key; if (x === '' && y !== '') return 1; if (y === '' && x !== '') return -1; const d = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y)); return desc ? -d : d; });
    snap();
    for (let r = head; r <= u.mr; r++) for (let c = 1; c <= u.mc; c++) delete sh.cells[refName(c, r)];
    rows.forEach(({ row }, i) => { for (const [c, cell] of Object.entries(row)) sh.cells[refName(+c, head + i)] = cell; });
    dirty(); paint(); paintSel();
  }
  function autoSum() {
    const { c1, r1 } = rng(); let r = r1 - 1;
    while (r >= 1 && typeof val(refName(c1, r)) === 'number') r--;
    if (r === r1 - 1) return startEdit('=SUM()');
    commit(`=SUM(${refName(c1, r + 1)}:${refName(c1, r1 - 1)})`);
  }

  // ---------- ribbon ----------
  const cur = () => sh.cells[refName(act.c, act.r)] || {};
  const render = (t) => ({
    Home: group('Clipboard', btn('undo', I.undo, '', { title: 'Undo (Ctrl+Z)' }) + btn('redo', I.redo, '', { title: 'Redo (Ctrl+Y)' }))
      + group('Font', `<div class="rrow">${select('ff', GFONTS, 'Font', 116)}${select('fs', [['', '—'], ...GSIZES.map((x) => [x, x])], 'Font size', 54)}</div><div class="rrow">${btn('b', I.bold, '', { title: 'Bold' })}${btn('i', I.italic, '', { title: 'Italic' })}${btn('u', I.under, '', { title: 'Underline' })}${btn('bd', I.border, '', { title: 'All borders' })}${btn('nobd', I.noborder, '', { title: 'No borders' })}${color('color', I.color, 'Font colour', '#c00000')}${color('bg', I.fill, 'Fill colour', '#ffff00')}${btn('nofill', I.clear, '', { title: 'Clear fill & colour' })}</div>`)
      + group('Alignment', `<div class="rrow">${btn('al', I.left, '', { title: 'Align left' })}${btn('ac', I.center, '', { title: 'Center' })}${btn('ar', I.right, '', { title: 'Align right' })}</div><div class="rrow">${btn('wr', I.wrap, 'Wrap', { title: 'Wrap text' })}${btn('mg', I.merge, 'Merge', { title: 'Merge & center' })}</div>`)
      + group('Number', `<div class="rrow">${select('nf', NF, 'Number format', 130)}</div><div class="rrow">${tbtn('nfRs', '₹', 'Rupees')}${tbtn('nfPct', '%', 'Percent')}${tbtn('nfCom', ',', 'Comma style')}${btn('decUp', I.decUp, '', { title: 'More decimals' })}${btn('decDn', I.decDown, '', { title: 'Fewer decimals' })}</div>`)
      + group('Styles', btn('cond', I.cond, 'Conditional formatting', { big: true }) + btn('fmtTable', I.table, 'Format as table', { big: true }))
      + group('Cells', `<div class="rcol">${btn('rowIns', I.rowAdd, 'Insert row')}${btn('colIns', I.colAdd, 'Insert column')}</div><div class="rcol">${btn('rowDel', I.del, 'Delete row')}${btn('colDel', I.del, 'Delete column')}</div>`)
      + group('Editing', btn('sum', I.sigma, 'AutoSum', { big: true }) + `<div class="rcol">${btn('sortA', I.sortUp, 'Sort A → Z')}${btn('sortZ', I.sortDown, 'Sort Z → A')}${btn('find', I.find, 'Find & replace')}</div>`),
    Insert: group('Charts', btn('ch:bar', I.chartBar, 'Column', { big: true }) + btn('ch:hbar', I.chartBar, 'Bar', { big: true }) + btn('ch:line', I.chartLine, 'Line', { big: true }) + btn('ch:pie', I.chartPie, 'Pie', { big: true }))
      + group('Cells', btn('rowIns', I.rowAdd, 'Row above', { big: true }) + btn('colIns', I.colAdd, 'Column left', { big: true }))
      + group('Sheets', btn('sheet', I.sheet, 'New sheet', { big: true }))
      + group('Insert', btn('today', I.dateIns, 'Today’s date', { big: true }) + `<div class="rrow">${select('fn', [['', 'Insert function…'], ...FUNCS.map((f) => [f, f])], 'Insert function', 170)}</div>`),
    Formulas: group('Function library', btn('sum', I.sigma, 'AutoSum', { big: true }) + ['SUM', 'AVERAGE', 'COUNT', 'MAX', 'MIN', 'IF', 'VLOOKUP', 'SUMIF', 'COUNTIF', 'ROUND', 'TODAY'].map((f) => btn(`fn:${f}`, I.fx, f, { big: true })).join('')),
    Data: group('Sort & filter', btn('sortA', I.sortUp, 'Sort A → Z', { big: true }) + btn('sortZ', I.sortDown, 'Sort Z → A', { big: true }) + btn('filter', I.filter, 'Filter by this value', { big: true }) + btn('unfilter', I.clear, 'Clear filter', { big: true }))
      + group('Data tools', btn('dupes', I.dupes, 'Remove duplicates', { big: true }) + btn('trim', I.clear, 'Trim spaces', { big: true })),
    View: group('Freeze', btn('frzRow', I.freeze, 'Freeze top row', { big: true }) + btn('frzCol', I.freeze, 'Freeze first column', { big: true }) + btn('frzHere', I.freeze, 'Freeze at selection', { big: true }) + btn('unfrz', I.clear, 'Unfreeze', { big: true }))
      + group('Show', btn('grid', I.border, 'Gridlines', { big: true })),
    AI: group('Create', btn('aiFill', ic('spark'), 'Make a table with AI', { big: true }) + btn('aiFormula', I.fx, 'Write a formula', { big: true }))
      + group('Understand', btn('aiExplain', ic('wand'), 'Explain this sheet', { big: true })),
  })[t] || '';
  function syncRibbon() {
    const c = cur();
    for (const k of ['b', 'i', 'u']) $(`[data-cmd="${k}"]`, parts.ribbon)?.classList.toggle('on', !!c[k]);
    for (const [k, a] of [['al', 'left'], ['ac', 'center'], ['ar', 'right']]) $(`[data-cmd="${k}"]`, parts.ribbon)?.classList.toggle('on', c.al === a);
    const nf = $('[data-sel="nf"]', parts.ribbon); if (nf) nf.value = NF.some((o) => o[0] === (c.nf || '')) ? (c.nf || '') : '';
    const ff = $('[data-sel="ff"]', parts.ribbon); if (ff) ff.value = c.ff || 'Calibri';
    const fs = $('[data-sel="fs"]', parts.ribbon); if (fs) fs.value = c.fs || '';
    for (const k of ['wr', 'bd']) $(`[data-cmd="${k}"]`, parts.ribbon)?.classList.toggle('on', !!c[k]);
    $('[data-cmd="grid"]', parts.ribbon)?.classList.toggle('on', !sh.nogrid);
  }
  function bind() {
    $$('[data-cmd]', parts.ribbon).forEach((b) => (b.onclick = async () => {
      const k = b.dataset.cmd;
      if (editing) commit();
      if (k === 'undo') return restoreSnap(undo, redo);
      if (k === 'redo') return restoreSnap(redo, undo);
      if (['b', 'i', 'u'].includes(k)) return toggle(k);
      if (k === 'al' || k === 'ac' || k === 'ar') { const a = { al: 'left', ac: 'center', ar: 'right' }[k]; return setFmt((c) => { c.al = c.al === a ? undefined : a; }); }
      if (k === 'nofill') return setFmt((c) => { delete c.bg; delete c.color; });
      if (k === 'nfRs') return setFmt((c) => { c.nf = '"₹"#,##0.00'; });
      if (k === 'nfPct') return setFmt((c) => { c.nf = '0%'; });
      if (k === 'nfCom') return setFmt((c) => { c.nf = '#,##0'; });
      if (k === 'rowIns') return shiftCells('r', rng().r1, 1);
      if (k === 'colIns') return shiftCells('c', rng().c1, 1);
      if (k === 'rowDel') { const { r1, r2 } = rng(); return shiftCells('r', r1, -(r2 - r1 + 1)); }
      if (k === 'colDel') { const { c1, c2 } = rng(); return shiftCells('c', c1, -(c2 - c1 + 1)); }
      if (k === 'sum') return autoSum();
      if (k === 'sortA' || k === 'sortZ') return sortBy(k === 'sortZ');
      if (k === 'sheet') return addSheet();
      if (k === 'trim') return setFmt((c) => { if (typeof c.v === 'string') c.v = c.v.trim().replace(/\s+/g, ' '); });
      if (k === 'bd') return setFmt((c) => { c.bd = 1; });
      if (k === 'nobd') return setFmt((c) => { delete c.bd; });
      if (k === 'wr') return toggle('wr');
      if (k === 'mg') {
        const { c1, c2, r1, r2 } = rng(), a = refName(c1, r1), cell = sh.cells[a];
        if (cell?.mg) return setFmt((x) => { delete x.mg; });
        if (c1 === c2 && r1 === r2) return toast('Select more than one cell to merge', true);
        snap(); sh.cells[a] = { ...(cell || {}), mg: `${a}:${refName(c2, r2)}`, al: 'center' }; dirty(); return draw();
      }
      if (k === 'decUp') return decimals(1);
      if (k === 'decDn') return decimals(-1);
      if (k === 'cond') return condFormat();
      if (k === 'fmtTable') return formatAsTable();
      if (k.startsWith('ch:')) return addChart(k.slice(3));
      if (k === 'today') return commit(String(new Date().toLocaleDateString('en-GB')).replace(/\//g, '/'));
      if (k === 'find') return findBar(parts.body, { onFind: gfind, onStep: gstep, onReplace: greplace });
      if (k === 'filter') { const v = show(refName(act.c, act.r)), col = act.c, u = used(); snap(); sh.hidden = []; for (let r = 2; r <= u.mr; r++) if (show(refName(col, r)) !== v) sh.hidden.push(r); sh.filter = 1; dirty(); paintRows(); return toast(`Showing rows where ${colName(col)} = “${v}”`); }
      if (k === 'unfilter') { sh.hidden = []; paintRows(); return; }
      if (k === 'dupes') return removeDupes();
      if (k === 'frzRow') { sh.freeze = { r: 1, c: 0 }; dirty(); return paint(); }
      if (k === 'frzCol') { sh.freeze = { r: 0, c: 1 }; dirty(); return paint(); }
      if (k === 'frzHere') { sh.freeze = { r: act.r - 1, c: act.c - 1 }; dirty(); return paint(); }
      if (k === 'unfrz') { delete sh.freeze; dirty(); return paint(); }
      if (k === 'grid') { sh.nogrid = !sh.nogrid; table.classList.toggle('nogrid', sh.nogrid); return syncRibbon(); }
      if (k.startsWith('fn:')) return startEdit(`=${k.slice(3)}(${k.slice(3) === 'TODAY' ? ')' : ''}`);
      if (k === 'aiFill') {
        const brief = prompt('What table do you need? e.g. “Event budget: item, qty, rate, amount — 10 rows”'); if (!brief) return;
        return aiBusy(b, async () => {
          const csv = await ask(brief, 'Reply with CSV only (comma separated, first row = headers, quote cells that contain commas). Use Excel formulas starting with = where totals or calculations help, with A1 references assuming the table starts at the selected cell. No explanation, no code fence.');
          snap(); const rows = parseCsv(csv);
          rows.forEach((row, ri) => row.forEach((v, ci) => setRaw(refName(act.c + ci, act.r + ri), v)));
          rows[0]?.forEach((_, ci) => { const ref = refName(act.c + ci, act.r); sh.cells[ref] = { ...(sh.cells[ref] || {}), b: 1, bg: '#e2efda' }; });
          dirty(); draw();
        });
      }
      if (k === 'aiFormula') {
        const brief = prompt(`Describe the formula for ${refName(act.c, act.r)} — e.g. “total of column D where column E is Done”`); if (!brief) return;
        return aiBusy(b, async () => {
          const f = (await ask(`Sheet (first rows, tab separated, with cell refs from A1):\n${sheetText(15)}\n\nFormula needed for cell ${refName(act.c, act.r)}: ${brief}`, 'Reply with ONE Excel formula only, starting with =. Nothing else.')).split('\n').find((l) => l.trim().startsWith('='))?.trim();
          if (!f) return toast('No formula came back', true);
          commit(f); toast(`${refName(act.c, act.r)} = ${f}`);
        });
      }
      if (k === 'aiExplain') return aiBusy(b, async () => {
        const r = await POST('/api/assist', { tool: 'summarize', text: sheetText(200), extra: 'This is a spreadsheet (tab separated, row 1 is usually headers). Explain what it contains and the key numbers/insights.' });
        L.modal(`<h2>${ic('spark')} About this sheet</h2><div class="out" style="max-height:60vh;overflow:auto">${L.md(r.reply)}</div><div class="foot"><button class="btn" data-close>Close</button></div>`, { wide: true });
      });
    }));
    $$('[data-sel]', parts.ribbon).forEach((s) => (s.onchange = () => {
      if (s.dataset.sel === 'nf') setFmt((c) => { c.nf = s.value || undefined; });
      if (s.dataset.sel === 'fn' && s.value) { startEdit(`=${s.value}(`); s.value = ''; }
      if (s.dataset.sel === 'ff') setFmt((c) => { c.ff = s.value === 'Calibri' ? undefined : s.value; });
      if (s.dataset.sel === 'fs') setFmt((c) => { c.fs = s.value ? +s.value : undefined; });
    }));
    $$('[data-color]', parts.ribbon).forEach((ci) => (ci.oninput = () => {
      $(`[data-swatch="${ci.dataset.color}"]`).style.background = ci.value;
      const k = ci.dataset.color; setFmt((c) => { c[k] = ci.value; });
    }));
    syncRibbon();
  }
  const sheetText = (maxRows) => { const u = used(), out = []; for (let r = 1; r <= Math.min(u.mr, maxRows); r++) { const row = []; for (let c = 1; c <= u.mc; c++) row.push(show(refName(c, r))); out.push(`${r}\t${row.join('\t')}`); } return `\t${Array.from({ length: u.mc }, (_, i) => colName(i + 1)).join('\t')}\n${out.join('\n')}`; };
  async function aiBusy(b, fn) { const old = b.innerHTML; b.disabled = true; b.innerHTML = '<span class="spin"></span><span>Working…</span>'; try { await fn(); } catch (e) { fail(e); } b.disabled = false; b.innerHTML = old; }
  tabsWire(parts, render, bind);

  // ---------- save ----------
  async function save({ quiet = false, pdf = false, copyName } = {}) {
    if (editing) commit();
    const nm = (copyName || parts.name.value).trim() || 'Book';
    $('#ed-save').disabled = true;
    try {
      const out = sheets.map((s) => ({ name: s.name, cols: s.cols, charts: s.charts, cf: s.cf, freeze: s.freeze, filter: s.filter, cells: Object.fromEntries(Object.entries(s.cells).map(([k, c]) => [k, c.f ? { ...c, v: undefined } : c])) }));
      const r = await POST('/api/grid/save', { path: copyName ? null : file, name: nm, sheets: out, pdf });
      if (!copyName) { file = r.file; parts.name.value = r.file.split('\\').pop().replace(/\.xlsx$/i, ''); setDirty(parts, false); }
      if (!quiet) toast(`Saved · ${r.file.split('\\').pop()}`);
      return r;
    } catch (e) { fail(e); return null; } finally { $('#ed-save').disabled = false; }
  }
  $('#ed-save').onclick = () => save();
  $('#ed-office').onclick = async () => { const r = file && !window.__lloDirty ? { file } : await save({ quiet: true }); if (r) L.openLocal(r.file); };
  parts.name.oninput = () => setDirty(parts, true);
  parts.onFile = () => fileMenu(parts, { save, kindLabel: 'Excel' });

  // ---------- editing together (live.js): every cell travels on its own, plus each sheet's name and layout ----------
  const LAYOUT = ['cols', 'charts', 'cf', 'freeze', 'filter', 'hidden', 'nogrid'];
  live(parts, {
    file: () => file,
    units() {
      const u = { '@n': String(sheets.length) };
      sheets.forEach((s, i) => {
        u[`${i}:n`] = s.name; u[`${i}:m`] = JSON.stringify(Object.fromEntries(LAYOUT.map((k) => [k, s[k]])));
        for (const [ref, c] of Object.entries(s.cells)) u[`${i}:c:${ref}`] = JSON.stringify(c);
      });
      return u;
    },
    apply(u, full) {
      if (u['@n'] != null) { const n = +u['@n']; while (sheets.length < n) sheets.push({ name: `Sheet${sheets.length + 1}`, cells: {}, cols: {}, charts: [], cf: [] }); sheets.length = n; }
      if (full) for (const s of sheets) s.cells = {};
      for (const [k, v] of Object.entries(u)) {
        const m = k.match(/^(\d+):([nmc])(?::(.+))?$/), s = m && sheets[+m[1]]; if (!s) continue;
        if (m[2] === 'n') { if (v != null) s.name = v; }
        else if (m[2] === 'm') { if (v != null) { const o = JSON.parse(v); for (const key of LAYOUT) s[key] = o[key]; s.cols ||= {}; s.charts ||= []; s.cf ||= []; } }
        else if (v == null) delete s.cells[m[3]]; else s.cells[m[3]] = JSON.parse(v);
      }
      si = Math.min(si, sheets.length - 1); sh = sheets[si];
      if (editing) { paint(); drawTabs(); } else { draw(); }
      paintSel();
    },
    cursor: () => ({ s: si, c: act.c, r: act.r, c2: anc.c, r2: anc.r }),
    drawPeers(peers) {
      const ly = layer(wrap);
      for (const p of peers) {
        const k = p.cur; if (!k || k.s !== si) continue;
        const a = td(Math.min(k.c, k.c2), Math.min(k.r, k.r2)), b = td(Math.max(k.c, k.c2), Math.max(k.r, k.r2)); if (!a || !b) continue;
        const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
        ly.add('co-cell', new DOMRect(ra.left, ra.top, rb.right - ra.left, rb.bottom - ra.top), p, true);
      }
    },
    saved: (f) => { if (f) file = f; },
  });

  draw();
  focusGrid();
}

function parseCsv(t) {
  return t.replace(/\r/g, '').split('\n').filter((l) => l.trim()).map((l) => {
    if (l.includes('\t')) return l.split('\t');
    const out = []; let cur = '', q = false;
    for (let i = 0; i < l.length; i++) { const ch = l[i]; if (ch === '"') { if (q && l[i + 1] === '"') { cur += '"'; i++; } else q = !q; } else if (ch === ',' && !q) { out.push(cur); cur = ''; } else cur += ch; }
    out.push(cur); return out.map((s) => s.trim());
  });
}

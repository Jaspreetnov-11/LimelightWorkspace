// shell.js - the Office-style frame shared by the Document, Grid and Present editors:
// title bar (name, saved state, Save), ribbon tabs, ribbon, work area, status bar; plus save / dirty handling.
const L = window.LLO;
export const { $, $$, esc, ic, toast, fail, POST } = L;

// ribbon pieces
export const btn = (id, icon, label, { title = label, big = false, cls = '' } = {}) =>
  `<button class="rb${big ? ' big' : ''} ${cls}" data-cmd="${id}" title="${esc(title)}">${icon.startsWith('<') ? icon : ic(icon)}${label ? `<span>${label}</span>` : ''}</button>`;
export const tbtn = (id, text, title, style = '') => `<button class="rb t" data-cmd="${id}" title="${esc(title)}" style="${style}">${text}</button>`;
export const group = (label, html) => `<div class="rg"><div class="rg-b">${html}</div><div class="rg-l">${label}</div></div>`;
export const select = (id, options, title, width = 120) =>
  `<select class="rsel" data-sel="${id}" title="${esc(title)}" style="width:${width}px">${options.map((o) => (Array.isArray(o) ? `<option value="${esc(o[0])}">${esc(o[1])}</option>` : `<option>${esc(o)}</option>`)).join('')}</select>`;
export const color = (id, icon, title, value) =>
  `<label class="rb rcolor" title="${esc(title)}">${icon.startsWith('<') ? icon : ic(icon)}<i style="background:${value}" data-swatch="${id}"></i><input type="color" data-color="${id}" value="${value}"></label>`;

// a few extra icons the editors use
const S = (p) => `<svg class="i" viewBox="0 0 24 24">${p}</svg>`;
export const I = {
  undo: S('<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>'),
  redo: S('<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>'),
  bold: S('<path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z" stroke-width="2.2"/>'),
  italic: S('<path d="M14 5h-4M14 19h-4M14 5l-4 14"/>'),
  under: S('<path d="M7 4v7a5 5 0 0 0 10 0V4M5 20h14"/>'),
  strike: S('<path d="M5 12h14M16 7a4 4 0 0 0-4-2c-2.5 0-4 1.3-4 3 0 4 8 2.5 8 7 0 1.8-1.7 3-4 3a4.5 4.5 0 0 1-4.5-2.5"/>'),
  left: S('<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>'),
  center: S('<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>'),
  right: S('<path d="M4 6h16M10 10h10M4 14h16M10 18h10"/>'),
  justify: S('<path d="M4 6h16M4 10h16M4 14h16M4 18h16"/>'),
  ul: S('<circle cx="5" cy="7" r="1.2" fill="currentColor"/><circle cx="5" cy="12" r="1.2" fill="currentColor"/><circle cx="5" cy="17" r="1.2" fill="currentColor"/><path d="M9 7h11M9 12h11M9 17h11"/>'),
  ol: S('<path d="M10 7h10M10 12h10M10 17h10M4 5.5h1.5V9M4 9h3M4 14.2c.4-.6 2.6-.9 2.6.6 0 1-2.6 1.6-2.6 3h2.8"/>'),
  indent: S('<path d="M4 6h16M10 10h10M10 14h10M4 18h16M4 9l3 3-3 3"/>'),
  outdent: S('<path d="M4 6h16M10 10h10M10 14h10M4 18h16M7 9l-3 3 3 3"/>'),
  color: S('<path d="m6 17 6-13 6 13M8.5 12h7"/>'),
  marker: S('<path d="m9 15 7-7 3 3-7 7H9zM4 21h16"/>'),
  fill: S('<path d="m5 12 7-7 7 7-7 7zM19 15s2 2.2 2 3.5a2 2 0 0 1-4 0c0-1.3 2-3.5 2-3.5z"/>'),
  clear: S('<path d="M6 5h12M12 5l-3 14M4 20l16-16"/>'),
  table: S('<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 9.5h18M3 15h18M9 4v16M15 4v16"/>'),
  image: S('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>'),
  link: S('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
  hr: S('<path d="M3 12h18M7 7h10M7 17h10" stroke-dasharray="2 2"/>'),
  pagebreak: S('<path d="M5 3v5h14V3M5 21v-5h14v5M3 12h3M9 12h2M14 12h2M19 12h2"/>'),
  sigma: S('<path d="M18 5H6l6 7-6 7h12"/>'),
  sortUp: S('<path d="M7 20V4M3 8l4-4 4 4M14 5h7M14 10h5M14 15h3"/>'),
  sortDown: S('<path d="M7 4v16M3 16l4 4 4-4M14 5h3M14 10h5M14 15h7"/>'),
  rowAdd: S('<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 12h18M12 15v4M10 17h4"/>'),
  colAdd: S('<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M12 4v16M16 10h4M18 8v4"/>'),
  del: S('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  sheet: S('<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 9h18M8 4v16"/><path d="M14 14h4M16 12v4"/>'),
  slideAdd: S('<rect x="3" y="5" width="18" height="12" rx="1.5"/><path d="M12 8v6M9 11h6M8 21h8"/>'),
  dup: S('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>'),
  text: S('<path d="M5 6V4h14v2M12 4v16M9 20h6"/>'),
  rect: S('<rect x="4" y="6" width="16" height="12" rx="1"/>'),
  round: S('<rect x="4" y="6" width="16" height="12" rx="4"/>'),
  oval: S('<ellipse cx="12" cy="12" rx="8" ry="6"/>'),
  front: S('<rect x="9" y="9" width="11" height="11" rx="1.5" fill="currentColor" fill-opacity=".25"/><path d="M15 9V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h4"/>'),
  back: S('<rect x="4" y="4" width="11" height="11" rx="1.5" fill="currentColor" fill-opacity=".25"/><path d="M9 15v4a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-4"/>'),
  play: S('<path d="M7 4.5v15l12-7.5z"/>'),
  playCur: S('<rect x="3" y="5" width="18" height="12" rx="1.5"/><path d="m10 8.5 5 2.5-5 2.5z"/><path d="M8 21h8"/>'),
  theme: S('<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18c1.5 0 2-1 2-2s-1-1.5-1-2.5 1-1.5 2-1.5h2a4 4 0 0 0 4-4c0-4.5-4-8-9-8z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10.5" cy="7.5" r="1"/><circle cx="15" cy="8" r="1"/>'),
  print: S('<path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z"/>'),
  save: S('<path d="M5 3h11l4 4v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/>'),
  fx: S('<path d="M10 4c-2 0-3 1-3.5 4L5 20M3 10h7M14 10l6 8M20 10l-6 8"/>'),
  zoom: S('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M8 11h6M11 8v6"/>'),
  spell: S('<path d="m4 15 4-10 4 10M5.5 11h5M14 17l2.5 2.5L21 14"/>'),
  date: S('<rect x="3" y="4.5" width="18" height="16.5" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4M8 14h3"/>'),
  omega: S('<path d="M5 20h4v-2a7 7 0 1 1 6 0v2h4"/>'),
  orient: S('<rect x="4" y="3" width="10" height="14" rx="1"/><rect x="8" y="12" width="13" height="9" rx="1"/>'),
  margin: S('<rect x="4" y="3" width="16" height="18" rx="1"/><rect x="8" y="7" width="8" height="10" stroke-dasharray="2 2"/>'),
  find: S('<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.5-4.5"/>'),
  replace: S('<path d="M4 7h11l-3-3M20 17H9l3 3"/>'),
  wrap: S('<path d="M4 6h16M4 12h13a3 3 0 0 1 0 6h-4M15 16l-2 2 2 2M4 18h6"/>'),
  border: S('<rect x="4" y="4" width="16" height="16"/><path d="M4 12h16M12 4v16" stroke-dasharray="2 2"/>'),
  noborder: S('<rect x="4" y="4" width="16" height="16" stroke-dasharray="2 2"/>'),
  merge: S('<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M7 12h10M9 10l-2 2 2 2M15 10l2 2-2 2"/>'),
  freeze: S('<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 9h18M8 4v16" stroke-width="2.4"/>'),
  chartBar: S('<path d="M4 20h16M7 16v-5M12 16V6M17 16v-8"/>'),
  chartLine: S('<path d="M4 20h16M5 15l4-5 4 3 6-7"/>'),
  chartPie: S('<path d="M12 3v9h9a9 9 0 1 1-9-9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>'),
  filter: S('<path d="M4 5h16l-6 7.5V19l-4 1.5v-8z"/>'),
  decUp: S('<path d="M3 17h2M8 17a2.5 3.5 0 1 0 0-.1M14 17a2.5 3.5 0 1 0 0-.1M18 8l3 3-3 3M21 11h-5"/>'),
  decDown: S('<path d="M3 17h2M8 17a2.5 3.5 0 1 0 0-.1M14 17a2.5 3.5 0 1 0 0-.1M19 8l-3 3 3 3M16 11h5"/>'),
  case: S('<path d="m3 18 4-11 4 11M4.5 14h5M14 18v-6.5a2.5 2.5 0 0 1 5 0V18M14 14.5h5"/>'),
  spacing: S('<path d="M10 6h10M10 12h10M10 18h10M5 4v16M3 6l2-2 2 2M3 18l2 2 2-2"/>'),
  tri: S('<path d="M12 4 21 20H3z"/>'),
  arrow: S('<path d="M3 9h11V5l7 7-7 7v-4H3z"/>'),
  star: S('<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>'),
  line: S('<path d="M4 20 20 4"/>'),
  aLeft: S('<path d="M4 3v18M8 7h12v4H8zM8 14h7v4H8z"/>'),
  aCenter: S('<path d="M12 3v18M6 7h12v4H6zM8.5 14h7v4h-7z"/>'),
  aRight: S('<path d="M20 3v18M4 7h12v4H4zM9 14h7v4H9z"/>'),
  aTop: S('<path d="M3 4h18M7 8h4v12H7zM14 8h4v7h-4z"/>'),
  aMiddle: S('<path d="M3 12h18M7 6h4v12H7zM14 8.5h4v7h-4z"/>'),
  aBottom: S('<path d="M3 20h18M7 4h4v12H7zM14 9h4v7h-4z"/>'),
  fade: S('<rect x="3" y="5" width="12" height="10" rx="1.5"/><rect x="9" y="9" width="12" height="10" rx="1.5" fill="currentColor" fill-opacity=".2"/>'),
  sorter: S('<rect x="3" y="4" width="8" height="6" rx="1"/><rect x="13" y="4" width="8" height="6" rx="1"/><rect x="3" y="14" width="8" height="6" rx="1"/><rect x="13" y="14" width="8" height="6" rx="1"/>'),
  read: S('<path d="M3 5.5c3-1.5 6-1.5 9 .5 3-2 6-2 9-.5V19c-3-1.5-6-1.5-9 .5-3-2-6-2-9-.5zM12 6v13.5"/>'),
  painter: S('<rect x="4" y="3" width="14" height="6" rx="1.5"/><path d="M18 6h2v5h-8v3M11 14h2v7h-2z"/>'),
  outline: S('<rect x="4" y="4" width="16" height="16" rx="3" stroke-width="2.6"/>'),
  dateIns: S('<rect x="3" y="4.5" width="18" height="16.5" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4M12 13v4M10 15h4"/>'),
  dupes: S('<rect x="3" y="3" width="11" height="11" rx="1.5"/><rect x="10" y="10" width="11" height="11" rx="1.5"/><path d="m13 16 2 2 4-4"/>'),
  cond: S('<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 9h18M3 14.5h18" /><rect x="5" y="10.5" width="6" height="2.5" fill="currentColor" fill-opacity=".5" stroke="none"/>'),
};

// floating Find / Replace bar; onFind(text) -> count, onStep(dir), onReplace(text, with, all)
export function findBar(host, { onFind, onStep, onReplace, replace = true }) {
  host.querySelector('.findbar')?.remove();
  const bar = document.createElement('div'); bar.className = 'findbar';
  bar.innerHTML = `<input class="input" placeholder="Find" data-f="q">${replace ? '<input class="input" placeholder="Replace with" data-f="r">' : ''}
    <span class="cnt"></span><button class="rb" data-f="prev" title="Previous">↑</button><button class="rb" data-f="next" title="Next">↓</button>
    ${replace ? '<button class="btn sm" data-f="one">Replace</button><button class="btn sm" data-f="all">All</button>' : ''}<button class="rb" data-f="x" title="Close">✕</button>`;
  host.append(bar);
  const q = bar.querySelector('[data-f="q"]'), r = bar.querySelector('[data-f="r"]'), cnt = bar.querySelector('.cnt');
  const run = () => { const n = onFind(q.value); cnt.textContent = q.value ? `${n} found` : ''; };
  q.oninput = run;
  q.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); onStep(e.shiftKey ? -1 : 1); } if (e.key === 'Escape') bar.remove(); };
  bar.querySelector('[data-f="prev"]').onclick = () => onStep(-1);
  bar.querySelector('[data-f="next"]').onclick = () => onStep(1);
  bar.querySelector('[data-f="x"]').onclick = () => { onFind(''); bar.remove(); };
  if (replace) {
    bar.querySelector('[data-f="one"]').onclick = () => { onReplace(q.value, r.value, false); run(); };
    bar.querySelector('[data-f="all"]').onclick = () => { const n = onReplace(q.value, r.value, true); toast(`${n} replaced`); run(); };
  }
  q.focus();
  return bar;
}

// the frame; returns its parts. kind: word | excel | ppt
export function frame(view, { kind, name, tabs, saved = true }) {
  document.body.classList.add('editing');
  view.innerHTML = `<div class="ed ed-${kind}">
    <div class="ed-title"><a class="ed-back" href="#${{ word: 'document', excel: 'grid', ppt: 'present' }[kind]}" title="Back">${ic('back')}</a>
      <div class="ed-app">${ic(kind)}</div><input class="ed-name" value="${esc(name)}" spellcheck="false" title="File name">
      <span class="ed-state" id="ed-state"></span><span class="grow"></span>
      <span id="ed-extra"></span><button class="btn sm" id="ed-office" title="Open the saved file in the Microsoft Office app">${ic('open')}Open in ${{ word: 'Word', excel: 'Excel', ppt: 'PowerPoint' }[kind]}</button>
      <button class="btn sm primary" id="ed-save">${I.save}Save</button></div>
    <div class="ed-tabs" id="ed-tabs">${tabs.map((t, i) => `<button data-tab="${t}" class="${t === 'File' ? 'file' : i === 1 ? 'on' : ''}">${t}</button>`).join('')}</div>
    <div class="ed-ribbon" id="ed-ribbon"></div>
    <div class="ed-body" id="ed-body"></div>
    <div class="ed-status" id="ed-status"></div></div>`;
  const parts = { root: $('.ed', view), name: $('.ed-name', view), state: $('#ed-state'), ribbon: $('#ed-ribbon'), body: $('#ed-body'), status: $('#ed-status'), tabs: $('#ed-tabs'), extra: $('#ed-extra') };
  // (a new file is "not saved yet", not "unsaved changes": nothing to lose until something is typed)
  setDirty(parts, false, saved ? '' : 'New · not saved yet');
  return parts;
}
export function setDirty(parts, dirty, label = '') {
  window.__lloDirty = dirty;
  if (dirty) parts.onEdit?.(); else parts.onClean?.(); // editing together (live.js): tell the others
  parts.state.textContent = dirty ? '● Unsaved changes' : label || '✓ Saved';
  parts.state.classList.toggle('dirty', dirty);
}

// File menu (shared): Save, Save copy, PDF, open in Office, Storage, Mail, Print
export function fileMenu(parts, { save, kindLabel, print }) {
  const items = [['save', I.save, 'Save', 'Ctrl+S'], ['copy', I.dup, 'Save a copy', 'New file with a new name'], ['pdf', ic('pdfout'), 'Save as PDF', 'Saves, then makes a PDF next to it'],
    ['office', ic('open'), `Open in Microsoft ${kindLabel}`, 'Edit there with every Office feature'],
    ['mail', ic('send'), 'Send by Mail', 'Attach to a new mail'], ...(print ? [['print', I.print, 'Print', '']] : []), ['folder', ic('folder'), 'Show in folder', '']];
  const m = L.modal(`<h2>${ic('file')} File</h2><div class="fmenu">${items.map(([k, icn, l, d]) => `<button data-f="${k}">${icn}<div><b>${l}</b><small>${d}</small></div></button>`).join('')}</div>`);
  $$('[data-f]', m).forEach((b) => (b.onclick = async () => {
    L.closeModal();
    const k = b.dataset.f;
    if (k === 'save') return save();
    if (k === 'copy') { const n = prompt('Name for the copy', `${parts.name.value} copy`); if (n) return save({ copyName: n }); return; }
    if (k === 'print') return print();
    const r = await save({ quiet: k !== 'pdf', pdf: k === 'pdf' });
    if (!r) return;
    if (k === 'office') L.openLocal(r.file);
    if (k === 'mail') L.compose({ attachments: [r.file] });
    if (k === 'folder') POST('/api/files/reveal', { path: r.file }).catch(fail);
    if (k === 'pdf' && r.pdf) toast(`PDF ready: ${r.pdf.split('\\').pop()}`);
  }));
}

// switch ribbon tabs; render(tab) returns the ribbon html, bind() wires it
export function tabsWire(parts, render, bind) {
  const show = (t) => {
    $$('[data-tab]', parts.tabs).forEach((b) => b.classList.toggle('on', b.dataset.tab === t));
    parts.ribbon.innerHTML = render(t); bind(t);
  };
  $$('[data-tab]', parts.tabs).forEach((b) => (b.onclick = () => (b.dataset.tab === 'File' ? parts.onFile?.() : show(b.dataset.tab))));
  show($$('[data-tab]', parts.tabs)[1].dataset.tab);
  return show;
}

export async function ask(prompt, system) {
  const r = await POST('/api/chatbot', { messages: [{ role: 'user', content: system ? `${system}\n\n${prompt}` : prompt }] });
  return r.reply.replace(/^```\w*\n?|```\s*$/g, '').trim();
}
export const pickFile = (accept) => new Promise((ok) => {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = accept;
  inp.onchange = () => { const f = inp.files[0]; if (!f) return ok(null); const r = new FileReader(); r.onload = () => ok({ name: f.name, data: r.result }); r.readAsDataURL(f); };
  inp.click();
});

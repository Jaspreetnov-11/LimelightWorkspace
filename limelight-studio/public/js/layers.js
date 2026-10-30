// Limelight Studio - Photoshop-style Layers panel: kind filter, blend/opacity/lock bar, eye column, thumbnails,
// groups as folders, smart-object and text badges, masks with link chain, fx effects with their own eyes.
const TYPE_ICON = { textbox: 'text', 'i-text': 'text', text: 'text', image: 'image', rect: 'rect', ellipse: 'ellipse', circle: 'ellipse', triangle: 'triangle', polygon: 'polygon', path: 'pen', line: 'line', group: 'folder' };
const LY = { kind: 'all', q: '', open: new Set(), fxClosed: new Set(), stamp: 0, thumbs: new Map() };
let dragLayer = null;

const isText = (o) => o.type?.includes('text');
const isSmart = (o) => (o.type === 'group' && !o.isFolder && !/^(Group|Text combo)/.test(o.name || 'Group')) || !!o.scene3d;
const isFolder = (o) => o.type === 'group' && !isSmart(o);
const kindOf = (o) => isText(o) ? 'text' : o.type === 'image' && !o.scene3d ? 'image' : isSmart(o) ? 'smart' : o.type === 'group' ? 'group' : 'shape';
const layerName = (o) => o.name && !['Text', 'Textbox'].includes(o.name) ? o.name : isText(o) ? o.text.replace(/\s+/g, ' ').slice(0, 40) : o.type;

// ---------- effects (layer styles) ----------
function effectsOf(o) {
  const off = o.fxOff || {}, fx = [];
  if (o.shadow || off.shadow) fx.push({ key: 'shadow', name: 'Drop Shadow', on: !!o.shadow });
  if ((o.stroke && o.strokeWidth > 0 && (isText(o) || o.type === 'image')) || off.stroke) fx.push({ key: 'stroke', name: 'Stroke', on: !off.stroke });
  if (o.type === 'image') {
    (o.filters || []).filter(Boolean).forEach((f) => fx.push({ key: 'filter:' + f.type, name: f.type.replace('HueRotation', 'Hue'), on: true, smart: true }));
    (off.filters || []).forEach((f) => fx.push({ key: 'filter:' + f.type, name: f.type.replace('HueRotation', 'Hue'), on: false, smart: true }));
  }
  return fx;
}
function toggleFx(o, key) {
  o.fxOff = o.fxOff || {};
  const off = o.fxOff;
  if (key === 'shadow') {
    if (o.shadow) { off.shadow = o.shadow.toObject(); o.set('shadow', null); } else if (off.shadow) { o.set('shadow', new fabric.Shadow(off.shadow)); delete off.shadow; }
  } else if (key === 'stroke') {
    if (!off.stroke) { off.stroke = { stroke: o.stroke, strokeWidth: o.strokeWidth }; o.set('strokeWidth', 0); } else { o.set(off.stroke); delete off.stroke; }
  } else if (key.startsWith('filter:')) {
    const type = key.slice(7), cur = (o.filters || []).find((f) => f && f.type === type);
    off.filters = off.filters || [];
    if (cur) { off.filters.push(cur.toObject()); o.filters = o.filters.filter((f) => f !== cur); }
    else { const i = off.filters.findIndex((f) => f.type === type); if (i >= 0) { o.filters.push(new fabric.Image.filters[type](off.filters[i])); off.filters.splice(i, 1); } }
    o.applyFilters();
  }
  o.dirty = true; ED.canvas.requestRenderAll(); scheduleHistory(); renderInspector();
}

// ---------- thumbnails ----------
function thumbOf(o) {
  const c = LY.thumbs.get(o);
  if (c && c.stamp === LY.stamp) return c.url;
  let url = '';
  try {
    const w = o.getScaledWidth() || 1, h = o.getScaledHeight() || 1;
    url = o.toDataURL({ format: 'png', multiplier: Math.min(4, 72 / Math.max(w, h)), enableRetinaScaling: false });
  } catch { /* objects that cannot render alone */ }
  LY.thumbs.set(o, { stamp: LY.stamp, url });
  return url;
}
function maskThumb(o) {
  const cp = o.clipPath; if (!cp) return '';
  const cv = document.createElement('canvas'); cv.width = cv.height = 36;
  const ctx = cv.getContext('2d'); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 36, 36);
  const fill = cp.fill; cp.fill = '#ffffff';
  try {
    const img = cp.toCanvasElement({ multiplier: 30 / Math.max(cp.width * (cp.scaleX || 1), cp.height * (cp.scaleY || 1), 1) });
    ctx.drawImage(img, (36 - img.width) / 2, (36 - img.height) / 2);
  } catch { /* ignore */ }
  cp.fill = fill;
  return cv.toDataURL();
}
ED.on('history', () => { LY.stamp++; });
ED.on('page', () => { LY.stamp++; LY.thumbs = new Map(); });

// ---------- panel ----------
let dragMask = null; // the mask thumbnail being dragged (to the trash = delete, to a layer = move)
function panelLayers(body) {
  const c = ED.canvas; if (!c) return;
  const objs = selected(), one = objs[0], has = objs.length > 0;
  const list = $('.lp-list', body), keepScroll = list ? list.scrollTop : 0;
  body.innerHTML = `
    <div class="lp-top">
      <div class="lp-line">
        <div class="lp-search">${icon('search')}<select data-ly="kind">${[['all', 'Kind'], ['image', 'Pixel'], ['text', 'Text'], ['shape', 'Shape'], ['smart', 'Smart Object'], ['group', 'Group']].map(([v, n]) => `<option value="${v}" ${LY.kind === v ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        <div class="lp-kinds">${[['image', 'image'], ['text', 'text'], ['shape', 'rect'], ['smart', 'smart']].map(([k, i]) => `<button class="icon-btn ${LY.kind === k ? 'on' : ''}" data-kind="${k}" title="Show only ${k}">${icon(i)}</button>`).join('')}</div>
      </div>
      <input class="lp-q" data-ly="q" placeholder="Search layer name" value="${esc(LY.q)}">
      <div class="lp-line">
        <select data-ly="blend" ${has ? '' : 'disabled'}>${BLENDS.map((b) => `<option value="${b}" ${one?.globalCompositeOperation === b ? 'selected' : ''}>${b === 'source-over' ? 'Normal' : b.replace(/-/g, ' ').replace(/^\w/, (x) => x.toUpperCase())}</option>`).join('')}</select>
        <label class="lp-op">Opacity:<input type="number" min="0" max="100" data-ly="opacity" value="${has ? Math.round((one.opacity ?? 1) * 100) : 100}" ${has ? '' : 'disabled'}>%</label>
      </div>
      <div class="lp-line lp-lock">Lock:
        <button class="icon-btn ${one?.lockMovementX && !one?.locked ? 'on' : ''}" data-ly="lockPos" title="Lock position" ${has ? '' : 'disabled'}>${icon('move4')}</button>
        <button class="icon-btn ${one?.locked ? 'on' : ''}" data-ly="lockAll" title="Lock all" ${has ? '' : 'disabled'}>${icon('lock')}</button>
        <span class="grow"></span><span class="muted small">${c.getObjects().length - 1} layers</span>
      </div>
    </div>
    <div class="lp-list"></div>
    <div class="lp-bottom">
      <button class="icon-btn" data-lb="link" title="Link / group selected layers">${icon('chain')}</button>
      <button class="icon-btn fxb" data-lb="fx" title="Add layer style: Drop Shadow">fx</button>
      <button class="icon-btn" data-lb="mask" title="Add layer mask">${icon('maskIc')}</button>
      <button class="icon-btn" data-lb="adjust" title="Adjustments (images)">${icon('adjust')}</button>
      <button class="icon-btn" data-lb="group" title="Create a new group from selection (Ctrl+G)">${icon('folder')}</button>
      <button class="icon-btn" data-lb="dup" title="New layer (copy of selected)">${icon('newLayer')}</button>
      <button class="icon-btn" data-lb="del" title="Delete layer">${icon('trash')}</button>
    </div>`;
  const listEl = $('.lp-list', body);
  const sel = new Set(objs);
  const match = (o) => (LY.kind === 'all' || kindOf(o) === LY.kind) && (!LY.q || layerName(o).toLowerCase().includes(LY.q.toLowerCase()));
  const rows = [];
  const filtering = LY.kind !== 'all' || LY.q;
  (function walk(items, depth, parent) {
    items.slice().reverse().forEach((o) => {
      if (o.isPage) return;
      const folder = o.type === 'group';
      if (filtering && folder) { walk(o.getObjects(), depth, o); if (!match(o)) return; }
      if (!filtering || match(o)) rows.push({ o, depth: filtering ? 0 : depth, parent });
      if (!filtering && folder && LY.open.has(o.id)) walk(o.getObjects(), depth + 1, o);
    });
  })(c.getObjects(), 0, null);

  listEl.innerHTML = rows.map(({ o, depth, parent }, i) => {
    const fx = effectsOf(o), folder = o.type === 'group', open = LY.open.has(o.id);
    const hidden = !o.visible || (parent && !parent.visible);
    const thumb = isText(o) ? `<div class="lp-thumb lp-T">${icon('text')}</div>`
      : folder && isFolder(o) ? `<div class="lp-thumb lp-folder">${icon('folder')}</div>`
      : `<div class="lp-thumb"><img src="${thumbOf(o)}" alt="">${isSmart(o) ? `<i class="lp-badge">${icon(o.scene3d ? 'cube' : 'smart')}</i>` : ''}</div>`;
    const hasM = (o.clipPath && (!folder || o.clipPath.psMask)) || o.psMaskOff;
    const mask = hasM ? `<span class="lp-chain">${icon('chain')}</span><div class="lp-thumb lp-mask ${window.PS?.maskEdit === o ? 'edit' : ''} ${o.psMaskOff ? 'off' : ''}" data-mthumb draggable="true"
      title="Layer mask · click = paint on it · Shift+click = disable · Ctrl+click = load selection · Alt+click = view · drag to the trash = delete · drag to a layer = move (Alt copies) · right-click = more"><img src="${o.psMaskOff ? o.psMaskOff.src : maskThumb(o)}" alt=""></div>` : '';
    return `<div class="lrow ${sel.has(o) || (parent && sel.has(parent)) ? 'sel' : ''} ${hidden ? 'hid' : ''}" data-r="${i}" draggable="${depth === 0}">
        <button class="lp-eye" data-eye title="Show / hide">${o.visible ? icon('eye') : ''}</button>
        <div class="lp-main" style="padding-left:${6 + depth * 18}px">
          ${folder ? `<button class="lp-caret ${open ? 'open' : ''}" data-open title="Expand">${icon('caret')}</button>` : '<span class="lp-caret-sp"></span>'}
          ${thumb}${mask}
          <div class="lp-name" title="Double-click to rename">${esc(layerName(o))}</div>
          ${o.locked || o.lockMovementX ? `<span class="lp-lockic">${icon('lock')}</span>` : ''}
          ${fx.length ? `<button class="lp-fx" data-fxt title="Show / hide effects list">fx<span>${icon('caret')}</span></button>` : ''}
        </div>
      </div>
      ${fx.length && !LY.fxClosed.has(o.id) ? `<div class="lp-effects" style="--pad:${46 + depth * 18}px">
        <div class="lp-fxhead"><span class="lp-eye-sp"></span><span>${fx.some((f) => f.smart) && !fx.some((f) => !f.smart) ? 'Smart Filters' : 'Effects'}</span></div>
        ${fx.map((f) => `<div class="lp-fxrow ${f.on ? '' : 'off'}" data-fx="${i}|${f.key}"><button class="lp-eye" data-fxeye>${f.on ? icon('eye') : ''}</button><span>${f.name}</span></div>`).join('')}
      </div>` : ''}`;
  }).join('') || `<p class="note" style="padding:12px">${filtering ? 'No layers match this filter.' : 'Nothing on this page yet.'}</p>`;
  listEl.scrollTop = keepScroll;

  // --- row events ---
  $$('.lrow', listEl).forEach((el) => {
    const { o, parent, depth } = rows[+el.dataset.r];
    const top = parent && !filtering ? topParent(o) : o;
    el.onclick = (e) => {
      if (e.target.closest('[data-eye],[data-open],[data-fxt]') || el.querySelector('[contenteditable=true]')) return;
      const target = c.getObjects().includes(o) ? o : top;
      if ((e.shiftKey || e.ctrlKey) && c.getActiveObject()) {
        const cur = selected(), all = cur.includes(target) ? cur.filter((x) => x !== target) : [...cur, target];
        c.discardActiveObject(); if (all.length) c.setActiveObject(all.length > 1 ? new fabric.ActiveSelection(all, { canvas: c }) : all[0]);
      } else c.setActiveObject(target);
      c.requestRenderAll(); ED.emit('selection');
    };
    $('[data-eye]', el).onclick = () => {
      o.visible = !o.visible;
      if (parent) parent.dirty = true;
      if (!o.visible && c.getActiveObject() === o) c.discardActiveObject();
      c.requestRenderAll(); scheduleHistory(); panelLayers(body);
    };
    const caret = $('[data-open]', el);
    if (caret) caret.onclick = () => { LY.open.has(o.id) ? LY.open.delete(o.id) : LY.open.add(o.id); panelLayers(body); };
    const fxt = $('[data-fxt]', el);
    if (fxt) fxt.onclick = () => { LY.fxClosed.has(o.id) ? LY.fxClosed.delete(o.id) : LY.fxClosed.add(o.id); panelLayers(body); };
    const nm = $('.lp-name', el);
    nm.ondblclick = (e) => {
      e.stopPropagation(); nm.contentEditable = true; nm.focus(); document.getSelection().selectAllChildren(nm);
      const done = () => { nm.contentEditable = false; const v = nm.textContent.trim(); if (v) o.name = v; scheduleHistory(); renderInspector(); };
      nm.onblur = done; nm.onkeydown = (ev) => { ev.stopPropagation(); if (ev.key === 'Enter') { ev.preventDefault(); nm.blur(); } if (ev.key === 'Escape') { nm.textContent = layerName(o); nm.blur(); } };
    };
    const mt = $('[data-mthumb]', el);
    if (mt) {
      mt.onclick = (e) => { e.stopPropagation(); window.psMaskThumbClick?.(o, e); };
      mt.oncontextmenu = (e) => { e.preventDefault(); e.stopPropagation(); window.psMaskMenu?.(o, e); };
      mt.ondragstart = (e) => { e.stopPropagation(); dragMask = o; dragLayer = null; e.dataTransfer.effectAllowed = 'copyMove'; e.dataTransfer.setData('text/plain', 'mask'); $('[data-lb=del]', body)?.classList.add('drop-hint'); };
      mt.ondragend = () => { dragMask = null; $('[data-lb=del]', body)?.classList.remove('drop-hint'); };
    }
    const lt = $('.lp-thumb:not(.lp-mask)', el); if (lt) lt.addEventListener('click', () => window.psLayerThumbClick?.(o));
    if (!filtering) {
      el.addEventListener('dragover', (e) => { if (dragMask) { e.preventDefault(); el.classList.add('drag-over'); } });
      el.addEventListener('drop', (e) => { if (!dragMask) return; e.preventDefault(); e.stopImmediatePropagation(); el.classList.remove('drag-over'); const from = dragMask; dragMask = null; window.psMaskMove?.(from, top, e.altKey); }, true);
    }
    if (depth === 0 && !filtering) {
      el.ondragstart = () => { if (!dragMask) dragLayer = o; };
      el.ondragover = (e) => { e.preventDefault(); el.classList.add('drag-over'); };
      el.ondragleave = () => el.classList.remove('drag-over');
      el.ondrop = (e) => {
        e.preventDefault(); el.classList.remove('drag-over');
        if (!dragLayer || dragLayer === o) return;
        const objsAll = c.getObjects(), from = objsAll.indexOf(dragLayer), to = objsAll.indexOf(o);
        c.moveTo(dragLayer, Math.max(1, from < to ? to : to + 1));
        c.requestRenderAll(); scheduleHistory(); panelLayers(body);
      };
    }
  });
  $$('[data-fx]', listEl).forEach((el) => {
    const [ri, key] = el.dataset.fx.split('|');
    $('[data-fxeye]', el).onclick = () => { toggleFx(rows[+ri].o, key); panelLayers(body); };
    el.ondblclick = () => { c.setActiveObject(topParent(rows[+ri].o)); c.requestRenderAll(); ED.emit('selection'); };
  });

  // --- top bar ---
  $('[data-ly=kind]', body).onchange = (e) => { LY.kind = e.target.value; panelLayers(body); };
  $$('[data-kind]', body).forEach((b) => b.onclick = () => { LY.kind = LY.kind === b.dataset.kind ? 'all' : b.dataset.kind; panelLayers(body); });
  const q = $('[data-ly=q]', body);
  q.oninput = () => { LY.q = q.value; clearTimeout(q._t); q._t = setTimeout(() => { panelLayers(body); const n = $('[data-ly=q]', body); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); };
  $('[data-ly=blend]', body).onchange = (e) => { objs.forEach((o) => o.set('globalCompositeOperation', e.target.value)); c.requestRenderAll(); scheduleHistory(); renderInspector(); };
  $('[data-ly=opacity]', body).onchange = (e) => { const v = Math.max(0, Math.min(100, +e.target.value)) / 100; objs.forEach((o) => o.set('opacity', v)); c.requestRenderAll(); scheduleHistory(); renderInspector(); };
  $('[data-ly=lockPos]', body).onclick = () => { objs.forEach((o) => { const v = !o.lockMovementX; o.set({ lockMovementX: v, lockMovementY: v }); }); scheduleHistory(); panelLayers(body); };
  $('[data-ly=lockAll]', body).onclick = () => { objs.forEach((o) => lockObj(o, !o.locked)); c.requestRenderAll(); scheduleHistory(); renderInspector(); panelLayers(body); };

  // --- bottom bar ---
  const trash = $('[data-lb=del]', body);
  trash.ondragover = (e) => { if (dragMask || dragLayer) { e.preventDefault(); trash.classList.add('drop-on'); } };
  trash.ondragleave = () => trash.classList.remove('drop-on');
  trash.ondrop = (e) => {
    e.preventDefault(); trash.classList.remove('drop-on', 'drop-hint');
    if (dragMask) { const o = dragMask; dragMask = null; if (window.psMaskDelete) return window.psMaskDelete(o); o.clipPath = null; c.requestRenderAll(); scheduleHistory(); return panelLayers(body); }
    if (dragLayer) { const o = dragLayer; dragLayer = null; c.remove(o); c.discardActiveObject(); c.requestRenderAll(); scheduleHistory(); panelLayers(body); }
  };
  $$('[data-lb]', body).forEach((b) => b.onclick = (ev) => {
    const act = b.dataset.lb;
    if (!has && act !== 'group') return toast('Select a layer first');
    if (act === 'link' || act === 'group') { if (objs.length < 2) return toast('Select 2 or more layers (Shift-click)'); groupSel(); const g = c.getActiveObject(); if (g) { g.name = act === 'group' ? `Group ${c.getObjects().filter((x) => x.type === 'group').length}` : 'Group'; LY.open.add(g.id); } }
    if (act === 'fx') objs.forEach((o) => { if (!o.shadow) o.set('shadow', new fabric.Shadow({ color: '#00000088', blur: 30, offsetX: 0, offsetY: 12 })); });
    if (act === 'mask') { if (window.psAddMaskBtn && ED.mode === 'design') return objs.forEach((o) => window.psAddMaskBtn(o, ev.altKey)); objs.forEach((o) => setMask(o, o.clipPath ? 'none' : 'rounded')); }
    if (act === 'adjust') { if (one.type !== 'image') return toast('Adjustments work on image layers'); $('#inspector').scrollTop = 0; $$('#inspector h5').find((h) => h.textContent.startsWith('Adjust'))?.scrollIntoView({ behavior: 'smooth' }); return; }
    if (act === 'dup') return duplicateSel();
    if (act === 'del') return deleteSel();
    c.requestRenderAll(); scheduleHistory(); renderInspector(); panelLayers(body);
  });
}
function topParent(o) { let p = o; while (p.group && p.group.type === 'group') p = p.group; return p; }

let layersT;
const refreshLayers = () => { clearTimeout(layersT); layersT = setTimeout(() => curTab === 'layers' && panelLayers($('#sideBody')), 60); };
['selection', 'history', 'page', 'layers'].forEach((e) => ED.on(e, refreshLayers));

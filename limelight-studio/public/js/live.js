// Limelight Studio - live editing (like Edit): everyone with the same design open sees each other's changes as they
// happen, who is here (avatars at the top), what each one has selected (a box in their colour) and their pointer.
// Changes travel as whole objects keyed by id (added / changed / removed + the stacking order) and as the artboard list;
// each editor still saves the file as before, so someone opening it later gets the saved design.
const LIVE = { es: null, pid: null, cid: Math.random().toString(36).slice(2, 10), me: null, people: [], cursors: new Map(), base: null };
const livePost = (body) => LIVE.pid && LIVE.me && fetch(`/api/live/${LIVE.pid}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cid: LIVE.cid, ...body }) }).catch(() => {});
const liveProject = () => (ED.stack ? ED.stack.project : ED.project); // (while a layer is open, the design is still the one shared)
const curPageId = () => ED.project?.pages[ED.pageIndex]?.id;
const others = () => LIVE.people.filter((p) => p.cid !== LIVE.cid);

function liveConnect() {
  const pid = liveProject()?.id && !liveProject().child ? liveProject().id : null;
  if (pid === LIVE.pid) return;
  LIVE.es?.close(); LIVE.es = null; LIVE.me = null; LIVE.people = []; LIVE.cursors.clear(); LIVE.base = null; renderPeople();
  LIVE.pid = pid; if (!pid) return;
  let name = 'This PC'; try { name = localStorage.getItem('ll-live-name') || name; } catch { /* private window */ }
  const es = LIVE.es = new EventSource(`/api/live/${pid}?cid=${LIVE.cid}&name=${encodeURIComponent(name)}`);
  es.addEventListener('hello', (e) => { LIVE.me = JSON.parse(e.data); liveBase(); sendState(); });
  es.addEventListener('presence', (e) => { LIVE.people = JSON.parse(e.data); renderPeople(); ED.canvas?.requestRenderAll(); });
  es.addEventListener('cursor', (e) => { const d = JSON.parse(e.data); LIVE.cursors.set(d.cid, { ...d, t: Date.now() }); ED.canvas?.requestRenderAll(); });
  es.addEventListener('ops', (e) => applyOps(JSON.parse(e.data)).catch((err) => console.error('live', err)));
}

// ---------------- what changed here ----------------
const liveObjs = () => ED.canvas.toJSON(PROPS).objects.filter((o) => !o.fromMaster);
const pagesMeta = (P) => P.pages.map((p) => ({ id: p.id, name: p.name, w: p.w, h: p.h }));
// (an artboard added, deleted, renamed or resized here goes out before the new page becomes the base)
function livePages() {
  const P = liveProject(); if (!LIVE.base || !LIVE.me || ED.applyingLive || !P) return;
  if (JSON.stringify(pagesMeta(P)) === LIVE.base.pages && P.name === LIVE.base.name) return;
  if (!ED.stack) storePage();
  const msg = { kind: 'ops', page: null, upserts: [], removes: [], pages: P.pages.map((p) => ({ id: p.id, name: p.name, w: p.w, h: p.h, ...(LIVE.base.ids.has(p.id) ? {} : { json: p.json }) })) };
  if (P.name !== LIVE.base.name) msg.meta = { name: P.name };
  LIVE.base.pages = JSON.stringify(pagesMeta(P)); LIVE.base.ids = new Set(P.pages.map((p) => p.id)); LIVE.base.name = P.name;
  livePost(msg);
}
function liveBase(check = true) {
  if (!ED.project || !ED.canvas) return;
  if (check) livePages();
  const P = liveProject(), objs = ED.stack ? null : liveObjs();
  LIVE.base = { page: ED.stack ? null : curPageId(), map: objs && new Map(objs.map((o) => [o.id, JSON.stringify(o)])), order: objs?.map((o) => o.id).join('|'),
    pages: JSON.stringify(pagesMeta(P)), ids: new Set(P.pages.map((p) => p.id)), name: P.name };
}
function liveDiff() {
  if (!LIVE.me || !ED.project || ED.applyingLive) return;
  // (inside a Vector / Book layer, or a master page, the design's page is not on the canvas: it goes when you come back)
  if (ED.stack || ED.editingMaster || !LIVE.base || LIVE.base.page !== curPageId()) return liveBase();
  const P = ED.project, objs = liveObjs(), upserts = [], removes = [], ids = new Set();
  for (const o of objs) { ids.add(o.id); const s = JSON.stringify(o); if (LIVE.base.map.get(o.id) !== s) upserts.push(o); }
  for (const id of LIVE.base.map.keys()) if (!ids.has(id)) removes.push(id);
  const order = objs.map((o) => o.id).join('|');
  const msg = { kind: 'ops', page: curPageId(), upserts, removes };
  if (order !== LIVE.base.order) msg.order = objs.map((o) => o.id);
  livePages();
  liveBase(false);
  if (upserts.length || removes.length || msg.order) livePost(msg);
}
let stateT;
function sendState() { clearTimeout(stateT); stateT = setTimeout(() => livePost({ kind: 'state', page: ED.stack ? ED.stack.project.pages[ED.stack.pageIndex]?.id : curPageId(), sel: ED.stack ? [] : selected().map((o) => o.id) }), 80); }

// ---------------- what changed there ----------------
const enliven = (list) => new Promise((ok) => fabric.util.enlivenObjects(localSrcs({ objects: list }).objects, ok));
function patchJSON(json, d) {
  const byId = new Map(d.upserts.map((o) => [o.id, o])), gone = new Set(d.removes);
  let objs = json.objects.filter((o) => !gone.has(o.id)).map((o) => byId.get(o.id) || o);
  for (const o of d.upserts) if (!objs.some((x) => x.id === o.id)) objs.push(o);
  if (d.order) { const at = new Map(d.order.map((id, i) => [id, i])); objs = objs.slice().sort((a, b) => (at.get(a.id) ?? 1e9) - (at.get(b.id) ?? 1e9)); }
  json.objects = objs;
}
async function applyOps(d) {
  const P = liveProject(); if (!P) return;
  if (d.meta?.name) { P.name = d.meta.name; if (!ED.stack) $('#docName').value = d.meta.name; renderDocTabs(); }
  if (d.pages) {
    if (!ED.stack) storePage();
    const old = new Map(P.pages.map((p) => [p.id, p])), cur = P.pages[ED.stack ? ED.stack.pageIndex : ED.pageIndex];
    P.pages = d.pages.map((m) => ({ ...(old.get(m.id) || {}), ...m, json: old.get(m.id)?.json || m.json })).filter((p) => p.json);
    const i = Math.max(0, P.pages.findIndex((p) => p.id === cur?.id));
    if (ED.stack) ED.stack.pageIndex = i;
    else {
      const resized = !cur || P.pages[i].id !== cur.id || P.pages[i].w !== ED.project.width || P.pages[i].h !== ED.project.height;
      ED.pageIndex = i;
      if (resized) { ED.applyingLive = true; await loadPage(i); fitView(); ED.applyingLive = false; }
      ED.emit('pages');
    }
  }
  const pg = P.pages.find((p) => p.id === d.page);
  const onCanvas = pg && !ED.stack && !ED.editingMaster && curPageId() === d.page;
  if (pg && !onCanvas) patchJSON(pg.json, d);
  if (onCanvas && (d.upserts.length || d.removes.length || d.order)) {
    const c = ED.canvas, act = c.getActiveObject(), gone = new Set(d.removes), fresh = await enliven(d.upserts);
    ED.applyingLive = true; ED.loading = true;
    if (act?.type === 'activeSelection' && act.getObjects().some((o) => gone.has(o.id) || d.upserts.some((u) => u.id === o.id))) c.discardActiveObject();
    c.getObjects().filter((o) => gone.has(o.id)).forEach((o) => { if (o === act) c.discardActiveObject(); c.remove(o); });
    fresh.forEach((o) => {
      const old = c.getObjects().find((x) => x.id === o.id);
      if (old?.isEditing) return; // (the text someone is typing in here stays theirs until they finish)
      if (!o.isPage) o.evented = ED.tool === 'select';
      if (old) { const i = c.getObjects().indexOf(old); const was = c.getActiveObject() === old; c.remove(old); c.insertAt(o, i); if (was) c.setActiveObject(o); }
      else c.add(o);
    });
    if (d.order) d.order.forEach((id, k) => { const o = c.getObjects().find((x) => x.id === id); const m = c.getObjects().filter((x) => x.fromMaster).length; if (o) c.moveTo(o, o.isPage ? 0 : k + m); });
    fixPageObjects();
    ED.loading = false;
    // (others' changes are part of the state my own undo steps go back to)
    ED.undo[ED.undo.length - 1] = snapshot();
    ED.applyingLive = false;
    liveBase(false); c.requestRenderAll(); ED.emit('selection');
    if (curTab === 'layers') refreshLayers();
  } else liveBase(false);
}

// ---------------- avatars, selections, pointers ----------------
const initials = (n) => String(n || '?').trim().split(/[\s.@_-]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';
function renderPeople() {
  let box = $('#livePeople');
  if (!box) { box = document.createElement('div'); box.id = 'livePeople'; box.className = 'live-people'; $('#saveState')?.after(box); }
  const list = others(), P = liveProject();
  const pageName = (id) => { const i = P?.pages.findIndex((p) => p.id === id); return i >= 0 ? P.pages[i].name : ''; };
  box.innerHTML = list.length ? `<span class="live-dot" title="Live — changes show for everyone at once">Live</span>` + list.map((p) => `<button class="live-av" data-lp="${p.cid}" style="--c:${p.color}" title="${esc(p.name)}${p.page ? ' · ' + esc(pageName(p.page)) : ''} — click to go to their artboard">${esc(initials(p.name))}</button>`).join('') : '';
  $$('[data-lp]', box).forEach((b) => b.onclick = () => { const p = LIVE.people.find((x) => x.cid === b.dataset.lp); const i = ED.project?.pages.findIndex((x) => x.id === p?.page); if (i >= 0 && !ED.stack) switchPage(i); });
}
function drawLive(ctx, v) {
  if (!LIVE.me || ED.stack) return;
  const page = curPageId(), tx = (x, y) => [x * v[0] + v[4], y * v[3] + v[5]];
  ctx.font = '600 11px Inter'; ctx.textBaseline = 'middle';
  const tag = (x, y, text, color) => { const w = ctx.measureText(text).width + 10; ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, w, 17, 4); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(text, x + 5, y + 8.5); };
  for (const p of others()) {
    if (p.page !== page) continue;
    (p.sel || []).forEach((id, k) => {
      const o = ED.canvas.getObjects().find((x) => x.id === id); if (!o) return;
      const r = o.getBoundingRect();
      ctx.strokeStyle = p.color; ctx.lineWidth = 2; ctx.setLineDash([]); ctx.strokeRect(r.left - 3, r.top - 3, r.width + 6, r.height + 6);
      if (!k) tag(r.left - 3, r.top - 22, p.name, p.color);
    });
    const cu = LIVE.cursors.get(p.cid);
    if (cu && cu.page === page && Date.now() - cu.t < 15000) {
      const [x, y] = tx(cu.x, cu.y);
      ctx.fillStyle = p.color; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 3, y + 15); ctx.lineTo(x + 7, y + 9); ctx.lineTo(x + 13, y + 9); ctx.closePath(); ctx.fill(); ctx.stroke();
      tag(x + 12, y + 12, p.name, p.color);
    }
  }
}

// ---------------- wiring ----------------
let moveT = 0, curT = 0;
function liveInit() {
  const c = ED.canvas;
  ED.on('history', liveDiff);
  ED.on('page', () => { liveBase(); sendState(); });
  ED.on('selection', sendState);
  ED.on('project', liveConnect);
  ED.on('pages', () => setTimeout(liveDiff, 0));
  ED.overlays.push(drawLive);
  // a single object being dragged shows on the other screens while it moves (the drop is sent as a change anyway)
  c.on('object:moving', (e) => {
    const o = e.target; if (!LIVE.me || !others().length || o.type === 'activeSelection' || ED.stack || Date.now() - moveT < 90) return;
    moveT = Date.now(); livePost({ kind: 'ops', page: curPageId(), upserts: [o.toObject(PROPS)], removes: [] });
  });
  c.on('mouse:move', (opt) => {
    if (!LIVE.me || !others().length || ED.stack || Date.now() - curT < 60) return;
    curT = Date.now(); const p = c.getPointer(opt.e); livePost({ kind: 'cursor', page: curPageId(), x: Math.round(p.x), y: Math.round(p.y) });
  });
  setInterval(() => { if (others().length) ED.canvas.requestRenderAll(); }, 5000); // (pointers that stopped fade out)
}
// leaving the editor leaves the room
const _goHomeLive = goHome;
goHome = async function () { await _goHomeLive(); LIVE.es?.close(); LIVE.es = null; LIVE.pid = null; LIVE.people = []; renderPeople(); };
const _bootLive = bootEditor;
bootEditor = function () { if (editorReady) return; _bootLive(); liveInit(); };

// Limelight Studio - Vector tab (Illustrator-style): direct selection of anchor points and their handles, add / delete
// / convert points, Pathfinder (unite, minus front, intersect, exclude), clipping masks, convert to path, Image Trace.
// Shapes keep being ordinary Fabric objects, so they export to SVG / AI / CDR / PDF as real vector paths.
Object.assign(TOOL_HINTS, {
  node: 'Direct selection: click a shape to see its points · drag a point or a handle · Alt-click a point = corner ↔ smooth · Del = delete the point',
  addNode: 'Add anchor point: click on a path’s outline',
});
const VN = { edit: null, drag: null }; // edit: { obj, subs:[{closed, nodes:[{x,y,ix,iy,ox,oy}]}], sel:{s,i} }

// ---------------- shapes as anchor points (design coordinates) ----------------
const K = 0.5523;
function shapeNodes(o) {
  const M = o.calcTransformMatrix(), T = (x, y) => fabric.util.transformPoint(new fabric.Point(x, y), M);
  const corner = (x, y) => { const p = T(x, y); return { x: p.x, y: p.y, ix: p.x, iy: p.y, ox: p.x, oy: p.y }; };
  const w = o.width / 2, h = o.height / 2;
  if (o.type === 'rect') return [{ closed: true, nodes: [corner(-w, -h), corner(w, -h), corner(w, h), corner(-w, h)] }];
  if (o.type === 'triangle') return [{ closed: true, nodes: [corner(0, -h), corner(w, h), corner(-w, h)] }];
  if (o.type === 'ellipse' || o.type === 'circle') {
    const rx = o.type === 'circle' ? o.radius : o.rx, ry = o.type === 'circle' ? o.radius : o.ry;
    const n = (x, y, ix, iy, ox, oy) => { const p = T(x, y), a = T(ix, iy), b = T(ox, oy); return { x: p.x, y: p.y, ix: a.x, iy: a.y, ox: b.x, oy: b.y }; };
    return [{ closed: true, nodes: [n(0, -ry, -rx * K, -ry, rx * K, -ry), n(rx, 0, rx, -ry * K, rx, ry * K), n(0, ry, rx * K, ry, -rx * K, ry), n(-rx, 0, -rx, ry * K, -rx, -ry * K)] }];
  }
  if (o.type === 'polygon' || o.type === 'polyline') {
    const off = o.pathOffset; return [{ closed: o.type === 'polygon', nodes: o.points.map((p) => corner(p.x - off.x, p.y - off.y)) }];
  }
  if (o.type === 'line') { const l = o.calcLinePoints(); return [{ closed: false, nodes: [corner(l.x1, l.y1), corner(l.x2, l.y2)] }]; }
  if (o.type === 'path') {
    const off = o.pathOffset, subs = []; let cur = null, last = null;
    const P = (x, y) => T(x - off.x, y - off.y);
    for (const cmd of o.path) {
      const c = cmd[0];
      if (c === 'M') { const p = P(cmd[1], cmd[2]); last = { x: p.x, y: p.y, ix: p.x, iy: p.y, ox: p.x, oy: p.y }; cur = { closed: false, nodes: [last] }; subs.push(cur); }
      else if (c === 'L') { const p = P(cmd[1], cmd[2]); last = { x: p.x, y: p.y, ix: p.x, iy: p.y, ox: p.x, oy: p.y }; cur.nodes.push(last); }
      else if (c === 'C' || c === 'Q') {
        let a, b, p;
        if (c === 'C') { a = P(cmd[1], cmd[2]); b = P(cmd[3], cmd[4]); p = P(cmd[5], cmd[6]); }
        else { const q = P(cmd[1], cmd[2]); p = P(cmd[3], cmd[4]); a = { x: last.x + (2 / 3) * (q.x - last.x), y: last.y + (2 / 3) * (q.y - last.y) }; b = { x: p.x + (2 / 3) * (q.x - p.x), y: p.y + (2 / 3) * (q.y - p.y) }; }
        last.ox = a.x; last.oy = a.y;
        last = { x: p.x, y: p.y, ix: b.x, iy: b.y, ox: p.x, oy: p.y }; cur.nodes.push(last);
      } else if (c === 'Z' || c === 'z') {
        if (!cur) continue;
        cur.closed = true;
        // a closing point on top of the first one is the first one
        const f = cur.nodes[0], l = cur.nodes[cur.nodes.length - 1];
        if (cur.nodes.length > 1 && Math.hypot(f.x - l.x, f.y - l.y) < 0.01) { f.ix = l.ix; f.iy = l.iy; cur.nodes.pop(); }
      }
    }
    return subs.filter((s) => s.nodes.length);
  }
  return null;
}
function nodesD(subs) {
  const f = (n) => Math.round(n * 100) / 100;
  return subs.map((s) => {
    const n = s.nodes; let d = `M ${f(n[0].x)} ${f(n[0].y)}`;
    const seg = (a, b) => { d += ` C ${f(a.ox)} ${f(a.oy)} ${f(b.ix)} ${f(b.iy)} ${f(b.x)} ${f(b.y)}`; };
    for (let i = 1; i < n.length; i++) seg(n[i - 1], n[i]);
    if (s.closed && n.length > 1) { seg(n[n.length - 1], n[0]); d += ' Z'; }
    return d;
  }).join(' ');
}
const STYLE_KEYS = ['fill', 'stroke', 'strokeWidth', 'strokeLineCap', 'strokeLineJoin', 'strokeDashArray', 'opacity', 'shadow', 'globalCompositeOperation', 'fillRule', 'name', 'id', 'visible', 'gAngle'];
function styleOf(o) {
  const s = {}; STYLE_KEYS.forEach((k) => { if (o[k] !== undefined) s[k] = o[k]; });
  if (o.type === 'line' || o.type === 'polyline') s.fill = null;
  return s;
}
// put a path in place of an object (same layer position and look)
function swapIn(old, d, style) {
  const c = ED.canvas, i = c.getObjects().indexOf(old);
  const p = new fabric.Path(d, { ...style, strokeUniform: true });
  ED.loading = true; c.remove(old); c.insertAt(p, Math.max(1, i)); ED.loading = false;
  return p;
}
function toPath(o) {
  if (o.type === 'path' && !o.angle && o.scaleX === 1 && o.scaleY === 1 && !o.flipX && !o.flipY && !o.skewX && !o.skewY) return o;
  const subs = shapeNodes(o); if (!subs) return null;
  return swapIn(o, nodesD(subs), { ...styleOf(o), name: o.name || 'Path' });
}

// ---------------- direct selection / add anchor ----------------
function vnInit() {
  const c = ED.canvas;
  const hitObj = (p) => c.getObjects().slice().reverse().find((o) => !o.isPage && o.visible && !o.locked && !o.fromMaster && o.containsPoint(p));
  c.on('mouse:down', (opt) => {
    if (!['node', 'addNode'].includes(ED.tool) || opt.e.button !== 0 || ED.spaceDown) return;
    const p = c.getPointer(opt.e), tol = 8 / ED.zoom, e = VN.edit && c.getObjects().includes(VN.edit.obj) ? VN.edit : (VN.edit = null);
    if (e && ED.tool === 'node') {
      // a handle of the selected point, then any point
      const sn = e.sel && e.subs[e.sel.s]?.nodes[e.sel.i];
      if (sn) for (const part of ['i', 'o']) if (Math.hypot(sn[part + 'x'] - p.x, sn[part + 'y'] - p.y) < tol && Math.hypot(sn[part + 'x'] - sn.x, sn[part + 'y'] - sn.y) > 0.01) { VN.drag = { part, s: e.sel.s, i: e.sel.i }; return; }
      for (let s = 0; s < e.subs.length; s++) for (let i = 0; i < e.subs[s].nodes.length; i++) {
        const n = e.subs[s].nodes[i];
        if (Math.hypot(n.x - p.x, n.y - p.y) < tol) {
          e.sel = { s, i };
          if (opt.e.altKey) { convertNode(e, s, i); return; }
          VN.drag = { part: 'a', s, i, from: { x: p.x, y: p.y } }; c.requestRenderAll(); return;
        }
      }
    }
    if (e && ED.tool === 'addNode') { if (addNodeAt(e, p, tol)) return; }
    const o = hitObj(p);
    if (!o) { VN.edit = null; c.requestRenderAll(); return; }
    if (o.type === 'group' || o.type === 'image' || o.type?.includes('text')) { toast(o.type === 'group' ? 'Ungroup it first (Ctrl+Shift+G) to edit its points' : 'Only shapes and paths have points — use Image Trace for pictures'); return; }
    const path = toPath(o); if (!path) return;
    VN.edit = { obj: path, subs: shapeNodes(path), sel: null };
    if (ED.tool === 'addNode') addNodeAt(VN.edit, p, tol);
    if (path !== o) scheduleHistory();
    c.requestRenderAll();
  });
  c.on('mouse:move', (opt) => {
    const d = VN.drag, e = VN.edit; if (!d || !e) return;
    const p = c.getPointer(opt.e), n = e.subs[d.s].nodes[d.i];
    if (d.part === 'a') {
      const dx = p.x - n.x, dy = p.y - n.y;
      n.x += dx; n.y += dy; n.ix += dx; n.iy += dy; n.ox += dx; n.oy += dy;
    } else {
      const k = d.part, o = k === 'i' ? 'o' : 'i';
      n[k + 'x'] = p.x; n[k + 'y'] = p.y;
      // a smooth point keeps its two handles in line (Alt breaks them apart)
      if (!opt.e.altKey && n.smooth !== false && Math.hypot(n[o + 'x'] - n.x, n[o + 'y'] - n.y) > 0.01) {
        const len = Math.hypot(n[o + 'x'] - n.x, n[o + 'y'] - n.y), a = Math.atan2(n.y - p.y, n.x - p.x);
        n[o + 'x'] = n.x + Math.cos(a) * len; n[o + 'y'] = n.y + Math.sin(a) * len;
      } else if (opt.e.altKey) n.smooth = false;
    }
    rebuild(e);
  });
  c.on('mouse:up', () => { if (VN.drag) { VN.drag = null; scheduleHistory(); } });
  ED.on('tool', () => { if (!['node', 'addNode'].includes(ED.tool)) { VN.edit = null; VN.drag = null; } });
  ED.overlays.push(drawNodes);
  window.addEventListener('keydown', (ev) => {
    if (ED.tool !== 'node' || !VN.edit?.sel || isTyping(ev) || !['Delete', 'Backspace'].includes(ev.key)) return;
    ev.preventDefault(); ev.stopImmediatePropagation();
    const e = VN.edit, sub = e.subs[e.sel.s];
    sub.nodes.splice(e.sel.i, 1); e.sel = null;
    e.subs = e.subs.filter((s) => s.nodes.length > 1);
    if (!e.subs.length) { ED.canvas.remove(e.obj); VN.edit = null; ED.canvas.requestRenderAll(); return; }
    rebuild(e); scheduleHistory();
  }, true);
}
function rebuild(e) {
  const fresh = swapIn(e.obj, nodesD(e.subs), styleOf(e.obj));
  e.obj = fresh; ED.canvas.requestRenderAll();
}
function convertNode(e, s, i) {
  const sub = e.subs[s], n = sub.nodes[i], L = sub.nodes.length;
  const corner = Math.hypot(n.ix - n.x, n.iy - n.y) < 0.01 && Math.hypot(n.ox - n.x, n.oy - n.y) < 0.01;
  if (corner) {
    const prev = sub.nodes[(i - 1 + L) % L], next = sub.nodes[(i + 1) % L];
    const a = Math.atan2(next.y - prev.y, next.x - prev.x), lp = Math.hypot(n.x - prev.x, n.y - prev.y) / 3, ln = Math.hypot(next.x - n.x, next.y - n.y) / 3;
    Object.assign(n, { ix: n.x - Math.cos(a) * lp, iy: n.y - Math.sin(a) * lp, ox: n.x + Math.cos(a) * ln, oy: n.y + Math.sin(a) * ln, smooth: true });
  } else Object.assign(n, { ix: n.x, iy: n.y, ox: n.x, oy: n.y, smooth: false });
  rebuild(e); scheduleHistory();
}
const bez = (a, b, c, d, t) => { const u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d; };
function addNodeAt(e, p, tol) {
  let best = null;
  e.subs.forEach((sub, s) => {
    const n = sub.nodes, segs = n.length - (sub.closed ? 0 : 1);
    for (let i = 0; i < segs; i++) {
      const a = n[i], b = n[(i + 1) % n.length];
      for (let k = 1; k < 40; k++) {
        const t = k / 40, x = bez(a.x, a.ox, b.ix, b.x, t), y = bez(a.y, a.oy, b.iy, b.y, t), d = Math.hypot(x - p.x, y - p.y);
        if (d < tol && (!best || d < best.d)) best = { d, s, i, t };
      }
    }
  });
  if (!best) return false;
  // de Casteljau: split the curve at t, the new point sits on it and the shape does not change
  const sub = e.subs[best.s], a = sub.nodes[best.i], b = sub.nodes[(best.i + 1) % sub.nodes.length], t = best.t;
  const lerp = (p, q) => ({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
  const p0 = { x: a.x, y: a.y }, p1 = { x: a.ox, y: a.oy }, p2 = { x: b.ix, y: b.iy }, p3 = { x: b.x, y: b.y };
  const q0 = lerp(p0, p1), q1 = lerp(p1, p2), q2 = lerp(p2, p3), r0 = lerp(q0, q1), r1 = lerp(q1, q2), m = lerp(r0, r1);
  a.ox = q0.x; a.oy = q0.y; b.ix = q2.x; b.iy = q2.y;
  sub.nodes.splice(best.i + 1, 0, { x: m.x, y: m.y, ix: r0.x, iy: r0.y, ox: r1.x, oy: r1.y, smooth: true });
  e.sel = { s: best.s, i: best.i + 1 };
  rebuild(e); scheduleHistory();
  return true;
}
function drawNodes(ctx, v) {
  const e = VN.edit; if (!e || !['node', 'addNode'].includes(ED.tool) || !ED.canvas.getObjects().includes(e.obj)) return;
  const tx = (x, y) => [x * v[0] + v[4], y * v[3] + v[5]];
  ctx.strokeStyle = '#5b8cff'; ctx.lineWidth = 1;
  const outline = new Path2D(nodesD(e.subs));
  ctx.save(); ctx.transform(v[0], v[1], v[2], v[3], v[4], v[5]); ctx.lineWidth = 1 / v[0]; ctx.stroke(outline); ctx.restore();
  e.subs.forEach((sub, s) => sub.nodes.forEach((n, i) => {
    const on = e.sel && e.sel.s === s && e.sel.i === i, [x, y] = tx(n.x, n.y);
    if (on) for (const k of ['i', 'o']) {
      if (Math.hypot(n[k + 'x'] - n.x, n[k + 'y'] - n.y) < 0.01) continue;
      const [hx, hy] = tx(n[k + 'x'], n[k + 'y']);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.beginPath(); ctx.arc(hx, hy, 3.5, 0, 7); ctx.fillStyle = '#5b8cff'; ctx.fill();
    }
    ctx.fillStyle = on ? '#5b8cff' : '#ffffff'; ctx.fillRect(x - 3.5, y - 3.5, 7, 7); ctx.strokeRect(x - 3.5, y - 3.5, 7, 7);
  }));
}

// ---------------- Pathfinder ----------------
function toGeom(o) {
  const subs = shapeNodes(o); if (!subs) return null;
  const rings = subs.filter((s) => s.nodes.length > 2 || s.nodes.some((n) => n.ix !== n.x || n.ox !== n.x)).map((sub) => {
    const n = sub.nodes, pts = [];
    for (let i = 0; i < n.length; i++) {
      const a = n[i], b = n[(i + 1) % n.length];
      pts.push([a.x, a.y]);
      if (!sub.closed && i === n.length - 1) break;
      const curved = Math.hypot(a.ox - a.x, a.oy - a.y) > 0.01 || Math.hypot(b.ix - b.x, b.iy - b.y) > 0.01;
      if (curved) { const steps = Math.max(8, Math.min(48, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 6))); for (let k = 1; k < steps; k++) { const t = k / steps; pts.push([bez(a.x, a.ox, b.ix, b.x, t), bez(a.y, a.oy, b.iy, b.y, t)]); } }
    }
    pts.push(pts[0]);
    return pts;
  }).filter((r) => r.length > 3);
  if (!rings.length) return null;
  // the parts of one shape (holes, islands) as the shape's real area
  return rings.length === 1 ? [rings] : polygonClipping.xor(...rings.map((r) => [r]));
}
function geomD(mp) {
  const f = (n) => Math.round(n * 100) / 100;
  return mp.map((poly) => poly.map((ring) => 'M ' + ring.slice(0, -1).map(([x, y]) => `${f(x)} ${f(y)}`).join(' L ') + ' Z').join(' ')).join(' ');
}
function pathfinder(op) {
  const c = ED.canvas, objs = selected().filter((o) => !o.isPage).sort((a, b) => c.getObjects().indexOf(a) - c.getObjects().indexOf(b));
  if (objs.length < 2) return toast('Select two or more shapes');
  const geoms = objs.map(toGeom);
  if (geoms.some((g) => !g)) return toast('Pathfinder works on shapes and paths (not text, photos or groups)', true);
  let out;
  try {
    out = op === 'unite' ? polygonClipping.union(...geoms) : op === 'intersect' ? polygonClipping.intersection(...geoms)
      : op === 'exclude' ? polygonClipping.xor(...geoms) : polygonClipping.difference(geoms[0], ...geoms.slice(1));
  } catch (e) { return toast('Pathfinder failed: ' + e.message, true); }
  if (!out.length) return toast('Nothing is left — the shapes do not overlap that way');
  // the result looks like the front shape (Minus Front keeps the back one)
  const look = op === 'minusFront' ? objs[0] : objs[objs.length - 1];
  const at = c.getObjects().indexOf(objs[0]);
  c.discardActiveObject();
  ED.loading = true; objs.forEach((o) => c.remove(o)); ED.loading = false;
  const p = new fabric.Path(geomD(out), { ...styleOf(look), fillRule: 'evenodd', name: { unite: 'Unite', minusFront: 'Minus front', intersect: 'Intersect', exclude: 'Exclude' }[op], id: uid(), strokeUniform: true });
  if (!p.fill) p.set('fill', DEF_FILL);
  c.insertAt(p, Math.max(1, at)); c.setActiveObject(p); c.requestRenderAll(); scheduleHistory(); ED.emit('selection');
}
function makeClipMask() {
  const c = ED.canvas, objs = selected().filter((o) => !o.isPage).sort((a, b) => c.getObjects().indexOf(a) - c.getObjects().indexOf(b));
  if (objs.length < 2) return toast('Select the artwork and a shape on top of it');
  const top = objs.pop(), at = c.getObjects().indexOf(objs[0]);
  c.discardActiveObject();
  ED.loading = true; [...objs, top].forEach((o) => c.remove(o)); ED.loading = false;
  const g = new fabric.Group(objs, { name: 'Clip group', id: uid(), isFolder: true });
  top.set({ absolutePositioned: true }); g.clipPath = top; g.clipShape = true;
  c.insertAt(g, Math.max(1, at)); c.setActiveObject(g); c.requestRenderAll(); scheduleHistory(); ED.emit('selection');
}
function releaseClipMask() {
  const c = ED.canvas, g = c.getActiveObject();
  if (!g || g.type !== 'group' || !g.clipPath) return toast('Select a clip group');
  const clip = g.clipPath; g.clipPath = null;
  const at = c.getObjects().indexOf(g);
  g.toActiveSelection();
  clip.set({ absolutePositioned: false, fill: null, stroke: '#8b93a3', strokeWidth: 1, id: uid(), name: 'Clipping path' });
  c.discardActiveObject(); c.insertAt(clip, at + 1); c.requestRenderAll(); scheduleHistory(); ED.emit('selection');
}
// Image Trace: a picture into vector paths (posterised colours)
async function imageTrace(colors = 12) {
  const c = ED.canvas, o = c.getActiveObject();
  if (!o || o.type !== 'image') return toast('Select a photo or logo to trace');
  toast('Tracing…');
  const el = o.getElement(), nw = el.naturalWidth || el.width, nh = el.naturalHeight || el.height, k = Math.min(1, 640 / Math.max(nw, nh));
  const cv = document.createElement('canvas'); cv.width = Math.round(o.width * k); cv.height = Math.round(o.height * k);
  cv.getContext('2d').drawImage(el, o.cropX || 0, o.cropY || 0, o.width, o.height, 0, 0, cv.width, cv.height);
  await new Promise((r) => setTimeout(r, 30));
  const svg = ImageTracer.imagedataToSVG(cv.getContext('2d').getImageData(0, 0, cv.width, cv.height),
    { numberofcolors: colors, pathomit: 8, ltres: 1, qtres: 1, roundcoords: 1, blurradius: 0, strokewidth: 0, viewbox: true, linefilter: true });
  const list = await new Promise((ok) => fabric.loadSVGFromString(svg, (l) => ok(l)));
  const keep = list.filter((x) => (x.opacity ?? 1) > 0.5);
  if (!keep.length) return toast('Nothing to trace', true);
  const g = new fabric.Group(keep, { name: (o.name || 'Image') + ' (traced)', id: uid(), isFolder: true });
  const ctr = o.getCenterPoint();
  g.set({ scaleX: o.getScaledWidth() / cv.width * (g.width ? cv.width / g.width : 1), scaleY: o.getScaledHeight() / cv.height * (g.height ? cv.height / g.height : 1), angle: o.angle });
  g.setPositionByOrigin(ctr, 'center', 'center');
  const at = c.getObjects().indexOf(o);
  o.set('visible', false); c.insertAt(g, at + 1); c.setActiveObject(g); c.requestRenderAll(); scheduleHistory(); ED.emit('selection');
  toast(`Traced into ${keep.length} paths — the photo is kept hidden under it`);
}

// ---------------- panel + inspector ----------------
const PF = [['unite', 'Unite'], ['minusFront', 'Minus front'], ['intersect', 'Intersect'], ['exclude', 'Exclude']];
const pfButtons = () => `<div class="btn-row">${PF.map(([k, n]) => `<button class="icon-btn" data-pf="${k}" title="${n}">${icon(k)}</button>`).join('')}</div>`;
function bindPF(root) { $$('[data-pf]', root).forEach((b) => b.onclick = () => pathfinder(b.dataset.pf)); }
PANEL_FNS.pathfinder = ['unite', 'Pathfinder', (body) => {
  body.innerHTML = `<h4>Pathfinder</h4><p class="note">Select two or more shapes.</p>
    <div class="pf-grid">${PF.map(([k, n]) => `<button class="btn small" data-pf="${k}">${icon(k, 'width="16" height="16"')}${n}</button>`).join('')}</div>
    <h4>Clipping mask</h4><p class="note">The top shape cuts the artwork under it (Ctrl+7).</p>
    <div class="btn-row"><button class="btn" data-va="clip">Make</button><button class="btn" data-va="unclip">Release</button></div>
    <h4>Points</h4><p class="note">Direct selection (A) drags points and handles; Add anchor (+) clicks on an outline; Alt-click a point to switch corner ↔ smooth.</p>
    <div class="btn-row"><button class="btn" data-va="node">${icon('node', 'width="16" height="16"')}Direct selection</button><button class="btn" data-va="topath">Convert to path</button></div>
    <h4>Image Trace</h4><p class="note">Turn a photo or logo into editable vector shapes.</p>
    <div class="f"><label>Colours</label><input type="range" id="trColors" min="2" max="32" step="1" value="12"><span class="val" id="trV">12</span></div>
    <button class="btn full" data-va="trace">${icon('wand', 'width="16" height="16"')}Trace selected image</button>
    <h4>Artboards</h4><p class="note">Use the artboard strip above the canvas — every artboard exports as its own page.</p>`;
  bindPF(body);
  $('#trColors').oninput = (e) => { $('#trV').textContent = e.target.value; };
  $$('[data-va]', body).forEach((b) => b.onclick = () => ({
    clip: makeClipMask, unclip: releaseClipMask, node: () => setTool('node'), trace: () => imageTrace(+$('#trColors').value),
    topath: () => { const o = ED.canvas.getActiveObject(); if (!o) return toast('Select a shape'); const p = toPath(o); if (!p) return toast('That one cannot become a path'); ED.canvas.setActiveObject(p); ED.canvas.requestRenderAll(); scheduleHistory(); ED.emit('selection'); },
  })[b.dataset.va]());
}];
ED.inspHooks.push((el, objs) => {
  if (ED.mode !== 'vector' || objs.length < 2) return;
  el.insertAdjacentHTML('afterbegin', sec('Pathfinder', pfButtons() + '<div class="btn-row" style="margin-top:6px"><button class="btn small" data-va2="clip">Clipping mask</button></div>'));
  bindPF(el); $('[data-va2=clip]', el).onclick = makeClipMask;
});
window.addEventListener('keydown', (e) => {
  if (ED.mode !== 'vector' || isTyping(e) || !(e.ctrlKey || e.metaKey) || e.key !== '7') return;
  e.preventDefault(); e.stopImmediatePropagation(); (e.altKey ? releaseClipMask : makeClipMask)();
}, true);

const _bootVN = bootEditor;
bootEditor = function () { if (editorReady) return; _bootVN(); vnInit(); };

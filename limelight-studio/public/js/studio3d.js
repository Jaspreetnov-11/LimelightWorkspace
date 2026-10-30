// Limelight Studio - the 3D tab (three.js, Blender-style): add objects, set materials and lights, then place the render
// in the design. The scene is saved with the file. ✨ Generative fill: an object gets an AI texture, the scene an AI
// backdrop (Qwen-Image on NAYA B).
import * as THREE from '../vendor/three.module.js';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { TransformControls } from '../vendor/TransformControls.js';
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';

const $ = (s) => document.querySelector(s);
let R, scene, camera, orbit, gizmo, keyLight, hemi, ground, grid, pmrem, envTex, view;
let objects = [], sel = null, target = null, env = null, raf = 0, loadedFor = null, genBusy = false;
const texLoader = new THREE.TextureLoader();

const KINDS = {
  cube: ['Cube', 'cube'], sphere: ['Sphere', 'sphere'], cylinder: ['Cylinder', 'cylinder'], cone: ['Cone', 'cone'],
  torus: ['Torus', 'torus'], knot: ['Knot', 'knot'], gem: ['Gem', 'gem'], capsule: ['Capsule', 'capsule'],
  pyramid: ['Pyramid', 'triangle'], plane: ['Plane', 'plane3'], mark: ['Limelight', 'triangle'], podium: ['Podium', 'cylinder'],
};
const MATS = {
  Matte: { metal: 0, rough: 0.85 }, Plastic: { metal: 0, rough: 0.25, clear: 1 }, Gold: { color: '#ffc21a', metal: 1, rough: 0.22 },
  Chrome: { color: '#e8e8ea', metal: 1, rough: 0.05 }, Glass: { color: '#ffffff', metal: 0, rough: 0.02, glass: 1 }, Neon: { emissiveI: 2.2 },
};

function llShape() {
  const s = new THREE.Shape();
  s.moveTo(3, -30.5); s.lineTo(92.6, -3.4);
  s.bezierCurveTo(95.9, -2.4, 99, -5.4, 98.2, -8.7); s.lineTo(76.4, -93.6);
  s.bezierCurveTo(75.2, -98.3, 69.1, -99.2, 66.8, -95); s.bezierCurveTo(57.3, -77.6, 42, -63.4, 6, -44.4);
  s.bezierCurveTo(0.8, -41.6, 0, -33.4, 3, -30.5);
  return s;
}
function geometry(kind) {
  switch (kind) {
    case 'cube': return new THREE.BoxGeometry(1, 1, 1, 1, 1, 1);
    case 'sphere': return new THREE.SphereGeometry(0.6, 96, 48);
    case 'cylinder': return new THREE.CylinderGeometry(0.5, 0.5, 1, 96);
    case 'cone': return new THREE.ConeGeometry(0.6, 1.2, 96);
    case 'torus': return new THREE.TorusGeometry(0.5, 0.18, 64, 160);
    case 'knot': return new THREE.TorusKnotGeometry(0.42, 0.14, 260, 40);
    case 'gem': return new THREE.IcosahedronGeometry(0.65, 0);
    case 'capsule': return new THREE.CapsuleGeometry(0.32, 0.6, 16, 48);
    case 'pyramid': return new THREE.ConeGeometry(0.75, 1.1, 4);
    case 'plane': { const g = new THREE.PlaneGeometry(2, 2); g.rotateX(-Math.PI / 2); return g; }
    case 'podium': return new THREE.CylinderGeometry(1.1, 1.15, 0.35, 128);
    case 'mark': {
      const g = new THREE.ExtrudeGeometry(llShape(), { depth: 16, bevelEnabled: true, bevelThickness: 4, bevelSize: 3, bevelSegments: 10, curveSegments: 64 });
      g.center(); g.scale(0.013, 0.013, 0.013); return g;
    }
  }
}
function makeMesh(d) {
  const m = new THREE.MeshPhysicalMaterial();
  const mesh = new THREE.Mesh(geometry(d.kind), m);
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.userData = { kind: d.kind, name: d.name || KINDS[d.kind][0], color: d.color || '#ffc21a', metal: d.metal ?? 0.1, rough: d.rough ?? 0.35,
    clear: d.clear ?? 0, emissiveI: d.emissiveI ?? 0, wire: !!d.wire, glass: d.glass ?? 0 };
  mesh.position.fromArray(d.p || [0, defaultY(d.kind), 0]);
  mesh.rotation.fromArray(d.r || [0, 0, 0]);
  mesh.scale.fromArray(d.s || [1, 1, 1]);
  applyMat(mesh);
  return mesh;
}
const defaultY = (k) => ({ plane: 0.001, podium: 0.175, sphere: 0.6, torus: 0.68, knot: 0.65, gem: 0.65, capsule: 0.62, cone: 0.6, pyramid: 0.55, mark: 0.7 })[k] ?? 0.5;
function applyMat(mesh) {
  const u = mesh.userData, m = mesh.material;
  m.color.set(u.color); m.metalness = u.metal; m.roughness = u.rough; m.clearcoat = u.clear; m.clearcoatRoughness = 0.1;
  m.emissive.set(u.emissiveI ? u.color : '#000000'); m.emissiveIntensity = u.emissiveI;
  m.wireframe = u.wire; m.transmission = u.glass; m.thickness = u.glass ? 0.6 : 0; m.ior = 1.5;
  m.flatShading = u.kind === 'gem' || u.kind === 'pyramid'; m.envMapIntensity = env?.envI ?? 1; m.needsUpdate = true;
  // an AI texture (Generative fill on the object)
  if (u.tex && m.map?.userData.src !== u.tex) {
    texLoader.load(u.tex, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.userData.src = u.tex; m.map = t; m.needsUpdate = true; });
  } else if (!u.tex && m.map) { m.map = null; m.needsUpdate = true; }
}

function init() {
  view = $('#s3View');
  R = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  R.setPixelRatio(Math.min(2, devicePixelRatio)); R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
  R.toneMapping = THREE.ACESFilmicToneMapping; R.outputColorSpace = THREE.SRGBColorSpace;
  view.appendChild(R.domElement);
  scene = new THREE.Scene();
  pmrem = new THREE.PMREMGenerator(R); envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  camera = new THREE.PerspectiveCamera(35, 1, 0.05, 200);
  hemi = new THREE.HemisphereLight('#ffffff', '#444444', 0.6); scene.add(hemi);
  keyLight = new THREE.DirectionalLight('#ffffff', 2.4); keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048); keyLight.shadow.radius = 6; keyLight.shadow.bias = -0.0004;
  Object.assign(keyLight.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 30 });
  scene.add(keyLight);
  ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.28 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  grid = new THREE.GridHelper(10, 20, 0x555a66, 0x2a2e38); grid.position.y = 0.0005; scene.add(grid);

  orbit = new OrbitControls(camera, R.domElement); orbit.enableDamping = true; orbit.target.set(0, 0.5, 0);
  gizmo = new TransformControls(camera, R.domElement);
  gizmo.addEventListener('dragging-changed', (e) => { orbit.enabled = !e.value; if (!e.value) renderProps(); });
  scene.add(gizmo);

  let down = null;
  R.domElement.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
  R.domElement.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4 || gizmo.dragging) return;
    const r = R.domElement.getBoundingClientRect(), ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
    const hit = ray.intersectObjects(objects, false)[0];
    select(hit ? hit.object : null);
  });
  new ResizeObserver(resize).observe(view);

  $('#s3Add').innerHTML = Object.entries(KINDS).map(([k, [n, i]]) => `<button data-add="${k}">${icon(i)}<span>${n}</span></button>`).join('');
  document.querySelectorAll('#s3Add [data-add]').forEach((b) => b.onclick = () => {
    const mesh = makeMesh({ kind: b.dataset.add, p: [objects.length ? (Math.random() - 0.5) * 1.5 : 0, defaultY(b.dataset.add), 0] });
    add(mesh); select(mesh);
  });
  document.querySelectorAll('#gizmoMode button').forEach((b) => b.onclick = () => setMode(b.dataset.v));
  $('#s3Cancel').onclick = close;
  $('#s3Insert').onclick = insert;
  window.addEventListener('keydown', (e) => {
    if ($('#studio3d').classList.contains('hidden') || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if (k === 'w') setMode('translate'); if (k === 'e') setMode('rotate'); if (k === 'r') setMode('scale');
    if ((k === 'delete' || k === 'backspace') && sel) removeSel();
    if (k === 'escape') select(null);
    if (k === 'd' && (e.ctrlKey || e.metaKey) && sel) { e.preventDefault(); duplicate(); }
    e.stopPropagation();
  }, true);
}
function setMode(m) { gizmo.setMode(m); document.querySelectorAll('#gizmoMode button').forEach((b) => b.classList.toggle('on', b.dataset.v === m)); }
function resize() {
  const w = view.clientWidth, h = view.clientHeight; if (!w || !h) return;
  R.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
}
function loop() {
  raf = requestAnimationFrame(loop);
  orbit.autoRotate = !!env.autoRotate; orbit.update();
  R.render(scene, camera);
}
function add(mesh) { objects.push(mesh); scene.add(mesh); renderList(); }
function removeSel() { gizmo.detach(); scene.remove(sel); objects = objects.filter((o) => o !== sel); sel = null; renderList(); renderProps(); }
function duplicate() { const d = serializeMesh(sel); d.p[0] += 0.4; const m = makeMesh(d); add(m); select(m); }
function select(m) {
  sel = m; if (m) gizmo.attach(m); else gizmo.detach();
  renderList(); renderProps();
}

function applyEnv() {
  keyLight.intensity = env.light; keyLight.color.set(env.lightColor);
  const az = (env.az * Math.PI) / 180, el = (env.el * Math.PI) / 180;
  keyLight.position.set(6 * Math.cos(el) * Math.sin(az), 6 * Math.sin(el), 6 * Math.cos(el) * Math.cos(az));
  hemi.intensity = env.ambient;
  ground.visible = env.ground; ground.material.opacity = env.shadow;
  scene.background = env.transparent ? null : new THREE.Color(env.bg);
  // an AI backdrop (Generative fill on the scene); the newest one wins if two arrive late
  if (!env.transparent && env.bgImage) {
    const src = env.bgImage;
    texLoader.load(src, (t) => { t.colorSpace = THREE.SRGBColorSpace; if (!env.transparent && env.bgImage === src) scene.background = t; });
  }
  R.toneMappingExposure = env.exposure;
  scene.environment = env.envI > 0 ? envTex : null;
  objects.forEach(applyMat);
}
const DEFAULT_ENV = { transparent: true, bg: '#14161b', light: 2.4, lightColor: '#ffffff', az: 35, el: 50, ambient: 0.6, envI: 1.5, ground: true, shadow: 0.28, exposure: 1, autoRotate: false };

// ---------- panels ----------
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function renderList() {
  $('#s3List').innerHTML = objects.length ? objects.map((o, i) => `<div class="layer ${o === sel ? 'sel' : ''}" data-i="${i}"><div class="lt">${icon(KINDS[o.userData.kind][1])}</div><div class="ln">${esc(o.userData.name)}</div></div>`).join('')
    : '<p class="note">Add an object above.</p>';
  document.querySelectorAll('#s3List [data-i]').forEach((el) => el.onclick = () => select(objects[+el.dataset.i]));
}
const row = (label, inner) => `<div class="f"><label>${label}</label>${inner}</div>`;
const rng = (k, min, max, step, v) => `<input type="range" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${v}">`;
function renderProps() {
  const el = $('#s3Props');
  if (sel) {
    const u = sel.userData, deg = (r) => Math.round((r * 180) / Math.PI);
    el.innerHTML = `<h4>${esc(u.name)}</h4>
      <h4 style="margin-top:14px">Material</h4>
      <div>${Object.keys(MATS).map((m) => `<button class="chip" data-mat="${m}">${m}</button>`).join('')}</div>
      ${row('Colour', `<input type="color" data-k="color" value="${u.color}">`)}
      ${row('Metal', rng('metal', 0, 1, 0.01, u.metal))}${row('Rough', rng('rough', 0, 1, 0.01, u.rough))}
      ${row('Gloss coat', rng('clear', 0, 1, 0.01, u.clear))}${row('Glow', rng('emissiveI', 0, 4, 0.05, u.emissiveI))}
      ${row('Glass', rng('glass', 0, 1, 0.01, u.glass))}${row('Wireframe', `<input type="checkbox" data-k="wire" ${u.wire ? 'checked' : ''}>`)}
      ${u.tex ? row('AI texture', `<img class="s3-tex" src="${esc(u.tex)}"><button class="chip" data-a="untex">Remove</button>`) : ''}
      <h4 style="margin-top:14px">Transform</h4>
      ${['x', 'y', 'z'].map((a) => row('Pos ' + a.toUpperCase(), `<input type="number" step="0.05" data-pos="${a}" value="${sel.position[a].toFixed(2)}">`)).join('')}
      ${['x', 'y', 'z'].map((a) => row('Rot ' + a.toUpperCase(), `<input type="number" step="5" data-rot="${a}" value="${deg(sel.rotation[a])}">`)).join('')}
      ${row('Scale', `<input type="number" step="0.1" data-scl value="${sel.scale.x.toFixed(2)}">`)}
      <div class="btn-row" style="margin-top:10px"><button class="btn" data-a="dup">Duplicate</button><button class="btn" data-a="del">Delete</button></div>
      <p class="note">W move · E rotate · R scale · Del delete · drag empty space to orbit</p>`;
    el.querySelectorAll('[data-k]').forEach((i) => i.oninput = () => { u[i.dataset.k] = i.type === 'checkbox' ? i.checked : i.type === 'color' ? i.value : +i.value; applyMat(sel); });
    el.querySelectorAll('[data-mat]').forEach((b) => b.onclick = () => { Object.assign(u, { metal: 0, rough: 0.35, clear: 0, emissiveI: 0, glass: 0 }, MATS[b.dataset.mat]); applyMat(sel); renderProps(); });
    el.querySelectorAll('[data-pos]').forEach((i) => i.onchange = () => { sel.position[i.dataset.pos] = +i.value; });
    el.querySelectorAll('[data-rot]').forEach((i) => i.onchange = () => { sel.rotation[i.dataset.rot] = (+i.value * Math.PI) / 180; });
    el.querySelector('[data-scl]').onchange = (e) => sel.scale.setScalar(+e.target.value || 1);
    el.querySelector('[data-a=dup]').onclick = duplicate;
    el.querySelector('[data-a=del]').onclick = removeSel;
    el.querySelector('[data-a=untex]')?.addEventListener('click', () => { u.tex = null; applyMat(sel); renderProps(); });
  } else {
    el.innerHTML = `<h4>Scene</h4>
      ${row('Transparent', `<input type="checkbox" data-e="transparent" ${env.transparent ? 'checked' : ''}>`)}
      ${env.transparent ? '' : row('Background', `<input type="color" data-e="bg" value="${env.bg}">`)}
      ${env.bgImage && !env.transparent ? row('AI backdrop', `<img class="s3-tex" src="${esc(env.bgImage)}"><button class="chip" data-unbg>Remove</button>`) : ''}
      ${row('Ground shadow', `<input type="checkbox" data-e="ground" ${env.ground ? 'checked' : ''}>`)}
      ${row('Shadow', rng('shadow', 0, 0.8, 0.01, env.shadow).replace('data-k', 'data-e'))}
      <h4 style="margin-top:14px">Lighting</h4>
      ${row('Light', rng('light', 0, 8, 0.05, env.light).replace('data-k', 'data-e'))}
      ${row('Colour', `<input type="color" data-e="lightColor" value="${env.lightColor}">`)}
      ${row('Direction', rng('az', -180, 180, 1, env.az).replace('data-k', 'data-e'))}
      ${row('Height', rng('el', 5, 90, 1, env.el).replace('data-k', 'data-e'))}
      ${row('Ambient', rng('ambient', 0, 3, 0.05, env.ambient).replace('data-k', 'data-e'))}
      ${row('Reflections', rng('envI', 0, 3, 0.05, env.envI).replace('data-k', 'data-e'))}
      ${row('Exposure', rng('exposure', 0.2, 2.5, 0.05, env.exposure).replace('data-k', 'data-e'))}
      ${row('Auto-rotate', `<input type="checkbox" data-e="autoRotate" ${env.autoRotate ? 'checked' : ''}>`)}
      <h4 style="margin-top:14px">Light presets</h4>
      <div>${['Studio', 'Sunset', 'Night', 'Noon'].map((p) => `<button class="chip" data-lp="${p}">${p}</button>`).join('')}</div>
      <p class="note">Click an object to edit it. The render uses the current camera view.</p>`;
    el.querySelectorAll('[data-e]').forEach((i) => i.oninput = () => {
      env[i.dataset.e] = i.type === 'checkbox' ? i.checked : i.type === 'color' ? i.value : +i.value;
      applyEnv(); if (i.type === 'checkbox') renderProps();
    });
    el.querySelectorAll('[data-lp]').forEach((b) => b.onclick = () => {
      Object.assign(env, { Studio: { light: 2.4, lightColor: '#ffffff', az: 35, el: 50, ambient: 0.6, exposure: 1 }, Sunset: { light: 3, lightColor: '#ff9a4d', az: -70, el: 14, ambient: 0.35, exposure: 1.1 },
        Night: { light: 1.2, lightColor: '#7aa2ff', az: 120, el: 35, ambient: 0.15, exposure: 0.8 }, Noon: { light: 4, lightColor: '#fff6e5', az: 10, el: 80, ambient: 0.9, exposure: 1 } }[b.dataset.lp]);
      applyEnv(); renderProps();
    });
    el.querySelector('[data-unbg]')?.addEventListener('click', () => { env.bgImage = null; applyEnv(); renderProps(); });
  }
  genBar();
}

// ---------- ✨ Generative fill: an AI texture on the selected object, an AI backdrop for the scene ----------
function genBar() {
  let bar = $('#s3Gen');
  if (!bar) {
    bar = document.createElement('div'); bar.id = 's3Gen'; bar.className = 'genbar s3-genbar';
    bar.innerHTML = `<span class="gb-ic">${icon('sparkles')}</span><b id="s3GenWhat"></b><input id="s3GenP" spellcheck="false"><button class="btn primary" id="s3GenGo">Generate</button>`;
    view.appendChild(bar);
    $('#s3GenP').onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') genFill3D(); };
    $('#s3GenGo').onclick = genFill3D;
  }
  if (genBusy) return;
  $('#s3GenWhat').textContent = sel ? `Texture · ${sel.userData.name}` : 'Backdrop';
  $('#s3GenP').placeholder = sel ? 'e.g. polished teak wood, gold foil, marble with veins' : 'e.g. sunrise over Indian ghats, soft studio gradient';
}
async function genFill3D() {
  const prompt = $('#s3GenP').value.trim(); if (!prompt || genBusy) return;
  const forObj = sel, w = view.clientWidth || 1, h = view.clientHeight || 1, ar = w / h;
  const r64 = (n) => Math.max(256, Math.round(n / 64) * 64);
  const body = forObj
    ? { prompt: `${prompt}, seamless tileable texture, flat even lighting, top-down, no objects`, width: 1024, height: 1024 }
    : { prompt: `${prompt}, wide background, soft depth`, width: r64(ar >= 1 ? 1024 : 1024 * ar), height: r64(ar >= 1 ? 1024 / ar : 1024) };
  genBusy = true;
  const go = $('#s3GenGo'), t0 = Date.now();
  $('#s3GenP').disabled = go.disabled = true;
  const tick = () => { const s = Math.round((Date.now() - t0) / 1000); go.textContent = `Painting on NAYA B… ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  tick(); const timer = setInterval(tick, 1000);
  try {
    const r = await fetch('/api/ai/image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, preset: 'quality', count: 1 }) });
    const out = await r.json(); if (!r.ok || out.error) throw new Error(out.error || `HTTP ${r.status}`);
    const url = out[0].url;
    if (forObj) { Object.assign(forObj.userData, { tex: url, color: '#ffffff', metal: Math.min(forObj.userData.metal, 0.3), emissiveI: 0, glass: 0 }); applyMat(forObj); }
    else { env.bgImage = url; env.transparent = false; applyEnv(); }
    toast(forObj ? `AI texture on ${forObj.userData.name}` : 'AI backdrop set — Insert or Export renders it');
  } catch (e) { toast('Generative fill: ' + e.message, true); }
  clearInterval(timer); genBusy = false; $('#s3GenP').disabled = go.disabled = false; go.textContent = 'Generate';
  renderProps();
}

// ---------- save / load ----------
function serializeMesh(m) {
  const u = m.userData;
  return { ...u, p: m.position.toArray(), r: m.rotation.toArray().slice(0, 3), s: m.scale.toArray() };
}
function serialize() { return { objs: objects.map(serializeMesh), cam: { p: camera.position.toArray(), t: orbit.target.toArray() }, env: { ...env } }; }
function load(data) {
  objects.forEach((o) => scene.remove(o)); objects = []; gizmo.detach(); sel = null;
  env = { ...DEFAULT_ENV, ...(data?.env || {}) };
  (data?.objs || []).forEach((d) => add(makeMesh(d)));
  camera.position.fromArray(data?.cam?.p || [3.2, 2.4, 4.2]); orbit.target.fromArray(data?.cam?.t || [0, 0.5, 0]); orbit.update();
  applyEnv(); renderList(); renderProps();
}
const PRESETS = {
  mark: { objs: [{ kind: 'mark', color: '#ffc21a', metal: 0.85, rough: 0.3, clear: 1, p: [0, 0.8, 0], r: [0, -0.35, 0] }], cam: { p: [0.6, 1.4, 3.6], t: [0, 0.75, 0] } },
  chrome: { objs: [{ kind: 'sphere', color: '#e8e8ea', metal: 1, rough: 0.05, p: [-0.9, 0.6, 0] }, { kind: 'torus', color: '#ffc21a', metal: 1, rough: 0.2, p: [0.6, 0.68, 0.3], r: [1.2, 0, 0.3] }, { kind: 'cube', color: '#5b8cff', metal: 0, rough: 0.25, clear: 1, p: [0.2, 0.5, -1.1], r: [0, 0.6, 0] }] },
  podium: { objs: [{ kind: 'podium', color: '#f6f1e6', metal: 0, rough: 0.6, p: [0, 0.175, 0] }, { kind: 'podium', color: '#ffc21a', metal: 0, rough: 0.4, p: [0, 0.52, 0], s: [0.7, 1, 0.7] }, { kind: 'gem', color: '#ffffff', metal: 0, rough: 0.02, glass: 1, p: [0, 1.32, 0] }], env: { transparent: false, bg: '#f2ede2', shadow: 0.2 } },
  neon: { objs: [{ kind: 'torus', color: '#ff3d8b', emissiveI: 2.5, rough: 0.3, p: [0, 0.9, 0], r: [0.3, 0.4, 0] }, { kind: 'knot', color: '#5b8cff', emissiveI: 1.6, p: [1.4, 0.65, -0.6], s: [0.6, 0.6, 0.6] }], env: { transparent: false, bg: '#07080c', light: 0.8, ambient: 0.1, envI: 0.4 } },
};

// ---------- open / insert ----------
const STARTER = { objs: [{ kind: 'cube', color: '#ffc21a', metal: 0.1, rough: 0.3, r: [0, 0.6, 0] }] };
// the 3D tab (modes.js): this file's scene, or opts.data - a placed 3D image being edited again (opts.img), or a preset
function showTab(opts = {}) {
  if (!R) init();
  const box = $('#studio3d'), wb = document.querySelector('#editor .workbench');
  box.classList.add('as-tab'); box.style.top = (wb ? wb.getBoundingClientRect().top : 0) + 'px';
  box.classList.remove('hidden');
  const pid = ED?.project?.id;
  if (opts.data) { target = opts.img || null; load(opts.data); loadedFor = target ? null : pid; }
  else if (loadedFor !== pid || target) { target = null; load(ED?.project?.scene3d || STARTER); loadedFor = pid; }
  $('#s3Insert').textContent = target ? 'Update in design' : 'Insert into design';
  $('#s3Cancel').textContent = target ? 'Cancel' : 'Back to design';
  resize(); cancelAnimationFrame(raf); loop();
}
function hideTab() {
  cancelAnimationFrame(raf); $('#studio3d').classList.add('hidden');
  // the file's own scene is kept with it (not a placed 3D image being edited)
  if (stash()) markDirty();
  if (target) { target = null; loadedFor = null; }
}
function stash() {
  if (!R || target || !ED?.project || loadedFor !== ED.project.id) return false;
  ED.project.scene3d = serialize(); return true;
}
function open(data, img) {
  if (window.setStudioMode && ED?.canvas) return window.setStudioMode('3d', { data: data || STARTER, img });
  if (!R) init();
  target = img || null;
  $('#studio3d').classList.remove('hidden');
  resize(); load(data || STARTER); cancelAnimationFrame(raf); loop();
}
function close() {
  if (window.setStudioMode && ED?.mode === '3d') return window.setStudioMode('design');
  cancelAnimationFrame(raf); $('#studio3d').classList.add('hidden');
}
// a sharp render of the current view (grid and gizmo left out)
function renderCanvas() {
  gizmo.detach(); grid.visible = false;
  const pr = R.getPixelRatio(); R.setPixelRatio(Math.min(4, Math.max(2, 2400 / view.clientWidth)));
  R.setSize(view.clientWidth, view.clientHeight); R.render(scene, camera);
  const raw = document.createElement('canvas'); raw.width = R.domElement.width; raw.height = R.domElement.height;
  raw.getContext('2d').drawImage(R.domElement, 0, 0);
  R.setPixelRatio(pr); R.setSize(view.clientWidth, view.clientHeight); grid.visible = true; if (sel) gizmo.attach(sel);
  return env.transparent ? trim(raw) : raw;
}
async function renderToLibrary() {
  if (!R) init();
  const cv = renderCanvas();
  const up = await fetch('/api/library', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: '3d-render.png', data: cv.toDataURL('image/png') }) }).then((r) => r.json());
  return { url: up.url, w: cv.width, h: cv.height };
}
function trim(cv) {
  const ctx = cv.getContext('2d'), { width: w, height: h } = cv, d = ctx.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return cv;
  const pad = 6, out = document.createElement('canvas');
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
  out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
  out.getContext('2d').drawImage(cv, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}
async function insert() {
  const btn = $('#s3Insert'); btn.disabled = true;
  const cv = renderCanvas(), data = serialize(), editing = target;
  try {
    const up = await fetch('/api/library', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: '3d-render.png', data: cv.toDataURL('image/png') }) }).then((r) => r.json());
    close();
    if (editing) {
      const w = editing.getScaledWidth();
      editing.setSrc(up.url, () => { editing.scaleToWidth(w); editing.scene3d = data; ED.canvas.requestRenderAll(); scheduleHistory(); }, { crossOrigin: 'anonymous' });
    } else {
      const img = await addImage(up.url, { fit: 0.6, name: '3D ' + (objects[0]?.userData.name || 'object') });
      img.scene3d = data; scheduleHistory();
    }
    toast('3D render placed — double-click it to edit again');
  } catch (e) { toast('3D insert failed: ' + e.message, true); }
  btn.disabled = false;
}

window.Studio3D = { open, showTab, hideTab, stash, renderToLibrary, preset: (k) => JSON.parse(JSON.stringify(PRESETS[k])) };

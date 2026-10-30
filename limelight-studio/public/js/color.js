// Limelight Studio - Color: the fifth tab, a Lightroom-style develop workspace for the design's photos. It opens the
// selected photo layer (or the page's biggest photo): Navigator, Presets and History on the left; the photo in the
// middle (Before/After \, split view Y, Fit / 1:1 Z); Histogram, Basic, Tone Curve, Color Mixer, Color Grading,
// Detail and Effects on the right; a filmstrip of the page's photos below. Everything renders live on the GPU (WebGL2).
// Non-destructive: the layer keeps its original (devOrig) and its settings (develop); leaving the tab, switching
// photo, saving or exporting writes the developed pixels into the layer, so every export has them.
(() => {
Object.assign(ICONS, {
  develop: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17M3.5 12h17" opacity=".45"/><circle cx="12" cy="12" r="3"/>',
});
MODES.color = { name: 'Color', like: 'Lightroom', icon: 'develop', tools: [], tabs: [] };
PROPS.push('develop', 'devOrig');

// ---------------- settings ----------------
const BANDS = [['Red', '#e5484d'], ['Orange', '#f0883e'], ['Yellow', '#e6c229'], ['Green', '#3ebd5c'], ['Aqua', '#2fb8c4'], ['Blue', '#3f7be8'], ['Purple', '#8a5cf0'], ['Magenta', '#d44fb6']];
const line = () => [[0, 0], [1, 1]];
const DEF = () => ({ bw: false, temp: 0, tint: 0, exposure: 0, contrast: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0,
  texture: 0, clarity: 0, dehaze: 0, vibrance: 0, saturation: 0,
  curve: { rgb: line(), r: line(), g: line(), b: line() },
  hue: Array(8).fill(0), sat: Array(8).fill(0), lum: Array(8).fill(0),
  grade: { sh: { h: 0, s: 0, l: 0 }, mid: { h: 0, s: 0, l: 0 }, hi: { h: 0, s: 0, l: 0 }, gl: { h: 0, s: 0, l: 0 }, blend: 50, balance: 0 },
  sharpen: 0, sharpRadius: 1, nr: 0, nrColor: 0, vignette: 0, vigMid: 50, vigRound: 0, vigFeather: 50, grain: 0, grainSize: 25 });
const clone = (o) => JSON.parse(JSON.stringify(o));
const merge = (base, over) => { const o = clone(base); for (const [k, v] of Object.entries(over || {})) o[k] = v && typeof v === 'object' && !Array.isArray(v) && o[k] && typeof o[k] === 'object' && !Array.isArray(o[k]) ? merge(o[k], v) : clone(v); return o; };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const isDefault = (s) => same(s, DEF());

// built-in presets (Limelight's own looks)
const PRESETS = [
  ['Color', [
    ['Vivid', { contrast: 15, vibrance: 35, saturation: 5, clarity: 10 }],
    ['Poster Punch', { exposure: 0.1, contrast: 30, dehaze: 15, vibrance: 30, clarity: 12, sharpen: 40 }],
    ['Warm Sun', { temp: 25, tint: 5, vibrance: 15, grade: { hi: { h: 40, s: 20, l: 0 } } }],
    ['Golden Hour', { temp: 35, tint: 8, highlights: -15, grade: { mid: { h: 35, s: 18, l: 0 } }, vignette: -20 }],
    ['Cool Clean', { temp: -18, highlights: -20, shadows: 15, clarity: 8, vibrance: 10 }],
    ['Teal & Orange', { contrast: 18, saturation: -8, grade: { sh: { h: 195, s: 38, l: 0 }, hi: { h: 35, s: 30, l: 0 } } }],
    ['Portrait Glow', { texture: -20, clarity: -10, highlights: -15, vibrance: 10, lum: [0, 10, 0, 0, 0, 0, 0, 0] }],
    ['Matte Fade', { contrast: -10, curve: { rgb: [[0, 0.08], [0.5, 0.5], [1, 0.95]] }, grain: 15 }],
  ]],
  ['Black & White', [
    ['B&W Classic', { bw: true, contrast: 25, clarity: 15 }],
    ['B&W Soft', { bw: true, contrast: -10, highlights: -20, shadows: 20, grain: 20 }],
    ['B&W High Contrast', { bw: true, contrast: 55, whites: 20, blacks: -25, clarity: 20 }],
  ]],
];
const userPresets = () => { try { return JSON.parse(localStorage.getItem('cw-presets') || '[]'); } catch { return []; } };
const saveUserPresets = (l) => { try { localStorage.setItem('cw-presets', JSON.stringify(l)); } catch { /* private mode */ } };

const CW = { open: false, layer: null, s: DEF(), base: DEF(), img: null, w: 0, h: 0, before: false, split: false, splitX: 0.5, fit: true,
  hist: [], hi: -1, ch: 'rgb', clip: null, peek: null, timer: null };

// ---------------- the GPU pipeline ----------------
const VS = `#version 300 es
in vec2 p; out vec2 v; void main(){ v = vec2(p.x * .5 + .5, .5 - p.y * .5); gl_Position = vec4(p, 0., 1.); }`;
const FS = `#version 300 es
precision highp float;
in vec2 v; out vec4 o;
uniform sampler2D uImg, uS, uM, uL, uCurve;
uniform vec4 uA, uB, uC, uD, uE, uF;   // see setUniforms()
uniform float uHue[8], uSat[8], uLum[8];
uniform vec3 uGsh, uGmid, uGhi, uGgl;
uniform vec4 uGl; uniform vec3 uGb; uniform vec2 uRes; uniform float uGrain;
const float CEN[8] = float[8](0., 30., 60., 120., 180., 240., 270., 300.);
float luma(vec3 c) { return dot(c, vec3(.2126, .7152, .0722)); }
vec3 lin(vec3 c) { return pow(max(c, 0.), vec3(2.2)); }
vec3 gam(vec3 c) { return pow(max(c, 0.), vec3(1. / 2.2)); }
vec3 rgb2hsv(vec3 c) { vec4 K = vec4(0., -1. / 3., 2. / 3., -1.); vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r)); float d = q.x - min(q.w, q.y);
  return vec3(abs(q.z + (q.w - q.y) / (6. * d + 1e-10)), d / (q.x + 1e-10), q.x); }
vec3 hsv2rgb(vec3 c) { vec3 p = abs(fract(c.xxx + vec3(1., 2. / 3., 1. / 3.)) * 6. - 3.); return c.z * mix(vec3(1.), clamp(p - 1., 0., 1.), c.y); }
float curve(float x, int ch) { vec4 t = texture(uCurve, vec2((clamp(x, 0., 1.) * 255. + .5) / 256., .5)); return ch == 0 ? t.r : ch == 1 ? t.g : ch == 2 ? t.b : t.a; }
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec4 src = texture(uImg, v);
  vec3 c = src.rgb;
  if (uF.w > .5 && (uE.w < 0. || v.x < uE.w)) { o = src; return; }   // before (all, or left of the split)
  vec3 s = texture(uS, v).rgb, m = texture(uM, v).rgb, l = texture(uL, v).rgb;
  // detail: noise reduction (luminance, colour), texture, clarity
  c += luma(mix(c, s, .9)) * uD.z - luma(c) * uD.z;
  c = mix(c, s - luma(s) + luma(c), uD.w);
  c += (c - s) * uC.x * 1.6;
  float mid0 = 1. - abs(luma(c) * 2. - 1.);
  c += (c - m) * uC.y * (.5 + .7 * mid0);
  // white balance, exposure, dehaze (linear light)
  vec3 x = lin(c);
  x *= vec3(1. + .32 * uA.x + .06 * uA.y, 1. - .14 * uA.y, 1. - .32 * uA.x + .06 * uA.y);
  x *= exp2(uA.z);
  if (uC.z != 0.) {
    vec3 ll = lin(l) * exp2(uA.z); float A = min(min(ll.r, ll.g), ll.b);
    if (uC.z > 0.) { float k = uC.z * .75; x = (x - A * k) / max(1. - A * k, .05); }
    else x = mix(x, vec3(luma(ll)) * .8 + .12, -uC.z * .45);
  }
  vec3 g = gam(x);
  // tone: highlights / shadows (local), whites / blacks (ends), contrast
  float L = luma(g), f = L;
  float Lb = clamp(luma(gam(lin(l) * exp2(uA.z))), 0., 1.);
  float hm = smoothstep(.35, 1., Lb), sm = 1. - smoothstep(0., .6, Lb);
  f += uB.x * hm * (uB.x < 0. ? f * .55 : (1. - f) * .6);
  f += uB.y * sm * (uB.y > 0. ? (1. - f) * f * 1.8 : f * .55);
  f += uB.z * .28 * smoothstep(.45, 1., f);
  f += uB.w * .16 * (1. - smoothstep(0., .55, f));
  f = clamp(f, 0., 1.2);
  float fc = clamp(f, 0., 1.);
  f = uA.w > 0. ? mix(f, fc * fc * (3. - 2. * fc) + (f - fc), uA.w * .9) : mix(f, .5 + (f - .5) * .55, -uA.w);
  g = L > .002 ? g * (f / L) : g + (f - L);
  // presence: vibrance, saturation
  float Lg = luma(g), sat0 = max(max(g.r, g.g), g.b) - min(min(g.r, g.g), g.b);
  g = mix(vec3(Lg), g, 1. + uC.w * (uC.w > 0. ? (1. - clamp(sat0, 0., 1.)) * 1.3 : 1.));
  g = mix(vec3(Lg), g, 1. + uD.x);
  // colour mixer (8 hue bands)
  vec3 h = rgb2hsv(clamp(g, 0., 1.)); float H = h.x * 360.;
  float dh = 0., ds = 0., dl = 0.;
  for (int i = 0; i < 8; i++) {
    float d = mod(H - CEN[i] + 540., 360.) - 180.;
    float lo = mod(CEN[i] - CEN[(i + 7) % 8] + 360., 360.), hi = mod(CEN[(i + 1) % 8] - CEN[i] + 360., 360.);
    float w = d < 0. ? max(0., 1. + d / lo) : max(0., 1. - d / hi);
    dh += w * uHue[i]; ds += w * uSat[i]; dl += w * uLum[i];
  }
  h.x = fract(h.x + dh * 30. / 360. + 1.); h.y = clamp(h.y * (1. + ds), 0., 1.);
  g = hsv2rgb(h) * (1. + dl * .55 * h.y);
  // black & white (the mixer's luminance still shapes the greys)
  if (uF.z > .5) g = vec3(luma(g));
  // colour grading: shadows / midtones / highlights / global
  Lg = clamp(luma(g), 0., 1.);
  float b = uGb.y, bw = uGb.x;
  float ws = 1. - smoothstep(0., .5 + .3 * b + .3 * bw, Lg), wh = smoothstep(.5 + .3 * b - .3 * bw, 1., Lg), wm = max(0., 1. - ws - wh);
  g += uGsh * ws + uGmid * wm + uGhi * wh + uGgl;
  g *= 1. + (uGl.x * ws + uGl.y * wm + uGl.z * wh + uGl.w) * .5;
  // tone curve: the RGB curve, then each channel's
  g = clamp(g, 0., 1.);
  g = vec3(curve(curve(g.r, 3), 0), curve(curve(g.g, 3), 1), curve(curve(g.b, 3), 2));
  // sharpening
  g += (src.rgb - s) * uD.y * 2.2 * (uGb.z);
  // vignette (roundness: -1 follows the photo's shape, +1 a circle)
  vec2 q = (v - .5) * 2.; float k = mix(1., uRes.x / uRes.y, uE.z * .5 + .5); q.x *= k;
  float rr = length(q) / length(vec2(k, 1.)), mp = .15 + uE.y * .8, fe = .05 + uE.x * .9;
  float vm = smoothstep(mp - fe * .5, mp + fe * .5, rr);
  g = uF.x < 0. ? g * (1. + uF.x * vm) : mix(g, vec3(1.), uF.x * vm);
  // grain
  if (uF.y > 0.) {
    vec2 gp = floor(v * uRes / uGrain);
    float n = hash(gp) + hash(gp + 17.31) - 1.;
    g += n * uF.y * .18 * (1. - abs(luma(g) * 2. - 1.) * .5);
  }
  o = vec4(clamp(g, 0., 1.), src.a);
}`;

let gl = null, prog = null, U = {}, TX = {}, fbo = null, fboTex = null;
function glInit(cv) {
  gl = cv.getContext('webgl2', { premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: false });
  if (!gl) throw new Error('This browser has no WebGL2 — Color needs it');
  const sh = (t, src) => { const x = gl.createShader(t); gl.shaderSource(x, src); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
  prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  ['uImg', 'uS', 'uM', 'uL', 'uCurve', 'uA', 'uB', 'uC', 'uD', 'uE', 'uF', 'uGsh', 'uGmid', 'uGhi', 'uGgl', 'uGl', 'uGb', 'uRes', 'uGrain'].forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });
  ['uHue', 'uSat', 'uLum'].forEach((n) => { U[n] = gl.getUniformLocation(prog, n + '[0]'); });
  ['uImg', 'uS', 'uM', 'uL', 'uCurve'].forEach((n, i) => gl.uniform1i(U[n], i));
}
function texFrom(unit, src, nearest) {
  const t = TX[unit] || gl.createTexture(); TX[unit] = t;
  gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  if (src instanceof Uint8Array) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, src);
  else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
  const f = nearest ? gl.NEAREST : gl.LINEAR;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}
const cvs = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
// the photo and its three blurred copies (fine detail, local contrast, haze / light) on the GPU
function upload(img) {
  const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  texFrom(0, img);
  const blur = (k, r) => { const c = cvs(w / k, h / k), x = c.getContext('2d'); x.filter = `blur(${r}px)`; x.drawImage(img, 0, 0, c.width, c.height); return c; };
  texFrom(1, blur(1, Math.max(1, Math.min(w, h) / 900)));
  texFrom(2, blur(4, Math.max(2, Math.min(w, h) / 4 / 90)));
  texFrom(3, blur(16, Math.max(2, Math.min(w, h) / 16 / 25)));
}
// tone curve points -> a smooth monotone curve (Fritsch-Carlson) as 256 values
function curveLUT(pts) {
  const P = pts.slice().sort((a, b) => a[0] - b[0]), n = P.length, out = new Float32Array(256);
  const d = [], m = [];
  for (let i = 0; i < n - 1; i++) d.push((P[i + 1][1] - P[i][1]) / Math.max(1e-6, P[i + 1][0] - P[i][0]));
  for (let i = 0; i < n; i++) m.push(i === 0 ? d[0] : i === n - 1 ? d[n - 2] : d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2);
  for (let i = 0; i < n - 1; i++) if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; } else { const a = m[i] / d[i], b = m[i + 1] / d[i], t = a * a + b * b; if (t > 9) { const k = 3 / Math.sqrt(t); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; } }
  for (let j = 0; j < 256; j++) {
    const x = j / 255; let i = 0; while (i < n - 2 && x > P[i + 1][0]) i++;
    if (x <= P[0][0]) { out[j] = P[0][1]; continue; } if (x >= P[n - 1][0]) { out[j] = P[n - 1][1]; continue; }
    const hh = P[i + 1][0] - P[i][0], t = (x - P[i][0]) / hh, t2 = t * t, t3 = t2 * t;
    out[j] = Math.min(1, Math.max(0, (2 * t3 - 3 * t2 + 1) * P[i][1] + (t3 - 2 * t2 + t) * hh * m[i] + (-2 * t3 + 3 * t2) * P[i + 1][1] + (t3 - t2) * hh * m[i + 1]));
  }
  return out;
}
function curveTex(s) {
  const r = curveLUT(s.curve.r), g = curveLUT(s.curve.g), b = curveLUT(s.curve.b), a = curveLUT(s.curve.rgb), u = new Uint8Array(1024);
  for (let i = 0; i < 256; i++) { u[i * 4] = r[i] * 255; u[i * 4 + 1] = g[i] * 255; u[i * 4 + 2] = b[i] * 255; u[i * 4 + 3] = a[i] * 255; }
  texFrom(4, u, true);
}
const hue2rgb = (h) => { const f = (n) => { const k = (n + h / 60) % 6; return 1 - Math.max(0, Math.min(k, 4 - k, 1)); }; return [f(5), f(3), f(1)]; };
const tintOf = ({ h, s }) => { const c = hue2rgb(h), L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; return c.map((x) => (x - L) * (s / 100) * 0.35); };
function setUniforms(s, w, h, before) {
  const G = s.grade;
  gl.uniform4f(U.uA, s.temp / 100, s.tint / 100, s.exposure, s.contrast / 100);
  gl.uniform4f(U.uB, s.highlights / 100, s.shadows / 100, s.whites / 100, s.blacks / 100);
  gl.uniform4f(U.uC, s.texture / 100, s.clarity / 100, s.dehaze / 100, s.vibrance / 100);
  gl.uniform4f(U.uD, s.saturation / 100, s.sharpen / 150, s.nr / 100, s.nrColor / 100);
  gl.uniform4f(U.uE, s.vigFeather / 100, s.vigMid / 100, s.vigRound / 100, before === 'split' ? CW.splitX : -1);
  gl.uniform4f(U.uF, s.vignette / 100, s.grain / 100, s.bw ? 1 : 0, before ? 1 : 0);
  gl.uniform3f(U.uGsh, ...tintOf(G.sh)); gl.uniform3f(U.uGmid, ...tintOf(G.mid)); gl.uniform3f(U.uGhi, ...tintOf(G.hi)); gl.uniform3f(U.uGgl, ...tintOf(G.gl));
  gl.uniform4f(U.uGl, G.sh.l / 100, G.mid.l / 100, G.hi.l / 100, G.gl.l / 100);
  gl.uniform3f(U.uGb, G.blend / 100, G.balance / 100, s.sharpRadius);
  gl.uniform1fv(U.uHue, s.hue.map((x) => x / 100)); gl.uniform1fv(U.uSat, s.sat.map((x) => x / 100)); gl.uniform1fv(U.uLum, s.lum.map((x) => x / 100));
  gl.uniform2f(U.uRes, w, h); gl.uniform1f(U.uGrain, Math.max(1, (1 + s.grainSize / 22) * Math.max(w, h) / 2400));
}
function draw(s, w, h, before) {
  curveTex(s); setUniforms(s, w, h, before);
  gl.viewport(0, 0, w, h); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
// the histogram: the developed photo drawn small into a frame buffer and counted
function histogram(s) {
  const w = 256, h = Math.max(16, Math.round(256 * CW.h / CW.w));
  if (!fbo) { fbo = gl.createFramebuffer(); fboTex = gl.createTexture(); }
  gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, fboTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fboTex, 0);
  draw(s, w, h, false);
  const px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  const H = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
  for (let i = 0; i < px.length; i += 4) if (px[i + 3] > 8) { H[0][px[i]]++; H[1][px[i + 1]]++; H[2][px[i + 2]]++; }
  return H;
}

// ---------------- the workspace ----------------
const SLIDERS = {
  temp: ['Temp', -100, 100, 1, 'linear-gradient(90deg,#3d7bff,#d8d8d8,#ffd23d)'], tint: ['Tint', -100, 100, 1, 'linear-gradient(90deg,#39c45a,#d8d8d8,#d44fd0)'],
  exposure: ['Exposure', -5, 5, 0.01], contrast: ['Contrast', -100, 100, 1], highlights: ['Highlights', -100, 100, 1], shadows: ['Shadows', -100, 100, 1],
  whites: ['Whites', -100, 100, 1], blacks: ['Blacks', -100, 100, 1], texture: ['Texture', -100, 100, 1], clarity: ['Clarity', -100, 100, 1],
  dehaze: ['Dehaze', -100, 100, 1], vibrance: ['Vibrance', -100, 100, 1], saturation: ['Saturation', -100, 100, 1],
  sharpen: ['Amount', 0, 150, 1], sharpRadius: ['Radius', 0.5, 3, 0.1], nr: ['Luminance', 0, 100, 1], nrColor: ['Color', 0, 100, 1],
  vignette: ['Amount', -100, 100, 1], vigMid: ['Midpoint', 0, 100, 1], vigRound: ['Roundness', -100, 100, 1], vigFeather: ['Feather', 0, 100, 1],
  grain: ['Amount', 0, 100, 1], grainSize: ['Size', 0, 100, 1],
};
const fmt = (k, v) => (k === 'exposure' ? (v > 0 ? '+' : '') + v.toFixed(2) : k === 'sharpRadius' ? v.toFixed(1) : (v > 0 && (SLIDERS[k]?.[1] ?? -1) < 0 ? '+' : '') + Math.round(v));
const get = (s, path) => path.split('.').reduce((o, k) => o?.[k], s);
const put = (s, path, v) => { const ks = path.split('.'); let o = s; ks.slice(0, -1).forEach((k) => { o = o[k]; }); o[ks.at(-1)] = v; };
const defOf = (path) => get(DEF(), path);
const slider = (path, label, min, max, step, track) => `<div class="cw-sl" data-p="${path}"><label title="Double-click to reset">${label}</label><output title="Double-click to type a value">${fmt(path, get(CW.s, path))}</output>
  <input type="range" min="${min}" max="${max}" step="${step}" value="${get(CW.s, path)}" ${track ? `style="--trk:${track}"` : ''}></div>`;
const sl = (k) => slider(k, ...SLIDERS[k]);
const sect = (id, title, body, open = true) => `<section class="cw-sec ${open ? 'open' : ''}" data-sec="${id}"><h3><span class="cw-tw"></span>${title}<button class="cw-rs" data-reset="${id}" title="Reset ${title}">↺</button></h3><div class="cw-sb">${body}</div></section>`;
const SEC_KEYS = { basic: ['bw', 'temp', 'tint', 'exposure', 'contrast', 'highlights', 'shadows', 'whites', 'blacks', 'texture', 'clarity', 'dehaze', 'vibrance', 'saturation'],
  curve: ['curve'], mixer: ['hue', 'sat', 'lum'], grade: ['grade'], detail: ['sharpen', 'sharpRadius', 'nr', 'nrColor'], effects: ['vignette', 'vigMid', 'vigRound', 'vigFeather', 'grain', 'grainSize'] };

function build() {
  const el = document.createElement('div'); el.id = 'colorWs'; el.className = 'cw hidden';
  el.innerHTML = `<aside class="cw-left">
      <section class="cw-sec open"><h3><span class="cw-tw"></span>Navigator</h3><div class="cw-sb"><canvas id="cwNav"></canvas></div></section>
      <section class="cw-sec open cw-grow"><h3><span class="cw-tw"></span>Presets<button class="cw-rs" id="cwAddPreset" title="Save these settings as a preset">+</button></h3><div class="cw-sb" id="cwPresets"></div></section>
      <section class="cw-sec open cw-grow"><h3><span class="cw-tw"></span>History<button class="cw-rs" id="cwClearHist" title="Clear history">×</button></h3><div class="cw-sb" id="cwHistory"></div></section>
    </aside>
    <main class="cw-main">
      <div class="cw-top"><b id="cwName"></b><span class="grow"></span>
        <button class="cw-tb" id="cwBefore" title="Before / After (\\)">Before / After</button><button class="cw-tb" id="cwSplit" title="Split view (Y)">Split</button>
        <button class="cw-tb" id="cwZoom" title="Fit / 1:1 (Z)">Fit</button><span class="cw-dv"></span>
        <button class="cw-tb" id="cwCopy" title="Copy settings (Ctrl+Shift+C)">Copy</button><button class="cw-tb" id="cwPaste" title="Paste settings (Ctrl+Shift+V)">Paste</button>
        <button class="cw-tb" id="cwReset" title="Reset all (Ctrl+Shift+R)">Reset</button><button class="cw-tb pri" id="cwDone" title="Write into the design and go back (Esc)">Done</button></div>
      <div class="cw-stage" id="cwStage"><canvas id="cwCanvas"></canvas><div class="cw-splitbar hidden" id="cwSplitBar"></div><div class="cw-tag" id="cwTag"></div></div>
      <div class="cw-film" id="cwFilm"></div>
    </main>
    <aside class="cw-right">
      <div class="cw-hist"><canvas id="cwHist" width="512" height="200"></canvas><div class="cw-hinfo" id="cwHInfo"></div></div>
      <div class="cw-panels" id="cwPanels"></div>
    </aside>`;
  document.body.appendChild(el);
  glInit($('#cwCanvas'));
  $('#cwDone').onclick = () => setStudioMode('design');
  $('#cwBefore').onclick = () => { CW.before = !CW.before; CW.split = false; uiState(); render(); };
  $('#cwSplit').onclick = () => { CW.split = !CW.split; CW.before = false; uiState(); render(); };
  $('#cwZoom').onclick = () => { CW.fit = !CW.fit; layout(); };
  $('#cwCopy').onclick = copySettings; $('#cwPaste').onclick = pasteSettings; $('#cwReset').onclick = () => change(DEF(), 'Reset');
  $('#cwAddPreset').onclick = addPreset;
  $('#cwClearHist').onclick = () => { CW.hist = [CW.hist[CW.hi]].filter(Boolean); CW.hi = CW.hist.length - 1; renderHistory(); };
  $$('.cw-left .cw-sec > h3').forEach((h) => h.addEventListener('click', (e) => { if (!e.target.closest('button')) h.parentElement.classList.toggle('open'); }));
  // split bar drag; click the photo to zoom in at that point (like Lightroom); drag to pan at 1:1
  const st = $('#cwStage');
  st.addEventListener('pointerdown', (e) => {
    if (CW.split && e.target.id === 'cwSplitBar') {
      const move = (ev) => { const r = $('#cwCanvas').getBoundingClientRect(); CW.splitX = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)); placeSplit(); render(); };
      window.addEventListener('pointermove', move); window.addEventListener('pointerup', () => window.removeEventListener('pointermove', move), { once: true }); return;
    }
    if (e.target.id !== 'cwCanvas') return;
    const x0 = e.clientX, y0 = e.clientY, sl0 = st.scrollLeft, stp0 = st.scrollTop; let moved = false;
    const move = (ev) => { if (Math.abs(ev.clientX - x0) + Math.abs(ev.clientY - y0) > 3) moved = true; if (!CW.fit) { st.scrollLeft = sl0 - (ev.clientX - x0); st.scrollTop = stp0 - (ev.clientY - y0); } };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', (ev) => {
      window.removeEventListener('pointermove', move);
      if (moved) return;
      const r = $('#cwCanvas').getBoundingClientRect(), fx = (ev.clientX - r.left) / r.width, fy = (ev.clientY - r.top) / r.height;
      CW.fit = !CW.fit; layout();
      if (!CW.fit) { const c = $('#cwCanvas'); st.scrollLeft = fx * c.offsetWidth - st.clientWidth / 2; st.scrollTop = fy * c.offsetHeight - st.clientHeight / 2; }
    }, { once: true });
  });
  window.addEventListener('resize', () => CW.open && layout());
}
function uiState() {
  $('#cwBefore').classList.toggle('on', CW.before); $('#cwSplit').classList.toggle('on', CW.split);
  $('#cwSplitBar').classList.toggle('hidden', !CW.split); $('#cwZoom').textContent = CW.fit ? 'Fit' : '1:1';
  $('#cwTag').textContent = CW.before ? 'Before' : CW.split ? 'Before | After' : ''; placeSplit();
}
function placeSplit() { const c = $('#cwCanvas'), b = $('#cwSplitBar'); if (!CW.split) return; b.style.left = (c.offsetLeft + c.offsetWidth * CW.splitX) + 'px'; b.style.top = c.offsetTop + 'px'; b.style.height = c.offsetHeight + 'px'; }
function layout() {
  const st = $('#cwStage'), c = $('#cwCanvas'); if (!CW.w) return;
  if (CW.fit) { const k = Math.min((st.clientWidth - 40) / CW.w, (st.clientHeight - 40) / CW.h, 1); c.style.width = CW.w * k + 'px'; c.style.height = CW.h * k + 'px'; st.classList.remove('zoomed'); }
  else { c.style.width = CW.w / devicePixelRatio + 'px'; c.style.height = CW.h / devicePixelRatio + 'px'; st.classList.add('zoomed'); }
  uiState();
}

// ---------------- panels ----------------
function panels() {
  const s = CW.s, ch = CW.ch, mix = CW.mix || 'hue', gw = CW.gw || 'three';
  const bandSl = (k) => s[k].map((v, i) => slider(`${k}.${i}`, BANDS[i][0], -100, 100, 1,
    k === 'hue' ? `linear-gradient(90deg,${BANDS[(i + 7) % 8][1]},${BANDS[i][1]},${BANDS[(i + 1) % 8][1]})` : k === 'sat' ? `linear-gradient(90deg,#8a8a8a,${BANDS[i][1]})` : `linear-gradient(90deg,#111,${BANDS[i][1]},#fff)`)).join('');
  const wheel = (k, title) => `<div class="cw-wheel" data-w="${k}"><span>${title}</span><canvas width="200" height="200"></canvas>${slider(`grade.${k}.l`, 'Luminance', -100, 100, 1)}</div>`;
  $('#cwPanels').innerHTML =
    sect('basic', 'Basic', `<div class="cw-row"><span>Treatment</span><div class="cw-seg"><button data-bw="0" class="${s.bw ? '' : 'on'}">Color</button><button data-bw="1" class="${s.bw ? 'on' : ''}">Black &amp; White</button></div></div>
      <div class="cw-row"><span>White Balance</span><span class="grow"></span><button class="cw-mini" data-wb="shot">As Shot</button><button class="cw-mini" data-wb="auto">Auto</button></div>
      ${sl('temp')}${sl('tint')}<div class="cw-row"><span>Tone</span><span class="grow"></span><button class="cw-mini" id="cwAuto">Auto</button></div>
      ${['exposure', 'contrast', 'highlights', 'shadows', 'whites', 'blacks'].map(sl).join('')}<div class="cw-row"><span>Presence</span></div>${['texture', 'clarity', 'dehaze', 'vibrance', 'saturation'].map(sl).join('')}`)
    + sect('curve', 'Tone Curve', `<div class="cw-seg cw-chs">${[['rgb', 'RGB'], ['r', 'Red'], ['g', 'Green'], ['b', 'Blue']].map(([k, n]) => `<button data-ch="${k}" class="${ch === k ? 'on' : ''}">${n}</button>`).join('')}</div>
      <canvas id="cwCurve" width="512" height="512"></canvas><p class="cw-hint">Click to add a point · drag it · double-click to remove</p>`, false)
    + sect('mixer', 'Color Mixer', `<div class="cw-seg">${[['hue', 'Hue'], ['sat', 'Saturation'], ['lum', 'Luminance'], ['all', 'All']].map(([k, n]) => `<button data-mix="${k}" class="${mix === k ? 'on' : ''}">${n}</button>`).join('')}</div>
      ${mix === 'all' ? ['hue', 'sat', 'lum'].map((k) => `<h4>${{ hue: 'Hue', sat: 'Saturation', lum: 'Luminance' }[k]}</h4>${bandSl(k)}`).join('') : bandSl(mix)}`, false)
    + sect('grade', 'Color Grading', `<div class="cw-seg">${[['three', '3-Way'], ['sh', 'Shadows'], ['mid', 'Midtones'], ['hi', 'Highlights'], ['gl', 'Global']].map(([k, n]) => `<button data-gw="${k}" class="${gw === k ? 'on' : ''}">${n}</button>`).join('')}</div>
      ${gw === 'three' ? `<div class="cw-wheels3">${wheel('mid', 'Midtones')}<div class="cw-w2">${wheel('sh', 'Shadows')}${wheel('hi', 'Highlights')}</div></div>` : `<div class="cw-wheel1">${wheel(gw, { sh: 'Shadows', mid: 'Midtones', hi: 'Highlights', gl: 'Global' }[gw])}</div>`}
      ${slider('grade.blend', 'Blending', 0, 100, 1)}${slider('grade.balance', 'Balance', -100, 100, 1)}`, false)
    + sect('detail', 'Detail', `<h4>Sharpening</h4>${sl('sharpen')}${sl('sharpRadius')}<h4>Noise Reduction</h4>${sl('nr')}${sl('nrColor')}`, false)
    + sect('effects', 'Effects', `<h4>Post-Crop Vignetting</h4>${sl('vignette')}${sl('vigMid')}${sl('vigRound')}${sl('vigFeather')}<h4>Grain</h4>${sl('grain')}${sl('grainSize')}`, false);
  // (sections stay open / closed as you left them)
  $$('#cwPanels .cw-sec').forEach((x) => { if (CW.secs?.[x.dataset.sec] !== undefined) x.classList.toggle('open', CW.secs[x.dataset.sec]); });
  bindPanels(); drawCurve(); drawWheels();
}
function bindPanels() {
  const P = $('#cwPanels');
  $$('.cw-sec > h3', P).forEach((h) => h.addEventListener('click', (e) => {
    const sec = h.parentElement, r = e.target.closest('[data-reset]');
    if (r) { const s = clone(CW.s), d = DEF(); SEC_KEYS[r.dataset.reset].forEach((k) => { s[k] = d[k]; }); change(s, `Reset ${h.textContent.replace('↺', '').trim()}`); return; }
    sec.classList.toggle('open'); CW.secs = { ...(CW.secs || {}), [sec.dataset.sec]: sec.classList.contains('open') };
  }));
  $$('.cw-sl', P).forEach((row) => {
    const p = row.dataset.p, inp = $('input', row), out = $('output', row), name = $('label', row).textContent;
    inp.oninput = () => { const s = clone(CW.s); put(s, p, +inp.value); out.textContent = fmt(p, +inp.value); CW.s = s; render(); if (p.startsWith('grade.')) drawWheels(); };
    inp.onchange = () => commit(`${name} ${fmt(p, +inp.value)}`);
    $('label', row).ondblclick = () => { const s = clone(CW.s); put(s, p, defOf(p)); change(s, `Reset ${name}`); };
    out.ondblclick = () => { const v = prompt(name, get(CW.s, p)); if (v !== null && !isNaN(+v)) { const s = clone(CW.s); put(s, p, Math.min(+inp.max, Math.max(+inp.min, +v))); change(s, `${name} ${v}`); } };
  });
  $$('[data-bw]', P).forEach((b) => b.onclick = () => change({ ...clone(CW.s), bw: b.dataset.bw === '1' }, b.dataset.bw === '1' ? 'Black & White' : 'Color'));
  $$('[data-wb]', P).forEach((b) => b.onclick = () => (b.dataset.wb === 'shot' ? change({ ...clone(CW.s), temp: 0, tint: 0 }, 'White balance: As Shot') : autoWB()));
  $('#cwAuto').onclick = autoTone;
  $$('[data-ch]', P).forEach((b) => b.onclick = () => { CW.ch = b.dataset.ch; panels(); });
  $$('[data-mix]', P).forEach((b) => b.onclick = () => { CW.mix = b.dataset.mix; panels(); });
  $$('[data-gw]', P).forEach((b) => b.onclick = () => { CW.gw = b.dataset.gw; panels(); });
  bindCurve(); bindWheels();
}
// ---- tone curve editor ----
function drawCurve() {
  const c = $('#cwCurve'); if (!c) return;
  const x = c.getContext('2d'), W = c.width, H = c.height, pts = CW.s.curve[CW.ch];
  x.clearRect(0, 0, W, H); x.fillStyle = '#1b1d22'; x.fillRect(0, 0, W, H);
  const hs = CW.lastHist; // (the histogram behind)
  if (hs) {
    const sum = CW.ch === 'rgb' ? hs[0].map((v, i) => v + hs[1][i] + hs[2][i]) : hs[{ r: 0, g: 1, b: 2 }[CW.ch]], mx = Math.max(...Array.from(sum).slice(2, 254)) || 1;
    x.fillStyle = '#ffffff14'; x.beginPath(); x.moveTo(0, H); for (let i = 0; i < 256; i++) x.lineTo(i / 255 * W, H - Math.min(1, sum[i] / mx) * H * 0.9); x.lineTo(W, H); x.fill();
  }
  x.strokeStyle = '#ffffff14'; x.lineWidth = 1; for (let i = 1; i < 4; i++) { x.beginPath(); x.moveTo(i * W / 4, 0); x.lineTo(i * W / 4, H); x.moveTo(0, i * H / 4); x.lineTo(W, i * H / 4); x.stroke(); }
  x.strokeStyle = '#ffffff22'; x.beginPath(); x.moveTo(0, H); x.lineTo(W, 0); x.stroke();
  const lut = curveLUT(pts), col = { rgb: '#e8e8e8', r: '#ff6b6b', g: '#5fd47a', b: '#6aa3ff' }[CW.ch];
  x.strokeStyle = col; x.lineWidth = 3; x.beginPath(); for (let i = 0; i < 256; i++) { const px = i / 255 * W, py = H - lut[i] * H; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke();
  pts.forEach(([a, b], i) => { x.fillStyle = i === CW.cdrag ? col : '#1b1d22'; x.strokeStyle = col; x.lineWidth = 3; x.beginPath(); x.arc(a * W, H - b * H, 9, 0, 7); x.fill(); x.stroke(); });
}
function bindCurve() {
  const c = $('#cwCurve'); if (!c) return;
  const pos = (e) => { const r = c.getBoundingClientRect(); return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, 1 - (e.clientY - r.top) / r.height))]; };
  const near = (p) => CW.s.curve[CW.ch].findIndex(([a, b]) => Math.hypot(a - p[0], b - p[1]) < 0.045);
  c.onpointerdown = (e) => {
    const p = pos(e), s = clone(CW.s), pts = s.curve[CW.ch]; let i = near(p);
    if (i < 0) { pts.push(p); pts.sort((a, b) => a[0] - b[0]); i = pts.findIndex((q) => q[0] === p[0] && q[1] === p[1]); }
    CW.s = s; CW.cdrag = i; try { c.setPointerCapture(e.pointerId); } catch { /* not a live pointer */ } render(); drawCurve();
    c.onpointermove = (ev) => {
      const q = pos(ev), s2 = clone(CW.s), P2 = s2.curve[CW.ch], j = CW.cdrag;
      const lo = j > 0 ? P2[j - 1][0] + 0.01 : 0, hi = j < P2.length - 1 ? P2[j + 1][0] - 0.01 : 1;
      P2[j] = [Math.min(hi, Math.max(lo, q[0])), q[1]];
      CW.s = s2; render(); drawCurve();
    };
    c.onpointerup = () => { c.onpointermove = null; CW.cdrag = -1; drawCurve(); commit(`Tone Curve (${CW.ch.toUpperCase()})`); };
  };
  c.ondblclick = (e) => { const i = near(pos(e)), s = clone(CW.s), pts = s.curve[CW.ch]; if (i > 0 && i < pts.length - 1) { pts.splice(i, 1); change(s, 'Remove curve point'); } };
}
// ---- colour wheels ----
function drawWheels() {
  $$('#cwPanels .cw-wheel').forEach((wh) => {
    const k = wh.dataset.w, c = $('canvas', wh), x = c.getContext('2d'), R = c.width / 2, g = CW.s.grade[k];
    if (!c._base) {
      const b = cvs(c.width, c.height), bx = b.getContext('2d'), id = bx.createImageData(b.width, b.height);
      for (let y = 0; y < b.height; y++) for (let xx = 0; xx < b.width; xx++) {
        const dx = xx - R, dy = y - R, d = Math.hypot(dx, dy) / (R - 4); if (d > 1) continue;
        const h = (Math.atan2(-dy, dx) * 180 / Math.PI + 360) % 360, rgb = hue2rgb(h), j = (y * b.width + xx) * 4;
        for (let q = 0; q < 3; q++) id.data[j + q] = (0.42 + (rgb[q] - 0.42) * d * 0.9) * 255; id.data[j + 3] = 255;
      }
      bx.putImageData(id, 0, 0); c._base = b;
    }
    x.clearRect(0, 0, c.width, c.height); x.drawImage(c._base, 0, 0);
    x.strokeStyle = '#0006'; x.lineWidth = 2; x.beginPath(); x.arc(R, R, R - 4, 0, 7); x.stroke();
    const a = g.h * Math.PI / 180, rr = g.s / 100 * (R - 4), px = R + Math.cos(a) * rr, py = R - Math.sin(a) * rr;
    x.strokeStyle = '#fff'; x.lineWidth = 3; x.beginPath(); x.arc(px, py, 9, 0, 7); x.stroke(); x.strokeStyle = '#000a'; x.lineWidth = 1; x.beginPath(); x.arc(px, py, 11, 0, 7); x.stroke();
  });
}
function bindWheels() {
  $$('#cwPanels .cw-wheel canvas').forEach((c) => {
    const k = c.closest('.cw-wheel').dataset.w;
    const set = (e) => {
      const r = c.getBoundingClientRect(), dx = (e.clientX - r.left) / r.width * 2 - 1, dy = (e.clientY - r.top) / r.height * 2 - 1;
      const s = clone(CW.s); s.grade[k].h = Math.round((Math.atan2(-dy, dx) * 180 / Math.PI + 360) % 360); s.grade[k].s = Math.round(Math.min(1, Math.hypot(dx, dy) / 0.96) * 100); CW.s = s; render(); drawWheels();
    };
    c.onpointerdown = (e) => { try { c.setPointerCapture(e.pointerId); } catch { /* not a live pointer */ } set(e); c.onpointermove = set; c.onpointerup = () => { c.onpointermove = null; commit(`Color Grading ${{ sh: 'Shadows', mid: 'Midtones', hi: 'Highlights', gl: 'Global' }[k]}`); }; };
    c.ondblclick = () => { const s = clone(CW.s); s.grade[k] = { ...s.grade[k], h: 0, s: 0 }; change(s, 'Reset wheel'); };
  });
}

// ---------------- render, history, presets ----------------
let raf = 0, histT = 0;
const mode = () => (CW.before ? true : CW.split ? 'split' : false);
function render() {
  if (!CW.open || !CW.w) return;
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => {
    const look = CW.peek || CW.s;
    draw(look, CW.w, CW.h, mode());
    clearTimeout(histT);
    histT = setTimeout(() => { CW.lastHist = histogram(look); draw(look, CW.w, CW.h, mode()); drawHist(); drawCurve(); drawNav(); }, 60);
  });
}
function drawHist() {
  const c = $('#cwHist'), x = c.getContext('2d'), H = CW.lastHist, W = c.width, Hh = c.height; if (!H) return;
  x.clearRect(0, 0, W, Hh);
  const mx = Math.max(...[0, 1, 2].map((k) => Math.max(...Array.from(H[k]).slice(2, 254)))) || 1;
  x.globalCompositeOperation = 'lighter';
  [['#d03838', 0], ['#2fa84a', 1], ['#3366e0', 2]].forEach(([col, k]) => { x.fillStyle = col; x.beginPath(); x.moveTo(0, Hh); for (let i = 0; i < 256; i++) x.lineTo(i / 255 * W, Hh - Math.min(1, H[k][i] / mx) * Hh * 0.95); x.lineTo(W, Hh); x.fill(); });
  x.globalCompositeOperation = 'source-over';
  const s = CW.peek || CW.s;
  $('#cwHInfo').innerHTML = `<span>${CW.w} × ${CW.h} px</span><span>${s.bw ? 'B&amp;W' : 'Color'} · Exposure ${fmt('exposure', s.exposure)}</span>`;
}
function drawNav() { const n = $('#cwNav'), c = $('#cwCanvas'); if (!n || !CW.w) return; const k = 236 / Math.max(CW.w, CW.h); n.width = Math.round(CW.w * k); n.height = Math.round(CW.h * k); n.getContext('2d').drawImage(c, 0, 0, n.width, n.height); }
function commit(label) {
  if (CW.hist[CW.hi] && same(CW.hist[CW.hi].s, CW.s)) return;
  CW.hist = CW.hist.slice(0, CW.hi + 1); CW.hist.push({ label, s: clone(CW.s) }); CW.hi = CW.hist.length - 1; renderHistory(); renderFilmDot();
}
function change(s, label) { CW.s = s; panels(); render(); commit(label); }
function renderHistory() {
  $('#cwHistory').innerHTML = CW.hist.map((h, i) => `<button class="cw-hi ${i === CW.hi ? 'on' : ''} ${i > CW.hi ? 'undone' : ''}" data-h="${i}">${esc(h.label)}</button>`).reverse().join('');
  $$('#cwHistory [data-h]').forEach((b) => b.onclick = () => { CW.hi = +b.dataset.h; CW.s = clone(CW.hist[CW.hi].s); panels(); render(); renderHistory(); });
}
function undo(d) { const i = CW.hi + d; if (i < 0 || i >= CW.hist.length) return; CW.hi = i; CW.s = clone(CW.hist[i].s); panels(); render(); renderHistory(); }
function renderPresets() {
  const groups = [...PRESETS, ['User Presets', userPresets().map((p) => [p.name, p.s, true])]];
  $('#cwPresets').innerHTML = groups.map(([g, l]) => `<div class="cw-pg"><div class="cw-pgt">${esc(g)}</div>${l.length ? l.map(([n, , u]) => `<button class="cw-pr" data-pr="${esc(n)}" data-g="${esc(g)}">${esc(n)}${u ? '<i data-del title="Delete">×</i>' : ''}</button>`).join('') : '<p class="cw-hint">None yet — + saves the current look</p>'}</div>`).join('');
  const find = (b) => groups.find(([g]) => g === b.dataset.g)[1].find(([n]) => n === b.dataset.pr);
  $$('#cwPresets [data-pr]').forEach((b) => {
    const p = find(b), full = p[2] ? merge(DEF(), p[1]) : merge(DEF(), p[1]);
    b.onmouseenter = () => { CW.peek = full; render(); };   // (hover: a preview, like Lightroom's Navigator)
    b.onmouseleave = () => { CW.peek = null; render(); };
    b.onclick = (e) => { if (e.target.closest('[data-del]')) { saveUserPresets(userPresets().filter((x) => x.name !== p[0])); renderPresets(); return; } CW.peek = null; change(clone(full), `Preset: ${p[0]}`); };
  });
}
function addPreset() {
  const name = prompt('Preset name', 'My look'); if (!name) return;
  saveUserPresets([...userPresets().filter((p) => p.name !== name), { name, s: clone(CW.s) }]); renderPresets(); toast(`Preset “${name}” saved on this PC`);
}
function copySettings() { CW.clip = clone(CW.s); toast('Settings copied — open another photo and Paste'); }
function pasteSettings() { if (!CW.clip) return toast('Copy settings first'); change(clone(CW.clip), 'Paste settings'); }
// Auto tone / white balance from the photo's own (unedited) histogram
function stats() {
  const H = histogram(DEF()), n = H[0].reduce((a, b) => a + b, 0) || 1;
  const pct = (h, f) => { let s = 0; for (let i = 0; i < 256; i++) { s += h[i]; if (s >= n * f) return i / 255; } return 1; };
  const L = new Uint32Array(256); for (let i = 0; i < 256; i++) L[i] = Math.round(H[0][i] * 0.2126 + H[1][i] * 0.7152 + H[2][i] * 0.0722);
  const mean = (h) => h.reduce((a, v, i) => a + v * i, 0) / n / 255;
  return { p1: pct(L, 0.01), p50: pct(L, 0.5), p99: pct(L, 0.99), r: mean(H[0]), g: mean(H[1]), b: mean(H[2]) };
}
function autoTone() {
  const t = stats(), s = clone(CW.s);
  s.exposure = +Math.max(-2, Math.min(2, Math.log2(0.46 / Math.max(0.02, t.p50)) * 0.7)).toFixed(2);
  s.whites = Math.round(Math.max(-40, Math.min(60, (0.97 - t.p99) * 220))); s.blacks = Math.round(Math.max(-60, Math.min(40, -(t.p1 - 0.02) * 260)));
  s.highlights = t.p99 > 0.97 ? -35 : -15; s.shadows = t.p1 < 0.05 ? 30 : 10; s.contrast = 10; s.vibrance = 15;
  change(s, 'Auto Tone');
}
function autoWB() {
  const t = stats(), s = clone(CW.s), avg = (t.r + t.g + t.b) / 3 || 0.5;
  s.temp = Math.round(Math.max(-60, Math.min(60, ((t.b - t.r) / avg) * 120))); s.tint = Math.round(Math.max(-60, Math.min(60, ((t.g - (t.r + t.b) / 2) / avg) * 160)));
  change(s, 'White balance: Auto');
}

// ---------------- photos: open, switch, write back ----------------
const photos = () => ED.canvas.getObjects().filter((o) => o.type === 'image' && !o.isPage && !o.genfill && o.visible !== false);
const loadImgEl = (url) => new Promise((ok, bad) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => ok(im); im.onerror = () => bad(new Error('Could not load the photo')); im.src = url; });
const nameOf = (o) => o.name || 'Photo';
function renderFilm() {
  const list = photos();
  $('#cwFilm').innerHTML = list.map((o) => {
    const el = o.getElement(), k = 64 / (el.naturalHeight || el.height || 64);
    return `<button class="cw-fr ${o === CW.layer ? 'on' : ''}" data-id="${o.id}" title="${esc(nameOf(o))}"><canvas width="${Math.max(1, Math.round((el.naturalWidth || el.width) * k))}" height="64"></canvas><i class="${o.develop ? 'ed' : ''}"></i></button>`;
  }).join('');
  $$('#cwFilm [data-id]').forEach((b) => {
    const o = list.find((x) => x.id === b.dataset.id), c = $('canvas', b);
    try { c.getContext('2d').drawImage(o.getElement(), 0, 0, c.width, c.height); } catch { /* not loaded */ }
    b.onclick = async () => { if (o === CW.layer) return; try { await bake(); await loadPhoto(o); } catch (e) { toast(e.message, true); } };
  });
}
function renderFilmDot() { const b = CW.layer && $(`#cwFilm [data-id="${CW.layer.id}"] i`); if (b) b.classList.toggle('ed', !isDefault(CW.s)); }
async function loadPhoto(o) {
  CW.layer = o; if (!o.id) o.id = uid();
  const src = o.devOrig || o.getSrc();
  const img = await loadImgEl(src);
  const max = gl.getParameter(gl.MAX_TEXTURE_SIZE), w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, max / Math.max(w, h));
  CW.img = img; CW.w = Math.round(w * k); CW.h = Math.round(h * k); CW.src = src;
  const c = $('#cwCanvas'); c.width = CW.w; c.height = CW.h;
  upload(k < 1 ? (() => { const t = cvs(CW.w, CW.h); t.getContext('2d').drawImage(img, 0, 0, CW.w, CW.h); return t; })() : img);
  CW.s = merge(DEF(), o.develop || {}); CW.base = clone(CW.s);
  CW.hist = [{ label: o.develop ? 'Opened (edited before)' : 'Import', s: clone(CW.s) }]; CW.hi = 0;
  $('#cwName').textContent = nameOf(o);
  panels(); renderHistory(); renderFilm(); layout(); render();
}
// the developed pixels into the layer (the original and the settings stay with it)
async function bake() {
  const o = CW.layer; if (!o || same(CW.s, CW.base)) return;
  const keep = { width: o.width, height: o.height, cropX: o.cropX, cropY: o.cropY };
  if (isDefault(CW.s)) {
    if (o.devOrig) await new Promise((ok) => o.setSrc(o.devOrig, ok, { crossOrigin: 'anonymous' }));
    delete o.develop; delete o.devOrig;
  } else {
    draw(CW.s, CW.w, CW.h, false);
    const jpg = /\.jpe?g($|\?)/i.test(CW.src), data = $('#cwCanvas').toDataURL(jpg ? 'image/jpeg' : 'image/png', 0.95);
    render(); // (the view goes back to before / split if it was)
    const r = await fetch('/api/library', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: `color_${nameOf(o).slice(0, 30)}.${jpg ? 'jpg' : 'png'}`, data }) });
    const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Could not save the photo');
    if (!o.devOrig) o.devOrig = CW.src;
    o.develop = clone(CW.s);
    await new Promise((ok) => o.setSrc(j.url, ok, { crossOrigin: 'anonymous' }));
    // (a photo bigger than the GPU allows comes back smaller: scaled so the layer keeps its size)
    const sx = CW.w / (CW.img.naturalWidth || CW.w);
    if (Math.abs(sx - 1) > 0.001) { o.set({ scaleX: o.scaleX / sx, scaleY: o.scaleY / sx }); keep.width *= sx; keep.height *= sx; keep.cropX = (keep.cropX || 0) * sx; keep.cropY = (keep.cropY || 0) * sx; }
  }
  o.set(keep); o.dirty = true; o.setCoords();
  CW.base = clone(CW.s);
  ED.canvas.requestRenderAll(); scheduleHistory();
}

async function cwOpen(layer) {
  const list = photos();
  if (!list.length) { toast('Color edits photos — add a photo to the design first'); return false; }
  if (!$('#colorWs')) build();
  const a = layer || ED.canvas.getActiveObject();
  const o = list.includes(a) ? a : list.slice().sort((p, q) => q.getScaledWidth() * q.getScaledHeight() - p.getScaledWidth() * p.getScaledHeight())[0];
  const box = $('#colorWs'), wb = document.querySelector('#editor .workbench');
  box.style.top = (wb ? wb.getBoundingClientRect().top : 0) + 'px';
  box.classList.remove('hidden'); CW.open = true; CW.before = false; CW.split = false; CW.fit = true;
  renderPresets();
  try { await loadPhoto(o); } catch (e) { toast(e.message, true); }
  return true;
}
async function cwClose() {
  if (!CW.open) return;
  try { await bake(); } catch (e) { toast('Color: ' + e.message, true); }
  CW.open = false; CW.peek = null; $('#colorWs')?.classList.add('hidden');
  if (CW.layer && ED.canvas.getObjects().includes(CW.layer)) { ED.canvas.setActiveObject(CW.layer); ED.canvas.requestRenderAll(); ED.emit('selection'); }
}
window.StudioColor = { open: cwOpen, close: cwClose, bake: () => (CW.open ? bake() : null), state: () => CW };

// ---------------- the tab ----------------
const _setMode = setStudioMode;
setStudioMode = async function (m, opts = {}) {
  if (m === 'color') {
    if (ED.mode === 'color' || ED.switching || !ED.canvas) return;
    if (ED.mode !== 'design') await _setMode('design');
    ED.mode = 'color'; document.body.dataset.mode = 'color'; renderModeTabs();
    if (!(await cwOpen(opts.layer))) { ED.mode = 'design'; document.body.dataset.mode = 'design'; renderModeTabs(); return; }
    ED.emit('mode'); return;
  }
  if (ED.mode === 'color') {
    await cwClose();
    ED.mode = 'design'; document.body.dataset.mode = 'design'; renderModeTabs();
    if (m === 'design') { applyModeUI('design'); ED.emit('mode'); return; }
  }
  return _setMode(m, opts);
};
window.setStudioMode = setStudioMode;
// saving, exporting, going home, switching files: the developed photo is written in first
const _saveC = saveProject; saveProject = async function () { if (CW.open) await bake().catch(() => 0); return _saveC(); };
const _expC = exportDesign; exportDesign = async function (o) { if (CW.open) await bake(); return _expC(o); };
const _homeC = goHome; goHome = async function () { if (ED.mode === 'color') await setStudioMode('design'); return _homeC(); };
const _swC = switchDoc; switchDoc = async function (id) { if (ED.mode === 'color') await setStudioMode('design'); return _swC(id); };

// keys while Color is open (before the editor's own, which must not touch the design behind)
window.addEventListener('keydown', (e) => {
  if (!CW.open) return;
  if (e.target.closest?.('input, textarea, [contenteditable]') && e.target.type !== 'range') return;
  const k = e.key.toLowerCase(), ctrl = e.ctrlKey || e.metaKey;
  const act = ctrl && e.shiftKey && k === 'c' ? copySettings : ctrl && e.shiftKey && k === 'v' ? pasteSettings : ctrl && e.shiftKey && k === 'r' ? () => change(DEF(), 'Reset')
    : ctrl && !e.shiftKey && k === 'z' ? () => undo(-1) : ctrl && (k === 'y' || (e.shiftKey && k === 'z')) ? () => undo(1)
      : !ctrl && k === '\\' ? () => $('#cwBefore').click() : !ctrl && k === 'y' ? () => $('#cwSplit').click() : !ctrl && k === 'z' ? () => $('#cwZoom').click()
        : !ctrl && k === 'escape' ? () => setStudioMode('design') : ctrl && k === 's' ? () => saveProject() : null;
  if (e.target.type === 'range' && !act) return;   // (arrow keys move a slider)
  e.stopImmediatePropagation();
  if (act) { e.preventDefault(); act(); } else if (!['F5', 'F11', 'F12'].includes(e.key) && !(ctrl && ['=', '-', '0', 'r'].includes(k))) e.preventDefault();
}, true);

// Design: Properties offers Color for a photo
ED.inspHooks.push((el, objs) => {
  const o = objs.length === 1 ? objs[0] : null;
  if (!o || o.type !== 'image' || o.genfill || ED.mode !== 'design' || ED.stack) return;
  el.insertAdjacentHTML('afterbegin', sec('Color', `<p class="muted small">${o.develop ? 'Developed in Color — the original is kept; Reset in Color brings it back.' : 'Photo develop: light, colour, curves, grading, detail, effects.'}</p>
    <button class="btn ${o.develop ? '' : 'primary'} full" data-cw="open">${icon('develop', 'width="16" height="16"')}Edit in Color</button>`));
  $('[data-cw=open]', el).onclick = () => setStudioMode('color', { layer: o });
});
})();

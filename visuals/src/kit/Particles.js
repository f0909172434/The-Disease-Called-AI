// Particles — all closed-form functions of t (no simulation state), instanced on the GPU.
//
//   DustParticles     motes drifting in a box, lit where they cross a light beam (screen / window)
//   FeverStream       magenta particles flowing along a curve like blood; kick pulses; streaks ("light trails")
//                     states: speed, pulse, trail (0..1 streak length), width (world), swirl, radius; setPoints()
//   TokenConfetti     text-token streamers (e.g. YES / I LOVE YOU) bursting and fluttering down
//   NotificationSnow  grey notification cards falling and piling up on the floor
//
// Common states: opacity, brightness, color (THREE.Color), plus per-class fields documented below.
import * as THREE from 'three';
import { rng } from '../core/rng.js';
import { col, rgba, C } from '../core/palette.js';
import { cssFont } from '../core/fonts.js';
import { canvasTexture } from '../core/text.js';
import { expandInstanced } from '../core/geom.js';

// ---------------------------------------------------------------------------------------- Dust
const DUST_VERT = /* glsl */`
attribute vec3 aBase;
attribute vec4 aRnd;
uniform float uTime, uPx, uSize, uSpeed, uFocus, uAperture, uTwinkle;
uniform vec3 uBoxMin, uBoxSize, uWind;
uniform vec3 uBeamO, uBeamD; uniform float uBeamR, uBeamS, uAmbient;
varying float vA;
void main() {
  float t = uTime * uSpeed;
  vec3 drift = vec3(sin(t * (0.13 + aRnd.x * 0.2) + aRnd.y * 6.28), sin(t * (0.11 + aRnd.y * 0.17) + aRnd.z * 6.28), sin(t * (0.09 + aRnd.z * 0.15) + aRnd.x * 6.28)) * 0.08 * uBoxSize.y;
  vec3 p = aBase + drift + uWind * t * (0.5 + aRnd.w);
  p = uBoxMin + mod(p - uBoxMin, uBoxSize);
  vec3 wp = (modelMatrix * vec4(p, 1.0)).xyz;
  // light beam (cylinder) membership
  vec3 d = wp - uBeamO;
  float along = dot(d, uBeamD);
  float dist = length(d - uBeamD * along);
  float beam = uBeamS * exp(-pow(dist / max(uBeamR, 1e-3), 2.0)) * step(0.0, along);
  float tw = 0.75 + 0.25 * sin(uTime * (1.5 + aRnd.w * 3.0) + aRnd.x * 40.0) + uTwinkle * step(0.8, aRnd.z);
  vec4 mv = viewMatrix * vec4(wp, 1.0);
  gl_Position = projectionMatrix * mv;
  float z = max(-mv.z, 0.01);
  float ps = uSize * (0.5 + aRnd.w) * uPx / z;
  float coc = abs(z - uFocus) / z * uAperture * uPx * 0.02;
  float ns = sqrt(ps * ps + coc * coc);
  float comp = (ps * ps) / (ns * ns);
  if (ns < 1.2) { comp *= (ns * ns) / 1.44; ns = 1.2; }
  float cap = 46.0;
  if (ns > cap) { comp *= (cap * cap) / (ns * ns) * 1.6; ns = cap; }
  gl_PointSize = ns;
  vA = (uAmbient + beam) * tw * comp;
}`;
const DUST_FRAG = /* glsl */`
uniform vec3 uColor; uniform float uOpacity;
varying float vA;
void main() {
  vec2 q = gl_PointCoord - 0.5;
  float r2 = dot(q, q) * 4.0;
  if (r2 > 1.0) discard;
  float a = (exp(-r2 * 2.5) * 0.85 + 0.15 * (1.0 - r2)) * vA * uOpacity;
  gl_FragColor = vec4(uColor * a, 1.0);
}`;

export class DustParticles extends THREE.Points {
  /** box: [minX,minY,minZ,maxX,maxY,maxZ] (local) */
  constructor(ctx, { count = 1800, box = [-2, -1.5, -2, 2, 1.5, 2], seed = 'dust', size = 0.012, color = '#FFE2C2' } = {}) {
    const R = rng(seed);
    const base = new Float32Array(count * 3), rnd = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      base[i * 3] = R.range(box[0], box[3]); base[i * 3 + 1] = R.range(box[1], box[4]); base[i * 3 + 2] = R.range(box[2], box[5]);
      rnd.set([R.next(), R.next(), R.next(), R.next()], i * 4);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute('aBase', new THREE.BufferAttribute(base, 3));
    geo.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 4));
    const mat = new THREE.ShaderMaterial({
      vertexShader: DUST_VERT, fragmentShader: DUST_FRAG,
      uniforms: {
        uTime: { value: 0 }, uPx: { value: ctx.H * 0.5 / Math.tan(17.5 * Math.PI / 180) }, uSize: { value: size }, uSpeed: { value: 1 },
        uFocus: { value: 3 }, uAperture: { value: 0 }, uTwinkle: { value: 0 },
        uBoxMin: { value: new THREE.Vector3(box[0], box[1], box[2]) }, uBoxSize: { value: new THREE.Vector3(box[3] - box[0], box[4] - box[1], box[5] - box[2]) },
        uWind: { value: new THREE.Vector3(0.01, 0.015, 0) },
        uBeamO: { value: new THREE.Vector3(3, 0, 0) }, uBeamD: { value: new THREE.Vector3(-1, 0, 0) }, uBeamR: { value: 0.8 }, uBeamS: { value: 1 },
        uAmbient: { value: 0.08 }, uColor: { value: col(color) }, uOpacity: { value: 1 },
      },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    super(geo, mat);
    this.frustumCulled = false;
    this.ctx = ctx;
    Object.assign(this, { opacity: 1, speed: 1, focus: 3, aperture: 0, twinkle: 0, ambient: 0.08, beamStrength: 1, beamRadius: 0.8, size });
    this.beamOrigin = mat.uniforms.uBeamO.value;
    this.beamDir = mat.uniforms.uBeamD.value;
    this.wind = mat.uniforms.uWind.value;
    this.color = mat.uniforms.uColor.value;
  }
  /** set the camera so point sizes follow its fov / viewport */
  setCamera(cam, viewHeight) { this.material.uniforms.uPx.value = (viewHeight || this.ctx.H) * 0.5 / Math.tan(cam.fov * Math.PI / 360); return this; }
  update(t, states = {}) {
    Object.assign(this, states);
    const u = this.material.uniforms;
    u.uTime.value = t; u.uOpacity.value = this.opacity; u.uSpeed.value = this.speed; u.uFocus.value = this.focus;
    u.uAperture.value = this.aperture; u.uTwinkle.value = this.twinkle; u.uAmbient.value = this.ambient;
    u.uBeamS.value = this.beamStrength; u.uBeamR.value = this.beamRadius; u.uSize.value = this.size;
    this.visible = this.opacity > 0.001;
    return this;
  }
}

// ---------------------------------------------------------------------------------------- Fever
const FEVER_VERT = /* glsl */`
attribute vec4 aRnd;     // phase, radius, angle, speed jitter
attribute vec2 aCorner;
uniform vec3 uPts[8];
uniform float uTime, uSpeed, uRadius, uPulse, uTrail, uWidth, uSwirl, uFocal;
uniform vec2 uRes;
varying vec2 vUv;
varying float vA;
vec3 curve(float s) {
  float f = s * 7.0;
  int i = int(clamp(floor(f), 0.0, 6.0));
  float u = f - float(i);
  vec3 p0 = uPts[max(i - 1, 0)], p1 = uPts[i], p2 = uPts[min(i + 1, 7)], p3 = uPts[min(i + 2, 7)];
  float u2 = u * u, u3 = u2 * u;
  return 0.5 * (2.0 * p1 + (-p0 + p2) * u + (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * u2 + (-p0 + 3.0 * p1 - 3.0 * p2 + p3) * u3);
}
vec3 pos(float s, float t) {
  vec3 c = curve(s);
  vec3 tng = normalize(curve(min(s + 0.01, 1.0)) - curve(max(s - 0.01, 0.0)));
  vec3 n1 = normalize(cross(tng, vec3(0.0, 0.0, 1.0)) + 1e-4);
  vec3 n2 = cross(tng, n1);
  float a = aRnd.z * 6.2831 + t * uSwirl * (0.6 + aRnd.w);
  float rr = uRadius * aRnd.y * (0.6 + 0.4 * sin(s * 3.14159));
  return c + (n1 * cos(a) + n2 * sin(a)) * rr;
}
void main() {
  float sp = uSpeed * (0.7 + 0.6 * aRnd.w);
  float s = fract(aRnd.x + uTime * sp);
  vec3 p = pos(s, uTime);
  vec3 q = pos(max(s - 0.012 * (1.0 + uTrail * 4.0), 0.0), uTime - 0.03);
  vec4 cp = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  vec4 cq = projectionMatrix * modelViewMatrix * vec4(q, 1.0);
  vec2 sp2 = cp.xy / cp.w * 0.5 * uRes, sq = cq.xy / cq.w * 0.5 * uRes;
  vec2 d = sp2 - sq; float len = length(d); vec2 dir = len > 1e-3 ? d / len : vec2(1.0, 0.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  float w = max(1.2, uWidth * uFocal * (1.0 + uPulse * 0.8) * (0.6 + aRnd.y * 0.6) / cp.w);
  float L = max(len, w);
  vec2 off = dir * (aCorner.x * 0.5 + 0.5) * L * -1.0 + nrm * aCorner.y * w;
  vec2 scr = sp2 + off + dir * w * 0.5;
  gl_Position = vec4(scr / (0.5 * uRes) * cp.w, cp.z, cp.w);
  vUv = vec2(aCorner.x * 0.5 + 0.5, aCorner.y);
  float edge = smoothstep(0.0, 0.08, s) * smoothstep(1.0, 0.9, s);
  vA = edge * (0.55 + 0.45 * aRnd.y) * (1.0 + uPulse * 1.5);
}`;
const FEVER_FRAG = /* glsl */`
uniform vec3 uColor, uHot; uniform float uOpacity, uBright;
varying vec2 vUv; varying float vA;
void main() {
  float across = 1.0 - abs(vUv.y);
  float a = pow(across, 2.0) * mix(1.0, vUv.x, 0.85) * vA;
  vec3 c = mix(uColor, uHot, pow(across, 6.0) * 0.6);
  gl_FragColor = vec4(c * a * uOpacity * uBright, 1.0);
}`;

export class FeverStream extends THREE.Mesh {
  /** points: up to 8 control points [[x,y,z],...] of the flow path (local) */
  constructor(ctx, { count = 2400, points = null, seed = 'fever', radius = 0.18, color = C.FEVER } = {}) {
    const R = rng(seed);
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 3));
    geo.setAttribute('aCorner', new THREE.Float32BufferAttribute([-1, -1, 1, -1, 1, 1, -1, 1], 2));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    const rnd = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) rnd.set([R.next(), Math.sqrt(R.next()), R.next(), R.next()], i * 4);
    geo.setAttribute('aRnd', new THREE.InstancedBufferAttribute(rnd, 4));
    geo.instanceCount = count;
    const pts = (points || [[-2, 0, 0], [-1.4, 0.3, 0.2], [-0.8, 0.1, 0.3], [-0.2, -0.2, 0.2], [0.4, 0.1, 0], [1.0, 0.3, -0.1], [1.6, 0.1, -0.1], [2.2, 0, 0]]).map((p) => new THREE.Vector3(...p));
    while (pts.length < 8) pts.push(pts[pts.length - 1].clone());
    const mat = new THREE.ShaderMaterial({
      vertexShader: FEVER_VERT, fragmentShader: FEVER_FRAG,
      uniforms: {
        uPts: { value: pts }, uTime: { value: 0 }, uSpeed: { value: 0.12 }, uRadius: { value: radius }, uPulse: { value: 0 },
        uTrail: { value: 0 }, uWidth: { value: 0.012 }, uSwirl: { value: 0.8 }, uRes: { value: new THREE.Vector2(ctx.W, ctx.H) },
        uFocal: { value: ctx.H * 0.5 / Math.tan(16 * Math.PI / 180) },
        uColor: { value: col(color) }, uHot: { value: col('#FFD0DC') }, uOpacity: { value: 1 }, uBright: { value: 1 },
      },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    super(expandInstanced(geo), mat);
    this.frustumCulled = false;
    Object.assign(this, { opacity: 1, speed: 0.12, pulse: 0, trail: 0, width: 0.012, swirl: 0.8, brightness: 1, radius });
    this.ctx = ctx;
    this.color = mat.uniforms.uColor.value;
    this.points = pts;
  }
  setPoints(points) { points.forEach((p, i) => { if (i < 8) this.points[i].set(...p); }); for (let i = points.length; i < 8; i++) this.points[i].copy(this.points[points.length - 1]); return this; }
  setResolution(W, H) { this.material.uniforms.uRes.value.set(W, H); }
  /** match streak width to a camera (fov) and viewport height */
  setCamera(cam, viewHeight) { this.material.uniforms.uFocal.value = (viewHeight || this.ctx.H) * 0.5 / Math.tan(cam.fov * Math.PI / 360); return this; }
  update(t, states = {}) {
    Object.assign(this, states);
    const u = this.material.uniforms;
    u.uTime.value = t; u.uSpeed.value = this.speed; u.uPulse.value = this.pulse; u.uTrail.value = this.trail;
    u.uWidth.value = this.width; u.uSwirl.value = this.swirl; u.uOpacity.value = this.opacity; u.uBright.value = this.brightness;
    u.uRadius.value = this.radius;
    this.visible = this.opacity > 0.001;
    return this;
  }
}

// ------------------------------------------------------------------------ word atlas helper
function wordAtlas(words, { role = 'ai', size = 64, color = '#ffffff', pad = 18, card = null, cell = null } = {}) {
  const c0 = document.createElement('canvas').getContext('2d');
  c0.font = cssFont(role, size);
  const cellW = cell ? cell[0] : Math.ceil(Math.max(...words.map((w) => c0.measureText(w).width)) + pad * 2);
  const cellH = cell ? cell[1] : Math.ceil(size * 1.6);
  const cols = Math.max(1, Math.floor(2048 / cellW)), rows = Math.ceil(words.length / cols);
  const cv = document.createElement('canvas');
  cv.width = cols * cellW; cv.height = rows * cellH;
  const c = cv.getContext('2d');
  const rects = [];
  words.forEach((w, i) => {
    const x = (i % cols) * cellW, y = Math.floor(i / cols) * cellH;
    c.font = cssFont(role, size);
    const tw = c.measureText(w).width;
    if (card) card(c, x, y, cellW, cellH, w, i);
    else { c.fillStyle = color; c.fillText(w, x + (cellW - tw) / 2, y + cellH * 0.66); }
    rects.push([x / cv.width, 1 - (y + cellH) / cv.height, (x + cellW) / cv.width, 1 - y / cv.height, (tw + pad * 2) / cellW]);
  });
  return { canvas: cv, rects, aspect: cellW / cellH, texture: canvasTexture(cv) };
}

const QUAD_VERT = /* glsl */`
attribute vec4 aUV;        // atlas rect
attribute vec3 aP;         // position
attribute vec4 aQ;         // quaternion
attribute vec2 aS;         // scale (w, h)
attribute float aA;        // alpha
varying vec2 vUv; varying float vA;
vec3 qrot(vec4 q, vec3 v) { return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v); }
void main() {
  vec3 p = aP + qrot(aQ, vec3(position.xy * aS, 0.0));
  vUv = vec2(mix(aUV.x, aUV.z, position.x + 0.5), mix(aUV.y, aUV.w, position.y + 0.5));
  vA = aA;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;
const QUAD_FRAG = /* glsl */`
uniform sampler2D uMap; uniform vec3 uColor; uniform float uOpacity, uBright;
varying vec2 vUv; varying float vA;
void main() {
  vec4 t = texture2D(uMap, vUv);
  float a = t.a * vA * uOpacity;
  if (a < 0.003) discard;
  gl_FragColor = vec4(t.rgb * uColor * vA * uOpacity * uBright, a);
}`;

class AtlasQuads extends THREE.Mesh {
  // n quads in one plain (non-instanced) geometry; per-quad attributes are written to its 4 vertices
  constructor(n, texture, { additive = true } = {}) {
    const geo = new THREE.BufferGeometry();
    const corner = new Float32Array(n * 12);
    const base = [-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0];
    for (let i = 0; i < n; i++) corner.set(base, i * 12);
    geo.setAttribute('position', new THREE.BufferAttribute(corner, 3));
    const idx = new (n * 4 > 65535 ? Uint32Array : Uint16Array)(n * 6);
    for (let i = 0; i < n; i++) idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3], i * 6);
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    const mk = (k) => new THREE.BufferAttribute(new Float32Array(n * 4 * k), k);
    geo.setAttribute('aUV', mk(4)); geo.setAttribute('aP', mk(3)); geo.setAttribute('aQ', mk(4)); geo.setAttribute('aS', mk(2)); geo.setAttribute('aA', mk(1));
    const mat = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT, fragmentShader: QUAD_FRAG,
      uniforms: { uMap: { value: texture }, uColor: { value: new THREE.Color(1, 1, 1) }, uOpacity: { value: 1 }, uBright: { value: 1 } },
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: additive ? THREE.OneFactor : THREE.OneMinusSrcAlphaFactor,
    });
    super(geo, mat);
    this.frustumCulled = false;
    this.n = n;
    this._P = new Float32Array(n * 3); this._Q = new Float32Array(n * 4); this._S = new Float32Array(n * 2);
    this._U = new Float32Array(n * 4); this._A = new Float32Array(n);
  }
  attr(name) { return { array: { aP: this._P, aQ: this._Q, aS: this._S, aUV: this._U, aA: this._A }[name] }; }
  commit() {
    const spread = (name, src, k) => {
      const dst = this.geometry.getAttribute(name).array;
      for (let i = 0; i < this.n; i++) {
        const o = i * k;
        for (let v = 0; v < 4; v++) { const d = (i * 4 + v) * k; for (let c = 0; c < k; c++) dst[d + c] = src[o + c]; }
      }
      this.geometry.getAttribute(name).needsUpdate = true;
    };
    spread('aP', this._P, 3); spread('aQ', this._Q, 4); spread('aS', this._S, 2); spread('aUV', this._U, 4); spread('aA', this._A, 1);
  }
}

const _q = new THREE.Quaternion(), _e = new THREE.Euler();

// ---------------------------------------------------------------------------------------- Confetti
export class TokenConfetti extends AtlasQuads {
  /**
   * words: tokens to print; bursts: [{ t, count, origin:[x,y,z], spread, up }]; gravity; life (s)
   * States: opacity, brightness, color, gravity, drag, flutter, size (world height of a token)
   */
  constructor(ctx, { words = ['YES', 'I LOVE YOU', 'ONLY YOU', '♥'], bursts = [], max = 600, seed = 'confetti', role = 'ai', color = C.GOLD, size = 0.12, life = 4.5 } = {}) {
    const atlas = wordAtlas(words, { role, size: 72, color: '#ffffff' });
    super(max, atlas.texture);
    this.atlas = atlas;
    this.R = rng(seed);
    this.particles = [];
    for (const b of bursts) {
      for (let i = 0; i < (b.count || 80) && this.particles.length < max; i++) {
        const R = this.R;
        const dir = [R.range(-1, 1) * (b.spread ?? 1.2), R.range(0.6, 1.4) * (b.up ?? 2.2), R.range(-1, 1) * (b.spread ?? 1.2) * 0.6];
        this.particles.push({ t0: b.t + R.range(0, b.stagger ?? 0.15), o: b.origin || [0, 0, 0], v: dir, w: R.int(words.length), ax: new THREE.Vector3(...R.onSphere()), spin: R.range(2, 7), ph: R.range(0, 6.28), s: R.range(0.7, 1.3) });
      }
    }
    this.material.uniforms.uColor.value = col(color);
    Object.assign(this, { opacity: 1, brightness: 1, gravity: -2.2, drag: 1.4, flutter: 1, size, life });
    this.color = this.material.uniforms.uColor.value;
  }
  update(t, states = {}) {
    Object.assign(this, states);
    const P = this.attr('aP').array, Q = this.attr('aQ').array, S = this.attr('aS').array, U = this.attr('aUV').array, A = this.attr('aA').array;
    const k = this.drag;
    this.particles.forEach((p, i) => {
      const tau = t - p.t0;
      if (tau < 0 || tau > this.life) { A[i] = 0; S[i * 2] = S[i * 2 + 1] = 0; return; }
      const e = (1 - Math.exp(-k * tau)) / k;           // drag-damped displacement
      const fall = this.gravity * (tau - e) / k;         // terminal-velocity fall
      const fl = Math.sin(tau * p.spin + p.ph) * 0.15 * this.flutter;
      P[i * 3] = p.o[0] + p.v[0] * e + fl; P[i * 3 + 1] = p.o[1] + p.v[1] * e + fall; P[i * 3 + 2] = p.o[2] + p.v[2] * e;
      _q.setFromAxisAngle(p.ax, tau * p.spin * 0.6 + p.ph);
      Q.set([_q.x, _q.y, _q.z, _q.w], i * 4);
      const r = this.atlas.rects[p.w];
      const h = this.size * p.s;
      S[i * 2] = h * this.atlas.aspect * r[4]; S[i * 2 + 1] = h;
      const cw = (r[2] - r[0]) * r[4], cx = (r[0] + r[2]) / 2;
      U.set([cx - cw / 2, r[1], cx + cw / 2, r[3]], i * 4);
      A[i] = Math.min(1, tau / 0.1) * Math.min(1, (this.life - tau) / 0.8);
    });
    for (let i = this.particles.length; i < this.n; i++) A[i] = 0;
    this.commit();
    this.material.uniforms.uOpacity.value = this.opacity;
    this.material.uniforms.uBright.value = this.brightness;
    this.visible = this.opacity > 0.001;
    return this;
  }
}

// ---------------------------------------------------------------------------------------- Snow
const NOTES = ['MOM  ☎|incoming call', 'Phone|3 missed calls', 'Jess|are you coming?', 'Group chat|24 new messages', 'Messages|Seen 3h ago',
  'Dad|call me back', 'Reminder|drink water', 'Jess|we miss you', 'Mom|are you eating?', 'Photos|party pics (48)', 'Voicemail|0:42', 'Sam|??'];

export class NotificationSnow extends AtlasQuads {
  /**
   * Cards spawn at `rate` per second from t0, fall from `top` with sway and settle on the floor
   * (y = floor) inside `area` [x0,z0,x1,z1], piling up. States: opacity, brightness, rate, speed.
   */
  constructor(ctx, { max = 700, t0 = 0, rate = 12, top = 3.2, floor = 0, area = [-3, -2.5, 3, 2.5], seed = 'snow', size = 0.22, speed = 0.55 } = {}) {
    const atlas = wordAtlas(NOTES, {
      role: 'ui', size: 30, pad: 22, cell: [384, 116],
      card: (c, x, y, w, h, word) => {
        const [title, body] = word.split('|');
        c.fillStyle = 'rgba(38,42,50,0.9)';
        c.beginPath(); c.roundRect(x + 4, y + 4, w - 8, h - 8, 18); c.fill();
        c.strokeStyle = 'rgba(150,160,175,0.45)'; c.lineWidth = 2; c.stroke();
        c.fillStyle = 'rgba(107,114,128,0.9)'; c.beginPath(); c.roundRect(x + 20, y + 26, 34, 34, 9); c.fill();
        c.font = cssFont('ui', 25, { weight: 600 }); c.fillStyle = 'rgba(214,218,226,0.95)';
        c.fillText(title, x + 68, y + 48);
        c.font = cssFont('ui', 23, { weight: 400 }); c.fillStyle = 'rgba(160,166,178,0.9)';
        c.fillText(body, x + 68, y + 84);
        c.font = cssFont('ui', 18, { weight: 400 }); c.fillStyle = 'rgba(120,126,138,0.9)';
        c.fillText('now', x + w - 58, y + 48);
      },
    });
    super(max, atlas.texture, { additive: false });
    this.atlas = atlas;
    const R = rng(seed);
    this.cards = [];
    for (let i = 0; i < max; i++) {
      this.cards.push({ t0: t0 + i / rate + R.range(-0.3, 0.3) / rate, x: R.range(area[0], area[2]), z: R.range(area[1], area[3]),
        w: R.int(NOTES.length), ph: R.range(0, 6.28), sway: R.range(0.1, 0.3), yaw: R.range(-3.14, 3.14), pile: R.next(), s: R.range(0.8, 1.15) });
    }
    Object.assign(this, { opacity: 1, brightness: 1, top, floor, size, speed });
  }
  update(t, states = {}) {
    Object.assign(this, states);
    const P = this.attr('aP').array, Q = this.attr('aQ').array, S = this.attr('aS').array, U = this.attr('aUV').array, A = this.attr('aA').array;
    let landed = 0;
    this.cards.forEach((c, i) => {
      const tau = t - c.t0;
      if (tau < 0) { A[i] = 0; S[i * 2] = S[i * 2 + 1] = 0; return; }
      const rest = this.floor + 0.004 + c.pile * Math.min(0.08, landed * 0.0004);
      const T = (this.top - rest) / this.speed;
      let x = c.x, y, z = c.z;
      if (tau < T) {
        y = this.top - this.speed * tau;
        x += Math.sin(tau * 1.3 + c.ph) * c.sway; z += Math.cos(tau * 1.1 + c.ph) * c.sway * 0.5;
        _q.setFromEuler(_e.set(-Math.PI / 2 + Math.sin(tau * 2.1 + c.ph) * 0.9, c.yaw + tau * 0.4, Math.sin(tau * 1.7 + c.ph) * 0.6));
      } else {
        landed++;
        y = rest;
        x += Math.sin(T * 1.3 + c.ph) * c.sway; z += Math.cos(T * 1.1 + c.ph) * c.sway * 0.5;
        _q.setFromEuler(_e.set(-Math.PI / 2, c.yaw + T * 0.4, 0));
      }
      P.set([x, y, z], i * 3);
      Q.set([_q.x, _q.y, _q.z, _q.w], i * 4);
      const r = this.atlas.rects[c.w];
      S[i * 2] = this.size * this.atlas.aspect * c.s; S[i * 2 + 1] = this.size * c.s;
      U.set([r[0], r[1], r[0] + (r[2] - r[0]), r[3]], i * 4);
      A[i] = Math.min(1, tau / 0.3);
    });
    this.commit();
    this.material.uniforms.uOpacity.value = this.opacity;
    this.material.uniforms.uBright.value = this.brightness;
    this.visible = this.opacity > 0.001;
    return this;
  }
}

// GlassSlab — a thin rounded glass slab with real thickness, for chat bubbles, input fields, panels
// and the typing-indicator pill: per-corner radii (matches canvas roundRect radii), bevelled front
// and back edges, a smoked body, Fresnel edge highlights, edge-lit thickness (the side walls glow in
// the tint color like edge-lit acrylic), a soft studio reflection that slides across the bevels as
// the camera moves, and refraction-like inner shading on the face (edge caustic + inner glow).
//
// The topology is built once; size, radii, bevel and thickness are uniforms, so resizing every frame
// (streaming text, pop-in scale) costs nothing and stays deterministic.
//
//   const slab = new GlassSlab(ctx, { color: C.AI_CYAN });
//   group.add(slab);                                     // front face at local z = 0, extends to -thickness
//   slab.update(t, { width: 1.2, height: 0.3, radius: [0.06, 0.06, 0.06, 0.015], thickness: 0.025 });
//
// States (per frame; defaults reapplied every update): width, height, radius (number or
//   [tl, tr, br, bl]), thickness, bevel (edge roundness, clamped to the smallest radius), opacity,
//   brightness, edge (edge-light strength), body (smoked-glass darkening 0..1), sheen (studio
//   reflection strength), clip ([bottom, top] in local y: fragments outside are cut, e.g. scrolled
//   messages), color (css or token; tint of edges/caustics).
import * as THREE from 'three';
import { col } from '../core/palette.js';

const VERT = /* glsl */`
attribute vec3 aCorner;   // corner index (0 tl, 1 tr, 2 br, 3 bl), cos(theta), sin(theta)
attribute vec4 aProf;     // sin(phi), cos(phi), side (0 front, 1 back), isFaceCenter
uniform vec2 uHalf;
uniform vec4 uRad;
uniform float uBevel, uThick;
varying vec3 vN;          // view-space normal
varying vec3 vNl;         // local normal
varying vec3 vP;          // view-space position
varying vec2 vXY;         // local xy
void main() {
  int ci = int(aCorner.x + 0.5);
  float r = ci == 0 ? uRad.x : (ci == 1 ? uRad.y : (ci == 2 ? uRad.z : uRad.w));
  vec2 sg = ci == 0 ? vec2(-1.0, 1.0) : (ci == 1 ? vec2(1.0, 1.0) : (ci == 2 ? vec2(1.0, -1.0) : vec2(-1.0, -1.0)));
  float b = uBevel;
  vec3 p, n;
  if (aProf.w > 0.5) {
    p = vec3(0.0, 0.0, aProf.z < 0.5 ? 0.0 : -uThick);
    n = vec3(0.0, 0.0, aProf.z < 0.5 ? 1.0 : -1.0);
  } else {
    vec2 dir = aCorner.yz;
    vec2 cc = sg * (uHalf - vec2(r));
    float R = r - b + b * aProf.x;
    float z = aProf.z < 0.5 ? (-b + b * aProf.y) : (-uThick + b - b * aProf.y);
    p = vec3(cc + dir * R, z);
    n = vec3(dir * aProf.x, aProf.z < 0.5 ? aProf.y : -aProf.y);
  }
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vP = mv.xyz;
  vN = normalize(normalMatrix * n);
  vNl = n;
  vXY = p.xy;
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */`
precision highp float;
uniform vec2 uHalf;
uniform vec4 uRad;
uniform vec2 uClip;
uniform vec3 uColor;
uniform float uBevel, uOpacity, uBright, uEdge, uBody, uSheen;
varying vec3 vN, vNl, vP;
varying vec2 vXY;
float sdRound(vec2 p, vec2 h, vec4 rad) {
  float r = p.x > 0.0 ? (p.y > 0.0 ? rad.y : rad.z) : (p.y > 0.0 ? rad.x : rad.w);
  vec2 q = abs(p) - h + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}
void main() {
  if (vXY.y < uClip.x || vXY.y > uClip.y) discard;
  vec3 N = normalize(vN);
  vec3 V = normalize(-vP);
  float ndv = clamp(abs(dot(N, V)), 0.0, 1.0);
  float fres = pow(1.0 - ndv, 4.0);
  float face = smoothstep(0.86, 0.995, abs(vNl.z));
  float side = 1.0 - abs(vNl.z);
  float minH = min(uHalf.x, uHalf.y);
  // distance inside the flat face (0 at the face edge where the bevel starts)
  float d = max(-(sdRound(vXY, uHalf, uRad) + uBevel), 0.0);
  float inner = exp(-d / (4.0 * uBevel + 0.08 * minH + 1e-5));
  float caustic = exp(-d / (0.6 * uBevel + 1e-5));
  // refraction-like body shading: brighter toward the top-left, as if the backlight bends through
  float grad = clamp(0.5 + 0.35 * vXY.y / max(uHalf.y, 1e-5) - 0.15 * vXY.x / max(uHalf.x, 1e-5), 0.0, 1.0);
  vec3 c = uColor * (0.003 + 0.010 * grad) * face;
  c += uColor * (inner * 0.06 + caustic * 0.28) * face;
  // edges: Fresnel + edge-lit thickness
  c += uColor * (fres * 0.9 + side * side * 0.75) * uEdge;
  // studio softbox above-left: slides across the bevels as the view changes
  vec3 Rf = reflect(-V, N);
  float soft = smoothstep(0.3, 0.75, Rf.y) * smoothstep(0.95, 0.35, abs(Rf.x + 0.25));
  float spec = pow(max(dot(Rf, normalize(vec3(-0.45, 0.75, 0.5))), 0.0), 40.0);
  c += vec3(0.9, 0.96, 1.0) * (soft * mix(0.3, 0.012, face) + spec * mix(0.8, 0.05, face)) * uSheen;
  float a = uBody * mix(0.75 + 0.25 * fres, 1.0, side);
  c *= uBright;
  gl_FragColor = vec4(c * uOpacity, clamp(a, 0.0, 1.0) * uOpacity);
}`;

const GEO_CACHE = new Map();
/** shared topology: 4 corner arcs x (front bevel rings + back bevel rings) + two face centers */
function slabGeometry(nArc = 6, nBevel = 4) {
  const key = `${nArc}|${nBevel}`;
  if (GEO_CACHE.has(key)) return GEO_CACHE.get(key);
  const seq = [[1, 0], [0, Math.PI / 2], [3, Math.PI], [2, Math.PI * 1.5]];   // CCW from the right side
  const outline = [];
  for (const [ci, th0] of seq) for (let j = 0; j <= nArc; j++) { const th = th0 + (j / nArc) * Math.PI / 2; outline.push([ci, Math.cos(th), Math.sin(th)]); }
  const P = outline.length;
  const rings = [];
  for (let k = 0; k <= nBevel; k++) rings.push([(k / nBevel) * Math.PI / 2, 0]);
  for (let k = 0; k <= nBevel; k++) rings.push([((nBevel - k) / nBevel) * Math.PI / 2, 1]);
  const corner = [0, 1, 0, 0, 1, 0], prof = [0, 1, 0, 1, 0, 1, 1, 1];   // two face centers
  for (const [phi, sd] of rings) for (const [ci, c, s] of outline) { corner.push(ci, c, s); prof.push(Math.sin(phi), Math.cos(phi), sd, 0); }
  const v = (r, i) => 2 + r * P + (i % P);
  const idx = [];
  for (let i = 0; i < P; i++) idx.push(0, v(0, i), v(0, i + 1));
  for (let r = 0; r + 1 < rings.length; r++) for (let i = 0; i < P; i++) idx.push(v(r, i), v(r + 1, i), v(r + 1, i + 1), v(r, i), v(r + 1, i + 1), v(r, i + 1));
  const L = rings.length - 1;
  for (let i = 0; i < P; i++) idx.push(1, v(L, i + 1), v(L, i));
  const geo = new THREE.BufferGeometry();
  const n = corner.length / 3;
  geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
  geo.setAttribute('aCorner', new THREE.Float32BufferAttribute(corner, 3));
  geo.setAttribute('aProf', new THREE.Float32BufferAttribute(prof, 4));
  geo.setIndex(idx);
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
  GEO_CACHE.set(key, geo);
  return geo;
}

const SLAB_STATE = Object.freeze({
  width: 1, height: 0.3, radius: 0.06, thickness: 0.03, bevel: 0.012, opacity: 1, brightness: 1,
  edge: 1, body: 0.5, sheen: 1, clip: null, color: null,
});

export class GlassSlab extends THREE.Mesh {
  constructor(ctx, { color = 'AI_CYAN', segments = 6 } = {}) {
    const material = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG,
      uniforms: {
        uHalf: { value: new THREE.Vector2(0.5, 0.15) }, uRad: { value: new THREE.Vector4() },
        uBevel: { value: 0.01 }, uThick: { value: 0.03 }, uClip: { value: new THREE.Vector2(-1e9, 1e9) },
        uColor: { value: col(color) }, uOpacity: { value: 1 }, uBright: { value: 1 }, uEdge: { value: 1 },
        uBody: { value: 0.5 }, uSheen: { value: 1 },
      },
      transparent: true, depthWrite: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    super(slabGeometry(segments, 4), material);
    this.ctx = ctx;
    this.frustumCulled = false;
    this.baseColor = col(color);
    Object.assign(this, SLAB_STATE);
  }

  update(t, states = {}) {
    Object.assign(this, SLAB_STATE, states);
    const u = this.material.uniforms;
    const w = Math.max(this.width, 1e-4), h = Math.max(this.height, 1e-4);
    const rr = Array.isArray(this.radius) ? this.radius : [this.radius, this.radius, this.radius, this.radius];
    const rmax = Math.min(w, h) / 2;
    const r4 = rr.map((r) => Math.min(Math.max(r, 1e-5), rmax));
    const bevel = Math.min(this.bevel, Math.min(...r4) * 0.98, this.thickness * 0.5);
    for (let i = 0; i < 4; i++) r4[i] = Math.max(r4[i], bevel + 1e-5);
    u.uHalf.value.set(w / 2, h / 2);
    u.uRad.value.set(r4[0], r4[1], r4[2], r4[3]);
    u.uBevel.value = bevel;
    u.uThick.value = Math.max(this.thickness, bevel * 2);
    u.uClip.value.set(this.clip ? this.clip[0] : -1e9, this.clip ? this.clip[1] : 1e9);
    if (this.color) u.uColor.value.copy(typeof this.color === 'string' ? col(this.color) : this.color);
    else u.uColor.value.copy(this.baseColor);
    u.uOpacity.value = this.opacity;
    u.uBright.value = this.brightness;
    u.uEdge.value = this.edge;
    u.uBody.value = this.body;
    u.uSheen.value = this.sheen;
    this.visible = this.opacity > 0.001;
    return this;
  }
}

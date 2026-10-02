// GlowLines: antialiased, screen-space-width line segments with a soft glow falloff
// (instanced quads, additive). The look of the "architect's light drawing" (Room, HUD, ECG).
//
//   const lines = new GlowLines({ width: 1.6, glow: 7, color: C.AI_CYAN });
//   lines.setSegments([[x0,y0,z0, x1,y1,z1], ...], { colors: [[r,g,b],...], alphas: [...] });
//   lines.brightness = 0.35;     // overall multiplier (HDR ok)
//   lines.setLight(pos, radius, gain)  // brighten segments near a point (screen glow)
//   lines.reveal = 0..1          // draw-on animation along segment order
import * as THREE from 'three';
import { col } from '../core/palette.js';
import { expandInstanced } from '../core/geom.js';

const VERT = /* glsl */`
attribute vec3 aStart;
attribute vec3 aEnd;
attribute vec4 aColor;    // rgb + alpha
attribute float aOrder;   // 0..1 order for reveal
uniform vec2 uRes;
uniform float uWidth, uGlow;
uniform float uReveal;
uniform vec3 uLightPos; uniform float uLightRadius, uLightGain;
uniform float uGrey;
varying vec2 vCoord;      // x: along (px from start), y: across (px)
varying float vLen;
varying vec4 vColor;
varying float vHalf;

vec4 clipNear(vec4 a, vec4 b) {
  // move a toward b until it is in front of the near plane (w > eps)
  float eps = 1e-3;
  if (a.w >= eps) return a;
  float t = (eps - a.w) / (b.w - a.w);
  return mix(a, b, t);
}

void main() {
  vec4 ca = projectionMatrix * modelViewMatrix * vec4(aStart, 1.0);
  vec4 cb = projectionMatrix * modelViewMatrix * vec4(aEnd, 1.0);
  float visible = 1.0;
  if (ca.w < 1e-3 && cb.w < 1e-3) visible = 0.0;
  vec4 a = clipNear(ca, cb);
  vec4 b = clipNear(cb, ca);
  vec2 sa = (a.xy / a.w) * 0.5 * uRes;
  vec2 sb = (b.xy / b.w) * 0.5 * uRes;
  vec2 d = sb - sa;
  float len = length(d);
  vec2 dir = len > 1e-4 ? d / len : vec2(1.0, 0.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  float hw = uWidth * 0.5 + uGlow * 2.2;
  float endSel = position.x;          // 0 = start, 1 = end
  float side = position.y;            // -1 / 1
  vec2 sp = mix(sa, sb, endSel) + nrm * side * hw + dir * (endSel * 2.0 - 1.0) * hw;
  vec4 cp = mix(a, b, endSel);
  gl_Position = vec4(sp / (0.5 * uRes) * cp.w, cp.z, cp.w);
  vCoord = vec2(endSel * (len + 2.0 * hw) - hw, side * hw);
  vLen = len;
  vHalf = hw;
  vec3 wp = (modelMatrix * vec4(mix(aStart, aEnd, 0.5), 1.0)).xyz;
  float lg = uLightRadius > 0.0 ? uLightGain * exp(-pow(distance(wp, uLightPos) / uLightRadius, 2.0)) : 0.0;
  vec3 c = aColor.rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(c, vec3(l), uGrey);
  float rev = smoothstep(aOrder, aOrder + 0.04, uReveal);
  vColor = vec4(c * (1.0 + lg), aColor.a * rev * visible);
}`;

const FRAG = /* glsl */`
uniform float uWidth, uGlow, uBrightness, uOpacity;
varying vec2 vCoord;
varying float vLen;
varying vec4 vColor;
varying float vHalf;
void main() {
  // distance to the segment (capsule) in px
  float x = clamp(vCoord.x, 0.0, vLen);
  float dist = length(vec2(vCoord.x - x, vCoord.y));
  float core = 1.0 - smoothstep(uWidth * 0.5 - 0.6, uWidth * 0.5 + 0.6, dist);
  float glow = exp(-(dist * dist) / (uGlow * uGlow + 1e-4)) * 0.35;
  float a = (core + glow) * vColor.a * uOpacity;
  if (a < 0.002) discard;
  gl_FragColor = vec4(vColor.rgb * a * uBrightness, 1.0);
}`;

export class GlowLines extends THREE.Mesh {
  constructor({ width = 1.6, glow = 6, color = '#7FE9FF', brightness = 1, opacity = 1, W = 1920, H = 1080 } = {}) {
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0], 3));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG,
      uniforms: {
        uRes: { value: new THREE.Vector2(W, H) }, uWidth: { value: width }, uGlow: { value: glow },
        uBrightness: { value: brightness }, uOpacity: { value: opacity }, uReveal: { value: 1 },
        uLightPos: { value: new THREE.Vector3() }, uLightRadius: { value: 0 }, uLightGain: { value: 0 },
        uGrey: { value: 0 },
      },
      transparent: true, depthWrite: false, depthTest: true, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    super(geo, mat);
    this.frustumCulled = false;
    this.baseColor = col(color);
    this.count = 0;
  }
  /** segs: array of [x0,y0,z0,x1,y1,z1] (or flat Float32Array of 6*n). opts.colors / opts.alphas per segment */
  setSegments(segs, { colors = null, alphas = null, order = null } = {}) {
    const flat = segs instanceof Float32Array ? segs : Float32Array.from(segs.flat());
    const n = flat.length / 6;
    const s = new Float32Array(n * 3), e = new Float32Array(n * 3), c = new Float32Array(n * 4), o = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      s.set(flat.subarray(i * 6, i * 6 + 3), i * 3);
      e.set(flat.subarray(i * 6 + 3, i * 6 + 6), i * 3);
      const cc = colors ? colors[i] : null;
      const rgb = cc ? (cc.isColor ? [cc.r, cc.g, cc.b] : cc) : [this.baseColor.r, this.baseColor.g, this.baseColor.b];
      c.set([rgb[0], rgb[1], rgb[2], alphas ? alphas[i] : 1], i * 4);
      o[i] = order ? order[i] : i / Math.max(1, n);
    }
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0], 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    g.setAttribute('aStart', new THREE.InstancedBufferAttribute(s, 3));
    g.setAttribute('aEnd', new THREE.InstancedBufferAttribute(e, 3));
    g.setAttribute('aColor', new THREE.InstancedBufferAttribute(c, 4));
    g.setAttribute('aOrder', new THREE.InstancedBufferAttribute(o, 1));
    g.instanceCount = n;
    this.geometry.dispose();
    // plain (non-instanced) batched geometry: SwiftShader processes it far more efficiently
    this.geometry = expandInstanced(g);
    this.count = n;
    return this;
  }
  setResolution(W, H) { this.material.uniforms.uRes.value.set(W, H); }
  setLight(pos, radius, gain) {
    const u = this.material.uniforms;
    u.uLightPos.value.copy(pos); u.uLightRadius.value = radius; u.uLightGain.value = gain;
  }
  get brightness() { return this.material.uniforms.uBrightness.value; }
  set brightness(v) { this.material.uniforms.uBrightness.value = v; }
  get opacity() { return this.material.uniforms.uOpacity.value; }
  set opacity(v) { this.material.uniforms.uOpacity.value = v; this.visible = v > 0.001; }
  get reveal() { return this.material.uniforms.uReveal.value; }
  set reveal(v) { this.material.uniforms.uReveal.value = v; }
  get grey() { return this.material.uniforms.uGrey.value; }
  set grey(v) { this.material.uniforms.uGrey.value = v; }
  set width(v) { this.material.uniforms.uWidth.value = v; }
  set glow(v) { this.material.uniforms.uGlow.value = v; }
}

/** helpers to build segment lists */
export const Seg = {
  box(min, max) { // 12 edges of an axis-aligned box
    const [x0, y0, z0] = min, [x1, y1, z1] = max;
    const v = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
    const E = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
    return E.map(([a, b]) => [...v[a], ...v[b]]);
  },
  rect(c, ax, ay, w, h) { // rectangle centered c, spanned by unit axes ax, ay
    const p = (sx, sy) => [0, 1, 2].map((k) => c[k] + ax[k] * sx * w / 2 + ay[k] * sy * h / 2);
    const q = [p(-1, -1), p(1, -1), p(1, 1), p(-1, 1)];
    return [[...q[0], ...q[1]], [...q[1], ...q[2]], [...q[2], ...q[3]], [...q[3], ...q[0]]];
  },
  polyline(pts, closed = false) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) out.push([...pts[i], ...pts[i + 1]]);
    if (closed) out.push([...pts[pts.length - 1], ...pts[0]]);
    return out;
  },
  circle(c, ax, ay, r, n = 48, a0 = 0, a1 = Math.PI * 2) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * (i / n);
      pts.push([0, 1, 2].map((k) => c[k] + (ax[k] * Math.cos(a) + ay[k] * Math.sin(a)) * r));
    }
    return Seg.polyline(pts);
  },
  line(a, b) { return [[...a, ...b]]; },
};

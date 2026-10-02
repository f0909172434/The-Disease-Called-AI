// Silhouette — her: ~110k points forming an elegant female profile / half-bust.
// Warm amber/skin core, cyan rim light from the screen side (+x), long hair behind.
//
//   const her = new Silhouette(ctx, { seed: 'her' });
//   scene.add(her);                       // THREE.Group; face points to local +x
//   her.update(t, { ...states })          // or set fields then her.update(t)
//
// States (all plain numbers, set every frame from t):
//   warmth (0..1.5)     warm core intensity          innerGlow (0..1)  cyan light filling from inside
//   jitter (0..1)       nervous per-point shake      gridify (0..1)    snap to a 3D grid (AI-ification)
//   dissolve (0..1)     drift away + fade            morph (0..1)      flow to targets set by dissolveTo()
//   colorSwap (0..1)    her palette -> cyan (final chorus)            mouthOpen (0..1)  jaw (vox envelope)
//   eyeClosed (0..1)    lids close                   opacity (0..1)    mirror (bool)     reflection (faces -x)
//   screenLight (0..2)  intensity of the cyan screen light / rim      breathe (0..1)    breathing amount
//   twinkle (0..1)      sparkle on a few points      size (world)      point diameter in local units
//   viewHeight (px)     viewport height if not full-frame (gallery tiles); call setCamera(cam) for fov
//   focus (distance), aperture (0 = off, ~1 = shallow)   depth of field on the points
//   bustFade (local y)  the half-bust dissolves into darkness below this height (default -0.95)
//   hairLines (0..1)    opacity of the fine strand lines (fade out automatically with dissolve/morph/gridify)
//   viewWidth/viewHeight (px) viewport size if not full-frame (gallery tiles)
//   screenPos (Vector3, local)  where the screen light comes from (default in front of her face)
//   rimColor / warmColor / shadowColor (THREE.Color) override palette
// Helpers: dissolveTo(Float32Array targets xyz (local), { order: 'height'|'random' }), eyeWorldPosition()
import * as THREE from 'three';
import { buildSilhouettePoints, EYE } from './silhouetteGeometry.js';
import { col } from '../core/palette.js';
import { expandInstanced } from '../core/geom.js';

const VERT = /* glsl */`
attribute vec4 aData;   // kind, mouthWeight, strandV, lidGap
attribute vec4 aRand;
attribute float aCore;
attribute vec3 aTarget;
uniform float uTime, uPx, uSize, uOpacity;
uniform float uWarmth, uInnerGlow, uJitter, uGridify, uDissolve, uMorph, uColorSwap, uMouth, uEyeClosed;
uniform float uScreen, uBreathe, uTwinkle, uJitterSeed, uRefDist, uFocus, uAperture, uBustFade;
uniform vec3 uScreenPos;      // local space
uniform vec3 uRim, uWarm, uShadow, uHair, uCyan, uDeep, uAmber;
uniform vec3 uEye;            // eye center (local, +z side)
uniform vec2 uHinge;
varying vec3 vColor;
varying float vAlpha;
varying float vSoft;

vec3 hash3(vec3 p) {
  p = fract(p * vec3(443.897, 441.423, 437.195));
  p += dot(p, p.yzx + 19.19);
  return fract((p.xxy + p.yzz) * p.zyx);
}

void main() {
  float kind = aData.x;
  vec3 p = position;
  vec3 n = normal;

  // mouth: rotate jaw points about the hinge (z axis)
  float ma = -uMouth * 0.22 * aData.y;
  if (abs(ma) > 1e-5) {
    vec2 q = p.xy - uHinge;
    float c = cos(ma), s = sin(ma);
    p.xy = uHinge + vec2(c * q.x - s * q.y, s * q.x + c * q.y);
    n.xy = vec2(c * n.x - s * n.y, s * n.x + c * n.y);
  }
  // eyelids: upper lid / lash points rotate down about the eye's lateral axis
  if (kind == 4.0 && aData.w > 0.0 && uEyeClosed > 0.0) {
    vec3 ec = vec3(uEye.x, uEye.y, sign(p.z) * uEye.z);
    vec3 q = p - ec;
    float a = -uEyeClosed * aData.w * 0.92;
    float c = cos(a), s = sin(a);
    q.xy = vec2(c * q.x - s * q.y, s * q.x + c * q.y);
    p = ec + q;
  }
  // hair sway (closed form)
  if (kind == 1.0) {
    float v = aData.z;
    float ph = aData.w * 6.2831;
    p.x += sin(uTime * 0.55 + ph) * 0.012 * v * v;
    p.z += sin(uTime * 0.43 + ph * 1.3) * 0.016 * v * v;
  }
  // breathing: scale about the upper chest
  vec3 bc = vec3(-0.05, -1.05, 0.0);
  p = bc + (p - bc) * (1.0 + uBreathe);

  // nervous jitter: per point, quantized at 30 Hz
  if (uJitter > 0.0) {
    vec3 h = hash3(aRand.xyz * 97.0 + floor(uTime * 30.0) * 0.137 + uJitterSeed) - 0.5;
    p += h * uJitter * 0.05;
  }
  // gridify: snap toward a 3D lattice
  if (uGridify > 0.0) {
    float g = 0.035;
    vec3 snapped = (floor(p / g) + 0.5) * g;
    p = mix(p, snapped, smoothstep(aRand.w * 0.6, aRand.w * 0.6 + 0.4, uGridify));
  }
  // dissolve: drift up & outward with noise, fade
  float fade = 1.0;
  if (uDissolve > 0.0) {
    float k = smoothstep(aRand.w * 0.7, aRand.w * 0.7 + 0.3, uDissolve);
    vec3 h = hash3(aRand.zyx * 31.0) - 0.5;
    p += (vec3(h.x * 0.6, 0.5 + h.y * 0.4, h.z * 0.6)) * k * k * 1.2;
    fade *= 1.0 - k;
  }
  // morph toward targets (hourglass flow: staggered by delay, curved path)
  if (uMorph > 0.0) {
    float k = smoothstep(aRand.w * 0.65, aRand.w * 0.65 + 0.35, uMorph);
    vec3 mid = mix(p, aTarget, 0.5) + vec3(0.0, 0.25, 0.0) * sin(k * 3.14159) + (hash3(aRand.xzy) - 0.5) * 0.3 * sin(k * 3.14159);
    vec3 a1 = mix(p, mid, k), a2 = mix(mid, aTarget, k);
    p = mix(a1, a2, k);
  }

  fade *= smoothstep(uBustFade - 0.4, uBustFade, p.y);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  vec3 N = normalize(normalMatrix * n);
  vec3 V = normalize(-mv.xyz);
  vec3 Ls = normalize((viewMatrix * vec4((modelMatrix * vec4(uScreenPos, 1.0)).xyz, 1.0)).xyz - mv.xyz);
  vec3 Lw = normalize((viewMatrix * vec4(-0.35, 0.6, 0.75, 0.0)).xyz);   // warm key from the upper left (camera side)
  float facing = dot(N, V);
  float sl = max(dot(N, Ls), 0.0);
  float wl = max(dot(N, Lw), 0.0);
  float rim = pow(1.0 - abs(facing), 3.0);

  // palette (colorSwap: her warm -> AI cyan, rim cyan -> amber)
  vec3 warm = mix(uWarm, uCyan, uColorSwap);
  vec3 shadow = mix(uShadow, uDeep, uColorSwap);
  vec3 rimC = mix(uRim, uAmber, uColorSwap);
  vec3 hair = mix(uHair, uDeep * 0.6, uColorSwap);
  // rim: only on the contour (grazing) AND on the side facing the screen
  float rimS = rim * smoothstep(0.0, 0.55, sl);

  vec3 c;
  float a = 1.0;
  float soft = 0.0;
  float sizeMul = 1.0;
  if (kind == 1.0) {                 // hair: dark warm strands, highlights where lit, cyan sheen on the screen side
    float v = aData.z;
    float hl = pow(max(dot(normalize(Lw + V), N), 0.0), 6.0);
    c = hair * (0.35 + 0.75 * wl + 1.1 * hl) * uWarmth + rimC * (rimS * 0.8 + sl * 0.08) * uScreen;
    c *= 0.75 + 0.7 * aRand.x;
    a = (0.45 + 0.55 * smoothstep(-0.5, 0.35, facing)) * (1.0 - smoothstep(0.6, 1.0, v) * 0.9) * smoothstep(0.0, 0.12, v) * 0.8;
    sizeMul = 0.7;
  } else if (kind == 2.0) {          // interior: only visible with innerGlow
    float k = smoothstep(aCore, aCore + 0.3, uInnerGlow * 1.3);
    c = mix(uCyan, vec3(0.9, 1.0, 1.0), 0.25) * 0.45 * k;
    a = k * 0.7;
    soft = 1.0;
    sizeMul = 1.8;
  } else if (kind == 3.0) {          // iris: almost dark (an absence of light), faint warm texture
    c = warm * 0.04 * uWarmth + rimC * sl * 0.04 * uScreen;
    a = smoothstep(-0.1, 0.3, facing) * (1.0 - uEyeClosed) * 0.6;
    sizeMul = 0.6;
  } else if (kind == 5.0) {          // catch-light: the screen reflected in her eye
    c = mix(rimC, vec3(1.0), 0.5) * 0.9 * (0.35 + 0.65 * uScreen);
    a = smoothstep(-0.1, 0.4, facing) * (1.0 - uEyeClosed);
    sizeMul = 0.55;
  } else if (kind == 8.0) {          // sclera
    c = mix(warm, vec3(1.0), 0.3) * 0.045 * uWarmth + rimC * sl * 0.05 * uScreen;
    a = smoothstep(-0.1, 0.3, facing) * (1.0 - uEyeClosed);
    sizeMul = 0.6;
  } else if (kind == 4.0) {          // lash line / lids: fine contour
    c = mix(shadow, warm, 0.5) * 0.16 * uWarmth + rimC * (0.02 + rimS * 0.3) * uScreen;
    a = (0.5 + 0.5 * smoothstep(-0.3, 0.3, facing)) * 0.6;
    sizeMul = 0.5;
  } else if (kind == 6.0) {          // brows
    c = mix(hair, warm, 0.25) * 1.25 * uWarmth + rimC * sl * 0.15 * uScreen;
    a = smoothstep(-0.2, 0.3, facing) * 0.9;
    sizeMul = 0.65;
  } else {                           // skin (0) / scalp (7)
    float key = 0.1 + 0.9 * wl;
    c = mix(shadow * 0.55, warm, clamp(wl * 1.15, 0.0, 1.0)) * key * uWarmth * 0.82;
    c += rimC * (rimS * 1.5 + pow(sl, 4.0) * 0.03) * uScreen;
    a = smoothstep(-0.12, 0.3, facing);
    // continuous fade under the hair (aData.w = hair mask): no hard hairline seam
    float under = smoothstep(0.25, 0.95, aData.w);
    c *= 1.0 - 0.62 * under; a *= 1.0 - 0.5 * under;
  }
  // inner glow: surface turns cyan from the inside out
  if (uInnerGlow > 0.0 && kind != 2.0) {
    float k = smoothstep(aRand.w * 0.8, aRand.w * 0.8 + 0.2, uInnerGlow);
    c = mix(c, uCyan * (0.5 + 0.8 * sl + 0.6 * rim), k * 0.85);
  }
  // twinkle
  if (uTwinkle > 0.0 && aRand.x > 0.965) {
    c *= 1.0 + uTwinkle * 2.5 * pow(0.5 + 0.5 * sin(uTime * (2.0 + aRand.y * 3.0) + aRand.z * 40.0), 6.0);
  }

  float size = uSize * (0.8 + 0.3 * aRand.x + (aRand.x > 0.985 ? 0.5 : 0.0)) * sizeMul;
  float z = max(-mv.z, 0.01);
  float ps = size * uPx / (pow(z, 0.5) * pow(uRefDist, 0.5));
  float comp = 1.0;
  if (uAperture > 0.0) {            // depth of field: out-of-focus points grow and dim (energy kept)
    float coc = abs(z - uFocus) / z * uAperture * uPx * 0.02;
    float ns = sqrt(ps * ps + coc * coc);
    comp *= (ps * ps) / (ns * ns);
    ps = ns;
  }
  if (ps < 1.3) { comp *= (ps * ps) / (1.3 * 1.3); ps = 1.3; }
  gl_PointSize = min(ps, 48.0);
  vColor = c;
  vAlpha = a * fade * uOpacity * comp;
  vSoft = soft;
}`;

const FRAG = /* glsl */`
varying vec3 vColor;
varying float vAlpha;
varying float vSoft;
void main() {
  vec2 q = gl_PointCoord - 0.5;
  float r2 = dot(q, q) * 4.0;
  if (r2 > 1.0) discard;
  float a = mix(exp(-r2 * 3.2), exp(-r2 * 1.6) * 0.6, vSoft);
  a *= vAlpha;
  if (a < 0.003) discard;
  gl_FragColor = vec4(vColor * a, 1.0);
}`;

// Fine antialiased hair strands (screen-space quads along the draped strand curves). They share the
// points' sway, breathing, palette and fades so they read as one body of hair.
const HAIR_VERT = /* glsl */`
attribute vec3 aA;
attribute vec3 aB;
attribute vec4 aH;        // strandRand, vA, vB, brightness
uniform vec2 uRes;
uniform float uTime, uWidth, uBreathe, uBustFade, uOpacity, uWarmth, uScreen, uColorSwap, uDissolve;
uniform vec3 uScreenPos, uHair, uRim, uDeep, uAmber;
varying vec2 vC; varying float vLen; varying vec3 vCol; varying float vA;
vec3 sway(vec3 p, float v, float ph) {
  p.x += sin(uTime * 0.55 + ph) * 0.012 * v * v;
  p.z += sin(uTime * 0.43 + ph * 1.3) * 0.016 * v * v;
  vec3 bc = vec3(-0.05, -1.05, 0.0);
  return bc + (p - bc) * (1.0 + uBreathe);
}
void main() {
  float ph = aH.x * 6.2831;
  vec3 pa = sway(aA, aH.y, ph), pb = sway(aB, aH.z, ph);
  vec4 ca = projectionMatrix * modelViewMatrix * vec4(pa, 1.0);
  vec4 cb = projectionMatrix * modelViewMatrix * vec4(pb, 1.0);
  vec2 sa = ca.xy / ca.w * 0.5 * uRes, sb = cb.xy / cb.w * 0.5 * uRes;
  vec2 d = sb - sa; float len = length(d); vec2 dir = len > 1e-4 ? d / len : vec2(1.0, 0.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  float hw = uWidth * 0.5 + 0.7;
  float e = position.x, sd = position.y;
  vec2 sp = mix(sa, sb, e) + nrm * sd * hw + dir * (e * 2.0 - 1.0) * hw;
  vec4 cp = mix(ca, cb, e);
  gl_Position = vec4(sp / (0.5 * uRes) * cp.w, cp.z, cp.w);
  vC = vec2(e * (len + 2.0 * hw) - hw, sd * hw);
  vLen = len;
  // lighting from the segment midpoint
  vec3 mid = (pa + pb) * 0.5;
  vec3 n = normalize(mid - vec3(-0.07, mid.y > -0.2 ? 0.06 : mid.y, 0.0));
  vec4 mvm = modelViewMatrix * vec4(mid, 1.0);
  vec3 N = normalize(normalMatrix * n), V = normalize(-mvm.xyz);
  vec3 Ls = normalize((viewMatrix * vec4((modelMatrix * vec4(uScreenPos, 1.0)).xyz, 1.0)).xyz - mvm.xyz);
  vec3 Lw = normalize((viewMatrix * vec4(-0.35, 0.6, 0.75, 0.0)).xyz);
  float wl = max(dot(N, Lw), 0.0), sl = max(dot(N, Ls), 0.0);
  float facing = dot(N, V);
  float rim = pow(1.0 - abs(facing), 3.0) * smoothstep(0.0, 0.55, sl);
  float hl = pow(max(dot(normalize(Lw + V), N), 0.0), 8.0);
  vec3 hair = mix(uHair, uDeep * 0.6, uColorSwap), rimC = mix(uRim, uAmber, uColorSwap);
  vCol = hair * (0.22 + 0.6 * wl + 1.6 * hl) * uWarmth * (0.5 + 0.9 * aH.w * aH.w) + rimC * (rim * 0.8 + sl * 0.05) * uScreen;
  float v = (aH.y + aH.z) * 0.5;
  vA = uOpacity * (0.35 + 0.65 * smoothstep(-0.5, 0.35, facing)) * smoothstep(0.0, 0.1, v) * (1.0 - 0.85 * smoothstep(0.65, 1.0, v))
     * smoothstep(uBustFade - 0.45, uBustFade + 0.05, mid.y) * (1.0 - uDissolve);
}`;
const HAIR_FRAG = /* glsl */`
uniform float uWidth, uAlpha;
varying vec2 vC; varying float vLen; varying vec3 vCol; varying float vA;
void main() {
  float x = clamp(vC.x, 0.0, vLen);
  float dist = length(vec2(vC.x - x, vC.y));
  float a = (1.0 - smoothstep(uWidth * 0.5 - 0.5, uWidth * 0.5 + 0.7, dist)) * vA * uAlpha;
  if (a < 0.003) discard;
  gl_FragColor = vec4(vCol * a, 1.0);
}`;

function buildHairLines(strands, { every = 4, step = 3 } = {}) {
  const A = [], B = [], H = [];
  strands.forEach((pts, si) => {
    if (si % every !== 0 || pts.length < 4) return;
    const r = ((si * 2654435761) % 1000) / 1000;
    const bright = ((si * 40503) % 997) / 997;
    const n = pts.length - 1;
    for (let i = 0; i + step <= n; i += step) {
      const a = pts[i], b = pts[i + step];
      A.push(a[0], a[1], a[2]); B.push(b[0], b[1], b[2]);
      H.push(r, i / n, (i + step) / n, bright);
    }
  });
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0], 3));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  geo.setAttribute('aA', new THREE.InstancedBufferAttribute(new Float32Array(A), 3));
  geo.setAttribute('aB', new THREE.InstancedBufferAttribute(new Float32Array(B), 3));
  geo.setAttribute('aH', new THREE.InstancedBufferAttribute(new Float32Array(H), 4));
  geo.instanceCount = A.length / 3;
  return expandInstanced(geo);   // plain batched draw: ~3x cheaper than instancing on SwiftShader
}

// Per-frame states: update(t, states) starts from these defaults, so a state you do not pass is NOT
// carried over from an earlier frame (frames render out of order). Config (size, viewHeight,
// viewWidth, colors, screenPos) persists.
export const SILHOUETTE_STATE = Object.freeze({
  warmth: 1, innerGlow: 0, jitter: 0, gridify: 0, dissolve: 0, morph: 0, colorSwap: 0, mouthOpen: 0,
  eyeClosed: 0, opacity: 1, mirror: false, screenLight: 1, breathe: 1, twinkle: 0.5, focus: 3.5, aperture: 0,
  bustFade: -0.95, hairLines: 0.55,
});

let CACHE = null; // geometry is deterministic: build once per page

export class Silhouette extends THREE.Group {
  constructor(ctx, opts = {}) {
    super();
    this.ctx = ctx;
    if (!CACHE || CACHE.seed !== (opts.seed || 'her')) {
      CACHE = { seed: opts.seed || 'her', geo: buildSilhouettePoints({ seed: opts.seed || 'her' }) };
    }
    const g = CACHE.geo;
    this.data = g;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(g.position, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(g.normal, 3));
    geo.setAttribute('aData', new THREE.BufferAttribute(g.data, 4));
    geo.setAttribute('aRand', new THREE.BufferAttribute(g.rand, 4));
    geo.setAttribute('aCore', new THREE.BufferAttribute(g.core, 1));
    geo.setAttribute('aTarget', new THREE.BufferAttribute(g.position.slice(), 3));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(-0.05, -0.6, 0), 1.6);
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG,
      uniforms: {
        uTime: { value: 0 }, uPx: { value: ctx.H * 0.5 }, uSize: { value: 0.0048 }, uOpacity: { value: 1 },
        uWarmth: { value: 1 }, uInnerGlow: { value: 0 }, uJitter: { value: 0 }, uGridify: { value: 0 },
        uDissolve: { value: 0 }, uMorph: { value: 0 }, uColorSwap: { value: 0 }, uMouth: { value: 0 },
        uEyeClosed: { value: 0 }, uScreen: { value: 1 }, uBreathe: { value: 0 }, uTwinkle: { value: 0.5 },
        uJitterSeed: { value: 0 }, uRefDist: { value: 3.5 }, uFocus: { value: 3.5 }, uAperture: { value: 0 }, uBustFade: { value: -0.95 },
        uScreenPos: { value: new THREE.Vector3(2.2, -0.15, 0.6) },
        uRim: { value: col('AI_CYAN') }, uWarm: { value: col('HUMAN_SKIN') }, uShadow: { value: col('HUMAN_EMBER') },
        uHair: { value: col('#6f3d22') }, uCyan: { value: col('AI_CYAN') }, uDeep: { value: col('AI_DEEP') },
        uAmber: { value: col('HUMAN_AMBER') },
        uEye: { value: new THREE.Vector3(EYE.cx, EYE.cy, EYE.cz) },
        uHinge: { value: new THREE.Vector2(g.hinge[0], g.hinge[1]) },
      },
      transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.add(this.points);
    // fine hair strands (share uniforms with the points where possible)
    const u0 = this.material.uniforms;
    this.hairMaterial = new THREE.ShaderMaterial({
      vertexShader: HAIR_VERT, fragmentShader: HAIR_FRAG,
      uniforms: {
        uRes: { value: new THREE.Vector2(ctx.W, ctx.H) }, uTime: u0.uTime, uWidth: { value: 1.0 }, uBreathe: u0.uBreathe,
        uBustFade: u0.uBustFade, uOpacity: u0.uOpacity, uWarmth: u0.uWarmth, uScreen: u0.uScreen, uColorSwap: u0.uColorSwap,
        uDissolve: { value: 0 }, uScreenPos: u0.uScreenPos, uHair: u0.uHair, uRim: u0.uRim, uDeep: u0.uDeep, uAmber: u0.uAmber,
        uAlpha: { value: 0.55 },
      },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    if (!CACHE.hairGeo) CACHE.hairGeo = buildHairLines(g.strands);
    this.hair = new THREE.Mesh(CACHE.hairGeo, this.hairMaterial);
    this.hair.frustumCulled = false;
    this.add(this.hair);
    // public state (documented in the header)
    Object.assign(this, SILHOUETTE_STATE, { size: 0.0048, viewHeight: 0, viewWidth: 0 });
    this.screenPos = this.material.uniforms.uScreenPos.value;
  }

  get rimColor() { return this.material.uniforms.uRim.value; }
  get warmColor() { return this.material.uniforms.uWarm.value; }
  get shadowColor() { return this.material.uniforms.uShadow.value; }
  get hairColor() { return this.material.uniforms.uHair.value; }

  /** local position of the near (+z) eye center */
  eyeLocal() { return new THREE.Vector3(EYE.cx + EYE.r * 0.9, EYE.cy, EYE.cz + 0.01); }
  eyeWorldPosition(target = new THREE.Vector3()) { this.updateMatrixWorld(true); return target.copy(this.eyeLocal()).applyMatrix4(this.matrixWorld); }

  /** set morph targets (local xyz). Points are assigned in an order (top first by default). */
  dissolveTo(targets, { order = 'height' } = {}) {
    const n = this.data.count, m = targets.length / 3;
    const out = new Float32Array(n * 3);
    let idx = Array.from({ length: n }, (_, i) => i);
    if (order === 'height') idx.sort((a, b) => this.data.position[b * 3 + 1] - this.data.position[a * 3 + 1]);
    for (let k = 0; k < n; k++) {
      const i = idx[k], j = Math.floor((k / n) * m) % m;
      out[i * 3] = targets[j * 3]; out[i * 3 + 1] = targets[j * 3 + 1]; out[i * 3 + 2] = targets[j * 3 + 2];
    }
    const attr = this.points.geometry.getAttribute('aTarget');
    attr.array.set(out);
    attr.needsUpdate = true;
    return this;
  }

  update(t, states = {}) {
    Object.assign(this, SILHOUETTE_STATE, states);
    const u = this.material.uniforms;
    u.uTime.value = t;
    u.uPx.value = ((this.viewHeight || this.ctx.H) * 0.5) / Math.tan(((this._fovHint || 35) * Math.PI) / 360);
    u.uSize.value = this.size;
    u.uOpacity.value = this.opacity;
    u.uWarmth.value = this.warmth;
    u.uInnerGlow.value = this.innerGlow;
    u.uJitter.value = this.jitter;
    u.uGridify.value = this.gridify;
    u.uDissolve.value = this.dissolve;
    u.uMorph.value = this.morph;
    u.uColorSwap.value = this.colorSwap;
    u.uMouth.value = this.mouthOpen;
    u.uEyeClosed.value = this.eyeClosed;
    u.uScreen.value = this.screenLight;
    u.uTwinkle.value = this.twinkle;
    u.uFocus.value = this.focus;
    u.uAperture.value = this.aperture;
    u.uBustFade.value = this.bustFade;
    // breathing: scale 1 ± 0.006, period = 2 bars (style guide §4)
    const bar = this.ctx.audio ? this.ctx.audio.barDur : 1.3953;
    u.uBreathe.value = this.breathe * 0.006 * Math.sin((2 * Math.PI * t) / (2 * bar));
    const hu = this.hairMaterial.uniforms;
    hu.uRes.value.set(this.viewWidth || (this.viewHeight ? this.viewHeight * this.ctx.W / this.ctx.H : this.ctx.W), this.viewHeight || this.ctx.H);
    hu.uDissolve.value = Math.min(1, Math.max(this.dissolve, this.morph, this.gridify) * 1.6);
    hu.uAlpha.value = this.hairLines;
    this.hair.visible = this.hairLines > 0.001 && this.opacity > 0.001;
    this.scale.x = Math.abs(this.scale.x) * (this.mirror ? -1 : 1);
    this.visible = this.opacity > 0.001;
    return this;
  }

  /** match point size to the camera's fov so sizes are stable across lenses */
  setCamera(camera) { this._fovHint = camera.fov; return this; }
}

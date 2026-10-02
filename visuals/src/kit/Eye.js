// Eye — procedural macro of her eye: radial iris fibers, crypts, collarette, limbal ring, pupil,
// wet cornea highlights and a reflection slot (e.g. the chat bubble "Always.").
// The static iris pattern is rendered once into a polar strip texture at init (cheap per frame).
//
//   const eye = new Eye(ctx);  scene.add(eye);       // plane 4 x 2.5 units, iris radius 0.5 at origin
//   eye.setReflection(texture);                      // shown on the cornea, barrel-distorted
//   eye.update(t, { pupil: 0.35, reflection: 0.8 });
//
// States: pupil (0.2..1.0)  reflection (0..1 strength)  reveal (0..1 radial materialize from the iris)
//   lidOpen (0..1)  brightness  screenLight (cyan catch-light / window highlight)  parallax (Vector2)
//   reflectionOffset (Vector2, cornea position of the reflection)  reflectionSize (Vector2)
import * as THREE from 'three';
import { col } from '../core/palette.js';

const NOISE = /* glsl */`
float hash3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x) {
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash3(i + vec3(0, 0, 0)), hash3(i + vec3(1, 0, 0)), f.x), mix(hash3(i + vec3(0, 1, 0)), hash3(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hash3(i + vec3(0, 0, 1)), hash3(i + vec3(1, 0, 1)), f.x), mix(hash3(i + vec3(0, 1, 1)), hash3(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}`;

// --- one-time iris strip: x = angle (0..1), y = rho (0 pupil edge .. 1 limbus)
const STRIP_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform vec3 uC1, uC2, uC3;
${NOISE}
void main() {
  float a = vUv.x * 6.2831853, rho = vUv.y;
  vec2 cs = vec2(cos(a), sin(a));
  // radial stroma fibers: high angular frequency, slow radial change, slight waviness
  float wav = vnoise(vec3(cs * 6.0, rho * 3.0)) * 0.6;
  vec2 cw = vec2(cos(a + wav * 0.05), sin(a + wav * 0.05));
  float f1 = vnoise(vec3(cw * 48.0, rho * 1.6));
  float f2 = vnoise(vec3(cw * 120.0, rho * 3.5 + 3.0));
  float f3 = vnoise(vec3(cw * 300.0, rho * 7.0 + 7.0));
  float fib = pow(f1 * 0.45 + f2 * 0.35 + f3 * 0.2, 1.6) * 1.9;
  // collarette: jagged ring at ~33% radius, brighter golden zone inside it
  float zig = 0.33 + 0.06 * (vnoise(vec3(cs * 14.0, 1.7)) - 0.5) * 2.0;
  float coll = exp(-pow((rho - zig) / 0.035, 2.0));
  float inner = 1.0 - smoothstep(zig - 0.05, zig + 0.04, rho);
  // crypts: dark lacunae in the ciliary zone
  float cr = smoothstep(0.6, 0.8, vnoise(vec3(cs * 22.0, rho * 5.0 + 11.0))) * smoothstep(0.36, 0.48, rho) * (1.0 - smoothstep(0.82, 0.92, rho));
  // contraction furrows (concentric)
  float furrow = smoothstep(0.75, 1.0, 0.5 + 0.5 * sin(rho * 46.0 + vnoise(vec3(cs * 7.0, 2.0)) * 5.0)) * smoothstep(0.55, 0.7, rho);
  vec3 c = mix(uC2, uC1, inner * 0.85);
  c = mix(c, uC3, smoothstep(0.55, 1.0, rho) * 0.8);
  c *= 0.35 + 1.05 * fib;
  c += uC1 * coll * 0.45;
  c *= 1.0 - cr * 0.7;
  c *= 1.0 - furrow * 0.3;
  // limbal ring + pupillary ruff
  c *= 1.0 - smoothstep(0.84, 1.0, rho) * 0.88;
  c = mix(c, uC3 * 0.4, 1.0 - smoothstep(0.0, 0.05, rho));
  gl_FragColor = vec4(c, 1.0);
}`;

const VERT = /* glsl */`
varying vec2 vP;
void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const FRAG = /* glsl */`
precision highp float;
varying vec2 vP;
uniform sampler2D uStrip, uRefl;
uniform float uPupil, uRefStr, uLid, uBright, uScreen, uTime, uHasRefl, uSoft, uReveal;
uniform vec2 uParallax, uRefOff, uRefSize;
uniform vec3 uSclera, uSkin, uCyan, uWhite;
${NOISE}
#define RI 0.5
float sdRoundRect(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void main() {
  vec2 p = vP;
  float px = fwidth(p.x) + 1e-5;
  float r = length(p);
  // lids (almond)
  float up = (0.6 * pow(max(0.0, 1.0 - pow(p.x / 1.32, 2.0)), 0.8) + 0.02) * uLid + 0.03 * (1.0 - uLid);
  float lo = -(0.44 * pow(max(0.0, 1.0 - pow(p.x / 1.25, 2.0)), 0.9)) * uLid - 0.02 * (1.0 - uLid);
  float inEye = smoothstep(-px * 2.0, px * 2.0, up - p.y) * smoothstep(-px * 2.0, px * 2.0, p.y - lo) * smoothstep(1.3, 1.22, abs(p.x));
  // outside the opening: only the dark skin (cheap path)
  if (inEye <= 0.0 && abs(p.y - up) > 0.08 && abs(p.y - lo) > 0.08) {
    vec2 sc0 = p * 60.0; vec2 ci0 = floor(sc0);
    float h0 = fract(sin(dot(ci0, vec2(12.9898, 78.233))) * 43758.5453);
    vec2 j0 = vec2(fract(h0 * 13.7), fract(h0 * 71.3)) * 0.7 + 0.15;
    float d0 = length(fract(sc0) - j0);
    vec3 sk = uSkin * (0.002 + 0.006 * smoothstep(1.8, 0.0, length(p * vec2(0.55, 1.0))));
    sk += mix(uSkin, vec3(1.0, 0.85, 0.7), 0.4) * exp(-d0 * d0 * 60.0) * step(0.55, h0) * 0.09 * smoothstep(2.0, 0.6, length(p * vec2(0.6, 1.0)));
    float rv0 = mix(-0.2, 3.2, uReveal);
    gl_FragColor = vec4(sk * smoothstep(rv0, rv0 - 0.6, r) * uBright, 1.0);
    return;
  }
  // eyeball sphere shading (radius ~1.25): darker toward the corners
  float sph = sqrt(max(0.0, 1.0 - dot(p, p) / 1.7));
  float veins = 0.0;
  if (r > RI * 0.98) veins = smoothstep(0.62, 0.72, vnoise(vec3(p * 8.0, 1.0))) * smoothstep(0.55, 1.1, r);
  vec3 col = uSclera * (0.01 + 0.055 * sph * sph * sqrt(sph)) * (1.0 - 0.4 * veins);
  col = mix(col, uSkin * 0.12, smoothstep(0.85, 1.3, abs(p.x)) * 0.6);          // pink corners
  col *= 1.0 - 0.75 * smoothstep(0.22, 0.0, up - p.y);                           // upper lid + lash shadow
  col *= 1.0 - 0.35 * smoothstep(0.08, 0.0, p.y - lo);
  col += uCyan * 0.035 * uScreen * smoothstep(-0.2, 0.9, p.x + p.y * 0.5) * sph; // screen light on the eyeball
  // iris + pupil
  float rp = RI * mix(0.18, 0.92, clamp((uPupil - 0.2) / 0.8, 0.0, 1.0));
  if (r < RI + px * 2.0) {
    float rho = clamp((r - rp) / (RI - rp), 0.0, 1.0);
    float ang = atan(p.y, p.x) / 6.2831853 + 0.5;
    vec2 dudx = vec2((p.x * dFdx(p.y) - p.y * dFdx(p.x)) / max(r * r, 1e-6) / 6.2831853, dFdx(r) / (RI - rp));
    vec2 dudy = vec2((p.x * dFdy(p.y) - p.y * dFdy(p.x)) / max(r * r, 1e-6) / 6.2831853, dFdy(r) / (RI - rp));
    vec3 iris = textureGrad(uStrip, vec2(ang, rho), dudx, dudy).rgb * 0.42;
    // light through the cornea: brighter on the screen side, shadowed under the lid
    iris *= 0.55 + 0.75 * smoothstep(-0.6, 0.7, dot(p / RI, vec2(0.55, 0.45)));
    iris *= 1.0 - 0.6 * smoothstep(0.25, 0.0, up - p.y);
    iris += uCyan * 0.05 * uScreen * smoothstep(0.2, 0.9, dot(normalize(p + 1e-4), vec2(0.7, 0.7))) * (1.0 - rho * 0.6);
    float pupil = 1.0 - smoothstep(rp - px * 1.5 - uSoft, rp + px * 1.5, r);
    iris = mix(iris, vec3(0.003, 0.0025, 0.0025), pupil);
    float irisMask = 1.0 - smoothstep(RI - px * 1.5 - 0.01, RI + px * 1.5, r);
    col = mix(col, iris, irisMask);
  }
  col *= inEye;
  // skin around the eye: near-black warm, a cyan rim of screen light along the lower lid edge
  float lash = 0.0;
  if (abs(p.y - up - 0.012) < 0.06) lash = smoothstep(0.06, 0.0, abs(p.y - up - 0.012)) * (0.55 + 0.45 * vnoise(vec3(p.x * 70.0, 0.0, 2.0)));
  vec3 skin = uSkin * (0.002 + 0.006 * smoothstep(1.8, 0.0, length(p * vec2(0.55, 1.0))));
  // sparse warm particles on the skin, echoing the particle silhouette
  vec2 sc = p * 60.0;
  vec2 ci = floor(sc);
  float hp = fract(sin(dot(ci, vec2(12.9898, 78.233))) * 43758.5453);
  vec2 jp = vec2(fract(hp * 13.7), fract(hp * 71.3)) * 0.7 + 0.15;
  float dp = length(fract(sc) - jp);
  skin += mix(uSkin, vec3(1.0, 0.85, 0.7), 0.4) * exp(-dp * dp * 60.0) * step(0.55, hp) * 0.09 * smoothstep(2.0, 0.6, length(p * vec2(0.6, 1.0)));
  skin += uCyan * 0.05 * uScreen * smoothstep(0.05, 0.0, abs(p.y - lo + 0.02)) * smoothstep(1.2, 0.2, abs(p.x));
  skin += uSkin * 0.02 * smoothstep(0.05, 0.0, abs(p.y - up - 0.04)) * smoothstep(1.3, 0.3, abs(p.x));
  col = mix(skin * (1.0 - lash * 0.85), col, inEye);
  // cornea (radius ~0.56 bulge): the monitor reflected as a soft rounded rectangle with the chat bubble inside
  vec2 cp = p - uParallax;
  float cornea = 1.0 - smoothstep(RI * 1.02, RI * 1.12, r);
  vec2 q = (cp - uRefOff) / uRefSize;
  q *= 1.0 + 0.3 * dot(q, q);                       // convex mirror bulge
  float scr = 1.0 - smoothstep(-0.04, 0.1, sdRoundRect(q, vec2(1.0, 0.95), 0.25));
  vec3 refl = mix(uCyan, uWhite, 0.25) * scr * 0.06;
  if (uHasRefl > 0.5) {
    vec2 ruv = q * vec2(0.5, 0.5) + 0.5;
    if (ruv.x > 0.0 && ruv.x < 1.0 && ruv.y > 0.0 && ruv.y < 1.0) refl += texture2D(uRefl, ruv).rgb * 0.55;
  }
  float fres = 0.35 + 0.65 * smoothstep(RI * 0.2, RI * 1.0, length(cp - uRefOff));
  col += refl * uRefStr * cornea * inEye * fres * uScreen;
  // tiny sharp catch-light + faint wet sheen along the cornea edge
  float dot1 = exp(-dot(cp - vec2(0.2, 0.22), cp - vec2(0.2, 0.22)) / 0.00009);
  float sheen = exp(-pow((r - RI * 1.0) / 0.035, 2.0)) * 0.04 * smoothstep(-0.2, 0.6, p.y);
  col += mix(uWhite, uCyan, 0.3) * dot1 * 1.4 * uScreen * inEye;
  col += uWhite * sheen * inEye;
  // radial reveal from the iris outward (materializes inside the particle face)
  float rv = mix(-0.2, 3.2, uReveal);
  col *= smoothstep(rv, rv - 0.6, r);
  gl_FragColor = vec4(col * uBright, 1.0);
}`;

export class Eye extends THREE.Group {
  constructor(ctx, { width = 4, height = 2.5 } = {}) {
    super();
    this.ctx = ctx;
    // bake the iris strip once
    const rt = new THREE.WebGLRenderTarget(2048, 512, { type: THREE.FloatType });
    rt.texture.generateMipmaps = true;
    rt.texture.minFilter = THREE.LinearMipmapLinearFilter;
    rt.texture.wrapS = THREE.RepeatWrapping;
    rt.texture.colorSpace = THREE.NoColorSpace;
    const sm = new THREE.ShaderMaterial({
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: STRIP_FRAG, depthTest: false, depthWrite: false,
      uniforms: { uC1: { value: col('#d9a75e') }, uC2: { value: col('#8a5530') }, uC3: { value: col('#24130a') } },
    });
    const sc = new THREE.Scene();
    sc.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), sm));
    const r = ctx.renderer;
    const prev = r.getRenderTarget();
    r.setRenderTarget(rt);
    r.render(sc, new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1));
    r.setRenderTarget(prev);
    this.strip = rt;
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG,
      uniforms: {
        uStrip: { value: rt.texture }, uRefl: { value: null }, uPupil: { value: 0.35 }, uRefStr: { value: 0 },
        uLid: { value: 1 }, uBright: { value: 1 }, uScreen: { value: 1 }, uTime: { value: 0 }, uHasRefl: { value: 0 },
        uSoft: { value: 0.004 }, uReveal: { value: 1 },
        uParallax: { value: new THREE.Vector2() }, uRefOff: { value: new THREE.Vector2(-0.12, 0.12) },
        uRefSize: { value: new THREE.Vector2(0.19, 0.082) },
        uSclera: { value: col('#efdcd0') }, uSkin: { value: col('HUMAN_EMBER') }, uCyan: { value: col('AI_CYAN') },
        uWhite: { value: col('AI_WHITE') },
      },
      depthWrite: false, transparent: true, blending: THREE.AdditiveBlending,
    });
    this.plane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), this.material);
    this.add(this.plane);
    Object.assign(this, { pupil: 0.35, reflection: 0, lidOpen: 1, brightness: 1, screenLight: 1, reveal: 1 });
    this.parallax = this.material.uniforms.uParallax.value;
    this.reflectionOffset = this.material.uniforms.uRefOff.value;
    this.reflectionSize = this.material.uniforms.uRefSize.value;
  }
  setReflection(texture) {
    this.material.uniforms.uRefl.value = texture;
    this.material.uniforms.uHasRefl.value = texture ? 1 : 0;
    return this;
  }
  update(t, states = {}) {
    Object.assign(this, { pupil: 0.35, reflection: 0, lidOpen: 1, brightness: 1, screenLight: 1, reveal: 1 }, states);   // per-frame defaults (no carry-over)
    const u = this.material.uniforms;
    u.uTime.value = t; u.uPupil.value = this.pupil; u.uRefStr.value = this.reflection; u.uLid.value = this.lidOpen;
    u.uBright.value = this.brightness; u.uScreen.value = this.screenLight; u.uReveal.value = this.reveal;
    return this;
  }
}

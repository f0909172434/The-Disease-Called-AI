// Post-processing chain: scene (HDR, linear) -> [echo trails] -> UnrealBloom -> FinalPass -> screen.
// The final pass does chromatic aberration, block glitch, pixelate, tone mapping, sRGB encode,
// color grade (lift/gamma/gain, saturation, contrast, tint), invert, scanlines, vignette,
// flash white/black, fade, and film grain seeded by the frame index (deterministic).
//
// Scenes set parameters every frame on ctx.post.p (reset to the section preset before update):
//   ctx.post.p.bloom = 1.2; ctx.post.p.ca = 0.004; ctx.post.p.glitch = 0.5; ctx.post.p.flashWhite = 1;
// See DEFAULT_PARAMS for every field.
import * as THREE from 'three';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

export const DEFAULT_PARAMS = Object.freeze({
  exposure: 1.0,
  bloom: 0.8,            // UnrealBloom strength
  bloomRadius: 0.55,
  bloomThreshold: 0.12,  // linear luminance
  ca: 0.001,             // chromatic aberration (fraction of frame width at the corners)
  grain: 0.05,           // film grain amount (display space), seeded by frame
  vignette: 0.4,
  scanlines: 0.0,        // 0..1 strength
  scanlineSpacing: 3.0,  // px (at 1080p)
  scanlineScroll: 0.0,   // px/s scroll for VHS feel
  glitch: 0.0,           // 0..1 block glitch / RGB split
  glitchSeed: -1,        // -1 = derive from frame (changes every frame); else fixed seed
  pixelate: 0.0,         // block size in px at 1080p (0 or 1 = off)
  lift: [0, 0, 0],       // ASC-CDL-ish, display space
  gamma: [1, 1, 1],
  gain: [1, 1, 1],
  saturation: 1.0,
  contrast: 1.0,
  tint: [1, 1, 1],       // multiplied color...
  tintAmount: 0.0,       // ...mixed in by this amount
  invert: 0.0,
  flashWhite: 0.0,
  flashBlack: 0.0,
  fade: 0.0,             // fade to VOID (dip)
  trails: 0.0,           // echo trails amount 0..1 (re-renders the scene at earlier t: deterministic)
  trailSamples: 3,
  trailSpacing: 1 / 30,  // seconds between echo samples
  zoomBlur: 0.0,         // radial zoom blur strength (zoom-through transitions)
  zoomCenter: [0.5, 0.5],
});

function cloneParams(p) {
  const o = {};
  for (const k in p) o[k] = Array.isArray(p[k]) ? p[k].slice() : p[k];
  return o;
}

export function lerpParams(a, b, u) {
  const o = {};
  for (const k in a) {
    const va = a[k], vb = b[k] !== undefined ? b[k] : va;
    if (Array.isArray(va)) o[k] = va.map((x, i) => x + (vb[i] - x) * u);
    else if (typeof va === 'number') o[k] = (k === 'trailSamples' || k === 'glitchSeed') ? (u < 0.5 ? va : vb) : va + (vb - va) * u;
    else o[k] = u < 0.5 ? va : vb;
  }
  return o;
}

const FINAL_FRAG = /* glsl */`
precision highp float;
uniform sampler2D tScene;
uniform vec2 uRes;
uniform float uScale;      // H / 1080
uniform float uFrame;
uniform float uTime;
uniform float uExposure;
uniform float uCA;
uniform float uGrain;
uniform float uVignette;
uniform float uScan, uScanSpacing, uScanScroll;
uniform float uGlitch, uGlitchSeed;
uniform float uPixelate;
uniform vec3 uLift, uGamma, uGain, uTint;
uniform float uTintAmount, uSaturation, uContrast, uInvert;
uniform float uFlashWhite, uFlashBlack, uFade;
uniform float uZoomBlur;
uniform vec2 uZoomCenter;
varying vec2 vUv;

// integer hash (deterministic across drivers)
uint uhash(uvec3 v) {
  v = v * 1664525u + 1013904223u;
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  v ^= v >> 16u;
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  return v.x ^ v.y ^ v.z;
}
float h01(vec3 p) { return float(uhash(uvec3(ivec3(floor(p)) + 32768))) / 4294967295.0; }

vec3 toneMap(vec3 c) {
  // hue-preserving soft shoulder + gentle desaturation of extreme highlights toward white
  float m = max(max(c.r, c.g), c.b);
  float knee = 0.72;
  float mm = m < knee ? m : knee + (1.0 - knee) * (1.0 - exp(-(m - knee) / (1.0 - knee)));
  vec3 r = c * (mm / max(m, 1e-6));
  float over = clamp((m - 1.0) * 0.35, 0.0, 1.0);
  return mix(r, vec3(mm), over * 0.85);
}
vec3 toSRGB(vec3 c) {
  c = max(c, 0.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

vec3 sampleScene(vec2 uv) {
  if (uZoomBlur <= 0.0) return texture2D(tScene, uv).rgb;
  vec3 acc = vec3(0.0);
  vec2 d = uv - uZoomCenter;
  for (int i = 0; i < 8; i++) {
    float s = 1.0 - uZoomBlur * float(i) / 8.0 * 0.25;
    acc += texture2D(tScene, uZoomCenter + d * s).rgb;
  }
  return acc / 8.0;
}

void main() {
  vec2 uv = vUv;
  vec2 fc = gl_FragCoord.xy;
  float seed = uGlitchSeed < 0.0 ? uFrame : uGlitchSeed;

  if (uPixelate > 1.0) {
    vec2 px = vec2(uPixelate * uScale) / uRes;
    uv = (floor(uv / px) + 0.5) * px;
  }

  vec2 split = vec2(0.0);
  if (uGlitch > 0.0) {
    // horizontal tearing bands
    float band = floor(uv.y * mix(18.0, 60.0, h01(vec3(seed, 7.0, 1.0))));
    float hb = h01(vec3(band, seed, 3.0));
    if (hb < uGlitch * 0.45) {
      uv.x += (h01(vec3(band, seed, 5.0)) - 0.5) * 0.12 * uGlitch;
      split.x += (h01(vec3(band, seed, 9.0)) - 0.5) * 0.02 * uGlitch;
    }
    // displaced macro blocks
    vec2 blk = floor(uv * vec2(16.0, 9.0) * (1.0 + floor(h01(vec3(seed, 2.0, 2.0)) * 3.0)));
    float bb = h01(vec3(blk, seed + 11.0));
    if (bb < uGlitch * 0.12) {
      uv += (vec2(h01(vec3(blk, seed + 13.0)), h01(vec3(blk, seed + 17.0))) - 0.5) * 0.08 * uGlitch;
      split.y += 0.004 * uGlitch;
    }
    uv = clamp(uv, vec2(0.001), vec2(0.999));
  }

  vec2 d = uv - 0.5;
  float r2 = dot(d * vec2(uRes.x / uRes.y, 1.0), d * vec2(uRes.x / uRes.y, 1.0));
  vec2 off = d * uCA * (0.6 + 2.2 * r2) + split;
  vec3 col;
  if (dot(off, off) > 1e-12) {
    col.r = sampleScene(uv + off).r;
    col.g = sampleScene(uv).g;
    col.b = sampleScene(uv - off).b;
  } else {
    col = sampleScene(uv);
  }

  col *= uExposure;
  col = toneMap(col);
  col = toSRGB(col);

  // grade (display space)
  col = uGain * (col + uLift * (1.0 - col));
  col = pow(max(col, 0.0), 1.0 / max(uGamma, vec3(0.01)));
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(l), col, uSaturation);
  col = (col - 0.5) * uContrast + 0.5;
  col = mix(col, col * uTint, uTintAmount);
  col = mix(col, 1.0 - col, uInvert);

  if (uScan > 0.0) {
    float sp = max(uScanSpacing * uScale, 1.0);
    float s = 0.5 + 0.5 * cos(6.2831853 * (fc.y + uTime * uScanScroll * uScale) / sp);
    col *= 1.0 - uScan * 0.55 * s;
  }

  vec2 vd = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  float v = smoothstep(0.25, 1.05, length(vd) * 1.12);
  col *= 1.0 - uVignette * v * 0.95;

  col = mix(col, vec3(1.0), clamp(uFlashWhite, 0.0, 1.0));
  col = mix(col, vec3(0.0), clamp(uFlashBlack, 0.0, 1.0));
  col = mix(col, vec3(0.0196, 0.0235, 0.0392), clamp(uFade, 0.0, 1.0));

  // film grain: triangular-ish noise, weighted toward mid tones so blacks stay clean (compression)
  if (uGrain > 0.0) {
    float n1 = h01(vec3(fc, uFrame * 1.0 + 101.0));
    float n2 = h01(vec3(fc + 17.0, uFrame * 1.0 + 307.0));
    float n = (n1 + n2) - 1.0;
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    float w = 0.18 + 0.82 * smoothstep(0.02, 0.35, lum) * (1.0 - 0.6 * smoothstep(0.7, 1.0, lum));
    col += n * uGrain * 0.42 * w;
  }
  // 1/255 ordered-ish dither to avoid banding in dark gradients
  col += (h01(vec3(fc, 991.0)) - 0.5) / 255.0;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

const QUAD_VERT = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const BLEND_FRAG = /* glsl */`
precision highp float;
uniform sampler2D tA; uniform sampler2D tB;
uniform float uMix; uniform int uMode; uniform float uWeight;
varying vec2 vUv;
void main() {
  if (uMode == 0) { // weighted echo (used with MaxEquation blending)
    gl_FragColor = vec4(texture2D(tA, vUv).rgb * uWeight, 1.0);
  } else if (uMode == 1) { // crossfade
    gl_FragColor = vec4(mix(texture2D(tA, vUv).rgb, texture2D(tB, vUv).rgb, uMix), 1.0);
  } else { // zoom-through: A scales up & fades, B grows in from slightly enlarged
    vec2 c = vec2(0.5);
    float sa = 1.0 + uMix * uMix * 3.0;
    float sb = 1.0 + (1.0 - uMix) * 0.35;
    vec3 a = texture2D(tA, c + (vUv - c) / sa).rgb;
    vec3 b = texture2D(tB, c + (vUv - c) / sb).rgb;
    float w = smoothstep(0.25, 0.85, uMix);
    gl_FragColor = vec4(mix(a * (1.0 + uMix * 0.6), b, w), 1.0);
  }
}`;

export class Post {
  constructor(renderer, W, H, opts = {}) {
    this.renderer = renderer;
    this.W = W; this.H = H;
    this.scale = H / 1080;
    this.fps = opts.fps || 30;
    const rtOpts = { type: THREE.HalfFloatType, depthBuffer: true, samples: opts.samples ?? 0 };
    this.sceneRT = new THREE.WebGLRenderTarget(W, H, rtOpts);
    this.sceneRT.texture.name = 'post.scene';
    this.auxA = new THREE.WebGLRenderTarget(W, H, rtOpts);
    this.auxB = new THREE.WebGLRenderTarget(W, H, rtOpts);
    this.echoRT = new THREE.WebGLRenderTarget(Math.round(W / 2), Math.round(H / 2), { type: THREE.HalfFloatType, depthBuffer: true });
    this.bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.8, 0.55, 0.12);
    this.bloom.highPassUniforms.smoothWidth.value = 0.25;
    this.bloom.renderToScreen = false;

    this.finalMat = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT,
      fragmentShader: FINAL_FRAG,
      depthTest: false, depthWrite: false,
      uniforms: {
        tScene: { value: this.sceneRT.texture },
        uRes: { value: new THREE.Vector2(W, H) }, uScale: { value: this.scale },
        uFrame: { value: 0 }, uTime: { value: 0 }, uExposure: { value: 1 },
        uCA: { value: 0 }, uGrain: { value: 0 }, uVignette: { value: 0 },
        uScan: { value: 0 }, uScanSpacing: { value: 3 }, uScanScroll: { value: 0 },
        uGlitch: { value: 0 }, uGlitchSeed: { value: -1 }, uPixelate: { value: 0 },
        uLift: { value: new THREE.Vector3() }, uGamma: { value: new THREE.Vector3(1, 1, 1) },
        uGain: { value: new THREE.Vector3(1, 1, 1) }, uTint: { value: new THREE.Vector3(1, 1, 1) },
        uTintAmount: { value: 0 }, uSaturation: { value: 1 }, uContrast: { value: 1 }, uInvert: { value: 0 },
        uFlashWhite: { value: 0 }, uFlashBlack: { value: 0 }, uFade: { value: 0 },
        uZoomBlur: { value: 0 }, uZoomCenter: { value: new THREE.Vector2(0.5, 0.5) },
      },
    });
    this.finalQuad = new FullScreenQuad(this.finalMat);
    this.blendMat = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT, fragmentShader: BLEND_FRAG, depthTest: false, depthWrite: false,
      uniforms: { tA: { value: null }, tB: { value: null }, uMix: { value: 0 }, uMode: { value: 0 }, uWeight: { value: 1 } },
    });
    this.blendQuad = new FullScreenQuad(this.blendMat);
    this.p = cloneParams(DEFAULT_PARAMS);
  }

  /** reset params to defaults merged with a preset (called by the director each frame) */
  reset(preset = {}) {
    const p = cloneParams(DEFAULT_PARAMS);
    for (const k in preset) p[k] = Array.isArray(preset[k]) ? preset[k].slice() : preset[k];
    this.p = p;
    return p;
  }
  snapshot() { return cloneParams(this.p); }
  set(obj) { Object.assign(this.p, obj); return this.p; }

  /** blend src texture into dst RT with max(): used for echo trails */
  maxBlend(srcTex, dstRT, weight) {
    const r = this.renderer;
    this.blendMat.uniforms.tA.value = srcTex;
    this.blendMat.uniforms.uMode.value = 0;
    this.blendMat.uniforms.uWeight.value = weight;
    this.blendMat.blending = THREE.CustomBlending;
    this.blendMat.blendEquation = THREE.MaxEquation;
    this.blendMat.blendSrc = THREE.OneFactor;
    this.blendMat.blendDst = THREE.OneFactor;
    this.blendMat.transparent = true;
    const prevAuto = r.autoClear;
    r.autoClear = false;
    r.setRenderTarget(dstRT);
    this.blendQuad.render(r);
    r.autoClear = prevAuto;
    this.blendMat.blending = THREE.NoBlending;
    this.blendMat.transparent = false;
  }

  /** composite two scene RTs into sceneRT. mode: 'crossfade' | 'zoomThrough' */
  composite(texA, texB, u, mode = 'crossfade') {
    const r = this.renderer;
    this.blendMat.uniforms.tA.value = texA;
    this.blendMat.uniforms.tB.value = texB;
    this.blendMat.uniforms.uMix.value = u;
    this.blendMat.uniforms.uMode.value = mode === 'zoomThrough' ? 2 : 1;
    this.blendMat.blending = THREE.NoBlending;
    r.setRenderTarget(this.sceneRT);
    this.blendQuad.render(r);
  }

  /** bloom + final pass to the canvas */
  finish(t, frame) {
    const r = this.renderer, p = this.p, u = this.finalMat.uniforms;
    if (p.bloom > 0.001) {
      this.bloom.strength = p.bloom;
      this.bloom.radius = p.bloomRadius;
      this.bloom.threshold = p.bloomThreshold;
      this.bloom.render(r, null, this.sceneRT, 0, false);
    }
    u.tScene.value = this.sceneRT.texture;
    u.uFrame.value = frame; u.uTime.value = t;
    u.uExposure.value = p.exposure; u.uCA.value = p.ca; u.uGrain.value = p.grain; u.uVignette.value = p.vignette;
    u.uScan.value = p.scanlines; u.uScanSpacing.value = p.scanlineSpacing; u.uScanScroll.value = p.scanlineScroll;
    u.uGlitch.value = p.glitch; u.uGlitchSeed.value = p.glitchSeed; u.uPixelate.value = p.pixelate;
    u.uLift.value.fromArray(p.lift); u.uGamma.value.fromArray(p.gamma); u.uGain.value.fromArray(p.gain);
    u.uTint.value.fromArray(p.tint); u.uTintAmount.value = p.tintAmount;
    u.uSaturation.value = p.saturation; u.uContrast.value = p.contrast; u.uInvert.value = p.invert;
    u.uFlashWhite.value = p.flashWhite; u.uFlashBlack.value = p.flashBlack; u.uFade.value = p.fade;
    u.uZoomBlur.value = p.zoomBlur; u.uZoomCenter.value.fromArray(p.zoomCenter);
    r.setRenderTarget(null);
    this.finalQuad.render(r);
  }
}

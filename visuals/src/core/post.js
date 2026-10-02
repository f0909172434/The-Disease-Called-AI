// Post-processing chain: scene (HDR float, linear) -> [echo trails] -> UnrealBloom -> FinalPass -> screen.
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
  bloom: 0.8,            // bloom strength
  bloomRadius: 0.35,     // 0 = tight halo around bright cores ... 1 = wide atmospheric glow
  bloomThreshold: 0.2,   // linear luminance where the bright pass starts (soft knee below)
  bloomToe: 0.012,       // rolls off the low-level tail of the glow so blacks stay at VOID (0 = off)
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

const QUAD_VERT_SRC = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const FINAL_FRAG = /* glsl */`
precision highp float;
// Feature switches are compile-time #defines (set by Post.finish from the params), so disabled
// effects cost nothing: FX_CA FX_GLITCH FX_PIXELATE FX_SCAN FX_ZOOM FX_GRADE FX_FLASH FX_BLOOM FX_GRAIN
uniform sampler2D tScene;
uniform sampler2D tBloom;
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
  float y = max(m - knee, 0.0) / (1.0 - knee);
  float mm = m < knee ? m : knee + (1.0 - knee) * y / (1.0 + y);          // rational shoulder (cheap)
  vec3 r = c * (mm / max(m, 1e-6));
  float over = clamp((m - 1.0) * 0.35, 0.0, 1.0);
  return mix(r, vec3(mm), over * 0.85);
}
vec3 toSRGB(vec3 c) {
  // sqrt-chain approximation of the sRGB OETF (|err| < 0.002), much cheaper than pow() on SwiftShader
  c = clamp(c, 0.0, 1.0);
  vec3 s1 = sqrt(c), s2 = sqrt(s1), s3 = sqrt(s2);
  vec3 g = 0.662002687 * s1 + 0.684122060 * s2 - 0.323583601 * s3 - 0.0225411470 * c;
  return mix(c * 12.92, g, step(0.0031308, c));
}

#ifdef FX_ZOOM
vec3 sampleScene(vec2 uv) {
  vec3 acc = vec3(0.0);
  vec2 d = uv - uZoomCenter;
  for (int i = 0; i < 6; i++) acc += texture2D(tScene, uZoomCenter + d * (1.0 - uZoomBlur * float(i) / 6.0 * 0.25)).rgb;
  return acc / 6.0;
}
#else
#define sampleScene(uv) texture2D(tScene, uv).rgb
#endif

void main() {
  vec2 uv = vUv;
  vec2 fc = gl_FragCoord.xy;

#ifdef FX_PIXELATE
  vec2 px = vec2(uPixelate * uScale) / uRes;
  uv = (floor(uv / px) + 0.5) * px;
#endif

  vec2 split = vec2(0.0);
#ifdef FX_GLITCH
  float seed = uGlitchSeed < 0.0 ? uFrame : uGlitchSeed;
  float band = floor(uv.y * mix(18.0, 60.0, h01(vec3(seed, 7.0, 1.0))));
  float hb = h01(vec3(band, seed, 3.0));
  float onB = step(hb, uGlitch * 0.45);
  uv.x += onB * (h01(vec3(band, seed, 5.0)) - 0.5) * 0.12 * uGlitch;
  split.x += onB * (h01(vec3(band, seed, 9.0)) - 0.5) * 0.02 * uGlitch;
  vec2 blk = floor(uv * vec2(16.0, 9.0) * (1.0 + floor(h01(vec3(seed, 2.0, 2.0)) * 3.0)));
  float onK = step(h01(vec3(blk, seed + 11.0)), uGlitch * 0.12);
  uv += onK * (vec2(h01(vec3(blk, seed + 13.0)), h01(vec3(blk, seed + 17.0))) - 0.5) * 0.08 * uGlitch;
  split.y += onK * 0.004 * uGlitch;
  uv = clamp(uv, vec2(0.001), vec2(0.999));
#endif

  vec3 col;
#if defined(FX_CA) || defined(FX_GLITCH)
  vec2 d = uv - 0.5;
  float r2 = dot(d * vec2(uRes.x / uRes.y, 1.0), d * vec2(uRes.x / uRes.y, 1.0));
  vec2 off = d * uCA * (0.6 + 2.2 * r2) + split;
  vec2 offPx = off * uRes;
  col = sampleScene(uv);
  if (dot(offPx, offPx) > 0.12) {          // channels visibly split: two extra fetches
    col.r = sampleScene(uv + off).r;
    col.b = sampleScene(uv - off).b;
  }
#else
  col = sampleScene(uv);
#endif
#ifdef FX_BLOOM
  col += texture2D(tBloom, uv).rgb;
#endif

  col *= uExposure;
  col = toneMap(col);
  col = toSRGB(col);

  // grade (display space)
  col = uGain * (col + uLift * (1.0 - col));
#ifdef FX_GRADE
  col = pow(max(col, 0.0), 1.0 / max(uGamma, vec3(0.01)));
  col = (col - 0.5) * uContrast + 0.5;
  col = mix(col, col * uTint, uTintAmount);
  col = mix(col, 1.0 - col, uInvert);
#endif
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(l), col, uSaturation);

#ifdef FX_SCAN
  float sp = max(uScanSpacing * uScale, 1.0);
  float sl = 0.5 + 0.5 * cos(6.2831853 * (fc.y + uTime * uScanScroll * uScale) / sp);
  col *= 1.0 - uScan * 0.55 * sl;
#endif

  vec2 vd = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  float v = smoothstep(0.25, 1.05, length(vd) * 1.12);
  col *= 1.0 - uVignette * v * 0.95;

#ifdef FX_FLASH
  col = mix(col, vec3(1.0), min(uFlashWhite, 1.0));
  col = mix(col, vec3(0.0), min(uFlashBlack, 1.0));
  col = mix(col, vec3(0.0196, 0.0235, 0.0392), min(uFade, 1.0));
#endif

  // one integer hash per pixel -> grain (triangular, 2 x 16 bit) + dither
  uint hh = uhash(uvec3(uvec2(fc), uint(uFrame) + 7u));
  float n1 = float(hh & 0xffffu) / 65535.0;
#ifdef FX_GRAIN
  float n2 = float(hh >> 16u) / 65535.0;
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  // weighted toward mid tones so large dark areas stay clean for H.264
  float w = 0.18 + 0.82 * smoothstep(0.02, 0.35, lum) * (1.0 - 0.6 * smoothstep(0.7, 1.0, lum));
  col += (n1 + n2 - 1.0) * uGrain * 0.42 * w;
#endif
  col += (n1 - 0.5) / 255.0;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

// 4x4 box downsample (4 bilinear taps) + soft knee threshold: full-res HDR -> quarter-res bright
const BRIGHT_FRAG = /* glsl */`
precision highp float;
uniform sampler2D tSrc; uniform vec2 uSrcTexel; uniform float uThreshold; uniform float uKnee;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tSrc, vUv + uSrcTexel * vec2(-1.0, -1.0)).rgb
         + texture2D(tSrc, vUv + uSrcTexel * vec2( 1.0, -1.0)).rgb
         + texture2D(tSrc, vUv + uSrcTexel * vec2(-1.0,  1.0)).rgb
         + texture2D(tSrc, vUv + uSrcTexel * vec2( 1.0,  1.0)).rgb;
  c *= 0.25;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float k = clamp((l - uThreshold + uKnee) / (2.0 * uKnee), 0.0, 1.0);
  float w = max(l - uThreshold, 0.0) + k * k * uKnee * 0.5;
  gl_FragColor = vec4(c * (w / max(l, 1e-4)), 1.0);
}`;

// Bloom composite. Geometric falloff over the 5 blur mips (UnrealBloom's own weights put the most
// energy in the widest mips, which turns any busy frame into a uniform grey haze), then a toe on the
// result: after the sRGB encode even 0.003 linear of haze lifts VOID from 5/255 to 15/255, so the
// far tail of the glow is rolled off and large dark areas stay truly dark.
const COMPOSITE_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D blurTexture1, blurTexture2, blurTexture3, blurTexture4, blurTexture5;
uniform float bloomStrength, bloomRadius, bloomToe;
void main() {
  float f = mix(0.3, 0.9, bloomRadius);
  vec3 b = texture2D(blurTexture1, vUv).rgb;
  float w = f;
  b += w * texture2D(blurTexture2, vUv).rgb; w *= f;
  b += w * texture2D(blurTexture3, vUv).rgb; w *= f;
  b += w * texture2D(blurTexture4, vUv).rgb; w *= f;
  b += w * texture2D(blurTexture5, vUv).rgb;
  b *= bloomStrength;
  float L = dot(b, vec3(0.2126, 0.7152, 0.0722));
  b *= L / (L + bloomToe + 1e-9);
  gl_FragColor = vec4(b, 1.0);
}`;

/**
 * UnrealBloom (mip chain of separable gaussians + weighted composite, three's UnrealBloomPass
 * shaders) run at quarter resolution from a box-filtered bright pass. The composite is sampled
 * by the final pass instead of an extra full-res additive blit. ~5x cheaper on SwiftShader.
 */
class QuarterBloom extends UnrealBloomPass {
  constructor(W, H, type = THREE.FloatType) {
    super(new THREE.Vector2(Math.round(W / 2), Math.round(H / 2)), 0.8, 0.55, 0.12);
    // Float32 targets: on SwiftShader they are ~3x cheaper to sample than HalfFloat (no conversion)
    if (type !== THREE.HalfFloatType) {
      const re = (rt) => { const n = new THREE.WebGLRenderTarget(rt.width, rt.height, { type, depthBuffer: false }); n.texture.generateMipmaps = false; rt.dispose(); return n; };
      this.renderTargetBright = re(this.renderTargetBright);
      this.renderTargetsHorizontal = this.renderTargetsHorizontal.map(re);
      this.renderTargetsVertical = this.renderTargetsVertical.map(re);
      for (let i = 0; i < this.nMips; i++) this.compositeMaterial.uniforms['blurTexture' + (i + 1)].value = this.renderTargetsVertical[i].texture;
    }
    this.brightMat = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT_SRC, fragmentShader: BRIGHT_FRAG, depthTest: false, depthWrite: false,
      uniforms: { tSrc: { value: null }, uSrcTexel: { value: new THREE.Vector2(1 / W, 1 / H) }, uThreshold: { value: 0.2 }, uKnee: { value: 0.1 } },
    });
    const cu = { bloomStrength: { value: 1 }, bloomRadius: { value: 0.35 }, bloomToe: { value: 0.012 } };
    for (let i = 0; i < this.nMips; i++) cu['blurTexture' + (i + 1)] = { value: this.renderTargetsVertical[i].texture };
    this.compositeMaterial.dispose();
    this.compositeMaterial = new THREE.ShaderMaterial({ vertexShader: QUAD_VERT_SRC, fragmentShader: COMPOSITE_FRAG, uniforms: cu, depthTest: false, depthWrite: false });
    this.toe = 0.012;
  }
  /** returns the composited bloom texture (quarter res, strength applied) */
  renderBloom(renderer, srcTexture) {
    const oldAuto = renderer.autoClear;
    renderer.autoClear = false;
    renderer.getClearColor(this._oldClearColor);
    const oldAlpha = renderer.getClearAlpha();
    renderer.setClearColor(this.clearColor, 0);
    this.brightMat.uniforms.tSrc.value = srcTexture;
    this.brightMat.uniforms.uThreshold.value = this.threshold;
    this.fsQuad.material = this.brightMat;
    renderer.setRenderTarget(this.renderTargetBright);
    this.fsQuad.render(renderer);
    let input = this.renderTargetBright;
    for (let i = 0; i < this.nMips; i++) {
      const m = this.separableBlurMaterials[i];
      this.fsQuad.material = m;
      m.uniforms.colorTexture.value = input.texture;
      m.uniforms.direction.value = UnrealBloomPass.BlurDirectionX;
      renderer.setRenderTarget(this.renderTargetsHorizontal[i]);
      this.fsQuad.render(renderer);
      m.uniforms.colorTexture.value = this.renderTargetsHorizontal[i].texture;
      m.uniforms.direction.value = UnrealBloomPass.BlurDirectionY;
      renderer.setRenderTarget(this.renderTargetsVertical[i]);
      this.fsQuad.render(renderer);
      input = this.renderTargetsVertical[i];
    }
    this.fsQuad.material = this.compositeMaterial;
    this.compositeMaterial.uniforms.bloomStrength.value = this.strength;
    this.compositeMaterial.uniforms.bloomRadius.value = this.radius;
    this.compositeMaterial.uniforms.bloomToe.value = this.toe;
    renderer.setRenderTarget(this.renderTargetsHorizontal[0]);
    this.fsQuad.render(renderer);
    renderer.setClearColor(this._oldClearColor, oldAlpha);
    renderer.autoClear = oldAuto;
    return this.renderTargetsHorizontal[0].texture;
  }
}

const QUAD_VERT = QUAD_VERT_SRC;

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
    // Float32 HDR targets (EXT_color_buffer_float + EXT_float_blend + OES_texture_float_linear):
    // cheaper than HalfFloat on SwiftShader for both writes and texture reads.
    const rtType = opts.halfFloat ? THREE.HalfFloatType : THREE.FloatType;
    const rtOpts = { type: rtType, depthBuffer: true, samples: opts.samples ?? 0 };
    this.samples = rtOpts.samples;
    this.sceneRT = new THREE.WebGLRenderTarget(W, H, rtOpts);
    this.sceneRT.texture.name = 'post.scene';
    this.auxA = new THREE.WebGLRenderTarget(W, H, rtOpts);
    this.auxB = new THREE.WebGLRenderTarget(W, H, rtOpts);
    this.echoRT = new THREE.WebGLRenderTarget(Math.round(W / 2), Math.round(H / 2), { type: rtType, depthBuffer: true });
    this.bloom = new QuarterBloom(W, H, rtType);

    this.finalMat = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT,
      fragmentShader: FINAL_FRAG,
      depthTest: false, depthWrite: false,
      uniforms: {
        tScene: { value: this.sceneRT.texture }, tBloom: { value: null },
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
      this.bloom.toe = p.bloomToe;
      u.tBloom.value = this.bloom.renderBloom(r, this.sceneRT.texture);
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
    // compile-time feature switches (each combination compiles once, then is cached by three)
    const eq = (a, v) => a.every((x) => Math.abs(x - v) < 1e-6);
    const defs = {};
    if (p.ca > 0.00005) defs.FX_CA = 1;
    if (p.glitch > 0.001) defs.FX_GLITCH = 1;
    if (p.pixelate > 1.0) defs.FX_PIXELATE = 1;
    if (p.scanlines > 0.001) defs.FX_SCAN = 1;
    if (p.zoomBlur > 0.001) defs.FX_ZOOM = 1;
    if (!eq(p.gamma, 1) || Math.abs(p.contrast - 1) > 1e-4 || p.tintAmount > 0.001 || p.invert > 0.001) defs.FX_GRADE = 1;
    if (p.flashWhite > 0.001 || p.flashBlack > 0.001 || p.fade > 0.001) defs.FX_FLASH = 1;
    if (p.bloom > 0.001) defs.FX_BLOOM = 1;
    if (p.grain > 0.0001) defs.FX_GRAIN = 1;
    const key = Object.keys(defs).join(',');
    if (key !== this._defKey) {
      this._defKey = key;
      this.finalMat.defines = defs;
      this.finalMat.needsUpdate = true;
    }
    r.setRenderTarget(null);
    this.finalQuad.render(r);
  }
}

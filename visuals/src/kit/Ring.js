// Ring — the AI: a perfect halo (loading spinner / pupil / eclipse corona). SDF shader on a plane,
// sharp at any size. Thin AI_WHITE core + AI_CYAN glow + rotating arc segments + an inner band of
// streaming monospace characters.
//
//   const ring = new Ring(ctx, { radius: 1 });   scene.add(ring);
//   ring.update(t, { pulse: audio.pulse('kick', t, 0.12), speak: audio.env('vox_ai', t) });
//
// States: pulse (0..1, kick)   speak (0..1, AI vocal -> brightness + ripples)   colorMix (0 cyan -> 1 amber)
//   breakSegments (0..1, arcs detach and fall)   thumbsMode (0..1, surface becomes a mosaic of 👍)
//   thumbScale (world size of a thumb cell)      brightness   opacity   bandOpacity (char band)
//   streamSpeed (band rotation multiplier)       spin (arc rotation multiplier)   corona (outer haze)
// irisText(str | null): show a custom string in the band (her own words) instead of random data.
import * as THREE from 'three';
import { GlyphAtlas } from './atlas.js';
import { col } from '../core/palette.js';

const VERT = /* glsl */`
varying vec2 vP;
uniform float uExtent;
void main() { vP = (uv * 2.0 - 1.0) * uExtent; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const FRAG = /* glsl */`
precision highp float;
varying vec2 vP;
uniform float uTime, uR, uPulse, uSpeak, uColorMix, uBreak, uThumbs, uThumbScale, uBright, uOpacity;
uniform float uBandOpacity, uStream, uSpin, uCorona, uUseText, uTextLen;
uniform vec3 uCore, uGlow, uCoreB, uGlowB;
uniform sampler2D uAtlas; uniform vec2 uAtlasGrid;
uniform sampler2D uText;
uniform float uThumbIdx, uRandBase, uRandCount;
uniform sampler2D uPool;

#define TAU 6.28318530718
float h11(float n) { return fract(sin(n * 127.1 + 311.7) * 43758.5453); }
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float aaBand(float d, float w, float px) { return 1.0 - smoothstep(w - px, w + px, abs(d)); }

// one track of N arc segments on radius rr, angular rotation rot, thickness th
float track(vec2 p, float rr, float n, float rot, float th, float seed, float fill, float px) {
  float r = length(p);
  float a = atan(p.y, p.x) - rot;
  a = mod(a, TAU);
  float idx = floor(a / TAU * n);
  float local = fract(a / TAU * n);
  float len = mix(0.25, 0.85, h11(idx + seed)) * fill;
  float on = step(h11(idx * 3.1 + seed), 0.82);
  float edge = (min(local, len - local)) * TAU / n * rr;          // arc-length distance to segment ends
  float d = max(abs(r - rr) - th, -edge);
  return on * (1.0 - smoothstep(-px, px, d)) * (0.75 + 0.35 * h11(idx + seed * 7.0));
}

#ifdef RING_BREAK
// breaking: evaluate each segment of the outer track separately with its own fall transform
float brokenTrack(vec2 p, float rr, float n, float rot, float th, float seed, float px) {
  float acc = 0.0;
  for (int i = 0; i < 12; i++) {
    float fi = float(i);
    if (fi >= n) break;
    float thr = h11(fi * 5.3 + seed) * 0.8;
    float f = clamp((uBreak - thr) / 0.35, 0.0, 1.0);
    float a0 = (fi / n) * TAU + rot;
    float len = mix(0.25, 0.85, h11(fi + seed)) * TAU / n;
    vec2 c = vec2(cos(a0 + len * 0.5), sin(a0 + len * 0.5)) * rr;
    // fall: translate down with gravity, drift outward, rotate about the segment center
    vec2 q = p - c;
    q.y += f * f * 1.8 * uR;
    q -= normalize(c) * f * 0.25 * uR;
    float ang = f * (h11(fi + 9.0) - 0.5) * 2.5;
    q = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * q;
    q += c;
    float r = length(q);
    float a = mod(atan(q.y, q.x) - a0, TAU);
    float edge = min(a, len - a) * rr;
    float d = max(abs(r - rr) - th, -edge);
    float on = step(h11(fi * 3.1 + seed), 0.82);
    acc += on * (1.0 - smoothstep(-px, px, d)) * (1.0 - f * f * 0.6);
  }
  return acc;
}
#endif

// explicit LOD: implicit derivatives are undefined inside non-uniform control flow (early returns),
// which made mip selection (and thus pixels) nondeterministic.
float glyph(float idx, vec2 uv, float lod) {
  idx = floor(idx + 0.5);
  vec2 cell = vec2(mod(idx, uAtlasGrid.x), floor(idx / uAtlasGrid.x));
  vec2 g = (cell + vec2(uv.x, 1.0 - uv.y)) / uAtlasGrid;
  g.y = 1.0 - g.y;
  return textureLod(uAtlas, g, lod).a;
}

// character band between r0 and r1 with N rows streaming around the circle
float band(vec2 p, float r0, float r1, float rows, float px) {
  float r = length(p);
  if (r < r0 || r > r1) return 0.0;
  float rowH = (r1 - r0) / rows;
  float row = floor((r - r0) / rowH);
  float rr = r0 + (row + 0.5) * rowH;
  float cells = floor(TAU * rr / (rowH * 0.62));
  float dir = mod(row, 2.0) < 0.5 ? 1.0 : -1.0;
  float a = atan(p.y, p.x) + dir * uTime * uStream * (0.05 + 0.03 * row);
  float u = mod(a, TAU) / TAU * cells;
  float ci = floor(u);
  vec2 luv = vec2(fract(u), fract((r - r0) / rowH));
  // glyph upright with its top pointing outward; mirror x so it reads clockwise
  luv = vec2(1.0 - luv.x, luv.y);
  luv = (luv - 0.5) * vec2(1.0, 1.15) + 0.5;
  float idx;
  if (uUseText > 0.5) {
    float k = mod(-ci + row * 37.0 + 4096.0 * uTextLen, uTextLen);   // clockwise reading order
    idx = floor(texelFetch(uText, ivec2(int(k), 0), 0).r * 255.0 + 0.5);
  } else {
    float step_ = floor(uTime * 9.0 + h11(ci + row * 101.0) * 40.0);
    float pick = floor(h21(vec2(ci + row * 57.0, step_)) * uRandCount);
    idx = floor(texelFetch(uPool, ivec2(int(pick), 0), 0).r * 255.0 + 0.5);
  }
  if (luv.x < 0.0 || luv.x > 1.0 || luv.y < 0.0 || luv.y > 1.0) return 0.0;
  float lod = max(0.0, log2(64.0 * px / rowH));            // atlas cell = 64 texels spans rowH world units
  float gl = glyph(idx, luv, lod);
  // streaming highlight wave + random bright cells
  float wave = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(a * 3.0 - uTime * 2.2 + row), 6.0);
  float spark = step(0.93, h21(vec2(ci, floor(uTime * 6.0) + row)));
  return gl * (0.28 + 0.5 * wave + 0.6 * spark);
}

// full ring intensity (core, glow, arcs, ripples) -> vec2(coreAmount, glowAmount)
vec3 ringField(vec2 p, float px) {
  float R = uR * (1.0 + 0.025 * uPulse);
  float r = length(p);
  float d = r - R;
  float core = aaBand(d, 0.0035 * uR, px) * 1.6;
  float glow = exp(-abs(d) / (0.022 * uR)) * 0.55 + exp(-abs(d) / (0.08 * uR)) * 0.22;
  float corona = exp(-pow(max(d, 0.0) / (0.45 * uR), 1.4)) * 0.11 * uCorona * smoothstep(-0.02, 0.05, d / uR);
  float arcs = 0.0;
  float t = uTime * uSpin;
#ifdef RING_BREAK
  arcs += brokenTrack(p, R * 1.075, 9.0, t * 0.35, 0.006 * uR, 3.0, px) * 0.9;
#else
  arcs += track(p, R * 1.075, 9.0, t * 0.35, 0.006 * uR, 3.0, 1.0, px) * 0.9;
#endif
  arcs += track(p, R * 1.13, 22.0, -t * 0.22, 0.0028 * uR, 11.0, 0.55, px) * 0.55;
  arcs += track(p, R * 0.935, 4.0, t * 0.9, 0.004 * uR, 17.0, 1.0, px) * 0.8;
  // speak ripples expanding outward
  float rip = 0.0;
  if (uSpeak > 0.0) {
    for (int k = 0; k < 3; k++) {
      float ph = fract(uTime * 0.9 + float(k) / 3.0);
      float rk = R + ph * 0.5 * uR;
      rip += exp(-pow((r - rk) / (0.012 * uR), 2.0)) * (1.0 - ph) * uSpeak;
    }
  }
  return vec3(core, glow + corona + rip * 0.6, arcs);
}

void main() {
  vec2 p = vP;
  float px = fwidth(p.x) * 0.8 + 1e-5;
  vec3 coreC = mix(uCore, uCoreB, uColorMix);
  vec3 glowC = mix(uGlow, uGlowB, uColorMix);
  float k = 1.0 + 0.6 * uPulse + 0.8 * uSpeak;
  vec3 f = ringField(p, px);
  vec3 col = coreC * f.x * k + glowC * f.y * k + mix(glowC, coreC, 0.5) * f.z * (0.9 + 0.3 * uPulse);
  float b = band(p, uR * 0.74, uR * 0.885, 3.0, px);
  col += glowC * b * uBandOpacity * (0.8 + 0.4 * uSpeak);
  if (uThumbs > 0.0) {
    // mosaic of tiny thumbs-up icons whose brightness follows the ring field at each cell
    vec2 cell = floor(p / uThumbScale);
    vec2 cc = (cell + 0.5) * uThumbScale;
    vec3 fc = ringField(cc, px);
    float inten = fc.x * 0.6 + fc.y * 1.4 + fc.z * 0.5 + band(cc, uR * 0.74, uR * 0.885, 3.0, px) * 0.4;
    inten = max(inten - 0.035, 0.0) * smoothstep(0.035, 0.12, inten);
    vec2 luv = fract(p / uThumbScale);
    float ic = glyph(uThumbIdx, luv, max(0.0, log2(64.0 * px / uThumbScale)));
    vec3 tc = mix(glowC, coreC, clamp(inten * 0.5, 0.0, 1.0)) * ic * inten * 1.4;
    col = mix(col, tc, uThumbs);
  }
  col *= uBright * uOpacity;
  gl_FragColor = vec4(col, 1.0);
}`;

export class Ring extends THREE.Group {
  constructor(ctx, { radius = 1, extent = 1.75, segments = 1 } = {}) {
    super();
    this.ctx = ctx;
    const atlas = GlyphAtlas.get(ctx);
    this.atlas = atlas;
    // random pool texture (glyph indices for data streams)
    const pool = new Uint8Array(atlas.randomPool.length * 4);
    atlas.randomPool.forEach((g, i) => { pool[i * 4] = g; });
    const poolTex = new THREE.DataTexture(pool, atlas.randomPool.length, 1, THREE.RGBAFormat);
    poolTex.needsUpdate = true;
    this.textTex = new THREE.DataTexture(new Uint8Array(256 * 4), 256, 1, THREE.RGBAFormat);
    this.textTex.needsUpdate = true;
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG,
      uniforms: {
        uExtent: { value: extent * radius }, uTime: { value: 0 }, uR: { value: radius }, uPulse: { value: 0 },
        uSpeak: { value: 0 }, uColorMix: { value: 0 }, uBreak: { value: 0 }, uThumbs: { value: 0 },
        uThumbScale: { value: 0.03 * radius }, uBright: { value: 1 }, uOpacity: { value: 1 },
        uBandOpacity: { value: 1 }, uStream: { value: 1 }, uSpin: { value: 1 }, uCorona: { value: 1 },
        uUseText: { value: 0 }, uTextLen: { value: 1 },
        uCore: { value: col('AI_WHITE') }, uGlow: { value: col('AI_CYAN') },
        uCoreB: { value: col('#FFF1DE') }, uGlowB: { value: col('HUMAN_AMBER') },
        uAtlas: { value: atlas.texture }, uAtlasGrid: { value: new THREE.Vector2(atlas.cols, atlas.rows) },
        uText: { value: this.textTex }, uThumbIdx: { value: atlas.icon('THUMB_UP') },
        uPool: { value: poolTex }, uRandCount: { value: atlas.randomPool.length }, uRandBase: { value: 0 },
      },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    const size = extent * radius * 2;
    this.plane = new THREE.Mesh(new THREE.PlaneGeometry(size, size), this.material);
    this.add(this.plane);
    Object.assign(this, { pulse: 0, speak: 0, colorMix: 0, breakSegments: 0, thumbsMode: 0, thumbScale: 0.03 * radius,
      brightness: 1, opacity: 1, bandOpacity: 1, streamSpeed: 1, spin: 1, corona: 1, radius });
    this._text = null;
  }

  /** show a custom string in the character band (null = random data stream) */
  irisText(str) {
    this._text = str;
    if (!str) { this.material.uniforms.uUseText.value = 0; return this; }
    const chars = [...(str + '   ')].slice(0, 256);
    const data = this.textTex.image.data;
    chars.forEach((ch, i) => { data[i * 4] = this.atlas.index(ch === ' ' ? '·' : ch); });
    this.textTex.needsUpdate = true;
    this.material.uniforms.uUseText.value = 1;
    this.material.uniforms.uTextLen.value = chars.length;
    return this;
  }

  update(t, states = {}) {
    Object.assign(this, { pulse: 0, speak: 0, colorMix: 0, breakSegments: 0, thumbsMode: 0, thumbScale: 0.03 * this.radius, brightness: 1, opacity: 1, bandOpacity: 1, streamSpeed: 1, spin: 1, corona: 1 }, states);   // per-frame defaults (no carry-over)
    const u = this.material.uniforms;
    u.uTime.value = t;
    u.uPulse.value = this.pulse; u.uSpeak.value = this.speak; u.uColorMix.value = this.colorMix;
    u.uBreak.value = this.breakSegments; u.uThumbs.value = this.thumbsMode; u.uThumbScale.value = this.thumbScale;
    u.uBright.value = this.brightness; u.uOpacity.value = this.opacity; u.uBandOpacity.value = this.bandOpacity;
    u.uStream.value = this.streamSpeed; u.uSpin.value = this.spin; u.uCorona.value = this.corona;
    const wantBreak = this.breakSegments > 0.001;
    if (wantBreak !== !!this.material.defines.RING_BREAK) {
      if (wantBreak) this.material.defines.RING_BREAK = 1; else delete this.material.defines.RING_BREAK;
      this.material.needsUpdate = true;
    }
    this.visible = this.opacity > 0.001;
    return this;
  }

  /** sample n points on the ring (local xyz) — e.g. targets for Silhouette.dissolveTo */
  samplePoints(n, seed = 1) {
    const out = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.sin(i * 12.9898 + seed) * 0.002;
      const rr = this.radius * (1 + (Math.sin(i * 78.233 + seed) * 0.5) * 0.02);
      out[i * 3] = Math.cos(a) * rr; out[i * 3 + 1] = Math.sin(a) * rr; out[i * 3 + 2] = Math.sin(i * 3.7) * 0.01;
    }
    return out;
  }
}

// CityWindows — the city outside: thousands of windows on layered facades, each glowing with the
// same small cyan screen. Not only her. (Instanced soft rects, additive; parallax comes from depth.)
//
//   const city = new CityWindows(ctx, { count: 3000, seed: 'city' });  scene.add(city);
//   city.update(t, { density: 0.8, flicker: 0.2 });
//
// States: density (0..1 fraction of lit windows)  flicker (0..1 rate of windows toggling, seeded)
//   warmRatio (fraction of warm/amber windows)  brightness  opacity  outline (building edge lines 0..1)
import * as THREE from 'three';
import { rng } from '../core/rng.js';
import { col } from '../core/palette.js';
import { GlowLines } from './lines.js';
import { expandInstanced } from '../core/geom.js';

const VERT = /* glsl */`
attribute vec3 aPos;
attribute vec2 aSize;
attribute vec4 aRnd;
uniform float uTime, uDensity, uFlicker;
varying vec2 vUv;
varying vec4 vR;
varying float vOn;
void main() {
  vec3 p = aPos + vec3(position.xy * aSize, 0.0);
  vUv = position.xy + 0.5;
  vR = aRnd;
  // lit if rank < density; flicker toggles some windows at seeded, quantized times
  float slot = floor(uTime * (0.6 + aRnd.z * 1.4) + aRnd.w * 50.0);
  float h = fract(sin(slot * 91.7 + aRnd.x * 437.0) * 4375.5453);
  float on = step(aRnd.x, uDensity);
  on = mix(on, step(0.5, h), step(1.0 - uFlicker * 0.35, aRnd.y));
  vOn = on;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const FRAG = /* glsl */`
uniform vec3 uCyan, uWarm, uDim;
uniform float uWarmRatio, uBright, uOpacity;
varying vec2 vUv;
varying vec4 vR;
varying float vOn;
void main() {
  vec2 q = abs(vUv - 0.5) * 2.0;
  float px = fwidth(vUv.x) * 2.0 + 1e-4;
  float rect = (1.0 - smoothstep(0.86 - px, 0.86 + px, q.x)) * (1.0 - smoothstep(0.8 - px, 0.8 + px, q.y));
  // the screen: a brighter spot low in the window
  float scr = exp(-pow((vUv.x - 0.5 - (vR.z - 0.5) * 0.4) / 0.18, 2.0) - pow((vUv.y - 0.3) / 0.16, 2.0));
  vec3 c = vR.y < uWarmRatio ? uWarm : uCyan;
  vec3 col = (c * (0.12 + 0.9 * scr) * vOn + uDim * 0.03) * rect;
  gl_FragColor = vec4(col * uBright * uOpacity * (0.6 + 0.6 * vR.w), 1.0);
}`;

export class CityWindows extends THREE.Group {
  constructor(ctx, { count = 3200, seed = 'city', zNear = -7, zFar = -40, width = 60, W = ctx.W, H = ctx.H } = {}) {
    super();
    const R = rng(seed);
    const pos = [], size = [], rnd = [], edges = [];
    let n = 0;
    // buildings in depth layers; windows on a grid per facade
    while (n < count) {
      const z = zNear + (zFar - zNear) * Math.pow(R.next(), 0.7);
      const bw = R.range(2.5, 7) * (1 + (-z) / 30);
      const bh = R.range(6, 26) * (1 + (-z) / 40);
      const bx = R.range(-width / 2, width / 2) * (1 + (-z) / 25);
      const by = -6 + R.range(-1, 1);
      const cols = Math.max(2, Math.floor(bw / 0.9)), rows = Math.max(3, Math.floor(bh / 1.1));
      const ww = (bw / cols) * 0.55, wh = (bh / rows) * 0.5;
      for (let j = 0; j < rows && n < count; j++) for (let i = 0; i < cols && n < count; i++) {
        pos.push(bx - bw / 2 + (i + 0.5) * (bw / cols), by + (j + 0.5) * (bh / rows), z);
        size.push(ww, wh);
        rnd.push(R.next(), R.next(), R.next(), R.next());
        n++;
      }
      edges.push([bx - bw / 2, by, z, bx - bw / 2, by + bh, z], [bx - bw / 2, by + bh, z, bx + bw / 2, by + bh, z], [bx + bw / 2, by + bh, z, bx + bw / 2, by, z]);
    }
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    geo.setAttribute('aPos', new THREE.InstancedBufferAttribute(new Float32Array(pos), 3));
    geo.setAttribute('aSize', new THREE.InstancedBufferAttribute(new Float32Array(size), 2));
    geo.setAttribute('aRnd', new THREE.InstancedBufferAttribute(new Float32Array(rnd), 4));
    geo.instanceCount = n;
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG,
      uniforms: {
        uTime: { value: 0 }, uDensity: { value: 0.8 }, uFlicker: { value: 0.2 }, uWarmRatio: { value: 0.08 },
        uBright: { value: 1 }, uOpacity: { value: 1 },
        uCyan: { value: col('AI_CYAN') }, uWarm: { value: col('HUMAN_AMBER') }, uDim: { value: col('AI_DEEP') },
      },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.mesh = new THREE.Mesh(expandInstanced(geo), this.material);
    this.mesh.frustumCulled = false;
    this.add(this.mesh);
    this.outlines = new GlowLines({ width: 1, glow: 2, W, H, brightness: 0.06, color: '#1B6FFF' });
    this.outlines.setSegments(edges);
    this.add(this.outlines);
    Object.assign(this, { density: 0.8, flicker: 0.2, warmRatio: 0.08, brightness: 1, opacity: 1, outline: 1 });
  }
  update(t, states = {}) {
    Object.assign(this, states);
    const u = this.material.uniforms;
    u.uTime.value = t; u.uDensity.value = this.density; u.uFlicker.value = this.flicker;
    u.uWarmRatio.value = this.warmRatio; u.uBright.value = this.brightness; u.uOpacity.value = this.opacity;
    this.outlines.brightness = 0.06 * this.outline * this.opacity;
    this.visible = this.opacity > 0.001;
    return this;
  }
}

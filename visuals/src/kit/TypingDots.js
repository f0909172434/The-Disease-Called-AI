// TypingDots — "• • •" as three glossy 3D pearls/pills (analytic sphere impostors: perfect edges at
// any size). Each pulses with an inner glow in sequence.
//
//   const dots = new TypingDots(ctx, { radius: 0.18, spacing: 0.5 });  scene.add(dots);
//   dots.update(t, { phase: audio.beat(t) * 2 });        // one step per 8th note: dot (step % 3) lights
//
// States: phase (float steps; dot i lights when floor(phase) % 3 == i, decays over ~2 steps)
//   glow (array of 3 overrides 0..1, or null)   color (THREE.Color glow)   freeze (0..1: stop + tint)
//   freezeColor (THREE.Color, default FEVER)    vanish ([v0,v1,v2] 0..1: pop + shrink away)
//   brightness   opacity   fog (0..1 breath fog on the glass: softens + whitens)
import * as THREE from 'three';
import { col } from '../core/palette.js';

const VERT = /* glsl */`
attribute vec3 aCenter;
attribute float aIndex;
uniform float uRadius;
uniform vec3 uScale;      // per-dot scale (vanish)
varying vec2 vUv;
varying float vIdx;
void main() {
  float s = aIndex < 0.5 ? uScale.x : (aIndex < 1.5 ? uScale.y : uScale.z);
  vec4 c = modelViewMatrix * vec4(aCenter, 1.0);
  vec2 corner = position.xy;                      // -1..1
  c.xy += corner * uRadius * s * 1.08;
  vUv = corner * 1.08;
  vIdx = aIndex;
  gl_Position = projectionMatrix * c;
}`;

const FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
varying float vIdx;
uniform vec3 uGlow, uFreezeC, uBody;
uniform vec3 uG;           // glow per dot
uniform float uFreeze, uBright, uOpacity, uFog;
void main() {
  float r = length(vUv);
  float px = fwidth(r) * 1.2 + 1e-4;
  float cov = 1.0 - smoothstep(1.0 - px, 1.0 + px, r);
  if (cov <= 0.0) discard;
  vec3 n = vec3(vUv, sqrt(max(0.0, 1.0 - min(r * r, 1.0))));
  vec3 v = vec3(0.0, 0.0, 1.0);
  vec3 rf = reflect(-v, n);
  float g = vIdx < 0.5 ? uG.x : (vIdx < 1.5 ? uG.y : uG.z);
  vec3 glowC = mix(uGlow, uFreezeC, uFreeze);
  // body: dark glossy lacquer with subsurface glow from the core
  vec3 col = uBody * (0.35 + 0.65 * n.z);
  col += glowC * g * (0.25 + 1.6 * pow(n.z, 2.2));
  col += glowC * (0.04 + 0.12 * g) * pow(1.0 - n.z, 1.5);                    // rim
  // studio reflections: soft top softbox band + a sharp key highlight
  float band = smoothstep(0.35, 0.7, rf.y) * smoothstep(1.0, 0.75, rf.y) * smoothstep(0.85, 0.2, abs(rf.x));
  col += vec3(0.85, 0.95, 1.0) * band * 0.22;
  vec3 L = normalize(vec3(-0.45, 0.6, 0.65));
  col += vec3(1.0) * pow(max(dot(rf, L), 0.0), 90.0) * 1.6;
  col += vec3(0.7, 0.9, 1.0) * pow(max(dot(rf, normalize(vec3(0.6, -0.3, 0.7))), 0.0), 30.0) * 0.15;
  // pearl iridescence at grazing angles
  float f = pow(1.0 - n.z, 3.0);
  col += vec3(0.25, 0.05, 0.35) * f * 0.25 + vec3(0.0, 0.25, 0.3) * f * 0.2;
  col = mix(col, vec3(0.75, 0.85, 0.9) * (0.3 + g), uFog * 0.5);
  col *= uBright;
  gl_FragColor = vec4(col * cov * uOpacity, cov * uOpacity);
}`;

export class TypingDots extends THREE.Group {
  constructor(ctx, { radius = 0.18, spacing = 0.52 } = {}) {
    super();
    this.ctx = ctx;
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    geo.setAttribute('aCenter', new THREE.InstancedBufferAttribute(new Float32Array([-spacing, 0, 0, 0, 0, 0, spacing, 0, 0]), 3));
    geo.setAttribute('aIndex', new THREE.InstancedBufferAttribute(new Float32Array([0, 1, 2]), 1));
    geo.instanceCount = 3;
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG,
      uniforms: {
        uRadius: { value: radius }, uScale: { value: new THREE.Vector3(1, 1, 1) },
        uGlow: { value: col('AI_CYAN') }, uFreezeC: { value: col('FEVER') }, uBody: { value: col('#0d1622') },
        uG: { value: new THREE.Vector3() }, uFreeze: { value: 0 }, uBright: { value: 1 }, uOpacity: { value: 1 }, uFog: { value: 0 },
      },
      transparent: true, depthWrite: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.add(this.mesh);
    Object.assign(this, { phase: 0, glow: null, freeze: 0, vanish: [0, 0, 0], brightness: 1, opacity: 1, fog: 0, radius, spacing });
    this.color = this.material.uniforms.uGlow.value;
    this.freezeColor = this.material.uniforms.uFreezeC.value;
    this._frozenPhase = null;
  }

  /** glow of dot i for a phase in steps */
  static glowAt(phase, i) {
    const k = Math.floor(phase);
    let n = k - (((k - i) % 3) + 3) % 3;     // last step <= k lighting dot i
    const dt = phase - n;
    return Math.exp(-dt * 1.6);
  }

  update(t, states = {}) {
    Object.assign(this, states);
    const u = this.material.uniforms;
    const g = this.glow || [0, 1, 2].map((i) => TypingDots.glowAt(this.phase, i));
    u.uG.value.set(g[0], g[1], g[2]);
    const sc = this.vanish.map((v) => {
      if (v <= 0) return 1;
      if (v < 0.25) return 1 + 0.18 * Math.sin((v / 0.25) * Math.PI * 0.5);
      return Math.max(0, 1.18 * (1 - (v - 0.25) / 0.75) ** 2);
    });
    u.uScale.value.set(sc[0], sc[1], sc[2]);
    u.uFreeze.value = this.freeze;
    u.uBright.value = this.brightness;
    u.uOpacity.value = this.opacity;
    u.uFog.value = this.fog;
    this.visible = this.opacity > 0.001;
    return this;
  }
}

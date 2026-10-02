// S00 · INTRO "BOOT" — bars 1–8 (0.000 – 11.163 s). Reference scene: read this before writing others.
//
// 0.1  b1–b2   extreme close-up, locked: a cyan ▍ cursor on black; it brightens on each heartbeat
//              (lub 100%, dub 60%) and the screen's RGB subpixel grid glimmers around it.
// 0.2  b3–b4   slow dolly out: amber serif italic typing from events.typing ("are yuo" -> 3x backspace
//              -> "you there?"), input underline, a micro camera push on every key.
// 0.3  b5.1    "Always." appears in ONE frame (cyan mono, AI bubble), white bloom flash 0.25 s; her
//              profile is lit for the first time, from the screen side.
// 0.4  b5–b7   slow ~28° orbit around her profile, dust motes in the light beam (heartbeat-lit), then
//              a push toward her eye.
// 0.5  b8      macro Eye: the cornea reflects "Always.", the pupil dilates with the riser and swallows
//              the frame; b8.4 -> one beat of black. Hard cut to S01 on b9.1.
//
// Conventions shown here: every value is computed from t (no state between frames); musical times
// come from ctx.audio.time(bar, beat); events from ctx.audio.events(); kit objects are created once in
// init() and fully re-posed in update(t).
import * as THREE from 'three';
import { C, col } from '../core/palette.js';
import { applyCamera } from '../core/camera.js';
import { clamp, lerp, inOutSine, outCubic, inQuad, smoothstep, inOutCubic } from '../core/ease.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export default {
  id: 'S00',
  lyricMode: 'subtitle-only',          // EN is inside the interface; only the ZH line is subtitled
  transitionIn: { type: 'cut' },

  init(ctx) {
    const { audio, kit: K, text } = ctx;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, ctx.W / ctx.H, 0.001, 60);

    // ---- musical anchors
    this.b3 = audio.time(3); this.b5 = audio.time(5); this.b7 = audio.time(7);
    this.b8 = audio.time(8); this.b84 = audio.time(8, 4); this.b9 = audio.time(9);
    this.typing = audio.events('typing');
    const enter = this.typing.find((e) => e.ch === '\n');
    this.sendT = enter ? enter.t : this.b5 - 0.11;
    const aiSend = audio.events('send').find((e) => e.who === 'ai');
    this.alwaysT = aiSend ? aiSend.t : this.b5;
    const keys = this.typing.filter((e) => e.ch !== '\n');
    this.keyTimes = keys.map((e) => e.t);
    this.firstKey = keys.length ? keys[0].t : this.b3 + 0.15;
    this.lastKey = keys.length ? keys[keys.length - 1].t : this.sendT;

    // ---- her
    this.her = new K.Silhouette(ctx);
    this.scene.add(this.her);

    // ---- the interface floating in the void (in front of her face, facing the camera)
    this.G = V(0.8, -0.07, 0.06);
    this.ui = new THREE.Group();
    this.ui.position.copy(this.G);
    this.scene.add(this.ui);
    this.typed = new K.TypedText(ctx, this.typing, { role: 'human', size: 120, color: C.HUMAN_AMBER }, { height: 0.13, lcd: 0.0062 });
    this.ui.add(this.typed);
    this.cursor = new K.ScreenCursor(ctx, { size: [1, 1], pitch: 0.0062, cursor: [0.036, 0.086] });
    this.cursor.position.set(0.0, 0.03, -0.002);
    this.ui.add(this.cursor);
    this.underline = new K.GlowLines({ width: 1.3, glow: 4, W: ctx.W, H: ctx.H, color: 'AI_CYAN', brightness: 0.35 });
    this.underline.setSegments([[-0.06, -0.045, 0, 0.98, -0.045, 0]]);
    this.ui.add(this.underline);
    // her sent message (sprite of the final typed string) + bubble
    const sent = this.typed.textAt(this.sendT - 1e-4) || 'are you there?';
    this.sentSprite = text.sprite(sent, { role: 'human', size: 120, color: C.HUMAN_AMBER, jitter: 0.6, seed: 7 }, { height: 0.13, anchor: 'left' });
    this.ui.add(this.sentSprite);
    this.sentW = this.sentSprite.textWorldWidth;
    this.herBubble = new K.BubbleOutline(ctx, { w: this.sentW + 0.13, h: 0.165, r: 0.07, tail: 'br', color: 'HUMAN_AMBER', width: 1.4, glow: 5 });
    this.ui.add(this.herBubble);
    // "Always." AI bubble
    this.always = text.sprite('Always.', { role: 'ai', size: 100, color: C.AI_CYAN }, { height: 0.115, anchor: 'left' });
    this.ui.add(this.always);
    this.alwaysW = this.always.textWorldWidth;
    this.aiBubble = new K.BubbleOutline(ctx, { w: this.alwaysW + 0.2, h: 0.165, r: 0.07, tail: 'bl', color: 'AI_CYAN', width: 1.6, glow: 6 });
    this.ui.add(this.aiBubble);
    this.aiCaret = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.07), new THREE.MeshBasicMaterial({ color: col('AI_CYAN'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.ui.add(this.aiCaret);
    // soft air glow around the interface after it speaks (light scattering in the dark room)
    this.haze = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.2), new THREE.ShaderMaterial({
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 c; uniform float k; uniform float k2; varying vec2 vUv; void main(){ vec2 q = (vUv - 0.5) * vec2(1.45, 1.0); float r = dot(q, q); gl_FragColor = vec4(c * (k * exp(-r * 9.0) + k2 * exp(-r * 70.0)), 1.0); }',
      uniforms: { c: { value: col('AI_CYAN') }, k: { value: 0 }, k2: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.haze.position.set(0.32, 0.29, -0.05);
    this.ui.add(this.haze);

    // the screen light falls on her from the interface
    this.lightPos = this.G.clone().add(V(0.45, 0.2, 0.0));
    this.her.screenPos.copy(this.lightPos);

    // ---- dust in the beam (world space)
    this.dust = new K.DustParticles(ctx, { count: 1400, box: [-0.25, -0.75, -0.7, 1.9, 0.75, 0.8], size: 0.0055, seed: 'intro-dust' });
    this.eyeW = this.her.eyeWorldPosition();
    this.dust.beamOrigin.copy(this.lightPos);
    this.dust.beamDir.copy(this.eyeW).sub(this.lightPos).normalize();
    this.scene.add(this.dust);

    // ---- macro eye, aligned with her eye and the push-in direction
    this.eye = new K.Eye(ctx);
    this.eye.setReflection(K.bubbleTexture(ctx, 'Always.'));
    this.scene.add(this.eye);
    // camera path anchors
    this.cursorStart = this.G.clone().add(V(0.02 + 0.018, 0.031, 0));
    this.comp = V(0.55, -0.02, 0.0);            // composition center (her left third, interface right third)
    this.pivot = V(0.2, 0.0, 0.0);              // her face
    this.orbitR0 = 3.42; this.orbitR1 = 2.25;
    this.orbitA1 = 0.62;                        // ~28° beyond the start azimuth
    const camOrbitEnd = this._orbitPos(1);
    const dirA = camOrbitEnd.clone().sub(this.eyeW).normalize();
    this.pushDir = dirA;
    this.eye.position.copy(this.eyeW).addScaledVector(dirA, 0.004);
    this.eye.lookAt(this.eyeW.clone().addScaledVector(dirA, 1));
    this.eye.scale.setScalar(0.034);
  },

  _orbitPos(u) {
    const e = inOutSine(u);
    const start = V(0.57, 0.02, 3.4).sub(this.pivot);
    const a0 = Math.atan2(start.x, start.z);
    const a = a0 + this.orbitA1 * e;
    const r = lerp(this.orbitR0, this.orbitR1, e);
    const y = lerp(start.y, 0.06, e);
    return V(this.pivot.x + Math.sin(a) * r, this.pivot.y + y, this.pivot.z + Math.cos(a) * r);
  },

  /** heartbeat envelope: lub -> 1.0, dub -> 0.6, exponential decay */
  _heart(t, ctx) {
    const evs = ctx.audio.events('heartbeat');
    let v = 0;
    for (const e of evs) {
      if (e.t > t) break;
      const dt = t - e.t;
      if (dt < 1.2) v = Math.max(v, (e.kind === 'dub' ? 0.6 : 1.0) * Math.exp(-dt / 0.22));
    }
    return v;
  },

  update(t, ctx) {
    const p = ctx.post.p;
    const heart = this._heart(t, ctx);
    const flashK = t >= this.alwaysT ? clamp(1 - (t - this.alwaysT) / 0.25) : 0;
    const burst = t >= this.alwaysT ? Math.exp(-(t - this.alwaysT) / 0.07) : 0;   // short, hot core of the flash
    const spoke = t >= this.alwaysT;

    // ------------------------------------------------------------------ interface
    this.typed.update(t, { opacity: t < this.sendT ? 1 : 0 });
    const caretX = t < this.sendT ? this.typed.caretX(t) : 0;
    const lastKey = this.typed.lastKeyTime(t);
    const typingNow = t >= this.firstKey - 0.05 && t < this.sendT && t - lastKey < 0.45;
    let curB;
    if (t < this.firstKey - 0.3) curB = 0.16 + 0.84 * heart;                    // 0.1: the heartbeat
    else if (typingNow) curB = 1;                                               // solid while typing
    else curB = Math.floor((t - this.firstKey) / 0.53) % 2 === 0 ? 1 : 0.08;    // stepped blink (AI)
    if (spoke) curB *= 0.55;
    const cw = 0.036, ch = 0.086;
    // the cursor plane follows the caret and only covers the cursor + its subpixel glow
    const gridOn = 1 - smoothstep(3.4, 4.8, t);
    const cx = caretX + 0.016 + cw / 2;
    const pw = gridOn > 0.001 ? 0.62 : 0.09, ph = gridOn > 0.001 ? 0.4 : 0.14;
    this.cursor.position.set(cx, 0.031, -0.002);
    this.cursor.scale.set(pw, ph, 1);
    this.cursor.material.uniforms.uSize.value.set(pw, ph);
    this.cursor.cursorPos.set(0, 0, 0);
    this.cursor.update(t, { brightness: curB * 1.05, grid: gridOn, opacity: t < this.b84 ? 1 : 0 });
    this.underline.brightness = 0.22 + 0.12 * (t < this.sendT ? 1 : 0.5);

    // send: her line rises into a bubble (right-aligned); "Always." appears in one frame below it
    const rowY1 = 0.255, rowY2 = 0.5;
    const colR = 0.98, colL = -0.06;
    const sendK = outCubic(clamp((t - this.sendT) / 0.3));
    const sentX0 = 0, sentX1 = colR - 0.065 - this.sentW;
    this.sentSprite.position.set(lerp(sentX0, sentX1, sendK), lerp(0, rowY2, sendK) + 0.012, 0);
    this.sentSprite.opacity = t >= this.sendT ? 1 : 0;      // (the opacity setter also sets .visible)
    this.herBubble.position.set(sentX1 + this.sentW / 2, rowY2 + 0.036, 0);
    this.herBubble.reveal = clamp((t - this.sendT - 0.08) / 0.35);
    this.herBubble.opacity = t >= this.sendT ? 1 : 0;
    this.herBubble.brightness = 0.55;
    this.always.opacity = spoke ? 1 : 0;
    this.always.position.set(colL + 0.1, rowY1 + 0.012, 0);
    this.always.brightness = 1 + 1.5 * flashK;
    this.aiBubble.opacity = spoke ? 1 : 0;
    this.aiBubble.position.set(colL + (this.alwaysW + 0.2) / 2, rowY1 + 0.036, 0);
    this.aiBubble.brightness = 0.9 + 2 * flashK;
    const caretOn = spoke && (Math.floor((t - this.alwaysT) * 2.4) % 2 === 0) && t - this.alwaysT < 2.2;
    this.aiCaret.visible = caretOn;
    this.aiCaret.position.set(colL + 0.1 + this.alwaysW + 0.03, rowY1 + 0.04, 0);
    this.haze.material.uniforms.k.value = spoke ? 0.05 + 0.18 * flashK * flashK : 0.012 * curB;
    this.haze.material.uniforms.k2.value = spoke ? 2.5 * burst : 0;
    this.haze.visible = spoke && t < this.b8 + 0.2;
    this.haze.material.uniforms.c.value.copy(col('AI_CYAN')).lerp(col('AI_WHITE'), Math.pow(flashK, 2));

    // ------------------------------------------------------------------ her
    const lit = spoke ? 1 + 1.3 * Math.exp(-(t - this.alwaysT) / 0.35) : 0.0;
    const warm = spoke ? 0.1 + 0.9 * outCubic(clamp((t - this.alwaysT) / 1.4)) : 0.03;
    const blink = Math.max(0, 1 - Math.abs(t - 7.55) / 0.12);                   // one slow human blink
    const camDist = this.camera.position.distanceTo(this.pivot);
    this.her.setCamera(this.camera).update(t, {
      screenLight: lit, warmth: warm, twinkle: 0.35 + 0.4 * heart, eyeClosed: blink,
      opacity: spoke ? 1 - smoothstep(9.45, 10.0, t) : 0, focus: camDist, aperture: spoke ? 0.35 : 0,   // in darkness until the flash
    });

    // ------------------------------------------------------------------ dust (heartbeat-lit)
    this.dust.setCamera(this.camera).update(t, {
      opacity: spoke ? smoothstep(this.alwaysT, this.alwaysT + 0.6, t) * (1 - smoothstep(9.5, 9.9, t)) : 0,
      beamStrength: 0.9 + 1.1 * heart + 1.5 * flashK, beamRadius: 0.3, ambient: 0.018, twinkle: heart,
      focus: camDist * 0.9, aperture: 0.9,
    });

    // ------------------------------------------------------------------ camera
    let pos, target, fov = 30;
    if (t < this.b3) {                                           // 0.1 locked extreme close-up
      target = this.cursorStart.clone();
      pos = target.clone().add(V(0, 0, 0.3));
    } else if (t < this.alwaysT + 0.35) {                        // 0.2 / 0.3 dolly out (exponential)
      const u = clamp((t - this.b3) / (this.alwaysT + 0.35 - this.b3));
      const e = inOutSine(u);
      const d = 0.3 * Math.pow(3.4 / 0.3, e);
      const caretW = this.G.clone().add(V(caretX + 0.03, 0.031, 0));
      const textMid = this.G.clone().add(V(Math.max(caretX, 0.62) * 0.5, 0.06, 0));
      target = caretW.lerp(textMid, smoothstep(0.08, 0.45, u)).lerp(this.comp, smoothstep(0.45, 1.0, u));
      pos = target.clone().add(V(-0.03 * e, 0.04 * e, d));
      // micro push on each keypress
      let push = 0;
      for (const k of this.keyTimes) if (k <= t && t - k < 0.6) push += Math.exp(-(t - k) / 0.09);
      pos.lerp(target, 0.012 * Math.min(push, 1.5));
    } else if (t < this.b7) {                                    // 0.4 orbit around her profile
      const u = clamp((t - this.alwaysT - 0.35) / (this.b7 - this.alwaysT - 0.35));
      pos = this._orbitPos(u);
      target = this.comp.clone().lerp(this.pivot, inOutSine(u));
    } else if (t < this.b8) {                                    // push toward her eye
      const u = clamp((t - this.b7) / (this.b8 - this.b7));
      const e = inOutCubic(u);
      const d0 = this._orbitPos(1).distanceTo(this.eyeW);
      const d = d0 * Math.pow(0.16 / d0, e);
      const start = this._orbitPos(1);
      const dir = start.clone().sub(this.eyeW).normalize();
      pos = this.eyeW.clone().addScaledVector(dir.lerp(this.pushDir, e), d);
      target = this.pivot.clone().lerp(this.eyeW, smoothstep(0, 0.6, u));
    } else {                                                     // 0.5 into the pupil
      const u = clamp((t - this.b8) / (this.b84 - this.b8));
      const d = 0.16 * Math.pow(0.012 / 0.16, inQuad(u) * 0.75 + u * 0.25);
      pos = this.eyeW.clone().addScaledVector(this.pushDir, d + 0.004);
      target = this.eyeW.clone();
    }
    applyCamera(this.camera, { pos, target, fov, handheld: t > this.alwaysT ? { t, seed: 3, pos: 0.0015, rotDeg: 0.05, freq: 0.3 } : null, near: 0.0008 });

    // ------------------------------------------------------------------ macro eye
    const eyeIn = smoothstep(9.15, 9.85, t);
    const pupil = t < this.b8 ? 0.34 : lerp(0.34, 1.0, inQuad(clamp((t - this.b8) / (this.b84 - this.b8 - 0.1))));
    this.eye.update(t, { pupil, reflection: 0.85 * (1 - smoothstep(10.25, 10.6, t)), brightness: 1, reveal: eyeIn, screenLight: 1 });
    this.eye.visible = eyeIn > 0.001;

    // ------------------------------------------------------------------ post
    p.scanlines = 0.15 * (1 - smoothstep(3.2, 4.6, t));
    p.vignette = t < this.b3 ? 0.55 : 0.45;
    // the flash is a burst of light from "Always." (haze + bloom), with only a touch of global white
    p.bloom = 0.6 + 0.9 * Math.pow(flashK, 3) + 0.25 * heart * (spoke ? 0 : 1);
    p.flashWhite = 0.1 * Math.pow(flashK, 3);
    if (t >= this.b8) {
      const u = clamp((t - this.b8) / (this.b84 - this.b8));
      p.ca = 0.0008 + 0.004 * u * u;
      p.vignette = 0.45 + 0.3 * u;
    }
    if (t >= this.b84) p.fade = 1;                               // one beat of black
  },
};

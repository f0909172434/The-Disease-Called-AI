// Tiles for the kit gallery (?gallery=1&t=..., single tile: &tile=N).
// Each tile: { label, scene, camera, update(t, ctx), setViewport?(w, h), render?(ctx) }.
import * as THREE from 'three';
import { applyCamera, orbit } from '../core/camera.js';
import { C, col } from '../core/palette.js';
import { clamp, inOutSine } from '../core/ease.js';

function tile(label, fov = 30) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, 4 / 3, 0.01, 200);
  return { label, scene, camera, update() {} };
}

export function buildTiles(ctx) {
  const K = ctx.kit, A = ctx.audio;
  const tiles = [];

  // 00 Silhouette — side, lit from the screen, dust in the beam
  {
    const T = tile('Silhouette · side', 30);
    const her = new K.Silhouette(ctx);
    const dust = new K.DustParticles(ctx, { count: 900, box: [-0.4, -1.2, -1.2, 2.6, 0.9, 1.2] });
    dust.beamOrigin.set(2.6, -0.1, 0.4); dust.beamDir.set(-1, 0.02, -0.12).normalize();
    T.scene.add(her, dust);
    T.setViewport = (w, h) => { her.viewHeight = h; her.viewWidth = w; dust.setCamera(T.camera, h); };
    T.update = (t) => {
      applyCamera(T.camera, { pos: [0.25, -0.2, 4.2], target: [0.25, -0.3, 0], fov: 30 });
      her.setCamera(T.camera).update(t, { mouthOpen: 0.5 + 0.5 * Math.sin(t * 6), twinkle: 0.6 });
      dust.setCamera(T.camera, her.viewHeight).update(t, { focus: 4.2, aperture: 0.6, beamRadius: 0.55 });
    };
    tiles.push(T);
  }
  // 01 Silhouette — 3/4
  {
    const T = tile('Silhouette · 3/4', 30);
    const her = new K.Silhouette(ctx);
    T.scene.add(her);
    T.setViewport = (w, h) => { her.viewHeight = h; her.viewWidth = w; };
    T.update = (t) => {
      applyCamera(T.camera, { pos: orbit([0.05, -0.2, 0], 3.3, 0.95 + 0.1 * Math.sin(t * 0.3), 0.06), target: [0.08, -0.2, 0], fov: 30 });
      her.setCamera(T.camera).update(t, { eyeClosed: clamp(Math.sin(t * 0.9) * 3 - 2.4, 0, 1) });
    };
    tiles.push(T);
  }
  // 02 Silhouette — states cycle: innerGlow -> gridify -> colorSwap -> dissolve
  {
    const T = tile('Silhouette · states', 30);
    const her = new K.Silhouette(ctx);
    T.scene.add(her);
    T.setViewport = (w, h) => { her.viewHeight = h; her.viewWidth = w; };
    T.update = (t) => {
      applyCamera(T.camera, { pos: orbit([0.0, -0.25, 0], 4.0, 0.45, 0.0), target: [0.05, -0.3, 0], fov: 30 });
      const c = (t % 8) / 8, seg = Math.floor(c * 4), k = inOutSine((c * 4) % 1);
      her.setCamera(T.camera).update(t, {
        innerGlow: seg === 0 ? k : 0, gridify: seg === 1 ? k : 0, colorSwap: seg === 2 ? k : 0,
        dissolve: seg === 3 ? k * 0.8 : 0, jitter: seg === 3 ? 0.2 : 0,
      });
    };
    tiles.push(T);
  }
  // 03 Ring — pulse on kick, speak on AI voice
  {
    const T = tile('Ring · pulse/speak', 30);
    const ring = new K.Ring(ctx);
    T.scene.add(ring);
    T.update = (t) => {
      applyCamera(T.camera, { pos: [0, 0, 4.6], target: [0, 0, 0], fov: 30 });
      ring.update(t, { pulse: Math.exp(-((t * 2.87) % 1) * 5), speak: 0.5 + 0.5 * Math.sin(t * 2.3) });
    };
    tiles.push(T);
  }
  // 04 Ring — irisText + amber + breaking + thumbs (cycle)
  {
    const T = tile('Ring · amber/break/thumbs', 30);
    const ring = new K.Ring(ctx);
    ring.irisText('are you there? · what do I wear · tell me — do you love me? · then speak for me · ');
    T.scene.add(ring);
    T.update = (t) => {
      const c = (t % 9) / 9, seg = Math.floor(c * 3), k = (c * 3) % 1;
      applyCamera(T.camera, { pos: [0, seg === 2 ? -0.62 : 0, seg === 2 ? 4.6 - 3.4 * inOutSine(k) : 4.6], target: [0, seg === 2 ? -0.62 : 0, 0], fov: 30 });
      ring.update(t, { colorMix: seg === 0 ? inOutSine(k) : seg === 1 ? 1 : 0, breakSegments: seg === 1 ? k : 0, thumbsMode: seg === 2 ? 1 : 0, thumbScale: 0.022 });
    };
    tiles.push(T);
  }
  // 05 Eye — macro with the "Always." reflection
  {
    const T = tile('Eye · reflection', 30);
    const eye = new K.Eye(ctx);
    const refl = K.bubbleTexture(ctx, 'Always.');
    eye.setReflection(refl);
    T.scene.add(eye);
    T.update = (t) => {
      const k = inOutSine((Math.sin(t * 0.5) + 1) / 2);
      applyCamera(T.camera, { pos: [0.02, 0.0, 4.0 - 2.4 * k], target: [0.0, 0.02, 0], fov: 30 });
      eye.update(t, { pupil: 0.3 + 0.25 * (0.5 + 0.5 * Math.sin(t * 1.3)), reflection: 0.9 });
    };
    tiles.push(T);
  }
  // 06 ChatUI — panel: bubbles, streaming, seen, regenerate
  {
    const T = tile('ChatUI · glass depth', 30);
    const chat = new K.ChatUI(ctx, { width: 820, height: 980, planeHeight: 2.2, scale: 1, depth: 14 });
    T.scene.add(chat);
    chat.setScript(chatDemo());
    T.update = (t) => {
      const c = t % 12;
      applyCamera(T.camera, { pos: [0.85, 0.25, 4.7], target: [0, -0.02, 0], fov: 32 });
      chat.rotation.set(0.05, -0.3 + 0.08 * Math.sin(t * 0.4), 0);
      chat.update(c);
    };
    tiles.push(T);
  }
  // 07 TypingDots
  {
    const T = tile('TypingDots · glass pill', 30);
    const dots = new K.TypingDots(ctx, { radius: 0.2, spacing: 0.56, slab: true });
    T.scene.add(dots);
    T.update = (t) => {
      applyCamera(T.camera, { pos: [0.75 * Math.sin(t * 0.35), 0.35, 2.75], target: [0, 0, -0.05], fov: 30 });
      const c = t % 6;
      dots.update(t, { phase: t * 5.73, freeze: c > 4 ? 1 : 0, glow: c > 4 ? [0.8, 0.8, 0.8] : null, vanish: [0, 0, 0] });
    };
    tiles.push(T);
  }
  // 08 Room + CityWindows through the blinds
  {
    const T = tile('Room · CityWindows', 34);
    const room = new K.Room(ctx);
    const city = new K.CityWindows(ctx, { count: 2600 });
    const chat = new K.ChatUI(ctx, { width: 640, height: 400, planeHeight: 1, scale: 1, theme: 'minimal' });
    chat.setScript({ messages: [{ from: 'you', text: 'what should I wear today?', at: 0 }, { from: 'ai', text: '1. the grey sweater', at: 0.5, stream: 'instant' }], input: { events: [] } });
    room.setScreenTexture(chat.texture);
    T.scene.add(city, room);
    T.setViewport = (w, h) => { room.setResolution(w, h); city.outlines.setResolution(w, h); };
    T.update = (t) => {
      applyCamera(T.camera, { pos: [3.6, 3.1, 5.6], target: [0.1, 0.9, -0.9], fov: 38 });
      chat.update(2);
      const dn = (Math.sin(t * 0.4) + 1) / 2;
      room.update(t, { screenGlow: 1 + 0.3 * Math.sin(t * 3), dayNight: dn, emptyChair: 0.6, lampOn: 0.5, screenOnPillow: dn > 0.8 ? 1 : 0 });
      city.update(t, { density: 0.75, flicker: 0.3 });
    };
    tiles.push(T);
  }
  // 09 HUD — medical monitor (full-frame layout shown scaled)
  {
    const T = tile('HUD · monitor', 30);
    const { W, H } = ctx;
    const u = ctx.u;
    // compact arrangement framed 2x for the tile (scenes use hud.setLayout() in full-frame HUD space)
    T.camera = new THREE.OrthographicCamera(-W / 4, W / 4, H / 4, -H / 4, -10, 10);
    const hud = new K.HUD(ctx, { layout: 'monitor' });
    hud.widgets.ecg.mesh.position.set(-40 * u, -120 * u, 0);
    hud.widgets.vitals.mesh.position.set(230 * u, 70 * u, 0);
    hud.widgets.clock.mesh.position.set(-250 * u, 120 * u, 0);
    hud.widgets.session.mesh.position.set(-210 * u, 50 * u, 0);
    T.scene.add(hud);
    T.update = (t) => {
      hud.update(t + 56, { bpm: 172, temp: 41.2, dosage: '∞', clock: '03:00', session: 3600 * 4 + t * 60 });
    };
    tiles.push(T);
  }
  // 10 Particles — fever stream, confetti
  {
    const T = tile('Particles · fever/confetti', 30);
    const fever = new K.FeverStream(ctx, { count: 1600 });
    const conf = new K.TokenConfetti(ctx, { bursts: [0, 3, 6, 9].map((b) => ({ t: b, count: 60, origin: [0.6, -0.4, 0] })) });
    T.scene.add(fever, conf);
    T.setViewport = (w, h) => { fever.setResolution(w, h); fever.setCamera(T.camera, h); };
    T.update = (t) => {
      applyCamera(T.camera, { pos: [0, 0.2, 5.2], target: [0, 0, 0], fov: 30 });
      fever.update(t, { pulse: Math.exp(-((t * 2.87) % 1) * 5), trail: 0.5 });
      conf.update(t % 12);
    };
    tiles.push(T);
  }
  // 11 KineticText + NotificationSnow
  {
    const T = tile('KineticText · Snow', 30);
    const kt = new K.KineticText(ctx, 'DISEASE', { role: 'ui', size: 200, weight: 800, color: C.AI_WHITE }, { height: 0.42 });
    const ai = new K.KineticText(ctx, 'A.I.', { role: 'title', size: 220, weight: 700, color: C.AI_CYAN }, { height: 0.5 });
    const hum = new K.KineticText(ctx, 'are you there?', { role: 'human', size: 120, color: C.HUMAN_AMBER }, { height: 0.24 });
    const snow = new K.NotificationSnow(ctx, { t0: 0, rate: 9, top: 1.6, floor: -1.05, area: [-1.8, -1, 1.8, 0.6], size: 0.11 });
    kt.position.set(0, 0.55, 0); ai.position.set(0, 0.0, 0); hum.position.set(0, -0.5, 0);
    T.scene.add(snow, kt, ai, hum);
    T.update = (t) => {
      applyCamera(T.camera, { pos: [0, 0.15, 3.6], target: [0, 0, 0], fov: 32 });
      const c = t % 4;
      kt.update(t, { slam: { at: Math.floor(t / 4) * 4 + 0.2 }, glitch: c > 2.5 && c < 2.8 ? 0.7 : 0 });
      ai.update(t, { decode: { at: Math.floor(t / 4) * 4 + 0.6, dur: 0.8 }, pulse: Math.exp(-((t * 2.87) % 1) * 4) });
      hum.update(t, { type: { at: Math.floor(t / 4) * 4 + 0.4, rate: 9 } });
      snow.update(t % 24);
    };
    tiles.push(T);
  }
  return tiles;
}

function chatDemo() {
  return {
    header: { title: 'assistant', status: 'online' },
    messages: [
      { id: 'q1', from: 'you', text: 'what should I wear today?', at: 0.4, seen: { at: 1.0, text: 'Seen' } },
      { id: 'a1', from: 'ai', text: '1. the grey sweater\n2. black jeans\n3. the boots you wore on Friday', at: 1.2, stream: { rate: 22 } },
      { id: 'q2', from: 'you', text: 'Tell me — do you love me?', at: 4.0, swap: { start: 7.5, end: 9.5 } },
      { id: 'd1', from: 'ai', dots: [4.4, 5.2] },
      { id: 'a2', from: 'ai', text: "I'm a language model. I can't love you.", at: 5.2, stream: { rate: 18 }, rewind: { at: 9.8, dur: 0.35 } },
    ],
    input: { events: [{ t: 10.4, ch: 'p' }, { t: 10.5, ch: 'l' }, { t: 10.62, ch: 's' }, { t: 10.8, ch: '\b' }, { t: 10.9, ch: 'e' }, { t: 11.0, ch: 'a' }, { t: 11.1, ch: 's' }, { t: 11.2, ch: 'e' }], placeholder: 'Message assistant…' },
    regenerate: { show: [6.8, 12], clicks: [9.7], counter: [[6.8, 1, 1], [9.8, 2, 2]] },
  };
}

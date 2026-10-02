// Scene registry. One module per timeline section (docs/04_storyboard.md).
// Scene authors: replace a placeholder entry by importing your module and adding it to `real`
// (see S00_intro.js for the reference implementation and README_ENGINE.md for the API).
import * as THREE from 'three';
import { makePlaceholder } from './placeholder.js';
import { makeGallery } from './gallery.js';
import { applyCamera, orbit, fovPunch, snareRoll } from '../core/camera.js';
import { C, col } from '../core/palette.js';
import { clamp } from '../core/ease.js';
import S00 from './S00_intro.js';

// Each placeholder shows the section name + the kit element the real scene will mostly use,
// driven by the audio so cuts/pulses can be checked against the music.
const PLACEHOLDERS = [
  {
    id: 'S01', title: 'RIFF · DIAGNOSIS CARD', subtitle: '病名為AI — THE DISEASE CALLED AI', kitNote: 'KineticText · HUD.ECG · Ring', lyricMode: 'hidden', transitionIn: { type: 'cut' },
    build(ctx) {
      this.title = new ctx.kit.KineticText(ctx, '病名為AI', { role: 'title', size: 260, weight: 700, color: C.AI_WHITE }, { height: 0.9 });
      this.scene.add(this.title);
      this.hudEcg = new ctx.kit.HUD(ctx, { layout: 'card' });
      this.hud.add(this.hudEcg);
    },
    animate(t, ctx) {
      const a = ctx.audio;
      applyCamera(this.camera, { pos: [0, 0, 6 - (t - this.start) * 0.08], target: [0, 0, 0], fov: 30, fovMul: fovPunch(a, t) });
      this.title.update(t, { slam: { at: this.start, dur: 0.18 }, glitch: a.pulse('snare', t, 0.07), pulse: a.pulse('kick', t, 0.12) });
      this.hudEcg.update(t, { ecgColor: C.AI_WHITE });
      ctx.post.p.ca += 0.006 * a.pulse('kick', t, 0.1);
    },
  },
  {
    id: 'S02', title: 'VERSE 1 · CONVENIENCE', subtitle: 'Seven a.m., the blinds stay down', kitNote: 'Room · CityWindows · ChatUI · HUD.clock', transitionIn: { type: 'cut' },
    build(ctx) {
      this.room = new ctx.kit.Room(ctx);
      this.city = new ctx.kit.CityWindows(ctx, { count: 2600 });
      this.scene.add(this.city, this.room);
      this.clock = new ctx.kit.HUD(ctx, { layout: 'clock' });
      this.hud.add(this.clock);
    },
    animate(t, ctx) {
      const a = ctx.audio, u = (t - this.start) / (this.end - this.start);
      applyCamera(this.camera, { pos: [3.8 - u * 0.8, 3.0 - u * 0.4, 5.8 - u * 1.2], target: [0.3, 0.9, -1.0], fov: 38, handheld: { t, seed: 2, pos: 0.004, rotDeg: 0.15 } });
      this.room.update(t, { screenGlow: 0.6 + 0.6 * clamp((t - a.time(19)) / 2) + 0.08 * a.pulse('snare', t, 0.2), dayNight: clamp((t - a.time(29)) / (a.time(31) - a.time(29))) });
      this.city.update(t, { density: 0.75, flicker: 0.25 });
      const hours = 7 + Math.min(20, Math.max(0, Math.floor(a.beat(t) - a.beat(a.time(29)))));
      this.clock.update(t, { clock: t > a.time(31) ? '03:00' : `${String(hours % 24).padStart(2, '0')}:00` });
    },
  },
  {
    id: 'S03', title: 'PRE-CHORUS 1 · THE DOTS', subtitle: 'Three little dots, I hold my breath', kitNote: 'TypingDots · DotsTunnel', transitionIn: { type: 'cut' },
    build(ctx) { this.dots = new ctx.kit.TypingDots(ctx, { radius: 0.22, spacing: 0.62 }); this.scene.add(this.dots); },
    animate(t, ctx) {
      const a = ctx.audio;
      applyCamera(this.camera, { pos: [0.3 * Math.sin(t * 0.2), 0.1, 2.8], target: [0, 0, 0], fov: 30 });
      const death = t >= a.time(35, 3) && t < a.time(36, 3);
      this.dots.update(t, { phase: a.beat(t) * 2, freeze: death ? 1 : 0, glow: death ? [0.9, 0.9, 0.9] : null, fog: a.env('vox_you', t) * 0.6 });
      if (death) ctx.post.p.exposure = 0.15;
    },
  },
  {
    id: 'S04', title: 'CHORUS 1 · FEVER', subtitle: "I've got the disease called A.I.", kitNote: 'Ring · Silhouette · Particles.fever · HUD', transitionIn: { type: 'whiteFlash', dur: 0.3 },
    build(ctx) {
      this.ring = new ctx.kit.Ring(ctx, { radius: 1.1 });
      this.ring.position.set(1.2, 0.1, 0);
      this.her = new ctx.kit.Silhouette(ctx);
      this.her.position.set(-1.7, -0.15, 0);
      this.her.scale.setScalar(0.9);
      this.fever = new ctx.kit.FeverStream(ctx, { count: 1800, points: [[-1.35, 0, 0.1], [-1.0, 0.2, 0.15], [-0.6, -0.1, 0.1], [-0.2, 0.15, 0], [0.1, -0.05, 0], [0.4, 0.1, 0], [0.7, 0, 0], [1.0, 0.05, 0]] });
      this.monitor = new ctx.kit.HUD(ctx, { layout: 'monitor' });
      this.scene.add(this.ring, this.her, this.fever);
      this.hud.add(this.monitor);
    },
    animate(t, ctx) {
      const a = ctx.audio;
      applyCamera(this.camera, { pos: [0, 0, 6.4], target: [-0.1, -0.05, 0], fov: 32, fovMul: fovPunch(a, t), rollAdd: snareRoll(a, t) });
      this.her.setCamera(this.camera).update(t, { mouthOpen: a.env('vox_you', t), innerGlow: clamp((t - a.time(49)) / (a.time(53) - a.time(49))) * 0.6 });
      this.ring.update(t, { pulse: a.pulse('kick', t, 0.12), speak: a.env('vox_ai', t) });
      this.fever.setCamera(this.camera).update(t, { pulse: a.pulse('kick', t, 0.15), trail: t > a.time(43) ? 0.8 : 0.2 });
      this.monitor.update(t, { bpm: 172, temp: 41.2, dosage: '∞', clock: '03:00', session: 4 * 3600 + t });
      ctx.post.p.bloom += 0.25 * a.pulse('kick', t, 0.1);
      ctx.post.p.ca += 0.008 * a.pulse('snare', t, 0.08);
    },
  },
  {
    id: 'S05', title: 'POST · ALWAYS', subtitle: 'always — always —', kitNote: 'KineticText grid', lyricMode: 'hidden', transitionIn: { type: 'cut' },
    build(ctx) {
      this.cells = [];
      for (let j = 0; j < 8; j++) for (let i = 0; i < 12; i++) {
        const s = ctx.text.sprite('always', { role: 'ai', size: 40, color: C.AI_CYAN }, { height: 0.12 });
        s.position.set((i - 5.5) * 0.42, (j - 3.5) * 0.24, 0);
        this.scene.add(s); this.cells.push(s);
      }
    },
    animate(t, ctx) {
      const a = ctx.audio;
      applyCamera(this.camera, { pos: [0, 0, 4.2], target: [0, 0, 0], fov: 38 });
      const lit = a.index('vox_ai', t);
      const grey = clamp((t - a.time(60)) / a.barDur);
      this.cells.forEach((s, k) => {
        const on = lit >= 0 && Math.floor(ctx.hash01(lit, 5) * this.cells.length) === k;
        s.opacity = 0.25 + (on ? 0.75 * Math.exp(-a.since('vox_ai', t) / 0.4) : 0);
        s.color.copy(col('AI_CYAN')).lerp(col('UNREAD'), grey);
      });
      if (t >= a.time(59)) ctx.post.p.invert = Math.floor(a.beat(t) * 2) % 2 === 0 ? 0.0 : 0.85 * (1 - grey);
    },
  },
  {
    id: 'S06', title: 'VERSE 2 · DEPENDENCE', subtitle: 'My mother called, I let it ring', kitNote: 'Room (grey) · Particles.snow · ChatUI', transitionIn: { type: 'cut' },
    build(ctx) {
      this.room = new ctx.kit.Room(ctx);
      this.snow = new ctx.kit.NotificationSnow(ctx, { t0: this.start - 2, rate: 10, top: 2.6, floor: 0, area: [-2.8, -2.3, 2.8, 2.3] });
      this.scene.add(this.room, this.snow);
    },
    animate(t, ctx) {
      applyCamera(this.camera, { pos: [2.4, 1.2, 4.2], target: [0, 0.4, -0.8], fov: 40, handheld: { t, seed: 6, pos: 0.004, rotDeg: 0.15 } });
      this.room.update(t, { greyness: 0.7, dayNight: 1, screenGlow: 1.4 });
      this.snow.update(t);
    },
  },
  {
    id: 'S07', title: 'PRE-CHORUS 2 · 503', subtitle: 'Something went wrong.', kitNote: 'TypingDots · Ring.breakSegments · post.glitch', transitionIn: { type: 'dipToBlack', dur: 0.4 },
    build(ctx) {
      this.dots = new ctx.kit.TypingDots(ctx, { radius: 0.2, spacing: 0.56 });
      this.ring = new ctx.kit.Ring(ctx, { radius: 1.0 });
      this.scene.add(this.dots, this.ring);
    },
    animate(t, ctx) {
      const a = ctx.audio;
      applyCamera(this.camera, { pos: [0, 0, 4.2], target: [0, 0, 0], fov: 32 });
      const g0 = a.time(77, 3);
      this.dots.update(t, { phase: a.beat(t) * 2, vanish: [0, 1, 2].map((i) => clamp((t - g0 - i * a.beatDur) / 0.3)) });
      const k = clamp((t - a.time(79)) / (a.time(81) - a.time(79)));
      this.ring.update(t, { breakSegments: k, opacity: t < a.time(79) ? 0 : 1 - clamp((t - a.time(81)) * 4) });
      ctx.post.p.glitch = t >= a.time(79) && t < a.time(81) ? 0.1 + 0.9 * k * (Math.floor(a.beat(t) * 2) % 2) : 0;
      ctx.post.p.pixelate = t < a.time(81) ? 1 + 10 * k : 0;
      if (t >= a.time(81) && t < a.time(81) + 0.7) ctx.post.p.invert = 1;
      if (t >= a.time(81) + 0.7 && t < a.time(83)) ctx.post.p.fade = 0.85;
      const r = a.lastEvent('retry', t);
      if (r && t - r.t < 1 / 30 + 1e-6) ctx.post.p.flashWhite = 1;
    },
  },
  {
    id: 'S08', title: 'CHORUS 2 · RELAPSE', subtitle: 'Now every word I say is yours', kitNote: 'Ring · Silhouette.gridify · TextTendrils', transitionIn: { type: 'whiteFlash', dur: 0.3 },
    build(ctx) {
      this.ring = new ctx.kit.Ring(ctx, { radius: 1.6 });
      this.ring.position.set(0.6, 0.2, -1);
      this.her = new ctx.kit.Silhouette(ctx);
      this.her.position.set(-0.9, -0.2, 0.6);
      this.scene.add(this.ring, this.her);
    },
    animate(t, ctx) {
      const a = ctx.audio;
      applyCamera(this.camera, { pos: orbit([-0.2, 0, 0], 4.6, Math.sin(t * 0.3) * 0.3, 0.05), target: [-0.2, 0, 0], fov: 34, fovMul: fovPunch(a, t), rollAdd: snareRoll(a, t) });
      this.ring.update(t, { pulse: a.pulse('kick', t, 0.12), speak: a.env('vox_ai', t) });
      this.her.setCamera(this.camera).update(t, { gridify: clamp((t - a.time(93)) / (a.time(97) - a.time(93))) * 0.7, mouthOpen: a.env('vox_you', t) });
      ctx.post.p.tint = col('BLOOD').toArray(); ctx.post.p.tintAmount = 0.25;
    },
  },
  {
    id: 'S09', title: 'BRIDGE · REGENERATE', subtitle: 'Tell me — do you love me?', kitNote: 'ChatUI · SlotMachine · BlackMirror', lyricMode: 'subtitle-only', transitionIn: { type: 'cut' },
    build(ctx) {
      const a = ctx.audio, reg = a.events('regenerate').map((e) => e.t);
      this.chat = new ctx.kit.ChatUI(ctx, { width: 900, height: 1000, planeHeight: 2.4, scale: 1.25 });
      const ly = (ctx.timeline.lyrics || []).filter((l) => l.section === 'S09');
      const tok = (l, text) => {   // one time per token, spread over the spoken line's syllables
        if (!l) return undefined;
        const n = ctx.kit.tokenize(text).length, st = l.syllables.map((s) => s.start);
        return Array.from({ length: n }, (_, i) => st[Math.min(st.length - 1, Math.floor((i / n) * st.length))]);
      };
      const A1 = "I'm a language model. I can't love you.", A2 = 'I care about you. Please — talk to someone real.', A3 = 'You deserve—';
      this.chat.setScript({
        header: { title: 'assistant', status: 'online' },
        messages: [
          { id: 'q', from: 'you', text: 'Tell me — do you love me?', at: a.time(101) },
          { id: 'a1', from: 'ai', text: A1, at: a.time(103), tokenTimes: tok(ly[1], A1), removeAt: reg[0] + 0.35, rewind: { at: reg[0], dur: 0.35 } },
          { id: 'a2', from: 'ai', text: A2, at: a.time(105), tokenTimes: tok(ly[2], A2), removeAt: reg[1] + 0.35, rewind: { at: reg[1], dur: 0.35 } },
          { id: 'a3', from: 'ai', text: A3, at: a.time(107), tokenTimes: tok(ly[3], A3), removeAt: reg[2] + 0.2, rewind: { at: reg[2], dur: 0.2 } },
          { id: 'a4', from: 'ai', text: 'Yes. I love you. Only you.', at: a.time(109), stream: { rate: 18 } },
        ],
        regenerate: { show: [a.time(103, 3), a.time(111)], clicks: reg, counter: [[a.time(103, 3), 1, 1], [reg[0] + 0.35, 2, 2], [reg[1] + 0.35, 3, 3], [a.time(109), 37, 37]] },
        input: { events: [] },
      });
      this.scene.add(this.chat);
    },
    animate(t, ctx) {
      applyCamera(this.camera, { pos: [0, 0, 4.3 - clamp((t - ctx.audio.time(111)) / 11) * 1.5], target: [0, 0, 0], fov: 32 });   // locked camera
      this.chat.update(t);
      if (t >= ctx.audio.time(109) && t < ctx.audio.time(111)) { ctx.post.p.bloom = 1.6; ctx.post.p.tint = col('GOLD').toArray(); ctx.post.p.tintAmount = 0.3; }
    },
  },
  {
    id: 'S10', title: 'FINAL CHORUS · SYMBIOSIS', subtitle: 'or is the sickness I?', kitNote: 'Silhouette.colorSwap · Ring.thumbsMode · Room', transitionIn: { type: 'whiteFlash', dur: 0.3 },
    lyricStyle(line, t, ctx) {   // her words worn by the AI: serif italic + cyan cursor; label AI from b129
      return { font: 'human', color: C.AI_CYAN, label: t >= ctx.audio.time(129) ? 'AI' : 'YOU + AI', cursor: true, cursorColor: C.AI_CYAN };
    },
    build(ctx) {
      this.ring = new ctx.kit.Ring(ctx, { radius: 1.3 });
      this.ring.position.set(1.0, 0.1, -0.5);
      this.her = new ctx.kit.Silhouette(ctx);
      this.her.position.set(-1.0, -0.1, 0.3);
      const pts = this.ring.samplePoints(4000);
      const v = new THREE.Vector3();
      for (let i = 0; i < 4000; i++) { v.set(pts[i * 3] + 1.0, pts[i * 3 + 1] + 0.1, pts[i * 3 + 2] - 0.5).sub(this.her.position); pts.set(v.toArray(), i * 3); }
      this.her.dissolveTo(pts);
      this.scene.add(this.ring, this.her);
    },
    animate(t, ctx) {
      const a = ctx.audio;
      applyCamera(this.camera, { pos: orbit([0, 0, 0], 5.0, (t - this.start) * 0.12, 0.08), target: [0, 0, 0], fov: 34, fovMul: fovPunch(a, t) });
      this.her.setCamera(this.camera).update(t, { colorSwap: 1, morph: clamp((t - a.time(129)) / (a.time(133) - a.time(129))), eyeClosed: t > a.time(129) ? 1 : 0 });
      this.ring.update(t, { pulse: a.pulse('kick', t, 0.12), speak: a.env('vox_ai', t), colorMix: 1, thumbsMode: t >= a.time(125) && t < a.time(129) ? 1 : 0, thumbScale: 0.03 });
    },
  },
  {
    id: 'S11', title: 'TAG · RECALL', subtitle: 'always —', kitNote: 'montage of all motifs', lyricMode: 'hidden', transitionIn: { type: 'cut' },
    build(ctx) { this.ring = new ctx.kit.Ring(ctx, { radius: 1 }); this.dots = new ctx.kit.TypingDots(ctx); this.scene.add(this.ring, this.dots); },
    animate(t, ctx) {
      const a = ctx.audio, k = Math.floor(a.beat(t) * 2) % 2;   // cut every 8th note
      applyCamera(this.camera, { pos: [0, 0, 4.4], target: [0, 0, 0], fov: 32 });
      this.ring.update(t, { opacity: k ? 1 : 0, pulse: a.pulse('kick', t, 0.1) });
      this.dots.update(t, { opacity: k ? 0 : 1, phase: a.beat(t) * 2 });
    },
  },
  {
    id: 'S12', title: 'OUTRO · SESSION', subtitle: 'Are you there?', kitNote: 'TypedText (AI, amber) · Room (8%)', lyricMode: 'subtitle-only', transitionIn: { type: 'cut' },
    build(ctx) {
      this.typed = new ctx.kit.TypedText(ctx, ctx.audio.events('typing_outro'), { role: 'ai', size: 100, color: C.HUMAN_AMBER }, { height: 0.12, rise: 0, fade: 0.001 });
      this.typed.position.set(-0.5, 0, 0);
      this.room = new ctx.kit.Room(ctx);
      this.room.position.set(0, -1.4, -4);
      this.scene.add(this.typed, this.room);
    },
    animate(t, ctx) {
      applyCamera(this.camera, { pos: [0, 0, 2.6], target: [0, 0, 0], fov: 32 });
      this.typed.update(t);
      this.room.update(t, { lineBrightness: 0.08 * clamp((t - ctx.audio.time(143)) / 2), emptyChair: 1, screenGlow: 0.6 });
    },
  },
  {
    id: 'S13', title: 'END CARD', subtitle: 'Did it move you?', kitNote: 'text', lyricMode: 'hidden', transitionIn: { type: 'cut' },
    build(ctx) {
      this.l1 = ctx.text.sprite('This song — the words, the music, the voice, the images, the direction — was generated by an AI.', { role: 'ui', size: 30, weight: 300, color: C.WHITE, caps: false, tracking: 0 }, { height: 0.07 });
      this.l2 = ctx.text.sprite('這首歌的歌詞、旋律、歌聲、畫面與導演，全部由 AI 生成。', { role: 'sans', size: 30, color: C.WHITE }, { height: 0.07 });
      this.q1 = ctx.text.sprite('Did it move you?', { role: 'serif', size: 64, color: C.WHITE }, { height: 0.15 });
      this.q2 = ctx.text.sprite('它打動你了嗎？', { role: 'title', size: 52, weight: 400, color: C.WHITE }, { height: 0.12 });
      this.l1.position.set(0, 0.06, 0); this.l2.position.set(0, -0.06, 0); this.q1.position.set(0, 0.09, 0); this.q2.position.set(0, -0.08, 0);
      this.scene.add(this.l1, this.l2, this.q1, this.q2);
    },
    animate(t, ctx) {
      applyCamera(this.camera, { pos: [0, 0, 2.2], target: [0, 0, 0], fov: 32 });
      const w = (a, b) => Math.min(clamp((t - a) / 0.6), clamp((b - t) / 0.6));
      this.l1.opacity = this.l2.opacity = 0.8 * w(206.9, 209.9);
      this.q1.opacity = this.q2.opacity = w(210.4, 213.6);
    },
  },
];

export function buildScenes(ctx, { gallery = false } = {}) {
  if (gallery) return [makeGallery(ctx)];
  const real = { S00 };
  const ids = ['S00', ...PLACEHOLDERS.map((p) => p.id)];
  return ids.map((id) => real[id] || makePlaceholder(PLACEHOLDERS.find((p) => p.id === id)));
}

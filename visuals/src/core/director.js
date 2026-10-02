// Director: owns the scene schedule (from timeline sections), runs update/render for the
// scene(s) active at t, applies transitions, post FX and the lyrics overlay.
//
// renderFrame(t) is a pure function of t: every frame resets post params to the section preset,
// calls scene.update(t, ctx) (which must set ALL state from t), then renders.
import * as THREE from 'three';
import { POST_PRESETS } from './palette.js';
import { lerpParams } from './post.js';
import { applyPostTransition, isComposite, compositeWindow, compositeProgress } from './transitions.js';

export class Director {
  constructor(ctx, sceneModules) {
    this.ctx = ctx;
    this.modules = sceneModules;
    this.schedule = [];
  }

  async init() {
    const ctx = this.ctx;
    const secs = ctx.audio.sections;
    for (const mod of this.modules) {
      const sec = secs.find((s) => s.id === mod.id);
      if (mod.start === undefined) mod.start = sec ? sec.start : 0;
      if (mod.end === undefined) mod.end = sec ? sec.end : ctx.duration;
    }
    for (const mod of this.modules) {
      if (mod.init) await mod.init(ctx);
      if (!mod.camera) mod.camera = new THREE.PerspectiveCamera(35, ctx.W / ctx.H, 0.01, 200);
    }
    this.schedule = [...this.modules].filter((m) => !m.debugOnly).sort((a, b) => a.start - b.start);
  }

  /**
   * Precompile every material of every scene (objects forced visible), so no frame pays for a
   * shader compile. Pure warm-up: does not affect any rendered pixel.
   */
  warmup() {
    const ctx = this.ctx;
    for (const m of this.schedule) {
      const sample = [m.start + 0.05, (m.start + m.end) / 2, m.end - 0.05];
      for (const tt of sample) {
        ctx.post.reset(this.presetFor(m));
        ctx.scene = m;
        m.update(Math.max(0, tt), ctx);
        for (const root of [m.scene, m.hud].filter(Boolean)) {
          const hidden = [];
          root.traverse((o) => { if (!o.visible) { hidden.push(o); o.visible = true; } });
          ctx.renderer.compile(root, root === m.hud ? ctx.hudCamera : m.camera);
          for (const o of hidden) o.visible = false;
        }
      }
      if (m.tiles) for (const tile of m.tiles) {
        const hidden = [];
        tile.scene.traverse((o) => { if (!o.visible) { hidden.push(o); o.visible = true; } });
        ctx.renderer.compile(tile.scene, tile.camera);
        for (const o of hidden) o.visible = false;
      }
    }
  }

  /** scene whose own [start, end) contains t (the "primary" scene: decides lyricMode) */
  primaryAt(t) {
    let best = null;
    for (const m of this.schedule) if (t >= m.start && t < m.end) best = m;
    if (!best) best = t < this.schedule[0].start ? this.schedule[0] : this.schedule[this.schedule.length - 1];
    return best;
  }

  /** composite transition active at t? -> { from, to, u, spec } */
  compositeAt(t) {
    for (let i = 1; i < this.schedule.length; i++) {
      const to = this.schedule[i], spec = to.transitionIn;
      if (!isComposite(spec)) continue;
      const [a, b] = compositeWindow(to.start, spec);
      if (t >= a && t < b) return { from: this.schedule[i - 1], to, u: compositeProgress(t, to.start, spec), spec };
    }
    return null;
  }

  presetFor(scene) {
    return { ...(POST_PRESETS[scene.id] || {}), ...(scene.post || {}) };
  }

  lyricModeAt(t) {
    const s = this.primaryAt(t);
    const m = s.lyricMode;
    return typeof m === 'function' ? m.call(s, t, this.ctx) : (m || 'karaoke');
  }

  /** render a scene into the bound target (default: its scene/camera, then its hud) */
  _renderScene(scene, target) {
    const ctx = this.ctx;
    ctx.target = target;
    ctx.renderer.setRenderTarget(target);
    ctx.renderer.setClearColor(scene.clearColor || ctx.clearColor, 1);
    ctx.renderer.clear(true, true, true);
    if (scene.render) scene.render(ctx);
    else if (scene.scene) ctx.renderScene(scene.scene, scene.camera);
    if (scene.hud) ctx.renderHUD(scene.hud);
  }

  _runScene(scene, t, target) {
    const ctx = this.ctx;
    ctx.post.reset(this.presetFor(scene));
    ctx.scene = scene;
    scene.update(t, ctx);
    const params = ctx.post.snapshot();
    this._renderScene(scene, target);
    return params;
  }

  _trails(scene, t, target) {
    const ctx = this.ctx, post = ctx.post, p = post.p;
    const n = Math.max(1, Math.round(p.trailSamples));
    const amount = p.trails;
    const keep = post.snapshot();
    for (let k = n; k >= 1; k--) {
      const te = t - k * p.trailSpacing;
      ctx.post.reset(this.presetFor(scene));
      scene.update(te, ctx);
      this._renderScene(scene, post.echoRT);
      post.maxBlend(post.echoRT.texture, target, Math.pow(amount, 0.6) * Math.pow(0.72, k - 1));
    }
    // restore the state for t (scenes are pure in t, so this is exact)
    ctx.post.reset(this.presetFor(scene));
    scene.update(t, ctx);
    post.p = keep;
  }

  renderFrame(t) {
    const ctx = this.ctx, post = ctx.post;
    ctx.time = t;
    ctx.frame = Math.round(t * ctx.fps);
    const comp = this.compositeAt(t);
    if (comp) {
      const pa = this._runScene(comp.from, t, post.auxA);
      const pb = this._runScene(comp.to, t, post.auxB);
      post.p = lerpParams(pa, pb, comp.u);
      post.composite(post.auxA.texture, post.auxB.texture, comp.u, comp.spec.type);
    } else {
      const s = this.primaryAt(t);
      this._runScene(s, t, post.sceneRT);
      if (post.p.trails > 0.001) {
        // the trail renders must not alter the frame's own (already rendered) image
        this._trails(s, t, post.sceneRT);
      }
    }
    // post-type transitions around scene starts
    for (const m of this.schedule) {
      const spec = m.transitionIn;
      if (!spec || isComposite(spec)) continue;
      const dt = t - m.start;
      if (dt > -1 && dt < 2) applyPostTransition(post.p, spec, dt);
    }
    post.finish(t, ctx.frame);
    const prim = this.primaryAt(t);
    ctx.lyrics.render(t, this.lyricModeAt(t), prim.lyricStyle ? (l, tt) => prim.lyricStyle(l, tt, ctx) : null);
  }
}

// Placeholder scene factory: dark frame + section name + the kit element the real scene will
// mostly use (animated to the music), so the whole timeline renders end to end.
// Replace each with a real scene module (see S00_intro.js and README_ENGINE.md).
import * as THREE from 'three';
import { C } from '../core/palette.js';
import { clamp } from '../core/ease.js';

export function makePlaceholder({ id, title, subtitle = '', kitNote = '', lyricMode = 'karaoke', transitionIn, build, animate, post, lyricStyle }) {
  return {
    id, lyricMode, transitionIn, post, lyricStyle,
    placeholder: true,
    init(ctx) {
      const { W, H } = ctx;
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(35, W / H, 0.01, 200);
      this.camera.position.set(0, 0, 10);
      this.hud = new THREE.Scene();
      const u = ctx.u;
      this.titleSprite = ctx.text.sprite(`${id} · ${title}`, { role: 'ui', size: 26, weight: 600, tracking: 0.16, caps: true, color: C.AI_WHITE }, { height: 52 * u, anchor: 'left' });
      this.titleSprite.position.set(-W / 2 + W * 0.06, H / 2 - H * 0.1, 0);
      this.hud.add(this.titleSprite);
      this.subSprite = ctx.text.sprite(subtitle || ' ', { role: 'human', size: 30, color: C.HUMAN_SKIN }, { height: 56 * u, anchor: 'left' });
      this.subSprite.position.set(-W / 2 + W * 0.06, H / 2 - H * 0.16, 0);
      this.hud.add(this.subSprite);
      this.kitSprite = ctx.text.sprite(`placeholder — kit: ${kitNote}`, { role: 'ai', size: 22, color: C.AI_CYAN }, { height: 40 * u, anchor: 'left' });
      this.kitSprite.position.set(-W / 2 + W * 0.06, H / 2 - H * 0.205, 0);
      this.kitSprite.opacity = 0.7;
      this.hud.add(this.kitSprite);
      // progress line + beat ticks
      const lineMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(C.AI_CYAN), transparent: true, opacity: 0.6, depthTest: false });
      this.progress = new THREE.Mesh(new THREE.PlaneGeometry(1, 2 * u), lineMat);
      this.hud.add(this.progress);
      this.track = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.88, 1 * u), new THREE.MeshBasicMaterial({ color: new THREE.Color(C.UNREAD), transparent: true, opacity: 0.35, depthTest: false }));
      this.track.position.set(0, -H / 2 + H * 0.06, 0);
      this.hud.add(this.track);
      this.beats = [];
      for (let i = 0; i < 4; i++) {
        const m = new THREE.Mesh(new THREE.CircleGeometry(5 * u, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(C.AI_CYAN), transparent: true, depthTest: false }));
        m.position.set(W / 2 - W * 0.06 - (3 - i) * 22 * u, H / 2 - H * 0.1, 0);
        this.hud.add(m);
        this.beats.push(m);
      }
      this.barSprites = new Map();
      if (build) build.call(this, ctx);
    },
    update(t, ctx) {
      const { W, H, audio } = ctx;
      const p = clamp((t - this.start) / (this.end - this.start));
      this.progress.scale.x = Math.max(1, W * 0.88 * p);
      this.progress.position.set(-W * 0.44 + (W * 0.88 * p) / 2, -H / 2 + H * 0.06, 0);
      const bib = audio.beatInBar(t);
      const ph = audio.phase(t, 1);
      this.beats.forEach((m, i) => { m.material.opacity = i + 1 === bib ? 0.35 + 0.65 * Math.exp(-ph * 4) : 0.15; });
      this.titleSprite.opacity = 0.55;
      this.subSprite.opacity = 0.45;
      this.kitSprite.opacity = 0.4;
      if (animate) animate.call(this, t, ctx);
    },
  };
}

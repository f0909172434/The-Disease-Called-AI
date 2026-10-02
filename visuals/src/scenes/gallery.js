// Kit gallery (debug): ?gallery=1&t=12.5  — every kit component in its own tile.
// ?gallery=1&tile=3 renders a single tile full-frame for close inspection.
import * as THREE from 'three';
import { C } from '../core/palette.js';
import { buildTiles } from './galleryTiles.js';

export function makeGallery(ctx) {
  return {
    id: 'GALLERY', start: 0, end: ctx.duration, lyricMode: 'hidden',
    post: { bloom: 0.8, ca: 0.0008, grain: 0.03, vignette: 0.2 },
    init(ctx) {
      const only = ctx.params.has('tile') ? parseInt(ctx.params.get('tile'), 10) : -1;
      this.tiles = buildTiles(ctx);
      if (only >= 0) this.tiles = [this.tiles[only]];
      const n = this.tiles.length;
      this.cols = only >= 0 ? 1 : 4;
      if (only < 0 && n <= 4) this.cols = n;
      this.rows = Math.ceil(n / this.cols);
      const { W, H } = ctx;
      this.tw = Math.floor(W / this.cols); this.th = Math.floor(H / this.rows);
      for (const tile of this.tiles) {
        tile.camera.aspect = this.tw / this.th;
        tile.camera.updateProjectionMatrix();
        if (tile.setViewport) tile.setViewport(this.tw, this.th);
      }
      this.hud = new THREE.Scene();
      this.tiles.forEach((tile, i) => {
        const x = (i % this.cols) * this.tw, y = Math.floor(i / this.cols) * this.th;
        const s = ctx.text.sprite(`${String(i).padStart(2, '0')}  ${tile.label}`, { role: 'ui', size: 22, weight: 600, tracking: 0.12, caps: true, color: C.AI_WHITE }, { height: 30 * ctx.u, anchor: 'left' });
        s.position.set(-W / 2 + x + 14 * ctx.u, H / 2 - y - 22 * ctx.u, 0);
        s.opacity = 0.75;
        this.hud.add(s);
        if (this.cols > 1) {
          const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(this.tw - 2, this.th - 2)), new THREE.LineBasicMaterial({ color: new THREE.Color(C.UNREAD), transparent: true, opacity: 0.25 }));
          frame.position.set(-W / 2 + x + this.tw / 2, H / 2 - y - this.th / 2, 0);
          this.hud.add(frame);
        }
      });
    },
    update(t, ctx) {
      for (const tile of this.tiles) tile.update(t, ctx);
    },
    render(ctx) {
      const r = ctx.renderer, tgt = ctx.target;
      const H = tgt ? tgt.height : ctx.H, sx = (tgt ? tgt.width : ctx.W) / ctx.W, sy = H / ctx.H;
      this.tiles.forEach((tile, i) => {
        const x = (i % this.cols) * this.tw, y = Math.floor(i / this.cols) * this.th;
        const vx = Math.round(x * sx), vy = Math.round(H - (y + this.th) * sy), vw = Math.round(this.tw * sx), vh = Math.round(this.th * sy);
        tgt.viewport.set(vx, vy, vw, vh);
        tgt.scissor.set(vx, vy, vw, vh);
        tgt.scissorTest = true;
        r.setRenderTarget(tgt);
        if (tile.render) tile.render(ctx);
        else { const prev = r.autoClear; r.autoClear = false; r.render(tile.scene, tile.camera); r.autoClear = prev; }
      });
      tgt.viewport.set(0, 0, tgt.width, tgt.height);
      tgt.scissor.set(0, 0, tgt.width, tgt.height);
      tgt.scissorTest = false;
      r.setRenderTarget(tgt);
    },
  };
}

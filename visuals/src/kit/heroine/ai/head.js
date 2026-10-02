// AI character — head assembly: places the head-local drawing into a view (translate/scale/tilt
// about the neck) and exposes per-layer head draws.
import { headGeo, featureState, drawFace, drawEyes, drawBrows, drawNose, drawMouth, drawBlush, drawTears } from './face.js';
import { drawBackHair, drawFrill, drawFins, drawFrontHair, drawFrontLocks, drawAhoge, drawBand, drawHeadBow } from './hair.js';
import { lookOf } from './util.js';

/**
 * H: { x, y (view units of head-local origin = between the eyes), k (scale), tilt (rad), style (0..1),
 *      turn (yaw rad), pivot [x,y] head-local tilt pivot, hair: {...} options }
 */
export function withHead(pen, p, H, fn, { tilt = true } = {}) {
  const c = pen.c;
  c.save();
  c.translate(H.x, H.y);
  c.scale(H.k, H.k);
  const a = (tilt ? (H.tilt || 0) + (p.headTilt || 0) : 0);
  if (a) {
    const pv = H.pivot || [0, 150];
    c.translate(pv[0], pv[1]);
    c.rotate(a);
    c.translate(-pv[0], -pv[1]);
  }
  const by = (p.breath || 0) * 2;
  if (by) c.translate(0, by);
  const G = geoCache(H.style || 0, (H.turn || 0) + (p.turn || 0));
  fn(G);
  c.restore();
}

const cache = new Map();
function geoCache(s, turn) {
  const key = s.toFixed(3) + '/' + turn.toFixed(4);
  let g = cache.get(key);
  if (!g) { g = headGeo(s, turn); if (cache.size > 64) cache.clear(); cache.set(key, g); }
  return g;
}

export const headLayers = {
  backHair(pen, p, H) {
    withHead(pen, p, H, (G) => { drawBackHair(pen, p, G, H.hair || {}); drawFrill(pen, p, G); });
  },
  face(pen, p, H) {
    withHead(pen, p, H, (G) => drawFace(pen, p, G));
  },
  features(pen, p, H) {
    withHead(pen, p, H, (G) => {
      const F = featureState(p, pen);
      drawBlush(pen, p, G, F);
      drawBrows(pen, p, G, F, 1);
      drawEyes(pen, p, G, F);
      drawNose(pen, p, G);
      drawMouth(pen, p, G, F);
      drawTears(pen, p, G, F);
    });
  },
  frontHair(pen, p, H) {
    withHead(pen, p, H, (G) => {
      const o = H.hair || {};
      if (o.frontLocks !== false) drawFrontLocks(pen, p, G, o);
      drawFins(pen, p, G, o);
      drawFrontHair(pen, p, G, o);
      drawAhoge(pen, p, G);
      drawBand(pen, p, G);
      drawHeadBow(pen, p, G);
    });
  },
  overHair(pen, p, H) {
    withHead(pen, p, H, (G) => {
      const F = featureState(p, pen);
      drawBrows(pen, p, G, F, 0.4);
    });
  },
};

export { lookOf };

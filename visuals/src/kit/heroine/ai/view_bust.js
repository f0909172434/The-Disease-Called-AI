// AI character — BUST view (front, close-ups). Reference size 1000 x 1000; anchor = chin [500, 609].
// Head-local origin (between the eyes) at [500, 415], scale 1.75. Body is drawn in head-local units.
import { P, mirrorX, polyPath, lerp } from '../geom.js';
import { headLayers, withHead } from './head.js';
import { shape, stroke, ruffle, bowTie } from './outfit.js';
import { rgba } from '../palettes.js';

export const BUST_HEAD = { x: 500, y: 415, k: 1.75, style: 0, turn: 0, tilt: 0, pivot: [0, 150],
  hair: { bottom: 420, spread: 1, len: 560, lockBottom: 340, sideBottom: 228 } };

function sym(right) { return mirrorX(right, 0).reverse().concat(right); }

function drawBustBody(pen, p, H) {
  const pal = pen.pal;
  withHead(pen, p, H, (G) => {
    const br = (p.breath || 0);
    // ---- neck
    const neck = [P(-23, 70), P(-25, 120), P(-29, 156), P(29, 156), P(25, 120), P(23, 70)];
    const np = shape(pen, neck, pal.skin, null, 0, { id: 'neck' });
    pen.clip(np, () => {
      // chin shadow
      pen.fill(pen.curve([P(-30, 60), P(-26, 112), P(0, 126), P(26, 112), P(30, 60)], { closed: true }), pal.skinShade);
      pen.fill(pen.curve([P(10, 80), P(30, 80), P(30, 160), P(18, 160)], { closed: true }), pal.skinShade, 0.8);
    });
    stroke(pen, [P(-23, 100), P(-25, 124), P(-28, 148)], 1.5, pal.skinLine, { id: 'nkL' });
    stroke(pen, [P(23, 100), P(25, 124), P(28, 148)], 1.5, pal.skinLine, { id: 'nkR' });
    // ---- torso (navy dress): shoulders, puff sleeves
    const torsoR = [P(0, 150), P(30, 152), P(70, 160), P(112, 172), P(140, 188), P(156, 214), P(164, 262), P(170, 340), P(170, 420)];
    const torso = sym(torsoR);
    const tp = shape(pen, torso, pal.dress, pal.dressLine, 2.0, { id: 'torso' });
    pen.clip(tp, () => {
      // sleeve shading + arm separation
      for (const sd of [-1, 1]) {
        pen.fill(pen.curve([P(sd * 118, 200), P(sd * 150, 196), P(sd * 172, 240), P(sd * 176, 420), P(sd * 128, 420), P(sd * 124, 300)], { closed: true }), pal.dressShade, 0.9);
        pen.fill(pen.curve([P(sd * 128, 190), P(sd * 146, 200), P(sd * 152, 232), P(sd * 136, 214)], { closed: true }), pal.dressLight, 0.7);
      }
      // under-bust shadow
      pen.fill(pen.curve([P(-110, 300), P(-60, 318), P(0, 312), P(60, 318), P(110, 300), P(110, 340), P(-110, 340)], { closed: true }), pal.dressShade, 0.75);
    });
    // arm/sleeve seam lines
    for (const sd of [-1, 1]) {
      stroke(pen, [P(sd * 124, 196), P(sd * 128, 250), P(sd * 126, 330), P(sd * 128, 420)], 1.5, pal.dressLine, { id: 'seam' + sd });
      // puff gathers
      stroke(pen, [P(sd * 132, 186), P(sd * 140, 206), P(sd * 144, 228)], 1.1, pal.dressLine, { alpha: 0.7 });
      stroke(pen, [P(sd * 146, 196), P(sd * 156, 218), P(sd * 160, 246)], 1.1, pal.dressLine, { alpha: 0.6 });
    }
    // ---- white shirt front panel (pleated) + buttons
    const panelR = [P(0, 150), P(26, 152), P(46, 176), P(54, 250), P(50, 330), P(46, 420)];
    const pp = shape(pen, sym(panelR), pal.shirt, pal.shirtLine, 1.4, { id: 'panel' });
    pen.clip(pp, () => {
      for (const x of [-36, -22, 22, 36]) stroke(pen, [P(x, 180), P(x * 1.05, 260), P(x, 420)], 1.0, pal.shirtLine, { alpha: 0.45 });
      pen.fill(pen.curve([P(20, 150), P(60, 170), P(60, 420), P(30, 420)], { closed: true }), pal.shirtShade, 0.75);
      pen.fill(pen.curve([P(-60, 290), P(0, 300), P(60, 290), P(60, 340), P(-60, 340)], { closed: true }), pal.shirtShade, 0.6);
    });
    stroke(pen, [P(0, 182), P(0, 420)], 1.0, pal.shirtLine, { alpha: 0.6 });
    for (const y of [214, 256, 298]) {
      const b = new Path2D(); b.arc(0, y, 3.6, 0, Math.PI * 2);
      pen.fill(b, pal.dress);
      const b2 = new Path2D(); b2.arc(-1, y - 1, 1.2, 0, Math.PI * 2);
      pen.fill(b2, pal.dressLight);
    }
    // bust contour hints
    for (const sd of [-1, 1]) stroke(pen, [P(sd * 66, 286), P(sd * 84, 298), P(sd * 104, 296)], 1.3, pal.dressLine, { alpha: 0.7 });
    // ---- apron straps with ruffles over the shoulders
    for (const sd of [-1, 1]) {
      const strap = [P(sd * 66, 420), P(sd * 70, 330), P(sd * 82, 240), P(sd * 100, 186), P(sd * 116, 172)];
      ruffle(pen, strap, { depth: 15, count: 9, side: sd > 0 ? 1 : -1, id: 'rs' + sd, lw: 1.3 });
      const band = [P(sd * 58, 420), P(sd * 62, 330), P(sd * 74, 240), P(sd * 92, 182), P(sd * 108, 168), P(sd * 116, 172), P(sd * 100, 188), P(sd * 82, 242), P(sd * 70, 332), P(sd * 66, 420)];
      shape(pen, band, pal.apron, pal.apronLine, 1.3, { id: 'sb' + sd, tension: 0.9 });
    }
    // ---- collar (white, rounded flaps) + bow tie
    for (const sd of [-1, 1]) {
      const fl = [P(sd * 2, 150), P(sd * 18, 136), P(sd * 34, 138), P(sd * 44, 152), P(sd * 38, 168), P(sd * 18, 172), P(sd * 4, 160)];
      const fp = shape(pen, fl, pal.shirt, pal.shirtLine, 1.4, { id: 'col' + sd });
      pen.clip(fp, () => pen.fill(pen.curve([P(sd * 4, 160), P(sd * 30, 164), P(sd * 44, 156), P(sd * 44, 176), P(sd * 4, 176)], { closed: true }), pal.shirtShade, 0.9));
    }
    bowTie(pen, 0, 162, 1.0, 'btb');
  }, { tilt: false });
}

export const bustView = {
  size: [1000, 1000],
  anchor: [500, 609],
  head: BUST_HEAD,
  layers: [
    { name: 'backHair', draw: (pen, p) => headLayers.backHair(pen, p, BUST_HEAD) },
    { name: 'body', draw: (pen, p) => drawBustBody(pen, p, BUST_HEAD) },
    { name: 'face', draw: (pen, p) => headLayers.face(pen, p, BUST_HEAD) },
    { name: 'features', draw: (pen, p) => headLayers.features(pen, p, BUST_HEAD) },
    { name: 'frontHair', draw: (pen, p) => headLayers.frontHair(pen, p, BUST_HEAD) },
    { name: 'overHair', draw: (pen, p) => headLayers.overHair(pen, p, BUST_HEAD) },
  ],
};

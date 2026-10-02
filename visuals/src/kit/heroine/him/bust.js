// "Him" front bust view. Reference box 1000 x 1000, head-local origin (eye line centre) at (500, 400),
// chin at (500, 580) = anchor. Body shares the head's local frame (no tilt); the head rotates about
// the neck (local (0, 140)).
import { P, clamp } from '../geom.js';
import { paint, shade, ink, shapePath } from './kit.js';
import { headXf, drawBackHair, drawFace, drawFeatures, drawFrontHair, drawOverHair, drawFaceFx } from './face.js';
import { mirrorX } from '../geom.js';

const R = (pts) => pts.map((q) => P(q[0], q[1], q[2] || 0, q[3] ?? 1));
const M = (pts) => mirrorX(pts, 0);
const sym = (half) => R([...half, ...M(half).reverse()]);

export function bustXf(p, ox = 500, oy = 400, s = 1) {
  const br = clamp(p.breath || 0);
  const B = headXf({ x: ox, y: oy - br * 5 * s, s });
  const H = { x: ox, y: oy - br * 6 * s, s, rot: p.headTilt || 0, px: 0, py: 140 };
  return { B, H };
}

// ------------------------------------------------------------------ shared torso pieces (local coords)

const NECK = R([[-84, 70], [-87, 160], [-97, 226], [-128, 262], [-156, 300], [-60, 360], [0, 440], [60, 360], [156, 300], [128, 262], [97, 226], [87, 160], [84, 70]]);
// sternocleidomastoid + collarbones + throat
function neckDetail(pen, B, s, deep = 1) {
  const pal = pen.pal;
  const np = shapePath(pen, B.list(NECK), { id: 'neck' });
  // shadow under the jaw (head casts down-right)
  shade(pen, np, B.list(R([[-100, 60], [110, 60], [104, 186], [70, 200, 1], [30, 214], [0, 220], [-40, 205], [-72, 182, 1], [-100, 160]])), pal.skinShade, { id: 'neckSh' });
  // right flank of the neck in shade
  shade(pen, np, B.list(R([[64, 150], [100, 140], [110, 260], [160, 300], [120, 300], [80, 250]])), pal.skinShade, { id: 'neckR' });
  // muscles: sternocleidomastoid pair, throat, collarbones
  ink(pen, B.list(R([[-74, 128], [-52, 196], [-20, 258]])), 2.4 * s, pal.skinLineSoft, { id: 'scmL', start: 0.1, alpha: 0.8 });
  ink(pen, B.list(R([[76, 128], [54, 196], [22, 258]])), 2.4 * s, pal.skinLineSoft, { id: 'scmR', start: 0.1, alpha: 0.8 });
  ink(pen, B.list(R([[-6, 196], [0, 202], [7, 197]])), 2.2 * s, pal.skinLineSoft, { id: 'adam', alpha: 0.7 });
  ink(pen, B.list(R([[-18, 268], [0, 278], [18, 268]])), 2.2 * s, pal.skinLineSoft, { id: 'notch', alpha: 0.75 });
  if (deep) {
    ink(pen, B.list(R([[-26, 282], [-70, 288], [-112, 280]])), 2.2 * s, pal.skinLineSoft, { id: 'clavL', start: 0.2, alpha: 0.7 });
    ink(pen, B.list(R([[26, 282], [70, 288], [112, 280]])), 2.2 * s, pal.skinLineSoft, { id: 'clavR', start: 0.2, alpha: 0.7 });
    // sternum / pec split hint
    ink(pen, B.list(R([[0, 330], [-2, 380], [0, 420]])), 2 * s, pal.skinLineSoft, { id: 'stern', alpha: 0.5 * deep });
  }
  // neck side contour lines (thick neck)
  ink(pen, B.list(R([[-85, 104], [-88, 170], [-98, 226], [-126, 258]])), 4.4 * s, pal.skinLine, { id: 'neckL', start: 0.1, end: 0.2 });
  ink(pen, B.list(R([[85, 104], [88, 170], [98, 226], [126, 258]])), 4.4 * s, pal.skinLine, { id: 'neckR', start: 0.1, end: 0.2 });
  return np;
}

// ------------------------------------------------------------------ outfit A: blazer + open-collar shirt

function bodyLaunch(pen, p, B) {
  const pal = pen.pal;
  const s = B.s;
  // back collars (behind neck): blazer collar, then shirt collar stand
  paint(pen, B.list(sym([[-126, 200], [-132, 262]])), pal.blazerDeep, { id: 'bcol' });
  paint(pen, B.list(sym([[-98, 176], [-104, 246]])), pal.shirtShade, { id: 'scol' });
  ink(pen, B.list(R([[-98, 178], [-60, 172], [0, 170], [60, 172], [98, 178]])), 3 * s, pal.shirtLine, { id: 'scolT', start: 0.5, end: 0.5 });
  // neck + chest V
  const np = paint(pen, B.list(NECK), pal.skin, { id: 'neck' });
  void np;
  neckDetail(pen, B, s, 1);
  // shirt panels (V opening to the 2nd button)
  const shL = R([[-60, 244], [-36, 318], [0, 398, 1], [10, 610], [-300, 610], [-300, 330], [-150, 250]]);
  const shR = M(shL);
  for (const [i, sh] of [[0, shL], [1, shR]]) {
    const sp = paint(pen, B.list(sh), pal.shirt, { id: 'shirt' + i });
    // shade under the collar + right side
    shade(pen, sp, B.list(R(i ? [[40, 250], [150, 250], [140, 330], [70, 330], [30, 330]] : [[-150, 250], [-60, 246], [-50, 300], [-120, 320]])), pal.shirtShade, { id: 'shsh' + i });
    if (i) shade(pen, sp, B.list(R([[0, 398], [40, 400], [60, 470], [40, 560], [10, 610], [0, 610]])), pal.shirtShade, { id: 'shsh2' });
  }
  // placket + buttons + tension folds over the chest
  ink(pen, B.list(R([[4, 404], [6, 500], [7, 610]])), 2.2 * s, pal.shirtLine, { id: 'plk', alpha: 0.7 });
  for (const [i, y] of [[0, 452], [1, 548]]) {
    paint(pen, B.list(R([[-1, y - 6], [11, y - 6], [11, y + 6], [-1, y + 6]])), pal.button, { id: 'btn' + i, wash: false });
    ink(pen, B.list(R([[-2, y - 5], [12, y - 5], [12, y + 6], [-2, y + 6], [-2, y - 5]])), 1.6 * s, pal.shirtLine, { id: 'btn' + i, start: 1, end: 1 });
  }
  ink(pen, B.list(R([[-56, 430], [-30, 452], [-8, 462]])), 2 * s, pal.shirtLine, { id: 'fold1', alpha: 0.55, start: 0.1 });
  ink(pen, B.list(R([[58, 438], [34, 458], [16, 470]])), 2 * s, pal.shirtLine, { id: 'fold2', alpha: 0.55, start: 0.1 });
  ink(pen, B.list(R([[-50, 520], [-26, 538], [-8, 552]])), 1.8 * s, pal.shirtLine, { id: 'fold3', alpha: 0.45, start: 0.1 });
  // V edges of the shirt opening
  ink(pen, B.list(R([[-60, 246], [-36, 318], [0, 398]])), 3 * s, pal.shirtLine, { id: 'vL', start: 0.3, end: 0.6 });
  ink(pen, B.list(R([[60, 246], [36, 318], [2, 396]])), 3 * s, pal.shirtLine, { id: 'vR', start: 0.3, end: 0.6 });
  // collar leaves
  for (const side of [-1, 1]) {
    const m = (l) => (side < 0 ? l : M(l));
    const leaf = R(m([[-92, 186], [-146, 232], [-136, 338, 1], [-82, 294], [-60, 246, 1], [-84, 220]]));
    const lp = paint(pen, B.list(leaf), pal.shirt, { id: 'leaf' + side });
    shade(pen, lp, B.list(R(m([[-92, 186], [-146, 232], [-140, 280], [-100, 236], [-84, 220]]))), pal.shirtShade, { id: 'leafS' + side, alpha: side > 0 ? 1 : 0.6 });
    ink(pen, B.list(R(m([[-92, 186], [-146, 232], [-136, 338], [-82, 294], [-60, 246]]))), 3.4 * s, pal.shirtLine, { id: 'leaf' + side, start: 0.4, end: 0.6 });
  }
  // blazer body halves
  const bzL = R([[-120, 210], [-236, 254], [-336, 288], [-398, 322, 0, 0.8], [-434, 388], [-448, 482], [-454, 610], [-4, 610], [-4, 580, 1], [-44, 470], [-84, 330], [-100, 226]]);
  for (const side of [-1, 1]) {
    const m = (l) => (side < 0 ? l : M(l));
    const bz = m(bzL);
    const bp = paint(pen, B.list(bz), pal.blazer, { id: 'bz' + side });
    // shading: right half mostly in shadow; both: armpit side, under the pec
    if (side > 0) shade(pen, bp, B.list(R([[150, 380], [250, 300], [400, 300], [470, 400], [470, 620], [60, 620], [120, 520]])), pal.blazerShade, { id: 'bzSR' });
    shade(pen, bp, B.list(R(m([[-330, 460], [-372, 400], [-380, 620], [-300, 620], [-300, 520]]))), pal.blazerShade, { id: 'bzA' + side, alpha: 0.8 });
    // sleeve seam (deltoid) + sleeve light on the lit side
    const seam = R(m([[-398, 322], [-376, 400], [-366, 500], [-370, 610]]));
    if (side < 0) shade(pen, bp, B.list(R([[-404, 330], [-432, 392], [-440, 470], [-416, 450], [-398, 380]])), pal.blazerLight, { id: 'slvL', alpha: 0.8 });
    ink(pen, B.list(seam), 2.6 * s, pal.blazerLine, { id: 'seam' + side, start: 0.2, alpha: 0.85 });
    // sleeve tension folds over the biceps
    ink(pen, B.list(R(m([[-440, 470], [-416, 500], [-396, 540]]))), 2.2 * s, pal.blazerLine, { id: 'sf1' + side, alpha: 0.7, start: 0.1 });
    ink(pen, B.list(R(m([[-446, 545], [-420, 565], [-402, 600]]))), 2.2 * s, pal.blazerLine, { id: 'sf2' + side, alpha: 0.6, start: 0.1 });
    // outer silhouette
    ink(pen, B.list(R(m([[-120, 210], [-236, 254], [-336, 288], [-398, 322, 0, 0.8], [-434, 388], [-448, 482], [-454, 610]]))), 5 * s, pal.blazerLine, { id: 'bzO' + side, start: 0.3, end: 1 });
  }
  // lapels + collar
  for (const side of [-1, 1]) {
    const m = (l) => (side < 0 ? l : M(l));
    const lap = R(m([[-100, 220], [-86, 330], [-46, 470], [-6, 580, 1], [-62, 532], [-132, 452], [-176, 354], [-186, 338, 1], [-166, 326, 1], [-200, 314, 1], [-184, 260], [-134, 212]]));
    const lp = paint(pen, B.list(lap), pal.blazer, { id: 'lap' + side });
    // lapel shading: roll line side darker on the right, light catch on the left lapel
    if (side > 0) shade(pen, lp, B.list(R([[100, 220], [86, 330], [46, 470], [6, 580], [60, 530], [120, 440], [140, 330], [130, 220]])), pal.blazerShade, { id: 'lapS' });
    else shade(pen, lp, B.list(R([[-150, 340], [-176, 354], [-132, 452], [-70, 524], [-110, 446], [-140, 380]])), pal.blazerLight, { id: 'lapL', alpha: 0.85 });
    // cast shadow of the lapel onto the jacket
    const lapEdge = R(m([[-186, 340], [-176, 356], [-132, 454], [-62, 534], [-8, 584]]));
    ink(pen, B.list(lapEdge.map((q) => [q[0] + side * -6, q[1] + 8])), 9 * s, pal.blazerDeep, { id: 'lapC' + side, alpha: 0.55, start: 0.6, end: 0.2 });
    ink(pen, B.list(R(m([[-200, 314], [-184, 260], [-134, 212], [-100, 220]]))), 4.4 * s, pal.blazerLine, { id: 'colE' + side, start: 0.5, end: 0.3 });
    ink(pen, B.list(lapEdge), 4.4 * s, pal.blazerLine, { id: 'lapE' + side, start: 0.6, end: 0.4 });
    ink(pen, B.list(R(m([[-100, 222], [-86, 330], [-46, 470], [-6, 580]]))), 3.6 * s, pal.blazerLine, { id: 'roll' + side, start: 0.3, end: 0.5 });
    // gorge seam + notch
    ink(pen, B.list(R(m([[-166, 326], [-130, 300], [-94, 282]]))), 2.4 * s, pal.blazerLine, { id: 'gorge' + side, alpha: 0.9, start: 0.6 });
    ink(pen, B.list(R(m([[-200, 314], [-166, 326], [-186, 338]]))), 3 * s, pal.blazerLine, { id: 'notch' + side, start: 0.8, end: 0.8 });
    // pick stitch
    ink(pen, B.list(R(m([[-174, 362], [-138, 446], [-80, 516]]))), 1.4 * s, pal.blazerLight, { id: 'stitch' + side, alpha: 0.5, start: 1, end: 1 });
  }
}

// ------------------------------------------------------------------ outfit B: rumpled white shirt, no blazer

function bodyHome(pen, p, B) {
  const pal = pen.pal;
  const s = B.s;
  paint(pen, B.list(sym([[-98, 172], [-106, 246]])), pal.shirtShade, { id: 'scol' });
  ink(pen, B.list(R([[-98, 174], [-60, 168], [0, 166], [60, 168], [98, 174]])), 3 * s, pal.shirtLine, { id: 'scolT', start: 0.5, end: 0.5 });
  paint(pen, B.list(NECK.map((q) => [q[0], q[1] > 300 ? q[1] + 30 : q[1]])), pal.skin, { id: 'neck' });
  neckDetail(pen, B, s, 1);
  // shirt halves: deeper V (3 buttons open), slightly askew
  const shL = R([[-62, 240], [-40, 330], [-4, 440, 1], [6, 610], [-452, 610], [-448, 486], [-436, 392], [-402, 328, 0, 0.8], [-340, 292], [-236, 256], [-122, 214]]);
  const shR = R([[64, 236], [46, 330], [8, 438, 1], [-6, 610], [452, 610], [448, 486], [436, 392], [402, 328, 0, 0.8], [340, 292], [236, 256], [122, 214]]);
  for (const [i, sh] of [[0, shL], [1, shR]]) {
    const side = i ? 1 : -1;
    const m = (l) => (side < 0 ? l : M(l));
    const sp = paint(pen, B.list(sh), pal.shirt, { id: 'hs' + i });
    if (i) shade(pen, sp, B.list(R([[120, 260], [250, 260], [420, 330], [470, 620], [30, 620], [60, 470], [110, 380]])), pal.shirtShade, { id: 'hsR' });
    shade(pen, sp, B.list(R(m([[-340, 470], [-390, 410], [-410, 620], [-320, 620], [-300, 540]]))), pal.shirtShade, { id: 'hsA' + i, alpha: 0.9 });
    // pec underside shading (shirt clinging)
    shade(pen, sp, B.list(R(m([[-60, 500], [-160, 486], [-290, 480], [-310, 512], [-200, 530], [-80, 540]]))), pal.shirtShade, { id: 'hsP' + i, alpha: 0.85 });
    // shoulder seam (dropped a little) + rumpled folds
    ink(pen, B.list(R(m([[-392, 326], [-372, 410], [-362, 500], [-366, 610]]))), 2.4 * s, pal.shirtLine, { id: 'hseam' + i, alpha: 0.8, start: 0.2 });
    const folds = [
      [[-300, 300], [-250, 340], [-210, 400]], [[-250, 290], [-200, 320], [-170, 360]], [[-440, 440], [-410, 470], [-392, 520]],
      [[-446, 540], [-418, 556], [-400, 600]], [[-120, 400], [-90, 440], [-60, 470]], [[-200, 560], [-150, 575], [-100, 600]],
      [[-330, 520], [-300, 560], [-290, 610]],
    ];
    folds.forEach((f, k) => ink(pen, B.list(R(m(f))), 2.2 * s, pal.shirtLine, { id: 'hf' + i + k, alpha: 0.55 + (k % 3) * 0.1, start: 0.1 }));
    ink(pen, B.list(R(m([[-122, 214], [-236, 256], [-340, 292], [-402, 328, 0, 0.8], [-436, 392], [-448, 486], [-452, 610]]))), 4.8 * s, pal.shirtLine, { id: 'hsO' + i, start: 0.3, end: 1 });
  }
  // placket + buttons
  ink(pen, B.list(R([[4, 444], [5, 520], [6, 610]])), 2.2 * s, pal.shirtLine, { id: 'plk', alpha: 0.7 });
  paint(pen, B.list(R([[-1, 520], [11, 520], [11, 532], [-1, 532]])), pal.button, { id: 'btn', wash: false });
  ink(pen, B.list(R([[-60, 240], [-40, 330], [-4, 440]])), 3 * s, pal.shirtLine, { id: 'vL', start: 0.3, end: 0.6 });
  ink(pen, B.list(R([[64, 236], [46, 330], [8, 438]])), 3 * s, pal.shirtLine, { id: 'vR', start: 0.3, end: 0.6 });
  // collar: left leaf flipped up / crumpled, right leaf flat
  const leafL = R([[-92, 184], [-150, 214], [-156, 300, 1], [-110, 280], [-62, 242, 1], [-84, 218]]);
  const leafR = R([[92, 186], [150, 238], [128, 344, 1], [84, 300], [64, 238, 1], [84, 220]]);
  for (const [i, leaf] of [[0, leafL], [1, leafR]]) {
    const lp = paint(pen, B.list(leaf), pal.shirt, { id: 'hleaf' + i });
    shade(pen, lp, B.list(R(i ? [[92, 186], [150, 238], [140, 290], [100, 240]] : [[-92, 184], [-150, 214], [-120, 236], [-84, 218]])), pal.shirtShade, { id: 'hleafS' + i });
    ink(pen, B.list(leaf.slice(0, 5)), 3.4 * s, pal.shirtLine, { id: 'hleaf' + i, start: 0.4, end: 0.6 });
  }
  ink(pen, B.list(R([[-150, 250], [-128, 262]])), 1.8 * s, pal.shirtLine, { id: 'crum', alpha: 0.6 });
}

export function drawBustBody(pen, p, B) {
  if (p.outfit === 'home') bodyHome(pen, p, B);
  else bodyLaunch(pen, p, B);
}

// ------------------------------------------------------------------ view

export const BUST = {
  size: [1000, 1000],
  anchor: [500, 580], // chin
  boilUnit: 1,
  layers: [
    { name: 'backHair', draw: (pen, p) => drawBackHair(pen, p, bustXf(p).H) },
    { name: 'body', draw: (pen, p) => drawBustBody(pen, p, bustXf(p).B) },
    { name: 'face', draw: (pen, p) => drawFace(pen, p, bustXf(p).H) },
    { name: 'features', draw: (pen, p) => drawFeatures(pen, p, bustXf(p).H) },
    { name: 'frontHair', draw: (pen, p) => drawFrontHair(pen, p, bustXf(p).H) },
    { name: 'overHair', draw: (pen, p) => drawOverHair(pen, p, bustXf(p).H) },
    { name: 'fx', draw: (pen, p) => drawFaceFx(pen, p, bustXf(p).H) },
  ],
};

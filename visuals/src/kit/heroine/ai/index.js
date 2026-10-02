// AI character ("her", the whale maid) — module per CHARACTER_CONTRACT.md.
//   import { CHARACTER, renderView } from './ai/index.js';
// Views draw in their own reference units (caller sets the transform). Layers are back -> front.
import { Pen } from '../draw.js';
import { AI_PALETTES } from './palette.js';
import { DEFAULTS, palOf } from './util.js';
import { bustView } from './view_bust.js';

export const CHARACTER = {
  id: 'ai',
  palettes: AI_PALETTES,
  views: {
    bust: bustView,
  },
  defaults: DEFAULTS,
};

/** merge params with defaults */
export function params(p = {}) {
  return { ...DEFAULTS, ...p, gaze: { ...DEFAULTS.gaze, ...(p.gaze || {}) }, expr: p.expr || DEFAULTS.expr };
}

/** Pen for a view + params (palette look -> boil/painterly/lineScale) */
export function makePen(c, p, view, scale = 1) {
  const pal = palOf(p);
  const look = p.look ? { ...pal.look, ...p.look } : pal.look;
  return new Pen(c, { pal, boil: look.boil * (view.boilK ?? 1), boilSeed: p.boilSeed || 0, painterly: look.painterly,
    lineScale: look.lineScale * (view.lineK ?? 1), scale });
}

/**
 * Draw every layer of a view into context c (transform already maps view units -> pixels).
 * Returns { ms, layers: {name: ms} }.
 */
export function renderView(c, viewName, pIn = {}, { only = null, scale = 1 } = {}) {
  const view = CHARACTER.views[viewName];
  const p = params(pIn);
  const pen = makePen(c, p, view, scale);
  const out = { ms: 0, layers: {} };
  for (const L of view.layers) {
    if (only && !only.includes(L.name)) continue;
    const t0 = performance.now();
    c.save();
    L.draw(pen, p, c);
    c.restore();
    const dt = performance.now() - t0;
    out.layers[L.name] = dt;
    out.ms += dt;
  }
  return out;
}

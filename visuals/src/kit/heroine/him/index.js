// "Him" — the human lead (young AI engineer). Character module per ../CHARACTER_CONTRACT.md.
//   import { CHARACTER, renderView } from './him/index.js';
//   renderView(ctx, 'bust', { expr: { tired: 1 }, blink: 0.2, palette: 'drained', boilSeed: 2 });
// Views: full (3/4 standing, anchor = between the feet), bust (front, anchor = chin),
// profile (right-facing desk shot, anchor = chin). Params: see DEFAULTS in kit.js plus
// `outfit: 'launch' | 'home'` and `glow` (0..1 extra monitor light).
import { HIM_PALETTES } from './palettes.js';
import { DEFAULTS, resolve, makePen, grainTile } from './kit.js';
import { exprVals } from './face.js';
import { BUST } from './bust.js';
import { FULL } from './full.js';
import { PROFILE } from './profile.js';

export const CHARACTER = {
  id: 'him',
  palettes: HIM_PALETTES,
  views: { full: FULL, bust: BUST, profile: PROFILE },
  defaults: DEFAULTS,
};

/**
 * Draw every layer of a view into ctx (transform already maps reference units -> pixels).
 * opts.layers: optional list of layer names to draw. opts.scale: px per ref unit (glow sizes).
 */
export function renderView(ctx, viewName, params = {}, opts = {}) {
  const view = CHARACTER.views[viewName];
  const p = resolve(params);
  const ex = exprVals(p);
  const pen = makePen(ctx, p, view.boilUnit || 1, ex.pale);
  pen.scale = opts.scale || 1;
  for (const L of view.layers) {
    if (opts.layers && !opts.layers.includes(L.name)) continue;
    L.draw(pen, p, ctx);
  }
  return pen;
}

/**
 * Render a view into its own canvas (reference box scaled by `scale`) with the paper-grain
 * multiply masked to the drawn alpha. Returns { canvas, ms }.
 */
export function renderToCanvas(doc, viewName, params = {}, scale = 1, { grain = null, pad = 0 } = {}) {
  const view = CHARACTER.views[viewName];
  const [w, h] = view.size;
  const cv = doc.createElement('canvas');
  cv.width = Math.ceil((w + pad * 2) * scale);
  cv.height = Math.ceil((h + pad * 2) * scale);
  const ctx = cv.getContext('2d');
  const t0 = performance.now(); // timing only (not part of the pure draw)
  ctx.setTransform(scale, 0, 0, scale, pad * scale, pad * scale);
  ctx.lineJoin = 'round';
  const pen = renderView(ctx, viewName, params, { scale });
  const ms = performance.now() - t0;
  const g = grain ?? pen.look.grain;
  if (g > 0) {
    const tile = grainTile(doc);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.globalAlpha = 0.09 * g;
    ctx.fillStyle = ctx.createPattern(tile, 'repeat');
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
  return { canvas: cv, ms };
}

export { HIM_PALETTES };

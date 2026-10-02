// Scene transitions. A scene declares `transitionIn: { type, dur }` (applied at its start).
//
//   'cut'          hard cut on the boundary (default)
//   'whiteFlash'   cut + white flash peaking on the boundary, decaying over dur
//   'dipToBlack'   fade out the last dur/2 of the outgoing scene, fade in the incoming
//   'glitchCut'    cut + block-glitch / RGB-split burst around the boundary
//   'zoomThrough'  composite: outgoing scales up through the frame while the incoming grows in
//   'crossfade'    composite: plain crossfade over dur
//
// Post-type transitions only modify post params (cheap). Composite types render BOTH scenes
// during [boundary - dur/2, boundary + dur/2] and blend them (2x render cost in that window).
import { clamp, smoothstep } from './ease.js';

export const COMPOSITE_TYPES = new Set(['zoomThrough', 'crossfade']);

export function isComposite(spec) { return !!spec && COMPOSITE_TYPES.has(spec.type); }

/** overlap window [a, b] around a boundary for a composite transition */
export function compositeWindow(boundary, spec) {
  const d = spec.dur ?? 0.5;
  return [boundary - d / 2, boundary + d / 2];
}

/** mutate post params p for a post-type transition; dt = t - boundary (negative before) */
export function applyPostTransition(p, spec, dt) {
  if (!spec || spec.type === 'cut') return;
  const d = Math.max(spec.dur ?? 0.25, 1e-3);
  switch (spec.type) {
    case 'whiteFlash': {
      if (dt >= 0 && dt < d) p.flashWhite = Math.max(p.flashWhite, Math.pow(1 - dt / d, 2) * (spec.amount ?? 1));
      else if (dt < 0 && dt > -(spec.pre ?? 0)) p.flashWhite = Math.max(p.flashWhite, 1 + dt / (spec.pre ?? 1));
      break;
    }
    case 'blackFlash': {
      if (dt >= 0 && dt < d) p.flashBlack = Math.max(p.flashBlack, 1 - dt / d);
      break;
    }
    case 'dipToBlack': {
      const h = d / 2;
      if (Math.abs(dt) < h) p.fade = Math.max(p.fade, 1 - smoothstep(0, h, Math.abs(dt)));
      break;
    }
    case 'glitchCut': {
      if (Math.abs(dt) < d) {
        const k = 1 - Math.abs(dt) / d;
        p.glitch = Math.max(p.glitch, k * (spec.amount ?? 1));
        p.ca = Math.max(p.ca, 0.012 * k);
      }
      break;
    }
    default: break;
  }
}

/** progress 0..1 of a composite transition at time t */
export function compositeProgress(t, boundary, spec) {
  const [a, b] = compositeWindow(boundary, spec);
  return clamp((t - a) / (b - a));
}

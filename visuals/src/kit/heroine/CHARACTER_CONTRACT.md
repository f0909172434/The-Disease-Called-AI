# Character module contract (shared by both characters)

Two characters are drawn with the shared drawing foundation in this folder (`geom.js`, `draw.js`,
`palettes.js` = read-only for character work; put anything new in your own folder):

| Character | Folder | Preview page | Sheet |
|---|---|---|---|
| AI — whale-maid girl ("her") | `visuals/src/kit/heroine/ai/` | `visuals/tools/char_ai_preview.html` | `output/sheets/char_ai_design.jpg` |
| Human — young engineer ("him") | `visuals/src/kit/heroine/him/` | `visuals/tools/char_him_preview.html` | `output/sheets/char_him_design.jpg` |

Capture: `node visuals/tools/char_capture.mjs --page char_ai_preview.html --out output/sheets/char_ai_design.jpg`
(generic copy of `heroine_capture.mjs`; page sets `window.__done = true`, canvas id `c`).

## Module shape (`index.js` in each folder)

```js
export const CHARACTER = {
  id: 'ai' | 'him',
  palettes: { human, swapped, perfected, ... },   // css hex, plus `look` defaults like palettes.js
  views: {
    // name -> { size: [w, h] reference units, anchor: [x, y] (feet or chin, documented),
    //           layers: [{ name, draw(pen, p, ctx) }] in back-to-front order }
  },
  defaults: { ...params },
};
```

- Layer order (back → front): `backProps, backHair, farLimbs, body, face, features, frontHair, overHair, nearLimbs, fx`.
  A view may omit layers. Each layer draws only itself (so it can be cached as its own canvas later).
- Params `p` (all optional, numbers 0..1 unless noted): `t` (seconds), `blink`, `gaze {x,y}` (−1..1),
  `mouth {open, vowel:'A'|'I'|'U'|'E'|'O'}`, `expr {name: weight}`, `tears`, `blush`, `headTilt` (rad),
  `breath`, `hairSway`, `palette` (mode name), `boilSeed` (int; the rig will cycle 3 seeds at 12 fps).
- Pure functions of `p`: no `Math.random`, `Date`, `performance.now`. Use `geom.vnoise/sway/boilPts`.
- Draw in the view's reference units; the caller sets the transform.
- Original art only: redraw from the description/reference, never trace or embed reference images.
  No company names, logos or real-person likeness.

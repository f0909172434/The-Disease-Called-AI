# ai.js — "her", the AI (whale-maid girl): status

Sheets: `output/sheets/char_ai_design.jpg` (views / 8 expressions / palettes + glitch), `output/sheets/char_ai_face.jpg` (2× face close-up).
Render: `cd film && node render.mjs --soft-gl --loop=ai_sheet --sheet=1 --cols=1 --w=1920 --out=out/ai_sheet.jpg`.

## API
`ai(x, y, u, o)`: (x, y) is the ground point between her feet. She hovers `o.float` u above it (default .25, plus a slow bob), and her soft shadow stays on the ground. She is **10u tall, soles to crown, in both forms**. The ahoge and frill add ~0.6u. Medium shot u≈80–95; close-up u≈150–330 with `clip`.
- `form`: `full` (~6.6 heads) | `chibi` (~2.6 heads). `view`: `front` | `q` | `side` (full only; chibi side → q). `flip` mirrors.
- `pal`: `default` | `glow` (halo, glowing irises, cyan gem) | `amber` (warm, rougher `ink`); `pal2` + `palK` cross-fade (amber swap).
- Face: `eyes` (normal wide soft sad heart blank perfect happy closed), `mouth` (smile cat open A I U E O frown wobble flat perfect), `lookX/lookY`, `blink` (auto when undefined, never for `perfect`), `lid`, `brow` (-1 raised..1 worried), `blush`, `tilt`.
- Body: `dx/dy/sq/rot`, `fin` (-1 droop..1 perk), `flap`, `ahoge`, `tail`/`tailK`, `aL/aR` + `eL/eR` (arms; the default is hands clasped at the apron), `handL/handR` (relax/open/fist), `legL/legR`, `hairLag`, `headDx/headDy`, `seed`, `t`.
- FX: `glitch` 0..1 (sliding slices plus painted cyan/magenta scan marks; the 503 outage), `clip` [x0,y0,x1,y1] in world px (panels, phone screens), `emote` (sweat hearts sparkle note gloom) + `emoteK/emoteAge`, `draw(u, H)` hook, `boilKey`.
- `AI_EMO`: smile, gentle, eager, worried, heart, blank, sad, perfect. `aiFeel(name, t, over)` gives the idles; `aiEmotions(t, keys, {take})` gives acted changes (blink-anticipation, take, backOut settle, fin/ahoge springs, emote pop). `aiTalk(t, t0, t1)` gives visemes.
- Loops: `ai_sheet`, `ai_emotions` (6 s), `ai_faces`, `ai_face` (2×), `ai_glitch`.

## Cost (CPU-only SwiftShader; other renders running concurrently inflate this 1.5–3×)
Full figure at u=88: ~370–480 ms. Chibi at u=60: ~350–580 ms. Close-up at u=190: ~600–700 ms. Glow palette: about the same. Each `glow()` flushes p5.brush, so there are ≤4 per figure, and eye/gem glows only above k>25 px. The full sheet (21 figures) takes ~15 s.

## Done
Chibi front/q; full front/q/side; 8 expressions; 3 palettes and cross-fade; glitch; clip; per-part boil seeds (strip checked stable). Detail pass: layered eyes (tapered lash and flick, crease, 4-wash iris, pupil, streaks, 2+1 highlights, lower lashes); ~33 hair clumps with dip-dyed gradient tongues, highlight band, streaks, flyaways and stray strands; double ruffles with fluting; gold vine-and-sprig embroidery; bow and gem facets; fold lines; 2-tone shading with HB hatch; `ink` silhouettes and `inkfine` details.

## TODO / known weaknesses
- The profile is the weakest view: simple bangs, straighter hair, plain apron bow, one visible leg.
- In 3/4, the torso only compresses (the head carries the turn), and the far-side hair reads as a flat mass.
- No back/qback views. Hands are only relax/open/fist (no point or wave preset beyond `handL: 'open'` with arm angles).
- Clipped shapes drop their hatch. `clip` assumes no camera rotation.
- Squash pivots at the waist (she hovers), so the feet shift during takes.
- The medium-figure cost exceeds the original 400 ms target. It is within the revised ~800 ms budget; for crowds, use small u (details auto-drop below u≈25–30).

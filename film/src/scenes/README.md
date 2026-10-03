# src/scenes: how a shot is built

One short page of conventions. The pilot is `s00_intro.js` (00A–00D) and `s01_riff.js` (01A–01B): copy their
structure. Read `film/STORYBOARD.md` (§0 global rules, your section's reads) and `film/docs/ANIMATION_GUIDE.upstream.md`
first, then the STATUS files of the characters (`src/chars/*.STATUS.md`) and sets (`src/sets/STATUS.md`).

## Layout
- `_kit.js` is loaded first; then `s00_intro.js … s13_end.js`, one file per storyboard section (all already listed in
  `studio.html`; **edit only your own file**, never `studio.html`, `_kit.js` or another section's file. If the kit needs
  something, add it to `_kit.js` as a new `kit…` function and say so in your report).
- A section file is one IIFE: constants (cuts, times from the data), helpers, one function per shot (`s04a`, `s04b` …,
  the storyboard id lower-cased), and a single `shots([[t0, fn, { lyricMode }], …])` at the end.
- Globals are prefixed per owner: `kit…` kit, `him…` / `ai…` characters, `set…` sets. Keep everything else inside the IIFE.

## A shot
```js
function s01a(t, lt, dur) {            // t = video time, lt = time since the shot started, dur = its length
  camBegin(...);                       // 2D camera only: pan / zoom (<= 2) / roll. Always pair with camEnd()
  setSurface('desk', 'night', { res: 1 });          // sets: cached tiles + live light
  himWrist(...); ai(...);                           // characters, in world px
  camEnd();
  kitFlash(...);                       // full-frame effects last, in screen space
}
```
- **A shot paints the whole frame** (the engine only lays paper under it) and is a **pure function of `t`**.
- Name every cut after the data, not a typed number: `kitCut(bar, beat, fallback)` (bar grid from `tAt`),
  `kitEv('typing', 10, fallback)` (events.json), `sectionById('S01')` (**not** `section('S01')`: `section(t)` takes a *time*),
  `lyricById('IN_AI').start`, `onsets('kick')` (analysis). The storyboard's numbers are the fallback and the check.
  Cut **on** an event when the storyboard says cut on action (00B→00C cuts exactly on the key press `typing[10]`).
- Write the shot as its reads (the storyboard lists each read's window): comment them above the function, then check
  each one is on screen in its window (sheet at the midpoint, full-res crop of what the eye must find).
- Acting: use `kitMove(t, t0, t1, { ant, over })` for anticipation + overshoot, `himEmotions` / `aiEmotions` for faces
  (never swap eyes / mouth by hand), `aiAct` / `aiClimb` for her, `kitEnv(t, t0, atk, dec)` for impacts, `spring()` /
  `ring()` for settles. One arm leads, the other follows; offset phases between hands.

## `_kit.js` (all pure functions of time)
| group | what |
|---|---|
| time | `kitWin(t, a, b)` → `{k, on, age, left}` (a read window) · `kitCut` · `kitEv` · `kitEnv` · `kitMove` · `kitOver` · `kitEase.{in2,out2,inOut3,expoIn,expoOut,sine}` |
| camera | `kitCam(lt, keys, {drift, shake})` keyframed camera (calls `camBegin`) · `kitZoom` (equal-ratio zoom, even speed) · `kitAnchor(wx, wy, sx, sy, zoom)` (camera that puts a world point on a screen point: **match cuts**) · `kitDrift` · `kitWhipOut/kitWhipIn` + `kitSmear` (whip pan with streaks) |
| transitions | `kitFadeIn/kitFadeOut/kitFade` (to/from the void colour, never pure black) · `kitFlash(k)` (cyan-white light) · `kitSpill(k, x, y)` (light pouring out of a source; 00C→00D) · `kitXfade(k, drawA, drawB)` (cross dissolve of two whole frames: costs ~8 s/frame on this box, use it for ≤ 6 frames) |
| debug | `kitGuide()` = the subtitle-safe line y = .76 H, wrapped around `drawWorld` so no shot calls it. Off by default; `?safe` in the studio URL, or in a render `--inject=tools/safe_guide.js` |

Seams: every seam has a transition (storyboard `〔入：…〕`): fade from black, light spill, flash, dissolve, cut on action,
match cut, whip pan. Hard cuts only where the storyboard says (11.16 smash cut, 07C, 206.51).

## cachedLayer keys (and what stays in the cache)
- Static paint (backgrounds, set dressing, a character that does not move) goes in `cachedLayer(key, 3, fn)`: painted once per
  boil drawing per worker (~10–30 s each on this box), then one image per frame. **Everything fn draws must depend only on the key**:
  anything that changes goes in the key or is drawn live after it. Key = `'sNN<shot> <what>'` (`'s00b bg'`), unique across the film.
- The page keeps **24 layers** (LRU). One set framing is tiles × 3 drawings; check a shot stays under it (over it every frame repaints).
  Use `window.mvInfo().layers` (`misses` keeps growing = thrashing).
- A camera move over a cached set needs a **fixed `res`** (`setSurface(..., { res: 1 })`, `setChart(..., { res: 1 })`) or each
  zoom step repaints the tiles. Keep zoom ≤ 2 (p5.brush collapses outlines past it); draw bigger (`u`) for a closer look.
- Never draw a cached layer inside another one's fn. Paint characters live (they act); cache only what holds still.

## Subtitle-safe rule and lyricMode
- Karaoke subtitles sit in the bottom 22 %: EN baseline y = .865 H (934), 中文 .925 H (999). **While someone sings or speaks,
  faces, hands and key props stay above y = .76 H (821)**; below it only floor / blanket / ash. Instrumental stretches (S01) are free.
  Check with the guide: `node render.mjs --inject=tools/safe_guide.js --sheet=…`.
- `lyricMode` is the 3rd element of the `shots()` entry: `'karaoke'` (default), `'subtitle-only'` (EN is in the picture: 00C, 12B–12D),
  `'hidden'` (13A), or `(t, lt) => mode`. S00: 00A `karaoke` (no line sounds), 00B `karaoke`, 00C `subtitle-only`, 00D `karaoke`;
  S01 `karaoke` (instrumental, nothing shows).
- Only whitelisted text appears in the picture (STORYBOARD §0), always through the sets' `setLetter` / `setTyped` / `letter()`.

## Determinism
Frames render in parallel and out of order: no `Math.random`, no counters, no state between frames, nothing integrated.
`hash(i)` for fixed per-object randomness; `jit()` / `random()` are the boil (reseeded 12×/s). Call `boilSeed('unique key')`
before every separate element that you paint yourself, so one moving thing never re-boils the rest; give every character
call a `boilKey` (`him` / `ai` count their calls otherwise, and a character that appears mid-shot would shift the others).
Check: `node tools/check_determinism.mjs --times=…` (exit 1 on any difference).

## Cost
Budget ~2 s/frame/worker for a typical shot (≈1 s for screens and text); heavy shots (two characters + set) ≤ 3 s. Cold paint
costs add once per worker. Measure the real capture path, one worker, from a time inside the shot:
`node render.mjs --bench=12 --from=12.0` (first frame is cold; the rest is the number to report).
Cheap habits: static → `cachedLayer`; one `glow()` is ~30 ms (it flushes the brush) so batch lights; no `fill:` in live paint.

## Review commands (run from `film/`; look at every image)
```
node render.mjs --sheet=11.17,11.6,12.0 --cols=3 --w=640 --out=out/check/a.jpg               # contact sheet at the reads' midpoints
node render.mjs --strip=12.4:12.9 --cols=6 --w=320 --out=out/check/strip.jpg                  # every frame of a motion / transition
node render.mjs --sheet=13.8 --crop=800,150,900,760 --cols=1 --w=900 --out=out/check/c.jpg    # full-res crop: faces, hands on props, text
node render.mjs --inject=tools/safe_guide.js --sheet=5.4 --out=out/check/safe.jpg            # the subtitle-safe line
node tools/check_determinism.mjs --times=3.0,6.9,12.0,16.0                                   # same t, any process, any order
node render.mjs --video --from=0 --to=22.33 --workers=2 --out=../output/preview/s00_s01.mp4  # preview with audio
```
`--redo` re-renders chunks after a shot changed. Add `--lyrics=hidden` to a sheet to see the picture alone.

## Gotchas found building S00–S01
- `section(t)` takes a time; `sectionById('S01')` takes an id (the engine README's `section('S04')` example is wrong).
- `kitCut` / `tAt` follow the analysed beats (±25 ms in the drumless intro); events.json times are the score's: use events for
  cut-on-action and typed text, the bar grid for the rest.
- `him({pose:'desk'})` is ~24u tall seated: u 34 fills the frame; it has no `HIM_LAST.head`. Close-ups: `pose:'bust'` needs `cut` large
  enough that its cut edge is off frame.
- `himWrist`'s band is all-or-nothing (`bandK` > 0 draws the strip from the far side of the wrist to `bandEnd`; < 1 it arches over
  the hand); stage the band end where her hand is and let her arm reach it with `reachLW / reachRW` (world px).
- `ai()` `clip` is in the coordinates of the call (inside a camera: world px). A chibi climbing out of an edge: anchor her at the edge.
- Reflections / hooks painted inside `lens(i, rect)` are in head pixels (`rect` already includes `HIM_HS`).
- A fresh `get()` image costs ~4 s on its first draw (texture upload on SwiftShader): that is what makes `kitXfade` slow.

# Visual engine — status

## Done
- Deterministic Three.js r170 engine (vendored, offline): director, audio accessor, post chain, camera rig, transitions, text, lyrics overlay.
- Kit: Ring, Silhouette (particle fallback), Eye, ChatUI, TypingDots, Room, CityWindows, HUD, Particles (dust/fever/confetti/snow), KineticText, typing primitives, GlassSlab.
- S00 INTRO fully implemented (shots 0.1–0.5); S01–S13 are placeholders (section title + main kit element).
- render.mjs (parallel Chromium workers, resumable chunks, ffmpeg concat), contact_sheet.mjs, tools/check_determinism.mjs (passes).
- Black level fixed: bloom now uses a tight mip falloff + toe (`bloomToe`), threshold 0.2. Before, wide bloom mips lifted blacks to about 40/255 in busy frames. Now they stay at VOID (5,6,10). Grain was already zero-mean.
- Glass UI depth: `ChatUI({depth})`, `TypingDots({slab:true})` and `BubbleOutline({depth})` + `updateGlass(t)` draw real glass slabs with thickness, bevel highlights, edge-lit sides and refraction-like face shading. S00's two bubbles use it.

## Measured (1920x1080, S00 4–9 s, 150 frames, x264 slow, another process using ~1 core)
- workers=1: 0.741 s/frame wall
- workers=2: 0.555 s/frame wall (1.11 s/frame per worker), so 2 workers is about 25% faster
- bench without encoding: about 0.47 s/frame

## Commands (repo root)
- `node visuals/render.mjs --fps 30 --from 0 --to 215 --out output/video_noaudio.mp4 --workers 2`
- `node visuals/contact_sheet.mjs --times 0.35,2.3,3.5,4.6,5.3,5.62,6.4,7.6,8.9,9.65,10.3,10.75 --out output/sheets/S00.jpg`
- `node visuals/contact_sheet.mjs --times 2.2,6.6 --cols 1 --tile 1920 --query gallery=1 --out output/sheets/kit_gallery.jpg`
- `node visuals/tools/check_determinism.mjs`
- Preview: serve visuals/ and open `index.html?t=6.6`, `?play=1`, `?gallery=1&tile=6`

## Remaining / known issues
- Characters: S00 will switch from the Silhouette to the new 2D anime rigs (male human OC, female "whale maid" AI). Silhouette realism work has stopped.
- S01–S13 still need real scenes. The timeline is a placeholder until data/timeline.json exists.
- CJK fonts come only in Regular and Bold. There is no emoji font, so icons are drawn procedurally.
- The perf numbers were taken on a shared machine. Trails and composite transitions double the render cost of those frames.
- Gitignore output/ at the repo level (visuals/.gitignore covers node_modules and *.chunks).

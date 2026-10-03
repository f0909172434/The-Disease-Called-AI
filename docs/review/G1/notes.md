# G1 notes: S02 + S03 (22.33-55.81). s/frame = Metal, 1 worker, warm cache (first frame of a shot +0.5-1.7 s to paint cached layers).

- 02A 22.33-27.91: morning room (bedWall, fixed res .78), live clock hop + painted sleeve/hand slap (23.72), glow beats the blind light from 25.29, silhouette her waves at "sun" (26.22), duvet swells over the lens 27.50. ~0.05 s (0.95 s cold). Weak: hand is a mitten; shadow-puppet arm is small; 01B's end is not mine, so it opens on a decaying cyan flash.
- 02B 27.91-30.70: wardrobe + big phone (her u 26 inside) + him with two shirts; ✓ at 28.26 / 29.65 (notification events), warm shirt thrown, grey hung on the chair, noodles + apple, slurp. ~0.13 s (1.7 s cold). Weak: phone hand is huge/flat; room is dim; grey shirt ends mostly hidden behind the phone; his face small.
- 02C 30.70-33.49: week calendar, her in the left margin (u 40) throws 3 blocks then the rest cascade (full 31.40), amber finger presses ↻ 32.26, scan-band rewind 32.44 replays the fill, tilt down to 02D in the last 0.34 s. ~0.09-0.3 s. Weak: cascade pops cells instead of dropping; finger is a plain tube; tilt glass has no watercolour bloom.
- 02D 33.49-36.28: desk top, grey phone, still dots, two day shafts with a night between, cobweb + spider, cyan glow on the top edge. ~0.4 s. Weak: no character, relies on web size.
- 02E 36.28-39.07: big phone (same spot as 02D's), amber line, cyan line overtakes from 37.00, sent 37.52, ♥ + tiny her 37.70, his take 37.85 then laugh 38.30, slight push. ~0.06 s. Weak: amber line is small; room dimmed with a wash.
- 02F 39.07-41.86: split screen (brush stroke 39.07), her (u 48, no blinks, waving) | him yawning/dozing/waking 41.16 with window dusk->night (live blinds, no room tiles). End: left panel shrinks into the phone, 6-frame xfade into 02G. ~0.25-0.55 s (xfade ~1.2 s).
- 02G 41.86-44.65: bed from above, side-lying him with raised finger, pillow phone with nodding her, shake + ♥ at 44.16, expo push into the phone and fade to the glass colour. ~0.1-0.6 s. Weak: sidelie duvet silhouette reads like a blue sack.
- 03A 44.65-50.23: macro dots -> pan to his held-breath face (hold at 45.82) -> xfade to the bed-edge medium, pull back, dots slow/stop (48.40-48.86), red at 49.01 with red flood, slow fall. ~0.04-0.55 s (1.6 s on the xfade frames). Deviation: he faces RIGHT here (the cached room tiles do not draw under a mirror, and the bed lies behind him); the dots sit on his right.
- 03B 50.23-53.02: overhead on the bed, bounce, her pops out of the phone's light (an interface element, instant) at 50.92 and steps onto his chest, stethoscope listening from 51.92, weak heart flicker 52.30/52.78, dim wash so she is the brightest. ~0.12 s. Weak: stethoscope chest piece is small; he reads as standing (top view of a lying figure).
- 03C 53.02-55.81: chest ECU (figure scaled 30->62u with the zoom), loading ring turns, 54.90 fast pull + speed lines, ring rises/flattens to the lamp ellipse at screen (960, 550) (G2: 04A's lamp should be at 960,550 = SET_WARD.cam.lamp), white flash from 55.47. ~0.03-0.4 s. 

Determinism: check_determinism over 22.5:55.8:1.5 had 4 diffs (37.5, 39, 42, 55.5); re-rendered in two orders: 37.5 and 55.5 identical, 42 at 62 dB (noise).
Shared-file requests: none required. (him 'lie' cannot be rotated head-up without wrapping it; ai silhouette `silOp` is 0-255, not 0-1.)

## Fix #1
- 03B/02G/03C: camera rolled -pi/2 (pillow at left, he lies across the frame, head left; her counter-rotated upright on his chest; 02G phone leans above his face, face up the frame). Surface variant 'dusk' for visible pillow/duvet. 03C stays rolled; ring still ends at screen (960, 550).
- 03A: face plane is a real side close-up (bust u 96, flip, eyes ~0.42H, hold cheeks, stronger dots flicker); only HE is flipped (faces left): he sits at the bed's head end, room not mirrored.
- 02B: check 190 px with ink + glow; phone hand shrunk (PU 190).
- 02C: cells fall from above with overshoot. 02A: hand fingers separated.
- Determinism: 1/8 times differed (noise-level, same as before).

LOOPS.smoke = t => { paint(ellPts(960, 540, 300, 200, 30), { wash: PAL.clay, ink: PAL.ink, sw: 1 }); inkLine([[600, 800], [960, 760], [1300, 820]], 1.2); };
LOOPS.smoke.len = 1;
// load test: 250 washed + inked shapes and 150 ink lines (roughly two detailed characters)
LOOPS.load = t => { for (let i = 0; i < 250; i++) { const x = 100 + (i % 25) * 70, y = 120 + Math.floor(i / 25) * 85; paint(ellPts(x, y, 28, 20, 20, 1), { wash: i % 2 ? PAL.clay : PAL.sky, ink: PAL.ink, sw: .8 }); }
  for (let i = 0; i < 150; i++) inkLine([[60 + i * 12, 980], [70 + i * 12, 1010], [64 + i * 12, 1040]], .8); };
LOOPS.load.len = 1;

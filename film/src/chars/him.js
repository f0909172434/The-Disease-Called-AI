// him.js: the human lead (original young engineer). Painted with p5.brush via paint()/inkLine().
LOOPS.him_test = t => {
  const sws = [.2, .35, .5, .8, 1.2, 1.8];
  sws.forEach((sw, i) => {
    boilSeed('l' + i);
    inkLine([[100, 100 + i * 60], [400, 80 + i * 60], [700, 110 + i * 60]], sw, PAL.ink, 'ink', .5);
    inkLine([[800, 100 + i * 60], [1100, 80 + i * 60], [1400, 110 + i * 60]], sw, PAL.ink, 'inkfine', .5);
    paint(ellPts(1600, 100 + i * 60, 60, 25, 24), { wash: '#F2CDB0', ink: PAL.ink, sw, curv: .5 });
  });
  boilSeed('h');
  paint(ellPts(300, 700, 200, 150, 30), { wash: '#2E4A8C', ink: PAL.ink, sw: 1, hatch: { d: 6, a: .8, b: 'HB', c: '#1E2E5C', w: .6 } });
  paint(ellPts(800, 700, 200, 150, 30), { wash: '#F2CDB0', ink: PAL.ink, sw: 1 });
  paint(ellPts(850, 650, 100, 60, 30), { wash: '#E2A080', washOp: 120, ink: null });
  paint(ellPts(750, 750, 80, 40, 30), { wash: '#E77A7A', washOp: 60, ink: null });
  paint(ellPts(1300, 700, 200, 150, 30), { wash: '#433C52', ink: PAL.ink, sw: 1 });
  paint(ellPts(1300, 650, 120, 30, 30), { wash: '#6B6788', ink: null });
  inkLine([[1150, 750], [1300, 720], [1450, 760]], .5, '#1E1A26', 'ink', .5);
};
LOOPS.him_test.len = 1;

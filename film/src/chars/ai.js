// ai.js: the AI (original whale-maid girl). Painted with p5.brush via paint()/inkLine().
LOOPS.ai_cal = t => {
  const brs = ['ink', 'inkfine', 'HB', 'pen', 'rotring', 'marker', 'cpencil', '2B'];
  brs.forEach((b, i) => {
    [.2, .4, .7, 1, 1.5].forEach((sw, j) => {
      boilSeed('c' + i + j);
      inkLine([[80 + j * 360, 80 + i * 120], [200 + j * 360, 60 + i * 120], [380 + j * 360, 100 + i * 120]], sw, '#1F2440', b, .5);
    });
  });
  boilSeed('w');
  paint(ellPts(300, 1000, 120, 50, 30), { wash: '#2F4FA0', ink: '#1F2440', sw: .5, br: 'inkfine', curv: .5 });
  paint(ellPts(600, 1000, 120, 50, 30), { wash: '#2F4FA0', washOp: 140, ink: null });
  paint(ellPts(900, 1000, 120, 50, 30), { wash: '#2F4FA0', ink: '#1F2440', sw: .3, br: 'pen' });
  paint(ellPts(1200, 1000, 120, 50, 30), { wash: '#FCE6D8', ink: '#1F2440', sw: .4, br: 'inkfine', hatch: { d: 6, a: .7, b: 'HB', c: '#F0A0A0', w: .5 } });
};
LOOPS.ai_cal.len = 1;

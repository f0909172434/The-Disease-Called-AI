// sheet.js: review loops for the sets. LOOPS.sets_sheet shows one set variant per second of loop time (frame i at
// t = i + .x, labelled), so a contact sheet of t = 0,1,2,... is the labelled thumbnail sheet and --crop on any t is the
// full-resolution detail check. LOOPS.sets_props is the props page. SET_SHEET lists the entries ([label, story t, draw]).
//   node render.mjs --loop=sets_sheet --sheet=0,1,2,...,N-1 --cols=5 --w=384 --out=../output/sheets/sets.jpg
//   node render.mjs --loop=sets_sheet --sheet=12 --crop=900,500,700,500 --w=700 --out=out/check/crop.jpg
const setSheetRoom = (v, o = {}, after = null) => (t) => {
  camBegin(...(o.cam || SET_ROOM.cam.full)); setRoom(v, { t, ...o });
  if (o.screen !== false) setRoomScreen(o.screen || 'glow', { col: o.scol, k: o.sk });
  if (after) after(t);
  camEnd();
};
const SET_SHEET = [
  ['room · night (S00–S01)', 1.2, setSheetRoom('night')],
  ['room · morning (02A–02B)', 23, setSheetRoom('morning', { screen: 'off' })],
  ['room · day (02C–02E)', 31, setSheetRoom('day')],
  ['room · dusk (02F)', 39.5, setSheetRoom('dusk', { p: 0 })],
  ['room · dusk → small hours p .7 (02G–S03)', 42, setSheetRoom('dusk', { p: .7 })],
  ['room · drained + grey snow (S06)', 90, setSheetRoom('drained', {}, t => setRoomSnow({ t }))],
  ['room · 503 black (S07)', 113.5, setSheetRoom('black503', { screen: 'off' }, t => { setPhone(1500, 2190, 120, { rot: 1.35, glass: 'white', glow: .9, glowCol: SET_C.white503 }); glow(1500, 2150, 520, SET_C.white503, .35); })],
  ['room · scan-light black (11A)', 192, setSheetRoom('scan', { screen: S => { setScreenGlass(S, 'black'); glow(S.X(.5), S.Y(.55), S.h * .5, SET_C.amber, .8); } })],
  ['room · dawn (12C)', 202, setSheetRoom('dawn', { screen: 'off' }, t => setBandCut(2350, 1598, .55, { pal: setRoomPal('dawn') }))],
  ['room · night, desk framing + chat (00B/00C)', 6.8, setSheetRoom('night', { cam: SET_ROOM.cam.desk, screen: S => setChatScreen(S, 6.8, { reply: { t: 5.58, text: 'Always.' } }) })],
  ['room · morning, bed wall (02A)', 24, setSheetRoom('morning', { cam: SET_ROOM.cam.bedWall, screen: 'off' }, t => setClock(...SET_ROOM.clock, 1, { pal: setRoomPal('morning'), ring: 1, jump: 14, t, key: 'live' }))],
  ['room · drained, right wall (06E/06H)', 104, setSheetRoom('drained', { cam: SET_ROOM.cam.rightWall, photos: 'none' }, t => {
    SET_ROOM.photos.forEach((px, i) => setPhotoFrame(px, SET_ROOM.ledge[2], 1, { pal: setRoomPal('drained'), i, grey: i < 2 ? 1 : 0, rot: i === 0 ? 1.2 : i === 1 ? .5 : 0, key: 'live' + i }));
    setDoor(...SET_ROOM.door, 1, { pal: setRoomPal('drained'), knock: { k: 1, age: frac(t * 2.3) * .5, knocks: Math.floor(t * 2.3) }, key: 'live' });
    setRoomSnow({ t });
  })],
  ['room · dawn, keyboard + cut band (12C)', 201, setSheetRoom('dawn', { cam: [2350, 1560, 2.2], screen: S => setChatScreen(S, 201, { style: 'line', cursorFrom: 196.74 }) }, t => setBandCut(2350, 1598, .55, { pal: setRoomPal('dawn') }))],
  ['surface · desk top: grey phone, cobweb (02D)', 35.5, t => {
    camBegin(960, 540, 1); setSurface('desk', 'day');
    const S = setPhone(1100, 640, 520, { rot: .12, body: '#8E9099', screen: S => setGroupScreen(S) });
    setCobweb(1290, 330, 1.6, { pal: setRoomPal('day'), k: .8, r: 150, a0: Math.PI * .45, a1: Math.PI * 1.05 }); setSpider(1180, 340, 1.4, { pal: setRoomPal('day'), drop: 110, t });
    setShaft([200, -100], [900, 1200], 380, '#FFF2D8', .35); camEnd(); }],
  ['surface · bed top: diary, pages, phone (06G)', 101, t => {
    camBegin(960, 540, 1); setSurface('bed', 'drained');
    setDiary(700, 560, 1, { pal: setRoomPal('drained'), torn: 3 }); setPage(1250, 330, .8, { pal: setRoomPal('drained'), rot: .5 + t, curl: .4 });
    setPillowPhone(1380, 640, 300, { k: .8 }); camEnd(); }],
  ['ward · C1 (S04)', 57, t => { camBegin(...SET_WARD.cam.full); setWard('c1', { t }); setWardTubes('c1', { t }); camEnd(); }],
  ['ward · C2 red alarm, many tubes (S08)', 121, t => { camBegin(...SET_WARD.cam.full); setWard('c2', { t }); setWardTubes('c2', { t }); camEnd(); }],
  ['ward · FINAL line drawing (S10)', 168, t => { camBegin(...SET_WARD.cam.full); setWard('final', { t }); setWardTubes('final', { t }); camEnd(); }],
  ['ward · C1 bed framing (04B)', 59, t => { camBegin(...SET_WARD.cam.bed); setWard('c1', { t }); setWardTubes('c1', { t }); camEnd(); }],
  ['ward · C1 lamp framing (04A)', 56, t => { camBegin(...SET_WARD.cam.lamp); setWard('c1', { t, flash: .6 }); camEnd(); }],
  ['screen · loss curve (00A)', 2.3, t => { setScreenFull('night'); setLoss(setScr(0, 0, W, H), 3.6, { spark: .7 }); }],
  ['screen · chat: typed, Always. (00C)', 6.7, t => { setScreenFull('night'); setChatScreen(setScr(0, 0, W, H), t, { reply: { t: 5.58, text: 'Always.' }, bg: false }); }],
  ['screen · chat: typing with typo (00C 3.7)', 3.75, t => { setScreenFull('night'); setChatScreen(setScr(0, 0, W, H), t, { bg: false }); }],
  ['screen · week calendar (02C)', 31.8, t => { setScreenFull('night'); setCalendar(setScr(0, 0, W, H), { filled: 17.6, refresh: .3 }); }],
  ['screen · group chat, grey phone (02D)', 34, t => { setScreenFull('grey'); setPhone(W / 2, H / 2, 980, { body: '#8E9099', screen: S => setGroupScreen(S) }); }],
  ['screen · mum calling (06A)', 84.2, t => { setVoidLayer('ash'); setPhone(W / 2, H / 2, 980, { screen: S => setCallScreen(S, { buzz: frac(t) * .9 }) }); }],
  ['screen · mum greyed (06B)', 88.3, t => { setVoidLayer('ash'); setPhone(W / 2, H / 2, 980, { screen: S => setCallScreen(S, { grey: 1 }) }); }],
  ['screen · 503 (07C)', 112.3, t => { setScreenFull('white'); set503Screen(setScr(0, 0, W, H), { spin: .4, stall: .2, stamp: .3 }); }],
  ['screen · outro typed (12B)', 199.9, t => { setChatScreen(setScr(0, 0, W, H), t, { style: 'line', cursorFrom: 196.74 }); }],
  ['screen · her dots (12D)', 205, t => { setChatScreen(setScr(0, 0, W, H), t, { style: 'line', cursorFrom: 196.74, dotsFrom: 204.07 }); }],
  ['screen · three dots, eighth-note wave (03A)', 45.1, t => { setScreenFull('night'); setDots(W / 2, H / 2, 70, { t, glow: .8 }); }],
  ['screen · marks ✓ ♥ ↻ + bubbles (02B/02E)', 28.4, t => { setScreenFull('night'); setCheck(500, 380, 220, SET_C.cyan, { glow: .5 }); setHeart(960, 380, 220, SET_C.fever, { glow: .5 }); setRefresh(1420, 380, 220, SET_C.cyan, { glow: .5 });
    setBubble(300, 760, { side: 'ai', bars: [1, .6], w: 420, size: 60 }); setBubble(1620, 760, { side: 'me', bars: [1, .7], w: 380, size: 60 }); setDots(960, 900, 26, { col: SET_C.unread, still: true }); }],
  ['chart · title card (01B)', 19.9, t => { setVoidLayer('indigo'); setChart(960, 540, 1.04, { stamp1: t - 15.35, stamp2: t - 16.74, ecg: { t, dotsT: 19.53, beats: Array.from({ length: 30 }, (_, i) => 11.16 + i * .6977 / 1).filter(b => b <= t) } }); }],
  ['chart · A. falls, line style (10B)', 171.9, t => { setWardVoid('final'); setChart(960, 540, 1.04, { stamp1: 99, stamp2: 99, fall: t - 171.63, style: 'line', ecg: { t } }); }],
  ['confessional · screen + ↻ (09B)', 144, t => { setConfVoid(); setConfScreen(960, 500, 1100, 680, { refresh: 1, press: .3 }); }],
  ['confessional · slot, reels spinning + lever (09E)', 150.2, t => { setConfVoid(); setSlot(860, 520, 900, 560, { k: 1, t, reels: [{ spin: 1 }, { spin: 1 }, { spin: .7 }], reel: (i, R) => setScreenGlass(R, 'cyan', { key: 'r' + i }) }); setLever(1460, 560, 1, { pull: .7 }); }],
  ['confessional · slot jackpot (09F)', 151.6, t => { setConfVoid(); setSlot(960, 540, 1000, 620, { k: 1, t, win: .8, reels: [{}, {}, {}], reel: (i, R) => { setScreenGlass(R, 'cyan', { key: 'r' + i }); setHeart(R.x + R.w / 2, R.y + R.h / 2, R.h * .3, SET_C.fever, { key: 'rh' + i }); } }); }],
  ['confessional · black mirror (09H)', 158, t => { setConfVoid(); const S = setMirror(960, 520, 1000, 640, { glint: .4, amber: .3 }); setRipple(S.X(.5), S.Y(.55), 180 + frac(t) * 200, .8); }],
  ['confessional · glass edge (09I)', 165.5, t => { setConfVoid(); setGlassEdge(960, 60, 1020); setRipple(960, 520, 160, .7, { ry: 1 }); }],
  ['void · shards + halos (05A)', 80.5, t => { setVoidLayer('indigo'); setShards(t, { gather: .6 }); setHaloSwirl(960, 470, t, 14); }],
  ['void · ash falling (05A 82.9)', 82.9, t => { setVoidLayer('indigo'); setShards(t, { gather: 1, ash: .6 }); setHaloSwirl(960, 470, t, 10, { ash: .8, a: .6 }); }],
  ['void · black + ↻ (08G)', 139.2, t => setRefreshVoid(.5)],
  ['void · flat line (12A / 11A end)', 196, t => { setVoidLayer('black'); setFlatline(W * .2, W * .8, H * .62, {}); setCaret(W * .2 + 10, H * .62 - 64, 60, SET_C.amber, 1, { glow: .3 }); }],
  ['end card 1 (13A)', 206.51 + 2, t => setEndCard(2)],
  ['end card 2 (13A); dots blink at 214.0', 206.51 + 5.5, t => setEndCard(5.5)]
];
LOOPS.sets_sheet = t => {
  const i = clamp(Math.floor(t + 1e-6), 0, SET_SHEET.length - 1), [label, st, draw] = SET_SHEET[i];
  draw(st + (t - Math.floor(t + 1e-6)));
  boilSeed('sheet label');
  paint(rectPts(14, H - 74, 34 + label.length * 19, 60), { wash: '#1B1820', washOp: 220, ink: null });
  letter(label, 30, H - 44, 34, '#F3EBDC', { align: 'left', font: fontCSS('ui', 34, { weight: 600 }), ink: false, screen: true });
};
LOOPS.sets_sheet.len = SET_SHEET.length;
// the props page: every set-dressing prop at a readable size, on paper
LOOPS.sets_props = t => {
  const P = setPalDay(), lab = (s, x, y) => letter(s, x, y, 20, '#5A4650', { ink: false, screen: true, font: fontCSS('ui', 20, { weight: 600 }) });
  setBed(40, 470, .5, { pal: P, covers: 'lump' }); lab('bed + covers (lump) + pillow', 330, 490);
  setNightstand(720, 470, .55, { pal: P }); setClock(720, 300, .9, { pal: P, ring: frac(t) < .5 ? 1 : 0, t }); lab('nightstand, alarm clock', 720, 490);
  setDesk(1100, 470, .45, { pal: P }); setMonitor(1090, 268, .45, { pal: P }); setKeyboard(1100, 278, .45, { pal: P }); setMug(970, 270, .45, { pal: P, pens: true }); lab('desk, monitor, keyboard, mug', 1100, 490);
  setChair(1400, 470, .55, { pal: P }); lab('chair', 1400, 490);
  setBlinds(1560, 120, 300, 300, { pal: P, open: .5, s: .5 }); lab('blinds (half up)', 1710, 490);
  setWardrobe(120, 1010, .4, { pal: P }); lab('wardrobe', 120, 1035);
  for (let i = 0; i < 5; i++) setPhotoFrame(290 + i * 90, 760, .85, { pal: P, i, grey: i === 4 ? 1 : 0, rot: i === 3 ? .5 : 0 }); lab('photo frames (grey, tipping)', 470, 790);
  setMumPhoto(290, 830, 150, 180, { pal: P }); lab("mum's photo", 365, 1035);
  setDoor(560, 1010, .38, { pal: P, knock: { k: 1, age: frac(t) * .4 } }); lab('door + knock', 560, 1035);
  setDiary(860, 900, .45, { pal: P, torn: 2 }); setPage(860, 700, .4, { pal: P, rot: .4, curl: .5 }); lab('diary, page', 860, 1035);
  setIVStand(1060, 1010, .45, { pal: P }); setIVBag(1024, 620, .45, { pal: P, glow: .5 }); lab('IV stand + bag', 1060, 1035);
  setRingLamp(1300, 640, .3, { pal: P, stem: false }); setRingLampLight(1300, 640, .3, .8); setTube([1060, 740], [1300, 900], { pal: P, sag: 60 }); lab('ring lamp, tube', 1300, 1035);
  setCobweb(1480, 600, .9, { pal: { ...P, web: '#8A8494' } }); setSpider(1540, 610, 1.2, { pal: P, drop: 80 }); lab('cobweb, spider', 1520, 790);
  setNoodles(1500, 1000, .7, { pal: P }); setApple(1620, 1000, .8, { pal: P }); lab('noodles, apple', 1560, 1035);
  setBandCut(1760, 900, .4, { pal: P }); for (let i = 0; i < 4; i++) setFlake(1700 + i * 50, 980, 1, i * .5, { pal: P }); lab('cut band, snow flakes', 1760, 1035);
};
LOOPS.sets_props.len = 2;

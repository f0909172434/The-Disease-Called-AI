// data.js: the song's data, loaded once before the first frame, and pure-of-t helpers over it.
//
// Loaded synchronously when this script runs, so scene files can place shots with the data: shots([[tAt(41), ...]]).
// Sources (whatever exists; paths relative to studio.html, so serve the repo root: render.mjs does):
//   data/timeline.json               analysis/analyze.py (blind analysis of the master): beats, envelopes, onsets
//   data/timeline.placeholder.json   analysis/make_placeholder_timeline.py (score grid), used when the above is missing
//   ../music/build/arrangement.json  sections (exact), fx cues, silence automation
//   ../music/build/events.json       story events (typing, retry, lever, regenerate, heartbeat, glitch, silence ...)
//   ../music/build/vocals.json       lyric lines (EN + 中文, speaker, style)
//   ../music/build/vocal_timing.json measured line / syllable / word times
// ?timeline=data/x.json overrides the timeline file.
//
// Helpers (all pure functions of t; also on the MV object, e.g. MV.section(t)):
//   section(t) -> { id, name, start, end, i }    sectionP(t) 0..1    sectionById('S04')
//   beat(t)    -> beat time tb (float, 0 = bar 1 beat 1), follows the analysed beats
//   bar(t)     -> bar position (float, bar 1 = [0, 1))    barN(t) 1-indexed bar    beatInBar(t) 1..4
//   tAt(bar, beat = 1) -> seconds for docs notation (both 1-indexed, fractional ok)    tbAt(tb) -> seconds
//   events(name) -> [{ t, ... }] sorted. Names: typing, typing_outro, heartbeat, retry, regenerate, lever, jackpot,
//                   notification, phone, glitch, silence ({t, end}), send, flatline ... and any arrangement fx type
//                   (impact, riser, rewind, tape_stop, breath, ...: { t, d, params }).
//   eventsIn(name, t0, t1)  lastEvent(name, t)  nextEvent(name, t)  since(name, t)  until(name, t)
//   evPulse(name, t, decay = .15) 1 on each event, exp decay    evCount(name, t0, t1)    inSilence(t)
//   env(name, t) analysis envelope 0..1 (rms low mid high kick snare bass vox_you vox_ai heart)
//   onsets(name) times    onsetPulse(name, t, decay = .12)
//   LYRICS: [{ id, section, speaker, style, mode, ai, text, zh, start, end, syllables: [{text, start, end}], words }]
//   lyricsAt(t, pre = 0, post = 0) lines sounding at t    lyricLine(t) the latest line started at or before t (null after
//   it ends)    lyricById(id)    sylIndex(line, t) syllable being sung (-1 before)    vox(who, t) 'you' | 'ai' 0..1
const MV = { ready: false, sources: {}, sections: [], beatMap: [], events: {}, fx: {}, env: {}, envFps: 60, onsets: {}, lyrics: [], silence: [] };
let LYRICS = [];

function mvGet(url, type = 'text') {
  // XHR rather than fetch: also works from file:// when Chrome runs with --allow-file-access-from-files
  return new Promise(res => {
    try {
      const x = new XMLHttpRequest(); x.open('GET', url); x.responseType = type;
      x.onload = () => res(x.status === 200 || (x.status === 0 && x.response) ? x.response : null);
      x.onerror = () => res(null); x.send();
    } catch (e) { res(null); }
  });
}
async function mvJSON(url) { const s = await mvGet(url); if (s == null) return null; try { return JSON.parse(s); } catch (e) { console.warn('bad JSON: ' + url); return null; } }
function mvJSONSync(url) {
  try {
    const x = new XMLHttpRequest(); x.open('GET', url, false); x.send();
    if (!(x.status === 200 || (x.status === 0 && x.responseText))) return null;
    return JSON.parse(x.responseText);
  } catch (e) { if (!/NetworkError|Failed to load|404/.test(e.message)) console.warn(`${url}: ${e.message}`); return null; }
}

const EV_ALIAS = { phone: 'phone_vibrate', jackpot: 'jackpot_reels', vibrate: 'phone_vibrate' };
function evName(n) { return n in MV.events ? n : EV_ALIAS[n] && EV_ALIAS[n] in MV.events ? EV_ALIAS[n] : n; }
function isAIStyle(speaker, style = '') { return /^ai/.test(style) || (speaker === 'ai' && !/^human/.test(style)); }

function loadMVData() {
  if (MV.ready) return MV;
  const q = new URLSearchParams(location.search), B = '../music/build/';
  const [tlA, arr, evs, voc, tim] = [mvJSONSync(q.get('timeline') || 'data/timeline.json'), mvJSONSync(B + 'arrangement.json'),
    mvJSONSync(B + 'events.json'), mvJSONSync(B + 'vocals.json'), mvJSONSync(B + 'vocal_timing.json')];
  let tl = tlA, tlSrc = q.get('timeline') || 'data/timeline.json';
  if (!tl && !q.get('timeline')) { tl = mvJSONSync('data/timeline.placeholder.json'); tlSrc = 'data/timeline.placeholder.json'; }
  tl = tl || {};
  MV.sources = { timeline: tl.beats ? tlSrc + (tl.placeholder ? ' (placeholder)' : '') : null, arrangement: !!arr, events: !!evs, vocals: !!voc, vocal_timing: !!tim };

  // sections: the score's exact ones first
  const secs = (arr && arr.sections && arr.sections.length ? arr.sections : tl.sections || []);
  MV.sections = secs.map((s, i) => ({ id: s.id, name: s.name, start: +s.start, end: +s.end, i })).sort((a, b) => a.start - b.start);
  if (MV.sections.length) MV.sections[MV.sections.length - 1].end = Math.max(MV.sections[MV.sections.length - 1].end, DUR);

  // beats: each detected beat is pinned to its nearest score-grid beat, so missed beats (drumless intro) don't shift the count
  const bt = (tl.beats || []).map(Number), map = [];
  for (const t of bt) { const tb = Math.round((t - OFF) / BEAT); if (!map.length || tb > map[map.length - 1][1]) map.push([t, tb]); }
  MV.beatMap = map;

  // events: the score's events.json wins, the timeline's fill in the rest (placeholder-only names: send, flatline ...)
  const norm = list => (list || []).map(e => typeof e === 'number' ? { t: e } : Array.isArray(e) ? { t: +e[0], end: +e[1], d: e[1] - e[0] } : { ...e, t: +e.t })
    .filter(e => isFinite(e.t)).sort((a, b) => a.t - b.t);
  const ev = {};
  for (const [k, v] of Object.entries(tl.events || {})) ev[k] = norm(v);
  if (evs) {
    for (const [k, v] of Object.entries(evs)) ev[k] = norm(v);
    for (const [alias, real] of Object.entries(EV_ALIAS)) if (real in evs) delete ev[alias];   // drop placeholder twins
  }
  MV.events = ev;
  // arrangement fx cues by type (tb -> seconds), reachable through events(type) when no event list has that name
  const fx = {};
  for (const f of (arr && arr.fx) || []) (fx[f.type] = fx[f.type] || []).push({ t: tbAt0(f.tb), d: (f.d || 0) * BEAT, params: f.params || {} });
  for (const k in fx) fx[k].sort((a, b) => a.t - b.t);
  MV.fx = fx;
  MV.silence = (ev.silence || []).map(e => [e.t, e.end ?? e.t]);
  if (!MV.silence.length && arr && arr.automation && arr.automation.silence) MV.silence = arr.automation.silence.map(([a, b]) => [tbAt0(a), tbAt0(b)]);

  // envelopes + onsets from the timeline (real analysis or placeholder)
  MV.envFps = tl.fps || 60; MV.env = {};
  for (const [k, v] of Object.entries(tl.env || {})) MV.env[k] = Float32Array.from(v);
  MV.onsets = {};
  for (const [k, v] of Object.entries(tl.onsets || {})) MV.onsets[k] = Float64Array.from(v.map(Number).sort((a, b) => a - b));

  // lyrics: vocals.json + vocal_timing.json (exact, current) when present, else the timeline's
  let lines = [];
  if (voc && voc.lines) {
    const tm = {}; for (const l of (tim && tim.lines) || []) tm[l.id] = l;
    for (const l of voc.lines) {
      if (!l.display) continue;
      const m = tm[l.id], item = { id: l.id, section: l.section, speaker: l.speaker, style: l.style, mode: l.mode, text: l.text, zh: l.zh || '' };
      if (m) Object.assign(item, { start: m.start, end: m.end, syllables: m.syllables || [], words: m.words || [] });
      else if (l.mode === 'sung' && l.syllables && l.syllables.length) {   // fall back to the score
        const syl = l.syllables.map(s => { const n = s.notes, z = n[n.length - 1]; return { text: s.text, start: tbAt0(n[0].tb), end: tbAt0(z.tb + z.d) }; });
        Object.assign(item, { start: syl[0].start, end: syl[syl.length - 1].end, syllables: syl, words: [] });
      } else { const st = tbAt0(l.tb || 0); Object.assign(item, { start: st, end: st + .12 * l.text.length, syllables: [], words: [] }); }
      lines.push(item);
    }
    MV.sources.lyrics = 'music/build/vocals.json' + (tim ? ' + vocal_timing.json' : ' (score timing)');
  } else if (tl.lyrics) { lines = tl.lyrics.map(l => ({ ...l })); MV.sources.lyrics = tlSrc; }
  lines = lines.filter(l => isFinite(l.start) && isFinite(l.end)).sort((a, b) => a.start - b.start);
  lines.forEach((l, i) => {
    l.i = i; l.ai = isAIStyle(l.speaker, l.style);
    l.syllables = (l.syllables && l.syllables.length ? l.syllables : [{ text: l.text, start: l.start, end: l.end }]).map(s => ({ text: s.text, start: +s.start, end: +s.end }));
  });
  MV.lyrics = LYRICS = lines;
  MV.ready = true;
  return MV;
}

// ---------- musical time ----------
function tbAt0(tb) { return OFF + tb * BEAT; }                 // score grid
function mvUb(arr, x, key) { let lo = 0, hi = arr.length; while (lo < hi) { const m = (lo + hi) >> 1; if ((key ? arr[m][key] : arr[m]) <= x) lo = m + 1; else hi = m; } return lo; }
function beat(t) {
  const m = MV.beatMap; if (m.length < 2) return (t - OFF) / BEAT;
  if (t <= m[0][0]) return m[0][1] + (t - m[0][0]) / BEAT;
  const z = m[m.length - 1]; if (t >= z[0]) return z[1] + (t - z[0]) / BEAT;
  let lo = 0, hi = m.length - 1; while (hi - lo > 1) { const k = (lo + hi) >> 1; if (m[k][0] <= t) lo = k; else hi = k; }
  return m[lo][1] + (m[hi][1] - m[lo][1]) * (t - m[lo][0]) / (m[hi][0] - m[lo][0]);
}
function tbAt(tb) {
  const m = MV.beatMap; if (m.length < 2) return tbAt0(tb);
  if (tb <= m[0][1]) return m[0][0] + (tb - m[0][1]) * BEAT;
  const z = m[m.length - 1]; if (tb >= z[1]) return z[0] + (tb - z[1]) * BEAT;
  let lo = 0, hi = m.length - 1; while (hi - lo > 1) { const k = (lo + hi) >> 1; if (m[k][1] <= tb) lo = k; else hi = k; }
  return m[lo][0] + (m[hi][0] - m[lo][0]) * (tb - m[lo][1]) / (m[hi][1] - m[lo][1]);
}
function tAt(b, bt = 1) { return tbAt((b - 1) * 4 + (bt - 1)); }
function bar(t) { return beat(t) / 4; }
function barN(t) { return Math.floor(beat(t) / 4 + 1e-9) + 1; }
function beatInBar(t) { return ((Math.floor(beat(t) + 1e-9) % 4) + 4) % 4 + 1; }

// ---------- sections ----------
function section(t) {
  const s = MV.sections; if (!s.length) return { id: '', name: '', start: 0, end: DUR, i: 0 };
  for (let i = s.length - 1; i >= 0; i--) if (t >= s[i].start) return s[i];
  return s[0];
}
function sectionById(id) { return MV.sections.find(s => s.id === id || s.name === id) || null; }
function sectionP(t) { const s = section(t); return clamp((t - s.start) / Math.max(1e-6, s.end - s.start)); }

// ---------- events ----------
function events(name) { const n = evName(name); return MV.events[n] || MV.fx[name] || MV.fx[n] || []; }
function eventsIn(name, t0, t1) { const e = events(name); return e.slice(mvUb(e, t0 - 1e-9, 't'), mvUb(e, t1 - 1e-9, 't')); }
function lastEvent(name, t) { const e = events(name), i = mvUb(e, t + 1e-9, 't') - 1; return i >= 0 ? e[i] : null; }
function nextEvent(name, t) { const e = events(name), i = mvUb(e, t + 1e-9, 't'); return i < e.length ? e[i] : null; }
function since(name, t) { const e = lastEvent(name, t); return e ? t - e.t : Infinity; }
function until(name, t) { const e = nextEvent(name, t); return e ? e.t - t : Infinity; }
function evPulse(name, t, decay = .15) { const s = since(name, t); return isFinite(s) ? Math.exp(-s / decay) : 0; }
function evCount(name, t0, t1) { return eventsIn(name, t0, t1).length; }
function inSilence(t) { return MV.silence.some(([a, b]) => t >= a && t < b); }

// ---------- envelopes and onsets ----------
function env(name, t) {
  const e = MV.env[name]; if (!e || !e.length) return 0;
  const f = t * MV.envFps; if (f <= 0) return e[0];
  const i = Math.floor(f); if (i >= e.length - 1) return e[e.length - 1];
  return e[i] + (e[i + 1] - e[i]) * (f - i);
}
function onsets(name) { return MV.onsets[name] || new Float64Array(0); }
function onsetPulse(name, t, decay = .12) { const o = onsets(name), i = mvUb(o, t + 1e-9) - 1; return i >= 0 ? Math.exp(-(t - o[i]) / decay) : 0; }

// ---------- lyrics ----------
function lyricsAt(t, pre = 0, post = 0) { return LYRICS.filter(l => t >= l.start - pre && t < l.end + post); }
function lyricById(id) { return LYRICS.find(l => l.id === id) || null; }
function lyricLine(t) { let r = null; for (const l of LYRICS) { if (l.start > t) break; r = l; } return r && t < r.end ? r : null; }
function sylIndex(line, t) { let k = -1; line.syllables.forEach((s, i) => { if (t >= s.start) k = i; }); return k; }
// 'you' | 'ai': the analysed vocal envelope when there is one, else 1 while a syllable of that speaker sounds
function vox(who, t) {
  if (MV.env['vox_' + who]) return env('vox_' + who, t);
  for (const l of LYRICS) {
    if (l.start > t) break;
    if (t < l.end && (who === 'ai' ? l.ai : !l.ai || l.speaker === 'both')) for (const s of l.syllables) if (t >= s.start && t < s.end) return 1;
  }
  return 0;
}

Object.assign(MV, { section, sectionP, sectionById, beat, bar, barN, beatInBar, tAt, tbAt, events, eventsIn, lastEvent, nextEvent,
  since, until, evPulse, evCount, inSilence, env, onsets, onsetPulse, lyricsAt, lyricLine, lyricById, sylIndex, vox });

try { loadMVData(); } catch (e) { console.warn('data.js: ' + e.message); }

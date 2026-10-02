// Audio accessor over timeline.json (docs/06_tech_spec.md §5). Everything is a pure function of t.
//
//   audio.env('kick', t)          envelope 0..1, linearly interpolated between analysis frames
//   audio.since('snare', t)       seconds since the last onset <= t (Infinity if none)
//   audio.until('kick', t)        seconds until the next onset > t (Infinity if none)
//   audio.last('kick', t) / audio.nextOnset('kick', t)   onset times (-Infinity / Infinity)
//   audio.index('kick', t)        index of the last onset <= t (-1 if none)
//   audio.pulse('kick', t, 0.12)  exp(-since/decay): the standard "hit" envelope
//   audio.count('hat', t0, t1)    number of onsets in [t0, t1)
//   audio.events('typing')        raw event list; lastEvent(name,t), eventsUntil(name,t)
//   audio.beat(t)                 beat time tb (float, 0 = bar 1 beat 1), follows detected beats
//   audio.bar(t)                  bar position, 0-based float (bar 1 = [0,1))
//   audio.barNumber(t)            1-indexed integer bar (docs numbering)
//   audio.beatInBar(t)            1..4
//   audio.phase(t, div)           fract(beat/div): div=1 beat, 0.5 eighth, 4 bar
//   audio.time(bar, beat)         seconds for docs notation (bar 1-indexed, beat 1-indexed, fractional ok)
//   audio.tbToTime(tb)            beat time -> seconds
//   audio.section(t)              { id, name, start, end } ; sectionById(id) ; sectionProgress(t)

function upperBound(arr, x) { // first index with arr[i] > x
  let lo = 0, hi = arr.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] <= x) lo = m + 1; else hi = m; }
  return lo;
}

export class Audio {
  constructor(timeline) {
    this.tl = timeline;
    this.fps = timeline.fps || 60;
    this.duration = timeline.duration || 215;
    const bpm = (timeline.bpm && (timeline.bpm.score || timeline.bpm.detected)) || 172;
    this.bpm = bpm;
    this.beatDur = 60 / bpm;
    this.barDur = this.beatDur * 4;
    this.envs = {};
    for (const [k, v] of Object.entries(timeline.env || {})) this.envs[k] = Float32Array.from(v);
    this._onsets = {};
    for (const [k, v] of Object.entries(timeline.onsets || {})) this._onsets[k] = Float64Array.from([...v].sort((a, b) => a - b));
    this._events = {};
    for (const [k, v] of Object.entries(timeline.events || {})) {
      const list = [...v].sort((a, b) => a.t - b.t);
      this._events[k] = list;
      this._events[k]._times = Float64Array.from(list.map((e) => e.t));
    }
    this.beats = Float64Array.from(timeline.beats || []);
    this.sections = (timeline.sections || []).map((s) => ({ ...s }));
  }

  // ---------------------------------------------------------------- envelopes
  hasEnv(name) { return !!this.envs[name]; }
  env(name, t) {
    const e = this.envs[name];
    if (!e || !e.length) return 0;
    const f = t * this.fps;
    if (f <= 0) return e[0];
    const i = Math.floor(f);
    if (i >= e.length - 1) return e[e.length - 1];
    const u = f - i;
    return e[i] + (e[i + 1] - e[i]) * u;
  }
  /** max of an envelope over [t0, t1] (sampled at analysis frames) */
  envMax(name, t0, t1) {
    const e = this.envs[name];
    if (!e) return 0;
    let m = 0;
    const a = Math.max(0, Math.floor(t0 * this.fps)), b = Math.min(e.length - 1, Math.ceil(t1 * this.fps));
    for (let i = a; i <= b; i++) m = Math.max(m, e[i]);
    return m;
  }
  /** envelope smoothed by a box filter of width w seconds (centered); pure in t */
  envSmooth(name, t, w = 0.25) {
    const n = 7;
    let s = 0;
    for (let i = 0; i < n; i++) s += this.env(name, t + (i / (n - 1) - 0.5) * w);
    return s / n;
  }

  // ---------------------------------------------------------------- onsets
  onsets(name) { return this._onsets[name] || new Float64Array(0); }
  index(name, t) { return upperBound(this.onsets(name), t + 1e-9) - 1; }
  last(name, t) { const o = this.onsets(name); const i = this.index(name, t); return i >= 0 ? o[i] : -Infinity; }
  nextOnset(name, t) { const o = this.onsets(name); const i = upperBound(o, t + 1e-9); return i < o.length ? o[i] : Infinity; }
  since(name, t) { return t - this.last(name, t); }
  until(name, t) { return this.nextOnset(name, t) - t; }
  pulse(name, t, decay = 0.15, attack = 0) {
    const s = this.since(name, t);
    if (!isFinite(s)) return 0;
    if (attack > 0 && s < attack) return s / attack;
    return Math.exp(-(s - attack) / decay);
  }
  count(name, t0, t1) { const o = this.onsets(name); return upperBound(o, t1 - 1e-9) - upperBound(o, t0 - 1e-9); }
  onsetsIn(name, t0, t1) { const o = this.onsets(name); return Array.from(o.subarray(upperBound(o, t0 - 1e-9), upperBound(o, t1 - 1e-9))); }

  // ---------------------------------------------------------------- events
  events(name) { return this._events[name] || []; }
  eventIndex(name, t) { const e = this._events[name]; return e ? upperBound(e._times, t + 1e-9) - 1 : -1; }
  lastEvent(name, t) { const i = this.eventIndex(name, t); return i >= 0 ? this._events[name][i] : null; }
  nextEvent(name, t) { const e = this._events[name]; if (!e) return null; const i = upperBound(e._times, t + 1e-9); return i < e.length ? e[i] : null; }
  eventsUntil(name, t) { const e = this._events[name]; return e ? e.slice(0, this.eventIndex(name, t) + 1) : []; }
  eventPulse(name, t, decay = 0.15) { const e = this.lastEvent(name, t); return e ? Math.exp(-(t - e.t) / decay) : 0; }

  // ---------------------------------------------------------------- musical time
  beat(t) {
    const b = this.beats;
    if (b.length < 2) return t / this.beatDur;
    if (t <= b[0]) return (t - b[0]) / this.beatDur;
    if (t >= b[b.length - 1]) return b.length - 1 + (t - b[b.length - 1]) / this.beatDur;
    const i = upperBound(b, t) - 1;
    return i + (t - b[i]) / (b[i + 1] - b[i]);
  }
  tbToTime(tb) {
    const b = this.beats;
    if (b.length < 2) return tb * this.beatDur;
    if (tb <= 0) return b[0] + tb * this.beatDur;
    if (tb >= b.length - 1) return b[b.length - 1] + (tb - (b.length - 1)) * this.beatDur;
    const i = Math.floor(tb);
    return b[i] + (b[i + 1] - b[i]) * (tb - i);
  }
  /** docs notation: time(23, 3) = bar 23 beat 3 (1-indexed). Fractional beats ok: time(84, 4.5) */
  time(bar, beat = 1) { return this.tbToTime((bar - 1) * 4 + (beat - 1)); }
  bar(t) { return this.beat(t) / 4; }
  barNumber(t) { return Math.floor(this.beat(t) / 4) + 1; }
  beatInBar(t) { return (Math.floor(this.beat(t)) % 4 + 4) % 4 + 1; }
  phase(t, div = 1) { const x = this.beat(t) / div; return x - Math.floor(x); }
  /** seconds since the last grid line of size div beats (1 = beat, 4 = bar) */
  sinceGrid(t, div = 1) { const x = this.beat(t) / div; return t - this.tbToTime(Math.floor(x) * div); }

  // ---------------------------------------------------------------- sections
  section(t) {
    const s = this.sections;
    for (let i = s.length - 1; i >= 0; i--) if (t >= s[i].start) return s[i];
    return s[0];
  }
  sectionById(id) { return this.sections.find((s) => s.id === id); }
  sectionProgress(t) { const s = this.section(t); return (t - s.start) / Math.max(1e-6, s.end - s.start); }
}

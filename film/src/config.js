// config.js: project settings.
//   duration: the video's length in seconds.
//   fps:      final frame rate. 24: the hand-drawn look (linework still boils at 12 drawings a second, BOIL in core.js).
//   bpm:      the rhythm that bounces, dances and pulse() follow; offset = time in seconds of the first downbeat.
//             Real beats, sections, events and lyric timing come from the song's data (data.js).
//   audio:    the master, relative to film/; render.mjs muxes it into --video / --clip / --encode when it exists.
const PROJECT = { duration: 215, fps: 24, bpm: 172, offset: 0, audio: '../music/build/master.wav' };   // song: 172 BPM, first downbeat at 0 s (music/build/arrangement.json)

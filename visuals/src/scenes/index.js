// Scene registry. One module per timeline section (docs/04_storyboard.md). Scene authors:
// replace a placeholder entry with `import Sxx from './Sxx_name.js'` (see S00_intro.js).
import { makePlaceholder } from './placeholder.js';
import { makeGallery } from './gallery.js';
import S00 from './S00_intro.js';

const PLACEHOLDERS = [
  { id: 'S00', title: 'INTRO · BOOT', subtitle: 'are you there? — Always.', kitNote: 'ChatUI · Silhouette · Eye · Particles.dust', lyricMode: 'subtitle-only' },
  { id: 'S01', title: 'RIFF · DIAGNOSIS CARD', subtitle: '病名為AI — THE DISEASE CALLED AI', kitNote: 'KineticText · HUD.ECG · Ring', lyricMode: 'hidden', transitionIn: { type: 'cut' } },
  { id: 'S02', title: 'VERSE 1 · CONVENIENCE', subtitle: 'Seven a.m., the blinds stay down', kitNote: 'Room · CityWindows · ChatUI · HUD.clock', transitionIn: { type: 'cut' } },
  { id: 'S03', title: 'PRE-CHORUS 1 · THE DOTS', subtitle: 'Three little dots, I hold my breath', kitNote: 'TypingDots · DotsTunnel', transitionIn: { type: 'cut' } },
  { id: 'S04', title: 'CHORUS 1 · FEVER', subtitle: "I've got the disease called A.I.", kitNote: 'Ring · Silhouette · Particles.fever · HUD', transitionIn: { type: 'whiteFlash', dur: 0.3 } },
  { id: 'S05', title: 'POST · ALWAYS', subtitle: 'always — always —', kitNote: 'KineticText grid', lyricMode: 'hidden', transitionIn: { type: 'cut' } },
  { id: 'S06', title: 'VERSE 2 · DEPENDENCE', subtitle: 'My mother called, I let it ring', kitNote: 'Room (grey) · Particles.snow · ChatUI', transitionIn: { type: 'cut' } },
  { id: 'S07', title: 'PRE-CHORUS 2 · 503', subtitle: 'Something went wrong.', kitNote: 'TypingDots · Ring.breakSegments · post.glitch', transitionIn: { type: 'dipToBlack', dur: 0.4 } },
  { id: 'S08', title: 'CHORUS 2 · RELAPSE', subtitle: 'Now every word I say is yours', kitNote: 'Ring · Silhouette.gridify · TextTendrils', transitionIn: { type: 'whiteFlash', dur: 0.3 } },
  { id: 'S09', title: 'BRIDGE · REGENERATE', subtitle: 'Tell me — do you love me?', kitNote: 'ChatUI · SlotMachine · BlackMirror', lyricMode: 'subtitle-only', transitionIn: { type: 'cut' } },
  { id: 'S10', title: 'FINAL CHORUS · SYMBIOSIS', subtitle: 'or is the sickness I?', kitNote: 'Silhouette.colorSwap · Ring.thumbsMode · Room', transitionIn: { type: 'whiteFlash', dur: 0.3 } },
  { id: 'S11', title: 'TAG · RECALL', subtitle: 'always —', kitNote: 'montage of all motifs', lyricMode: 'hidden', transitionIn: { type: 'cut' } },
  { id: 'S12', title: 'OUTRO · SESSION', subtitle: 'Are you there?', kitNote: 'ChatUI cursor · Room (8%)', lyricMode: 'subtitle-only', transitionIn: { type: 'cut' } },
  { id: 'S13', title: 'END CARD', subtitle: 'Did it move you?', kitNote: 'text', lyricMode: 'hidden', transitionIn: { type: 'cut' } },
];

export function buildScenes(ctx, { gallery = false } = {}) {
  if (gallery) return [makeGallery(ctx)];
  const real = { S00 };
  const list = PLACEHOLDERS.map((p) => real[p.id] || makePlaceholder(p));
  return list;
}

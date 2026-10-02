// Kit components (style guide §3). Each is a THREE.Object3D subclass with documented state fields
// and an update(t, states) method. All deterministic: state is a pure function of t.
export { GlyphAtlas, ICONS } from './atlas.js';
export { GlowLines, Seg } from './lines.js';
export { Silhouette } from './Silhouette.js';
export { Ring } from './Ring.js';
export { Eye } from './Eye.js';
export { ChatUI, tokenize, typedText } from './ChatUI.js';
export { TypingDots } from './TypingDots.js';
export { Room } from './Room.js';
export { CityWindows } from './CityWindows.js';
export { HUD, pqrst } from './HUD.js';
export { DustParticles, FeverStream, TokenConfetti, NotificationSnow } from './Particles.js';
export { KineticText } from './KineticText.js';
export { TypedText, ScreenCursor, BubbleOutline, roundRectPoints, bubbleTexture } from './Typing.js';

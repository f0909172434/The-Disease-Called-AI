// Room — her bedroom as a glowing architectural line drawing: bed, desk, chair, window with
// horizontal blinds leaking thin light strips, desk lamp, door, shelves and a desk monitor plane.
// Units: meters. Floor at y=0, room x in [-3,3], z in [-2.5,2.5]; window + desk on the back wall.
//
//   const room = new Room(ctx);  scene.add(room);
//   room.setScreenTexture(chat.texture);   // what the desk monitor shows
//   room.update(t, { screenGlow: 1, dayNight: 0.2 });
//
// States: screenGlow (0..2: monitor brightness + light spill on nearby lines)  dayNight (0 morning
//   warm leaks -> 0.5 blue dusk -> 1 night)  greyness (0..1 desaturate)  emptyChair (0..1 light pool
//   on the empty seat)  screenOnPillow (0..1 laptop glowing on the pillow)  lampOn (0..1)
//   lineBrightness (default 0.35)  reveal (0..1 draw-on)  opacity
// Anchors (world-ish local coords, Vector3): room.anchors.{chair, seatTop, screen, desk, pillow, window, bed, door}
import * as THREE from 'three';
import { GlowLines, Seg } from './lines.js';
import { col } from '../core/palette.js';
import { canvasMaterial } from '../core/text.js';

const BEAM_FRAG = /* glsl */`
uniform vec3 uColor; uniform float uInt;
varying vec2 vUv;
void main() {
  float a = smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x) * (1.0 - vUv.y) * (0.4 + 0.6 * (1.0 - vUv.y));
  gl_FragColor = vec4(uColor * a * uInt, 1.0);
}`;

export class Room extends THREE.Group {
  constructor(ctx, opts = {}) {
    super();
    this.ctx = ctx;
    const W = ctx.W, H = ctx.H;
    const segs = [], colors = [];
    const cyan = col('AI_CYAN'), warm = col('HUMAN_AMBER'), dim = col('AI_CYAN').multiplyScalar(0.55);
    const add = (list, c = cyan) => { for (const s of list) { segs.push(s); colors.push(c); } };
    // room shell: floor, wall corners, ceiling edges (faint)
    add(Seg.polyline([[-3, 0, -2.5], [3, 0, -2.5], [3, 0, 2.5]]));
    add(Seg.polyline([[-3, 0, 2.5], [-3, 0, -2.5]]));
    add([[-3, 0, -2.5, -3, 2.8, -2.5], [3, 0, -2.5, 3, 2.8, -2.5]], dim);
    add(Seg.polyline([[-3, 2.8, 2.5], [-3, 2.8, -2.5], [3, 2.8, -2.5], [3, 2.8, 2.5]]), dim);
    // floor boards (very faint perspective guides)
    for (let i = 1; i < 8; i++) add([[-3 + i * 0.75, 0, -2.5, -3 + i * 0.75, 0, 2.5]], col('AI_CYAN').multiplyScalar(0.18));
    // window + blinds (back wall)
    const wx0 = -1.4, wx1 = 0.2, wy0 = 0.9, wy1 = 2.3, wz = -2.49;
    add(Seg.polyline([[wx0, wy0, wz], [wx1, wy0, wz], [wx1, wy1, wz], [wx0, wy1, wz]], true));
    add([[wx0 - 0.06, wy0 - 0.04, wz + 0.05, wx1 + 0.06, wy0 - 0.04, wz + 0.05]]); // sill
    const slats = 20;
    this.slatYs = [];
    for (let i = 0; i <= slats; i++) {
      const y = wy0 + 0.04 + (i / slats) * (wy1 - wy0 - 0.08);
      this.slatYs.push(y);
      add([[wx0 + 0.03, y, wz + 0.03, wx1 - 0.03, y, wz + 0.03]], col('AI_CYAN').multiplyScalar(0.8));
    }
    add([[(wx0 + wx1) / 2 + 0.25, wy1, wz + 0.04, (wx0 + wx1) / 2 + 0.25, wy0 + 0.1, wz + 0.04]], dim); // cord
    // desk (back wall, right of window)
    const dx0 = 0.85, dx1 = 2.6, dz0 = -2.5, dz1 = -1.85, dy = 0.75;
    add(Seg.box([dx0, dy - 0.04, dz0], [dx1, dy, dz1]));
    for (const [x, z] of [[dx0 + 0.04, dz1 - 0.04], [dx1 - 0.04, dz1 - 0.04], [dx0 + 0.04, dz0 + 0.04], [dx1 - 0.04, dz0 + 0.04]]) add([[x, 0, z, x, dy - 0.04, z]]);
    add(Seg.rect([dx1 - 0.35, dy - 0.16, dz1 + 0.001], [1, 0, 0], [0, 1, 0], 0.5, 0.18));      // drawer
    // shelves above the desk
    add([[dx0 + 0.2, 1.65, -2.49, dx1 - 0.1, 1.65, -2.49], [dx0 + 0.2, 1.65, -2.3, dx1 - 0.1, 1.65, -2.3], [dx0 + 0.2, 1.65, -2.49, dx0 + 0.2, 1.65, -2.3], [dx1 - 0.1, 1.65, -2.49, dx1 - 0.1, 1.65, -2.3]], dim);
    add([[dx0 + 0.3, 1.65, -2.4, dx0 + 0.3, 1.88, -2.4], [dx0 + 0.38, 1.65, -2.4, dx0 + 0.38, 1.85, -2.4], [dx0 + 0.47, 1.65, -2.4, dx0 + 0.52, 1.84, -2.4]], dim); // books
    // monitor frame + stand
    const sc = new THREE.Vector3(1.62, dy + 0.34, -2.28), sw = 0.66, sh = 0.4;
    add(Seg.rect([sc.x, sc.y, sc.z], [1, 0, 0], [0, 1, 0], sw + 0.03, sh + 0.03), col('AI_WHITE'));
    add([[sc.x, sc.y - sh / 2 - 0.015, sc.z - 0.02, sc.x, dy, sc.z - 0.05], [sc.x - 0.12, dy + 0.002, sc.z - 0.08, sc.x + 0.12, dy + 0.002, sc.z - 0.08]]);
    // desk lamp (warm)
    add(Seg.polyline([[2.35, dy, -2.33], [2.42, dy + 0.38, -2.36], [2.22, dy + 0.62, -2.3]]), warm);
    add(Seg.circle([2.35, dy + 0.002, -2.33], [1, 0, 0], [0, 0, 1], 0.08, 20), warm);
    add(Seg.circle([2.14, dy + 0.52, -2.27], [1, 0, 0], [0, 0, 1], 0.1, 20), warm);
    add([[2.22, dy + 0.62, -2.3, 2.06, dy + 0.53, -2.25], [2.22, dy + 0.62, -2.3, 2.22, dy + 0.52, -2.27]], warm);
    // chair facing the desk (back toward the camera)
    const cx = 1.62, cz = -1.35, seat = 0.47;
    add(Seg.rect([cx, seat, cz], [1, 0, 0], [0, 0, 1], 0.46, 0.44));
    add(Seg.rect([cx, seat + 0.36, cz + 0.24], [1, 0, 0], [0, 0.94, 0.34], 0.42, 0.42));
    add([[cx - 0.18, seat, cz + 0.2, cx - 0.18, seat + 0.18, cz + 0.22], [cx + 0.18, seat, cz + 0.2, cx + 0.18, seat + 0.18, cz + 0.22]]);
    add([[cx, seat, cz, cx, 0.1, cz]]);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + 0.3; add([[cx, 0.1, cz, cx + Math.cos(a) * 0.3, 0.04, cz + Math.sin(a) * 0.3]]); }
    // bed (left wall, head against the back wall)
    const bx0 = -2.98, bx1 = -1.45, bz0 = -2.48, bz1 = -0.35;
    add(Seg.box([bx0, 0.28, bz0], [bx1, 0.55, bz1]));
    add(Seg.rect([(bx0 + bx1) / 2, 0.55, -2.48], [1, 0, 0], [0, 1, 0], bx1 - bx0, 1.1));
    add([[bx0, 0, bz1, bx0, 0.28, bz1], [bx1, 0, bz1, bx1, 0.28, bz1], [bx1, 0, bz0, bx1, 0.28, bz0]], dim);
    // pillow (soft rounded outline) + blanket fold
    const pillow = [];
    for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI * 2; pillow.push([(bx0 + bx1) / 2 + Math.cos(a) * 0.55, 0.62 + Math.sin(a) * 0.035, -2.15 + Math.sin(a) * 0.17]); }
    add(Seg.polyline(pillow), col('AI_WHITE').multiplyScalar(0.7));
    const fold = [];
    for (let i = 0; i <= 16; i++) { const u = i / 16; fold.push([bx0 + (bx1 - bx0) * u, 0.6 + Math.sin(u * Math.PI) * 0.03, -1.35 + Math.sin(u * 7) * 0.04]); }
    add(Seg.polyline(fold));
    // door (right wall)
    add(Seg.polyline([[2.99, 0, 0.4], [2.99, 2.1, 0.4], [2.99, 2.1, 1.35], [2.99, 0, 1.35]]));
    add(Seg.rect([2.98, 1.05, 0.875], [0, 0, 1], [0, 1, 0], 0.75, 1.85), dim);
    add(Seg.circle([2.97, 1.0, 0.5], [0, 0, 1], [0, 1, 0], 0.03, 10));
    // rug
    const rug = [];
    for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI * 2; rug.push([0.2 + Math.cos(a) * 1.3, 0.005, 0.6 + Math.sin(a) * 0.8]); }
    add(Seg.polyline(rug), col('AI_CYAN').multiplyScalar(0.3));

    this.lines = new GlowLines({ width: 1.5, glow: 5, W, H, brightness: 0.35 });
    this.lines.setSegments(segs, { colors });
    this.add(this.lines);

    // monitor screen plane (emissive, shows a texture)
    this.screenMat = canvasMaterial({ additive: true, brightness: 1 });
    this.screenMat.uniforms.color.value = col('AI_CYAN');
    this.screenBase = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), new THREE.MeshBasicMaterial({ color: col('AI_CYAN').multiplyScalar(0.12), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    this.screenBase.position.copy(sc);
    this.add(this.screenBase);
    this.screen = new THREE.Mesh(new THREE.PlaneGeometry(sw * 0.96, sh * 0.94), this.screenMat);
    this.screen.position.copy(sc).add(new THREE.Vector3(0, 0, 0.002));
    this.screen.visible = false;
    this.add(this.screen);

    // light leaks between blind slats: thin warm strips + beams falling into the room
    const leakGeo = new THREE.PlaneGeometry(wx1 - wx0 - 0.08, 0.012);
    this.leakMat = new THREE.MeshBasicMaterial({ color: col('HUMAN_AMBER'), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
    this.leaks = new THREE.Group();
    for (let i = 0; i < slats; i++) {
      const m = new THREE.Mesh(leakGeo, this.leakMat);
      m.position.set((wx0 + wx1) / 2, (this.slatYs[i] + this.slatYs[i + 1]) / 2, wz + 0.01);
      this.leaks.add(m);
    }
    this.add(this.leaks);
    this.beamMat = new THREE.ShaderMaterial({ fragmentShader: BEAM_FRAG, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      uniforms: { uColor: { value: col('HUMAN_AMBER') }, uInt: { value: 0.1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    this.beams = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const y = wy0 + 0.25 + i * 0.2;
      const g = new THREE.BufferGeometry();
      // quad from a slat gap on the window down onto the floor
      const a = [wx0 + 0.05, y, wz + 0.02], b = [wx1 - 0.05, y, wz + 0.02];
      const fl = 1.6 + i * 0.22;
      const c = [wx1 + 0.35, 0.01, wz + fl], d = [wx0 + 0.35, 0.01, wz + fl];
      g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...d], 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1], 2));
      const m = new THREE.Mesh(g, this.beamMat);
      this.beams.add(m);
      // stripe on the floor
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(wx1 - wx0 - 0.1, 0.03), this.leakMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set((wx0 + wx1) / 2 + 0.35, 0.012, wz + fl);
      this.beams.add(stripe);
    }
    this.add(this.beams);

    // light pools: lamp on the desk, screen light on the empty seat
    const poolMat = (c) => new THREE.ShaderMaterial({
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 uColor; uniform float uInt; varying vec2 vUv; void main(){ float r = length(vUv - 0.5) * 2.0; gl_FragColor = vec4(uColor * uInt * exp(-r * r * 3.0) * (1.0 - smoothstep(0.8, 1.0, r)), 1.0); }',
      uniforms: { uColor: { value: c }, uInt: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.lampPool = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.7), poolMat(col('HUMAN_AMBER')));
    this.lampPool.rotation.x = -Math.PI / 2; this.lampPool.position.set(2.1, dy + 0.003, -2.15);
    this.add(this.lampPool);
    this.seatPool = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), poolMat(col('AI_CYAN')));
    this.seatPool.rotation.x = -Math.PI / 2; this.seatPool.position.set(cx, seat + 0.004, cz);
    this.add(this.seatPool);
    this.floorPool = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.8), poolMat(col('AI_CYAN')));
    this.floorPool.rotation.x = -Math.PI / 2; this.floorPool.position.set(1.6, 0.006, -1.4);
    this.add(this.floorPool);

    // laptop on the pillow (poster shot)
    this.laptop = new THREE.Group();
    const lw = 0.42, lh = 0.27;
    const lapLines = new GlowLines({ width: 1.4, glow: 4, W, H, brightness: 0.8, color: '#E8FDFF' });
    lapLines.setSegments([...Seg.rect([0, lh / 2, 0], [1, 0, 0], [0, 0.94, -0.34], lw, lh), ...Seg.rect([0, 0.005, 0.13], [1, 0, 0], [0, 0, 1], lw, 0.26)]);
    this.laptop.add(lapLines);
    this.laptopScreen = new THREE.Mesh(new THREE.PlaneGeometry(lw * 0.92, lh * 0.88), new THREE.MeshBasicMaterial({ color: col('AI_CYAN'), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    this.laptopScreen.position.set(0, lh / 2, -0.002);
    this.laptopScreen.rotation.x = -0.35;
    this.laptop.add(this.laptopScreen);
    this.laptop.position.set((bx0 + bx1) / 2 + 0.15, 0.66, -1.95);
    this.laptop.rotation.y = 0.5;
    this.laptop.visible = false;
    this.add(this.laptop);
    this.laptopLines = lapLines;

    this.anchors = {
      chair: new THREE.Vector3(cx, 0, cz), seatTop: new THREE.Vector3(cx, seat, cz), screen: sc.clone(),
      desk: new THREE.Vector3((dx0 + dx1) / 2, dy, (dz0 + dz1) / 2), pillow: new THREE.Vector3((bx0 + bx1) / 2, 0.62, -2.15),
      window: new THREE.Vector3((wx0 + wx1) / 2, (wy0 + wy1) / 2, wz), bed: new THREE.Vector3((bx0 + bx1) / 2, 0.55, (bz0 + bz1) / 2),
      door: new THREE.Vector3(2.99, 1.05, 0.875), lamp: new THREE.Vector3(2.14, dy + 0.52, -2.27),
    };
    Object.assign(this, { screenGlow: 1, dayNight: 0, greyness: 0, emptyChair: 0, screenOnPillow: 0, lampOn: 0.4, lineBrightness: 0.35, reveal: 1, opacity: 1 });
  }

  setScreenTexture(tex) {
    this.screenMat.uniforms.map.value = tex;
    this.screenMat.uniforms.color.value.set(1, 1, 1);
    this.screen.visible = !!tex;
    return this;
  }

  setResolution(W, H) { this.lines.setResolution(W, H); this.laptopLines.setResolution(W, H); }

  update(t, states = {}) {
    Object.assign(this, states);
    const g = this.screenGlow, dn = this.dayNight, o = this.opacity;
    this.lines.brightness = this.lineBrightness * o;
    this.lines.reveal = this.reveal;
    this.lines.grey = this.greyness;
    this.lines.setLight(this.anchors.screen, 1.6, g * 1.6);
    this.screenBase.material.opacity = Math.min(1, g) * o;
    this.screenMat.uniforms.brightness.value = 0.6 + g * 0.8;
    this.screenMat.uniforms.opacity.value = o;
    // window light: warm morning -> blue dusk -> dark night
    const warm = col('HUMAN_AMBER'), blue = col('AI_DEEP');
    const leakC = dn < 0.5 ? warm.clone().lerp(blue, dn * 2) : blue.clone().multiplyScalar(Math.max(0, 1 - (dn - 0.5) * 2));
    leakC.lerp(new THREE.Color(0.5, 0.5, 0.5), this.greyness);
    this.leakMat.color.copy(leakC).multiplyScalar(1.6 * o);
    this.beamMat.uniforms.uColor.value.copy(leakC);
    this.beamMat.uniforms.uInt.value = 0.07 * (1 - dn) * o;
    this.lampPool.material.uniforms.uInt.value = 0.35 * this.lampOn * o;
    this.seatPool.material.uniforms.uInt.value = 0.5 * this.emptyChair * g * o;
    this.floorPool.material.uniforms.uInt.value = 0.06 * g * o;
    this.laptop.visible = this.screenOnPillow > 0.01;
    this.laptopLines.brightness = 0.8 * this.screenOnPillow * o;
    this.laptopScreen.material.opacity = this.screenOnPillow * o;
    this.visible = o > 0.001;
    return this;
  }
}

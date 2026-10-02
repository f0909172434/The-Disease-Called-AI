// Camera rig helpers. All pure functions of t (seeded noise), no state between frames.
//
//   applyCamera(camera, {
//     pos: [x,y,z] | Vector3, target: [x,y,z], fov: 35, roll: 0 (rad),
//     handheld: { t, seed: 7, pos: 0.004, rotDeg: 0.15, freq: 0.45 },   // style guide: verse
//     fovMul: fovPunch(audio, t),                                        // kick punch
//     rollAdd: snareRoll(audio, t),                                      // chorus snare roll
//   });
//   orbit(target, radius, azimuthRad, elevationRad) -> Vector3
//   dolly(a, b, u) -> Vector3
import * as THREE from 'three';
import { fbm1 } from './rng.js';
import { DEG } from './ease.js';

const _v = new THREE.Vector3();
const _t = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();

function v3(a) { return a instanceof THREE.Vector3 ? a : _v.set(a[0], a[1], a[2]).clone(); }

/** seeded handheld offsets: position (fraction of camera->target distance) and rotation (deg) */
export function handheld(t, { seed = 1, pos = 0.004, rotDeg = 0.15, freq = 0.45 } = {}) {
  const f = freq;
  return {
    x: fbm1(t * f, seed + 1, 3) * pos, y: fbm1(t * f, seed + 2, 3) * pos, z: fbm1(t * f * 0.7, seed + 3, 2) * pos * 0.5,
    rx: fbm1(t * f * 1.1, seed + 4, 3) * rotDeg * DEG, ry: fbm1(t * f * 1.1, seed + 5, 3) * rotDeg * DEG,
    rz: fbm1(t * f * 0.8, seed + 6, 3) * rotDeg * DEG,
  };
}

/** FOV multiplier for a punch on each onset: 1 - amount at the hit, springs back over `decay` s */
export function fovPunch(audio, t, { onset = 'kick', amount = 0.025, decay = 0.08 } = {}) {
  const s = audio.since(onset, t);
  if (!isFinite(s)) return 1;
  return 1 - amount * Math.exp(-s / decay);
}

/** roll (radians) that alternates ±deg on successive onsets, easing back between hits */
export function snareRoll(audio, t, { onset = 'snare', deg = 2, decay = 0.25 } = {}) {
  const i = audio.index(onset, t);
  if (i < 0) return 0;
  const s = t - audio.onsets(onset)[i];
  const sign = i % 2 === 0 ? 1 : -1;
  return sign * deg * DEG * Math.exp(-s / decay);
}

/** shake: high-frequency seeded jitter scaled by an envelope value */
export function shake(t, amount, { seed = 9, freq = 22 } = {}) {
  return { x: fbm1(t * freq, seed, 2) * amount, y: fbm1(t * freq, seed + 7, 2) * amount, rz: fbm1(t * freq, seed + 13, 2) * amount * 0.5 };
}

export function orbit(target, radius, azimuth, elevation = 0) {
  const tg = v3(target);
  return new THREE.Vector3(
    tg.x + radius * Math.cos(elevation) * Math.sin(azimuth),
    tg.y + radius * Math.sin(elevation),
    tg.z + radius * Math.cos(elevation) * Math.cos(azimuth),
  );
}

export function dolly(a, b, u) { return v3(a).clone().lerp(v3(b), u); }

/** position + aim a camera with modifiers. Mutates and returns the camera. */
export function applyCamera(camera, o) {
  const pos = v3(o.pos).clone();
  const target = v3(o.target || [0, 0, 0]).clone();
  const dist = pos.distanceTo(target);
  camera.position.copy(pos);
  camera.up.set(0, 1, 0);
  camera.lookAt(target);
  let rx = 0, ry = 0, rz = o.roll || 0;
  if (o.handheld) {
    const h = handheld(o.handheld.t ?? 0, o.handheld);
    _t.set(h.x * dist, h.y * dist, h.z * dist).applyQuaternion(camera.quaternion);
    camera.position.add(_t);
    rx += h.rx; ry += h.ry; rz += h.rz;
  }
  if (o.shake) { camera.position.x += o.shake.x * dist; camera.position.y += o.shake.y * dist; rz += o.shake.rz || 0; }
  if (o.rollAdd) rz += o.rollAdd;
  if (rx || ry || rz) {
    _q.setFromEuler(_e.set(rx, ry, rz, 'YXZ'));
    camera.quaternion.multiply(_q);
  }
  if (camera.isPerspectiveCamera) {
    camera.fov = (o.fov ?? camera.fov) * (o.fovMul ?? 1);
    if (o.near) camera.near = o.near;
    if (o.far) camera.far = o.far;
    camera.updateProjectionMatrix();
  }
  camera.updateMatrixWorld(true);
  return camera;
}

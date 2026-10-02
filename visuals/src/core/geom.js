// Geometry helpers.
import * as THREE from 'three';

/**
 * Expand an InstancedBufferGeometry (small base mesh + per-instance attributes) into a plain
 * indexed BufferGeometry with the instance attributes copied to every vertex. Shaders stay
 * unchanged (same attribute names). On SwiftShader, instanced draws of tiny meshes are ~10x more
 * expensive per vertex than plain batched draws, so large instance counts should be expanded.
 * Note: changing per-instance data later requires rebuilding (or use writeInstance()).
 */
export function expandInstanced(geo) {
  const base = geo.getAttribute('position');
  const nv = base.count;
  const index = geo.getIndex() ? Array.from(geo.getIndex().array) : Array.from({ length: nv }, (_, i) => i);
  const n = geo.instanceCount === Infinity ? 0 : geo.instanceCount;
  const out = new THREE.BufferGeometry();
  for (const [name, attr] of Object.entries(geo.attributes)) {
    const k = attr.itemSize;
    const arr = new Float32Array(n * nv * k);
    if (attr.isInstancedBufferAttribute) {
      for (let i = 0; i < n; i++) for (let v = 0; v < nv; v++) for (let c = 0; c < k; c++) arr[(i * nv + v) * k + c] = attr.array[i * k + c];
    } else {
      for (let i = 0; i < n; i++) arr.set(attr.array.subarray(0, nv * k), i * nv * k);
    }
    out.setAttribute(name, new THREE.BufferAttribute(arr, k));
  }
  const idx = new (n * nv > 65535 ? Uint32Array : Uint16Array)(n * index.length);
  for (let i = 0; i < n; i++) for (let j = 0; j < index.length; j++) idx[i * index.length + j] = index[j] + i * nv;
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.userData.verticesPerInstance = nv;
  out.userData.instances = n;
  return out;
}

/** write one instance's value into an expanded geometry attribute (all its vertices) */
export function writeInstance(geo, name, i, values) {
  const attr = geo.getAttribute(name);
  const nv = geo.userData.verticesPerInstance, k = attr.itemSize;
  for (let v = 0; v < nv; v++) for (let c = 0; c < k; c++) attr.array[(i * nv + v) * k + c] = values[c];
  attr.needsUpdate = true;
}

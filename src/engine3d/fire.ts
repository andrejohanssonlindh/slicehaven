import * as THREE from 'three';

/**
 * A voxel flame: a handful of small cubes that rise from the fuel, shrink and
 * cool from white-yellow to red to dark as they go, each on its own period and
 * wobble, plus a few sparks that drift up and out. One instanced draw. Nothing
 * in it is smooth on purpose: the look is a boil of chunky bits, not a cone.
 */

export interface Flame {
  object: THREE.Object3D;
  /** Move every bit to its place at time `t` seconds; `wind` leans the flame (x, z) a little. */
  tick(t: number, wind?: { x: number; z: number }): void;
  /** Let go of its geometry and material (after it is taken out of the scene). */
  dispose(): void;
}

const disposer = (mesh: THREE.InstancedMesh) => (): void => {
  mesh.geometry.dispose();
  (mesh.material as THREE.Material).dispose();
  mesh.dispose();
};

/** Heat colours from the base to the tip, then the soot at the very top. */
const HEAT = [0xfff4b0, 0xffc040, 0xf07a20, 0xc83c14, 0x6a2410].map((c) => new THREE.Color(c));

const hash = (i: number, k: number): number => {
  const s = Math.sin(i * 127.1 + k * 311.7 + 17.3) * 43758.5453;
  return s - Math.floor(s);
};

/**
 * A floating orb of light: a bright core cube and a swarm of small bits circling it on tilted rings, each on its own
 * radius and speed, flickering between white and pale blue. The same chunky look as the flame.
 */
export function makeOrb(size = 1, count = 14): Flame {
  const n = count + 1;
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ fog: false }), n);
  mesh.frustumCulled = false;
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  const PALE = [new THREE.Color(0xffffff), new THREE.Color(0xbfe8ff), new THREE.Color(0x7cc4ff)];
  const bits = Array.from({ length: count }, (_, i) => ({
    r: (0.16 + hash(i, 21) * 0.2) * size,
    speed: (1.2 + hash(i, 22) * 2.2) * (i % 2 ? 1 : -1),
    phase: hash(i, 23) * Math.PI * 2,
    tilt: hash(i, 24) * Math.PI,
    s: (0.035 + hash(i, 25) * 0.05) * size,
  }));
  const tick = (t: number): void => {
    // The core pulses; its bit never changes colour, only brightness.
    const pulse = 1 + 0.12 * Math.sin(t * 6.5) + 0.06 * Math.sin(t * 15.3);
    dummy.position.set(0, 0, 0);
    dummy.rotation.set(t * 0.7, t * 1.1, 0);
    dummy.scale.setScalar(0.17 * size * pulse);
    dummy.updateMatrix();
    mesh.setMatrixAt(0, dummy.matrix);
    mesh.setColorAt(0, col.setHex(0xffffff));
    for (let i = 0; i < count; i++) {
      const b = bits[i];
      const a = t * b.speed + b.phase;
      // A ring tilted about x by `tilt`, seen from any side.
      const x = Math.cos(a) * b.r, y0 = Math.sin(a) * b.r;
      dummy.position.set(x, y0 * Math.cos(b.tilt), y0 * Math.sin(b.tilt));
      dummy.rotation.set(a, a * 0.7, 0);
      const blink = 0.55 + 0.45 * Math.sin(t * 9 + i * 1.7);
      dummy.scale.setScalar(b.s * (0.6 + blink * 0.6));
      dummy.updateMatrix();
      mesh.setMatrixAt(i + 1, dummy.matrix);
      mesh.setColorAt(i + 1, col.copy(PALE[(i + Math.floor(t * 3)) % 3]));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };
  tick(0);
  return { object: mesh, tick, dispose: disposer(mesh) };
}

/**
 * @param size 1 = a campfire (about 0.8 m tall); a post torch is about 0.4.
 * @param count how many flame bits (sparks come on top, a quarter as many)
 */
export function makeFlame(size = 1, count = 18, seed = 0): Flame {
  const sparks = Math.max(2, Math.round(count / 4));
  const n = count + sparks;
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ fog: false }), n);
  mesh.frustumCulled = false;
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  // Per bit: its period, phase, base offset round the fuel, size and spin.
  const bits = Array.from({ length: n }, (_, i) => ({
    period: i < count ? 0.55 + hash(i + seed, 1) * 0.7 : 1.3 + hash(i + seed, 1) * 1.1,
    phase: hash(i + seed, 2),
    ang: hash(i + seed, 3) * Math.PI * 2,
    reach: hash(i + seed, 4),
    big: 0.6 + hash(i + seed, 5) * 0.8,
    spin: hash(i + seed, 6) * Math.PI,
  }));
  const tick = (t: number, wind = { x: 0, z: 0 }): void => {
    for (let i = 0; i < n; i++) {
      const b = bits[i];
      const spark = i >= count;
      const a = (t / b.period + b.phase) % 1; // 0 at the fuel, 1 at the tip
      // The same bit comes round again somewhere else each cycle.
      const cyc = Math.floor(t / b.period + b.phase);
      const jx = hash(i + seed, cyc * 3 + 7) - 0.5, jz = hash(i + seed, cyc * 3 + 8) - 0.5;
      const spread = (spark ? 0.22 : 0.16) * size * (1 - (spark ? 0 : a * 0.8));
      const height = (spark ? 1.5 : 0.8) * size;
      const x = (jx * 1.4 + Math.cos(b.ang) * b.reach * 0.3) * spread * 2 + wind.x * a * a * size * 0.25 + Math.sin(t * 5 + b.spin) * 0.03 * size * a;
      const z = (jz * 1.4 + Math.sin(b.ang) * b.reach * 0.3) * spread * 2 + wind.z * a * a * size * 0.25;
      const y = 0.06 * size + a * height * (0.7 + 0.3 * b.big);
      // Chunky at the base, small at the tip; sparks stay tiny.
      const s = spark ? 0.045 * size * (1 - a * 0.6) : (0.2 * size * b.big) * Math.max(0.12, 1 - a * 0.95) * (1 + 0.15 * Math.sin(t * 17 + i));
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, b.spin + t * 1.5 * (i % 2 ? 1 : -1), 0);
      dummy.scale.set(s, s * (spark ? 1 : 1.35), s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      if (spark) col.setHex(0xffe08a);
      else {
        const f = Math.min(HEAT.length - 1.001, a * (HEAT.length - 1) * (0.9 + 0.2 * hash(i + seed, cyc)));
        col.copy(HEAT[Math.floor(f)]).lerp(HEAT[Math.floor(f) + 1], f - Math.floor(f));
      }
      mesh.setColorAt(i, col);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };
  tick(0);
  return { object: mesh, tick, dispose: disposer(mesh) };
}

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

/** The pixel fire's 37 heats, 0 (nothing) to 36 (white-hot): dark red at the tip, through orange, to pale yellow at the root. */
const FIRE_HEATS = 37;
const FIRE_STOPS: [number, number][] = [[0, 0x1c0604], [6, 0x5a1206], [12, 0xa02408], [18, 0xd8480c], [24, 0xf08a1c], [30, 0xffc848], [36, 0xfff4c8]];
const FIRE_PALETTE: number[][] = Array.from({ length: FIRE_HEATS }, (_, v) => {
  let i = 0;
  while (i < FIRE_STOPS.length - 2 && FIRE_STOPS[i + 1][0] < v) i++;
  const [v0, c0] = FIRE_STOPS[i], [v1, c1] = FIRE_STOPS[i + 1];
  const f = Math.min(1, Math.max(0, (v - v0) / (v1 - v0)));
  const ch = (c: number, s: number): number => (c >> s) & 255;
  return [16, 8, 0].map((s) => Math.round(ch(c0, s) + (ch(c1, s) - ch(c0, s)) * f));
});

/**
 * A pixel fire (the director's rule, the old demo fire): a grid of heats 0–36; each step every cell takes the heat of
 * the cell below it, less a random 0–2, and lands that same 0–2 cells over toward the wind (still air: jitters either
 * way). The bottom row is the fuel: hot in the middle, cooler toward the edges, so it burns as a tongue and not a wall.
 * Drawn on a card that turns to face the camera (it reads the same from every side), the wind taken across the card.
 * @param size 1 = a campfire (about 0.8 m tall); a post torch is about 0.4.
 */
export function makeFlame(size = 1, _count = 18, seed = 0): Flame {
  const W = 14, H = 24;
  const heat = new Uint8Array(W * H);
  const rgba = new Uint8Array(W * H * 4);
  const tex = new THREE.DataTexture(rgba, W, H, THREE.RGBAFormat);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.flipY = false;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, fog: false, depthWrite: false });
  const geo = new THREE.PlaneGeometry(0.62 * size, 1.06 * size);
  geo.translate(0, 0.5 * 1.06 * size - 0.04 * size, 0);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  // A small generator of its own, so each fire burns differently (the engine's look, not a rule: no seeded game rng).
  let s = (seed * 2654435761 + 12345) >>> 0 || 1;
  const rnd = (): number => {
    s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
  // How the wind lies across the card, from the camera each frame: -1 (to the card's left) .. 1 (right).
  let across = 0;
  let windNow = { x: 0, z: 0 };
  const p = new THREE.Vector3();
  mesh.onBeforeRender = (_r, _s, camera) => {
    mesh.getWorldPosition(p);
    const yaw = Math.atan2(camera.position.x - p.x, camera.position.z - p.z);
    mesh.rotation.y = yaw;
    // The card's right in the world is (cos yaw, 0, -sin yaw).
    across = windNow.x * Math.cos(yaw) - windNow.z * Math.sin(yaw);
  };
  const fuel = (): void => {
    const row = (H - 1) * W;
    for (let x = 0; x < W; x++) {
      const edge = Math.abs(x - (W - 1) / 2) / (W / 2); // 0 in the middle, 1 at the edge
      const top = edge < 0.35 ? 36 : edge < 0.6 ? 30 : edge < 0.8 ? 18 : 0;
      heat[row + x] = top ? Math.max(0, top - Math.floor(rnd() * 6)) : 0;
    }
  };
  const step = (): void => {
    fuel();
    const dir = across > 0.2 ? 1 : across < -0.2 ? -1 : 0;
    for (let y = 0; y < H - 1; y++) {
      for (let x = 0; x < W; x++) {
        const below = heat[(y + 1) * W + x];
        const r = Math.floor(rnd() * 3); // 0, 1 or 2
        // Toward the wind by the same amount it cooled; in still air a jitter either way.
        const dx = dir !== 0 ? dir * r : r - 1;
        const tx = x + dx;
        if (tx < 0 || tx >= W) continue;
        heat[y * W + tx] = Math.max(0, below - r);
      }
    }
  };
  const paint = (): void => {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        // (Row 0 of the texture is the bottom of the card: the grid's last row, the fuel.)
        const v = heat[(H - 1 - y) * W + x];
        const o = (y * W + x) * 4;
        const c = FIRE_PALETTE[v];
        rgba[o] = c[0]; rgba[o + 1] = c[1]; rgba[o + 2] = c[2];
        // The coolest heats are gone: no dark box round the flame.
        rgba[o + 3] = v > 7 ? 255 : 0;
      }
    }
    tex.needsUpdate = true;
  };
  // Steps at a steady rate whatever the frame rate (the old demo ran at 35 a second); a long pause doesn't catch up.
  const RATE = 24;
  let last = -1;
  for (let i = 0; i < H * 2; i++) step();
  paint();
  const tick = (t: number, wind = { x: 0, z: 0 }): void => {
    windNow = wind;
    if (last < 0) last = t;
    let n = Math.min(3, Math.floor((t - last) * RATE));
    if (n <= 0) return;
    last += n / RATE;
    if (t - last > 0.5) last = t;
    while (n-- > 0) step();
    paint();
  };
  return {
    object: mesh,
    tick,
    dispose: () => {
      geo.dispose();
      mat.dispose();
      tex.dispose();
    },
  };
}

/**
 * The old boil of cubes, kept for comparison until the director has seen the pixel fire (`makeFlame`).
 * @param size 1 = a campfire (about 0.8 m tall); a post torch is about 0.4.
 * @param count how many flame bits (sparks come on top, a quarter as many)
 */
export function makeCubeFlame(size = 1, count = 18, seed = 0): Flame {
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

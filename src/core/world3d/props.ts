import { Rng } from '../rng';
import type { Clump } from './tree';
import { type MeshData, type Vec3, addBeam, addBox, addFace, addOrientedBox, emptyMesh } from './mesh';
import { type Shape, circle } from './space';
import type { FSource } from './filaments3d';
import { type MoreKind, SIGHT_BLOCKING, isMore, moreShapes } from './propsMore';

/**
 * Small things placed in the world: shrubs, boulders, woodpiles. Each has a
 * model, a collision shape for feet, and (shrub, boulder) a filament source.
 * The renderer turns clumps into lumpy balls, as it does for trees.
 */

export type PropKind = 'shrub' | 'boulder' | 'woodpile' | 'crates' | 'well' | 'fence' | 'cart' | 'laundry' | MoreKind;

export interface PlacedProp {
  kind: PropKind;
  x: number;
  z: number;
  /** Turn about y, like `rotation.y`. Shrubs, boulders and wells do not care. */
  rot?: number;
  /** Scale, 1 = the base size. */
  size?: number;
  /** Fences, walls, palisades and washing lines: the run's length in metres (default 4); a gate's opening. */
  len?: number;
  /** Gates: the leaves are swung back. */
  open?: boolean;
  seed: number;
}

export interface Lumps {
  clumps: Clump[];
  height: number;
}

const sizeOf = (p: PlacedProp): number => p.size ?? 1;

/** A low bush: a handful of overlapping leaf balls close to the ground. */
export function buildShrub(seed: number): Lumps {
  const rng = Rng.fromSeed(seed);
  const clumps: Clump[] = [];
  // A low mound of several small clusters, lighter on top and toward the edge.
  const n = 5 + rng.int(3);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng.next();
    const d = i === 0 ? 0 : 0.4 + rng.next() * 0.3;
    const r = (i === 0 ? 0.4 : 0.26) + rng.next() * 0.16;
    clumps.push({ at: [Math.cos(a) * d, r * 0.75 + (i === 0 ? 0.2 : 0), Math.sin(a) * d], r: [r, r * 0.8, r], tone: i === 0 ? 0.9 : 0.3 + rng.next() * 0.4 });
  }
  return { clumps, height: Math.max(...clumps.map((c) => c.at[1] + c.r[1])) };
}

/** A boulder: a big lump, a smaller one leaning on it, half sunk in the ground. */
export function buildBoulder(seed: number): Lumps {
  const rng = Rng.fromSeed(seed);
  const r = 0.55 + rng.next() * 0.2;
  const clumps: Clump[] = [{ at: [0, r * 0.35, 0], r: [r * 1.1, r * 0.8, r] }];
  const a = rng.next() * Math.PI * 2, r2 = r * (0.45 + rng.next() * 0.2);
  clumps.push({ at: [Math.cos(a) * r * 0.9, r2 * 0.2, Math.sin(a) * r * 0.9], r: [r2, r2 * 0.8, r2] });
  return { clumps, height: Math.max(...clumps.map((c) => c.at[1] + c.r[1])) };
}

/** Stacked split logs, ends toward the viewer's side; local x along the pile. */
export function buildWoodpile(seed: number): MeshData {
  const rng = Rng.fromSeed(seed);
  const m = emptyMesh();
  const len = 1.7, log = 0.2;
  const rows = 3 + rng.int(2);
  for (let row = 0; row < rows; row++) {
    const across = rows - row; // each row up is a log narrower, so the pile is a rough heap
    for (let k = 0; k < across + 1; k++) {
      const z = (k - across / 2) * log * 1.05;
      const y = log * 0.5 + row * log * 0.95;
      const l = len * (0.9 + rng.next() * 0.1);
      const a: Vec3 = [-l / 2, y, z], b: Vec3 = [l / 2, y, z];
      addBeam(m, a, b, log * (0.85 + rng.next() * 0.2), [0, 1, 0], { aoBottom: 0.7 });
    }
  }
  return m;
}

/** A stack of crates: two on the ground, one on top, each a little off true. Local x/z are the stack's ground plan. */
export function buildCrates(seed: number): MeshData {
  const rng = Rng.fromSeed(seed);
  const m = emptyMesh();
  const box = (cx: number, cz: number, y: number, s: number): void => {
    const a = (rng.next() - 0.5) * 0.25, ca = Math.cos(a), sa = Math.sin(a);
    addOrientedBox(m, [cx, y + s / 2, cz], [ca, 0, -sa], [0, 1, 0], [sa, 0, ca], [s / 2, s / 2, s / 2], { aoBottom: 0.7 });
  };
  box(-0.28, 0, 0, 0.52);
  box(0.3, 0.05, 0, 0.5);
  box(0.02, 0.02, 0.5, 0.44);
  return m;
}

/** A well: a stone ring, two posts and a small roof beam with a bucket's rope. Stone and wood are separate meshes. */
export function buildWell(): { stone: MeshData; wood: MeshData; water: MeshData } {
  const stone = emptyMesh(), wood = emptyMesh(), water = emptyMesh();
  const R = 0.62, T = 0.2, H = 0.7, N = 10;
  // The ring: short boxes round a circle, each turned to follow it.
  for (let i = 0; i < N; i++) {
    const a = ((i + 0.5) / N) * Math.PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    addOrientedBox(stone, [c * R, H / 2, s * R], [-s, 0, c], [0, 1, 0], [c, 0, s], [(Math.PI * R) / N + 0.01, H / 2, T / 2], { aoBottom: 0.7 });
  }
  addBeam(wood, [-R, 0, 0], [-R, 1.9, 0], 0.14, [0, 0, 1], { aoBottom: 0.7 });
  addBeam(wood, [R, 0, 0], [R, 1.9, 0], 0.14, [0, 0, 1], { aoBottom: 0.7 });
  addBeam(wood, [-R - 0.1, 1.85, 0], [R + 0.1, 1.85, 0], 0.13, [0, 0, 1]);
  // A pitched cover.
  addBox(wood, [-R - 0.25, 1.95, -0.5], [R + 0.25, 2.02, 0.5]);
  addBeam(wood, [0, 1.84, 0], [0, 1.4, 0], 0.03, [0, 0, 1]);
  // The water, a little below the rim, so the shaft is not grass.
  const ring: Vec3[] = [];
  for (let i = 0; i < 12; i++) ring.push([Math.cos((i / 12) * Math.PI * 2) * (R - T / 2 + 0.02), H * 0.5, -Math.sin((i / 12) * Math.PI * 2) * (R - T / 2 + 0.02)]);
  for (let i = 1; i < 11; i++) addFace(water, [ring[0], ring[i], ring[i + 1]], [1, 1, 1]);
  return { stone, wood, water };
}

/** A run of fence along local x, `len` metres: posts every ~1.4 m and two rails. */
export function buildFence(len: number, seed: number): MeshData {
  const rng = Rng.fromSeed(seed);
  const m = emptyMesh();
  const n = Math.max(2, Math.round(len / 1.4) + 1);
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + (i / (n - 1)) * len;
    addBeam(m, [x, 0, 0], [x, 0.95 + rng.next() * 0.12, 0], 0.11, [0, 0, 1], { aoBottom: 0.7 });
  }
  for (const y of [0.4, 0.75]) addBox(m, [-len / 2, y, 0.05], [len / 2, y + 0.08, 0.12], { aoBottom: 0.8 });
  return m;
}

/** A hand cart: an open bed on two wheels with two shafts. Wheels are separate so the cart can be one wood mesh. */
export function buildCart(seed: number): MeshData {
  const rng = Rng.fromSeed(seed);
  const m = emptyMesh();
  const bedY = 0.55;
  addBox(m, [-0.7, bedY, -0.45], [0.7, bedY + 0.08, 0.45], { aoBottom: 0.7 });
  for (const z of [-0.45, 0.45]) addBox(m, [-0.7, bedY + 0.08, z - 0.04], [0.7, bedY + 0.42, z + 0.04]);
  addBox(m, [-0.74, bedY + 0.08, -0.45], [-0.66, bedY + 0.42, 0.45]);
  addBox(m, [0.66, bedY + 0.08, -0.45], [0.74, bedY + 0.42, 0.45]);
  // Wheels: a rim of short beams round a hub, and three crossed spokes, either side of the bed.
  const RIM = 10, WR = 0.5;
  for (const z of [-0.55, 0.55]) {
    for (let k = 0; k < RIM; k++) {
      const a0 = (k / RIM) * Math.PI * 2, a1 = ((k + 1) / RIM) * Math.PI * 2;
      addBeam(m, [Math.cos(a0) * WR, 0.5 + Math.sin(a0) * WR, z], [Math.cos(a1) * WR, 0.5 + Math.sin(a1) * WR, z], 0.09, [0, 0, 1], { aoBottom: 0.8 });
    }
    addBox(m, [-0.07, 0.43, z - 0.08], [0.07, 0.57, z + 0.08]);
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI + rng.next() * 0.02;
      addBeam(m, [-Math.cos(a) * 0.5, 0.5 - Math.sin(a) * 0.5, z], [Math.cos(a) * 0.5, 0.5 + Math.sin(a) * 0.5, z], 0.07, [0, 0, 1], { aoBottom: 0.8 });
    }
  }
  // Shafts forward, resting on the ground, and a prop under the back.
  for (const z of [-0.3, 0.3]) addBeam(m, [0.5, bedY, z], [1.9, 0.12, z], 0.07, [0, 1, 0]);
  return m;
}

/** Cloth colours on a washing line (linen, rust, blue, ochre): each a mesh of its own so each gets its own material. */
export const LAUNDRY_COLOURS = [0xe8e2d0, 0xb4603c, 0x4f6f94, 0xc9a24a];
/** Where a washing line's cloth hangs from, and how far it drops (local metres). */
export const LAUNDRY_HANG = { top: 1.55, drop: 0.7 };

/** A washing line: two posts, a sagging rope, and cloths hanging from it. The cloths sway in the wind (hanging sway). */
export function buildLaundry(len: number, seed: number): { wood: MeshData; cloths: { colour: number; mesh: MeshData }[] } {
  const rng = Rng.fromSeed(seed);
  const wood = emptyMesh();
  const { top, drop } = LAUNDRY_HANG;
  for (const x of [-len / 2, len / 2]) addBeam(wood, [x, 0, 0], [x, top + 0.1, 0], 0.1, [0, 0, 1], { aoBottom: 0.7 });
  // The rope in short straight runs that sag in the middle.
  const SEG = 8;
  const sag = (x: number): number => 0.12 * (1 - (x / (len / 2)) ** 2);
  for (let i = 0; i < SEG; i++) {
    const x0 = -len / 2 + (i / SEG) * len, x1 = -len / 2 + ((i + 1) / SEG) * len;
    addBeam(wood, [x0, top - sag(x0), 0], [x1, top - sag(x1), 0], 0.025, [0, 0, 1]);
  }
  const cloths = LAUNDRY_COLOURS.map((colour) => ({ colour, mesh: emptyMesh() }));
  let x = -len / 2 + 0.3;
  while (x < len / 2 - 0.5) {
    const w = 0.35 + rng.next() * 0.3;
    const h = drop * (0.6 + rng.next() * 0.4);
    const c = cloths[Math.floor(rng.next() * cloths.length)];
    const y1 = top - sag(x + w / 2);
    addBox(c.mesh, [x, y1 - h, -0.015], [x + w, y1, 0.015], { aoBottom: 0.85 });
    x += w + 0.12 + rng.next() * 0.2;
  }
  return { wood, cloths: cloths.filter((c) => c.mesh.positions.length > 0) };
}

/** Everything that blocks feet for a prop (a gate is two posts and, shut, a leaf between them). */
export function propShapes(p: PlacedProp): Shape[] {
  return isMore(p.kind) ? moreShapes(p) : [propShape(p)];
}

/** Whether the eye is stopped by it: boulders, palisades, walls, towers. */
export const blocksSight = (p: PlacedProp): boolean => p.kind === 'boulder' || SIGHT_BLOCKING.includes(p.kind);

/** What blocks feet (the first of `propShapes`). */
export function propShape(p: PlacedProp): Shape {
  if (isMore(p.kind)) return moreShapes(p)[0];
  const s = sizeOf(p);
  const rot = p.rot ?? 0;
  switch (p.kind) {
    case 'woodpile': return { kind: 'box', x: p.x, z: p.z, hw: 0.9 * s, hd: 0.55 * s, rot };
    case 'crates': return { kind: 'box', x: p.x, z: p.z, hw: 0.6 * s, hd: 0.35 * s, rot };
    case 'cart': return { kind: 'box', x: p.x, z: p.z, hw: 0.8 * s, hd: 0.55 * s, rot };
    case 'laundry':
    case 'fence': return { kind: 'box', x: p.x, z: p.z, hw: ((p.len ?? 4) / 2) * s, hd: 0.1, rot };
    // The ring's outer edge (0.72) and no more: the hero's own radius is added when walking, so they can stand right against the stones.
    case 'well': return circle(p.x, p.z, 0.72 * s);
    default: return circle(p.x, p.z, (p.kind === 'boulder' ? 0.75 : 0.5) * s);
  }
}

/** The filament source a prop is, if any: bushes are thicket, boulders are rock. */
export function propSource(p: PlacedProp): FSource | null {
  if (p.kind === 'shrub') return { x: p.x, z: p.z, kind: 'thicket' };
  if (p.kind === 'boulder') return { x: p.x, z: p.z, kind: 'rock' };
  if (p.kind === 'well') return { x: p.x, z: p.z, kind: 'water', weight: 0.6 };
  return null;
}

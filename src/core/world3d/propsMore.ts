import { Rng } from '../rng';
import { type MeshData, type Vec3, addBeam, addBox, addOrientedBox, emptyMesh } from './mesh';
import type { PlacedProp } from './props';
import { type Shape, circle } from './space';

/**
 * The second set of small things: the walls and gates of a settlement (palisade, tower, gate, archway, drystone wall) and
 * what stands in its lanes (barrel, hay, signpost, market stall, bench, trough, stump). Each is local metres with x along
 * its length, turned by `rot` like the rest. The renderer picks a material per part.
 */

export type MoreKind = 'palisade' | 'tower' | 'gate' | 'archway' | 'stonewall' | 'barrel' | 'hay' | 'signpost' | 'stall' | 'bench' | 'trough' | 'stump';

export const MORE_KINDS: readonly MoreKind[] = ['palisade', 'tower', 'gate', 'archway', 'stonewall', 'barrel', 'hay', 'signpost', 'stall', 'bench', 'trough', 'stump'];

export const isMore = (k: string): k is MoreKind => (MORE_KINDS as readonly string[]).includes(k);

/** What a prop is made of: meshes by material. `bark` is the round-timber look (stump), `wood` planks and posts. */
export interface PropParts {
  wood?: MeshData;
  stone?: MeshData;
  hay?: MeshData;
  /** Cloth in flat colours (hex), no sway. */
  cloth?: { colour: number; mesh: MeshData }[];
}

const X: Vec3 = [1, 0, 0];

/** A run of palisade: close-set stakes with sharpened tips, tied with two rails on the inside. */
function palisade(len: number, seed: number): PropParts {
  const rng = Rng.fromSeed(seed);
  const m = emptyMesh();
  const n = Math.max(2, Math.ceil(len / 0.2));
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + ((i + 0.5) * len) / n;
    const h = 2.05 + rng.next() * 0.5;
    addBox(m, [x - 0.095, -0.1, -0.095], [x + 0.095, h, 0.095], { aoBottom: 0.65 });
    addBox(m, [x - 0.05, h, -0.05], [x + 0.05, h + 0.26, 0.05]); // the point
  }
  for (const y of [0.5, 1.45]) addBox(m, [-len / 2, y, 0.095], [len / 2, y + 0.12, 0.2]);
  return { wood: m };
}

/** A watch tower: four legs braced, a platform with a rail, a plank roof, a ladder. About 2.4 m square. */
function tower(seed: number): PropParts {
  const rng = Rng.fromSeed(seed);
  const m = emptyMesh();
  const L = 1.0, PLAT = 3.0;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    addBeam(m, [sx * L, -0.1, sz * L], [sx * (L - 0.08), PLAT, sz * (L - 0.08)], 0.24, [0, 1, 0], { aoBottom: 0.6 });
    addBeam(m, [sx * (L - 0.08), PLAT, sz * (L - 0.08)], [sx * (L - 0.08), 4.6, sz * (L - 0.08)], 0.16, [0, 1, 0]);
  }
  // Cross braces on two sides.
  for (const sz of [-1, 1]) {
    addBeam(m, [-L, 0.3, sz * L], [L, 2.5, sz * L], 0.1, [0, 0, 1]);
    addBeam(m, [L, 0.3, sz * L], [-L, 2.5, sz * L], 0.1, [0, 0, 1]);
  }
  addBox(m, [-1.25, PLAT - 0.1, -1.25], [1.25, PLAT, 1.25], { aoBottom: 0.6 });
  // Rail: a plank at the waist and one at the knee on every side but the ladder's.
  for (const y of [PLAT + 0.45, PLAT + 0.95]) {
    addBox(m, [-1.25, y, -1.25], [1.25, y + 0.1, -1.15]);
    addBox(m, [-1.25, y, -1.25], [-1.15, y + 0.1, 1.25]);
    addBox(m, [1.15, y, -1.25], [1.25, y + 0.1, 1.25]);
  }
  addBox(m, [-1.25, PLAT + 0.45, 1.15], [-0.35, PLAT + 0.55, 1.25]);
  addBox(m, [0.35, PLAT + 0.45, 1.15], [1.25, PLAT + 0.55, 1.25]);
  // The roof: a flat plank lid, a little crooked.
  addBox(m, [-1.5, 4.6, -1.5], [1.5, 4.72, 1.5], { aoBottom: 0.6 });
  addBox(m, [-1.3, 4.72, -1.3], [1.3, 4.82, 1.3]);
  // The ladder, up the front.
  for (const x of [-0.2, 0.2]) addBeam(m, [x, 0, 1.55], [x, PLAT + 0.9, 1.15], 0.08, [0, 0, 1]);
  for (let y = 0.3; y < PLAT + 0.6; y += 0.38 + rng.next() * 0.02) addBox(m, [-0.2, y, 1.46 - (y / PLAT) * 0.3], [0.2, y + 0.05, 1.54 - (y / PLAT) * 0.3]);
  return { wood: m };
}

/** One gate leaf, `w` wide and 2.4 high, hinged at `hx`. Closed it runs along x toward the middle; open it swings out along +z. */
function leaf(m: MeshData, hx: number, dir: 1 | -1, w: number, open: boolean): void {
  // (u along the leaf from the hinge, t across its thickness) to world boxes.
  const slab = (u0: number, u1: number, y0: number, y1: number, t0: number, t1: number): void => {
    if (open) {
      const xa = hx + t0 * dir, xb = hx + t1 * dir;
      addBox(m, [Math.min(xa, xb), y0, u0], [Math.max(xa, xb), y1, u1]);
    } else {
      const xa = hx + u0 * dir, xb = hx + u1 * dir;
      addBox(m, [Math.min(xa, xb), y0, t0], [Math.max(xa, xb), y1, t1]);
    }
  };
  const boards = Math.max(3, Math.round(w / 0.22));
  for (let i = 0; i < boards; i++) slab((i * w) / boards, ((i + 1) * w) / boards - 0.015, 0.15, 2.4, -0.05, 0.05);
  // Battens low and high, and a diagonal brace between them.
  for (const y of [0.45, 1.85]) slab(0.02, w - 0.03, y, y + 0.14, 0.05, 0.11);
  const steps = 5;
  for (let i = 0; i < steps; i++) {
    const k0 = i / steps, k1 = (i + 1) / steps;
    slab(0.02 + k0 * (w - 0.05), 0.02 + k1 * (w - 0.05), 0.5 + k0 * 1.4, 0.64 + k1 * 1.4, 0.05, 0.11);
  }
}

/** A timber gate: two posts and a lintel; the leaves are shut across the opening or swung back on their hinges. */
function gate(len: number, open: boolean): PropParts {
  const m = emptyMesh();
  const h = len / 2;
  for (const x of [-h - 0.17, h + 0.17]) addBox(m, [x - 0.17, -0.1, -0.17], [x + 0.17, 3.1, 0.17], { aoBottom: 0.6 });
  addBox(m, [-h - 0.3, 3.0, -0.14], [h + 0.3, 3.25, 0.14]);
  const w = h - 0.03;
  leaf(m, -h, 1, w, open);
  leaf(m, h, -1, w, open);
  return { wood: m };
}

/** A stone archway: two piers and a lintel with a cap. */
function archway(len: number, seed: number): PropParts {
  const rng = Rng.fromSeed(seed);
  const m = emptyMesh();
  const h = len / 2;
  for (const s of [-1, 1]) {
    // Piers laid in courses, each a little askew.
    for (let c = 0; c < 6; c++) {
      const j = (rng.next() - 0.5) * 0.06;
      const x = s * (h + 0.4) + j;
      addBox(m, [x - 0.42, c * 0.5, -0.4], [x + 0.42, c * 0.5 + 0.48, 0.4], { aoBottom: c === 0 ? 0.65 : 0.85 });
    }
  }
  addBox(m, [-h - 0.55, 3.0, -0.45], [h + 0.55, 3.55, 0.45], { aoBottom: 0.7 });
  addBox(m, [-h - 0.35, 3.55, -0.3], [h + 0.35, 3.8, 0.3]);
  return { stone: m };
}

/** A low drystone wall: coursed rough blocks, uneven along the top. */
function stonewall(len: number, seed: number): PropParts {
  const rng = Rng.fromSeed(seed);
  const m = emptyMesh();
  let x = -len / 2;
  while (x < len / 2 - 0.05) {
    const w = Math.min(0.35 + rng.next() * 0.3, len / 2 - x);
    const h = 0.42 + rng.next() * 0.1;
    const d = 0.26 + rng.next() * 0.04;
    addBox(m, [x, -0.1, -d], [x + w - 0.02, h, d], { aoBottom: 0.7 });
    // The top course: shorter blocks, offset by half.
    const top = 0.25 + rng.next() * 0.3;
    addBox(m, [x + w * 0.5, h, -d * 0.9], [Math.min(x + w * 0.5 + top, len / 2), h + 0.2 + rng.next() * 0.2, d * 0.9], { aoBottom: 0.85 });
    x += w;
  }
  return { stone: m };
}

/** A barrel: bellied staves, a lid and two hoops. */
function barrel(): PropParts {
  const m = emptyMesh();
  const N = 8;
  for (let k = 0; k < N; k++) {
    const a = (k / N) * Math.PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    const face: Vec3 = [c, 0, s];
    addBeam(m, [c * 0.25, 0, s * 0.25], [c * 0.31, 0.45, s * 0.31], 0.14, face, { aoBottom: 0.7 });
    addBeam(m, [c * 0.31, 0.45, s * 0.31], [c * 0.25, 0.9, s * 0.25], 0.14, face);
  }
  addBox(m, [-0.2, 0.86, -0.2], [0.2, 0.92, 0.2]);
  return { wood: m };
}

/** Hay: two bales side by side and one across the top. */
function hay(seed: number): PropParts {
  const rng = Rng.fromSeed(seed);
  const m = emptyMesh();
  const j = (): number => (rng.next() - 0.5) * 0.05;
  addBox(m, [-0.95 + j(), -0.05, -0.32], [-0.02 + j(), 0.52, 0.32], { aoBottom: 0.7 });
  addBox(m, [0.02, -0.05, -0.32 + j()], [0.95, 0.5, 0.32], { aoBottom: 0.7 });
  addBox(m, [-0.45 + j(), 0.52, -0.3], [0.45, 1.02, 0.3 + j()], { aoBottom: 0.85 });
  return { hay: m };
}

/** A signpost: a post with two pointing boards. */
function signpost(): PropParts {
  const m = emptyMesh();
  addBeam(m, [0, -0.1, 0], [0, 2.3, 0], 0.14, [0, 0, 1], { aoBottom: 0.6 });
  addBox(m, [0.07, 1.85, -0.04], [0.95, 2.1, 0.04]);
  addBox(m, [0.95, 1.9, -0.03], [1.1, 2.05, 0.03]);
  addBox(m, [-0.85, 1.5, -0.04], [-0.07, 1.75, 0.04]);
  addBox(m, [-1.0, 1.55, -0.03], [-0.85, 1.7, 0.03]);
  return { wood: m };
}

/** A market stall: a counter, four posts and a striped awning slanting toward the street (+z). */
function stall(seed: number): PropParts {
  const rng = Rng.fromSeed(seed);
  const wood = emptyMesh();
  for (const sx of [-1.05, 1.05]) for (const sz of [-0.55, 0.65]) addBeam(wood, [sx, -0.05, sz], [sx, sz < 0 ? 2.45 : 2.05, sz], 0.1, [0, 0, 1]);
  addBox(wood, [-1.1, 0.78, 0.0], [1.1, 0.88, 0.75]);
  addBox(wood, [-1.0, 0.0, 0.05], [1.0, 0.78, 0.15], { aoBottom: 0.7 });
  addBox(wood, [-1.1, 1.2, -0.62], [1.1, 1.32, -0.5]); // the back shelf
  // The awning: stripes along x, tilted down toward +z.
  const th = Math.atan2(0.4, 1.2), c = Math.cos(th), s = Math.sin(th);
  const ay: Vec3 = [0, c, s], az: Vec3 = [0, -s, c];
  const palette = [[0xb4603c, 0xe8e2d0], [0x4f6f94, 0xe8e2d0], [0x6a8a3c, 0xe8e2d0], [0xc9a24a, 0x8a3a2c]];
  const [ca, cb] = palette[Math.floor(rng.next() * palette.length)];
  const A = emptyMesh(), B = emptyMesh();
  const STRIPES = 6;
  for (let i = 0; i < STRIPES; i++) {
    const x = -1.1 + ((i + 0.5) * 2.2) / STRIPES;
    addOrientedBox(i % 2 ? B : A, [x, 2.25, 0.05], X, ay, az, [1.1 / STRIPES, 0.025, 0.85]);
  }
  return { wood, cloth: [{ colour: ca, mesh: A }, { colour: cb, mesh: B }] };
}

/** A bench: a plank on two slab legs. */
function bench(): PropParts {
  const m = emptyMesh();
  addBox(m, [-0.75, 0.42, -0.17], [0.75, 0.5, 0.17]);
  for (const x of [-0.6, 0.6]) addBox(m, [x - 0.05, 0, -0.14], [x + 0.05, 0.42, 0.14], { aoBottom: 0.6 });
  return { wood: m };
}

/** A trough: four boards and two feet, hollow. */
function trough(): PropParts {
  const m = emptyMesh();
  addBox(m, [-0.85, 0.15, -0.3], [0.85, 0.2, 0.3]);
  addBox(m, [-0.85, 0.2, -0.3], [0.85, 0.65, -0.24], { aoBottom: 0.8 });
  addBox(m, [-0.85, 0.2, 0.24], [0.85, 0.65, 0.3], { aoBottom: 0.8 });
  for (const x of [-0.85, 0.79]) addBox(m, [x, 0.2, -0.24], [x + 0.06, 0.65, 0.24], { aoBottom: 0.8 });
  for (const x of [-0.6, 0.6]) addBox(m, [x - 0.06, 0, -0.26], [x + 0.06, 0.15, 0.26], { aoBottom: 0.6 });
  return { wood: m };
}

/** A tree stump with a few roots. */
function stump(seed: number): PropParts {
  const rng = Rng.fromSeed(seed);
  const m = emptyMesh();
  const h = 0.4 + rng.next() * 0.15;
  addBeam(m, [0, -0.1, 0], [0, h, 0], 0.55, [0, 0, 1], { aoBottom: 0.6 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + rng.next();
    addBeam(m, [Math.cos(a) * 0.2, 0.15, Math.sin(a) * 0.2], [Math.cos(a) * 0.5, -0.02, Math.sin(a) * 0.5], 0.12, [0, 1, 0]);
  }
  return { wood: m };
}

export function buildMore(p: PlacedProp): PropParts {
  switch (p.kind as MoreKind) {
    case 'palisade': return palisade(p.len ?? 4, p.seed);
    case 'tower': return tower(p.seed);
    case 'gate': return gate(p.len ?? 3, !!p.open);
    case 'archway': return archway(p.len ?? 3.2, p.seed);
    case 'stonewall': return stonewall(p.len ?? 4, p.seed);
    case 'barrel': return barrel();
    case 'hay': return hay(p.seed);
    case 'signpost': return signpost();
    case 'stall': return stall(p.seed);
    case 'bench': return bench();
    case 'trough': return trough();
    case 'stump': return stump(p.seed);
  }
}

/** What blocks feet (an open gate and an archway block only their posts). */
export function moreShapes(p: PlacedProp): Shape[] {
  const s = p.size ?? 1;
  const rot = p.rot ?? 0;
  const at = (lx: number, lz: number): { x: number; z: number } => ({ x: p.x + (lx * Math.cos(rot) + lz * Math.sin(rot)) * s, z: p.z + (-lx * Math.sin(rot) + lz * Math.cos(rot)) * s });
  const box = (lx: number, lz: number, hw: number, hd: number): Shape => ({ kind: 'box', ...at(lx, lz), hw: hw * s, hd: hd * s, rot });
  switch (p.kind as MoreKind) {
    case 'palisade': return [box(0, 0, (p.len ?? 4) / 2, 0.2)];
    case 'stonewall': return [box(0, 0, (p.len ?? 4) / 2, 0.3)];
    case 'tower': return [box(0, 0, 1.2, 1.2)];
    case 'gate': {
      const h = (p.len ?? 3) / 2;
      const posts = [box(-h - 0.17, 0, 0.19, 0.19), box(h + 0.17, 0, 0.19, 0.19)];
      return p.open ? posts : [...posts, box(0, 0, h, 0.12)];
    }
    case 'archway': {
      const h = (p.len ?? 3.2) / 2;
      return [box(-h - 0.4, 0, 0.45, 0.42), box(h + 0.4, 0, 0.45, 0.42)];
    }
    case 'hay': return [box(0, 0, 0.95, 0.34)];
    case 'stall': return [box(0, 0.35, 1.1, 0.45)];
    case 'bench': return [box(0, 0, 0.75, 0.18)];
    case 'trough': return [box(0, 0, 0.85, 0.3)];
    case 'barrel': return [circle(p.x, p.z, 0.33 * s)];
    case 'signpost': return [circle(p.x, p.z, 0.15 * s)];
    case 'stump': return [circle(p.x, p.z, 0.3 * s)];
  }
}

/** Things the eye cannot see through (a boulder does too; see `blocksSight`). */
export const SIGHT_BLOCKING: readonly string[] = ['palisade', 'stonewall', 'tower'];

import { Rng } from '../rng';
import { type MeshData, type Vec3, addBeam, emptyMesh } from './mesh';

/**
 * A broadleaf tree: a leaning trunk, a few limbs, and leaf clumps at their
 * ends. Pure data; the renderer turns clumps into lumpy leaf balls.
 */

export interface Clump {
  at: Vec3;
  /** Radii of the ellipsoid. */
  r: Vec3;
}

export interface TreeModel {
  wood: MeshData;
  clumps: Clump[];
  /** Height of the crown's top, for culling and shadows. */
  height: number;
  /** Trunk radius at the foot, for collision. */
  footR: number;
}

/** The kinds of tree a map can place. `oak` (a broadleaf) is the default. */
export type TreeKind = 'oak' | 'pine' | 'dead' | 'young';

export const TREE_KINDS: readonly TreeKind[] = ['oak', 'pine', 'dead', 'young'];

export function buildTree(seed: number, height = 7, kind: TreeKind = 'oak'): TreeModel {
  if (kind === 'pine') return buildPine(seed, height * 1.15);
  if (kind === 'dead') return buildDead(seed, height * 0.85);
  return buildBroadleaf(seed, kind === 'young' ? height * 0.5 : height, kind === 'young');
}

/** A pine: a straight trunk under stacked, narrowing tiers of needles. */
function buildPine(seed: number, height: number): TreeModel {
  const rng = Rng.fromSeed(seed);
  const wood = emptyMesh();
  const footR = 0.24 + rng.next() * 0.06;
  const lean = (rng.next() - 0.5) * 0.25;
  addBeam(wood, [0, -0.2, 0], [lean, height * 0.5, lean], footR * 2, [0, 0, 1], { aoBottom: 0.55 });
  addBeam(wood, [lean, height * 0.5, lean], [lean * 1.4, height * 0.92, lean * 1.4], footR * 1.1, [0, 0, 1]);
  const clumps: Clump[] = [];
  const tiers = 5 + rng.int(2);
  for (let i = 0; i < tiers; i++) {
    const k = i / (tiers - 1);
    const y = height * (0.3 + k * 0.62);
    const r = (1.45 - k * 1.1) * (0.9 + rng.next() * 0.2);
    clumps.push({ at: [lean * (0.4 + k), y, lean * (0.4 + k)], r: [r, 0.55, r] });
  }
  return { wood, clumps, height: Math.max(...clumps.map((c) => c.at[1] + c.r[1])), footR };
}

/** A dead tree: a bare trunk and snapped limbs, no leaves at all. */
function buildDead(seed: number, height: number): TreeModel {
  const rng = Rng.fromSeed(seed);
  const wood = emptyMesh();
  const footR = 0.26 + rng.next() * 0.06;
  const lean: Vec3 = [(rng.next() - 0.5) * 0.8, 0, (rng.next() - 0.5) * 0.8];
  const top: Vec3 = [lean[0], height * 0.62, lean[2]];
  addBeam(wood, [0, -0.2, 0], [lean[0] * 0.4, height * 0.3, lean[2] * 0.4], footR * 2, [0, 0, 1], { aoBottom: 0.55 });
  addBeam(wood, [lean[0] * 0.4, height * 0.3, lean[2] * 0.4], top, footR * 1.4, [0, 0, 1]);
  const limbs = 4 + rng.int(3);
  let peak = top[1];
  for (let i = 0; i < limbs; i++) {
    const a = (i / limbs) * Math.PI * 2 + rng.next() * 0.9;
    const from: Vec3 = [lean[0] * (0.5 + rng.next() * 0.5), height * (0.38 + rng.next() * 0.26), lean[2] * (0.5 + rng.next() * 0.5)];
    const reach = 0.9 + rng.next() * 1.3;
    const end: Vec3 = [from[0] + Math.cos(a) * reach, from[1] + 0.5 + rng.next() * 1.1, from[2] + Math.sin(a) * reach];
    addBeam(wood, from, end, footR * (0.45 + rng.next() * 0.2), [0, 1, 0]);
    peak = Math.max(peak, end[1]);
  }
  return { wood, clumps: [], height: peak, footR };
}

function buildBroadleaf(seed: number, height: number, young: boolean): TreeModel {
  const rng = Rng.fromSeed(seed);
  const wood = emptyMesh();
  const clumps: Clump[] = [];
  const lean: Vec3 = [(rng.next() - 0.5) * 0.6, 0, (rng.next() - 0.5) * 0.6];
  const trunkTop: Vec3 = [lean[0], height * 0.48, lean[2]];
  // A sapling is slimmer and its crown is narrower, not just shorter.
  const s = young ? 0.6 : 1;
  const footR = (0.28 + rng.next() * 0.08) * (young ? 0.6 : 1);
  // Trunk in two sections, narrowing.
  const knee: Vec3 = [lean[0] * 0.4, height * 0.24, lean[2] * 0.4];
  addBeam(wood, [0, -0.2, 0], knee, footR * 2, [0, 0, 1], { aoBottom: 0.55 });
  addBeam(wood, knee, trunkTop, footR * 1.6, [0, 0, 1]);
  // Limbs fanning out, each ending in a clump; a crown clump on top.
  const limbs = 4 + rng.int(3);
  for (let i = 0; i < limbs; i++) {
    const a = (i / limbs) * Math.PI * 2 + rng.next() * 0.8;
    const reach = (1.4 + rng.next() * 1.4) * s;
    const up = height * (0.6 + rng.next() * 0.22);
    const end: Vec3 = [trunkTop[0] + Math.cos(a) * reach, up, trunkTop[2] + Math.sin(a) * reach];
    addBeam(wood, trunkTop, end, footR * 0.7, [0, 1, 0]);
    const r = (1.2 + rng.next() * 0.7) * s;
    clumps.push({ at: end, r: [r, r * (0.7 + rng.next() * 0.2), r] });
  }
  const cr = (1.7 + rng.next() * 0.5) * s;
  clumps.push({ at: [trunkTop[0], height * 0.82, trunkTop[2]], r: [cr, cr * 0.8, cr] });
  // A few small clumps filling the gaps.
  for (let i = 0; i < 4; i++) {
    const a = rng.next() * Math.PI * 2;
    const r = (0.8 + rng.next() * 0.5) * s;
    clumps.push({ at: [trunkTop[0] + Math.cos(a) * 1.3 * s, height * (0.55 + rng.next() * 0.3), trunkTop[2] + Math.sin(a) * 1.3 * s], r: [r, r * 0.8, r] });
  }
  const top = Math.max(...clumps.map((c) => c.at[1] + c.r[1]));
  return { wood, clumps, height: top, footR };
}

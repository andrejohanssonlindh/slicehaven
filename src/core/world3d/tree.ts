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
  /** 0..1, how much sky it sees: tops and outer clusters are light, the inside and underside dark (default 0.5). */
  tone?: number;
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
  // Tiers of drooping skirts, each a ring of flat clusters whose outer edge hangs lowest; the tiers narrow upward.
  const tiers = 6 + rng.int(2);
  for (let i = 0; i < tiers; i++) {
    const k = i / (tiers - 1);
    const y = height * (0.26 + k * 0.66);
    const reach = (1.15 - k * 0.85) * (0.9 + rng.next() * 0.2);
    const n = k > 0.85 ? 1 : 5;
    for (let j = 0; j < n; j++) {
      const a = (j / n) * Math.PI * 2 + i * 0.9 + rng.next() * 0.5;
      const d = n === 1 ? 0 : reach * 0.6;
      const r = n === 1 ? 0.35 : reach * 0.62;
      clumps.push({
        at: [lean * (0.4 + k) + Math.cos(a) * d, y, lean * (0.4 + k) + Math.sin(a) * d],
        r: [r, n === 1 ? 0.5 : 0.4, r],
        tone: Math.min(1, 0.25 + k * 0.6 + rng.next() * 0.2),
      });
    }
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
  // Limbs fanning out under the crown, so the trunk is seen to hold it up.
  const limbs = 4 + rng.int(3);
  for (let i = 0; i < limbs; i++) {
    const a = (i / limbs) * Math.PI * 2 + rng.next() * 0.8;
    const reach = (1.3 + rng.next() * 1.2) * s;
    const end: Vec3 = [trunkTop[0] + Math.cos(a) * reach, height * (0.58 + rng.next() * 0.14), trunkTop[2] + Math.sin(a) * reach];
    addBeam(wood, trunkTop, end, footR * 0.7, [0, 1, 0]);
  }
  // The crown is many small clusters in three tiers (a wide skirt, a fuller middle, a cap), the way the 2D trees read:
  // each cluster lit on top and dark beneath, with gaps between them showing the next one behind.
  const cx = trunkTop[0], cz = trunkTop[2];
  const tiers: { y: number; ring: number; n: number; r: number }[] = [
    { y: 0.6, ring: 1.9, n: 6, r: 1.05 },
    { y: 0.72, ring: 1.55, n: 6, r: 1.15 },
    { y: 0.85, ring: 0.8, n: 4, r: 1.0 },
  ];
  const yMin = height * 0.5, yMax = height * 0.97;
  tiers.forEach((t, ti) => {
    for (let i = 0; i < t.n; i++) {
      const a = (i / t.n) * Math.PI * 2 + ti * 0.5 + (rng.next() - 0.5) * 0.7;
      const d = t.ring * s * (0.85 + rng.next() * 0.3);
      const r = t.r * s * (0.85 + rng.next() * 0.35);
      const at: Vec3 = [cx + Math.cos(a) * d, height * t.y + (rng.next() - 0.5) * 0.5 * s, cz + Math.sin(a) * d];
      // Light where it is high and on the outside; the skirt's edge catches sky too, its middle does not.
      const tone = Math.min(1, Math.max(0, ((at[1] - yMin) / (yMax - yMin)) * 0.7 + (d / (2.2 * s)) * 0.25 + rng.next() * 0.1));
      clumps.push({ at, r: [r, r * (0.72 + rng.next() * 0.15), r], tone });
    }
  });
  clumps.push({ at: [cx, height * 0.95 - 0.5 * s, cz], r: [0.95 * s, 0.8 * s, 0.95 * s], tone: 1 });
  // One dark clump in the middle, so the inside is shade, not a see-through gap.
  clumps.push({ at: [cx, height * 0.68, cz], r: [1.2 * s, 1.0 * s, 1.2 * s], tone: 0.1 });
  const top = Math.max(...clumps.map((c) => c.at[1] + c.r[1]));
  return { wood, clumps, height: top, footR };
}

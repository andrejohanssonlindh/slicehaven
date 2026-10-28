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

export function buildTree(seed: number, height = 7): TreeModel {
  const rng = Rng.fromSeed(seed);
  const wood = emptyMesh();
  const clumps: Clump[] = [];
  const lean: Vec3 = [(rng.next() - 0.5) * 0.6, 0, (rng.next() - 0.5) * 0.6];
  const trunkTop: Vec3 = [lean[0], height * 0.48, lean[2]];
  const footR = 0.28 + rng.next() * 0.08;
  // Trunk in two sections, narrowing.
  const knee: Vec3 = [lean[0] * 0.4, height * 0.24, lean[2] * 0.4];
  addBeam(wood, [0, -0.2, 0], knee, footR * 2, [0, 0, 1], { aoBottom: 0.55 });
  addBeam(wood, knee, trunkTop, footR * 1.6, [0, 0, 1]);
  // Limbs fanning out, each ending in a clump; a crown clump on top.
  const limbs = 4 + rng.int(3);
  for (let i = 0; i < limbs; i++) {
    const a = (i / limbs) * Math.PI * 2 + rng.next() * 0.8;
    const reach = 1.4 + rng.next() * 1.4;
    const up = height * (0.6 + rng.next() * 0.22);
    const end: Vec3 = [trunkTop[0] + Math.cos(a) * reach, up, trunkTop[2] + Math.sin(a) * reach];
    addBeam(wood, trunkTop, end, footR * 0.7, [0, 1, 0]);
    const r = 1.2 + rng.next() * 0.7;
    clumps.push({ at: end, r: [r, r * (0.7 + rng.next() * 0.2), r] });
  }
  const cr = 1.7 + rng.next() * 0.5;
  clumps.push({ at: [trunkTop[0], height * 0.82, trunkTop[2]], r: [cr, cr * 0.8, cr] });
  // A few small clumps filling the gaps.
  for (let i = 0; i < 4; i++) {
    const a = rng.next() * Math.PI * 2;
    const r = 0.8 + rng.next() * 0.5;
    clumps.push({ at: [trunkTop[0] + Math.cos(a) * 1.3, height * (0.55 + rng.next() * 0.3), trunkTop[2] + Math.sin(a) * 1.3], r: [r, r * 0.8, r] });
  }
  const top = Math.max(...clumps.map((c) => c.at[1] + c.r[1]));
  return { wood, clumps, height: top, footR };
}

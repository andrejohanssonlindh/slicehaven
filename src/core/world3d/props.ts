import { Rng } from '../rng';
import type { Clump } from './tree';
import { type MeshData, type Vec3, addBeam, emptyMesh } from './mesh';
import { type Shape, circle } from './space';
import type { FSource } from './filaments3d';

/**
 * Small things placed in the world: shrubs, boulders, woodpiles. Each has a
 * model, a collision shape for feet, and (shrub, boulder) a filament source.
 * The renderer turns clumps into lumpy balls, as it does for trees.
 */

export type PropKind = 'shrub' | 'boulder' | 'woodpile';

export interface PlacedProp {
  kind: PropKind;
  x: number;
  z: number;
  /** Turn about y, like `rotation.y`. Only the woodpile cares. */
  rot?: number;
  /** Scale, 1 = the base size. */
  size?: number;
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
  const n = 3 + rng.int(3);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng.next();
    const d = i === 0 ? 0 : 0.35 + rng.next() * 0.3;
    const r = 0.4 + rng.next() * 0.25;
    clumps.push({ at: [Math.cos(a) * d, r * 0.75, Math.sin(a) * d], r: [r, r * 0.8, r] });
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

/** What blocks feet. */
export function propShape(p: PlacedProp): Shape {
  const s = sizeOf(p);
  if (p.kind === 'woodpile') return { kind: 'box', x: p.x, z: p.z, hw: 0.9 * s, hd: 0.55 * s, rot: p.rot ?? 0 };
  return circle(p.x, p.z, (p.kind === 'boulder' ? 0.75 : 0.5) * s);
}

/** The filament source a prop is, if any: bushes are thicket, boulders are rock. */
export function propSource(p: PlacedProp): FSource | null {
  if (p.kind === 'shrub') return { x: p.x, z: p.z, kind: 'thicket' };
  if (p.kind === 'boulder') return { x: p.x, z: p.z, kind: 'rock' };
  return null;
}

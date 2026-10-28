import type { House3DSpec } from '../core/world3d/house';
import { type Shape, boxOfFootprint, circle } from '../core/world3d/space';
import type { Ground3D, XZ } from '../core/world3d/terrain';

/**
 * The M0 spike: one house by a road, stamped mud at its door, a lake, a tree,
 * two torches and a villager walking the road. Metres, origin in the middle.
 */

export const SPIKE_HOUSE: { x: number; z: number; rot: number; spec: House3DSpec } = {
  x: 0, z: -2.5, rot: 0.08,
  spec: { seed: 7, width: 6.2, depth: 4.6, wallH: 2.5, roof: 'thatch' },
};

export const SPIKE_GROUND: Ground3D = {
  seed: 11,
  size: 64,
  roads: [{ pts: [[-32, 8], [-24, 7], [-12, 5.2], [-3, 4.6], [6, 5.4], [14, 4.2], [24, 6], [32, 9]], width: 2.8 }],
  mud: [
    { x: -0.6, z: 1.6, r: 3.2 },
    { x: 3.5, z: 4.4, r: 2.4 },
  ],
  lake: { x: -13, z: -9, r: 7 },
  pads: [{ x: SPIKE_HOUSE.x, z: SPIKE_HOUSE.z, hw: 3.4, hd: 2.8, rot: SPIKE_HOUSE.rot }],
  shade: [{ x: 9.5, z: -7, r: 5 }],
};

export const SPIKE_TREE = { x: 9.5, z: -7, seed: 3 };

/** Torches on posts by the road (x, z). A third hangs beside the house door. */
export const SPIKE_TORCHES: [number, number][] = [[6.5, 6.9]];

/** The villager's beat along the road, there and back. */
export const SPIKE_WALK: XZ[] = [[-12, 5.6], [-3, 5.0], [6, 5.8], [12, 4.8]];

/** What blocks feet: the house (its footprint, a little proud of the wall), the tree trunk, the torch post. */
export function spikeObstacles(footprint: { x0: number; x1: number; z0: number; z1: number }): Shape[] {
  const h = SPIKE_HOUSE;
  const pad = 0.15;
  return [
    boxOfFootprint({ x0: footprint.x0 - pad, x1: footprint.x1 + pad, z0: footprint.z0 - pad, z1: footprint.z1 + pad }, h.x, h.z, h.rot),
    circle(SPIKE_TREE.x, SPIKE_TREE.z, 0.5),
    ...SPIKE_TORCHES.map(([x, z]) => circle(x, z, 0.12)),
  ];
}

/** Where the hero starts: by the door, on the mud. */
export const SPIKE_HERO: [number, number] = [2.4, 1.2];

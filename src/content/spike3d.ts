import type { House3DSpec } from '../core/world3d/house';
import { type FSource, type FilamentWorld, type Ground } from '../core/world3d/filaments3d';
import { type Shape, boxOfFootprint, circle, shapeDist } from '../core/world3d/space';
import { lakeDist, splatAt } from '../core/world3d/terrain';
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

/**
 * What blocks feet: the house's four walls (thin, so the inside can be walked, with a
 * gap at the door), the tree trunk, the torch post. `doorX` is the door's x in the house's frame.
 */
export function spikeObstacles(footprint: { x0: number; x1: number; z0: number; z1: number }, doorX: number): Shape[] {
  const h = SPIKE_HOUSE;
  // The footprint is the walls plus a little proud (0.1 at the sides, a 0.6 porch at the front).
  const hw = (footprint.x1 - footprint.x0) / 2 - 0.1, hd = -footprint.z0 - 0.1, t = 0.12;
  const wall = (x0: number, x1: number, z0: number, z1: number): Shape => boxOfFootprint({ x0, x1, z0, z1 }, h.x, h.z, h.rot);
  const gap = 0.65; // half-width of the doorway, wider than the door so the walker fits
  return [
    wall(-hw - t, hw + t, -hd - t, -hd + t),
    wall(-hw - t, -hw + t, -hd, hd),
    wall(hw - t, hw + t, -hd, hd),
    wall(-hw - t, doorX - gap, hd - t, hd + t),
    wall(doorX + gap, hw + t, hd - t, hd + t),
    circle(SPIKE_TREE.x, SPIKE_TREE.z, 0.5),
    ...SPIKE_TORCHES.map(([x, z]) => circle(x, z, 0.12)),
  ];
}

/** The house's whole footprint as one box (is something inside it?). */
export const spikeHouseBox = (footprint: { x0: number; x1: number; z0: number; z1: number }): Shape =>
  boxOfFootprint({ x0: footprint.x0 + 0.1, x1: footprint.x1 - 0.1, z0: footprint.z0 + 0.1, z1: footprint.z1 - 0.6 }, SPIKE_HOUSE.x, SPIKE_HOUSE.z, SPIKE_HOUSE.rot);

/** Where the hero starts: by the door, on the mud. */
export const SPIKE_HERO: [number, number] = [2.4, 1.2];

/**
 * The spike as the filament field sees it: the lake is still water, the road
 * is path, the mud is mud, long grass and leaf litter are what they look like,
 * and inside the house's walls is indoors. The tree and the torches are sources.
 */
export function spikeFilamentWorld(g: Ground3D, footprint: { x0: number; x1: number; z0: number; z1: number }, extra: FSource[] = []): FilamentWorld {
  const house = boxOfFootprint(footprint, SPIKE_HOUSE.x, SPIKE_HOUSE.z, SPIKE_HOUSE.rot);
  return {
    size: g.size,
    ground(x, z): Ground {
      if (lakeDist(g, x, z) < 0) return 'pond';
      const s = splatAt(g, x, z);
      if (s.mud > 0.5) return 'mud';
      if (s.road > 0.5) return 'path';
      if (s.shade > 0.5) return 'forest';
      if (s.wild > 0.5) return 'tallgrass';
      return 'grass';
    },
    indoors: (x, z) => shapeDist(house, x, z) < 0,
    sources: [
      { x: SPIKE_TREE.x, z: SPIKE_TREE.z, kind: 'tree' },
      ...SPIKE_TORCHES.map(([x, z]): FSource => ({ x, z, kind: 'fire', weight: 1 })),
      ...extra,
    ],
  };
}

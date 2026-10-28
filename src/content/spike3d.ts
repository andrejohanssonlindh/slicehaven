import { type FSource, type FilamentWorld, type Ground } from '../core/world3d/filaments3d';
import { type BuiltHouse, type Layout, houseOuterBox, layoutPads, layoutShade } from '../core/world3d/layout';
import { shapeDist } from '../core/world3d/space';
import { lakeDist, splatAt } from '../core/world3d/terrain';
import type { Ground3D, XZ } from '../core/world3d/terrain';

/**
 * The spike: a few houses by a road, stamped mud at the first door, a lake,
 * trees, torches and a villager walking the road. Metres, origin in the middle.
 * Everything placed lives in `SPIKE_LAYOUT`; the first house is the one with the
 * mud and the hero's start.
 */

export const SPIKE_LAYOUT: Layout = {
  houses: [
    { id: 'home', x: 0, z: -2.5, rot: 0.08, spec: { seed: 7, width: 6.2, depth: 4.6, wallH: 2.5, roof: 'thatch' } },
    { id: 'west', x: -22, z: -0.5, rot: -0.05, spec: { seed: 12, width: 5.4, depth: 4.2, wallH: 2.4, roof: 'thatch' } },
    { id: 'east', x: 15, z: -3.5, rot: 0.14, spec: { seed: 21, width: 5, depth: 4, wallH: 2.4, roof: 'thatch' } },
    { id: 'far', x: 25, z: -1, rot: -0.1, spec: { seed: 33, width: 7.4, depth: 5, wallH: 2.6, roof: 'thatch' } },
  ],
  trees: [
    { x: 9.5, z: -7.5, seed: 3 },
    { x: -2, z: -12.5, seed: 8 },
    { x: 3.5, z: -12.5, seed: 15 },
    { x: -26.5, z: -9, seed: 4 },
    { x: 20, z: -10, seed: 19 },
    { x: 29, z: -9.5, seed: 6 },
  ],
  // The first is the one the old spike had; the second lights the west bend.
  torches: [[6.5, 6.9], [-12, 7.1]],
};

export const SPIKE_HOUSE = SPIKE_LAYOUT.houses[0];
export const SPIKE_TREE = SPIKE_LAYOUT.trees[0];
export const SPIKE_TORCHES = SPIKE_LAYOUT.torches;

export const SPIKE_GROUND: Ground3D = {
  seed: 11,
  size: 64,
  roads: [{ pts: [[-32, 8], [-24, 7], [-12, 5.2], [-3, 4.6], [6, 5.4], [14, 4.2], [24, 6], [32, 9]], width: 2.8 }],
  mud: [
    { x: -0.6, z: 1.6, r: 3.2 },
    { x: 3.5, z: 4.4, r: 2.4 },
    { x: 15, z: 0.4, r: 2 },
  ],
  lake: { x: -13, z: -9, r: 7 },
  pads: layoutPads(SPIKE_LAYOUT),
  shade: layoutShade(SPIKE_LAYOUT),
};

/** The villager's beat along the road, there and back. */
export const SPIKE_WALK: XZ[] = [[-12, 5.6], [-3, 5.0], [6, 5.8], [12, 4.8]];

/** Where the hero starts: by the first door, on the mud. */
export const SPIKE_HERO: [number, number] = [2.4, 1.2];

/**
 * The spike as the filament field sees it: the lake is still water, the road
 * is path, the mud is mud, long grass and leaf litter are what they look like,
 * and inside a house's walls is indoors. Trees and torches are sources.
 */
export function spikeFilamentWorld(g: Ground3D, houses: BuiltHouse[], extra: FSource[] = []): FilamentWorld {
  const boxes = houses.map(houseOuterBox);
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
    indoors: (x, z) => boxes.some((b) => shapeDist(b, x, z) < 0),
    sources: [
      ...SPIKE_LAYOUT.trees.map((t): FSource => ({ x: t.x, z: t.z, kind: 'tree' })),
      ...SPIKE_LAYOUT.torches.map(([x, z]): FSource => ({ x, z, kind: 'fire', weight: 1 })),
      ...extra,
    ],
  };
}

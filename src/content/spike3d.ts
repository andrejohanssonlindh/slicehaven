import { type FSource, type FilamentWorld, type Ground } from '../core/world3d/filaments3d';
import { type BuiltHouse, type Layout, houseOuterBox } from '../core/world3d/layout';
import { propSource } from '../core/world3d/props';
import { shapeDist } from '../core/world3d/space';
import { lakeDist, splatAt } from '../core/world3d/terrain';
import type { Ground3D } from '../core/world3d/terrain';
import { mapNamed } from './maps';

/**
 * The spike map and its shorthands. The map itself is data in `maps/spike.ts`; this
 * is the compiled form the tests and the page use, and the filament world for any
 * map (the lake is still water, the road is path, the mud is mud, long grass and
 * leaf litter are what they look like, and inside a house's walls is indoors;
 * trees, shrubs, boulders and torches are sources).
 */

const SPIKE = mapNamed('spike');
export const SPIKE_LAYOUT: Layout = SPIKE.layout;
export const SPIKE_GROUND: Ground3D = SPIKE.ground;
export const SPIKE_HOUSE = SPIKE_LAYOUT.houses[0];
export const SPIKE_TREE = SPIKE_LAYOUT.trees[0];
export const SPIKE_TORCHES = SPIKE_LAYOUT.torches;
export const SPIKE_WALK = SPIKE.walk;
/** Where the hero starts: by the first door, on the mud. */
export const SPIKE_HERO = SPIKE.hero;

export function filamentWorld(g: Ground3D, layout: Layout, houses: BuiltHouse[], extra: FSource[] = []): FilamentWorld {
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
      ...layout.trees.map((t): FSource => ({ x: t.x, z: t.z, kind: 'tree' })),
      ...layout.torches.map(([x, z]): FSource => ({ x, z, kind: 'fire', weight: 1 })),
      ...layout.props.flatMap((p) => propSource(p) ?? []),
      ...extra,
    ],
  };
}

export const spikeFilamentWorld = (g: Ground3D, houses: BuiltHouse[], extra: FSource[] = []): FilamentWorld => filamentWorld(g, SPIKE_LAYOUT, houses, extra);

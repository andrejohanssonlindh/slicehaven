import { type FSource, type FilamentWorld, type Ground } from '../core/world3d/filaments3d';
import { type BuiltHouse, type Layout, houseOuterBox } from '../core/world3d/layout';
import type { PlacedIndex } from '../core/world3d/placed';
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

/** How near a house a place is still among homes, metres. */
const SETTLED = 8;

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
    settled: (x, z) => boxes.some((b) => shapeDist(b, x, z) < SETTLED),
    windBreak: (x, z, dx, dz, reach) => {
      const l = Math.hypot(dx, dz) || 1;
      for (let d = 0.75; d <= reach; d += 0.75) {
        const px = x + (dx / l) * d, pz = z + (dz / l) * d;
        if (boxes.some((b) => shapeDist(b, px, pz) < 0)) return 'house';
      }
      return null;
    },
    sources: [
      ...layout.trees.map((t): FSource => ({ x: t.x, z: t.z, kind: 'tree' })),
      ...layout.torches.map(([x, z]): FSource => ({ x, z, kind: 'fire', weight: 1 })),
      ...layout.props.flatMap((p) => propSource(p) ?? []),
      ...extra,
    ],
  };
}

/**
 * The filament world of a streaming map: ground and indoors as for any map, and the fixed sources asked for by
 * rectangle from the placed index (trees, rocks, bushes, torches, wells by chunk) plus the extras (house fires and
 * hand-lit campfires), which `extras` gives afresh each time the field is told its sources changed.
 */
export function streamingFilamentWorld(g: Ground3D, placed: PlacedIndex, houses: BuiltHouse[], extras: () => FSource[]): FilamentWorld {
  const base = filamentWorld(g, { houses: [], trees: [], torches: [], props: [] }, houses, []);
  let own = extras();
  return {
    ...base,
    sources: [],
    sourcesIn: (x0, z0, x1, z1) => {
      const found = placed.sourcesIn(x0, z0, x1, z1);
      return [...found, ...own.filter((s) => s.x >= x0 && s.x < x1 && s.z >= z0 && s.z < z1)];
    },
    // (`setSources` on the field is the signal that the extras changed: read them again.)
    refresh: () => { own = extras(); },
  };
}

export const spikeFilamentWorld = (g: Ground3D, houses: BuiltHouse[], extra: FSource[] = []): FilamentWorld => filamentWorld(g, SPIKE_LAYOUT, houses, extra);

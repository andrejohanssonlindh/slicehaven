import { type FSource, type FilamentWorld, type Ground } from '../core/world3d/filaments3d';
import { type BuiltHouse, type Layout, houseOuterBox, layoutPads, layoutShade } from '../core/world3d/layout';
import { propSource } from '../core/world3d/props';
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
    { id: 'west', x: -22, z: -0.5, rot: -0.05, room: 'herbalist', spec: { seed: 12, width: 5.4, depth: 4.2, wallH: 2.4, roof: 'shingle' } },
    { id: 'east', x: 15, z: -3.5, rot: 0.14, room: 'weaver', spec: { seed: 21, width: 5, depth: 4, wallH: 2.4, roof: 'sod' } },
    { id: 'far', x: 25, z: -1, rot: -0.1, room: 'inn', spec: { seed: 33, width: 7.4, depth: 5, wallH: 2.6, roof: 'tile' } },
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
  props: [
    // By the road and the doors.
    { kind: 'shrub', x: -4.8, z: 1.5, seed: 2 },
    { kind: 'shrub', x: 4.8, z: -0.2, seed: 5, size: 0.8 },
    { kind: 'shrub', x: 12.4, z: 1.1, seed: 9 },
    { kind: 'shrub', x: -19.2, z: 3.1, seed: 13, size: 1.2 },
    { kind: 'shrub', x: 21.6, z: 2.6, seed: 17 },
    { kind: 'shrub', x: 28.4, z: 3.2, seed: 23, size: 0.9 },
    // Around the lake and in the wild.
    { kind: 'boulder', x: -7.4, z: -2.4, seed: 4 },
    { kind: 'boulder', x: -20.8, z: -14.4, seed: 6, size: 1.3 },
    { kind: 'boulder', x: 11.5, z: -11.5, seed: 10, size: 0.8 },
    { kind: 'shrub', x: -9.5, z: -17, seed: 21 },
    { kind: 'shrub', x: 6.5, z: -9.8, seed: 22, size: 1.1 },
    // Wood stacked against the sides of houses.
    { kind: 'woodpile', x: 4.1, z: -3.6, rot: 0.08 + Math.PI / 2, seed: 3 },
    { kind: 'woodpile', x: 20.1, z: -2.4, rot: -0.1 + Math.PI / 2, seed: 8 },
  ],
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
      ...SPIKE_LAYOUT.props.flatMap((p) => propSource(p) ?? []),
      ...extra,
    ],
  };
}

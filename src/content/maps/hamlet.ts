import type { MapSpec } from '../../core/world3d/mapgen';

/**
 * A hamlet written as intent, not coordinates: a main road with houses along both
 * sides facing it, a lake to the south-west, woods round the edge, torches every
 * 14 m. Nothing here has a coordinate except the road, the lake and the world's size.
 * Add a house by adding a line; the compiler finds its place and the validator
 * (`tests/maps.test.ts`) says if it does not fit.
 */
export const HAMLET_MAP: MapSpec = {
  name: 'hamlet',
  seed: 5,
  size: 140,
  roads: [
    // The main road, east to west, with a slow bend.
    { pts: [[-66, 6], [-44, 2], [-22, -2], [0, -1], [22, 3], [44, 4], [66, 0]], width: 3.2 },
  ],
  lake: { x: -38, z: 36, r: 15 },
  doorMud: true,
  houses: [
    { id: 'inn', room: 'inn', plan: 'inn', roof: 'tile', at: { road: 0, t: 0.5, side: 'north' } },
    { id: 'bakery', room: 'bakery', size: 'medium', roof: 'shingle', at: { road: 0, t: 0.38, side: 'north' } },
    { id: 'smithy', room: 'smithy', size: 'medium', roof: 'shingle', walls: 'stone', at: { road: 0, t: 0.63, side: 'north' } },
    { id: 'store', room: 'general', plan: 'shop', roof: 'shingle', at: { road: 0, t: 0.27, side: 'north' } },
    { id: 'weaver', room: 'weaver', size: 'small', roof: 'sod', at: { road: 0, t: 0.78, side: 'north' } },
    { id: 'herbs', room: 'herbalist', size: 'small', roof: 'thatch', at: { road: 0, t: 0.2, side: 'south' } },
    { id: 'fish', room: 'fishmonger', size: 'medium', roof: 'thatch', walls: 'plank', at: { road: 0, t: 0.32, side: 'south' } },
    { id: 'home1', room: 'fisher', size: 'small', roof: 'thatch', at: { road: 0, t: 0.45, side: 'south' } },
    { id: 'home2', size: 'small', roof: 'sod', walls: 'stone', at: { road: 0, t: 0.56, side: 'south' } },
    { id: 'home3', size: 'medium', roof: 'thatch', walls: 'plank', at: { road: 0, t: 0.68, side: 'south' } },
    { id: 'home4', room: 'fisher', size: 'small', roof: 'shingle', at: { road: 0, t: 0.8, side: 'south' } },
    { id: 'stable', plan: 'stable', walls: 'plank', roof: 'thatch', at: { road: 0, t: 0.92, side: 'south' } },
  ],
  scatter: [
    { kind: 'tree', count: 70, area: { ring: [0, 0, 40, 64] }, mix: ['oak', 'oak', 'pine', 'pine', 'pine', 'dead', 'young'] },
    { kind: 'tree', count: 18, area: { rect: [-50, -30, 50, -8] }, mix: ['oak', 'oak', 'young', 'pine'] },
    { kind: 'shrub', count: 40, area: { rect: [-55, -25, 55, 25] }, gap: 1.2 },
    { kind: 'boulder', count: 12, area: { all: true } },
  ],
  torchLines: [{ road: 0, every: 14, side: 'south', offset: 1.1 }],
  hero: { house: 'inn' },
};

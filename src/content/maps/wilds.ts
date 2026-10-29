import type { MapHouse, MapSpec } from '../../core/world3d/mapgen';

/**
 * A map eight kilometres across (the spike is 64 m): a long road, a lake, a hamlet on the road, and woods, bushes and
 * rocks that are made chunk by chunk as you go (`wild`), so the size costs nothing until you walk it. Try
 * `/spike3d/?map=wilds`, set Walk ×3, and tap far down the road.
 */
const HAMLET_ROOMS: Omit<MapHouse, 'at'>[] = [
  { id: 'inn', room: 'inn', size: 'large', roof: 'tile' },
  { id: 'bakery', room: 'bakery', size: 'medium', roof: 'shingle' },
  { id: 'smithy', room: 'smithy', size: 'medium', roof: 'shingle', walls: 'stone' },
  { id: 'store', room: 'general', size: 'medium', roof: 'thatch' },
  { id: 'weaver', room: 'weaver', size: 'small', roof: 'sod' },
  { id: 'herbs', room: 'herbalist', size: 'small', roof: 'thatch' },
  { id: 'fish', room: 'fishmonger', size: 'medium', roof: 'thatch', walls: 'plank' },
  { id: 'home1', room: 'fisher', size: 'small', roof: 'thatch' },
  { id: 'home2', size: 'small', roof: 'sod', walls: 'stone' },
  { id: 'home3', size: 'medium', roof: 'thatch', walls: 'plank' },
];

const ROAD_LEN = 8400; // along the polyline below, near enough
const along = (metres: number): number => metres / ROAD_LEN;

export const WILDS_MAP: MapSpec = {
  name: 'wilds',
  seed: 23,
  size: 8192,
  roads: [
    // West to east right across the map, with long slow bends.
    { pts: [[-4000, 220], [-3000, -60], [-2000, 140], [-1000, 20], [0, -30], [900, 90], [2000, -120], [3000, 60], [4000, 240]], width: 3.4 },
    // A cross road that leaves the first at the hamlet and runs north-east.
    { pts: [[60, -34], [400, -500], [1000, -1400], [1900, -2400], [3300, -3500]], width: 2.8 },
  ],
  lake: { x: -1500, z: 700, r: 130 },
  doorMud: true,
  // Hamlet on the first road's middle, north and south sides in turn.
  houses: HAMLET_ROOMS.map((h, i): MapHouse => ({ ...h, at: { road: 0, t: along(4180 + Math.floor(i / 2) * 22), side: i % 2 ? 'south' : 'north' } })),
  wild: { trees: 22, mix: ['oak', 'oak', 'pine', 'pine', 'pine', 'dead', 'young'], shrubs: 7, boulders: 1.2, grain: 120 },
  // A few torch posts by the inn.
  torchLines: [],
  hero: { house: 'inn' },
};

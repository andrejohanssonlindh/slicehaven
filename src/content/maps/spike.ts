import type { MapSpec } from '../../core/world3d/mapgen';

/**
 * The spike: four houses by a road, a lake, trees, shrubs and boulders, two post
 * torches and a villager on the road. Every spot is written out, as it was before
 * maps existed (the first house is the one with the mud and the hero's start).
 */
export const SPIKE_MAP: MapSpec = {
  name: 'spike',
  seed: 11,
  size: 64,
  roads: [{ pts: [[-32, 8], [-24, 7], [-12, 5.2], [-3, 4.6], [6, 5.4], [14, 4.2], [24, 6], [32, 9]], width: 2.8 }],
  lake: { x: -13, z: -9, r: 7 },
  mud: [
    { x: -0.6, z: 1.6, r: 3.2 },
    { x: 3.5, z: 4.4, r: 2.4 },
    { x: 15, z: 0.4, r: 2 },
  ],
  houses: [
    { id: 'home', at: { x: 0, z: -2.5, rot: 0.08 }, size: { width: 6.2, depth: 4.6 }, seed: 7, wallH: 2.5, roof: 'thatch' },
    { id: 'west', at: { x: -22, z: -0.5, rot: -0.05 }, room: 'herbalist', size: { width: 5.4, depth: 4.2 }, seed: 12, wallH: 2.4, roof: 'shingle' },
    { id: 'east', at: { x: 15, z: -3.5, rot: 0.14 }, room: 'weaver', size: { width: 5, depth: 4 }, seed: 21, wallH: 2.4, roof: 'sod' },
    { id: 'far', at: { x: 25, z: -1, rot: -0.1 }, room: 'inn', size: { width: 7.4, depth: 5 }, seed: 33, wallH: 2.6, roof: 'tile' },
  ],
  trees: [
    { x: 9.5, z: -7.5, seed: 3 },
    { x: -2, z: -12.5, seed: 8 },
    { x: 3.5, z: -12.5, seed: 15 },
    { x: -26.5, z: -9, seed: 4 },
    { x: 20, z: -10, seed: 19 },
    { x: 29, z: -9.5, seed: 6 },
  ],
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
  hero: [2.4, 1.2],
  walk: [[-12, 5.6], [-3, 5.0], [6, 5.8], [12, 4.8]],
};

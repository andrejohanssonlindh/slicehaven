import { describe, expect, it } from 'vitest';
import { SPIKE_GROUND, SPIKE_HERO, SPIKE_HOUSE, SPIKE_TREE, spikeObstacles } from '../src/content/spike3d';
import { buildHouse } from '../src/core/world3d/house';
import { NavGrid, boxOfFootprint, circle, distance, findPath, followPath, near, pathLength, shapeDist } from '../src/core/world3d/space';
import { lakeDist } from '../src/core/world3d/terrain';

describe('measurements', () => {
  it('distance is in metres and near is inclusive', () => {
    expect(distance({ x: 0, z: 0 }, { x: 3, z: 4 })).toBe(5);
    expect(near({ x: 0, z: 0 }, { x: 3, z: 4 }, 5)).toBe(true);
    expect(near({ x: 0, z: 0 }, { x: 3, z: 4 }, 4.99)).toBe(false);
  });

  it('shape distance is negative inside and the edge distance outside', () => {
    expect(shapeDist(circle(0, 0, 1), 3, 0)).toBeCloseTo(2);
    expect(shapeDist(circle(0, 0, 1), 0.5, 0)).toBeLessThan(0);
    const box = { kind: 'box', x: 0, z: 0, hw: 2, hd: 1, rot: 0 } as const;
    expect(shapeDist(box, 5, 0)).toBeCloseTo(3);
    expect(shapeDist(box, 0, 0)).toBeCloseTo(-1);
    expect(shapeDist(box, 3, 2)).toBeCloseTo(Math.SQRT2);
  });

  it('a rotated box turns the way a three.js object turned about y does', () => {
    // Local +x turned by rot lands at (cos, -sin) in world.
    const rot = Math.PI / 2;
    const box = { kind: 'box', x: 0, z: 0, hw: 2, hd: 0.5, rot } as const;
    expect(shapeDist(box, 0, -1.9)).toBeLessThan(0);
    expect(shapeDist(box, 1.9, 0)).toBeGreaterThan(0);
  });

  it("the house's footprint box matches where its walls stand", () => {
    const m = buildHouse(SPIKE_HOUSE.spec);
    const box = boxOfFootprint(m.footprint, SPIKE_HOUSE.x, SPIKE_HOUSE.z, SPIKE_HOUSE.rot);
    // Its centre, and the four corners (house-local to world by the engine's rule) sit on the edge.
    expect(shapeDist(box, box.kind === 'box' ? box.x : 0, box.kind === 'box' ? box.z : 0)).toBeLessThan(0);
    const c = Math.cos(SPIKE_HOUSE.rot), s = Math.sin(SPIKE_HOUSE.rot);
    for (const [lx, lz] of [[m.footprint.x0, m.footprint.z0], [m.footprint.x1, m.footprint.z1]]) {
      const wx = SPIKE_HOUSE.x + lx * c + lz * s, wz = SPIKE_HOUSE.z - lx * s + lz * c;
      expect(Math.abs(shapeDist(box, wx, wz))).toBeLessThan(1e-9);
    }
  });
});

describe('navigation', () => {
  const m = buildHouse(SPIKE_HOUSE.spec);
  const shapes = spikeObstacles(m.footprint);
  const grid = new NavGrid(SPIKE_GROUND.size, shapes, { blocked: (x, z) => lakeDist(SPIKE_GROUND, x, z) < 0.2 });

  it('blocks the house, the tree and the lake, and frees the road and the hero start', () => {
    expect(grid.walkable(SPIKE_HOUSE.x, SPIKE_HOUSE.z)).toBe(false);
    expect(grid.walkable(SPIKE_TREE.x, SPIKE_TREE.z)).toBe(false);
    expect(grid.walkable(-13, -9)).toBe(false);
    expect(grid.walkable(0, 4.7)).toBe(true);
    expect(grid.walkable(SPIKE_HERO[0], SPIKE_HERO[1])).toBe(true);
  });

  it('walks a straight line when nothing is in the way', () => {
    const p = findPath(grid, { x: -10, z: 5 }, { x: 10, z: 5 })!;
    expect(p).not.toBeNull();
    expect(p.length).toBe(2);
    expect(pathLength(p)).toBeCloseTo(20, 5);
  });

  it('goes round the house, never through it, and every leg is clear', () => {
    const a = { x: -6, z: -2.5 }, b = { x: 6, z: -2.5 };
    const p = findPath(grid, a, b)!;
    expect(p).not.toBeNull();
    expect(p.length).toBeGreaterThan(2);
    for (let i = 1; i < p.length; i++) expect(grid.clear(p[i - 1], p[i])).toBe(true);
    expect(pathLength(p)).toBeGreaterThan(distance(a, b));
    expect(pathLength(p)).toBeLessThan(distance(a, b) * 1.8);
  });

  it('a goal inside the house is moved to the ground beside it', () => {
    const p = findPath(grid, { x: SPIKE_HERO[0], z: SPIKE_HERO[1] }, { x: SPIKE_HOUSE.x, z: SPIKE_HOUSE.z })!;
    const end = p[p.length - 1];
    expect(grid.walkable(end.x, end.z)).toBe(true);
    expect(distance(end, { x: SPIKE_HOUSE.x, z: SPIKE_HOUSE.z })).toBeLessThan(5);
  });

  it('a walled-in start has no path out', () => {
    const ring = new NavGrid(20, [circle(0, 0, 4)], { radius: 0.25 });
    // Put the walker on a free island: a tiny pocket cut off by a ring of blockers.
    const walls = [-1.5, 1.5].flatMap((d) => [{ kind: 'box', x: d, z: 0, hw: 0.3, hd: 1.8, rot: 0 } as const, { kind: 'box', x: 0, z: d, hw: 1.8, hd: 0.3, rot: 0 } as const]);
    const pocket = new NavGrid(20, walls, { radius: 0.1 });
    expect(pocket.walkable(0, 0)).toBe(true);
    expect(findPath(pocket, { x: 0, z: 0 }, { x: 8, z: 8 })).toBeNull();
    expect(ring.walkable(0, 0)).toBe(false);
  });

  it('is deterministic and finds the path in a blink', () => {
    const t0 = performance.now();
    const p = findPath(grid, { x: -28, z: 20 }, { x: 28, z: -20 })!;
    expect(performance.now() - t0).toBeLessThan(200);
    expect(JSON.stringify(findPath(grid, { x: -28, z: 20 }, { x: 28, z: -20 }))).toBe(JSON.stringify(p));
  });
});

describe('following a path', () => {
  const path = [{ x: 0, z: 0 }, { x: 4, z: 0 }, { x: 4, z: 3 }];
  it('moves along the legs and says which way it faces', () => {
    expect(followPath(path, 0)).toMatchObject({ x: 0, z: 0, dx: 1, dz: 0, done: false });
    expect(followPath(path, 2)).toMatchObject({ x: 2, z: 0, done: false });
    const turn = followPath(path, 5);
    expect(turn).toMatchObject({ x: 4, z: 1, dx: 0, dz: 1, done: false });
    expect(followPath(path, 7)).toMatchObject({ x: 4, z: 3, done: true });
    expect(followPath(path, 99)).toMatchObject({ x: 4, z: 3, done: true });
  });
});

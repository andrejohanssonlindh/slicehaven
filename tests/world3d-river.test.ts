import { describe, expect, it } from 'vitest';
import { SPIKE_GROUND, SPIKE_HERO, SPIKE_LAYOUT } from '../src/content/spike3d';
import { mapNamed } from '../src/content/maps';
import { THINGS } from '../src/content/things';
import { buildHouses, layoutObstacles } from '../src/core/world3d/layout';
import { NavGrid, findPath } from '../src/core/world3d/space';
import { DECK_Y, HOLLOW_DEPTH, groundHeight, hollowAt, lakeDist, riverDist, riverFlow } from '../src/core/world3d/terrain';

const g = SPIKE_GROUND;
const bridge = SPIKE_LAYOUT.props.find((p) => p.kind === 'bridge')!;

describe('the stream and its bridge', () => {
  it('the map compiles clean and has a stream that reaches the lake', () => {
    expect(mapNamed('spike').problems).toEqual([]);
    const r = g.rivers![0];
    const mouth = r.pts[r.pts.length - 1];
    expect(lakeDist(g, mouth[0], mouth[1])).toBeLessThan(0);
    expect(riverDist(g, r.pts[3][0], r.pts[3][1])).toBeLessThan(-0.5);
  });

  it('flows toward the lake: the way of the stream at its middle points downstream', () => {
    const r = g.rivers![0];
    const a = r.pts[2], b = r.pts[3];
    const f = riverFlow(g, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
    expect(f.k).toBeGreaterThan(0.9);
    expect(f.x * (b[0] - a[0]) + f.z * (b[1] - a[1])).toBeGreaterThan(0);
    expect(riverFlow(g, 0, 20).k).toBe(0); // far from the water: still
  });

  it('the water is deep in the middle and the hero cannot wade it, but can cross the bridge', () => {
    const r = g.rivers![0];
    const mid = r.pts[4];
    expect(groundHeight(g, mid[0], mid[1])).toBeLessThan(0);
    const houses = buildHouses(SPIKE_LAYOUT);
    const grid = new NavGrid(g.size, layoutObstacles(SPIKE_LAYOUT, houses, THINGS), { radius: 0.2, blocked: (x, z) => lakeDist(g, x, z) < 0.2 });
    expect(grid.walkable(mid[0], mid[1])).toBe(false);
    // The deck is dry, level and walkable down its middle; the way across is found.
    expect(lakeDist(g, bridge.x, bridge.z)).toBeGreaterThan(0);
    expect(groundHeight(g, bridge.x, bridge.z)).toBeCloseTo(DECK_Y - 0.02, 2);
    const path = findPath(grid, { x: SPIKE_HERO[0], z: SPIKE_HERO[1] }, { x: bridge.x + 1.2, z: bridge.z - 4.5 });
    expect(path).not.toBeNull();
  });
});

describe('natural hollows', () => {
  it('are scattered, a minority of the ground, never beside water or under a house', () => {
    let n = 0, hollow = 0;
    for (let x = -30; x <= 30; x += 1.5) {
      for (let z = -30; z <= 30; z += 1.5) {
        n++;
        const h = hollowAt(g, x, z);
        if (h > 0.2) hollow++;
        if (lakeDist(g, x, z) < 2) expect(h, `${x},${z}`).toBe(0);
      }
    }
    expect(hollow / n).toBeGreaterThan(0.02);
    expect(hollow / n).toBeLessThan(0.2);
    for (const p of g.pads) expect(hollowAt(g, p.x, p.z)).toBe(0);
  });

  it('sink the ground a little', () => {
    // Find the deepest hollow on a coarse grid and compare with the ground just outside it.
    let best = { x: 0, z: 0, h: 0 };
    for (let x = -30; x <= 30; x += 0.75) for (let z = 10; z <= 30; z += 0.75) {
      const h = hollowAt(g, x, z);
      if (h > best.h) best = { x, z, h };
    }
    expect(best.h).toBeGreaterThan(0.3);
    expect(HOLLOW_DEPTH * best.h).toBeGreaterThan(0.03);
  });
});

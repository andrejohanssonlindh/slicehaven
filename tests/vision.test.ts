import { describe, expect, it } from 'vitest';
import { RAYS, angleGap, castSight, lineOfSight, rayThrough, seenAt, sightAlong, turnToward, visionOf } from '../src/core/world3d/vision';
import type { Shape } from '../src/core/world3d/space';
import { Explored } from '../src/core/world3d/explored';

const eye = { x: 0, z: 0 };

describe('vision', () => {
  it('Alertness widens the cone and lengthens the reach; night shortens it; the renderer cap holds', () => {
    const avg = visionOf({ alertness: 10 }), keen = visionOf({ alertness: 16 }), dull = visionOf({ alertness: 4 });
    expect(keen.range).toBeGreaterThan(avg.range);
    expect(dull.range).toBeLessThan(avg.range);
    expect(keen.fov).toBeGreaterThan(dull.fov);
    expect(visionOf({ alertness: 10, night: 1 }).range).toBeLessThan(avg.range);
    expect(visionOf({ alertness: 16, cap: 20 }).range).toBe(20);
    expect(avg.near).toBeGreaterThan(2);
  });

  it('a ray meets a circle and a turned box, and misses what is behind it or beside it', () => {
    const tree: Shape = { kind: 'circle', x: 5, z: 0, r: 1 };
    expect(rayThrough(tree, 0, 0, 1, 0)).toEqual([4, 6]);
    expect(rayThrough(tree, 0, 0, -1, 0)).toBeNull();
    expect(rayThrough(tree, 0, 3, 1, 0)).toBeNull();
    const wall: Shape = { kind: 'box', x: 5, z: 0, hw: 0.1, hd: 3, rot: 0 };
    const [a, b] = rayThrough(wall, 0, 0, 1, 0)!;
    expect(a).toBeCloseTo(4.9);
    expect(b).toBeCloseTo(5.1);
    // Turned a quarter, its long side lies along x: a ray down +z meets it end on at z = 5 - 0.1 ... it sits at x 5, so it misses; one from x 5 hits.
    const turned: Shape = { ...wall, rot: Math.PI / 2 };
    expect(rayThrough(turned, 0, 0, 0, 1)).toBeNull();
    expect(rayThrough(turned, 1, 0, 1, 0)![0]).toBeCloseTo(1);
    // From inside a shape there is nothing to enter.
    expect(rayThrough({ kind: 'box', x: 0, z: 0, hw: 2, hd: 2, rot: 0 }, 0, 0, 1, 0)).toBeNull();
  });

  it('sight stops behind a wall and runs free elsewhere', () => {
    const wall: Shape = { kind: 'box', x: 5, z: 0, hw: 0.1, hd: 3, rot: 0 };
    const rays = castSight(eye, 30, [wall]);
    expect(sightAlong(rays, 0)).toBeCloseTo(5.1, 1);
    expect(sightAlong(rays, Math.PI)).toBe(30);
    expect(sightAlong(rays, Math.PI / 2)).toBe(30);
    expect(rays.length).toBe(RAYS);
  });

  it('a house seen from outside is seen whole (the ray ends at its far side), but not what is behind it', () => {
    const house: Shape = { kind: 'box', x: 10, z: 0, hw: 3, hd: 3, rot: 0 };
    const rays = castSight(eye, 40, [house]);
    expect(sightAlong(rays, 0)).toBeCloseTo(13, 1);
  });

  it('seen: in the cone, close by behind you, not far behind you, not behind a wall', () => {
    const spec = visionOf({ alertness: 10 });
    const rays = castSight(eye, spec.range, [{ kind: 'box', x: 8, z: 0, hw: 0.1, hd: 2, rot: 0 }]);
    const at = (x: number, z: number) => seenAt(eye, 0, spec, rays, x, z);
    expect(at(0, 10) + at(0, -10)).toBeLessThan(0.01); // off to the side, outside the cone
    expect(at(3, 0)).toBeGreaterThan(0.9);
    expect(at(-1.5, 0)).toBeGreaterThan(0.9); // behind, but close
    expect(at(-15, 0)).toBe(0); // far behind
    expect(at(15, 0)).toBe(0); // behind the wall
    expect(at(0, 15)).toBe(0);
    expect(at(10, 8)).toBeGreaterThan(0.5); // clear of the wall's ends, inside the cone
  });

  it('line of sight and turning', () => {
    const tree: Shape = { kind: 'circle', x: 5, z: 0, r: 0.5 };
    expect(lineOfSight(eye, { x: 10, z: 0 }, [tree])).toBe(false);
    expect(lineOfSight(eye, { x: 10, z: 4 }, [tree])).toBe(true);
    expect(lineOfSight(eye, { x: 3, z: 0 }, [tree])).toBe(true);
    expect(angleGap(0.1, Math.PI * 2 - 0.1)).toBeCloseTo(0.2);
    expect(turnToward(0, Math.PI * 1.9, 0.1)).toBeCloseTo(-0.1); // the short way round
    expect(turnToward(0, 0.2, 0.5)).toBeCloseTo(0.2);
  });

  it('the explored map can record only what was seen', () => {
    const e = new Explored();
    const n = e.markWhere(0, 0, 5, (x) => x > 0);
    expect(n).toBeGreaterThan(0);
    expect(e.has(2.5, 0.5)).toBe(true);
    expect(e.has(-2.5, 0.5)).toBe(false);
  });
});

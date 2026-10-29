import { describe, expect, it } from 'vitest';
import { RAYS, angleGap, lightReach, litSeenAt, visibleLights, castSight, lineOfSight, rayThrough, seenAt, sightAlong, turnToward, visionOf } from '../src/core/world3d/vision';
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

  it('a flame in the hand wins back most of what the dark takes, and lights a little more round you at night', () => {
    const dark = visionOf({ alertness: 10, night: 1 }), lit = visionOf({ alertness: 10, night: 1, light: 1 }), day = visionOf({ alertness: 10 });
    expect(lit.range).toBeGreaterThan(dark.range);
    expect(lit.range).toBeLessThan(day.range);
    expect(lit.near).toBeGreaterThan(dark.near + 2);
    expect(visionOf({ alertness: 10, light: 1 }).near).toBe(day.near); // by day it adds nothing
  });

  it('a roofed house keeps its eaves in sight: the ray ends past the wall by the overhang, a thin wall does not', () => {
    const house: Shape = { kind: 'box', x: 10, z: 0, hw: 3, hd: 3, rot: 0 };
    expect(sightAlong(castSight(eye, 40, [house], undefined, 0.7), 0)).toBeCloseTo(13.7, 1);
    const wall: Shape = { kind: 'box', x: 5, z: 0, hw: 0.1, hd: 3, rot: 0 };
    expect(sightAlong(castSight(eye, 30, [wall], undefined, 0.7), 0)).toBeCloseTo(5.1, 1);
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

  it('the cone is already wide where you stand and meets a small circle; you do not see behind you', () => {
    const spec = visionOf({ alertness: 10 });
    expect(spec.near).toBeLessThan(3);
    expect(spec.back).toBeGreaterThan(0.5);
    // The cone's width at the eye is about the circle's: nothing is missing between them.
    const rays = castSight(eye, spec.range, []);
    const at = (x: number, z: number) => seenAt(eye, 0, spec, rays, x, z);
    expect(at(0.5, spec.near * 0.7)).toBeGreaterThan(0.9); // beside you, within the circle
    expect(at(spec.near + 1.5, spec.near * 0.8)).toBeGreaterThan(0.9); // just ahead, out past the circle: still in the wide cone
    expect(at(-spec.near * 2, 0)).toBe(0); // behind
    expect(at(-6, 4)).toBe(0);
    expect(visionOf({ alertness: 10, night: 1, light: 1 }).near).toBeGreaterThan(spec.near + 2);
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

  it('a torch is seen from far beyond plain sight, at night most of all, when ahead of you and in the clear', () => {
    const spec = visionOf({ alertness: 10 });
    expect(lightReach(spec, 1)).toBeGreaterThan(lightReach(spec, 0));
    expect(lightReach(spec, 0)).toBeGreaterThan(spec.range);
    const far = spec.range * 2; // twice as far as the eye reaches
    const torch = { x: far, z: 0, radius: 6 };
    const seen = visibleLights(eye, 0, spec, 1, [torch], []);
    expect(seen).toHaveLength(1);
    expect(litSeenAt(seen, far, 0)).toBeGreaterThan(0.3);
    expect(litSeenAt(seen, far + 3, 0)).toBeGreaterThan(0); // what is close to it too
    expect(litSeenAt(seen, far + 20, 0)).toBe(0);
    expect(seenAt(eye, 0, spec, castSight(eye, spec.range, []), far, 0)).toBe(0); // unlit, the same spot is not seen
    expect(visibleLights(eye, Math.PI, spec, 1, [torch], [])).toHaveLength(0); // behind you
    expect(visibleLights(eye, 0, spec, 1, [torch], [{ kind: 'box', x: far / 2, z: 0, hw: 0.2, hd: 3, rot: 0 }])).toHaveLength(0); // behind a wall
    expect(visibleLights(eye, 0, spec, 1, [{ ...torch, x: lightReach(spec, 1) + 5 }], [])).toHaveLength(0); // too far even for a flame
    // A torch on a wall of the house it is on is not hidden by that wall.
    expect(visibleLights(eye, 0, spec, 1, [{ x: far, z: 0, radius: 6 }], [{ kind: 'box', x: far + 1, z: 0, hw: 1.2, hd: 3, rot: 0 }])).toHaveLength(1);
  });
});

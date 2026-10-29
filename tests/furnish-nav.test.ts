import { describe, expect, it } from 'vitest';
import { furnish, type RoomSet } from '../src/content/furnish';
import { mapNamed } from '../src/content/maps';
import { THINGS } from '../src/content/things';
import { buildHouses, furnitureObstacles, houseToWorld, layoutObstacles } from '../src/core/world3d/layout';
import { footprints } from '../src/core/world3d/roomplan';
import { NavGrid, findPath, shapeDist } from '../src/core/world3d/space';
import { lakeDist } from '../src/core/world3d/terrain';

/** Feet and furniture: the same obstacles the world builds, checked from the inside of every house of the hamlet. */
describe('furniture blocks feet', () => {
  const map = mapNamed('hamlet');
  const built = buildHouses(map.layout);
  const rooms = built.map((b) => furnish((b.place.room ?? 'home') as RoomSet, b.model.room, b.model.door[0], b.place.spec.seed));
  const shapes = [...layoutObstacles(map.layout, built, THINGS),...built.flatMap((b, i) => furnitureObstacles(b, footprints(rooms[i].plan)))];
  const nav = new NavGrid(map.ground.size, shapes, { radius: 0.2, blocked: (x, z) => lakeDist(map.ground, x, z) < 0.2 });

  it('the middle of every standing piece is not walkable', () => {
    let n = 0;
    built.forEach((b, i) => {
      for (const f of footprints(rooms[i].plan)) {
        const w = houseToWorld(b.place, f.x, f.z);
        expect(nav.walkable(w.x, w.z), `${b.place.id}: ${f.id}`).toBe(false);
        n++;
      }
    });
    expect(n).toBeGreaterThan(30);
  });

  it('a path from the door to the far side of a room never crosses a piece', () => {
    built.forEach((b, i) => {
      const fps = footprints(rooms[i].plan);
      const door = houseToWorld(b.place, b.model.door[0], b.model.door[2] - 0.6);
      const room = b.model.room;
      for (const to of [[room.x0 + 0.6, room.z0 + 0.6], [room.x1 - 0.6, room.z0 + 0.6]]) {
        const goal = houseToWorld(b.place, to[0], to[1]);
        const path = findPath(nav, door, goal);
        if (!path) continue; // that corner is shut in by furniture: fine, there is no walking through it either
        for (let k = 0; k < path.length - 1; k++) {
          for (let t = 0; t <= 1; t += 0.1) {
            const p = { x: path[k].x + (path[k + 1].x - path[k].x) * t, z: path[k].z + (path[k + 1].z - path[k].z) * t };
            for (const f of fps) {
              const c = houseToWorld(b.place, f.x, f.z);
              // Inside the piece's own rectangle, shrunk a little for the grid's slack, means walking through it.
              const local = { x: (p.x - b.place.x), z: (p.z - b.place.z) };
              const cr = Math.cos(b.place.rot), sr = Math.sin(b.place.rot);
              const lx = local.x * cr - local.z * sr, lz = local.x * sr + local.z * cr;
              expect(Math.abs(lx - f.x) < f.hw - 0.05 && Math.abs(lz - f.z) < f.hd - 0.05, `${b.place.id}: path through ${f.id} at ${c.x.toFixed(1)},${c.z.toFixed(1)}`).toBe(false);
            }
          }
        }
      }
    });
  });

  it('walls hug the house: a point just outside a wall is walkable', () => {
    // Half a metre clear of the outside of the back wall (the footprint's z0 + 0.1 is the wall's centre line): the walker's
    // body (0.2 m) and a grid cell (0.25 m) are all that keep the hero off it.
    for (const b of built) {
      const fp = b.model.footprint;
      const p = houseToWorld(b.place, 0, fp.z0 + 0.1 - 0.5);
      if (shapes.some((s) => shapeDist(s, p.x, p.z) < 0.2)) continue; // a tree or a neighbour stands there
      expect(nav.walkable(p.x, p.z), b.place.id).toBe(true);
    }
  });
});

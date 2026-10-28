import { describe, expect, it } from 'vitest';
import { SPIKE_GROUND, SPIKE_HERO, SPIKE_LAYOUT, SPIKE_TORCHES } from '../src/content/spike3d';
import { buildHouses, houseAt, houseBox, houseOuterBox, houseToLocal, houseToWorld, houseWalls, layoutObstacles } from '../src/core/world3d/layout';
import { buildBoulder, buildShrub, buildWoodpile, propSource } from '../src/core/world3d/props';
import { NavGrid, findPath, shapeDist } from '../src/core/world3d/space';
import { WATER_Y, groundHeight, lakeDist, roadDist } from '../src/core/world3d/terrain';

const houses = buildHouses(SPIKE_LAYOUT);
const g = SPIKE_GROUND;

describe('layout', () => {
  it('local and world coordinates round-trip', () => {
    for (const { place } of houses) {
      const w = houseToWorld(place, 1.3, -0.7);
      const l = houseToLocal(place, w.x, w.z);
      expect(l.x).toBeCloseTo(1.3, 9);
      expect(l.z).toBeCloseTo(-0.7, 9);
    }
  });

  it('every house stands on dry ground, clear of the lake and the road, and of every other house', () => {
    for (const a of houses) {
      const { place, model } = a;
      expect(groundHeight(g, place.x, place.z)).toBeGreaterThan(WATER_Y + 0.2);
      // Corners of the footprint, porch included.
      const fp = model.footprint;
      for (const [lx, lz] of [[fp.x0, fp.z0], [fp.x1, fp.z0], [fp.x0, fp.z1], [fp.x1, fp.z1]]) {
        const w = houseToWorld(place, lx, lz);
        expect(lakeDist(g, w.x, w.z), place.id).toBeGreaterThan(1);
        for (const r of g.roads) expect(roadDist(r, w.x, w.z), place.id).toBeGreaterThan(r.width / 2);
      }
      for (const b of houses) {
        if (a === b) continue;
        const d = Math.hypot(a.place.x - b.place.x, a.place.z - b.place.z);
        expect(d, `${place.id}/${b.place.id}`).toBeGreaterThan((a.place.spec.width + b.place.spec.width) / 2 + 3);
      }
    }
  });

  it('trees and torches stand clear of houses and water', () => {
    const boxes = houses.map(houseBox);
    for (const t of SPIKE_LAYOUT.trees) {
      expect(lakeDist(g, t.x, t.z)).toBeGreaterThan(1.5);
      for (const b of boxes) expect(shapeDist(b, t.x, t.z)).toBeGreaterThan(1.5);
    }
    for (const [x, z] of SPIKE_TORCHES) for (const b of boxes) expect(shapeDist(b, x, z)).toBeGreaterThan(1);
  });

  it('the hero can walk in through every door, and each room is its own house', () => {
    const grid = new NavGrid(g.size, layoutObstacles(SPIKE_LAYOUT, houses), { radius: 0.2, blocked: (x, z) => lakeDist(g, x, z) < 0.2 });
    const boxes = houses.map(houseBox);
    houses.forEach((h, i) => {
      const m = h.model;
      const inside = houseToWorld(h.place, m.door[0], m.door[2] - 0.9);
      const path = findPath(grid, { x: SPIKE_HERO[0], z: SPIKE_HERO[1] }, inside);
      expect(path, h.place.id).not.toBeNull();
      expect(houseAt(houses, boxes, inside.x, inside.z, -0.1)).toBe(i);
    });
    expect(houseAt(houses, boxes, SPIKE_HERO[0], SPIKE_HERO[1], -0.1)).toBe(-1);
  });

  it('props stand on dry ground, off the road, clear of houses, and block feet', () => {
    const boxes = houses.map(houseOuterBox);
    const grid = new NavGrid(g.size, layoutObstacles(SPIKE_LAYOUT, houses), { radius: 0.2 });
    for (const p of SPIKE_LAYOUT.props) {
      const id = `${p.kind}@${p.x},${p.z}`;
      expect(lakeDist(g, p.x, p.z), id).toBeGreaterThan(1);
      for (const r of g.roads) expect(roadDist(r, p.x, p.z), id).toBeGreaterThan(r.width / 2 + 0.3);
      for (const b of boxes) expect(shapeDist(b, p.x, p.z), id).toBeGreaterThan(0.4);
      expect(grid.walkable(p.x, p.z), id).toBe(false);
    }
  });

  it('props build deterministically; boulders and shrubs are sources, woodpiles are not', () => {
    expect(JSON.stringify(buildShrub(4))).toBe(JSON.stringify(buildShrub(4)));
    expect(buildWoodpile(3).indices.length).toBeGreaterThan(0);
    expect(buildBoulder(2).clumps.length).toBe(2);
    expect(propSource({ kind: 'boulder', x: 1, z: 2, seed: 1 })?.kind).toBe('rock');
    expect(propSource({ kind: 'shrub', x: 1, z: 2, seed: 1 })?.kind).toBe('thicket');
    expect(propSource({ kind: 'woodpile', x: 1, z: 2, seed: 1 })).toBeNull();
  });

  it('each house keeps a doorway gap in its walls', () => {
    for (const h of houses) {
      const door = houseToWorld(h.place, h.model.door[0], h.model.door[2] - 0.1);
      for (const w of houseWalls(h)) expect(shapeDist(w, door.x, door.z)).toBeGreaterThan(0.3);
    }
  });
});

import { describe, expect, it } from 'vitest';
import { SPIKE_GROUND, SPIKE_HOUSE, SPIKE_WALK } from '../src/content/spike3d';
import { buildHouse } from '../src/core/world3d/house';
import { addBox, bounds, emptyMesh, vertexCount } from '../src/core/world3d/mesh';
import { cloudDensity, cloudThreshold, skyLight } from '../src/core/world3d/sky';
import { WATER_Y, buildTerrain, groundHeight, heightAt, lakeDist, splatAt } from '../src/core/world3d/terrain';
import { TIERS, adjust, pickTier, pixelFactor, viewSpan } from '../src/core/world3d/tiers';
import { TREE_KINDS, buildTree } from '../src/core/world3d/tree';

describe('mesh', () => {
  it('a box has 6 outward faces with matching attribute lengths', () => {
    const m = emptyMesh();
    addBox(m, [0, 0, 0], [1, 2, 3]);
    expect(vertexCount(m)).toBe(24);
    expect(m.indices.length).toBe(36);
    expect(m.uvs.length).toBe(48);
    expect(m.ao.length).toBe(24);
    // Each face's normal points away from the centre.
    for (let v = 0; v < 24; v++) {
      const p = m.positions.slice(v * 3, v * 3 + 3), n = m.normals.slice(v * 3, v * 3 + 3);
      const out = (p[0] - 0.5) * n[0] + (p[1] - 1) * n[1] + (p[2] - 1.5) * n[2];
      expect(out).toBeGreaterThan(0);
    }
  });
});

describe('house generator', () => {
  const h = buildHouse(SPIKE_HOUSE.spec);

  it('is deterministic', () => {
    expect(JSON.stringify(buildHouse(SPIKE_HOUSE.spec))).toBe(JSON.stringify(h));
  });

  it('stays inside its footprint plus the eaves, and below a sane height', () => {
    const all = emptyMesh();
    for (const p of h.parts) {
      for (let i = 0; i < p.mesh.positions.length; i++) expect(Number.isFinite(p.mesh.positions[i])).toBe(true);
      const b = bounds(p.mesh);
      expect(b.min[1]).toBeGreaterThanOrEqual(-0.01);
      expect(b.max[1]).toBeLessThan(9);
      expect(Math.abs(b.min[0])).toBeLessThan(SPIKE_HOUSE.spec.width / 2 + 1);
      expect(Math.abs(b.max[2])).toBeLessThan(SPIKE_HOUSE.spec.depth / 2 + 1);
      all.indices.push(...p.mesh.indices);
    }
    expect(all.indices.length).toBeGreaterThan(0);
  });

  it('cuts away the roof and front wall but keeps the back and side walls and the floor', () => {
    const cut = new Set(h.parts.filter((p) => p.cut).map((p) => p.name));
    expect(cut.has('roof')).toBe(true);
    expect(cut.has('frontWall')).toBe(true);
    expect(cut.has('walls')).toBe(false);
    expect(cut.has('floor')).toBe(false);
  });

  it('has a room inside its walls, a door on the front, and a smoke point above the roof', () => {
    expect(h.room.x0).toBeLessThan(h.room.x1);
    expect(h.room.z0).toBeLessThan(h.room.z1);
    expect(h.door[2]).toBeCloseTo(SPIKE_HOUSE.spec.depth / 2);
    expect(Math.abs(h.door[0])).toBeLessThan(SPIKE_HOUSE.spec.width / 2 - 0.5);
    const roofTop = bounds(h.parts.find((p) => p.name === 'roof')!.mesh).max[1];
    expect(h.smoke[1]).toBeGreaterThan(roofTop - 0.5);
  });

  it('other roofs and seeds build too', () => {
    for (const roof of ['thatch', 'shingle', 'tile', 'sod'] as const) {
      for (const seed of [1, 2, 3]) {
        const m = buildHouse({ seed, width: 5 + seed, depth: 4.5, roof });
        expect(m.parts.length).toBeGreaterThan(8);
      }
    }
  });
});

describe('terrain', () => {
  const g = SPIKE_GROUND;
  const t = buildTerrain(g, 1);

  it('is deterministic and finite, one vertex per step', () => {
    expect(t.n).toBe(g.size + 1);
    expect(t.heights.every(Number.isFinite)).toBe(true);
    expect(JSON.stringify(buildTerrain(g, 1).heights)).toBe(JSON.stringify(t.heights));
  });

  it('the lake bed is under the water and the house pad is above it', () => {
    expect(groundHeight(g, g.lake!.x, g.lake!.z)).toBeLessThan(WATER_Y - 0.5);
    expect(lakeDist(g, g.lake!.x, g.lake!.z)).toBeLessThan(0);
    expect(groundHeight(g, SPIKE_HOUSE.x, SPIKE_HOUSE.z)).toBeGreaterThan(WATER_Y + 0.2);
  });

  it('the house pad is level', () => {
    const c = groundHeight(g, SPIKE_HOUSE.x, SPIKE_HOUSE.z);
    for (const [dx, dz] of [[-2.5, -2], [2.5, -2], [-2.5, 2], [2.5, 2]]) {
      expect(Math.abs(groundHeight(g, SPIKE_HOUSE.x + dx, SPIKE_HOUSE.z + dz) - c)).toBeLessThan(0.08);
    }
  });

  it('heightAt matches the grid at vertices', () => {
    const half = g.size / 2;
    expect(heightAt(t, g.size, -half + 5, -half + 7)).toBeCloseTo(t.heights[7 * t.n + 5]);
  });

  it('the road is road, the walk stays dry', () => {
    const r = g.roads[0].pts[3];
    expect(splatAt(g, r[0], r[1]).road).toBeGreaterThan(0.9);
    for (const [x, z] of SPIKE_WALK) expect(groundHeight(g, x, z)).toBeGreaterThan(WATER_Y);
  });
});

describe('sky and clouds', () => {
  it('day is brighter than dusk is brighter than night', () => {
    const d = skyLight(0, 0, 0), u = skyLight(1, 0, 0), n = skyLight(2, 0, 0);
    expect(d.sunIntensity).toBeGreaterThan(u.sunIntensity);
    expect(u.sunIntensity).toBeGreaterThan(n.sunIntensity);
    expect(n.night).toBe(1);
    expect(d.night).toBe(0);
  });

  it('shadows are never black: there is always sky light', () => {
    for (const tod of [0, 0.5, 1, 1.5, 2]) {
      const s = skyLight(tod, 1, 1);
      expect(s.ambient).toBeGreaterThan(0.3);
      expect(Math.max(...s.skyTop)).toBeGreaterThan(0.05);
    }
  });

  it('rain greys the sun and pulls the fog in', () => {
    const clear = skyLight(0, 0, 0), wet = skyLight(0, 1, 1);
    expect(wet.sunIntensity).toBeLessThan(clear.sunIntensity);
    expect(wet.fogFar).toBeLessThan(clear.fogFar);
  });

  it('the sun direction is a unit vector above the horizon', () => {
    for (const tod of [0, 0.7, 1.3, 2]) {
      const s = skyLight(tod, 0, 0).sunDir;
      expect(Math.hypot(...s)).toBeCloseTo(1);
      expect(s[1]).toBeGreaterThan(0);
    }
  });

  it('more cover means more of the ground under cloud, and the field drifts', () => {
    const share = (cover: number): number => {
      let n = 0;
      for (let x = 0; x < 60; x++) for (let z = 0; z < 60; z++) n += cloudDensity(x * 2, z * 2, 0, cover, 1, 0, 1);
      return n / 3600;
    };
    expect(share(0)).toBeLessThan(share(0.65));
    expect(share(0.65)).toBeLessThan(share(1));
    expect(cloudDensity(10, 10, 0, 0.5, 1, 0, 2)).toBe(cloudDensity(20, 10, 5, 0.5, 1, 0, 2));
    expect(cloudThreshold(1)).toBeLessThan(cloudThreshold(0));
  });
});

describe('quality tiers', () => {
  it('phones get the low tier, big touch-free screens the high one', () => {
    expect(pickTier({ width: 400, height: 720, dpr: 3, touch: true })).toBe('low');
    expect(pickTier({ width: 1024, height: 1366, dpr: 2, touch: true })).toBe('medium');
    expect(pickTier({ width: 1920, height: 1080, dpr: 1, touch: false })).toBe('high');
  });

  it('pixel factor is a whole number, at least 1', () => {
    expect(pixelFactor(3, 1)).toBe(3);
    expect(pixelFactor(2.625, 1)).toBe(3);
    expect(pixelFactor(1, 0.5)).toBe(1);
  });

  it('a phone sees less than a desktop at the default zoom', () => {
    const lo = TIERS.low, hi = TIERS.high;
    const phone = viewSpan(400, 600, 3, lo.pixelCss, lo.zooms[lo.zoom]);
    const desk = viewSpan(1600, 900, 1, hi.pixelCss, hi.zooms[hi.zoom]);
    expect(phone.w * phone.h).toBeLessThan(desk.w * desk.h);
    expect(phone.rw).toBe(400);
  });

  it('adjusts down when over budget, up only with room to spare', () => {
    expect(adjust(Array(40).fill(40), 33)).toBe(-1);
    expect(adjust(Array(40).fill(10), 33)).toBe(1);
    expect(adjust(Array(40).fill(25), 33)).toBe(0);
    expect(adjust(Array(5).fill(90), 33)).toBe(0);
  });
});

describe('tree', () => {
  it('is deterministic, has clumps above the trunk', () => {
    const a = buildTree(3), b = buildTree(3);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.clumps.length).toBeGreaterThan(4);
    expect(Math.min(...a.clumps.map((c) => c.at[1]))).toBeGreaterThan(2);
  });

  it('every kind is deterministic; pines are taller and narrower, saplings small, dead trees leafless', () => {
    for (const k of TREE_KINDS) {
      expect(JSON.stringify(buildTree(5, 7, k)), k).toBe(JSON.stringify(buildTree(5, 7, k)));
      expect(buildTree(5, 7, k).wood.indices.length, k).toBeGreaterThan(0);
    }
    const oak = buildTree(5), pine = buildTree(5, 7, 'pine'), young = buildTree(5, 7, 'young'), dead = buildTree(5, 7, 'dead');
    expect(pine.height).toBeGreaterThan(oak.height * 0.9);
    expect(Math.max(...pine.clumps.map((c) => c.r[0]))).toBeLessThan(Math.max(...oak.clumps.map((c) => c.r[0])));
    expect(young.height).toBeLessThan(oak.height * 0.7);
    expect(dead.clumps).toHaveLength(0);
  });
});

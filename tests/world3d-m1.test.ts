import { describe, expect, it } from 'vitest';
import { SPIKE_GROUND } from '../src/content/spike3d';
import { AtlasPacker } from '../src/core/world3d/atlas';
import { CHUNK, TerrainStore, buildChunk, chunkHeightAt, chunkOf, chunkRange, chunksNear } from '../src/core/world3d/chunks';
import { environment } from '../src/core/world3d/environment3d';
import { cloudDensity, cloudDrift } from '../src/core/world3d/sky';
import { Governor, MAX_LEVEL, TIERS, atlasSize, isWeakGpu, pickTier, qualityAt } from '../src/core/world3d/tiers';
import { groundHeight } from '../src/core/world3d/terrain';

const g = SPIKE_GROUND;

describe('chunks', () => {
  it('cover the world patch, 64 m is 2 × 2 chunks of 32 m', () => {
    expect(CHUNK).toBe(32);
    expect(chunkRange(g)).toEqual({ i0: -1, i1: 0, j0: -1, j1: 0 });
    expect(chunkOf(-0.1, 31.9)).toEqual({ i: -1, j: 0 });
  });

  it('chunksNear returns the nearest first and respects the radius', () => {
    const all = chunksNear(g, 0, 0, 100);
    expect(all.length).toBe(4);
    const near = chunksNear(g, -20, -20, 5);
    expect(near).toEqual([{ i: -1, j: -1 }]);
    const order = chunksNear(g, -20, -20, 100);
    expect(order[0]).toEqual({ i: -1, j: -1 });
  });

  it('is deterministic, finite and has the right vertex count', () => {
    const a = buildChunk(g, -1, -1, 1), b = buildChunk(g, -1, -1, 1);
    expect(JSON.stringify(a.mesh)).toBe(JSON.stringify(b.mesh));
    expect(a.n).toBe(33);
    expect(a.mesh.positions.length / 3).toBe(33 * 33);
    expect(a.mesh.indices.length).toBe(32 * 32 * 6);
    expect(a.mesh.positions.every(Number.isFinite)).toBe(true);
    expect(a.mesh.normals.every(Number.isFinite)).toBe(true);
  });

  it('neighbours agree on their shared edge: heights and normals, so no seam shows', () => {
    const l = buildChunk(g, -1, 0, 0.5), r = buildChunk(g, 0, 0, 0.5);
    for (let b = 0; b < l.n; b++) {
      const li = b * l.n + (l.n - 1), ri = b * r.n;
      expect(l.mesh.positions[li * 3 + 1]).toBeCloseTo(r.mesh.positions[ri * 3 + 1], 9);
      for (let k = 0; k < 3; k++) expect(l.mesh.normals[li * 3 + k]).toBeCloseTo(r.mesh.normals[ri * 3 + k], 9);
      expect(l.mesh.ao[li]).toBeCloseTo(r.mesh.ao[ri], 9);
    }
  });

  it('normals point up and heights match the world function', () => {
    const c = buildChunk(g, 0, 0, 0.5);
    for (let k = 1; k < c.mesh.normals.length; k += 3) expect(c.mesh.normals[k]).toBeGreaterThan(0.5);
    expect(c.heights[10 * c.n + 20]).toBeCloseTo(groundHeight(g, c.x0 + 20 * 0.5, c.z0 + 10 * 0.5), 9);
  });

  it('the store looks heights up from resident chunks and falls back to the function', () => {
    const s = new TerrainStore(g, 0.5);
    const x = 3.25, z = 4.75;
    const exact = groundHeight(g, x, z);
    expect(s.heightAt(x, z)).toBeCloseTo(exact, 9);
    s.ensure(0, 0);
    expect(s.has(0, 0)).toBe(true);
    expect(Math.abs(s.heightAt(x, z) - exact)).toBeLessThan(0.05);
    expect(chunkHeightAt(s.chunks.get('0,0')!, 0, 0)).toBeCloseTo(groundHeight(g, 0, 0), 9);
    s.drop(0, 0);
    expect(s.has(0, 0)).toBe(false);
  });
});

describe('atlas packer', () => {
  it('gives the same rect for the same key and never overlaps', () => {
    const p = new AtlasPacker(256, 1);
    const rects = [];
    for (let i = 0; i < 120; i++) rects.push(p.place(`k${i}`, 20 + (i % 5) * 7, 16 + (i % 3) * 9));
    expect(p.place('k3', 1, 1)).toBe(rects[3]);
    for (let a = 0; a < rects.length; a++) {
      const A = rects[a];
      expect(A.x).toBeGreaterThanOrEqual(1);
      expect(A.x + A.w + 1).toBeLessThanOrEqual(256);
      expect(A.y + A.h + 1).toBeLessThanOrEqual(256);
      for (let b = a + 1; b < rects.length; b++) {
        const B = rects[b];
        if (A.atlas !== B.atlas) continue;
        const apart = A.x + A.w + 1 <= B.x - 1 + 1 || B.x + B.w + 1 <= A.x - 1 + 1 || A.y + A.h + 1 <= B.y - 1 + 1 || B.y + B.h + 1 <= A.y - 1 + 1;
        expect(apart).toBe(true);
      }
    }
    expect(p.count).toBeGreaterThan(1);
  });

  it('refuses what cannot fit and maps rects to flipped UVs', () => {
    const p = new AtlasPacker(64, 1);
    expect(() => p.place('big', 64, 10)).toThrow();
    const r = p.place('a', 10, 20);
    const uv = p.uv(r);
    expect(uv.u0).toBeCloseTo(r.x / 64);
    expect(uv.v1).toBeCloseTo(1 - r.y / 64);
    expect(uv.v0).toBeLessThan(uv.v1);
  });
});

describe('environment3d', () => {
  const w = { tod: 0, cloud: 0.4, rain: 0, flash: 0, wind: 0.6, wx: 1, wy: 0, windForce: 3 };

  it('carries the sky light, wind and wetness from the weather', () => {
    const e = environment(w);
    expect(e.sunIntensity).toBeGreaterThan(0.5);
    expect(e.wind.x).toBeCloseTo(0.6);
    expect(e.wind.force).toBe(3);
    expect(e.wetness).toBe(0);
    expect(environment({ ...w, rain: 0.6 }).wetness).toBe(1);
    expect(environment({ ...w, tod: 2 }).night).toBe(1);
  });

  it('cloudShadow is the same field the renderer draws, shifted by the drift', () => {
    const off = { x: 7, z: -3 };
    const e = environment(w, off);
    for (const [x, z] of [[0, 0], [10, 4], [-22, 9]]) {
      expect(e.cloudShadow(x, z)).toBeCloseTo(cloudDensity(x, z, 1, 0.4, off.x, off.z, 1), 12);
      // Same as a drift of one second at that speed.
      expect(e.cloudShadow(x, z)).toBeCloseTo(cloudDensity(x, z, 1, 0.4, 7 / cloudDrift(3), -3 / cloudDrift(3), cloudDrift(3)), 9);
    }
  });
});

describe('tier detection and the governor', () => {
  it('software GPUs are weak and start low, with small atlases', () => {
    expect(isWeakGpu('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device))')).toBe(true);
    expect(isWeakGpu('Apple GPU')).toBe(false);
    const d = { width: 1920, height: 1080, dpr: 1, touch: false, gpu: 'llvmpipe' };
    expect(pickTier(d)).toBe('low');
    expect(atlasSize(d)).toBe(512);
    expect(atlasSize({ ...d, gpu: 'Apple GPU', maxTexture: 16384 })).toBe(1024);
  });

  it('quality steps down monotonically and level 0 is the tier', () => {
    for (const t of Object.values(TIERS)) {
      expect(qualityAt(t, 0)).toEqual({ shadowMap: t.shadowMap, lights: t.lights, shells: t.shells, grass: t.grass });
      let prev = qualityAt(t, 0);
      for (let l = 1; l <= MAX_LEVEL + 2; l++) {
        const q = qualityAt(t, l);
        expect(q.grass).toBeLessThanOrEqual(prev.grass);
        expect(q.shells).toBeLessThanOrEqual(prev.shells);
        expect(q.shadowMap).toBeLessThanOrEqual(prev.shadowMap);
        expect(q.lights).toBeLessThanOrEqual(prev.lights);
        expect(q.lights).toBeGreaterThanOrEqual(2);
        prev = q;
      }
    }
  });

  it('steps down on slow frames with a notice, stops at the floor, waits to judge the change', () => {
    const gov = new Governor(33, 30);
    const notices: string[] = [];
    for (let i = 0; i < 400; i++) {
      const r = gov.push(60);
      if (r.notice) notices.push(r.notice);
    }
    expect(gov.level).toBe(MAX_LEVEL);
    expect(notices.length).toBe(MAX_LEVEL);
    expect(notices[0]).toMatch(/lowered/);
  });

  it('stays put on good frames and climbs back only with lots of room', () => {
    const gov = new Governor(33, 30);
    for (let i = 0; i < 100; i++) gov.push(25);
    expect(gov.level).toBe(0);
    for (let i = 0; i < 40; i++) gov.push(60);
    expect(gov.level).toBeGreaterThan(0);
    const low = gov.level;
    for (let i = 0; i < 40; i++) gov.push(25);
    expect(gov.level).toBe(low);
    for (let i = 0; i < 400; i++) gov.push(8);
    expect(gov.level).toBe(0);
  });
});

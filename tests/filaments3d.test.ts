import { describe, expect, it } from 'vitest';
import { SPIKE_GROUND, SPIKE_HERO, SPIKE_HOUSE, SPIKE_LAYOUT, SPIKE_TREE, spikeFilamentWorld } from '../src/content/spike3d';
import { buildHouses } from '../src/core/world3d/layout';
import type { Environment } from '../src/core/environment';
import { ASPECTS } from '../src/core/filaments';
import { FCELL, type FSource, type FilamentWorld, FilamentField, falloffAt } from '../src/core/world3d/filaments3d';
import { CHUNK } from '../src/core/world3d/chunks';

const DAY: Environment = { time: 'day', sky: 'clear', windForce: 1, windDir: 0 };
const NIGHT: Environment = { ...DAY, time: 'night' };

/** A plain meadow, 64 m wide, with whatever sources and ground you give it. */
const meadow = (sources: FSource[] = [], over: Partial<FilamentWorld> = {}): FilamentWorld => ({
  size: 64, ground: () => 'grass', indoors: () => false, sources, ...over,
});

describe('filaments in the free world', () => {
  it('cells are 1.6 m and tile a chunk exactly', () => {
    expect(FCELL).toBe(1.6);
    expect(CHUNK / FCELL).toBe(20);
  });

  it('a plain meadow on a clear day reads as the hex version does', () => {
    const f = new FilamentField(meadow());
    f.setConditions({ env: DAY });
    const r = f.readAt(5, 5);
    expect(r.foto.level).toBe(1);
    expect(r.hydro.level).toBe(-1);
    expect(r.skoto.level).toBe(-3);
    expect(r.pyro.level).toBe(-2);
    expect(r.pneumo.level).toBe(-1);
  });

  it('air is stiller in the lee of a house (wind from the west, house at x 0..4)', () => {
    const wall = (x: number, z: number, dx: number, dz: number, reach: number): string | null => {
      const l = Math.hypot(dx, dz);
      for (let d = 0.75; d <= reach; d += 0.75) { const px = x + (dx / l) * d; if (px >= 0 && px <= 4 && Math.abs(z) < 3) return 'house'; }
      return null;
    };
    const f = new FilamentField(meadow([], { windBreak: wall }));
    f.setConditions({ env: { ...DAY, windForce: 3, windDir: 0 } }); // blows toward the east
    const lee = f.readAt(6.4, 0.8), windward = f.readAt(-6.4, 0.8);
    expect(lee.pneumo.raw).toBe(windward.pneumo.raw - 1);
    expect(lee.pneumo.parts.some((p) => p.label.includes('lee of a house'))).toBe(true);
  });

  it('the falloff joins the hex numbers smoothly and ends at 2.5 cells', () => {
    const fall: [number, number, number] = [4, 2, 1];
    expect(falloffAt(fall, 0)).toBe(4);
    expect(falloffAt(fall, 1)).toBe(2);
    expect(falloffAt(fall, 2)).toBe(1);
    expect(falloffAt(fall, 0.5)).toBe(3);
    expect(falloffAt(fall, 3)).toBe(0);
    let prev = Infinity;
    for (let d = 0; d <= 3; d += 0.1) {
      const v = falloffAt(fall, d);
      expect(v).toBeLessThanOrEqual(prev + 1e-9);
      prev = v;
    }
  });

  it('a fire warms the ground around it, strongest at the flames, gone past a few metres', () => {
    const f = new FilamentField(meadow([{ x: 0.8, z: 0.8, kind: 'fire' }]));
    f.setConditions({ env: NIGHT });
    const at = (d: number) => f.readAt(0.8 + d, 0.8).pyro.raw;
    expect(at(0)).toBeGreaterThan(at(1.6));
    expect(at(1.6)).toBeGreaterThan(at(3.2));
    expect(at(0)).toBeGreaterThanOrEqual(1);
    expect(at(10)).toBe(-2);
  });

  it('every contribution is kept, so a reading can be explained', () => {
    const f = new FilamentField(meadow([{ x: 0.8, z: 0.8, kind: 'fire' }]));
    f.setConditions({ env: NIGHT });
    const labels = f.readAt(0.8, 0.8).pyro.parts.map((p) => p.label.replace(/ \(.*|×.*/, '').trim());
    expect(labels).toContain('No open fire');
    expect(labels).toContain('Fire');
  });

  it('each kind of source is capped: a grove is no stronger than the cap', () => {
    const grove: FSource[] = [];
    for (let k = 0; k < 30; k++) grove.push({ x: 0.5 + (k % 5) * 0.2, z: 0.5 + Math.floor(k / 5) * 0.2, kind: 'tree' });
    const f = new FilamentField(meadow(grove));
    f.setConditions({ env: DAY });
    const trees = f.readAt(0.8, 0.8).bio.parts.filter((p) => p.label.startsWith('Trees'));
    expect(trees.length).toBe(1);
    expect(trees[0].value).toBeLessThanOrEqual(1);
  });

  it('water radiates from every cell it fills, and hydro falls with distance from the shore', () => {
    const lake = meadow([], { ground: (x, z) => (Math.hypot(x + 10, z) < 6 ? 'pond' : 'grass') });
    const f = new FilamentField(lake);
    f.setConditions({ env: DAY });
    const hydro = (x: number) => f.readAt(x, 0).hydro.raw;
    expect(hydro(-4)).toBeGreaterThan(hydro(-3 + 6));
    expect(hydro(-4.5 + 6)).toBeGreaterThanOrEqual(hydro(-4.5 + 12));
    expect(hydro(20)).toBe(-1);
    expect(f.readAt(-10, 0).nekro.raw).toBeGreaterThan(f.readAt(20, 0).nekro.raw - 0.001);
  });

  it('water is felt a metre and more from the shore, and gone by six', () => {
    const f = new FilamentField(meadow([], { ground: (x, z) => (Math.hypot(x + 10, z) < 6 ? 'pond' : 'grass') }));
    f.setConditions({ env: DAY });
    expect(f.readAt(-4 + 1.2, 0).hydro.level).toBeGreaterThanOrEqual(1);
    expect(f.readAt(-4 + 2.5, 0).hydro.level).toBeGreaterThanOrEqual(0);
    expect(f.readAt(-4 + 6.5, 0).hydro.level).toBe(-1);
  });

  it('indoors kills water and air', () => {
    const f = new FilamentField(meadow([], { indoors: (x) => x > 10 }));
    f.setConditions({ env: DAY });
    expect(f.readAt(12, 0).hydro.level).toBe(-3);
    expect(f.readAt(12, 0).pneumo.level).toBe(-2);
    expect(f.readAt(0, 0).hydro.level).toBe(-1);
  });

  it('a cloud overhead dims light; the weather and time change the reading', () => {
    const f = new FilamentField(meadow());
    f.setConditions({ env: DAY, isClouded: () => true });
    expect(f.readAt(0, 0).foto.parts.some((p) => p.label === 'Under a cloud')).toBe(true);
    f.setConditions({ env: DAY });
    const clear = f.readAt(0, 0).foto.raw;
    f.setConditions({ env: NIGHT });
    expect(f.readAt(0, 0).foto.raw).toBeLessThan(clear);
    f.setConditions({ env: { ...DAY, sky: 'rain' } });
    expect(f.readAt(0, 0).hydro.level).toBe(0);
  });

  it('a tree throws its shadow away from the sun, by the real direction, and not at night', () => {
    const f = new FilamentField(meadow([{ x: 0, z: 0, kind: 'tree' }]));
    const sun: [number, number, number] = [-0.45, 0.8, 0.55];
    const h = Math.hypot(sun[0], sun[2]);
    const shaded = { x: (-sun[0] / h) * 3, z: (-sun[2] / h) * 3 };
    const lit = { x: (sun[0] / h) * 3, z: (sun[2] / h) * 3 };
    f.setConditions({ env: DAY, sunDir: sun });
    expect(f.readAt(shaded.x, shaded.z).foto.parts.some((p) => p.label.includes('shadow of a tree'))).toBe(true);
    expect(f.readAt(lit.x, lit.z).foto.parts.some((p) => p.label.includes('shadow'))).toBe(false);
    f.setConditions({ env: NIGHT, sunDir: sun });
    expect(f.readAt(shaded.x, shaded.z).foto.parts.some((p) => p.label.includes('shadow'))).toBe(false);
  });

  it('moving things (the living) radiate life, and can be replaced', () => {
    const f = new FilamentField(meadow());
    f.setConditions({ env: DAY });
    const bio = () => f.readAt(10, 10).bio.raw;
    const base = bio();
    f.setMovers([{ x: 10, z: 10, kind: 'friend' }]);
    expect(bio()).toBeGreaterThan(base);
    f.setMovers([]);
    expect(bio()).toBe(base);
  });

  it('reads outside the patch from the nearest cell and is deterministic', () => {
    const f = new FilamentField(meadow([{ x: 3, z: 3, kind: 'tree' }]));
    f.setConditions({ env: DAY });
    expect(f.readAt(1000, -1000).foto.level).toBe(f.readAt(31.9, -31.9).foto.level);
    const g = new FilamentField(meadow([{ x: 3, z: 3, kind: 'tree' }]));
    g.setConditions({ env: DAY });
    expect(JSON.stringify(g.readAt(3, 3))).toBe(JSON.stringify(f.readAt(3, 3)));
  });
});

describe('walls and smoothness', () => {
  // A room from x 0..6 (indoors), a hearth inside at x 4.
  const room = meadow([{ x: 4, z: 0, kind: 'fire' }], { indoors: (x) => x >= 0 && x <= 6 });

  it('fire inside a room heats the room and not the ground outside its wall', () => {
    const f = new FilamentField(room);
    f.setConditions({ env: NIGHT });
    expect(f.readAt(4, 0).pyro.raw).toBeGreaterThan(1);
    expect(f.readAt(2.5, 0).pyro.raw).toBeGreaterThan(-2);
    // Just outside the wall, 1.5 m from the hearth's cell: nothing of it.
    expect(f.readAt(7.2, 0).pyro.raw).toBe(-2);
    expect(f.readAt(-1, 0).pyro.raw).toBe(-2);
  });

  it('fire outside does not leak in either', () => {
    const f = new FilamentField(meadow([{ x: 8, z: 0, kind: 'fire' }], { indoors: (x) => x >= 0 && x <= 6 }));
    f.setConditions({ env: NIGHT });
    expect(f.readAt(8, 0).pyro.raw).toBeGreaterThan(1);
    expect(f.readAt(5.5, 0).pyro.raw).toBe(-2);
  });

  it('smoothAt blends between cell centres with no jumps', () => {
    const f = new FilamentField(meadow([{ x: 0.8, z: 0.8, kind: 'fire' }]));
    f.setConditions({ env: NIGHT });
    let prev = f.smoothAt(0.8, 0.8, 'pyro');
    for (let x = 0.8; x < 6; x += 0.05) {
      const v = f.smoothAt(x, 0.8, 'pyro');
      expect(Math.abs(v - prev)).toBeLessThan(0.35);
      prev = v;
    }
    expect(f.smoothAt(0.8, 0.8, 'pyro')).toBeCloseTo(f.readAt(0.8, 0.8).pyro.raw, 6);
  });
});

describe('filaments on the spike', () => {
  const f = new FilamentField(spikeFilamentWorld(SPIKE_GROUND, buildHouses(SPIKE_LAYOUT)));
  f.setConditions({ env: DAY });

  it('every aspect reads in -3..3 everywhere on the patch', () => {
    for (let x = -30; x <= 30; x += 7) {
      for (let z = -30; z <= 30; z += 7) {
        const r = f.readAt(x, z);
        for (const a of ASPECTS) {
          expect(r[a.id].level).toBeGreaterThanOrEqual(-3);
          expect(r[a.id].level).toBeLessThanOrEqual(3);
          expect(Number.isFinite(r[a.id].raw)).toBe(true);
        }
      }
    }
  });

  it('the lake is wet, the tree is lively, the room indoors is dry', () => {
    const shore = f.readAt(-13, -3.5), far = f.readAt(20, 20);
    expect(shore.hydro.raw).toBeGreaterThan(far.hydro.raw);
    expect(f.readAt(SPIKE_TREE.x, SPIKE_TREE.z).bio.raw).toBeGreaterThan(far.bio.raw);
    expect(f.readAt(SPIKE_HOUSE.x, SPIKE_HOUSE.z).hydro.level).toBe(-3);
    expect(f.readAt(SPIKE_HERO[0], SPIKE_HERO[1]).hydro.level).toBeLessThanOrEqual(0);
  });
});

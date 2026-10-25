import { describe, expect, it } from 'vitest';
import type { Battle, Cell } from '../src/core/battle';
import type { Environment } from '../src/core/environment';
import { readHex } from '../src/core/filaments';
import { hex, hexKey, neighbors } from '../src/core/hex';

/** A grass hex at 0,0 with configurable neighbours. */
function world(center: Partial<Cell> = {}, around: Partial<Cell>[] = []): Battle {
  const cells: Battle['cells'] = {};
  const put = (at: ReturnType<typeof hex>, extra: Partial<Cell>) => {
    cells[hexKey(at)] = { at, obstacle: false, flammable: true, water: false, fire: 'none', ground: 'grass', ...extra };
  };
  put(hex(0, 0), center);
  neighbors(hex(0, 0)).forEach((n, i) => put(n, around[i] ?? {}));
  return { cells, units: [] };
}

const DAY: Environment = { time: 'day', sky: 'clear', windForce: 1 };
const read = (b: Battle, env: Environment = DAY) => readHex(b, hex(0, 0), env)!;

describe('filaments', () => {
  it('a plain meadow on a clear day matches Eon defaults', () => {
    const r = read(world());
    expect(r.hydro.level).toBe(-1); // grass, no water near: weak
    expect(r.skoto.level).toBe(-3); // daylight: magic-dead
    expect(r.foto.level).toBe(0); // daylight: normal
    expect(r.pyro.level).toBe(-2); // no fire: very weak
    expect(r.pneumo.level).toBe(-1); // light breeze: weak
  });

  it('rain alone only lifts dry land to normal', () => {
    expect(read(world(), { ...DAY, sky: 'rain' }).hydro.level).toBe(0);
    expect(read(world(), { ...DAY, sky: 'storm' }).hydro.level).toBe(1);
  });

  it('two water hexes plus a downpour reaches the extreme', () => {
    const b = world({}, [{ ground: 'river' }, { ground: 'river' }]);
    expect(read(b, { ...DAY, sky: 'rain' }).hydro.level).toBe(2);
    expect(read(b, { ...DAY, sky: 'storm' }).hydro.level).toBe(3);
  });

  it('standing in water is strong, not extreme, unless it pours', () => {
    const b = world({ ground: 'ford' }, [{ ground: 'river' }, { ground: 'river' }]);
    expect(read(b).hydro.level).toBe(1);
    expect(read(b, { ...DAY, sky: 'rain' }).hydro.level).toBe(2);
    expect(read(b, { ...DAY, sky: 'storm' }).hydro.level).toBe(3);
  });

  it('darkness grows at night, in clouds and forest', () => {
    const night: Environment = { time: 'night', sky: 'clear', windForce: 1 };
    expect(read(world(), night).skoto.level).toBe(0);
    expect(read(world({}, [{ feature: 'tree' }, { feature: 'tree' }, { feature: 'pine' }]), { ...night, sky: 'cloudy' }).skoto.level).toBe(2);
    expect(read(world(), { ...night, sky: 'cloudy' }).foto.level).toBe(-3); // moonless night
  });

  it('fire feeds pyrotropy and pushes back the dark', () => {
    const b = world({ fire: 'burning' }, [{ fire: 'burning' }]);
    expect(read(b).pyro.level).toBe(3);
    expect(read(b, { time: 'night', sky: 'clear', windForce: 1 }).skoto.level).toBe(-3);
  });

  it('indoors kills water and air but not darkness by day', () => {
    const r = read(world({ indoors: true }));
    expect(r.hydro.level).toBe(-3);
    expect(r.pneumo.level).toBe(-2);
    expect(r.skoto.level).toBe(-1);
  });

  it('wind force drives pneumotropy', () => {
    expect(read(world(), { ...DAY, windForce: 0 }).pneumo.level).toBe(-2);
    expect(read(world(), { ...DAY, windForce: 5 }).pneumo.level).toBe(2);
  });

  it('keeps an explanation of every contribution', () => {
    const r = read(world({}, [{ ground: 'river' }]), { ...DAY, sky: 'rain' });
    expect(r.hydro.parts.map((p) => p.label)).toEqual(['Dry land', 'Water next to you ×1', 'Rain']);
  });
});

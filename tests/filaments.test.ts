import { describe, expect, it } from 'vitest';
import type { Battle, Cell, Unit } from '../src/core/battle';
import type { Environment } from '../src/core/environment';
import { type FilamentOptions, readHex } from '../src/core/filaments';
import { DIRECTIONS, hex, hexAdd, hexKey, hexesWithin } from '../src/core/hex';

/** Grass hexes out to 2 rings around 0,0; `ring1[i]` customises the neighbour in DIRECTIONS[i]. */
function world(center: Partial<Cell> = {}, ring1: Partial<Cell>[] = []): Battle {
  const cells: Battle['cells'] = {};
  for (const at of hexesWithin(hex(0, 0), 2)) {
    cells[hexKey(at)] = { at, obstacle: false, flammable: true, water: false, fire: 'none', ground: 'grass' };
  }
  Object.assign(cells[hexKey(hex(0, 0))], center);
  ring1.forEach((extra, i) => Object.assign(cells[hexKey(hexAdd(hex(0, 0), DIRECTIONS[i]))], extra));
  return { cells, units: [] };
}

const DAY: Environment = { time: 'day', sky: 'clear', windForce: 1, windDir: 0 };
const NIGHT: Environment = { ...DAY, time: 'night' };
const read = (b: Battle, env: Environment = DAY, opts?: FilamentOptions) => readHex(b, hex(0, 0), env, opts)!;

describe('filaments: conditions', () => {
  it('a plain meadow on a clear day', () => {
    const r = read(world());
    expect(r.foto.level).toBe(1); // clear day: +1
    expect(r.hydro.level).toBe(-1); // no water near: weak
    expect(r.skoto.level).toBe(-3); // daylight: magic-dead
    expect(r.pyro.level).toBe(-2); // no fire: very weak
    expect(r.pneumo.level).toBe(-1); // light breeze: weak
  });

  it('rain lifts dry land to normal water, a downpour to strong', () => {
    expect(read(world(), { ...DAY, sky: 'rain' }).hydro.level).toBe(0);
    expect(read(world(), { ...DAY, sky: 'storm' }).hydro.level).toBe(1);
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

  it('a cloud over the hex dims light and deepens darkness', () => {
    const cloudy = { ...DAY, sky: 'cloudy' as const };
    const under = read(world(), cloudy, { isClouded: () => true });
    const sunny = read(world(), cloudy, { isClouded: () => false });
    expect(sunny.skoto.level).toBe(-3);
    expect(under.skoto.level).toBe(-1);
    expect(under.foto.level).toBe(-1);
  });

  it('trees cast shadows: south-east by day', () => {
    const b = world({}, [{}, {}, { feature: 'tree' }]); // tree to the north-west
    expect(read(b).skoto.level).toBe(-2);
  });
});

describe('filaments: sources radiate', () => {
  it('water around you, plus weather, can reach the extreme', () => {
    const b = world({}, [{ ground: 'river' }, { ground: 'river' }]);
    expect(read(b, { ...DAY, sky: 'rain' }).hydro.level).toBe(2);
    expect(read(b, { ...DAY, sky: 'storm' }).hydro.level).toBe(3);
  });

  it('standing in the river is strong, not extreme, unless it pours', () => {
    const b = world({ ground: 'ford' }, [{ ground: 'river' }, { ground: 'river' }]);
    expect(read(b).hydro.level).toBe(1);
    expect(read(b, { ...DAY, sky: 'storm' }).hydro.level).toBe(3);
  });

  it('clear day: light +2 around water', () => {
    expect(read(world({}, [{ ground: 'river' }])).foto.level).toBe(2);
  });

  it('trees radiate life and darkness at night', () => {
    const b = world({}, [{ feature: 'tree' }, { feature: 'pine' }, { feature: 'tree' }]);
    expect(read(b).bio.level).toBe(1);
    expect(read(b, NIGHT).skoto.level).toBe(1);
  });

  it('cloud deepens the dark by day but works the other way at night (it hides the moon and stars)', () => {
    const open = world();
    expect(read(open, { ...DAY, sky: 'rain' }).skoto.raw).toBeGreaterThan(read(open, DAY).skoto.raw);
    expect(read(open, { ...NIGHT, sky: 'rain' }).skoto.raw).toBeLessThan(read(open, NIGHT).skoto.raw);
  });

  it('heat and cold follow the hour and the weather, and a fire warms its surroundings', () => {
    const open = world();
    const noon = { ...DAY, hour: 12 };
    expect(read(open, noon).termo.raw).toBeGreaterThan(read(open, NIGHT).termo.raw);
    expect(read(open, NIGHT).kryo.raw).toBeGreaterThan(read(open, noon).kryo.raw);
    const fire = world({}, [{ fire: 'burning' }]);
    expect(read(fire, NIGHT).termo.raw).toBeGreaterThan(read(open, NIGHT).termo.raw);
    expect(read(fire, NIGHT).kryo.raw).toBeLessThan(read(open, NIGHT).kryo.raw);
  });

  it('the sky aspects read the clock: sun by day, stars and moon by night, the moon by its phase, clouds hide them', () => {
    const open = world();
    expect(read(open, { ...DAY, hour: 12 }).helio.level).toBeGreaterThanOrEqual(1);
    expect(read(open, { ...NIGHT, hour: 0 }).helio.level).toBe(-3);
    const full = { ...NIGHT, hour: 0, moon: 0.5 }, newMoon = { ...NIGHT, hour: 0, moon: 0 };
    expect(read(open, full).selene.raw).toBeGreaterThan(read(open, newMoon).selene.raw);
    expect(read(open, newMoon).astro.raw).toBeGreaterThan(read(open, full).astro.raw); // a bright moon washes the stars out
    expect(read(open, { ...DAY, hour: 12 }).astro.level).toBe(-3);
    expect(read(open, { ...full, sky: 'cloudy' }).selene.raw).toBeLessThanOrEqual(read(open, full).selene.raw);
    expect(read(open, { ...full, sky: 'rain' }).selene.raw).toBeLessThan(read(open, full).selene.raw);
    expect(read(open, { ...newMoon, sky: 'rain' }).astro.raw).toBeLessThan(read(open, newMoon).astro.raw);
    expect(read(world({ indoors: true }), full).astro.level).toBe(-3);
  });

  it('fire warms its neighbours, more so with more fire', () => {
    expect(read(world({ fire: 'burning' })).pyro.level).toBe(2); // in the fire
    expect(read(world({}, [{ fire: 'burning' }])).pyro.level).toBe(1); // next to one
    expect(read(world({}, [{ fire: 'burning' }, { fire: 'burning' }])).pyro.level).toBe(2); // between two
    const inferno = world({ fire: 'burning' }, [{ fire: 'burning' }]);
    expect(read(inferno).pyro.level).toBe(3);
    expect(read(inferno, NIGHT).skoto.level).toBe(-3);
  });

  it('two hexes from a fire you still feel it', () => {
    const b = world();
    b.cells[hexKey(hex(2, 0))].fire = 'burning';
    expect(read(b).pyro.level).toBe(-1);
  });

  it('stone: strong right next to it, fading fast', () => {
    const b = world({}, [{ feature: 'rock' }]);
    expect(read(b).geo.level).toBe(1);
    const far = world();
    far.cells[hexKey(hex(2, 0))].feature = 'rock';
    expect(read(far).geo.level).toBe(0);
  });

  it('the dead and the undead radiate necrotropy', () => {
    expect(read(world({ corpses: 2 })).nekro.level).toBe(3);
    expect(read(world({}, [{ corpses: 2 }])).nekro.level).toBe(2);
    const b = world();
    const skel: Unit = { id: 's', kind: 'skeleton', name: 's', team: 'foe', at: hex(1, 0), hp: 5, maxHp: 5 };
    b.units.push(skel);
    expect(read(b, DAY, { isUndead: () => true }).nekro.level).toBe(1);
  });

  it('death is normal in the open and a little weaker under living trees, never stronger', () => {
    expect(read(world()).nekro.raw).toBe(0);
    expect(read(world({ ground: 'forest' })).nekro.raw).toBeLessThan(0);
  });

  it('friends radiate life to the hexes around them', () => {
    const b = world();
    b.units.push({ id: 'a', kind: 'x', name: 'a', team: 'party', at: hex(1, 0), hp: 5, maxHp: 5 });
    expect(read(b).bio.level).toBe(1); // next to a friend
    b.units.push({ id: 'b', kind: 'x', name: 'b', team: 'party', at: hex(0, 0), hp: 5, maxHp: 5 });
    expect(read(b).bio.level).toBe(1); // capped: no runaway stacking
  });

  it('explains every contribution', () => {
    const r = read(world({}, [{ ground: 'river' }]), { ...DAY, sky: 'rain' });
    expect(r.hydro.parts.map((p) => p.label)).toEqual(['Dry land', 'Rain', 'Water ×1 nearby']);
  });
});

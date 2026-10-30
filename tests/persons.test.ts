import { describe, expect, it } from 'vitest';
import { folkOf } from '../src/art/folk';
import { mapNamed } from '../src/content/maps';
import { FACETS, PERSON_KINDS } from '../src/content/people';
import { THINGS } from '../src/content/things';
import { PersonKinds } from '../src/core/persons';
import { stepBeat } from '../src/core/world3d/actors';
import { compileMap } from '../src/core/world3d/mapgen';

/** Kinds of person (`content/people/kinds/`): a person is a kind of their people and of their calling at once. */

describe('kinds of person', () => {
  it('every kind can be drawn, whatever the seed', () => {
    for (const id of PERSON_KINDS.kinds) {
      for (const seed of [1, 2, 3, 17, 99]) expect(() => folkOf(PERSON_KINDS.resolve({ is: [id], seed }).look, seed), `${id} ${seed}`).not.toThrow();
    }
  });

  it('a person is a kind of their people and of their calling: a dwarf innkeeper has a dwarf body in an innkeeper apron', () => {
    const r = PERSON_KINDS.resolve({ is: ['dwarf', 'job-innkeeper'], seed: 4 });
    expect(r.facets).toEqual({ people: 'dwarf', station: 'job-innkeeper' });
    expect(r.chain).toEqual(['dwarf', 'station', 'merchant', 'job-innkeeper']);
    expect(r.look.build).toBe('stout');
    expect(r.look.beard).toBe('full');
    expect(r.look.apron).toBe('white');
  });

  it('a people takes its family body: an Asharian is a human', () => {
    const r = PERSON_KINDS.resolve({ is: ['asharier'], seed: 3 });
    expect(r.facets.people).toBe('asharier');
    expect(r.chain).toEqual(['human', 'asharier']);
    expect(['fair', 'tan', 'brown', 'ruddy']).toContain(r.look.skin);
  });

  it('carries more dimensions than two: a faith and a realm sit beside the people and the calling', () => {
    const r = PERSON_KINDS.resolve({ is: ['marnakh', 'job-farmer', 'samorism', 'asharien'] });
    expect(r.facets).toEqual({ people: 'marnakh', station: 'job-farmer', faith: 'samorism', realm: 'asharien' });
  });

  it('someone of no people given is human, and the more specific of two in one line wins', () => {
    expect(PERSON_KINDS.resolve({ is: ['job-farmer'] }).facets.people).toBe('human');
    expect(PERSON_KINDS.resolve({ is: ['human', 'asharier'] }).facets.people).toBe('asharier');
  });

  it('nobody is two peoples, or a kind nobody defined', () => {
    expect(() => PERSON_KINDS.resolve({ is: ['dwarf', 'elf'] })).toThrow(/both dwarf and elf/);
    expect(() => PERSON_KINDS.resolve({ is: ['dragon'] })).toThrow(/no kind of person called dragon/);
    expect(PERSON_KINDS.problem({ is: ['dwarf', 'elf'] })).toMatch(/two peoples/);
    expect(PERSON_KINDS.problem({ is: ['dwarf', 'job-farmer'] })).toBeNull();
  });

  it('a seed chooses among a kind\'s choices, the same every time; a person\'s own look wins, and `none` takes a part off', () => {
    const a = PERSON_KINDS.resolve({ is: ['human'], seed: 5 }).look;
    expect(PERSON_KINDS.resolve({ is: ['human'], seed: 5 }).look).toEqual(a);
    const skins = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((seed) => PERSON_KINDS.resolve({ is: ['human'], seed }).look.skin));
    expect(skins.size).toBeGreaterThan(1);
    const own = PERSON_KINDS.resolve({ is: ['dwarf', 'job-innkeeper'], look: { skin: 'brown', apron: 'none' } }).look;
    expect(own.skin).toBe('brown');
    expect(own.apron).toBeUndefined();
    expect(own.vest).toBe('wine');
  });

  it('a new kind is made of others; a facet gets its place from the library and takes no `is`', () => {
    const kinds = new PersonKinds([
      { id: 'dwarf', look: { build: 'stout' } },
      { id: 'job-soldier', look: { right: 'spear' } },
      { id: 'sellsword', is: ['marnakh', 'job-soldier'], look: { vest: 'steel' } },
    ], FACETS);
    const r = kinds.resolve({ is: ['sellsword'] });
    expect(r.facets).toEqual({ people: 'marnakh', station: 'job-soldier' });
    expect(r.look).toMatchObject({ right: 'spear', vest: 'steel' });
    expect(() => new PersonKinds([{ id: 'dwarf', is: ['human'] }], FACETS)).toThrow(/takes no `is`/);
    expect(() => new PersonKinds([{ id: 'ghost' }], FACETS)).toThrow(/must say what it is a kind of/);
    expect(() => new PersonKinds([{ id: 'a', is: ['b'] }, { id: 'b', is: ['a'] }], FACETS)).toThrow(/loop/);
    expect(() => new PersonKinds([{ id: 'half', is: ['dwarf', 'elf'] }], FACETS)).toThrow(/both/);
  });
});

describe('the cast of a map', () => {
  const base = { name: 't', seed: 1, size: 60, roads: [{ pts: [[-30, 0], [30, 0]] as [number, number][], width: 3 }], houses: [{ id: 'inn', at: { x: 0, z: -10 } }], hero: [0, 4] as [number, number] };

  it('comes from the map: a beat along a road is points off its middle, and a round names its house', () => {
    const c = compileMap({
      ...base,
      people: [
        { id: 'walker', is: ['human', 'job-miller'], routine: { beat: { road: 0 } } },
        { id: 'keeper', is: ['dwarf', 'job-innkeeper'], routine: { rounds: 'inn' } },
      ],
    }, THINGS, PERSON_KINDS);
    expect(c.problems).toEqual([]);
    expect(c.cast.map((p) => p.id)).toEqual(['walker', 'keeper']);
    const beat = (c.cast[0].routine as { beat: [number, number][] }).beat;
    expect(beat.length).toBe(4);
    expect(beat[0][0]).toBeCloseTo(-18, 0);
    expect(beat[3][0]).toBeCloseTo(18, 0);
    expect(c.cast[1].routine).toEqual({ rounds: 'inn' });
  });

  it('reports a person nobody can be, a round of no house, and two of one name', () => {
    const c = compileMap({
      ...base,
      people: [
        { id: 'x', is: ['dwarf', 'elf'], routine: { beat: [[0, 0], [1, 0]] } },
        { id: 'x', is: ['human'], routine: { rounds: 'castle' } },
      ],
    }, THINGS, PERSON_KINDS);
    expect(c.problems).toEqual(expect.arrayContaining([
      expect.stringMatching(/person x: a person can't be both dwarf and elf/),
      'person x: no house castle to go the rounds of',
      'two people are called x',
    ]));
  });

  it('the hamlet has its villager and an innkeeper going the rounds of the inn', () => {
    expect(mapNamed('hamlet').cast.map((p) => [p.id, p.routine])).toEqual([
      ['villager', { beat: expect.any(Array) }],
      ['keeper', { rounds: 'inn' }],
    ]);
  });

  it('a beat goes there and back', () => {
    const b = { pts: [[0, 0], [10, 0]] as [number, number][], s: 0 };
    expect(stepBeat(b, 5, 1)).toMatchObject({ x: 5, z: 0, dx: 10 });
    expect(stepBeat(b, 10, 1)).toMatchObject({ x: 5, dx: -10 });
    expect(stepBeat({ pts: [[0, 0]], s: 0 }, 1)).toBeNull();
  });
});

describe('the torch by a door', () => {
  it('is a kind of fire the map puts beside the door of a house that asks for one', () => {
    const c = mapNamed('spike');
    const torches = c.layout.props.filter((p) => p.kind === 'walltorch');
    expect(torches.length).toBe(1);
    const home = c.layout.houses.find((h) => h.id === 'home')!;
    expect(Math.hypot(torches[0].x - home.x, torches[0].z - home.z)).toBeLessThan(4);
    expect(THINGS.get('walltorch').chain).toContain('fire');
    expect(THINGS.shapes(torches[0])).toEqual([]);
  });
});

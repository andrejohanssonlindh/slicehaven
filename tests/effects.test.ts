import { describe, expect, it } from 'vitest';
import { BURNING } from '../src/content/effects/burning';
import { THINGS } from '../src/content/things';
import { type Burnable, type FireSource, type PersonInFire, burnRound, personFireRound } from '../src/core/world3d/effects';
import { unhurt } from '../src/core/damage';
import { WOUND_TABLES } from '../src/content/wounds';
import { Rng } from '../src/core/rng';

const thing = (id: string, x: number, material: Burnable['material'] = 'straw', more: Partial<Burnable> = {}): Burnable =>
  ({ id, kind: 'pallet', material, x, z: 0, house: null, level: 0, burning: 0, burnt: false, spent: 0, wet: 0, ...more });
const campfire: FireSource = { id: 'fire', x: 0, z: 0, house: null, level: 0, dice: 2 };

/** Run rounds, applying the changes as the world does; returns the things. */
function run(things: Burnable[], sources: FireSource[], rounds: number, seed = 1): Burnable[] {
  const rng = Rng.fromSeed(seed);
  for (let r = 0; r < rounds; r++) {
    for (const c of burnRound(things, sources, BURNING, rng)) {
      const t = things.find((x) => x.id === c.id)!;
      t.burning = c.burning;
      if (c.burnt) t.burnt = true;
    }
  }
  return things;
}

describe('effects: burning (B7)', () => {
  it('straw next to a campfire catches at once, and burns up to its peak', () => {
    const [s] = run([thing('s', 0.5)], [campfire], 4);
    expect(s.burning).toBe(BURNING.materials.straw.peak);
  });

  it('nothing catches out of reach, or on another storey, or in another house', () => {
    const things = run([thing('far', 5), thing('up', 0.5, 'straw', { level: 1 }), thing('in', 0.5, 'straw', { house: 'h' })], [campfire], 10);
    expect(things.every((t) => t.burning === 0)).toBe(true);
  });

  it('fire spreads along a row of straw, one bale from the next', () => {
    const row = [0.5, 1.4, 2.3, 3.2].map((x, i) => thing(`b${i}`, x));
    run(row, [campfire], 8);
    expect(row.every((t) => t.burning > 0 || t.burnt)).toBe(true);
  });

  it('in a storm a small fire goes out, and a campfire can hardly set anything alight', () => {
    const [lit] = run([thing('s', 0.5, 'straw', { burning: 1, wet: 4 })], [], 1);
    expect(lit.burning).toBe(0);
    const wet = run([thing('w', 0.5, 'wood', { wet: 4 })], [campfire], 20);
    expect(wet[0].burning).toBe(0);
  });

  it('runs out of fuel and is burnt', () => {
    const rounds = Math.ceil(BURNING.materials.straw.fuel / BURNING.round) + 2;
    const [s] = run([thing('s', 0.5, 'straw', { burning: 1 })], [], rounds);
    expect(s).toMatchObject({ burnt: true, burning: 0 });
  });

  it('wood is far harder to catch than straw (the rules: 10 against 2)', () => {
    let straw = 0, wood = 0;
    for (let seed = 0; seed < 60; seed++) {
      if (run([thing('s', 0.5)], [campfire], 1, seed)[0].burning) straw++;
      if (run([thing('w', 0.5, 'wood')], [campfire], 1, seed)[0].burning) wood++;
    }
    expect(straw).toBeGreaterThan(55);
    expect(wood).toBeLessThan(straw / 2);
  });

  it('someone standing in a fire is burned, more each round they stay; out of it, nothing', () => {
    const rng = Rng.fromSeed(3);
    const p = (x: number, exposed = 0): PersonInFire => ({ x, z: 0, house: null, level: 0, injuries: unhurt(), vitality: { n: 3, mod: 0 }, speed: { n: 3, mod: 0 }, wet: 0, water: 0, exposed });
    const big: FireSource = { ...campfire, dice: 4 };
    const inIt = personFireRound(p(0.2), [big], WOUND_TABLES, rng);
    expect(inIt.hit).not.toBeNull();
    expect(inIt.hit!.damageRoll.dice.n).toBe(4);
    expect(inIt.exposed).toBe(1);
    expect(personFireRound(p(0.2, 2), [big], WOUND_TABLES, rng).hit!.damageRoll.dice.n).toBe(6);
    const away = personFireRound(p(1.5), [big], WOUND_TABLES, rng);
    expect(away).toMatchObject({ hit: null, putOut: null, exposed: 0 });
  });

  it('someone alight tries to put it out (Speed, with water at hand), and burns at the end of the round if not', () => {
    let out = 0, outWet = 0;
    for (let seed = 0; seed < 40; seed++) {
      const alight = { ...unhurt(), ignited: { heat: 2, diff: 12 } };
      const base: PersonInFire = { x: 9, z: 9, house: null, level: 0, injuries: alight, vitality: { n: 3, mod: 0 }, speed: { n: 2, mod: 0 }, wet: 0, water: 0, exposed: 0 };
      const dry = personFireRound(base, [], WOUND_TABLES, Rng.fromSeed(seed));
      if (!dry.injuries.ignited) out++;
      else expect(dry.injuries.fatigue).toBeGreaterThanOrEqual(2);
      if (!personFireRound({ ...base, water: 3 }, [], WOUND_TABLES, Rng.fromSeed(seed)).injuries.ignited) outWet++;
    }
    expect(outWet).toBeGreaterThan(out);
  });

  it('standing furniture can be smashed, harder the sturdier: a pallet, a stool, a table, a bed', () => {
    const tough = (k: string) => THINGS.get(k).toughness;
    expect(tough('pallet')).toBe(5);
    expect(tough('stool')).toBe(11);
    expect(tough('table')).toBe(18);
    expect(tough('bed')).toBe(20);
    expect(THINGS.get('stool').states?.broken).toEqual({ default: false });
    // A hung shelf and a rug aren't smashed; a hearth isn't either.
    expect(tough('shelf')).toBeUndefined();
    expect(tough('rug')).toBeUndefined();
    expect(tough('hearth')).toBeUndefined();
  });

  it('what has a material can be burning and burnt; what has none (stone, iron, a hearth) cannot', () => {
    expect(THINGS.get('stool').states).toMatchObject({ burning: { default: 0 }, burnt: { default: false } });
    expect(THINGS.get('haybale').material).toBe('straw');
    expect(THINGS.get('anvil').states?.burning).toBeUndefined();
    expect(THINGS.get('hearth').material).toBeUndefined();
    // Only open fires set things alight; a hearth keeps its fire to itself.
    expect(THINGS.get('campfire').spreads).toBe(2);
    expect(THINGS.get('hearth').spreads).toBeUndefined();
    expect(THINGS.get('bucket').douses).toBe(3);
  });
});

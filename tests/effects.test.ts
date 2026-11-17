import { describe, expect, it } from 'vitest';
import { BURNING } from '../src/content/effects/burning';
import { THINGS } from '../src/content/things';
import { type Burnable, type FireSource, burnRound } from '../src/core/world3d/effects';
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

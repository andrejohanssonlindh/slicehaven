import { describe, expect, it } from 'vitest';
import { rollOn, newChar } from '../src/core/chargen/state';
import { test as check } from '../src/core/checks';
import { rollOpen, rollPool, rollTable, rollTest, rollText } from '../src/core/dice';
import { Rng } from '../src/core/rng';

/** A die that rolls what it's told, in order (the faces 1..6 as `rng.int(6)` would give them). */
const loaded = (...faces: number[]): Rng => {
  const r = Rng.fromSeed(1);
  let i = 0;
  (r as unknown as { int: (n: number) => number }).int = () => faces[i++] - 1;
  return r;
};

describe('the one roll system (B2)', () => {
  it('open rolls: a six is taken away and rolls two new dice, which know where they came from', () => {
    const r = rollOpen({ n: 2, mod: 1 }, loaded(6, 3, 6, 2, 4, 5));
    // 6 (splits) · 3 · then the six's two: 6 (splits again) · 2 · then that six's two: 4 · 5
    expect(r.faces).toEqual([6, 3, 6, 2, 4, 5]);
    expect(r.rolled.map((d) => d.from)).toEqual([null, null, 0, 0, 2, 2]);
    expect(r.kept).toEqual([3, 2, 4, 5]);
    expect(r.total).toBe(15);
    expect(rollText(r)).toBe('6↺ · 3 · 6↺ · 2 · 4 · 5 +1 = 15');
  });

  it('open rolls give the same faces from the same seed as before the move (saved fights replay)', () => {
    // The old roller drew one number per die, in order; so does this one.
    const a = rollOpen({ n: 5, mod: 0 }, Rng.fromSeed('replay'));
    const rng = Rng.fromSeed('replay');
    let pending = 5;
    const faces: number[] = [];
    while (pending > 0) {
      pending--;
      const f = 1 + rng.int(6);
      faces.push(f);
      if (f === 6) pending += 2;
    }
    expect(a.faces).toEqual(faces);
  });

  it('a pool of nothing rolls nothing and comes to 0', () => {
    const r = rollOpen({ n: 0, mod: 2 }, Rng.fromSeed(3));
    expect(r.rolled).toEqual([]);
    expect(r.total).toBe(0);
  });

  it('plain pools count sixes as six and never split', () => {
    const r = rollPool({ n: 3, mod: 2 }, loaded(6, 6, 1));
    expect(r.faces).toEqual([6, 6, 1]);
    expect(r.total).toBe(15);
  });

  it('table rolls are one die of any size', () => {
    const rng = Rng.fromSeed(9);
    for (let i = 0; i < 200; i++) {
      const r = rollTable(100, rng);
      expect(r.total).toBeGreaterThanOrEqual(1);
      expect(r.total).toBeLessThanOrEqual(100);
      expect(r.kind).toBe('table');
    }
    expect(rollText(rollTable(10, loaded(7)))).toBe('D10: 7');
  });

  it('tests: success at the difficulty, an advantage for every full 5 over it', () => {
    const r = rollTest({ n: 3, mod: 0 }, 6, loaded(5, 5, 5));
    expect(r).toMatchObject({ total: 15, target: 6, success: true, advantages: 1 });
    expect(rollTest({ n: 1, mod: 0 }, 6, loaded(5)).success).toBe(false);
    // The skill checks are the same rolls.
    expect(check({ n: 3, mod: 0 }, 6, loaded(5, 5, 5))).toMatchObject({ success: true, advantages: 1, difficulty: 6 });
  });

  it('the creator rolls on its tables through it, advancing the character’s seed', () => {
    const c = newChar();
    const seed = c.seed;
    const r = rollOn(c, 100, 'Homeland');
    expect(r).toMatchObject({ kind: 'table', sides: 100, label: 'Homeland' });
    expect(c.seed).not.toBe(seed);
  });
});

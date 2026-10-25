import { describe, expect, it } from 'vitest';
import type { Battle } from '../src/core/battle';
import type { Environment } from '../src/core/environment';
import { hex, hexKey, hexesWithin } from '../src/core/hex';
import { Rng } from '../src/core/rng';
import { ignite, newWorld, stepWorld } from '../src/core/world';

function forest(): Battle {
  const cells: Battle['cells'] = {};
  for (const at of hexesWithin(hex(0, 0), 3)) {
    cells[hexKey(at)] = { at, obstacle: false, flammable: true, water: false, fire: 'none', ground: 'tallgrass' };
  }
  return { cells, units: [] };
}

const env: Environment = { time: 'day', sky: 'clear', windForce: 4, windDir: 0 };

describe('world step', () => {
  it('clouds drift with the wind', () => {
    const w = newWorld();
    stepWorld(forest(), env, w, Rng.fromSeed(1));
    expect(w.cloudX).toBeGreaterThan(1);
    expect(w.cloudY).toBeCloseTo(0);
    expect(w.turn).toBe(2);
  });

  it('fire burns out after its turns and spreads mostly downwind', () => {
    let east = 0;
    let west = 0;
    for (let seed = 0; seed < 200; seed++) {
      const b = forest();
      ignite(b.cells[hexKey(hex(0, 0))], env);
      stepWorld(b, env, newWorld(), Rng.fromSeed(seed));
      if (b.cells[hexKey(hex(1, 0))].fire !== 'none') east++;
      if (b.cells[hexKey(hex(-1, 0))].fire !== 'none') west++;
    }
    expect(east).toBeGreaterThan(west * 2);

    const b = forest();
    const c = b.cells[hexKey(hex(0, 0))];
    ignite(c, env);
    const w = newWorld();
    for (let i = 0; i < 4; i++) stepWorld(b, env, w, Rng.fromSeed(i));
    expect(c.fire).toBe('burnt');
  });

  it('rain slows the spread', () => {
    const spread = (sky: Environment['sky']) => {
      let n = 0;
      for (let seed = 0; seed < 200; seed++) {
        const b = forest();
        ignite(b.cells[hexKey(hex(0, 0))], { ...env, sky });
        n += stepWorld(b, { ...env, sky }, newWorld(), Rng.fromSeed(seed)).ignited.length;
      }
      return n;
    };
    expect(spread('rain')).toBeLessThan(spread('clear') / 2);
  });

  it('storms throw at most one bolt per turn', () => {
    for (let seed = 0; seed < 20; seed++) {
      const ev = stepWorld(forest(), { ...env, sky: 'storm' }, newWorld(), Rng.fromSeed(seed));
      expect(ev.strikes.length).toBeLessThanOrEqual(1);
    }
  });
});

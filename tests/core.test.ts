import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { hex, hexDistance, hexKey, hexToPixel, pixelToHex, reachable } from '../src/core/hex';
import { effectiveFaces, isExhausted, mustRest, newPool, rest, spend } from '../src/core/dice';
import { exportSave, importSave, newSave } from '../src/core/save';
import { MERCENARY } from '../src/content/heroes';

describe('rng', () => {
  it('is deterministic per seed', () => {
    const a = Rng.fromSeed('dead forest');
    const b = Rng.fromSeed('dead forest');
    expect([a.next(), a.next(), a.int(6)]).toEqual([b.next(), b.next(), b.int(6)]);
  });
});

describe('hex', () => {
  it('measures distance', () => {
    expect(hexDistance(hex(0, 0), hex(3, -1))).toBe(3);
  });
  it('round-trips pixel conversion', () => {
    const h = hex(2, -3);
    const p = hexToPixel(h, 24);
    expect(pixelToHex(p.x, p.y, 24)).toEqual(h);
  });
  it('finds reachable hexes around walls', () => {
    const wall = new Set([hexKey(hex(1, 0))]);
    const r = reachable(hex(0, 0), 1, (h) => !wall.has(hexKey(h)));
    expect(r.size).toBe(6); // start + 5 open neighbours
  });
});

describe('dice', () => {
  const blade = MERCENARY.dice[0];
  it('gear can remove a face (D6 -> D5) and buff a kind', () => {
    const faces = effectiveFaces(blade, [
      { type: 'removeFace', index: 5 },
      { type: 'bonus', kind: 'attack', amount: 1 },
    ]);
    expect(faces).toHaveLength(5);
    expect(faces[0]).toEqual({ kind: 'attack', value: 3 });
    expect(blade.faces[0].value).toBe(2); // original untouched
  });

  it('runs the spend / rest / lose loop', () => {
    let pool = newPool(['a', 'b', 'c']);
    pool = spend(spend(spend(pool, 'a'), 'b'), 'c');
    expect(mustRest(pool)).toBe(true);
    pool = rest(pool, 'b');
    expect(pool).toEqual({ ready: ['a', 'c'], spent: [], lost: ['b'] });
    pool = rest(spend(spend(pool, 'a'), 'c'), 'a');
    pool = spend(pool, 'c');
    expect(isExhausted(pool)).toBe(true);
  });
});

describe('save', () => {
  it('round-trips export/import', () => {
    const s = newSave();
    s.campaign.flags['met_åsa'] = true;
    expect(importSave(exportSave(s))).toEqual(s);
  });
});

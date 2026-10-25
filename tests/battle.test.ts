import { describe, expect, it } from 'vitest';
import {
  type Battle, type Unit, aiMove, isValidWalk, jumpTargets, pathFromReach, walkReach,
} from '../src/core/battle';
import { hex, hexKey, hexToOffset, offsetToHex } from '../src/core/hex';

function grid(w: number, h: number, obstacles: [number, number][] = []): Battle {
  const blocked = new Set(obstacles.map(([q, r]) => hexKey(hex(q, r))));
  const cells: Battle['cells'] = {};
  for (let q = 0; q < w; q++) {
    for (let r = 0; r < h; r++) {
      const at = hex(q, r);
      cells[hexKey(at)] = { at, obstacle: blocked.has(hexKey(at)), flammable: true, water: false, fire: 'none' };
    }
  }
  return { cells, units: [] };
}

const unit = (id: string, q: number, r: number, team: Unit['team'] = 'party'): Unit => ({
  id, kind: id, name: id, team, at: hex(q, r), hp: 5, maxHp: 5,
});

describe('offset coords', () => {
  it('round-trips', () => {
    for (const [c, r] of [[0, 0], [3, 1], [2, 4], [5, 7]]) expect(hexToOffset(offsetToHex(c, r))).toEqual({ col: c, row: r });
  });
});

describe('walk', () => {
  it('goes around obstacles', () => {
    const b = grid(5, 1, [[1, 0]]);
    const u = unit('h', 0, 0);
    b.units.push(u);
    expect(walkReach(b, u, 4).has(hexKey(hex(2, 0)))).toBe(false); // 1-row map: wall blocks
  });

  it('passes through allies but not enemies, and cannot stop on allies', () => {
    const b = grid(4, 1);
    const u = unit('h', 0, 0);
    b.units.push(u, unit('ally', 1, 0));
    const reach = walkReach(b, u, 3);
    expect(reach.get(hexKey(hex(1, 0)))?.canStop).toBe(false);
    expect(pathFromReach(reach, hex(2, 0))).toEqual(['1,0', '2,0']);
    b.units[1].team = 'foe';
    expect(walkReach(b, u, 3).has(hexKey(hex(2, 0)))).toBe(false);
  });

  it('validates hand-plotted paths', () => {
    const b = grid(4, 4);
    const u = unit('h', 0, 0);
    b.units.push(u);
    expect(isValidWalk(b, u, [hex(1, 0), hex(1, 1), hex(0, 2)], 3)).toBe(true);
    expect(isValidWalk(b, u, [hex(1, 0), hex(0, 2)], 3)).toBe(false); // not adjacent
    expect(isValidWalk(b, u, [hex(1, 0), hex(2, 0), hex(3, 0), hex(3, 1)], 3)).toBe(false); // too long
  });
});

describe('jump', () => {
  it('jumps over obstacles in straight lines only', () => {
    const b = grid(5, 3, [[1, 0]]);
    const u = unit('h', 0, 0);
    b.units.push(u);
    const t = jumpTargets(b, u, 2).map(hexKey);
    expect(t).toContain('2,0'); // over the obstacle
    expect(t).not.toContain('1,1'); // 2 away, but not on any of the six lines
  });
});

describe('ai', () => {
  it('moves next to the nearest enemy', () => {
    const b = grid(6, 1);
    const foe = unit('wolf', 0, 0, 'foe');
    b.units.push(foe, unit('h', 5, 0));
    const { path, target } = aiMove(b, foe, 3);
    expect(target?.id).toBe('h');
    expect(path).toEqual(['1,0', '2,0', '3,0']);
  });
});

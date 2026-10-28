import { describe, expect, it } from 'vitest';
import { buildVillage, makeStuff } from '../src/content/village/build';
import { PEOPLE } from '../src/content/village/folk';
import { COLS, HOUSES, ROWS, STUFF, VILLAGERS, groundMap } from '../src/content/village/reedwater';

/** The hexes a house's footprint covers: its anchor is front-centre, it reaches back three rows. */
function footprint(h: (typeof HOUSES)[number]): string[] {
  const w = h.spec.cols ?? 4;
  const out: string[] = [];
  for (let r = h.row - 2; r <= h.row; r++) for (let c = h.col - Math.floor((w - 1) / 2); c < h.col - Math.floor((w - 1) / 2) + w; c++) out.push(`${c},${r}`);
  return out;
}

describe('Reedwater', () => {
  const map = groundMap();

  it('has a map of the stated size, made of known ground', () => {
    expect(map).toHaveLength(ROWS);
    for (const row of map) {
      expect(row).toHaveLength(COLS);
      expect(row).toMatch(/^[gtwfpmo]+$/);
    }
  });

  it('has about fifteen houses, and furnishes at least half of them', () => {
    expect(HOUSES.length).toBe(15);
    expect(HOUSES.filter((h) => h.room).length).toBeGreaterThanOrEqual(8);
  });

  it('keeps houses on land, off the roads, and clear of each other', () => {
    const used = new Map<string, string>();
    for (const h of HOUSES) {
      for (const k of footprint(h)) {
        const [c, r] = k.split(',').map(Number);
        expect(c, `${h.id} off the map`).toBeGreaterThanOrEqual(0);
        expect(c, `${h.id} off the map`).toBeLessThan(COLS);
        expect(r, `${h.id} off the map`).toBeGreaterThanOrEqual(0);
        expect('gtwf', `${h.id} stands on ${map[r][c]} at ${k}`).toContain(map[r][c]);
        expect(used.get(k), `${h.id} overlaps ${used.get(k)} at ${k}`).toBeUndefined();
        used.set(k, h.id);
      }
    }
  });

  it('has a lake, a plaza of mud, and a road in from both sides with a way round', () => {
    const flat = map.join('');
    expect(flat).toContain('o');
    expect(map[14][0]).toBe('p');
    expect(map[14][COLS - 1]).toBe('p');
    expect(map[17].slice(14, 26)).toBe('m'.repeat(12));
    // The bypass: south of the village, joined to the road at both ends.
    for (let r = 15; r <= 28; r++) expect(map[r][1], `west bypass at row ${r}`).toBe('p');
    for (let r = 15; r <= 28; r++) expect(map[r][COLS - 1], `east bypass at row ${r}`).toBe('p');
    expect(map[28].slice(1)).toBe('p'.repeat(COLS - 1));
  });

  it('puts nobody and nothing in the lake', () => {
    for (const [kind, c, r] of STUFF.filter(([k]) => !/lilypads|log|dragonfly/.test(k))) expect(map[r][c], `${kind} at ${c},${r}`).not.toBe('o');
    for (const v of VILLAGERS) expect(map[v.row][v.col], v.id).not.toBe('o');
  });

  it('knows how to draw everything it places and everyone', () => {
    for (const [kind, , , , , seed] of STUFF) expect(makeStuff(kind, seed, 'summer').frames.length, kind).toBeGreaterThan(0);
    for (const v of VILLAGERS) expect(PEOPLE[v.look], `${v.id}: ${v.look}`).toBeDefined();
    const ids = new Set(VILLAGERS.map((v) => v.id));
    expect(ids.size).toBe(VILLAGERS.length);
  });

  it('builds the whole village, with an inside for every furnished house', () => {
    const v = buildVillage();
    expect(v.cells).toHaveLength(COLS * ROWS);
    for (const h of v.houses) {
      if (h.def.room && !h.def.workshop) expect(h.inside, h.def.id).toBeDefined();
      if (h.inside) expect(h.inside.ax).toBe(h.outside.ax); // swaps in place
    }
  });
});

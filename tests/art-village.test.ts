import { describe, expect, it } from 'vitest';
import {
  makeBarrels, makeCrates, makeFence, makeHaystack, makeLantern, makeStall, makeWell, makeWoodpile,
} from '../src/art/buildings';
import { FOLK, makeFolk } from '../src/art/folk';
import { FURNITURE } from '../src/art/furniture';
import * as humble from '../src/art/humble';
import { SHRUB_KINDS, makeShrub } from '../src/art/scrub';
import { makeHouse } from '../src/art/houses';
import { makeRoom, makeSmithy } from '../src/art/interior';
import { makeBoulder, makeLilies, makeOak, makeOutcrop, makePebbles, makeReeds, makeStump } from '../src/art/rough';
import type { Prop } from '../src/art/grit';

const opaque = (p: Prop): number => {
  const f = p.frames[0];
  let n = 0;
  for (let i = 3; i < f.data.length; i += 4) if (f.data[i]) n++;
  return n;
};

const same = (a: Prop, b: Prop): boolean => a.frames.every((f, i) => f.data.every((v, k) => v === b.frames[i].data[k]));

describe('village art', () => {
  const all: [string, () => Prop][] = [
    ['oak', () => makeOak(3)],
    ['boulder', () => makeBoulder(4)],
    ['outcrop', () => makeOutcrop(9)],
    ['pebbles', () => makePebbles(2)],
    ['stump', () => makeStump(5)],
    ['reeds', () => makeReeds(3)],
    ['lilies', () => makeLilies(3)],
    ['house', () => makeHouse({ seed: 5 })],
    ['tavern', () => makeHouse({ seed: 9, cols: 5, roof: 'shingle', shop: 'tankard' })],
    ['well', () => makeWell(2)],
    ['barrels', () => makeBarrels(4)],
    ['crates', () => makeCrates(3)],
    ['stall', () => makeStall(2, 'fruit')],
    ['smithy', () => makeSmithy({ seed: 7 })],
    ['room', () => makeRoom({ seed: 5 })],
    ['humble room', () => makeRoom({ seed: 5, humble: true })],
    ...humble.humbleItems().map((it, i): [string, () => Prop] => [`humble item ${i}`, () => it.prop]),
    ...SHRUB_KINDS.map((k): [string, () => Prop] => [`shrub ${k}`, () => makeShrub(3, k)]),
    ...Object.entries(FURNITURE).map(([k, f]): [string, () => Prop] => [`furniture ${k}`, f]),
    ['haystack', () => makeHaystack(3)],
    ['woodpile', () => makeWoodpile(2)],
    ['fence', () => makeFence(2)],
    ['lantern', () => makeLantern()],
    ...Object.entries(FOLK).map(([k, spec]): [string, () => Prop] => [`folk ${k}`, () => makeFolk(spec)]),
  ];

  it.each(all)('%s draws something and is repeatable', (_name, make) => {
    const a = make();
    expect(opaque(a)).toBeGreaterThan(40);
    expect(a.frames.length).toBeGreaterThan(0);
    expect(same(a, make())).toBe(true);
    // The anchor must lie inside the picture.
    expect(a.ax).toBeGreaterThanOrEqual(0);
    expect(a.ax).toBeLessThan(a.frames[0].w);
    expect(a.ay).toBeLessThanOrEqual(a.frames[0].h + 2);
  });

  it('a house is a person-scaled volume covering about 4 by 3 hexes', () => {
    const h = makeHouse({ seed: 5 });
    expect(h.footprint).toEqual({ cols: 4, rows: 3 });
    // 32 px hex across, 4 hexes: the front wall is at least 100 px wide; a 36 px person fits a door with room above.
    expect(h.frames[0].w).toBeGreaterThan(140);
    expect(h.frames[0].h).toBeGreaterThan(120);
    expect(makeHouse({ seed: 9, cols: 5 }).footprint?.cols).toBe(5);
  });

  it('different seeds give different trees', () => {
    expect(same(makeOak(3), makeOak(4))).toBe(false);
  });

  it('trees and people animate', () => {
    expect(same({ ...makeOak(3), frames: [makeOak(3).frames[0]] }, { ...makeOak(3), frames: [makeOak(3).frames[3]] })).toBe(false);
    const folk = makeFolk(FOLK.farmer);
    expect(new Set(folk.frames).size).toBeGreaterThan(1);
  });
});

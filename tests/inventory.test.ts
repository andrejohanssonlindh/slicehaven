import { describe, expect, it } from 'vitest';
import { THINGS } from '../src/content/things';
import { HERO_KIT } from '../src/content/things/kit';
import { packageKinds } from '../src/content/things/gear';
import { PACKAGES } from '../src/content/chargen/equipment';
import { ACTIONS } from '../src/content/actions';
import {
  type Grid, type PackItem, PACK, POCKET, SIDE, autoPack, cellsOf, coverOf, extent, findSpot, fits, freeSide, gridsOf, turned,
} from '../src/core/world3d/inventory';
import { modelOf } from '../src/core/world3d/things';

const pack: Grid = { id: PACK, w: 5, h: 6, takes: ['pocket', 'bag'] };
const pocket: Grid = { id: POCKET(0), w: 2, h: 2, takes: ['pocket'] };
const item = (id: string, shape: [number, number] | string[], size: 'pocket' | 'bag' = 'bag', at?: PackItem['at']): PackItem => ({ id, cells: cellsOf(shape, size)!, size, ...(at ? { at } : {}) });

describe('shapes', () => {
  it('a rectangle, rows, or the size\'s own; nothing for things bigger than a bag', () => {
    expect(cellsOf([2, 3], 'bag')).toHaveLength(6);
    expect(cellsOf(['##..', '####'], 'bag')).toHaveLength(6);
    expect(cellsOf(undefined, 'pocket')).toEqual([[0, 0]]);
    expect(cellsOf(undefined, 'bag')).toHaveLength(4);
    expect(cellsOf([1, 1], 'hands')).toBeNull();
    expect(cellsOf(undefined, undefined)).toBeNull();
  });

  it('turns a quarter clockwise, and four turns come back', () => {
    const pan = cellsOf(['##..', '####'], 'bag')!;
    expect(extent(turned(pan, 1))).toEqual({ w: 2, h: 4 });
    const key = (cs: readonly (readonly number[])[]) => cs.map((c) => c.join(',')).sort().join(' ');
    expect(key(turned(turned(pan, 2), 2))).toBe(key(pan));
    // (The handle, along the bottom row, points down after one turn: the head sits in the right column's top.)
    expect(key(turned(pan, 1))).toBe(key([[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [0, 3]]));
  });
});

describe('placing', () => {
  it('fits inside the grid on free cells only, in a grid that takes its size', () => {
    const loaf = item('loaf', [2, 1], 'bag', { grid: PACK, x: 0, y: 0, turn: 0 });
    const skin = item('skin', [2, 3]);
    expect(fits([pack], [loaf], skin, { grid: PACK, x: 0, y: 0, turn: 0 })).toBe(false);
    expect(fits([pack], [loaf], skin, { grid: PACK, x: 0, y: 1, turn: 0 })).toBe(true);
    expect(fits([pack], [loaf], skin, { grid: PACK, x: 4, y: 1, turn: 0 })).toBe(false);
    expect(fits([pack, pocket], [], skin, { grid: POCKET(0), x: 0, y: 0, turn: 0 })).toBe(false);
    // (Moving a thing over where it lies itself is fine.)
    expect(fits([pack], [loaf], loaf, { grid: PACK, x: 1, y: 0, turn: 0 })).toBe(true);
  });

  it('finds a spot: pocket things in the pockets first, bag things in the pack, turning when it helps', () => {
    expect(findSpot([pack, pocket], [], item('box', [1, 1], 'pocket'))?.grid).toBe(POCKET(0));
    expect(findSpot([pocket, pack], [], item('skin', [2, 3]))?.grid).toBe(PACK);
    const narrow: Grid = { id: 'n', w: 3, h: 1, takes: ['bag'] };
    expect(findSpot([narrow], [], item('stick', [1, 3]))).toMatchObject({ turn: 1 });
    expect(findSpot([pocket], [], item('skin', [2, 3]))).toBeNull();
  });

  it('auto-pack lays everything again, biggest first, or says it can\'t', () => {
    const things = [item('a', [2, 1]), item('b', [3, 3]), item('c', ['##..', '####']), item('d', [1, 1], 'pocket')];
    const spots = autoPack([pocket, pack], things)!;
    expect(Object.keys(spots).sort()).toEqual(['a', 'b', 'c', 'd']);
    const cells = new Set<string>();
    for (const t of things) for (const [x, y] of coverOf(t.cells, spots[t.id])) {
      const k = `${spots[t.id].grid}:${x},${y}`;
      expect(cells.has(k)).toBe(false);
      cells.add(k);
    }
    expect(autoPack([pocket], [item('big', [3, 3])])).toBeNull();
  });
});

describe('the pack and its sides', () => {
  it('pockets, the pack, and an add-on per fitted side (cut to the pack\'s height)', () => {
    const grids = gridsOf([[2, 2], [2, 2]], { grid: [5, 6], sides: 2 }, { left: { grid: [2, 8] } });
    expect(grids.map((g) => g.id)).toEqual([POCKET(0), POCKET(1), PACK, SIDE('left')]);
    expect(grids.find((g) => g.id === SIDE('left'))).toMatchObject({ w: 2, h: 6 });
    expect(gridsOf([[2, 2]], null, { left: { grid: [2, 4] } }).map((g) => g.id)).toEqual([POCKET(0)]);
    expect(freeSide({ grid: [5, 6], sides: 2 }, { left: {} })).toBe('right');
    expect(freeSide({ grid: [5, 6], sides: 1 }, { left: {} })).toBeNull();
  });
});

describe('the kinds and the kit', () => {
  it('every pocket or bag thing fits its grid, and has a model to lie about with', () => {
    const bag = THINGS.get(HERO_KIT.pack).bag!;
    const grids = gridsOf(HERO_KIT.pockets, bag, {});
    for (const id of THINGS.placeable) {
      const def = THINGS.get(id), cells = cellsOf(def.shape, def.size);
      if (!cells) continue;
      expect(findSpot(grids, [], { id, cells, size: def.size! }), `${id} fits nowhere`).not.toBeNull();
    }
    for (const id of [HERO_KIT.pack, ...HERO_KIT.items]) expect(modelOf(THINGS.get(id)), id).toBeDefined();
  });

  it('the kit all fits at the start, with three of the biggest packages; the pack has sides for the side pouch', () => {
    const bag = THINGS.get(HERO_KIT.pack).bag!;
    expect(bag.sides).toBeGreaterThan(0);
    expect(THINGS.get('side-pouch').addon).toBeDefined();
    const grids = gridsOf(HERO_KIT.pockets, bag, {});
    const asItem = (k: string, n: number) => ({ id: `${k}:${n}`, cells: cellsOf(THINGS.get(k).shape, THINGS.get(k).size)!, size: THINGS.get(k).size! });
    const bundles = THINGS.placeable.filter((id) => THINGS.get(id).package).sort((a, b) => asItem(b, 0).cells.length - asItem(a, 0).cells.length).slice(0, 3);
    // Two of the biggest fit as they come; with three, once the side pouch is fitted (as the kit does when it must).
    expect(autoPack(grids, [HERO_KIT.purse, ...bundles.slice(0, 2), ...HERO_KIT.items].map(asItem))).not.toBeNull();
    const fitted = gridsOf(HERO_KIT.pockets, bag, { left: THINGS.get('side-pouch').addon! });
    expect(autoPack(fitted, [HERO_KIT.purse, ...bundles, ...HERO_KIT.items.filter((k) => !THINGS.get(k).addon)].map(asItem))).not.toBeNull();
  });

  it('every equipment package of the creator is a bundle, but the animal (it waits for creatures)', () => {
    expect(packageKinds(PACKAGES).missing).toEqual(['Djur']);
    for (const k of packageKinds(PACKAGES).kinds) expect(modelOf(THINGS.get(k)), k).toBeDefined();
  });

  it('putting in the pack is a verb on things and on what you hold', () => {
    expect(ACTIONS.verbs.pack).toBeDefined();
    expect(ACTIONS.verbs['pack-held']).toBeDefined();
  });
});

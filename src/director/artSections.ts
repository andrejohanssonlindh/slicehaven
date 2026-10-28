import {
  makeBarrels, makeCrates, makeFence, makeHaystack, makeLantern, makeSmithy, makeStall, makeWell, makeWoodpile,
} from '../art/buildings';
import { FOLK, makeFolk } from '../art/folk';
import { makeHouse } from '../art/houses';
import { makeBoulder, makeOak, makeOutcrop, makePebbles, makeStump } from '../art/rough';
import type { Placed, VCell } from '../art/villageScene';

export interface Section {
  title: string;
  note: string;
  cols: number;
  rows?: number;
  items: Placed[];
  padTop?: number;
  maxWidth?: number;
}

const folkRow = (names: string[]): Placed[] => names.map((n, i) => ({ col: i, row: 0, prop: makeFolk(FOLK[n]) }));

export const SECTIONS: Section[] = [
  {
    title: 'Houses at real size',
    note: 'A cottage, 4 hexes across and 3 deep: the door is 42 px for a 36 px person, the walls 48. Front wall, side wall, roof slope, a chimney on the gable end. Timber frame built the way a carpenter would, aged in the plaster, paint and roof. Roofs sag, droop and lump.',
    cols: 7,
    rows: 3,
    padTop: 104,
    maxWidth: 400,
    items: [
      { col: 3, row: 2, ox: 16, prop: makeHouse({ seed: 5 }) },
      { col: 5, row: 2, ox: 14, oy: 2, prop: makeFolk(FOLK.farmer) },
    ],
  },
  {
    title: 'Houses: tavern and apothecary',
    note: 'The same builder with other choices: a five-hex shingled tavern with a tankard sign, and an apothecary with a herb sign and green shutters.',
    cols: 8,
    rows: 3,
    padTop: 104,
    maxWidth: 400,
    items: [
      { col: 3, row: 2, ox: 0, prop: makeHouse({ seed: 9, cols: 5, roof: 'shingle', shop: 'tankard', shutters: 'blue' }) },
    ],
  },
  {
    title: 'Houses: apothecary',
    note: 'Thatched, a herb sign, green shutters.',
    cols: 7,
    rows: 3,
    padTop: 104,
    maxWidth: 400,
    items: [
      { col: 3, row: 2, ox: 16, prop: makeHouse({ seed: 21, shop: 'herb', shutters: 'green' }) },
    ],
  },
  {
    title: 'Well, barrels, crates',
    note: 'The well has a mossy fieldstone ring, a little shingled roof and a bucket on a rope.',
    cols: 4,
    padTop: 64,
    items: [
      { col: 0, row: 0, ox: 6, prop: makeWell(2) },
      { col: 2, row: 0, ox: 6, prop: makeBarrels(4) },
      { col: 3, row: 0, ox: 4, prop: makeCrates(3) },
    ],
  },
  {
    title: 'Shops',
    note: 'Market stalls (fruit, bread, cloth) and a smithy with a live forge. Forge and lantern light up at dusk.',
    cols: 7,
    padTop: 64,
    maxWidth: 400,
    items: [
      { col: 1, row: 0, ox: -6, prop: makeSmithy(7) },
      { col: 4, row: 0, ox: 4, prop: makeStall(2, 'fruit') },
      { col: 6, row: 0, ox: 4, prop: makeStall(6, 'bread') },
    ],
  },
  {
    title: 'Odds and ends',
    note: 'Hay, firewood, fence, lantern post.',
    cols: 5,
    padTop: 52,
    items: [
      { col: 0, row: 0, prop: makeHaystack(3) },
      { col: 1, row: 0, prop: makeWoodpile(2) },
      { col: 2, row: 0, prop: makeFence(2) },
      { col: 3, row: 0, prop: makeFence(5) },
      { col: 4, row: 0, prop: makeLantern() },
    ],
  },
  {
    title: 'People, round 1',
    note: 'Five heads tall, real shoulders, hands, boots and worn working clothes. Shaded in the Secret of Mana way: readable at a glance, soft outline. They breathe and blink. Built from a spec, so new villagers are cheap.',
    cols: 4,
    padTop: 40,
    items: folkRow(['farmer', 'baker', 'elder', 'smith']),
  },
  {
    title: 'People, round 1 (more)',
    note: 'Guard, wife with water, a child, a hooded traveller.',
    cols: 4,
    padTop: 40,
    items: folkRow(['guard', 'wife', 'child', 'traveller']),
  },
  {
    title: 'Trees: old oaks',
    note: 'Lopsided crowns of many small leaf clumps with gaps, a gnarled flared trunk, moss on the shady side. No spheres.',
    cols: 3,
    padTop: 64,
    items: [
      { col: 0, row: 0, prop: makeOak(3) },
      { col: 1, row: 0, prop: makeOak(11) },
      { col: 2, row: 0, prop: makeOak(25) },
    ],
  },
  {
    title: 'Rocks and stumps',
    note: 'Chamfered facets, cracks, lichen, moss, bedded into the turf.',
    cols: 4,
    items: [
      { col: 0, row: 0, prop: makeBoulder(4) },
      { col: 1, row: 0, prop: makeOutcrop(9) },
      { col: 2, row: 0, prop: makePebbles(2) },
      { col: 3, row: 0, prop: makeStump(5) },
    ],
  },
];

const PATH = new Set(['2,4', '1,3', '2,3', '2,2', '1,2', '3,2', '1,1', '2,1']);
const FLOWERS = new Set(['0,2', '4,3', '0,1']);

export const VILLAGE: { cells: VCell[]; placed: Placed[] } = {
  cells: Array.from({ length: 25 }, (_, i): VCell => {
    const col = i % 5, row = Math.floor(i / 5), key = `${col},${row}`;
    
    return { col, row, ground: PATH.has(key) ? 'path' : FLOWERS.has(key) ? 'flowers' : key === '4,1' ? 'tallgrass' : 'grass' };
  }),
  placed: [
    { col: 0, row: 1, ox: -4, prop: makeOak(3) },
    { col: 4, row: 1, ox: 4, prop: makeOak(11) },
    { col: 2, row: 2, ox: 16, prop: makeHouse({ seed: 5 }) },
    { col: 0, row: 2, ox: 2, prop: makeFence(2) },
    { col: 1, row: 3, ox: 6, oy: 3, prop: makeFolk(FOLK.farmer) },
    { col: 3, row: 3, ox: 6, prop: makeWell(2) },
    { col: 0, row: 3, ox: 2, oy: 2, prop: makeBarrels(4) },
    { col: 4, row: 3, ox: -2, prop: makeStall(2, 'fruit') },
    { col: 1, row: 4, ox: 0, prop: makeHaystack(3) },
    { col: 2, row: 4, ox: 6, prop: makeFolk(FOLK.baker) },
    { col: 3, row: 4, ox: -2, prop: makeFolk(FOLK.guard) },
    { col: 4, row: 4, ox: 4, oy: -2, prop: makeLantern() },
    { col: 0, row: 4, ox: 6, prop: makeWoodpile(2) },
  ],
};

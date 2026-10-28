import {
  makeBarrels, makeCrates, makeFence, makeHaystack, makeLantern, makeStall, makeWell, makeWoodpile,
} from '../art/buildings';
import { FOLK, makeFolk } from '../art/folk';
import {
  makeAnvil, makeBed, makeBench, makeChest, makeCoalBin, makeCupboard, makeForge, makeHearth, makeLadder, makeRug, makeShelf, makeStool, makeTable,
  makeToolRack, makeTrough, makeWorkbench,
} from '../art/furniture';
import { makeHouse } from '../art/houses';
import { makeRoom, makeSmithy } from '../art/interior';
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
    title: 'Interior: furniture',
    note: 'For inside the houses. Same scale as the people (they sit on a 14 px stool), same slanted view as the houses: front, top, right side. Wood grain, worn edges, a candle that lights the table at dusk.',
    cols: 9,
    padTop: 84,
    maxWidth: 400,
    items: [
      { col: 1, row: 0, ox: 8, prop: makeTable() },
      { col: 3, row: 0, ox: 12, prop: makeBed() },
      { col: 6, row: 0, ox: 0, prop: makeChest() },
      { col: 8, row: 0, ox: -4, prop: makeCupboard() },
    ],
  },
  {
    title: 'Interior: hearth and small things',
    note: 'The hearth has a live fire, an iron crane and a pot, and lights the room. Stool, bench, shelf, rug, ladder.',
    cols: 9,
    padTop: 100,
    maxWidth: 400,
    items: [
      { col: 1, row: 0, ox: 4, prop: makeHearth() },
      { col: 3, row: 0, ox: 6, prop: makeStool() },
      { col: 4, row: 0, ox: 10, prop: makeBench() },
      { col: 6, row: 0, ox: 4, prop: makeLadder() },
      { col: 7, row: 0, ox: 14, prop: makeRug() },
      { col: 8, row: 0, ox: 10, oy: -22, prop: makeShelf() },
    ],
  },
  {
    title: 'Interior: smithy fittings',
    note: 'Forge (live coals, a bar heating), anvil on an oak stump, quench trough, workbench, coal bin, tool rack.',
    cols: 9,
    padTop: 90,
    maxWidth: 400,
    items: [
      { col: 1, row: 0, ox: 4, prop: makeForge() },
      { col: 3, row: 0, ox: 4, prop: makeAnvil() },
      { col: 4, row: 0, ox: 12, prop: makeTrough() },
      { col: 6, row: 0, ox: 6, prop: makeWorkbench() },
      { col: 8, row: 0, ox: 0, prop: makeCoalBin() },
      { col: 7, row: 0, ox: 8, oy: -30, prop: makeToolRack() },
    ],
  },
  {
    title: 'Smithy, at house scale',
    note: 'An open-fronted workshop, 4 hexes by 3 like the houses, with a person-sized interior: forge with live coals in the middle-right, anvil on an oak stump, quench trough, workbench, coal bin, tools. The roof is the same swappable layer (shingle here); the forge chimney goes up through it. Try Dusk.',
    cols: 7,
    rows: 3,
    padTop: 104,
    maxWidth: 400,
    items: [
      { col: 3, row: 2, ox: 16, prop: makeSmithy({ seed: 7 }) },
      { col: 5, row: 2, ox: 12, oy: 4, prop: makeFolk(FOLK.smith) },
    ],
  },
  {
    title: 'Inside a cottage (the roof and front wall cut away)',
    note: 'What you see when you step in: the same box as the house, so the two swap in place. Floor, back and left walls from inside, the right wall still showing outside. Bed, cupboard, shelf, hearth with a live fire, table with a candle, stool, bench, chest, rug. The villager is for scale.',
    cols: 7,
    rows: 3,
    padTop: 104,
    maxWidth: 400,
    items: [
      { col: 3, row: 2, ox: 0, prop: makeRoom({ seed: 5, cols: 5 }) },
      { col: 3, row: 2, ox: -10, oy: -8, prop: makeFolk(FOLK.baker) },
    ],
  },
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
    title: 'Market stalls',
    note: 'Fruit, bread, cloth.',
    cols: 6,
    padTop: 64,
    maxWidth: 400,
    items: [
      { col: 1, row: 0, ox: 4, prop: makeStall(2, 'fruit') },
      { col: 3, row: 0, ox: 10, prop: makeStall(6, 'bread') },
      { col: 5, row: 0, ox: 4, prop: makeStall(8, 'cloth') },
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

import {
  makeBarrels, makeCrates, makeFence, makeHaystack, makeLantern, makeStall, makeWell, makeWoodpile,
} from '../art/buildings';
import { FOLK, makeFolk } from '../art/folk';
import {
  makeAnvil, makeBed, makeBench, makeChest, makeCoalBin, makeCupboard, makeForge, makeHearth, makeLadder, makeRug, makeShelf, makeStool, makeTable,
  makeToolRack, makeTrough, makeWorkbench,
} from '../art/furniture';
import { makeHouse } from '../art/houses';
import {
  makeBasket, makeBucketBroom, makeClutter, makeCloakPegs, makeCookhearth, makeFootlocker, makeHanging, makeKeg, makeKindling, makePallet,
  makeRoughShelf, makeSacks, makeStool3, makeTrestleTable,
} from '../art/humble';
import { makeRoom, makeSmithy } from '../art/interior';
import { makeShrub } from '../art/scrub';
import { makePalisade } from '../art/village';
import { makeBankStones, makeDragonfly, makeFloatingLog, makeJetty, makeLilyPads, makeReedClump } from '../art/pond';
import { makeApple, makeBirch, makeElm, makePoplar, makeWillow } from '../art/leafTrees';
import { makeBoulder, makeOak, makeOutcrop, makePebbles, makeStump } from '../art/rough';
import type { Placed, VCell } from '../art/villageScene';

export interface Section {
  title: string;
  note: string;
  cols: number;
  rows?: number;
  /** Explicit ground, when a plain grass patch will not do. */
  cells?: VCell[];
  items: Placed[];
  padTop?: number;
  maxWidth?: number;
}

const folkRow = (names: string[]): Placed[] => names.map((n, i) => ({ col: i, row: 0, prop: makeFolk(FOLK[n]) }));


const LAKE = new Set(['2,1', '3,1', '2,2', '3,2', '4,2', '2,3', '3,3', '3,4']);
const POND_CELLS: VCell[] = Array.from({ length: 7 * 6 }, (_, i): VCell => {
  const col = i % 7, row = Math.floor(i / 7), key = `${col},${row}`;
  return LAKE.has(key) ? { col, row, ground: 'grass', lake: true } : { col, row, ground: 'grass' };
});

export const SECTIONS: Section[] = [
  {
    title: 'Rich interior: furniture (kept for manors, castles, richer homes)',
    note: 'Heavy oak, a big bed, a grand hearth. Too fine for the village, saved for later.  Same scale as the people (they sit on a 14 px stool), same slanted view as the houses: front, top, right side. Wood grain, worn edges, a candle that lights the table at dusk.',
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
    title: 'Rich interior: hearth and small things',
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
    title: 'Inside a village house (roof and front wall cut away)',
    note: 'The humble version: beaten earth, straw on boards for a bed, a foot-wide strongbox, a board on trestles, three-legged stools, a cooking fire under a sooty hood with a pot on a chain, a keg, sacks, kindling, onions and a fish hung from the rafters, a cloak on a peg, a bucket and a broom, scraps on the floor. Compare with the manor version further down.',
    cols: 7,
    rows: 3,
    padTop: 104,
    maxWidth: 400,
    items: [
      { col: 3, row: 2, ox: 16, prop: makeRoom({ seed: 5, humble: true }) },
      { col: 3, row: 2, ox: 28, oy: -4, prop: makeFolk(FOLK.baker) },
    ],
  },
  {
    title: 'Village interior: bed, chest, table, stools',
    note: 'A pallet of straw with a patched blanket and a sack for a pillow. The chest is a foot wide. The table is a board on trestles with a heel of bread and a candle stub. Everything is a bit crooked.',
    cols: 9,
    padTop: 60,
    maxWidth: 400,
    items: [
      { col: 1, row: 0, ox: 6, prop: makePallet() },
      { col: 3, row: 0, ox: 8, prop: makeFootlocker() },
      { col: 5, row: 0, ox: 0, prop: makeTrestleTable() },
      { col: 6, row: 0, ox: 16, prop: makeStool3() },
      { col: 8, row: 0, ox: 0, prop: makeBucketBroom() },
    ],
  },
  {
    title: 'Village interior: hearth and clutter',
    note: 'Cooking fire under a sooty daub hood (it lights the room), keg, slumped sacks, a basket of turnips, kindling, scraps for the floor.',
    cols: 9,
    padTop: 80,
    maxWidth: 400,
    items: [
      { col: 1, row: 0, ox: 4, prop: makeCookhearth() },
      { col: 3, row: 0, ox: 4, prop: makeKeg() },
      { col: 4, row: 0, ox: 10, prop: makeSacks() },
      { col: 6, row: 0, ox: 0, prop: makeBasket() },
      { col: 7, row: 0, ox: 6, prop: makeKindling() },
      { col: 8, row: 0, ox: 16, prop: makeClutter() },
    ],
  },
  {
    title: 'Village interior: wall things',
    note: 'A warped shelf with pots, a cloak and a felt hat on pegs, onions, herbs and a dried fish strung up.',
    cols: 6,
    padTop: 60,
    items: [
      { col: 1, row: 0, ox: 4, prop: makeRoughShelf() },
      { col: 3, row: 0, ox: 4, prop: makeCloakPegs() },
      { col: 5, row: 0, ox: 4, prop: makeHanging() },
    ],
  },
  {
    title: 'Trees: willow and birch (hanging)',
    note: 'Weeping willow: a short leaning trunk, a loose dome, curtains of fronds that sway like pendulums. Birch: white bark with black scars, thin drooping branches, airy leaves, short hanging twigs. Seeded: every one differs.',
    cols: 6,
    padTop: 90,
    maxWidth: 400,
    items: [
      { col: 1, row: 0, ox: 4, prop: makeWillow(3) },
      { col: 3, row: 0, ox: 12, prop: makeBirch(4) },
      { col: 5, row: 0, ox: 2, prop: makeBirch(9, 'summer') },
    ],
  },
  {
    title: 'Trees: apple, elm, poplar',
    note: 'An old orchard apple (propped limb, fruit, windfalls), a vase-shaped elm with fine twigs hanging from the rim, a columnar poplar with silver flashing.',
    cols: 6,
    padTop: 90,
    maxWidth: 400,
    items: [
      { col: 1, row: 0, ox: 0, prop: makeApple(5) },
      { col: 3, row: 0, ox: 6, prop: makeElm(3) },
      { col: 5, row: 0, ox: 0, prop: makePoplar(6) },
    ],
  },
  {
    title: 'Pond: joined hexes, water plants, jetty',
    note: 'Eight hexes that join into one body of water (they know which neighbours are wet, so there are no seams). Duckweed on the surface, lily pads with flowers and a frog, reeds, cattails and yellow flag at the edge, a dragonfly, a half-sunk log, wet stones, and a jetty (brygga) with a broken board.',
    cols: 7,
    rows: 6,
    padTop: 104,
    maxWidth: 400,
    cells: POND_CELLS,
    items: [
      { col: 1, row: 1, ox: 8, oy: 3, prop: makeJetty(3, 'across', 4) },
      { col: 3, row: 1, ox: 6, oy: 4, prop: makeLilyPads(2) },
      { col: 2, row: 3, ox: 6, oy: 6, prop: makeLilyPads(5, true) },
      { col: 4, row: 2, ox: 8, oy: 12, prop: makeReedClump(2, 'cattail') },
      { col: 1, row: 3, ox: 6, oy: 6, prop: makeReedClump(5, 'reeds') },
      { col: 4, row: 1, ox: 0, oy: 8, prop: makeReedClump(7, 'iris') },
      { col: 3, row: 4, ox: 4, oy: 8, prop: makeFloatingLog(3) },
      { col: 2, row: 4, ox: 6, oy: 4, prop: makeBankStones(4) },
      { col: 3, row: 2, ox: 0, oy: -26, prop: makeDragonfly(2) },
      { col: 5, row: 3, ox: 2, oy: 4, prop: makeWillow(3) },
      { col: 0, row: 3, ox: 10, oy: 2, prop: makeBirch(6) },
      { col: 5, row: 4, ox: 4, oy: 2, prop: makeShrub(4, 'weeds') },
      { col: 0, row: 4, ox: 12, oy: 2, prop: makeShrub(5, 'flowering') },
      { col: 4, row: 5, ox: 2, oy: 2, prop: makeShrub(3, 'bush') },
    ],
  },
  {
    title: 'Jetties: across and into the water',
    note: 'Two orientations, any length. Weathered boards, a missing one, a coil of rope, a bucket, posts leaning with a ripple round each.',
    cols: 8,
    padTop: 76,
    maxWidth: 400,
    items: [
      { col: 1, row: 0, ox: 0, prop: makeJetty(8, 'across', 3) },
      { col: 6, row: 0, ox: 4, oy: 4, prop: makeJetty(9, 'into', 4) },
    ],
  },
  {
    title: 'Palisade: old, uneven, dirty',
    note: 'Logs of different thickness and height, leaning, some sharpened and some chopped or snapped, one scorched, grey where the bark came off, cracked, mossy low down, mud thrown up the foot with weeds in it, rope frayed and sagging. Sections still join edge to edge. This is the one the game uses.',
    cols: 6,
    padTop: 60,
    maxWidth: 400,
    items: [0, 1, 2, 3, 4, 5].map((i) => ({ col: i, row: 0, ox: 0, prop: makePalisade(11 + i * 5) })),
  },
  {
    title: 'Stumps (large)',
    note: 'Snapped, not sawn: lopsided, a tall splintered jag, a rotten hollow, fungus, chunks at the foot. Three seeds, drawn big so you can judge them.',
    cols: 3,
    padTop: 44,
    maxWidth: 400,
    items: [
      { col: 0, row: 0, prop: makeStump(5) },
      { col: 1, row: 0, prop: makeStump(12) },
      { col: 2, row: 0, prop: makeStump(23) },
    ],
  },
  {
    title: 'Shrubs: bush, flowering, berry',
    note: 'Lumpy, lopsided, with dead twigs poking out and bare stems showing, grass growing up round the foot. Flowers where they happened to take, some already browned. Seeded, so each differs.',
    cols: 5,
    padTop: 40,
    maxWidth: 400,
    items: [
      { col: 0, row: 0, ox: 8, prop: makeShrub(3, 'bush') },
      { col: 1, row: 0, ox: 12, prop: makeShrub(4, 'flowering') },
      { col: 2, row: 0, ox: 16, prop: makeShrub(5, 'flowering') },
      { col: 3, row: 0, ox: 14, prop: makeShrub(6, 'berry') },
    ],
  },
  {
    title: 'Shrubs: hedges',
    note: 'Overgrown, with a gap where it died back and bare stems showing through.',
    cols: 6,
    padTop: 40,
    maxWidth: 400,
    items: [
      { col: 1, row: 0, ox: 6, prop: makeShrub(4, 'hedge') },
      { col: 4, row: 0, ox: 6, prop: makeShrub(8, 'hedge') },
    ],
  },
  {
    title: 'Shrubs: bramble, weeds, kitchen garden',
    note: 'Bramble with thorns and blackberries; nettles, dock and thistle; a garden bed with cabbages gone to seed, leeks and a leaning bean pole.',
    cols: 6,
    padTop: 40,
    maxWidth: 400,
    items: [
      { col: 0, row: 0, ox: 14, prop: makeShrub(3, 'bramble') },
      { col: 2, row: 0, ox: 14, prop: makeShrub(4, 'weeds') },
      { col: 4, row: 0, ox: 10, prop: makeShrub(2, 'garden') },
    ],
  },
  {
    title: 'Inside a manor-grade house (kept for richer homes)',
    note: 'The first, too-fine interior, kept for later. What you see when you step in: the same box as the house, so the two swap in place. Floor, back and left walls from inside, the right wall still showing outside. Bed, cupboard, shelf, hearth with a live fire, table with a candle, stool, bench, chest, rug. The villager is for scale.',
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
    { col: 0, row: 2, ox: 2, prop: makeShrub(4, 'hedge') },
    { col: 1, row: 2, ox: -4, oy: 2, prop: makeShrub(5, 'flowering') },
    { col: 4, row: 2, ox: 8, oy: 3, prop: makeShrub(9, 'bush') },
    { col: 4, row: 4, ox: 6, prop: makeShrub(4, 'weeds') },
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

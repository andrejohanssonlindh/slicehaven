import type { HouseSpec } from '../../art/houses';

/**
 * Reedwater: a fishing hamlet that was once a few huts by a lake, the main road
 * passing a good walk to the south. In a hundred years the road has become the
 * village's main street and the houses have followed it, east and west, until the
 * village meets the road from both sides. Travellers who don't want the mud and the
 * noise can still take the bypass round the south edge.
 *
 * Offset hex grid, 38 × 31, north up. Every house faces south (the art has one
 * face), so the streets run along the fronts.
 */

export const COLS = 38;
export const ROWS = 31;

// --- ground ------------------------------------------------------------------

/** g grass · t tall grass · w flowers · f forest floor · p dirt road · m stamped mud · o lake. */
export function groundMap(): string[] {
  const grid: string[][] = Array.from({ length: ROWS }, () => Array<string>(COLS).fill('g'));
  const put = (c: number, r: number, ch: string): void => {
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) grid[r][c] = ch;
  };
  const span = (r: number, c0: number, c1: number, ch: string): void => {
    for (let c = c0; c <= c1; c++) put(c, r, ch);
  };
  // Hash noise, so the meadow is patchy but the same every time.
  const noise = (c: number, r: number, s: number): number => {
    let h = (c * 374761393 + r * 668265263 + s * 2147483647) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };

  // Woods to the north and south; long grass and flowers in the meadows.
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const meadow = r >= 3 && r <= 9 && c >= 12;
      const north = r <= 2 && c >= 12;
      const south = r >= 29;
      if (north || south) put(c, r, noise(c, r, 1) < 0.78 ? 'f' : 'g');
      else if (meadow) put(c, r, noise(c, r, 2) < 0.3 ? 't' : noise(c, r, 3) < 0.14 ? 'w' : 'g');
      else if (r >= 26 && r <= 28 && noise(c, r, 4) < 0.25) put(c, r, 't');
      else if (c <= 1 && r >= 16 && noise(c, r, 5) < 0.4) put(c, r, 't');
    }
  }

  // The lake, upper left.
  const LAKE: [number, number, number][] = [[0, 0, 9], [1, 0, 10], [2, 0, 11], [3, 1, 11], [4, 1, 10], [5, 2, 9], [6, 3, 8], [7, 4, 6]];
  for (const [r, c0, c1] of LAKE) span(r, c0, c1, 'o');

  // The main road, west to east, and the bypass round the south edge.
  span(14, 0, COLS - 1, 'p');
  span(15, 0, 5, 'p');
  span(15, 33, COLS - 1, 'p');
  for (let r = 15; r <= 27; r++) { put(1, r, 'p'); put(37, r, 'p'); }
  span(28, 1, COLS - 1, 'p');

  // Inside the village the road is stamped mud: the main street, the plaza (no stone anywhere), the lanes.
  span(14, 6, 32, 'm');
  span(15, 6, 12, 'm');
  span(15, 29, 32, 'm');
  span(15, 13, 28, 'm'); span(16, 12, 29, 'm'); span(17, 12, 29, 'm'); span(18, 12, 29, 'm'); span(19, 13, 28, 'm');
  for (let r = 20; r <= 25; r++) { span(r, 12, 13, 'm'); span(r, 29, 30, 'm'); }
  span(20, 3, 13, 'm');       // behind the west houses
  span(20, 29, 36, 'm');      // behind the elder's house
  span(25, 2, 36, 'm');       // the south lane
  // The boat landing on the lake's east shore (the houses crowd the south shore), and the lane down to the street.
  for (let r = 3; r <= 5; r++) span(r, 12, 15, 'm');
  for (let r = 3; r <= 13; r++) put(16, r, 'm');
  return grid.map((row) => row.join(''));
}

// --- houses ------------------------------------------------------------------

export type RoomKey = 'fisher' | 'inn' | 'bakery' | 'herbalist' | 'fishmonger' | 'general' | 'weaver' | 'smithy';

export interface HouseDef {
  id: string;
  name: string;
  /** Who lives (or works) here. */
  owner: string;
  blurb: string;
  /** Front-centre anchor hex. */
  col: number;
  row: number;
  spec: HouseSpec;
  /** What is inside. Houses without one stay shut for now. */
  room?: RoomKey;
  /** The smithy is its own open workshop and not a house with a roof to lift. */
  workshop?: boolean;
}

export const HOUSES: HouseDef[] = [
  // North side of the main street, west to east.
  { id: 'brandt', name: 'Brandt\'s house', owner: 'Edda and Joss Brandt, and their three', col: 3, row: 12, room: 'fisher',
    blurb: 'The oldest house in Reedwater, one of the first huts by the lake, rebuilt twice since. Nets on the fence, a boat on the bank.',
    spec: { seed: 11, roof: 'thatch', walls: 'white', shutters: 'blue' } },
  { id: 'netloft', name: 'Pike\'s fish and net loft', owner: 'Orla Pike', col: 8, row: 12, room: 'fishmonger',
    blurb: 'Tarred boards and a shingle roof, a smell you can find with your eyes shut. Fresh, smoked and salted fish; nets mended while you wait.',
    spec: { seed: 12, roof: 'shingle', walls: 'tarred', shutters: 'grey', shop: 'fish' } },
  { id: 'herbalist', name: 'Wenna\'s herbs', owner: 'Wenna Marsh', col: 13, row: 12, room: 'herbalist',
    blurb: 'Herbs, salves and a bed in the corner for anyone too ill to walk home. Wenna came here from the hills thirty years ago and has not been asked to leave.',
    spec: { seed: 13, roof: 'thatch', walls: 'sage', shutters: 'green', shop: 'herb' } },
  { id: 'inn', name: 'The Gaffed Eel', owner: 'Dag Harl', col: 19, row: 12, room: 'inn',
    blurb: 'The biggest building in Reedwater, and the only one with tiles. Rooms upstairs, ale downstairs, and a fire that has not gone out since the road came.',
    spec: { seed: 14, cols: 5, roof: 'tile', walls: 'ochre', shutters: 'rust', shop: 'tankard' } },
  { id: 'bakery', name: 'Holm\'s bakery', owner: 'Marta Holm', col: 24, row: 12, room: 'bakery',
    blurb: 'Bread before dawn, buns by mid-morning, nothing by evening. Marta\'s oven also bakes the village\'s Sunday pies, for a coin.',
    spec: { seed: 15, roof: 'thatch', walls: 'rose', shutters: 'ochre', shop: 'loaf' } },
  { id: 'store', name: 'Vale\'s general store', owner: 'Tobin Vale', col: 29, row: 12, room: 'general',
    blurb: 'Rope, pans, candles, turnips, and whatever the last cart left behind. Tobin came with the road and has priced everything as if it might leave again.',
    spec: { seed: 16, roof: 'shingle', walls: 'white', shutters: 'plum', shop: 'scales' } },
  { id: 'cooper', name: 'The cooper\'s', owner: 'Bram Tull', col: 34, row: 12,
    blurb: 'Barrels, buckets and tubs stacked to the eaves. Every fish in Reedwater ends up in something Bram made.',
    spec: { seed: 17, roof: 'sod', walls: 'brick', shutters: 'blue' } },
  // West of the plaza, behind the main street.
  { id: 'ilse', name: 'Gran Ilse\'s cottage', owner: 'Ilse Brandt', col: 4, row: 18,
    blurb: 'Edda Brandt\'s mother. Keeps hens, a cat, and an opinion on everyone who passes.',
    spec: { seed: 18, roof: 'thatch', walls: 'white', shutters: 'rust' } },
  { id: 'woodsman', name: 'The woodsman\'s', owner: 'Harl Oakes', col: 9, row: 18,
    blurb: 'A turf roof, an axe by the door and a stack of logs taller than the house. Harl sells firewood and tells the village what the woods are doing.',
    spec: { seed: 19, roof: 'sod', walls: 'tarred', shutters: 'grey' } },
  // East of the plaza.
  { id: 'elder', name: 'The elder\'s house', owner: 'Elder Maren Sol', col: 34, row: 18,
    blurb: 'Two storeys of old oak and a tile roof, from when Reedwater first had something to be elder of. Disputes are heard on the step.',
    spec: { seed: 20, cols: 5, roof: 'tile', walls: 'white', shutters: 'green' } },
  // South side: behind the plaza, fronting the south lane.
  { id: 'weaver', name: 'Dunn\'s weaving', owner: 'Hild Dunn', col: 4, row: 23, room: 'weaver',
    blurb: 'Wool from the hill farms, linen from flax grown behind the house. Hild\'s blue cloth is what the fishers wear on feast days.',
    spec: { seed: 21, roof: 'thatch', walls: 'ochre', shutters: 'plum', shop: 'cloth' } },
  { id: 'hale', name: 'Hale\'s house', owner: 'Tam and Sira Hale', col: 9, row: 23, room: 'fisher',
    blurb: 'Tam fishes the lake with his brother-in-law. Sira sells the small fish by the bucket at the plaza.',
    spec: { seed: 22, roof: 'thatch', walls: 'white', shutters: 'rust' } },
  { id: 'smithy', name: 'The smithy', owner: 'Gunnar Stahl', col: 16, row: 23, room: 'smithy', workshop: true,
    blurb: 'Open-fronted so the whole street can watch. Hooks, hinges, fish-knives and the occasional horseshoe for a passing traveller.',
    spec: { seed: 23 } },
  { id: 'watch', name: 'The watch house', owner: 'Sergeant Kell and two others', col: 21, row: 23,
    blurb: 'Brick, because it holds the cell. Three men and a spear between them, who mostly settle fights over the catch.',
    spec: { seed: 24, roof: 'shingle', walls: 'brick', shutters: 'grey' } },
  { id: 'corrin', name: 'Corrin\'s house', owner: 'The Corrins', col: 26, row: 23,
    blurb: 'Seven children and one boat. The sage-green wash has been going on for as long as anyone remembers and is not finished.',
    spec: { seed: 25, roof: 'thatch', walls: 'sage', shutters: 'blue' } },
];

// --- things standing about -------------------------------------------------------

/** Kind, hex, pixel offset from the hex centre, and a seed. */
export type Stuff = [kind: string, col: number, row: number, ox: number, oy: number, seed: number];

export const STUFF: Stuff[] = [
  // The lake: lily pads, reeds, a log, a jetty, dragonflies.
  ['lilypads-frog', 3, 1, 0, 0, 1], ['lilypads', 6, 3, 0, 0, 2], ['lilypads', 8, 2, 4, 0, 3], ['lilypads-frog', 4, 4, 0, 0, 4], ['lilypads', 7, 5, -6, 0, 5],
  ['log', 6, 2, 0, 6, 6],
  ['reeds', 12, 2, 0, 4, 7], ['cattail', 12, 3, 4, 4, 8], ['iris', 11, 4, 8, 6, 9], ['reeds', 10, 5, 8, 6, 10], ['cattail', 9, 6, 6, 8, 11],
  ['reeds', 7, 7, 8, 8, 12], ['iris', 2, 6, -6, 6, 13], ['cattail', 1, 7, 0, 6, 14], ['reeds', 0, 4, 6, 6, 15], ['iris', 3, 7, -4, 8, 16],
  ['bankstones', 9, 6, -6, 10, 17], ['bankstones', 3, 7, -6, 10, 18],
  ['jetty-across', 1, 5, 6, 6, 19],
  ['dragonfly', 8, 3, 0, -14, 20], ['dragonfly', 5, 5, 6, -10, 21],
  ['willow', 13, 1, 0, 6, 22], ['willow', 1, 8, -4, 8, 23], ['willow', 0, 3, 8, 6, 24],

  // The boat landing on the east shore, and the fishers' work: boats, nets, racks, tubs.
  ['rowboat', 13, 5, 0, 6, 30], ['rowboat', 15, 1, 0, 6, 31],
  ['netframe', 18, 4, 0, 4, 32], ['fishrack', 17, 2, 0, 6, 33], ['fishtubs', 15, 5, 0, 6, 34], ['netheap', 12, 4, 0, 8, 35],
  ['barrels1', 16, 3, 0, 4, 36],

  // The old gate and what is left of the palisade it stood in.
  ['gate-open', 6, 14, 16, 4, 40], ['palisade', 5, 16, 14, 4, 42], ['palisade', 6, 17, 0, 6, 43],
  ['stump', 4, 16, 0, 4, 44], ['shrub-weeds', 5, 13, 4, 6, 45],

  // Fences, hedges and yards along the main street.
  ['fence', 3, 13, 10, 4, 50], ['fence', 8, 13, 10, 4, 51], ['fence', 13, 13, 10, 4, 52], ['fence', 29, 13, 10, 4, 53], ['fence', 34, 13, 10, 4, 54],
  ['shrub-hedge', 6, 12, 10, 4, 55], ['shrub-flowering', 11, 12, -4, 4, 56], ['shrub-bush', 16, 12, 10, 4, 57], ['shrub-flowering', 22, 12, 12, 4, 58],
  ['shrub-bush', 27, 12, 10, 4, 59], ['shrub-hedge', 32, 12, 10, 4, 60], ['shrub-bush', 36, 12, 10, 4, 61],
  ['barrels', 11, 13, 0, 4, 62], ['crates', 30, 13, 4, 4, 63], ['barrels1', 20, 13, 14, 4, 64], ['woodpile', 36, 13, -6, 4, 65], ['barrels', 35, 13, 0, 6, 66],
  ['lantern', 17, 14, 4, 2, 67], ['lantern', 27, 14, 4, 2, 68], ['lantern', 9, 14, 4, 2, 69],

  // The plaza: a well, a market, a cart, lanterns.
  ['well', 20, 17, 0, 2, 70], ['stall-fruit', 15, 17, 0, 4, 71], ['stall-cloth', 25, 17, 0, 4, 72], ['stall-bread', 23, 19, 0, 4, 73],
  ['handcart', 17, 19, 0, 6, 74], ['barrels1', 14, 16, 4, 6, 75], ['crates', 27, 16, 0, 6, 76], ['haystack', 28, 19, 10, 6, 77],
  ['lantern', 14, 18, 0, 2, 78], ['lantern', 26, 18, 8, 2, 79], ['lantern', 20, 19, 8, 2, 80], ['basket', 16, 16, 0, 0, 81],

  // Behind the west houses: washing, hens' corner, garden, woodpile.
  ['washline', 7, 20, 0, 8, 90], ['shrub-garden', 6, 17, 0, 6, 91], ['shrub-garden', 11, 17, 4, 6, 92], ['woodpile', 11, 19, 0, 4, 93],
  ['shrub-bush', 2, 18, 0, 6, 94], ['fence', 2, 20, 0, 6, 95], ['barrels1', 12, 20, 0, 6, 96],
  // Behind the elder's house and east lane.
  ['shrub-garden', 31, 17, 0, 6, 100], ['shrub-hedge', 36, 20, 0, 6, 101], ['haystack', 30, 19, 0, 8, 102], ['barrels', 31, 20, 0, 6, 103],
  // South row: yards, a smithy woodpile and coal, gardens, a drying rack.
  ['woodpile', 13, 24, -8, 4, 110], ['fishrack', 7, 24, 0, 6, 111], ['shrub-garden', 12, 22, 0, 6, 112], ['barrels', 19, 24, -6, 4, 113], ['crates', 24, 24, 0, 4, 114],
  ['shrub-bush', 14, 24, 0, 4, 115], ['shrub-flowering', 29, 24, 0, 4, 116], ['netframe', 31, 23, 0, 4, 117], ['fence', 24, 25, 0, 4, 118],
  ['lantern', 12, 25, 8, 2, 119], ['lantern', 29, 25, 8, 2, 120],

  // The meadows north and east, the orchard, the woods, the road.
  ['oak', 15, 3, 0, 4, 130], ['oak', 20, 2, 0, 4, 131], ['elm', 25, 4, 0, 4, 132], ['oak', 30, 2, 0, 4, 133], ['oak', 35, 4, 0, 4, 134], ['oak', 18, 5, 0, 4, 135],
  ['elm', 22, 7, 0, 4, 136], ['oak', 33, 7, 0, 4, 137], ['birch', 28, 6, 0, 4, 138],
  ['apple', 30, 8, 0, 6, 140], ['apple', 33, 9, 0, 6, 141], ['apple', 36, 8, 0, 6, 142], ['apple', 31, 10, 0, 6, 143],
  ['haystack', 17, 8, 0, 6, 144], ['haystack', 26, 9, 8, 6, 145], ['fence', 15, 10, 0, 6, 146], ['fence', 23, 10, 0, 6, 147],
  ['rock', 14, 7, 0, 6, 148], ['shrub-bramble', 20, 9, 0, 6, 149], ['shrub-weeds', 25, 8, 0, 6, 150],
  ['poplar', 3, 26, 0, 4, 160], ['poplar', 9, 27, 0, 4, 161], ['poplar', 15, 26, 0, 4, 162], ['poplar', 23, 27, 0, 4, 163], ['poplar', 31, 26, 0, 4, 164],
  ['birch', 35, 22, 0, 4, 165], ['birch', 1, 22, 0, 4, 166], ['elm', 0, 17, 0, 4, 167], ['oak', 35, 28, 0, 4, 168], ['oak', 8, 30, 0, 4, 169], ['oak', 20, 30, 0, 4, 170],
  ['oak', 29, 30, 0, 4, 171], ['oak', 1, 30, 0, 4, 172], ['oak', 36, 1, 0, 4, 173], ['oak', 13, 0, 0, 4, 174], ['oak', 24, 0, 0, 4, 175],
  ['shrub-bush', 4, 27, 0, 4, 176], ['shrub-hedge', 17, 27, 0, 4, 177], ['shrub-flowering', 27, 27, 0, 4, 178],
  ['handcart', 34, 15, 0, 6, 180], ['campfire', 31, 27, 0, 6, 181],
];

// --- people --------------------------------------------------------------------

export interface Villager {
  id: string;
  /** Key in PEOPLE. */
  look: string;
  name: string;
  role: string;
  /** One line on what they are doing right now. */
  doing: string;
  col: number;
  row: number;
  ox?: number;
  oy?: number;
}

export const VILLAGERS: Villager[] = [
  // The plaza.
  { id: 'v-farmer', look: 'farmer', name: 'Osk Reeve', role: 'hill farmer', doing: 'Haggling over turnips at the fruit stall.', col: 16, row: 18, ox: 6 },
  { id: 'v-mother', look: 'mother', name: 'Sira Hale', role: 'fisher\'s wife', doing: 'Selling small fish by the bucket.', col: 22, row: 18, ox: 4 },
  { id: 'v-boy', look: 'boy', name: 'Pip Hale', role: 'child', doing: 'Chasing the hens round the well.', col: 21, row: 18, ox: -4, oy: 2 },
  { id: 'v-girl', look: 'girl', name: 'Nell Corrin', role: 'child', doing: 'Watching the cloth stall, hoping for an offcut.', col: 24, row: 18, ox: 2 },
  { id: 'v-peddler', look: 'peddler', name: 'Sabi', role: 'peddler', doing: 'Selling ribbons and bad news, mostly the latter.', col: 25, row: 16, ox: 10 },
  { id: 'v-granny', look: 'granny', name: 'Ilse Brandt', role: 'grandmother', doing: 'On her way to the well, slowly, with commentary.', col: 19, row: 17, ox: 6 },
  { id: 'v-traveller', look: 'traveller', name: 'A traveller', role: 'stranger', doing: 'Reading the stall signs and counting coins.', col: 18, row: 15, ox: 4 },
  { id: 'v-elder', look: 'elder', name: 'Elder Maren Sol', role: 'village elder', doing: 'Crossing the plaza to the inn, as every noon.', col: 27, row: 15, ox: 10 },
  // The main street and the inn.
  { id: 'v-drunk', look: 'drunk', name: 'Lars', role: 'between jobs', doing: 'Asleep on the inn\'s step.', col: 19, row: 13, ox: 0, oy: 4 },
  { id: 'v-watch1', look: 'watchman', name: 'Rolf', role: 'watchman', doing: 'On the west end of the street, mostly watching the bakery.', col: 9, row: 15, ox: 8 },
  { id: 'v-watch2', look: 'guard', name: 'Sergeant Kell', role: 'sergeant of the watch', doing: 'Leaning on his spear at the plaza\'s edge.', col: 27, row: 19, ox: 6 },
  { id: 'v-cooper', look: 'cooper', name: 'Bram Tull', role: 'cooper', doing: 'Hooping a barrel in front of his workshop.', col: 35, row: 14, ox: 0, oy: 4 },
  { id: 'v-baker', look: 'baker', name: 'Marta Holm', role: 'baker', doing: 'Carrying out the first tray of buns.', col: 25, row: 13, ox: 6, oy: 4 },
  // The lake.
  { id: 'v-fisher', look: 'fisher', name: 'Joss Brandt', role: 'fisher', doing: 'Mending a net by the boat, not hurrying.', col: 15, row: 4, ox: 14, oy: 2 },
  { id: 'v-fisherboy', look: 'fisherYoung', name: 'Tam Hale', role: 'fisher', doing: 'Carrying the morning\'s catch up from the jetty.', col: 12, row: 5, ox: 6 },
  { id: 'v-fishwife', look: 'fishwife', name: 'Orla Pike', role: 'fishmonger', doing: 'Shouting at someone about the price of eels.', col: 10, row: 13, ox: 4, oy: 4 },
  { id: 'v-washer', look: 'washer', name: 'Dilla', role: 'washerwoman', doing: 'Hanging out the Brandts\' shirts.', col: 8, row: 21, ox: -4 },
  // The rest of the village.
  { id: 'v-woodsman', look: 'woodsman', name: 'Harl Oakes', role: 'woodsman', doing: 'Stacking the logs again; they keep falling.', col: 11, row: 20, ox: 4 },
  { id: 'v-herbalist', look: 'herbalist', name: 'Wenna Marsh', role: 'herbalist', doing: 'Picking wild herbs from the verge.', col: 14, row: 13, ox: 6, oy: 2 },
  { id: 'v-smith', look: 'child', name: 'Wil Stahl', role: 'smith\'s child', doing: 'Working the bellows for pennies.', col: 17, row: 24, ox: 4 },
  { id: 'v-farmer2', look: 'wife', name: 'Aud', role: 'farmer\'s wife', doing: 'Heading to market with a bucket of milk.', col: 22, row: 25, ox: 4 },
  { id: 'v-watch3', look: 'watchman', name: 'Egil', role: 'watchman', doing: 'Posted at the bypass junction, bored.', col: 3, row: 14, ox: 10, oy: 4 },
  { id: 'v-boy2', look: 'boy', name: 'Kip Corrin', role: 'child', doing: 'Fishing the ditch beside the bypass with a bent pin.', col: 30, row: 27, ox: 4 },
  { id: 'v-peddler2', look: 'traveller', name: 'A pilgrim', role: 'traveller', doing: 'Walking the bypass, not stopping.', col: 18, row: 28, ox: 0, oy: 6 },
];

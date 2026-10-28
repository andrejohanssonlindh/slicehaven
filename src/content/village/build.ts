import {
  makeBarrels, makeCrates, makeFence, makeHaystack, makeLantern, makeStall, makeWell, makeWoodpile,
} from '../../art/buildings';
import type { Season } from '../../art/foliage';
import { makeFolk } from '../../art/folk';
import type { Prop } from '../../art/grit';
import { makeHouse } from '../../art/houses';
import { makeBasket } from '../../art/humble';
import { type RoomItem, makeRoom, makeSmithy } from '../../art/interior';
import { type TreeKind, makeTree } from '../../art/leafTrees';
import { makeBankStones, makeDragonfly, makeFloatingLog, makeJetty, makeLilyPads, makeReedClump } from '../../art/pond';
import { makeBoulder, makeStump } from '../../art/rough';
import { type ShrubKind, makeShrub } from '../../art/scrub';
import { makeFishRack, makeFishTubs, makeNetFrame, makeNetHeap, makeRowboat, makeWashLine } from '../../art/shopItems';
import { makeCampfire, makeGate, makeHandcart, makePalisade } from '../../art/village';
import type { Placed, VCell } from '../../art/villageScene';
import { PEOPLE } from './folk';
import {
  COLS, HOUSES, type HouseDef, ROWS, type RoomKey, STUFF, VILLAGERS, type Villager, groundMap,
} from './reedwater';
import {
  bakeryItems, fisherHomeItems, fishmongerItems, generalStoreItems, herbalistItems, innItems, smithItems, weaverItems,
} from './rooms';

/** Turns the village's data into the cells and props the renderer wants. */

const ROOMS: Record<RoomKey, { items: () => RoomItem[]; /** Beaten earth underfoot instead of boards. */ earth: boolean }> = {
  fisher: { items: fisherHomeItems, earth: true },
  inn: { items: innItems, earth: false },
  bakery: { items: bakeryItems, earth: true },
  herbalist: { items: herbalistItems, earth: false },
  fishmonger: { items: fishmongerItems, earth: true },
  general: { items: generalStoreItems, earth: false },
  weaver: { items: weaverItems, earth: false },
  smithy: { items: smithItems, earth: true },
};

export interface BuiltHouse {
  def: HouseDef;
  /** The id used on the map (Placed.id). */
  tag: string;
  outside: Prop;
  inside?: Prop;
}

export interface BuiltVillage {
  cells: VCell[];
  placed: Placed[];
  houses: BuiltHouse[];
  villagers: { v: Villager; tag: string }[];
}

/** One of the loose things in STUFF, by its kind name. */
export function makeStuff(kind: string, seed: number, season: Season): Prop {
  if (kind.startsWith('shrub-')) return makeShrub(seed, kind.slice(6) as ShrubKind);
  switch (kind) {
    case 'oak': case 'elm': case 'birch': case 'willow': case 'apple': case 'poplar': return makeTree(kind as TreeKind, seed, season);
    case 'lilypads': return makeLilyPads(seed);
    case 'lilypads-frog': return makeLilyPads(seed, true);
    case 'reeds': case 'cattail': case 'iris': return makeReedClump(seed, kind);
    case 'bankstones': return makeBankStones(seed);
    case 'log': return makeFloatingLog(seed);
    case 'jetty-into': return makeJetty(seed, 'into', 6);
    case 'jetty-across': return makeJetty(seed, 'across', 5);
    case 'dragonfly': return makeDragonfly(seed);
    case 'rowboat': return makeRowboat(seed);
    case 'netframe': return makeNetFrame(seed);
    case 'fishrack': return makeFishRack(seed);
    case 'fishtubs': return makeFishTubs(seed);
    case 'netheap': return makeNetHeap(seed);
    case 'washline': return makeWashLine(seed);
    case 'palisade': return makePalisade(seed, 'rundown');
    case 'gate-open': return makeGate(true);
    case 'stump': return makeStump(seed);
    case 'rock': return makeBoulder(seed);
    case 'fence': return makeFence(seed);
    case 'barrels': return makeBarrels(seed);
    case 'barrels1': return makeBarrels(seed, 1);
    case 'crates': return makeCrates(seed);
    case 'haystack': return makeHaystack(seed);
    case 'woodpile': return makeWoodpile(seed);
    case 'lantern': return makeLantern();
    case 'well': return makeWell(seed);
    case 'stall-fruit': return makeStall(seed, 'fruit');
    case 'stall-cloth': return makeStall(seed, 'cloth');
    case 'stall-bread': return makeStall(seed, 'bread');
    case 'handcart': return makeHandcart();
    case 'basket': return makeBasket(seed);
    case 'campfire': return { ...makeCampfire(true), lights: [{ dx: 0, dy: -6, r: 34, color: [1, 0.55, 0.2], flicker: 1 }] };
    default: throw new Error(`Unknown thing in the village: ${kind}`);
  }
}

export function buildVillage(season: Season = 'summer'): BuiltVillage {
  const rows = groundMap();
  const cells: VCell[] = [];
  rows.forEach((line, row) => [...line].forEach((ch, col) => {
    const ground = { g: 'grass', t: 'tallgrass', w: 'flowers', f: 'forest', p: 'path', m: 'mud', o: 'grass' }[ch] as VCell['ground'];
    cells.push({ col, row, ground, lake: ch === 'o' });
  }));

  const placed: Placed[] = [];
  for (const [kind, col, row, ox, oy, seed] of STUFF) placed.push({ col, row, ox, oy, prop: makeStuff(kind, seed, season) });

  const houses: BuiltHouse[] = [];
  for (const def of HOUSES) {
    const tag = `house:${def.id}`;
    const wide = (def.spec.cols ?? 4) === 5;
    const room = def.room ? ROOMS[def.room] : undefined;
    let outside: Prop;
    let inside: Prop | undefined;
    if (def.workshop) {
      outside = makeSmithy({ ...def.spec, items: room!.items() });
    } else {
      outside = makeHouse(def.spec);
      if (room) inside = makeRoom({ ...def.spec, cols: wide ? 5 : 4, humble: room.earth, items: room.items() });
    }
    houses.push({ def, tag, outside, inside });
    placed.push({ col: def.col, row: def.row, ox: wide ? 0 : 16, prop: outside, id: tag });
  }

  const villagers = VILLAGERS.map((v) => ({ v, tag: `folk:${v.id}` }));
  for (const { v, tag } of villagers) placed.push({ col: v.col, row: v.row, ox: v.ox ?? 0, oy: v.oy ?? 0, prop: makeFolk(PEOPLE[v.look]), id: tag });
  return { cells, placed, houses, villagers };
}

export { COLS, ROWS };

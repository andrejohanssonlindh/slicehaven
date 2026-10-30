import { makeGuestBed } from '../../../art/guest';
import {
  makeBasket, makeBucketBroom, makeCloakPegs, makeClutter, makeCookhearth, makeFootlocker, makeHanging, makeKeg, makeKindling, makePallet,
  makeRagRug, makeRoughShelf, makeSacks, makeStool3, makeStrawBits, makeTrestleTable,
} from '../../../art/humble';
import type { Prop } from '../../../art/grit';
import {
  makeAleKegs, makeBakeOven, makeCounter, makeCrateStack, makeFishRack, makeFishTubs, makeHerbRack, makeHooks, makeHungNet, makeInnBench,
  makeKneadTrough, makeLongTable, makeLoom, makeMortarBench, makeNetHeap,
} from '../../../art/shopItems';
import { makeHayBale, makeHayRack, makeHorse } from '../../../art/stable';
import type { SourceKind } from '../../../core/world3d/filaments3d';
import type { ThingDef } from '../../../core/world3d/things';

/**
 * What stands in a room: the pieces the room recipes (`content/furnish.ts`) call for. Each is a kind of thing like
 * the outdoor ones; what differs is that it is drawn as a card (a painted sprite, made by `PIECE_ART`) rather than
 * as meshes, and how it sits in a room (`furniture`) is what the room solver reads. A recipe names a kind and a rule
 * ("against the back wall"); it never says what the kind is.
 */

type Mount = 'floor' | 'hung' | 'flat';

interface Piece {
  is: string;
  look: string;
  art: () => Prop;
  mount: Mount;
  /** Depth, metres (the default is about half the width). */
  d?: number;
  /** Cap on the width, metres, for sprites drawn much wider than the thing is. */
  maxW?: number;
  gives?: { kind: SourceKind; weight: number };
  /** See `facesView` in `core/world3d/things.ts`. */
  facesView?: boolean;
}

const floor = (is: string, look: string, art: () => Prop, d?: number, maxW?: number, gives?: Piece['gives']): Piece => ({ is, look, art, mount: 'floor', d, maxW, gives });
const hung = (look: string, art: () => Prop, gives?: Piece['gives'], maxW = 1.5): Piece => ({ is: 'furniture', look, art, mount: 'hung', maxW, gives });
const flat = (look: string, art: () => Prop, gives?: Piece['gives']): Piece => ({ is: 'furniture', look, art, mount: 'flat', gives });
const F = 'furniture';

/** Every piece, by the id of its kind. */
const PIECES: Record<string, Piece> = {
  hearth: floor('fire', 'A cooking hearth of stones, with a pot.', () => makeCookhearth(), 0.7),
  oven: floor(F, 'A domed oven of clay and brick.', () => makeBakeOven(2), 0.9),
  pallet: floor(F, 'A straw pallet to sleep on.', () => makePallet(), 0.9, 1.5),
  footlocker: floor('container', 'A footlocker bound with iron.', () => makeFootlocker()),
  table: floor(F, 'A plain trestle table.', () => makeTrestleTable(), 0.8),
  stool: floor(F, 'A three-legged stool.', () => makeStool3(), 0.4),
  broom: floor(F, 'A bucket and a broom.', () => makeBucketBroom(), 0.35),
  keg: floor('container', 'A small keg.', () => makeKeg(), 0.5),
  sacks: floor('container', 'Sacks of grain.', () => makeSacks(), 0.6, 0.9),
  basket: floor('container', 'A wicker basket.', () => makeBasket(), 0.4),
  kindling: floor(F, 'A pile of kindling.', () => makeKindling(), 0.5),
  kneadtrough: floor(F, 'A trough for kneading dough.', () => makeKneadTrough(4), 0.6, 1.2),
  loom: floor(F, 'A weaver’s loom, half-woven.', () => makeLoom(45), 0.9, 1.4, { kind: 'art', weight: 1 }),
  mortarBench: floor(F, 'A bench with mortar and pestle.', () => makeMortarBench(17), 0.6, 1.3),
  longTable: floor(F, 'A long table for many.', () => makeLongTable(5), 0.8, 2.4),
  innbench: floor(F, 'A bench for the common room.', () => makeInnBench(4), 0.4, 2.0),
  aleKegs: floor('container', 'Kegs of ale on a rack.', () => makeAleKegs(2), 0.6, 1.1),
  cratestack: floor('container', 'A stack of crates.', () => makeCrateStack(34), 0.7, 1.0),
  fishRack: floor(F, 'A rack of drying fish.', () => makeFishRack(26), 0.7, 1.2),
  fishTubs: floor(F, 'Tubs of fish in water.', () => makeFishTubs(28), 0.7, 1.1, { kind: 'water', weight: 0.5 }),
  nets: floor(F, 'A heap of nets.', () => makeNetHeap(3), 0.6, 1.0),
  counter: floor(F, 'A shop counter.', () => makeCounter('general', 38), 0.6, 1.7),
  shelf: hung('A rough shelf on the wall.', () => makeRoughShelf()),
  pegs: hung('Pegs for cloaks.', () => makeCloakPegs()),
  hanging: hung('A hanging cloth, woven with a pattern.', () => makeHanging(), { kind: 'art', weight: 0.7 }),
  hooks: hung('Hooks in the wall.', () => makeHooks(24)),
  herbs: hung('Bundles of herbs hung to dry.', () => makeHerbRack(14)),
  hungNet: hung('A net hung on the wall.', () => makeHungNet(5)),
  rug: flat('A rag rug.', () => makeRagRug(), { kind: 'art', weight: 0.5 }),
  straw: flat('Straw on the floor.', () => makeStrawBits()),
  litter: flat('Odds and ends on the floor.', () => makeClutter()),
  // A guest's bed is the old, handsome one (a frame, a tick, a blanket); the village's own is the pallet.
  bed: { ...floor(F, 'A bed with a frame, a tick and a blanket.', () => makeGuestBed(), 1.25, 2.0), facesView: true },
  horse: { ...floor(F, 'A horse in its stall.', () => makeHorse(), 2.6, 0.8), facesView: true },
  haybale: floor(F, 'A bale of hay.', () => makeHayBale(), 0.7, 1.0),
  hayRack: hung('A hay rack.', () => makeHayRack(), undefined, 1.2),
};

/** The family every piece of furniture is a kind of: an item in a room. */
const family: ThingDef = { id: 'furniture', is: 'item', abstract: true };

export default [
  family,
  ...Object.entries(PIECES).map(([id, p]): ThingDef => ({
    id,
    is: p.is,
    look: p.look,
    furniture: { mount: p.mount, d: p.d, maxW: p.maxW, ...(p.facesView ? { facesView: true } : {}) },
    ...(p.gives ? { filament: p.gives } : {}),
  })),
] satisfies ThingDef[];

/** The art of each piece (a painted card), by kind id: made on demand, shared by `furnish`. */
export const PIECE_ART: Record<string, () => Prop> = Object.fromEntries(Object.entries(PIECES).map(([id, p]) => [id, p.art]));

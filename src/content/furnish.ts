import {
  makeBasket, makeBucketBroom, makeCloakPegs, makeClutter, makeCookhearth, makeFootlocker, makeHanging, makeKeg, makeKindling, makePallet,
  makeRagRug, makeRoughShelf, makeSacks, makeStool3, makeStrawBits, makeTrestleTable,
} from '../art/humble';
import { smithyItems } from '../art/interior';
import type { Prop } from '../art/grit';
import {
  makeAleKegs, makeBakeOven, makeCounter, makeCrateStack, makeFishRack, makeFishTubs, makeHerbRack, makeHooks, makeHungNet, makeInnBench,
  makeKneadTrough, makeLongTable, makeLoom, makeMortarBench, makeNetHeap, makeWallShelves,
} from '../art/shopItems';
import type { CounterKind, ShelfKind } from '../art/shopItems';
import { type PieceIn, type RoomPlan, type RoomRect, type Rule, planRoom } from '../core/world3d/roomplan';
import { TEXELS_PER_M } from '../core/world3d/tiers';

/**
 * How rooms are furnished in the 3D world: a catalog of pieces (what each is and
 * how it sits) and a recipe per kind of room, as rules, never coordinates. Add a
 * kind of room by writing a recipe; the solver in `core/world3d/roomplan.ts` finds the
 * places. Sizes are measured from the sprites, so a new piece needs no numbers.
 */

export type RoomSet = 'home' | 'fisher' | 'inn' | 'bakery' | 'herbalist' | 'fishmonger' | 'general' | 'weaver' | 'smithy';

interface PieceDef {
  make: () => Prop;
  kind: PieceIn['kind'];
  /** Depth override, metres (the default is about half the width). */
  d?: number;
  /** Cap on the width, metres, for sprites that are drawn much wider than the thing is. */
  maxW?: number;
}

const floor = (make: () => Prop, d?: number, maxW?: number): PieceDef => ({ make, kind: 'floor', d, maxW });
const hung = (make: () => Prop, maxW = 1.5): PieceDef => ({ make, kind: 'hung', maxW });
const flat = (make: () => Prop): PieceDef => ({ make, kind: 'flat' });

/** Every piece a room can hold. The key is what recipes call it. */
export const PIECES = {
  hearth: floor(() => makeCookhearth(), 0.7),
  oven: floor(() => makeBakeOven(2), 0.9),
  pallet: floor(() => makePallet(), 0.9, 1.5),
  footlocker: floor(() => makeFootlocker()),
  table: floor(() => makeTrestleTable(), 0.8),
  stool: floor(() => makeStool3(), 0.4),
  broom: floor(() => makeBucketBroom(), 0.35),
  keg: floor(() => makeKeg(), 0.5),
  sacks: floor(() => makeSacks(), 0.6, 0.9),
  basket: floor(() => makeBasket(), 0.4),
  kindling: floor(() => makeKindling(), 0.5),
  trough: floor(() => makeKneadTrough(4), 0.6, 1.2),
  loom: floor(() => makeLoom(45), 0.9, 1.4),
  mortarBench: floor(() => makeMortarBench(17), 0.6, 1.3),
  longTable: floor(() => makeLongTable(5), 0.8, 2.4),
  bench: floor(() => makeInnBench(4), 0.4, 2.0),
  aleKegs: floor(() => makeAleKegs(2), 0.6, 1.1),
  crates: floor(() => makeCrateStack(34), 0.7, 1.0),
  fishRack: floor(() => makeFishRack(26), 0.7, 1.2),
  fishTubs: floor(() => makeFishTubs(28), 0.7, 1.1),
  nets: floor(() => makeNetHeap(3), 0.6, 1.0),
  counter: floor(() => makeCounter('general', 38), 0.6, 1.7),
  shelf: hung(() => makeRoughShelf()),
  pegs: hung(() => makeCloakPegs()),
  hanging: hung(() => makeHanging()),
  hooks: hung(() => makeHooks(24)),
  herbs: hung(() => makeHerbRack(14)),
  hungNet: hung(() => makeHungNet(5)),
  rug: flat(() => makeRagRug()),
  straw: flat(() => makeStrawBits()),
  litter: flat(() => makeClutter()),
} satisfies Record<string, PieceDef>;

export type PieceKey = keyof typeof PIECES;

/** What a recipe line can say about a piece. */
interface Line {
  piece: PieceKey;
  rule: Rule;
  /** How many (each is placed in turn). */
  n?: number;
  /** Which counter or shelf it is (the art differs). */
  variant?: CounterKind | ShelfKind;
  /** Hung pieces: how high up the wall, in sprite pixels. */
  lift?: number;
  fire?: boolean;
  /** A different seed for the art, so two of a kind differ. */
  seed?: number;
  /** Tells two lines of the same piece apart (the stool at the table's front, the stool at its back). */
  tag?: string;
}

const back = (x?: number): Rule => ({ at: 'back', x });
const side = (wall: 'left' | 'right', z?: number): Rule => ({ at: 'side', wall, z });
const corner = (c: 'backLeft' | 'backRight' | 'frontLeft' | 'frontRight'): Rule => ({ at: 'corner', corner: c });
const center = (dx = 0, dz = 0): Rule => ({ at: 'center', dx, dz });
const free: Rule = { at: 'free' };

/** The village's usual one-room house. */
const HOME: Line[] = [
  { piece: 'hearth', rule: corner('backRight'), fire: true },
  { piece: 'pallet', rule: corner('backLeft') },
  { piece: 'shelf', rule: back(0.5), lift: 22 },
  { piece: 'pegs', rule: back(0.72), lift: 4 },
  { piece: 'hanging', rule: back(0.25), lift: 14 },
  // The table sits on the room's axis with a rug under it and a stool at each long side; the rest lines the walls.
  { piece: 'rug', rule: center() },
  { piece: 'table', rule: center() },
  { piece: 'stool', tag: 'front', rule: { at: 'around', of: 'table', side: 'front' } },
  { piece: 'stool', tag: 'back', rule: { at: 'around', of: 'table', side: 'back' } },
  { piece: 'footlocker', rule: side('left', 0.55) },
  { piece: 'keg', rule: side('right', 0.55) },
  { piece: 'sacks', rule: corner('frontRight') },
  { piece: 'broom', rule: side('left', 0.9) },
  { piece: 'basket', rule: free },
];

export const RECIPES: Record<Exclude<RoomSet, 'smithy'>, Line[]> = {
  home: HOME,
  fisher: [...HOME.filter((l) => l.piece !== 'sacks'), { piece: 'nets', rule: side('right', 0.2) }, { piece: 'hungNet', rule: back(0.5), lift: 18 }],
  inn: [
    { piece: 'hearth', rule: corner('backRight'), fire: true },
    { piece: 'aleKegs', rule: corner('backLeft') },
    { piece: 'counter', variant: 'ale', seed: 3, rule: back(0.3) },
    { piece: 'shelf', variant: 'tankards', seed: 41, rule: back(0.3), lift: 26 },
    { piece: 'pegs', rule: back(0.02), lift: 4 },
    { piece: 'longTable', rule: center(0.2, 0.1) },
    { piece: 'bench', rule: { at: 'around', of: 'longTable', side: 'front' } },
    { piece: 'bench', seed: 1, rule: { at: 'around', of: 'longTable', side: 'back' } },
    { piece: 'table', rule: side('left', 0.6) },
    { piece: 'stool', rule: { at: 'around', of: 'table' } },
    { piece: 'keg', rule: side('right', 0.5) },
    { piece: 'broom', rule: side('right', 0.15) },
    { piece: 'rug', rule: center(0.2, 0.1) },
  ],
  bakery: [
    { piece: 'oven', rule: corner('backRight'), fire: true },
    { piece: 'trough', rule: corner('backLeft') },
    { piece: 'shelf', variant: 'loaves', seed: 3, rule: back(0.35), lift: 22 },
    { piece: 'counter', variant: 'bread', seed: 7, rule: center(0, 0.6) },
    { piece: 'sacks', rule: side('left', 0.5) },
    { piece: 'kindling', rule: side('right', 0.6) },
    { piece: 'basket', rule: free },
    { piece: 'broom', rule: side('left', 0.9) },
    { piece: 'stool', rule: free },
  ],
  herbalist: [
    { piece: 'hearth', rule: corner('backRight'), fire: true },
    { piece: 'pallet', rule: corner('backLeft') },
    { piece: 'shelf', variant: 'bottles', seed: 12, rule: back(0.22), lift: 24 },
    { piece: 'shelf', variant: 'jars', seed: 13, rule: back(0.7), lift: 24 },
    { piece: 'herbs', rule: back(0.46), lift: 48 },
    { piece: 'mortarBench', rule: back(0.55) },
    { piece: 'counter', variant: 'herbs', seed: 18, rule: center(0, 0.6) },
    { piece: 'basket', rule: side('left', 0.5) },
    { piece: 'stool', rule: side('right', 0.5) },
    { piece: 'broom', rule: side('right', 0.9) },
  ],
  fishmonger: [
    { piece: 'hearth', rule: corner('backRight'), fire: true },
    { piece: 'nets', rule: corner('backLeft') },
    { piece: 'fishRack', rule: back(0.62) },
    { piece: 'hungNet', rule: back(0.26), lift: 14 },
    { piece: 'hooks', rule: back(0.7), lift: 10 },
    { piece: 'fishTubs', rule: side('left', 0.35) },
    { piece: 'counter', variant: 'fish', seed: 29, rule: center(0, 0.6) },
    { piece: 'keg', rule: side('right', 0.5) },
    { piece: 'broom', rule: side('left', 0.9) },
  ],
  general: [
    { piece: 'shelf', variant: 'wares', seed: 32, rule: back(0.3), lift: 22 },
    { piece: 'hooks', rule: back(0.72), lift: 8 },
    { piece: 'crates', rule: corner('backLeft') },
    { piece: 'sacks', rule: side('right', 0.6) },
    { piece: 'keg', rule: side('right', 0.3) },
    { piece: 'footlocker', rule: side('left', 0.5) },
    { piece: 'counter', variant: 'general', seed: 38, rule: center(0, 0.6) },
    { piece: 'basket', rule: free },
    { piece: 'broom', rule: side('left', 0.9) },
  ],
  weaver: [
    { piece: 'hearth', rule: corner('backRight'), fire: true },
    { piece: 'pallet', rule: corner('backLeft') },
    { piece: 'loom', rule: back(0.6) },
    { piece: 'shelf', variant: 'bolts', seed: 41, rule: back(0.3), lift: 24 },
    { piece: 'pegs', rule: back(0.58), lift: 8 },
    { piece: 'shelf', rule: back(0.88), lift: 40 },
    { piece: 'counter', variant: 'cloth', seed: 46, rule: center(-0.3, 0.6) },
    { piece: 'stool', rule: { at: 'around', of: 'loom' } },
    { piece: 'basket', rule: free },
  ],
};

/** A piece, once its sprite is made and measured. */
export interface Furnishing {
  id: string;
  prop: Prop;
  line: Line;
}

/** Size of the opaque part of a sprite's first frame, in sprite pixels. */
function opaqueSize(p: Prop): { w: number; h: number } {
  const f = p.frames[0];
  let x0 = f.w, x1 = -1, y0 = f.h, y1 = -1;
  for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) if (f.data[(y * f.w + x) * 4 + 3] > 0) {
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  return x1 < 0 ? { w: 0, h: 0 } : { w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

const makePiece = (key: PieceKey, line: Line): Prop => {
  if (key === 'counter') return makeCounter((line.variant as CounterKind) ?? 'general', line.seed ?? 20);
  if (key === 'shelf' && line.variant) return makeWallShelves(line.variant as ShelfKind, line.seed ?? 23);
  return PIECES[key].make();
};

export interface Furnished {
  plan: RoomPlan;
  /** The art of each placed piece, by id. */
  props: Map<string, Prop>;
}

/** Furnish a room: make the art, measure it, and let the solver place it. */
export function furnish(set: RoomSet, room: RoomRect, doorX: number, seed = 0): Furnished {
  const props = new Map<string, Prop>();
  const ins: PieceIn[] = [];
  const add = (id: string, prop: Prop, def: { kind: PieceIn['kind']; d?: number; maxW?: number }, line: { rule: Rule; lift?: number; fire?: boolean }): void => {
    // The sprites are drawn obliquely, so their width is part depth: a floor piece's real width is about 0.6 of it.
    const px = opaqueSize(prop);
    const m = px.w / TEXELS_PER_M;
    const w = Math.min(def.maxW ?? 9, def.kind === 'flat' ? m * 0.8 : def.kind === 'hung' ? m * 0.62 : m * 0.6);
    const d = def.kind === 'flat' ? Math.max(0.4, (px.h / TEXELS_PER_M) * 0.9) : def.d !== undefined ? def.d * 0.75 : Math.min(0.9, Math.max(0.3, w * 0.55));
    props.set(id, prop);
    ins.push({ id, w, d, kind: def.kind, lift: def.kind === 'hung' ? (line.lift ?? 22) / TEXELS_PER_M : undefined, rule: line.rule, fire: line.fire });
  };
  if (set === 'smithy') {
    // The workshop's art is its own (forge, anvil, trough, bench, coal bin, tool rack); the rules are ours.
    const [forge, anvil, trough, bench, coal, rack] = smithyItems().map((it) => it.prop);
    add('forge', forge, { kind: 'floor', d: 0.9, maxW: 1.4 }, { rule: corner('backRight'), fire: true });
    add('workbench', bench, { kind: 'floor', d: 0.6, maxW: 1.6 }, { rule: back(0.1) });
    add('toolrack', rack, { kind: 'hung', maxW: 1.4 }, { rule: back(0.55), lift: 22 });
    add('anvil', anvil, { kind: 'floor', d: 0.5, maxW: 0.8 }, { rule: center() });
    add('trough', trough, { kind: 'floor', d: 0.5, maxW: 1.1 }, { rule: side('left', 0.5) });
    add('coalbin', coal, { kind: 'floor', d: 0.5, maxW: 0.9 }, { rule: corner('frontRight') });
  } else {
    for (const line of RECIPES[set]) {
      for (let i = 0; i < (line.n ?? 1); i++) {
        const id = (line.n ?? 1) > 1 ? `${line.piece}#${i}` : line.piece;
        const unique = `${id}${line.variant ? `:${line.variant}` : ''}${line.tag ? `@${line.tag}` : ''}`;
        const rule = line.rule.at === 'around' ? { ...line.rule, of: line.rule.of } : line.rule;
        add(unique, makePiece(line.piece, { ...line, seed: (line.seed ?? 0) + i }), PIECES[line.piece], { rule, lift: line.lift, fire: line.fire });
      }
    }
  }
  return { plan: planRoom(room, doorX, ins, seed), props };
}

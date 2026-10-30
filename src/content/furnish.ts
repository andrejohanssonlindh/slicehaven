import { makeGuestBed } from '../art/guest';
import { smithyItems } from '../art/interior';
import { makeHorse } from '../art/stable';
import type { Prop } from '../art/grit';
import { makeCounter, makeWallShelves } from '../art/shopItems';
import type { CounterKind, ShelfKind } from '../art/shopItems';
import { THINGS } from './things';
import { PIECE_ART } from './things/kinds/furniture';
import type { HouseModel, LevelRoom } from '../core/world3d/house';
import { type PieceIn, type PlanOpts, type RoomPlan, type RoomRect, type Rule, planRoom } from '../core/world3d/roomplan';
import type { SourceKind } from '../core/world3d/filaments3d';
import { TEXELS_PER_M } from '../core/world3d/tiers';

/**
 * How rooms are furnished in the 3D world: a catalog of pieces (what each is and
 * how it sits) and a recipe per kind of room, as rules, never coordinates. Add a
 * kind of room by writing a recipe; the solver in `core/world3d/roomplan.ts` finds the
 * places. Sizes are measured from the sprites, so a new piece needs no numbers.
 */

export type RoomSet =
  | 'home' | 'fisher' | 'inn' | 'bakery' | 'herbalist' | 'fishmonger' | 'general' | 'weaver' | 'smithy'
  // Rooms upstairs and in the stable (see `roleSet`).
  | 'guestroom' | 'landing' | 'attic' | 'upstairs' | 'stall' | 'aisle';

/**
 * A piece is a kind of thing (`content/things/kinds/furniture.ts`): what it is, how it sits (`furniture`) and what it
 * gives the filament field (`filament`) are asked of the kind. A recipe line names the kind.
 */
export type PieceKey = string;

/** How a piece sits in a room, from its kind. */
const sitting = (key: PieceKey): { kind: PieceIn['kind']; d?: number; maxW?: number } => {
  const f = THINGS.get(key).furniture;
  if (!f) throw new Error(`${key} is not a piece of furniture`);
  return { kind: f.mount, d: f.d, maxW: f.maxW };
};

/** What a kind of piece gives off to the filament field when it stands in a room (a fire is the line's own `fire` flag). */
const givenBy = (key: PieceKey): { kind: SourceKind; weight: number } | undefined => {
  const f = THINGS.get(key).filament;
  return f ? { kind: f.kind, weight: f.weight ?? 1 } : undefined;
};

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
  /** Books on it (a few shelves of them add a little iconotropy and semotropy to the room). */
  books?: number;
  /** A different seed for the art, so two of a kind differ. */
  seed?: number;
  /** Tells two lines of the same piece apart (the stool at the table's front, the stool at its back). */
  tag?: string;
  /** The art takes the room's own seed too, so each room (each stall's horse) looks different. */
  vary?: boolean;
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
    { piece: 'innbench', rule: { at: 'around', of: 'longTable', side: 'front' } },
    { piece: 'innbench', seed: 1, rule: { at: 'around', of: 'longTable', side: 'back' } },
    { piece: 'table', rule: side('left', 0.6) },
    { piece: 'stool', rule: { at: 'around', of: 'table' } },
    { piece: 'keg', rule: side('right', 0.5) },
    { piece: 'broom', rule: side('right', 0.15) },
    { piece: 'rug', rule: center(0.2, 0.1) },
    // A big common room has a second long table, and more to sit at.
    { piece: 'longTable', tag: 'b', seed: 5, rule: center(-2.6, 0.3) },
    { piece: 'innbench', tag: 'b1', seed: 2, rule: { at: 'around', of: 'longTable@b', side: 'front' } },
    { piece: 'innbench', tag: 'b2', seed: 3, rule: { at: 'around', of: 'longTable@b', side: 'back' } },
    { piece: 'table', tag: 'c', rule: side('right', 0.2) },
    { piece: 'stool', tag: 'c', rule: { at: 'around', of: 'table@c' } },
    { piece: 'keg', tag: 'b', rule: corner('frontRight') },
    { piece: 'cratestack', rule: side('left', 0.15) },
    { piece: 'hanging', rule: back(0.75), lift: 30 },
    { piece: 'basket', rule: free },
  ],
  // The inn's guest rooms: a bed or two, a chest at the foot, a place to hang a cloak.
  guestroom: [
    { piece: 'bed', vary: true, rule: back(0) },
    { piece: 'bed', tag: 'second', vary: true, seed: 3, rule: { at: 'around', of: 'bed', side: 'front' } },
    { piece: 'footlocker', rule: side('right', 0.6) },
    { piece: 'stool', rule: side('left', 0.7) },
    { piece: 'pegs', rule: back(0.8), lift: 4 },
    { piece: 'shelf', rule: back(0.5), lift: 40 },
    { piece: 'rug', rule: center(0, 0.2) },
    { piece: 'basket', rule: free },
  ],
  // The corridor upstairs: not much, but not bare.
  landing: [
    { piece: 'innbench', rule: back(0.75) },
    { piece: 'footlocker', rule: back(0.95) },
    { piece: 'hanging', rule: back(0.55), lift: 24 },
    { piece: 'pegs', rule: back(0.3), lift: 6 },
    { piece: 'broom', rule: back(0.45) },
  ],
  // Under the roof: a row of beds for those who pay least, and the inn's spare stores.
  attic: [
    { piece: 'bed', n: 4, vary: true, rule: back(0) },
    { piece: 'pallet', n: 2, rule: side('right', 0.7) },
    { piece: 'footlocker', n: 2, rule: side('left', 0.6) },
    { piece: 'sacks', rule: corner('frontRight') },
    { piece: 'keg', rule: corner('backLeft') },
    { piece: 'cratestack', rule: free },
    { piece: 'rug', rule: center(0, 0.1) },
    { piece: 'pegs', rule: back(0.9), lift: 4 },
    { piece: 'basket', rule: free },
  ],
  // The rooms over a shop: the shopkeeper's home (a bed behind the hearth, table, chest).
  upstairs: [
    { piece: 'hearth', rule: corner('backRight'), fire: true },
    { piece: 'shelf', rule: back(0.5), lift: 22, books: 1 },
    { piece: 'pegs', rule: back(0.72), lift: 4 },
    { piece: 'hanging', rule: back(0.3), lift: 30 },
    { piece: 'rug', rule: center() },
    { piece: 'table', rule: center() },
    { piece: 'stool', tag: 'front', rule: { at: 'around', of: 'table', side: 'front' } },
    { piece: 'stool', tag: 'back', rule: { at: 'around', of: 'table', side: 'back' } },
    { piece: 'footlocker', rule: side('left', 0.55) },
    { piece: 'keg', rule: side('right', 0.55) },
    { piece: 'broom', rule: side('left', 0.9) },
    { piece: 'basket', rule: free },
  ],
  // One horse in its stall, on straw, with a hay rack on the wall and a bucket in the corner.
  stall: [
    { piece: 'horse', vary: true, rule: center(0, 0.1) },
    { piece: 'straw', rule: center(0, 0.1) },
    { piece: 'hayRack', rule: back(0.5), lift: 22 },
    { piece: 'broom', rule: corner('backRight') },
  ],
  // The aisle: hay, tack, a water barrel, a chest of gear.
  aisle: [
    { piece: 'haybale', n: 2, rule: side('right', 0.95) },
    { piece: 'hooks', rule: back(0.25), lift: 30 },
    { piece: 'pegs', rule: back(0.7), lift: 10 },
    { piece: 'footlocker', rule: side('left', 0.95) },
    { piece: 'keg', rule: side('left', 0.7) },
    { piece: 'sacks', rule: corner('frontRight') },
    { piece: 'broom', rule: side('right', 0.7) },
    { piece: 'straw', rule: center() },
    { piece: 'litter', rule: free },
  ],
  bakery: [
    { piece: 'oven', rule: corner('backRight'), fire: true },
    { piece: 'kneadtrough', rule: corner('backLeft') },
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
    { piece: 'shelf', variant: 'bottles', seed: 12, rule: back(0.22), lift: 24, books: 1 },
    { piece: 'shelf', variant: 'jars', seed: 13, rule: back(0.7), lift: 24, books: 1 },
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
    { piece: 'shelf', variant: 'wares', seed: 32, rule: back(0.3), lift: 22, books: 1 },
    { piece: 'hooks', rule: back(0.72), lift: 8 },
    { piece: 'cratestack', rule: corner('backLeft') },
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

/** How far the opaque part of a sprite reaches from its anchor sideways, in sprite pixels (the wider side). */
function opaqueHalf(p: Prop): number {
  const f = p.frames[0];
  let x0 = f.w, x1 = -1;
  for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) if (f.data[(y * f.w + x) * 4 + 3] > 0) {
    x0 = Math.min(x0, x); x1 = Math.max(x1, x);
  }
  return x1 < 0 ? 0 : Math.max(p.ax - x0, x1 + 1 - p.ax);
}

/** 1 / cos(the camera's yaw 0.42), a touch generous: the widest a card is drawn across its house's axis. */
const CARD_STRETCH = 1.12;

/** Art is made once for each look and shared by every room that has it (the sprite atlas takes each look once, however many houses a city has). */
const artCache = new Map<string, Prop>();
let smithyArt: Prop[] | undefined;

const makePiece = (key: PieceKey, line: Line): Prop => {
  const id = `${key}|${line.variant ?? ''}|${line.seed ?? ''}`;
  let p = artCache.get(id);
  if (!p) {
    if (key === 'counter') p = makeCounter((line.variant as CounterKind) ?? 'general', line.seed ?? 20);
    else if (key === 'shelf' && line.variant) p = makeWallShelves(line.variant as ShelfKind, line.seed ?? 23);
    else if (key === 'horse') p = makeHorse(line.seed ?? 1);
    else if (key === 'bed') p = makeGuestBed(1 + (line.seed ?? 0) % 5);
    else p = PIECE_ART[key]();
    artCache.set(id, p);
  }
  return p;
};

export interface Furnished {
  plan: RoomPlan;
  /** The art of each placed piece, by id. */
  props: Map<string, Prop>;
  /** What the placed pieces give off to the filament field, in the house's frame. */
  sources: { x: number; z: number; kind: SourceKind; weight: number }[];
}

/** Furnish a room: make the art, measure it, and let the solver place it. */
export function furnish(set: RoomSet, room: RoomRect, doorX: number, seed = 0, opts: PlanOpts & { art?: number } = {}): Furnished {
  const props = new Map<string, Prop>();
  const ins: PieceIn[] = [];
  const gives = new Map<string, { kind: SourceKind; weight: number }>();
  const add = (id: string, prop: Prop, def: { kind: PieceIn['kind']; d?: number; maxW?: number }, line: { rule: Rule; lift?: number; fire?: boolean }, source?: { kind: SourceKind; weight: number }): void => {
    if (source) gives.set(id, source);
    const px = opaqueSize(prop);
    const m = px.w / TEXELS_PER_M;
    // The sprites are drawn obliquely, so their width is part depth: a floor piece's real width (its footprint, what
    // blocks feet and other pieces) is about 0.6 of it.
    const w = Math.min(def.maxW ?? 9, def.kind === 'flat' ? m * 0.8 : def.kind === 'hung' ? m * 0.62 : m * 0.6);
    // The card itself follows the house's axes, stretched sideways by 1/cos(yaw) to keep one art pixel per screen pixel,
    // and covers more than the footprint: the solver keeps all of it inside the walls (`vw`).
    const vw = def.kind === 'flat' ? w : Math.max(w, 2 * opaqueHalf(prop) / TEXELS_PER_M * CARD_STRETCH);
    const d = def.kind === 'flat' ? Math.max(0.4, (px.h / TEXELS_PER_M) * 0.9) : def.d !== undefined ? def.d * 0.75 : Math.min(0.9, Math.max(0.3, w * 0.55));
    props.set(id, prop);
    ins.push({ id, w, vw, d, kind: def.kind, lift: def.kind === 'hung' ? (line.lift ?? 22) / TEXELS_PER_M : undefined, rule: line.rule, fire: line.fire });
  };
  if (set === 'smithy') {
    // The workshop's art is its own (forge, anvil, trough, bench, coal bin, tool rack); the rules are ours.
    smithyArt ??= smithyItems().map((it) => it.prop);
    const [forge, anvil, trough, bench, coal, rack] = smithyArt;
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
        add(unique, makePiece(line.piece, { ...line, seed: (line.seed ?? 0) + i + (line.vary ? opts.art ?? 0 : 0) }), sitting(line.piece), { rule, lift: line.lift, fire: line.fire },
          line.books ? { kind: 'book', weight: line.books } : givenBy(line.piece));
      }
    }
  }
  const plan = planRoom(room, doorX, ins, seed, opts);
  const sources = plan.pieces.flatMap((p) => {
    const g = gives.get(p.id);
    return g ? [{ x: p.x, z: p.z, ...g }] : [];
  });
  return { plan, props, sources };
}

/** What a kind of room upstairs, or in the stable, holds; any other role is the building's own kind (`main`). */
const ROLE_SETS: Record<string, RoomSet> = { guest: 'guestroom', landing: 'landing', attic: 'attic', upstairs: 'upstairs', stall: 'stall', aisle: 'aisle' };
export const roleSet = (role: string, main: RoomSet): RoomSet => ROLE_SETS[role] ?? main;

/** The kinds of piece a building's rooms call for (without placing them): what the map compiler checks. */
export function piecesOf(model: HouseModel, main: RoomSet): string[] {
  const sets = new Set(model.levels.flatMap((lv) => lv.rooms.map((r) => roleSet(r.role, main))));
  return [...new Set([...sets].flatMap((s) => (s === 'smithy' ? [] : RECIPES[s].map((l) => l.piece))))];
}

/** A furnished room of a building, with the storey it is on. */
export interface FurnishedRoom extends Furnished {
  level: number;
  room: LevelRoom;
}

/** Every room of a building furnished: the ground floor's by the kind the place is, the others by what they are for. */
export function furnishHouse(model: HouseModel, main: RoomSet, seed = 0): FurnishedRoom[] {
  const out: FurnishedRoom[] = [];
  model.levels.forEach((lv, level) => lv.rooms.forEach((room, i) => {
    const art = seed + i + level * 3;
    const f = furnish(roleSet(room.role, main), room.rect, room.doorX, seed + level * 7 + i, { reserved: room.reserved, zones: room.zones, clear: room.clear, entry: room.entry, art });
    out.push({ ...f, level, room });
  }));
  return out;
}

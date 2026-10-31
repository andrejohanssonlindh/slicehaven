import type { Prop } from '../art/grit';
import { THINGS } from './things';
import { PIECE_ART } from './things/kinds/furniture';
import type { HouseModel, LevelRoom } from '../core/world3d/house';
import { type PieceIn, type PlanOpts, type RoomLine, type RoomPlan, type RoomRect, type Rule, planRoom } from '../core/world3d/roomplan';
import type { SourceKind } from '../core/world3d/filaments3d';
import { TEXELS_PER_M } from '../core/world3d/tiers';

/**
 * How rooms are furnished in the 3D world. What a room holds is its kind (`content/things/kinds/rooms.ts`: a
 * recipe of rules, never coordinates); how a piece sits is the piece's kind (`kinds/furniture.ts`). The solver in
 * `core/world3d/roomplan.ts` finds the places. Sizes are measured from the sprites, so a new piece needs no numbers.
 */

/** The id of a kind of room (`home`, `taproom`, `smithy`...). */
export type RoomKind = string;

/** Every kind of room there is. */
export const ROOM_KINDS: RoomKind[] = THINGS.placeable.filter((k) => THINGS.isRoom(k));

/** How a piece sits in a room, from its kind. */
const sitting = (key: string): { kind: PieceIn['kind']; d?: number; maxW?: number } => {
  const f = THINGS.get(key).furniture;
  if (!f) throw new Error(`${key} is not a piece of furniture`);
  return { kind: f.mount, d: f.d, maxW: f.maxW };
};

/** What a kind of piece gives off to the filament field when it stands in a room (a fire is the line's own `fire` flag). */
const givenBy = (key: string): { kind: SourceKind; weight: number } | undefined => {
  const f = THINGS.get(key).filament;
  return f ? { kind: f.kind, weight: f.weight ?? 1 } : undefined;
};

/** A piece, once its sprite is made and measured. */
export interface Furnishing {
  id: string;
  prop: Prop;
  line: RoomLine;
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

const makePiece = (key: string, line: RoomLine): Prop => {
  const id = `${key}|${line.variant ?? ''}|${line.seed ?? ''}`;
  let p = artCache.get(id);
  if (!p) {
    p = PIECE_ART[key](line.variant, line.seed);
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

/** Furnish a room as a kind of room: make the art, measure it, and let the solver place it. */
export function furnish(kind: RoomKind, room: RoomRect, doorX: number, seed = 0, opts: PlanOpts & { art?: number } = {}): Furnished {
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
  for (const line of THINGS.recipe(kind)) {
    for (let i = 0; i < (line.n ?? 1); i++) {
      const id = (line.n ?? 1) > 1 ? `${line.piece}#${i}` : line.piece;
      const unique = `${id}${line.variant ? `:${line.variant}` : ''}${line.tag ? `@${line.tag}` : ''}`;
      add(unique, makePiece(line.piece, { ...line, seed: (line.seed ?? 0) + i + (line.vary ? opts.art ?? 0 : 0) }), sitting(line.piece), line,
        line.books ? { kind: 'book', weight: line.books } : givenBy(line.piece));
    }
  }
  const plan = planRoom(room, doorX, ins, seed, opts);
  const sources = plan.pieces.flatMap((p) => {
    const g = gives.get(p.id);
    return g ? [{ x: p.x, z: p.z, ...g }] : [];
  });
  return { plan, props, sources };
}

/** The kind of a building's room: by its role, as the kind of building says (`rooms`); its `main` room is the map's kind. */
export const roomKindOf = (role: string, main: RoomKind, building = 'building'): RoomKind => (role === 'main' ? undefined : THINGS.get(building).rooms?.[role]) ?? main;

/** The kinds of piece a building's rooms call for (without placing them): what the map compiler checks. */
export function piecesOf(model: HouseModel, main: RoomKind, building?: string): string[] {
  const kinds = new Set(model.levels.flatMap((lv) => lv.rooms.map((r) => roomKindOf(r.role, main, building))));
  return [...new Set([...kinds].flatMap((k) => THINGS.recipe(k).map((l) => l.piece)))];
}

/** A furnished room of a building, with the storey it is on. */
export interface FurnishedRoom extends Furnished {
  level: number;
  room: LevelRoom;
}

/** Every room of a building furnished: the ground floor's by the kind the place is, the others by what they are for. */
export function furnishHouse(model: HouseModel, main: RoomKind, seed = 0, building?: string): FurnishedRoom[] {
  const out: FurnishedRoom[] = [];
  model.levels.forEach((lv, level) => lv.rooms.forEach((room, i) => {
    const art = seed + i + level * 3;
    const f = furnish(roomKindOf(room.role, main, building), room.rect, room.doorX, seed + level * 7 + i, { reserved: room.reserved, zones: room.zones, clear: room.clear, entry: room.entry, art });
    out.push({ ...f, level, room });
  }));
  return out;
}

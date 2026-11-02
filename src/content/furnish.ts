import { THINGS } from './things';
import type { HouseModel, LevelRoom } from '../core/world3d/house';
import { type PieceIn, type PlanOpts, type RoomPlan, type RoomRect, planRoom } from '../core/world3d/roomplan';
import type { SourceKind } from '../core/world3d/filaments3d';
import { TEXELS_PER_M } from '../core/world3d/tiers';

/**
 * How rooms are furnished in the 3D world. What a room holds is its kind (`content/things/kinds/rooms.ts`: a
 * recipe of rules, never coordinates); how a piece sits is the piece's kind (`kinds/furniture.ts`). The solver in
 * `core/world3d/roomplan.ts` finds the places. Sizes are the models' footprints, so a recipe needs no numbers.
 */

/** The id of a kind of room (`home`, `taproom`, `smithy`...). */
export type RoomKind = string;

/** Every kind of room there is. */
export const ROOM_KINDS: RoomKind[] = THINGS.placeable.filter((k) => THINGS.isRoom(k));

/** What a kind of piece gives off to the filament field when it stands in a room (a fire is the line's own `fire` flag). */
const givenBy = (key: string): { kind: SourceKind; weight: number } | undefined => {
  const f = THINGS.get(key).filament;
  return f ? { kind: f.kind, weight: f.weight ?? 1 } : undefined;
};

/** A placed piece: its kind, and the seed and variant its model is drawn with. */
export interface ModelPiece {
  kind: string;
  seed: number;
  variant?: string;
}

export interface Furnished {
  plan: RoomPlan;
  /** The placed pieces' models, by id. */
  models: Map<string, ModelPiece>;
  /** What the placed pieces give off to the filament field, in the house's frame. */
  sources: { x: number; z: number; kind: SourceKind; weight: number }[];
}

/** Furnish a room as a kind of room: each piece measured by its model's footprint, placed by the solver, turned to its wall. */
export function furnish(kind: RoomKind, room: RoomRect, doorX: number, seed = 0, opts: PlanOpts & { art?: number } = {}): Furnished {
  const ins: PieceIn[] = [];
  const gives = new Map<string, { kind: SourceKind; weight: number }>();
  const models = new Map<string, ModelPiece>();
  for (const line of THINGS.recipe(kind)) {
    const f = THINGS.get(line.piece).furniture;
    if (!f) throw new Error(`${line.piece} is not a piece of furniture`);
    for (let i = 0; i < (line.n ?? 1); i++) {
      const id = (line.n ?? 1) > 1 ? `${line.piece}#${i}` : line.piece;
      const unique = `${id}${line.variant ? `:${line.variant}` : ''}${line.tag ? `@${line.tag}` : ''}`;
      const source = line.books ? { kind: 'book' as const, weight: line.books } : givenBy(line.piece);
      if (source) gives.set(unique, source);
      models.set(unique, { kind: line.piece, seed: (line.seed ?? 0) + i + (line.vary ? opts.art ?? 0 : 0), ...(line.variant ? { variant: line.variant } : {}) });
      ins.push({ id: unique, w: f.model.w, d: f.model.d, kind: f.mount, lift: f.mount === 'hung' ? (line.lift ?? 22) / TEXELS_PER_M : undefined, rule: line.rule, fire: line.fire, turns: true });
    }
  }
  const plan = planRoom(room, doorX, ins, seed, opts);
  const sources = plan.pieces.flatMap((p) => {
    const g = gives.get(p.id);
    return g ? [{ x: p.x, z: p.z, ...g }] : [];
  });
  return { plan, models, sources };
}

/** The kind of a building's room: by its role, as the kind of building says (`rooms`); its `main` room is the map's kind. */
export const roomKindOf = (role: string, main: RoomKind, building = 'building'): RoomKind => (role === 'main' ? undefined : THINGS.get(building).rooms?.[role]) ?? main;

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

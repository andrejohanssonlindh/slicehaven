import type { Welcome } from './standing';
import type { Size } from './carry';
import type { FSource, SourceKind } from './filaments3d';
import type { BuildingPlan } from './house';
import type { MeshData } from './mesh';
import type { WayOfMoving } from './motion';
import type { RoomLine, RoomRecipe } from './roomplan';
import type { Lumps, PlacedProp } from './props';
import { type Shape, circle } from './space';
import { type StateDef, placedId } from './state';
import type { TreeModel } from './tree';

/**
 * Kinds of thing: what a well, a palisade or an oak *is*, in one place. Each kind is a `ThingDef` (one file each, in
 * `content/things/`) that says what it is a kind of (`is`) and inherits everything it does not say itself, so "a wall
 * stops the eye" is said once, on `wall`, and every wall has it. The tree is the same one the skill library uses
 * for its hooks (`content/skillweb/kinds.ts`): a kind's chain ends in the library's kinds (`structure`, `water`,
 * `plant`...), so a well is water to the hooks as well as to the eye and the field.
 *
 * A placed thing in a map is light (a kind, a spot, a turn, a seed); everything else is asked of its kind here. The
 * rules (feet, sight, filaments) and the renderer (`engine3d/world.ts`) read the same answers.
 */

/** What a part of a thing is drawn with; the renderer has one material for each. `bush` is leafy and sways from the ground. `iron` is dark worked metal (hoops, hinges, tools); give it a `colour` for brass or copper. */
export type ThingMaterial = 'bark' | 'plank' | 'stone' | 'hay' | 'water' | 'cloth' | 'clothHang' | 'bush' | 'iron';

/**
 * A piece of furniture as a 3D model (plan item A2). Local metres: the floor at y = 0, the piece centred on x and z,
 * its front (the side people use) toward +z, its back against the wall at z = -d/2. The room solver turns it to its wall.
 */
export interface FurnitureModel {
  /** Footprint along its front, metres. */
  w: number;
  /** Footprint from back to front, metres. */
  d: number;
  /** The meshes, for a seed (so two of a kind can differ) and a recipe line's variant (which counter, which shelf). */
  draw(seed: number, variant?: string): ThingParts;
  /** Something held in one hand (a sword): where along x the hand holds it. Drawn in the right hand, not in both arms. */
  grip?: number;
}

/** The 3D model of a kind, if it has one: a piece of furniture's, or a loose item's own (a sword). */
export const modelOf = (t: Pick<ThingDef, 'furniture' | 'model'>): FurnitureModel | undefined => t.furniture?.model ?? t.model;

export interface ThingParts {
  /** Meshes, each with its material (cloth in a colour, sRGB hex). Local metres, x along the thing's length. */
  meshes: { material: ThingMaterial; mesh: MeshData; colour?: number }[];
  /** Lumpy balls (a bush, a boulder), drawn like a tree's crown. */
  lumps?: { material: 'stone' | 'bush'; lumps: Lumps };
}

/** One shape of ground a thing stands on, in its own frame (x along its length; turned by `rot`, scaled by `size`). */
export type Foot =
  | { circle: number }
  /** A box of half sizes `hw` by `hd`, its centre `at` (local, default the middle). */
  | { box: [hw: number, hd: number]; at?: [lx: number, lz: number] }
  /** A run along x as long as the thing (`len`), `hd` either side of it. */
  | { run: number };

/** A placed thing as its kind sees it: the map's placement with the kind's defaults filled in. */
export interface Placed extends PlacedProp {
  /** The run length in use (the placement's, or the kind's default). */
  len: number;
}

export interface TreeLook {
  /** The model for a seed (trunk and crown). */
  model(seed: number): TreeModel;
  /** Where its crown sheds leaves from in the wind (height and radius, metres); null: it holds them (or has none). */
  crown: { y: number; r: number } | null;
  /** Leaf colour multiplier (sRGB hex), if not the broadleaf green. */
  leafTint?: number;
}

export interface ThingDef {
  /** What maps and recipes call it. Also its name in the kind tree. */
  id: string;
  /** What it is a kind of: another thing here, or a kind in the skill library's tree. */
  is: string;
  /** A family for others to inherit from: not placed in maps. */
  abstract?: boolean;
  /** One line for when it is looked at (English; through `t()` when shown). */
  look?: string;
  /** What it is called in lines ("Light the {name}"), lower case; default its id. Not inherited. */
  name?: string;
  /** It can be sat on: the seat's height above the floor, metres (the verb `sit`). */
  seat?: number;
  /**
   * How big it is to take (plan B3b, `core/world3d/carry.ts`): pocket, bag, strapped, in the hands, or heavy (not
   * alone). No size: it is part of where it stands (a hearth, a shelf) and can't be taken.
   */
  size?: Size;
  /**
   * How hard it is to notice lying about (plan B8, the director: weapons on the sand are hard to see): an Alertness
   * roll against this, harder further off (`spotDifficulty` in `perceive.ts`). Inherited; left out, it is never missed.
   */
  spot?: number;
  /** What it weighs, kilograms (plan B6): what can be carried is set against the carrier's capacity (`carryCapacity`). */
  weight?: number;
  /** What it is worth, in coins (a first guess until prices come with B6): taking it weighs more against a poor owner. */
  value?: number;
  /** How much it matters to its owner beyond its price (a guard's sword, an heirloom): 0 to 3, each step half as much again. */
  importance?: number;
  /**
   * The states its placed things can be in, and what each starts as (`core/world3d/state.ts`): a fire's `lit`, a
   * door's `open`. Merged down the tree: a kind adds to what it inherits, and may change a start.
   */
  states?: Record<string, StateDef>;
  /** The ground it takes up: what stops feet, and (if `blocksSight`) the eye. Function form for what changes with the placement. */
  foot?: Foot[] | ((p: Placed) => Shape[]);
  /** The eye cannot see through it. */
  blocksSight?: boolean;
  /** The room things scattered by a map rule leave round it, metres (default 0.5). */
  keepClear?: number;
  /** What it gives off to the filament field, if anything. */
  filament?: { kind: SourceKind; weight?: number } | null;
  /** The default run length for things that are runs (fences, walls), metres. */
  len?: number;
  /** How far it is sunk into the ground, metres. */
  sink?: number;
  /** It lays a walkable deck this wide along its run, over water too (a bridge); it may stand in water. */
  deck?: number;
  /** It carries a flame this high above the ground (metres, scaled with it), with its light. */
  flame?: {
    y: number;
    /** 1 = a campfire's flame; the default, 0.42, is a torch's. */
    size?: number;
    /** How many bits of flame (default 10). */
    count?: number;
    /** How hard its light shines (default 9). */
    power?: number;
    /** The light's height above the flame's foot (default 0.3). */
    lightY?: number;
  };
  /**
   * A piece of furniture: how it sits in a room (on the floor, hung on a wall, or flat like a rug) and its 3D model
   * (`content/things/models/`, one file each; see `director/design/models-authoring.md`), which gives its footprint.
   */
  furniture?: {
    mount: 'floor' | 'hung' | 'flat';
    model: FurnitureModel;
  };
  /**
   * A loose item's 3D model (one file in `content/things/models/`, like furniture's), for something that is no piece of
   * a room: a sword lying on the sand, or in a hand. Read with `modelOf`.
   */
  model?: FurnitureModel;
  /**
   * A weapon (plan B8a): its row in the weapon table (`content/chargen/equipment.ts`, by its Swedish name), which
   * gives its skill, damage and properties in a fight (`core/combat.ts`). Held in a hand.
   */
  weapon?: string;
  /**
   * A shield (plan B8a): its row in the shield table (`SHIELDS`, by its Swedish name), which gives its block bonus and
   * properties in a fight. Worn on the left forearm, beside a one-handed weapon.
   */
  shield?: string;
  /**
   * How many hands it takes to hold (plan B8a): 1 (a sword, a shield: another can go in the other hand) or 2 (a
   * greatsword). Left out, it is carried in both arms (a stool) and nothing else can be held with it.
   */
  hands?: 1 | 2;
  /**
   * How it moves in the hand (plan B8g): which motions a fighter holding it plays (`core/world3d/motion.ts`), a sword's
   * strikes and parries or a staff's. Inherited, so a new weapon finds its motions from its kind.
   */
  moves?: WayOfMoving;
  /**
   * A rack or chest that hands out things of a family (a weapon rack: `weapon`): *take from it* lists every kind under
   * it to pick from, and the one picked is put in your hand. Never runs out (a test ground's, for now).
   */
  stock?: string;
  /** A gong or a bell that calls someone (a kind of person: `gladiator`): strike it, pick how good, and a fresh one comes. */
  calls?: string;
  /** A kind of building: how it is put together (`buildHouse` reads this). */
  building?: BuildingPlan;
  /**
   * A building: what kind of room each of its rooms is, by the room's role (`guest`, `attic`, `stall`...). The
   * ground floor's `main` room is the kind the map gives the house (`room`).
   */
  rooms?: Record<string, string>;
  /** A kind of room: what it holds and where (read with `Things.recipe`, which applies what it inherits). */
  room?: RoomRecipe;
  /**
   * A kind of room that welcomes people (plan B3c): in a house whose main room is this kind, these acts are no wrong in
   * these hours (an inn's taproom: sit down, 6 to 23). Inherited.
   */
  welcome?: Welcome;
  /** It sends up a column of smoke from this high above the ground. */
  smoke?: { y: number };
  /** Its look, built from the placement (meshes by material). Trees use `tree` instead. */
  draw?: (p: Placed) => ThingParts;
  tree?: TreeLook;
  /** Status tags the skill hooks look for (added to the parents' tags). */
  tags?: string[];
}

/** A kind with everything inherited filled in. */
export type Thing = Readonly<ThingDef> & { readonly chain: readonly string[] };

const FIELDS_NOT_INHERITED = new Set(['id', 'is', 'abstract', 'name']);

export class Things {
  private readonly defs = new Map<string, ThingDef>();
  private readonly made = new Map<string, Thing>();

  constructor(defs: readonly ThingDef[]) {
    for (const d of defs) {
      if (this.defs.has(d.id)) throw new Error(`two kinds of thing are called ${d.id}`);
      this.defs.set(d.id, d);
    }
    for (const d of defs) this.get(d.id); // resolve them all now: a loop in the tree shows at once
  }

  has(id: string): boolean {
    return this.defs.has(id);
  }

  /** The kinds that can be placed (not the abstract families). */
  get placeable(): string[] {
    return [...this.defs.values()].filter((d) => !d.abstract).map((d) => d.id);
  }

  /** Every kind defined here, with what it is a kind of (for the skill library's tree). */
  get parents(): Record<string, string> {
    return Object.fromEntries([...this.defs.values()].map((d) => [d.id, d.is]));
  }

  /** A kind with what it inherits. Throws for a kind nobody defined. */
  get(id: string): Thing {
    const have = this.made.get(id);
    if (have) return have;
    const own = this.defs.get(id);
    if (!own) throw new Error(`no kind of thing called ${id}`);
    const chain: string[] = [id];
    for (let k = own.is; k; k = this.defs.get(k)?.is ?? '') {
      if (chain.includes(k)) throw new Error(`the kinds of thing loop: ${[...chain, k].join(' > ')}`);
      chain.push(k);
      if (!this.defs.has(k)) break; // a kind of the skill library: the end of what is defined here
    }
    const parent = this.defs.has(own.is) ? this.get(own.is) : null;
    const out: Record<string, unknown> = {};
    if (parent) for (const [k, v] of Object.entries(parent)) if (!FIELDS_NOT_INHERITED.has(k)) out[k] = v;
    Object.assign(out, own);
    out.tags = [...new Set([...(parent?.tags ?? []), ...(own.tags ?? [])])];
    if (parent?.states || own.states) out.states = { ...parent?.states, ...own.states };
    out.chain = chain;
    const t = out as unknown as Thing;
    this.made.set(id, t);
    return t;
  }

  /** The plan of a kind of building (no id: a cottage). Throws for a kind that is not a building. */
  building(id = 'cottage'): BuildingPlan {
    const b = this.get(id).building;
    if (!b) throw new Error(`${id} is not a kind of building`);
    return b;
  }

  /** Is it a kind of room (one a house can be furnished as)? */
  isRoom(id: string): boolean {
    return this.has(id) && !this.get(id).abstract && !!this.get(id).room;
  }

  /**
   * The lines of a kind of room, with what it inherits: the nearest kind up its chain that lists its own `lines`,
   * then each kind below it in turn leaves out its `without` and adds its `plus`. Throws for a kind that is no room.
   */
  recipe(id: string): RoomLine[] {
    const chain = this.get(id).chain.filter((k) => this.defs.get(k)?.room);
    const from = chain.findIndex((k) => this.defs.get(k)!.room!.lines);
    if (from < 0) throw new Error(`${id} is not a kind of room`);
    let lines = this.defs.get(chain[from])!.room!.lines!;
    for (const k of chain.slice(0, from).reverse()) {
      const r = this.defs.get(k)!.room!;
      lines = [...lines.filter((l) => !r.without?.includes(l.piece)), ...(r.plus ?? [])];
    }
    return lines;
  }

  /** The placement with the kind's defaults filled in. */
  placed(p: PlacedProp): Placed {
    return { ...p, len: p.len ?? this.get(p.kind).len ?? 4 };
  }

  /** What stops feet (and, if it blocks sight, the eye), in the world. */
  shapes(p: PlacedProp): Shape[] {
    const t = this.get(p.kind), q = this.placed(p);
    if (!t.foot) return [];
    if (typeof t.foot === 'function') return t.foot(q);
    return t.foot.map((f) => footShape(q, f));
  }

  blocksSight(p: PlacedProp): boolean {
    return !!this.get(p.kind).blocksSight;
  }

  /** The filament source it is, if any. A thing with states says which it is (`of`), so the field can ask whether it gives now (a torch put out does not). */
  source(p: PlacedProp): FSource | null {
    const t = this.get(p.kind), f = t.filament;
    if (!f) return null;
    return { x: p.x, z: p.z, kind: f.kind, ...(f.weight !== undefined ? { weight: f.weight } : {}), ...(t.states ? { of: { id: placedId(p), kind: p.kind } } : {}) };
  }

  /** Its look: meshes by material (empty for a kind with no `draw`). */
  parts(p: PlacedProp): ThingParts {
    return this.get(p.kind).draw?.(this.placed(p)) ?? { meshes: [] };
  }
}

/** A point in a placed thing's own frame, in the world. */
export function localToWorld(p: PlacedProp, lx: number, lz: number): { x: number; z: number } {
  const s = p.size ?? 1, rot = p.rot ?? 0;
  return { x: p.x + (lx * Math.cos(rot) + lz * Math.sin(rot)) * s, z: p.z + (-lx * Math.sin(rot) + lz * Math.cos(rot)) * s };
}

/** A box in a placed thing's own frame (half sizes, scaled with it), in the world. */
export function localBox(p: PlacedProp, lx: number, lz: number, hw: number, hd: number): Shape {
  const s = p.size ?? 1;
  return { kind: 'box', ...localToWorld(p, lx, lz), hw: hw * s, hd: hd * s, rot: p.rot ?? 0 };
}

function footShape(p: Placed, f: Foot): Shape {
  if ('circle' in f) return circle(p.x, p.z, f.circle * (p.size ?? 1));
  if ('run' in f) return localBox(p, 0, 0, p.len / 2, f.run);
  return localBox(p, f.at?.[0] ?? 0, f.at?.[1] ?? 0, f.box[0], f.box[1]);
}

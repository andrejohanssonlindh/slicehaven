import type { FSource, SourceKind } from './filaments3d';
import type { MeshData } from './mesh';
import type { Lumps, PlacedProp } from './props';
import { type Shape, circle } from './space';
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

/** What a part of a thing is drawn with; the renderer has one material for each. `bush` is leafy and sways from the ground. */
export type ThingMaterial = 'bark' | 'plank' | 'stone' | 'hay' | 'water' | 'cloth' | 'clothHang' | 'bush';

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
  /** The ground it takes up: what stops feet, and (if `blocksSight`) the eye. Function form for what changes with the placement. */
  foot?: Foot[] | ((p: Placed) => Shape[]);
  /** The eye cannot see through it. */
  blocksSight?: boolean;
  /** What it gives off to the filament field, if anything. */
  filament?: { kind: SourceKind; weight?: number } | null;
  /** The default run length for things that are runs (fences, walls), metres. */
  len?: number;
  /** How far it is sunk into the ground, metres. */
  sink?: number;
  /** It lays a walkable deck this wide along its run, over water too (a bridge); it may stand in water. */
  deck?: number;
  /** It carries a flame this high above the ground (metres, scaled with it), with its light. */
  flame?: { y: number };
  /** Its look, built from the placement (meshes by material). Trees use `tree` instead. */
  draw?: (p: Placed) => ThingParts;
  tree?: TreeLook;
  /** Status tags the skill hooks look for (added to the parents' tags). */
  tags?: string[];
}

/** A kind with everything inherited filled in. */
export type Thing = Readonly<ThingDef> & { readonly chain: readonly string[] };

const FIELDS_NOT_INHERITED = new Set(['id', 'is', 'abstract']);

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
    out.chain = chain;
    const t = out as unknown as Thing;
    this.made.set(id, t);
    return t;
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

  /** The filament source it is, if any. */
  source(p: PlacedProp): FSource | null {
    const f = this.get(p.kind).filament;
    return f ? { x: p.x, z: p.z, kind: f.kind, ...(f.weight !== undefined ? { weight: f.weight } : {}) } : null;
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

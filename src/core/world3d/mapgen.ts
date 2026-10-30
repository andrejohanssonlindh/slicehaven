import { fbm } from '../noise';
import { Rng } from '../rng';
import { CHUNK } from './chunks';
import type { House3DSpec, HousePlan, RoofKind, WallKind } from './house';
import { FACING_MIN, VIEW_YAW } from './view';
import { type BuiltHouse, type Layout, type PlacedHouse, type PlacedTree, buildHouses, houseOuterBox, houseToWorld, layoutObstacles, layoutPads, layoutShade } from './layout';
import { type ChunkContent, type ChunkGenerator, PlacedIndex } from './placed';
import { type PlacedProp } from './props';
import type { PersonKinds, PersonSpec } from '../persons';
import { type BehaviourLibrary, type DoEntry, type Place, scheduleProblems } from './behave';
import type { Things } from './things';
import { NavGrid, type Shape, ShapeIndex, type ShapeSource, findPath, shapeDist } from './space';
import { type Ground3D, type Road, type XZ, lakeDist, roadDist } from './terrain';

/**
 * Maps as data. A `MapSpec` says what is where in terms a person (or Claude) thinks
 * in: "a bakery on the north side of the main road a third of the way along",
 * "forty trees in the woods", "torches every 14 m". `compileMap` turns that into the
 * ground and layout the world builds from, places the things that have no fixed spot
 * without overlapping anything, and reports problems instead of hiding them. The
 * result is pure data, so a map is tested like any other content.
 */

export type HouseSize = 'small' | 'medium' | 'large' | { width: number; depth: number };

/** A side of a road, as a compass point. */
export type Side = 'north' | 'south' | 'east' | 'west';

const SIZES: Record<'small' | 'medium' | 'large', { width: number; depth: number }> = {
  small: { width: 5, depth: 4 },
  medium: { width: 6, depth: 4.6 },
  large: { width: 7.4, depth: 5 },
};

/** Where a house goes: a spot, or a place along a road (it then faces the road). */
export type HouseAt =
  | { x: number; z: number; rot?: number }
  | {
    /** Index into `roads`. */
    road: number;
    /** How far along the road in metres from its start (or `t`, a share of its length, 0 to 1). */
    m?: number;
    t?: number;
    /** Which side of the road, as a compass point: north is up the screen (-z), south down (+z). */
    side: Side;
    /** Space between the road's edge and the house's porch, metres (default 2). */
    gap?: number;
  };

export interface MapHouse {
  id: string;
  /** What is inside: a key of `RECIPES` in `content/furnish.ts` (default the humble home). */
  room?: string;
  size?: HouseSize;
  roof?: RoofKind;
  /** Walls: plaster in a timber frame (default), planks, or fieldstone. */
  walls?: WallKind;
  wallH?: number;
  seed?: number;
  /** A bigger building: the inn, the shop or the stable (they have their own size, and `size` is ignored). */
  plan?: HousePlan;
  /** A torch on a bracket beside the door (a `walltorch`). */
  torch?: boolean;
  at: HouseAt;
}

/**
 * Someone who lives in the map: what kinds of person they are (`core/persons.ts`), their home, and what they do: a
 * schedule (`core/world3d/behave.ts`), the first line whose `when` holds is what they do now.
 */
export interface MapPerson extends PersonSpec {
  id: string;
  /** Their house (an id); `home` in a schedule means it. */
  home?: string;
  /** Where they start: a place's name, or a spot (default: outside their home's door, else the first place their schedule names). */
  at?: string | XZ;
  does: DoEntry[];
}

/** A person as the world gets them: where they start, and their number among those sharing a schedule. */
export interface CastMember extends Omit<MapPerson, 'at'> {
  start: XZ;
  slot: number;
}

/**
 * A place a map names, for schedules to use: a spot, an area, a path (a loop if `loop`), a stretch of a road (a path a
 * little off its middle, in metres from its start, default 20% to 80% of it), or a loop `around` an area (`margin`
 * metres outside it: a guard's round of a camp).
 */
export type PlaceSpec =
  | { at: XZ; face?: number }
  | { area: Area }
  | { path: XZ[]; loop?: boolean }
  | { road: number; from?: number; to?: number }
  | { around: Area; margin?: number };

/** Something that happens: every day between two hours, or (without `hours`) only when a script starts it. */
export interface MapEvent {
  id: string;
  hours?: [number, number];
}

export type Area =
  | { circle: [x: number, z: number, r: number] }
  | { rect: [x0: number, z0: number, x1: number, z1: number] }
  | { ring: [x: number, z: number, rInner: number, rOuter: number] }
  /** The whole map, minus a margin at its edge. */
  | { all: true };

/** The middle of an area (the map's middle for `all`). */
export function placeCentreXZ(a: Area): XZ {
  if ('circle' in a) return [a.circle[0], a.circle[1]];
  if ('ring' in a) return [a.ring[0], a.ring[1]];
  if ('rect' in a) return [(a.rect[0] + a.rect[2]) / 2, (a.rect[1] + a.rect[3]) / 2];
  return [0, 0];
}

/** Is (x, z) in an area? (`all` is the map less its edge, `half - edge` from the middle.) */
export function inArea(a: Area, x: number, z: number, inner: number): boolean {
  if ('circle' in a) return Math.hypot(x - a.circle[0], z - a.circle[1]) <= a.circle[2];
  if ('rect' in a) return x >= a.rect[0] && x <= a.rect[2] && z >= a.rect[1] && z <= a.rect[3];
  if ('ring' in a) {
    const d = Math.hypot(x - a.ring[0], z - a.ring[1]);
    return d >= a.ring[2] && d <= a.ring[3];
  }
  return Math.abs(x) <= inner && Math.abs(z) <= inner;
}

/**
 * A map rule: one way of saying "put things here" by intent ("a street of houses along road 0, every 20 m"), one
 * file each in `content/maps/rules/`. A map uses one with `{ "rule": "street", ...what it takes }`; the compiler runs
 * the uses in the order written. A rule of the `houses` phase runs before the houses are placed and adds houses and
 * people; one of the `things` phase runs after, and adds trees and props, keeping clear of what is there.
 */
export interface MapRule {
  id: string;
  /** One line on what it does, for whoever writes maps. */
  about: string;
  phase: 'houses' | 'things';
  /** The keys a use of it may have (besides `rule`); any other is reported. */
  keys: string[];
  expand(use: RuleUse, ctx: RuleContext): void;
}

/** A use of a rule in a map: its name and what it was given (checked by the rule). */
export type RuleUse = { rule: string } & Record<string, unknown>;

/** What a rule may read and add to while the map is compiled. */
export interface RuleContext {
  spec: MapSpec;
  things: Things;
  /** The map's own seeded generator (rules take turns with it, in order, so a map compiles the same every time). */
  rng: Rng;
  /** Half the map's side, and the margin kept clear at its edge. */
  half: number;
  edge: number;
  problem(s: string): void;
  /** `houses` phase: the houses and people so far (add to them). */
  houses: MapHouse[];
  people: MapPerson[];
  /** `things` phase: the layout so far (add trees and props), and the houses' whole boxes. */
  layout: Layout;
  boxes: Shape[];
  lakeD(x: number, z: number): number;
  roadD(x: number, z: number): number;
}

/**
 * Wilderness made as it is looked at, chunk by chunk, so it costs nothing until someone goes there and the map can be
 * as large as you like. Woods and clearings come from slow noise; within a wood, trees sit one to a jittered cell.
 */
export interface WildSpec {
  /** Trees per 1000 m² in the thick of a wood (about 15 is a wood, 40 a thicket). */
  trees: number;
  /** The kinds of tree to mix. */
  mix?: string[];
  /** Bushes and boulders per 1000 m² (anywhere, thicker in woods for bushes). */
  shrubs?: number;
  boulders?: number;
  /** About how big the woods and clearings are, metres (default 90). */
  grain?: number;
  /** Only in this area (a district, a margin); default everywhere. */
  area?: Area;
}

export interface MapSpec {
  /** The map's name: its file is `content/maps/<name>.json`. */
  name: string;
  /** What the map is, for whoever opens the file (JSON has no comments). */
  about?: string;
  seed: number;
  /** Side of the square map, metres. */
  size: number;
  roads: Road[];
  lake?: { x: number; z: number; r: number };
  /** Streams, flowing from the first point to the last (see `Ground3D.rivers`). A `bridge` prop over one makes the crossing walkable. */
  rivers?: Road[];
  mud?: { x: number; z: number; r: number }[];
  /** Stamp mud in front of every door. */
  doorMud?: boolean;
  houses?: MapHouse[];
  /** Things placed by intent, in order (see `MapRule`): streets of houses, torches along a road, scattered woods. */
  rules?: RuleUse[];
  /** Trees, bushes and rocks made chunk by chunk as the map is explored (for large outdoor areas). */
  wild?: WildSpec;
  /** Things at exact spots. */
  trees?: PlacedTree[];
  props?: PlacedProp[];
  /** Where the hero starts: a spot, or in front of a house's door. */
  hero?: [number, number] | { house: string };
  /** The people who live here (more can come from rules, like `crowd`). */
  people?: MapPerson[];
  /** Places by name, for schedules (`MapPerson.does`). */
  places?: Record<string, PlaceSpec>;
  /** What happens here, and when (schedules ask with `{ "when": { "event": "<id>" } }`). */
  events?: MapEvent[];
}

export interface CompiledMap {
  name: string;
  ground: Ground3D;
  layout: Layout;
  /** Trees, props and torch posts by chunk: the authored ones in `layout` plus whatever the map's `wild` makes. */
  placed: PlacedIndex;
  hero: [number, number];
  cast: CastMember[];
  places: Record<string, Place>;
  events: MapEvent[];
  /** Everything that did not work out: a thing that would not fit, a house in the lake, an unreachable door. Empty for a good map. */
  problems: string[];
}

// --- roads ----------------------------------------------------------------

export function roadLength(r: Road): number {
  let s = 0;
  for (let i = 1; i < r.pts.length; i++) s += Math.hypot(r.pts[i][0] - r.pts[i - 1][0], r.pts[i][1] - r.pts[i - 1][1]);
  return s;
}

/** The point `s` metres along a road, with its unit tangent. */
export function roadPoint(r: Road, s: number): { x: number; z: number; tx: number; tz: number } {
  let left = Math.max(0, s);
  for (let i = 1; i < r.pts.length; i++) {
    const a = r.pts[i - 1], b = r.pts[i];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (left <= len || i === r.pts.length - 1) {
      const k = len > 0 ? Math.min(1, left / len) : 0;
      return { x: a[0] + (b[0] - a[0]) * k, z: a[1] + (b[1] - a[1]) * k, tx: (b[0] - a[0]) / (len || 1), tz: (b[1] - a[1]) / (len || 1) };
    }
    left -= len;
  }
  return { x: r.pts[0][0], z: r.pts[0][1], tx: 1, tz: 0 };
}

const COMPASS = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] } as const;

/** The unit normal of a road at a point that points toward a compass side. */
export function sideNormal(tx: number, tz: number, side: Side): [number, number] {
  const n: [number, number] = [-tz, tx];
  const c = COMPASS[side];
  return n[0] * c[0] + n[1] * c[1] >= 0 ? n : [-n[0], -n[1]];
}

const hashStr = (s: string): number => {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
};

// --- the wilderness --------------------------------------------------------

interface WildContext {
  seed: number;
  half: number;
  edge: number;
  lakeD(x: number, z: number): number;
  roadD(x: number, z: number): number;
  houses: ShapeSource;
  clear: { x: number; z: number; r: number }[];
}

const smoothstep = (e0: number, e1: number, v: number): number => {
  const t = Math.max(0, Math.min(1, (v - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/**
 * The generator for a `WildSpec`: for chunk (i, j) it lays a jittered grid over the chunk (cells about as wide as the
 * density asks for), and in each cell keeps a thing if the woods are thick there and the spot is free. Everything is
 * drawn from an Rng seeded by the chunk's address, so a chunk is the same whenever and in whatever order it is made.
 */
export function wildGenerator(w: WildSpec, ctx: WildContext): ChunkGenerator {
  const grain = w.grain ?? 90;
  const free = (x: number, z: number, lake: number, road: number, house: number): boolean => {
    if (Math.abs(x) > ctx.half - ctx.edge || Math.abs(z) > ctx.half - ctx.edge) return false;
    if (w.area && !inArea(w.area, x, z, ctx.half - ctx.edge)) return false;
    if (ctx.lakeD(x, z) < lake || ctx.roadD(x, z) < road) return false;
    if (ctx.clear.some((c) => Math.hypot(x - c.x, z - c.z) < c.r)) return false;
    return !ctx.houses.near(x - house, z - house, x + house, z + house).some((b) => shapeDist(b, x, z) < house);
  };
  /** Thickness of the woods at a spot, 0 (open meadow) .. 1 (the thick of it). */
  const wood = (x: number, z: number): number => smoothstep(0.38, 0.62, fbm(x / grain, z / grain, ctx.seed + 41));
  return (i, j): Partial<ChunkContent> => {
    const out: ChunkContent = { trees: [], props: [] };
    const layer = (perK: number, salt: number, make: (x: number, z: number, rng: Rng, wood: number) => void): void => {
      if (perK <= 0) return;
      const n = Math.max(1, Math.round(CHUNK / Math.sqrt(1000 / perK))); // cells along a side
      const cellW = CHUNK / n;
      const rng = Rng.fromSeed(`${ctx.seed}:${i}:${j}:${salt}`);
      for (let b = 0; b < n; b++) {
        for (let a = 0; a < n; a++) {
          const x = i * CHUNK + (a + rng.next()) * cellW, z = j * CHUNK + (b + rng.next()) * cellW;
          // `make` draws all it needs before it may reject, so one cell never changes what another gets.
          make(x, z, rng, wood(x, z));
        }
      }
    };
    layer(w.trees, 1, (x, z, rng, m) => {
      const roll = rng.next(), seed = 1 + rng.int(60), kind = w.mix?.length ? w.mix[rng.int(w.mix.length)] : undefined;
      if (roll >= m || !free(x, z, 1.6, 1.4, 2.4)) return;
      out.trees.push(kind ? { x, z, seed, kind } : { x, z, seed });
    });
    layer(w.shrubs ?? 0, 2, (x, z, rng, m) => {
      const roll = rng.next(), seed = 1 + rng.int(60), size = 0.8 + rng.next() * 0.5;
      if (roll >= 0.35 + 0.65 * m || !free(x, z, 1.6, 1.4, 1.2)) return;
      out.props.push({ kind: 'shrub', x, z, seed, size });
    });
    layer(w.boulders ?? 0, 3, (x, z, rng) => {
      const roll = rng.next(), seed = 1 + rng.int(60), size = 0.8 + rng.next() * 0.9;
      if (roll >= 0.5 || !free(x, z, 1.6, 1.8, 1.8)) return;
      out.props.push({ kind: 'boulder', x, z, seed, size });
    });
    return out;
  };
}

// --- compiling -------------------------------------------------------------

/** What the compiler checks a map against; each is optional (what is not given is not checked, or not available). */
export interface CompileOptions {
  /** The kinds of person (`content/people`), to check the cast by. */
  persons?: PersonKinds;
  /** The kinds of furniture a house's rooms call for (`content/furnish.ts`), to check houses against the view. */
  pieces?: (b: BuiltHouse) => string[];
  /** The map rules there are, by name (`content/maps/rules/`). */
  rules?: Record<string, MapRule>;
  /** What people can do and ask (`content/behaviours`), to check schedules by. */
  behaviours?: BehaviourLibrary;
}

/** The keys each part of a map may have: anything else is a typo, and is reported. */
const KEYS = {
  map: ['name', 'about', 'seed', 'size', 'roads', 'lake', 'rivers', 'mud', 'doorMud', 'houses', 'rules', 'wild', 'trees', 'props', 'hero', 'people', 'places', 'events'],
  house: ['id', 'room', 'size', 'roof', 'walls', 'wallH', 'seed', 'plan', 'torch', 'at'],
  at: ['x', 'z', 'rot', 'road', 'm', 't', 'side', 'gap'],
  wild: ['trees', 'mix', 'shrubs', 'boulders', 'grain', 'area'],
  person: ['id', 'is', 'seed', 'look', 'home', 'at', 'does'],
  place: ['at', 'face', 'area', 'path', 'loop', 'road', 'from', 'to', 'around', 'margin'],
  event: ['id', 'hours'],
};

/** A place worked out from what the map says. */
function placeOf(p: PlaceSpec, roads: Road[]): Place | string {
  if ('at' in p) return { kind: 'spot', x: p.at[0], z: p.at[1], ...(p.face !== undefined ? { face: p.face } : {}) };
  if ('area' in p) return { kind: 'area', area: p.area };
  if ('path' in p) return p.path.length ? { kind: 'path', pts: p.path, loop: !!p.loop } : 'a path needs points';
  if ('road' in p) {
    const road = roads[p.road];
    if (!road) return `no road ${p.road}`;
    const len = roadLength(road), from = p.from ?? len * 0.2, to = p.to ?? len * 0.8;
    const pts = [0, 1, 2, 3].map((k): XZ => {
      const q = roadPoint(road, from + ((to - from) * k) / 3);
      return [q.x + q.tz * 0.6, q.z - q.tx * 0.6];
    });
    return { kind: 'path', pts, loop: false };
  }
  // Round the outside of an area: a circle (or ring) as twelve points, a box by its corners.
  const a = p.around, m = p.margin ?? 2;
  if ('circle' in a || 'ring' in a) {
    const [cx, cz, r] = 'circle' in a ? a.circle : [a.ring[0], a.ring[1], a.ring[3]];
    return { kind: 'path', loop: true, pts: Array.from({ length: 12 }, (_, k): XZ => [cx + Math.cos((k / 12) * Math.PI * 2) * (r + m), cz + Math.sin((k / 12) * Math.PI * 2) * (r + m)]) };
  }
  if ('rect' in a) {
    const [x0, z0, x1, z1] = a.rect;
    return { kind: 'path', loop: true, pts: [[x0 - m, z0 - m], [x1 + m, z0 - m], [x1 + m, z1 + m], [x0 - m, z1 + m]] };
  }
  return 'cannot go around the whole map';
}

/** Report the keys of `o` that are not in `allowed`. */
export function strayKeys(o: object, allowed: readonly string[], where: string, problem: (s: string) => void): void {
  for (const k of Object.keys(o)) if (!allowed.includes(k)) problem(`${where}: unknown key "${k}"`);
}

/**
 * Compile a map. `things` is the kinds of thing (`content/things`): what every placed thing is. The options add the
 * other libraries the map is checked against, and the rules it may use.
 */
export function compileMap(spec: MapSpec, things: Things, opts: CompileOptions = {}): CompiledMap {
  const { persons, pieces } = opts;
  const problems: string[] = [];
  const problem = (s: string): void => void problems.push(s);
  const rng = Rng.fromSeed(spec.seed);
  const half = spec.size / 2;
  const edge = 4;

  // The ground's own shoreline (it is not a perfect circle), so scatter and validation agree with what is drawn.
  const shape: Ground3D = { seed: spec.seed, size: spec.size, roads: spec.roads, mud: [], lake: spec.lake, rivers: spec.rivers, pads: [], shade: [] };
  const lakeD = (x: number, z: number): number => lakeDist(shape, x, z);
  const roadD = (x: number, z: number): number => spec.roads.reduce((m, r) => Math.min(m, roadDist(r, x, z) - r.width / 2), Infinity);

  // Typos: every part of the map has only the keys it can have.
  strayKeys(spec, KEYS.map, 'map', problem);
  for (const h of spec.houses ?? []) {
    strayKeys(h, KEYS.house, `house ${h.id}`, problem);
    strayKeys(h.at, KEYS.at, `house ${h.id} at`, problem);
  }
  if (spec.wild) strayKeys(spec.wild, KEYS.wild, 'wild', problem);
  for (const p of spec.people ?? []) strayKeys(p, KEYS.person, `person ${p.id}`, problem);

  // The rules, in order, each in its phase (a rule nobody wrote is told so).
  const ctx: RuleContext = {
    spec, things, rng, half, edge, problem, lakeD, roadD,
    houses: [...(spec.houses ?? [])], people: [...(spec.people ?? [])],
    layout: { houses: [], trees: [...(spec.trees ?? [])], props: [...(spec.props ?? [])] }, boxes: [],
  };
  const uses = (spec.rules ?? []).flatMap((use, n) => {
    const rule = opts.rules?.[use.rule];
    if (!rule) {
      problem(`rule ${n + 1}: no map rule called ${use.rule}`);
      return [];
    }
    strayKeys(use, ['rule', ...rule.keys], `rule ${n + 1} (${use.rule})`, problem);
    return [{ rule, use }];
  });
  for (const { rule, use } of uses) if (rule.phase === 'houses') rule.expand(use, ctx);

  // Houses.
  const houses: PlacedHouse[] = ctx.houses.map((h) => {
    // A kind of building nobody defined is told so, and built as a cottage.
    let plan = h.plan;
    if (plan && !things.has(plan)) problems.push(`house ${h.id}: no kind of building called ${plan}`), plan = undefined;
    else if (plan && !things.get(plan).building) problems.push(`house ${h.id}: ${plan} is not a kind of building`), plan = undefined;
    const dims = (plan && things.building(plan).size) || (typeof h.size === 'object' ? h.size : SIZES[h.size ?? 'medium']);
    const hs: House3DSpec = { seed: h.seed ?? hashStr(h.id) % 1000, width: dims.width, depth: dims.depth, wallH: h.wallH ?? 2.5, roof: h.roof ?? 'thatch', walls: h.walls, plan };
    if ('road' in h.at) {
      const road = spec.roads[h.at.road];
      if (!road) {
        problems.push(`house ${h.id}: no road ${h.at.road}`);
        return { id: h.id, x: 0, z: 0, rot: 0, spec: hs, room: h.room };
      }
      const p = roadPoint(road, h.at.m ?? (h.at.t ?? 0) * roadLength(road));
      const [nx, nz] = sideNormal(p.tx, p.tz, h.at.side);
      // The house's front (local +z) faces the road; its footprint runs 0.6 m past the front wall for the porch.
      const dist = road.width / 2 + (h.at.gap ?? 2) + dims.depth / 2 + 0.6;
      const rot = Math.atan2(-nx, -nz) + (rng.next() - 0.5) * 0.12;
      return { id: h.id, x: p.x + nx * dist, z: p.z + nz * dist, rot, spec: hs, room: h.room };
    }
    return { id: h.id, x: h.at.x, z: h.at.z, rot: h.at.rot ?? 0, spec: hs, room: h.room };
  });

  const layout = ctx.layout;
  layout.houses = houses;

  const built = buildHouses(layout, things);
  const boxes = built.map(houseOuterBox);
  ctx.boxes = boxes;
  // A room painted as seen from its front (a bed, a horse) must be in a house that roughly faces the view.
  if (pieces) {
    for (const b of built) {
      if (Math.cos(VIEW_YAW - b.place.rot) >= FACING_MIN) continue;
      const wrong = pieces(b).filter((k) => things.has(k) && things.get(k).furniture?.facesView);
      if (wrong.length) problems.push(`house ${b.place.id} faces away from the view, and its ${wrong.join(' and ')} would read wrong (put it on the other side of the road, or turn it)`);
    }
  }

  // The rules that place things (torches along a road, scattered woods), keeping clear of the houses.
  for (const { rule, use } of uses) if (rule.phase === 'things') rule.expand(use, ctx);

  // Torches beside doors (after the rules: the scatter keeps clear of the houses anyway).
  ctx.houses.forEach((h, i) => {
    if (!h.torch) return;
    const b = built[i], d = b.model.door;
    const w = houseToWorld(b.place, d[0] + 0.95, d[2] + 0.25);
    layout.props.push({ kind: 'walltorch', x: w.x, z: w.z, rot: b.place.rot, seed: layout.props.length });
  });

  // Ground.
  const mud = [...(spec.mud ?? [])];
  if (spec.doorMud) {
    for (const b of built) {
      const d = b.model.door;
      const p = houseToWorld(b.place, d[0], d[2] + 1.1);
      mud.push({ x: p.x, z: p.z, r: 1.9 });
    }
  }
  // A bridge prop makes the ground under it a deck (the span `len` is along the prop's own x; its width is the walkway and the rails).
  const bridges = layout.props.filter((p) => things.has(p.kind) && things.get(p.kind).deck).map((p) => ({ x: p.x, z: p.z, len: things.placed(p).len, width: things.get(p.kind).deck!, rot: p.rot ?? 0 }));
  const ground: Ground3D = { seed: spec.seed, size: spec.size, roads: spec.roads, mud, lake: spec.lake, rivers: spec.rivers, bridges, pads: layoutPads(layout), shade: layoutShade(layout) };

  // The hero.
  let hero: [number, number] = [0, 0];
  if (Array.isArray(spec.hero)) hero = spec.hero;
  else if (spec.hero) {
    const i = built.findIndex((b) => b.place.id === (spec.hero as { house: string }).house);
    if (i < 0) problems.push(`hero: no house ${(spec.hero as { house: string }).house}`);
    else {
      const d = built[i].model.door;
      const p = houseToWorld(built[i].place, d[0] + 1.2, d[2] + 2.4);
      hero = [p.x, p.z];
    }
  } else if (spec.roads[0]) {
    const p = roadPoint(spec.roads[0], roadLength(spec.roads[0]) * 0.5);
    hero = [p.x, p.z];
  }

  // Places and events, by name.
  const places: Record<string, Place> = {};
  for (const [name, p] of Object.entries(spec.places ?? {})) {
    strayKeys(p, KEYS.place, `place ${name}`, problem);
    const got = placeOf(p, spec.roads);
    if (typeof got === 'string') problem(`place ${name}: ${got}`);
    else places[name] = got;
  }
  const events = spec.events ?? [];
  for (const e of events) strayKeys(e, KEYS.event, `event ${e.id}`, problem);
  if (new Set(events.map((e) => e.id)).size !== events.length) problem('two events share an id');

  // The people: every one a person the kinds know, with a schedule that names only what there is, and a place to start.
  const cast: CastMember[] = [];
  const houseIds = new Set(ctx.houses.map((h) => h.id));
  const centre = (p: Place): XZ => (p.kind === 'spot' ? [p.x, p.z] : p.kind === 'path' ? p.pts[0] : placeCentreXZ(p.area));
  const slots = new Map<DoEntry[], number>();
  for (const p of ctx.people) {
    const bad = persons?.problem(p);
    if (bad) problems.push(`person ${p.id}: ${bad}`);
    if (cast.some((c) => c.id === p.id)) problems.push(`two people are called ${p.id}`);
    if (p.home && !houseIds.has(p.home)) problems.push(`person ${p.id}: no house ${p.home} to live in`);
    if (opts.behaviours) for (const s of scheduleProblems(p.does ?? [], opts.behaviours, places, houseIds)) problems.push(`person ${p.id}: ${s}`);
    // Where they start: where the map says, else outside their door, else the first place their schedule names.
    let start: XZ | null = null;
    if (Array.isArray(p.at)) start = p.at;
    else if (typeof p.at === 'string') start = places[p.at] ? centre(places[p.at]) : (problems.push(`person ${p.id}: no place called ${p.at}`), null);
    const home = p.home ? built.find((b) => b.place.id === p.home) : undefined;
    if (!start && home) {
      const d = home.model.door, q = houseToWorld(home.place, d[0] + 1.2, d[2] + 1.6);
      start = [q.x, q.z];
    }
    if (!start) for (const e of p.does ?? []) for (const v of Object.values(e)) if (!start && typeof v === 'string' && places[v]) start = centre(places[v]);
    // (A shared schedule numbers its people, so a crowd spreads out.)
    const slot = slots.get(p.does) ?? 0;
    slots.set(p.does, slot + 1);
    const { at: _at, ...rest } = p;
    cast.push({ ...rest, does: p.does ?? [], start: start ?? hero, slot });
  }

  // The wilderness: made per chunk, kept off roads, water, houses and the hero's feet.
  let generator: ChunkGenerator | undefined;
  if (spec.wild) {
    generator = wildGenerator(spec.wild, { seed: spec.seed, half, edge, lakeD, roadD, houses: new ShapeIndex(boxes), clear: [{ x: hero[0], z: hero[1], r: 3 }] });
  }
  // Every kind a map names must be one, and one that can be placed (else nothing below can ask about it).
  const unknown = new Set<string>();
  const kindOk = (k: string, what: string): boolean => {
    if (things.has(k) && !things.get(k).abstract) return true;
    unknown.add(`${what}: no kind of thing called ${k}${things.has(k) ? ' that can be placed' : ''}`);
    return false;
  };
  layout.props = layout.props.filter((p) => kindOk(p.kind, 'prop'));
  layout.trees = layout.trees.filter((t) => kindOk(t.kind ?? 'oak', 'tree'));
  for (const k of spec.wild?.mix ?? []) kindOk(k, 'wild mix');
  problems.push(...unknown);

  const index = new PlacedIndex(layout, things, generator);
  if (generator) ground.extraShade = (x, z) => index.shadeAt(x, z);

  const compiled: CompiledMap = { name: spec.name, ground, layout, placed: index, hero, cast, places, events, problems };
  problems.push(...validate(ctx.houses, compiled, things, built.map((b, i) => ({ id: b.place.id, box: boxes[i], door: houseToWorld(b.place, b.model.door[0], b.model.door[2] - 0.9) }))));
  return compiled;
}

/** What is wrong with a compiled map (empty if nothing). */
function validate(mapHouses: readonly MapHouse[], c: CompiledMap, things: Things, houses: { id: string; box: Shape; door: { x: number; z: number } }[]): string[] {
  const out: string[] = [];
  const g = c.ground;
  const half = g.size / 2;
  const inMap = (x: number, z: number, m = 1): boolean => Math.abs(x) < half - m && Math.abs(z) < half - m;
  const lakeD = (x: number, z: number): number => lakeDist(g, x, z);
  const built = buildHouses(c.layout, things);
  const problem = (s: string): void => {
    if (!out.includes(s)) out.push(s);
  };
  // Walking and the people in the world hold a house by its id.
  const ids = new Set<string>();
  for (const h of c.layout.houses) {
    if (ids.has(h.id)) problem(`two houses are called ${h.id}`);
    ids.add(h.id);
  }
  built.forEach((b, i) => {
    const id = b.place.id;
    const fp = b.model.footprint;
    const corners = [[fp.x0, fp.z0], [fp.x1, fp.z0], [fp.x0, fp.z1], [fp.x1, fp.z1]];
    // The whole footprint, not just its corners: a house can sit across a road with every corner clear of it.
    for (let lx = fp.x0; lx <= fp.x1 + 1e-6; lx += 0.5) {
      for (let lz = fp.z0; lz <= fp.z1 + 1e-6; lz += 0.5) {
        const w = houseToWorld(b.place, lx, lz);
        if (!inMap(w.x, w.z)) problem(`house ${id} is off the map`);
        else if (lakeD(w.x, w.z) < 0.8) problem(`house ${id} is in the lake`);
        else if (g.roads.some((r) => roadDist(r, w.x, w.z) < r.width / 2 + 0.2)) problem(`house ${id} is on a road`);
      }
    }
    for (let j = i + 1; j < built.length; j++) {
      const o = built[j];
      // Footprints with a metre between them.
      const oc = [[o.model.footprint.x0, o.model.footprint.z0], [o.model.footprint.x1, o.model.footprint.z0], [o.model.footprint.x0, o.model.footprint.z1], [o.model.footprint.x1, o.model.footprint.z1]];
      const at = (pl: PlacedHouse, lx: number, lz: number): [number, number] => {
        const w = houseToWorld(pl, lx, lz);
        return [w.x, w.z];
      };
      const hit = oc.some(([lx, lz]) => shapeDist(houses[i].box, ...at(o.place, lx, lz)) < 1)
        || corners.some(([lx, lz]) => shapeDist(houses[j].box, ...at(b.place, lx, lz)) < 1);
      if (hit) problem(`houses ${id} and ${o.place.id} touch`);
    }
  });
  for (const t of c.layout.trees) if (!inMap(t.x, t.z, 0.5) || lakeD(t.x, t.z) < 0.5) out.push(`tree at ${t.x.toFixed(1)},${t.z.toFixed(1)} is off the map or in the lake`);
  for (const p of c.layout.props) if (!inMap(p.x, p.z, 0.5) || (!things.get(p.kind).deck && lakeD(p.x, p.z) < 0.5)) out.push(`${p.kind} at ${p.x.toFixed(1)},${p.z.toFixed(1)} is off the map or in the lake`);
  // Every door can be reached from where the hero starts.
  if (!out.length) {
    const grid = new NavGrid(g.size, layoutObstacles(c.layout, built, things), { radius: 0.2, blocked: (x, z) => lakeD(x, z) < 0.2 });
    if (!grid.walkable(c.hero[0], c.hero[1])) out.push('the hero starts somewhere blocked');
    else {
      // Each door is tried from the nearest place already known to be reachable (the hero, then the doors found so far),
      // so a long street is a chain of short walks, not a hundred long ones.
      const known: { x: number; z: number }[] = [{ x: c.hero[0], z: c.hero[1] }];
      for (const h of houses) {
        let from = known[0];
        for (const k of known) if (Math.hypot(k.x - h.door.x, k.z - h.door.z) < Math.hypot(from.x - h.door.x, from.z - h.door.z)) from = k;
        if (findPath(grid, from, h.door)) known.push(h.door);
        else out.push(`the door of ${h.id} cannot be reached`);
      }
    }
  }
  if (mapHouses.length !== new Set(mapHouses.map((h) => h.id)).size) out.push('two houses share an id');
  return out;
}

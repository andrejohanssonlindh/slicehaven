import { fbm } from '../noise';
import { Rng } from '../rng';
import { CHUNK } from './chunks';
import { type House3DSpec, type HousePlan, PLAN_SIZE, type RoofKind, type WallKind } from './house';
import { type Layout, type PlacedHouse, type PlacedTree, buildHouses, houseOuterBox, houseToWorld, layoutObstacles, layoutPads, layoutShade } from './layout';
import { type ChunkContent, type ChunkGenerator, PlacedIndex } from './placed';
import { type PlacedProp } from './props';
import { BRIDGE_WIDTH } from './propsMore';
import type { TreeKind } from './tree';
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
    /** How far along the road, 0 (start) to 1 (end). */
    t: number;
    /** Which side of the road, as a compass point: north is up the screen (-z), south down (+z). */
    side: 'north' | 'south' | 'east' | 'west';
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
  at: HouseAt;
}

export type Area =
  | { circle: [x: number, z: number, r: number] }
  | { rect: [x0: number, z0: number, x1: number, z1: number] }
  | { ring: [x: number, z: number, rInner: number, rOuter: number] }
  /** The whole map, minus a margin at its edge. */
  | { all: true };

export interface Scatter {
  kind: 'tree' | 'shrub' | 'boulder';
  count: number;
  area: Area;
  /** Extra space kept clear around each, metres. */
  gap?: number;
  seed?: number;
  /** Trees only: the kinds to mix (each tree picks one at random; omitted, all are oaks). */
  mix?: TreeKind[];
}

/**
 * Wilderness made as it is looked at, chunk by chunk, so it costs nothing until someone goes there and the map can be
 * as large as you like. Woods and clearings come from slow noise; within a wood, trees sit one to a jittered cell.
 */
export interface WildSpec {
  /** Trees per 1000 m² in the thick of a wood (about 15 is a wood, 40 a thicket). */
  trees: number;
  mix?: TreeKind[];
  /** Bushes and boulders per 1000 m² (anywhere, thicker in woods for bushes). */
  shrubs?: number;
  boulders?: number;
  /** About how big the woods and clearings are, metres (default 90). */
  grain?: number;
  /** Only where (x, z) says so (a district, a margin); default everywhere. */
  where?: (x: number, z: number) => boolean;
}

export interface MapSpec {
  name: string;
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
  houses: MapHouse[];
  /** Things dropped wherever there is room. */
  scatter?: Scatter[];
  /** Trees, bushes and rocks made chunk by chunk as the map is explored (for large outdoor areas). */
  wild?: WildSpec;
  /** Things at exact spots. */
  trees?: PlacedTree[];
  props?: PlacedProp[];
  /** Torch posts: exact spots, or along a road every so many metres. */
  torches?: [number, number][];
  torchLines?: { road: number; every: number; side: 'north' | 'south' | 'east' | 'west'; offset?: number }[];
  /** Where the hero starts: a spot, or in front of a house's door. */
  hero?: [number, number] | { house: string };
  /** The villager's beat; by default along the first road. */
  walk?: XZ[];
}

export interface CompiledMap {
  name: string;
  ground: Ground3D;
  layout: Layout;
  /** Trees, props and torch posts by chunk: the authored ones in `layout` plus whatever the map's `wild` makes. */
  placed: PlacedIndex;
  hero: [number, number];
  walk: XZ[];
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
function sideNormal(tx: number, tz: number, side: keyof typeof COMPASS): [number, number] {
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
    if (w.where && !w.where(x, z)) return false;
    if (ctx.lakeD(x, z) < lake || ctx.roadD(x, z) < road) return false;
    if (ctx.clear.some((c) => Math.hypot(x - c.x, z - c.z) < c.r)) return false;
    return !ctx.houses.near(x - house, z - house, x + house, z + house).some((b) => shapeDist(b, x, z) < house);
  };
  /** Thickness of the woods at a spot, 0 (open meadow) .. 1 (the thick of it). */
  const wood = (x: number, z: number): number => smoothstep(0.38, 0.62, fbm(x / grain, z / grain, ctx.seed + 41));
  return (i, j): Partial<ChunkContent> => {
    const out: ChunkContent = { trees: [], props: [], torches: [] };
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

export function compileMap(spec: MapSpec): CompiledMap {
  const problems: string[] = [];
  const rng = Rng.fromSeed(spec.seed);
  const half = spec.size / 2;
  const edge = 4;

  // The ground's own shoreline (it is not a perfect circle), so scatter and validation agree with what is drawn.
  const shape: Ground3D = { seed: spec.seed, size: spec.size, roads: spec.roads, mud: [], lake: spec.lake, rivers: spec.rivers, pads: [], shade: [] };
  const lakeD = (x: number, z: number): number => lakeDist(shape, x, z);
  const roadD = (x: number, z: number): number => spec.roads.reduce((m, r) => Math.min(m, roadDist(r, x, z) - r.width / 2), Infinity);

  // Houses.
  const houses: PlacedHouse[] = spec.houses.map((h) => {
    const dims = h.plan && h.plan !== 'cottage' ? PLAN_SIZE[h.plan] : typeof h.size === 'object' ? h.size : SIZES[h.size ?? 'medium'];
    const hs: House3DSpec = { seed: h.seed ?? hashStr(h.id) % 1000, width: dims.width, depth: dims.depth, wallH: h.wallH ?? 2.5, roof: h.roof ?? 'thatch', walls: h.walls, plan: h.plan };
    if ('road' in h.at) {
      const road = spec.roads[h.at.road];
      if (!road) {
        problems.push(`house ${h.id}: no road ${h.at.road}`);
        return { id: h.id, x: 0, z: 0, rot: 0, spec: hs, room: h.room };
      }
      const p = roadPoint(road, h.at.t * roadLength(road));
      const [nx, nz] = sideNormal(p.tx, p.tz, h.at.side);
      // The house's front (local +z) faces the road; its footprint runs 0.6 m past the front wall for the porch.
      const dist = road.width / 2 + (h.at.gap ?? 2) + dims.depth / 2 + 0.6;
      const rot = Math.atan2(-nx, -nz) + (rng.next() - 0.5) * 0.12;
      return { id: h.id, x: p.x + nx * dist, z: p.z + nz * dist, rot, spec: hs, room: h.room };
    }
    return { id: h.id, x: h.at.x, z: h.at.z, rot: h.at.rot ?? 0, spec: hs, room: h.room };
  });

  const layout: Layout = {
    houses,
    trees: [...(spec.trees ?? [])],
    torches: [...(spec.torches ?? [])],
    props: [...(spec.props ?? [])],
  };
  for (const tl of spec.torchLines ?? []) {
    const road = spec.roads[tl.road];
    if (!road) {
      problems.push(`torch line: no road ${tl.road}`);
      continue;
    }
    const len = roadLength(road);
    for (let s = tl.every / 2; s < len; s += tl.every) {
      const p = roadPoint(road, s);
      const [nx, nz] = sideNormal(p.tx, p.tz, tl.side);
      const d = road.width / 2 + (tl.offset ?? 0.9);
      layout.torches.push([p.x + nx * d, p.z + nz * d]);
    }
  }

  const built = buildHouses(layout);
  const boxes = built.map(houseOuterBox);

  // Scatter: seeded random spots that keep clear of everything already there.
  const KEEP = { tree: 0.9, shrub: 0.5, boulder: 0.8 } as const;
  const placed: { x: number; z: number; r: number }[] = [
    ...layout.trees.map((t) => ({ x: t.x, z: t.z, r: KEEP.tree })),
    ...layout.props.map((p) => ({ x: p.x, z: p.z, r: p.kind === 'woodpile' ? 1 : KEEP[p.kind === 'boulder' ? 'boulder' : 'shrub'] })),
    ...layout.torches.map(([x, z]) => ({ x, z, r: 0.4 })),
  ];
  const inArea = (a: Area): (() => [number, number]) => {
    if ('circle' in a) return () => {
      const r = a.circle[2] * Math.sqrt(rng.next()), t = rng.next() * Math.PI * 2;
      return [a.circle[0] + Math.cos(t) * r, a.circle[1] + Math.sin(t) * r];
    };
    if ('rect' in a) return () => [a.rect[0] + rng.next() * (a.rect[2] - a.rect[0]), a.rect[1] + rng.next() * (a.rect[3] - a.rect[1])];
    if ('ring' in a) return () => {
      const [cx, cz, r0, r1] = a.ring;
      const r = Math.sqrt(r0 * r0 + rng.next() * (r1 * r1 - r0 * r0)), t = rng.next() * Math.PI * 2;
      return [cx + Math.cos(t) * r, cz + Math.sin(t) * r];
    };
    return () => [(rng.next() * 2 - 1) * (half - edge), (rng.next() * 2 - 1) * (half - edge)];
  };
  for (const sc of spec.scatter ?? []) {
    const pick = inArea(sc.area);
    const r = KEEP[sc.kind] + (sc.gap ?? (sc.kind === 'tree' ? 2.6 : 0.8));
    let got = 0;
    for (let tries = 0; got < sc.count && tries < sc.count * 80; tries++) {
      const [x, z] = pick();
      if (Math.abs(x) > half - edge || Math.abs(z) > half - edge) continue;
      if (lakeD(x, z) < 1.6 || roadD(x, z) < 1.4) continue;
      if (boxes.some((b) => shapeDist(b, x, z) < (sc.kind === 'tree' ? 2.4 : 1.2))) continue;
      if (placed.some((o) => Math.hypot(o.x - x, o.z - z) < r + o.r)) continue;
      placed.push({ x, z, r: KEEP[sc.kind] });
      got++;
      if (sc.kind === 'tree') {
        const seed = 1 + Math.floor(rng.next() * 60);
        // The kind is drawn only when asked for, so maps without a mix place exactly what they always did.
        layout.trees.push(sc.mix?.length ? { x, z, seed, kind: sc.mix[Math.floor(rng.next() * sc.mix.length)] } : { x, z, seed });
      }
      else layout.props.push({ kind: sc.kind === 'boulder' ? 'boulder' : 'shrub', x, z, seed: 1 + Math.floor(rng.next() * 60), size: 0.8 + rng.next() * 0.5 });
    }
    if (got < sc.count) problems.push(`scatter ${sc.kind}: only room for ${got} of ${sc.count}`);
  }

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
  const bridges = layout.props.filter((p) => p.kind === 'bridge').map((p) => ({ x: p.x, z: p.z, len: p.len ?? 5, width: BRIDGE_WIDTH + 0.3, rot: p.rot ?? 0 }));
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

  // The villager's beat.
  let walk: XZ[] = spec.walk ?? [];
  if (!walk.length && spec.roads[0]) {
    const r = spec.roads[0], len = roadLength(r);
    walk = [0.2, 0.4, 0.6, 0.8].map((t) => {
      const p = roadPoint(r, len * t);
      return [p.x + p.tz * 0.6, p.z - p.tx * 0.6] as XZ;
    });
  }

  // The wilderness: made per chunk, kept off roads, water, houses and the hero's feet.
  let generator: ChunkGenerator | undefined;
  if (spec.wild) {
    generator = wildGenerator(spec.wild, { seed: spec.seed, half, edge, lakeD, roadD, houses: new ShapeIndex(boxes), clear: [{ x: hero[0], z: hero[1], r: 3 }] });
  }
  const index = new PlacedIndex(layout, generator);
  if (generator) ground.extraShade = (x, z) => index.shadeAt(x, z);

  const compiled: CompiledMap = { name: spec.name, ground, layout, placed: index, hero, walk, problems };
  problems.push(...validate(spec, compiled, built.map((b, i) => ({ id: b.place.id, box: boxes[i], door: houseToWorld(b.place, b.model.door[0], b.model.door[2] - 0.9) }))));
  return compiled;
}

/** What is wrong with a compiled map (empty if nothing). */
function validate(spec: MapSpec, c: CompiledMap, houses: { id: string; box: Shape; door: { x: number; z: number } }[]): string[] {
  const out: string[] = [];
  const g = c.ground;
  const half = g.size / 2;
  const inMap = (x: number, z: number, m = 1): boolean => Math.abs(x) < half - m && Math.abs(z) < half - m;
  const lakeD = (x: number, z: number): number => lakeDist(g, x, z);
  const built = buildHouses(c.layout);
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
  for (const p of c.layout.props) if (!inMap(p.x, p.z, 0.5) || (p.kind !== 'bridge' && lakeD(p.x, p.z) < 0.5)) out.push(`${p.kind} at ${p.x.toFixed(1)},${p.z.toFixed(1)} is off the map or in the lake`);
  // Every door can be reached from where the hero starts.
  if (!out.length) {
    const grid = new NavGrid(g.size, layoutObstacles(c.layout, built), { radius: 0.2, blocked: (x, z) => lakeD(x, z) < 0.2 });
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
  if (spec.houses.length !== new Set(spec.houses.map((h) => h.id)).size) out.push('two houses share an id');
  return out;
}

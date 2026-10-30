import { type House3DSpec, type HouseModel, buildHouse } from './house';
import type { PlacedProp } from './props';
import { type Shape, boxOfFootprint, shapeDist } from './space';
import type { Things } from './things';

/**
 * A layout is the list of things placed in the world: houses, trees, torch posts.
 * The renderer builds from it, and so do collision, ground pads and the filament
 * field, so a thing is added in one place. Metres; `rot` turns a thing like
 * three.js `rotation.y` (see `space.ts`).
 */

export interface PlacedHouse {
  id: string;
  x: number;
  z: number;
  rot: number;
  spec: House3DSpec;
  /** What is inside (a key of `ROOM_SETS` in `content/rooms3d.ts`); the humble home by default. */
  room?: string;
}

export interface PlacedTree {
  x: number;
  z: number;
  seed: number;
  /** A kind of tree (`content/things/kinds/tree.ts`). Default: an oak. */
  kind?: string;
}

/** A tree as a placed thing of its kind, for asking the kinds of thing about it. */
export const treeProp = (t: PlacedTree): PlacedProp => ({ kind: t.kind ?? 'oak', x: t.x, z: t.z, seed: t.seed });

export interface Layout {
  houses: PlacedHouse[];
  trees: PlacedTree[];
  /** Everything else that stands out of doors: shrubs, boulders, woodpiles, torch posts. */
  props: PlacedProp[];
}

export interface BuiltHouse {
  place: PlacedHouse;
  model: HouseModel;
}

/** A house's model, made once for each look (the same spec always gives the same model, and nothing changes it). */
const models = new Map<string, HouseModel>();
const modelOf = (spec: House3DSpec, things: Things): HouseModel => {
  const k = `${spec.seed}|${spec.width}|${spec.depth}|${spec.wallH}|${spec.roof}|${spec.walls}|${spec.plan}`;
  let m = models.get(k);
  if (!m) models.set(k, (m = buildHouse(spec, things.building(spec.plan))));
  return m;
};

/** The houses of a layout, built to their kind of building (asked of the kinds of thing). */
export const buildHouses = (l: Pick<Layout, 'houses'>, things: Things): BuiltHouse[] => l.houses.map((place) => ({ place, model: modelOf(place.spec, things) }));

/** House-local (x, z) to world. */
export function houseToWorld(h: PlacedHouse, x: number, z: number): { x: number; z: number } {
  const c = Math.cos(h.rot), s = Math.sin(h.rot);
  return { x: h.x + x * c + z * s, z: h.z - x * s + z * c };
}

/** World (x, z) to house-local. */
export function houseToLocal(h: PlacedHouse, x: number, z: number): { x: number; z: number } {
  const dx = x - h.x, dz = z - h.z;
  const c = Math.cos(h.rot), s = Math.sin(h.rot);
  return { x: dx * c - dz * s, z: dx * s + dz * c };
}

/**
 * A house's four thin walls, so the inside can be walked, with a gap at the door (`withDoor` false: whole,
 * for the storeys above the ground). The footprint is the walls plus a little proud (0.1 at the sides, a 0.6
 * porch at the front).
 */
export function houseWalls(b: BuiltHouse, withDoor = true): Shape[] {
  const fp = b.model.footprint, doorX = b.model.door[0], gap = b.model.doorHalf, t = 0.12;
  const hw = (fp.x1 - fp.x0) / 2 - 0.1, hd = -fp.z0 - 0.1;
  const wall = (x0: number, x1: number, z0: number, z1: number): Shape => boxOfFootprint({ x0, x1, z0, z1 }, b.place.x, b.place.z, b.place.rot);
  return [
    wall(-hw - t, hw + t, -hd - t, -hd + t),
    wall(-hw - t, -hw + t, -hd, hd),
    wall(hw - t, hw + t, -hd, hd),
    ...(withDoor
      ? [wall(-hw - t, doorX - gap, hd - t, hd + t), wall(doorX + gap, hw + t, hd - t, hd + t)]
      : [wall(-hw - t, hw + t, hd - t, hd + t)]),
  ];
}

/** What blocks feet inside a storey besides the outer walls: partitions and the stairs' footprints (not the furniture). */
export const levelBlocks = (b: BuiltHouse, level: number): Shape[] =>
  b.model.levels[level].blocks.map((r) => boxOfFootprint(r, b.place.x, b.place.z, b.place.rot));

/** The tall inner walls of a storey, which stop the eye. */
export const sightWalls = (b: BuiltHouse, level: number): Shape[] =>
  b.model.levels[level].sight.map((r) => boxOfFootprint(r, b.place.x, b.place.z, b.place.rot));

/** A storey's walls and what is built into it: what the ground's walking is stopped by, for a storey above it. */
export const levelWalls = (b: BuiltHouse, level: number): Shape[] => [...houseWalls(b, level === 0), ...levelBlocks(b, level)];

/** The house's whole footprint as one box (is something inside it?). */
export function houseBox(b: BuiltHouse): Shape {
  const fp = b.model.footprint;
  return boxOfFootprint({ x0: fp.x0 + 0.1, x1: fp.x1 - 0.1, z0: fp.z0 + 0.1, z1: fp.z1 - 0.6 }, b.place.x, b.place.z, b.place.rot);
}

/** The house with its porch, whole, for the filament field's "indoors". */
export const houseOuterBox = (b: BuiltHouse): Shape => boxOfFootprint(b.model.footprint, b.place.x, b.place.z, b.place.rot);

/** What blocks feet: house walls, tree trunks, torch posts, props (asked of their kinds). */
export function layoutObstacles(l: Layout, houses: BuiltHouse[], things: Things): Shape[] {
  return [
    ...houses.flatMap((b) => levelWalls(b, 0)),
    ...l.trees.flatMap((t) => things.shapes(treeProp(t))),
    ...l.props.flatMap((p) => things.shapes(p)),
  ];
}

/** What the furniture of a house blocks, from the room plan's footprints (house-local) to the world. */
export const furnitureObstacles = (b: BuiltHouse, fps: { x: number; z: number; hw: number; hd: number }[]): Shape[] =>
  fps.map((f) => boxOfFootprint({ x0: f.x - f.hw, x1: f.x + f.hw, z0: f.z - f.hd, z1: f.z + f.hd }, b.place.x, b.place.z, b.place.rot));

/** Flat pads under the houses, for the terrain. */
export const layoutPads = (l: Layout): { x: number; z: number; hw: number; hd: number; rot: number }[] =>
  l.houses.map((h) => ({ x: h.x, z: h.z, hw: h.spec.width / 2 + 0.3, hd: h.spec.depth / 2 + 0.5, rot: h.rot }));

/** Leafy ground under the trees. */
export const layoutShade = (l: Layout): { x: number; z: number; r: number }[] => l.trees.map((t) => ({ x: t.x, z: t.z, r: 5 }));

/** The house a world point stands in (inside its walls), if any. */
export function houseAt(houses: BuiltHouse[], boxes: Shape[], x: number, z: number, slack = 0): number {
  for (let i = 0; i < houses.length; i++) if (shapeDist(boxes[i], x, z) < slack) return i;
  return -1;
}

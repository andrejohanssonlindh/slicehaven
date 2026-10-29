import { CHUNK, chunkKey } from './chunks';
import type { FSource } from './filaments3d';
import { POST, TRUNK, type Layout, type PlacedTree } from './layout';
import { type PlacedProp, propShape, propSource } from './props';
import { type Shape, type ShapeSource, circle } from './space';

/**
 * The things placed out in the world (trees, props, torch posts) by chunk, so a
 * map of any size is asked only about the ground that is looked at. A chunk's
 * content is the authored things that stand in it plus, for a map that has a
 * generator, what the generator makes for it (the same every time it is asked,
 * from the chunk's address and the map's seed). The renderer builds a chunk's
 * things when the chunk streams in; walking and the filament field ask for the
 * shapes and sources near a point and never see the rest.
 *
 * Houses are not here (yet): they are few enough to hold whole. See
 * `director/design/world3d-scale.md`.
 */

export interface ChunkContent {
  trees: PlacedTree[];
  props: PlacedProp[];
  torches: [number, number][];
}

/** Makes the content of chunk (i, j): deterministic, and independent of the order chunks are asked in. */
export type ChunkGenerator = (i: number, j: number) => Partial<ChunkContent>;

const EMPTY: ChunkContent = { trees: [], props: [], torches: [] };

/** Radius of the leafy shade a generated tree casts on the ground (the same as authored trees get). */
export const SHADE_R = 5;

export class PlacedIndex implements ShapeSource {
  private readonly authored = new Map<string, ChunkContent>();
  private readonly made = new Map<string, ChunkContent>();
  private readonly shapes = new Map<string, Shape[]>();
  private readonly sights = new Map<string, Shape[]>();

  constructor(layout: Pick<Layout, 'trees' | 'props' | 'torches'>, private readonly generator?: ChunkGenerator) {
    const at = (x: number, z: number): ChunkContent => {
      const k = chunkKey(Math.floor(x / CHUNK), Math.floor(z / CHUNK));
      let c = this.authored.get(k);
      if (!c) this.authored.set(k, (c = { trees: [], props: [], torches: [] }));
      return c;
    };
    for (const t of layout.trees) at(t.x, t.z).trees.push(t);
    for (const p of layout.props) at(p.x, p.z).props.push(p);
    for (const t of layout.torches) at(t[0], t[1]).torches.push(t);
  }

  /** What stands in chunk (i, j): authored things first, then generated ones. */
  chunk(i: number, j: number): ChunkContent {
    const k = chunkKey(i, j);
    const a = this.authored.get(k);
    let g = this.made.get(k);
    if (!g && this.generator) {
      const m = this.generator(i, j);
      this.made.set(k, (g = { trees: m.trees ?? [], props: m.props ?? [], torches: m.torches ?? [] }));
    }
    if (!g) return a ?? EMPTY;
    if (!a) return g;
    return { trees: [...a.trees, ...g.trees], props: [...a.props, ...g.props], torches: [...a.torches, ...g.torches] };
  }

  /** Chunks the rectangle touches, as [i, j] pairs. */
  private chunksIn(x0: number, z0: number, x1: number, z1: number): [number, number][] {
    const out: [number, number][] = [];
    for (let j = Math.floor(z0 / CHUNK); j <= Math.floor(z1 / CHUNK); j++) for (let i = Math.floor(x0 / CHUNK); i <= Math.floor(x1 / CHUNK); i++) out.push([i, j]);
    return out;
  }

  /** What blocks feet in chunk (i, j). */
  private shapesOf(i: number, j: number): Shape[] {
    const k = chunkKey(i, j);
    let s = this.shapes.get(k);
    if (!s) {
      const c = this.chunk(i, j);
      s = [...c.trees.map((t) => circle(t.x, t.z, TRUNK)), ...c.torches.map(([x, z]) => circle(x, z, POST)), ...c.props.map(propShape)];
      this.shapes.set(k, s);
    }
    return s;
  }

  /** The obstacles (trunks, posts, props) that may touch a rectangle: whole chunks' worth, each once. */
  near(x0: number, z0: number, x1: number, z1: number): readonly Shape[] {
    // A prop can reach a little past its chunk's edge; ask one metre wider.
    const out = new Set<Shape>();
    for (const [i, j] of this.chunksIn(x0 - 1.5, z0 - 1.5, x1 + 1.5, z1 + 1.5)) for (const s of this.shapesOf(i, j)) out.add(s);
    return [...out];
  }

  /** What stops the eye: trunks and boulders (not posts, crates, fences or bushes) that may touch a rectangle. */
  sightNear(x0: number, z0: number, x1: number, z1: number): readonly Shape[] {
    const out: Shape[] = [];
    for (const [i, j] of this.chunksIn(x0 - 1.5, z0 - 1.5, x1 + 1.5, z1 + 1.5)) {
      const k = chunkKey(i, j);
      let s = this.sights.get(k);
      if (!s) {
        const c = this.chunk(i, j);
        s = [...c.trees.map((t) => circle(t.x, t.z, TRUNK)), ...c.props.filter((p) => p.kind === 'boulder').map(propShape)];
        this.sights.set(k, s);
      }
      out.push(...s);
    }
    return out;
  }

  /** The filament sources (trees, rocks, bushes, torches, wells) that stand in a rectangle. */
  sourcesIn(x0: number, z0: number, x1: number, z1: number): FSource[] {
    const out: FSource[] = [];
    const inside = (x: number, z: number): boolean => x >= x0 && x < x1 && z >= z0 && z < z1;
    for (const [i, j] of this.chunksIn(x0, z0, x1, z1)) {
      const c = this.chunk(i, j);
      for (const t of c.trees) if (inside(t.x, t.z)) out.push({ x: t.x, z: t.z, kind: t.kind === 'pine' ? 'pine' : 'tree' });
      for (const [x, z] of c.torches) if (inside(x, z)) out.push({ x, z, kind: 'fire', weight: 1 });
      for (const p of c.props) {
        const s = inside(p.x, p.z) ? propSource(p) : null;
        if (s) out.push(s);
      }
    }
    return out;
  }

  /** How much leafy shade the generated trees put on (x, z), 0..1 (what the ground paints under a forest). */
  shadeAt(x: number, z: number): number {
    if (!this.generator) return 0;
    let shade = 0;
    for (const [i, j] of this.chunksIn(x - SHADE_R, z - SHADE_R, x + SHADE_R, z + SHADE_R)) {
      this.chunk(i, j); // makes it if it has not been made yet
      for (const t of this.made.get(chunkKey(i, j))?.trees ?? []) {
        const d = Math.hypot(x - t.x, z - t.z) / SHADE_R;
        if (d >= 1) continue;
        // The same falloff the ground uses for authored shade (smooth from half the radius to the radius).
        const u = Math.max(0, Math.min(1, (d - 0.5) / 0.5));
        shade = Math.max(shade, 1 - u * u * (3 - 2 * u));
      }
    }
    return shade;
  }

  /** Number of chunks whose generated content has been made (a measure of how much of the world has been looked at). */
  get generatedChunks(): number {
    return this.made.size;
  }
}

/**
 * Measurements and walking in the hex-free world. Distances are metres.
 * Obstacles are rectangles and circles (collision footprints); a navigation
 * grid (0.25 m cells) is built from them, a block of cells at a time and only
 * where someone asks, and path-finding runs on that. Nothing here is sized by the
 * world: a map a kilometre across costs what the ground actually walked on costs.
 * Pure and deterministic: the renderer only draws the result.
 */

export interface P2 {
  x: number;
  z: number;
}

/** Distance in metres between two points on the ground. */
export const distance = (a: P2, b: P2): number => Math.hypot(a.x - b.x, a.z - b.z);

/** Is `a` within `r` metres of `b`? (What scene code asks: "is the hero next to the cart".) */
export const near = (a: P2, b: P2, r: number): boolean => distance(a, b) <= r;

export type Shape =
  | { kind: 'circle'; x: number; z: number; r: number }
  /** A box with half sizes, turned by `rot` the way a three.js object turned about y is. */
  | { kind: 'box'; x: number; z: number; hw: number; hd: number; rot: number };

export const circle = (x: number, z: number, r: number): Shape => ({ kind: 'circle', x, z, r });

/** Distance from a point to a shape's edge, negative inside. */
export function shapeDist(s: Shape, x: number, z: number): number {
  if (s.kind === 'circle') return Math.hypot(x - s.x, z - s.z) - s.r;
  const c = Math.cos(s.rot), sn = Math.sin(s.rot);
  const dx = x - s.x, dz = z - s.z;
  const lx = Math.abs(dx * c - dz * sn) - s.hw, lz = Math.abs(dx * sn + dz * c) - s.hd;
  const out = Math.hypot(Math.max(lx, 0), Math.max(lz, 0));
  return out + Math.min(Math.max(lx, lz), 0);
}

/** A house's footprint (in its own frame) placed in the world. */
export function boxOfFootprint(fp: { x0: number; x1: number; z0: number; z1: number }, x: number, z: number, rot: number): Shape {
  const cx = (fp.x0 + fp.x1) / 2, cz = (fp.z0 + fp.z1) / 2;
  const c = Math.cos(rot), s = Math.sin(rot);
  return { kind: 'box', x: x + cx * c + cz * s, z: z - cx * s + cz * c, hw: (fp.x1 - fp.x0) / 2, hd: (fp.z1 - fp.z0) / 2, rot };
}

/** Half the diagonal of the square that holds a shape, metres: how far it can reach from its centre. */
const reachOf = (s: Shape): number => (s.kind === 'circle' ? s.r : Math.hypot(s.hw, s.hd));

/** Anything that can say which obstacles lie in a rectangle of the ground (a spatial index, or a streaming map). */
export interface ShapeSource {
  near(x0: number, z0: number, x1: number, z1: number): readonly Shape[];
}

/**
 * Shapes in square buckets, so "what is near here" costs the bucket and not the world. A shape sits in every bucket
 * its bounding square touches.
 */
export class ShapeIndex implements ShapeSource {
  private readonly buckets = new Map<number, Shape[]>();
  private n = 0;

  constructor(shapes: readonly Shape[] = [], readonly bucket = 8) {
    for (const s of shapes) this.add(s);
  }

  get count(): number {
    return this.n;
  }

  private key(i: number, j: number): number {
    return (j + 32768) * 65536 + (i + 32768);
  }

  add(s: Shape): void {
    const r = reachOf(s);
    const i0 = Math.floor((s.x - r) / this.bucket), i1 = Math.floor((s.x + r) / this.bucket);
    const j0 = Math.floor((s.z - r) / this.bucket), j1 = Math.floor((s.z + r) / this.bucket);
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const k = this.key(i, j);
        const b = this.buckets.get(k);
        if (b) b.push(s);
        else this.buckets.set(k, [s]);
      }
    }
    this.n++;
  }

  /** Remove a shape (the very object that was added). */
  remove(s: Shape): void {
    const r = reachOf(s);
    const i0 = Math.floor((s.x - r) / this.bucket), i1 = Math.floor((s.x + r) / this.bucket);
    const j0 = Math.floor((s.z - r) / this.bucket), j1 = Math.floor((s.z + r) / this.bucket);
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const b = this.buckets.get(this.key(i, j));
        const at = b ? b.indexOf(s) : -1;
        if (b && at >= 0) b.splice(at, 1);
      }
    }
    this.n--;
  }

  /** Shapes whose buckets touch the rectangle (a superset of those that overlap it; each once). */
  near(x0: number, z0: number, x1: number, z1: number): readonly Shape[] {
    const out = new Set<Shape>();
    const i0 = Math.floor(x0 / this.bucket), i1 = Math.floor(x1 / this.bucket);
    const j0 = Math.floor(z0 / this.bucket), j1 = Math.floor(z1 / this.bucket);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) for (const s of this.buckets.get(this.key(i, j)) ?? []) out.add(s);
    return [...out];
  }
}

export interface NavOptions {
  /** Cell size, metres. */
  cell?: number;
  /** Radius of the walker: obstacles are grown by this. */
  radius?: number;
  /** Extra ground that cannot be walked (water). */
  blocked?: (x: number, z: number) => boolean;
}

/** Cells along a side of one block of the nav grid (8 m at 0.25 m cells). */
const BLOCK = 32;

/**
 * An invisible grid over the ground that says which cells can be stood on. It is sparse: a block of 32 × 32 cells is
 * worked out the first time a cell in it is asked about, from the obstacles near it, and kept. `shapes` is a list or
 * anything that can say what is near (a `ShapeSource`); tell the grid with `invalidate` when that changes.
 */
export class NavGrid {
  readonly cell: number;
  readonly w: number;
  readonly h: number;
  readonly x0: number;
  readonly z0: number;
  private readonly source: ShapeSource;
  private readonly radius: number;
  private readonly blocked?: (x: number, z: number) => boolean;
  private readonly blocks = new Map<number, Uint8Array>();
  private readonly bw: number;

  constructor(readonly size: number, shapes: readonly Shape[] | ShapeSource, o: NavOptions = {}) {
    this.cell = o.cell ?? 0.25;
    this.radius = o.radius ?? 0.25;
    this.blocked = o.blocked;
    this.w = this.h = Math.ceil(size / this.cell);
    this.x0 = this.z0 = -size / 2;
    this.bw = Math.ceil(this.w / BLOCK);
    this.source = Array.isArray(shapes) ? new ShapeIndex(shapes as readonly Shape[]) : (shapes as ShapeSource);
  }

  /** Blocks computed so far (a measure of how much ground has been looked at). */
  get blocksBuilt(): number {
    return this.blocks.size;
  }

  /** Let go of the blocks whose middle `keep` says no to (far from anyone): they are worked out again if asked. Returns how many went. */
  forget(keep: (x: number, z: number) => boolean): number {
    let n = 0;
    const span = BLOCK * this.cell;
    for (const key of [...this.blocks.keys()]) {
      const bi = key % this.bw, bj = Math.floor(key / this.bw);
      if (keep(this.x0 + (bi + 0.5) * span, this.z0 + (bj + 0.5) * span)) continue;
      this.blocks.delete(key);
      n++;
    }
    return n;
  }

  /** Something changed in this rectangle of the ground: forget what was worked out there. */
  invalidate(x0: number, z0: number, x1: number, z1: number): void {
    const a = this.cellOf(x0 - this.radius, z0 - this.radius), b = this.cellOf(x1 + this.radius, z1 + this.radius);
    for (let bj = Math.floor(a.j / BLOCK); bj <= Math.floor(b.j / BLOCK); bj++) {
      for (let bi = Math.floor(a.i / BLOCK); bi <= Math.floor(b.i / BLOCK); bi++) this.blocks.delete(bj * this.bw + bi);
    }
  }

  private block(bi: number, bj: number): Uint8Array {
    const key = bj * this.bw + bi;
    let b = this.blocks.get(key);
    if (b) return b;
    b = new Uint8Array(BLOCK * BLOCK);
    const x0 = this.x0 + bi * BLOCK * this.cell, z0 = this.z0 + bj * BLOCK * this.cell;
    const span = BLOCK * this.cell;
    const shapes = this.source.near(x0 - this.radius, z0 - this.radius, x0 + span + this.radius, z0 + span + this.radius);
    for (let j = 0; j < BLOCK; j++) {
      for (let i = 0; i < BLOCK; i++) {
        const x = x0 + (i + 0.5) * this.cell, z = z0 + (j + 0.5) * this.cell;
        let hit = this.blocked?.(x, z) ?? false;
        for (let k = 0; !hit && k < shapes.length; k++) hit = shapeDist(shapes[k], x, z) < this.radius;
        if (hit) b[j * BLOCK + i] = 1;
      }
    }
    this.blocks.set(key, b);
    return b;
  }

  cellOf(x: number, z: number): { i: number; j: number } {
    return { i: Math.floor((x - this.x0) / this.cell), j: Math.floor((z - this.z0) / this.cell) };
  }

  centre(i: number, j: number): P2 {
    return { x: this.x0 + (i + 0.5) * this.cell, z: this.z0 + (j + 0.5) * this.cell };
  }

  inside(i: number, j: number): boolean {
    return i >= 0 && j >= 0 && i < this.w && j < this.h;
  }

  /** Can a walker stand in cell (i, j)? */
  free(i: number, j: number): boolean {
    if (!this.inside(i, j)) return false;
    const bi = Math.floor(i / BLOCK), bj = Math.floor(j / BLOCK);
    return this.block(bi, bj)[(j - bj * BLOCK) * BLOCK + (i - bi * BLOCK)] === 0;
  }

  walkable(x: number, z: number): boolean {
    const c = this.cellOf(x, z);
    return this.free(c.i, c.j);
  }

  /** The nearest free cell's centre to (x, z), searching outward in rings; null if none. */
  nearestFree(x: number, z: number, maxRings = 80): P2 | null {
    const c = this.cellOf(x, z);
    if (this.free(c.i, c.j)) return this.centre(c.i, c.j);
    let best: P2 | null = null, bestD = Infinity;
    for (let r = 1; r <= maxRings; r++) {
      for (let j = c.j - r; j <= c.j + r; j++) {
        for (let i = c.i - r; i <= c.i + r; i++) {
          if (Math.max(Math.abs(i - c.i), Math.abs(j - c.j)) !== r || !this.free(i, j)) continue;
          const p = this.centre(i, j), d = Math.hypot(p.x - x, p.z - z);
          if (d < bestD) { bestD = d; best = p; }
        }
      }
      // Any hit in ring r beats everything from ring r + 2 on.
      if (best && bestD <= r * this.cell) break;
    }
    return best;
  }

  /** Is the straight line between two points free all the way (sampled every quarter cell)? */
  clear(a: P2, b: P2): boolean {
    const n = Math.max(1, Math.ceil(distance(a, b) / (this.cell * 0.25)));
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      if (!this.walkable(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)) return false;
    }
    return true;
  }
}

/** A minimal binary heap of [priority, value] pairs. */
class Heap {
  private a: [number, number][] = [];
  get size(): number {
    return this.a.length;
  }
  push(p: number, v: number): void {
    const a = this.a;
    a.push([p, v]);
    let i = a.length - 1;
    while (i > 0) {
      const u = (i - 1) >> 1;
      if (a[u][0] <= a[i][0]) break;
      [a[u], a[i]] = [a[i], a[u]];
      i = u;
    }
  }
  pop(): number {
    const a = this.a, top = a[0][1], last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

const STEPS: [number, number, number][] = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
];

/**
 * A path from `from` to `to` as a polyline of points the walker can follow in
 * straight lines, or null when nothing is reachable. A goal that is blocked is
 * moved to the nearest free ground. 8-way A*, no cutting corners, then pulled
 * tight with line-of-sight. The search stays within a margin round the two ends
 * (so an unreachable goal costs a bounded search, not the whole world).
 */
export function findPath(grid: NavGrid, from: P2, to: P2): P2[] | null {
  const start = grid.nearestFree(from.x, from.z, 8);
  const goalP = grid.nearestFree(to.x, to.z);
  if (!start || !goalP) return null;
  const s = grid.cellOf(start.x, start.z), g = grid.cellOf(goalP.x, goalP.z);
  const W = grid.w, id = (i: number, j: number): number => j * W + i;
  // The box the search may use: both ends, and as much again round them (at least 40 m).
  const margin = Math.max(Math.ceil(40 / grid.cell), Math.max(Math.abs(s.i - g.i), Math.abs(s.j - g.j)));
  const lo = { i: Math.min(s.i, g.i) - margin, j: Math.min(s.j, g.j) - margin }, hi = { i: Math.max(s.i, g.i) + margin, j: Math.max(s.j, g.j) + margin };
  const cost = new Map<number, number>();
  const from_ = new Map<number, number>();
  const closed = new Set<number>();
  const open = new Heap();
  const hf = (i: number, j: number): number => {
    const dx = Math.abs(i - g.i), dz = Math.abs(j - g.j);
    return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz);
  };
  cost.set(id(s.i, s.j), 0);
  open.push(hf(s.i, s.j), id(s.i, s.j));
  // A goal that cannot be reached floods the whole box, and on fresh ground every block it touches is worked out at
  // once (a hitch). So the search may work out only so many new blocks: a few, plus eight for each block's length
  // between the ends (a walk through woods needs about five; a long walk down a road still gets what it needs).
  const span = BLOCK * grid.cell;
  const budget = 16 + 8 * Math.ceil(Math.hypot(goalP.x - start.x, goalP.z - start.z) / span);
  const blocks0 = grid.blocksBuilt;
  let found = false;
  while (open.size) {
    if (grid.blocksBuilt - blocks0 > budget) return null;
    const cur = open.pop();
    if (closed.has(cur)) continue;
    closed.add(cur);
    const ci = cur % W, cj = (cur - ci) / W;
    if (ci === g.i && cj === g.j) { found = true; break; }
    const cc = cost.get(cur)!;
    for (const [di, dj, c] of STEPS) {
      const ni = ci + di, nj = cj + dj;
      if (ni < lo.i || nj < lo.j || ni > hi.i || nj > hi.j || !grid.free(ni, nj)) continue;
      // Diagonals may not squeeze between two blocked cells.
      if (di !== 0 && dj !== 0 && (!grid.free(ci + di, cj) || !grid.free(ci, cj + dj))) continue;
      const n = id(ni, nj), nc = cc + c;
      if (nc < (cost.get(n) ?? Infinity)) {
        cost.set(n, nc);
        from_.set(n, cur);
        open.push(nc + hf(ni, nj), n);
      }
    }
  }
  if (!found) return null;
  const cells: P2[] = [];
  for (let c: number | undefined = id(g.i, g.j); c !== undefined; c = from_.get(c)) cells.push(grid.centre(c % W, (c - (c % W)) / W));
  cells.reverse();
  // Real endpoints where they are walkable, so the walker starts and ends exactly there.
  const pts: P2[] = [grid.walkable(from.x, from.z) ? { x: from.x, z: from.z } : cells[0]];
  pts.push(...cells.slice(1, -1));
  pts.push(grid.walkable(to.x, to.z) ? { x: to.x, z: to.z } : cells[cells.length - 1]);
  // String pulling: from each anchor, jump to the farthest point still in line of sight.
  const out: P2[] = [pts[0]];
  let a = 0;
  while (a < pts.length - 1) {
    let b = pts.length - 1;
    while (b > a + 1 && !grid.clear(pts[a], pts[b])) b--;
    out.push(pts[b]);
    a = b;
  }
  return out;
}

export function pathLength(path: readonly P2[]): number {
  let l = 0;
  for (let i = 1; i < path.length; i++) l += distance(path[i - 1], path[i]);
  return l;
}

/** Where a walker is after going `s` metres along a path, and which way it is heading. */
export function followPath(path: readonly P2[], s: number): { x: number; z: number; dx: number; dz: number; done: boolean } {
  let left = Math.max(0, s);
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i], l = distance(a, b);
    if (left <= l || i === path.length - 1) {
      const k = l > 0 ? Math.min(1, left / l) : 1;
      const dir = l > 0 ? { dx: (b.x - a.x) / l, dz: (b.z - a.z) / l } : { dx: 0, dz: 1 };
      return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, ...dir, done: left >= l && i === path.length - 1 };
    }
    left -= l;
  }
  const p = path[0] ?? { x: 0, z: 0 };
  return { x: p.x, z: p.z, dx: 0, dz: 1, done: true };
}

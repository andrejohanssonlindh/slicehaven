/**
 * Measurements and walking in the hex-free world. Distances are metres.
 * Obstacles are rectangles and circles (collision footprints); a coarse
 * navigation grid (about 0.5 m cells) is built from them and path-finding runs
 * on that. Pure and deterministic: the renderer only draws the result.
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

export interface NavOptions {
  /** Cell size, metres. */
  cell?: number;
  /** Radius of the walker: obstacles are grown by this. */
  radius?: number;
  /** Extra ground that cannot be walked (water). */
  blocked?: (x: number, z: number) => boolean;
}

/** An invisible grid over the ground that says which cells can be stood on. */
export class NavGrid {
  readonly cell: number;
  readonly w: number;
  readonly h: number;
  readonly x0: number;
  readonly z0: number;
  private readonly bad: Uint8Array;

  constructor(readonly size: number, shapes: readonly Shape[], o: NavOptions = {}) {
    this.cell = o.cell ?? 0.5;
    const radius = o.radius ?? 0.25;
    this.w = this.h = Math.ceil(size / this.cell);
    this.x0 = this.z0 = -size / 2;
    this.bad = new Uint8Array(this.w * this.h);
    for (let j = 0; j < this.h; j++) {
      for (let i = 0; i < this.w; i++) {
        const c = this.centre(i, j);
        let hit = o.blocked?.(c.x, c.z) ?? false;
        for (let k = 0; !hit && k < shapes.length; k++) hit = shapeDist(shapes[k], c.x, c.z) < radius;
        if (hit) this.bad[j * this.w + i] = 1;
      }
    }
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
    return this.inside(i, j) && this.bad[j * this.w + i] === 0;
  }

  walkable(x: number, z: number): boolean {
    const c = this.cellOf(x, z);
    return this.free(c.i, c.j);
  }

  /** The nearest free cell's centre to (x, z), searching outward in rings; null if none. */
  nearestFree(x: number, z: number, maxRings = 40): P2 | null {
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
 * tight with line-of-sight.
 */
export function findPath(grid: NavGrid, from: P2, to: P2): P2[] | null {
  const start = grid.nearestFree(from.x, from.z, 4);
  const goalP = grid.nearestFree(to.x, to.z);
  if (!start || !goalP) return null;
  const s = grid.cellOf(start.x, start.z), g = grid.cellOf(goalP.x, goalP.z);
  const W = grid.w, id = (i: number, j: number): number => j * W + i;
  const cost = new Float32Array(W * grid.h).fill(Infinity);
  const from_ = new Int32Array(W * grid.h).fill(-1);
  const closed = new Uint8Array(W * grid.h);
  const open = new Heap();
  const hf = (i: number, j: number): number => {
    const dx = Math.abs(i - g.i), dz = Math.abs(j - g.j);
    return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz);
  };
  cost[id(s.i, s.j)] = 0;
  open.push(hf(s.i, s.j), id(s.i, s.j));
  let found = false;
  while (open.size) {
    const cur = open.pop();
    if (closed[cur]) continue;
    closed[cur] = 1;
    const ci = cur % W, cj = (cur - ci) / W;
    if (ci === g.i && cj === g.j) { found = true; break; }
    for (const [di, dj, c] of STEPS) {
      const ni = ci + di, nj = cj + dj;
      if (!grid.free(ni, nj)) continue;
      // Diagonals may not squeeze between two blocked cells.
      if (di !== 0 && dj !== 0 && (!grid.free(ci + di, cj) || !grid.free(ci, cj + dj))) continue;
      const n = id(ni, nj), nc = cost[cur] + c;
      if (nc < cost[n]) {
        cost[n] = nc;
        from_[n] = cur;
        open.push(nc + hf(ni, nj), n);
      }
    }
  }
  if (!found) return null;
  const cells: P2[] = [];
  for (let c = id(g.i, g.j); c !== -1; c = from_[c]) cells.push(grid.centre(c % W, (c - (c % W)) / W));
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

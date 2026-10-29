import { fbm } from '../noise';
import { type MeshData, emptyMesh } from './mesh';

/**
 * Continuous ground: a gently rolling heightmap with roads, mud and a lake
 * painted in by distance, no tiles. Pure and seeded; the renderer builds the
 * mesh and paints the ground texture from these functions.
 */

export type XZ = [number, number];

export interface Road {
  pts: XZ[];
  /** Full width in metres. */
  width: number;
}

export interface Ground3D {
  seed: number;
  /** Side of the square patch, metres, centred on the origin. */
  size: number;
  roads: Road[];
  mud: { x: number; z: number; r: number }[];
  lake?: { x: number; z: number; r: number };
  /** Flat pads where buildings stand (centre, half sizes, rotation). */
  pads: { x: number; z: number; hw: number; hd: number; rot: number }[];
  /** Darker, leafy ground under trees. */
  shade: { x: number; z: number; r: number }[];
  /** More shade (0..1) from things that are not in `shade` (trees a streaming map makes as it goes). */
  extraShade?: (x: number, z: number) => number;
}

/** Water surface height. */
export const WATER_Y = 0;
/** Typical ground height (a little above the water). */
const BASE_Y = 0.35;

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
const smooth = (e0: number, e1: number, v: number): number => {
  const t = clamp01((v - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

export function segDist(px: number, pz: number, a: XZ, b: XZ): number {
  const ex = b[0] - a[0], ez = b[1] - a[1];
  const t = clamp01(((px - a[0]) * ex + (pz - a[1]) * ez) / (ex * ex + ez * ez || 1));
  return Math.hypot(px - (a[0] + ex * t), pz - (a[1] + ez * t));
}

export function roadDist(r: Road, x: number, z: number): number {
  let d = Infinity;
  for (let i = 0; i + 1 < r.pts.length; i++) d = Math.min(d, segDist(x, z, r.pts[i], r.pts[i + 1]));
  return d;
}

/** Signed distance to the lake shore (negative is in the water), with a wobbly bank. */
export function lakeDist(g: Ground3D, x: number, z: number): number {
  if (!g.lake) return Infinity;
  const a = Math.atan2(z - g.lake.z, x - g.lake.x);
  const wob = (fbm(Math.cos(a) * 1.6 + 5, Math.sin(a) * 1.6 + 5, g.seed + 3) - 0.5) * 0.55;
  return Math.hypot(x - g.lake.x, z - g.lake.z) - g.lake.r * (1 + wob);
}

/** Distance outside a building pad (0 inside). */
function padDist(p: Ground3D['pads'][number], x: number, z: number): number {
  // Same turn as a three.js object rotated about y by p.rot (see `toWorld` in engine3d/world.ts).
  const c = Math.cos(p.rot), s = Math.sin(p.rot);
  const lx = (x - p.x) * c - (z - p.z) * s, lz = (x - p.x) * s + (z - p.z) * c;
  const dx = Math.max(0, Math.abs(lx) - p.hw), dz = Math.max(0, Math.abs(lz) - p.hd);
  return Math.hypot(dx, dz);
}

/**
 * The ground's features in square buckets, so a sample costs the features near it and not all of them. A feature is in
 * every bucket its reach touches (how far it changes the ground: a pad 3 m past its edge, a road 0.6 widths, a mud patch
 * or a shade circle its radius). Built the first time the ground is sampled, and again if features are added.
 */
const BUCKET = 32;
interface GroundIndex {
  sig: string;
  pads: Map<number, Ground3D['pads']>;
  mud: Map<number, Ground3D['mud']>;
  shade: Map<number, Ground3D['shade']>;
  /** Per bucket, per road, the segments that can reach it. */
  roads: Map<number, Map<Road, [XZ, XZ][]>>;
}
const indexes = new WeakMap<Ground3D, GroundIndex>();
const bkey = (i: number, j: number): number => (j + 32768) * 65536 + (i + 32768);

function groundIndex(g: Ground3D): GroundIndex {
  const sig = `${g.pads.length},${g.mud.length},${g.shade.length},${g.roads.length},${g.roads.reduce((n, r) => n + r.pts.length, 0)}`;
  const have = indexes.get(g);
  if (have && have.sig === sig) return have;
  const ix: GroundIndex = { sig, pads: new Map(), mud: new Map(), shade: new Map(), roads: new Map() };
  const each = (x0: number, z0: number, x1: number, z1: number, fn: (k: number) => void): void => {
    for (let j = Math.floor(z0 / BUCKET); j <= Math.floor(z1 / BUCKET); j++) for (let i = Math.floor(x0 / BUCKET); i <= Math.floor(x1 / BUCKET); i++) fn(bkey(i, j));
  };
  const push = <K, T>(m: Map<K, T[]>, k: K, v: T): void => {
    const l = m.get(k);
    if (l) l.push(v);
    else m.set(k, [v]);
  };
  for (const p of g.pads) {
    const r = Math.hypot(p.hw, p.hd) + 3;
    each(p.x - r, p.z - r, p.x + r, p.z + r, (k) => push(ix.pads, k, p));
  }
  for (const m of g.mud) each(m.x - m.r, m.z - m.r, m.x + m.r, m.z + m.r, (k) => push(ix.mud, k, m));
  for (const s of g.shade) each(s.x - s.r, s.z - s.r, s.x + s.r, s.z + s.r, (k) => push(ix.shade, k, s));
  for (const r of g.roads) {
    const reach = r.width * 0.6;
    for (let i = 0; i + 1 < r.pts.length; i++) {
      const a = r.pts[i], b = r.pts[i + 1];
      each(Math.min(a[0], b[0]) - reach, Math.min(a[1], b[1]) - reach, Math.max(a[0], b[0]) + reach, Math.max(a[1], b[1]) + reach, (k) => {
        let per = ix.roads.get(k);
        if (!per) ix.roads.set(k, (per = new Map()));
        push(per, r, [a, b] as [XZ, XZ]);
      });
    }
  }
  indexes.set(g, ix);
  return ix;
}

const at = (x: number, z: number): number => bkey(Math.floor(x / BUCKET), Math.floor(z / BUCKET));

/** Distance to the nearest of a road's segments that can reach this spot (Infinity if none can). */
function nearRoadDist(segs: readonly [XZ, XZ][], x: number, z: number): number {
  let d = Infinity;
  for (const [a, b] of segs) d = Math.min(d, segDist(x, z, a, b));
  return d;
}

export function groundHeight(g: Ground3D, x: number, z: number): number {
  let h = BASE_Y + (fbm(x / 14, z / 14, g.seed) - 0.5) * 1.1 + (fbm(x / 4, z / 4, g.seed + 1) - 0.5) * 0.12;
  const ix = groundIndex(g), k = at(x, z);
  // Buildings stand on levelled ground; roads are worn a little flatter.
  for (const p of ix.pads.get(k) ?? []) h += (BASE_Y - h) * (1 - smooth(0, 2.5, padDist(p, x, z)));
  for (const [r, segs] of ix.roads.get(k) ?? []) {
    const d = nearRoadDist(segs, x, z);
    h -= 0.06 * (1 - smooth(r.width * 0.3, r.width * 0.6, d));
  }
  // The lake bed falls away from the shore.
  const ld = lakeDist(g, x, z);
  if (ld < 2) {
    const shoreH = Math.min(h, WATER_Y + 0.12 + Math.max(0, ld) * 0.12);
    h = ld > 0 ? h + (shoreH - h) * (1 - smooth(0, 2, ld)) : WATER_Y + 0.12 - smooth(0, 4, -ld) * 1.4;
  }
  return h;
}

export interface Splat {
  road: number;
  mud: number;
  shore: number;
  shade: number;
  /** Long grass and flowers away from feet. */
  wild: number;
}

/** How much of each ground type is at (x, z), 0..1 each; grass is what is left. */
export function splatAt(g: Ground3D, x: number, z: number): Splat {
  let road = 0, mud = 0, shade = 0;
  const ix = groundIndex(g), k = at(x, z);
  for (const [r, segs] of ix.roads.get(k) ?? []) road = Math.max(road, 1 - smooth(r.width * 0.35, r.width * 0.6, nearRoadDist(segs, x, z)));
  for (const m of ix.mud.get(k) ?? []) mud = Math.max(mud, 1 - smooth(m.r * 0.55, m.r, Math.hypot(x - m.x, z - m.z)));
  for (const s of ix.shade.get(k) ?? []) shade = Math.max(shade, 1 - smooth(s.r * 0.5, s.r, Math.hypot(x - s.x, z - s.z)));
  if (g.extraShade) shade = Math.max(shade, g.extraShade(x, z));
  const ld = lakeDist(g, x, z);
  const shore = 1 - smooth(0.2, 1.6, ld);
  // Wild grass grows where nobody walks: far from roads, pads and mud.
  let busy = Math.max(road, mud);
  for (const p of ix.pads.get(k) ?? []) busy = Math.max(busy, 1 - smooth(0.5, 3, padDist(p, x, z)));
  const wild = clamp01((fbm(x / 6, z / 6, g.seed + 9) - 0.42) * 3) * (1 - busy) * (1 - shore);
  return { road, mud, shore, shade, wild };
}

export interface Terrain {
  /** Vertices per side. */
  n: number;
  step: number;
  /** Row-major heights, n × n, from (-size/2, -size/2). */
  heights: number[];
  mesh: MeshData;
}

/** A grid mesh over the patch, `step` metres between vertices, with AO from local concavity. */
export function buildTerrain(g: Ground3D, step = 0.5): Terrain {
  const n = Math.round(g.size / step) + 1;
  const half = g.size / 2;
  const heights: number[] = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) heights.push(groundHeight(g, -half + i * step, -half + j * step));
  const H = (i: number, j: number): number => heights[Math.max(0, Math.min(n - 1, j)) * n + Math.max(0, Math.min(n - 1, i))];
  const mesh = emptyMesh();
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = -half + i * step, z = -half + j * step, y = H(i, j);
      const nx = H(i - 1, j) - H(i + 1, j), nz = H(i, j - 1) - H(i, j + 1);
      const ny = 2 * step;
      const l = Math.hypot(nx, ny, nz);
      mesh.positions.push(x, y, z);
      mesh.normals.push(nx / l, ny / l, nz / l);
      mesh.uvs.push(x, z);
      const hollow = (H(i - 1, j) + H(i + 1, j) + H(i, j - 1) + H(i, j + 1)) / 4 - y;
      mesh.ao.push(clamp01(1 - Math.max(0, hollow) * 3));
    }
  }
  for (let j = 0; j + 1 < n; j++) {
    for (let i = 0; i + 1 < n; i++) {
      const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
      // Counter-clockwise seen from above (+y): a, c, b and b, c, d.
      mesh.indices.push(a, c, b, b, c, d);
    }
  }
  return { n, step, heights, mesh };
}

/** Height at any point, bilinear over the terrain grid (what feet stand on). */
export function heightAt(t: Terrain, size: number, x: number, z: number): number {
  const fx = (x + size / 2) / t.step, fz = (z + size / 2) / t.step;
  const i = Math.max(0, Math.min(t.n - 2, Math.floor(fx))), j = Math.max(0, Math.min(t.n - 2, Math.floor(fz)));
  const u = Math.max(0, Math.min(1, fx - i)), v = Math.max(0, Math.min(1, fz - j));
  const h = (a: number, b: number): number => t.heights[b * t.n + a];
  return (h(i, j) * (1 - u) + h(i + 1, j) * u) * (1 - v) + (h(i, j + 1) * (1 - u) + h(i + 1, j + 1) * u) * v;
}

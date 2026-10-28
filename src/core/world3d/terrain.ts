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

export function groundHeight(g: Ground3D, x: number, z: number): number {
  let h = BASE_Y + (fbm(x / 14, z / 14, g.seed) - 0.5) * 1.1 + (fbm(x / 4, z / 4, g.seed + 1) - 0.5) * 0.12;
  // Buildings stand on levelled ground; roads are worn a little flatter.
  for (const p of g.pads) h += (BASE_Y - h) * (1 - smooth(0, 2.5, padDist(p, x, z)));
  for (const r of g.roads) {
    const d = roadDist(r, x, z);
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
  for (const r of g.roads) road = Math.max(road, 1 - smooth(r.width * 0.35, r.width * 0.6, roadDist(r, x, z)));
  for (const m of g.mud) mud = Math.max(mud, 1 - smooth(m.r * 0.55, m.r, Math.hypot(x - m.x, z - m.z)));
  for (const s of g.shade) shade = Math.max(shade, 1 - smooth(s.r * 0.5, s.r, Math.hypot(x - s.x, z - s.z)));
  const ld = lakeDist(g, x, z);
  const shore = 1 - smooth(0.2, 1.6, ld);
  // Wild grass grows where nobody walks: far from roads, pads and mud.
  let busy = Math.max(road, mud);
  for (const p of g.pads) busy = Math.max(busy, 1 - smooth(0.5, 3, padDist(p, x, z)));
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

import { type Ground3D, groundHeight, hollowAt } from './terrain';
import { type MeshData, emptyMesh } from './mesh';

/**
 * The ground in chunks of 32 m, streamed by view radius. Each chunk samples
 * the world's height function directly (with a one-vertex apron for normals
 * and AO), so neighbouring chunks agree exactly on their shared edge and no
 * seams show. Pure and seeded; the renderer turns a chunk into a mesh.
 */

export const CHUNK = 32;

export interface ChunkId {
  i: number;
  j: number;
}

export const chunkKey = (i: number, j: number): string => `${i},${j}`;

export const chunkOf = (x: number, z: number): ChunkId => ({ i: Math.floor(x / CHUNK), j: Math.floor(z / CHUNK) });

/** Chunk index range (inclusive) that overlaps the world patch. */
export function chunkRange(g: Ground3D): { i0: number; i1: number; j0: number; j1: number } {
  const lo = Math.floor(-g.size / 2 / CHUNK), hi = Math.ceil(g.size / 2 / CHUNK) - 1;
  return { i0: lo, i1: hi, j0: lo, j1: hi };
}

/**
 * Chunks within `radius` metres of (x, z) (a chunk counts when any part of it
 * is that close), nearest first, clipped to the world.
 */
export function chunksNear(g: Ground3D, x: number, z: number, radius: number): ChunkId[] {
  const r = chunkRange(g);
  const out: { id: ChunkId; d: number }[] = [];
  // Only the window round the point: a map of kilometres has tens of thousands of chunks and this runs every frame.
  const j0 = Math.max(r.j0, Math.floor((z - radius) / CHUNK)), j1 = Math.min(r.j1, Math.floor((z + radius) / CHUNK));
  const i0 = Math.max(r.i0, Math.floor((x - radius) / CHUNK)), i1 = Math.min(r.i1, Math.floor((x + radius) / CHUNK));
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      const dx = Math.max(i * CHUNK - x, 0, x - (i + 1) * CHUNK), dz = Math.max(j * CHUNK - z, 0, z - (j + 1) * CHUNK);
      const d = Math.hypot(dx, dz);
      if (d <= radius) out.push({ id: { i, j }, d });
    }
  }
  return out.sort((a, b) => a.d - b.d).map((o) => o.id);
}

export interface ChunkTerrain extends ChunkId {
  /** World position of the chunk's low corner. */
  x0: number;
  z0: number;
  step: number;
  /** Vertices per side. */
  n: number;
  /** Row-major heights, n × n. */
  heights: number[];
  mesh: MeshData;
}

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/** The terrain mesh of one chunk, `step` metres between vertices. */
export function buildChunk(g: Ground3D, i: number, j: number, step = 0.5): ChunkTerrain {
  const cells = Math.round(CHUNK / step), n = cells + 1;
  const x0 = i * CHUNK, z0 = j * CHUNK;
  // Heights with a one-vertex apron, so edge normals use the neighbour's real ground.
  const m = n + 2;
  const apron: number[] = new Array(m * m);
  for (let b = 0; b < m; b++) for (let a = 0; a < m; a++) apron[b * m + a] = groundHeight(g, x0 + (a - 1) * step, z0 + (b - 1) * step);
  const H = (a: number, b: number): number => apron[(b + 1) * m + (a + 1)];
  const heights: number[] = [];
  const mesh = emptyMesh();
  mesh.hollow = [];
  for (let b = 0; b < n; b++) {
    for (let a = 0; a < n; a++) {
      const x = x0 + a * step, z = z0 + b * step, y = H(a, b);
      heights.push(y);
      const nx = H(a - 1, b) - H(a + 1, b), nz = H(a, b - 1) - H(a, b + 1), ny = 2 * step;
      const l = Math.hypot(nx, ny, nz);
      mesh.positions.push(x, y, z);
      mesh.normals.push(nx / l, ny / l, nz / l);
      mesh.uvs.push(x, z);
      const hollow = (H(a - 1, b) + H(a + 1, b) + H(a, b - 1) + H(a, b + 1)) / 4 - y;
      mesh.ao.push(clamp01(1 - Math.max(0, hollow) * 3));
      mesh.hollow.push(hollowAt(g, x, z));
    }
  }
  for (let b = 0; b < cells; b++) {
    for (let a = 0; a < cells; a++) {
      const p = b * n + a, q = p + 1, r = p + n, s = r + 1;
      mesh.indices.push(p, r, q, q, r, s);
    }
  }
  return { i, j, x0, z0, step, n, heights, mesh };
}

/** Height inside a chunk, bilinear over its grid (clamped to the chunk). */
export function chunkHeightAt(c: ChunkTerrain, x: number, z: number): number {
  const fx = (x - c.x0) / c.step, fz = (z - c.z0) / c.step;
  const a = Math.max(0, Math.min(c.n - 2, Math.floor(fx))), b = Math.max(0, Math.min(c.n - 2, Math.floor(fz)));
  const u = clamp01(fx - a), v = clamp01(fz - b);
  const h = (p: number, q: number): number => c.heights[q * c.n + p];
  return (h(a, b) * (1 - u) + h(a + 1, b) * u) * (1 - v) + (h(a, b + 1) * (1 - u) + h(a + 1, b + 1) * u) * v;
}

/**
 * The chunks that are resident, with a height lookup for anything standing on
 * the ground. Outside the loaded chunks it falls back to the exact function.
 */
export class TerrainStore {
  readonly chunks = new Map<string, ChunkTerrain>();

  constructor(readonly ground: Ground3D, readonly step = 0.5) {}

  has(i: number, j: number): boolean {
    return this.chunks.has(chunkKey(i, j));
  }

  ensure(i: number, j: number): ChunkTerrain {
    const k = chunkKey(i, j);
    let c = this.chunks.get(k);
    if (!c) {
      c = buildChunk(this.ground, i, j, this.step);
      this.chunks.set(k, c);
    }
    return c;
  }

  drop(i: number, j: number): void {
    this.chunks.delete(chunkKey(i, j));
  }

  heightAt(x: number, z: number): number {
    const { i, j } = chunkOf(x, z);
    const c = this.chunks.get(chunkKey(i, j));
    return c ? chunkHeightAt(c, x, z) : groundHeight(this.ground, x, z);
  }
}

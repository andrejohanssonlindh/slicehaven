/**
 * Plain mesh data for the 3D world. Generators in core/ build these (pure,
 * seeded, JSON-friendly); the renderer turns them into GPU buffers.
 *
 * Units are metres. UVs are in metres too, so every texture keeps the same
 * texel density (the renderer scales them by texels-per-metre).
 */
export type Vec3 = [number, number, number];

export interface MeshData {
  positions: number[];
  normals: number[];
  uvs: number[];
  /** Baked ambient occlusion per vertex, 1 = open, lower = tucked away. */
  ao: number[];
  indices: number[];
  /** Ground only: how much of a hollow each vertex is in, 0..1 (where rain stands). */
  hollow?: number[];
}

export const emptyMesh = (): MeshData => ({ positions: [], normals: [], uvs: [], ao: [], indices: [] });

export const vertexCount = (m: MeshData): number => m.positions.length / 3;

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const add3 = (a: Vec3, b: Vec3, s = 1): Vec3 => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * A flat polygon (3 or 4 corners, counter-clockwise seen from the front).
 * UVs default to the plane's own axes, in metres: u along the first edge, v up.
 */
export function addFace(m: MeshData, pts: Vec3[], ao: number[] = pts.map(() => 1), uvs?: [number, number][]): void {
  const n = norm(cross(sub(pts[1], pts[0]), sub(pts[2], pts[0])));
  const base = vertexCount(m);
  let uv = uvs;
  if (!uv) {
    // u: horizontal-ish axis in the plane; v: the other axis (up for walls).
    const up: Vec3 = Math.abs(n[1]) > 0.9 ? [0, 0, -1] : [0, 1, 0];
    const ua = norm(cross(up, n));
    const va = cross(n, ua);
    uv = pts.map((p) => [dot(p, ua), dot(p, va)]);
  }
  pts.forEach((p, i) => {
    m.positions.push(p[0], p[1], p[2]);
    m.normals.push(n[0], n[1], n[2]);
    m.uvs.push(uv![i][0], uv![i][1]);
    m.ao.push(ao[i]);
  });
  m.indices.push(base, base + 1, base + 2);
  if (pts.length === 4) m.indices.push(base, base + 2, base + 3);
}

export interface BoxOpts {
  /** AO at the bottom and top edges of the side faces (wall feet, under eaves). */
  aoBottom?: number;
  aoTop?: number;
  /** Leave out faces: +x -x +y -y +z -z. */
  skip?: ('px' | 'nx' | 'py' | 'ny' | 'pz' | 'nz')[];
  /** Each face gets the whole texture (0..1), for doors, windows and shutters. */
  unitUV?: boolean;
}

const UNIT: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]];

/**
 * An oriented box. `c` is the centre, `ax/ay/az` unit axes, `h` half sizes.
 * Side faces (along ay) get their AO from aoBottom/aoTop.
 */
export function addOrientedBox(m: MeshData, c: Vec3, ax: Vec3, ay: Vec3, az: Vec3, h: Vec3, o: BoxOpts = {}): void {
  const P = (sx: number, sy: number, sz: number): Vec3 => add3(add3(add3(c, ax, sx * h[0]), ay, sy * h[1]), az, sz * h[2]);
  const lo = o.aoBottom ?? 1, hi = o.aoTop ?? 1;
  const skip = new Set(o.skip ?? []);
  const uv = o.unitUV ? UNIT : undefined;
  // Sides: corners listed bottom-left, bottom-right, top-right, top-left, seen from outside.
  if (!skip.has('pz')) addFace(m, [P(-1, -1, 1), P(1, -1, 1), P(1, 1, 1), P(-1, 1, 1)], [lo, lo, hi, hi], uv);
  if (!skip.has('nz')) addFace(m, [P(1, -1, -1), P(-1, -1, -1), P(-1, 1, -1), P(1, 1, -1)], [lo, lo, hi, hi], uv);
  if (!skip.has('px')) addFace(m, [P(1, -1, 1), P(1, -1, -1), P(1, 1, -1), P(1, 1, 1)], [lo, lo, hi, hi], uv);
  if (!skip.has('nx')) addFace(m, [P(-1, -1, -1), P(-1, -1, 1), P(-1, 1, 1), P(-1, 1, -1)], [lo, lo, hi, hi], uv);
  if (!skip.has('py')) addFace(m, [P(-1, 1, 1), P(1, 1, 1), P(1, 1, -1), P(-1, 1, -1)], [hi, hi, hi, hi], uv);
  if (!skip.has('ny')) addFace(m, [P(-1, -1, -1), P(1, -1, -1), P(1, -1, 1), P(-1, -1, 1)], [lo, lo, lo, lo], uv);
}

const X: Vec3 = [1, 0, 0], Y: Vec3 = [0, 1, 0], Z: Vec3 = [0, 0, 1];

/** Axis-aligned box from its min and max corners. */
export function addBox(m: MeshData, min: Vec3, max: Vec3, o: BoxOpts = {}): void {
  const c: Vec3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  addOrientedBox(m, c, X, Y, Z, [(max[0] - min[0]) / 2, (max[1] - min[1]) / 2, (max[2] - min[2]) / 2], o);
}

/** A beam from a to b, with a square section `w` thick; its flat side faces `face`. */
export function addBeam(m: MeshData, a: Vec3, b: Vec3, w: number, face: Vec3, o: BoxOpts = {}): void {
  const d = sub(b, a);
  const len = Math.hypot(d[0], d[1], d[2]);
  const ay = norm(d);
  const az = norm(add3(face, ay, -dot(face, ay)));
  const ax = cross(ay, az);
  addOrientedBox(m, add3(a, d, 0.5), ax, ay, az, [w / 2, len / 2, w / 2], o);
}

export function merge(into: MeshData, from: MeshData): void {
  const base = vertexCount(into);
  into.positions.push(...from.positions);
  into.normals.push(...from.normals);
  into.uvs.push(...from.uvs);
  into.ao.push(...from.ao);
  for (const i of from.indices) into.indices.push(i + base);
}

export function bounds(m: MeshData): { min: Vec3; max: Vec3 } {
  const min: Vec3 = [Infinity, Infinity, Infinity], max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < m.positions.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], m.positions[i + k]);
      max[k] = Math.max(max[k], m.positions[i + k]);
    }
  }
  return { min, max };
}

import type { P2, Shape } from './space';

/**
 * What a person can see. Sight is a cone in front (how wide and how far come from the person's Alertness and the
 * light), a small circle all round (what is close is noticed even behind you), and it stops at solid things: the
 * rays are cast from the eye over the ground and each ends where it leaves the first thing in the way. The renderer
 * draws the result; the rules can ask `sees(...)`. Pure, in metres.
 *
 * Angles are `atan2(dz, dx)`: 0 looks along +x, a quarter turn is +z.
 */

export interface VisionSpec {
  /** Farthest the eye reaches in the open, metres. */
  range: number;
  /** Full width of the cone, radians. */
  fov: number;
  /** Everything within this is noticed, whichever way you face, metres. */
  near: number;
  /** Softness of the cone's edge, radians. */
  edge: number;
}

export interface VisionInput {
  /** The Alertness attribute (an average adult has about 10). */
  alertness: number;
  /** 0 by day .. 1 in full night: the dark shortens sight. */
  night?: number;
  /** Farthest the renderer is willing to draw, metres. */
  cap?: number;
}

const deg = (d: number): number => (d * Math.PI) / 180;

/** Alertness (and the light) to the shape of sight. */
export function visionOf({ alertness, night = 0, cap = Infinity }: VisionInput): VisionSpec {
  const a = Math.max(0, alertness);
  const dark = 1 - 0.4 * Math.max(0, Math.min(1, night));
  return {
    range: Math.min(cap, Math.max(10, 6 + 2.4 * a) * dark),
    fov: deg(Math.max(70, Math.min(150, 110 + 4 * (a - 10)))),
    near: Math.max(2.5, Math.min(7, 2 + 0.25 * a)),
    edge: deg(18),
  };
}

/** How many rays are cast round the eye. */
export const RAYS = 256;

/** Where the ray from (ox, oz) along (dx, dz) enters and leaves a shape; null if it misses or starts inside. */
export function rayThrough(s: Shape, ox: number, oz: number, dx: number, dz: number): [number, number] | null {
  if (s.kind === 'circle') {
    const px = ox - s.x, pz = oz - s.z;
    const b = px * dx + pz * dz, c = px * px + pz * pz - s.r * s.r;
    if (c <= 0) return null; // the eye is inside it
    const disc = b * b - c;
    if (disc < 0) return null;
    const r = Math.sqrt(disc);
    const t0 = -b - r;
    return t0 >= 0 ? [t0, -b + r] : null;
  }
  // A box: into its own frame (the inverse of the turn `shapeDist` uses), then slabs.
  const c = Math.cos(s.rot), sn = Math.sin(s.rot);
  const px = ox - s.x, pz = oz - s.z;
  const lox = px * c - pz * sn, loz = px * sn + pz * c;
  const ldx = dx * c - dz * sn, ldz = dx * sn + dz * c;
  let t0 = 0, t1 = Infinity;
  for (const [o, d, h] of [[lox, ldx, s.hw], [loz, ldz, s.hd]] as const) {
    if (Math.abs(d) < 1e-9) {
      if (Math.abs(o) > h) return null;
      continue;
    }
    let a = (-h - o) / d, b = (h - o) / d;
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, b);
    if (t0 > t1) return null;
  }
  if (Math.abs(lox) <= s.hw && Math.abs(loz) <= s.hd) return null; // the eye is inside it
  return t0 > 0 ? [t0, t1] : null;
}

/**
 * How far the eye sees along each of `RAYS` directions round it (ray i points at angle i / RAYS · 2π). A ray stops
 * where it leaves the first solid thing it meets, so a wall is seen and what is behind it is not, and a house seen
 * from outside shows its whole roof. `blockers` are the solid things near enough to matter.
 */
export function castSight(eye: P2, range: number, blockers: readonly Shape[], out = new Float32Array(RAYS)): Float32Array {
  // Keep only what can reach the eye's circle.
  const near = blockers.filter((s) => {
    const reach = s.kind === 'circle' ? s.r : Math.hypot(s.hw, s.hd);
    return Math.hypot(s.x - eye.x, s.z - eye.z) - reach < range;
  });
  const hits: [number, number][] = [];
  for (let i = 0; i < RAYS; i++) {
    const a = (i / RAYS) * Math.PI * 2, dx = Math.cos(a), dz = Math.sin(a);
    hits.length = 0;
    for (const s of near) {
      const h = rayThrough(s, eye.x, eye.z, dx, dz);
      if (h && h[0] < range) hits.push(h);
    }
    let end = range;
    if (hits.length) {
      hits.sort((p, q) => p[0] - q[0]);
      // The first thing, and anything that touches it, is one wall of sight.
      let stop = hits[0][1];
      for (const h of hits) if (h[0] <= stop + 0.05) stop = Math.max(stop, h[1]);
      end = Math.min(range, stop);
    }
    out[i] = end;
  }
  return out;
}

/** The distance sight reaches toward `angle`, interpolated between the two nearest rays. */
export function sightAlong(rays: Float32Array, angle: number): number {
  const n = rays.length;
  const f = ((((angle / (Math.PI * 2)) * n) % n) + n) % n;
  const i = Math.floor(f), k = f - i;
  return rays[i] * (1 - k) + rays[(i + 1) % n] * k;
}

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a || 1)));
  return t * t * (3 - 2 * t);
};

/** Shortest turn between two angles, 0..π. */
export const angleGap = (a: number, b: number): number => Math.abs(((((a - b) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI);

/**
 * How clearly (x, z) is seen from the eye, 0 not at all .. 1 fully: in the cone or close by, within range, and not
 * behind something. (The renderer's shader computes the same.)
 */
export function seenAt(eye: P2, facing: number, spec: VisionSpec, rays: Float32Array, x: number, z: number): number {
  const dx = x - eye.x, dz = z - eye.z, d = Math.hypot(dx, dz);
  if (d < 1e-6) return 1;
  const ang = Math.atan2(dz, dx);
  if (d > sightAlong(rays, ang) + 0.2) return 0;
  const cone = 1 - smooth(spec.fov / 2 - spec.edge, spec.fov / 2, angleGap(ang, facing));
  const close = 1 - smooth(spec.near * 0.8, spec.near, d);
  const far = 1 - smooth(spec.range * 0.7, spec.range, d);
  return Math.max(cone, close) * far;
}

/** A clear sight line from the eye to a point: nothing solid between them (for "can she see him"). */
export function lineOfSight(eye: P2, to: P2, blockers: readonly Shape[]): boolean {
  const dx = to.x - eye.x, dz = to.z - eye.z, d = Math.hypot(dx, dz);
  if (d < 1e-6) return true;
  for (const s of blockers) {
    const h = rayThrough(s, eye.x, eye.z, dx / d, dz / d);
    if (h && h[0] < d - 0.05) return false;
  }
  return true;
}

/** Turn toward a target angle by the short way, at most `step` radians. */
export function turnToward(from: number, to: number, step: number): number {
  const gap = ((to - from + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return from + Math.max(-step, Math.min(step, gap));
}

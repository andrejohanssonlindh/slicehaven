/**
 * How a body stands and moves: a pose is a turn for each joint (radians about x, y and z, in the joint's own space)
 * and a lift of the whole body. Movements are a few poses in a loop (`Cycle`, data in `content/people/poses.ts`), eased
 * between. Pure and deterministic: the renderer only shows the pose it is given.
 *
 * Signs, for a body facing +z with y up: a negative turn about x swings a limb forward, a positive one back; a knee
 * bends with a positive turn, an elbow with a negative one.
 */

export const JOINTS = ['root', 'spine', 'neck', 'shoulderL', 'elbowL', 'shoulderR', 'elbowR', 'hipL', 'kneeL', 'hipR', 'kneeR'] as const;
export type Joint = (typeof JOINTS)[number];

export type Turn = readonly [x: number, y: number, z: number];

export interface Pose {
  joints: Partial<Record<Joint, Turn>>;
  /** Lift of the whole body, as a share of its height (a walk bobs). */
  lift?: number;
}

/** A movement: poses spaced evenly over one loop. */
export interface Cycle {
  keys: readonly Pose[];
}

const ZERO: Turn = [0, 0, 0];

/** The pose between `a` and `b`, `t` of the way (0..1). */
export function blendPose(a: Pose, b: Pose, t: number): Pose {
  const joints: Partial<Record<Joint, Turn>> = {};
  for (const j of JOINTS) {
    const p = a.joints[j], q = b.joints[j];
    if (!p && !q) continue;
    const x = p ?? ZERO, y = q ?? ZERO;
    joints[j] = [x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t];
  }
  return { joints, lift: (a.lift ?? 0) + ((b.lift ?? 0) - (a.lift ?? 0)) * t };
}

/** A smooth curve through b (t = 0) to c (t = 1), shaped by the keys either side (Catmull-Rom). */
const curve = (a: number, b: number, c: number, d: number, t: number): number =>
  0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);

/**
 * Where a loop is at `phase` (any number; whole numbers are the first key). The motion flows through the keys without
 * stopping at them (easing in and out of every key made a walk pause where the legs pass).
 */
export function cyclePose(c: Cycle, phase: number): Pose {
  const n = c.keys.length;
  const f = (((phase % 1) + 1) % 1) * n;
  const i = Math.floor(f) % n;
  const t = f - Math.floor(f);
  const [a, b, cc, d] = [c.keys[(i + n - 1) % n], c.keys[i], c.keys[(i + 1) % n], c.keys[(i + 2) % n]];
  const joints: Partial<Record<Joint, Turn>> = {};
  for (const j of JOINTS) {
    if (!a.joints[j] && !b.joints[j] && !cc.joints[j] && !d.joints[j]) continue;
    const k = (p: Pose, x: number): number => p.joints[j]?.[x] ?? 0;
    joints[j] = [0, 1, 2].map((x) => curve(k(a, x), k(b, x), k(cc, x), k(d, x), t)) as unknown as Turn;
  }
  return { joints, lift: curve(a.lift ?? 0, b.lift ?? 0, cc.lift ?? 0, d.lift ?? 0, t) };
}

/** The same pose with left and right swapped (a walk's second step is the first one mirrored). */
export function mirrorPose(p: Pose): Pose {
  const swap: Partial<Record<Joint, Joint>> = { shoulderL: 'shoulderR', shoulderR: 'shoulderL', elbowL: 'elbowR', elbowR: 'elbowL', hipL: 'hipR', hipR: 'hipL', kneeL: 'kneeR', kneeR: 'kneeL' };
  const joints: Partial<Record<Joint, Turn>> = {};
  for (const [j, v] of Object.entries(p.joints) as [Joint, Turn][]) {
    // Turns about y and z flip sides; about x (swinging forward and back) they stay.
    joints[swap[j] ?? j] = [v[0], -v[1], -v[2]];
  }
  return { joints, lift: p.lift };
}

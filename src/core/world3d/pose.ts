/**
 * How a body stands and moves: a pose is a turn for each joint (radians about x, y and z, in the joint's own space),
 * a lift of the whole body and a shift of its hips. Movements are a few poses in a loop (`Cycle`, data in
 * `content/people/poses.ts`), eased between. Pure and deterministic: the renderer only shows the pose it is given.
 * What plays when, and the small movements laid over it (breathing, shifting weight, looking), is `animate.ts`.
 *
 * The skeleton: hips (`root`) → `spine` (the waist) → `chest` → `neck` → `head`; an arm is shoulder → elbow → wrist
 * (the hand), a leg is hip → knee → ankle (the foot). A turn on a joint carries everything further out with it.
 *
 * Signs, for a body facing +z with y up and its left at +x: a negative turn about x swings a limb forward, a positive
 * one back (a foot's toes go down, a head nods); a knee bends with a positive turn, an elbow with a negative one. A
 * positive turn about y brings the right side forward; a positive turn about z swings a hanging limb out to the left.
 */

export const JOINTS = [
  'root', 'spine', 'chest', 'neck', 'head',
  'shoulderL', 'elbowL', 'wristL', 'shoulderR', 'elbowR', 'wristR',
  'hipL', 'kneeL', 'ankleL', 'hipR', 'kneeR', 'ankleR',
] as const;
export type Joint = (typeof JOINTS)[number];

export type Turn = readonly [x: number, y: number, z: number];
export type Turns = Partial<Record<Joint, Turn>>;

export interface Pose {
  joints: Turns;
  /** Lift of the whole body, as a share of its height (a walk bobs). */
  lift?: number;
  /** The hips moved to the body's left (x) and forward (z), as shares of its height (weight over one foot). */
  shift?: readonly [x: number, z: number];
}

/** A movement: poses spaced evenly over one loop. */
export interface Cycle {
  keys: readonly Pose[];
}

const ZERO: Turn = [0, 0, 0];
const NO_SHIFT: readonly [number, number] = [0, 0];

/** The pose between `a` and `b`, `t` of the way (0..1). A joint one of them leaves out is at rest there. */
export function blendPose(a: Pose, b: Pose, t: number): Pose {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const joints: Turns = {};
  for (const j of JOINTS) {
    const p = a.joints[j], q = b.joints[j];
    if (!p && !q) continue;
    const x = p ?? ZERO, y = q ?? ZERO;
    joints[j] = [x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t];
  }
  const sa = a.shift ?? NO_SHIFT, sb = b.shift ?? NO_SHIFT;
  return {
    joints,
    lift: (a.lift ?? 0) + ((b.lift ?? 0) - (a.lift ?? 0)) * t,
    shift: [sa[0] + (sb[0] - sa[0]) * t, sa[1] + (sb[1] - sa[1]) * t],
  };
}

/** A pose with `k` times `more` added to it (small movements laid over a pose: a breath, a lean). */
export function addPose(base: Pose, more: Pose, k = 1): Pose {
  if (k === 0) return base;
  const joints: Turns = { ...base.joints };
  for (const [j, v] of Object.entries(more.joints) as [Joint, Turn][]) {
    const b = joints[j] ?? ZERO;
    joints[j] = [b[0] + v[0] * k, b[1] + v[1] * k, b[2] + v[2] * k];
  }
  const sa = base.shift ?? NO_SHIFT, sb = more.shift ?? NO_SHIFT;
  return { joints, lift: (base.lift ?? 0) + (more.lift ?? 0) * k, shift: [sa[0] + sb[0] * k, sa[1] + sb[1] * k] };
}

/** A pose made `k` times as large (0 is standing at rest): a slow walk takes smaller steps. */
export const scalePose = (p: Pose, k: number): Pose => addPose({ joints: {} }, p, k);

/** A smooth curve through b (t = 0) to c (t = 1), shaped by the keys either side (Catmull-Rom). */
const curve = (a: number, b: number, c: number, d: number, t: number): number =>
  0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);

/**
 * Where a loop is at `phase` (any number; whole numbers are the first key). The motion flows through the keys without
 * stopping at them (easing in and out of every key made a walk pause where the legs pass).
 */
export function cyclePose(c: Cycle, phase: number): Pose {
  const n = c.keys.length;
  if (n === 1) return c.keys[0];
  const f = (((phase % 1) + 1) % 1) * n;
  const i = Math.floor(f) % n;
  const t = f - Math.floor(f);
  const [a, b, cc, d] = [c.keys[(i + n - 1) % n], c.keys[i], c.keys[(i + 1) % n], c.keys[(i + 2) % n]];
  const joints: Turns = {};
  for (const j of JOINTS) {
    if (!a.joints[j] && !b.joints[j] && !cc.joints[j] && !d.joints[j]) continue;
    const k = (p: Pose, x: number): number => p.joints[j]?.[x] ?? 0;
    joints[j] = [0, 1, 2].map((x) => curve(k(a, x), k(b, x), k(cc, x), k(d, x), t)) as unknown as Turn;
  }
  const s = (p: Pose, x: number): number => p.shift?.[x] ?? 0;
  return {
    joints,
    lift: curve(a.lift ?? 0, b.lift ?? 0, cc.lift ?? 0, d.lift ?? 0, t),
    shift: [curve(s(a, 0), s(b, 0), s(cc, 0), s(d, 0), t), curve(s(a, 1), s(b, 1), s(cc, 1), s(d, 1), t)],
  };
}

const SWAP: Partial<Record<Joint, Joint>> = {
  shoulderL: 'shoulderR', shoulderR: 'shoulderL', elbowL: 'elbowR', elbowR: 'elbowL', wristL: 'wristR', wristR: 'wristL',
  hipL: 'hipR', hipR: 'hipL', kneeL: 'kneeR', kneeR: 'kneeL', ankleL: 'ankleR', ankleR: 'ankleL',
};

/** The same pose with left and right swapped (a walk's second step is the first one mirrored). */
export function mirrorPose(p: Pose): Pose {
  const joints: Turns = {};
  for (const [j, v] of Object.entries(p.joints) as [Joint, Turn][]) {
    // Turns about y and z flip sides; about x (swinging forward and back) they stay.
    joints[SWAP[j] ?? j] = [v[0], -v[1], -v[2]];
  }
  return { joints, lift: p.lift, ...(p.shift ? { shift: [-p.shift[0], p.shift[1]] as const } : {}) };
}

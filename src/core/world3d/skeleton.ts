import type { Vec3 } from './mesh';
import { JOINTS, type Joint, type Pose, type Turn, type Turns } from './pose';

/**
 * Where a posed body's joints are, and turning a limb so its end reaches a point (the director, 2026-11-17: a second
 * hand on a spear's shaft, feet that stay on the ground). Pure arithmetic on a pose: the animator (`animate.ts`) uses
 * it; the engine never needs to. Body space: metres, feet on y = 0, facing +z, the body's left at +x.
 *
 * A joint's turn is three angles applied as the engine applies them (about x, then y, then z, each in the frame the
 * last one left: the rotation Rx·Ry·Rz).
 */

/** A body's joints at rest: each one's parent and where it sits in the parent's space (`BodyModel.joints`). */
export type Skeleton = Record<Joint, { parent: Joint | null; at: Vec3 }>;

/** A rotation: three rows of three. */
export type Mat3 = readonly [number, number, number, number, number, number, number, number, number];

export const IDENTITY: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

export const mul = (a: Mat3, b: Mat3): Mat3 => [
  a[0] * b[0] + a[1] * b[3] + a[2] * b[6], a[0] * b[1] + a[1] * b[4] + a[2] * b[7], a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
  a[3] * b[0] + a[4] * b[3] + a[5] * b[6], a[3] * b[1] + a[4] * b[4] + a[5] * b[7], a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
  a[6] * b[0] + a[7] * b[3] + a[8] * b[6], a[6] * b[1] + a[7] * b[4] + a[8] * b[7], a[6] * b[2] + a[7] * b[5] + a[8] * b[8],
];
export const transpose = (m: Mat3): Mat3 => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
export const apply = (m: Mat3, v: Vec3): Vec3 => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
const unit = (a: Vec3, or: Vec3): Vec3 => {
  const l = len(a);
  return l > 1e-6 ? scale(a, 1 / l) : or;
};
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/** The rotation a turn makes (Rx·Ry·Rz). */
export function turnMat(t: Turn): Mat3 {
  const a = Math.cos(t[0]), b = Math.sin(t[0]), c = Math.cos(t[1]), d = Math.sin(t[1]), e = Math.cos(t[2]), f = Math.sin(t[2]);
  return [
    c * e, -c * f, d,
    a * f + b * e * d, a * e - b * f * d, -b * c,
    b * f - a * e * d, b * e + a * f * d, a * c,
  ];
}

/** The turn that makes a rotation (the other way round from `turnMat`). */
export function matTurn(m: Mat3): Turn {
  const y = Math.asin(clamp(m[2], -1, 1));
  if (Math.abs(m[2]) < 0.9999999) return [Math.atan2(-m[5], m[8]), y, Math.atan2(-m[1], m[0])];
  return [Math.atan2(m[7], m[4]), y, 0];
}

/** A turn about the body's up axis. */
export const yawMat = (yaw: number): Mat3 => turnMat([0, yaw, 0]);

/** Where every joint of a posed body is, and how it is turned, in body space. */
export interface Frames {
  pos: Record<Joint, Vec3>;
  rot: Record<Joint, Mat3>;
}

const ZERO: Turn = [0, 0, 0];

/** A posed body's joints in body space (`height` scales the pose's lift and shift). */
export function frames(skel: Skeleton, pose: Pose, height: number): Frames {
  const pos = {} as Record<Joint, Vec3>, rot = {} as Record<Joint, Mat3>;
  // (`JOINTS` lists every parent before its children.)
  for (const j of JOINTS) {
    const { parent, at } = skel[j];
    const local = turnMat(pose.joints[j] ?? ZERO);
    if (!parent) {
      pos[j] = [at[0] + (pose.shift?.[0] ?? 0) * height, at[1] + (pose.lift ?? 0) * height, at[2] + (pose.shift?.[1] ?? 0) * height];
      rot[j] = local;
    } else {
      pos[j] = add(pos[parent], apply(rot[parent], at));
      rot[j] = mul(rot[parent], local);
    }
  }
  return { pos, rot };
}

/** A limb of two bones: where it hangs from, its hinge (elbow, knee) and its end (wrist, ankle). */
export interface Limb {
  a: Joint;
  b: Joint;
  c: Joint;
  /** Which way the hinge bends as a turn about x: a knee +1, an elbow −1. */
  bend: 1 | -1;
}

export const LIMBS = {
  armL: { a: 'shoulderL', b: 'elbowL', c: 'wristL', bend: -1 },
  armR: { a: 'shoulderR', b: 'elbowR', c: 'wristR', bend: -1 },
  legL: { a: 'hipL', b: 'kneeL', c: 'ankleL', bend: 1 },
  legR: { a: 'hipR', b: 'kneeR', c: 'ankleR', bend: 1 },
} as const satisfies Record<string, Limb>;

/**
 * The turns that make a limb's end reach `target` (body space): the two bones and the hinge make a triangle with the
 * line to the target, and `pole` (a direction in body space) says which side the hinge points to (a knee forward, an
 * elbow down and back). `tip` lengthens the lower bone (a hand's hold lies past the wrist). Out of reach, the limb
 * straightens toward the target. `f` is the body's frames with the pose as it stands (the limb's own old turns don't
 * matter). Returns the two turns, and how the lower bone ends up turned (to set a foot flat on it).
 */
export function reach(skel: Skeleton, f: Frames, limb: Limb, target: Vec3, pole: Vec3, tip = 0): { a: Turn; b: Turn; lower: Mat3 } {
  const parent = skel[limb.a].parent;
  const Rp = parent ? f.rot[parent] : IDENTITY;
  const P = f.pos[limb.a];
  const l1 = len(skel[limb.b].at), l2 = len(skel[limb.c].at) + tip;
  const v = sub(target, P);
  const d = clamp(len(v), Math.abs(l1 - l2) + 1e-4, l1 + l2 - 1e-4);
  const dir = unit(v, [0, -1, 0]);
  // The hinge's side: the pole, square to the line to the target.
  const hp = unit(sub(pole, scale(dir, dot(pole, dir))), unit(cross(dir, [1, 0, 0]), [0, 0, 1]));
  const alpha = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const u = add(scale(dir, Math.cos(alpha)), scale(hp, Math.sin(alpha)));
  const low = unit(sub(scale(dir, d), scale(u, l1)), dir);
  const theta = Math.acos(clamp(dot(u, low), -1, 1));
  // The upper bone's frame: its rest direction (−y) along `u`, its z so the hinge's turn about x lands the lower bone.
  const Y = scale(u, -1);
  const Z = scale(unit(sub(low, scale(u, dot(low, u))), scale(hp, -1)), -limb.bend);
  const X = cross(Y, Z);
  const Ru: Mat3 = [X[0], Y[0], Z[0], X[1], Y[1], Z[1], X[2], Y[2], Z[2]];
  const b: Turn = [limb.bend * theta, 0, 0];
  return { a: matTurn(mul(transpose(Rp), Ru)), b, lower: mul(Ru, turnMat(b)) };
}

/** The turn that leaves a joint turned `want` in body space, under a parent turned `parent`. */
export const aim = (parent: Mat3, want: Mat3): Turn => matTurn(mul(transpose(parent), want));

/** A pose with some joints' turns moved `k` of the way to new ones. */
export function turned(pose: Pose, to: Turns, k = 1): Pose {
  if (k <= 0) return pose;
  const joints: { [J in Joint]?: Turn } = { ...pose.joints };
  for (const [j, t] of Object.entries(to) as [Joint, Turn][]) {
    const o = joints[j] ?? ZERO;
    joints[j] = k >= 1 ? t : [o[0] + (t[0] - o[0]) * k, o[1] + (t[1] - o[1]) * k, o[2] + (t[2] - o[2]) * k];
  }
  return { ...pose, joints };
}

import { type Cycle, type Pose, mirrorPose } from '../../core/world3d/pose';

/**
 * The movements a body has (`core/world3d/pose.ts`): each a few poses in a loop. Angles in radians; for a body facing
 * +z, a negative turn about x swings a limb forward; knees bend positive, elbows negative.
 */

/** A walking step: the right foot forward, the left arm forward to balance it, the body at its lowest. */
const contact: Pose = {
  joints: {
    hipR: [-0.42, 0, 0], kneeR: [0.08, 0, 0],
    hipL: [0.32, 0, 0], kneeL: [0.35, 0, 0],
    shoulderL: [-0.32, 0, 0.04], elbowL: [-0.3, 0, 0],
    shoulderR: [0.3, 0, -0.04], elbowR: [-0.12, 0, 0],
    spine: [0.04, 0.05, 0],
  },
  lift: -0.008,
};

/** Halfway: the left leg passes under the body, knee up; the body at its highest. */
const passing: Pose = {
  joints: {
    hipR: [0.05, 0, 0], kneeR: [0.05, 0, 0],
    hipL: [-0.2, 0, 0], kneeL: [0.85, 0, 0],
    shoulderL: [0, 0, 0.04], elbowL: [-0.2, 0, 0],
    shoulderR: [0, 0, -0.04], elbowR: [-0.2, 0, 0],
    spine: [0.04, 0, 0],
  },
  lift: 0.012,
};

/** A walk: two steps, the second the first mirrored. One loop covers the body's `stride`. */
export const WALK: Cycle = { keys: [contact, passing, mirrorPose(contact), mirrorPose(passing)] };

/** Standing: arms a little out from the body, breathing (a slow loop). */
const rest: Pose = { joints: { shoulderL: [0, 0, 0.06], shoulderR: [0, 0, -0.06], elbowL: [-0.1, 0, 0], elbowR: [-0.1, 0, 0] } };
const breathe: Pose = { joints: { spine: [-0.02, 0, 0], neck: [0.02, 0, 0], shoulderL: [0, 0, 0.08], shoulderR: [0, 0, -0.08], elbowL: [-0.12, 0, 0], elbowR: [-0.12, 0, 0] }, lift: 0.002 };
export const IDLE: Cycle = { keys: [rest, breathe] };

/**
 * Sitting (the verb `sit`): thighs level and forward, shins straight down, leaning a little forward with the hands on
 * the knees. The renderer sets the body down so the hips rest on the seat.
 */
const seated: Pose = {
  joints: {
    hipL: [-1.5, 0, 0.06], hipR: [-1.5, 0, -0.06], kneeL: [1.5, 0, 0], kneeR: [1.5, 0, 0],
    spine: [0.06, 0, 0], shoulderL: [-0.55, 0, 0.1], shoulderR: [-0.55, 0, -0.1], elbowL: [-0.5, 0, 0], elbowR: [-0.5, 0, 0],
  },
};
const seatedBreathe: Pose = { joints: { ...seated.joints, spine: [0.03, 0, 0], neck: [0.03, 0, 0] } };
export const SIT: Cycle = { keys: [seated, seatedBreathe] };

/**
 * Carrying something in both hands (plan B3b): the arms forward and bent, hands together in front of the chest. Laid
 * over whatever the legs are doing (walking, standing), so only the arms are said.
 */
export const CARRY_ARMS: Pose['joints'] = {
  shoulderL: [-0.85, 0, -0.18], elbowL: [-0.75, 0, 0],
  shoulderR: [-0.85, 0, 0.18], elbowR: [-0.75, 0, 0],
};

/** A pose with the arms carrying. */
export const carrying = (p: Pose): Pose => ({ ...p, joints: { ...p.joints, ...CARRY_ARMS } });

/** How many seconds one loop of standing takes. */
export const IDLE_SECONDS = 3.2;

/**
 * Holding a weapon in the right hand (plan B8a): the forearm forward and up, so the blade stands out in front. Laid
 * over the legs like carrying; the left arm keeps its swing.
 */
export const WIELD_ARM: Pose['joints'] = { shoulderR: [-0.45, 0, -0.12], elbowR: [-1.15, 0, 0] };
export const wielding = (p: Pose): Pose => ({ ...p, joints: { ...p.joints, ...WIELD_ARM } });

/** How someone stands in a fight, laid over what the legs do: on guard, striking, down (knocked out), dead. */
export type FightPose = 'guard' | 'swing' | 'down' | 'dead';

/** How long a swing takes, seconds: up over the shoulder, then down through the blow. */
export const SWING_SECONDS = 0.7;
const raised: Pose['joints'] = { shoulderR: [-2.7, 0, -0.2], elbowR: [-0.7, 0, 0], spine: [0, -0.25, 0] };
const struck: Pose['joints'] = { shoulderR: [-0.9, 0, 0.15], elbowR: [-0.15, 0, 0], spine: [0.12, 0.3, 0] };
const guard: Pose['joints'] = { ...WIELD_ARM, shoulderL: [-0.3, 0, 0.25], elbowL: [-0.9, 0, 0], kneeL: [0.15, 0, 0], kneeR: [0.15, 0, 0] };

/**
 * A fight pose `t` seconds after it began, over a body's pose. A swing rises for the first third and falls through the
 * blow, then settles back on guard. Down and dead lie still (the renderer lays the body on its back).
 */
export function fightPose(p: Pose, kind: FightPose, t: number): Pose {
  if (kind === 'down' || kind === 'dead') return { joints: { shoulderL: [0, 0, 0.5], shoulderR: [0, 0, -0.5], elbowL: [-0.3, 0, 0], kneeR: [0.4, 0, 0], hipR: [-0.3, 0, 0] } };
  if (kind === 'guard') return { ...p, joints: { ...p.joints, ...guard } };
  const k = Math.min(1, t / SWING_SECONDS);
  const ease = (a: Pose['joints'], b: Pose['joints'], x: number): Pose['joints'] => {
    const out: Pose['joints'] = {};
    for (const j of new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof Pose['joints']>) {
      const u = a[j] ?? [0, 0, 0], v = b[j] ?? [0, 0, 0];
      out[j] = [u[0] + (v[0] - u[0]) * x, u[1] + (v[1] - u[1]) * x, u[2] + (v[2] - u[2]) * x];
    }
    return out;
  };
  const arms = k < 0.35 ? ease(guard, raised, k / 0.35) : k < 0.6 ? ease(raised, struck, (k - 0.35) / 0.25) : ease(struck, guard, (k - 0.6) / 0.4);
  return { ...p, joints: { ...p.joints, ...arms } };
}

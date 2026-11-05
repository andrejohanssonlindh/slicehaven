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

// Fight motions (guard, strike, lying down) are data in `content/motions/`, played by `core/world3d/motion.ts` (B8g F0).

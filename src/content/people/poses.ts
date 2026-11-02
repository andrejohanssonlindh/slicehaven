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

/** How many seconds one loop of standing takes. */
export const IDLE_SECONDS = 3.2;

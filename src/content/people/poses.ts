import type { AnimLib, Gait, Hold, Life, Stance } from '../../core/world3d/animate';
import type { WayOfMoving } from '../../core/world3d/motion';
import { type Cycle, type Pose, type Turns, mirrorPose } from '../../core/world3d/pose';
import { WEAR } from './condition';

/**
 * How bodies stand and move, as data for the animator (`core/world3d/animate.ts`): **stances** (ways of being still),
 * **gaits** (ways of moving over the ground), **holds** (what the arms do with something in them) and the sizes of the
 * small movements laid over everything (`LIFE`). Angles in radians; for a body facing +z, a negative turn about x
 * swings a limb forward; knees bend positive, elbows negative; a foot stays flat when its ankle undoes the hip's and
 * knee's turns (ankle = −(hip + knee)). Check a change on `/models/` (People: Standing, Walking, Running, On guard).
 */

// --- gaits ---

/** A walking step: the right heel down in front, the left foot pushing off behind, the hips turned into the step. */
const walkContact: Pose = {
  joints: {
    root: [0, 0.06, 0], spine: [0.03, -0.05, 0], chest: [0.02, -0.05, 0], head: [-0.03, 0.04, 0],
    hipR: [-0.42, 0, 0], kneeR: [0.08, 0, 0], ankleR: [0.14, 0, 0],
    hipL: [0.32, 0, 0], kneeL: [0.35, 0, 0], ankleL: [-0.17, 0, 0],
    shoulderL: [-0.36, 0, 0.05], elbowL: [-0.38, 0, 0], wristL: [-0.06, 0, 0],
    shoulderR: [0.32, 0, -0.05], elbowR: [-0.1, 0, 0],
  },
  lift: -0.01,
};

/** Halfway: the weight over the right foot, the left leg passing under the body, knee up; the body at its highest. */
const walkPassing: Pose = {
  joints: {
    root: [0, 0, -0.035], spine: [0.03, 0, 0.03], chest: [0.02, 0, 0], head: [-0.03, 0, 0],
    hipR: [0.05, 0, 0.06], kneeR: [0.06, 0, 0], ankleR: [-0.11, 0, -0.025],
    hipL: [-0.22, 0, 0.04], kneeL: [0.9, 0, 0], ankleL: [-0.3, 0, 0],
    shoulderL: [0, 0, 0.05], elbowL: [-0.18, 0, 0],
    shoulderR: [0, 0, -0.05], elbowR: [-0.18, 0, 0],
  },
  lift: 0.012,
  shift: [-0.012, 0],
};

/** A walk: two steps, the second the first mirrored. */
const WALK: Gait = {
  id: 'walk',
  loop: { keys: [walkContact, walkPassing, mirrorPose(walkContact), mirrorPose(walkPassing)] },
  pace: 1.4,
  stride: 1.6,
  effort: 0.1,
};

/** A running step: landing on the right foot under a body leaning forward, the left heel kicked up behind, arms pumping. */
const runContact: Pose = {
  joints: {
    root: [0, 0.08, 0], spine: [0.12, -0.08, 0], chest: [0.08, -0.08, 0], head: [-0.14, 0.08, 0],
    hipR: [-0.62, 0, 0], kneeR: [0.38, 0, 0], ankleR: [0.1, 0, 0],
    hipL: [0.5, 0, 0], kneeL: [1.15, 0, 0], ankleL: [0.3, 0, 0],
    shoulderL: [-0.75, 0, 0.08], elbowL: [-1.35, 0, 0],
    shoulderR: [0.7, 0, -0.08], elbowR: [-1.1, 0, 0],
  },
  lift: -0.022,
};

/** Halfway: off the right foot, the left knee driving through; the body at its highest. */
const runPassing: Pose = {
  joints: {
    root: [0, 0, -0.03], spine: [0.12, 0, 0.03], chest: [0.08, 0, 0], head: [-0.14, 0, 0],
    hipR: [0.2, 0, 0.03], kneeR: [0.25, 0, 0], ankleR: [0.25, 0, 0],
    hipL: [-0.6, 0, 0.03], kneeL: [1.5, 0, 0], ankleL: [-0.2, 0, 0],
    shoulderL: [-0.05, 0, 0.08], elbowL: [-1.25, 0, 0],
    shoulderR: [-0.05, 0, -0.08], elbowR: [-1.25, 0, 0],
  },
  lift: 0.03,
  shift: [-0.008, 0],
};

const RUN: Gait = {
  id: 'run',
  loop: { keys: [runContact, runPassing, mirrorPose(runContact), mirrorPose(runPassing)] },
  pace: 3.4,
  stride: 2.9,
  effort: 0.8,
};

/** The gaits, slowest first: the animator picks and blends them by speed. */
export const GAITS: readonly Gait[] = [WALK, RUN];

// --- stances ---

/** Standing at ease: arms a little out from the body, elbows and knees not quite straight. The life layers do the rest. */
const atEase: Pose = {
  joints: {
    shoulderL: [0.02, 0, 0.07], shoulderR: [0.02, 0, -0.07], elbowL: [-0.14, 0, 0], elbowR: [-0.14, 0, 0],
    hipL: [-0.03, 0, 0.02], hipR: [-0.03, 0, -0.02], kneeL: [0.06, 0, 0], kneeR: [0.06, 0, 0], ankleL: [-0.03, 0, -0.02], ankleR: [-0.03, 0, 0.02],
  },
};
export const STAND: Stance = { id: 'stand', loop: { keys: [atEase] }, seconds: 4, sway: 1, look: 1, arms: 1, effort: 0, planted: 1 };

/**
 * On guard (in a fight): the left foot forward and the right back, knees bent, the body turned a little side-on and
 * leaning in, the head on the foe. It bounces slowly from deep to deeper. The arms come from the `guard` motion.
 */
const ready = (deep: number): Pose => ({
  joints: {
    root: [0, -0.25, 0], spine: [0.1 + deep * 0.3, 0.06, 0], chest: [0.06, 0.06, 0], head: [-0.12 - deep * 0.3, 0.13, 0],
    hipL: [-0.38 - deep, 0, 0.06], kneeL: [0.45 + deep * 2, 0, 0], ankleL: [-0.07 - deep, 0, -0.06],
    hipR: [0.25 - deep * 0.5, 0, -0.06], kneeR: [0.1 + deep * 2, 0, 0], ankleR: [-0.2 - deep * 1.5, 0, 0.06],
  },
  lift: -0.02 - deep * 0.11,
});
export const READY: Stance = { id: 'ready', loop: { keys: [ready(0), ready(0.035)] }, seconds: 1.5, sway: 0.35, look: 0, arms: 1.2, effort: 0.45, planted: 1 };

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
export const SIT: Stance = { id: 'sit', loop: { keys: [seated] }, seconds: 4, sway: 0, look: 0.8, arms: 0.3, effort: 0, planted: 0 };

// --- holds ---

/**
 * Carrying something in both hands (plan B3b): the arms forward and bent, hands together in front of the chest. Laid
 * over whatever the legs are doing (walking, standing), so only the arms are said.
 */
export const CARRY_ARMS: Turns = {
  shoulderL: [-0.85, 0, -0.18], elbowL: [-0.75, 0, 0], wristL: [0, 0, 0],
  shoulderR: [-0.85, 0, 0.18], elbowR: [-0.75, 0, 0], wristR: [0, 0, 0],
};

/** Something carried in both arms. */
export const CARRY: Hold = { id: 'carry', joints: CARRY_ARMS };

/**
 * How a weapon is held, by its way of moving (`moves` on the weapon kind): **at ease** (walking about with it drawn)
 * and **on guard** (in a fight). The weapon lies in the right hand square to the forearm, its tip out to the front;
 * the wrist's turn about x tips it: 0 square, +1.5 straight on along the forearm (a spear couched), negative laid
 * back. `second` puts the left hand on it too, that many metres from the right toward the tip (a weapon model can say
 * exactly where: `grip2`); the left arm then follows the weapon by itself in every motion.
 * Every fight motion starts and ends on the guard of whatever is held (`base: 1` in its keys), so a new way of holding
 * is one entry here.
 */
export interface WeaponHold {
  ease: Turns;
  guard: Turns;
  second?: number;
}

/** The free left arm on guard: forward and bent, out of the way. */
const LEFT_UP: Turns = { shoulderL: [-0.3, 0, 0.25], elbowL: [-0.9, 0, 0], wristL: [0, 0, 0] };
/** A shield on the left forearm on guard: up in front of the body. Laid over any guard. */
export const SHIELD_ARM: Turns = { shoulderL: [-0.8, 0.35, 0.1], elbowL: [-1.3, 0, 0], wristL: [0, 0, 0] };

export const WEAPON_HOLDS: Record<WayOfMoving, WeaponHold> = {
  // A sword: at ease low at the side, point forward and down; on guard up in front, the point toward the foe's face.
  blade: {
    ease: { shoulderR: [-0.1, 0, -0.1], elbowR: [-0.45, 0, 0], wristR: [0.9, 0, 0] },
    guard: { shoulderR: [-0.45, 0, -0.12], elbowR: [-1.15, 0, 0], wristR: [0.45, 0, 0], ...LEFT_UP },
  },
  // An axe, a mace: at ease hanging by the leg; on guard cocked back by the shoulder, ready to fall.
  'axe-mace': {
    ease: { shoulderR: [0, 0, -0.1], elbowR: [-0.3, 0, 0], wristR: [0.7, 0, 0] },
    guard: { shoulderR: [-0.55, 0, -0.2], elbowR: [-1.5, 0, 0], wristR: [-0.2, 0, 0], ...LEFT_UP },
  },
  // A spear: at ease upright like a walking staff; on guard couched low by the hip in both hands, the point at the foe.
  spear: {
    ease: { shoulderR: [-0.2, 0, -0.12], elbowR: [-0.55, 0, 0], wristR: [-0.82, 0, 0] },
    guard: { shoulderR: [0.2, 0, 0.04], elbowR: [-1.15, 0, 0], wristR: [0.75, 0.5, 0] },
    second: 0.32,
  },
  // A staff: upright at ease; on guard slanted across the body in both hands, the far end up toward the foe.
  staff: {
    ease: { shoulderR: [-0.2, 0, -0.12], elbowR: [-0.55, 0, 0], wristR: [-0.82, 0, 0] },
    guard: { shoulderR: [0.15, 0, -0.15], elbowR: [-1.05, 0, 0], wristR: [0.2, 0.4, 0] },
    second: 0.5,
  },
  // A greatsword, a great axe: at ease resting back on the shoulder; on guard both hands low in front, the blade up and forward.
  'two-hander': {
    ease: { shoulderR: [-0.35, 0, -0.05], elbowR: [-1.95, 0, 0], wristR: [0.35, 0, 0] },
    guard: { shoulderR: [-0.3, 0.25, 0.1], elbowR: [-1.05, 0, 0], wristR: [0.4, 0.15, 0] },
    second: -0.1,
  },
  // Bare hands: nothing at ease; on guard both fists up.
  hands: {
    ease: {},
    guard: { shoulderR: [-0.55, 0, -0.1], elbowR: [-1.9, 0, 0], wristR: [0, 0, 0], shoulderL: [-0.65, 0, 0.12], elbowL: [-1.8, 0, 0], wristL: [0, 0, 0] },
  },
  // Only a shield: the right fist up behind it.
  shield: {
    ease: {},
    guard: { shoulderR: [-0.55, 0, -0.1], elbowR: [-1.9, 0, 0], wristR: [0, 0, 0], ...LEFT_UP },
  },
};

/**
 * What the arms do with what someone holds: the way their weapon moves (bare `hands` with none), on guard or at ease,
 * a shield up on the left arm on guard. Null when the arms just hang.
 */
export function weaponHold(way: WayOfMoving, onGuard: boolean, shield: boolean): Hold | null {
  const h = WEAPON_HOLDS[way];
  const joints = onGuard ? { ...h.guard, ...(shield ? SHIELD_ARM : {}) } : h.ease;
  return Object.keys(joints).length ? { id: `${way}:${onGuard ? 'guard' : 'ease'}${onGuard && shield ? ':shield' : ''}`, joints } : null;
}

// --- life ---

/** The sizes of the small movements nobody steers (radians; moves as shares of the body's height). */
export const LIFE: Life = {
  // One breath: the chest tips back and rises, the shoulders open.
  breath: { seconds: 4.2, chest: 0.03, shoulders: 0.018, lift: 0.0025 },
  // Weight from foot to foot: how far the hips move, how much they drop on the free side, (the free knee gives as the hip drops).
  sway: { seconds: 9, shift: 0.022, roll: 0.05 },
  arms: { seconds: 6, swing: 0.035, elbow: 0.05, wrist: 0.06 },
  // Looking about: a new glance every `seconds` or so; `reach` is as far as a head turns toward something, `lead` how
  // much of a turn of the body the head takes first, `settle` how quickly it gets there.
  look: { seconds: 3.4, yaw: 0.55, pitch: 0.1, reach: 1.15, lead: 0.5, settle: 0.16 },
};

/** Everything the animator needs besides the person. */
export const ANIM: AnimLib = { gaits: GAITS, life: LIFE, wear: WEAR };

/** The walk's loop on its own (tests, and anything that wants just the steps). */
export const WALK_LOOP: Cycle = WALK.loop;

// Fight motions (guard, strike, lying down) are data in `content/motions/`, played by `core/world3d/motion.ts` (B8g F0).

import type { Wear } from '../../core/world3d/animate';
import type { TiredBand } from '../../core/world3d/condition';

/**
 * How a body's condition shows (the director, 2026-11-17): the bands of fatigue, and what being spent, a hurt arm and
 * a hurt leg do to the way someone stands and moves. Rules: `core/world3d/condition.ts` (what shape they are in) and
 * `core/world3d/animate.ts` (how it is laid over the pose). Judge it on `/models/` (People: Condition, Hurt).
 */

/** Fatigue bands (the director's: 0–10, 11–20, 21–30, over 30). `tired` is how much of `WEAR.spent` shows. */
export const TIRED_BANDS: readonly TiredBand[] = [
  { from: 0, tired: 0, name: 'fresh' },
  { from: 11, tired: 0.4, name: 'winded' },
  { from: 21, tired: 0.72, name: 'worn' },
  { from: 31, tired: 1, name: 'spent' },
];

export const WEAR: Wear = {
  // Spent: bent forward from the waist, the head hanging, the shoulders rounded and the guard sunk; a little lower
  // on the legs. Added to whatever the body does, by how tired it is.
  spent: {
    joints: {
      spine: [0.16, 0, 0], chest: [0.2, 0, 0], neck: [0.1, 0, 0], head: [0.12, 0, 0],
      shoulderL: [0.22, 0, 0.05], shoulderR: [0.22, 0, -0.05], elbowL: [0.3, 0, 0], elbowR: [0.38, 0, 0], wristR: [0.3, 0, 0],
      hipL: [-0.1, 0, 0], kneeL: [0.2, 0, 0], ankleL: [-0.1, 0, 0], hipR: [-0.1, 0, 0], kneeR: [0.2, 0, 0], ankleR: [-0.1, 0, 0],
    },
    lift: -0.012,
  },
  // The spent breathe hard even standing, and rock on their feet.
  breath: 0.85,
  sway: 1.6,
  // A hurt arm (written for the left; mirrored for the right) is held in across the belly, and does less of whatever
  // the body asks of it: a useless one (`1`) takes this much of the pose.
  arm: { shoulderL: [0.12, -0.85, 0.04], elbowL: [-1.35, 0, 0], wristL: [0.2, 0, 0] },
  armHold: 0.85,
  // A hurt leg: the weight is kept on the other (`favour`), its knee hardly bends in a step (`stiff`), and each step
  // on it is short and heavy: the body dips (`dip`, a share of the height) and lurches over it (`lurch`, radians).
  leg: { favour: 0.9, stiff: 0.65, dip: 0.04, lurch: 0.14 },
};

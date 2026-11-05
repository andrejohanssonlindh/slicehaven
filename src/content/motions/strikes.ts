import type { Motion } from '../../core/world3d/motion';
import { GUARD_ARMS } from './guard';

/**
 * Strikes for the ways of moving that need their own (plan B8g, F1). The plain `strike` (strike.ts) is any one-handed
 * blow, so a blade uses it; these are the rest: a two-hander chopped down with both hands, a staff swept round, a spear
 * thrust, an axe or mace swung heavily, a fist. Angles: a negative turn about x swings an arm forward and up, the right
 * arm's z is out when negative and across the body when positive. Each blow lands at `contact`.
 */
const L = { shoulderL: GUARD_ARMS.shoulderL, elbowL: GUARD_ARMS.elbowL };

export default [
  {
    // Both hands high over the right shoulder, then chopped down through the blow with the whole body behind it.
    id: 'strike-two-hander', act: 'strike', way: 'two-hander', seconds: 1, part: 'upper', then: 'guard', marks: { contact: 0.58 },
    keys: [
      { at: 0, joints: GUARD_ARMS },
      { at: 0.4, joints: { shoulderR: [-2.9, 0, -0.1], elbowR: [-0.6, 0, 0], shoulderL: [-2.6, 0, -0.15], elbowL: [-0.9, 0, 0], spine: [-0.15, -0.3, 0] } },
      { at: 0.58, joints: { shoulderR: [-0.8, 0, -0.05], elbowR: [-0.2, 0, 0], shoulderL: [-0.9, 0, -0.1], elbowL: [-0.3, 0, 0], spine: [0.35, 0.3, 0] } },
      { at: 0.75, joints: { shoulderR: [-0.8, 0, -0.05], elbowR: [-0.2, 0, 0], shoulderL: [-0.9, 0, -0.1], elbowL: [-0.3, 0, 0], spine: [0.3, 0.25, 0] } },
      { at: 1, joints: GUARD_ARMS },
    ],
  },
  {
    // Wound back with the shoulders turned, then swept round in a flat arc, the left hand guiding.
    id: 'strike-staff', act: 'strike', way: 'staff', seconds: 0.8, part: 'upper', then: 'guard', marks: { contact: 0.55 },
    keys: [
      { at: 0, joints: GUARD_ARMS },
      { at: 0.35, joints: { shoulderR: [-1.3, 0, -0.5], elbowR: [-0.7, 0, 0], shoulderL: [-1.1, 0, -0.3], elbowL: [-0.6, 0, 0], spine: [0.05, -0.55, 0] } },
      { at: 0.55, joints: { shoulderR: [-1.1, 0, 0.3], elbowR: [-0.3, 0, 0], shoulderL: [-1.0, 0, 0.1], elbowL: [-0.5, 0, 0], spine: [0.08, 0.5, 0] } },
      { at: 0.75, joints: { shoulderR: [-1.0, 0, 0.35], elbowR: [-0.3, 0, 0], shoulderL: [-0.9, 0, 0.1], elbowL: [-0.5, 0, 0], spine: [0.05, 0.4, 0] } },
      { at: 1, joints: GUARD_ARMS },
    ],
  },
  {
    // Drawn back to the hip, then driven straight forward, the body leaning into it.
    id: 'strike-spear', act: 'strike', way: 'spear', seconds: 0.65, part: 'upper', then: 'guard', marks: { contact: 0.5 },
    keys: [
      { at: 0, joints: GUARD_ARMS },
      { at: 0.3, joints: { shoulderR: [-0.2, 0, -0.1], elbowR: [-1.6, 0, 0], shoulderL: [-1.1, 0, 0.1], elbowL: [-0.5, 0, 0], spine: [-0.05, -0.3, 0] } },
      { at: 0.5, joints: { shoulderR: [-1.45, 0, 0.05], elbowR: [-0.1, 0, 0], shoulderL: [-1.2, 0, 0.1], elbowL: [-0.5, 0, 0], spine: [0.18, 0.2, 0] } },
      { at: 0.7, joints: { shoulderR: [-1.4, 0, 0.05], elbowR: [-0.15, 0, 0], shoulderL: [-1.2, 0, 0.1], elbowL: [-0.5, 0, 0], spine: [0.15, 0.15, 0] } },
      { at: 1, joints: GUARD_ARMS },
    ],
  },
  {
    // Slower and heavier than a blade: leaning back to lift it, then the whole weight dropped on the blow.
    id: 'strike-axe-mace', act: 'strike', way: 'axe-mace', seconds: 0.9, part: 'upper', then: 'guard', marks: { contact: 0.62 },
    keys: [
      { at: 0, joints: GUARD_ARMS },
      { at: 0.4, joints: { ...L, shoulderR: [-2.9, 0, -0.2], elbowR: [-0.5, 0, 0], spine: [-0.25, -0.35, 0] } },
      { at: 0.62, joints: { ...L, shoulderR: [-0.8, 0, 0.1], elbowR: [-0.1, 0, 0], spine: [0.4, 0.35, 0] } },
      { at: 0.78, joints: { ...L, shoulderR: [-0.8, 0, 0.1], elbowR: [-0.1, 0, 0], spine: [0.35, 0.3, 0] } },
      { at: 1, joints: GUARD_ARMS },
    ],
  },
  {
    // A punch: the fist drawn in by the shoulder, then straight out as the body turns into it.
    id: 'strike-hands', act: 'strike', way: 'hands', seconds: 0.4, part: 'upper', then: 'guard', marks: { contact: 0.5 },
    keys: [
      { at: 0, joints: GUARD_ARMS },
      { at: 0.25, joints: { shoulderR: [-0.5, 0, -0.1], elbowR: [-2.0, 0, 0], shoulderL: [-0.3, 0, 0.25], elbowL: [-1.1, 0, 0], spine: [0, -0.3, 0] } },
      { at: 0.5, joints: { shoulderR: [-1.5, 0, -0.05], elbowR: [-0.05, 0, 0], shoulderL: [-0.3, 0, 0.25], elbowL: [-1.2, 0, 0], spine: [0.08, 0.35, 0] } },
      { at: 0.7, joints: { shoulderR: [-1.4, 0, -0.05], elbowR: [-0.1, 0, 0], shoulderL: [-0.3, 0, 0.25], elbowL: [-1.1, 0, 0], spine: [0.06, 0.3, 0] } },
      { at: 1, joints: GUARD_ARMS },
    ],
  },
] satisfies Motion[];

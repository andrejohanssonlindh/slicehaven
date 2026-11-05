import type { Motion } from '../../core/world3d/motion';
import { GUARD_ARMS } from './guard';

/**
 * Being hit, and the stroke that ends a fight (plan B8g, F1). A flinch is a light hit (the upper body jolts), a stagger
 * a hard one (rocked back off the feet), a fall ends on the ground and holds as `down` (see lying.ts), and a finish is
 * the killing stroke: a strike with a long windup and the weight thrown into it.
 */
export default [
  {
    id: 'flinch', act: 'flinch', seconds: 0.4, part: 'upper', then: 'guard',
    keys: [
      { at: 0, joints: GUARD_ARMS },
      { at: 0.2, joints: { shoulderR: [-0.3, 0, -0.35], elbowR: [-0.9, 0, 0], shoulderL: [-0.1, 0, 0.45], elbowL: [-0.6, 0, 0], spine: [-0.14, -0.1, 0], neck: [-0.2, 0, 0] } },
      { at: 1, joints: GUARD_ARMS },
    ],
  },
  {
    id: 'stagger', act: 'stagger', seconds: 0.9, part: 'whole', then: 'guard',
    keys: [
      { at: 0, joints: GUARD_ARMS, root: {} },
      {
        at: 0.25,
        joints: { hipL: [-0.3, 0, 0], kneeL: [0.6, 0, 0], hipR: [0.3, 0, 0], kneeR: [0.4, 0, 0], spine: [-0.3, 0.15, 0], neck: [-0.25, 0, 0], shoulderR: [-0.2, 0, -0.9], elbowR: [-0.5, 0, 0], shoulderL: [-0.2, 0, 0.9], elbowL: [-0.5, 0, 0] },
        root: { back: 0.3, tilt: -0.28, up: -0.04 },
      },
      {
        at: 0.55,
        joints: { hipL: [-0.15, 0, 0], kneeL: [0.4, 0, 0], hipR: [0.15, 0, 0], kneeR: [0.3, 0, 0], spine: [-0.15, 0.05, 0], neck: [-0.1, 0, 0], shoulderR: [-0.3, 0, -0.6], elbowR: [-0.6, 0, 0], shoulderL: [-0.3, 0, 0.6], elbowL: [-0.6, 0, 0] },
        root: { back: 0.3, tilt: -0.14, up: -0.03 },
      },
      { at: 1, joints: GUARD_ARMS, root: {} },
    ],
  },
  {
    // Knees go, the body tips onto its back and lands where `down` holds it.
    id: 'fall', act: 'fall', seconds: 1.1, part: 'whole', then: 'down',
    keys: [
      { at: 0, joints: GUARD_ARMS, root: {} },
      {
        at: 0.3,
        joints: { hipL: [-0.4, 0, 0], kneeL: [0.9, 0, 0], hipR: [-0.2, 0, 0], kneeR: [0.7, 0, 0], spine: [-0.2, 0, 0], shoulderR: [-0.3, 0, -0.7], shoulderL: [-0.3, 0, 0.7] },
        root: { tilt: -0.3, up: -0.08, back: 0.15 },
      },
      {
        at: 0.7,
        joints: { hipR: [-0.3, 0, 0], kneeR: [0.5, 0, 0], shoulderR: [0, 0, -0.7], shoulderL: [0, 0, 0.7], elbowL: [-0.2, 0, 0] },
        root: { tilt: -1.1, up: 0.05, back: 0.1 },
      },
      {
        at: 1,
        joints: { shoulderL: [0, 0, 0.5], shoulderR: [0, 0, -0.5], elbowL: [-0.3, 0, 0], kneeR: [0.4, 0, 0], hipR: [-0.3, 0, 0] },
        root: { tilt: -Math.PI / 2, up: 0.12 },
      },
    ],
  },
  {
    // The killing stroke: the weapon high, a held breath, then all the weight thrown down through the blow.
    id: 'finish', act: 'finish', seconds: 1.3, part: 'upper', then: 'guard', marks: { contact: 0.7 },
    keys: [
      { at: 0, joints: GUARD_ARMS },
      { at: 0.3, joints: { shoulderL: GUARD_ARMS.shoulderL, elbowL: GUARD_ARMS.elbowL, shoulderR: [-2.9, 0, -0.1], elbowR: [-0.5, 0, 0], spine: [-0.3, -0.3, 0] } },
      { at: 0.45, joints: { shoulderL: GUARD_ARMS.shoulderL, elbowL: GUARD_ARMS.elbowL, shoulderR: [-3.0, 0, -0.1], elbowR: [-0.5, 0, 0], spine: [-0.32, -0.32, 0] } },
      { at: 0.7, joints: { shoulderL: GUARD_ARMS.shoulderL, elbowL: GUARD_ARMS.elbowL, shoulderR: [-0.6, 0, 0.1], elbowR: [-0.1, 0, 0], spine: [0.5, 0.3, 0] }, lift: -0.03 },
      { at: 0.85, joints: { shoulderL: GUARD_ARMS.shoulderL, elbowL: GUARD_ARMS.elbowL, shoulderR: [-0.6, 0, 0.1], elbowR: [-0.1, 0, 0], spine: [0.5, 0.3, 0] }, lift: -0.03 },
      { at: 1, joints: GUARD_ARMS },
    ],
  },
] satisfies Motion[];

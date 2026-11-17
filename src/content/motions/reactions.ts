import type { Motion } from '../../core/world3d/motion';

/**
 * Being hit, and the stroke that ends a fight (plan B8g, F1; re-keyed 2026-11-17). A flinch is a light hit (the upper
 * body jolts), a stagger a hard one (rocked back off the feet): both are **added** to the body's own stance and guard,
 * so they are the same jolt whatever is held. A fall starts from the stance and ends on the ground, where `down` holds
 * it (see lying.ts). The killing stroke is in finishes.ts.
 */
export default [
  {
    id: 'flinch', act: 'flinch', seconds: 0.4, part: 'upper', add: true, then: 'guard', blend: 0.04,
    keys: [
      { at: 0, joints: {} },
      // The jolt comes at once (`out`), the recovery is slow.
      { at: 0.2, ease: 'out', joints: { spine: [-0.16, -0.1, 0], chest: [-0.1, 0, 0], head: [-0.22, 0, 0], shoulderR: [0.15, 0, -0.22], shoulderL: [0.15, 0, 0.22] } },
      { at: 1, joints: {} },
    ],
  },
  {
    id: 'stagger', act: 'stagger', seconds: 0.9, part: 'whole', add: true, then: 'guard', blend: 0.05,
    keys: [
      { at: 0, joints: {}, root: {} },
      {
        at: 0.25, ease: 'out',
        joints: { hipL: [-0.1, 0, 0], kneeL: [0.25, 0, 0], hipR: [0.15, 0, 0], kneeR: [0.3, 0, 0], spine: [-0.32, 0.15, 0], chest: [-0.12, 0, 0], head: [-0.25, 0, 0], shoulderR: [0.25, 0, -0.6], shoulderL: [0.2, 0, 0.6] },
        root: { back: 0.3, tilt: -0.28, up: -0.04 },
      },
      {
        at: 0.55,
        joints: { hipL: [-0.05, 0, 0], kneeL: [0.15, 0, 0], hipR: [0.08, 0, 0], kneeR: [0.2, 0, 0], spine: [-0.16, 0.05, 0], chest: [-0.06, 0, 0], head: [-0.1, 0, 0], shoulderR: [0.12, 0, -0.35], shoulderL: [0.1, 0, 0.35] },
        root: { back: 0.3, tilt: -0.14, up: -0.03 },
      },
      { at: 1, joints: {}, root: {} },
    ],
  },
  {
    // From wherever the body stood: the knees go, it tips onto its back and lands where `down` holds it.
    id: 'fall', act: 'fall', seconds: 1.1, part: 'whole', then: 'down', life: 'breath', leave: 0.7, blend: 0.05,
    keys: [
      { at: 0, base: 1, joints: {}, root: {} },
      {
        at: 0.3, base: 0.35,
        joints: { hipL: [-0.4, 0, 0], kneeL: [0.9, 0, 0], hipR: [-0.2, 0, 0], kneeR: [0.7, 0, 0], spine: [-0.2, 0, 0], chest: [-0.1, 0, 0], head: [-0.2, 0, 0], shoulderR: [-0.3, 0, -0.7], shoulderL: [-0.3, 0, 0.7] },
        root: { tilt: -0.3, up: -0.08, back: 0.15 },
      },
      {
        at: 0.7,
        joints: { hipR: [-0.3, 0, 0], kneeR: [0.5, 0, 0], shoulderR: [0, 0, -0.7], shoulderL: [0, 0, 0.7], elbowL: [-0.2, 0, 0], head: [-0.15, 0, 0] },
        root: { tilt: -1.1, up: 0.05, back: 0.1 },
      },
      {
        at: 1, ease: 'in',
        joints: { shoulderL: [0, 0, 0.5], shoulderR: [0, 0, -0.5], elbowL: [-0.3, 0, 0], kneeR: [0.4, 0, 0], hipR: [-0.3, 0, 0] },
        root: { tilt: -Math.PI / 2, up: 0.12 },
      },
    ],
  },
] satisfies Motion[];

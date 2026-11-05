import type { Motion, MotionKey } from '../../core/world3d/motion';

/**
 * Lying on the back, still: knocked out or dying (`down`) and dead (`dead`). The whole body tipped onto its back a
 * hand's breadth over the ground, arms out, one knee up. Held. (A fall into it, `fall`, is for the motion library.)
 */
const lying: MotionKey = {
  at: 0,
  joints: { shoulderL: [0, 0, 0.5], shoulderR: [0, 0, -0.5], elbowL: [-0.3, 0, 0], kneeR: [0.4, 0, 0], hipR: [-0.3, 0, 0] },
  root: { tilt: -Math.PI / 2, up: 0.12 },
};

export default [
  { id: 'down', act: 'down', seconds: 0, part: 'whole', keys: [lying], then: 'hold' },
  { id: 'dead', act: 'dead', seconds: 0, part: 'whole', keys: [lying], then: 'hold' },
] satisfies Motion[];

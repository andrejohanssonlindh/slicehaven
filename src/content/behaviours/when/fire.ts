import type { Condition } from '../../../core/world3d/behave';

/**
 * While something burns near them (plan B7): { "when": { "fire": true } }. The world sets it for whoever is within
 * ten metres of a fire on the same floor, and puts the line at the top of everyone's day (before answering a wrong),
 * so maps need not write it.
 */
const fire: Condition = {
  id: 'fire',
  about: 'While something burns near them.',
  check: (v) => (v === true ? null : 'write true'),
  holds: (_v, _clock, mind) => !!mind.fire,
};

export default fire;

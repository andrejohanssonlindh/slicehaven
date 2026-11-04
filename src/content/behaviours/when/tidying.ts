import type { Condition } from '../../../core/world3d/behave';

/**
 * While someone is bringing a found thing home (plan B3b): { "when": { "tidying": true } }. The world sets it when a
 * thing of their household, or anyone's for someone who likes order (`content/people/order.ts`), lies near them out of
 * place, and puts the line at the top of everyone's day (after the answers to a wrong), so maps need not write it.
 */
const tidying: Condition = {
  id: 'tidying',
  about: 'While they bring a found thing home to where it belongs.',
  check: (v) => (v === true ? null : 'write true'),
  holds: (_v, _clock, mind) => !!mind.tidy,
};

export default tidying;

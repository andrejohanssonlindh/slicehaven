import { DIFFICULTY } from '../../../core/checks';
import type { VerbDef } from '../../../core/world3d/actions';

/**
 * Steal unseen (plan B3b): slip something small (pocket or bag size) under your clothes. A sleight-of-hand roll, easy
 * alone, harder for a bag-sized thing and under watching eyes. Done well, no one notices: the theft goes unanswered,
 * and it is never recognised on you. Fumbled, you still have it, but whoever was looking saw you steal it.
 */
const slipAway: VerbDef = {
  id: 'slip-away',
  label: 'Slip the {name} away unseen',
  on: { has: 'size' },
  gates: [{ gate: 'small' }, { gate: 'hands-free' }, { gate: 'owner', act: 'steal' }],
  roll: {
    skills: ['Fingerfärdighet'], attr: 'attr:Förflyttning', difficulty: DIFFICULTY.easy,
    harder: [
      { fact: 'bulky', add: 4, note: 'it is bag-sized' },
      { fact: 'watched', add: 4, note: 'someone is watching you' },
    ],
  },
  unseen: true,
  success: [{ carry: 'hidden' }, { say: 'The {name} is out of sight before anyone could look.', tone: 'good' }],
  failure: [{ carry: 'hidden' }, { say: 'You fumble the {name} out of sight. Anyone looking saw it.', tone: 'bad' }],
};

export default slipAway;

import type { VerbDef } from '../../../core/world3d/actions';

/**
 * Pick up anything that can be taken (it has a `size`) and hold it in both hands (plan B3b). Moving it about its room
 * is no wrong; what it is depends on where it goes: carried to another room of the house, *move*; out of the house,
 * *take*, for whoever sees it cross, and after that its household recognise it wherever they see it with you
 * (`core/world3d/carry.ts`). Heavy things can be tried, and are too heavy.
 */
const pickUp: VerbDef = {
  id: 'pick-up',
  label: 'Pick up the {name}',
  on: { has: 'size' },
  gates: [{ gate: 'size' }, { gate: 'hands-free' }],
  success: [{ carry: 'open' }, { say: 'You pick up the {name}.' }],
};

export default pickUp;

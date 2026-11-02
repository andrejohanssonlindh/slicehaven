import type { VerbDef } from '../../../core/world3d/actions';

/** Sit on anything with a seat (a stool, a bench, a bed's edge); you get up when you walk. */
const sit: VerbDef = {
  id: 'sit',
  label: 'Sit on the {name}',
  on: { has: 'seat' },
  gates: [{ gate: 'owner' }],
  success: [{ sit: true }],
};

export default sit;

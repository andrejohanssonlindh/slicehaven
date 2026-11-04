import type { VerbDef } from '../../../core/world3d/actions';

/**
 * Take something from a rack (plan B8a): anything whose kind has a `stock` (a weapon rack) lists what it holds, and
 * the one picked goes in your hand. Your hands must be free.
 */
const takeFrom: VerbDef = {
  id: 'take-from',
  label: 'Take something from the {name}',
  on: { has: 'stock' },
  gates: [{ gate: 'a-hand-free' }],
  success: [{ choose: 'stock' }],
};

export default takeFrom;

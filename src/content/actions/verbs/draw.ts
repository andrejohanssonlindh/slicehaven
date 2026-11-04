import type { VerbDef } from '../../../core/world3d/actions';

/**
 * Draw a weapon you carry (plan B8a, the director: use what you have from creation): your own gear, at the belt or on
 * the back. With more than one, the page asks which. Your hands must be free.
 */
const draw: VerbDef = {
  id: 'draw',
  label: 'Draw a weapon',
  on: 'here',
  gates: [{ gate: 'hands-free' }, { gate: 'has-gear' }],
  success: [{ choose: 'gear' }],
};

export default draw;

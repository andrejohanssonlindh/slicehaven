import type { VerbDef } from '../../../core/world3d/actions';

/**
 * Put something small straight into your pockets or pack (plan B6), where it first fits. Out of sight from then on, so
 * never recognised on you; but someone's thing put away in front of them is taken, and answered as such.
 */
const pack: VerbDef = {
  id: 'pack',
  label: 'Put the {name} in your pack',
  on: { has: 'size' },
  gates: [{ gate: 'packable' }, { gate: 'weight' }, { gate: 'room-in-pack' }, { gate: 'owner', act: 'take' }],
  success: [{ carry: 'pack' }, { say: 'You put the {name} in your pack.' }],
};

export default pack;

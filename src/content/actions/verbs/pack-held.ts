import type { VerbDef } from '../../../core/world3d/actions';

/** Put what you hold into your pockets or pack, where it first fits (plan B6). Out of sight from then on. */
const packHeld: VerbDef = {
  id: 'pack-held',
  label: 'Put the {name} in your pack',
  on: 'here',
  gates: [{ gate: 'holding-packable' }, { gate: 'room-in-pack' }],
  success: [{ pack: true }, { say: 'You put the {name} in your pack.' }],
};

export default packHeld;

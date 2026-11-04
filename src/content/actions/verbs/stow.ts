import type { VerbDef } from '../../../core/world3d/actions';

/** Put away the weapon you hold, on you (plan B8a): your own only; someone else's is put down or given back. */
const stow: VerbDef = {
  id: 'stow',
  label: 'Put away the {name}',
  on: 'here',
  gates: [{ gate: 'holding-own' }],
  success: [{ stow: true }, { say: 'You put away the {name}.' }],
};

export default stow;

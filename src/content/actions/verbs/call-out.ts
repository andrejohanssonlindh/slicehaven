import type { VerbDef } from '../../../core/world3d/actions';

/**
 * Call out, loud (plan B5): no roll, no time; heard some forty metres off in the open, less through walls. Those who
 * listen for a shout turn to it, and a guard on watch comes to see.
 */
const callOut: VerbDef = {
  id: 'callout',
  label: 'Call out',
  on: 'here',
  noise: { loud: 40, kind: 'shout' },
  success: [{ say: '"Hello there!" Your voice carries.' }],
};

export default callOut;

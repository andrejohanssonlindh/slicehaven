import type { VerbDef } from '../../../core/world3d/actions';

/**
 * Strike a gong to call a fighter (plan B8a, the director: "let me pick the difficulty of the enemy"): anything whose
 * kind `calls` someone asks how good a fighter you want, and a fresh one of that level comes (the world's
 * `callFighter`). Loud.
 */
const strikeGong: VerbDef = {
  id: 'strike-gong',
  label: 'Strike the {name}: call a fighter',
  on: { has: 'calls' },
  noise: { loud: 80, kind: 'gong' },
  success: [{ choose: 'calls' }, { say: 'The {name} booms across the sand.' }],
};

export default strikeGong;

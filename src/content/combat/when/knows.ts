import type { Choice } from '../../../core/combat';
import type { FightCondition } from '../../../core/fightmind';

/**
 * What the foe declared this round, known only to whoever has the upper hand (the director: choices are declared in
 * reverse order). Each key given must match: a tactic by name, or `true` for "any" (`pickUp`, `move`, `retreat`).
 * { "when": { "theyMean": { "attack": "powerful" } }, "do": "defend", "weights": { "counter": 3, "standard": 1 } }.
 */
const KEYS = ['attack', 'defend', 'pickUp', 'move', 'retreat'] as const;

const theyMean: FightCondition = {
  id: 'theyMean',
  about: 'They know what the foe means to do this round (they have the upper hand), and it is this.',
  check: (v) => {
    if (!v || typeof v !== 'object') return `give what they mean, e.g. { "attack": "powerful" } (keys: ${KEYS.join(', ')})`;
    const bad = Object.keys(v).filter((k) => !(KEYS as readonly string[]).includes(k));
    return bad.length ? `unknown key ${bad.join(', ')} (keys: ${KEYS.join(', ')})` : null;
  },
  holds: (v, view) => {
    const k = view.known;
    if (!k) return false;
    return Object.entries(v as Record<string, unknown>).every(([key, want]) => {
      const got = k[key as keyof Choice];
      return want === true ? !!got : got === want;
    });
  },
};

export default theyMean;

import type { Condition } from '../../../core/world3d/behave';
import { lastHeard } from '../../../core/world3d/perceive';

/**
 * Conditions on what someone perceives (plan B5; the rules are `core/world3d/perceive.ts`): whether they see someone
 * now, and whether they heard something lately (a noise is remembered for half a minute).
 * { "when": { "sees": "hero" } }, { "when": { "heard": "shout" } }, { "when": { "heard": ["steps", "shout"] } },
 * { "when": { "heard": "any", "hours": [22, 6] } }.
 */

const who = (v: unknown): string | null => (typeof v === 'string' && v ? null : 'give who: "hero", or a person\'s id');
const kinds = (v: unknown): string | null =>
  (typeof v === 'string' && v) || (Array.isArray(v) && v.length > 0 && v.every((k) => typeof k === 'string' && k)) ? null : 'give a kind of noise ("steps", "shout", "fire"), a list of them, or "any"';

const conditions: Condition[] = [
  {
    id: 'sees',
    about: 'While they can see someone ("hero", or a person\'s id): in their cone of sight, in range, nothing in the way.',
    check: who,
    holds: (v, _clock, mind) => mind.senses.sees.includes(String(v)),
  },
  {
    id: 'notSees',
    about: 'While they cannot see someone.',
    check: who,
    holds: (v, _clock, mind) => !mind.senses.sees.includes(String(v)),
  },
  {
    id: 'heard',
    about: 'For half a minute after they heard a noise of that kind ("steps", "shout", "fire", or "any"; or a list).',
    check: kinds,
    holds: (v, _clock, mind) => lastHeard(mind.senses, v as string | string[]) !== null,
  },
];

export default conditions;

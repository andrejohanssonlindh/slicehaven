import type { AttackTactic, DefenceTactic } from '../../../core/combat';
import { ANSWER_ATTACK, ANSWER_DEFENCE, type FightDoing, type FightLine, lean, usableAttack, weighted } from '../../../core/fightmind';

/**
 * The main action and the defence: strike with a tactic, defend with one, or break off. Tactics are picked by
 * weight; someone who knows the foe's tactic leans to the answer unless the line says "lean": false.
 * { "do": "strike", "weights": { "standard": 3, "quick": 2, "powerful": 2 } }.
 */
const weightsOf = <T extends string>(line: FightLine, all: readonly T[]): Record<T, number> => {
  const w = (line.weights ?? {}) as Partial<Record<T, number>>;
  return Object.fromEntries(all.map((t) => [t, w[t] ?? 0])) as Record<T, number>;
};
const anyWeight = (w: Record<string, number>) => Object.values(w).some((v) => v > 0);

const doings: FightDoing[] = [
  {
    id: 'strike',
    about: 'Strike, with a tactic picked by "weights" (standard, quick, powerful); leans to the answer if they know the defence.',
    keys: ['weights', 'lean'],
    fills: 'main',
    choose: (line, { me, known, rng }) => {
      let w = usableAttack(me, weightsOf<AttackTactic>(line, ['standard', 'quick', 'powerful']));
      if (known?.defend && line.lean !== false) w = lean(w, ANSWER_ATTACK[known.defend]);
      return anyWeight(w) ? { attack: weighted(w, rng) } : null;
    },
  },
  {
    id: 'defend',
    about: 'Defend, with a tactic picked by "weights" (standard, defensive, counter); leans to the answer if they know the blow.',
    keys: ['weights', 'lean'],
    fills: 'defence',
    choose: (line, { known, rng }) => {
      let w = weightsOf<DefenceTactic>(line, ['standard', 'defensive', 'counter']);
      if (known?.attack && line.lean !== false) w = lean(w, ANSWER_DEFENCE[known.attack]);
      return anyWeight(w) ? { defend: weighted(w, rng) } : null;
    },
  },
  {
    id: 'retreat',
    about: 'As the attacker, break off: step back out of the melee instead of striking.',
    keys: [],
    fills: 'main',
    choose: (_line, { role }) => (role === 'attacker' ? { retreat: true } : null),
  },
];

export default doings;

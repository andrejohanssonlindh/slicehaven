import { DIFFICULTY } from '../../core/checks';
import type { ChallengeDef, ChallengeResult } from '../../core/challenge';

/**
 * Challenge templates: standard efforts against a place. A scene gives the template its
 * own results (what you find out in *this* place); everything else is the standard
 * layer, so every scene gets the same reasonable skills and edges.
 */

/** Survey the area: a larger, slower kind of search. Night makes it harder; darkvision makes it easier. */
export function surveyChallenge(opts: { intro: string; results: ChallengeResult[]; when?: ChallengeDef['when'] }): ChallengeDef {
  return {
    id: 'survey',
    label: 'Survey the area',
    goal: 'learn the lie of the land',
    intro: opts.intro,
    difficulty: { night: DIFFICULTY.hard, dawn: DIFFICULTY.tricky + 2, day: DIFFICULTY.tricky },
    level: 'important',
    when: opts.when,
    locked: ['attr:Vaksamhet'],
    skills: [
      { id: 'Genomsöka' },
      { id: 'Speja' },
      { id: 'Orientering' },
      { id: 'Naturlära' },
      { id: 'Spåra' },
      // Eyes made for the dark are reasonable (and rollable) only when it is dark.
      { id: 'F:Mörkersyn', time: ['night'] },
      { id: 'F:Nattsyn', time: ['night'] },
    ],
    edges: [
      { skill: 'F:Mörkersyn', time: ['night'], control: 2, note: 'You see well in the dark.' },
      { skill: 'F:Nattsyn', time: ['night'], control: 2, note: 'You see well in the dark.' },
    ],
    results: opts.results,
  };
}

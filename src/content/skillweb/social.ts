import { DIFFICULTY } from '../../core/checks';
import type { HookDef } from '../../core/skillweb';
import { SKILL_SETS } from '../rollables';

/**
 * Social hooks: what anyone with a mind can be talked at with.
 * Layer 1 sits on 'humanoid' (every human, dwarf, elf…); 'guard' and 'outcast'
 * (kinds of human) change single hooks, never the whole set.
 *
 * One try = one skill, one intention (decision Q15). Every try costs one of the
 * person's talks (their patience, by kind) and leaves a mood that colours the
 * next try (decision Q18). Kept advantages ("tokens") are the long reach: an
 * impressed audience is easier to sway later; a distracted one is easier to rob.
 */
const social = { layer: 1, social: true } as const;

export const SOCIAL_HOOKS: HookDef[] = [
  {
    ...social,
    id: 'persuade',
    kind: 'humanoid',
    intention: 'persuade',
    label: 'Make your case to {name}',
    skills: [...SKILL_SETS.argue],
    difficulty: DIFFICULTY.tricky,
    wants: ['social'],
    success: [
      { say: '{Name} hears you out, and seems to take it in.', tone: 'good' },
      { mood: 1 },
      { token: { kind: 'social', n: 1, against: '{id}', label: 'you made your case to {name}' } },
    ],
    failure: [{ say: '{Name} is not swayed.' }, { mood: -1 }],
    strong: [{ say: 'You find exactly the right words.', tone: 'good' }, { mood: 1 }],
  },
  {
    ...social,
    id: 'impress',
    kind: 'humanoid',
    intention: 'impress',
    label: 'Win {name} over',
    skills: [...SKILL_SETS.impress],
    difficulty: DIFFICULTY.tricky,
    wants: ['social'],
    success: [
      { say: '{Name} warms to you.', tone: 'good' },
      { token: { kind: 'social', n: 1, against: '{id}', label: 'you impressed {name}' } },
    ],
    failure: [{ say: '{Name} looks away, unmoved.' }, { mood: -1 }],
    strong: [{ say: '{Name} is quite taken with you.', tone: 'good' }, { mood: 2 }],
  },
  {
    ...social,
    id: 'distract',
    kind: 'humanoid',
    intention: 'distract',
    label: 'Keep {name} busy',
    skills: [...SKILL_SETS.distract],
    difficulty: DIFFICULTY.hard,
    success: [
      { say: '{Name} is thoroughly absorbed in you.', tone: 'good' },
      { token: { kind: 'sneak', n: 1, against: '{id}', label: '{name} is distracted' } },
      { token: { kind: 'pickpocket', n: 1, against: '{id}', label: '{name} is distracted' } },
    ],
    failure: [{ say: '{Name} sees straight through the show.' }, { mood: -1 }],
  },
  {
    ...social,
    id: 'ask',
    kind: 'humanoid',
    intention: 'ask',
    label: 'Ask {name} what they know',
    skills: [...SKILL_SETS.ask],
    difficulty: DIFFICULTY.tricky,
    wants: ['social'],
    success: [
      { say: '{Name} tells you what they know, which is a little more than nothing.', tone: 'good' },
      { set: 'asked:{id}' },
    ],
    failure: [{ say: '{Name} shrugs. Nothing useful.' }],
  },
  // Court Life: it depends who you do it to.
  {
    ...social,
    id: 'etiquette',
    kind: 'humanoid',
    intention: 'etiquette',
    label: 'Mind your court manners with {name}',
    skills: [...SKILL_SETS.etiquette],
    difficulty: DIFFICULTY.tricky,
    success: [{ say: '{Name} notices the manners, and does not know what to make of them.' }],
    failure: [{ say: 'Fine manners mean little to {name}.' }],
  },
  {
    ...social,
    id: 'etiquette-rich',
    kind: 'human',
    tag: 'rich',
    intention: 'etiquette',
    label: 'Mind your court manners with {name}',
    skills: [...SKILL_SETS.etiquette],
    difficulty: DIFFICULTY.tricky,
    wants: ['social'],
    success: [
      { say: '{Name} likes being treated as someone of standing.', tone: 'good' },
      { mood: 1 },
      { token: { kind: 'barter', n: 1, against: '{id}', label: 'flattered {name} with manners' } },
    ],
    failure: [{ say: '{Name} sniffs at the attempt.' }, { mood: -1 }],
    strong: [{ token: { kind: 'barter', n: 1, against: '{id}', label: 'flattered {name} no end' } }],
  },
  {
    ...social,
    id: 'etiquette-outcast',
    kind: 'outcast',
    intention: 'etiquette',
    label: 'Mind your court manners with {name}',
    skills: [...SKILL_SETS.etiquette],
    difficulty: DIFFICULTY.easy,
    // Easy to do and wrong either way: they hear mockery.
    success: [{ say: '{Name} takes your fine manners for mockery.', tone: 'bad' }, { mood: -2 }],
    failure: [{ say: '{Name} takes your fine manners for mockery.', tone: 'bad' }, { mood: -2 }],
  },
  {
    ...social,
    id: 'intimidate',
    kind: 'humanoid',
    intention: 'intimidate',
    label: 'Frighten {name}',
    skills: [...SKILL_SETS.threaten],
    difficulty: DIFFICULTY.hard,
    wants: ['social'],
    success: [{ say: '{Name} backs down, and will not forget it.', tone: 'good' }, { set: 'scared:{id}' }, { mood: -1 }],
    failure: [{ say: '{Name} is not frightened of you.', tone: 'bad' }, { mood: -2 }],
  },
  // Guards: on duty, armed, and not easily frightened.
  {
    ...social,
    id: 'intimidate-guard',
    kind: 'guard',
    intention: 'intimidate',
    label: 'Stare {name} down',
    skills: [...SKILL_SETS.threaten],
    difficulty: DIFFICULTY.veryHard,
    success: [
      { say: '{Name} gives ground, but his hand does not leave his weapon.', tone: 'good' },
      { set: 'scared:{id}' },
      { mood: -1 },
    ],
    failure: [{ say: '{Name} levels his weapon at you. "Move along."', tone: 'bad' }, { mood: -2 }],
  },
  // Outcasts talk more freely to someone who knows the street.
  {
    ...social,
    id: 'ask-street',
    kind: 'outcast',
    intention: 'ask',
    label: 'Talk shop with {name}',
    skills: [...SKILL_SETS.streetwise],
    difficulty: DIFFICULTY.easy,
    wants: ['social'],
    success: [
      { say: '{Name} tells you who runs what round here, and who to keep away from.', tone: 'good' },
      { set: 'asked:{id}' },
      { mood: 1 },
    ],
    failure: [{ say: '{Name} says nothing, and watches your hands.' }, { mood: -1 }],
  },
];

import { DIFFICULTY } from '../../core/checks';
import type { HookDef, Library } from '../../core/skillweb';
import { PEOPLE_KINDS, PEOPLE_LIBRARY } from '../people';
import { SKILL_SETS } from '../rollables';
import { OUTCOME_HOOKS } from './outcomes';
import { TALK_HOOKS } from './outcomes-talk';
import { THING_HOOKS, THING_KINDS } from './things';
import { RELATIONS } from './relations';
import { SOCIAL_HOOKS } from './social';

/**
 * The skill-web library (design: director/design/skill-web.md).
 * Kinds form a tree; a hook on a kind applies to everything below it.
 * Fill in skill by skill, one file per skill or family of skills, as the design's content pass describes.
 */
export const KIND_PARENTS: Library['parents'] = {
  thing: undefined,
  creature: 'thing',
  humanoid: 'creature',
  // The peoples (the creator's families).
  human: 'humanoid',
  dwarf: 'humanoid',
  elf: 'humanoid',
  tirak: 'humanoid',
  missla: 'humanoid',
  // Country folk: villages, roads and farms. (A town or city kind can sit beside it later.)
  rural: 'human',
  // Kinds of rural human.
  guard: 'rural',
  outcast: 'rural',
  animal: 'creature',
  feature: 'thing',
  rock: 'feature',
  plant: 'feature',
  structure: 'feature',
  fire: 'feature',
  item: 'thing',
  // Each people is a kind of its family: an Asharian is a kind of human (content/people).
  ...PEOPLE_KINDS,
  // Narrow kinds of thing, for the hooks on things (a wall, a lock, a tree, a stretch of water…).
  ...THING_KINDS,
};

/** The kinds that are peoples: what "your own kind" means. */
export const PEOPLES = ['human', 'dwarf', 'elf', 'tirak', 'missla'];

/** How many social tries each kind puts up with before they've had enough. */
export const KIND_DEFAULTS: Library['kindDefaults'] = {
  humanoid: { patience: 3 },
  guard: { patience: 4 },
  outcast: { patience: 2 },
};

const OBJECT_HOOKS: HookDef[] = [
  // Observation costs no talk: anyone can be read, and it doesn't make them like you less.
  {
    id: 'size-up',
    kind: 'humanoid',
    layer: 1,
    intention: 'size-up',
    label: 'Size up {name}',
    skills: [...SKILL_SETS.readPeople],
    difficulty: DIFFICULTY.hard,
    hidden: true,
    // The reading itself comes from readPerson: true on success, a plausible wrong one on failure.
    // Nothing here may tell success from failure.
    success: [{ set: 'read:{id}' }],
    failure: [{ set: 'read:{id}' }],
  },
  // Layer 2, object related: a rock can always be climbed or studied, useful or not.
  {
    id: 'climb',
    kind: 'rock',
    layer: 2,
    intention: 'climb',
    label: 'Climb {name}',
    skills: [...SKILL_SETS.climb],
    difficulty: DIFFICULTY.tricky,
    success: [{ say: 'You scramble up the {name} and look around from the top.' }],
    failure: [{ say: 'You slip off the {name} and land in the grass.' }],
  },
  {
    id: 'study',
    kind: 'rock',
    layer: 2,
    intention: 'study',
    label: 'Study {name}',
    // Geology isn't a skill in our list; Nature Lore stands in.
    skills: ['Naturlära'],
    difficulty: DIFFICULTY.tricky,
    hidden: true,
    // You get an answer either way; whether it is right is the thing you do not know.
    success: [{ say: 'You study the {name} with a trained eye. {lore}' }],
    failure: [{ say: 'You study the {name} with a trained eye. {lore}' }],
  },
];

export const LIBRARY: Library = {
  parents: KIND_PARENTS,
  hooks: [...OBJECT_HOOKS, ...THING_HOOKS, ...SOCIAL_HOOKS, ...OUTCOME_HOOKS, ...TALK_HOOKS],
  kindDefaults: KIND_DEFAULTS,
  peoples: PEOPLES,
  relations: RELATIONS,
  people: PEOPLE_LIBRARY,
};

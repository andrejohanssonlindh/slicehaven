import { DIFFICULTY } from '../../core/checks';
import type { HookDef, Library } from '../../core/skillweb';
import { SKILL_SETS } from '../rollables';
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
    success: [
      { say: 'You watch {name} closely and get a feel for how they carry themselves.', tone: 'good' },
      { set: 'read:{id}' },
    ],
    failure: [{ say: '{Name} gives nothing away.' }],
    strong: [{ say: 'You catch a small tell: something {name} would rather keep to themselves.', tone: 'good' }],
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
    success: [{ say: 'You look at the {name} with a trained eye. Nothing remarkable, but you know what it is made of.' }],
    failure: [{ say: 'Stone is stone. You learn nothing from the {name}.' }],
  },
];

export const LIBRARY: Library = {
  parents: KIND_PARENTS,
  hooks: [...OBJECT_HOOKS, ...SOCIAL_HOOKS],
  kindDefaults: KIND_DEFAULTS,
  peoples: PEOPLES,
  relations: RELATIONS,
};

import { DIFFICULTY } from '../../core/checks';
import type { Library } from '../../core/skillweb';
import { SKILL_SETS } from '../rollables';

/**
 * The skill-web library (design: director/design/skill-web.md).
 * Kinds form a tree; a hook on a kind applies to everything below it.
 * Only a few examples so far: the shape is what's being tested. Fill in skill
 * by skill, one file per skill, as the design's content pass describes.
 */
export const KIND_PARENTS: Library['parents'] = {
  thing: undefined,
  creature: 'thing',
  humanoid: 'creature',
  human: 'humanoid',
  dwarf: 'humanoid',
  elf: 'humanoid',
  tirak: 'humanoid',
  animal: 'creature',
  feature: 'thing',
  rock: 'feature',
  plant: 'feature',
  structure: 'feature',
  fire: 'feature',
  item: 'thing',
};

export const LIBRARY: Library = {
  parents: KIND_PARENTS,
  hooks: [
    // Layer 1, standard: anyone with a mind can be read.
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
  ],
};

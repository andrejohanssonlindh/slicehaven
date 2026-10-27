import type { Library } from '../../core/skillweb';
import { PEOPLE_KINDS } from '../people';

/**
 * The kind tree: what a thing *is*. A hook on a kind applies to everything below it.
 * Only what a thing is made as goes here (a human, an animal, a door, water). Who a person is
 * socially (a guard, country folk, a beggar, drunk, on duty) is a facet in content/people, never a kind.
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
  animal: 'creature',
  feature: 'thing',
  rock: 'feature',
  plant: 'feature',
  tree: 'plant',
  structure: 'feature',
  // Narrow kinds of structure and item for the hooks on things. Hooks go on these, never on the broad
  // `structure` or `item`, because a scene's own palisade or cart has rules of its own.
  wall: 'structure',
  door: 'structure',
  lock: 'structure',
  fire: 'feature',
  water: 'feature',
  gap: 'feature',
  trail: 'feature',
  item: 'thing',
  food: 'item',
  tool: 'item',
  container: 'item',
  // Each people is a kind of its family: an Asharian is a kind of human (content/people).
  ...PEOPLE_KINDS,
};

/** The kinds that are peoples: what "your own kind" means. */
export const PEOPLES = ['human', 'dwarf', 'elf', 'tirak', 'missla'];

/** How many social tries someone puts up with before they've had enough, by facet or kind. */
export const DEFAULTS: Library['defaults'] = {
  humanoid: { patience: 3 },
  'job-guard': { patience: 4 },
  poor: { patience: 2 },
};

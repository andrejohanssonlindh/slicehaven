import { DIFFICULTY } from '../../../core/checks';
import type { HookDef } from '../../../core/skillweb';
import { LORE, READ, effortHooks, flag, say } from './helpers';

/**
 * Make & mend: repairing and judging made things. Mending is narrowed to the crafts that fix walls,
 * doors, tools and containers (a baker does not mend a door); judging a wall to the builders.
 */
const craft = effortHooks('craft', { layer: 2, difficulty: DIFFICULTY.tricky });

const MENDERS = ['H:Snickare', 'H:Klensmed', 'H:Grovsmed', 'H:Murare', 'H:Lädermakare', 'H:Skräddare', 'H:Repslagare', 'H:Timmerman', 'H:Byggare', 'E:Lappa & laga'];
const BUILDERS = ['H:Arkitekt', 'H:Byggare', 'H:Murare', 'H:Stenhuggare', 'H:Timmerman', 'H:Snickare'];

export const CRAFT: HookDef[] = [
  craft.forKind('wall', 'Mend the {name}',
    [say('You patch the {name} until it will do, and a little better.', 'good'), flag('mended')],
    [say('The patch will not hold, and you must start again.')], { only: MENDERS }),
  craft.forKind('door', 'Mend the {name}',
    [say('The {name} hangs true again.', 'good'), flag('mended')], [say('You cannot get the {name} to sit right.')], { only: MENDERS }),
  craft.forKind('tool', 'Mend the {name}',
    [say('The {name} is as good as it was, or very nearly.', 'good'), flag('mended')], [say('You cannot make the {name} sit right.')], { only: MENDERS }),
  craft.forKind('container', 'Mend the {name}',
    [say('The {name} is sound again.', 'good'), flag('mended')], [say('The {name} still leaks.')], { only: MENDERS }),
  craft.forKind('wall', 'Study the {name}', LORE, LORE, { ...READ, only: BUILDERS, also: ['Kalkylera', 'Historia', 'E:Bergskunskap'] }),
];

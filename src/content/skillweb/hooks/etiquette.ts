import { DIFFICULTY } from '../../../core/checks';
import type { HookDef } from '../../../core/skillweb';
import { TALK, effortHooks, keep, say } from './helpers';

/** Etiquette: manners, rank and who bows to whom. It depends entirely on who you do it to. */
const etiquette = effortHooks('etiquette', { ...TALK, difficulty: DIFFICULTY.tricky });

export const ETIQUETTE: HookDef[] = [
  etiquette.general('Mind your court manners with {name}',
    [say('{Name} notices the manners, and does not know what to make of them.')],
    [say('Fine manners mean little to {name}.')]),

  etiquette.forFacet('rich', 'Mind your court manners with {name}',
    [say('{Name} likes being treated as someone of standing.', 'good'), { mood: 1 }, keep('bribe', 1, 'flattered {name} with manners')],
    [say('{Name} sniffs at the attempt.'), { mood: -1 }],
    { strong: [keep('bribe', 1, 'flattered {name} no end')] }),
  // Easy to do and wrong either way: they hear mockery.
  etiquette.forFacet('poor', 'Mind your court manners with {name}',
    [say('{Name} takes your fine manners for mockery.', 'bad'), { mood: -2 }],
    [say('{Name} takes your fine manners for mockery.', 'bad'), { mood: -2 }],
    { difficulty: DIFFICULTY.easy }),
];

import { DIFFICULTY } from '../../../core/checks';
import type { HookDef } from '../../../core/skillweb';
import { effortHooks, keep, say } from './helpers';

/**
 * Steal: take something off a person unnoticed. Not a talk, so it costs none of their patience, but it
 * spends the `steal` advantage that distract earns. A success sets `stolen:{id}`; a failure sets
 * `suspicious:{id}` and the person turns hostile.
 */
const steal = effortHooks('steal', { wants: ['steal'], difficulty: DIFFICULTY.hard });

const caught = (text: string) => [say(text), { mood: -2 }, { set: 'suspicious:{id}' }];
const lifted = (text: string) => [say(text, 'good'), { set: 'stolen:{id}' }];

export const STEAL: HookDef[] = [
  steal.general('Pick {name}\'s pocket',
    lifted('Your hand comes away fuller than it went in. {Name} does not notice.'),
    caught('{Name} catches your wrist and shouts.')),

  steal.forFacet('martial', 'Lift something from {name}',
    lifted('A buckle, a coin, a token: gone before the next breath.'),
    caught('{Name} has you by the collar before your hand clears the belt.'),
    { difficulty: DIFFICULTY.veryHard }),
  steal.forFacet('merchant', 'Lift something from {name}',
    lifted('The purse is lighter than it was. {Name} counts the till twice and gets the same number.'),
    caught('{Name} counts the till, then counts your fingers.'),
    { difficulty: DIFFICULTY.veryHard }),
  steal.forFacet('nobility', 'Lift something from {name}',
    lifted('A ring slides off easily; {Name} has never had to guard a finger.'),
    caught('{Name} calls for guards in a voice trained to carry.'),
    { difficulty: DIFFICULTY.hard }),
  steal.forFacet('clergy', 'Lift something from {name}',
    lifted('Something small and holy leaves with you. You may regret it.'),
    caught('{Name} gasps. The word "sacrilege" is used.')),
  steal.forFacet('underworld', 'Lift something from {name}',
    lifted('Your hand is quick and theirs is quicker, but yours got there first.'),
    caught('{Name} already has a hand on your wrist. They were waiting.'),
    { difficulty: DIFFICULTY.veryHard }),
  steal.forFacet('servile', 'Lift something from {name}',
    lifted('There is little to take, but you take it.'),
    caught('{Name} yelps, and others come running.')),
  steal.forFacet('performer', 'Lift something from {name}',
    lifted('{Name} is busy with a flourish, and does not see your own.'),
    caught('{Name} turns the theft into a trick, and the crowd cheers while you are held.'),
    { difficulty: DIFFICULTY.hard }),
  steal.forFacet('child', 'Lift something from {name}',
    lifted('A bright thing leaves a small pocket. You tell yourself it was a trade.'),
    caught('{Name} screams, and so do several nearby adults.'),
    { difficulty: DIFFICULTY.tricky }),
  steal.forFacet('elder', 'Lift something from {name}',
    lifted('{Name} dozes through it.'),
    caught('{Name} rattles a stick against your shins.'),
    { difficulty: DIFFICULTY.tricky }),
  steal.forFacet('drunk', 'Lift something from {name}',
    lifted('{Name} sways, and a purse comes loose with no effort at all.'),
    caught('{Name} grabs you and asks, loudly, if you are the thief.'),
    { difficulty: DIFFICULTY.tricky }),
  steal.forFacet('market', 'Lift something from {name}',
    [say('In the press, no one knows whose hand is whose.', 'good'), { set: 'stolen:{id}' }, keep('sneak', 1, 'you slipped away in the crowd')],
    caught('"Thief!" The cry runs through the stalls.'),
    { difficulty: DIFFICULTY.tricky }),
];

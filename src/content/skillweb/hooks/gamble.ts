import { DIFFICULTY } from '../../../core/checks';
import type { HookDef } from '../../../core/skillweb';
import { TALK, effortHooks, keep, say } from './helpers';

/**
 * Gamble: a game for stakes. A loss costs a share of your silver; a win has no purse yet (the scene
 * has no way to pay out), so it earns goodwill, and a kept advantage with traders.
 */
const gamble = effortHooks('gamble', { ...TALK, difficulty: DIFFICULTY.tricky });
const lose = (text: string, share = 0.1) => [say(text), { loseSilver: share, why: 'lost at play' }];

export const GAMBLE: HookDef[] = [
  gamble.general('Offer {name} a game',
    [say('You play a few rounds and come out ahead. {Name} pays up with a rueful grin.', 'good'), { mood: 1 }],
    lose('The dice favour {name} tonight. Your purse is lighter.')),

  gamble.forFacet('martial', 'Offer {name} a game',
    [say('{Name} plays hard and loses well, which soldiers respect.', 'good'), { mood: 1 }, keep('social', 1, 'you played fair with {name}')],
    lose('{Name} has had plenty of dull nights in camp to practise.')),
  gamble.forFacet('merchant', 'Offer {name} a wager',
    [say('{Name} is too fond of a bargain to refuse, and too fond of winning to stop in time.', 'good'), keep('bribe', 1, '{name} owes you a favour')],
    lose('{Name} knows the odds to the last copper.', 0.15),
    { difficulty: DIFFICULTY.hard }),
  gamble.forFacet('underworld', 'Offer {name} a game',
    [say('You win, narrowly, and {name} is not sure they were not cheated. They respect it.', 'good'), { mood: 1 }],
    lose('The dice are not quite honest. You lose, and cannot say so.', 0.15),
    { difficulty: DIFFICULTY.hard }),
  gamble.forFacet('nobility', 'Offer {name} a wager',
    [say('{Name} wagers a sum they will not miss, and pays it without noticing.', 'good'), { mood: 1 }],
    lose('{Name} wagers a sum you can ill afford, and wins it.', 0.2),
    { difficulty: DIFFICULTY.hard }),
  gamble.forFacet('clergy', 'Offer {name} a game',
    [say('{Name} declines the stakes but allows a game for nothing, and enjoys it more than they should.', 'good'), { mood: 1 }],
    [say('{Name} says gaming is a vice, and a dull one.'), { mood: -1 }],
    { difficulty: DIFFICULTY.hard }),
  gamble.forFacet('seafaring', 'Offer {name} a game',
    [say('{Name} deals a ship\'s game with rules nobody on land would know. You catch on, just.', 'good'), { mood: 1 }],
    lose('Every rule has an exception, and {name} knows all of them.')),
  gamble.forFacet('drunk', 'Offer {name} a game',
    [say('{Name} loses with great good cheer, and offers to double the stake.', 'good'), { mood: 1 }],
    lose('{Name} wins by accident and celebrates by buying a round with your money.', 0.05),
    { difficulty: DIFFICULTY.easy }),
  gamble.forFacet('child', 'Play a game with {name}',
    [say('{Name} shrieks with laughter, loses fairly, and demands another.', 'good'), { mood: 1 }],
    [say('{Name} wins, and makes sure everyone knows.')],
    { difficulty: DIFFICULTY.easy }),
  gamble.forFacet('tavern', 'Join the game at the table',
    [say('The table makes room. You leave a little richer and a little better known.', 'good'), { mood: 1 }, keep('social', 1, 'you won a place at the table')],
    lose('The table has seen your sort before, and takes your coin.')),
  gamble.forFacet('wanderer', 'Offer {name} a game',
    [say('{Name} learned this game in three countries and teaches you the fourth, at your expense and their delight.', 'good'), { mood: 1 }],
    lose('{Name} makes a small living at this.')),
  gamble.forFacet('on-duty', 'Offer {name} a game',
    [say('{Name} glances about, then slips a few rounds in.', 'good')],
    [say('{Name} says not while on duty, and means it.'), { mood: -1 }],
    { difficulty: DIFFICULTY.veryHard }),
];

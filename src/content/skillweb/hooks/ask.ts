import { DIFFICULTY } from '../../../core/checks';
import type { Effect } from '../../../core/scene';
import type { HookDef } from '../../../core/skillweb';
import { TALK, effortHooks, keep, say } from './helpers';

/**
 * Ask: getting someone to tell you things. Every success sets `asked:{id}`, however the person answers,
 * so anything in a scene that waits for it still works (a test checks).
 */
const ask = effortHooks('ask', { ...TALK, difficulty: DIFFICULTY.tricky });
/** Asking the poor and rootless goes better with streetwise than with charm: a different effort in the same slot. */
const street = effortHooks('streetwise', { ...TALK, intention: 'ask', difficulty: DIFFICULTY.easy });

const told = (...e: Effect[]): Effect[] => [...e, { set: 'asked:{id}' }];

export const ASK: HookDef[] = [
  ask.general('Ask {name} what they know',
    told(say('{Name} tells you what they know, which is a little more than nothing.', 'good')),
    [say('{Name} shrugs. Nothing useful.')]),

  street.forFacet('poor', 'Talk shop with {name}',
    told(say('{Name} tells you who runs what round here, and who to keep away from.', 'good'), { mood: 1 }),
    [say('{Name} says nothing, and watches your hands.'), { mood: -1 }]),

  ask.forFacet('nobility', 'Ask {name} what they know',
    told(say('{Name} answers as one dictating to a clerk: briefly, and as if it were a favour.', 'good'), keep('social', 1, '{name} told you what they would tell few')),
    [say('{Name} does not discuss such matters with strangers.'), { mood: -1 }]),
  ask.forFacet('clergy', 'Ask {name} what they know',
    told(say('{Name} tells you what the faith allows, and a little more when you look troubled.', 'good')),
    [say('{Name} suggests you take the question to the shrine.')]),
  ask.forFacet('martial', 'Ask {name} what they know',
    told(say('{Name} tells you what is safe to know: who has passed, and how the road lies.', 'good')),
    [say('"Orders," says {name}, and that is all.')]),
  ask.forFacet('officialdom', 'Ask {name} what they know',
    told(say('{Name} finds the right page, and the right words to explain what it says.', 'good')),
    [say('{Name} says it must be put in writing, and that takes a month.')]),
  ask.forFacet('merchant', 'Ask {name} what they know',
    told(say('{Name} trades you the news: where prices are rising, and who has stopped paying.', 'good'), keep('bribe', 1, '{name} owes you a little for the news')),
    [say('{Name} mentions that information has a price, and goes back to the till.')]),
  ask.forFacet('learned', 'Ask {name} what they know',
    told(say('{Name} brightens, and gives you more than you asked for, with references.', 'good')),
    [say('{Name} says it is a long question and suggests several books.')]),
  ask.forFacet('underworld', 'Ask {name} what they know',
    told(say('{Name} tells you where to look, and that you never heard it from them.', 'good')),
    [say('{Name} says nothing, and watches your hands.'), { mood: -1 }],
    { difficulty: DIFFICULTY.hard }),
  ask.forFacet('servile', 'Ask {name} what they know',
    told(say('{Name} looks about and whispers what they have overheard, which is a great deal.', 'good'), keep('social', 1, '{name} trusts you with what they overheard')),
    [say('{Name} is afraid to say. They shake their head and hurry off.')]),
  ask.forFacet('performer', 'Ask {name} what they know',
    told(say('{Name} gossips with relish, and with some art.', 'good'), { mood: 1 }),
    [say('{Name} tells a very good story, and none of it answers your question.')]),
  ask.forFacet('landworker', 'Ask {name} what they know',
    told(say('{Name} tells you who passed, which animals have been about, and what the weather will do.', 'good')),
    [say('{Name} looks at you for a while, and then at the sky.')]),
  ask.forFacet('seafaring', 'Ask {name} what they know',
    told(say('{Name} has tidings from half a dozen ports, and is glad of an audience.', 'good')),
    [say('{Name} says a landsman would not understand.')]),
  ask.forFacet('wanderer', 'Ask {name} what they know',
    told(say('{Name} trades news for news and is fair about it.', 'good'), keep('social', 1, '{name} owes you a piece of news')),
    [say('{Name} has not been this way, and cannot help.')]),
  ask.forFacet('child', 'Ask {name} what they know',
    told(say('{Name} tells you everything at once, and some of it is true.', 'good')),
    [say('{Name} says they are not allowed to talk to strangers, and runs.')]),
  ask.forFacet('elder', 'Ask {name} what they know',
    told(say('{Name} starts a long story. The answer is in it, if you can wait.', 'good'), { mood: 1 }),
    [say('{Name} does not remember, or says so.')]),
  ask.forFacet('drunk', 'Ask {name} what they know',
    told(say('{Name} tells you more than they know, and some that is not so.', 'good')),
    [say('{Name} loses the thread and begins to sing.')],
    { difficulty: DIFFICULTY.easy }),
  ask.forFacet('afraid', 'Ask {name} what they know',
    told(say('{Name} whispers it all, glancing at the door.', 'good'), keep('social', 1, '{name} is too frightened to hold back')),
    [say('{Name} is too frightened to speak.')]),
  ask.forFacet('tavern', 'Ask {name} what they know',
    told(say('{Name} leans over the bar, and so does someone else, and between them it comes out.', 'good')),
    [say('{Name} wipes a cup, and says it is a busy night.')]),
];

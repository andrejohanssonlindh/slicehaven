import { DIFFICULTY } from '../../../core/checks';
import type { HookDef } from '../../../core/skillweb';
import { TALK, effortHooks, keep, say } from './helpers';

/** Teach: passing something on so it sticks. Mostly for companions later; for now it earns goodwill. */
const teach = effortHooks('teach', { ...TALK, difficulty: DIFFICULTY.tricky });

export const TEACH: HookDef[] = [
  teach.general('Show {name} how',
    [say('{Name} gets it, tries it, and gets it again.', 'good'), { mood: 1 }, keep('social', 1, '{name} learned from you')],
    [say('{Name} nods politely, and does it wrong.')]),

  teach.forFacet('child', 'Show {name} how',
    [say('{Name} takes it as a game, and will not leave you alone until you show them the next thing.', 'good'), { mood: 1 }],
    [say('{Name} wanders off in the middle.')],
    { difficulty: DIFFICULTY.easy }),
  teach.forFacet('elder', 'Show {name} how',
    [say('{Name} says they had an easier way, then sees yours is better.', 'good'), { mood: 1 }],
    [say('{Name} says they have done it their way for fifty years.'), { mood: -1 }],
    { difficulty: DIFFICULTY.hard }),
  teach.forFacet('learned', 'Show {name} how',
    [say('{Name} asks three questions you can answer, and one you cannot.', 'good'), { mood: 1 }],
    [say('{Name} asks for the source, and you have none.')]),
  teach.forFacet('martial', 'Show {name} how',
    [say('{Name} drills it until it is a reflex, and thanks you curtly.', 'good'), { mood: 1 }, keep('social', 1, '{name} owes you a lesson')],
    [say('{Name} says that is not how it is done in their unit.')]),
  teach.forFacet('servile', 'Show {name} how',
    [say('{Name} listens, wide-eyed. Nobody taught them anything before.', 'good'), { mood: 1 }, keep('social', 1, '{name} is grateful')],
    [say('{Name} is afraid of getting it wrong, and so does.')]),
  teach.forFacet('landworker', 'Show {name} how',
    [say('{Name} watches, takes the tool, and has it in a minute.', 'good'), { mood: 1 }],
    [say('{Name} says words are no good, and wants to see it done.')]),
  teach.forFacet('clergy', 'Instruct {name}',
    [say('{Name} welcomes it as a point of discipline.', 'good'), { mood: 1 }],
    [say('{Name} says they have a teacher already, and a long way to go.')]),
  teach.forFacet('nobility', 'Instruct {name}',
    [say('{Name} pretends to have known it all along, which is a kind of learning.', 'good'), { mood: 1 }],
    [say('{Name} is not in the habit of being instructed.'), { mood: -1 }],
    { difficulty: DIFFICULTY.hard }),
  teach.forFacet('drunk', 'Show {name} how',
    [say('{Name} gets it perfectly, and will have forgotten by dawn.', 'good')],
    [say('{Name} agrees warmly, and does it wrong.')],
    { difficulty: DIFFICULTY.hard }),
  teach.forFacet('afraid', 'Show {name} how',
    [say('Having something to do steadies {name}. They learn fast.', 'good'), { mood: 1 }],
    [say('{Name} cannot hold on to a word.')]),
];

import { DIFFICULTY } from '../../../core/checks';
import type { HookDef } from '../../../core/skillweb';
import { TALK, effortHooks, keep, say } from './helpers';

/** Comfort: calming and steadying someone. Easiest on those who are hurting; worth little to those who are not. */
const comfort = effortHooks('comfort', { ...TALK, difficulty: DIFFICULTY.tricky });

export const COMFORT: HookDef[] = [
  comfort.general('Comfort {name}',
    [say('{Name} breathes out, and the shoulders come down a little.', 'good'), { mood: 1 }],
    [say('{Name} says they are fine, which is not so.')]),

  comfort.forFacet('grieving', 'Sit with {name}',
    [say('You say little. {Name} says a great deal, and is glad of someone who listens.', 'good'), { mood: 1 }, keep('social', 1, 'you sat with {name} in their grief')],
    [say('{Name} wants to be left alone with it.')],
    { difficulty: DIFFICULTY.hard }),
  comfort.forFacet('afraid', 'Calm {name}',
    [say('{Name} stops shaking, and starts thinking again.', 'good'), { mood: 1 }, keep('social', 1, '{name} is steadier for your calm')],
    [say('{Name} is still looking at the door.')]),
  comfort.forFacet('ill', 'Ease {name}',
    [say('{Name} manages a smile, and for a while the pain is not everything.', 'good'), { mood: 1 }],
    [say('{Name} turns their face to the wall.')]),
  comfort.forFacet('angry', 'Cool {name} down',
    [say('{Name} sits down, heavily, and says they did not mean most of it.', 'good'), { mood: 1 }],
    [say('{Name} shouts that they do not need to be calmed.'), { mood: -1 }],
    { difficulty: DIFFICULTY.hard }),
  comfort.forFacet('drunk', 'Settle {name}',
    [say('{Name} sighs, leans on you, and begins to nod off.', 'good')],
    [say('{Name} cries on your shoulder, then insists you are the one in need of comfort.')],
    { difficulty: DIFFICULTY.easy }),
  comfort.forFacet('child', 'Soothe {name}',
    [say('{Name} sniffs, wipes a nose on a sleeve, and holds on to your hand.', 'good'), { mood: 1 }],
    [say('{Name} cries harder.')],
    { difficulty: DIFFICULTY.easy }),
  comfort.forFacet('elder', 'Cheer {name}',
    [say('{Name} says that kind words warm better than a fire.', 'good'), { mood: 1 }],
    [say('{Name} says they have outlived worse.')]),
  comfort.forFacet('martial', 'Steady {name}',
    [say('{Name} nods once and squares up. It is enough.', 'good'), { mood: 1 }],
    [say('{Name} says a soldier does not need comforting.'), { mood: -1 }],
    { difficulty: DIFFICULTY.hard }),
  comfort.forFacet('clergy', 'Comfort {name}',
    [say('{Name} is surprised to be the one who is comforted, and grateful.', 'good'), { mood: 1 }],
    [say('{Name} reassures you instead, kindly, and the moment passes.')]),
  comfort.forFacet('servile', 'Comfort {name}',
    [say('{Name} cannot remember the last time anyone asked how they were.', 'good'), { mood: 1 }, keep('social', 1, 'you were kind to {name}')],
    [say('{Name} says they must not stop, and hurries on.')]),
  comfort.forFacet('nobility', 'Comfort {name}',
    [say('{Name} allows it, which for them is a great deal.', 'good'), { mood: 1 }],
    [say('{Name} says such a display is unbecoming, and means theirs.')],
    { difficulty: DIFFICULTY.hard }),
];

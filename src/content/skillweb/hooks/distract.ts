import { DIFFICULTY } from '../../../core/checks';
import type { HookDef } from '../../../core/skillweb';
import { TALK, effortHooks, keep, say } from './helpers';

/**
 * Distract: holding attention while something else happens. What it earns is a kept advantage for the
 * sneaking or stealing that follows (`sneak`, `steal`), not goodwill.
 */
const distract = effortHooks('distract', { ...TALK, difficulty: DIFFICULTY.hard });

export const DISTRACT: HookDef[] = [
  distract.general('Keep {name} busy',
    [say('{Name} is thoroughly absorbed in you.', 'good'), keep('sneak', 1, '{name} is distracted'), keep('steal', 1, '{name} is distracted')],
    [say('{Name} sees straight through the show.'), { mood: -1 }]),

  distract.forFacet('martial', 'Keep {name} busy',
    [say('{Name} turns to you, but only part of the way. One eye stays on the road.', 'good'), keep('sneak', 1, '{name} is half distracted')],
    [say('{Name} notes your face, and the fact that you tried.'), { mood: -1 }, { set: 'suspicious:{id}' }],
    { difficulty: DIFFICULTY.veryHard }),
  distract.forFacet('officialdom', 'Keep {name} busy',
    [say('{Name} loses the place in the ledger, and starts again, muttering. They do not look up.', 'good'), keep('sneak', 1, '{name} is lost in the paperwork')],
    [say('{Name} sighs, and waves you to the back of the line.')]),
  distract.forFacet('merchant', 'Keep {name} busy',
    [say('{Name} is absorbed in a sale you have no intention of completing.', 'good'), keep('steal', 1, '{name} is busy haggling'), keep('sneak', 1, '{name} is busy haggling')],
    [say('{Name} knows a browser from a buyer, and watches the till.'), { mood: -1 }]),
  distract.forFacet('clergy', 'Keep {name} busy',
    [say('{Name} cannot resist a question of conscience, and takes it seriously.', 'good'), keep('sneak', 1, '{name} is thinking over your question')],
    [say('{Name} reproves you, gently, for trying to waste their time.'), { mood: -1 }]),
  distract.forFacet('performer', 'Keep {name} busy',
    [say('{Name} loves an audience, and does not mind who it is.', 'good'), keep('sneak', 1, '{name} is performing'), keep('steal', 1, '{name} is performing')],
    [say('{Name} knows a distraction when they use one. They smile, and keep an eye on your hands.')]),
  distract.forFacet('child', 'Keep {name} busy',
    [say('{Name} is absorbed at once, and has forgotten why they were there.', 'good'), keep('sneak', 1, '{name} forgot all about it'), keep('steal', 1, '{name} forgot all about it')],
    [say('{Name} looks at you, and then at what you are trying to hide.')],
    { difficulty: DIFFICULTY.tricky }),
  distract.forFacet('drunk', 'Keep {name} busy',
    [say('{Name} is delighted by anything and everything, and tells you so.', 'good'), keep('sneak', 1, '{name} is happily absorbed'), keep('steal', 1, '{name} is happily absorbed')],
    [say('{Name} sways, and for a moment looks at you very straight.')],
    { difficulty: DIFFICULTY.tricky }),
  distract.forFacet('crowd', 'Keep {name} busy',
    [say('Nobody is watching anyone in particular, and {name} is no exception.', 'good'), keep('sneak', 1, 'the crowd is looking elsewhere'), keep('steal', 1, 'the crowd is looking elsewhere')],
    [say('{Name} looks around, a little puzzled, and moves on.')],
    { difficulty: DIFFICULTY.tricky }),
];

import { DIFFICULTY } from '../../../core/checks';
import type { HookDef } from '../../../core/skillweb';
import { TALK, effortHooks, keep, say } from './helpers';

/** Threaten: fear, size and a hard voice. Success sets `scared:{id}`; it never makes them like you. */
const threaten = effortHooks('threaten', { ...TALK, difficulty: DIFFICULTY.hard });

export const THREATEN: HookDef[] = [
  threaten.general('Frighten {name}',
    [say('{Name} backs down, and will not forget it.', 'good'), { set: 'scared:{id}' }, { mood: -1 }],
    [say('{Name} is not frightened of you.', 'bad'), { mood: -2 }]),

  // Guards: on duty, armed, and not easily frightened.
  threaten.forFacet('job-guard', 'Stare {name} down',
    [say('{Name} gives ground, but his hand does not leave his weapon.', 'good'), { set: 'scared:{id}' }, { mood: -1 }],
    [say('{Name} levels his weapon at you. "Move along."', 'bad'), { mood: -2 }],
    { difficulty: DIFFICULTY.veryHard }),
  threaten.forFacet('nobility', 'Make {name} afraid',
    [say('{Name} goes white, then red. They yield, and a name has been added to a list.', 'good'), { set: 'scared:{id}' }, { mood: -2 }],
    [say('{Name} says one word, quietly, and someone starts to move toward you.', 'bad'), { mood: -2 }],
    { difficulty: DIFFICULTY.veryHard }),
  threaten.forFacet('clergy', 'Frighten {name}',
    [say('{Name} makes a sign against you and gives way, praying under their breath.', 'good'), { set: 'scared:{id}' }, { mood: -2 }],
    [say('{Name} begins a prayer, calm and clear, and is not afraid of you at all.', 'bad'), { mood: -2 }]),
  threaten.forFacet('martial', 'Square up to {name}',
    [say('{Name} gives ground a step, though never his eyes.', 'good'), { set: 'scared:{id}' }, { mood: -1 }],
    [say('{Name}\'s hand goes to a weapon. "Try it."', 'bad'), { mood: -2 }, { set: 'steel:{id}' }],
    { difficulty: DIFFICULTY.veryHard }),
  threaten.forFacet('merchant', 'Lean on {name}',
    [say('{Name} sweats, and finds a way to be more helpful. The price drops.', 'good'), { set: 'scared:{id}' }, { mood: -1 }, keep('bribe', 1, '{name} wants no trouble')],
    [say('{Name} calmly mentions the watch, and which of them is a friend.', 'bad'), { mood: -2 }]),
  threaten.forFacet('learned', 'Frighten {name}',
    [say('{Name} calls you a brute, loudly, but does what you want.', 'good'), { set: 'scared:{id}' }, { mood: -2 }],
    [say('{Name} points out, as to a slow pupil, what the law makes of threats.', 'bad'), { mood: -2 }]),
  threaten.forFacet('arcane', 'Threaten {name}',
    [say('{Name} yields, but not to you: to the risk of what the two of you might start.', 'good'), { set: 'scared:{id}' }, { mood: -2 }],
    [say('{Name} smiles thinly and the air in the room goes a little colder.', 'bad'), { mood: -2 }],
    { difficulty: DIFFICULTY.veryHard }),
  threaten.forFacet('underworld', 'Threaten {name}',
    [say('{Name} shrugs, and tells you what you want, to be rid of you.', 'good'), { set: 'scared:{id}' }, { mood: -1 }],
    [say('{Name} laughs. They have met worse than you, and been paid by some.', 'bad'), { mood: -2 }]),
  threaten.forFacet('servile', 'Frighten {name}',
    [say('{Name} cowers and will tell you anything.', 'good'), { set: 'scared:{id}' }, { mood: -1 }, keep('social', 1, '{name} is terrified of you')],
    [say('{Name} bursts into tears and calls for help.', 'bad'), { mood: -2 }],
    { difficulty: DIFFICULTY.tricky }),
  threaten.forFacet('elder', 'Frighten {name}',
    [say('{Name} is hurt more than frightened, and gives way with a look that stays with you.', 'good'), { set: 'scared:{id}' }, { mood: -2 }],
    [say('{Name} gives you a long look. "I have buried better men."', 'bad'), { mood: -2 }]),
  threaten.forFacet('afraid', 'Frighten {name}',
    [say('{Name} is already shaking, and tells you everything at once.', 'good'), { set: 'scared:{id}' }, { mood: -1 }, keep('social', 1, '{name} is beside themself')],
    [say('{Name} flinches, but there is nothing left to take.', 'bad'), { mood: -1 }],
    { difficulty: DIFFICULTY.tricky }),
];

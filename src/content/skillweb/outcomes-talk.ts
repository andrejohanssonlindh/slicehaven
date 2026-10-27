import { DIFFICULTY } from '../../core/checks';
import type { Effect } from '../../core/scene';
import type { HookDef } from '../../core/skillweb';
import { SKILL_SETS } from '../rollables';
import { keep, say, social } from './outcomes';

/**
 * More library hooks by type of person (see outcomes.ts): asking, making a case, and keeping someone
 * busy. Asking always sets `asked:{id}` on success, like the general hook, so anything in a scene that
 * waits for it still works however the person answers. Bribing is not here: there is no general
 * bribe hook (it lives in the conflicts), and the leanings already make it easier or harder.
 */
const asked: Effect = { set: 'asked:{id}' };

const ask = (facet: string, label: string, success: Effect[], failure: Effect[], over: Partial<HookDef> = {}): HookDef => ({
  ...social, id: `ask-${facet}`, facet, intention: 'ask', label, skills: [...SKILL_SETS.ask],
  difficulty: DIFFICULTY.tricky, success: [...success, asked], failure, ...over,
});

const persuade = (facet: string, label: string, success: Effect[], failure: Effect[], over: Partial<HookDef> = {}): HookDef => ({
  ...social, id: `persuade-${facet}`, facet, intention: 'persuade', label, skills: [...SKILL_SETS.argue],
  difficulty: DIFFICULTY.tricky, success, failure, ...over,
});

const distract = (facet: string, label: string, success: Effect[], failure: Effect[], over: Partial<HookDef> = {}): HookDef => ({
  ...social, id: `distract-${facet}`, facet, intention: 'distract', label, skills: [...SKILL_SETS.distract],
  difficulty: DIFFICULTY.hard, success, failure, ...over,
});

export const ASK_HOOKS: HookDef[] = [
  ask('nobility', 'Ask {name} what they know',
    [say('{Name} answers as one dictating to a clerk: briefly, and as if it were a favour.', 'good'), keep('social', 1, '{name} told you what they would tell few')],
    [say('{Name} does not discuss such matters with strangers.'), { mood: -1 }]),
  ask('clergy', 'Ask {name} what they know',
    [say('{Name} tells you what the faith allows, and a little more when you look troubled.', 'good')],
    [say('{Name} suggests you take the question to the shrine.')]),
  ask('martial', 'Ask {name} what they know',
    [say('{Name} tells you what is safe to know: who has passed, and how the road lies.', 'good')],
    [say('"Orders," says {name}, and that is all.')]),
  ask('officialdom', 'Ask {name} what they know',
    [say('{Name} finds the right page, and the right words to explain what it says.', 'good')],
    [say('{Name} says it must be put in writing, and that takes a month.')]),
  ask('merchant', 'Ask {name} what they know',
    [say('{Name} trades you the news: where prices are rising, and who has stopped paying.', 'good'), keep('barter', 1, '{name} owes you a little for the news')],
    [say('{Name} mentions that information has a price, and goes back to the till.')]),
  ask('learned', 'Ask {name} what they know',
    [say('{Name} brightens, and gives you more than you asked for, with references.', 'good')],
    [say('{Name} says it is a long question and suggests several books.')]),
  ask('underworld', 'Ask {name} what they know',
    [say('{Name} tells you where to look, and that you never heard it from them.', 'good')],
    [say('{Name} says nothing, and watches your hands.'), { mood: -1 }],
    { difficulty: DIFFICULTY.hard }),
  ask('servile', 'Ask {name} what they know',
    [say('{Name} looks about and whispers what they have overheard, which is a great deal.', 'good'), keep('social', 1, '{name} trusts you with what they overheard')],
    [say('{Name} is afraid to say. They shake their head and hurry off.')]),
  ask('performer', 'Ask {name} what they know',
    [say('{Name} gossips with relish, and with some art.', 'good'), { mood: 1 }],
    [say('{Name} tells a very good story, and none of it answers your question.')]),
  ask('landworker', 'Ask {name} what they know',
    [say('{Name} tells you who passed, which animals have been about, and what the weather will do.', 'good')],
    [say('{Name} looks at you for a while, and then at the sky.')]),
  ask('seafaring', 'Ask {name} what they know',
    [say('{Name} has tidings from half a dozen ports, and is glad of an audience.', 'good')],
    [say('{Name} says a landsman would not understand.')]),
  ask('wanderer', 'Ask {name} what they know',
    [say('{Name} trades news for news and is fair about it.', 'good'), keep('social', 1, '{name} owes you a piece of news')],
    [say('{Name} has not been this way, and cannot help.')]),
  ask('child', 'Ask {name} what they know',
    [say('{Name} tells you everything at once, and some of it is true.', 'good')],
    [say('{Name} says they are not allowed to talk to strangers, and runs.')]),
  ask('elder', 'Ask {name} what they know',
    [say('{Name} starts a long story. The answer is in it, if you can wait.', 'good'), { mood: 1 }],
    [say('{Name} does not remember, or says so.')]),
  ask('drunk', 'Ask {name} what they know',
    [say('{Name} tells you more than they know, and some that is not so.', 'good')],
    [say('{Name} loses the thread and begins to sing.')],
    { difficulty: DIFFICULTY.easy }),
  ask('afraid', 'Ask {name} what they know',
    [say('{Name} whispers it all, glancing at the door.', 'good'), keep('social', 1, '{name} is too frightened to hold back')],
    [say('{Name} is too frightened to speak.')]),
  ask('tavern', 'Ask {name} what they know',
    [say('{Name} leans over the bar, and so does someone else, and between them it comes out.', 'good')],
    [say('{Name} wipes a cup, and says it is a busy night.')]),
];

export const PERSUADE_HOOKS: HookDef[] = [
  persuade('nobility', 'Make your case to {name}',
    [say('{Name} concludes, after a pause, that it was their own idea. Do not correct them.', 'good'), { mood: 1 }, keep('social', 1, '{name} thinks it was their idea')],
    [say('{Name} is not in the habit of being told.'), { mood: -1 }]),
  persuade('clergy', 'Make your case to {name}',
    [say('{Name} weighs it against the teaching and finds there is room.', 'good'), { mood: 1 }, keep('social', 1, '{name} found room for it')],
    [say('{Name} recalls the passage that answers you, and does not look pleased.'), { mood: -1 }]),
  persuade('martial', 'Make your case to {name}',
    [say('{Name} takes it as a plan sensibly given, and nods.', 'good'), { mood: 1 }],
    [say('"Orders are orders," says {name}.'), { mood: -1 }]),
  persuade('officialdom', 'Make your case to {name}',
    [say('{Name} finds a clause which allows exactly what you ask.', 'good'), { mood: 1 }, keep('social', 2, '{name} found the clause')],
    [say('{Name} cites the regulation, in full.'), { mood: -1 }]),
  persuade('merchant', 'Make your case to {name}',
    [say('{Name} runs the sums and finds that you are right.', 'good'), { mood: 1 }, keep('barter', 1, '{name} saw the profit in it')],
    [say('{Name} asks what is in it for them, and does not like the answer.'), { mood: -1 }]),
  persuade('learned', 'Make your case to {name}',
    [say('{Name} engages with the argument itself, which is the highest praise they have.', 'good'), { mood: 1 }, keep('social', 1, '{name} took your argument seriously')],
    [say('{Name} finds the flaw, and puts a finger on it.'), { mood: -1 }]),
  persuade('underworld', 'Make your case to {name}',
    [say('{Name} sees what is in it for them, which is the only argument they take.', 'good'), { mood: 1 }],
    [say('{Name} asks what is in it for them, and you cannot say.'), { mood: -1 }]),
  persuade('servile', 'Make your case to {name}',
    [say('{Name} is surprised to be asked. They give it a moment of real thought.', 'good'), { mood: 1 }],
    [say('"It is not for me to say," says {name}, and that is the end of it.')]),
  persuade('elder', 'Make your case to {name}',
    [say('{Name} has heard it before, but admits you put it well.', 'good'), { mood: 1 }],
    [say('{Name} says it was done otherwise in their day, and so it shall be.'), { mood: -1 }]),
  persuade('child', 'Make your case to {name}',
    [say('{Name} gets part of it, and decides they agree with that part.', 'good')],
    [say('{Name} does not follow, and says so loudly.')]),
  persuade('drunk', 'Make your case to {name}',
    [say('{Name} agrees warmly with every word, and will have forgotten by morning.', 'good')],
    [say('{Name} loses the thread and begins to argue the other side with great feeling.')]),
  persuade('grieving', 'Make your case to {name}',
    [say('{Name} looks at you as if from far away, and nods.', 'good')],
    [say('{Name} cannot think of anything but their loss.')],
    { difficulty: DIFFICULTY.hard }),
  persuade('angry', 'Make your case to {name}',
    [say('{Name} breaks off in mid-shout to listen, which costs them something.', 'good')],
    [say('{Name} does not let you finish.'), { mood: -1 }],
    { difficulty: DIFFICULTY.hard }),
  persuade('courtroom', 'Make your case to {name}',
    [say('{Name} sets the pen down and listens to the whole of it.', 'good'), { mood: 1 }, keep('social', 1, 'you were heard in court')],
    [say('{Name} says the court has heard enough.'), { mood: -1 }]),
];

export const DISTRACT_HOOKS: HookDef[] = [
  distract('martial', 'Keep {name} busy',
    [say('{Name} turns to you, but only part of the way. One eye stays on the road.', 'good'), keep('sneak', 1, '{name} is half distracted')],
    [say('{Name} notes your face, and the fact that you tried.'), { mood: -1 }, { set: 'suspicious:{id}' }],
    { difficulty: DIFFICULTY.veryHard }),
  distract('officialdom', 'Keep {name} busy',
    [say('{Name} loses the place in the ledger, and starts again, muttering. They do not look up.', 'good'), keep('sneak', 1, '{name} is lost in the paperwork')],
    [say('{Name} sighs, and waves you to the back of the line.')]),
  distract('merchant', 'Keep {name} busy',
    [say('{Name} is absorbed in a sale you have no intention of completing.', 'good'), keep('pickpocket', 1, '{name} is busy haggling'), keep('sneak', 1, '{name} is busy haggling')],
    [say('{Name} knows a browser from a buyer, and watches the till.'), { mood: -1 }]),
  distract('clergy', 'Keep {name} busy',
    [say('{Name} cannot resist a question of conscience, and takes it seriously.', 'good'), keep('sneak', 1, '{name} is thinking over your question')],
    [say('{Name} reproves you, gently, for trying to waste their time.'), { mood: -1 }]),
  distract('performer', 'Keep {name} busy',
    [say('{Name} loves an audience, and does not mind who it is.', 'good'), keep('sneak', 1, '{name} is performing'), keep('pickpocket', 1, '{name} is performing')],
    [say('{Name} knows a distraction when they use one. They smile, and keep an eye on your hands.')]),
  distract('child', 'Keep {name} busy',
    [say('{Name} is absorbed at once, and has forgotten why they were there.', 'good'), keep('sneak', 1, '{name} forgot all about it'), keep('pickpocket', 1, '{name} forgot all about it')],
    [say('{Name} looks at you, and then at what you are trying to hide.')],
    { difficulty: DIFFICULTY.tricky }),
  distract('drunk', 'Keep {name} busy',
    [say('{Name} is delighted by anything and everything, and tells you so.', 'good'), keep('sneak', 1, '{name} is happily absorbed'), keep('pickpocket', 1, '{name} is happily absorbed')],
    [say('{Name} sways, and for a moment looks at you very straight.')],
    { difficulty: DIFFICULTY.tricky }),
  distract('crowd', 'Keep {name} busy',
    [say('Nobody is watching anyone in particular, and {name} is no exception.', 'good'), keep('sneak', 1, 'the crowd is looking elsewhere'), keep('pickpocket', 1, 'the crowd is looking elsewhere')],
    [say('{Name} looks around, a little puzzled, and moves on.')],
    { difficulty: DIFFICULTY.tricky }),
];

export const TALK_HOOKS: HookDef[] = [...ASK_HOOKS, ...PERSUADE_HOOKS, ...DISTRACT_HOOKS];

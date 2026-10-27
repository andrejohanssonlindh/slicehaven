import { DIFFICULTY } from '../../core/checks';
import type { Effect } from '../../core/scene';
import type { HookDef } from '../../core/skillweb';
import { SKILL_SETS } from '../rollables';

/**
 * Library hooks that differ by the type of person (people library). Where the leanings change how hard
 * something is, these change what comes of it: who is flattered and who is wary, who talks and who
 * remembers. A hook here replaces the general one for people with that facet (the deeper the facet,
 * the more particular the match), so a retired soldier gets the soldier's reply, not the general one.
 *
 * One file per kind of effort would be tidier later; for now impress and threaten, the two the
 * weapons and marks feed most. Every other kind of effort still answers with its general hook.
 */
const social = { layer: 1 as const, social: true, kind: 'humanoid', wants: ['social'] };

const say = (text: string, tone?: 'good' | 'bad'): Effect => ({ say: text, tone });
const keep = (kind: string, n: number, label: string): Effect => ({ token: { kind, n, against: '{id}', label } });

/** Winning someone over, differently for each kind of person. */
const impress = (
  facet: string, label: string, success: Effect[], failure: Effect[], over: Partial<HookDef> = {},
): HookDef => ({
  ...social, id: `impress-${facet}`, facet, intention: 'impress', label, skills: [...SKILL_SETS.impress],
  difficulty: DIFFICULTY.tricky, success, failure, ...over,
});

/** Frightening someone, differently for each kind of person. */
const frighten = (
  facet: string, label: string, success: Effect[], failure: Effect[], over: Partial<HookDef> = {},
): HookDef => ({
  ...social, id: `intimidate-${facet}`, facet, intention: 'intimidate', label, skills: [...SKILL_SETS.threaten],
  difficulty: DIFFICULTY.hard, success, failure, ...over,
});

export const OUTCOME_HOOKS: HookDef[] = [
  // ——— Impress ———
  impress('nobility', 'Make an impression on {name}',
    [say('{Name} inclines their head a fraction. You have been noticed, which at this level is a great deal.', 'good'), { mood: 1 }, keep('social', 1, '{name} noticed you')],
    [say('{Name} looks through you, as through a servant who has spoken out of turn.'), { mood: -1 }]),
  impress('clergy', 'Show {name} what you are made of',
    [say('{Name} regards you with a kinder eye, as someone who might yet be led to better things.', 'good'), { mood: 1 }, keep('social', 1, '{name} thinks well of you')],
    [say('{Name} reminds you gently that show is not virtue.'), { mood: -1 }]),
  impress('martial', 'Earn {name}\'s respect',
    [say('{Name} gives the short nod soldiers give to someone who knows their business.', 'good'), { mood: 1 }, keep('social', 1, '{name} respects your skill')],
    [say('{Name} has seen better, and says so with a look.'), { mood: -1 }],
    { difficulty: DIFFICULTY.hard }),
  impress('merchant', 'Talk trade with {name}',
    [say('{Name} warms to someone who understands how things are bought and sold.', 'good'), keep('barter', 1, '{name} thinks you are a sound judge')],
    [say('{Name} smiles politely and mentally raises the price.'), { mood: -1 }]),
  impress('craft', 'Talk shop with {name}',
    [say('{Name} warms to someone who knows what good work takes, and shows you their best.', 'good'), { mood: 1 }, keep('barter', 1, '{name} respects a fellow craftsman')],
    [say('{Name} listens, unconvinced, and goes back to the bench.'), { mood: -1 }]),
  impress('learned', 'Hold your own with {name}',
    [say('{Name} sets the lesson aside and starts treating you as an equal.', 'good'), { mood: 1 }, keep('social', 1, '{name} takes you for a thinking person')],
    [say('{Name} corrects you, kindly, and the conversation is over.'), { mood: -1 }]),
  impress('underworld', 'Show {name} you are in the know',
    [say('{Name} looks you over again and lets you in on a name or two.', 'good'), { set: 'asked:{id}' }, keep('social', 1, '{name} thinks you are one of the trade')],
    [say('{Name} says nothing, and you realise you have said a great deal.'), { mood: -1 }],
    { difficulty: DIFFICULTY.hard }),
  impress('servile', 'Be kind to {name}',
    [say('{Name} is not used to being seen. They will not forget it.', 'good'), { mood: 2 }, keep('social', 1, '{name} is grateful')],
    [say('{Name} bobs a bow and waits for you to go away.')]),
  impress('performer', 'Show {name} a trick or two',
    [say('{Name} applauds, which is more than they give most, and tells you a thing or two about the house.', 'good'), { mood: 1 }, keep('social', 1, '{name} applauded you')],
    [say('{Name} has seen it done, and done better.'), { mood: -1 }]),
  impress('landworker', 'Show {name} you know the land',
    [say('{Name} grunts approval. That is high praise from someone who works the land.', 'good'), { mood: 1 }, keep('social', 1, '{name} thinks you know the land')],
    [say('{Name} watches you with an eye used to telling talkers from workers.')]),
  impress('seafaring', 'Talk the sea with {name}',
    [say('{Name} claps you on the shoulder and calls for a drink.', 'good'), { mood: 1 }, keep('social', 1, '{name} took you for a sea-dog')],
    [say('{Name} grins. "Landsman." The word does it all.'), { mood: -1 }]),
  impress('child', 'Win {name} over',
    [say('{Name} stares at you wide-eyed, and will tell everyone.', 'good'), { mood: 2 }, keep('social', 1, '{name} thinks you are wonderful')],
    [say('{Name} loses interest and runs off.')]),
  impress('elder', 'Win {name} over',
    [say('{Name} pats your arm and says you remind them of someone who turned out well.', 'good'), { mood: 1 }, keep('social', 1, '{name} took to you')],
    [say('{Name} says people were better mannered in their day.'), { mood: -1 }]),
  impress('rich', 'Try to impress {name}',
    [say('{Name} allows themself a thin smile. You have surprised someone who is seldom surprised.', 'good'), keep('social', 1, '{name} was briefly surprised')],
    [say('{Name} has seen finer, and sooner.'), { mood: -1 }],
    { difficulty: DIFFICULTY.hard }),

  // ——— Threaten ———
  frighten('nobility', 'Make {name} afraid',
    [say('{Name} goes white, then red. They yield, and a name has been added to a list.', 'good'), { set: 'scared:{id}' }, { mood: -2 }],
    [say('{Name} says one word, quietly, and someone starts to move toward you.', 'bad'), { mood: -2 }],
    { difficulty: DIFFICULTY.veryHard }),
  frighten('clergy', 'Frighten {name}',
    [say('{Name} makes a sign against you and gives way, praying under their breath.', 'good'), { set: 'scared:{id}' }, { mood: -2 }],
    [say('{Name} begins a prayer, calm and clear, and is not afraid of you at all.', 'bad'), { mood: -2 }]),
  frighten('martial', 'Square up to {name}',
    [say('{Name} gives ground a step, though never his eyes.', 'good'), { set: 'scared:{id}' }, { mood: -1 }],
    [say('{Name}\'s hand goes to a weapon. "Try it."', 'bad'), { mood: -2 }, { set: 'steel:{id}' }],
    { difficulty: DIFFICULTY.veryHard }),
  frighten('merchant', 'Lean on {name}',
    [say('{Name} sweats, and finds a way to be more helpful. The price drops.', 'good'), { set: 'scared:{id}' }, { mood: -1 }, keep('barter', 1, '{name} wants no trouble')],
    [say('{Name} calmly mentions the watch, and which of them is a friend.', 'bad'), { mood: -2 }]),
  frighten('learned', 'Frighten {name}',
    [say('{Name} calls you a brute, loudly, but does what you want.', 'good'), { set: 'scared:{id}' }, { mood: -2 }],
    [say('{Name} points out, as to a slow pupil, what the law makes of threats.', 'bad'), { mood: -2 }]),
  frighten('arcane', 'Threaten {name}',
    [say('{Name} yields, but not to you: to the risk of what the two of you might start.', 'good'), { set: 'scared:{id}' }, { mood: -2 }],
    [say('{Name} smiles thinly and the air in the room goes a little colder.', 'bad'), { mood: -2 }],
    { difficulty: DIFFICULTY.veryHard }),
  frighten('underworld', 'Threaten {name}',
    [say('{Name} shrugs, and tells you what you want, to be rid of you.', 'good'), { set: 'scared:{id}' }, { mood: -1 }],
    [say('{Name} laughs. They have met worse than you, and been paid by some.', 'bad'), { mood: -2 }]),
  frighten('servile', 'Frighten {name}',
    [say('{Name} cowers and will tell you anything.', 'good'), { set: 'scared:{id}' }, { mood: -1 }, keep('social', 1, '{name} is terrified of you')],
    [say('{Name} bursts into tears and calls for help.', 'bad'), { mood: -2 }],
    { difficulty: DIFFICULTY.tricky }),
  frighten('elder', 'Frighten {name}',
    [say('{Name} is hurt more than frightened, and gives way with a look that stays with you.', 'good'), { set: 'scared:{id}' }, { mood: -2 }],
    [say('{Name} gives you a long look. "I have buried better men."', 'bad'), { mood: -2 }]),
  frighten('afraid', 'Frighten {name}',
    [say('{Name} is already shaking, and tells you everything at once.', 'good'), { set: 'scared:{id}' }, { mood: -1 }, keep('social', 1, '{name} is beside themself')],
    [say('{Name} flinches, but there is nothing left to take.', 'bad'), { mood: -1 }],
    { difficulty: DIFFICULTY.tricky }),
];

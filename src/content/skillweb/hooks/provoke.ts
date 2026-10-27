import { DIFFICULTY } from '../../../core/checks';
import type { HookDef } from '../../../core/skillweb';
import { TALK, effortHooks, keep, say } from './helpers';

/**
 * Provoke: getting a rise out of someone. A success is a rise: the person is angry on purpose, and an
 * angry person is careless, so it keeps a social advantage for the next try. A failure just makes an enemy.
 */
const provoke = effortHooks('provoke', { ...TALK, difficulty: DIFFICULTY.tricky });
const rise = (text: string) => [say(text, 'good'), { mood: -2 }, { set: 'provoked:{id}' }, keep('social', 1, '{name} lost their head')];

export const PROVOKE: HookDef[] = [
  provoke.general('Needle {name}',
    rise('{Name} goes red, and says more than they meant to.'),
    [say('{Name} looks at you levelly. They are not rising to it.'), { mood: -1 }]),

  provoke.forFacet('nobility', 'Slight {name}',
    rise('{Name} draws themselves up, and forgets their manners.'),
    [say('{Name} turns away. You are beneath notice.'), { mood: -1 }]),
  provoke.forFacet('clergy', 'Mock {name}\'s faith',
    rise('{Name} forgets the teaching on patience.'),
    [say('{Name} prays for you, audibly.'), { mood: -1 }],
    { difficulty: DIFFICULTY.hard }),
  provoke.forFacet('martial', 'Question {name}\'s courage',
    rise('{Name} bristles, and a hand moves toward a weapon.'),
    [say('{Name} says orders are orders and you are not worth the trouble.'), { mood: -1 }]),
  provoke.forFacet('officialdom', 'Mock {name}\'s forms',
    rise('{Name} slams a ledger shut and begins to explain, at length and loudly, the importance of the forms.'),
    [say('{Name} notes your name down. Slowly.'), { mood: -1 }]),
  provoke.forFacet('merchant', 'Call {name}\'s goods poor',
    rise('{Name} lists the virtues of every item, and the fault of every customer who has doubted them.'),
    [say('{Name} says the door is where you left it.'), { mood: -1 }]),
  provoke.forFacet('learned', 'Mock {name}\'s learning',
    rise('{Name} corrects you, then the correction, and then themselves.'),
    [say('{Name} sniffs and returns to their book.'), { mood: -1 }]),
  provoke.forFacet('underworld', 'Goad {name}',
    rise('{Name} reaches for something, then thinks better of it. Barely.'),
    [say('{Name} smiles, and remembers your face.'), { mood: -2 }],
    { difficulty: DIFFICULTY.hard }),
  provoke.forFacet('servile', 'Taunt {name}',
    [say('{Name} flinches, then something hardens behind the eyes.', 'good'), { mood: -1 }, { set: 'provoked:{id}' }],
    [say('{Name} lowers their eyes and says nothing.'), { mood: -1 }]),
  provoke.forFacet('performer', 'Heckle {name}',
    rise('{Name} turns the whole of their act on you, and the act has teeth.'),
    [say('{Name} turns the heckle into a joke, and the room laughs at you.'), { mood: -1 }]),
  provoke.forFacet('child', 'Tease {name}',
    rise('{Name} stamps a foot, and kicks you in the shin.'),
    [say('{Name} sticks out a tongue and runs.')],
    { difficulty: DIFFICULTY.easy }),
  provoke.forFacet('elder', 'Goad {name}',
    rise('{Name} shakes a stick and tells you what is wrong with the young.'),
    [say('{Name} chuckles. They have had a long time to learn calm.'), { mood: -1 }]),
  provoke.forFacet('drunk', 'Goad {name}',
    rise('{Name} lurches up, swinging at a shadow near you.'),
    [say('{Name} forgets what you said, and laughs anyway.')],
    { difficulty: DIFFICULTY.easy }),
  provoke.forFacet('angry', 'Fan {name}\'s temper',
    rise('{Name} explodes. Everyone in the room is looking.'),
    [say('{Name} is already past the point of caring what you say.')],
    { difficulty: DIFFICULTY.easy }),
  provoke.forFacet('grieving', 'Goad {name}',
    [say('{Name} turns on you with grief turned to rage.', 'good'), { mood: -2 }, { set: 'provoked:{id}' }],
    [say('{Name} does not seem to hear you.'), { mood: -1 }],
    { difficulty: DIFFICULTY.hard }),
  provoke.forFacet('tavern', 'Start a quarrel with {name}',
    rise('{Name} slams down a cup, and a few chairs scrape back.'),
    [say('{Name} says the house does not tolerate trouble, and the house is large.'), { mood: -1 }]),
];

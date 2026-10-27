import { DIFFICULTY } from '../../../core/checks';
import type { HookDef } from '../../../core/skillweb';
import { TALK, effortHooks, keep, say } from './helpers';

/** Law: quoting the rules of the realm to the people who enforce them. Everyone else mostly shrugs. */
const law = effortHooks('law', { ...TALK, difficulty: DIFFICULTY.tricky });

export const LAW: HookDef[] = [
  law.general('Cite the law to {name}',
    [say('{Name} frowns, checks the point in their head, and concedes it.', 'good'), { mood: 1 }, keep('social', 1, 'you showed {name} the law was on your side')],
    [say('{Name} says that is not how they understand it.'), { mood: -1 }]),

  law.forFacet('officialdom', 'Cite the law to {name}',
    [say('{Name} looks up the clause, reads it twice, and is forced to agree.', 'good'), { mood: 1 }, keep('social', 2, '{name} had to concede the clause')],
    [say('{Name} cites a clause that overrides yours.'), { mood: -1 }],
    { difficulty: DIFFICULTY.hard }),
  law.forFacet('courtroom', 'Argue the law before {name}',
    [say('{Name} sets down the pen and asks you to go on.', 'good'), { mood: 1 }, keep('social', 2, 'the court heard your point of law')],
    [say('{Name} says the point is not before the court.'), { mood: -1 }],
    { difficulty: DIFFICULTY.hard }),
  law.forFacet('martial', 'Cite the law to {name}',
    [say('{Name} did not know that was the rule, and does not argue with a rule.', 'good'), { mood: 1 }],
    [say('"Orders," says {name}, "come from above the law."'), { mood: -1 }]),
  law.forFacet('nobility', 'Cite the law to {name}',
    [say('{Name} admits, with distaste, that the law binds even them.', 'good'), { mood: 1 }],
    [say('{Name} says the law is what their family makes of it.'), { mood: -1 }],
    { difficulty: DIFFICULTY.hard }),
  law.forFacet('clergy', 'Cite the law to {name}',
    [say('{Name} concedes the worldly point, and reminds you of the higher.', 'good'), { mood: 1 }],
    [say('{Name} says that law is the lesser law.')]),
  law.forFacet('merchant', 'Cite the law to {name}',
    [say('{Name} blanches. A contract is a contract, and so are the statutes.', 'good'), { mood: 1 }, keep('bribe', 1, '{name} does not want a lawsuit')],
    [say('{Name} says their lawyer will answer you.')]),
  law.forFacet('underworld', 'Cite the law to {name}',
    [say('{Name} laughs, but the laugh is short.', 'good')],
    [say('{Name} says the law has no reach here.'), { mood: -1 }],
    { difficulty: DIFFICULTY.veryHard }),
  law.forFacet('landworker', 'Cite the law to {name}',
    [say('{Name} had heard something like it, and is relieved to hear it properly.', 'good'), { mood: 1 }],
    [say('{Name} says the law is a long way from this field.')]),
  law.forFacet('servile', 'Cite the law to {name}',
    [say('{Name} did not know they had that right. They stand a little straighter.', 'good'), { mood: 1 }, keep('social', 1, 'you told {name} of their rights')],
    [say('{Name} is afraid to rely on it.')]),
  law.forFacet('drunk', 'Cite the law to {name}',
    [say('{Name} agrees that the law is a fine thing, and will not argue.', 'good')],
    [say('{Name} loses patience around the second clause.')],
    { difficulty: DIFFICULTY.easy }),
];

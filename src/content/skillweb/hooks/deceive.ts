import { DIFFICULTY } from '../../../core/checks';
import type { Effect } from '../../../core/scene';
import type { HookDef } from '../../../core/skillweb';
import { TALK, effortHooks, say } from './helpers';

/**
 * Deceive: a lie that holds, or does not. A hidden roll: you are never told how it went, so success and
 * failure say exactly the same thing (a test checks) and differ only in a silent flag. `deceived:{id}`
 * makes them easier to deal with, `doubted:{id}` harder (believed() in core/skillweb), and a later
 * successful size-up can tell you which. One lie per person, like every hidden try.
 */
const deceive = effortHooks('deceive', { ...TALK, intention: 'deceive', hidden: true, difficulty: DIFFICULTY.hard });

/** The same words either way; only the flag differs. */
const lie = (text: string, over?: { difficulty: number }): [Effect[], Effect[], { difficulty: number }?] =>
  [[say(text), { set: 'deceived:{id}' }], [say(text), { set: 'doubted:{id}' }], over];
const hook = (facet: string | undefined, label: string, text: string, over?: { difficulty: number }) => {
  const [ok, bad] = lie(text);
  return facet ? deceive.forFacet(facet, label, ok, bad, over) : deceive.general(label, ok, bad, over);
};

export const DECEIVE: HookDef[] = [
  hook(undefined, 'Tell {name} a lie', '{Name} listens, and nods slowly. You cannot tell what they made of it.'),

  hook('nobility', 'Tell {name} a lie', '{Name} inclines their head, which means nothing either way.', { difficulty: DIFFICULTY.hard }),
  hook('clergy', 'Tell {name} a lie', '{Name} gazes at you kindly, and says nothing.', { difficulty: DIFFICULTY.hard }),
  hook('martial', 'Tell {name} a lie', '"Right," says {name}, and that is all.', { difficulty: DIFFICULTY.veryHard }),
  hook('officialdom', 'Tell {name} a lie', '{Name} writes something down. You cannot see what.', { difficulty: DIFFICULTY.veryHard }),
  hook('merchant', 'Tell {name} a lie', '{Name} smiles the smile they use on customers.', { difficulty: DIFFICULTY.veryHard }),
  hook('learned', 'Tell {name} a lie', '{Name} raises an eyebrow, and says "Interesting."', { difficulty: DIFFICULTY.hard }),
  hook('underworld', 'Tell {name} a lie', '{Name} shrugs. In their trade, everyone lies.', { difficulty: DIFFICULTY.veryHard }),
  hook('servile', 'Tell {name} a lie', '{Name} lowers their eyes. It is not for them to say.', { difficulty: DIFFICULTY.tricky }),
  hook('performer', 'Tell {name} a lie', '{Name} applauds softly, which could mean anything.', { difficulty: DIFFICULTY.veryHard }),
  hook('landworker', 'Tell {name} a lie', '{Name} chews on it for a while, and on a stalk of grass.', { difficulty: DIFFICULTY.tricky }),
  hook('seafaring', 'Tell {name} a lie', '{Name} says "Aye," in a voice that gives nothing away.', { difficulty: DIFFICULTY.hard }),
  hook('child', 'Tell {name} a lie', '{Name} stares at you with round eyes.', { difficulty: DIFFICULTY.easy }),
  hook('elder', 'Tell {name} a lie', '{Name} regards you for a long time, and says "Hm."', { difficulty: DIFFICULTY.hard }),
  hook('drunk', 'Tell {name} a lie', '{Name} nods vigorously, and might be nodding at anything.', { difficulty: DIFFICULTY.easy }),
  hook('afraid', 'Tell {name} a lie', '{Name} wants very much to believe something. You cannot tell if it is you.', { difficulty: DIFFICULTY.tricky }),
  hook('grieving', 'Tell {name} a lie', '{Name} looks at you without seeing.', { difficulty: DIFFICULTY.easy }),
  hook('angry', 'Tell {name} a lie', '{Name} glares, and does not interrupt.', { difficulty: DIFFICULTY.hard }),
  hook('on-duty', 'Tell {name} a lie', '{Name} listens with the face of someone who has heard every lie there is.', { difficulty: DIFFICULTY.veryHard }),
  hook('courtroom', 'Tell {name} a lie', '{Name} says the court will take note.', { difficulty: DIFFICULTY.veryHard }),
];

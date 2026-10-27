import type { HookDef } from '../../../core/skillweb';
import { ASK } from './ask';
import { CLIMB } from './climb';
import { CRAFT } from './craft';
import { DISTRACT } from './distract';
import { ETIQUETTE } from './etiquette';
import { FORAGE } from './forage';
import { FORCE } from './force';
import { HEAL } from './heal';
import { IMPRESS } from './impress';
import { JUMP } from './jump';
import { LORE_HOOKS } from './lore';
import { PERSUADE } from './persuade';
import { PICK } from './pick';
import { POISON } from './poison';
import { READ_PEOPLE } from './read-people';
import { SEARCH } from './search';
import { GAMBLE } from './gamble';
import { LAW } from './law';
import { TEACH } from './teach';
import { STEAL } from './steal';
import { SWEET_TALK } from './sweet-talk';
import { SWIM } from './swim';
import { COMFORT } from './comfort';
import { PROVOKE } from './provoke';
import { TAME } from './tame';
import { THREATEN } from './threaten';
import { TRACK } from './track';

/**
 * Every library hook, one file per kind of effort (hooks/<effort>.ts). The order here is the order a
 * thing lists its tries: an intention is placed where it first appears. Read people first, then talk,
 * then hands-on.
 */
export const HOOKS: HookDef[] = [
  ...READ_PEOPLE, ...HEAL,
  ...PERSUADE, ...IMPRESS, ...SWEET_TALK, ...COMFORT, ...DISTRACT, ...ASK, ...ETIQUETTE, ...THREATEN, ...PROVOKE, ...STEAL, ...GAMBLE, ...LAW, ...TEACH,
  ...CLIMB, ...SEARCH, ...LORE_HOOKS, ...CRAFT, ...FORCE, ...PICK, ...FORAGE, ...TAME, ...POISON, ...SWIM, ...JUMP, ...TRACK,
];

/** What an effort acts on, which says where its hooks go. */
export type Target = 'person' | 'thing' | 'place' | 'group' | 'self';

/**
 * The efforts with no hook yet, and where they belong. The roadmap in code: a test checks that every
 * effort either has a hook or is listed here, and that nothing listed here has one. When you write
 * the first hook for an effort, take it off this list.
 *
 * - person: hooks on 'humanoid' with facet variants, like ask.ts.
 * - thing: hooks on narrow kinds (kinds.ts), like force.ts.
 * - place: not a hook yet. The scene's tags (night, rain, crowd) already lean it; needs a place
 *   hook in core (a check on the scene itself) before content can be written.
 * - group: needs several people as one target (a crowd, a squad); not modelled yet.
 * - self: done to yourself or your gear; usually a challenge, not a hook.
 */
export const PLANNED: Record<string, { on: Target; note: string }> = {
  deceive: { on: 'person', note: 'A lie that holds. Needs a hidden "did they believe it" (like size-up).' },
  bribe: { on: 'person', note: 'Decide first how bribing works outside the gate guard\'s conflict approach (Q in the handover).' },
  perform: { on: 'group', note: 'An audience, not one person. Earns social advantages against everyone present.' },
  rally: { on: 'group', note: 'Heart or orders to a group; for companions and fights.' },
  sneak: { on: 'place', note: 'Moving unseen past someone; spends the `sneak` advantage.' },
  hide: { on: 'place', note: 'Staying out of sight, or hiding a thing.' },
  travel: { on: 'place', note: 'Covering ground; belongs to the map between scenes.' },
  survey: { on: 'place', note: 'Done as a challenge (surveyChallenge), not a hook.' },
  ride: { on: 'thing', note: 'Needs a mount kind (horse under animal).' },
  analyse: { on: 'thing', note: 'Plans, figures, ciphers: hidden reads on documents and machines (new kinds).' },
  escape: { on: 'self', note: 'Bonds and grips; a check on the hero when bound or held.' },
};

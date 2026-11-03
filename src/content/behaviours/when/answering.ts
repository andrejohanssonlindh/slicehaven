import type { Condition } from '../../../core/world3d/behave';

/**
 * While someone is answering what the hero did (plan B3c): { "when": { "answering": "grumble" } }, or "any". The world
 * sets the answer when they see a wrong (the culture says which, `content/cultures/`) and puts a line for each of the
 * culture's answers at the top of everyone's day, so maps need not write them.
 */
const answering: Condition = {
  id: 'answering',
  about: 'While they answer something the hero did: a culture\'s answer by name ("grumble", "fetch"), or "any".',
  check: (v) => (typeof v === 'string' && v ? null : 'give the name of an answer ("grumble", "scold", "fetch"…) or "any"'),
  holds: (v, _clock, mind) => !!mind.answer && (v === 'any' || mind.answer.id === v),
};

export default answering;

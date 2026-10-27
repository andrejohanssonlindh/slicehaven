import type { KinRule } from '../../core/people';

/**
 * What it is worth to share something with the person. Balance data, like the leanings. Peoples are
 * not here: the relations table already treats your own kind (kin, stranger in someone else's land).
 */
export const KIN: KinRule[] = [
  { dim: 'faith', efforts: ['persuade', 'ask', 'sweet-talk', 'comfort'], shift: 1, why: 'you share their faith' },
  { dim: 'station', efforts: ['impress', 'ask', 'sweet-talk', 'persuade'], shift: 1, why: 'you know their line of work' },
  { dim: 'realm', exact: true, efforts: ['ask', 'sweet-talk'], shift: 1, why: 'you come from the same land' },
];

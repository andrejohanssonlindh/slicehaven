import type { PeopleLibrary } from '../../core/people';
import { FACETS } from './facets';
import { KIN } from './kin';
import { LEANINGS } from './leanings';

export { FACETS, FACET_LIST, PEOPLE_KINDS, backgroundFacet, peopleFacet } from './facets';
export { KIN } from './kin';
export { LEANINGS } from './leanings';

/** The people library: the facets of people and places, what they lean, and what you share with them. */
export const PEOPLE_LIBRARY: PeopleLibrary = { facets: FACETS, leanings: LEANINGS, kin: KIN };

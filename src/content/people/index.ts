import type { PeopleLibrary } from '../../core/people';
import { FACETS } from './facets';
import { LEANINGS } from './leanings';

export { FACETS, FACET_LIST, PEOPLE_KINDS } from './facets';
export { LEANINGS } from './leanings';

/** The people library: the facets of people and places, and what they lean. */
export const PEOPLE_LIBRARY: PeopleLibrary = { facets: FACETS, leanings: LEANINGS };

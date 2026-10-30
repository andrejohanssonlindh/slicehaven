import type { PeopleLibrary } from '../../core/people';
import { type PersonKindDef, PersonKinds } from '../../core/persons';
import { FACETS } from './facets';
import { KIN } from './kin';
import { LEANINGS } from './leanings';

export { FACETS, FACET_LIST, PEOPLE_KINDS, backgroundFacet, peopleFacet } from './facets';
export { KIN } from './kin';
export { LEANINGS } from './leanings';

/** The people library: the facets of people and places, what they lean, and what you share with them. */
export const PEOPLE_LIBRARY: PeopleLibrary = { facets: FACETS, leanings: LEANINGS, kin: KIN };

/**
 * Every kind of person, one file each in `kinds/` (a file may hold a small family as an array): a new file is a new
 * kind, nothing else to edit. They sit on the library's facet trees; see `core/persons.ts`.
 */
const files = import.meta.glob<{ default: PersonKindDef | PersonKindDef[] }>('./kinds/*.ts', { eager: true });

export const PERSON_KINDS = new PersonKinds(Object.values(files).flatMap((m) => [m.default].flat()), FACETS);

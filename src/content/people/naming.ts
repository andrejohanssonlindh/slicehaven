import { Rng } from '../../core/rng';
import { nameCultureOf } from '../chargen/names';
import { FACETS, FACET_LIST } from './facets';
import { FAMILY_KIND } from './facets';

/**
 * A person's name, from their people's naming culture in the character creator (the same every time for the same
 * seed). A family with no naming culture of its own ("humans, any") borrows one of its peoples'. Used by the 3D world
 * when you talk to someone, and by the Kinds of person page.
 */
export function personName(chain: readonly string[], seed: number | string, fallback = 'Someone'): string {
  const people = chain.filter((id) => FACETS[id]?.dim === 'people').pop();
  const fam = Object.entries(FAMILY_KIND).find(([, k]) => chain.includes(k))?.[0];
  const rng = Rng.fromSeed(`name${seed}`);
  const peoples = FACET_LIST.filter((f) => f.dim === 'people' && f.parent === FAMILY_KIND[fam ?? '']).map((f) => f.id);
  const c = nameCultureOf(people, fam) ?? nameCultureOf(peoples.length ? rng.pick(peoples) : undefined, fam);
  const all = [...(c?.f ?? []), ...(c?.m ?? []), ...(c?.n ?? [])];
  return all.length ? rng.pick(all) : fallback;
}

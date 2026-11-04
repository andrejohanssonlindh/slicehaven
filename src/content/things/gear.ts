import { THINGS } from './index';

/**
 * The kinds of thing for someone's gear (plan B8a): each weapon or shield row they own (`Stridssvärd`) as the kind
 * of thing that is it (the arming sword, the buckler). Rows with no kind yet (bows) are left out and
 * listed in `missing`.
 */
export function gearKinds(gear: readonly string[]): { kinds: string[]; missing: string[] } {
  const kinds: string[] = [], missing: string[] = [];
  for (const sv of gear) {
    const k = THINGS.placeable.find((id) => THINGS.get(id).weapon === sv || THINGS.get(id).shield === sv);
    if (k) kinds.push(k);
    else missing.push(sv);
  }
  return { kinds, missing };
}

import type { GateCase, GateDef } from '../../../core/world3d/actions';
import { ACT_KINDS, type ActKind, type Owner, type Wrong, mayDo, ownerOf } from '../../../core/world3d/standing';

/**
 * Is it yours, or are you allowed? { "gate": "owner", "act": "meddle" } (plan B3c; rules `core/world3d/standing.ts`).
 * A permission: when it fails it never blocks, the act is a **wrong** (of the kind `act` says: sit, use, meddle…;
 * default `use`) that whoever sees it answers. Whatever stands in a house is its household's, among the houses the
 * town's, in the wild no one's. Its household, leave, what the room welcomes in its hours (an inn's taproom: sit
 * down) and what the town lets anyone do are no wrong.
 */

const actOf = (c: GateCase): ActKind => (c.use.act as ActKind | undefined) ?? 'use';

/** Whose the thing (or the spot) is, if anyone's. */
function whose(c: GateCase): Owner | null {
  const at = c.target ?? c.at;
  return ownerOf(at.house, c.facts.inSettlement?.holds(at, c.world.view) ?? false);
}

function allowed(c: GateCase): boolean {
  const o = c.world.owners, owner = whose(c);
  if (!o || !owner) return true;
  const house = 'house' in owner ? owner.house : null;
  return mayDo({
    owner, act: actOf(c), culture: o.culture, hour: c.world.view.hour,
    member: house !== null && o.members(house).includes(c.doer.id),
    leave: house !== null && o.leave(c.doer.id, house),
    welcome: house !== null ? o.welcome(c.target ?? c.at) : null,
  });
}

const owner: GateDef = {
  id: 'owner',
  about: 'The thing is yours, or you have leave, or it is welcome here (an inn: sit down). Otherwise the act is a wrong (B3c).',
  kind: 'permission',
  problem: (use) => (use.act === undefined || ACT_KINDS.includes(use.act as ActKind) ? null : `no kind of act called ${String(use.act)} (${ACT_KINDS.join(', ')})`),
  check: (c) => (allowed(c) ? null : 'house' in (whose(c) ?? {}) ? 'It is not yours: this is someone\'s home.' : 'That is the town\'s.'),
  wrong: (c): Wrong | null => {
    const w = whose(c);
    return w ? { act: actOf(c), owner: w } : null;
  },
};

export default owner;

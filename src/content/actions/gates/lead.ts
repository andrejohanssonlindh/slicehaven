import type { GateDef } from '../../../core/world3d/actions';

/**
 * The hero has a lead (plan B11): { "gate": "lead", "has": "hesma-well" }. Without it the action is not offered at all:
 * a lead is an opening, so *search the statue's base* only shows once you know there is something to look for.
 */
const lead: GateDef = {
  id: 'lead',
  about: 'The hero has a lead (content/leads/); otherwise the action is not offered.',
  kind: 'requirement',
  hides: true,
  problem: (use) => (typeof use.has !== 'string' || !use.has ? 'give the lead it needs (has)' : null),
  check: ({ use, world }) => (world.leads && String(use.has) in world.leads ? null : 'You have no reason to.'),
};

export default lead;

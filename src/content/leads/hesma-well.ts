import type { LeadDef } from '../../core/world3d/leads';

/** Told by the innkeeper about the statue (B11): Saint Hesma's lost well. Nothing solves it yet; it ends when the well is found. */
const lead: LeadDef = {
  id: 'hesma-well',
  title: 'Saint Hesma\'s well',
  know: 'The statue is Saint Hesma, who kept a well at the old crossing. Her key opened the well-house. No one has seen it in living memory.',
  ask: 'Ask {name} about Saint Hesma\'s well',
  from: 'Told by the innkeeper, asked about the statue.',
  cares: [{ person: 'villager' }, { is: 'dwarf' }],
  answers: [
    {
      who: { person: 'villager' },
      say: ['"The old well? My grandmother said they let it go when the lake came up. West of the statue, she said, under the brambles. I\'ve never looked."'],
    },
    {
      who: { is: 'dwarf' },
      say: ['"A well-house with a lock? Then it was capped in stone. Mud and brambles won\'t have eaten that. If it was there, it\'s there still."'],
    },
  ],
  ends: { flag: 'hesma-well-found' },
};

export default lead;

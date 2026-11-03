import type { LeadDef } from '../../core/world3d/leads';

/** The first lead (B11): a statue by the road out of the Hamlet, found by looking at it. */
const lead: LeadDef = {
  id: 'statue-north',
  title: 'The statue by the west road',
  know: 'A weathered stone woman by the west road, holding out a key. Someone has left wildflowers at her feet.',
  ask: 'Ask {name} about the statue by the road',
  from: 'Looking at the statue at the west end of the Hamlet.',
  cares: [{ person: 'keeper' }, { is: 'job-guard' }],
  answers: [
    {
      who: { person: 'keeper' },
      say: [
        '"That\'s Saint Hesma, or what the weather left of her. She kept a well here, back when this was only a crossing."',
        '"The key? The old folk said it opened the well-house. Nobody\'s seen a well-house in my lifetime."',
      ],
      next: 'hesma-well',
    },
    {
      who: { is: 'job-guard' },
      say: ['"Older than the road, that one. Nobody moves her, nobody touches her. The flowers? Not mine to ask about."'],
    },
  ],
};

export default lead;

import type { PersonKindDef } from '../../../core/persons';

/**
 * What the callings wear and carry (the creator's backgrounds, `job-…` in the people library). Clothes and held things
 * only, so they go on any people's body. A calling without a file here is worn in plain clothes.
 */
const kinds: PersonKindDef[] = [
  {
    id: 'station',
    look: { garment: 'shirt', top: ['linen', 'brown', 'grey'], legs: ['brown', 'grey'], sleeves: ['long', 'rolled'] },
  },
  {
    id: 'job-farmer',
    look: { style: 'hat', head: 'straw', garment: 'shirt', top: 'linen', legs: 'brown', vest: 'moss', sleeves: 'rolled', right: 'hoe' },
  },
  {
    id: 'job-miller',
    look: { style: 'kerchief', head: 'rust', garment: ['dress', 'shirt'], top: 'bluegrey', legs: 'bluegrey', apron: 'white', sleeves: 'rolled', left: 'basket' },
  },
  {
    id: 'job-innkeeper',
    look: { garment: 'shirt', top: 'linen', legs: 'brown', apron: 'white', vest: 'wine', sleeves: 'rolled' },
  },
];

export default kinds;

import type { PersonKindDef } from '../../../core/persons';

/**
 * The bodies of the five peoples (the creator's families). Every people under one (asharier under human, the Marnakh
 * house under tirak) has this body unless it gets a file of its own. Bodies only: clothes and held things come from
 * the calling. The folk art draws humans; the others are rough stand-ins until the art is decided.
 */
const kinds: PersonKindDef[] = [
  {
    id: 'human',
    look: {
      build: ['lean', 'avg', 'avg', 'stout'],
      skin: ['fair', 'tan', 'brown', 'ruddy'],
      hair: ['brown', 'brown', 'black', 'blond', 'red', 'grey'],
      style: ['short', 'long', 'bun'],
      beard: ['none', 'none', 'stubble', 'full'],
    },
  },
  {
    id: 'dwarf',
    look: { build: 'stout', skin: ['ruddy', 'fair', 'tan'], hair: ['black', 'brown', 'red', 'grey'], style: ['short', 'bald'], beard: 'full' },
  },
  {
    id: 'elf',
    look: { build: 'lean', skin: ['fair', 'tan'], hair: ['blond', 'black', 'red'], style: ['long', 'bun'], beard: 'none' },
  },
  {
    id: 'tirak',
    look: { build: 'stout', skin: ['brown', 'ruddy'], hair: 'black', style: ['bald', 'short'], beard: 'none' },
  },
  {
    id: 'missla',
    look: { build: 'child', skin: ['fair', 'tan'], hair: ['brown', 'red', 'blond'], style: ['short', 'long'], beard: 'none' },
  },
];

export default kinds;

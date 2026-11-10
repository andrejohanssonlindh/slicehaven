/**
 * What every hero sets out with (plan B6), until the creator's equipment packages give their own: pockets in their
 * clothes, a pack on their back, and a few things in it. Grids are cells of about a fist (10 cm);
 * `core/world3d/inventory.ts` has the rules. The side pouch comes loose in the pack, to be fitted on a side.
 */
export const HERO_KIT = {
  /** Two pockets of 2 × 2 cells: pocket-sized things only. */
  pockets: [[2, 2], [2, 2]] as const,
  /** The pack worn on the back (a kind with `bag`). */
  pack: 'backpack',
  /** What is in the pockets and the pack at the start, by kind (laid where they first fit). */
  items: ['side-pouch', 'waterskin', 'pan', 'loaf', 'tinderbox'],
};

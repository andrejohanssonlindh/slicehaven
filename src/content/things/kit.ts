/**
 * What every hero sets out with (plan B6): pockets in their clothes, a pack on their back, a purse with their silver,
 * and a few things everyone has. On top of this, a bundle for each equipment package they own from the creator
 * (`content/things/kinds/kits.ts`, `packageKinds`). Grids are cells of about a fist (10 cm); `core/world3d/inventory.ts`
 * has the rules. The side pouch comes loose in the pack, to be fitted on a side.
 */
export const HERO_KIT = {
  /** Two pockets of 2 × 2 cells: pocket-sized things only. */
  pockets: [[2, 2], [2, 2]] as const,
  /** The pack worn on the back (a kind with `bag`). */
  pack: 'backpack',
  /** A purse with the hero's silver in it (plan B6), in a pocket. */
  purse: 'purse',
  /** What everyone has besides their packages, by kind (laid where they first fit, after the packages). */
  items: ['side-pouch', 'loaf', 'tinderbox'],
};

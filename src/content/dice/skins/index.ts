/**
 * Dice skins (plan item B2): how the dice look, kept apart from how they roll so a skin can be swapped (or won, one
 * day). One file per skin, its default export a `DiceSkin`, found by itself.
 */
export interface DiceSkin {
  id: string;
  /** Its name in English (shown through `t('dice.skin.<id>', name)`). */
  name: string;
  /** The die's body, its edges, and its pips or numbers (CSS colours). */
  body: string;
  edge: string;
  pip: string;
  /** The glow on a six that splits into two new dice. */
  split: string;
}

const files = import.meta.glob<{ default: DiceSkin }>(['./*.ts', '!./index.ts'], { eager: true });

/** Every skin, by id. */
export const DICE_SKINS: Record<string, DiceSkin> = Object.fromEntries(Object.values(files).map((m) => [m.default.id, m.default]));

/** The skin a new player starts with. */
export const DEFAULT_SKIN = 'bone';

/** A skin by id, or the default one. */
export const skinOf = (id: string | undefined): DiceSkin => DICE_SKINS[id ?? ''] ?? DICE_SKINS[DEFAULT_SKIN];

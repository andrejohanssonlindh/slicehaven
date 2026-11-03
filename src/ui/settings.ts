/**
 * The player's settings, shared by every page (kept in the browser). Versioned like every save: settings of another
 * version are dropped for the defaults.
 */

/** How rolls are shown (plan item B2): dice thrown on glass over the game, small spinning dice, or just the result. */
export type DiceLevel = 'glass' | 'icons' | 'result';
export const DICE_LEVELS: readonly DiceLevel[] = ['glass', 'icons', 'result'];

/** When a roll's show goes away: when the player presses OK, or by itself after a moment. */
export type DiceClose = 'ok' | 'auto';
export const DICE_CLOSES: readonly DiceClose[] = ['ok', 'auto'];

/**
 * The portrait when you talk to someone (Q37: decided by trying): their own 3D body close up, the same rendered finer
 * (more detail), or painted per pixel from their look.
 */
export type PortraitStyle = '3d' | 'fine' | 'painted';
export const PORTRAIT_STYLES: readonly PortraitStyle[] = ['3d', 'fine', 'painted'];

export interface Settings {
  v: number;
  dice: DiceLevel;
  diceSkin: string;
  diceClose: DiceClose;
  portrait: PortraitStyle;
}

const VERSION = 1;
const KEY = 'slicehaven.settings';
const DEFAULTS: Settings = { v: VERSION, dice: 'glass', diceSkin: 'bone', diceClose: 'ok', portrait: '3d' };

/** What this page has set, if storage would not keep it. */
let memo: Settings | null = null;

export function loadSettings(): Settings {
  if (memo) return { ...memo };
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Settings | null;
    return s && s.v === VERSION ? { ...DEFAULTS, ...s } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

/** Change some settings and keep them. */
export function saveSettings(change: Partial<Omit<Settings, 'v'>>): Settings {
  const s = { ...loadSettings(), ...change, v: VERSION };
  memo = s;
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* a private window: kept for this page only */
  }
  return s;
}

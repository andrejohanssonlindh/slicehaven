/**
 * The player's settings, shared by every page (kept in the browser). Versioned like every save: settings of another
 * version are dropped for the defaults.
 */

/** How rolls are shown (plan item B2): dice thrown on glass over the game, small spinning dice, or just the result. */
export type DiceLevel = 'glass' | 'icons' | 'result';
export const DICE_LEVELS: readonly DiceLevel[] = ['glass', 'icons', 'result'];

export interface Settings {
  v: number;
  dice: DiceLevel;
  diceSkin: string;
}

const VERSION = 1;
const KEY = 'slicehaven.settings';
const DEFAULTS: Settings = { v: VERSION, dice: 'icons', diceSkin: 'bone' };

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

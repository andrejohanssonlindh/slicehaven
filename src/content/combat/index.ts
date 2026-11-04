import { type FightCondition, type FightDoing, type FightLibrary, type FightStyle, type Style, resolveStyle } from '../../core/fightmind';

/**
 * How people fight (plan B8; `core/fightmind.ts`, design `director/design/fight-minds.md`): conditions in `when/`,
 * choices in `does/`, styles in `styles/`, one file each (or a small family as an array). A new file is a new one,
 * nothing else to edit. A style is named after the kind of person it is for (`gladiator`), or given to someone in a
 * map (`"fights": "coward"`); everyone else fights by `default`.
 */
const whenFiles = import.meta.glob<{ default: FightCondition | FightCondition[] }>('./when/*.ts', { eager: true });
const doFiles = import.meta.glob<{ default: FightDoing | FightDoing[] }>('./does/*.ts', { eager: true });
const styleFiles = import.meta.glob<{ default: FightStyle }>('./styles/*.ts', { eager: true });

function byId<T extends { id: string }>(files: Record<string, { default: T | T[] }>, what: string): Record<string, T> {
  const out: Record<string, T> = {};
  for (const m of Object.values(files)) {
    for (const x of [m.default].flat() as T[]) {
      if (out[x.id]) throw new Error(`two ${what} are called ${x.id}`);
      out[x.id] = x;
    }
  }
  return out;
}

export const FIGHT_MINDS: FightLibrary = { when: byId(whenFiles, 'fight conditions'), does: byId(doFiles, 'fight choices') };
export const FIGHT_STYLES: Record<string, FightStyle> = byId(styleFiles, 'fighting styles');

/**
 * The style someone fights by: their own (a map's `fights`), else the one named after the nearest kind in their chain
 * (most general first, as `PERSON_KINDS.resolve` gives it), else the default.
 */
export function styleFor(chain: readonly string[], own?: string): Style {
  if (own && FIGHT_STYLES[own]) return resolveStyle(own, FIGHT_STYLES);
  for (let i = chain.length - 1; i >= 0; i--) if (FIGHT_STYLES[chain[i]]) return resolveStyle(chain[i], FIGHT_STYLES);
  return resolveStyle('default', FIGHT_STYLES);
}

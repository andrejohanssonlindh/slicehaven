import type { Behaviour, BehaviourLibrary, Condition } from '../../core/world3d/behave';

/**
 * What people can do and what their schedules can ask, one file each (or a small family as an array): behaviours in
 * `does/`, conditions in `when/`. A new file is a new behaviour or condition, nothing else to edit. See
 * `core/world3d/behave.ts` and `director/design/behaviours.md`. (A vitest run that misses a brand-new file has a stale
 * glob: edit this file once.)
 */
const doFiles = import.meta.glob<{ default: Behaviour | Behaviour[] }>('./does/*.ts', { eager: true });
const whenFiles = import.meta.glob<{ default: Condition | Condition[] }>('./when/*.ts', { eager: true });

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

export const BEHAVIOURS: BehaviourLibrary = { does: byId(doFiles, 'behaviours'), when: byId(whenFiles, 'conditions') };

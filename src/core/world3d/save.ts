import type { StatesJSON } from './state';

/**
 * The saved world (plan item B1): one versioned JSON record per map, in the browser's storage. What it holds is what
 * the rules can't make again from the map: where the hero is, the clock, what has been seen, and the states of
 * placed things that differ from their kind's start. The people need nothing: they follow their day by the clock.
 *
 * No migrations while the design moves: a save of another version is dropped. Bump `WORLD_SAVE_VERSION` whenever
 * the shape changes or the maps change in a way that moves things (ids are where things stand).
 */
export const WORLD_SAVE_VERSION = 2;

export interface WorldSave {
  v: number;
  map: string;
  /** World time: the hour, 0..24. */
  hour: number;
  hero: { x: number; z: number; level: number };
  /** What has been seen (`Explored.toJSON`). */
  explored: Record<string, string>;
  /** Placed things' states (`ThingStates.toJSON`). */
  things: StatesJSON;
  /** Flags set by actions (`core/world3d/actions.ts`). */
  flags: Record<string, boolean>;
}

const key = (map: string): string => `slicehaven.world.${map}`;

/** The map's save, or null if there is none or it is from another version. */
export function loadWorld(map: string, storage: Pick<Storage, 'getItem'>): WorldSave | null {
  try {
    const raw = storage.getItem(key(map));
    if (!raw) return null;
    const s = JSON.parse(raw) as WorldSave;
    return s && s.v === WORLD_SAVE_VERSION && s.map === map ? s : null;
  } catch {
    return null;
  }
}

/** Write the save. Returns false if the browser would not take it (a private window, storage full). */
export function saveWorld(s: Omit<WorldSave, 'v'>, storage: Pick<Storage, 'setItem'>): boolean {
  try {
    storage.setItem(key(s.map), JSON.stringify({ v: WORLD_SAVE_VERSION, ...s }));
    return true;
  } catch {
    return false;
  }
}

/** Forget the map's save (a new game). */
export function clearWorld(map: string, storage: Pick<Storage, 'removeItem'>): void {
  try {
    storage.removeItem(key(map));
  } catch {
    /* nothing to forget */
  }
}

import type { MapSpec } from '../core/world3d/mapgen';

/**
 * Map drafts (plan C5): a map being changed in the map maker is kept in this browser until it is saved to its file
 * or dropped. The 3D world opens a draft with `?map=<name>&draft` ("Look in 3D").
 */
const KEY = 'slicehaven.mapdraft.';

export function loadDraft(name: string): MapSpec | null {
  try {
    const s = localStorage.getItem(KEY + name);
    return s ? (JSON.parse(s) as MapSpec) : null;
  } catch {
    return null;
  }
}

export function saveDraft(spec: MapSpec): void {
  localStorage.setItem(KEY + spec.name, JSON.stringify(spec));
}

export function dropDraft(name: string): void {
  localStorage.removeItem(KEY + name);
}

/** The names of every map with a draft here (a draft may be of a map not yet in the game). */
export function draftNames(): string[] {
  const out: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(KEY)) out.push(k.slice(KEY.length));
  }
  return out.sort();
}

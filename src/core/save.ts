/**
 * Save system. Uses localStorage (cookies cap out at ~4 KB and are sent to the
 * server on every request). Saves are versioned so old saves can be migrated.
 * Export/import as a text code lets players back up or move between devices.
 */
export const SAVE_VERSION = 1;
const STORAGE_KEY = 'slicehaven.save';

export interface SaveData {
  version: number;
  savedAt: string;
  campaign: {
    completedScenarios: string[];
    unlockedScenarios: string[];
    flags: Record<string, boolean | number | string>;
    gold: number;
  };
  party: {
    heroId: string;
    level: number;
    xp: number;
    gear: string[];
  }[];
}

export function newSave(): SaveData {
  return {
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    campaign: { completedScenarios: [], unlockedScenarios: ['s01'], flags: {}, gold: 0 },
    party: [],
  };
}

function migrate(data: SaveData): SaveData {
  // Future: if (data.version === 1) { ...; data.version = 2; }
  return data;
}

export function writeSave(data: SaveData, storage: Storage = localStorage): void {
  storage.setItem(STORAGE_KEY, JSON.stringify({ ...data, savedAt: new Date().toISOString() }));
}

export function readSave(storage: Storage = localStorage): SaveData | null {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return migrate(JSON.parse(raw) as SaveData);
  } catch {
    return null;
  }
}

export function exportSave(data: SaveData): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
}

export function importSave(code: string): SaveData {
  const data = JSON.parse(decodeURIComponent(escape(atob(code.trim())))) as SaveData;
  if (typeof data.version !== 'number' || !data.campaign) throw new Error('Not a Slicehaven save');
  return migrate(data);
}

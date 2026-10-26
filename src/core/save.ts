/**
 * Save system, placeholder while the design is moving. Uses localStorage (cookies
 * cap out at ~4 KB and are sent to the server on every request). There are no
 * migrations: a save with another version is discarded. Export/import as a text
 * code lets players back up or move between devices.
 */
export const SAVE_VERSION = 1;
const STORAGE_KEY = 'slicehaven.save';

export interface SaveData {
  version: number;
  savedAt: string;
  campaign: {
    flags: Record<string, boolean | number | string>;
    silver: number;
  };
}

export function newSave(): SaveData {
  return {
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    campaign: { flags: {}, silver: 0 },
  };
}

export function writeSave(data: SaveData, storage: Storage = localStorage): void {
  storage.setItem(STORAGE_KEY, JSON.stringify({ ...data, savedAt: new Date().toISOString() }));
}

export function readSave(storage: Storage = localStorage): SaveData | null {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as SaveData;
    return data.version === SAVE_VERSION ? data : null;
  } catch {
    return null;
  }
}

export function exportSave(data: SaveData): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
}

export function importSave(code: string): SaveData {
  const data = JSON.parse(decodeURIComponent(escape(atob(code.trim())))) as SaveData;
  if (data.version !== SAVE_VERSION || !data.campaign) throw new Error('Not a save from this version of Slicehaven');
  return data;
}

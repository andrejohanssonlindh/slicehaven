import { type Hex, hex, hexDistance, hexKey } from '../core/hex';

/**
 * Scenario map data. A map is a set of rooms; rooms other than the first are
 * hidden until a hero steps on a door that opens into them (Gloomhaven style).
 */
export interface RoomDef {
  id: string;
  hexes: Hex[];
}

export interface DoorDef {
  at: Hex;
  opens: string; // room id
}

export interface EnemyPlacement {
  id: string;
  name: string;
  at: Hex;
  hp: number;
  room: string;
}

export interface ScenarioDef {
  id: string;
  name: string;
  intro: string;
  rooms: RoomDef[];
  doors: DoorDef[];
  start: Hex;
  enemies: EnemyPlacement[];
}

function blob(center: Hex, radius: number, without: Hex[] = []): Hex[] {
  const skip = new Set(without.map(hexKey));
  const out: Hex[] = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      const h = hex(center.q + q, center.r + r);
      if (hexDistance(center, h) <= radius && !skip.has(hexKey(h))) out.push(h);
    }
  }
  return out;
}

/** Tech prototype map, used to test movement, fog and the dice loop. */
export const PROTOTYPE: ScenarioDef = {
  id: 's00',
  name: 'The Dead Forest Edge',
  intro: 'Bones rattle somewhere beyond the treeline. Roll your dice and press on.',
  rooms: [
    { id: 'clearing', hexes: blob(hex(0, 2), 2) },
    { id: 'path', hexes: [hex(1, -1), hex(1, -2), hex(2, -3)] },
    { id: 'grove', hexes: blob(hex(2, -5), 2) },
  ],
  doors: [
    { at: hex(1, -1), opens: 'path' },
    { at: hex(2, -3), opens: 'grove' },
  ],
  start: hex(-1, 3),
  enemies: [
    { id: 'skel1', name: 'Skeleton', at: hex(2, -6), hp: 4, room: 'grove' },
    { id: 'skel2', name: 'Skeleton', at: hex(3, -5), hp: 4, room: 'grove' },
  ],
};

export const SCENARIOS: Record<string, ScenarioDef> = { [PROTOTYPE.id]: PROTOTYPE };

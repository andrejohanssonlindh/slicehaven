import type { Battle, Unit } from '../core/battle';
import { hexKey, offsetToHex } from '../core/hex';
import type { CellArt, MobKind, PropKind } from '../art/mapScene';
import type { Ground } from '../art/terrain';

/** Stat blocks for the sandbox. Placeholder numbers. */
export interface UnitStats {
  name: string;
  sprite: MobKind;
  variant?: string; // palette swap
  team: Unit['team'];
  hp: number;
  move: number;
  damage: number;
}

export const STATS: Record<string, UnitStats> = {
  shepherd: { name: 'Shepherd', sprite: 'shepherd', team: 'party', hp: 10, move: 4, damage: 2 },
  herbalist: { name: 'Herbalist', sprite: 'shepherd', variant: 'herbalist', team: 'party', hp: 8, move: 3, damage: 1 },
  wolf: { name: 'Wolf', sprite: 'wolf', team: 'foe', hp: 6, move: 4, damage: 2 },
  rat: { name: 'Giant rat', sprite: 'rat', team: 'foe', hp: 4, move: 3, damage: 1 },
  skeleton: { name: 'Skeleton', sprite: 'skeleton', team: 'foe', hp: 8, move: 2, damage: 2 },
};

/** Forest clearing, offset coords. Legend below. */
const LAYOUT = [
  'TPfggg~gPT',
  'Pfgwg~ggfP',
  'fmggg~tggT',
  'fgpg~tRggf',
  'Tgpgg~ggtB',
  'gRpg~tgwgg',
  'ggp~~goggT',
  'Pg~ptggBgf',
  'Tg~pgwggtP',
  'ft~gpggRgT',
  'TPg~pgfTPT',
];

/** River pieces: [entry edge, exit edge] (0 E, 1 NE, 2 NW, 3 W, 4 SW, 5 SE). */
const RIVERS: Record<string, [number, number]> = {
  '6,0': [2, 4], '5,1': [1, 4], '5,2': [1, 4], '4,3': [1, 5], '5,4': [2, 4], '4,5': [1, 4],
  '4,6': [1, 3], '3,6': [0, 4], '2,7': [1, 4], '2,8': [1, 5], '2,9': [2, 5], '3,10': [2, 4],
};

/** Shallow fords: river you can wade across. */
const FORDS = new Set(['3,6', '2,9']);

const LEGEND: Record<string, { ground: Ground; prop?: PropKind; obstacle?: boolean; pond?: boolean }> = {
  g: { ground: 'grass' },
  f: { ground: 'forest' },
  p: { ground: 'path' },
  t: { ground: 'tallgrass' },
  w: { ground: 'flowers' },
  m: { ground: 'forest', prop: 'mushrooms' },
  o: { ground: 'grass', pond: true },
  '~': { ground: 'grass' },
  T: { ground: 'forest', prop: 'tree', obstacle: true },
  P: { ground: 'forest', prop: 'pine', obstacle: true },
  R: { ground: 'grass', prop: 'rock', obstacle: true },
  B: { ground: 'grass', prop: 'thicket', obstacle: true },
};

const START_UNITS: [string, number, number][] = [
  ['shepherd', 2, 4], ['herbalist', 1, 3],
  ['wolf', 7, 3], ['wolf', 7, 5], ['skeleton', 6, 2], ['rat', 5, 8],
];

export interface SandboxCell extends CellArt {
  ford?: boolean;
}

export function buildSandbox(): { cells: SandboxCell[]; battle: Battle } {
  const cells: SandboxCell[] = [];
  const battle: Battle = { cells: {}, units: [] };
  LAYOUT.forEach((line, row) => {
    [...line].forEach((ch, col) => {
      const key = `${col},${row}`;
      const def = LEGEND[ch];
      const cell: SandboxCell = { col, row, ...def, river: RIVERS[key], ford: FORDS.has(key) };
      cells.push(cell);
      const at = offsetToHex(col, row);
      const water = (!!cell.river && !cell.ford) || !!cell.pond;
      const flammable = !water && !cell.river && def.ground !== 'path' && def.prop !== 'rock';
      battle.cells[hexKey(at)] = { at, obstacle: !!def.obstacle, flammable, water, fire: 'none' };
    });
  });
  START_UNITS.forEach(([kind, col, row], i) => battle.units.push(newUnit(kind, offsetToHex(col, row), i)));
  return { cells, battle };
}

let nextId = 100;

export function newUnit(kind: string, at: Unit['at'], id = nextId++): Unit {
  const s = STATS[kind];
  return { id: `${kind}-${id}`, kind, name: s.name, team: s.team, at, hp: s.hp, maxHp: s.hp };
}

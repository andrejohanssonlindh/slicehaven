import type { Rng } from './rng';

/**
 * Dice model. A die is a list of faces; each face is an action.
 * Gear can modify a die (add/remove faces, buff a face kind), which is why
 * a "D6" can become a D5 or D7 - dice are not fixed to six sides.
 */
export type FaceKind =
  | 'attack' | 'range' | 'move' | 'jump' | 'heal' | 'shield'
  | 'bleed' | 'poison' | 'rend' | 'disease'
  | 'blank';

export interface Face {
  kind: FaceKind;
  value: number;
  /**
   * Optional riders, e.g. 'push', 'lose', or a status with strength like 'bleed:1'.
   * Effects resolved by the combat engine.
   */
  tags?: string[];
}

export interface DieDef {
  id: string;
  name: string;
  faces: Face[];
}

export type DieModifier =
  | { type: 'addFace'; face: Face }
  | { type: 'removeFace'; index: number }
  | { type: 'bonus'; kind: FaceKind; amount: number }
  | { type: 'replaceFace'; index: number; face: Face };

/** Apply gear modifiers to a die definition, returning the effective faces. */
export function effectiveFaces(die: DieDef, mods: readonly DieModifier[]): Face[] {
  let faces: Face[] = die.faces.map((f) => ({ ...f, ...(f.tags && { tags: [...f.tags] }) }));
  for (const m of mods) {
    switch (m.type) {
      case 'addFace':
        faces.push({ ...m.face });
        break;
      case 'removeFace':
        if (faces.length > 1) faces = faces.filter((_, i) => i !== m.index);
        break;
      case 'replaceFace':
        if (faces[m.index]) faces[m.index] = { ...m.face };
        break;
      case 'bonus':
        for (const f of faces) if (f.kind === m.kind) f.value += m.amount;
        break;
    }
  }
  return faces;
}

export function rollFace(faces: readonly Face[], rng: Rng): Face {
  return rng.pick(faces);
}

/**
 * Gloomhaven-style exhaustion loop, with dice instead of cards:
 *  - ready:   dice you can roll this round
 *  - spent:   used dice (Gloomhaven "discard")
 *  - lost:    gone for the rest of the scenario
 * When nothing is ready you must rest: every spent die returns, but one is lost.
 * When you cannot act and cannot rest, you are exhausted.
 */
export interface DicePool {
  ready: string[];
  spent: string[];
  lost: string[];
}

export const newPool = (dieIds: readonly string[]): DicePool => ({
  ready: [...dieIds],
  spent: [],
  lost: [],
});

export function spend(pool: DicePool, dieId: string): DicePool {
  if (!pool.ready.includes(dieId)) throw new Error(`Die ${dieId} is not ready`);
  return {
    ...pool,
    ready: pool.ready.filter((d) => d !== dieId),
    spent: [...pool.spent, dieId],
  };
}

export const mustRest = (pool: DicePool): boolean => pool.ready.length === 0 && pool.spent.length > 0;

export const isExhausted = (pool: DicePool): boolean =>
  pool.ready.length === 0 && pool.spent.length <= 1;

/** Rest: all spent dice return to ready, except `loseId` which is lost. */
export function rest(pool: DicePool, loseId: string): DicePool {
  if (!pool.spent.includes(loseId)) throw new Error(`Die ${loseId} is not spent`);
  return {
    ready: [...pool.ready, ...pool.spent.filter((d) => d !== loseId)],
    spent: [],
    lost: [...pool.lost, loseId],
  };
}

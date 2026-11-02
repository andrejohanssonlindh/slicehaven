import type { PlacedProp } from './props';
import type { Things } from './things';

/**
 * State on placed things (plan item B1): a fire lit or out, a door open, a barrel emptied. A kind says which states
 * its things can have and what each starts as (`states` on `ThingDef`, inherited down the kind tree); a placed thing
 * only stores what differs from its kind's start, so an untouched world saves as nothing. Plain JSON, for the save.
 *
 * Every placed thing has an id that is the same each time the map is built (maps are rules with seeds, so where a
 * thing lands is stable within a version; saves from another version are dropped anyway).
 */

export type StateValue = boolean | number | string;

/** One state a kind of thing can be in, and what it starts as. */
export interface StateDef {
  default: StateValue;
}

/** What is stored: by thing id, its states that differ from its kind's start. */
export type StatesJSON = Record<string, Record<string, StateValue>>;

/** The id of a thing placed out of doors (by a map or a map rule): its kind and where it stands, to the decimetre. */
export const placedId = (p: Pick<PlacedProp, 'kind' | 'x' | 'z'>): string => `${p.kind}@${Math.round(p.x * 10)},${Math.round(p.z * 10)}`;

/** The id of a piece of furniture: its house, the room (its index among the house's furnished rooms) and the piece's id in the room's plan. */
export const pieceId = (house: string, room: number, piece: string): string => `${house}/${room}/${piece}`;

/** A change to a thing's state, as told to whoever listens (the renderer redraws, the save is due); they ask `get` for the value. */
export interface StateChange {
  id: string;
  key: string;
}

export class ThingStates {
  private readonly data: StatesJSON;
  private readonly listeners = new Set<(c: StateChange) => void>();

  constructor(private readonly things: Things, data: StatesJSON = {}) {
    this.data = structuredClone(data);
  }

  /** The state's definition on the kind; throws if the kind has no such state (a typo, or a thing that cannot be in it). */
  private def(kind: string, key: string): StateDef {
    const d = this.things.get(kind).states?.[key];
    if (!d) throw new Error(`a ${kind} has no state called ${key}`);
    return d;
  }

  /** Can this kind of thing be in this state at all? */
  has(kind: string, key: string): boolean {
    return !!this.things.get(kind).states?.[key];
  }

  get(id: string, kind: string, key: string): StateValue {
    const d = this.def(kind, key);
    return this.data[id]?.[key] ?? d.default;
  }

  /** Set a state. Returns whether anything changed. The value must be of the same type as the kind's start. */
  set(id: string, kind: string, key: string, value: StateValue): boolean {
    const d = this.def(kind, key);
    if (typeof value !== typeof d.default) throw new Error(`${kind}.${key} is a ${typeof d.default}, not ${JSON.stringify(value)}`);
    if (this.get(id, kind, key) === value) return false;
    if (value === d.default) {
      delete this.data[id][key];
      if (!Object.keys(this.data[id]).length) delete this.data[id];
    } else (this.data[id] ??= {})[key] = value;
    for (const l of this.listeners) l({ id, key });
    return true;
  }

  /** Listen to every change; returns the way to stop. */
  on(listener: (c: StateChange) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Take states from a save, replacing what is held, and tell the listeners about every thing that changes. */
  assign(data: StatesJSON): void {
    const before = this.data;
    const ids = new Set([...Object.keys(before), ...Object.keys(data)]);
    const old = structuredClone(before);
    for (const k of Object.keys(before)) delete before[k];
    Object.assign(before, structuredClone(data));
    for (const id of ids) {
      const keys = new Set([...Object.keys(old[id] ?? {}), ...Object.keys(data[id] ?? {})]);
      for (const key of keys) {
        const was = old[id]?.[key], now = data[id]?.[key];
        if (was !== now) for (const l of this.listeners) l({ id, key });
      }
    }
  }

  /** How many things differ from their kind's start. */
  get count(): number {
    return Object.keys(this.data).length;
  }

  toJSON(): StatesJSON {
    return structuredClone(this.data);
  }
}

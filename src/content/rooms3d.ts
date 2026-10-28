import { humbleItems } from '../art/humble';
import { smithyItems } from '../art/interior';
import type { RoomItem } from '../art/interior';
import { bakeryItems, fisherHomeItems, fishmongerItems, generalStoreItems, herbalistItems, innItems, weaverItems } from './village/rooms';

/**
 * What is inside a house in the 3D world. A set reuses the village's furnished rooms
 * (the people in them are left out: the 3D world has its own). u across the room, d from
 * the door to the back wall, as in `RoomItem`. `fire` is where the hearth, oven or forge
 * burns (light and a filament source), or null if the room has none.
 */

export type RoomSet = 'home' | 'fisher' | 'inn' | 'bakery' | 'herbalist' | 'fishmonger' | 'general' | 'weaver' | 'smithy';

export interface RoomSetDef {
  items: () => RoomItem[];
  fire: { u: number; d: number } | null;
}

export const ROOM_SETS: Record<RoomSet, RoomSetDef> = {
  home: { items: humbleItems, fire: { u: 0.8, d: 0.88 } },
  fisher: { items: fisherHomeItems, fire: { u: 0.8, d: 0.88 } },
  inn: { items: innItems, fire: { u: 0.88, d: 0.9 } },
  bakery: { items: bakeryItems, fire: { u: 0.78, d: 0.86 } },
  herbalist: { items: herbalistItems, fire: { u: 0.88, d: 0.9 } },
  fishmonger: { items: fishmongerItems, fire: { u: 0.9, d: 0.9 } },
  general: { items: generalStoreItems, fire: null },
  weaver: { items: weaverItems, fire: { u: 0.9, d: 0.9 } },
  smithy: { items: smithyItems, fire: { u: 0.76, d: 0.62 } },
};

/** The furniture of a set, without people. */
export const furnitureOf = (set: RoomSet): RoomItem[] => ROOM_SETS[set].items().filter((it) => !it.person);

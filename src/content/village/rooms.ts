import { makeFolk } from '../../art/folk';
import {
  makeBasket, makeBucketBroom, makeCloakPegs, makeClutter, makeCookhearth, makeFootlocker, makeKeg, makeKindling, makePallet, makeRagRug,
  makeRoughShelf, makeSacks, makeStool3, makeStrawBits, makeTrestleTable, humbleItems,
} from '../../art/humble';
import type { RoomItem } from '../../art/interior';
import { smithyItems } from '../../art/interior';
import {
  makeAleKegs, makeBakeOven, makeCounter, makeCrateStack, makeFishRack, makeFishTubs, makeHerbRack, makeHooks, makeHungNet, makeInnBench,
  makeKneadTrough, makeLongTable, makeLoom, makeMortarBench, makeNetHeap, makeWallShelves,
} from '../../art/shopItems';
import { PEOPLE } from './folk';

/**
 * What is inside each furnished house. u runs across the room (0 left .. 1 right),
 * d from the door (0) to the back wall (1). `lift` hangs a piece on the wall.
 * People are items too: the shopkeeper stands behind the counter.
 */

const who = (key: string, u: number, d: number): RoomItem => ({ prop: makeFolk(PEOPLE[key]), u, d, person: true });

/** A fisher's family home: the village's usual one-room house, plus the nets and the catch. */
export function fisherHomeItems(): RoomItem[] {
  const base = humbleItems().filter((it) => it.u < 0.85 || it.d > 0.4); // drop the sacks to make room for the nets
  return [
    ...base,
    { prop: makeNetHeap(3), u: 0.9, d: 0.2 },
    { prop: makeHungNet(5), u: 0.5, d: 0.99, lift: 18 },
    who('mother', 0.34, 0.55),
    who('boy', 0.7, 0.3),
  ];
}

/** The inn: a bar with the kegs behind it, a long table and benches, a fire, a regular or two. */
export function innItems(): RoomItem[] {
  return [
    { prop: makeRagRug(4), u: 0.6, d: 0.36 },
    { prop: makeWallShelves('tankards', 41), u: 0.3, d: 0.99, lift: 26 },
    { prop: makeCloakPegs(9), u: 0.04, d: 0.99, lift: 4 },
    { prop: makeCookhearth(8), u: 0.9, d: 0.97 },
    { prop: makeAleKegs(2), u: 0.1, d: 0.94 },
    { prop: makeCounter('ale', 3), u: 0.34, d: 0.74 },
    who('innkeeper', 0.4, 0.93),
    { prop: makeInnBench(4), u: 0.62, d: 0.66 },
    { prop: makeLongTable(5), u: 0.62, d: 0.5 },
    { prop: makeInnBench(6), u: 0.62, d: 0.3 },
    who('fisher', 0.52, 0.46),
    who('drunk', 0.76, 0.42),
    { prop: makeTrestleTable(7), u: 0.14, d: 0.4 },
    { prop: makeStool3(8), u: 0.24, d: 0.34 },
    { prop: makeKeg(9), u: 0.95, d: 0.5 },
    { prop: makeBucketBroom(), u: 0.95, d: 0.12 },
  ];
}

/** The bakery: the oven at the back, flour and kindling, a counter with the day's loaves. */
export function bakeryItems(): RoomItem[] {
  return [
    { prop: makeStrawBits(4), u: 0.3, d: 0.6 },
    { prop: makeBakeOven(2), u: 0.78, d: 0.93 },
    { prop: makeWallShelves('loaves', 3), u: 0.34, d: 0.99, lift: 22 },
    { prop: makeKneadTrough(4), u: 0.14, d: 0.9 },
    { prop: makeSacks(5), u: 0.02, d: 0.56 },
    { prop: makeKindling(6), u: 0.95, d: 0.62 },
    { prop: makeCounter('bread', 7), u: 0.48, d: 0.3 },
    who('baker', 0.5, 0.55),
    { prop: makeBasket(8), u: 0.9, d: 0.24 },
    { prop: makeBucketBroom(), u: 0.07, d: 0.3 },
    { prop: makeStool3(9), u: 0.78, d: 0.5 },
  ];
}

/** The herbalist's: a bench of jars and mortars, bundles drying overhead, a sickbed in the corner. */
export function herbalistItems(): RoomItem[] {
  return [
    { prop: makeRagRug(6), u: 0.5, d: 0.5 },
    { prop: makeWallShelves('bottles', 12), u: 0.22, d: 0.99, lift: 24 },
    { prop: makeWallShelves('jars', 13), u: 0.7, d: 0.99, lift: 24 },
    { prop: makeHerbRack(14), u: 0.46, d: 0.99, lift: 48 },
    { prop: makePallet(15), u: 0.14, d: 0.9 },
    { prop: makeCookhearth(16), u: 0.9, d: 0.97 },
    { prop: makeMortarBench(17), u: 0.62, d: 0.66 },
    who('herbalist', 0.62, 0.86),
    { prop: makeCounter('herbs', 18), u: 0.4, d: 0.3 },
    { prop: makeBasket(19), u: 0.06, d: 0.45 },
    { prop: makeStool3(20), u: 0.9, d: 0.44 },
    { prop: makeBucketBroom(), u: 0.95, d: 0.2 },
    { prop: makeClutter(21), u: 0.78, d: 0.18 },
  ];
}

/** The fishmonger's: tubs of the catch, a cutting counter, a smoking rack and nets. */
export function fishmongerItems(): RoomItem[] {
  return [
    { prop: makeStrawBits(22), u: 0.5, d: 0.5 },
    { prop: makeHungNet(23), u: 0.26, d: 0.99, lift: 14 },
    { prop: makeHooks(24), u: 0.7, d: 0.99, lift: 10 },
    { prop: makeCookhearth(25), u: 0.92, d: 0.97 },
    { prop: makeFishRack(26), u: 0.7, d: 0.8 },
    { prop: makeNetHeap(27), u: 0.06, d: 0.8 },
    { prop: makeFishTubs(28), u: 0.14, d: 0.44 },
    { prop: makeCounter('fish', 29), u: 0.55, d: 0.3 },
    who('fishwife', 0.55, 0.52),
    { prop: makeKeg(30), u: 0.95, d: 0.42 },
    { prop: makeBucketBroom(), u: 0.04, d: 0.2 },
  ];
}

/** The general store: a bit of everything, from rope and pans to turnips. */
export function generalStoreItems(): RoomItem[] {
  return [
    { prop: makeRagRug(31), u: 0.5, d: 0.5 },
    { prop: makeWallShelves('wares', 32), u: 0.3, d: 0.99, lift: 22 },
    { prop: makeHooks(33), u: 0.72, d: 0.99, lift: 8 },
    { prop: makeCrateStack(34), u: 0.12, d: 0.8 },
    { prop: makeSacks(35), u: 0.93, d: 0.62 },
    { prop: makeKeg(36), u: 0.95, d: 0.3 },
    { prop: makeFootlocker(37), u: 0.06, d: 0.46 },
    { prop: makeCounter('general', 38), u: 0.5, d: 0.34 },
    who('trader', 0.52, 0.56),
    { prop: makeBasket(39), u: 0.84, d: 0.16 },
    { prop: makeBucketBroom(), u: 0.03, d: 0.22 },
  ];
}

/** The weaver's: a loom with a half-woven bolt, dyed cloth on the shelves, a counter for customers. */
export function weaverItems(): RoomItem[] {
  return [
    { prop: makeRagRug(40), u: 0.4, d: 0.46 },
    { prop: makeWallShelves('bolts', 41), u: 0.3, d: 0.99, lift: 24 },
    { prop: makeCloakPegs(42), u: 0.58, d: 0.99, lift: 8 },
    { prop: makePallet(43), u: 0.12, d: 0.9 },
    { prop: makeCookhearth(44), u: 0.92, d: 0.97 },
    { prop: makeLoom(45), u: 0.74, d: 0.74 },
    who('weaver', 0.72, 0.5),
    { prop: makeCounter('cloth', 46), u: 0.34, d: 0.3 },
    { prop: makeBasket(47), u: 0.6, d: 0.2 },
    { prop: makeStool3(48), u: 0.5, d: 0.62 },
    { prop: makeRoughShelf(49), u: 0.88, d: 0.99, lift: 40 },
  ];
}

/** The smith works at the anvil: the workshop's own items plus the man himself. */
export function smithItems(): RoomItem[] {
  return [...smithyItems(), who('smith', 0.34, 0.52)];
}

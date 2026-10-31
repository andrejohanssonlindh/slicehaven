import type { RoomLine, Rule } from '../../../core/world3d/roomplan';
import type { ThingDef } from '../../../core/world3d/things';

/**
 * Kinds of room: what a room holds and where, as rules, never coordinates (the solver, `core/world3d/roomplan.ts`,
 * finds the places, and sizes come from the pieces' art). A map names the kind of a house's main room (`room`);
 * a building's other rooms are the kinds its `rooms` says for their role (the inn's guest rooms, the stable's stalls).
 *
 * A kind lists its `lines`, or inherits its parent's and changes them (`without` some pieces, `plus` its own): a
 * fisher's home is a home without the sacks, with nets. A new kind of room is a new entry here (or a new file).
 */

const back = (x?: number): Rule => ({ at: 'back', x });
const side = (wall: 'left' | 'right', z?: number): Rule => ({ at: 'side', wall, z });
const corner = (c: 'backLeft' | 'backRight' | 'frontLeft' | 'frontRight'): Rule => ({ at: 'corner', corner: c });
const center = (dx = 0, dz = 0): Rule => ({ at: 'center', dx, dz });
const free: Rule = { at: 'free' };

const room = (id: string, is: string, look: string, lines: RoomLine[]): ThingDef => ({ id, is, look, room: { lines } });

const things: ThingDef[] = [
  // A room is a part of a building, to the skill hooks.
  { id: 'room', is: 'structure', abstract: true },

  room('home', 'room', 'A one-room home: a hearth, a bed of straw, a table.', [
    { piece: 'hearth', rule: corner('backRight'), fire: true },
    { piece: 'pallet', rule: corner('backLeft') },
    { piece: 'shelf', rule: back(0.5), lift: 22 },
    { piece: 'pegs', rule: back(0.72), lift: 4 },
    { piece: 'hanging', rule: back(0.25), lift: 14 },
    // The table sits on the room's axis with a rug under it and a stool at each long side; the rest lines the walls.
    { piece: 'rug', rule: center() },
    { piece: 'table', rule: center() },
    { piece: 'stool', tag: 'front', rule: { at: 'around', of: 'table', side: 'front' } },
    { piece: 'stool', tag: 'back', rule: { at: 'around', of: 'table', side: 'back' } },
    { piece: 'footlocker', rule: side('left', 0.55) },
    { piece: 'keg', rule: side('right', 0.55) },
    { piece: 'sacks', rule: corner('frontRight') },
    { piece: 'broom', rule: side('left', 0.9) },
    { piece: 'basket', rule: free },
  ]),
  {
    id: 'fisher', is: 'home', look: 'A fisher’s home, smelling of nets and the water.',
    room: { without: ['sacks'], plus: [{ piece: 'nets', rule: side('right', 0.2) }, { piece: 'hungNet', rule: back(0.5), lift: 18 }] },
  },
  room('taproom', 'room', 'An inn’s common room: long tables, benches, a counter and kegs of ale.', [
    { piece: 'hearth', rule: corner('backRight'), fire: true },
    { piece: 'aleKegs', rule: corner('backLeft') },
    { piece: 'counter', variant: 'ale', seed: 3, rule: back(0.3) },
    { piece: 'shelf', variant: 'tankards', seed: 41, rule: back(0.3), lift: 26 },
    { piece: 'pegs', rule: back(0.02), lift: 4 },
    { piece: 'longTable', rule: center(0.2, 0.1) },
    { piece: 'innbench', rule: { at: 'around', of: 'longTable', side: 'front' } },
    { piece: 'innbench', seed: 1, rule: { at: 'around', of: 'longTable', side: 'back' } },
    { piece: 'table', rule: side('left', 0.6) },
    { piece: 'stool', rule: { at: 'around', of: 'table' } },
    { piece: 'keg', rule: side('right', 0.5) },
    { piece: 'broom', rule: side('right', 0.15) },
    { piece: 'rug', rule: center(0.2, 0.1) },
    // A big common room has a second long table, and more to sit at.
    { piece: 'longTable', tag: 'b', seed: 5, rule: center(-2.6, 0.3) },
    { piece: 'innbench', tag: 'b1', seed: 2, rule: { at: 'around', of: 'longTable@b', side: 'front' } },
    { piece: 'innbench', tag: 'b2', seed: 3, rule: { at: 'around', of: 'longTable@b', side: 'back' } },
    { piece: 'table', tag: 'c', rule: side('right', 0.2) },
    { piece: 'stool', tag: 'c', rule: { at: 'around', of: 'table@c' } },
    { piece: 'keg', tag: 'b', rule: corner('frontRight') },
    { piece: 'cratestack', rule: side('left', 0.15) },
    { piece: 'hanging', rule: back(0.75), lift: 30 },
    { piece: 'basket', rule: free },
  ]),
  // The inn's guest rooms: a bed or two, a chest at the foot, a place to hang a cloak.
  room('guestroom', 'room', 'A guest room: a bed or two, a chest, pegs for a cloak.', [
    { piece: 'bed', vary: true, rule: back(0) },
    { piece: 'bed', tag: 'second', vary: true, seed: 3, rule: { at: 'around', of: 'bed', side: 'front' } },
    { piece: 'footlocker', rule: side('right', 0.6) },
    { piece: 'stool', rule: side('left', 0.7) },
    { piece: 'pegs', rule: back(0.8), lift: 4 },
    { piece: 'shelf', rule: back(0.5), lift: 40 },
    { piece: 'rug', rule: center(0, 0.2) },
    { piece: 'basket', rule: free },
  ]),
  // The corridor upstairs: not much, but not bare.
  room('landing', 'room', 'A landing at the top of the stairs.', [
    { piece: 'innbench', rule: back(0.75) },
    { piece: 'footlocker', rule: back(0.95) },
    { piece: 'hanging', rule: back(0.55), lift: 24 },
    { piece: 'pegs', rule: back(0.3), lift: 6 },
    { piece: 'broom', rule: back(0.45) },
  ]),
  // Under the roof: a row of beds for those who pay least, and the inn's spare stores.
  room('attic', 'room', 'An attic under the roof: a row of cheap beds and spare stores.', [
    { piece: 'bed', n: 4, vary: true, rule: back(0) },
    { piece: 'pallet', n: 2, rule: side('right', 0.7) },
    { piece: 'footlocker', n: 2, rule: side('left', 0.6) },
    { piece: 'sacks', rule: corner('frontRight') },
    { piece: 'keg', rule: corner('backLeft') },
    { piece: 'cratestack', rule: free },
    { piece: 'rug', rule: center(0, 0.1) },
    { piece: 'pegs', rule: back(0.9), lift: 4 },
    { piece: 'basket', rule: free },
  ]),
  // The rooms over a shop: the shopkeeper's home (a bed behind the hearth, table, chest).
  room('upstairs', 'room', 'The keeper’s own room over the shop.', [
    { piece: 'hearth', rule: corner('backRight'), fire: true },
    { piece: 'shelf', rule: back(0.5), lift: 22, books: 1 },
    { piece: 'pegs', rule: back(0.72), lift: 4 },
    { piece: 'hanging', rule: back(0.3), lift: 30 },
    { piece: 'rug', rule: center() },
    { piece: 'table', rule: center() },
    { piece: 'stool', tag: 'front', rule: { at: 'around', of: 'table', side: 'front' } },
    { piece: 'stool', tag: 'back', rule: { at: 'around', of: 'table', side: 'back' } },
    { piece: 'footlocker', rule: side('left', 0.55) },
    { piece: 'keg', rule: side('right', 0.55) },
    { piece: 'broom', rule: side('left', 0.9) },
    { piece: 'basket', rule: free },
  ]),
  // One horse in its stall, on straw, with a hay rack on the wall and a bucket in the corner.
  room('horsestall', 'room', 'A horse’s stall, on straw.', [
    { piece: 'horse', vary: true, rule: center(0, 0.1) },
    { piece: 'straw', rule: center(0, 0.1) },
    { piece: 'hayRack', rule: back(0.5), lift: 22 },
    { piece: 'broom', rule: corner('backRight') },
  ]),
  // The aisle: hay, tack, a water barrel, a chest of gear.
  room('aisle', 'room', 'A stable’s aisle: hay, tack, a chest of gear.', [
    { piece: 'haybale', n: 2, rule: side('right', 0.95) },
    { piece: 'hooks', rule: back(0.25), lift: 30 },
    { piece: 'pegs', rule: back(0.7), lift: 10 },
    { piece: 'footlocker', rule: side('left', 0.95) },
    { piece: 'keg', rule: side('left', 0.7) },
    { piece: 'sacks', rule: corner('frontRight') },
    { piece: 'broom', rule: side('right', 0.7) },
    { piece: 'straw', rule: center() },
    { piece: 'litter', rule: free },
  ]),
  room('bakery', 'room', 'A bakery: an oven, a kneading trough, loaves on the shelves.', [
    { piece: 'oven', rule: corner('backRight'), fire: true },
    { piece: 'kneadtrough', rule: corner('backLeft') },
    { piece: 'shelf', variant: 'loaves', seed: 3, rule: back(0.35), lift: 22 },
    { piece: 'counter', variant: 'bread', seed: 7, rule: center(0, 0.6) },
    { piece: 'sacks', rule: side('left', 0.5) },
    { piece: 'kindling', rule: side('right', 0.6) },
    { piece: 'basket', rule: free },
    { piece: 'broom', rule: side('left', 0.9) },
    { piece: 'stool', rule: free },
  ]),
  room('herbalist', 'room', 'An herbalist’s: bottles and jars, herbs hung to dry, a mortar.', [
    { piece: 'hearth', rule: corner('backRight'), fire: true },
    { piece: 'pallet', rule: corner('backLeft') },
    { piece: 'shelf', variant: 'bottles', seed: 12, rule: back(0.22), lift: 24, books: 1 },
    { piece: 'shelf', variant: 'jars', seed: 13, rule: back(0.7), lift: 24, books: 1 },
    { piece: 'herbs', rule: back(0.46), lift: 48 },
    { piece: 'mortarBench', rule: back(0.55) },
    { piece: 'counter', variant: 'herbs', seed: 18, rule: center(0, 0.6) },
    { piece: 'basket', rule: side('left', 0.5) },
    { piece: 'stool', rule: side('right', 0.5) },
    { piece: 'broom', rule: side('right', 0.9) },
  ]),
  room('fishmonger', 'room', 'A fishmonger’s: fish drying on a rack, tubs of the day’s catch.', [
    { piece: 'hearth', rule: corner('backRight'), fire: true },
    { piece: 'nets', rule: corner('backLeft') },
    { piece: 'fishRack', rule: back(0.62) },
    { piece: 'hungNet', rule: back(0.26), lift: 14 },
    { piece: 'hooks', rule: back(0.7), lift: 10 },
    { piece: 'fishTubs', rule: side('left', 0.35) },
    { piece: 'counter', variant: 'fish', seed: 29, rule: center(0, 0.6) },
    { piece: 'keg', rule: side('right', 0.5) },
    { piece: 'broom', rule: side('left', 0.9) },
  ]),
  room('general', 'room', 'A general store: wares on shelves, crates and sacks.', [
    { piece: 'shelf', variant: 'wares', seed: 32, rule: back(0.3), lift: 22, books: 1 },
    { piece: 'hooks', rule: back(0.72), lift: 8 },
    { piece: 'cratestack', rule: corner('backLeft') },
    { piece: 'sacks', rule: side('right', 0.6) },
    { piece: 'keg', rule: side('right', 0.3) },
    { piece: 'footlocker', rule: side('left', 0.5) },
    { piece: 'counter', variant: 'general', seed: 38, rule: center(0, 0.6) },
    { piece: 'basket', rule: free },
    { piece: 'broom', rule: side('left', 0.9) },
  ]),
  room('weaver', 'room', 'A weaver’s: a loom, bolts of cloth.', [
    { piece: 'hearth', rule: corner('backRight'), fire: true },
    { piece: 'pallet', rule: corner('backLeft') },
    { piece: 'loom', rule: back(0.6) },
    { piece: 'shelf', variant: 'bolts', seed: 41, rule: back(0.3), lift: 24 },
    { piece: 'pegs', rule: back(0.58), lift: 8 },
    { piece: 'shelf', rule: back(0.88), lift: 40 },
    { piece: 'counter', variant: 'cloth', seed: 46, rule: center(-0.3, 0.6) },
    { piece: 'stool', rule: { at: 'around', of: 'loom' } },
    { piece: 'basket', rule: free },
  ]),
  room('smithy', 'room', 'A smithy: forge, anvil, a tub for quenching.', [
    { piece: 'forge', rule: corner('backRight'), fire: true },
    { piece: 'workbench', rule: back(0.1) },
    { piece: 'toolrack', rule: back(0.55), lift: 22 },
    { piece: 'anvil', rule: center() },
    { piece: 'quenchtub', rule: side('left', 0.5) },
    { piece: 'coalbin', rule: corner('frontRight') },
  ]),
];

export default things;

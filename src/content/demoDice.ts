import type { DieDef } from '../core/dice';

/** Dice used in the Art Lab, matching the early-campaign village characters. Not balanced. */
export interface DemoDie extends DieDef {
  owner: string;
  /** Colour of the die body (visible on missing faces). */
  body: string;
  /** Faces in net order: [top, left, front, right, back, bottom]. null = removed face. */
  net: (DieDef['faces'][number] | null)[];
}

export const DEMO_DICE: DemoDie[] = [
  {
    id: 'crook', name: "Shepherd's Crook", owner: 'Shepherd', body: '#a7773f', faces: [],
    net: [
      { kind: 'attack', value: 2 },
      { kind: 'move', value: 2 },
      { kind: 'attack', value: 1, tags: ['push:1'] },
      { kind: 'shield', value: 1 },
      { kind: 'move', value: 3 },
      { kind: 'blank', value: 0 },
    ],
  },
  {
    id: 'sling', name: 'Sling', owner: 'Shepherd', body: '#7a5a38', faces: [],
    net: [
      { kind: 'range', value: 2 },
      { kind: 'range', value: 1 },
      { kind: 'range', value: 3 },
      { kind: 'jump', value: 2 },
      { kind: 'range', value: 1, tags: ['stun'] },
      { kind: 'blank', value: 0 },
    ],
  },
  {
    id: 'hammer', name: "Smith's Hammer", owner: "Smith's son", body: '#4b4c5b', faces: [],
    net: [
      { kind: 'attack', value: 3, tags: ['rend:1'] },
      { kind: 'shield', value: 2 },
      { kind: 'attack', value: 2 },
      { kind: 'rend', value: 2 },
      { kind: 'attack', value: 4, tags: ['lose'] },
      { kind: 'shield', value: 1 },
    ],
  },
  {
    id: 'pouch', name: "Herbalist's Pouch", owner: "Herbalist's apprentice", body: '#5aa040', faces: [],
    net: [
      { kind: 'heal', value: 2 },
      { kind: 'poison', value: 1 },
      { kind: 'heal', value: 1 },
      { kind: 'disease', value: 1 },
      { kind: 'heal', value: 3, tags: ['lose'] },
      { kind: 'blank', value: 0 },
    ],
  },
  {
    id: 'knife', name: 'Rusty Knife', owner: 'Anyone (low-end, mixed)', body: '#86613c', faces: [],
    net: [
      { kind: 'attack', value: 1, tags: ['bleed:1'] },
      { kind: 'move', value: 1 },
      { kind: 'heal', value: 1 },
      { kind: 'shield', value: 1 },
      { kind: 'bleed', value: 1 },
      { kind: 'blank', value: 0 },
    ],
  },
  {
    id: 'bow', name: "Hunter's Bow (D5)", owner: "Hunter's daughter", body: '#56351e', faces: [],
    net: [
      { kind: 'range', value: 2 },
      { kind: 'move', value: 2 },
      { kind: 'range', value: 3, tags: ['bleed:1'] },
      { kind: 'range', value: 2, tags: ['pierce:1'] },
      { kind: 'jump', value: 3 },
      null,
    ],
  },
];

for (const d of DEMO_DICE) d.faces = d.net.filter((f) => f !== null);

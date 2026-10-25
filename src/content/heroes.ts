import type { DieDef } from '../core/dice';

/** Placeholder starter hero, to exercise the dice engine. Not final design. */
export interface HeroDef {
  id: string;
  name: string;
  title: string;
  maxHp: number;
  dice: DieDef[];
}

export const MERCENARY: HeroDef = {
  id: 'legoknekt',
  name: 'Legoknekt',
  title: 'Sellsword of the Ashaslätt',
  maxHp: 10,
  dice: [
    {
      id: 'blade',
      name: 'Blade',
      faces: [
        { kind: 'attack', value: 2 }, { kind: 'attack', value: 2 }, { kind: 'attack', value: 3 },
        { kind: 'move', value: 2 }, { kind: 'shield', value: 1 }, { kind: 'blank', value: 0 },
      ],
    },
    {
      id: 'boots',
      name: 'Marching Boots',
      faces: [
        { kind: 'move', value: 2 }, { kind: 'move', value: 3 }, { kind: 'move', value: 3 },
        { kind: 'move', value: 4 }, { kind: 'attack', value: 1 }, { kind: 'blank', value: 0 },
      ],
    },
    {
      id: 'shield',
      name: 'Round Shield',
      faces: [
        { kind: 'shield', value: 1 }, { kind: 'shield', value: 2 }, { kind: 'shield', value: 2 },
        { kind: 'attack', value: 1, tags: ['push'] }, { kind: 'move', value: 1 }, { kind: 'heal', value: 1 },
      ],
    },
    {
      id: 'grit',
      name: 'Grit',
      faces: [
        { kind: 'heal', value: 2 }, { kind: 'heal', value: 1 }, { kind: 'attack', value: 3 },
        { kind: 'move', value: 2 }, { kind: 'shield', value: 1 }, { kind: 'blank', value: 0 },
      ],
    },
  ],
};

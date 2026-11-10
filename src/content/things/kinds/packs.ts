import type { ThingDef } from '../../../core/world3d/things';
import { MODELS } from '../models';

/**
 * Packs and what is fitted on them (plan B6, `core/world3d/inventory.ts`). A pack is worn on the back and holds a grid
 * of cells; its sides take add-ons, items that give a grid of their own fitted there (the director, 2026-11-10: the
 * backpack rectangular or square, with add-ons on the side). Off the back, a pack is carried in the arms. A new pack
 * or add-on: an entry here and a model file of the same name.
 */
const loose = (id: string): Pick<ThingDef, 'model' | 'draw'> => {
  const model = MODELS[id];
  if (!model) throw new Error(`${id} has no model in content/things/models/${id}.ts`);
  return { model, draw: () => model.draw(0) };
};

export default [
  { id: 'pack', is: 'container', abstract: true, size: 'hands', spot: 6 },
  {
    id: 'backpack', is: 'pack', name: 'backpack', look: 'A leather pack with two straps and a flap.',
    bag: { grid: [5, 6], sides: 2 }, weight: 1.2, value: 4, ...loose('backpack'),
  },
  { id: 'pack-addon', is: 'container', abstract: true, size: 'bag', spot: 8 },
  {
    id: 'side-pouch', is: 'pack-addon', name: 'side pouch', look: 'A narrow pouch with loops to fit on the side of a pack.',
    addon: { grid: [2, 4] }, shape: [2, 2], weight: 0.2, value: 1, ...loose('side-pouch'),
  },
] satisfies ThingDef[];

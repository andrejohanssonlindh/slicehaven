import type { ThingDef } from '../../../core/world3d/things';
import { MODELS } from '../models';

/**
 * Small things carried in pockets and packs (plan B6): each with its size, its shape in cells (a cell is about a fist,
 * 10 cm; `core/world3d/inventory.ts`), weight in kg and worth in coins. A new one: an entry here and a model file of the
 * same name. What the hero starts with is the kit (`content/things/kit.ts`).
 */
const loose = (id: string): Pick<ThingDef, 'model' | 'draw'> => {
  const model = MODELS[id];
  if (!model) throw new Error(`${id} has no model in content/things/models/${id}.ts`);
  return { model, draw: () => model.draw(0) };
};

export default [
  { id: 'waterskin', is: 'container', look: 'A leather waterskin, full.', size: 'bag', shape: [2, 3], weight: 1, value: 1, spot: 8, ...loose('waterskin') },
  { id: 'loaf', is: 'food', look: 'A loaf of dark bread.', size: 'bag', shape: [2, 1], weight: 0.5, value: 0.2, spot: 8, ...loose('loaf') },
  { id: 'tinderbox', is: 'tool', look: 'A tin tinderbox: flint, steel and dry tinder.', size: 'pocket', shape: [1, 1], weight: 0.2, value: 2, spot: 12, ...loose('tinderbox') },
  // (An odd shape: the pan and its handle.)
  { id: 'pan', is: 'tool', look: 'An iron pan with a long handle.', size: 'bag', shape: ['##..', '####'], weight: 1, value: 3, spot: 8, ...loose('pan') },
] satisfies ThingDef[];

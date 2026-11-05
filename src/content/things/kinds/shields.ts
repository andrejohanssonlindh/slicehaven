import type { ThingDef } from '../../../core/world3d/things';
import { SHIELDS } from '../../chargen/equipment';
import { MODELS } from '../models';

/**
 * Shields as things (plan B8a): worn on the left forearm beside a one-handed weapon, laid on the sand, picked up, taken
 * from a rack (they are arms: under `weapon`, so a weapon rack has them too). Each names its row in the shield table
 * (`shield`): its block bonus and properties in a fight. The table gives no weights; these are ours (reading). A new
 * shield: a line here and a model file of the same name.
 */
const family: ThingDef = { id: 'shield', is: 'weapon', abstract: true, size: 'strapped', importance: 1, moves: 'shield' };

const ROWS: Record<string, { row: string; kg: number; look: string }> = {
  buckler: { row: 'Bucklare', kg: 1.5, look: 'A buckler: a small round shield of iron, held in the fist.' },
  'small-round-shield': { row: 'Liten rundsköld', kg: 3, look: 'A small round shield of planks with an iron boss.' },
  'large-round-shield': { row: 'Stor rundsköld', kg: 6, look: 'A large round shield of planks, rimmed with leather.' },
  'knights-shield': { row: 'Riddarsköld', kg: 5, look: "A knight's shield, painted, narrowing to a point." },
  'curved-shield': { row: 'Välvd sköld', kg: 7, look: 'A tall curved shield, square-cornered, painted.' },
};

export default [
  family,
  ...Object.entries(ROWS).map(([id, s]): ThingDef => {
    const row = SHIELDS.find((x) => x.sv === s.row);
    if (!row) throw new Error(`shield ${id}: no row ${s.row} in the shield table`);
    const model = MODELS[id];
    if (!model) throw new Error(`shield ${id} has no model in content/things/models/${id}.ts`);
    return { id, is: 'shield', look: s.look, name: row.en.toLowerCase(), shield: row.sv, hands: 1, model, weight: s.kg, value: row.price, draw: (p) => model.draw(p.seed) };
  }),
] satisfies ThingDef[];

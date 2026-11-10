import type { ShapeDef } from '../../../core/world3d/inventory';
import type { ThingDef } from '../../../core/world3d/things';
import { bundle } from '../models/_bundle';

/**
 * The creator's equipment packages as things (plan B6, design: director/design/inventory.md): each a bundle that holds
 * "a reasonable amount" of the gear for its trade, as the ruleset has it (it gives examples, not a list), carried in
 * the pack as one thing. A hero gets one for each package they own (`packageKinds` in `content/things/gear.ts`).
 * Sizes, weights and worth are our own (the worth by the ruleset's rule of thumb for replacing a whole package: 20, 50
 * or 100 silver). Not here: the Animal package (it waits for kinds of creature, C3).
 */
type Row = { pkg: string; name: string; look: string; shape: ShapeDef; kg: number; value: number; size: [number, number, number]; colour: number };

const ROWS: Record<string, Row> = {
  'fishing-gear': { pkg: 'Fiskeutrustning', name: 'fishing gear', look: 'A woven basket of nets, lines, hooks and gutting knives.', shape: [3, 2], kg: 3, value: 20, size: [0.35, 0.25, 0.2], colour: 0x9a7a4a },
  'research-gear': { pkg: 'Forskningsutrustning', name: 'research gear', look: 'A small case of instruments: a mortar, glass, a pair of compasses, scales and weights.', shape: [3, 2], kg: 3, value: 100, size: [0.35, 0.22, 0.18], colour: 0x5a3a2a },
  'craft-tools': { pkg: 'Hantverksutrustning', name: 'craft tools', look: 'A roll of the tools of your trade. The rest is kept where you work.', shape: [3, 1], kg: 2, value: 50, size: [0.35, 0.12, 0.1], colour: 0x6a5a3a },
  'hunting-gear': { pkg: 'Jaktutrustning', name: 'hunting gear', look: 'A small sack of snares, a horn, skinning knives and bait.', shape: [2, 3], kg: 2.5, value: 50, size: [0.25, 0.2, 0.3], colour: 0x55663a },
  'medical-kit': { pkg: 'Medicinsk utrustning', name: 'medical kit', look: 'A bag of bandages, spirits, needle and thread, moss and smelling salts.', shape: [2, 2], kg: 1.5, value: 50, size: [0.25, 0.18, 0.18], colour: 0xc0b494 },
  'musical-instrument': { pkg: 'Musikinstrument', name: 'musical instrument', look: 'An instrument in its case, with what keeps it clean and in tune.', shape: [2, 4], kg: 2, value: 50, size: [0.2, 0.12, 0.45], colour: 0x7a4a2a },
  'mystic-gear': { pkg: 'Mystikutrustning', name: 'mystic gear', look: 'A bundle of things a mystic has use for, wrapped in cloth.', shape: [2, 2], kg: 1, value: 100, size: [0.22, 0.18, 0.15], colour: 0x4a3a6a },
  'writing-kit': { pkg: 'Skrivutrustning', name: 'writing kit', look: 'A satchel of scrolls, ink, quills, sealing wax and a notebook.', shape: [2, 2], kg: 1, value: 20, size: [0.28, 0.08, 0.22], colour: 0x6e4a2c },
  'beauty-kit': { pkg: 'Skönhetsutrustning', name: 'beauty kit', look: 'A box of brushes, a bronze mirror, scent, soap and a little jewellery.', shape: [2, 2], kg: 1.5, value: 50, size: [0.24, 0.16, 0.14], colour: 0x8a3a4e },
  'thief-tools': { pkg: 'Tjuvutrustning', name: "thief's tools", look: 'A small sack of picks, files, wax and a rope with a grapnel.', shape: [2, 1], kg: 0.8, value: 50, size: [0.22, 0.12, 0.1], colour: 0x2e2a2a },
  'entertainers-kit': { pkg: 'Underhållningsutrustning', name: "entertainer's kit", look: 'A box of cards, dice, juggling balls, bells and whistles.', shape: [2, 2], kg: 1.5, value: 20, size: [0.24, 0.18, 0.15], colour: 0xa8743a },
  'wilderness-gear': { pkg: 'Vildmarksutrustning', name: 'wilderness gear', look: 'A big bag with a small tent, warm blankets, a lantern, dry food and a kettle.', shape: [3, 4], kg: 5, value: 100, size: [0.45, 0.3, 0.3], colour: 0x5a6a3a },
  'weapon-care-kit': { pkg: 'Vapenvårdsutrustning', name: 'weapon care kit', look: 'A roll of whetstones, oil, rags and spare straps.', shape: [2, 1], kg: 0.6, value: 20, size: [0.22, 0.1, 0.08], colour: 0x4a4a4a },
};

export default [
  { id: 'gear-bundle', is: 'tool', abstract: true, size: 'bag', spot: 8 },
  ...Object.entries(ROWS).map(([id, r]): ThingDef => {
    const model = bundle(...r.size, r.colour);
    return { id, is: 'gear-bundle', name: r.name, look: r.look, package: r.pkg, shape: r.shape, weight: r.kg, value: r.value, model, draw: () => model.draw(0) };
  }),
] satisfies ThingDef[];

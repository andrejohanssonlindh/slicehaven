import type { ThingDef } from '../../../core/world3d/things';
import { MODELS } from '../models';

/**
 * The arena's fittings (plan B8a, the director: "a weapons cabinet with a picker", and "let me pick the enemy").
 * - A **weapon rack** stocks weapons: *Take a weapon* lists every kind under `stock` (here, every weapon) and puts the
 *   one picked in your hand (`content/actions/verbs/take-from.ts`). A rack in an armoury later is the same kind.
 * - A **gong** calls a fighter: striking it lists the levels, and a fresh fighter of the kind it `calls` takes their
 *   place in the arena at that level (`verbs/strike-gong.ts`; the world's `callFighter`).
 */
const model = (id: string) => {
  const m = MODELS[id];
  if (!m) throw new Error(`${id} has no model in content/things/models/${id}.ts`);
  return m;
};

const rack = model('weapon-rack'), gong = model('gong');

const things: ThingDef[] = [
  {
    id: 'weapon-rack',
    is: 'structure',
    look: 'A rack of practice weapons, sharp enough for real.',
    stock: 'weapon',
    model: rack,
    foot: [{ box: [rack.w / 2, rack.d / 2] }],
    draw: (p) => rack.draw(p.seed),
  },
  {
    id: 'gong',
    is: 'structure',
    look: 'A bronze gong in a wooden frame. Strike it and a fighter comes out.',
    calls: 'gladiator',
    model: gong,
    foot: [{ box: [gong.w / 2, gong.d / 2] }],
    draw: (p) => gong.draw(p.seed),
  },
];

export default things;

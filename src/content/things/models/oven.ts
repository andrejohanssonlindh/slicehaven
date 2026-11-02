import { ModelBuilder, addBox, addTaper } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** A domed bake oven: a brick plinth, a clay dome with a mouth at the front that glows with embers, an iron door. */
const S = 0.9;
const oven: FurnitureModel = {
  w: S,
  d: S,
  draw() {
    const m = new ModelBuilder();
    const brick = m.mesh('stone'), clay = m.mesh('cloth', 0x9a6a48), iron = m.mesh('iron');
    addBox(brick, [-S / 2, 0, -S / 2], [S / 2, 0.55, S / 2], { aoBottom: 0.6 });
    addBox(brick, [-S / 2 - 0.02, 0.55, -S / 2], [S / 2 + 0.02, 0.6, S / 2 + 0.02]);
    addTaper(clay, 0, 0, 0.6, 0.95, S - 0.1, S - 0.1, S - 0.35, S - 0.35, 0.8, 1);
    addTaper(clay, 0, 0, 0.95, 1.12, S - 0.35, S - 0.35, 0.25, 0.25, 1, 1);
    // The mouth: a dark opening with a glow, framed in brick, and a door leaning beside it.
    addBox(brick, [-0.2, 0.62, S / 2 - 0.1], [0.2, 0.9, S / 2 + 0.02]);
    addBox(m.mesh('cloth', 0xd0642a), [-0.14, 0.66, S / 2 - 0.02], [0.14, 0.8, S / 2 + 0.03]);
    addBox(iron, [0.26, 0.2, S / 2], [0.4, 0.5, S / 2 + 0.03]);
    // A flue.
    addBox(brick, [-0.07, 1.1, -0.07], [0.07, 1.35, 0.07]);
    return m.done();
  },
};
export default oven;

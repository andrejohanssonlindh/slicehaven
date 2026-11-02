import { ModelBuilder, addBox, addCylinder, addTaper, vary } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** A board with iron pegs; a coiled rope, a cloak and a pouch hang from some. Lowest point y = 0. */
const W = 0.9, D = 0.16;

const hooks: FurnitureModel = {
  w: W,
  d: D,
  draw(seed) {
    const m = new ModelBuilder();
    const wood = m.mesh('plank'), iron = m.mesh('iron');
    addBox(wood, [-W / 2, 0.3, -D / 2], [W / 2, 0.4, -D / 2 + 0.03]);
    const xs = [-0.32, -0.1, 0.12, 0.34];
    for (const x of xs) {
      addBox(iron, [x - 0.015, 0.33, -D / 2 + 0.03], [x + 0.015, 0.36, D / 2 - 0.03]);
      addBox(iron, [x - 0.015, 0.36, D / 2 - 0.05], [x + 0.015, 0.42, D / 2 - 0.03]);
    }
    const cloak = m.mesh('cloth', vary(seed, 1) < 0.5 ? 0x3c5070 : 0x8a3a2e);
    addTaper(cloak, xs[0], -D / 2 + 0.06, 0, 0.32, 0.3, 0.06, 0.1, 0.05, 1, 0.9);
    addCylinder(m.mesh('cloth', 0xc0b494), xs[2], D / 2 - 0.05, 0.12, 0.34, 0.07, 0.06, 6);
    addBox(m.mesh('cloth', 0x7a5a3c), [xs[3] - 0.05, 0.14, -0.03], [xs[3] + 0.05, 0.3, 0.03]);
    return m.done();
  },
};

export default hooks;

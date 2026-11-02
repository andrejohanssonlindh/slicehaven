import { ModelBuilder, addBox, addTaper } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** A footlocker: a plank box with a slightly domed lid, iron bands and a lock. */
const W = 0.7, D = 0.4;
const footlocker: FurnitureModel = {
  w: W,
  d: D,
  draw() {
    const m = new ModelBuilder();
    const wood = m.mesh('plank'), iron = m.mesh('iron');
    addBox(wood, [-W / 2, 0, -D / 2], [W / 2, 0.3, D / 2], { aoBottom: 0.6 });
    addTaper(wood, 0, 0, 0.3, 0.38, W, D, W - 0.04, D - 0.1, 1, 1);
    for (const sx of [-1, 1]) {
      const x = sx * (W / 2 - 0.08);
      addBox(iron, [x - 0.025, 0, -D / 2 - 0.01], [x + 0.025, 0.31, D / 2 + 0.01]);
    }
    addBox(iron, [-0.04, 0.2, D / 2], [0.04, 0.32, D / 2 + 0.025]);
    return m.done();
  },
};
export default footlocker;

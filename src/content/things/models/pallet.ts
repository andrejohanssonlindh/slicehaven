import { ModelBuilder, addBox, addTaper, vary } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** A straw pallet: a low plank frame with a lumpy tick of straw and a rolled blanket at the head. */
const W = 1.4, D = 0.75;
const pallet: FurnitureModel = {
  w: W,
  d: D,
  draw(seed) {
    const m = new ModelBuilder();
    const wood = m.mesh('plank');
    addBox(wood, [-W / 2, 0.03, -D / 2], [W / 2, 0.12, -D / 2 + 0.05], { aoBottom: 0.6 });
    addBox(wood, [-W / 2, 0.03, D / 2 - 0.05], [W / 2, 0.12, D / 2], { aoBottom: 0.6 });
    for (const sx of [-1, 1]) addBox(wood, [sx * (W / 2 - 0.05) - 0.04, 0, -D / 2], [sx * (W / 2 - 0.05) + 0.04, 0.03, D / 2]);
    addTaper(m.mesh('cloth', 0xc8b484), 0, 0, 0.1, 0.24 + vary(seed, 1) * 0.04, W - 0.04, D - 0.04, W - 0.14, D - 0.14, 0.8, 1);
    addTaper(m.mesh('cloth', 0xc0b494), -W / 2 + 0.2, 0, 0.24, 0.33, 0.28, D * 0.6, 0.22, D * 0.5, 0.85, 1);
    return m.done();
  },
};
export default pallet;

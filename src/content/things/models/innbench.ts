import { ModelBuilder, addBox } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** A bench for the common room: a thick seat on two slab ends, a stretcher between. */
const W = 1.8, D = 0.34, H = 0.45;

const innbench: FurnitureModel = {
  w: W,
  d: D,
  draw() {
    const m = new ModelBuilder();
    const wood = m.mesh('plank');
    addBox(wood, [-W / 2, H - 0.05, -D / 2], [W / 2, H, D / 2], { aoBottom: 0.7 });
    for (const sx of [-1, 1]) {
      const x = sx * (W / 2 - 0.15);
      addBox(wood, [x - 0.035, 0, -D / 2 + 0.03], [x + 0.035, H - 0.05, D / 2 - 0.03], { aoBottom: 0.6 });
    }
    addBox(wood, [-W / 2 + 0.15, 0.15, -0.025], [W / 2 - 0.15, 0.21, 0.025], { aoBottom: 0.7 });
    return m.done();
  },
};

export default innbench;

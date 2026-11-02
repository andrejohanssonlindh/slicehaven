import { ModelBuilder, addBox } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/**
 * Example 1 (boxes): a trestle table. A top of three boards on two A-shaped trestles joined by a stretcher.
 * Everything is `addBox`; the boards differ a little in height so the top is not one flat slab.
 */
const W = 1.4, D = 0.75, H = 0.76;

const table: FurnitureModel = {
  w: W,
  d: D,
  draw(seed) {
    const m = new ModelBuilder();
    const wood = m.mesh('plank');
    // The top: three boards along its length, each a hair different in height.
    for (let i = 0; i < 3; i++) {
      const z0 = -D / 2 + (i * D) / 3, z1 = z0 + D / 3 - 0.01;
      const lift = ((seed + i) % 3) * 0.006;
      addBox(wood, [-W / 2, H - 0.05 + lift, z0], [W / 2, H + lift, z1], { aoBottom: 0.7 });
    }
    // Two trestles: a foot, two splayed legs, a cross-bar under the top.
    for (const sx of [-1, 1]) {
      const x = sx * (W / 2 - 0.2);
      addBox(wood, [x - 0.04, 0, -D / 2 + 0.06], [x + 0.04, 0.06, D / 2 - 0.06], { aoBottom: 0.5 });
      for (const sz of [-1, 1]) addBox(wood, [x - 0.035, 0.05, sz * 0.18 - 0.035], [x + 0.035, H - 0.05, sz * 0.18 + 0.035], { aoBottom: 0.6 });
      addBox(wood, [x - 0.045, H - 0.12, -D / 2 + 0.05], [x + 0.045, H - 0.05, D / 2 - 0.05]);
    }
    // The stretcher between the trestles, low down.
    addBox(wood, [-W / 2 + 0.2, 0.22, -0.03], [W / 2 - 0.2, 0.3, 0.03], { aoBottom: 0.7 });
    return m.done();
  },
};

export default table;

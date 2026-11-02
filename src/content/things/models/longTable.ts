import { ModelBuilder, addBox } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** A long table for the common room: a thick top of boards on two solid trestle ends and a long stretcher. */
const W = 2.3, D = 0.8, H = 0.76;

const longTable: FurnitureModel = {
  w: W,
  d: D,
  draw(seed) {
    const m = new ModelBuilder();
    const wood = m.mesh('plank');
    for (let i = 0; i < 4; i++) {
      const z0 = -D / 2 + (i * D) / 4;
      addBox(wood, [-W / 2, H - 0.06 + ((seed + i) % 3) * 0.005, z0], [W / 2, H, z0 + D / 4 - 0.01], { aoBottom: 0.7 });
    }
    for (const sx of [-1, 1]) {
      const x = sx * (W / 2 - 0.25);
      addBox(wood, [x - 0.04, 0, -D / 2 + 0.06], [x + 0.04, 0.07, D / 2 - 0.06], { aoBottom: 0.5 });
      addBox(wood, [x - 0.04, 0.07, -0.05], [x + 0.04, H - 0.06, 0.05], { aoBottom: 0.6 });
      addBox(wood, [x - 0.05, H - 0.12, -D / 2 + 0.05], [x + 0.05, H - 0.06, D / 2 - 0.05]);
    }
    addBox(wood, [-W / 2 + 0.25, 0.25, -0.03], [W / 2 - 0.25, 0.32, 0.03], { aoBottom: 0.7 });
    return m.done();
  },
};

export default longTable;

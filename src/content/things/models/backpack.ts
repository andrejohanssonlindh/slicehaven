import { ModelBuilder, addBox } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** A leather pack lying on its back: a squarish body, a flap over the top, two straps. */
const W = 0.36, D = 0.16, H = 0.42;

const backpack: FurnitureModel = {
  w: W,
  d: D,
  draw() {
    const m = new ModelBuilder();
    addBox(m.mesh('cloth', 0x7a5634), [-W / 2, 0, -D / 2], [W / 2, H, D / 2], { aoBottom: 0.7 });
    addBox(m.mesh('cloth', 0x5e4026), [-W / 2 - 0.005, H - 0.14, -D / 2 - 0.005], [W / 2 + 0.005, H + 0.02, D / 2 + 0.01]);
    const strap = m.mesh('cloth', 0x3e2a18);
    for (const x of [-0.1, 0.1]) addBox(strap, [x - 0.02, 0.04, -D / 2 - 0.02], [x + 0.02, H - 0.04, -D / 2]);
    return m.done();
  },
};

export default backpack;

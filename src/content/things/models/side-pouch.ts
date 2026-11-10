import { ModelBuilder, addBox } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** A side pouch for a pack: a narrow leather bag with a flap and a strap loop. */
const W = 0.14, D = 0.09, H = 0.26;

const sidePouch: FurnitureModel = {
  w: W,
  d: D,
  draw() {
    const m = new ModelBuilder();
    addBox(m.mesh('cloth', 0x8a6440), [-W / 2, 0, -D / 2], [W / 2, H, D / 2], { aoBottom: 0.7 });
    addBox(m.mesh('cloth', 0x5e4026), [-W / 2 - 0.005, H - 0.08, -D / 2 - 0.005], [W / 2 + 0.005, H + 0.015, D / 2 + 0.01]);
    return m.done();
  },
};

export default sidePouch;

import { ModelBuilder, addBox, addCylinder, addTaper, vary } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** A fishing net hung from the wall: floats along the top, a cloth-coloured mesh narrowing down, lead weights. Lowest point y = 0. */
const W = 1.1, D = 0.14, LEN = 1.0;

const hungNet: FurnitureModel = {
  w: W,
  d: D,
  draw(seed) {
    const m = new ModelBuilder();
    const wood = m.mesh('plank');
    const net = m.mesh('cloth', 0xc0b494), dark = m.mesh('cloth', 0x7a5a3c);
    addBox(wood, [-W / 2, LEN - 0.04, -D / 2], [W / 2, LEN, -D / 2 + 0.05]);
    addTaper(net, 0, -D / 2 + 0.04, 0.04, LEN - 0.04, 0.5, 0.04, W - 0.06, 0.06, 1, 0.95);
    for (let i = 0; i < 4; i++) {
      const x = -W / 2 + 0.15 + (i + 0.5) * ((W - 0.3) / 4);
      addCylinder(wood, x, -D / 2 + 0.09, LEN - 0.1, LEN - 0.02, 0.04, 0.04, 6);
    }
    addBox(dark, [-0.2 + (vary(seed, 1) - 0.5) * 0.1, 0, -D / 2 + 0.02], [0.2, 0.06, -D / 2 + 0.07]);
    return m.done();
  },
};

export default hungNet;

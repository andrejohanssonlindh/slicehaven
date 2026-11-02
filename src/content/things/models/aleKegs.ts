import { ModelBuilder, addBox, addCylinder, vary } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** Kegs of ale on a rack: a low timber stand with two kegs on it (iron hoops, a tap each), a third small one on top. */
const W = 1.0, D = 0.56, R = 0.19, BELLY = 0.22, H = 0.5, RACK = 0.14;

const aleKegs: FurnitureModel = {
  w: W,
  d: D,
  draw(seed) {
    const m = new ModelBuilder();
    const wood = m.mesh('plank'), iron = m.mesh('iron');
    // The rack: a deck on four posts with a rail along the back.
    addBox(wood, [-W / 2, RACK - 0.05, -D / 2], [W / 2, RACK, D / 2], { aoBottom: 0.7 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) addBox(wood, [sx * (W / 2 - 0.06) - 0.035, 0, sz * (D / 2 - 0.06) - 0.035], [sx * (W / 2 - 0.06) + 0.035, RACK - 0.05, sz * (D / 2 - 0.06) + 0.035], { aoBottom: 0.6 });
    addBox(wood, [-W / 2, RACK, -D / 2], [W / 2, RACK + 0.3, -D / 2 + 0.03]);
    const keg = (cx: number, h: number): void => {
      const y = RACK, s = h / H;
      addCylinder(wood, cx, 0.02, y, y + h / 2, R * s, BELLY * s, 8, { top: false, ao0: 0.6 });
      addCylinder(wood, cx, 0.02, y + h / 2, y + h, BELLY * s, R * s, 8, { ao0: 1, ao1: 0.95 });
      for (const [yy, r] of [[0.06 * s, R * s + 0.012], [h / 2, BELLY * s + 0.01], [h - 0.06 * s, R * s + 0.012]] as const) addCylinder(iron, cx, 0.02, y + yy - 0.02, y + yy + 0.02, r, r, 8, { top: false });
      addBox(iron, [cx - 0.02, y + 0.08 * s, 0.02 + R * s - 0.02], [cx + 0.02, y + 0.12 * s, 0.02 + R * s + 0.06]);
    };
    const t = vary(seed, 1);
    keg(-0.25, 0.5 - t * 0.04);
    keg(0.25, 0.46 + t * 0.04);
    return m.done();
  },
};

export default aleKegs;

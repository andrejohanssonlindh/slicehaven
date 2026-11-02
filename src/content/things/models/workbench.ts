import { ModelBuilder, addBox, addCylinder, addLegs, vary } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** A smith's workbench: heavy legs, a thick top, a lower shelf, a vice on one end, a hammer and tongs on top. */
const W = 1.5, D = 0.6, H = 0.9;

const workbench: FurnitureModel = {
  w: W,
  d: D,
  draw(seed) {
    const m = new ModelBuilder();
    const wood = m.mesh('plank'), iron = m.mesh('iron');
    addBox(wood, [-W / 2, H - 0.07, -D / 2], [W / 2, H, D / 2], { aoBottom: 0.7 });
    addLegs(wood, W, D, H - 0.07, 0.08, 0.04);
    addBox(wood, [-W / 2 + 0.06, 0.25, -D / 2 + 0.06], [W / 2 - 0.06, 0.3, D / 2 - 0.06], { aoBottom: 0.7 });
    // The vice at the left end, front edge.
    addBox(iron, [-W / 2 + 0.05, H, D / 2 - 0.2], [-W / 2 + 0.2, H + 0.14, D / 2 - 0.04]);
    addBox(iron, [-W / 2 + 0.09, H + 0.14, D / 2 - 0.16], [-W / 2 + 0.16, H + 0.17, D / 2 - 0.08]);
    // A hammer lying across, tongs, and a lump of iron.
    const hx = -0.1 + (vary(seed, 1) - 0.5) * 0.2;
    addBox(wood, [hx - 0.15, H, -0.02], [hx + 0.15, H + 0.025, 0.02]);
    addBox(iron, [hx + 0.1, H, -0.05], [hx + 0.2, H + 0.07, 0.05]);
    addBox(iron, [0.2, H, 0.05], [0.5, H + 0.015, 0.09]);
    addBox(iron, [0.2, H, 0.1], [0.5, H + 0.015, 0.14]);
    addCylinder(iron, 0.55, -0.1, H, H + 0.06, 0.06, 0.05, 6);
    return m.done();
  },
};

export default workbench;

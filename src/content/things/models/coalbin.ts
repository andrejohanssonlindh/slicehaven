import { ModelBuilder, addBox, addTaper, vary } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** A bin of charcoal: a slatted box, open on top, heaped with black lumps. */
const W = 0.8, D = 0.5, H = 0.5;

const coalbin: FurnitureModel = {
  w: W,
  d: D,
  draw(seed) {
    const m = new ModelBuilder();
    const wood = m.mesh('plank');
    addBox(wood, [-W / 2, 0, -D / 2], [W / 2, 0.04, D / 2], { aoBottom: 0.6 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) addBox(wood, [sx * (W / 2 - 0.03) - 0.03, 0, sz * (D / 2 - 0.03) - 0.03], [sx * (W / 2 - 0.03) + 0.03, H, sz * (D / 2 - 0.03) + 0.03], { aoBottom: 0.6 });
    // Slats: back, front (lower, so the coal shows) and two sides.
    for (const [a, b] of [[0.06, 0.2], [0.24, 0.38]] as const) {
      addBox(wood, [-W / 2 + 0.06, a, -D / 2], [W / 2 - 0.06, b, -D / 2 + 0.03]);
      addBox(wood, [-W / 2 + 0.06, a, D / 2 - 0.03], [W / 2 - 0.06, b, D / 2]);
      for (const sx of [-1, 1]) addBox(wood, [sx * (W / 2) - 0.015, a, -D / 2 + 0.06], [sx * (W / 2) + 0.015, b, D / 2 - 0.06]);
    }
    addBox(wood, [-W / 2 + 0.06, 0.38, -D / 2], [W / 2 - 0.06, 0.5, -D / 2 + 0.03]);
    // The heap.
    const j = vary(seed, 3) * 0.05;
    addTaper(m.mesh('cloth', 0x2a2622), 0, 0, 0.04, 0.5 + j, W - 0.1, D - 0.1, W - 0.35, D - 0.28, 1, 1);
    addTaper(m.mesh('cloth', 0x3a342e), -0.1, 0.02, 0.4 + j, 0.56 + j, 0.3, 0.2, 0.16, 0.1, 1, 1);
    return m.done();
  },
};


export default coalbin;

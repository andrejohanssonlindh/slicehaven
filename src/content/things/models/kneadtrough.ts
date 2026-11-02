import { ModelBuilder, addBox, addTaper, vary } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** A kneading trough: a long open box on trestle legs, dough in it, a scraper laid on the rim. */
const W = 1.0, D = 0.5, H = 0.8;

const kneadtrough: FurnitureModel = {
  w: W,
  d: D,
  draw(seed) {
    const m = new ModelBuilder();
    const wood = m.mesh('plank');
    const dough = m.mesh('cloth', 0xe0d8c4);
    const y0 = 0.62;
    addTaper(wood, 0, 0, y0, H, W * 0.8, D * 0.7, W, D, 0.7, 1); // sloped bottom to rim
    addBox(wood, [-W / 2 + 0.05, 0, -D / 2 + 0.06], [-W / 2 + 0.11, y0, -D / 2 + 0.12], { aoBottom: 0.6 });
    addBox(wood, [W / 2 - 0.11, 0, -D / 2 + 0.06], [W / 2 - 0.05, y0, -D / 2 + 0.12], { aoBottom: 0.6 });
    addBox(wood, [-W / 2 + 0.05, 0, D / 2 - 0.12], [-W / 2 + 0.11, y0, D / 2 - 0.06], { aoBottom: 0.6 });
    addBox(wood, [W / 2 - 0.11, 0, D / 2 - 0.12], [W / 2 - 0.05, y0, D / 2 - 0.06], { aoBottom: 0.6 });
    addBox(wood, [-W / 2 + 0.08, 0.2, -0.02], [W / 2 - 0.08, 0.26, 0.02]);
    // Dough mounded inside, below the rim.
    const dw = 0.45 + vary(seed, 1) * 0.2;
    addTaper(dough, (vary(seed, 2) - 0.5) * 0.2, 0, H - 0.06, H + 0.06, dw, 0.3, dw * 0.6, 0.2, 1, 1);
    addBox(wood, [0.2, H, D / 2 - 0.03], [0.34, H + 0.015, D / 2 + 0.01]);
    return m.done();
  },
};

export default kneadtrough;

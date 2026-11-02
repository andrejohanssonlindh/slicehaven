import { ModelBuilder, addBox, addTaper, vary } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** A bale of hay with two twine bands, and a loose tuft on top. */
const W = 0.9, D = 0.5, H = 0.45;

const haybale: FurnitureModel = {
  w: W,
  d: D,
  draw(seed) {
    const m = new ModelBuilder();
    const hay = m.mesh('hay'), twine = m.mesh('cloth', 0x7a5a3c);
    addBox(hay, [-W / 2, 0, -D / 2], [W / 2, H, D / 2], { aoBottom: 0.6 });
    for (const sx of [-1, 1]) addBox(twine, [sx * 0.2 - 0.015, 0.01, -D / 2 - 0.01], [sx * 0.2 + 0.015, H + 0.01, D / 2 + 0.01]);
    addTaper(hay, (vary(seed, 1) - 0.5) * 0.4, 0, H, H + 0.1, 0.3, 0.2, 0.12, 0.1, 1, 1);
    return m.done();
  },
};

export default haybale;

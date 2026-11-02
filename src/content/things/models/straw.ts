import { ModelBuilder, addBox, vary } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** Straw on the floor: a few low scattered mats of hay; flat. */
const straw: FurnitureModel = {
  w: 0.8,
  d: 0.6,
  draw(seed) {
    const m = new ModelBuilder();
    const hay = m.mesh('hay');
    for (let i = 0; i < 6; i++) {
      const x = (vary(seed, i) - 0.5) * 0.5, z = (vary(seed, i + 10) - 0.5) * 0.3;
      const w = 0.2 + vary(seed, i + 20) * 0.15, d = 0.15 + vary(seed, i + 30) * 0.1;
      addBox(hay, [x - w / 2, 0, z - d / 2], [x + w / 2, 0.012 + (i % 2) * 0.006, z + d / 2]);
    }
    return m.done();
  },
};
export default straw;

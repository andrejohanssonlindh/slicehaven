import { ModelBuilder, addBox, vary } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** A drying rack: two A-frames, three rails, rows of split fish hung by the tail. */
const W = 1.0, D = 0.5, TOP = 1.2;

const fishRack: FurnitureModel = {
  w: W,
  d: D,
  draw(seed) {
    const m = new ModelBuilder();
    const wood = m.mesh('plank'), fish = m.mesh('cloth', 0x9a8a72), silver = m.mesh('cloth', 0x8a8e88);
    for (const sx of [-1, 1]) {
      const x = sx * (W / 2 - 0.04);
      for (const sz of [-1, 1]) addBox(wood, [x - 0.025, 0, sz * 0.2 - 0.025], [x + 0.025, TOP, sz * 0.2 + 0.025], { aoBottom: 0.6 });
      addBox(wood, [x - 0.025, 0.5, -0.2], [x + 0.025, 0.55, 0.2]);
    }
    for (const [i, z] of [-0.18, 0, 0.18].entries()) {
      const y = i === 1 ? TOP - 0.02 : TOP - 0.08 - i * 0.01;
      addBox(wood, [-W / 2, y - 0.025, z - 0.025], [W / 2, y + 0.025, z + 0.025]);
      const n = 4;
      for (let k = 0; k < n; k++) {
        const x = -W / 2 + 0.14 + (k + 0.5) * ((W - 0.28) / n);
        const len = 0.38 + vary(seed, i * 10 + k) * 0.12;
        addBox(vary(seed, i * 10 + k + 40) < 0.4 ? silver : fish, [x - 0.05, y - 0.03 - len, z - 0.012], [x + 0.05, y - 0.03, z + 0.012]);
      }
    }
    return m.done();
  },
};

export default fishRack;

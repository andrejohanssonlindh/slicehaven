import { ModelBuilder, addBox, vary } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** A rack of tongs and hammers: a wall rail with pegs, tongs and hammers hanging from it. Hung: y = 0 is the lowest point. */
const W = 1.2, D = 0.14, BASE = 0.48, RH = 0.1;

const toolrack: FurnitureModel = {
  w: W,
  d: D,
  draw(seed) {
    const m = new ModelBuilder();
    const wood = m.mesh('plank'), iron = m.mesh('iron');
    addBox(wood, [-W / 2, BASE, -D / 2], [W / 2, BASE + RH, -D / 2 + 0.03], { aoBottom: 0.7 });
    for (let i = 0; i < 6; i++) {
      const x = -W / 2 + 0.1 + i * ((W - 0.2) / 5);
      addBox(wood, [x - 0.015, BASE + 0.03, -D / 2 + 0.03], [x + 0.015, BASE + 0.07, D / 2 - 0.02]);
      const len = 0.28 + vary(seed, i) * 0.12;
      if (i % 2 === 0) {
        // tongs: two long jaws
        addBox(iron, [x - 0.03, BASE + 0.07 - len, D / 2 - 0.05], [x - 0.005, BASE + 0.09, D / 2 - 0.02]);
        addBox(iron, [x + 0.005, BASE + 0.07 - len, D / 2 - 0.05], [x + 0.03, BASE + 0.09, D / 2 - 0.02]);
      } else {
        // hammer: a haft with a heavy head at the bottom
        addBox(wood, [x - 0.015, BASE + 0.07 - len, D / 2 - 0.045], [x + 0.015, BASE + 0.09, D / 2 - 0.02]);
        addBox(iron, [x - 0.06, BASE + 0.07 - len - 0.08, D / 2 - 0.06], [x + 0.06, BASE + 0.07 - len + 0.01, D / 2 - 0.01]);
      }
    }
    return m.done();
  },
};

export default toolrack;

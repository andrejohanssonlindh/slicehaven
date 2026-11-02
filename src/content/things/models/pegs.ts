import { ModelBuilder, addBox, vary } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** Pegs for cloaks: a board on the wall with five pegs, a cloak or two hanging from them. Hung: y = 0 is the board's bottom. */
const W = 1.0, D = 0.16, BH = 0.12, BASE = 0.72;
const CLOAKS = [0x55663a, 0x3c5070, 0x8a3a2e, 0x7a5a3c];

const pegs: FurnitureModel = {
  w: W,
  d: D,
  draw(seed) {
    const m = new ModelBuilder();
    const wood = m.mesh('plank');
    addBox(wood, [-W / 2, BASE, -D / 2], [W / 2, BASE + BH, -D / 2 + 0.03], { aoBottom: 0.7 });
    for (let i = 0; i < 5; i++) {
      const x = -W / 2 + 0.1 + i * ((W - 0.2) / 4);
      addBox(wood, [x - 0.02, BASE + BH / 2 - 0.02, -D / 2 + 0.03], [x + 0.02, BASE + BH / 2 + 0.02, D / 2]);
      if (vary(seed, i) < 0.45) {
        const c = m.mesh('cloth', CLOAKS[Math.floor(vary(seed, i + 20) * CLOAKS.length)]);
        const len = 0.5 + vary(seed, i + 40) * 0.2;
        addBox(c, [x - 0.09, BASE + BH / 2 - len, D / 2 - 0.06], [x + 0.09, BASE + BH / 2 + 0.04, D / 2 - 0.02], { aoBottom: 0.8 });
      }
    }
    return m.done();
  },
};

export default pegs;

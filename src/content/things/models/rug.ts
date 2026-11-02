import { ModelBuilder, addBox, vary } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** A rag rug: woven strips of coloured cloth across a plain ground; flat on the floor. */
const W = 1.2, D = 0.8;
const COLS = [0x8a3a2e, 0x3c5070, 0xc0b494, 0x55663a, 0x9a7a26];
const rug: FurnitureModel = {
  w: W,
  d: D,
  draw(seed) {
    const m = new ModelBuilder();
    addBox(m.mesh('cloth', 0xa89878), [-W / 2, 0, -D / 2], [W / 2, 0.012, D / 2]);
    const n = 6, sw = (W - 0.1) / n;
    for (let i = 0; i < n; i++) {
      const c = COLS[Math.floor(vary(seed, i) * COLS.length)];
      addBox(m.mesh('cloth', c), [-W / 2 + 0.05 + i * sw + 0.01, 0.012, -D / 2 + 0.05], [-W / 2 + 0.05 + (i + 1) * sw - 0.01, 0.018, D / 2 - 0.05]);
    }
    return m.done();
  },
};
export default rug;

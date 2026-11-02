import { ModelBuilder, addBox, vary } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** Odds and ends on the floor: a few scraps of cloth, a shard of pot and a bit of bone, all very low. */
const litter: FurnitureModel = {
  w: 0.6,
  d: 0.5,
  draw(seed) {
    const m = new ModelBuilder();
    const cols = [0x8a3a2e, 0xc0b494, 0x7a5a3c, 0x3c5070];
    for (let i = 0; i < 5; i++) {
      const x = (vary(seed, i) - 0.5) * 0.4, z = (vary(seed, i + 10) - 0.5) * 0.3;
      const w = 0.08 + vary(seed, i + 20) * 0.1, d = 0.06 + vary(seed, i + 30) * 0.08;
      addBox(m.mesh('cloth', cols[i % cols.length]), [x - w / 2, 0, z - d / 2], [x + w / 2, 0.012 + (i % 3) * 0.004, z + d / 2]);
    }
    addBox(m.mesh('cloth', 0xe0d8c4), [0.18, 0, 0.12], [0.26, 0.015, 0.16]);
    return m.done();
  },
};
export default litter;

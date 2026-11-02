import { ModelBuilder, addBox, vary } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** A woven hanging: a rod with two knobs, a long cloth in stripes and a border. Lowest point y = 0. */
const W = 0.8, D = 0.08, LEN = 1.1;
const GROUNDS = [0x8a3a2e, 0x3c5070, 0x55663a];

const hanging: FurnitureModel = {
  w: W,
  d: D,
  draw(seed) {
    const m = new ModelBuilder();
    const wood = m.mesh('plank');
    const ground = m.mesh('cloth', GROUNDS[Math.floor(vary(seed, 1) * GROUNDS.length)]);
    const trim = m.mesh('cloth', 0xc0b494), accent = m.mesh('cloth', 0x9a7a26);
    const x = W / 2 - 0.04, z0 = -D / 2, z1 = z0 + 0.03;
    addBox(wood, [-W / 2, LEN - 0.04, z0], [W / 2, LEN, z0 + 0.06]);
    addBox(ground, [-x, 0, z0], [x, LEN - 0.04, z1]);
    addBox(trim, [-x, 0, z1], [x, 0.06, z1 + 0.01]); // fringe band
    addBox(trim, [-x, LEN - 0.12, z1], [x, LEN - 0.06, z1 + 0.01]);
    addBox(accent, [-0.06, 0.2, z1], [0.06, LEN - 0.25, z1 + 0.01]); // central stripe
    addBox(trim, [-0.2, LEN * 0.5 - 0.03, z1], [0.2, LEN * 0.5 + 0.03, z1 + 0.01]);
    return m.done();
  },
};

export default hanging;

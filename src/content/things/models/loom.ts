import { ModelBuilder, addBox, vary } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** A weaver's upright loom: two posts, beams top and bottom, warp threads with the cloth woven up from below, a bench in front. */
const W = 1.2, D = 0.8;
const CLOTHS = [0x8a3a2e, 0x3c5070, 0x55663a, 0x9a7a26];

const loom: FurnitureModel = {
  w: W,
  d: D,
  draw(seed) {
    const m = new ModelBuilder();
    const wood = m.mesh('plank');
    const woven = m.mesh('cloth', CLOTHS[Math.floor(vary(seed, 1) * CLOTHS.length)]);
    const warp = m.mesh('cloth', 0xc0b494);
    const zf = -0.12;
    for (const sx of [-1, 1]) {
      const x = sx * (W / 2 - 0.06);
      addBox(wood, [x - 0.05, 0, zf - 0.28], [x + 0.05, 0.06, zf + 0.28], { aoBottom: 0.5 }); // foot
      addBox(wood, [x - 0.04, 0.05, zf - 0.04], [x + 0.04, 1.6, zf + 0.04], { aoBottom: 0.6 }); // post
    }
    addBox(wood, [-W / 2 + 0.02, 1.5, zf - 0.05], [W / 2 - 0.02, 1.6, zf + 0.05]); // top beam
    addBox(wood, [-W / 2 + 0.02, 0.35, zf - 0.05], [W / 2 - 0.02, 0.45, zf + 0.05]); // cloth beam
    addBox(wood, [-W / 2 + 0.02, 0.9, zf + 0.08], [W / 2 - 0.02, 0.94, zf + 0.12]); // heddle bar
    const h = 0.25 + vary(seed, 2) * 0.35; // how far the weaving has got
    addBox(warp, [-W / 2 + 0.12, 0.45 + h, zf - 0.015], [W / 2 - 0.12, 1.5, zf + 0.015]);
    addBox(woven, [-W / 2 + 0.12, 0.45, zf - 0.025], [W / 2 - 0.12, 0.45 + h, zf + 0.025]);
    // The weaver's bench, front.
    addBox(wood, [-0.3, 0.42, 0.18], [0.3, 0.46, 0.4]);
    for (const sx of [-1, 1]) addBox(wood, [sx * 0.25 - 0.025, 0, 0.22], [sx * 0.25 + 0.025, 0.42, 0.36], { aoBottom: 0.6 });
    return m.done();
  },
};

export default loom;

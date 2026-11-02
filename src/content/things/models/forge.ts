import { ModelBuilder, addBox, addTaper } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** A smith's forge: a stone hearth about hip height with a bed of glowing coals, a hood and chimney at the back, a bellows at the side. */
const W = 1.3, D = 0.9, H = 0.85;

const forge: FurnitureModel = {
  w: W,
  d: D,
  draw() {
    const m = new ModelBuilder();
    const stone = m.mesh('stone'), iron = m.mesh('iron');
    // The hearth: a stone block with a hollow (rim on four sides) filled with coal and embers.
    addBox(stone, [-W / 2, 0, -D / 2], [W / 2, H - 0.12, D / 2], { aoBottom: 0.6 });
    addBox(stone, [-W / 2, H - 0.12, -D / 2], [W / 2, H, -D / 2 + 0.12]);
    addBox(stone, [-W / 2, H - 0.12, D / 2 - 0.1], [W / 2, H, D / 2]);
    addBox(stone, [-W / 2, H - 0.12, -D / 2 + 0.12], [-W / 2 + 0.1, H, D / 2 - 0.1]);
    addBox(stone, [W / 2 - 0.1, H - 0.12, -D / 2 + 0.12], [W / 2, H, D / 2 - 0.1]);
    addBox(m.mesh('cloth', 0x2a2622), [-W / 2 + 0.1, H - 0.12, -D / 2 + 0.12], [W / 2 - 0.1, H - 0.04, D / 2 - 0.1]);
    addTaper(m.mesh('cloth', 0xd0642a), 0.02, 0.03, H - 0.06, H + 0.03, 0.6, 0.4, 0.42, 0.26, 1, 1);
    // The chimney breast against the back wall, tapering up, with an iron hood over the coals.
    addTaper(stone, 0, -D / 2 + 0.17, H, 2.0, 0.9, 0.34, 0.5, 0.34, 0.9, 1);
    addTaper(iron, 0, -D / 2 + 0.3, H + 0.45, H + 0.7, 1.0, 0.5, 0.6, 0.3, 0.9, 1);
    // The bellows at the side: a leather wedge.
    addTaper(m.mesh('cloth', 0x5a3a24), W / 2 - 0.2, -D / 2 + 0.25, H, H + 0.14, 0.2, 0.4, 0.1, 0.3, 1, 1);
    return m.done();
  },
};

export default forge;

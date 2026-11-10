import { ModelBuilder, addBox, addCylinder } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** A waterskin lying on its side: a fat leather body and a wooden stopper. */
const waterskin: FurnitureModel = {
  w: 0.32,
  d: 0.18,
  draw() {
    const m = new ModelBuilder();
    addBox(m.mesh('cloth', 0x6e4a2c), [-0.13, 0, -0.08], [0.11, 0.12, 0.08], { aoBottom: 0.7 });
    addBox(m.mesh('cloth', 0x6e4a2c), [0.11, 0.02, -0.04], [0.15, 0.09, 0.04]);
    addCylinder(m.mesh('plank'), 0.16, 0, 0.03, 0.08, 0.02, 0.02, 6);
    return m.done();
  },
};

export default waterskin;

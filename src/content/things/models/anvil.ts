import { ModelBuilder, addBox, addCylinder, addTaper } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** An anvil on a stump: a round log (bark), and on it the waist, the face and the horn, in iron; its horn points along x. */
const W = 0.7, D = 0.4, STUMP = 0.45;

const anvil: FurnitureModel = {
  w: W,
  d: D,
  draw() {
    const m = new ModelBuilder();
    addCylinder(m.mesh('bark'), 0, 0, 0, STUMP, 0.2, 0.18, 8, { ao0: 0.6 });
    const iron = m.mesh('iron');
    addTaper(iron, 0, 0, STUMP, STUMP + 0.1, 0.34, 0.24, 0.2, 0.16, 0.9, 1); // foot to waist
    addBox(iron, [-0.3, STUMP + 0.1, -0.1], [0.2, STUMP + 0.2, 0.1]); // the face
    addTaper(iron, 0.3, 0, STUMP + 0.1, STUMP + 0.2, 0.2, 0.18, 0.04, 0.08, 1, 1); // the horn
    return m.done();
  },
};

export default anvil;

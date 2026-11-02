import { ModelBuilder, addCylinder } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** A tub of water for quenching: a squat stave tub with iron hoops, the water just below the rim. */
const R = 0.4, H = 0.55;

const quenchtub: FurnitureModel = {
  w: 0.85,
  d: 0.85,
  draw() {
    const m = new ModelBuilder();
    const wood = m.mesh('plank');
    // Open at the top: the water is a disc inside.
    addCylinder(wood, 0, 0, 0, H, R - 0.02, R, 8, { top: false, ao0: 0.6 });
    addCylinder(wood, 0, 0, 0, H - 0.02, R - 0.07, R - 0.07, 8, { top: false, bottom: true });
    addCylinder(wood, 0, 0, H - 0.02, H, R, R, 8, { top: false });
    addCylinder(m.mesh('water'), 0, 0, H - 0.1, H - 0.1, R - 0.05, R - 0.05, 8, { bottom: false });
    for (const y of [0.1, H - 0.1]) addCylinder(m.mesh('iron'), 0, 0, y - 0.02, y + 0.02, R + 0.012, R + 0.012, 8, { top: false });
    return m.done();
  },
};

export default quenchtub;

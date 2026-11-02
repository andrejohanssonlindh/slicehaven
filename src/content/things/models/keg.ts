import { ModelBuilder, addBox, addCylinder } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/**
 * Example 2 (round): a small keg standing on end. Round things are `addCylinder` (eight sides read as round at pixel
 * size); the belly is two cylinders, narrow at the ends and wide in the middle; iron hoops are thin cylinders a
 * little wider than the wood; the tap is a box.
 */
const R = 0.2, BELLY = 0.235, H = 0.55;

const keg: FurnitureModel = {
  w: 0.5,
  d: 0.5,
  draw() {
    const m = new ModelBuilder();
    const wood = m.mesh('plank'), iron = m.mesh('iron');
    addCylinder(wood, 0, 0, 0, H / 2, R, BELLY, 8, { top: false, ao0: 0.6 });
    addCylinder(wood, 0, 0, H / 2, H, BELLY, R, 8, { ao0: 1, ao1: 0.95 });
    // Hoops near each end and round the belly, standing a centimetre proud.
    for (const [y, r] of [[0.06, R + 0.012], [H / 2, BELLY + 0.01], [H - 0.06, R + 0.012]] as const) addCylinder(iron, 0, 0, y - 0.02, y + 0.02, r, r, 8, { top: false });
    // The tap, toward the front.
    addBox(iron, [-0.02, 0.08, R - 0.02], [0.02, 0.12, R + 0.06]);
    return m.done();
  },
};

export default keg;

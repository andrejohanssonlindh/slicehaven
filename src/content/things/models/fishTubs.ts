import { ModelBuilder, addBox, addCylinder, vary } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** Two wooden tubs of water with fish shapes in them, one larger. */
const W = 0.9, D = 0.55;

const fishTubs: FurnitureModel = {
  w: W,
  d: D,
  draw(seed) {
    const m = new ModelBuilder();
    const wood = m.mesh('plank'), water = m.mesh('water'), iron = m.mesh('iron'), fish = m.mesh('cloth', 0x8a8e88);
    const tub = (cx: number, cz: number, r: number, h: number, salt: number): void => {
      addCylinder(wood, cx, cz, 0, h, r, r + 0.03, 8, { top: false, bottom: true, ao0: 0.6 });
      addCylinder(iron, cx, cz, h * 0.2, h * 0.2 + 0.03, r + 0.005, r + 0.005, 8, { top: false });
      addCylinder(water, cx, cz, h - 0.07, h - 0.06, r - 0.01, r - 0.01, 8, { bottom: false });
      for (let k = 0; k < 2; k++) {
        const a = vary(seed, salt + k) * 6.28;
        addBox(fish, [cx + Math.sin(a) * 0.1 - 0.06, h - 0.075, cz + Math.cos(a) * 0.1 - 0.02], [cx + Math.sin(a) * 0.1 + 0.06, h - 0.06, cz + Math.cos(a) * 0.1 + 0.02]);
      }
    };
    tub(-0.22, 0.02, 0.23, 0.5, 1);
    tub(0.27, -0.02, 0.17, 0.4, 5);
    return m.done();
  },
};

export default fishTubs;

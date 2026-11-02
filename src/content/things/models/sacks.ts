import { ModelBuilder, addTaper, vary } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** Sacks of grain: two slumped sacks side by side with a third on top, tied at the neck. */
const sacks: FurnitureModel = {
  w: 0.8,
  d: 0.55,
  draw(seed) {
    const m = new ModelBuilder();
    const c = [0xc0b494, 0xc8b484, 0xb0a484];
    const col = (i: number) => c[Math.floor(vary(seed, i) * c.length)];
    const sack = (x: number, z: number, y: number, w: number, d: number, h: number, i: number) => {
      addTaper(m.mesh('cloth', col(i)), x, z, y, y + h * 0.8, w, d, w * 0.9, d * 0.85, 0.7, 1);
      addTaper(m.mesh('cloth', col(i)), x, z, y + h * 0.8, y + h, w * 0.9, d * 0.85, w * 0.35, d * 0.35, 1, 1);
    };
    sack(-0.2, -0.08, 0, 0.38, 0.4, 0.6, 1);
    sack(0.2, -0.1, 0, 0.36, 0.38, 0.55, 2);
    sack(0, 0.14, 0, 0.36, 0.36, 0.5, 3);
    addTaper(m.mesh('cloth', 0x9a8a6a), -0.05, -0.1, 0.55, 0.65, 0.32, 0.3, 0.22, 0.2, 0.8, 1);
    return m.done();
  },
};
export default sacks;

import { ModelBuilder, addTaper, addBeam } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** A broom leaning on the wall: a long handle, a bundle of twigs at the foot. (The bucket is its own thing, `bucket.ts`.) */
const broom: FurnitureModel = {
  w: 0.5,
  d: 0.4,
  draw() {
    const m = new ModelBuilder();
    const wood = m.mesh('plank');
    // (The footprint stays the old bucket-and-broom's 0.5 m: the room solver lays rooms out from it, and a narrower
    // one closed the way to the inn's hearth.)
    addBeam(wood, [0, 0.02, 0.08], [0.07, 1.3, -0.17], 0.03, [0, 0, 1]);
    addTaper(m.mesh('cloth', 0xa8903c), 0, 0.1, 0, 0.3, 0.2, 0.12, 0.07, 0.07, 0.7, 1);
    return m.done();
  },
};
export default broom;

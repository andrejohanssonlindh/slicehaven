import { ModelBuilder, addCylinder, addTaper, vary } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/** A heap of nets: a lumpy mound of tangled mesh, floats and a coil of rope on top. */
const W = 0.8, D = 0.55;

const nets: FurnitureModel = {
  w: W,
  d: D,
  draw(seed) {
    const m = new ModelBuilder();
    const net = m.mesh('cloth', 0xc0b494), dark = m.mesh('cloth', 0x9a8a72), wood = m.mesh('plank');
    addTaper(net, 0, 0, 0, 0.3, W - 0.05, D - 0.05, 0.5, 0.3, 0.6, 1);
    const j = (vary(seed, 1) - 0.5) * 0.15;
    addTaper(dark, -0.15 + j, 0.02, 0.28, 0.42, 0.35, 0.25, 0.2, 0.15, 1, 1);
    addTaper(net, 0.18, -0.05, 0.28, 0.38, 0.3, 0.22, 0.18, 0.14, 1, 1);
    for (const [x, z] of [[-0.3, 0.22], [0.1, 0.25], [0.32, 0.18]] as const) addCylinder(wood, x, z, 0.05, 0.13, 0.04, 0.04, 6);
    return m.done();
  },
};

export default nets;

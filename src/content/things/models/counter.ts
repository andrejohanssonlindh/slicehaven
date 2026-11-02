import { ModelBuilder, addBox, addCylinder, addTaper, vary } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

/**
 * A shop counter, its front (+z) toward the customer. Plank body with a worn foot rail and a top that overhangs; what
 * stands on it depends on the variant (bread, general, fish, herbs, cloth, ale), as on the old card.
 */
const W = 1.6, D = 0.6, H = 0.95;
const TOP = H, ZB = -0.05; // goods stand on the top, a little behind its middle

type Goods = (m: ModelBuilder, seed: number) => void;
const jar = (m: ModelBuilder, x: number, z: number, r: number, h: number, colour: number): void => addCylinder(m.mesh('cloth', colour), x, z, TOP, TOP + h, r, r * 0.85, 6);

const GOODS: Record<string, Goods> = {
  bread: (m, seed) => {
    for (let i = 0; i < 3; i++) addTaper(m.mesh('cloth', 0xa8743a), -0.5 + i * 0.3, ZB, TOP, TOP + 0.1, 0.24 + vary(seed, i) * 0.04, 0.15, 0.2, 0.12, 0.8, 1);
    for (let i = 0; i < 4; i++) addTaper(m.mesh('cloth', 0xa8743a), 0.4 + (i % 2) * 0.1, -0.12 + (i >> 1) * 0.12, TOP, TOP + 0.05, 0.08, 0.08, 0.06, 0.06, 0.8, 1);
    addBox(m.mesh('cloth', 0xe0d8c4), [0.55, TOP, 0.12], [0.7, TOP + 0.005, 0.2]);
  },
  general: (m, seed) => {
    addBox(m.mesh('iron'), [-0.6, TOP, ZB - 0.05], [-0.4, TOP + 0.03, ZB + 0.05]); // scales
    addBox(m.mesh('iron'), [-0.52, TOP + 0.03, ZB - 0.01], [-0.48, TOP + 0.2, ZB + 0.01]);
    addBox(m.mesh('iron'), [-0.64, TOP + 0.2, ZB - 0.01], [-0.36, TOP + 0.22, ZB + 0.01]);
    jar(m, -0.15, ZB, 0.05, 0.13, 0x9a6a48); jar(m, -0.03, ZB, 0.05, 0.1, 0x2e4a32);
    addCylinder(m.mesh('cloth', 0x8a7448), 0.35, ZB, TOP, TOP + 0.1, 0.12, 0.1, 8); // a coil of rope
    void seed;
  },
  fish: (m, seed) => {
    addBox(m.mesh('plank'), [-0.7, TOP, ZB - 0.2], [0.1, TOP + 0.03, ZB + 0.2]); // a board
    for (let i = 0; i < 4; i++) addTaper(m.mesh('cloth', i % 2 ? 0x7a8a96 : 0x5a6a7a), -0.6 + i * 0.17 + vary(seed, i) * 0.03, ZB, TOP + 0.03, TOP + 0.09, 0.1, 0.34, 0.07, 0.3, 0.8, 1);
    addBox(m.mesh('iron'), [0.3, TOP, ZB], [0.55, TOP + 0.015, ZB + 0.03]); // knife
  },
  herbs: (m) => {
    jar(m, -0.55, ZB, 0.05, 0.14, 0x5a3a68); jar(m, -0.42, ZB, 0.05, 0.11, 0x55663a); jar(m, -0.29, ZB, 0.05, 0.15, 0x9a7a26); jar(m, -0.16, ZB, 0.05, 0.09, 0x9a6a48);
    addBox(m.mesh('cloth', 0x55663a), [0.1, TOP, ZB - 0.06], [0.4, TOP + 0.04, ZB + 0.06]); // bundles
    addCylinder(m.mesh('stone'), 0.62, ZB, TOP, TOP + 0.1, 0.08, 0.1, 8); // mortar
  },
  cloth: (m) => {
    const bolts = [0x3c5070, 0x8a3a2e, 0x55663a, 0xc0b494];
    bolts.forEach((c, i) => addBox(m.mesh('cloth', c), [-0.65 + i * 0.22, TOP, ZB - 0.14], [-0.47 + i * 0.22, TOP + 0.1 + (i % 2) * 0.05, ZB + 0.14], { aoBottom: 0.8 }));
    addBox(m.mesh('cloth', 0xc8a458), [0.3, TOP, ZB + 0.1], [0.75, TOP + 0.02, ZB + 0.15]); // measuring rod
  },
  ale: (m, seed) => {
    for (let i = 0; i < 4; i++) {
      const x = -0.6 + i * 0.16, z = ZB + (vary(seed, i) - 0.5) * 0.1;
      addCylinder(m.mesh('plank'), x, z, TOP, TOP + 0.11, 0.045, 0.045, 6);
      addCylinder(m.mesh('iron'), x, z, TOP + 0.02, TOP + 0.035, 0.05, 0.05, 6, { top: false });
    }
    jar(m, 0.1, ZB, 0.07, 0.2, 0x9a6a48);
    addCylinder(m.mesh('cloth', 0xe0d8c4), 0.5, ZB + 0.1, TOP, TOP + 0.01, 0.1, 0.1, 6);
  },
};

const counter: FurnitureModel = {
  w: W,
  d: D,
  draw(seed, variant) {
    const m = new ModelBuilder();
    const wood = m.mesh('plank');
    addBox(wood, [-W / 2 + 0.03, 0, -D / 2 + 0.03], [W / 2 - 0.03, TOP - 0.05, D / 2 - 0.05], { aoBottom: 0.6 });
    addBox(wood, [-W / 2, TOP - 0.05, -D / 2], [W / 2, TOP, D / 2], { aoBottom: 0.7 });
    addBox(wood, [-W / 2 + 0.03, 0.12, D / 2 - 0.06], [W / 2 - 0.03, 0.17, D / 2]); // foot rail
    (GOODS[variant ?? 'general'] ?? GOODS.general)(m, seed);
    return m.done();
  },
};

export default counter;

import { TORCH_FIRE } from '../../../core/world3d/filaments3d';
import { addBox, addOrientedBox, emptyMesh } from '../../../core/world3d/mesh';
import type { ThingDef } from '../../../core/world3d/things';
import { solid } from '../parts';

const POST_HEIGHT = 1.9;
const BRACKET_HEIGHT = 2.25;

/** Things that burn on purpose. `fire` is also a kind in the skill library, so its hooks reach every flame below. */
const things: ThingDef[] = [
  {
    id: 'torchpost',
    is: 'fire',
    look: 'A timber post with a torch burning on top.',
    // The post itself: a walker can stand against it.
    foot: [{ circle: 0.12 }],
    filament: { kind: 'fire', weight: TORCH_FIRE },
    flame: { y: POST_HEIGHT },
    draw: () => {
      const m = emptyMesh();
      addBox(m, [-0.07, 0, -0.07], [0.07, POST_HEIGHT, 0.07]);
      return solid('plank', m);
    },
  },
  {
    id: 'walltorch',
    is: 'fire',
    look: 'A torch in an iron bracket beside the door.',
    // On the wall, out of the way of feet. Its flame is as high as a hand can reach from the floor (the floor stands on a footing).
    filament: { kind: 'fire', weight: TORCH_FIRE },
    flame: { y: BRACKET_HEIGHT },
    draw: () => {
      const m = emptyMesh();
      addBox(m, [-0.03, BRACKET_HEIGHT - 0.32, -0.12], [0.03, BRACKET_HEIGHT - 0.26, 0.04]);
      addBox(m, [-0.035, BRACKET_HEIGHT - 0.3, -0.035], [0.035, BRACKET_HEIGHT, 0.035]);
      return solid('plank', m);
    },
  },
  {
    id: 'campfire',
    is: 'fire',
    look: 'A campfire of three logs, burning.',
    foot: [{ circle: 0.4 }],
    // A full fire: it lifts the field's fire reading by itself.
    filament: { kind: 'fire', weight: 1 },
    flame: { y: 0, size: 1, count: 20, power: 10, lightY: 0.7 },
    smoke: { y: 0.9 },
    draw: () => {
      const m = emptyMesh();
      for (const rot of [0.5, 2.1, 3.6]) {
        const c = Math.cos(rot), s = Math.sin(rot);
        addOrientedBox(m, [0, 0.06, 0], [c, 0, -s], [0, 1, 0], [s, 0, c], [0.35, 0.05, 0.05]);
      }
      return solid('bark', m);
    },
  },
];

export default things;

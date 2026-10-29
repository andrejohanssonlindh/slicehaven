import { TORCH_FIRE } from '../../../core/world3d/filaments3d';
import { addBox, emptyMesh } from '../../../core/world3d/mesh';
import type { ThingDef } from '../../../core/world3d/things';
import { solid } from '../parts';

const POST_HEIGHT = 1.9;

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
];

export default things;

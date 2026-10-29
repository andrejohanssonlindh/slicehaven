import { buildWell } from '../../../core/world3d/props';
import type { ThingDef } from '../../../core/world3d/things';

/** The village well: still water, a little of it, inside a stone ring. */
const well: ThingDef = {
  id: 'well',
  is: 'water',
  look: 'A stone well with a windlass and a bucket.',
  // The ring's outer edge and no more: the walker's own radius is added when walking, so they can stand against the stones.
  foot: [{ circle: 0.72 }],
  filament: { kind: 'water', weight: 0.6 },
  draw: () => {
    const w = buildWell();
    return { meshes: [{ material: 'stone', mesh: w.stone }, { material: 'bark', mesh: w.wood }, { material: 'water', mesh: w.water }] };
  },
};

export default well;

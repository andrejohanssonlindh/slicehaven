import { pillar } from '../../../core/world3d/propsMore';
import type { ThingDef } from '../../../core/world3d/things';
import { fromParts } from '../parts';

/** A stone pillar: it stops feet and the eye, so a fight can go round it. */
const things: ThingDef[] = [
  {
    id: 'pillar',
    is: 'structure',
    look: 'A weathered stone pillar.',
    foot: [{ circle: 0.45 }],
    blocksSight: true,
    keepClear: 1.2,
    draw: (p) => fromParts(pillar(p.seed)),
  },
];

export default things;

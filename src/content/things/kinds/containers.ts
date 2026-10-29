import { buildCrates } from '../../../core/world3d/props';
import { barrel, trough } from '../../../core/world3d/propsMore';
import type { ThingDef } from '../../../core/world3d/things';
import { fromParts, solid } from '../parts';

/** Things that hold things: the skill hooks for containers (search, steal, hide) apply to all of them. */
const things: ThingDef[] = [
  {
    id: 'barrel',
    is: 'container',
    look: 'A barrel, hooped and stoppered.',
    foot: [{ circle: 0.33 }],
    draw: () => fromParts(barrel()),
  },
  {
    id: 'crates',
    is: 'container',
    look: 'Crates stacked against each other.',
    foot: [{ box: [0.6, 0.35] }],
    draw: (p) => solid('bark', buildCrates(p.seed)),
  },
  {
    id: 'trough',
    is: 'container',
    look: 'A wooden trough for the animals.',
    foot: [{ box: [0.85, 0.3] }],
    draw: () => fromParts(trough()),
  },
];

export default things;

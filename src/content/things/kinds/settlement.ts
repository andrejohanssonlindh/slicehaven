import { BRIDGE_WIDTH, archway, bridge, gate, signpost, stall, tower } from '../../../core/world3d/propsMore';
import { type ThingDef, localBox } from '../../../core/world3d/things';
import { fromParts } from '../parts';

/** The works of a settlement: its gate and archway, a watch tower, a footbridge, a signpost, a market stall. */
const things: ThingDef[] = [
  {
    id: 'gate',
    is: 'door',
    look: 'A plank gate between two posts.',
    len: 3,
    // The posts always block; the leaves only while it is shut.
    foot: (p) => {
      const h = p.len / 2;
      const posts = [localBox(p, -h - 0.17, 0, 0.19, 0.19), localBox(p, h + 0.17, 0, 0.19, 0.19)];
      return p.open ? posts : [...posts, localBox(p, 0, 0, h, 0.12)];
    },
    draw: (p) => fromParts(gate(p.len, !!p.open)),
  },
  {
    id: 'archway',
    is: 'structure',
    look: 'A timber archway over the way.',
    len: 3.2,
    foot: (p) => {
      const h = p.len / 2;
      return [localBox(p, -h - 0.4, 0, 0.45, 0.42), localBox(p, h + 0.4, 0, 0.45, 0.42)];
    },
    draw: (p) => fromParts(archway(p.len, p.seed)),
  },
  {
    id: 'tower',
    is: 'structure',
    look: 'A watch tower on four braced legs.',
    foot: [{ box: [1.2, 1.2] }],
    blocksSight: true,
    draw: (p) => fromParts(tower(p.seed)),
  },
  {
    id: 'bridge',
    is: 'structure',
    look: 'A plank footbridge with rails.',
    len: 5,
    deck: BRIDGE_WIDTH + 0.3,
    // Only the rails: the way between them is the walkway.
    foot: (p) => [localBox(p, 0, -BRIDGE_WIDTH / 2, p.len / 2, 0.07), localBox(p, 0, BRIDGE_WIDTH / 2, p.len / 2, 0.07)],
    draw: (p) => fromParts(bridge(p.len, p.seed)),
  },
  {
    id: 'signpost',
    is: 'structure',
    look: 'A signpost with painted arms.',
    foot: [{ circle: 0.15 }],
    // Something written to be read.
    filament: { kind: 'sign' },
    draw: () => fromParts(signpost()),
  },
  {
    id: 'stall',
    is: 'structure',
    look: 'A market stall under a striped awning.',
    foot: [{ box: [1.1, 0.45], at: [0, 0.35] }],
    // Its awning is a pattern, a small one.
    filament: { kind: 'art', weight: 0.6 },
    draw: (p) => fromParts(stall(p.seed)),
  },
];

export default things;

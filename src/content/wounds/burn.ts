import type { WoundTableDef } from '../../core/damage';

/**
 * Serious wounds from burns: fire, acid, cold, lightning, rot, radiance (the kind is on the hit; only fire ignites,
 * rot turns ignition into infection, acid always harms armour). One table for the whole body; `burnlimb` and
 * `burnarms` roll the table's own D10 for which limbs. Rows 1–20 (20: twenty and above).
 */
const t: WoundTableDef = {
  type: 'burn',
  body: [
    [null, 'dazed'],
    [null, 'back'],
    [null, 'drop'],
    [null, 'fall, drop'],
    [null, 'pain 1'],
    [4, 'infect 3/6, wound 1 burnlimb, ignite 1/4'],
    [5, 'dazed, wound 1 burnlimb, ignite 1/6'],
    [6, 'dazed, pain 1, ignite 1/8'],
    [7, 'infect 4/10, wound 1 burnlimb, ignite 2/8'],
    [8, 'pain 2, ignite 2/10'],
    [10, 'wound 1 head, ignite 2/12'],
    [12, 'drop, pain 1, wound 1 burnarms, ignite 3/12'],
    [14, 'fall, pain 2, ignite 3/14'],
    [16, 'infect 5/10, pain 1, attr Kroppsbyggnad -2, ignite 3/16'],
    [18, 'drop, wound 1 arms, hands -1, ignite 4/16'],
    [20, 'pain 2, eye, ignite 4/18'],
    [22, 'wound 1 head, pain 1, attr Reaktion -2, attr Vaksamhet -2, ignite 4/20'],
    [24, 'pain 2, infect 5/22, ignite 5/20'],
    [26, 'wound 1 all, ignite 5/22'],
    ['R+10', 'infect 5/26, internal, wound 1 all, ignite 6/24'],
  ],
};
export default t;

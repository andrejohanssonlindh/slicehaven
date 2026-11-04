import type { WoundTableDef } from '../../core/damage';

/**
 * Serious wounds from falling (and blasts, which hit the whole body the same way). One table for the whole body; an
 * arm or leg not named is picked at random, the same one for the whole row. Rows 1–20 (20: twenty and above).
 */
const t: WoundTableDef = {
  type: 'fall',
  body: [
    [null, 'fall'],
    [null, 'drop'],
    [null, 'fall, break 8 leg'],
    [null, 'break 8 leg, pain 1, fall'],
    [null, 'break 8 arm, pain 1, drop'],
    [null, 'break 8 rightArm, break 8 leftArm, pain 1, drop'],
    [null, 'break 12 leg, fall'],
    [null, 'break 10 rightLeg, break 10 leftLeg, pain 1, fall'],
    [6, 'break 10 leg, break 10 arm, pain 1, fall, drop'],
    [8, 'break 8 rightLeg, break 8 leftLeg, break 8 rightArm, break 8 leftArm, fall, drop'],
    [9, 'break 14 arm, wound 1 arm, pain 1, fall, drop'],
    [10, 'break 14 arm, wound 1 arm, pain 1, fall, drop, dazed'],
    [11, 'teeth 1D6, break 14 leg, wound 1 head, fall, drop, dazed'],
    [12, 'break 14 leg, wound 1 leg, pain 1, fall, drop'],
    [13, 'break 12 spine, wound 1 head, wound 1 torso, fall, drop'],
    [14, 'break 12 rightLeg, break 12 leftLeg, wound 1 leftLeg, wound 1 rightLeg, fall, drop'],
    [16, 'break 14 neck, break 14 arm, wound 1 head, fall, drop'],
    [18, 'break 14 leg, break 14 spine, break 14 arm, wound 1 torso, pain 1, fall, drop, internal'],
    [20, 'teeth 2D6, break 16 neck, wound 1 head, pain 1, fall, drop'],
    ['R+10', 'break 18 leg, break 18 spine, break 18 arm, wound 1 torso, pain 2, fall, drop, internal'],
  ],
};
export default t;

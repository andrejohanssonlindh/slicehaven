import { type BodyPart, type Injuries, totalFatigue } from '../damage';
import type { Joint } from './pose';

/**
 * The shape a body is in, as it shows (plan B8, the director 2026-11-17: "injuries to an arm or a leg visible in the
 * animations… resting movement in combat based on exhaustion… visual bleeding"). Worked out from what the rules keep
 * (`Injuries`, `core/damage.ts`); the animator (`animate.ts`) and the engine only read this. Pure.
 */
export interface Condition {
  /** 0 fresh … 1 spent, from the fatigue band they are in (`TiredBand`). */
  tired: number;
  /** The band's name (for the gallery and for words later). */
  band: string;
  /** How badly each limb is hurt, 0 whole … 1 useless (wounds, a break, a part lost). */
  armL: number;
  armR: number;
  legL: number;
  legR: number;
  /** How fast they bleed (the rules' rate; 0 not at all), and the joint it runs from. */
  bleed: number;
  bleedFrom: Joint;
  /** How bloodied each part is, 0–1 (its wounds; more while bleeding from it). */
  stains: Partial<Record<BodyPart, number>>;
  /**
   * What is gone for good, by joint: how much of the bone hanging from it is left (0 none: it and everything further
   * out is gone; 0.5 a stump of half the bone). A joint left out is whole.
   */
  gone: Partial<Record<Joint, number>>;
}

/** What a cut takes, down the limb from the body (`L`/`R` added for the side): the joint cut at, and how much of its bone stays. */
const CUTS: Record<string, readonly [joint: string, left: number][]> = {
  hand: [['wrist', 0]],
  forearm: [['elbow', 0.5], ['wrist', 0]],
  elbow: [['elbow', 0]],
  upperarm: [['shoulder', 0.5], ['elbow', 0]],
  shoulder: [['shoulder', 0]],
  foot: [['ankle', 0]],
  calf: [['knee', 0.5], ['ankle', 0]],
  knee: [['knee', 0]],
  thigh: [['hip', 0.5], ['knee', 0]],
  hip: [['hip', 0]],
};

/** A band of fatigue: from this much fatigue on, a body is this tired (0–1). Data: `content/people/condition.ts`. */
export interface TiredBand {
  from: number;
  tired: number;
  name: string;
}

/** The joints that carry each part of the body the rules know (where a wound on it shows). */
export const PART_JOINTS: Record<BodyPart, readonly Joint[]> = {
  head: ['head'],
  torso: ['chest', 'spine'],
  leftArm: ['shoulderL', 'elbowL'],
  rightArm: ['shoulderR', 'elbowR'],
  leftLeg: ['hipL', 'kneeL'],
  rightLeg: ['hipR', 'kneeR'],
};

/** Which arm or leg a lost part belonged to. */
const CUT_LIMB: Record<string, 'Arm' | 'Leg' | undefined> = {
  hand: 'Arm', forearm: 'Arm', elbow: 'Arm', upperarm: 'Arm', shoulder: 'Arm',
  foot: 'Leg', calf: 'Leg', knee: 'Leg', thigh: 'Leg', hip: 'Leg',
};

export const FIT: Condition = { tired: 0, band: '', armL: 0, armR: 0, legL: 0, legR: 0, bleed: 0, bleedFrom: 'chest', stains: {}, gone: {} };

/** The band a fatigue falls in (bands sorted by `from`; the first is for none). */
export function bandOf(fatigue: number, bands: readonly TiredBand[]): TiredBand {
  let out = bands[0];
  for (const b of bands) if (fatigue >= b.from) out = b;
  return out;
}

/** What shows of someone's injuries. Unhurt (or no record) is `FIT`. */
export function conditionOf(i: Injuries | null | undefined, bands: readonly TiredBand[]): Condition {
  if (!i) return bands.length ? { ...FIT, band: bands[0].name } : FIT;
  const band = bandOf(totalFatigue(i), bands);
  const limb = (part: 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg'): number => {
    const side = part.startsWith('left') ? 'left' : 'right', kind = part.endsWith('Arm') ? 'Arm' : 'Leg';
    const gone = i.lost.some((l) => l.side === side && CUT_LIMB[l.area] === kind);
    return gone || i.broken.includes(part) ? 1 : Math.min(1, (i.wounds[part] ?? 0) / 3);
  };
  // Blood runs from the worst-wounded part (the body, if none is marked).
  let worst: BodyPart = 'torso', most = 0;
  const stains: Partial<Record<BodyPart, number>> = {};
  for (const [part, n] of Object.entries(i.wounds) as [BodyPart, number][]) {
    if (!(n > 0)) continue;
    stains[part] = Math.min(1, n / 3);
    if (n > most) { most = n; worst = part; }
  }
  const bleed = i.bleed?.rate ?? 0;
  if (bleed > 0) stains[worst] = Math.min(1, (stains[worst] ?? 0) + 0.5);
  // Parts cut off (a limb needs a side; a neck or body cut is death, and nothing is taken away).
  const gone: Partial<Record<Joint, number>> = {};
  for (const l of i.lost) {
    if (!l.side) continue;
    for (const [joint, left] of CUTS[l.area] ?? []) {
      const j = `${joint}${l.side === 'left' ? 'L' : 'R'}` as Joint;
      gone[j] = Math.min(gone[j] ?? 1, left);
    }
  }
  return {
    gone,
    tired: band.tired, band: band.name,
    armL: limb('leftArm'), armR: limb('rightArm'), legL: limb('leftLeg'), legR: limb('rightLeg'),
    bleed, bleedFrom: PART_JOINTS[worst][PART_JOINTS[worst].length - 1], stains,
  };
}

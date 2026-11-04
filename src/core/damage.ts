import type { Dice } from './chargen/tables';
import { modify } from './checks';
import { type Roll, rollDie, rollOpen, rollTable, rollTest } from './dice';
import type { Rng } from './rng';

/**
 * Damage and wounds (plan item B8, the first foundation of combat). Pure rules from the ruleset's damage chapter,
 * summarised in `director/design/combat-rules.md` (sections 6 and 7): where a blow lands, how much fatigue it gives,
 * the serious-wound tables (data in `content/wounds/`, one file per damage type), the death roll, the after-effects
 * and what they do to a person's rolls. Nothing here knows about the 3D world: a fight (to come) calls `rollHit`,
 * then `applyHit` on the victim's `Injuries` (plain JSON, it goes in the save), and asks `penaltyDice` before a roll.
 *
 * Every random step goes through the seeded `Rng` and comes back as `Roll`s, so the dice can be shown.
 */

// ── Words ───────────────────────────────────────────────────────────────────────────────────────────────────────

/** The six damage types. Cut, crush and thrust come from weapons (`Hugg`, `Kross`, `Stick`); brawl is unarmed. */
export type DamageType = 'cut' | 'crush' | 'thrust' | 'brawl' | 'fall' | 'burn';
export const DAMAGE_TYPES: DamageType[] = ['cut', 'crush', 'thrust', 'brawl', 'fall', 'burn'];
/** The equipment tables' Swedish damage words → ours. */
export const DAMAGE_TYPE_OF: Record<string, DamageType> = { Hugg: 'cut', Kross: 'crush', Stick: 'thrust', hugg: 'cut', kross: 'crush', stick: 'thrust' };

export type BodyPart = 'head' | 'torso' | 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg';
export const BODY_PARTS: BodyPart[] = ['head', 'torso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];
/** Which table a part reads: arms and legs share one; fall and burn hit the whole body. */
export type TablePart = 'head' | 'torso' | 'limb' | 'body';

const isLeg = (p: BodyPart) => p === 'leftLeg' || p === 'rightLeg';
const sideOf = (p: BodyPart): 'left' | 'right' => (p.startsWith('left') ? 'left' : 'right');

/** Where a blow lands, on a D10: 1 head, 2–4 torso, 5–6 left arm, 7–8 right arm, 9 left leg, 10 right leg. */
export function hitPart(d10: number): BodyPart {
  if (d10 <= 1) return 'head';
  if (d10 <= 4) return 'torso';
  if (d10 <= 6) return 'leftArm';
  if (d10 <= 8) return 'rightArm';
  if (d10 === 9) return 'leftLeg';
  return 'rightLeg';
}

/** Which serious-wound table a hit reads. */
export const tablePartOf = (type: DamageType, part: BodyPart): TablePart =>
  type === 'fall' || type === 'burn' ? 'body' : part === 'head' ? 'head' : part === 'torso' ? 'torso' : 'limb';

// ── The damage table ────────────────────────────────────────────────────────────────────────────────────────────

/**
 * What damage left after armour does: 1–4 → 1 fatigue, 5–9 → 2, 10–14 → 4 and a serious wound on D10, 15–19 → 6 and
 * D10+2, and so on (each 5 more: +2 fatigue, +2 on the wound table). 0 or less does nothing.
 */
export function damageTable(net: number): { fatigue: number; serious: boolean; woundBonus: number } {
  if (net <= 0) return { fatigue: 0, serious: false, woundBonus: 0 };
  if (net < 5) return { fatigue: 1, serious: false, woundBonus: 0 };
  if (net < 10) return { fatigue: 2, serious: false, woundBonus: 0 };
  const step = Math.floor((net - 10) / 5);
  return { fatigue: 4 + 2 * step, serious: true, woundBonus: 2 * step };
}

// ── After-effects ───────────────────────────────────────────────────────────────────────────────────────────────

/** Bones that can break (an arm or a leg by its part). */
export type BreakArea = 'neck' | 'skull' | 'ribs' | 'spine' | 'hip' | 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg';
/** What can be cut off (sides for the limbs). */
export type CutArea = 'neck' | 'torso' | 'hand' | 'forearm' | 'elbow' | 'upperarm' | 'shoulder' | 'foot' | 'calf' | 'knee' | 'thigh' | 'hip';

/** Effects that last to the end of the victim's next active phase, each −1D6 on everything. */
export type ShortKind = 'dazed' | 'back' | 'drop' | 'fall' | 'armour' | 'grabbed';
export const SHORT_KINDS: ShortKind[] = ['dazed', 'back', 'drop', 'fall', 'armour', 'grabbed'];

/** One after-effect, resolved for a real hit (a real limb, a real number). */
export type Effect =
  | { k: ShortKind; part?: BodyPart }
  | { k: 'blinded' | 'internal' | 'eye' | 'feature' | 'genitals' }
  | { k: 'pain'; n: number }
  | { k: 'wound'; n: number; part: BodyPart }
  | { k: 'bleed'; rate: number; diff: number }
  | { k: 'infect'; level: number; diff: number }
  | { k: 'ignite'; heat: number; diff: number }
  | { k: 'break'; diff: number; area: BreakArea }
  | { k: 'cut'; diff: number; area: CutArea; side?: 'left' | 'right' }
  | { k: 'teeth'; n: number }
  | { k: 'attr'; attr: string; n: number }
  | { k: 'hands'; n: number };

/**
 * A wound table row as data: the death roll's difficulty (a number, `'R+10'` for the result plus ten, or null for
 * none) and its after-effects in a short notation, comma-separated:
 * - `dazed`, `back` (knocked back), `drop`, `fall`, `dropfall` (drop if an arm was hit, fall if a leg), `armour`,
 *   `grabbed`, `blinded`, `internal`, `eye`, `feature` (nose, ear, lip), `genitals`, `genitals?` (only if male)
 * - `pain N`, `teeth N` or `teeth 2D6`, `wound N <where>`, `bleed R/D`, `infect L/D`, `ignite H/D` (fire only)
 * - `break N <bone>`, `cut N <area>`: N may be `R` or `R-8` (the result read off the table, minus 8)
 * - `attr <Attribute id> -N` (for good), `hands -N` (−N D6 for good on what needs working hands)
 * Where: `head`, `torso`, `limb` (the part hit), `arm`/`leg` (one at random, the same one for the whole row),
 * `leftArm` …, `arms`, `legs`, `all`, `burnlimb`, `burnarms` (the burn table's own D10 tables).
 * Bones: `neck`, `skull`, `ribs`, `spine`, `hip`, `limb`, `limbhip` (the arm hit, or the hip for a leg), or a where.
 * Cut areas: `neck`, `torso`, and the arm's `hand`/`forearm`/`elbow`/`upperarm`/`shoulder` (on a leg: foot, calf,
 * knee, thigh, hip).
 */
export type WoundRowDef = [death: number | 'R+10' | null, effects: string];

/** One damage type's serious-wound tables: 20 rows each (row 20 is "20 and above"). */
export interface WoundTableDef {
  type: DamageType;
  head?: WoundRowDef[];
  torso?: WoundRowDef[];
  limb?: WoundRowDef[];
  body?: WoundRowDef[];
}

const WHERE = new Set(['head', 'torso', 'limb', 'arm', 'leg', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg', 'arms', 'legs', 'all', 'burnlimb', 'burnarms']);
const BONES = new Set(['neck', 'skull', 'ribs', 'spine', 'hip', 'limb', 'limbhip', 'arm', 'leg', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg']);
const CUTS = new Set(['neck', 'torso', 'hand', 'forearm', 'elbow', 'upperarm', 'shoulder']);
const ARM_TO_LEG: Record<string, CutArea> = { hand: 'foot', forearm: 'calf', elbow: 'knee', upperarm: 'thigh', shoulder: 'hip' };
const FLAGS = new Set(['dazed', 'back', 'drop', 'fall', 'dropfall', 'armour', 'grabbed', 'blinded', 'internal', 'eye', 'feature', 'genitals', 'genitals?']);

/** Problems with one row's notation (empty when it reads). The tables are checked by `woundTableProblems`. */
export function effectProblems(fx: string): string[] {
  const out: string[] = [];
  const num = (s: string | undefined) => s !== undefined && /^(R([+-]\d+)?|-?\d+)$/.test(s);
  for (const raw of fx.split(',')) {
    const w = raw.trim().split(/\s+/);
    const [k, a, b] = w;
    if (!k) out.push(`an empty effect in "${fx}"`);
    else if (FLAGS.has(k)) { if (w.length > 1) out.push(`"${raw.trim()}": ${k} takes nothing`); }
    else if (k === 'pain' || k === 'hands') { if (!num(a)) out.push(`"${raw.trim()}": a number`); }
    else if (k === 'teeth') { if (!/^(\d+|\d+D6)$/.test(a ?? '')) out.push(`"${raw.trim()}": teeth N or teeth ND6`); }
    else if (k === 'wound') { if (!num(a) || !WHERE.has(b ?? '')) out.push(`"${raw.trim()}": wound N <where>`); }
    else if (k === 'bleed' || k === 'infect' || k === 'ignite') { if (!/^\d+\/\d+$/.test(a ?? '')) out.push(`"${raw.trim()}": ${k} N/N`); }
    else if (k === 'break') { if (!num(a) || !BONES.has(b ?? '')) out.push(`"${raw.trim()}": break N <bone>`); }
    else if (k === 'cut') { if (!num(a) || !CUTS.has(b ?? '')) out.push(`"${raw.trim()}": cut N <area>`); }
    else if (k === 'attr') { if (!a || !num(b)) out.push(`"${raw.trim()}": attr <id> N`); }
    else out.push(`"${raw.trim()}": no effect called ${k}`);
  }
  return out;
}

/** Problems with a whole table file: 20 rows where it has rows, the parts its type reads, every row readable. */
export function woundTableProblems(t: WoundTableDef): string[] {
  const out: string[] = [];
  const parts: TablePart[] = t.type === 'fall' || t.type === 'burn' ? ['body'] : ['head', 'torso', 'limb'];
  for (const p of parts) {
    const rows = t[p];
    if (!rows) out.push(`${t.type}: no ${p} table`);
    else if (rows.length !== 20) out.push(`${t.type} ${p}: ${rows.length} rows, not 20`);
    rows?.forEach(([, fx], i) => out.push(...effectProblems(fx).map((e) => `${t.type} ${p} ${i + 1}: ${e}`)));
  }
  for (const p of ['head', 'torso', 'limb', 'body'] as TablePart[]) if (t[p] && !parts.includes(p)) out.push(`${t.type}: a ${p} table it never reads`);
  return out;
}

/** What a hit needs to turn a row's notation into real effects. */
export interface WoundContext {
  type: DamageType;
  /** The part hit (for whole-body tables, the torso). */
  part: BodyPart;
  /** The number read off the table (D10 + bonuses), for `R` in the notation and `R+10` deaths. */
  result: number;
  /** For burns: what burns. Fire ignites; rot turns ignition into infection; acid always harms armour. */
  burn?: BurnKind;
  male?: boolean;
}

export type BurnKind = 'fire' | 'acid' | 'cold' | 'lightning' | 'rot' | 'radiance';

/** The rolls a row needed (teeth, a random limb), so they can be shown. */
export interface RowRead {
  /** The row's number (1–20). */
  row: number;
  /** The death roll's difficulty, if the row has one. */
  death: number | null;
  effects: Effect[];
  rolls: Roll[];
}

/** Read a row of a table for a hit: the death difficulty and the effects, with real limbs and numbers. */
export function readWound(table: WoundTableDef, ctx: WoundContext, rng: Rng): RowRead {
  const tp = tablePartOf(ctx.type, ctx.part);
  const rows = table[tp];
  if (!rows) throw new Error(`no ${tp} table for ${ctx.type}`);
  const row = Math.max(1, Math.min(20, ctx.result));
  const [death, fx] = rows[row - 1];
  const rolls: Roll[] = [];
  const effects: Effect[] = [];
  const val = (s: string) => (s.startsWith('R') ? ctx.result + Number(s.slice(1) || 0) : Number(s));
  // One random arm and one random leg for the whole row (odd left, even right).
  let arm: BodyPart | undefined;
  let leg: BodyPart | undefined;
  const randArm = () => (arm ??= rollDie(6, rng) % 2 ? 'leftArm' : 'rightArm');
  const randLeg = () => (leg ??= rollDie(6, rng) % 2 ? 'leftLeg' : 'rightLeg');
  const where = (w: string): BodyPart[] => {
    switch (w) {
      case 'limb': return [ctx.part];
      case 'arm': return [randArm()];
      case 'leg': return [randLeg()];
      case 'arms': return ['leftArm', 'rightArm'];
      case 'legs': return ['leftLeg', 'rightLeg'];
      case 'all': return [...BODY_PARTS];
      case 'burnlimb': {
        const d = rollDie(10, rng);
        return d <= 2 ? ['leftArm'] : d <= 4 ? ['rightArm'] : d <= 6 ? ['leftLeg'] : d <= 8 ? ['rightLeg'] : d === 9 ? ['leftArm', 'rightArm'] : ['leftLeg', 'rightLeg'];
      }
      case 'burnarms': {
        const d = rollDie(10, rng);
        return d <= 4 ? ['rightArm'] : d <= 6 ? ['leftArm'] : ['leftArm', 'rightArm'];
      }
      default: return [w as BodyPart];
    }
  };
  for (const raw of fx.split(',')) {
    const [k, a, b] = raw.trim().split(/\s+/);
    if (k === 'dropfall') effects.push({ k: isLeg(ctx.part) ? 'fall' : 'drop', part: ctx.part });
    else if (k === 'drop' || k === 'armour') effects.push({ k, part: ctx.part });
    else if (k === 'dazed' || k === 'back' || k === 'fall' || k === 'grabbed') effects.push({ k });
    else if (k === 'genitals?') { if (ctx.male) effects.push({ k: 'genitals' }); }
    else if (k === 'blinded' || k === 'internal' || k === 'eye' || k === 'feature' || k === 'genitals') effects.push({ k });
    else if (k === 'pain') effects.push({ k, n: val(a) });
    else if (k === 'hands') effects.push({ k, n: -val(a) });
    else if (k === 'attr') effects.push({ k, attr: a, n: val(b) });
    else if (k === 'teeth') {
      if (a.endsWith('D6')) {
        const r = rollOpen({ n: Number(a.slice(0, -2)), mod: 0 }, rng, 'Teeth');
        rolls.push(r);
        effects.push({ k, n: r.total });
      } else effects.push({ k, n: Number(a) });
    } else if (k === 'wound') for (const p of where(b)) effects.push({ k, n: val(a), part: p });
    else if (k === 'bleed' || k === 'infect' || k === 'ignite') {
      const [x, y] = a.split('/').map(Number);
      if (k === 'bleed') effects.push({ k, rate: x, diff: y });
      else if (k === 'infect') effects.push({ k, level: x, diff: y });
      else if (ctx.type === 'burn' && ctx.burn === 'rot') effects.push({ k: 'infect', level: x, diff: y });
      else if (ctx.type !== 'burn' || ctx.burn === undefined || ctx.burn === 'fire') effects.push({ k, heat: x, diff: y });
    } else if (k === 'break') {
      // A named bone as it is; a limb word through `where` (only limb tables say `limb`, so it is an arm or a leg).
      const bones = (b === 'limbhip' ? [isLeg(ctx.part) ? 'hip' : ctx.part] : WHERE.has(b) ? where(b) : [b]) as BreakArea[];
      for (const bone of bones) effects.push({ k, diff: val(a), area: bone });
    } else if (k === 'cut') {
      if (b === 'neck' || b === 'torso') effects.push({ k, diff: val(a), area: b });
      else effects.push({ k, diff: val(a), area: isLeg(ctx.part) ? ARM_TO_LEG[b] : (b as CutArea), side: sideOf(ctx.part) });
    }
  }
  if (ctx.type === 'burn' && ctx.burn === 'acid' && !effects.some((e) => e.k === 'armour')) effects.push({ k: 'armour', part: ctx.part });
  return { row, death: death === null ? null : death === 'R+10' ? ctx.result + 10 : death, effects, rolls };
}

// ── Breaks and amputations ──────────────────────────────────────────────────────────────────────────────────────

/** What a broken bone does, and how many days it takes to mend (null: it never does by itself). */
export const BREAKS: Record<'neck' | 'skull' | 'ribs' | 'spine' | 'hip' | 'arm' | 'leg', { pain: number; days: number | null }> = {
  neck: { pain: 2, days: null }, // paralysed from the neck down
  skull: { pain: 1, days: 30 }, // −1D6 speaking, soft food
  ribs: { pain: 1, days: 30 }, // −1D6 combat and upper-body movement
  spine: { pain: 2, days: null }, // failed by 5 or more: paralysed from the waist
  hip: { pain: 2, days: 90 }, // can't walk
  arm: { pain: 1, days: 60 }, // useless
  leg: { pain: 1, days: 60 }, // useless; Förflyttning 1D6 on a crutch
};
const breakKind = (a: BreakArea) => (a === 'leftArm' || a === 'rightArm' ? 'arm' : a === 'leftLeg' || a === 'rightLeg' ? 'leg' : a);

/** What losing a part does: permanent wounds on its limb, pain, a bleed; neck or torso is death. */
export const AMPUTATIONS: Record<CutArea, { wounds: number; pain: number; bleed?: [number, number]; dead?: true }> = {
  neck: { wounds: 0, pain: 0, dead: true },
  torso: { wounds: 0, pain: 0, dead: true },
  hand: { wounds: 1, pain: 1, bleed: [1, 10] },
  forearm: { wounds: 1, pain: 1, bleed: [1, 10] },
  elbow: { wounds: 2, pain: 1, bleed: [1, 10] },
  upperarm: { wounds: 2, pain: 1, bleed: [1, 12] },
  shoulder: { wounds: 3, pain: 1, bleed: [2, 24] },
  foot: { wounds: 1, pain: 1, bleed: [1, 14] },
  calf: { wounds: 1, pain: 1, bleed: [1, 14] },
  knee: { wounds: 2, pain: 1, bleed: [1, 14] },
  thigh: { wounds: 2, pain: 1, bleed: [2, 18] },
  hip: { wounds: 3, pain: 1, bleed: [2, 28] },
};
const LEG_CUTS = new Set<CutArea>(['foot', 'calf', 'knee', 'thigh', 'hip']);

// ── A person's injuries (plain JSON, saved) ─────────────────────────────────────────────────────────────────────

/** Where fatigue came from, so a person can see it ("7 of 16 from blows taken, 2 from powerful strikes"). */
export type FatigueWhy = 'hits' | 'bleeding' | 'fire' | 'quick' | 'powerful' | 'careful' | 'counter';
export const FATIGUE_WHYS: FatigueWhy[] = ['hits', 'bleeding', 'fire', 'powerful', 'quick', 'careful', 'counter'];

/** Everything damage has done to one person. Plain JSON. */
export interface Injuries {
  /** Fatigue gained (it recovers with time: `recoverFatigue`). */
  fatigue: number;
  /** The same fatigue by where it came from (sums to `fatigue`). */
  fatigueFrom: Partial<Record<FatigueWhy, number>>;
  /** World minutes rested toward the next point of fatigue back. */
  rested: number;
  /** The floor fatigue can't go below and that counts on top (load; an infection adds its level). */
  baseFatigue: number;
  /** A shock roll is owed at the end of this phase (damage gave fatigue). */
  shockDue: boolean;
  /** Short effects (−1D6 each, to the end of their next active phase); they stack, repeats included (Q47). */
  short: ShortKind[];
  /** Blinded: −2D6 on what needs sight, for one round. */
  blinded: boolean;
  pain: number;
  /** Wounds per part (max 3; amputations are counted in, for good). */
  wounds: Partial<Record<BodyPart, number>>;
  bleed: { rate: number; diff: number } | null;
  infection: { level: number; diff: number } | null;
  ignited: { heat: number; diff: number } | null;
  /** Internal injuries (each one a D10 a day until healed). */
  internal: number;
  broken: BreakArea[];
  /** Parts lost for good. */
  lost: { area: CutArea; side?: 'left' | 'right' }[];
  /** Parts whose worn armour is torn off (until mended in a scene). */
  armourOff: BodyPart[];
  eyes: number;
  features: number;
  teeth: number;
  genitals: boolean;
  /** For-good changes to attributes (from burns), and −D6 on what needs hands. */
  attr: Record<string, number>;
  hands: number;
  out: boolean;
  /** Knocked out and bleeding, failed the death roll: one healing try left this scene. */
  dying: boolean;
  dead: boolean;
}

export const unhurt = (baseFatigue = 0): Injuries => ({
  fatigue: 0, fatigueFrom: {}, rested: 0, baseFatigue, shockDue: false, short: [], blinded: false, pain: 0, wounds: {}, bleed: null, infection: null, ignited: null,
  internal: 0, broken: [], lost: [], armourOff: [], eyes: 0, features: 0, teeth: 0, genitals: false, attr: {}, hands: 0, out: false, dying: false, dead: false,
});

/** The fatigue that counts (shock rolls are against it): this scene's, the base, and an infection's level. */
export const totalFatigue = (i: Injuries): number => i.fatigue + i.baseFatigue + (i.infection?.level ?? 0);

/** Add fatigue, remembering where it came from (changes `i`). */
export function addFatigue(i: Injuries, n: number, why: FatigueWhy): void {
  if (n <= 0) return;
  i.fatigue += n;
  i.fatigueFrom[why] = (i.fatigueFrom[why] ?? 0) + n;
}

/**
 * Time passes (Q49, the director: fatigue goes one point at a time, faster when resting; how fast is the
 * difficulty's). `perPoint` world minutes give one point back. What came last goes first: tactics before blows.
 * Someone knocked out wakes when their fatigue is all gone (reading); the dying and the dead don't.
 */
export function recoverFatigue(before: Injuries, minutes: number, perPoint: number): Injuries {
  if (before.dead || (before.fatigue <= 0 && !before.out) || minutes <= 0) return before;
  const i: Injuries = structuredClone(before);
  i.rested += minutes;
  let back = Math.floor(i.rested / perPoint);
  i.rested -= back * perPoint;
  back = Math.min(back, i.fatigue);
  i.fatigue -= back;
  for (const why of [...FATIGUE_WHYS].reverse()) {
    const take = Math.min(back, i.fatigueFrom[why] ?? 0);
    if (!take) continue;
    back -= take;
    i.fatigueFrom[why] = (i.fatigueFrom[why] ?? 0) - take;
    if (!i.fatigueFrom[why]) delete i.fatigueFrom[why];
  }
  if (i.fatigue <= 0) {
    i.rested = 0;
    if (i.out && !i.dying) { i.out = false; i.short = []; }
  }
  return i;
}

/**
 * Merge a second bleed (or fire, or infection) into the one there is: the higher of each value, then the difficulty
 * +2. With none yet, the new one as it is.
 */
export function mergeLasting(old: { a: number; diff: number } | null, add: { a: number; diff: number }): { a: number; diff: number } {
  if (!old) return { ...add };
  return { a: Math.max(old.a, add.a), diff: Math.max(old.diff, add.diff) + 2 };
}
const mergeBleed = (o: Injuries['bleed'], rate: number, diff: number) => {
  const m = mergeLasting(o && { a: o.rate, diff: o.diff }, { a: rate, diff });
  return { rate: m.a, diff: m.diff };
};
const mergeInfection = (o: Injuries['infection'], level: number, diff: number) => {
  const m = mergeLasting(o && { a: o.level, diff: o.diff }, { a: level, diff });
  return { level: m.a, diff: m.diff };
};

/** Add wounds to a part: up to 3; past that, an infection 3/20, and each one after +0/+2. */
function addWounds(i: Injuries, part: BodyPart, n: number): void {
  for (let k = 0; k < n; k++) {
    const have = i.wounds[part] ?? 0;
    if (have < 3) i.wounds[part] = have + 1;
    // The usual merge gives both halves of the rule: none yet → 3/20; already 3/20 → 3/22 (+0/+2).
    else i.infection = mergeInfection(i.infection, 3, 20);
  }
}

/** The outcome of a break or amputation risk: 3D6 (open) against its difficulty; under it, it happens. */
export interface RiskRoll {
  effect: Extract<Effect, { k: 'break' | 'cut' }>;
  roll: Roll;
  happened: boolean;
}

/** Apply effects to a person (a new record; the old one is left as it was). Break and amputation risks are rolled. */
export function applyEffects(before: Injuries, effects: Effect[], rng: Rng): { injuries: Injuries; risks: RiskRoll[] } {
  const i: Injuries = structuredClone(before);
  const risks: RiskRoll[] = [];
  for (const e of effects) {
    switch (e.k) {
      case 'dazed': case 'back': case 'drop': case 'fall': case 'grabbed': case 'armour':
        i.short.push(e.k); // negative effects stack, the same one twice too (director, Q47)
        if (e.k === 'armour' && e.part && !i.armourOff.includes(e.part)) i.armourOff.push(e.part);
        break;
      case 'blinded': i.blinded = true; break;
      case 'internal': i.internal += 1; break;
      case 'eye': i.eyes = Math.min(2, i.eyes + 1); break;
      case 'feature': i.features += 1; break;
      case 'genitals': i.genitals = true; break;
      case 'pain': i.pain += e.n; break;
      case 'teeth': i.teeth += e.n; break;
      case 'attr': i.attr[e.attr] = (i.attr[e.attr] ?? 0) + e.n; break;
      case 'hands': i.hands += e.n; break;
      case 'wound': addWounds(i, e.part, e.n); break;
      case 'bleed': i.bleed = mergeBleed(i.bleed, e.rate, e.diff); break;
      case 'infect': i.infection = mergeInfection(i.infection, e.level, e.diff); break;
      case 'ignite': {
        const m = mergeLasting(i.ignited && { a: i.ignited.heat, diff: i.ignited.diff }, { a: e.heat, diff: e.diff });
        i.ignited = { heat: m.a, diff: m.diff };
        break;
      }
      case 'break': {
        const roll = rollTest({ n: 3, mod: 0 }, e.diff, rng, 'Break risk');
        const happened = !roll.success;
        risks.push({ effect: e, roll, happened });
        if (happened && !i.broken.includes(e.area)) {
          i.broken.push(e.area);
          i.pain += BREAKS[breakKind(e.area)].pain;
        }
        break;
      }
      case 'cut': {
        const roll = rollTest({ n: 3, mod: 0 }, e.diff, rng, 'Amputation risk');
        const happened = !roll.success;
        risks.push({ effect: e, roll, happened });
        if (!happened) break;
        const a = AMPUTATIONS[e.area];
        i.lost.push({ area: e.area, ...(e.side ? { side: e.side } : {}) });
        if (a.dead) { i.dead = true; break; }
        const limb: BodyPart = LEG_CUTS.has(e.area) ? (e.side === 'left' ? 'leftLeg' : 'rightLeg') : e.side === 'left' ? 'leftArm' : 'rightArm';
        i.wounds[limb] = Math.min(3, (i.wounds[limb] ?? 0) + a.wounds);
        i.pain += a.pain;
        if (a.bleed) i.bleed = mergeBleed(i.bleed, a.bleed[0], a.bleed[1]);
        break;
      }
    }
  }
  return { injuries: i, risks };
}

// ── Penalties ───────────────────────────────────────────────────────────────────────────────────────────────────

/** What a roll is, for the injuries that weigh on it. */
export interface RollUse {
  /** The kind of skill or roll. `attr` with `attr` set for an attribute roll. */
  kind: 'combat' | 'movement' | 'mystic' | 'attr' | 'shock' | 'death' | 'other';
  attr?: string;
  /** For combat: the arm(s) the weapon is in. */
  arms?: ('left' | 'right')[];
  /** It needs sight (aiming, searching). */
  sight?: boolean;
  /** A ranged attack, and whether aimed (a lost eye's −1D6 goes away when aiming). */
  ranged?: boolean;
  aimed?: boolean;
}

const PAINED_ATTRS = new Set(['Förflyttning', 'Kroppsbyggnad', 'Reaktion', 'Vaksamhet']);

/** One reason a roll loses dice: a short effect, pain, a wounded part, broken ribs, on the ground for good, blinded, an eye lost. */
export type PenaltyWhy = ShortKind | 'pain' | BodyPart | 'ribs' | 'grounded' | 'blinded' | 'eye';

/**
 * Can't stand (the director: "I broke his leg, he stands afterwards"): a broken leg is useless, a broken hip can't
 * walk, a broken spine or neck paralyses. They fight from the ground (−1D6, as someone knocked down) and can't move.
 */
export const grounded = (i: Injuries): boolean => i.broken.some((b) => b === 'leftLeg' || b === 'rightLeg' || b === 'hip' || b === 'spine' || b === 'neck');

/** What a person's injuries take off a roll, reason by reason (dice each). */
export function penaltyParts(i: Injuries, use: RollUse): { why: PenaltyWhy; n: number }[] {
  const out: { why: PenaltyWhy; n: number }[] = [];
  const add = (why: PenaltyWhy, n: number) => { if (n > 0) { const o = out.find((x) => x.why === why); if (o) o.n += n; else out.push({ why, n }); } };
  for (const s of i.short) add(s, 1); // each short effect −1D6 on everything; they stack (Q47)
  const movementish = use.kind === 'movement' || (use.kind === 'attr' && use.attr === 'Förflyttning');
  if (use.kind === 'combat' || use.kind === 'movement' || use.kind === 'mystic' || (use.kind === 'attr' && PAINED_ATTRS.has(use.attr ?? ''))) add('pain', i.pain);
  if (use.kind === 'shock') add('head', i.wounds.head ?? 0);
  if (use.kind === 'death') add('torso', i.wounds.torso ?? 0);
  if (use.kind === 'combat') {
    const arms = (use.arms ?? ['right']).map((s) => (s === 'left' ? 'leftArm' : 'rightArm') as BodyPart);
    const worst = arms.reduce((a, b) => ((i.wounds[b] ?? 0) > (i.wounds[a] ?? 0) ? b : a));
    add(worst, i.wounds[worst] ?? 0);
    if (i.broken.includes('ribs')) add('ribs', 1);
  }
  if ((use.kind === 'combat' || use.kind === 'movement') && grounded(i)) add('grounded', 1);
  if (movementish) {
    const leg: BodyPart = (i.wounds.rightLeg ?? 0) > (i.wounds.leftLeg ?? 0) ? 'rightLeg' : 'leftLeg';
    add(leg, i.wounds[leg] ?? 0);
  }
  if (use.sight && i.blinded) add('blinded', 2);
  if (use.ranged && i.eyes > 0 && !use.aimed) add('eye', 1);
  return out;
}

/** How many D6 a person's injuries take off a roll. */
export const penaltyDice = (i: Injuries, use: RollUse): number => penaltyParts(i, use).reduce((s, p) => s + p.n, 0);

/** A pool with injuries taken off (never below 1D6 for a pool that had dice). */
export const withPenalty = (pool: Dice, i: Injuries, use: RollUse): Dice => modify(pool, -penaltyDice(i, use));

// ── A hit, start to end ─────────────────────────────────────────────────────────────────────────────────────────

/** What a landed blow brings. */
export interface HitInput {
  type: DamageType;
  /** The damage pool: weapon dice with base damage and the tactic in. */
  damage: Dice;
  /** More damage from advantages, rolled (or added) after it so it can be shown on its own. */
  extra?: Dice;
  /** Chosen with the precision edge; otherwise `locationD10` (the D10 rolled with the attack) or a fresh one. */
  part?: BodyPart;
  locationD10?: number;
  /** Armour that counts against this hit on that part: base armour plus worn armour, after piercing (≥ 0). */
  armour: number;
  /** Weapon properties: Wounding X (+X on the table), Brutal X (+X fatigue if any), Shallow (no serious wounds). */
  wounding?: number;
  brutal?: number;
  shallow?: boolean;
  burn?: BurnKind;
  /** The victim: their Livskraft pool (for the death roll), injuries so far, and sex where a row asks. */
  vitality: Dice;
  victim: Injuries;
  male?: boolean;
}

export interface HitResult {
  part: BodyPart;
  damageRoll: Roll;
  /** The extra damage: its roll if it had dice, and what it came to (0 with none). */
  extraRoll?: Roll;
  extra: number;
  /** The D10 that picks the serious wound (`woundRoll` is the same die, to show). */
  woundD10: number;
  woundRoll: Roll;
  net: number;
  fatigue: number;
  serious: (RowRead & { result: number; deathRoll?: Roll; died: boolean }) | null;
  risks: RiskRoll[];
  /** The victim after the hit (dead, or with the fatigue and after-effects on). */
  after: Injuries;
}

/**
 * Resolve a blow that landed: roll damage and the wound D10, take off armour, read the damage table, and on a serious
 * wound read the table for the type and part, make the death roll at once, then put on the after-effects. The shock
 * roll is owed at the end of the phase (`shockDue`; `endOfPhase`).
 */
export function rollHit(h: HitInput, tables: Record<DamageType, WoundTableDef>, rng: Rng): HitResult {
  const part = h.part ?? hitPart(h.locationD10 ?? rollDie(10, rng));
  const damageRoll = rollOpen(h.damage, rng, 'Damage');
  const extraRoll = h.extra && h.extra.n > 0 ? rollOpen(h.extra, rng, 'Extra damage') : undefined;
  const extra = extraRoll ? extraRoll.total : h.extra?.mod ?? 0;
  const woundRoll = rollTable(10, rng, 'Serious wound');
  const woundD10 = woundRoll.total;
  const net = damageRoll.total + extra - Math.max(0, h.armour);
  const t = damageTable(net);
  let after = structuredClone(h.victim);
  if (t.fatigue > 0) {
    addFatigue(after, t.fatigue + (h.brutal ?? 0), 'hits');
    after.shockDue = true;
  }
  let serious: HitResult['serious'] = null;
  let risks: RiskRoll[] = [];
  if (t.serious && !h.shallow) {
    const result = woundD10 + t.woundBonus + (h.wounding ?? 0);
    const read = readWound(tables[h.type], { type: h.type, part, result, burn: h.burn, male: h.male }, rng);
    let deathRoll: Roll | undefined;
    let died = false;
    if (read.death !== null) {
      deathRoll = rollTest(withPenalty(h.vitality, after, { kind: 'death' }), read.death, rng, 'Death roll');
      died = !deathRoll.success;
    }
    if (died) after.dead = true;
    else {
      const applied = applyEffects(after, read.effects, rng);
      after = applied.injuries;
      risks = applied.risks;
    }
    serious = { ...read, result, ...(deathRoll ? { deathRoll } : {}), died };
  }
  return { part, damageRoll, ...(extraRoll ? { extraRoll } : {}), extra, woundD10, woundRoll, net, fatigue: t.fatigue > 0 ? t.fatigue + (h.brutal ?? 0) : 0, serious, risks, after };
}

// ── The end of a phase, and of a scene ──────────────────────────────────────────────────────────────────────────

export interface PhaseEnd {
  injuries: Injuries;
  rolls: Roll[];
  /** What happened, for the log (plain words; the page translates). */
  notes: ('burned' | 'bled' | 'knocked out' | 'stayed up' | 'bled out' | 'bleeding stopped' | 'fire out' | 'burned to death')[];
}

/**
 * The end phase for one person: fire and bleeding add their fatigue (a shock roll), then the shock roll owed for
 * damage this phase. Knocked out while bleeding: a death roll against the bleed at once (pass: it stops; fail:
 * dying). Knocked out while burning: a death roll against the fire (1 advantage: it goes out).
 */
export function endOfPhase(before: Injuries, vitality: Dice, rng: Rng): PhaseEnd {
  const i: Injuries = structuredClone(before);
  const rolls: Roll[] = [];
  const notes: PhaseEnd['notes'] = [];
  if (i.dead) return { injuries: i, rolls, notes };
  if (i.ignited && !i.out) { addFatigue(i, i.ignited.heat, 'fire'); i.shockDue = true; notes.push('burned'); }
  if (i.bleed && !i.out) { addFatigue(i, i.bleed.rate, 'bleeding'); i.shockDue = true; notes.push('bled'); }
  if (i.shockDue && !i.out) {
    const r = rollTest(withPenalty(vitality, i, { kind: 'shock' }), totalFatigue(i), rng, 'Shock roll');
    rolls.push(r);
    if (r.success) notes.push('stayed up');
    else { i.out = true; notes.push('knocked out'); }
  }
  i.shockDue = false;
  if (i.out && i.bleed && !i.dying) {
    const r = rollTest(withPenalty(vitality, i, { kind: 'death' }), i.bleed.diff, rng, 'Death roll');
    rolls.push(r);
    if (r.success) { i.bleed = null; notes.push('bleeding stopped'); }
    else { i.dying = true; notes.push('bled out'); }
  }
  if (i.out && i.ignited) {
    const r = rollTest(withPenalty(vitality, i, { kind: 'death' }), i.ignited.diff, rng, 'Death roll');
    rolls.push(r);
    if (!r.success) { i.dead = true; notes.push('burned to death'); }
    else if ((r.advantages ?? 0) >= 1) { i.ignited = null; notes.push('fire out'); }
  }
  return { injuries: i, rolls, notes };
}

/** Short effects end after the person's next active phase. */
export const endOfActivePhase = (i: Injuries): Injuries => ({ ...i, short: [], blinded: false });

/** The scene is over: fatigue recovers, the knocked out wake. Everything lasting stays. */
export const endOfScene = (i: Injuries): Injuries => (i.dead ? i : { ...i, fatigue: 0, fatigueFrom: {}, rested: 0, shockDue: false, short: [], blinded: false, out: false });

// ── Falls and burns ─────────────────────────────────────────────────────────────────────────────────────────────

/** Fall damage dice by height in metres (2 m 2D6 … 100 m 18D6, each 50 m more +2D6; under 2 m nothing). */
export function fallDice(metres: number): number {
  const steps: [number, number][] = [[2, 2], [5, 4], [10, 6], [15, 8], [20, 10], [30, 12], [50, 14], [75, 16], [100, 18]];
  if (metres < 2) return 0;
  if (metres > 100) return 18 + 2 * Math.floor((metres - 100) / 50);
  let n = 0;
  for (const [m, d] of steps) if (metres >= m) n = d;
  return n;
}

/** What the ground adds to a fall, in D6. */
export const FALL_GROUND = { sharp: 2, hard: 1, soft: 0, verySoft: -2, deepWater: -8 } as const;
export type FallGround = keyof typeof FALL_GROUND;

/** A fall's damage pool: height, ground, and −2D6 for a Reaktion roll against 10 that held. */
export const fallPool = (metres: number, ground: FallGround, caught: boolean): Dice => ({ n: Math.max(0, fallDice(metres) + FALL_GROUND[ground] - (caught ? 2 : 0)), mod: 0 });

/** A burn's pool: the source's dice with protection (−) or weakness (+) in dice; lasting exposure +1D6 a round. */
export const burnPool = (sourceDice: number, protection: number, roundsExposed = 0): Dice => ({ n: Math.max(0, sourceDice + protection + roundsExposed), mod: 0 });

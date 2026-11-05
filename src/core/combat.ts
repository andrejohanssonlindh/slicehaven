import type { Dice } from './chargen/tables';
import { modify } from './checks';
import {
  type BodyPart, type DamageType, type HitResult, type Injuries, type PenaltyWhy, type PhaseEnd, type RollUse, type WoundTableDef,
  addFatigue, endOfPhase, grounded, hitPart, totalFatigue, penaltyParts, rollHit, withPenalty,
} from './damage';
import { type Roll, advantages, rollDie, rollOpen, rollTable, rollTest } from './dice';
import type { Rng } from './rng';

/**
 * Combat (plan B8a): a fight in rounds, pure rules. The ruleset's melee in our words is
 * `director/design/combat-rules.md` (sections 1, 2, 4); how it maps onto the live world is `combat.md`. A fight is
 * plain JSON (`Fight`): who fights on which side, where they stand in metres, what they hold, their injuries, whether
 * a melee is open and which side attacks in it, and what lies on the ground. A round is resolved from everyone's
 * choices (`resolveRound`) and comes back as a new fight and a log of what happened, with every roll, so the page can
 * show the dice and the world can play it out (walk, swing, drop a sword on the sand).
 *
 * This first slice is one against one, in melee: moving (walk 5 m, run 10 m), picking up, opening a melee
 * (Reaktion), attacking with a tactic, defending with a tactic (parry, block or dodge, whichever is best),
 * advantages spent on more damage (the edge to choose comes with B8b), retreating, the end of the phase
 * (bleeding, shock), dropping what is in a hit arm, the mercy stroke on someone knocked out. Several fighters (B8c)
 * and ranged (B8d) build on the same state. Nothing here knows the 3D world; distances are metres on the ground.
 */

// ── Distances (decided, Q45) ────────────────────────────────────────────────────────────────────────────────────

/** Melee reach: adjacent is up to 2 m. */
export const ADJACENT = 2;
/** A side action's walk, and a run (a Förflyttning roll against the ground). */
export const WALK = 5;
export const RUN = 10;
/** How far one can stoop for something lying on the ground as a side action. */
export const PICKUP_REACH = 3;

// ── What a fighter holds ────────────────────────────────────────────────────────────────────────────────────────

/** Weapon properties, by their Swedish name, with their number (1 when none): `{ Precis: 1, Snabb: 1 }`. */
export type Props = Record<string, number>;

/** "Precis 1, Snabb, Genomslag S5" → `{ Precis: 1, Snabb: 1, Genomslag: 5 }`. */
export function parseProps(props: string): Props {
  const out: Props = {};
  for (const p of props.split(/,\s*/)) {
    const name = /^[A-ZÅÄÖ][a-zåäö]+/.exec(p.trim())?.[0];
    if (!name) continue;
    const n = /(\d+)(?:–\d+)?\s*$/.exec(p)?.[1];
    out[name] = n ? Number(n) : 1;
  }
  return out;
}

/** A damage line from the equipment tables ("G+2T6+1", "G+3", "4T6+2", "–") with base damage put in; null for "–". */
export function damageDice(line: string, base: Dice): Dice | null {
  const s = line.trim();
  if (!s || s === '–' || !/^(G|\d)/.test(s)) return null;
  let n = 0, mod = 0, rest = s;
  if (rest.startsWith('G')) { n += base.n; mod += base.mod; rest = rest.slice(1); }
  for (const m of rest.matchAll(/([+-]?)(\d+)(T6)?/g)) {
    const v = Number(m[2]) * (m[1] === '-' ? -1 : 1);
    if (m[3]) n += v;
    else mod += v;
  }
  return { n, mod };
}

/** A bonus written "+2", "+1T6", "±0" (a shield's) as dice. */
export function bonusDice(s: string): Dice {
  const m = /([+-]?)(\d+)(T6)?/.exec(s);
  if (!m) return { n: 0, mod: 0 };
  const v = Number(m[2]) * (m[1] === '-' ? -1 : 1);
  return m[3] ? { n: v, mod: 0 } : { n: 0, mod: v };
}

/** The mean of an open pool, near enough to compare two pools. */
export const poolMean = (d: Dice): number => d.n * 4.2 + d.mod;

/** A weapon in hand, as the fight needs it: plain data built from its row (`weaponFromRow`) or a thing's kind. */
export interface WeaponStats {
  /** The row or kind it came from (shown, translated by the page). */
  name: string;
  /** The combat skill it is used with. */
  skill: string;
  /** Damage by type, base damage included. */
  damage: Partial<Record<DamageType, Dice>>;
  /** Held in both hands (a greatsword, a stool); otherwise in the right. */
  hands: 1 | 2;
  props: Props;
  /** Dice off attack and parry for too little Physique to wield it (0 if strong enough). */
  weak: number;
  /** The fists: no weapon at all. */
  unarmed?: boolean;
}

export interface ShieldStats {
  name: string;
  /** The melee bonus on a block. */
  melee: Dice;
  props: Props;
}

/** A shield's stats from its row in the shield table (its block bonus "+1T6", its properties). */
export const shieldFromRow = (row: { sv: string; melee: string; props: string }): ShieldStats => ({ name: row.sv, melee: bonusDice(row.melee), props: parseProps(row.props) });

/** The parts of an equipment row the fight reads (`content/chargen/equipment.ts`). */
export interface WeaponRow {
  sv: string;
  skill: string;
  h1: string;
  h2: string;
  melee?: { hugg: string; kross: string; stick: string };
  props: string;
}

/** Physique needed ("2T6", "0", "–") against Physique dice: the dice short (0 if strong enough), or null if it can't be held so. */
export function physiqueShort(need: string, physique: Dice): number | null {
  if (need === '–') return null;
  const req = need === '0' ? 0 : Number(/(\d+)T6/.exec(need)?.[1] ?? 0);
  return Math.max(0, req - physique.n);
}

/**
 * A weapon row in a fighter's hands: damage with their base damage, one hand if they are strong enough for it, else
 * two (with Double grip's +2), and the dice short if they aren't strong enough even so.
 */
export function weaponFromRow(row: WeaponRow, base: Dice, physique: Dice): WeaponStats {
  const props = parseProps(row.props);
  const one = physiqueShort(row.h1, physique);
  const two = physiqueShort(row.h2, physique);
  const hands: 1 | 2 = one === 0 || two === null ? 1 : 2;
  const weak = (hands === 1 ? one : two) ?? 0;
  const damage: WeaponStats['damage'] = {};
  const lines: [DamageType, string | undefined][] = [['cut', row.melee?.hugg], ['crush', row.melee?.kross], ['thrust', row.melee?.stick]];
  for (const [type, line] of lines) {
    const d = line && damageDice(line, base);
    if (d) damage[type] = hands === 2 && props.Dubbelfattning ? { n: d.n, mod: d.mod + 2 } : d;
  }
  return { name: row.sv, skill: row.skill, damage, hands, props, weak };
}

/** Bare hands: brawling (`Slagsmål`), base damage as crush, the brawl wound table. */
export const fists = (base: Dice): WeaponStats => ({ name: 'fists', skill: 'Slagsmål', damage: { brawl: { ...base } }, hands: 1, props: {}, weak: 0, unarmed: true });

/** The weapon's best damage type (the highest pool), and its dice. */
export function bestDamage(w: WeaponStats): { type: DamageType; dice: Dice } {
  let best: { type: DamageType; dice: Dice } | null = null;
  for (const [type, dice] of Object.entries(w.damage) as [DamageType, Dice][]) if (!best || poolMean(dice) > poolMean(best.dice)) best = { type, dice };
  return best ?? { type: 'brawl', dice: { n: 1, mod: 0 } };
}

// ── The fight ───────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Something held in a fight (or lying on the ground): its id is the world's thing id, so it can be drawn. A weapon is
 * its row: what it does is worked out for whoever holds it (their base damage, whether they are strong enough).
 */
export interface FightItem {
  id: string;
  weapon?: WeaponRow;
  shield?: ShieldStats;
}

export interface Fighter {
  id: string;
  /** Which side they fight on (0 the hero's). */
  side: number;
  x: number;
  z: number;
  /** The pools they roll: combat skills, `Undvika`, `Sköld`, and `attr:Reaktion`, `attr:Livskraft`, `attr:Förflyttning`. */
  pools: Record<string, Dice>;
  /** Physique, for the weapons they can wield (and how). */
  physique: Dice;
  baseDamage: Dice;
  baseArmour: number;
  /** Worn armour against each type (one suit for the whole body until armour pieces come). */
  armour: { cut: number; crush: number; thrust: number };
  /** Dice off dodging (and running) for the load of what they wear. */
  loadDice: number;
  /** In the right hand (or both, for a two-handed one); null: bare hands. */
  weapon: FightItem | null;
  /** In the left hand. */
  shield: FightItem | null;
  /** Carried on them, not in hand (at the belt, on the back): drawn as the side action. */
  belt?: FightItem[];
  injuries: Injuries;
  /** Picked something up this round: −1D6 on their next attack or defence unless it is quick to draw. */
  drew: boolean;
  /** Left the fight (fled far enough). */
  gone?: boolean;
}

export interface Fight {
  round: number;
  fighters: Fighter[];
  /** The melee, if one is open: which side attacks in it this round, and the round it opened. */
  melee: { attacker: number; opened: number } | null;
  /** What lies on the ground (dropped weapons), where. */
  ground: (FightItem & { x: number; z: number })[];
  /** The side that won, once only one side can still fight (null: none yet). */
  winner: number | null;
  /** Who yielded and was spared (their plea granted): no killing stroke for them. */
  spared?: string;
  /** The round stopped when blades crossed, for the roles' choices; the next `resolveRound` finishes it. */
  midRound?: boolean;
  /** Someone has offered to yield (a beaten fighter nobody steers): the other side may accept or fight on. */
  offer?: string;
  /** Offers to yield already refused, by who offered (they don't ask again until worse off). */
  refused?: Record<string, number>;
  /**
   * The side with the upper hand this round (`seizeInitiative`): the others declare what they mean to do first, and
   * this side chooses knowing it (the director: "if I get the upper hand I should know what the ones below me will
   * attempt"). In a melee it is the attacking side; free, a Reaktion roll. Their side actions go first. Unset: both
   * choose blind (nobody near enough for it to matter).
   */
  upper?: number;
}

export type AttackTactic = 'standard' | 'quick' | 'powerful';
export type DefenceTactic = 'standard' | 'defensive' | 'counter';

/** What one fighter does this round. Anything left out is the default (stand, standard tactics). */
export interface Choice {
  /** The side action: walk or run towards a spot, or pick something up. */
  move?: { x: number; z: number; run?: boolean };
  pickUp?: string;
  /** Draw something they carry (`Fighter.belt`), as the side action: −1D6 on the next attack or defence, as picking up. */
  draw?: string;
  /** The main action, as the attacker in a melee: attack with a tactic, retreat, or (on someone knocked out) the mercy stroke. */
  attack?: AttackTactic;
  retreat?: boolean;
  /** As the defender. */
  defend?: DefenceTactic;
  /**
   * How to defend (plan B8g): parry, block (with a shield) or dodge (never a counter). Left out, or not possible, the
   * best of them is used (anyone nobody steers defends that way).
   */
  defendWith?: Exclude<Defence, 'none'>;
  /** Strike someone knocked out (no defence; armour doesn't help against cut and thrust). */
  mercy?: string;
  /**
   * Beg to yield, as the round's main action (a defender still defends): a roll with the pool given (the best of
   * `PLEA_SKILLS`) against the foe's `pleaDifficulty`. Granted, the fight ends and the foe has won, sparing them.
   */
  plead?: { dice: Dice; difficulty: number };
}

/** The rules a fight is played by that come from content: the wound tables, the ground's difficulty to run on. */
export interface FightRules {
  tables: Record<DamageType, WoundTableDef>;
  /** Förflyttning difficulty for running (road 6, grass 10, bog 14; +2 at night without dark-sight). */
  ground: number;
}

/** One line of what happened, with its rolls. Plain words for the page to put in its own (`t()`). */
export type LogLine =
  | { k: 'move'; who: string; to: { x: number; z: number }; ran?: boolean; roll?: Roll }
  | { k: 'pickUp'; who: string; item: string }
  | { k: 'draw'; who: string; item: string }
  | { k: 'open'; attacker: number; rolls: Roll[] }
  /** Who has the upper hand this round, and the Reaktion rolls that decided it (none in a melee: the attacker has it). */
  | { k: 'initiative'; upper: number; rolls: Roll[]; ids: string[] }
  | {
    k: 'attack'; who: string; target: string; tactic: AttackTactic; defence: DefenceTactic; how: Defence;
    attack: Roll; attackWhy: PoolWhy; defend: Roll | null; defendWhy?: PoolWhy; hit: boolean; advantages: number;
    /** On a hit: the D10 for where, the part, the type, the damage pool's parts (weapon, tactic dice, extra, armour), and the result. */
    whereRoll?: Roll; part?: BodyPart; result?: HitResult; type?: DamageType;
    damage?: { weapon: Dice; tactic: number; extra: Dice; armour: number };
  }
  | { k: 'drop'; who: string; item: string; at: { x: number; z: number } }
  | { k: 'retreat'; who: string; to: { x: number; z: number } }
  | { k: 'roles'; attacker: number }
  | { k: 'end'; who: string; end: PhaseEnd }
  | { k: 'mercy'; who: string; target: string }
  | { k: 'plead'; who: string; roll: Roll; granted: boolean }
  | { k: 'over'; winner: number };

export type Defence = 'parry' | 'block' | 'dodge' | 'none';

export interface RoundResult {
  fight: Fight;
  log: LogLine[];
}

/** Start a fight; nobody is in a melee yet (it opens when two foes stand within reach). */
export function startFight(fighters: Fighter[]): Fight {
  return { round: 1, fighters: structuredClone(fighters), melee: null, ground: [], winner: null };
}

const dist = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);

/** Still able to act: not knocked out, dying, dead or gone. */
export const canAct = (f: Fighter): boolean => !f.injuries.out && !f.injuries.dead && !f.injuries.dying && !f.gone;

/** Their foes still in the fight (the dead and the gone left out). */
export const foesOf = (fight: Fight, f: Fighter) => fight.fighters.filter((o) => o.side !== f.side && !o.gone && !o.injuries.dead);

/** The nearest foe who can still act (the one a lone fighter faces). */
export function nearestFoe(fight: Fight, f: Fighter): Fighter | null {
  let best: Fighter | null = null;
  for (const o of foesOf(fight, f)) if (canAct(o) && (!best || dist(f, o) < dist(f, best))) best = o;
  return best;
}

/** What a fighter attacks or parries with: the weapon in hand, or fists. */
export const weaponOf = (f: Fighter): WeaponStats => (f.weapon?.weapon ? weaponFromRow(f.weapon.weapon, f.baseDamage, f.physique) : fists(f.baseDamage));

/** A skill nobody has trained: every combat skill starts at 2D6 (Q48, the director). */
export const UNTRAINED: Dice = { n: 2, mod: 0 };

/** A pool from a fighter's sheet; with no value at all, the untrained 2D6. */
function pool(f: Fighter, id: string): Dice {
  const d = f.pools[id];
  return d && (d.n > 0 || d.mod > 0) ? d : UNTRAINED;
}

/** Would this weapon take both of their hands (too heavy for one, or made for two)? Then no shield beside it. */
const twoHanded = (f: Fighter, row: WeaponRow): boolean => weaponFromRow(row, f.baseDamage, f.physique).hands === 2;

/** Which arm(s) a weapon is in, for the wounds that weigh on it. */
const armsOf = (w: WeaponStats): ('left' | 'right')[] => (w.hands === 2 ? ['left', 'right'] : ['right']);

/** Change a pool by whole dice (may go below 1D6 to nothing only if it had none). */
const plus = (d: Dice, n: number): Dice => (n === 0 ? d : modify(d, n));

/** Why a change of dice: a tactic, the weapon, picking up, armour's load, or an injury (`PenaltyWhy`). */
export type ModWhy = 'quick' | 'powerful' | 'careful' | 'counter' | 'weak' | 'drew' | 'flexible' | 'fists' | 'weakWeapon' | 'load' | 'shield' | PenaltyWhy;

/** A pool and where it came from: the skill (and its dice, or untrained), then every change in whole dice. */
export interface PoolWhy {
  skill: string;
  base: Dice;
  untrained: boolean;
  /** Dice added (+) or taken (−), for a reason each; a shield's bonus as `shield` with its dice. */
  mods: { why: ModWhy; n: number; dice?: Dice }[];
  dice: Dice;
}

function poolWhy(f: Fighter, skill: string, mods: PoolWhy['mods'], use: RollUse, add: Dice | null = null): PoolWhy {
  const own = f.pools[skill];
  const untrained = !(own && (own.n > 0 || own.mod > 0));
  const base = pool(f, skill);
  const all = mods.filter((m) => m.n);
  if (add) all.unshift({ why: 'shield', n: add.n, dice: add });
  for (const p of penaltyParts(f.injuries, use)) all.push({ why: p.why, n: -p.n });
  const start = add ? { n: base.n + add.n, mod: base.mod + add.mod } : base;
  const change = all.filter((m) => m.why !== 'shield').reduce((s, m) => s + m.n, 0);
  return { skill, base, untrained, mods: all, dice: plus(start, change) };
}

/** The attack pool and why: the weapon's skill, the tactic, too little Physique, picking up this round, injuries. */
export function attackWhy(f: Fighter, tactic: AttackTactic): PoolWhy {
  const w = weaponOf(f);
  return poolWhy(f, w.skill, [
    { why: tactic === 'powerful' ? 'powerful' : 'quick', n: tactic === 'quick' ? 1 : tactic === 'powerful' ? -1 : 0 },
    { why: 'weak', n: -w.weak },
    { why: 'drew', n: f.drew && !w.props.Snabbdragen ? -1 : 0 },
  ], { kind: 'combat', arms: armsOf(w) });
}

export const attackPool = (f: Fighter, tactic: AttackTactic): Dice => attackWhy(f, tactic).dice;

/**
 * Every way someone can defend against this attacker with this tactic, and its pool: parry with the weapon (fists at
 * −2D6 against a weapon; a Weak weapon −1D6), block with a shield (its melee bonus), or dodge (Undvika, less the load
 * of what they wear; never a counter). A Flexible weapon takes 1D6 off a parry or a block.
 */
export function defenceOptions(f: Fighter, against: WeaponStats, tactic: DefenceTactic): { how: Exclude<Defence, 'none'>; dice: Dice; why: PoolWhy }[] {
  const tac = { why: (tactic === 'counter' ? 'counter' : 'careful') as ModWhy, n: tactic === 'defensive' ? 1 : tactic === 'counter' ? -1 : 0 };
  const flexible = { why: 'flexible' as ModWhy, n: against.props.Böjlig ? -1 : 0 };
  const drew = { why: 'drew' as ModWhy, n: f.drew ? -1 : 0 };
  const w = weaponOf(f);
  const options: { how: Exclude<Defence, 'none'>; why: PoolWhy }[] = [];
  options.push({ how: 'parry', why: poolWhy(f, w.skill, [tac, { why: 'weak', n: -w.weak }, flexible, drew,
    { why: 'fists', n: w.unarmed && !against.unarmed ? -2 : 0 }, { why: 'weakWeapon', n: w.props.Svag && !against.unarmed ? -1 : 0 }], { kind: 'combat', arms: armsOf(w) }) });
  if (f.shield?.shield) options.push({ how: 'block', why: poolWhy(f, 'Sköld', [tac, flexible, drew], { kind: 'combat', arms: ['left'] }, f.shield.shield.melee) });
  if (tactic !== 'counter') options.push({ how: 'dodge', why: poolWhy(f, 'Undvika', [tac, { why: 'load', n: -f.loadDice }, drew], { kind: 'movement' }) });
  return options.map((o) => ({ how: o.how, dice: o.why.dice, why: o.why }));
}

/** How someone defends against this attacker: the way they chose, if they can, else the best (by its average). */
export function defencePool(f: Fighter, against: WeaponStats, tactic: DefenceTactic, chosen?: Defence): { how: Defence; dice: Dice; why: PoolWhy } {
  const options = defenceOptions(f, against, tactic);
  return options.find((o) => o.how === chosen) ?? options.reduce((a, b) => (poolMean(b.dice) > poolMean(a.dice) ? b : a));
}

/** Tactic fatigue (never a shock roll): quick +1 (none with a Quick weapon), powerful +2; defensive or counter +1. */
export function tacticFatigue(attack: AttackTactic | null, defence: DefenceTactic | null, w: WeaponStats): number {
  let n = 0;
  if (attack === 'quick' && !w.props.Snabb) n += 1;
  if (attack === 'powerful') n += 2;
  if (defence === 'defensive' || defence === 'counter') n += 1;
  return n;
}

/** The tactics a fighter may take with what they hold (an Unwieldy weapon can't strike quick). */
export const attackTactics = (f: Fighter): AttackTactic[] => (weaponOf(f).props.Otymplig ? ['standard', 'powerful'] : ['standard', 'quick', 'powerful']);

/** Worn armour on a part against a type, unless torn off there; base armour always. Brawl counts as crush. */
function armourAgainst(f: Fighter, part: BodyPart, type: DamageType, piercing: number): number {
  const worn = f.injuries.armourOff.includes(part) ? 0 : type === 'cut' ? f.armour.cut : type === 'thrust' ? f.armour.thrust : type === 'crush' || type === 'brawl' ? f.armour.crush : 0;
  return Math.max(0, f.baseArmour + worn - piercing);
}

/** Does the damage come in the weapon's type? Piercing X only against its own type ("Genomslag S5" pierces thrust). */
function piercingOf(w: WeaponStats, type: DamageType, target: Fighter): number {
  let p = 0;
  if (w.props.Genomslag && type === 'thrust') p += w.props.Genomslag;
  const unarmoured = target.armour.cut + target.armour.crush + target.armour.thrust === 0;
  if (w.props.Skärande && unarmoured && (type === 'cut' || type === 'thrust')) p += w.props.Skärande;
  return p;
}

/** Where dropped things land: 1–3 m off, in a direction the dice say. */
function dropSpot(f: Fighter, rng: Rng): { x: number; z: number } {
  const a = (rollDie(12, rng) / 12) * Math.PI * 2;
  const r = 1 + (rollDie(6, rng) - 1) * 0.4;
  return { x: f.x + Math.cos(a) * r, z: f.z + Math.sin(a) * r };
}

/**
 * After a hit with *drops*: what is in the hit arm falls (the weapon from the right, the shield from the left); a
 * head or torso hit drops everything. A two-handed grip and a Secure item stay (Q47: a dropped weapon really lies on
 * the ground until someone picks it up).
 */
export function dropFrom(fight: Fight, f: Fighter, parts: (BodyPart | undefined)[], rng: Rng, log: LogLine[]): void {
  const all = parts.some((p) => p === undefined || p === 'head' || p === 'torso');
  const slots: ('weapon' | 'shield')[] = [];
  if (all || parts.includes('rightArm')) slots.push('weapon');
  if (all || parts.includes('leftArm')) slots.push('shield');
  for (const slot of slots) {
    const item = f[slot];
    if (!item) continue;
    const w = item.weapon ? weaponFromRow(item.weapon, f.baseDamage, f.physique) : null;
    const props = w?.props ?? item.shield?.props ?? {};
    if (props.Säker || w?.hands === 2) continue;
    const at = dropSpot(f, rng);
    fight.ground.push({ ...item, ...at });
    f[slot] = null;
    log.push({ k: 'drop', who: f.id, item: item.id, at });
  }
}

/** How close a move brings you to a foe at most (inside reach, not on top of them). */
const STOP = ADJACENT * 0.75;

/** Walk (or run) towards a spot, as far as the side action goes; a failed run is a walk. */
function moveTowards(fight: Fight, f: Fighter, to: { x: number; z: number }, run: boolean, rules: FightRules, rng: Rng, log: LogLine[]): void {
  if (f.injuries.short.includes('fall') || grounded(f.injuries)) return; // down: can't move until up; a broken leg: not at all
  let roll: Roll | undefined;
  let reach = WALK;
  if (run) {
    const d = withPenalty(plus(pool(f, 'attr:Förflyttning'), -f.loadDice), f.injuries, { kind: 'attr', attr: 'Förflyttning' });
    roll = rollTest(d, rules.ground, rng, 'Run');
    if (roll.success) reach = RUN;
  }
  const d = dist(f, to);
  const k = d <= reach ? 1 : reach / d;
  // Nobody walks through a foe (the director: both closing in, they passed each other): the move stops where it
  // first comes within arm's reach of anyone on the other side who can still fight.
  const dx = (to.x - f.x) * k, dz = (to.z - f.z) * k;
  let s = 1;
  const len2 = dx * dx + dz * dz;
  if (len2 > 1e-9) {
    for (const o of fight.fighters) {
      if (o.side === f.side || !canAct(o)) continue;
      const ox = f.x - o.x, oz = f.z - o.z;
      // Already within reach: no step nearer them (stepping away is fine).
      if (dist(f, o) <= STOP) {
        if (ox * dx + oz * dz < 0) s = 0;
        continue;
      }
      // |f + s·(dx,dz) − o|² = STOP²: the first s it is met.
      const b = 2 * (ox * dx + oz * dz), c = ox * ox + oz * oz - STOP * STOP;
      const disc = b * b - 4 * len2 * c;
      if (disc < 0) continue;
      const hit = (-b - Math.sqrt(disc)) / (2 * len2);
      if (hit >= 0 && hit < s) s = hit;
    }
  }
  f.x += dx * s;
  f.z += dz * s;
  log.push({ k: 'move', who: f.id, to: { x: f.x, z: f.z }, ...(run ? { ran: !!roll?.success } : {}), ...(roll ? { roll } : {}) });
}

/** A Reaktion roll to open a melee (Reach X: +X D6). */
function reactionRoll(f: Fighter, rng: Rng): Roll {
  const reach = weaponOf(f).props.Räckvidd ?? 0;
  const d = withPenalty(plus(pool(f, 'attr:Reaktion'), reach), f.injuries, { kind: 'attr', attr: 'Reaktion' });
  return rollOpen(d, rng, 'Reaktion');
}

/** Which of two Reaktion rolls is higher (1: the first, −1: the second); a tie goes to the better Reaktion, then a coin (p. 83). */
function higher(a: Fighter, b: Fighter, ra: Roll, rb: Roll, rng: Rng): number {
  const d = ra.total === rb.total ? poolMean(pool(a, 'attr:Reaktion')) - poolMean(pool(b, 'attr:Reaktion')) : ra.total - rb.total;
  return d !== 0 ? Math.sign(d) : rollDie(2, rng) === 1 ? 1 : -1;
}

/** How near a foe must be, free, for who goes first to matter (a run and a reach): further off, both choose blind. */
export const INITIATIVE_RANGE = RUN + ADJACENT;

/**
 * Who has the upper hand this round, before anyone chooses (the director: choices are declared in reverse order, so
 * whoever is ahead knows what those behind mean to do). In a melee the attacking side has it (they have the fight in
 * hand); free, the nearest two foes roll Reaktion if they are near enough for it to matter, and that roll also
 * decides the roles if blades cross this round. Sets `Fight.upper`.
 */
export function seizeInitiative(before: Fight, rng: Rng): RoundResult {
  const fight: Fight = structuredClone(before);
  const log: LogLine[] = [];
  if (fight.winner !== null || fight.upper !== undefined) return { fight, log };
  if (fight.melee) {
    fight.upper = fight.melee.attacker;
    return { fight, log };
  }
  const able = fight.fighters.filter(canAct);
  const pair = able
    .flatMap((a) => able.filter((b) => b.side > a.side && dist(a, b) <= INITIATIVE_RANGE).map((b) => [a, b] as const))
    .sort((p, q) => dist(...p) - dist(...q))[0];
  if (!pair) return { fight, log };
  const rolls = pair.map((f) => reactionRoll(f, rng));
  fight.upper = (higher(pair[0], pair[1], rolls[0], rolls[1], rng) > 0 ? pair[0] : pair[1]).side;
  log.push({ k: 'initiative', upper: fight.upper, rolls, ids: pair.map((f) => f.id) });
  return { fight, log };
}

/** More damage for advantages: +2 each (each +4 a die), or +1D6 each with a Dangerous weapon. */
export function moreDamage(adv: number, dangerous: boolean): Dice {
  if (dangerous) return { n: adv, mod: 0 };
  return { n: Math.floor((2 * adv) / 4), mod: (2 * adv) % 4 };
}

/** One blow, attack against defence, and the damage if it lands. */
function strike(fight: Fight, a: Fighter, d: Fighter, tactic: AttackTactic, defence: DefenceTactic, rules: FightRules, rng: Rng, log: LogLine[], defendWith?: Defence): { hit: boolean; margin: number } {
  const w = weaponOf(a);
  const atkWhy = attackWhy(a, tactic);
  const atk = rollOpen(atkWhy.dice, rng, 'Attack');
  const whereRoll = rollTable(10, rng, 'Where');
  const dp = defencePool(d, w, defence, defendWith);
  const def = canAct(d) ? rollOpen(dp.dice, rng, 'Defence') : null;
  const defTotal = def?.total ?? 0;
  const hit = atk.total >= defTotal; // a tie goes to the attacker
  const margin = atk.total - defTotal;
  const adv = hit ? advantages(margin) : 0;
  const line: Extract<LogLine, { k: 'attack' }> = {
    k: 'attack', who: a.id, target: d.id, tactic, defence, how: def ? dp.how : 'none', attack: atk, attackWhy: atkWhy, defend: def,
    ...(def ? { defendWhy: dp.why } : {}), hit, advantages: adv,
  };
  if (hit) {
    const { type, dice } = bestDamage(w);
    const tacticDice = tactic === 'quick' ? -1 : tactic === 'powerful' ? 2 + (w.props.Kraftfull ? 1 : 0) : 0;
    // Every advantage buys more damage for now: +2 each, +1D6 each with a Dangerous weapon (choosing edges is B8b).
    // Every +4 is a die (the director: 2 advantages are +1D6, 5 are +2D6+2), as pools are always written.
    const extra = moreDamage(adv, !!w.props.Vådlig);
    const damage = { n: Math.max(0, dice.n + tacticDice), mod: dice.mod };
    const part = hitPart(whereRoll.total);
    const armour = armourAgainst(d, part, type, piercingOf(w, type, d));
    const result = rollHit({
      type: w.unarmed ? 'brawl' : type, damage, extra, part, armour,
      wounding: w.props.Sargande, brutal: w.props.Brutal, shallow: !!w.props.Ytlig, vitality: pool(d, 'attr:Livskraft'), victim: d.injuries,
    }, rules.tables, rng);
    d.injuries = result.after;
    Object.assign(line, { part, result, type, whereRoll, damage: { weapon: dice, tactic: tacticDice, extra, armour } });
    log.push(line);
    // Someone killed lets go of everything; a wound that says *drops* lets go of what is in the arm hit.
    if (result.after.dead) dropFrom(fight, d, [undefined], rng, log);
    else {
      const drops = (result.serious?.effects ?? []).filter((e) => e.k === 'drop');
      if (drops.length) dropFrom(fight, d, drops.map((e) => ('part' in e ? e.part : undefined)), rng, log);
      // A broken arm is useless: what it held falls.
      const arms = result.risks.flatMap((r) => (r.happened && r.effect.k === 'break' && (r.effect.area === 'leftArm' || r.effect.area === 'rightArm') ? [r.effect.area] : []));
      if (arms.length) dropFrom(fight, d, arms, rng, log);
    }
  } else log.push(line);
  return { hit, margin };
}

/** Who attacks next round, after the defender's tactic and the result (p. 89). */
function swaps(defence: DefenceTactic, hit: boolean, margin: number): boolean {
  if (defence === 'counter') return true;
  if (defence === 'defensive') return !hit && -margin >= 10;
  return !hit;
}

/** The side that has won: the only one with anyone left who can act. */
function winnerOf(fight: Fight): number | null {
  const sides = new Set(fight.fighters.filter(canAct).map((f) => f.side));
  return sides.size === 1 ? [...sides][0] : sides.size === 0 ? -1 : null;
}

/**
 * Play one round from everyone's choices (by fighter id). Side actions first (moving, picking up), then a melee opens
 * if two foes stand within reach (Reaktion, the higher attacks), then the attacker's main action (an attack against
 * the defender's tactic, or a retreat), then the end of the phase for everyone (bleeding, the shock roll), and short
 * effects from before this phase wear off. Returns the new fight and the log.
 */
export function resolveRound(before: Fight, choices: Record<string, Choice>, rules: FightRules, rng: Rng, opts: { pauseOnOpen?: boolean } = {}): RoundResult {
  const fight: Fight = structuredClone(before);
  const log: LogLine[] = [];
  const shortBefore = new Map(fight.fighters.map((f) => [f.id, f.injuries.short.length]));
  const inMelee = (f: Fighter) => !!fight.melee && canAct(f);
  // The second half of a round that paused when blades crossed: side actions and the opening are done.
  const resumed = !!fight.midRound;
  delete fight.midRound;
  if (!resumed) for (const f of fight.fighters) f.drew = false;

  // Side actions: pick up (also in a melee), move (only when free). The side with the upper hand goes first (the
  // book's order by Reaktion: they reach the sword on the sand first).
  const order = fight.upper === undefined ? fight.fighters : [...fight.fighters].sort((a, b) => Number(b.side === fight.upper) - Number(a.side === fight.upper));
  for (const f of resumed ? [] : order) {
    if (!canAct(f)) continue;
    const c = choices[f.id] ?? {};
    if (c.pickUp) {
      const i = fight.ground.findIndex((g) => g.id === c.pickUp && dist(g, f) <= PICKUP_REACH);
      const item = fight.ground[i];
      const slot = item?.shield ? 'shield' : 'weapon';
      if (item && !f[slot] && !(slot === 'shield' && weaponOf(f).hands === 2) && !(slot === 'weapon' && f.shield && item.weapon && twoHanded(f, item.weapon))) {
        fight.ground.splice(i, 1);
        f[slot] = { id: item.id, ...(item.weapon ? { weapon: item.weapon } : {}), ...(item.shield ? { shield: item.shield } : {}) };
        f.drew = true;
        log.push({ k: 'pickUp', who: f.id, item: item.id });
      }
    } else if (c.draw) {
      const i = (f.belt ?? []).findIndex((b) => b.id === c.draw);
      const item = f.belt?.[i];
      const slot = item?.shield ? 'shield' : 'weapon';
      if (item && !f[slot] && !(slot === 'shield' && weaponOf(f).hands === 2) && !(slot === 'weapon' && f.shield && item.weapon && twoHanded(f, item.weapon))) {
        f.belt!.splice(i, 1);
        f[slot] = item;
        f.drew = true;
        log.push({ k: 'draw', who: f.id, item: item.id });
      }
    } else if (c.move && !inMelee(f)) moveTowards(fight, f, c.move, !!c.move.run, rules, rng, log);
  }

  // A melee opens when two foes who can act stand within reach.
  if (!fight.melee) {
    const able = fight.fighters.filter(canAct);
    const pair = able.flatMap((a) => able.filter((b) => b.side > a.side && dist(a, b) <= ADJACENT).map((b) => [a, b] as const))[0];
    if (pair) {
      // Whoever won this round's Reaktion roll already (`seizeInitiative`) has the upper hand as blades cross.
      const won = pair.find((f) => f.side === fight.upper);
      const rolls = won ? [] : pair.map((f) => reactionRoll(f, rng));
      const first = won ? (won === pair[0] ? 1 : -1) : higher(pair[0], pair[1], rolls[0], rolls[1], rng);
      fight.melee = { attacker: (first > 0 ? pair[0] : pair[1]).side, opened: fight.round };
      fight.upper = fight.melee.attacker;
      log.push({ k: 'open', attacker: fight.melee.attacker, rolls });
      // Now each side knows its role: the page may stop here to let the player choose a tactic (the director: "my
      // first move, I cannot choose what type of strike"); the round goes on from here when called again.
      if (opts.pauseOnOpen) {
        fight.midRound = true;
        return { fight, log };
      }
    }
  }

  // A plea to yield (the director: a way to give up): the pleader's main action. Granted, the fight is over, the foe
  // the winner, and no blow falls this round; refused, a defender still defends, an attacker has lost their blow.
  for (const f of fight.fighters) {
    const p = choices[f.id]?.plead;
    if (!p || !canAct(f) || fight.winner !== null) continue;
    const roll = rollTest(p.dice, p.difficulty, rng, 'Plea');
    log.push({ k: 'plead', who: f.id, roll, granted: !!roll.success });
    const foe = nearestFoe(fight, f);
    if (roll.success && foe) yieldTo(fight, f, foe.side, rng, log);
  }

  // The main action: the attacking side strikes (or retreats); someone knocked out can be given the mercy stroke.
  let nextAttacker: number | null = fight.melee?.attacker ?? null;
  for (const a of fight.fighters) {
    if (!canAct(a) || fight.spared) continue;
    const c = choices[a.id] ?? {};
    if (c.plead) continue;
    if (c.mercy) {
      const v = fight.fighters.find((f) => f.id === c.mercy);
      // The mercy stroke (p. 101): someone knocked out can't defend, and it is given to kill (reading: it does).
      if (v && !v.injuries.dead && (v.injuries.out || v.injuries.dying) && dist(a, v) <= ADJACENT + 0.5) {
        v.injuries = { ...v.injuries, dead: true };
        log.push({ k: 'mercy', who: a.id, target: v.id });
      }
      continue;
    }
    if (!fight.melee || a.side !== fight.melee.attacker) continue;
    const d = nearestFoe(fight, a);
    if (!d || dist(a, d) > ADJACENT + 0.5) continue;
    if (c.retreat && fight.melee.opened !== fight.round && !a.injuries.short.includes('fall') && !grounded(a.injuries)) {
      const away = dist(a, d) || 1;
      a.x += ((a.x - d.x) / away) * WALK;
      a.z += ((a.z - d.z) / away) * WALK;
      fight.melee = null;
      nextAttacker = null;
      log.push({ k: 'retreat', who: a.id, to: { x: a.x, z: a.z } });
      break;
    }
    const tactic = c.attack && attackTactics(a).includes(c.attack) ? c.attack : 'standard';
    const defence = (choices[d.id] ?? {}).defend ?? 'standard';
    const dTactic: DefenceTactic = canAct(d) ? defence : 'standard';
    const { hit, margin } = strike(fight, a, d, tactic, dTactic, rules, rng, log, (choices[d.id] ?? {}).defendWith);
    a.injuries = structuredClone(a.injuries);
    if (tactic !== 'standard') addFatigue(a.injuries, tacticFatigue(tactic, null, weaponOf(a)), tactic);
    if (canAct(d)) {
      d.injuries = structuredClone(d.injuries);
      if (dTactic !== 'standard') addFatigue(d.injuries, tacticFatigue(null, dTactic, weaponOf(d)), dTactic === 'defensive' ? 'careful' : 'counter');
      if (swaps(dTactic, hit, margin)) nextAttacker = d.side;
    }
  }

  // The end of the phase: fire and bleeding, the shock roll; short effects from before this phase wear off.
  for (const f of fight.fighters) {
    if (f.injuries.dead || f.gone) continue;
    const end = endOfPhase(f.injuries, pool(f, 'attr:Livskraft'), rng);
    f.injuries = { ...end.injuries, short: end.injuries.short.slice(shortBefore.get(f.id) ?? 0), blinded: false };
    if (end.rolls.length || end.notes.length) log.push({ k: 'end', who: f.id, end });
  }

  // The melee goes on (or ends with no one left in it); roles for the next round.
  if (fight.melee) {
    const stillIn = fight.fighters.filter(canAct);
    const engaged = stillIn.some((a) => stillIn.some((b) => b.side !== a.side && dist(a, b) <= ADJACENT + 0.5));
    if (!engaged) fight.melee = null;
    else if (nextAttacker !== null && nextAttacker !== fight.melee.attacker) {
      fight.melee = { ...fight.melee, attacker: nextAttacker };
      log.push({ k: 'roles', attacker: nextAttacker });
    }
  }
  delete fight.upper;
  const w = winnerOf(fight);
  if (w !== null && fight.winner === null) {
    fight.winner = w;
    log.push({ k: 'over', winner: w });
  }
  fight.round += 1;
  return { fight, log };
}

/** Is the fight still to be fought (two sides that can act)? Mercy strokes may still follow once it is won. */
export const fightOn = (f: Fight): boolean => f.winner === null;

/** Who the fighter would be fighting in melee this round, and in which role. */
export function roleOf(fight: Fight, id: string): 'attacker' | 'defender' | 'free' {
  const f = fight.fighters.find((x) => x.id === id);
  if (!f || !fight.melee || !canAct(f)) return 'free';
  const foe = nearestFoe(fight, f);
  if (!foe || dist(f, foe) > ADJACENT + 0.5) return 'free';
  return fight.melee.attacker === f.side ? 'attacker' : 'defender';
}

/** Metres between two fighters. */
export const between = (fight: Fight, a: string, b: string): number => {
  const fa = fight.fighters.find((f) => f.id === a), fb = fight.fighters.find((f) => f.id === b);
  return fa && fb ? dist(fa, fb) : Infinity;
};

// ── Yielding (how someone nobody steers chooses is `core/fightmind.ts`) ─────────────────────────────────────────

/** The skills a plea to yield is rolled with: the best of them. */
export const PLEA_SKILLS = ['Argumentera', 'Charm'];

/**
 * How hard a foe is to talk into letting you yield (the director: "an alternative to try to give up"): their style's
 * `spare`, 2 easier for each 5 fatigue they carry over yours (a winded foe is glad to stop), 4 easier if they are hurt
 * more than you (wounds), never under 6; and 6 harder for each time you have yielded to them before (the director:
 * pick up another weapon after yielding, and they won't forgive you so easily).
 */
export function pleaDifficulty(fight: Fight, pleader: string, style: { spare: number }, yieldedBefore = 0): number {
  const me = fight.fighters.find((f) => f.id === pleader);
  const foe = me ? nearestFoe(fight, me) : null;
  if (!me || !foe) return style.spare + 6 * yieldedBefore;
  const wounds = (f: Fighter) => Object.values(f.injuries.wounds).reduce((s, n) => s + (n ?? 0), 0);
  const tired = Math.max(0, Math.floor((foe.injuries.fatigue - me.injuries.fatigue) / 5));
  return Math.max(6, style.spare - 2 * tired - (wounds(foe) > wounds(me) ? 4 : 0)) + 6 * yieldedBefore;
}

/**
 * Yielding: the fight is over, the other side has won, and the one who yielded lays down what they hold (the
 * director: giving up is no cheap way out of a bad spot). It lies on the ground for the winner.
 */
function yieldTo(fight: Fight, f: Fighter, winner: number, rng: Rng, log: LogLine[]): void {
  fight.winner = winner;
  fight.spared = f.id;
  fight.melee = null;
  delete fight.offer;
  for (const slot of ['weapon', 'shield'] as const) {
    const item = f[slot];
    if (!item) continue;
    const at = dropSpot(f, rng);
    fight.ground.push({ ...item, ...at });
    f[slot] = null;
    log.push({ k: 'drop', who: f.id, item: item.id, at });
  }
  log.push({ k: 'over', winner });
}

/**
 * How badly off someone is, about 0 (fresh) to 3 (wrecked): their fatigue against the shock roll, a quarter for each
 * wound, a half for each broken bone and for being on the ground, a quarter for empty hands.
 */
export function beaten(f: Fighter): number {
  const i = f.injuries;
  const wounds = Object.values(i.wounds).reduce((s, n) => s + (n ?? 0), 0);
  return totalFatigue(i) / Math.max(1, poolMean(pool(f, 'attr:Livskraft'))) + 0.25 * wounds + 0.5 * i.broken.length + (grounded(i) ? 0.5 : 0) + (f.weapon ? 0 : 0.25);
}

/** Accept an offer to yield: the one who offered lays down their weapon, and the fight is over. */
export function acceptYield(before: Fight, id: string, rng: Rng): RoundResult {
  const fight = structuredClone(before);
  const log: LogLine[] = [];
  const f = fight.fighters.find((x) => x.id === id);
  const other = f ? nearestFoe(fight, f) : null;
  if (f && other) yieldTo(fight, f, other.side, rng, log);
  return { fight, log };
}

/** Refuse it: the fight goes on, and they don't ask again until worse off. */
export function refuseYield(before: Fight, id: string): Fight {
  const fight = structuredClone(before);
  const f = fight.fighters.find((x) => x.id === id);
  delete fight.offer;
  if (f) fight.refused = { ...fight.refused, [id]: beaten(f) };
  return fight;
}

// ── Building a fighter ──────────────────────────────────────────────────────────────────────────────────────────

/** Dice off dodging for the load of armour worn (the load scale: 17–24 −1D6, 25+ −2D6, 49+ −3D6). */
export const loadDiceOf = (load: number): number => (load >= 49 ? 3 : load >= 25 ? 2 : load >= 17 ? 1 : 0);

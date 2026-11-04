import {
  type AttackTactic, type Choice, type DefenceTactic, type Fight, type Fighter, attackTactics, beaten, canAct, nearestFoe, roleOf,
} from './combat';
import type { Rng } from './rng';

/**
 * How someone nobody steers fights (the director, 2026-11-04: "a type of strategy as a thing. On A do B. Also how and
 * when they give up"; design `director/design/fight-minds.md`). A fighting style is a list of lines, "when this holds,
 * do that", the same shape as people's days (`core/world3d/behave.ts`). What can be asked is a library of conditions
 * (`content/combat/when/`), what can be done a library of choices (`content/combat/does/`), one file each; a style
 * (`content/combat/styles/`) only names them. A style only says what they try: `resolveRound` decides what happens.
 *
 * A round has parts (`Slot`): the side action (move, pick up), the main action (strike, retreat, the killing stroke),
 * the defence, and offering to yield. Lines are read in order; **each part takes the first line that holds and gives
 * something for it**; later lines for a part already taken are passed over.
 */

/** What a choice gives a round: the side action, the main action, the defence, or an offer to yield (between rounds). */
export type Slot = 'side' | 'main' | 'defence' | 'offer';

/** One line of a style: conditions (all must hold; none: always) and a choice, with that choice's own keys. */
export interface FightLine {
  when?: Record<string, unknown>;
  do: string;
  [key: string]: unknown;
}

/** What a condition or a choice sees: the fight, who is choosing, their nearest foe, their role, what the foe declared. */
export interface FightView {
  fight: Fight;
  me: Fighter;
  foe: Fighter | null;
  role: 'attacker' | 'defender' | 'free';
  /** What the foe declared this round, when this fighter has the upper hand (`Fight.upper`). */
  known?: Choice;
  rng: Rng;
}

export interface FightCondition {
  id: string;
  /** One line on what it asks, for whoever writes styles. */
  about: string;
  /** What is wrong with the value a style gave it, or null. */
  check?(value: unknown): string | null;
  holds(value: unknown, view: FightView): boolean;
}

export interface FightDoing {
  id: string;
  about: string;
  /** The keys a line using it may have (besides `do` and `when`). */
  keys: string[];
  /** Which part of the round it fills. */
  fills: Slot;
  /** When it can be chosen: while the fight is on (the default), or once it is won (the killing stroke). */
  phase?: 'fight' | 'won';
  /** What it gives the round, or null if it has nothing to do now (the line is passed over). */
  choose(line: FightLine, view: FightView): Partial<Choice> | null;
}

export interface FightLibrary {
  when: Record<string, FightCondition>;
  does: Record<string, FightDoing>;
}

/** A style as written: its lines, how hard it is to beg off, and the style it starts from (its lines come after). */
export interface FightStyle {
  id: string;
  about?: string;
  /** Another style whose lines follow this one's (a coward: the default, with "flee when hurt" on top). */
  base?: string;
  lines: FightLine[];
  /** How hard it is to talk them into letting you yield (a difficulty; `pleaDifficulty`); else the base's. */
  spare?: number;
}

/** A style with its base folded in: every line in order, and the plea difficulty. */
export interface Style {
  id: string;
  lines: FightLine[];
  spare: number;
}

/** Fold a style's bases in (its own lines first, then each base's), by id from `styles`. */
export function resolveStyle(id: string, styles: Record<string, FightStyle>): Style {
  const lines: FightLine[] = [];
  let spare: number | undefined;
  const seen = new Set<string>();
  for (let s: FightStyle | undefined = styles[id]; s && !seen.has(s.id); s = s.base ? styles[s.base] : undefined) {
    seen.add(s.id);
    lines.push(...s.lines);
    spare ??= s.spare;
  }
  return { id, lines, spare: spare ?? 8 };
}

/** Whether all of a line's conditions hold. */
function holds(line: FightLine, lib: FightLibrary, view: FightView): boolean {
  for (const [k, v] of Object.entries(line.when ?? {})) if (!lib.when[k]?.holds(v, view)) return false;
  return true;
}

function viewOf(fight: Fight, id: string, rng: Rng, known?: Choice): FightView | null {
  const me = fight.fighters.find((x) => x.id === id);
  if (!me || !canAct(me)) return null;
  return { fight, me, foe: nearestFoe(fight, me), role: roleOf(fight, id), known, rng };
}

/**
 * What a fighter the page doesn't steer does this round, by their style's lines. `known`: what the foe declared,
 * when this fighter has the upper hand.
 */
export function chooseFor(fight: Fight, id: string, style: Style, lib: FightLibrary, rng: Rng, known?: Choice): Choice {
  const view = viewOf(fight, id, rng, known);
  if (!view) return {};
  const phase = fight.winner === null ? 'fight' : 'won';
  const taken = new Set<Slot>(['offer']);
  const c: Choice = {};
  for (const line of style.lines) {
    const d = lib.does[line.do];
    if (!d || taken.has(d.fills) || (d.phase ?? 'fight') !== phase || !holds(line, lib, view)) continue;
    const got = d.choose(line, view);
    if (!got) continue;
    Object.assign(c, got);
    taken.add(d.fills);
  }
  return c;
}

/**
 * Whether someone nobody steers offers to yield now (between rounds): a line that offers holds for them. Once
 * refused, they don't ask again until worse off by half again (`Fight.refused`).
 */
export function wantsToYield(fight: Fight, id: string, style: Style, lib: FightLibrary, rng: Rng): boolean {
  if (fight.winner !== null || fight.offer) return false;
  const view = viewOf(fight, id, rng);
  if (!view || beaten(view.me) < (fight.refused?.[id] ?? -Infinity) + 0.5) return false;
  return style.lines.some((l) => lib.does[l.do]?.fills === 'offer' && holds(l, lib, view));
}

/** What a style says wrong: an unknown choice or condition, a key a choice doesn't take, a bad value, a missing base. */
export function styleProblems(style: FightStyle, lib: FightLibrary, styles: Record<string, FightStyle>): string[] {
  const out: string[] = [];
  if (style.base && !styles[style.base]) out.push(`${style.id}: no style called ${style.base} to start from`);
  style.lines.forEach((l, n) => {
    const where = `${style.id}, line ${n + 1} (${l.do})`;
    const d = lib.does[l.do];
    if (!d) return void out.push(`${style.id}, line ${n + 1}: no choice called ${l.do}`);
    for (const k of Object.keys(l)) if (k !== 'do' && k !== 'when' && !d.keys.includes(k)) out.push(`${where}: unknown key "${k}"`);
    for (const [k, v] of Object.entries(l.when ?? {})) {
      const c = lib.when[k];
      if (!c) out.push(`${where}: no condition called ${k}`);
      else {
        const bad = c.check?.(v);
        if (bad) out.push(`${where}: ${k}: ${bad}`);
      }
    }
  });
  return out;
}

// ── Helpers the choices share ──────────────────────────────────────────────────────────────────────────────────

/** Pick a key by weight. */
export function weighted<T extends string>(w: Record<T, number>, rng: Rng): T {
  const entries = Object.entries(w) as [T, number][];
  let x = rng.next() * entries.reduce((s, [, v]) => s + v, 0);
  for (const [k, v] of entries) if ((x -= v) < 0) return k;
  return entries[0][0];
}

/**
 * How a fighter who knows the other's tactic leans (they have the upper hand): each weight is multiplied (a style that
 * never counters still won't). Against careful or countering defence, a quick blow (more dice to get through); against
 * a powerful blow, defend carefully or counter (it is slow); against a quick one, defend carefully. (Reading: the
 * book gives no answers; these follow from what each tactic does.) Used by `strike` and `defend` unless a line says
 * `lean: false`.
 */
export const ANSWER_ATTACK: Record<DefenceTactic, Partial<Record<AttackTactic, number>>> = {
  standard: {}, defensive: { quick: 2, powerful: 0.5 }, counter: { quick: 2, powerful: 0.5 },
};
export const ANSWER_DEFENCE: Record<AttackTactic, Partial<Record<DefenceTactic, number>>> = {
  standard: {}, quick: { defensive: 2 }, powerful: { defensive: 2, counter: 3 },
};

/** Multiply weights by an answer's factors. */
export const lean = <T extends string>(w: Record<T, number>, by: Partial<Record<T, number>>): Record<T, number> =>
  Object.fromEntries(Object.entries(w).map(([k, v]) => [k, (v as number) * (by[k as T] ?? 1)])) as Record<T, number>;

/** The attack tactics this fighter can use (an unwieldy weapon has no quick blow), weighted. */
export const usableAttack = (f: Fighter, w: Record<AttackTactic, number>): Record<AttackTactic, number> =>
  Object.fromEntries(attackTactics(f).map((t) => [t, w[t] ?? 0])) as Record<AttackTactic, number>;

import { styleFor } from '../../content/combat';
import { SKILL_SETS, rollableName } from '../../content/rollables';
import { diceText } from '../../core/chargen/tables';
import {
  ADJACENT, type Choice, type Fighter, PICKUP_REACH, PLEA_SKILLS, RUN, WALK, between, canAct, canHold, demandDifficulty, holding, pleaDifficulty, roleOf,
} from '../../core/combat';
import type { Style } from '../../core/fightmind';
import { t } from '../../i18n';
import { type FightCtx, type Go, within } from './ctx';
import { units } from './fighters';

/**
 * The hero's moves besides a blow or a defence (the director, 2026-11-06: decisions on your side, the middle a log;
 * the many options folded into lists). Two groups:
 * - **The side action** (one a round, before the blows): Move ▸ (walk or run to a tapped spot, close in, run in, to
 *   a weapon you have noticed), Draw ▸ (your own weapons), Pick up ▸ (what you noticed within reach), Look around (an
 *   Alertness roll with 1D6 more, for what lies about). Free, it is the round. In a melee it is picked first and goes
 *   with the blow or defence taken after it, which then show their dice with it (drawn: −1D6).
 * - **Other**, instead of a blow or a defence: ask to yield, accept their surrender, hold your ground, get away; once
 *   it is over, the killing stroke and OK.
 */

export interface Move {
  /** Its key (the timer rings a move by it, tests find it by it). */
  key: string;
  label: string;
  small?: string;
  /** What it does; null: shown, but not to be taken now. */
  go: Go | null;
  /** It plays nothing (a side action picked to go with a blow): one tap, even where acting takes two. */
  instant?: boolean;
}

/** One of the side action's lists, or a side action on its own (`items` empty, `go` set). */
export interface SideEntry {
  id: 'move' | 'draw' | 'pickUp' | 'look';
  label: string;
  /** Why it is empty, or what it costs. */
  small: string;
  items: Move[];
  go?: Go;
  instant?: boolean;
}

/** How the foe fights: their own style (the map's `fights`), else their kind's. */
export function foeStyle(ctx: FightCtx): Style {
  const p = ctx.world().talkPerson(ctx.s.foeId);
  return styleFor(p?.tags ?? [], p?.fights);
}

/** The round's choice with the side action picked first (in a melee) put in. */
export const withSide = (ctx: FightCtx, main: Choice): Choice => ({ ...(ctx.s.side?.choice ?? {}), ...main });

/**
 * The hero as they would be after the side action picked (a weapon drawn or picked up is in hand, −1D6 for it), so
 * the blows and defences show the dice they would roll.
 */
export function afterSide(ctx: FightCtx, me: Fighter): Fighter {
  const c = ctx.s.side?.choice;
  const item = c?.draw ? me.belt?.find((b) => b.id === c.draw) : c?.pickUp ? ctx.s.fight?.ground.find((g) => g.id === c.pickUp) : undefined;
  return item && canHold(me, item) ? holding(me, item) : me;
}

/** Is the side action the whole round (free), or picked first to go with a blow or defence (a melee)? */
const sideIsRound = (ctx: FightCtx): boolean => roleOf(ctx.s.fight!, 'hero') === 'free';

/** Can the side action be taken now: the hero can act, it is their pick, and blades haven't just crossed (it was taken before). */
export function sideWhy(ctx: FightCtx): string | null {
  const fight = ctx.s.fight;
  if (!fight || fight.winner !== null || !canAct(fight.fighters[0])) return t('fight.side.none', 'Nothing to do now.');
  if (fight.midRound) return t('fight.side.done', 'Taken before blades crossed: now the blow or the defence.');
  return null;
}

/** A side action as a move: free it plays the round; in a melee it is picked (a second tap on it unpicks it). */
function sideMove(ctx: FightCtx, key: string, label: string, choice: Choice, small = '', look = false): Move {
  const pick = { key, label, choice, ...(look ? { look } : {}) };
  const round = sideIsRound(ctx);
  return {
    key, label, small, instant: !round,
    go: round
      ? () => { ctx.s.side = pick; return ctx.play(choice); }
      : () => { ctx.s.side = ctx.s.side?.key === key ? null : pick; ctx.s.open = null; ctx.refresh(); },
  };
}

/** The side action's lists, in order: Move (free only), Draw, Pick up, and Look around. */
export function sideEntries(ctx: FightCtx): SideEntry[] {
  const { fight, foeId, plan } = ctx.s;
  const spotted = { has: (id: string) => ctx.world().hasNoticed(id) };
  if (!fight) return [];
  const me = fight.fighters[0], foe = fight.fighters[1];
  const free = roleOf(fight, 'hero') === 'free';
  const out: SideEntry[] = [];

  if (free) {
    const items: Move[] = [];
    if (plan && !(plan.item && within(ctx, plan, PICKUP_REACH))) items.push(...goTo(ctx, plan));
    const d = between(fight, 'hero', foeId);
    const k = Math.max(0, (d - ADJACENT * 0.75) / d);
    const to = { x: me.x + (foe.x - me.x) * k, z: me.z + (foe.z - me.z) * k };
    items.push(sideMove(ctx, 'closein', t('fight.closein', 'Close in'), { move: to }, t('fight.closeinD', 'walk up to 5 m')));
    if (d > WALK + ADJACENT) items.push(sideMove(ctx, 'runin', t('fight.runin', 'Run in'), { move: { ...to, run: true } }, t('fight.runinD', 'up to 10 m, a roll')));
    // Weapons you have noticed, not yet in reach: go to one (empty-handed only, as picking up is).
    if (!me.weapon && !plan) {
      const lying = fight.ground.filter((g) => g.weapon && spotted.has(g.id) && !within(ctx, g, PICKUP_REACH))
        .sort((a, b) => Math.hypot(a.x - me.x, a.z - me.z) - Math.hypot(b.x - me.x, b.z - me.z)).slice(0, 3);
      for (const g of lying) items.push(...goTo(ctx, { x: g.x, z: g.z, item: g.id }));
    }
    out.push({ id: 'move', label: t('fight.side.move', 'Move'), small: t('fight.side.moveD', 'or tap the ground'), items });
  }

  const belt = (me.belt ?? []).filter((b) => canHold(me, b));
  const inHand = [me.weapon, me.shield].filter((x) => !!x).map((x) => ctx.kindName(x!.id)).join(t('fight.and', ' and '));
  out.push({
    id: 'draw', label: t('fight.side.draw', 'Draw'),
    small: belt.length ? t('fight.side.drawD', '−1D6 on the next roll')
      : me.belt?.length ? t('fight.side.handsfull', 'hands full')
        : inHand ? t('fight.side.inhand', 'nothing else on you ({what} in hand)', { what: inHand }) : t('fight.side.nothing', 'nothing carried on you'),
    items: belt.map((b) => sideMove(ctx, `draw:${b.id}`, t('fight.draw', 'Your {name}', { name: ctx.kindName(b.id) }), { draw: b.id })),
  });

  const near = fight.ground.filter((g) => spotted.has(g.id) && canHold(me, g) && Math.hypot(g.x - me.x, g.z - me.z) <= PICKUP_REACH);
  out.push({
    id: 'pickUp', label: t('fight.side.pickup', 'Pick up'),
    small: near.length ? t('fight.side.drawD', '−1D6 on the next roll') : t('fight.side.nonear', 'nothing in reach'),
    items: near.map((g) => sideMove(ctx, `pickup:${g.id}`, t('fight.pickupthe', 'The {name}', { name: ctx.kindName(g.id) }), { pickUp: g.id })),
  });

  const look = sideMove(ctx, 'look', t('fight.side.look', 'Look around'), {}, t('fight.side.lookD', 'Alertness +1D6: what lies about'), true);
  out.push({ id: 'look', label: look.label, small: look.small ?? '', items: [], go: look.go!, instant: look.instant });
  return out;
}

/** Walk or run towards a spot (or a weapon lying there: stop beside it). */
function goTo(ctx: FightCtx, p: { x: number; z: number; item?: string }): Move[] {
  const me = ctx.s.fight!.fighters[0];
  const d = Math.hypot(p.x - me.x, p.z - me.z);
  const stop = p.item ? Math.max(0, d - 1) : d; // beside a weapon, not on it
  const to = d > 0 ? { x: me.x + ((p.x - me.x) * stop) / d, z: me.z + ((p.z - me.z) * stop) / d } : { x: me.x, z: me.z };
  const what = p.item ? t('fight.tothe', 'to the {name}', { name: ctx.kindName(p.item) }) : t('fight.there', 'there');
  const where = p.item ?? 'there';
  const out: Move[] = [sideMove(ctx, `walk:${where}`,
    stop <= WALK ? t('fight.walkto', 'Walk {what} ({m} m)', { what, m: stop.toFixed(1) }) : t('fight.walktoward', 'Walk {what} (5 of {m} m)', { what, m: stop.toFixed(1) }),
    { move: to })];
  if (stop > WALK) out.push(sideMove(ctx, `run:${where}`, t('fight.runto', 'Run {what} ({m} m, a roll)', { what, m: Math.min(stop, RUN).toFixed(1) }), { move: { ...to, run: true } }));
  return out;
}

/** The Other group: what the hero can do instead of a blow or a defence, and the end of a fight. */
export function otherMoves(ctx: FightCtx, done: { newGame: Go; end: Go; accept: Go }): Move[] {
  const { fight, foeId } = ctx.s;
  if (!fight) return [];
  const me = fight.fighters[0], foe = fight.fighters[1];
  const out: Move[] = [];
  if (me.injuries.dead) return [{ key: 'newgame', label: t('fight.newgame', 'New game'), go: done.newGame }];
  if (fight.winner !== null) {
    // No one left to fight: OK ends it (Q49). The winner may finish someone down first.
    if (fight.winner === 0 && !foe.injuries.dead && (foe.injuries.out || foe.injuries.dying)) {
      out.push({ key: 'finish', label: t('fight.finish', 'Finish them'), go: () => ctx.play({ mercy: foeId, ...(between(fight, 'hero', foeId) > ADJACENT ? { move: { x: foe.x, z: foe.z } } : {}) }) });
    }
    out.push({ key: 'ok', label: t('fight.ok', 'OK'), go: done.end });
    return out;
  }
  if (!canAct(me)) return [{ key: 'wait', label: t('fight.wait', 'Lie still…'), go: () => ctx.play({}) }];
  // They offered to yield: accept, or choose anything else and fight on.
  if (fight.offer === foeId) out.push({ key: 'accept', label: t('fight.accept', 'Accept their surrender'), go: done.accept });
  const role = roleOf(fight, 'hero');
  out.push(demand(ctx, role === 'defender'));
  out.push(plea(ctx, role === 'defender'));
  if (role === 'free') {
    out.push({ key: 'hold', label: t('fight.hold', 'Hold your ground'), small: t('fight.holdD', 'let them come'), go: () => ctx.play({}) });
    if (between(fight, 'hero', foeId) > 12) out.push({ key: 'flee', label: t('fight.flee', 'Get away'), small: t('fight.fleeD', 'end the fight'), go: done.end });
  }
  return out;
}

/**
 * Make them yield (the director: a way to win without killing), the main action: the best of the threatening skills
 * (`SKILL_SETS.threaten`; none, Presence at −2D6) against how hard they are to cow (`demandDifficulty`: their style,
 * easier the worse off they are than you). On easy the difficulty shows. A defender still defends.
 */
function demand(ctx: FightCtx, defending: boolean): Move {
  const skills = SKILL_SETS.threaten;
  const best = skills.map((s) => ({ s, d: ctx.hero.dice[s] ?? { n: 0, mod: 0 } })).reduce((a, b) => (units(b.d) > units(a.d) ? b : a), { s: 'attr:Intryck', d: { n: 0, mod: 0 } });
  const presence = ctx.hero.dice['attr:Intryck'] ?? { n: 2, mod: 0 };
  const use = best.d.n > 0 ? best : { s: 'attr:Intryck', d: { n: Math.max(1, presence.n - 2), mod: presence.mod } };
  const difficulty = demandDifficulty(ctx.s.fight!, 'hero', foeStyle(ctx));
  const easy = ctx.level().foeExact;
  return {
    key: 'demand', label: t('fight.demandN', 'Make them yield'),
    small: t('fight.pleadD', '{skill} {dice}{vs}', { skill: rollableName(use.s), dice: diceText(use.d), vs: easy ? t('fight.pleavs', ' against {d}', { d: difficulty }) : '' }),
    go: () => ctx.play(withSide(ctx, { demand: { dice: use.d, difficulty }, ...(defending ? { defend: 'standard' as const } : {}) })),
  };
}

/**
 * Beg to yield (the director: a way to give up, "some type of argue"), the main action: the best of arguing and charm
 * against how hard the foe is to talk down (their style, eased if the fight has gone your way). On easy the difficulty
 * shows. A defender still defends (the plainest way).
 */
function plea(ctx: FightCtx, defending: boolean): Move {
  const style = foeStyle(ctx);
  const best = PLEA_SKILLS.map((s) => ({ s, d: ctx.hero.dice[s] ?? { n: 0, mod: 0 } })).reduce((a, b) => (units(b.d) > units(a.d) ? b : a));
  const dice = best.d.n > 0 ? best.d : { n: 1, mod: 0 };
  const difficulty = pleaDifficulty(ctx.s.fight!, 'hero', style, ctx.world().yieldedTo(ctx.s.foeId));
  const easy = ctx.level().foeExact;
  return {
    key: 'yield', label: t('fight.pleadN', 'Ask to yield'),
    small: t('fight.pleadD', '{skill} {dice}{vs}', { skill: rollableName(best.s), dice: diceText(dice), vs: easy ? t('fight.pleavs', ' against {d}', { d: difficulty }) : '' }),
    go: () => ctx.play(withSide(ctx, { plead: { dice, difficulty }, ...(defending ? { defend: 'standard' as const } : {}) })),
  };
}

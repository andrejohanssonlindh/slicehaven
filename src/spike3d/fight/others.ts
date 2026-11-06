import { styleFor } from '../../content/combat';
import { rollableName } from '../../content/rollables';
import { diceText } from '../../core/chargen/tables';
import { ADJACENT, PICKUP_REACH, PLEA_SKILLS, RUN, WALK, between, canAct, pleaDifficulty, roleOf } from '../../core/combat';
import type { Style } from '../../core/fightmind';
import { t } from '../../i18n';
import { type FightCtx, type Go, within } from './ctx';
import { slotFree, units } from './fighters';

/**
 * The hero's moves besides a blow or a defence: walking and running (to a tapped spot or a weapon lying there),
 * picking up, drawing your own weapon, asking to yield, holding your ground, getting away; once it is over, the
 * killing stroke and OK.
 */

export interface OtherMove {
  label: string;
  go: Go;
  /** The move's key (the timer rings it by this); else its label. */
  key?: string;
}

/** How the foe fights: their own style (the map's `fights`), else their kind's. */
export function foeStyle(ctx: FightCtx): Style {
  const p = ctx.world().talkPerson(ctx.s.foeId);
  return styleFor(p?.tags ?? [], p?.fights);
}

/** Every other move the hero can take now, one button each, the round's whole choice in a tap. */
export function otherMoves(ctx: FightCtx, done: { newGame: Go; end: Go; accept: Go }): OtherMove[] {
  const { fight, foeId, plan } = ctx.s;
  if (!fight) return [];
  const me = fight.fighters[0], foe = fight.fighters[1];
  const out: OtherMove[] = [];
  if (me.injuries.dead) return [{ label: t('fight.newgame', 'New game'), go: done.newGame }];
  if (fight.winner !== null) {
    // No one left to fight: OK ends it (Q49). The winner may finish someone down first.
    if (fight.winner === 0 && !foe.injuries.dead && (foe.injuries.out || foe.injuries.dying)) {
      out.push({ label: t('fight.finish', 'Finish them'), go: () => ctx.play({ mercy: foeId, ...(between(fight, 'hero', foeId) > ADJACENT ? { move: { x: foe.x, z: foe.z } } : {}) }) });
    }
    out.push({ label: t('fight.ok', 'OK'), go: done.end });
    return out;
  }
  if (!canAct(me)) return [{ label: t('fight.wait', 'Lie still…'), go: () => ctx.play({}) }];
  // They offered to yield: accept, or choose anything else and fight on.
  if (fight.offer === foeId) out.push({ label: t('fight.accept', 'Accept their surrender'), go: done.accept });
  const role = roleOf(fight, 'hero');
  // Something to pick up within reach (only empty-handed: one thing at a time).
  const near = fight.ground.filter((g) => slotFree(me, g) && Math.hypot(g.x - me.x, g.z - me.z) <= PICKUP_REACH);
  const pick = near.map((g) => ({ label: t('fight.pickup', 'Pick up the {name}', { name: ctx.kindName(g.id) }), go: () => ctx.play({ pickUp: g.id, defend: 'standard' }) }));
  // Your own weapons, carried at the belt or on the back: draw one (the side action; −1D6 on the next roll unless quick to draw).
  pick.unshift(...(me.belt ?? []).filter((b) => slotFree(me, b)).map((b) => ({ label: t('fight.draw', 'Draw your {name}', { name: ctx.kindName(b.id) }), go: () => ctx.play({ draw: b.id, defend: 'standard' }) })));
  if (role === 'free') {
    out.push(...planned(ctx));
    // Weapons lying about, not yet in reach: go to one (empty-handed only, as picking up is).
    if (!me.weapon && !plan) {
      const lying = fight.ground.filter((g) => g.weapon && !within(ctx, g, PICKUP_REACH)).sort((a, b) => Math.hypot(a.x - me.x, a.z - me.z) - Math.hypot(b.x - me.x, b.z - me.z)).slice(0, 2);
      for (const g of lying) out.push(...goTo(ctx, { x: g.x, z: g.z, item: g.id }));
    }
    const d = between(fight, 'hero', foeId);
    const k = Math.max(0, (d - ADJACENT * 0.75) / d);
    const to = { x: me.x + (foe.x - me.x) * k, z: me.z + (foe.z - me.z) * k };
    out.push({ label: t('fight.closein', 'Close in (walk up to 5 m)'), go: () => ctx.play({ move: to }) });
    if (d > 5 + ADJACENT) out.push({ label: t('fight.runin', 'Run in (up to 10 m, a roll)'), go: () => ctx.play({ move: { ...to, run: true } }) });
    out.push(...pick);
    out.push({ key: 'hold', label: t('fight.hold', 'Hold your ground'), go: () => ctx.play({}) });
    if (d > 12) out.push({ label: t('fight.flee', 'Get away (end the fight)'), go: done.end });
  } else {
    // In a melee the blow or the defence is in the columns; here only the side actions and asking to yield.
    out.push(...pick);
    out.push(plea(ctx, role === 'defender'));
  }
  return out;
}

/** The choices for the tapped plan: pick up the weapon if in reach, else walk (5 m) or run (10 m, a roll) there. */
function planned(ctx: FightCtx): OtherMove[] {
  const { fight, plan } = ctx.s;
  if (!fight || !plan) return [];
  const me = fight.fighters[0];
  if (plan.item && within(ctx, plan, PICKUP_REACH)) {
    const id = plan.item;
    const item = fight.ground.find((g) => g.id === id);
    return !item || !slotFree(me, item) ? [] : [{ label: t('fight.pickup', 'Pick up the {name}', { name: ctx.kindName(id) }), go: () => ctx.play({ pickUp: id, defend: 'standard' }) }];
  }
  return goTo(ctx, plan);
}

/** Walk or run towards a spot (or a weapon lying there: stop beside it). */
function goTo(ctx: FightCtx, p: { x: number; z: number; item?: string }): OtherMove[] {
  const me = ctx.s.fight!.fighters[0];
  const d = Math.hypot(p.x - me.x, p.z - me.z);
  const stop = p.item ? Math.max(0, d - 1) : d; // beside a weapon, not on it
  const to = d > 0 ? { x: me.x + ((p.x - me.x) * stop) / d, z: me.z + ((p.z - me.z) * stop) / d } : { x: me.x, z: me.z };
  const what = p.item ? t('fight.tothe', 'to the {name}', { name: ctx.kindName(p.item) }) : t('fight.there', 'there');
  const out: OtherMove[] = [{
    label: stop <= WALK
      ? t('fight.walkto', 'Walk {what} ({m} m)', { what, m: stop.toFixed(1) })
      : t('fight.walktoward', 'Walk {what} (5 of {m} m)', { what, m: stop.toFixed(1) }),
    go: () => ctx.play({ move: to }),
  }];
  if (stop > WALK) out.push({ label: t('fight.runto', 'Run {what} ({m} m, a roll)', { what, m: Math.min(stop, RUN).toFixed(1) }), go: () => ctx.play({ move: { ...to, run: true } }) });
  return out;
}

/**
 * Beg to yield (the director: a way to give up, "some type of argue"): the best of arguing and charm against how
 * hard the foe is to talk down (their style, eased if the fight has gone your way). On easy the difficulty shows.
 */
function plea(ctx: FightCtx, defending: boolean): OtherMove {
  const style = foeStyle(ctx);
  const best = PLEA_SKILLS.map((s) => ({ s, d: ctx.hero.dice[s] ?? { n: 0, mod: 0 } })).reduce((a, b) => (units(b.d) > units(a.d) ? b : a));
  const dice = best.d.n > 0 ? best.d : { n: 1, mod: 0 };
  const difficulty = pleaDifficulty(ctx.s.fight!, 'hero', style, ctx.world().yieldedTo(ctx.s.foeId));
  const easy = ctx.level().foeExact;
  const label = t('fight.plead', 'Ask to yield ({skill} {dice}{vs})', { skill: rollableName(best.s), dice: diceText(dice), vs: easy ? t('fight.pleavs', ' against {d}', { d: difficulty }) : '' });
  return { label, go: () => ctx.play({ plead: { dice, difficulty }, ...(defending ? { defend: 'standard' as const } : {}) }) };
}

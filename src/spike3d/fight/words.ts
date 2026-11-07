import { diceText } from '../../core/chargen/tables';
import { type AttackTactic, type Choice, type DefenceTactic, roleOf } from '../../core/combat';
import type { DamageType, HitResult } from '../../core/damage';
import type { Roll } from '../../core/dice';
import { t } from '../../i18n';
import type { FightCtx } from './ctx';

/** The words a fight is told in: the tactics' names, ways to defend, what a blow did, what someone means to do. */

/** The tactics' names and what each does, for the buttons. */
export const ATTACKS: Record<AttackTactic, [name: string, does: string]> = {
  standard: [t('fight.tac.std', 'Standard'), ''],
  quick: [t('fight.tac.quickN', 'Quick'), t('fight.tac.quickD', '+1D6, −1D6 dmg, +1 fatigue')],
  powerful: [t('fight.tac.powerN', 'Powerful'), t('fight.tac.powerD', '−1D6, +2D6 dmg, +2 fatigue')],
};
export const DEFENCES: Record<DefenceTactic, [name: string, does: string]> = {
  standard: [t('fight.tac.std', 'Standard'), ''],
  defensive: [t('fight.tac.careN', 'Careful'), t('fight.tac.careD', '+1D6, +1 fatigue; attack back only if it holds by 10')],
  counter: [t('fight.tac.counterN', 'Counter'), t('fight.tac.counterD', '−1D6, attack next, +1 fatigue')],
};
export const WAYS: Record<'parry' | 'block' | 'dodge', string> = { parry: t('fight.how.parry', 'parry'), block: t('fight.how.block', 'block'), dodge: t('fight.how.dodge', 'dodge') };
export const HOW: Record<string, string> = { parry: 'parry', block: 'block', dodge: 'dodge', none: 'no defence' };
export const VERDICT: Record<string, string> = { parry: 'parried', block: 'blocked', dodge: 'dodged', none: 'missed' };

/**
 * A roll in numbers for the log (the director: in fast mode, see what the dice did where the difficulty allows it):
 * "3D6+1 = 4 < 6", or "3D6 = 12" with nothing to reach.
 */
export function rollText(r: Roll): string {
  const pool = r.sides === 6 ? diceText(r.dice) : `D${r.sides}`;
  const vs = r.target === undefined ? '' : ` ${r.success ? '≥' : '<'} ${r.target}`;
  return `${pool} = ${r.total}${vs}`;
}

/** What a blow did, in a word or two (normal and hard; Q50): by how bad it was and its kind of damage. */
export function hitWord(r: HitResult, type: DamageType): string {
  if (r.net <= 0) return t('fight.w.glance', 'glancing');
  const bad = r.serious ? 2 : r.fatigue >= 2 ? 1 : 0;
  const W: Record<DamageType, [string, string, string]> = {
    cut: [t('fight.w.graze', 'graze'), t('fight.w.cut', 'cut'), t('fight.w.deepcut', 'deep cut')],
    thrust: [t('fight.w.nick', 'nick'), t('fight.w.stab', 'stab'), t('fight.w.deepstab', 'deep stab')],
    crush: [t('fight.w.bruise', 'bruise'), t('fight.w.heavy', 'heavy blow'), t('fight.w.crushing', 'crushing blow')],
    brawl: [t('fight.w.bruise', 'bruise'), t('fight.w.blow', 'hard blow'), t('fight.w.crushing', 'crushing blow')],
    fall: [t('fight.w.bruise', 'bruise'), t('fight.w.fall', 'bad fall'), t('fight.w.fallserious', 'terrible fall')],
    burn: [t('fight.w.singe', 'singe'), t('fight.w.burn', 'burn'), t('fight.w.deepburn', 'bad burn')],
  };
  return W[type][bad];
}

/**
 * What someone means to do this round, in words ("strike hard", "pick up the sword and then strike"), as the hero
 * reads it when they have the upper hand: the side action and, by their role, the main action.
 */
export function intentOf(ctx: FightCtx, id: string, c: Choice): string {
  const parts: string[] = [];
  if (c.plead) return t('fight.means.plead', 'ask to yield');
  if (c.mercy) return t('fight.means.mercy', 'give the killing stroke');
  if (c.pickUp) parts.push(t('fight.means.pickup', 'pick up the {thing}', { thing: ctx.kindName(c.pickUp) }));
  if (c.draw) parts.push(t('fight.means.draw', 'draw their {thing}', { thing: ctx.kindName(c.draw) }));
  const role = roleOf(ctx.s.fight!, id);
  if (role === 'attacker') {
    if (c.retreat) parts.push(t('fight.means.retreat', 'break off'));
    else parts.push({ standard: t('fight.means.strike', 'strike'), quick: t('fight.means.quick', 'strike quickly'), powerful: t('fight.means.powerful', 'strike with all their strength') }[c.attack ?? 'standard']);
  } else if (role === 'defender') {
    parts.push({ standard: t('fight.means.defend', 'defend'), defensive: t('fight.means.careful', 'defend carefully'), counter: t('fight.means.counter', 'wait for a chance to counter') }[c.defend ?? 'standard']);
  } else if (c.move) parts.push(c.move.run ? t('fight.means.run', 'run at you') : t('fight.means.close', 'close in'));
  else if (!parts.length) parts.push(t('fight.means.hold', 'hold their ground'));
  return parts.join(t('fight.means.then', ' and then '));
}

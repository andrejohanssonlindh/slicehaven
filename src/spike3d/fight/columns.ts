import { rollableName } from '../../content/rollables';
import { diceText } from '../../core/chargen/tables';
import {
  type AttackTactic, type Choice, type DefenceTactic, type Fighter, UNTRAINED, attackPool, attackTactics, canAct, defenceOptions, defencePool, roleOf, weaponOf,
} from '../../core/combat';
import { totalFatigue } from '../../core/damage';
import { t } from '../../i18n';
import { fatigueShare, fatigueWord, harmBits } from '../condition';
import { bodyOutline } from '../outline';
import { type FightCtx, type Go, cap, press } from './ctx';
import { ATTACKS, DEFENCES, WAYS, intentOf } from './words';

/**
 * The two columns (B8g F2): each side's card (name, weapon, body outline, how they are) and their moves, always all
 * shown: Offensive and Defensive, the group they don't have this round greyed with why. Yours act on a tap; the foe's
 * are the same, mirrored, never tappable: their pools only on easy, their chosen move lit when you have the upper hand.
 */

/**
 * One side's card: name and weapon, a fatigue bar, and how they are. Your own in numbers (on hard your fatigue only
 * in words); the foe's in numbers on easy, in words otherwise (the director's notes on the first fight).
 */
export function card(ctx: FightCtx, box: HTMLElement, f: Fighter, name: string, own: boolean): void {
  const lv = ctx.level();
  const exactFatigue = own ? lv.ownExact : lv.foeExact;
  const exactHarm = own || lv.foeExact;
  const i = f.injuries;
  box.replaceChildren();
  const top = document.createElement('div');
  top.className = 'top';
  const b = document.createElement('b');
  b.textContent = name;
  const skill = weaponOf(f).skill, pool = f.pools[skill];
  const dice = pool && (pool.n > 0 || pool.mod > 0) ? diceText(pool) : `${diceText(UNTRAINED)} ${t('fight.untrainedtag', 'untrained')}`;
  const weapon = (f.weapon ? ctx.kindName(f.weapon.id) : t('fight.bare', 'bare hands')) + (f.shield ? t('fight.andshield', ' and {shield}', { shield: ctx.kindName(f.shield.id) }) : '');
  const wpn = document.createElement('span');
  wpn.className = 'wpn';
  wpn.textContent = ` · ${exactHarm ? `${weapon} (${rollableName(skill)} ${dice})` : weapon}`;
  top.append(b, wpn);
  if (own || lv.foeExact) {
    const more = document.createElement('span');
    more.className = 'more';
    more.textContent = t('fight.details', 'details ›');
    top.appendChild(more);
  }
  const how = document.createElement('div');
  how.className = 'how';
  const bits: string[] = [];
  if (i.dead) bits.push(t('fight.dead', 'dead'));
  else {
    if (i.out) bits.push(i.dying ? t('fight.dying', 'dying') : t('fight.out', 'knocked out'));
    bits.push(exactFatigue ? t('fight.fatigue', 'fatigue {n}', { n: totalFatigue(i) }) : fatigueWord(i, ctx.vitalityOf(f)));
    bits.push(...harmBits(i, exactHarm));
  }
  how.textContent = bits.join(' · ');
  // The body outline: your own wounds exactly; the foe's on easy, else only the blows you saw land. Fatigue is the
  // bar beside it (full: where most fail the shock roll).
  const outline = bodyOutline(i, ctx.s.seen[f.id] ?? [], exactHarm, fatigueShare(i, ctx.vitalityOf(f)));
  box.append(outline, top, how);
}

/** Both cards drawn again (their outlines, bars and words). */
export function cards(ctx: FightCtx): void {
  const fight = ctx.s.fight;
  if (!fight) return;
  card(ctx, ctx.el.usCard, fight.fighters[0], t('fight.You', 'You'), true);
  if (fight.fighters[1]) card(ctx, ctx.el.themCard, fight.fighters[1], ctx.Name(ctx.s.foeId), false);
}

/**
 * Why a group is greyed for someone this round, or null if it is theirs to use: over, can't act, out of reach, or
 * the other role (and, for the hero, why they have it: quicker when blades crossed, won the last exchange, kept it).
 */
export function offWhy(ctx: FightCtx, f: Fighter, group: 'attack' | 'defend', mine: boolean): string | null {
  const fight = ctx.s.fight;
  if (!fight) return '';
  if (fight.winner !== null) return t('fight.why.over', 'The fight is over.');
  if (!canAct(f)) return mine ? t('fight.why.cant', 'You can’t fight now.') : t('fight.why.cantthey', 'They can’t fight now.');
  const role = roleOf(fight, f.id);
  if (role === 'free') return mine ? t('fight.why.free', 'Not in reach: close in first, or wait for them.') : t('fight.why.freethey', 'Not in reach.');
  if ((group === 'attack') === (role === 'attacker')) return null;
  if (!mine) return role === 'attacker' ? t('fight.why.theyattack', 'They’re attacking.') : t('fight.why.theydefend', 'They’re defending.');
  const roleWhy = ctx.s.roleWhy;
  const why = role === 'attacker'
    ? { quicker: t('fight.why.quicker', 'you were quicker when blades crossed'), won: t('fight.why.won', 'you won the last exchange'), kept: t('fight.why.kept', 'you kept the attack') }[roleWhy]
    : { quicker: t('fight.why.slower', 'they were quicker when blades crossed'), won: t('fight.why.lost', 'they won the last exchange'), kept: t('fight.why.theykept', 'they kept the attack') }[roleWhy];
  return role === 'attacker' ? t('fight.why.attacking', 'You’re attacking: {why}.', { why }) : t('fight.why.defending', 'You’re defending: {why}.', { why });
}

/** Which of someone's buttons their declared choice is (`atk:quick`, `def:parry:counter`, `retreat`), or null. */
export function litKey(ctx: FightCtx, f: Fighter, other: Fighter, c: Choice): string | null {
  const role = roleOf(ctx.s.fight!, f.id);
  if (role === 'attacker') return c.retreat ? 'retreat' : c.mercy || c.plead ? null : `atk:${c.attack ?? 'standard'}`;
  if (role === 'defender') {
    const tac = c.defend ?? 'standard';
    return `def:${defencePool(f, weaponOf(other), tac, c.defendWith).how}:${tac}`;
  }
  return null;
}

/** A move button: its label, a small line under it, its key; acts on a tap (or rings it first on a phone) if it can. */
export function moveButton(ctx: FightCtx, label: string, small: string, key: string, go: Go | null, opts: { cant?: boolean; lit?: string | null; mine?: boolean } = {}): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.append(label);
  if (small) {
    const s = document.createElement('small');
    s.textContent = small;
    b.appendChild(s);
  }
  b.dataset.move = key;
  const mine = opts.mine ?? true;
  b.classList.toggle('lit', key === opts.lit);
  b.classList.toggle('armed', mine && ctx.s.armed?.key === key);
  b.disabled = !!opts.cant || !go;
  if (go && !opts.cant) {
    b.addEventListener('click', () => press(ctx, key, go));
    ctx.s.avail.set(key, go);
  }
  return b;
}

/**
 * One side's moves, always all shown: Offensive (each tactic with its pool, retreat) and Defensive (every way to
 * defend × every tactic, with its pool; dodging can't counter).
 */
export function moves(ctx: FightCtx, box: HTMLElement, f: Fighter, other: Fighter, mine: boolean): void {
  const { fight, pending, busy } = ctx.s;
  if (!fight) return;
  box.replaceChildren();
  const lv = ctx.level();
  const open = mine || lv.foeExact;
  const known = !mine && pending && fight.winner === null ? pending : null;
  const lit = known ? litKey(ctx, f, other, known) : null;
  if (!mine) {
    const gist = document.createElement('p');
    gist.className = 'gist';
    const acts = fight.winner === null && canAct(f);
    if (known) gist.textContent = t('fight.intent', '{who} means to {what}.', { who: ctx.Name(f.id), what: intentOf(ctx, f.id, known) });
    else if (acts) {
      gist.classList.add('unknown');
      gist.textContent = fight.upper === 1
        ? t('fight.unknown.slower', '? {who} was quicker: they’ll see what you do.', { who: ctx.Name(f.id) })
        : t('fight.unknown', '? You don’t know what {who} will do.', { who: ctx.Name(f.id) });
    } else gist.hidden = true;
    box.appendChild(gist);
  }
  const cant = !mine || busy || !canAct(f) || fight.winner !== null;
  const button = (label: string, small: string, key: string, go: Go | null) => moveButton(ctx, label, small, key, go, { cant, lit, mine });
  const group = (kind: 'attack' | 'defend', title: string): HTMLElement => {
    const g = document.createElement('div');
    g.className = `group ${kind}`;
    const h = document.createElement('h4');
    h.textContent = title;
    g.appendChild(h);
    const why = offWhy(ctx, f, kind, mine);
    if (why) {
      g.classList.add('off');
      const p = document.createElement('p');
      p.className = 'why';
      p.textContent = why;
      g.appendChild(p);
    }
    if (lit?.startsWith(kind === 'attack' ? 'atk' : 'def') || (kind === 'attack' && lit === 'retreat')) g.classList.add('lit-in');
    const grid = document.createElement('div');
    grid.className = 'grid';
    g.appendChild(grid);
    box.appendChild(g);
    return grid;
  };

  // Offensive.
  const atkOn = !offWhy(ctx, f, 'attack', mine);
  const ag = group('attack', t('fight.g.attack', 'Offensive'));
  const can = attackTactics(f);
  for (const tac of ['standard', 'quick', 'powerful'] as AttackTactic[]) {
    const [name, does] = ATTACKS[tac];
    const dice = open ? ` ${diceText(attackPool(f, tac))}` : '';
    ag.appendChild(button(`${name}${dice}`, does, `atk:${tac}`, atkOn && can.includes(tac) ? () => ctx.play({ attack: tac }) : null));
  }
  ag.appendChild(button(t('fight.retreatN', 'Retreat'), t('fight.retreatD', 'break off, 5 m back'), 'retreat', atkOn && fight.melee ? () => ctx.play({ retreat: true }) : null));

  // Defensive: a row for each way to defend, a column for each tactic.
  const defOn = !offWhy(ctx, f, 'defend', mine);
  const dg = group('defend', t('fight.g.defend', 'Defensive'));
  dg.appendChild(document.createElement('span'));
  const tactics: DefenceTactic[] = ['standard', 'defensive', 'counter'];
  for (const tac of tactics) {
    const lab = document.createElement('span');
    lab.className = 'lab';
    lab.textContent = DEFENCES[tac][0];
    lab.title = DEFENCES[tac][1];
    dg.appendChild(lab);
  }
  const against = weaponOf(other);
  const pools = Object.fromEntries(tactics.map((tac) => [tac, defenceOptions(f, against, tac)]));
  for (const how of pools.standard.map((o) => o.how)) {
    const lab = document.createElement('span');
    lab.className = 'lab row-lab';
    lab.textContent = cap(WAYS[how]);
    dg.appendChild(lab);
    for (const tac of tactics) {
      const o = pools[tac].find((x) => x.how === how);
      if (!o) {
        const none = document.createElement('span');
        none.className = 'none';
        none.textContent = '—';
        dg.appendChild(none);
        continue;
      }
      dg.appendChild(button(open ? diceText(o.dice) : cap(WAYS[how]), '', `def:${how}:${tac}`, defOn ? () => ctx.play({ defend: tac, defendWith: how }) : null));
    }
  }
  if (mine && defOn) {
    const p = document.createElement('p');
    p.className = 'why note';
    p.textContent = t('fight.tactics', 'Careful: +1D6, +1 fatigue. Counter: −1D6, +1 fatigue; hold them off and you attack next.');
    dg.parentElement!.appendChild(p);
  }
}

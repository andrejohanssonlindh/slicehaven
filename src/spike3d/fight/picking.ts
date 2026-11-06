import { PICK_SECONDS } from '../../content/combat/timer';
import { type AttackTactic, type DefenceTactic, canAct, defencePool, roleOf, weaponOf } from '../../core/combat';
import { t } from '../../i18n';
import { loadSettings } from '../../ui/settings';
import { offWhy, litKey } from './columns';
import { type FightCtx, cap } from './ctx';
import { ATTACKS, DEFENCES, WAYS } from './words';

/**
 * Where the panel's pieces go and how a pick is made against the clock: the layout (columns when wide, the sheet
 * with tabs on a phone, B8g F5), the view aimed at the part of the screen left free, the foe's bubble over their head,
 * and the pick timer (F6).
 */

/** The computer layout (columns at both sides): a wide screen, or a phone held sideways. */
export const WIDE = matchMedia('(min-width: 640px) and (min-aspect-ratio: 1/1)');

/** Your moves go in your column on a wide screen, in the sheet under the tabs on a phone. */
export function layout(ctx: FightCtx): void {
  const { usMoves, usCol, pane } = ctx.el;
  if (WIDE.matches) { if (usMoves.parentElement !== usCol) usCol.appendChild(usMoves); }
  else if (usMoves.parentElement !== pane) pane.appendChild(usMoves);
}

/**
 * Keep the fighters in the part of the screen the panel leaves free (the director: the panel covered them): on a
 * phone the panel sits at the bottom and the fight above it; on a wide screen it docks at the side.
 */
export function aimView(ctx: FightCtx): void {
  const w = ctx.world();
  const canvas = document.getElementById('stage');
  if (!ctx.s.fight || ctx.el.root.hidden || !canvas) return void (w.viewAim = { x: 0, y: 0 });
  const c = canvas.getBoundingClientRect();
  const us = ctx.el.usCol.getBoundingClientRect(), them = ctx.el.themCol.getBoundingClientRect(), m = ctx.el.mid.getBoundingClientRect();
  // Columns at both sides (a wide screen): the gap between them, above the bottom strip. A phone: between the
  // cards in the corners and the sheet.
  const free = WIDE.matches ? { x: (us.right + them.left) / 2, y: (c.top + m.top) / 2 } : { x: c.left + c.width / 2, y: (Math.max(us.bottom, c.top) + m.top) / 2 };
  w.viewAim = { x: ((free.x - c.left) / c.width) * 2 - 1, y: -(((free.y - c.top) / c.height) * 2 - 1) };
}

/** The phone's tabs (Attack, Defend, Other): a new round opens on the tab for your role; the others greyed. */
export function makeTabs(ctx: FightCtx): { draw(): void; reset(): void } {
  let tab: 'attack' | 'defend' | 'move' = 'move';
  let tabFor = '';
  function draw(): void {
    const fight = ctx.s.fight;
    if (!fight) return;
    const role = roleOf(fight, 'hero');
    const now = `${fight.round}:${role}:${fight.winner}`;
    if (now !== tabFor) {
      tabFor = now;
      tab = fight.winner === null && canAct(fight.fighters[0]) ? (role === 'attacker' ? 'attack' : role === 'defender' ? 'defend' : 'move') : 'move';
    }
    const el = ctx.el.tabs;
    el.replaceChildren();
    const names = { attack: t('fight.tab.attack', 'Attack'), defend: t('fight.tab.defend', 'Defend'), move: t('fight.tab.move', 'Move') };
    for (const k of ['attack', 'defend', 'move'] as const) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = names[k];
      b.dataset.tab = k;
      b.classList.toggle('on', k === tab);
      b.classList.toggle('off', k !== 'move' && !!offWhy(ctx, fight.fighters[0], k, true));
      b.addEventListener('click', () => { tab = k; draw(); });
      el.appendChild(b);
    }
    ctx.el.root.classList.remove('tab-attack', 'tab-defend', 'tab-move');
    ctx.el.root.classList.add(`tab-${tab}`);
  }
  return { draw, reset: () => void (tabFor = '') };
}

/** The foe's move as a word in the bubble over their head (a phone): what they mean to do, or ? */
export function intentBubble(ctx: FightCtx): void {
  const { fight, pending } = ctx.s;
  const el = ctx.el.intent;
  if (!fight || !fight.fighters[1] || fight.winner !== null || !canAct(fight.fighters[1])) return void (el.hidden = true);
  const foe = fight.fighters[1], me = fight.fighters[0];
  el.hidden = false;
  el.classList.toggle('unknown', !pending);
  if (!pending) return void (el.textContent = '?');
  const key = litKey(ctx, foe, me, pending);
  const [k, a, b] = key?.split(':') ?? [];
  el.textContent = k === 'atk' ? `⚔ ${ATTACKS[a as AttackTactic][0]}`
    : k === 'def' ? `🛡 ${cap(WAYS[a as 'parry'])} · ${DEFENCES[b as DefenceTactic][0]}`
      : key === 'retreat' ? t('fight.bubble.retreat', '↩ Retreat')
        : pending.plead ? t('fight.bubble.plead', 'Yield?')
          : pending.move ? (pending.move.run ? t('fight.bubble.run', 'Runs') : t('fight.bubble.close', 'Closes in'))
            : pending.pickUp || pending.draw ? t('fight.bubble.arm', 'Arms') : t('fight.bubble.hold', 'Holds');
}

/** Keep the bubble over the foe's head while the fight lasts (they move, the view turns). */
export function trackBubble(ctx: FightCtx): void {
  const fight = ctx.s.fight;
  if (!fight || ctx.el.root.hidden) return;
  const at = fight.fighters[1] ? ctx.world().screenOf(fight.fighters[1].id) : null;
  if (at && !ctx.el.intent.hidden) {
    ctx.el.intent.style.left = `${at.x * 100}%`;
    ctx.el.intent.style.top = `${at.y * 100}%`;
  }
  requestAnimationFrame(() => trackBubble(ctx));
}

/** Can the hero pick a move now (their turn, nothing playing)? */
export const canPick = (ctx: FightCtx): boolean => !!ctx.s.fight && !ctx.s.busy && ctx.s.fight.winner === null && canAct(ctx.s.fight.fighters[0]);

/**
 * The pick timer (F6): on a difficulty with seconds for it, each pick runs against the clock (a bar under the
 * round). The move ringed is what it takes when it runs out: last round's if you can take it again, else a plain
 * one for your role (a standard blow, the best standard defence, holding your ground). It stops while anything
 * plays or dice roll, and a new pick starts it afresh.
 */
export function makeTimer(ctx: FightCtx): { draw(): void } {
  const el = document.createElement('div');
  el.className = 'timer';
  el.hidden = true;
  const bar = document.createElement('i');
  el.appendChild(bar);
  ctx.el.head.after(el);

  function draw(): void {
    const s = ctx.s, fight = s.fight;
    const secs = PICK_SECONDS[loadSettings().difficulty];
    if (!fight || !secs || !canPick(ctx)) {
      s.timer = null;
      el.hidden = true;
      return;
    }
    const me = fight.fighters[0], foe = fight.fighters[1];
    const key = `${fight.round}:${fight.midRound ?? ''}:${roleOf(fight, 'hero')}`;
    if (s.timer?.key !== key) {
      s.timer = { key, until: performance.now() + secs * 1000, total: secs * 1000 };
      requestAnimationFrame(tick);
    }
    if (!s.armed || !s.avail.has(s.armed.key)) {
      const role = roleOf(fight, 'hero');
      const plain = role === 'attacker' ? 'atk:standard'
        : role === 'defender' && foe ? `def:${defencePool(me, weaponOf(foe), 'standard').how}:standard`
          : 'hold';
      const k = [s.lastMove, plain].find((x) => x && s.avail.has(x)) ?? s.avail.keys().next().value;
      s.armed = k ? { key: k, go: s.avail.get(k)! } : null;
    } else s.armed.go = s.avail.get(s.armed.key)!;
    for (const b of ctx.el.root.querySelectorAll<HTMLElement>('[data-move]')) b.classList.toggle('armed', !!s.armed && b.dataset.move === s.armed.key && !b.closest('.them'));
    el.hidden = false;
  }

  /** The timer running down; out of time, the ringed move is taken. */
  function tick(): void {
    const s = ctx.s;
    if (!s.timer) return void (el.hidden = true);
    if (!canPick(ctx)) return void (s.timer = null);
    const left = s.timer.until - performance.now();
    bar.style.width = `${Math.max(0, (left / s.timer.total) * 100)}%`;
    el.classList.toggle('late', left < 3000);
    if (left > 0) return void requestAnimationFrame(tick);
    const a = s.armed;
    s.timer = null;
    s.armed = null;
    if (a) {
      s.lastMove = a.key;
      ctx.log(t('fight.timeup', 'Out of time.'), 'info');
      void a.go();
    }
  }
  return { draw };
}

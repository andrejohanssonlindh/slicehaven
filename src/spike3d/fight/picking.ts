import { PICK_SECONDS } from '../../content/combat/timer';
import { type AttackTactic, type DefenceTactic, canAct, defencePool, roleOf, weaponOf } from '../../core/combat';
import { t } from '../../i18n';
import { loadSettings } from '../../ui/settings';
import { offWhy, litKey } from './columns';
import { sideWhy } from './others';
import { type FightCtx, cap } from './ctx';
import { ATTACKS, DEFENCES, WAYS } from './words';

/**
 * Where the panel's pieces go and how a pick is made against the clock: the layout (columns when wide, the sheet
 * with tabs on a phone, B8g F5), the view aimed at the part of the screen left free, the foe's bubble over their head,
 * and the pick timer (F6).
 */

/** The computer layout (columns at both sides): a wide screen, or a phone held sideways. */
export const WIDE = matchMedia('(min-width: 640px) and (min-aspect-ratio: 1/1)');

/**
 * Your moves go in your column on a wide screen, in the sheet under the tabs on a phone. ⚔ Back to fight sits over
 * the view on a wide screen, in the sheet's round line on a phone (it covered the fight there).
 */
export function layout(ctx: FightCtx): void {
  const { usMoves, usCol, pane, back, head, root } = ctx.el;
  if (WIDE.matches) {
    if (usMoves.parentElement !== usCol) usCol.appendChild(usMoves);
    if (back.parentElement !== root.parentElement) root.after(back);
  } else {
    if (usMoves.parentElement !== pane) pane.appendChild(usMoves);
    if (back.parentElement !== head) head.appendChild(back);
  }
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
  // Close in, but with both fighters inside the free part (the director: the foe stood behind their card): the gap
  // between the columns on a wide screen, the strip over the sheet on a phone; their distance and a body's room.
  const width = WIDE.matches ? them.left - us.right : c.width;
  const height = WIDE.matches ? m.top - c.top : m.top - Math.max(us.bottom, c.top);
  const fight = ctx.s.fight;
  const a = fight.fighters[0], b = fight.fighters[1];
  if (a && b) ctx.fitView(Math.hypot(a.x - b.x, a.z - b.z) + FIT_ROOM, width, height);
}

/** Room round the two fighters when the view is fitted to them, metres (a body each side and a little air). */
const FIT_ROOM = 3;

type Tab = 'attack' | 'defend' | 'side' | 'other';

/**
 * The phone's tabs, one per group of your column: Attack, Defend, Side (the side action, ticked when one is picked)
 * and Other. A new round opens on the tab for your role (free: Side; over: Other); the ones not for now greyed.
 */
export function makeTabs(ctx: FightCtx): { draw(): void; reset(): void; show(tab: Tab): void } {
  let tab: Tab = 'side';
  let tabFor = '';
  let lastSide: string | null = null;
  function draw(): void {
    const fight = ctx.s.fight;
    if (!fight) return;
    const role = roleOf(fight, 'hero');
    const acts = fight.winner === null && canAct(fight.fighters[0]);
    const now = `${fight.round}:${fight.midRound ?? ''}:${role}:${fight.winner}`;
    // A new round opens on your role's tab; a side action just picked in a melee takes you back there for the blow.
    const sideKey = ctx.s.side?.key ?? null;
    const picked = sideKey !== lastSide && sideKey !== null;
    lastSide = sideKey;
    if (now !== tabFor || (picked && role !== 'free')) {
      tabFor = now;
      tab = !acts ? 'other' : role === 'attacker' ? 'attack' : role === 'defender' ? 'defend' : 'side';
    }
    const el = ctx.el.tabs;
    el.replaceChildren();
    el.hidden = !acts;
    const names: Record<Tab, string> = {
      attack: t('fight.tab.attack', 'Attack'), defend: t('fight.tab.defend', 'Defend'),
      side: ctx.s.side ? t('fight.tab.sidepicked', 'Side ✓') : t('fight.tab.side', 'Side'), other: t('fight.tab.other', 'Other'),
    };
    const off: Record<Tab, boolean> = {
      attack: !!offWhy(ctx, fight.fighters[0], 'attack', true), defend: !!offWhy(ctx, fight.fighters[0], 'defend', true), side: !!sideWhy(ctx), other: false,
    };
    for (const k of ['attack', 'defend', 'side', 'other'] as const) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = names[k];
      b.dataset.tab = k;
      b.classList.toggle('on', k === tab);
      b.classList.toggle('off', off[k]);
      b.addEventListener('click', () => { tab = k; draw(); });
      el.appendChild(b);
    }
    ctx.el.root.classList.remove('tab-attack', 'tab-defend', 'tab-side', 'tab-other');
    ctx.el.root.classList.add(`tab-${acts ? tab : 'other'}`);
  }
  return { draw, reset: () => void (tabFor = ''), show: (k) => { tab = k; draw(); } };
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
  const at = fight.fighters[1] ? ctx.world().figures.screenOf(fight.fighters[1].id) : null;
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

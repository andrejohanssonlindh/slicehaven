import type { Dice } from '../../core/chargen/tables';
import type { Choice, Fight, Fighter } from '../../core/combat';
import { DIFFICULTY_RULES } from '../../core/difficulty';
import type { Hero } from '../../core/hero';
import type { Rng } from '../../core/rng';
import type { SpikeWorld } from '../../engine3d/world';
import type { ConditionSheet } from '../condition';
import type { SeenHit } from '../outline';

/**
 * What the parts of the fight page share (plan B8a, B8g): the fight as the rules have it, what the page knows about
 * this round, the panel's elements, and the services every part calls (the world, the log, a redraw, a round played).
 * One object, made by `makeFight` (`./index.ts`); each part is a file of functions that take it.
 */

/** A move the hero can take: what it does when taken. */
export type Go = () => Promise<void> | void;

export interface FightState {
  fight: Fight | null;
  foeId: string;
  /** Something is playing out (a round, dice): no picking. */
  busy: boolean;
  /** What the foe declared this round, when the hero has the upper hand and so knows it before choosing. */
  pending: Choice | null;
  /** Where the hero means to go this round (a tapped spot, or a weapon lying there), shown with a mark. */
  plan: { x: number; z: number; item?: string } | null;
  /** Why whoever attacks in the melee has the attack: they were quicker when blades crossed, won the last exchange, or kept it. */
  roleWhy: 'quicker' | 'won' | 'kept';
  /** The blows each fighter was seen to take this fight (where and of what kind), for the body outlines. */
  seen: Record<string, SeenHit[]>;
  /** The move picked and waiting for its second tap (and what the timer would take): its key, and what it does. */
  armed: { key: string; go: Go } | null;
  /** The moves you can take now (filled as they are drawn), by key: what the timer can take. */
  avail: Map<string, Go>;
  /** The move you took last round (its key): the timer starts ringing that one. */
  lastMove: string | null;
  /** The pick timer (F6): for which pick, and when it runs out. */
  timer: { key: string; until: number; total: number } | null;
}

/** The panel's elements (`#fight` in `spike3d/index.html`). */
export interface FightEls {
  root: HTMLElement;
  head: HTMLElement;
  usCol: HTMLElement;
  themCol: HTMLElement;
  usCard: HTMLElement;
  themCard: HTMLElement;
  usMoves: HTMLElement;
  themMoves: HTMLElement;
  mid: HTMLElement;
  tabs: HTMLElement;
  pane: HTMLElement;
  log: HTMLElement;
  intent: HTMLButtonElement;
  back: HTMLButtonElement;
}

export interface FightCtx {
  s: FightState;
  el: FightEls;
  world(): SpikeWorld;
  hero: Hero;
  rng: Rng;
  condition: ConditionSheet;
  /** The difficulty's rules (what is shown exactly). */
  level(): (typeof DIFFICULTY_RULES)[keyof typeof DIFFICULTY_RULES];
  /** Fast mode (the setting `fight`): exchanges play at once, dice behind the log. */
  fast(): boolean;
  /** Two taps to act (a touch screen). */
  twoTaps(): boolean;
  nameOf(id: string): string;
  /** A name to start a line with. */
  Name(id: string): string;
  /** What a thing in the fight is called (its kind's name). */
  kindName(id: string): string;
  vitalityOf(f: Fighter): Dice;
  log(text: string, kind?: 'you' | 'they' | 'info' | 'good' | 'bad'): void;
  /** Draw the panel again from the state. */
  refresh(): void;
  /** Play the round with the hero's choice. */
  play(mine: Choice): Promise<void>;
}

/** Pick a move: on a touch screen the first tap rings it and the second acts; elsewhere one tap acts. */
export function press(ctx: FightCtx, key: string, go: Go): void {
  const s = ctx.s;
  if (s.busy) return;
  if (!ctx.twoTaps() || s.armed?.key === key) {
    s.armed = null;
    s.timer = null;
    s.lastMove = key;
    void go();
    return;
  }
  s.armed = { key, go };
  ctx.refresh();
}

export const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** Is a spot within so many metres of the hero? */
export const within = (ctx: FightCtx, p: { x: number; z: number }, m: number): boolean =>
  !!ctx.s.fight && Math.hypot(p.x - ctx.s.fight.fighters[0].x, p.z - ctx.s.fight.fighters[0].z) <= m;

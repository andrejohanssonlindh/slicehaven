import { ARMOUR, SHIELDS, WEAPONS } from '../content/chargen/equipment';
import { FIGHT_MINDS, styleFor } from '../content/combat';
import { PICK_SECONDS } from '../content/combat/timer';
import { rollableName } from '../content/rollables';
import { THINGS } from '../content/things';
import { WOUND_TABLES } from '../content/wounds';
import { baseArmour, baseDamage, type Dice, diceText } from '../core/chargen/tables';
import {
  ADJACENT, RUN, WALK, type AttackTactic, type Choice, type DefenceTactic, shieldFromRow, type Fight, type Fighter, type FightItem, type FightRules, type LogLine, PICKUP_REACH, UNTRAINED, attackPool, attackTactics,
  PLEA_SKILLS, acceptYield, between, canAct, defenceOptions, defencePool, loadDiceOf, pleaDifficulty, refuseYield, resolveRound, roleOf,
  seizeInitiative, startFight, weaponOf,
} from '../core/combat';
import { type Style, chooseFor, wantsToYield } from '../core/fightmind';
import { type DamageType, type HitResult, type Injuries, totalFatigue, unhurt } from '../core/damage';
import type { MotionAct } from '../core/world3d/motion';
import { DIFFICULTY_RULES } from '../core/difficulty';
import type { Roll } from '../core/dice';
import type { Hero } from '../core/hero';
import { type RolledSheet, sheetDice } from '../core/npcsheet';
import { Rng } from '../core/rng';
import { thingName } from '../core/world3d/actions';
import type { SpikeWorld } from '../engine3d/world';
import { t } from '../i18n';
import { showRolls } from '../ui/dice';
import { loadSettings } from '../ui/settings';
import { type ConditionSheet, effectText, fatigueShare, fatigueWord, harmBits, partName, poolText } from './condition';
import { type SeenHit, bodyOutline } from './outline';

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * A fight on the page (plan B8a): the hero against someone of the map, played in rounds by the rules
 * (`core/combat.ts`). The world stops; each round the hero makes one choice (close in, pick something up, a tactic to
 * strike or defend, retreat), the other side chooses by their fighting style (`content/combat/styles.ts`), the round
 * is resolved and shown step by step: who hit (only your own dice are thrown; theirs are written), then where and
 * how much, then the extra damage and any serious wound. The world plays it out: walking, swings, a sword falling on
 * the sand, someone going down. To the death (Q46). When one side is left, OK ends the fight; fatigue then comes back
 * with time (Q49), and the knocked out lie there until it has.
 *
 * The layout (B8g F2, design `director/design/fight-feel.md`): your column with every move in two groups, Offensive
 * (a tactic, retreat) and Defensive (parry, block, dodge × standard, careful, counter; nothing picked for you), the
 * group you don't have this round greyed with why; the foe's column mirrored, their move lit when you have the upper
 * hand and a ? when you don't; the Move row (walk, run, pick up, draw, and the rest); the view side-on to the fight.
 *
 * Fast mode (F3, the default; the setting `fight`): each exchange plays out at once, the strike met by a parry, block
 * or dodge timed to its contact, or a flinch, a stagger, a fall; what it did floats up over whoever was hit (a number
 * on easy, a word otherwise, Q50) and lands on their body outline. The dice are rolled but not shown: a log line with
 * a die opens them. Dice mode shows every roll step by step.
 */

/** The pools a fight reads from a sheet: every combat skill, dodging, the shield, and the attributes it rolls. */
const FIGHT_IDS = ['Svärd', 'Yxa', 'Dolk', 'Spjut', 'Stav', 'Kedjevapen', 'Klubba', 'Slagsmål', 'Sköld', 'Undvika', 'attr:Reaktion', 'attr:Livskraft', 'attr:Förflyttning', 'attr:Kroppsbyggnad'];
/** An improvised weapon: anything held that is no weapon (a stool swung). */
const IMPROVISED = 'Tillhygge';
/** How far round the fight weapons lying about count as within reach of it, metres. */
const GROUND_REACH = 25;
/** Packed earth: the ground's difficulty to run on (a map's ground per spot comes later). */
const GROUND = 6;

export interface FightUI {
  /** Start a fight with someone of the map. */
  start(foe: string): void;
  readonly on: boolean;
  /** At load: if the hero died, say so. */
  check(): void;
  /** A tap on the world during the fight: a thing (its id) and/or the ground there. Plans the round's move. */
  tap(thing: string | null, ground: { x: number; z: number } | null): void;
}

const rowOf = (sv: string) => WEAPONS.find((w) => w.sv === sv);
/** The weapon row of a kind of thing held (an improvised one for anything else). */
const rowOfKind = (kind: string) => rowOf(THINGS.has(kind) ? THINGS.get(kind).weapon ?? IMPROVISED : IMPROVISED);
/** The kind of thing that is this row (a sword in the world for the sheet's sword). */
const kindOfRow = (sv: string): string | null => THINGS.placeable.find((k) => THINGS.get(k).weapon === sv) ?? null;
const units = (d: Dice) => d.n * 4 + d.mod;
/** The kind of thing that is this shield row (a buckler in the world for the sheet's buckler). */
const kindOfShield = (sv: string): string | null => THINGS.placeable.find((k) => THINGS.get(k).shield === sv) ?? null;
/** A thing as the fight sees it: a shield's block, else a weapon's row (anything else held is an improvised weapon). */
function itemOf(id: string, kind: string): FightItem | null {
  const sv = THINGS.has(kind) ? THINGS.get(kind).shield : undefined;
  const sh = sv ? SHIELDS.find((s) => s.sv === sv) : undefined;
  if (sh) return { id, shield: shieldFromRow(sh) };
  const row = rowOfKind(kind);
  return row ? { id, weapon: row } : null;
}
/** Is the hand for this item free (the left for a shield, the right for anything else)? */
const slotFree = (f: Fighter, item: FightItem): boolean => (item.shield ? !f.shield : !f.weapon);

export function makeFight(world: () => SpikeWorld, hero: Hero, notify: (text: string) => void, save: () => void, newGame: () => void, condition: ConditionSheet): FightUI {
  const el = document.getElementById('fight')!;
  const headEl = el.querySelector<HTMLElement>('.head')!, usEl = el.querySelector<HTMLElement>('.us .card')!, themEl = el.querySelector<HTMLElement>('.them .card')!;
  const usMoves = el.querySelector<HTMLElement>('.us .moves')!, themMoves = el.querySelector<HTMLElement>('.them .moves')!;
  usMoves.classList.add('mine');
  const usCol = el.querySelector<HTMLElement>('.us')!, tabsEl = el.querySelector<HTMLElement>('.tabs')!, paneEl = el.querySelector<HTMLElement>('.pane')!;
  const intentEl = el.querySelector<HTMLButtonElement>('.intent-icon')!;
  // A tap on the foe's bubble unfolds their whole column under their card (a phone); again folds it.
  intentEl.addEventListener('click', () => el.classList.toggle('show-foe'));
  themMoves.addEventListener('click', () => el.classList.remove('show-foe'));
  /** The computer layout (columns at both sides): a wide screen, or a phone held sideways. */
  const WIDE = matchMedia('(min-width: 640px) and (min-aspect-ratio: 1/1)');
  /**
   * Tap to pick, tap again to act (B8g F5): on a touch screen a mis-tap would cost a round. `?taps=2` or `?taps=1`
   * forces it (for testing on a computer).
   */
  const taps = new URLSearchParams(location.search).get('taps');
  const twoTaps = (): boolean => (taps ? taps === '2' : matchMedia('(pointer: coarse)').matches);
  /** The move picked and waiting for its second tap (and what the timer would take): its key, and what it does. */
  let armed: { key: string; go: () => unknown } | null = null;
  /** The phone's tab, and the round and role it was opened for (a new round opens on the role's tab). */
  let tab: 'attack' | 'defend' | 'move' = 'move';
  let tabFor = '';
  /** The moves you can take now (filled as they are drawn), by key: what the timer can take. */
  let avail = new Map<string, () => unknown>();
  /** The move you took last round (its key): the timer starts ringing that one. */
  let lastMove: string | null = null;
  /** The pick timer (F6; seconds by difficulty in `content/combat/timer.ts`): for which pick, and when it runs out. */
  let timer: { key: string; until: number; total: number } | null = null;
  const timerEl = document.createElement('div');
  timerEl.className = 'timer';
  timerEl.hidden = true;
  const timerBar = document.createElement('i');
  timerEl.appendChild(timerBar);
  el.querySelector('.head')!.after(timerEl);
  const logEl = el.querySelector<HTMLElement>('.log')!, choicesEl = el.querySelector<HTMLElement>('.choices')!;
  const backEl = document.getElementById('fight-back') as HTMLButtonElement;
  backEl.addEventListener('click', () => world().faceFight());
  let fight: Fight | null = null;
  let foeId = '';
  let busy = false;
  /** What the foe declared this round, when the hero has the upper hand and so knows it before choosing. */
  let pending: Choice | null = null;
  /** Where the hero means to go this round (a tapped spot, or a weapon lying there), shown with a mark. */
  let plan: { x: number; z: number; item?: string } | null = null;
  /**
   * Why whoever attacks in the melee has the attack (B8g: the role swaps are shown): they were quicker when blades
   * crossed, they won the last exchange, or they kept it.
   */
  let roleWhy: 'quicker' | 'won' | 'kept' = 'quicker';
  /** The blows each fighter was seen to take this fight (where and of what kind), for the body outlines. */
  let seen: Record<string, SeenHit[]> = {};
  /** Rolls made but not shown (fast mode), waiting to go behind the next log line. */
  let stash: Roll[] = [];
  let lastLine: HTMLElement | null = null;
  const fast = (): boolean => loadSettings().fight === 'fast';

  /**
   * Keep the fighters in the part of the screen the panel leaves free (the director: the panel covered them): on a
   * phone the panel sits at the bottom and the fight above it; on a wide screen it docks at the side.
   */
  function aimView(): void {
    const w = world();
    const canvas = document.getElementById('stage');
    if (!fight || el.hidden || !canvas) return void (w.viewAim = { x: 0, y: 0 });
    const c = canvas.getBoundingClientRect();
    const us = usCol.getBoundingClientRect(), them = el.querySelector('.them')!.getBoundingClientRect(), m = el.querySelector('.mid')!.getBoundingClientRect();
    // Columns at both sides (a wide screen): the gap between them, above the bottom strip. A phone: between the
    // cards in the corners and the sheet.
    const free = WIDE.matches ? { x: (us.right + them.left) / 2, y: (c.top + m.top) / 2 } : { x: c.left + c.width / 2, y: (Math.max(us.bottom, c.top) + m.top) / 2 };
    w.viewAim = { x: ((free.x - c.left) / c.width) * 2 - 1, y: -(((free.y - c.top) / c.height) * 2 - 1) };
  }
  window.addEventListener('resize', () => { layout(); aimView(); });

  /** Your moves go in your column on a wide screen, in the sheet under the tabs on a phone. */
  function layout(): void {
    if (WIDE.matches) { if (usMoves.parentElement !== usCol) usCol.appendChild(usMoves); }
    else if (usMoves.parentElement !== paneEl) paneEl.appendChild(usMoves);
  }

  /** Pick a move: on a touch screen the first tap rings it and the second acts; elsewhere one tap acts. */
  function press(key: string, go: () => unknown): void {
    if (busy) return;
    if (!twoTaps() || armed?.key === key) {
      armed = null;
      timer = null;
      lastMove = key;
      void go();
      return;
    }
    armed = { key, go };
    refresh();
  }

  /** The tabs (a phone): Attack, Defend, Move; a new round opens on the tab for your role; the others greyed. */
  function tabs(): void {
    if (!fight) return;
    const role = roleOf(fight, 'hero');
    const now = `${fight.round}:${role}:${fight.winner}`;
    if (now !== tabFor) {
      tabFor = now;
      tab = fight.winner === null && canAct(fight.fighters[0]) ? (role === 'attacker' ? 'attack' : role === 'defender' ? 'defend' : 'move') : 'move';
    }
    tabsEl.replaceChildren();
    const names = { attack: t('fight.tab.attack', 'Attack'), defend: t('fight.tab.defend', 'Defend'), move: t('fight.tab.move', 'Move') };
    for (const k of ['attack', 'defend', 'move'] as const) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = names[k];
      b.dataset.tab = k;
      b.classList.toggle('on', k === tab);
      b.classList.toggle('off', k !== 'move' && !!offWhy(fight.fighters[0], k, true));
      b.addEventListener('click', () => { tab = k; tabs(); });
      tabsEl.appendChild(b);
    }
    el.classList.remove('tab-attack', 'tab-defend', 'tab-move');
    el.classList.add(`tab-${tab}`);
  }

  /** The foe's move as a word in the bubble over their head (a phone): what they mean to do, or ? */
  function intentBubble(): void {
    if (!fight || !fight.fighters[1] || fight.winner !== null || !canAct(fight.fighters[1])) return void (intentEl.hidden = true);
    const foe = fight.fighters[1], me = fight.fighters[0];
    intentEl.hidden = false;
    intentEl.classList.toggle('unknown', !pending);
    if (!pending) return void (intentEl.textContent = '?');
    const key = litKey(foe, me, pending);
    const [k, a, b] = key?.split(':') ?? [];
    intentEl.textContent = k === 'atk' ? `⚔ ${ATTACKS[a as AttackTactic][0]}`
      : k === 'def' ? `🛡 ${cap(WAYS[a as 'parry'])} · ${DEFENCES[b as DefenceTactic][0]}`
        : key === 'retreat' ? t('fight.bubble.retreat', '↩ Retreat')
          : pending.plead ? t('fight.bubble.plead', 'Yield?')
            : pending.move ? (pending.move.run ? t('fight.bubble.run', 'Runs') : t('fight.bubble.close', 'Closes in'))
              : pending.pickUp || pending.draw ? t('fight.bubble.arm', 'Arms') : t('fight.bubble.hold', 'Holds');
  }

  /** Keep the bubble over the foe's head while the fight lasts (they move, the view turns). */
  function trackBubble(): void {
    if (!fight || el.hidden) return;
    const at = fight.fighters[1] ? world().screenOf(fight.fighters[1].id) : null;
    if (at && !intentEl.hidden) {
      intentEl.style.left = `${at.x * 100}%`;
      intentEl.style.top = `${at.y * 100}%`;
    }
    requestAnimationFrame(trackBubble);
  }

  /** A tap on the world: plan to go there (free), or to the weapon tapped; in reach of a foe, only breaking off moves you. */
  function tap(thing: string | null, ground: { x: number; z: number } | null): void {
    if (!fight || busy || fight.winner !== null) return;
    world().recentre();
    const item = thing ? fight.ground.find((g) => g.id === thing) : undefined;
    if (roleOf(fight, 'hero') !== 'free' && !(item && within(item, PICKUP_REACH))) {
      log(t('fight.noroam', 'In reach of {who} you can’t walk off: break off (retreat) first.', { who: nameOf(foeId) }), 'info');
      return;
    }
    plan = item ? { x: item.x, z: item.z, item: item.id } : ground ? { ...ground } : null;
    world().markSpot(plan);
    refresh();
  }

  /** Is a spot within so many metres of the hero? */
  const within = (p: { x: number; z: number }, m: number): boolean => !!fight && Math.hypot(p.x - fight.fighters[0].x, p.z - fight.fighters[0].z) <= m;
  const rng = Rng.fromSeed(`fight:${Date.now()}`);
  const rules: FightRules = { tables: WOUND_TABLES, ground: GROUND };
  const names = new Map<string, string>();
  const nameOf = (id: string) => names.get(id) ?? id;
  const level = () => DIFFICULTY_RULES[loadSettings().difficulty];
  const vitalityOf = (f: Fighter): Dice => f.pools['attr:Livskraft'] ?? { n: 2, mod: 0 };
  /** What a weapon in the fight is called (its kind's name). */
  const kindName = (id: string): string => {
    const k = world().thingKind(id);
    return k && THINGS.has(k) ? thingName(THINGS.get(k)) : t('fight.aweapon', 'weapon');
  };

  usEl.addEventListener('click', () => { if (fight) condition.open(fight.fighters[0].injuries, vitalityOf(fight.fighters[0])); });
  themEl.addEventListener('click', () => {
    if (fight && fight.fighters[1] && level().foeExact) condition.open(fight.fighters[1].injuries, vitalityOf(fight.fighters[1]), nameOf(foeId));
  });

  function log(text: string, kind: 'you' | 'they' | 'info' | 'good' | 'bad' = 'info'): void {
    const p = document.createElement('p');
    p.className = kind;
    p.textContent = text;
    logEl.appendChild(p);
    lastLine = p;
    flushRolls();
    logEl.scrollTop = logEl.scrollHeight;
  }

  /** Put the rolls made but not shown behind the last log line: a die on it, a tap shows them. */
  function flushRolls(): void {
    if (!stash.length || !lastLine) return;
    const rolls = stash;
    stash = [];
    const p = lastLine;
    if (!p.classList.contains('rolls')) {
      p.classList.add('rolls');
      p.dataset.rolls = '[]';
      p.addEventListener('click', () => void showRolls(JSON.parse(p.dataset.rolls!) as Roll[]));
    }
    p.dataset.rolls = JSON.stringify([...(JSON.parse(p.dataset.rolls!) as Roll[]), ...rolls]);
  }

  /** The hero as a fighter: their sheet, what they hold, no armour yet (the hero has none in the world). */
  function heroFighter(w: SpikeWorld, at: { x: number; z: number }): Fighter {
    const phys = hero.dice['attr:Kroppsbyggnad'] ?? { n: 2, mod: 0 };
    const held = w.wieldedBy('hero');
    const row = held ? rowOfKind(held.kind) : undefined;
    const sh = w.shieldOf('hero');
    return {
      id: 'hero', side: 0, x: at.x, z: at.z, pools: Object.fromEntries(FIGHT_IDS.map((id) => [id, hero.dice[id] ?? { n: 0, mod: 0 }])),
      physique: phys, baseDamage: baseDamage(units(phys)), baseArmour: baseArmour(units(phys)), armour: { cut: 0, crush: 0, thrust: 0 }, loadDice: 0,
      weapon: held && row ? { id: held.id, weapon: row } : null, shield: sh ? itemOf(sh.id, sh.kind) : null, injuries: w.injuriesOf('hero') ?? unhurt(), drew: false,
      belt: w.stowed.flatMap((s) => { const it = itemOf(s.id, s.kind); return it && it.weapon?.sv !== IMPROVISED ? [it] : []; }),
    };
  }

  /** Someone of the map as a fighter: their own sheet, their weapon drawn (a thing from now on), their armour. */
  function personFighter(w: SpikeWorld, id: string, sheet: RolledSheet | null, at: { x: number; z: number }): Fighter {
    const dice = (s: string): Dice => (sheet ? sheetDice(sheet, s) : { n: 0, mod: 0 });
    const phys = dice('attr:Kroppsbyggnad');
    const own = sheet?.gear.weapon ? rowOf(sheet.gear.weapon) : undefined;
    const kind = own ? kindOfRow(own.sv) : null;
    const held = w.wieldedBy(id) ?? (kind ? (w.drawWeapon(id, kind), w.wieldedBy(id)) : null);
    const row = held ? rowOfKind(held.kind) : undefined;
    const armour = sheet?.gear.armour ? ARMOUR.find((a) => a.sv === sheet.gear.armour) : undefined;
    // Their own shield, if their sheet has one and their weapon leaves a hand for it.
    const shieldKind = sheet?.gear.shield ? kindOfShield(sheet.gear.shield) : null;
    const sh = w.shieldOf(id) ?? (shieldKind && THINGS.get(held?.kind ?? '')?.hands !== 2 ? (w.drawShield(id, shieldKind), w.shieldOf(id)) : null);
    return {
      id, side: 1, x: at.x, z: at.z, pools: Object.fromEntries(FIGHT_IDS.map((s) => [s, dice(s)])),
      physique: phys, baseDamage: baseDamage(units(phys)), baseArmour: baseArmour(units(phys)),
      armour: armour ? { cut: armour.h, crush: armour.k, thrust: armour.s } : { cut: 0, crush: 0, thrust: 0 }, loadDice: loadDiceOf(armour?.load ?? 0),
      weapon: held && row ? { id: held.id, weapon: row } : null, shield: sh ? itemOf(sh.id, sh.kind) : null, injuries: w.injuriesOf(id) ?? unhurt(), drew: false,
    };
  }

  /** What lies about the fight: weapons on the ground near it, as the rules see them. */
  function groundNear(w: SpikeWorld, x: number, z: number): Fight['ground'] {
    return w.weaponsLying(x, z, GROUND_REACH).flatMap((g) => {
      const it = itemOf(g.id, g.kind);
      return it ? [{ ...it, x: g.x, z: g.z } satisfies FightItem & { x: number; z: number }] : [];
    });
  }

  /**
   * One side's card: name and weapon, a fatigue bar, and how they are. Your own in numbers (on hard your fatigue
   * only in words); the foe's in numbers on easy, in words otherwise (the director's notes on the first fight).
   */
  function card(box: HTMLElement, f: Fighter, name: string, own: boolean): void {
    const lv = level();
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
    const weapon = (f.weapon ? kindName(f.weapon.id) : t('fight.bare', 'bare hands')) + (f.shield ? t('fight.andshield', ' and {shield}', { shield: kindName(f.shield.id) }) : '');
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
      bits.push(exactFatigue ? t('fight.fatigue', 'fatigue {n}', { n: totalFatigue(i) }) : fatigueWord(i, vitalityOf(f)));
      bits.push(...harmBits(i, exactHarm));
    }
    how.textContent = bits.join(' · ');
    // The body outline: your own wounds exactly; the foe's on easy, else only the blows you saw land. Fatigue is the
    // bar beside it (full: where most fail the shock roll).
    const outline = bodyOutline(i, seen[f.id] ?? [], exactHarm, fatigueShare(i, vitalityOf(f)));
    box.append(outline, top, how);
  }

  function refresh(): void {
    if (!fight) return;
    avail = new Map();
    const me = fight.fighters[0], foe = fight.fighters[1];
    const role = roleOf(fight, 'hero');
    const d = between(fight, 'hero', foeId);
    headEl.textContent = t('fight.head', 'Round {r} · {d} m · {role}', {
      r: fight.round, d: d.toFixed(1),
      role: fight.winner !== null ? t('fight.over', 'over') : role === 'attacker' ? t('fight.attacking', 'you attack') : role === 'defender' ? t('fight.defending', 'you defend') : t('fight.free', 'not in reach'),
    });
    layout();
    card(usEl, me, t('fight.You', 'You'), true);
    card(themEl, foe, Name(foeId), false);
    moves(usMoves, me, foe, true);
    moves(themMoves, foe, me, false);
    tabs();
    intentBubble();
    choicesEl.replaceChildren();
    const h = document.createElement('h4');
    h.textContent = t('fight.g.move', 'Move');
    choicesEl.appendChild(h);
    if (fight.winner === null && !plan && roleOf(fight, 'hero') === 'free' && canAct(fight.fighters[0]) && !busy) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = t('fight.taphint', 'Tap the ground to go there, or a weapon to go to it.');
      choicesEl.appendChild(p);
    }
    for (const c of busy ? [] : choices()) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = c.label;
      b.dataset.move = c.label;
      b.classList.toggle('armed', armed?.key === c.label);
      b.addEventListener('click', () => press(c.label, c.go));
      avail.set(c.label, c.go);
      choicesEl.appendChild(b);
    }
    logEl.scrollTop = logEl.scrollHeight;
    pickTimer();
    aimView();
  }

  /** Can the hero pick a move now (their turn, nothing playing)? */
  const canPick = (): boolean => !!fight && !busy && fight.winner === null && canAct(fight.fighters[0]);

  /**
   * The pick timer (F6): on a difficulty with seconds for it, each pick runs against the clock (a bar under the
   * round). The move ringed is what it takes when it runs out: last round's if you can take it again, else a plain
   * one for your role (a standard blow, the best standard defence, holding your ground). It stops while anything
   * plays or dice roll, and a new pick starts it afresh.
   */
  function pickTimer(): void {
    const secs = PICK_SECONDS[loadSettings().difficulty];
    if (!fight || !secs || !canPick()) {
      timer = null;
      timerEl.hidden = true;
      return;
    }
    const me = fight.fighters[0], foe = fight.fighters[1];
    const key = `${fight.round}:${fight.midRound ?? ''}:${roleOf(fight, 'hero')}`;
    if (timer?.key !== key) {
      timer = { key, until: performance.now() + secs * 1000, total: secs * 1000 };
      requestAnimationFrame(tick);
    }
    if (!armed || !avail.has(armed.key)) {
      const role = roleOf(fight, 'hero');
      const plain = role === 'attacker' ? 'atk:standard'
        : role === 'defender' && foe ? `def:${defencePool(me, weaponOf(foe), 'standard').how}:standard`
          : t('fight.hold', 'Hold your ground');
      const k = [lastMove, plain].find((x) => x && avail.has(x)) ?? avail.keys().next().value;
      armed = k ? { key: k, go: avail.get(k)! } : null;
    } else armed.go = avail.get(armed.key)!;
    for (const b of el.querySelectorAll<HTMLElement>('[data-move]')) b.classList.toggle('armed', !!armed && b.dataset.move === armed.key && !b.closest('.them'));
    timerEl.hidden = false;
  }

  /** The timer running down; out of time, the ringed move is taken. */
  function tick(): void {
    if (!timer) return void (timerEl.hidden = true);
    if (!canPick()) return void (timer = null);
    const left = timer.until - performance.now();
    timerBar.style.width = `${Math.max(0, (left / timer.total) * 100)}%`;
    timerEl.classList.toggle('late', left < 3000);
    if (left > 0) return void requestAnimationFrame(tick);
    const a = armed;
    timer = null;
    armed = null;
    if (a) {
      lastMove = a.key;
      log(t('fight.timeup', 'Out of time.'), 'info');
      void a.go();
    }
  }

  /** The tactics' names and what each does, for the buttons. */
  const ATTACKS: Record<AttackTactic, [name: string, does: string]> = {
    standard: [t('fight.tac.std', 'Standard'), ''],
    quick: [t('fight.tac.quickN', 'Quick'), t('fight.tac.quickD', '+1D6, −1D6 dmg, +1 fatigue')],
    powerful: [t('fight.tac.powerN', 'Powerful'), t('fight.tac.powerD', '−1D6, +2D6 dmg, +2 fatigue')],
  };
  const DEFENCES: Record<DefenceTactic, [name: string, does: string]> = {
    standard: [t('fight.tac.std', 'Standard'), ''],
    defensive: [t('fight.tac.careN', 'Careful'), t('fight.tac.careD', '+1D6, +1 fatigue')],
    counter: [t('fight.tac.counterN', 'Counter'), t('fight.tac.counterD', '−1D6, attack next, +1 fatigue')],
  };
  const WAYS: Record<'parry' | 'block' | 'dodge', string> = { parry: t('fight.how.parry', 'parry'), block: t('fight.how.block', 'block'), dodge: t('fight.how.dodge', 'dodge') };

  /**
   * Why a group is greyed for someone this round, or null if it is theirs to use: over, can't act, out of reach, or
   * the other role (and, for the hero, why they have it: quicker when blades crossed, won the last exchange, kept it).
   */
  function offWhy(f: Fighter, group: 'attack' | 'defend', mine: boolean): string | null {
    if (!fight) return '';
    if (fight.winner !== null) return t('fight.why.over', 'The fight is over.');
    if (!canAct(f)) return mine ? t('fight.why.cant', 'You can’t fight now.') : t('fight.why.cantthey', 'They can’t fight now.');
    const role = roleOf(fight, f.id);
    if (role === 'free') return mine ? t('fight.why.free', 'Not in reach: close in first, or wait for them.') : t('fight.why.freethey', 'Not in reach.');
    if ((group === 'attack') === (role === 'attacker')) return null;
    if (!mine) return role === 'attacker' ? t('fight.why.theyattack', 'They’re attacking.') : t('fight.why.theydefend', 'They’re defending.');
    const why = role === 'attacker'
      ? { quicker: t('fight.why.quicker', 'you were quicker when blades crossed'), won: t('fight.why.won', 'you won the last exchange'), kept: t('fight.why.kept', 'you kept the attack') }[roleWhy]
      : { quicker: t('fight.why.slower', 'they were quicker when blades crossed'), won: t('fight.why.lost', 'they won the last exchange'), kept: t('fight.why.theykept', 'they kept the attack') }[roleWhy];
    return role === 'attacker' ? t('fight.why.attacking', 'You’re attacking: {why}.', { why }) : t('fight.why.defending', 'You’re defending: {why}.', { why });
  }

  /**
   * One side's moves, always all shown: Offensive (each tactic with its pool, retreat) and Defensive (every way to
   * defend × every tactic, with its pool; dodging can't counter). Yours act on a tap; the foe's are the same, mirrored,
   * never tappable: their pools only on easy, their chosen move lit when you have the upper hand, else a ?.
   */
  function moves(box: HTMLElement, f: Fighter, other: Fighter, mine: boolean): void {
    if (!fight) return;
    box.replaceChildren();
    const lv = level();
    const open = mine || lv.foeExact;
    const known = !mine && pending && fight.winner === null ? pending : null;
    const lit = known ? litKey(f, other, known) : null;
    if (!mine) {
      const gist = document.createElement('p');
      gist.className = 'gist';
      const acts = fight.winner === null && canAct(f);
      if (known) gist.textContent = t('fight.intent', '{who} means to {what}.', { who: Name(f.id), what: intentOf(f.id, known) });
      else if (acts) {
        gist.classList.add('unknown');
        gist.textContent = fight.upper === 1
          ? t('fight.unknown.slower', '? {who} was quicker: they’ll see what you do.', { who: Name(f.id) })
          : t('fight.unknown', '? You don’t know what {who} will do.', { who: Name(f.id) });
      } else gist.hidden = true;
      box.appendChild(gist);
    }
    const cant = !mine || busy || !canAct(f) || fight.winner !== null;
    const button = (label: string, small: string, key: string, go: (() => void) | null): HTMLButtonElement => {
      const b = document.createElement('button');
      b.type = 'button';
      b.append(label);
      if (small) {
        const s = document.createElement('small');
        s.textContent = small;
        b.appendChild(s);
      }
      b.dataset.move = key;
      b.classList.toggle('lit', key === lit);
      b.classList.toggle('armed', mine && armed?.key === key);
      b.disabled = cant || !go;
      if (go && !cant) {
        b.addEventListener('click', () => press(key, go));
        avail.set(key, go);
      }
      return b;
    };
    const group = (kind: 'attack' | 'defend', title: string): HTMLElement => {
      const g = document.createElement('div');
      g.className = `group ${kind}`;
      const h = document.createElement('h4');
      h.textContent = title;
      g.appendChild(h);
      const why = offWhy(f, kind, mine);
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
    const atkOn = !offWhy(f, 'attack', mine);
    const ag = group('attack', t('fight.g.attack', 'Offensive'));
    const can = attackTactics(f);
    for (const tac of ['standard', 'quick', 'powerful'] as AttackTactic[]) {
      const [name, does] = ATTACKS[tac];
      const dice = open ? ` ${diceText(attackPool(f, tac))}` : '';
      ag.appendChild(button(`${name}${dice}`, does, `atk:${tac}`, atkOn && can.includes(tac) ? () => void play({ attack: tac }) : null));
    }
    ag.appendChild(button(t('fight.retreatN', 'Retreat'), t('fight.retreatD', 'break off, 5 m back'), 'retreat', atkOn && fight.melee ? () => void play({ retreat: true }) : null));

    // Defensive: a row for each way to defend, a column for each tactic.
    const defOn = !offWhy(f, 'defend', mine);
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
        dg.appendChild(button(open ? diceText(o.dice) : cap(WAYS[how]), '', `def:${how}:${tac}`, defOn ? () => void play({ defend: tac, defendWith: how }) : null));
      }
    }
    if (mine && defOn) {
      const p = document.createElement('p');
      p.className = 'why note';
      p.textContent = t('fight.tactics', 'Careful: +1D6, +1 fatigue. Counter: −1D6, +1 fatigue; hold them off and you attack next.');
      dg.parentElement!.appendChild(p);
    }
  }

  /** Which of someone's buttons their declared choice is (`atk:quick`, `def:parry:counter`, `retreat`), or null. */
  function litKey(f: Fighter, other: Fighter, c: Choice): string | null {
    const role = roleOf(fight!, f.id);
    if (role === 'attacker') return c.retreat ? 'retreat' : c.mercy || c.plead ? null : `atk:${c.attack ?? 'standard'}`;
    if (role === 'defender') {
      const tac = c.defend ?? 'standard';
      return `def:${defencePool(f, weaponOf(other), tac, c.defendWith).how}:${tac}`;
    }
    return null;
  }

  /** How the foe fights: their own style (the map's `fights`), else their kind's. */
  const foeStyle = (): Style => {
    const p = world().talkPerson(foeId);
    return styleFor(p?.tags ?? [], p?.fights);
  };

  /**
   * What someone means to do this round, in words ("strike hard", "pick up the sword and then close in"), as the hero
   * reads it when they have the upper hand: the side action and, by their role, the tactic.
   */
  function intentOf(id: string, c: Choice): string {
    const parts: string[] = [];
    if (c.plead) return t('fight.means.plead', 'ask to yield');
    if (c.mercy) return t('fight.means.mercy', 'give the killing stroke');
    if (c.pickUp) parts.push(t('fight.means.pickup', 'pick up the {thing}', { thing: kindName(c.pickUp) }));
    const role = roleOf(fight!, id);
    if (role === 'attacker') {
      if (c.retreat) parts.push(t('fight.means.retreat', 'break off'));
      else parts.push({ standard: t('fight.means.strike', 'strike'), quick: t('fight.means.quick', 'strike quickly'), powerful: t('fight.means.powerful', 'strike with all their strength') }[c.attack ?? 'standard']);
    } else if (role === 'defender') {
      parts.push({ standard: t('fight.means.defend', 'defend'), defensive: t('fight.means.careful', 'defend carefully'), counter: t('fight.means.counter', 'wait for a chance to counter') }[c.defend ?? 'standard']);
    } else if (c.move) parts.push(c.move.run ? t('fight.means.run', 'run at you') : t('fight.means.close', 'close in'));
    else if (!c.pickUp) parts.push(t('fight.means.hold', 'hold their ground'));
    return parts.join(t('fight.means.then', ' and then '));
  }

  /**
   * The start of a round (or of its second half, once blades crossed): who has the upper hand (a Reaktion roll if
   * free and near; the attacker in a melee). With it, the hero sees what the foe means to do before choosing; without
   * it, the foe will choose knowing the hero's choice (the director: declared in reverse order).
   */
  async function beginRound(): Promise<void> {
    if (!fight) return;
    pending = null;
    if (fight.winner === null && canAct(fight.fighters[0])) {
      busy = true;
      const r = seizeInitiative(fight, rng);
      fight = r.fight;
      await show(r.log, world());
      if (fight.upper === 0) pending = chooseFor(fight, foeId, foeStyle(), FIGHT_MINDS, rng);
      busy = false;
    }
    refresh();
  }

  /** The Move row: what the hero can do besides strike or defend, one button each, the round's whole choice in a tap. */
  function choices(): { label: string; go: () => Promise<void> | void }[] {
    if (!fight) return [];
    const me = fight.fighters[0], foe = fight.fighters[1];
    const out: { label: string; go: () => Promise<void> | void }[] = [];
    if (me.injuries.dead) return [{ label: t('fight.newgame', 'New game'), go: newGame }];
    if (fight.winner !== null) {
      // No one left to fight: OK ends it (Q49). The winner may finish someone down first.
      if (fight.winner === 0 && !foe.injuries.dead && (foe.injuries.out || foe.injuries.dying)) {
        out.push({ label: t('fight.finish', 'Finish them'), go: () => play({ mercy: foeId, ...(between(fight!, 'hero', foeId) > ADJACENT ? { move: { x: foe.x, z: foe.z } } : {}) }) });
      }
      out.push({ label: t('fight.ok', 'OK'), go: end });
      return out;
    }
    if (!canAct(me)) return [{ label: t('fight.wait', 'Lie still…'), go: () => play({}) }];
    // They offered to yield: accept, or choose anything else and fight on.
    if (fight.offer === foeId) out.push({ label: t('fight.accept', 'Accept their surrender'), go: accept });
    const role = roleOf(fight, 'hero');
    // Something to pick up within reach (only empty-handed: one thing at a time).
    const near = fight.ground.filter((g) => slotFree(me, g) && Math.hypot(g.x - me.x, g.z - me.z) <= PICKUP_REACH);
    const pick = near.map((g) => ({ label: t('fight.pickup', 'Pick up the {name}', { name: kindName(g.id) }), go: () => play({ pickUp: g.id, defend: 'standard' }) }));
    // Your own weapons, carried at the belt or on the back: draw one (the side action; −1D6 on the next roll unless quick to draw).
    pick.unshift(...(me.belt ?? []).filter((b) => slotFree(me, b)).map((b) => ({ label: t('fight.draw', 'Draw your {name}', { name: kindName(b.id) }), go: () => play({ draw: b.id, defend: 'standard' }) })));
    if (role === 'free') {
      out.push(...planned());
      // Weapons lying about, not yet in reach: go to one (empty-handed only, as picking up is).
      if (!me.weapon && !plan) {
        const lying = fight.ground.filter((g) => g.weapon && !within(g, PICKUP_REACH)).sort((a, b) => Math.hypot(a.x - me.x, a.z - me.z) - Math.hypot(b.x - me.x, b.z - me.z)).slice(0, 2);
        for (const g of lying) out.push(...goTo({ x: g.x, z: g.z, item: g.id }));
      }
      const d = between(fight, 'hero', foeId);
      const k = Math.max(0, (d - ADJACENT * 0.75) / d);
      const to = { x: me.x + (foe.x - me.x) * k, z: me.z + (foe.z - me.z) * k };
      out.push({ label: t('fight.closein', 'Close in (walk up to 5 m)'), go: () => play({ move: to }) });
      if (d > 5 + ADJACENT) out.push({ label: t('fight.runin', 'Run in (up to 10 m, a roll)'), go: () => play({ move: { ...to, run: true } }) });
      out.push(...pick);
      out.push({ label: t('fight.hold', 'Hold your ground'), go: () => play({}) });
      if (d > 12) out.push({ label: t('fight.flee', 'Get away (end the fight)'), go: end });
    } else {
      // In a melee the blow or the defence is in the columns; here only the side actions and asking to yield.
      out.push(...pick);
      out.push(plea(role === 'defender'));
    }
    return out;
  }

  /** The choices for the tapped plan: pick up the weapon if in reach, else walk (5 m) or run (10 m, a roll) there. */
  function planned(): { label: string; go: () => Promise<void> | void }[] {
    if (!fight || !plan) return [];
    const me = fight.fighters[0];
    if (plan.item && within(plan, PICKUP_REACH)) {
      const id = plan.item;
      const item = fight.ground.find((g) => g.id === id);
      return !item || !slotFree(me, item) ? [] : [{ label: t('fight.pickup', 'Pick up the {name}', { name: kindName(id) }), go: () => play({ pickUp: id, defend: 'standard' }) }];
    }
    return goTo(plan);
  }

  /** Walk or run towards a spot (or a weapon lying there: stop beside it). */
  function goTo(p: { x: number; z: number; item?: string }): { label: string; go: () => Promise<void> }[] {
    const me = fight!.fighters[0];
    const d = Math.hypot(p.x - me.x, p.z - me.z);
    const stop = p.item ? Math.max(0, d - 1) : d; // beside a weapon, not on it
    const to = d > 0 ? { x: me.x + ((p.x - me.x) * stop) / d, z: me.z + ((p.z - me.z) * stop) / d } : { x: me.x, z: me.z };
    const what = p.item ? t('fight.tothe', 'to the {name}', { name: kindName(p.item) }) : t('fight.there', 'there');
    const out = [{
      label: stop <= WALK
        ? t('fight.walkto', 'Walk {what} ({m} m)', { what, m: stop.toFixed(1) })
        : t('fight.walktoward', 'Walk {what} (5 of {m} m)', { what, m: stop.toFixed(1) }),
      go: () => play({ move: to }),
    }];
    if (stop > WALK) out.push({ label: t('fight.runto', 'Run {what} ({m} m, a roll)', { what, m: Math.min(stop, RUN).toFixed(1) }), go: () => play({ move: { ...to, run: true } }) });
    return out;
  }

  /**
   * Beg to yield (the director: a way to give up, "some type of argue"): the best of arguing and charm against how
   * hard the foe is to talk down (their style, eased if the fight has gone your way). On easy the difficulty shows.
   */
  function plea(defending: boolean): { label: string; go: () => Promise<void> } {
    const style = foeStyle();
    const best = PLEA_SKILLS.map((s) => ({ s, d: hero.dice[s] ?? { n: 0, mod: 0 } })).reduce((a, b) => (units(b.d) > units(a.d) ? b : a));
    const dice = best.d.n > 0 ? best.d : { n: 1, mod: 0 };
    const difficulty = pleaDifficulty(fight!, 'hero', style, world().yieldedTo(foeId));
    const easy = level().foeExact;
    const label = t('fight.plead', 'Ask to yield ({skill} {dice}{vs})', { skill: rollableName(best.s), dice: diceText(dice), vs: easy ? t('fight.pleavs', ' against {d}', { d: difficulty }) : '' });
    return { label, go: () => play({ plead: { dice, difficulty }, ...(defending ? { defend: 'standard' as const } : {}) }) };
  }

  /** Wait until the fighters have walked where the round sent them (or a while, at most). */
  async function settle(w: SpikeWorld): Promise<void> {
    for (let k = 0; k < 60 && (w.fighterMoving('hero') || w.fighterMoving(foeId)); k++) await new Promise((r) => setTimeout(r, 100));
  }

  /** Play one round: the hero's choice, the other's by their style; then show it and let the world play it out. */
  async function play(mine: Choice): Promise<void> {
    if (!fight || busy) return;
    busy = true;
    roleWhy = 'kept';
    armed = null;
    el.classList.remove('show-foe');
    refresh();
    const w = world();
    // Where they stand now (the world walked them), as the rules start the round from.
    for (const f of fight.fighters) {
      const at = w.fighterAt(f.id);
      if (at) { f.x = at.x; f.z = at.z; }
    }
    const style = foeStyle();
    // Choosing anything but accepting their offer to yield refuses it: they fight on.
    if (fight.offer) fight = refuseYield(fight, fight.offer);
    // With the upper hand they declared already (`pending`); without it, they choose knowing yours.
    const theirs = pending ?? chooseFor(fight, foeId, style, FIGHT_MINDS, rng, fight.upper === 1 ? mine : undefined);
    pending = null;
    plan = null;
    w.markSpot(null);
    w.recentre();
    // (The round stops when blades cross, so both choose a tactic in their roles: `midRound`.)
    const r = resolveRound(fight, { hero: mine, [foeId]: theirs }, rules, rng, { pauseOnOpen: true });
    fight = r.fight;
    await show(r.log, w);
    for (const f of fight.fighters) w.setInjuries(f.id, f.injuries);
    save();
    busy = false;
    if (fight.midRound) log(t('fight.choose', 'Choose how to strike or defend.'), 'info');
    // Beaten badly enough, they offer to yield (the director: "some type of plead cutoff").
    offerYield(style);
    if (fight.winner !== null && fight.winner !== 0 && fight.fighters[0].injuries.out && !fight.fighters[0].injuries.dead) {
      // They won and you are down: they finish it if their style does, else they leave you be.
      const next = chooseFor(fight, foeId, style, FIGHT_MINDS, rng);
      if (next.mercy || next.move) return play({});
      log(t('fight.spared', '{name} leaves you lying there.', { name: Name(foeId) }), 'bad');
    }
    if (fight.fighters[0].injuries.dead) log(t('fight.youdie', 'You are dead.'), 'bad');
    await beginRound();
  }

  /** If the foe is beaten enough, they offer to yield: the choices then lead with accepting it. */
  function offerYield(style: Style): void {
    if (!fight || !wantsToYield(fight, foeId, style, FIGHT_MINDS, rng)) return;
    fight = { ...fight, offer: foeId };
    log(t('fight.offers', '{who} lowers their weapon and asks to yield.', { who: Name(foeId) }), 'good');
  }

  /** Accept their surrender: they lay down their weapon; the fight is won. */
  async function accept(): Promise<void> {
    if (!fight || busy) return;
    busy = true;
    const r = acceptYield(fight, foeId, rng);
    fight = r.fight;
    await show(r.log, world());
    log(t('fight.accepted', 'You let {who} yield.', { who: Name(foeId) }), 'info');
    save();
    busy = false;
    refresh();
  }

  /** A line about someone, said one way of the hero ("You close in.") and another of anyone else ("Arruns closes in."). */
  const of = (who: string, you: [key: string, text: string], they: [key: string, text: string], vars: Record<string, string | number> = {}): string =>
    who === 'hero' ? t(you[0], you[1], vars) : t(they[0], they[1], { who: Name(who), ...vars });
  /** A name to start a line or a label with. */
  const Name = (id: string): string => { const n = nameOf(id); return n.charAt(0).toUpperCase() + n.slice(1); };
  /** Whose: "your", "Arruns's". */
  const whose = (id: string): string => (id === 'hero' ? t('fight.your', 'your') : t('fight.whose', '{who}’s', { who: Name(id) }));
  /** Show rolls, throwing only the hero's (`mine[i]`); the others are written beside them. */
  const reveal = (rolls: Roll[], mine: boolean[], notes: string[] = []): Promise<void> => {
    if (fast()) {
      stash.push(...rolls);
      return Promise.resolve();
    }
    return showRolls(rolls, { unthrown: mine.flatMap((m, i) => (m ? [] : [i])), notes });
  };
  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  /** What a blow did, in a word or two (normal and hard; Q50): by how bad it was and its kind of damage. */
  function hitWord(r: HitResult, type: DamageType): string {
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

  /** Words or a number rising slowly over someone and fading (the old-game way): red for a hit, pale for a miss. */
  function float(id: string, text: string, kind: 'hit' | 'miss', sub = ''): void {
    const stage = document.getElementById('stage');
    const at = world().screenOf(id);
    if (!stage || !at) return;
    const f = document.createElement('div');
    f.className = `fight-float ${kind}`;
    f.textContent = text;
    if (sub) {
      const s = document.createElement('small');
      s.textContent = sub;
      f.appendChild(s);
    }
    f.style.left = `${at.x * 100}%`;
    f.style.top = `${at.y * 100}%`;
    stage.appendChild(f);
    setTimeout(() => f.remove(), 1900);
  }

  /**
   * One exchange played out: the strike; the defender's parry, block or dodge timed so its contact meets the blow, or
   * on a hit a flinch (a stagger when it hurt badly; going down is the fall, from their injuries). At the contact a
   * miss floats up; with `landed` (fast mode) what the hit did floats up and lands on their outline too (in dice mode
   * that waits for the where and damage rolls). Then a moment to take it in.
   */
  async function exchange(l: Extract<LogLine, { k: 'attack' }>, landed: boolean): Promise<void> {
    const w = world();
    const hitAt = w.motionTiming(l.who, 'strike')?.contact ?? 0.35;
    w.play(l.who, 'strike');
    const meet: MotionAct | null = !l.hit && l.how !== 'none' ? l.how : null;
    if (meet) {
      const lead = Math.max(0, hitAt - (w.motionTiming(l.target, meet)?.contact ?? 0));
      setTimeout(() => w.play(l.target, meet), lead * 1000);
    }
    await sleep(hitAt * 1000);
    if (!l.hit) float(l.target, t(`fight.verdict.${l.how}`, VERDICT[l.how]), 'miss');
    else if (l.result) {
      const r = l.result;
      if (r.net > 0 && !r.after.out && !r.after.dead) w.play(l.target, r.serious || r.fatigue >= 3 ? 'stagger' : 'flinch');
      if (landed) {
        seeHit(l);
        floatHit(l);
      }
    }
    await sleep(landed || !l.hit ? 1100 : 500);
  }

  /** A blow that got through is seen: it goes on their outline. */
  function seeHit(l: Extract<LogLine, { k: 'attack' }>): void {
    if (!l.hit || !l.result || l.result.net <= 0) return;
    (seen[l.target] ??= []).push({ part: l.result.part, type: l.type ?? 'cut', serious: !!l.result.serious });
    cards();
  }

  /** What a hit did, floating up over them: the damage on easy (and a serious wound under it), else a word (Q50). */
  function floatHit(l: Extract<LogLine, { k: 'attack' }>): void {
    const r = l.result;
    if (!r) return;
    if (level().foeExact) float(l.target, String(Math.max(0, r.net)), 'hit', r.serious ? t('fight.w.serious', 'serious wound') : '');
    else float(l.target, hitWord(r, l.type ?? 'cut'), 'hit');
  }

  /** Both cards drawn again (their outlines, bars and words). */
  function cards(): void {
    if (!fight) return;
    card(usEl, fight.fighters[0], t('fight.You', 'You'), true);
    if (fight.fighters[1]) card(themEl, fight.fighters[1], Name(foeId), false);
  }

  /**
   * A blow. Fast mode: the exchange plays out at once and its rolls go behind the log. Dice mode (B8g F4), one roll a
   * step: the attack (their defence written beside, only your own dice thrown), then the exchange plays out; where it
   * lands (D10), and the blow lands on their outline; the damage, less armour, and it floats up; the serious wound's
   * D10 with the death roll and breaks. The log line for each step is written once its dice have landed.
   */
  async function showAttack(l: Extract<LogLine, { k: 'attack' }>): Promise<void> {
    const lv = level();
    const dice = !fast();
    const atkMine = l.who === 'hero', defMine = l.target === 'hero';
    const openPools = (id: string) => id === 'hero' || lv.foeExact;
    const tactic = l.tactic === 'standard' ? '' : ` (${t(`fight.tac.${l.tactic}`, l.tactic === 'quick' ? 'quick' : 'powerful')})`;
    const atkText = openPools(l.who) ? `${poolText(l.attackWhy)} = ${l.attack.total}` : String(l.attack.total);
    const how = t(`fight.how.${l.how}`, HOW[l.how]);
    const defText = !l.defend ? t('fight.nodefence', 'no defence') : openPools(l.target) ? `${how} ${poolText(l.defendWhy!)} = ${l.defend.total}` : `${how} ${l.defend.total}`;
    const verdict = l.hit
      ? l.defend && l.attack.total === l.defend.total ? t('fight.tie', 'a tie: the attacker wins it') : t('fight.hits', 'it hits')
      : t(`fight.verdict.${l.how}`, VERDICT[l.how]);
    const line = `${of(l.who, ['fight.strike.you', 'You strike{tactic}'], ['fight.strikes', '{who} strikes{tactic}'], { tactic })}: ${atkText} ${t('fight.against', 'against {whose}', { whose: whose(l.target) })} ${defText}: ${verdict}.`;

    // 1. Who hits: the attack, the defence written beside it.
    const rolls: Roll[] = [{ ...l.attack, label: t('fight.attackroll', '{who}: attack', { who: Name(l.who) }) }];
    const mine = [atkMine];
    if (l.defend) { rolls.push({ ...l.defend, label: t('fight.defroll', '{who}: {how}', { who: Name(l.target), how }) }); mine.push(defMine); }
    const adv = l.advantages ? [l.advantages === 1 ? t('fight.adv1', '1 advantage: more damage') : t('fight.advn', '{n} advantages: more damage', { n: l.advantages })] : [];
    if (!dice) await exchange(l, true);
    await reveal(rolls, mine, [`${verdict.charAt(0).toUpperCase()}${verdict.slice(1)}.`, ...adv]);
    // (Written once the dice have landed, so the log doesn't give it away.)
    log(line, atkMine ? 'you' : 'they');
    if (dice) await exchange(l, false);
    if (!l.hit || !l.result || !l.damage) return;

    // 2. Where it lands.
    const res = l.result, dmg = l.damage;
    const part = partName(res.part);
    await reveal([{ ...l.whereRoll!, label: t('fight.whereroll', 'Where (D10)') }], [atkMine], [t('fight.lands', 'In the {part}.', { part })]);
    if (dice) seeHit(l);

    // 3. The damage (the extra from advantages on its own), less armour.
    const weaponDice = diceText({ n: Math.max(0, dmg.weapon.n + dmg.tactic), mod: dmg.weapon.mod });
    const extraText = res.extra ? t('fight.extra', ' + {n} extra ({a})', { n: res.extra, a: l.advantages === 1 ? t('fight.adv1s', '1 advantage') : t('fight.advns', '{n} advantages', { n: l.advantages }) }) : '';
    const sum = t('fight.dmgsum', 'Damage {d}{extra} − armour {a} = {net} gets through', { d: res.damageRoll.total, extra: extraText, a: dmg.armour, net: Math.max(0, res.net) });
    const outcome = res.net <= 0 ? t('fight.glance', 'nothing: it glances off')
      : res.serious ? t('fight.serious', '{f} fatigue and a serious wound', { f: res.fatigue }) : t('fight.fatigueonly', '{f} fatigue', { f: res.fatigue });
    const dmgRolls: Roll[] = [{ ...res.damageRoll, label: t('fight.dmgroll', 'Damage {d}', { d: weaponDice }) }];
    if (res.extraRoll) dmgRolls.push({ ...res.extraRoll, label: t('fight.extraroll', 'Extra damage') });
    await reveal(dmgRolls, dmgRolls.map(() => atkMine), [`${sum}: ${outcome}.`]);
    if (dice) floatHit(l);
    log(`${t('fight.inthe', 'In the {part}', { part })}: ${sum}: ${outcome}.`, atkMine ? 'good' : 'bad');

    // 4. A serious wound: its die (the attacker's), the death roll (the one hit), breaks and cuts.
    if (res.serious) {
      const s = res.serious;
      const wRolls: Roll[] = [{ ...res.woundRoll, label: t('fight.woundroll', 'Serious wound (D10)') }];
      const wMine = [atkMine];
      if (s.deathRoll) { wRolls.push({ ...s.deathRoll, label: t('fight.deathroll', '{who}: death roll', { who: Name(l.target) }) }); wMine.push(defMine); }
      for (const rk of res.risks) { wRolls.push({ ...rk.roll, label: rk.effect.k === 'break' ? t('fight.breakroll', 'Bone holds?') : t('fight.cutroll', 'Limb holds?') }); wMine.push(defMine); }
      const notes = [t('fight.woundsum', 'Wound table: {d} + {b} = {r}', { d: res.woundD10, b: s.result - res.woundD10, r: s.result })];
      // What the wound does, in words ("a wound to the right arm, bleeding 2 a round, dazed").
      const fx = s.died ? '' : s.effects.map(effectText).join(', ');
      if (fx) notes.push(cap(fx));
      if (s.died) notes.push(of(l.target, ['fight.killed.you', 'You fall.'], ['fight.killed', '{who} falls dead.']));
      await reveal(wRolls, wMine, notes);
      if (fx) log(t('fight.woundfx', 'Serious wound: {fx}.', { fx }), atkMine ? 'good' : 'bad');
      if (s.died) log(of(l.target, ['fight.killed.you', 'You fall.'], ['fight.killed', '{who} falls dead.']), atkMine ? 'good' : 'bad');
      for (const rk of res.risks) if (rk.happened) log(rk.effect.k === 'break' ? t('fight.breaks', 'Bone breaks.') : t('fight.severed', 'Something is cut off.'), 'bad');
    }
  }

  /** Show a round: moves walked, each blow step by step, things dropped and picked up, who went down. */
  async function show(lines: LogLine[], w: SpikeWorld): Promise<void> {
    for (const l of lines) {
      switch (l.k) {
        case 'move': {
          w.moveFighter(l.who, l.to.x, l.to.z);
          if (l.roll) await reveal([{ ...l.roll, label: `${Name(l.who)}: ${rollableName('attr:Förflyttning')}` }], [l.who === 'hero']);
          log(l.ran ? of(l.who, ['fight.ran.you', 'You run in.'], ['fight.ran', '{who} runs in.']) : of(l.who, ['fight.walked.you', 'You close in.'], ['fight.walked', '{who} closes in.']), l.who === 'hero' ? 'you' : 'they');
          break;
        }
        case 'draw':
          if (l.who === 'hero') w.drawOwn(l.item);
          log(of(l.who, ['fight.drew.you', 'You draw your {thing}.'], ['fight.drew', '{who} draws a {thing}.'], { thing: kindName(l.item) }), l.who === 'hero' ? 'you' : 'they');
          break;
        case 'pickUp':
          await settle(w);
          w.takeUp(l.who, l.item);
          log(of(l.who, ['fight.pickedup.you', 'You pick up the {thing}.'], ['fight.pickedup', '{who} picks up the {thing}.'], { thing: kindName(l.item) }), l.who === 'hero' ? 'you' : 'they');
          break;
        case 'initiative': {
          await settle(w);
          await reveal(l.rolls.map((r, i) => ({ ...r, label: `${Name(l.ids[i] ?? '')}: ${rollableName('attr:Reaktion')}` })), l.ids.map((id) => id === 'hero'));
          log(l.upper === 0
            ? t('fight.upper.you', 'You are quicker: you see what {who} means to do.', { who: nameOf(foeId) })
            : t('fight.upper.they', '{who} is quicker: they will see what you do.', { who: Name(foeId) }), 'info');
          break;
        }
        case 'open': {
          await settle(w);
          const ids = fight!.fighters.map((f) => f.id);
          if (l.rolls.length) await reveal(l.rolls.map((r, i) => ({ ...r, label: `${Name(ids[i] ?? '')}: ${rollableName('attr:Reaktion')}` })), ids.map((id) => id === 'hero'));
          roleWhy = 'quicker';
          log(of(l.attacker === 0 ? 'hero' : foeId, ['fight.opens.you', 'Blades cross. You have the upper hand.'], ['fight.opens', 'Blades cross. {who} has the upper hand.']), 'info');
          break;
        }
        case 'attack':
          await settle(w);
          await showAttack(l);
          break;
        case 'drop':
          w.dropAt(l.who, l.item, l.at.x, l.at.z);
          log(of(l.who, ['fight.dropped.you', 'You drop the {thing}.'], ['fight.dropped', '{who} drops the {thing}.'], { thing: kindName(l.item) }), l.who === 'hero' ? 'bad' : 'good');
          break;
        case 'retreat':
          w.moveFighter(l.who, l.to.x, l.to.z);
          log(of(l.who, ['fight.retreats.you', 'You break off and step back.'], ['fight.retreats', '{who} breaks off and steps back.']), 'info');
          break;
        case 'roles':
          roleWhy = 'won';
          log(of(l.attacker === 0 ? 'hero' : foeId, ['fight.turns.you', 'Now you press the attack.'], ['fight.turns', 'Now {who} presses the attack.']), 'info');
          break;
        case 'end': {
          if (l.end.rolls.length) await reveal(l.end.rolls.map((r) => ({ ...r, label: `${Name(l.who)}: ${r.label ?? ''}` })), l.end.rolls.map(() => l.who === 'hero'));
          for (const n of l.end.notes) if (n !== 'stayed up') log(`${Name(l.who)}: ${t(`fight.note.${n.replace(/ /g, '')}`, n)}.`, l.who === 'hero' ? 'bad' : 'good');
          break;
        }
        case 'plead': {
          const mine = l.who === 'hero';
          const said = l.granted
            ? of(l.who, ['fight.spared.you', '{foe} lowers their weapon and lets you yield.'], ['fight.spared.they', 'You let {who} yield.'], { foe: Name(foeId) })
            : of(l.who, ['fight.refused.you', '{foe} won’t hear of it.'], ['fight.refused.they', '{who} begs; you fight on.'], { foe: Name(foeId) });
          log(of(l.who, ['fight.pleads.you', 'You ask to yield.'], ['fight.pleads', '{who} asks to yield.']), mine ? 'you' : 'they');
          await reveal([{ ...l.roll, label: t('fight.plearoll', '{who}: plea', { who: Name(l.who) }) }], [mine], [said]);
          log(said, l.granted ? 'info' : 'bad');
          if (l.granted && mine) w.noteYield(foeId);
          break;
        }
        case 'mercy':
          await settle(w);
          w.play(l.who, 'finish');
          if (fast()) await sleep(1300);
          log(of(l.who, ['fight.mercy.you', 'You give {target} the killing stroke.'], ['fight.mercy', '{who} gives {target} the killing stroke.'], { target: nameOf(l.target) }), l.who === 'hero' ? 'good' : 'bad');
          break;
        case 'over':
          log(l.winner === 0 ? t('fight.won', 'You have won.') : l.winner === 1 ? t('fight.lost', 'You are beaten.') : t('fight.nobody', 'No one is left standing.'), l.winner === 0 ? 'good' : 'bad');
          break;
      }
      // Injuries show on the bodies and the cards as they happen (lying down when out).
      if (l.k === 'attack' || l.k === 'end' || l.k === 'mercy') {
        for (const f of fight!.fighters) w.setInjuries(f.id, f.injuries);
        cards();
      }
      flushRolls();
    }
    await settle(w);
  }

  /** The fight is over (OK, or got away): the world goes on. Fatigue comes back with time; the knocked out lie there till then. */
  function end(): void {
    const w = world();
    if (fight) for (const f of fight.fighters) w.setInjuries(f.id, { ...f.injuries, short: [], shockDue: false, blinded: false });
    w.endFight();
    fight = null;
    plan = null;
    w.markSpot(null);
    el.hidden = true;
    backEl.hidden = true;
    w.viewAim = { x: 0, y: 0 };
    save();
  }

  function start(foe: string): void {
    const w = world();
    if (fight) return;
    const me = w.fighterAt('hero'), them = w.fighterAt(foe), p = w.talkPerson(foe);
    if (!me || !them || !p) return;
    if (w.injuriesOf(foe)?.dead) return notify(t('fight.alreadydead', '{name} is dead.', { name: p.name }));
    if (w.injuriesOf(foe)?.out) return notify(t('fight.alreadyout', '{name} lies senseless.', { name: p.name }));
    if (w.injuriesOf('hero')?.out) return notify(t('fight.youareout', 'You are knocked out.'));
    foeId = foe;
    names.set('hero', t('fight.youobj', 'you'));
    names.set(foe, p.name);
    w.beginFight(['hero', foe]);
    const a = personFighter(w, foe, w.sheetOf(foe), them);
    fight = startFight([heroFighter(w, me), a]);
    fight.ground = groundNear(w, (me.x + them.x) / 2, (me.z + them.z) / 2);
    logEl.replaceChildren();
    el.hidden = false;
    backEl.hidden = false;
    roleWhy = 'quicker';
    seen = {};
    stash = [];
    lastLine = null;
    armed = null;
    tabFor = '';
    lastMove = null;
    timer = null;
    requestAnimationFrame(trackBubble);
    log(t('fight.begins', 'You face {name}. The fight is on.', { name: p.name }), 'info');
    if (!fight.fighters[0].weapon) {
      log(fight.fighters[0].belt?.length
        ? t('fight.drawfirst', 'Your weapon is not in your hand: draw it (the side action), or fight with your fists.')
        : t('fight.nohands', 'You have no weapon: you fight with your fists. Weapons lie on the ground nearby.'), 'info');
    }
    // Beaten in an earlier fight, they may ask to yield at once.
    offerYield(styleFor(p.tags, p.fights));
    pending = null;
    void beginRound();
  }

  return {
    start,
    tap,
    get on() {
      return fight !== null;
    },
    check() {
      if (world().injuriesOf('hero')?.dead) {
        fight = startFight([{ ...heroFighter(world(), { x: 0, z: 0 }), injuries: world().injuriesOf('hero') as Injuries }]);
        foeId = '';
        logEl.replaceChildren();
        el.hidden = false;
        log(t('fight.youdie', 'You are dead.'), 'bad');
        headEl.textContent = t('fight.deadhead', 'The end');
        usEl.replaceChildren();
        themEl.replaceChildren();
        usMoves.replaceChildren();
        themMoves.replaceChildren();
        choicesEl.replaceChildren();
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = t('fight.newgame', 'New game');
        b.addEventListener('click', newGame);
        choicesEl.appendChild(b);
      }
    },
  };
}

const HOW: Record<string, string> = { parry: 'parry', block: 'block', dodge: 'dodge', none: 'no defence' };
const VERDICT: Record<string, string> = { parry: 'parried', block: 'blocked', dodge: 'dodged', none: 'missed' };

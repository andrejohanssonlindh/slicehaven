import { FIGHT_MINDS, styleFor } from '../../content/combat';
import { THINGS } from '../../content/things';
import { WOUND_TABLES } from '../../content/wounds';
import type { Dice } from '../../core/chargen/tables';
import {
  type Choice, type Fighter, type FightRules, PICKUP_REACH, acceptYield, between, canAct, refuseYield, resolveRound, roleOf, seizeInitiative, startFight,
} from '../../core/combat';
import type { Roll } from '../../core/dice';
import { LOOK_BONUS } from '../../core/world3d/perceive';
import type { Injuries } from '../../core/damage';
import { DIFFICULTY_RULES } from '../../core/difficulty';
import { chooseFor, wantsToYield, type Style } from '../../core/fightmind';
import type { Hero } from '../../core/hero';
import { Rng } from '../../core/rng';
import { thingName } from '../../core/world3d/actions';
import type { SpikeWorld } from '../../engine3d/world';
import { t } from '../../i18n';
import { loadSettings } from '../../ui/settings';
import type { ConditionSheet } from '../condition';
import { card, moves } from './columns';
import { type FightCtx, type FightEls, type FightState, within } from './ctx';
import { groundNear, heroFighter, personFighter } from './fighters';
import { foeStyle } from './others';
import { aimView, intentBubble, layout, makeTabs, makeTimer, trackBubble } from './picking';
import { makePlayback } from './show';

/**
 * A fight on the page (plan B8a): the hero against someone of the map, played in rounds by the rules
 * (`core/combat.ts`). The world stops; each round the hero makes their choice, the other side chooses by their
 * fighting style (`content/combat/styles/`), the round is resolved and shown (`./show.ts`), and the world plays it
 * out. To the death (Q46). When one side is left, OK ends the fight; fatigue then comes back with time (Q49).
 *
 * The parts (design `director/design/fight-feel.md`): `columns.ts` the cards and the moves, `others.ts` the moves
 * besides a blow or a defence, `picking.ts` the layout, the foe's bubble and the pick timer, `show.ts` a round played
 * out, `fighters.ts` the fighters built from the world, `words.ts` the words, `ctx.ts` what they share. This file
 * runs the rounds.
 */

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
  /** The hero noticed something lying about during the fight (`SpikeWorld.onNotice`): the log says it. */
  noticed(id: string, roll: Roll | null): void;
}

/** How the page frames a fight (`main.ts`): its zoom. */
export interface FightView {
  /** A fight starts (true) or ends (false): the old zoom is kept, and given back after. */
  on(on: boolean): void;
  /**
   * Zoom to keep both fighters in the part of the screen the panel leaves free (the director: close in, but always
   * both in view): `span` metres side to side must fit `width` × `height` CSS pixels.
   */
  fit(span: number, width: number, height: number): void;
}

export function makeFight(world: () => SpikeWorld, hero: Hero, notify: (text: string) => void, save: () => void, newGame: () => void, condition: ConditionSheet, view: FightView = { on: () => {}, fit: () => {} }): FightUI {
  const onView = view.on;
  const root = document.getElementById('fight')!;
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const el: FightEls = {
    root, head: q('.head'), usCol: q('.us'), themCol: q('.them'), usCard: q('.us .card'), themCard: q('.them .card'),
    usMoves: q('.us .moves'), themMoves: q('.them .moves'), mid: q('.mid'), tabs: q('.tabs'), pane: q('.pane'), log: q('.log'),
    intent: q<HTMLButtonElement>('.intent-icon'), back: document.getElementById('fight-back') as HTMLButtonElement,
  };
  el.usMoves.classList.add('mine');
  // A tap on the foe's bubble unfolds their whole column under their card (a phone); again folds it.
  el.intent.addEventListener('click', () => root.classList.toggle('show-foe'));
  el.themMoves.addEventListener('click', () => root.classList.remove('show-foe'));
  el.back.addEventListener('click', () => world().faceFight());

  /** The round line's words (⚔ Back to fight sits beside them on a phone). */
  const headText = document.createElement('span');
  headText.className = 'txt';
  el.head.appendChild(headText);
  const s: FightState = { fight: null, foeId: '', busy: false, pending: null, plan: null, roleWhy: 'quicker', seen: {}, armed: null, avail: new Map(), lastMove: null, timer: null, side: null, open: null };
  const names = new Map<string, string>();
  const nameOf = (id: string) => names.get(id) ?? id;
  /** `?taps=2` or `?taps=1` forces two taps to act, or one (for testing on a computer). */
  const taps = new URLSearchParams(location.search).get('taps');
  const ctx: FightCtx = {
    s, el, world, hero, condition,
    rng: Rng.fromSeed(`fight:${Date.now()}`),
    level: () => DIFFICULTY_RULES[loadSettings().difficulty],
    fast: () => loadSettings().fight === 'fast',
    twoTaps: () => (taps ? taps === '2' : matchMedia('(pointer: coarse)').matches),
    nameOf,
    Name: (id) => { const n = nameOf(id); return n.charAt(0).toUpperCase() + n.slice(1); },
    kindName: (id) => {
      const k = world().thingKind(id);
      return k && THINGS.has(k) ? thingName(THINGS.get(k)) : t('fight.aweapon', 'weapon');
    },
    vitalityOf: (f: Fighter): Dice => f.pools['attr:Livskraft'] ?? { n: 2, mod: 0 },
    log: (text, kind) => playback.log(text, kind),
    refresh: () => refresh(),
    play: (mine) => play(mine),
    fitView: (span, w, h) => view.fit(span, w, h),
  };
  const playback = makePlayback(ctx);
  const tabs = makeTabs(ctx);
  const timer = makeTimer(ctx);
  const rules: FightRules = { tables: WOUND_TABLES, ground: GROUND };

  window.addEventListener('resize', () => { layout(ctx); aimView(ctx); });
  el.usCard.addEventListener('click', () => { if (s.fight) condition.open(s.fight.fighters[0].injuries, ctx.vitalityOf(s.fight.fighters[0]), undefined, s.seen.hero); });
  el.themCard.addEventListener('click', () => {
    if (s.fight && s.fight.fighters[1] && ctx.level().foeExact) condition.open(s.fight.fighters[1].injuries, ctx.vitalityOf(s.fight.fighters[1]), nameOf(s.foeId), s.seen[s.foeId]);
  });

  /** A tap on the world: plan to go there (free), or to the weapon tapped; in reach of a foe, only breaking off moves you. */
  function tap(thing: string | null, ground: { x: number; z: number } | null): void {
    const fight = s.fight;
    if (!fight || s.busy || fight.winner !== null) return;
    world().recentre();
    const item = thing ? fight.ground.find((g) => g.id === thing) : undefined;
    if (roleOf(fight, 'hero') !== 'free' && !(item && within(ctx, item, PICKUP_REACH))) {
      ctx.log(t('fight.noroam', 'In reach of {who} you can’t walk off: break off (retreat) first.', { who: nameOf(s.foeId) }), 'info');
      return;
    }
    // (A weapon tapped is one you have found yourself: noticed from now on. In reach, its list opens; else the moves.)
    if (item) world().notice(item.id);
    const inReach = !!item && within(ctx, item, PICKUP_REACH);
    s.plan = inReach ? null : item ? { x: item.x, z: item.z, item: item.id } : ground ? { ...ground } : null;
    s.open = inReach ? 'pickUp' : s.plan ? 'move' : s.open;
    if (s.open) tabs.show('side');
    world().markSpot(s.plan);
    refresh();
  }

  function refresh(): void {
    const fight = s.fight;
    if (!fight) return;
    s.avail = new Map();
    const me = fight.fighters[0], foe = fight.fighters[1];
    const role = roleOf(fight, 'hero');
    const d = between(fight, 'hero', s.foeId);
    headText.textContent = t('fight.head', 'Round {r} · {d} m · {role}', {
      r: fight.round, d: d.toFixed(1),
      role: fight.winner !== null ? t('fight.over', 'over') : role === 'attacker' ? t('fight.attacking', 'you attack') : role === 'defender' ? t('fight.defending', 'you defend') : t('fight.free', 'not in reach'),
    });
    layout(ctx);
    card(ctx, el.usCard, me, t('fight.You', 'You'), true);
    card(ctx, el.themCard, foe, ctx.Name(s.foeId), false);
    moves(ctx, el.usMoves, me, foe, true, { newGame, end, accept });
    moves(ctx, el.themMoves, foe, me, false);
    tabs.draw();
    intentBubble(ctx);
    // What you have noticed lying about, ringed in red (the director: weapons on the ground are hard to see).
    world().markSpotted(fight.ground.filter((g) => world().hasNoticed(g.id)));
    el.log.scrollTop = el.log.scrollHeight;
    timer.draw();
    aimView(ctx);
  }

  /**
   * The start of a round (or of its second half, once blades crossed): who has the upper hand (the attacker in a
   * melee; free, nobody: both choose blind). With it, the hero sees what the foe means to do before choosing; without
   * it, the foe will choose knowing the hero's choice (the director: declared in reverse order).
   */
  async function beginRound(): Promise<void> {
    if (!s.fight) return;
    s.pending = null;
    if (s.fight.winner === null && canAct(s.fight.fighters[0])) {
      s.busy = true;
      const r = seizeInitiative(s.fight);
      s.fight = r.fight;
      await playback.show(r.log, world());
      if (s.fight.upper === 0) s.pending = chooseFor(s.fight, s.foeId, foeStyle(ctx), FIGHT_MINDS, ctx.rng);
      s.busy = false;
    }
    refresh();
  }

  /** Play one round: the hero's choice, the other's by their style; then show it and let the world play it out. */
  async function play(mine: Choice): Promise<void> {
    if (!s.fight || s.busy) return;
    s.busy = true;
    s.roleWhy = 'kept';
    s.armed = null;
    root.classList.remove('show-foe');
    refresh();
    const w = world();
    // Where they stand now (the world walked them), as the rules start the round from.
    for (const f of s.fight.fighters) {
      const at = w.fighterAt(f.id);
      if (at) { f.x = at.x; f.z = at.z; }
    }
    // The side action was looking round: an Alertness roll with 1D6 more for what lies about, before anything moves.
    if (s.side?.look) await lookAbout(LOOK_BONUS);
    s.side = null;
    s.open = null;
    const style = foeStyle(ctx);
    // Choosing anything but accepting their offer to yield refuses it: they fight on.
    if (s.fight.offer) s.fight = refuseYield(s.fight, s.fight.offer);
    // With the upper hand they declared already (`pending`); without it, they choose knowing yours.
    const theirs = s.pending ?? chooseFor(s.fight, s.foeId, style, FIGHT_MINDS, ctx.rng, s.fight.upper === 1 ? mine : undefined);
    s.pending = null;
    s.plan = null;
    w.markSpot(null);
    w.recentre();
    // (The round stops when blades cross, so both choose a tactic in their roles: `midRound`.)
    const r = resolveRound(s.fight, { hero: mine, [s.foeId]: theirs }, rules, ctx.rng, { pauseOnOpen: true });
    s.fight = r.fight;
    await playback.show(r.log, w);
    for (const f of s.fight.fighters) w.setInjuries(f.id, f.injuries);
    save();
    s.busy = false;
    if (s.fight.midRound) ctx.log(t('fight.choose', 'Choose how to strike or defend.'), 'info');
    // Beaten badly enough, they offer to yield (the director: "some type of plead cutoff").
    offerYield(style);
    const me = s.fight.fighters[0];
    if (s.fight.winner !== null && s.fight.winner !== 0 && me.injuries.out && !me.injuries.dead) {
      // They won and you are down: they finish it if their style does, else they leave you be.
      const next = chooseFor(s.fight, s.foeId, style, FIGHT_MINDS, ctx.rng);
      if (next.mercy || next.move) return play({});
      ctx.log(t('fight.spared', '{name} leaves you lying there.', { name: ctx.Name(s.foeId) }), 'bad');
    }
    if (me.injuries.dead) ctx.log(t('fight.youdie', 'You are dead.'), 'bad');
    await beginRound();
  }

  /** If the foe is beaten enough, they offer to yield: the choices then lead with accepting it. */
  function offerYield(style: Style): void {
    if (!s.fight || !wantsToYield(s.fight, s.foeId, style, FIGHT_MINDS, ctx.rng)) return;
    s.fight = { ...s.fight, offer: s.foeId };
    ctx.log(t('fight.offers', '{who} lowers their weapon and asks to yield.', { who: ctx.Name(s.foeId) }), 'good');
  }

  /** Accept their surrender: they lay down their weapon; the fight is won. */
  async function accept(): Promise<void> {
    if (!s.fight || s.busy) return;
    s.busy = true;
    const r = acceptYield(s.fight, s.foeId, ctx.rng);
    s.fight = r.fight;
    await playback.show(r.log, world());
    ctx.log(t('fight.accepted', 'You let {who} yield.', { who: ctx.Name(s.foeId) }), 'info');
    save();
    s.busy = false;
    refresh();
  }

  /** While looking round on purpose: what is noticed is said once, by `lookAbout`, not line by line. */
  let looking = false;

  /**
   * Look round on purpose (the side action, plan B8): an Alertness roll with `bonus` dice more against everything in
   * view not noticed yet (`SpikeWorld.noticeLying`; noticing itself happens as things come into view, fight or not).
   */
  async function lookAbout(bonus: number): Promise<void> {
    if (!s.fight) return;
    looking = true;
    const { found, roll } = world().noticeLying(bonus);
    looking = false;
    if (roll) await playback.rolls([{ ...roll, label: t('fight.lookroll', 'You: Alertness') }], [true]);
    const what = found.map((id) => t('fight.thething', 'the {name}', { name: ctx.kindName(id) })).join(', ');
    const nums = roll ? playback.said(roll, 'hero', 'Alertness') : '';
    ctx.log(found.length
      ? t('fight.noticed', 'You notice {what} on the ground{roll}.', { what, roll: nums })
      : t('fight.noticednone', 'You look about: nothing more catches your eye{roll}.', { roll: nums }), found.length ? 'good' : 'info');
    refresh();
  }

  /** Noticed something lying about during the fight (it came into view): say so, ring it. */
  function noticed(id: string, roll: Roll | null): void {
    if (!s.fight || looking) return;
    const nums = roll ? playback.said(roll, 'hero', 'Alertness') : '';
    ctx.log(t('fight.noticed', 'You notice {what} on the ground{roll}.', { what: t('fight.thething', 'the {name}', { name: ctx.kindName(id) }), roll: nums }), 'good');
    if (!s.busy) refresh();
  }

  /** The fight is over (OK, or got away): the world goes on. Fatigue comes back with time; the knocked out lie there till then. */
  function end(): void {
    const w = world();
    if (s.fight) for (const f of s.fight.fighters) w.setInjuries(f.id, { ...f.injuries, short: [], shockDue: false, blinded: false });
    w.endFight();
    s.fight = null;
    s.plan = null;
    w.markSpot(null);
    root.hidden = true;
    el.back.hidden = true;
    w.viewAim = { x: 0, y: 0 };
    w.markSpotted([]);
    onView(false);
    document.body.classList.remove('fighting');
    save();
  }

  function start(foe: string): void {
    const w = world();
    if (s.fight) return;
    const me = w.fighterAt('hero'), them = w.fighterAt(foe), p = w.talkPerson(foe);
    if (!me || !them || !p) return;
    if (w.injuriesOf(foe)?.dead) return notify(t('fight.alreadydead', '{name} is dead.', { name: p.name }));
    if (w.injuriesOf(foe)?.out) return notify(t('fight.alreadyout', '{name} lies senseless.', { name: p.name }));
    if (w.injuriesOf('hero')?.out) return notify(t('fight.youareout', 'You are knocked out.'));
    s.foeId = foe;
    names.set('hero', t('fight.youobj', 'you'));
    names.set(foe, p.name);
    w.beginFight(['hero', foe]);
    const a = personFighter(w, foe, w.sheetOf(foe), them);
    s.fight = startFight([heroFighter(w, hero, me), a]);
    s.fight.ground = groundNear(w, (me.x + them.x) / 2, (me.z + them.z) / 2);
    playback.reset();
    root.hidden = false;
    el.back.hidden = false;
    Object.assign(s, { roleWhy: 'quicker', seen: {}, armed: null, lastMove: null, timer: null, side: null, open: null });
    onView(true);
    // (The page's top bar and the numbers overlay give way on a phone: `body.fighting` in the styles.)
    document.body.classList.add('fighting');
    tabs.reset();
    requestAnimationFrame(() => trackBubble(ctx));
    ctx.log(t('fight.begins', 'You face {name}. The fight is on.', { name: p.name }), 'info');
    if (!s.fight.fighters[0].weapon) {
      ctx.log(s.fight.fighters[0].belt?.length
        ? t('fight.drawfirst', 'Your weapon is not in your hand: draw it (the side action), or fight with your fists.')
        : t('fight.nohands', 'You have no weapon: you fight with your fists. Weapons lie on the ground nearby.'), 'info');
    }
    // Beaten in an earlier fight, they may ask to yield at once.
    offerYield(styleFor(p.tags, p.fights));
    s.pending = null;
    void beginRound();
  }

  return {
    start,
    tap,
    noticed,
    get on() {
      return s.fight !== null;
    },
    check() {
      if (!world().injuriesOf('hero')?.dead) return;
      s.fight = startFight([{ ...heroFighter(world(), hero, { x: 0, z: 0 }), injuries: world().injuriesOf('hero') as Injuries }]);
      s.foeId = '';
      playback.reset();
      root.hidden = false;
      ctx.log(t('fight.youdie', 'You are dead.'), 'bad');
      headText.textContent = t('fight.deadhead', 'The end');
      for (const e of [el.usCard, el.themCard, el.usMoves, el.themMoves]) e.replaceChildren();
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.move = 'newgame';
      b.textContent = t('fight.newgame', 'New game');
      b.addEventListener('click', newGame);
      el.usMoves.appendChild(b);
    },
  };
}

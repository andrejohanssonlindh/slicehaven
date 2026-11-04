import { ARMOUR, WEAPONS } from '../content/chargen/equipment';
import { styleFor } from '../content/combat/styles';
import { rollableName } from '../content/rollables';
import { THINGS } from '../content/things';
import { WOUND_TABLES } from '../content/wounds';
import { baseArmour, baseDamage, type Dice, diceText } from '../core/chargen/tables';
import {
  ADJACENT, RUN, WALK, type Choice, type Fight, type Fighter, type FightItem, type FightRules, type LogLine, PICKUP_REACH, UNTRAINED, attackTactics,
  type FightStyle, PLEA_SKILLS, acceptYield, between, canAct, chooseFor, loadDiceOf, pleaDifficulty, refuseYield, resolveRound, roleOf,
  seizeInitiative, startFight, wantsToYield, weaponOf,
} from '../core/combat';
import { type Injuries, totalFatigue, unhurt } from '../core/damage';
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

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * A fight on the page (plan B8a): the hero against someone of the map, played in rounds by the rules
 * (`core/combat.ts`). The world stops; each round the hero makes one choice (close in, pick something up, a tactic to
 * strike or defend, retreat), the other side chooses by their fighting style (`content/combat/styles.ts`), the round
 * is resolved and shown step by step: who hit (only your own dice are thrown; theirs are written), then where and
 * how much, then the extra damage and any serious wound. The world plays it out: walking, swings, a sword falling on
 * the sand, someone going down. To the death (Q46). When one side is left, OK ends the fight; fatigue then comes back
 * with time (Q49), and the knocked out lie there until it has.
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

export function makeFight(world: () => SpikeWorld, hero: Hero, notify: (text: string) => void, save: () => void, newGame: () => void, condition: ConditionSheet): FightUI {
  const el = document.getElementById('fight')!;
  const headEl = el.querySelector<HTMLElement>('.head')!, usEl = el.querySelector<HTMLElement>('.us')!, themEl = el.querySelector<HTMLElement>('.them')!;
  const logEl = el.querySelector<HTMLElement>('.log')!, choicesEl = el.querySelector<HTMLElement>('.choices')!;
  let fight: Fight | null = null;
  let foeId = '';
  let busy = false;
  /** What the foe declared this round, when the hero has the upper hand and so knows it before choosing. */
  let pending: Choice | null = null;
  /** Where the hero means to go this round (a tapped spot, or a weapon lying there), shown with a mark. */
  let plan: { x: number; z: number; item?: string } | null = null;

  /**
   * Keep the fighters in the part of the screen the panel leaves free (the director: the panel covered them): on a
   * phone the panel sits at the bottom and the fight above it; on a wide screen it docks at the side.
   */
  function aimView(): void {
    const w = world();
    const canvas = document.getElementById('stage');
    if (!fight || el.hidden || !canvas) return void (w.viewAim = { x: 0, y: 0 });
    const c = canvas.getBoundingClientRect(), p = el.getBoundingClientRect();
    const side = p.left > c.left + c.width * 0.3; // docked at the right
    const free = side ? { x: (c.left + p.left) / 2, y: c.top + c.height / 2 } : { x: c.left + c.width / 2, y: (c.top + p.top) / 2 };
    w.viewAim = { x: ((free.x - c.left) / c.width) * 2 - 1, y: -(((free.y - c.top) / c.height) * 2 - 1) };
  }
  window.addEventListener('resize', aimView);

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
    logEl.scrollTop = logEl.scrollHeight;
  }

  /** The hero as a fighter: their sheet, what they hold, no armour yet (the hero has none in the world). */
  function heroFighter(w: SpikeWorld, at: { x: number; z: number }): Fighter {
    const phys = hero.dice['attr:Kroppsbyggnad'] ?? { n: 2, mod: 0 };
    const held = w.wieldedBy('hero');
    const row = held ? rowOfKind(held.kind) : undefined;
    return {
      id: 'hero', side: 0, x: at.x, z: at.z, pools: Object.fromEntries(FIGHT_IDS.map((id) => [id, hero.dice[id] ?? { n: 0, mod: 0 }])),
      physique: phys, baseDamage: baseDamage(units(phys)), baseArmour: baseArmour(units(phys)), armour: { cut: 0, crush: 0, thrust: 0 }, loadDice: 0,
      weapon: held && row ? { id: held.id, weapon: row } : null, shield: null, injuries: w.injuriesOf('hero') ?? unhurt(), drew: false,
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
    return {
      id, side: 1, x: at.x, z: at.z, pools: Object.fromEntries(FIGHT_IDS.map((s) => [s, dice(s)])),
      physique: phys, baseDamage: baseDamage(units(phys)), baseArmour: baseArmour(units(phys)),
      armour: armour ? { cut: armour.h, crush: armour.k, thrust: armour.s } : { cut: 0, crush: 0, thrust: 0 }, loadDice: loadDiceOf(armour?.load ?? 0),
      weapon: held && row ? { id: held.id, weapon: row } : null, shield: null, injuries: w.injuriesOf(id) ?? unhurt(), drew: false,
    };
  }

  /** What lies about the fight: weapons on the ground near it, as the rules see them. */
  function groundNear(w: SpikeWorld, x: number, z: number): Fight['ground'] {
    return w.weaponsLying(x, z, GROUND_REACH).flatMap((g) => {
      const row = rowOfKind(g.kind);
      return row ? [{ id: g.id, weapon: row, x: g.x, z: g.z } satisfies FightItem & { x: number; z: number }] : [];
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
    const weapon = f.weapon ? kindName(f.weapon.id) : t('fight.bare', 'bare hands');
    top.append(b, document.createTextNode(` · ${exactHarm ? `${weapon} (${rollableName(skill)} ${dice})` : weapon}`));
    if (own || lv.foeExact) {
      const more = document.createElement('span');
      more.className = 'more';
      more.textContent = t('fight.details', 'details ›');
      top.appendChild(more);
    }
    const bar = document.createElement('div');
    bar.className = 'bar';
    const fill = document.createElement('i');
    fill.style.width = `${Math.round(fatigueShare(i, vitalityOf(f)) * 100)}%`;
    bar.appendChild(fill);
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
    box.append(top, bar, how);
  }

  function refresh(): void {
    if (!fight) return;
    aimView();
    const me = fight.fighters[0], foe = fight.fighters[1];
    const role = roleOf(fight, 'hero');
    const d = between(fight, 'hero', foeId);
    headEl.textContent = t('fight.head', 'Round {r} · {d} m · {role}', {
      r: fight.round, d: d.toFixed(1),
      role: fight.winner !== null ? t('fight.over', 'over') : role === 'attacker' ? t('fight.attacking', 'you attack') : role === 'defender' ? t('fight.defending', 'you defend') : t('fight.free', 'not in reach'),
    });
    card(usEl, me, t('fight.You', 'You'), true);
    card(themEl, foe, Name(foeId), false);
    choicesEl.replaceChildren();
    const intent = pending && fight.winner === null ? intentOf(foeId, pending) : null;
    if (intent) {
      const p = document.createElement('p');
      p.className = 'intent';
      p.textContent = t('fight.intent', '{who} means to {what}.', { who: Name(foeId), what: intent });
      choicesEl.appendChild(p);
    }
    if (fight.winner === null && !plan && roleOf(fight, 'hero') === 'free' && canAct(fight.fighters[0])) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = t('fight.taphint', 'Tap the ground to go there, or a weapon to go to it.');
      choicesEl.appendChild(p);
    }
    for (const c of choices()) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = c.label;
      b.addEventListener('click', () => void c.go());
      choicesEl.appendChild(b);
    }
    logEl.scrollTop = logEl.scrollHeight;
  }

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
      if (fight.upper === 0) pending = chooseFor(fight, foeId, styleFor(world().talkPerson(foeId)?.tags ?? []), rng);
      busy = false;
    }
    refresh();
  }

  /** What the hero can choose now, one button each: the round's whole choice in a tap. */
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
    const near = !me.weapon ? fight.ground.filter((g) => Math.hypot(g.x - me.x, g.z - me.z) <= PICKUP_REACH) : [];
    const pick = near.map((g) => ({ label: t('fight.pickup', 'Pick up the {name}', { name: kindName(g.id) }), go: () => play({ pickUp: g.id, defend: 'standard' }) }));
    if (role === 'free') {
      out.push(...planned());
      // Weapons lying about, not yet in reach: go to one (empty-handed only, as picking up is).
      if (!me.weapon && !plan) {
        const lying = fight.ground.filter((g) => !within(g, PICKUP_REACH)).sort((a, b) => Math.hypot(a.x - me.x, a.z - me.z) - Math.hypot(b.x - me.x, b.z - me.z)).slice(0, 2);
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
    } else if (role === 'attacker') {
      const words = { standard: t('fight.strike', 'Strike'), quick: t('fight.quick', 'Quick strike (+1D6, −1D6 damage, +1 fatigue)'), powerful: t('fight.powerful', 'Powerful strike (−1D6, +2D6 damage, +2 fatigue)') };
      for (const tac of attackTactics(me)) out.push({ label: words[tac], go: () => play({ attack: tac }) });
      out.push(...pick);
      if (fight.melee) out.push({ label: t('fight.retreat', 'Retreat (break off, 5 m back)'), go: () => play({ retreat: true }) });
      out.push(plea(false));
    } else {
      out.push({ label: t('fight.defend', 'Defend'), go: () => play({ defend: 'standard' }) });
      out.push({ label: t('fight.defensive', 'Defend carefully (+1D6, +1 fatigue)'), go: () => play({ defend: 'defensive' }) });
      out.push({ label: t('fight.counter', 'Counter (−1D6, attack next round, +1 fatigue)'), go: () => play({ defend: 'counter' }) });
      out.push(...pick);
      out.push(plea(true));
    }
    return out;
  }

  /** The choices for the tapped plan: pick up the weapon if in reach, else walk (5 m) or run (10 m, a roll) there. */
  function planned(): { label: string; go: () => Promise<void> | void }[] {
    if (!fight || !plan) return [];
    const me = fight.fighters[0];
    if (plan.item && within(plan, PICKUP_REACH)) {
      const id = plan.item;
      return me.weapon ? [] : [{ label: t('fight.pickup', 'Pick up the {name}', { name: kindName(id) }), go: () => play({ pickUp: id, defend: 'standard' }) }];
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
    const style = styleFor(world().talkPerson(foeId)?.tags ?? []);
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
    choicesEl.replaceChildren();
    const w = world();
    // Where they stand now (the world walked them), as the rules start the round from.
    for (const f of fight.fighters) {
      const at = w.fighterAt(f.id);
      if (at) { f.x = at.x; f.z = at.z; }
    }
    const style = styleFor(w.talkPerson(foeId)?.tags ?? []);
    // Choosing anything but accepting their offer to yield refuses it: they fight on.
    if (fight.offer) fight = refuseYield(fight, fight.offer);
    // With the upper hand they declared already (`pending`); without it, they choose knowing yours.
    const theirs = pending ?? chooseFor(fight, foeId, style, rng, fight.upper === 1 ? mine : undefined);
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
      if (style.mercy) return play({});
      log(t('fight.spared', '{name} leaves you lying there.', { name: Name(foeId) }), 'bad');
    }
    if (fight.fighters[0].injuries.dead) log(t('fight.youdie', 'You are dead.'), 'bad');
    await beginRound();
  }

  /** If the foe is beaten enough, they offer to yield: the choices then lead with accepting it. */
  function offerYield(style: FightStyle): void {
    if (!fight || !wantsToYield(fight, foeId, style)) return;
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
  const reveal = (rolls: Roll[], mine: boolean[], notes: string[] = []) =>
    showRolls(rolls, { unthrown: mine.flatMap((m, i) => (m ? [] : [i])), notes });

  /**
   * A blow, step by step (the director: first who hits, then the damage, then the extra damage): attack against
   * defence, with the pool's make-up in the log; then where it lands and the damage, less armour; then the
   * serious wound's die and the death roll, if any.
   */
  async function showAttack(l: Extract<LogLine, { k: 'attack' }>, w: SpikeWorld): Promise<void> {
    const lv = level();
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
    w.swing(l.who);

    // 1. Who hits.
    const rolls: Roll[] = [{ ...l.attack, label: t('fight.attackroll', '{who}: attack', { who: Name(l.who) }) }];
    const mine = [atkMine];
    if (l.defend) { rolls.push({ ...l.defend, label: t('fight.defroll', '{who}: {how}', { who: Name(l.target), how }) }); mine.push(defMine); }
    const adv = l.advantages ? [l.advantages === 1 ? t('fight.adv1', '1 advantage: more damage') : t('fight.advn', '{n} advantages: more damage', { n: l.advantages })] : [];
    await reveal(rolls, mine, [`${verdict.charAt(0).toUpperCase()}${verdict.slice(1)}.`, ...adv]);
    // (Written once the dice have landed, so the log doesn't give it away.)
    log(line, atkMine ? 'you' : 'they');
    if (!l.hit || !l.result || !l.damage) return;

    // 2. Where, and the damage (the extra from advantages on its own, then armour).
    const res = l.result, dmg = l.damage;
    const part = partName(res.part);
    const weaponDice = diceText({ n: Math.max(0, dmg.weapon.n + dmg.tactic), mod: dmg.weapon.mod });
    const extraText = res.extra ? t('fight.extra', ' + {n} extra ({a})', { n: res.extra, a: l.advantages === 1 ? t('fight.adv1s', '1 advantage') : t('fight.advns', '{n} advantages', { n: l.advantages }) }) : '';
    const sum = t('fight.dmgsum', 'Damage {d}{extra} − armour {a} = {net} gets through', { d: res.damageRoll.total, extra: extraText, a: dmg.armour, net: Math.max(0, res.net) });
    const outcome = res.net <= 0 ? t('fight.glance', 'nothing: it glances off')
      : res.serious ? t('fight.serious', '{f} fatigue and a serious wound', { f: res.fatigue }) : t('fight.fatigueonly', '{f} fatigue', { f: res.fatigue });
    const where: Roll = { ...l.whereRoll!, label: t('fight.whereroll', 'Where (D10)') };
    const dmgRolls: Roll[] = [where, { ...res.damageRoll, label: t('fight.dmgroll', 'Damage {d}', { d: weaponDice }) }];
    if (res.extraRoll) dmgRolls.push({ ...res.extraRoll, label: t('fight.extraroll', 'Extra damage') });
    await reveal(dmgRolls, dmgRolls.map(() => atkMine), [t('fight.lands', 'In the {part}.', { part }), `${sum}: ${outcome}.`]);
    log(`${t('fight.inthe', 'In the {part}', { part })}: ${sum}: ${outcome}.`, atkMine ? 'good' : 'bad');

    // 3. A serious wound: its die (the attacker's), the death roll (the one hit), breaks and cuts.
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
          log(of(l.attacker === 0 ? 'hero' : foeId, ['fight.opens.you', 'Blades cross. You have the upper hand.'], ['fight.opens', 'Blades cross. {who} has the upper hand.']), 'info');
          break;
        }
        case 'attack':
          await settle(w);
          await showAttack(l, w);
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
          w.swing(l.who);
          log(of(l.who, ['fight.mercy.you', 'You give {target} the killing stroke.'], ['fight.mercy', '{who} gives {target} the killing stroke.'], { target: nameOf(l.target) }), l.who === 'hero' ? 'good' : 'bad');
          break;
        case 'over':
          log(l.winner === 0 ? t('fight.won', 'You have won.') : l.winner === 1 ? t('fight.lost', 'You are beaten.') : t('fight.nobody', 'No one is left standing.'), l.winner === 0 ? 'good' : 'bad');
          break;
      }
      // Injuries show on the bodies and the cards as they happen (lying down when out).
      if (l.k === 'attack' || l.k === 'end' || l.k === 'mercy') {
        for (const f of fight!.fighters) w.setInjuries(f.id, f.injuries);
        card(usEl, fight!.fighters[0], t('fight.You', 'You'), true);
        card(themEl, fight!.fighters[1], Name(foeId), false);
      }
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
    log(t('fight.begins', 'You face {name}. The fight is on.', { name: p.name }), 'info');
    if (!fight.fighters[0].weapon) log(t('fight.nohands', 'You have no weapon: you fight with your fists. Weapons lie on the ground nearby.'), 'info');
    // Beaten in an earlier fight, they may ask to yield at once.
    offerYield(styleFor(p.tags));
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

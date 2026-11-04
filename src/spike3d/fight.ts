import { ARMOUR, WEAPONS } from '../content/chargen/equipment';
import { styleFor } from '../content/combat/styles';
import { rollableName } from '../content/rollables';
import { THINGS } from '../content/things';
import { WOUND_TABLES } from '../content/wounds';
import { baseArmour, baseDamage, type Dice, diceText } from '../core/chargen/tables';
import {
  ADJACENT, type Choice, type Fight, type Fighter, type FightItem, type FightRules, type LogLine, PICKUP_REACH, attackTactics,
  between, canAct, chooseFor, loadDiceOf, resolveRound, roleOf, startFight, weaponOf,
} from '../core/combat';
import { type Injuries, endOfScene, totalFatigue, unhurt } from '../core/damage';
import type { Roll } from '../core/dice';
import type { Hero } from '../core/hero';
import { type RolledSheet, sheetDice } from '../core/npcsheet';
import { Rng } from '../core/rng';
import { thingName } from '../core/world3d/actions';
import type { SpikeWorld } from '../engine3d/world';
import { t } from '../i18n';
import { showRolls } from '../ui/dice';

/**
 * A fight on the page (plan B8a): the hero against someone of the map, played in rounds by the rules
 * (`core/combat.ts`). The world stops; each round the hero makes one choice (close in, pick something up, a tactic to
 * strike or defend, retreat), the other side chooses by their fighting style (`content/combat/styles.ts`), the round
 * is resolved, the dice are shown, and the world plays it out: walking, swings, a sword falling on the sand, someone
 * going down. To the death (Q46): a fighter who wins may finish the other. Injuries stay on the person (saved).
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
}

const rowOf = (sv: string) => WEAPONS.find((w) => w.sv === sv);
/** The weapon row of a kind of thing held (an improvised one for anything else). */
const rowOfKind = (kind: string) => rowOf(THINGS.has(kind) ? THINGS.get(kind).weapon ?? IMPROVISED : IMPROVISED);
/** The kind of thing that is this row (a sword in the world for the sheet's sword). */
const kindOfRow = (sv: string): string | null => THINGS.placeable.find((k) => THINGS.get(k).weapon === sv) ?? null;
const units = (d: Dice) => d.n * 4 + d.mod;

export function makeFight(world: () => SpikeWorld, hero: Hero, notify: (text: string) => void, save: () => void, newGame: () => void): FightUI {
  const el = document.getElementById('fight')!;
  const headEl = el.querySelector<HTMLElement>('.head')!, usEl = el.querySelector<HTMLElement>('.us')!, themEl = el.querySelector<HTMLElement>('.them')!;
  const logEl = el.querySelector<HTMLElement>('.log')!, choicesEl = el.querySelector<HTMLElement>('.choices')!;
  let fight: Fight | null = null;
  let foeId = '';
  let busy = false;
  const rng = Rng.fromSeed(`fight:${Date.now()}`);
  const rules: FightRules = { tables: WOUND_TABLES, ground: GROUND };
  const names = new Map<string, string>();
  const nameOf = (id: string) => names.get(id) ?? id;
  /** What a weapon in the fight is called (its kind's name). */
  const kindName = (id: string): string => {
    const k = world().thingKind(id);
    return k && THINGS.has(k) ? thingName(THINGS.get(k)) : t('fight.aweapon', 'weapon');
  };

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

  /** How someone is, in a line: fatigue, wounds, bleeding, and what holds them back this round. */
  function stateText(f: Fighter): string {
    const i = f.injuries;
    if (i.dead) return t('fight.dead', 'dead');
    const bits: string[] = [];
    if (i.out) bits.push(i.dying ? t('fight.dying', 'dying') : t('fight.out', 'knocked out'));
    bits.push(t('fight.fatigue', 'fatigue {n}', { n: totalFatigue(i) }));
    const wounds = Object.entries(i.wounds).filter(([, n]) => n).map(([p, n]) => `${t(`fight.part.${p}`, PART[p] ?? p)} ${n}`);
    if (wounds.length) bits.push(t('fight.wounds', 'wounds: {w}', { w: wounds.join(', ') }));
    if (i.pain) bits.push(t('fight.pain', 'pain {n}', { n: i.pain }));
    if (i.bleed) bits.push(t('fight.bleed', 'bleeding {r}', { r: i.bleed.rate }));
    if (i.short.length) bits.push(i.short.map((s) => t(`fight.short.${s}`, SHORT[s])).join(', '));
    if (i.broken.length) bits.push(t('fight.broken', 'broken {b}', { b: i.broken.join(', ') }));
    const skill = weaponOf(f).skill, pool = f.pools[skill];
    const dice = pool && (pool.n > 0 || pool.mod > 0) ? diceText(pool) : t('fight.untrained', '1D6, untrained');
    const w = `${f.weapon ? kindName(f.weapon.id) : t('fight.bare', 'bare hands')} (${rollableName(skill)} ${dice})`;
    return `${w} · ${bits.join(' · ')}`;
  }

  function refresh(): void {
    if (!fight) return;
    const me = fight.fighters[0], foe = fight.fighters[1];
    const role = roleOf(fight, 'hero');
    const d = between(fight, 'hero', foeId);
    headEl.textContent = t('fight.head', 'Round {r} · {d} m · {role}', {
      r: fight.round, d: d.toFixed(1),
      role: fight.winner !== null ? t('fight.over', 'over') : role === 'attacker' ? t('fight.attacking', 'you attack') : role === 'defender' ? t('fight.defending', 'you defend') : t('fight.free', 'not in reach'),
    });
    usEl.textContent = `${t('fight.you', 'You')}: ${stateText(me)}`;
    themEl.textContent = `${nameOf(foeId)}: ${stateText(foe)}`;
    choicesEl.replaceChildren();
    for (const c of choices()) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = c.label;
      b.addEventListener('click', () => void c.go());
      choicesEl.appendChild(b);
    }
  }

  /** What the hero can choose now, one button each: the round's whole choice in a tap. */
  function choices(): { label: string; go: () => Promise<void> | void }[] {
    if (!fight) return [];
    const me = fight.fighters[0], foe = fight.fighters[1];
    const out: { label: string; go: () => Promise<void> | void }[] = [];
    if (me.injuries.dead) return [{ label: t('fight.newgame', 'New game'), go: newGame }];
    if (fight.winner !== null) {
      if (fight.winner === 0 && !foe.injuries.dead && (foe.injuries.out || foe.injuries.dying)) {
        out.push({ label: t('fight.finish', 'Finish them'), go: () => play({ mercy: foeId, ...(between(fight!, 'hero', foeId) > ADJACENT ? { move: { x: foe.x, z: foe.z } } : {}) }) });
      }
      out.push({ label: t('fight.leave', 'Walk away'), go: end });
      return out;
    }
    if (!canAct(me)) return [{ label: t('fight.wait', 'Lie still…'), go: () => play({}) }];
    const role = roleOf(fight, 'hero');
    // Something to pick up within reach (only empty-handed: one thing at a time).
    const near = !me.weapon ? fight.ground.filter((g) => Math.hypot(g.x - me.x, g.z - me.z) <= PICKUP_REACH) : [];
    const pick = near.map((g) => ({ label: t('fight.pickup', 'Pick up the {name}', { name: kindName(g.id) }), go: () => play({ pickUp: g.id, defend: 'standard' }) }));
    if (role === 'free') {
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
    } else {
      out.push({ label: t('fight.defend', 'Defend'), go: () => play({ defend: 'standard' }) });
      out.push({ label: t('fight.defensive', 'Defend carefully (+1D6, +1 fatigue)'), go: () => play({ defend: 'defensive' }) });
      out.push({ label: t('fight.counter', 'Counter (−1D6, attack next round, +1 fatigue)'), go: () => play({ defend: 'counter' }) });
      out.push(...pick);
    }
    return out;
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
    const theirs = chooseFor(fight, foeId, style, rng);
    const before = fight;
    const r = resolveRound(fight, { hero: mine, [foeId]: theirs }, rules, rng);
    fight = r.fight;
    await show(r.log, before, w);
    for (const f of fight.fighters) w.setInjuries(f.id, f.injuries);
    save();
    busy = false;
    if (fight.winner !== null && fight.winner !== 0 && fight.fighters[0].injuries.out && !fight.fighters[0].injuries.dead) {
      // They won and you are down: they finish it if their style does, else they leave you be.
      if (style.mercy) return play({});
      log(t('fight.spared', '{name} leaves you lying there.', { name: nameOf(foeId) }), 'bad');
    }
    if (fight.fighters[0].injuries.dead) log(t('fight.youdie', 'You are dead.'), 'bad');
    refresh();
  }

  /** A line about someone, said one way of the hero ("You close in.") and another of anyone else ("Arruns closes in."). */
  const of = (who: string, you: [key: string, text: string], they: [key: string, text: string], vars: Record<string, string | number> = {}): string =>
    who === 'hero' ? t(you[0], you[1], vars) : t(they[0], they[1], { who: nameOf(who), ...vars });
  /** A name to start a line or a label with. */
  const Name = (id: string): string => { const n = nameOf(id); return n.charAt(0).toUpperCase() + n.slice(1); };

  /** Show a round: moves walked, the dice of each blow, what happened, things dropped and picked up. */
  async function show(lines: LogLine[], before: Fight, w: SpikeWorld): Promise<void> {
    for (const l of lines) {
      switch (l.k) {
        case 'move': {
          w.moveFighter(l.who, l.to.x, l.to.z);
          if (l.roll) await showRolls([{ ...l.roll, label: `${Name(l.who)}: ${rollableName('attr:Förflyttning')}` }]);
          log(l.ran ? of(l.who, ['fight.ran.you', 'You run in.'], ['fight.ran', '{who} runs in.']) : of(l.who, ['fight.walked.you', 'You close in.'], ['fight.walked', '{who} closes in.']), l.who === 'hero' ? 'you' : 'they');
          break;
        }
        case 'pickUp':
          await settle(w);
          w.takeUp(l.who, l.item);
          log(of(l.who, ['fight.pickedup.you', 'You pick up the {thing}.'], ['fight.pickedup', '{who} picks up the {thing}.'], { thing: kindName(l.item) }), l.who === 'hero' ? 'you' : 'they');
          break;
        case 'open': {
          await settle(w);
          await showRolls(l.rolls.map((r, i) => ({ ...r, label: `${Name(before.fighters[i]?.id ?? '')}: ${rollableName('attr:Reaktion')}` })));
          log(of(l.attacker === 0 ? 'hero' : foeId, ['fight.opens.you', 'Blades cross. You have the upper hand.'], ['fight.opens', 'Blades cross. {who} has the upper hand.']), 'info');
          break;
        }
        case 'attack': {
          await settle(w);
          w.swing(l.who);
          const rolls: Roll[] = [{ ...l.attack, label: t('fight.attackroll', '{who}: attack', { who: Name(l.who) }) }];
          if (l.defend) rolls.push({ ...l.defend, label: t('fight.defroll', '{who}: {how}', { who: Name(l.target), how: t(`fight.how.${l.how}`, HOW[l.how]) }) });
          if (l.result) rolls.push({ ...l.result.damageRoll, label: t('fight.dmgroll', 'Damage') });
          if (l.result?.serious?.deathRoll) rolls.push({ ...l.result.serious.deathRoll, label: t('fight.deathroll', '{who}: death roll', { who: Name(l.target) }) });
          await showRolls(rolls);
          const you = l.who === 'hero';
          if (!l.hit) {
            const how = l.target === 'hero' ? t(`fight.verb.you.${l.how}`, HOW[l.how]) : t(`fight.verb.${l.how}`, VERB[l.how]);
            log(of(l.who, ['fight.miss.you', 'You strike; {target} {how} it.'], ['fight.miss', '{who} strikes; {target} {how} it.'], { target: nameOf(l.target), how }), you ? 'you' : 'they');
          } else {
            const res = l.result!;
            const part = t(`fight.part.${res.part}`, PART[res.part]);
            const what = res.net <= 0
              ? t('fight.glance', 'it glances off the armour')
              : res.serious ? t('fight.serious', 'a serious wound ({n} damage)', { n: res.net }) : t('fight.hurt', '{n} damage, {f} fatigue', { n: res.net, f: res.fatigue });
            log(of(l.who, ['fight.hit.you', 'You hit {target} in the {part}: {what}.'], ['fight.hit', '{who} hits {target} in the {part}: {what}.'], { target: nameOf(l.target), part, what }), you ? 'good' : 'bad');
            if (res.serious?.died) log(of(l.target, ['fight.killed.you', 'You fall.'], ['fight.killed', '{who} falls dead.']), you ? 'good' : 'bad');
            for (const rk of res.risks) if (rk.happened) log(rk.effect.k === 'break' ? t('fight.breaks', 'Bone breaks.') : t('fight.severed', 'Something is cut off.'), 'bad');
          }
          break;
        }
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
          if (l.end.rolls.length) await showRolls(l.end.rolls.map((r) => ({ ...r, label: `${Name(l.who)}: ${r.label ?? ''}` })));
          for (const n of l.end.notes) if (n !== 'stayed up') log(`${Name(l.who)}: ${t(`fight.note.${n.replace(/ /g, '')}`, n)}.`, 'info');
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
      // Injuries show on the bodies as they happen (lying down when out).
      for (const f of fight!.fighters) if (l.k === 'attack' || l.k === 'end' || l.k === 'mercy') w.setInjuries(f.id, f.injuries);
    }
    await settle(w);
  }

  /** The fight is over: the world goes on; the scene ends for those still alive (fatigue back, the knocked out wake). */
  function end(): void {
    const w = world();
    if (fight) for (const f of fight.fighters) if (!f.injuries.dead) w.setInjuries(f.id, endOfScene(f.injuries));
    w.endFight();
    fight = null;
    el.hidden = true;
    save();
  }

  function start(foe: string): void {
    const w = world();
    if (fight) return;
    const me = w.fighterAt('hero'), them = w.fighterAt(foe), p = w.talkPerson(foe);
    if (!me || !them || !p) return;
    if (w.injuriesOf(foe)?.dead) return notify(t('fight.alreadydead', '{name} is dead.', { name: p.name }));
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
    refresh();
  }

  return {
    start,
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
        usEl.textContent = themEl.textContent = '';
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

const PART: Record<string, string> = { head: 'head', torso: 'body', leftArm: 'left arm', rightArm: 'right arm', leftLeg: 'left leg', rightLeg: 'right leg' };
const SHORT: Record<string, string> = { dazed: 'dazed', back: 'knocked back', drop: 'lost grip', fall: 'down', armour: 'armour torn', grabbed: 'grabbed' };
const HOW: Record<string, string> = { parry: 'parry', block: 'block', dodge: 'dodge', none: 'no defence' };
const VERB: Record<string, string> = { parry: 'parries', block: 'blocks', dodge: 'dodges', none: 'takes' };

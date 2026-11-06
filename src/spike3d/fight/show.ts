import { rollableName } from '../../content/rollables';
import { diceText } from '../../core/chargen/tables';
import type { LogLine } from '../../core/combat';
import type { Roll } from '../../core/dice';
import type { MotionAct } from '../../core/world3d/motion';
import type { SpikeWorld } from '../../engine3d/world';
import { t } from '../../i18n';
import { showRolls } from '../../ui/dice';
import { effectText, partName, poolText } from '../condition';
import { cards } from './columns';
import { type FightCtx, cap } from './ctx';
import { HOW, VERDICT, hitWord } from './words';

/**
 * Showing a round (B8g F3, F4): the world plays it out (walks, strikes met by parries, flinches, falls), what a blow
 * did floats up over whoever was hit and lands on their outline, and the log says it. Fast mode: each exchange plays
 * at once and its dice go behind the log line (a tap throws them). Dice mode: one roll a step, only your own thrown.
 */

type Attack = Extract<LogLine, { k: 'attack' }>;

export interface Playback {
  /** Write a line in the log (the rolls made but not shown go behind it). */
  log(text: string, kind?: 'you' | 'they' | 'info' | 'good' | 'bad'): void;
  /** Show a round's lines, in order, and wait till the fighters stand still. */
  show(lines: LogLine[], w: SpikeWorld): Promise<void>;
  /** A new fight: an empty log, nothing waiting. */
  reset(): void;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function makePlayback(ctx: FightCtx): Playback {
  /** Rolls made but not shown (fast mode), waiting to go behind the next log line. */
  let stash: Roll[] = [];
  let lastLine: HTMLElement | null = null;
  const logEl = ctx.el.log;

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

  /** A line about someone, said one way of the hero ("You close in.") and another of anyone else ("Arruns closes in."). */
  const of = (who: string, you: [key: string, text: string], they: [key: string, text: string], vars: Record<string, string | number> = {}): string =>
    who === 'hero' ? t(you[0], you[1], vars) : t(they[0], they[1], { who: ctx.Name(who), ...vars });
  /** Whose: "your", "Arruns's". */
  const whose = (id: string): string => (id === 'hero' ? t('fight.your', 'your') : t('fight.whose', '{who}’s', { who: ctx.Name(id) }));
  /** Show rolls, throwing only the hero's (`mine[i]`); the others are written beside them. */
  const reveal = (rolls: Roll[], mine: boolean[], notes: string[] = []): Promise<void> => {
    if (ctx.fast()) {
      stash.push(...rolls);
      return Promise.resolve();
    }
    return showRolls(rolls, { unthrown: mine.flatMap((m, i) => (m ? [] : [i])), notes });
  };

  /** Words or a number rising slowly over someone and fading (the old-game way): red for a hit, pale for a miss. */
  function float(id: string, text: string, kind: 'hit' | 'miss', sub = ''): void {
    const stage = document.getElementById('stage');
    const at = ctx.world().screenOf(id);
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

  /** Wait until the fighters have walked where the round sent them (or a while, at most). */
  async function settle(w: SpikeWorld): Promise<void> {
    for (let k = 0; k < 60 && (w.fighterMoving('hero') || w.fighterMoving(ctx.s.foeId)); k++) await sleep(100);
  }

  /**
   * One exchange played out: the strike; the defender's parry, block or dodge timed so its contact meets the blow, or
   * on a hit a flinch (a stagger when it hurt badly; going down is the fall, from their injuries). At the contact a
   * miss floats up; with `landed` (fast mode) what the hit did floats up and lands on their outline too (in dice mode
   * that waits for the where and damage rolls). Then a moment to take it in.
   */
  async function exchange(l: Attack, landed: boolean): Promise<void> {
    const w = ctx.world();
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
  function seeHit(l: Attack): void {
    if (!l.hit || !l.result || l.result.net <= 0) return;
    (ctx.s.seen[l.target] ??= []).push({ part: l.result.part, type: l.type ?? 'cut', serious: !!l.result.serious });
    cards(ctx);
  }

  /** What a hit did, floating up over them: the damage on easy (and a serious wound under it), else a word (Q50). */
  function floatHit(l: Attack): void {
    const r = l.result;
    if (!r) return;
    if (ctx.level().foeExact) float(l.target, String(Math.max(0, r.net)), 'hit', r.serious ? t('fight.w.serious', 'serious wound') : '');
    else float(l.target, hitWord(r, l.type ?? 'cut'), 'hit');
  }

  /**
   * A blow. Fast mode: the exchange plays out at once and its rolls go behind the log. Dice mode (B8g F4), one roll a
   * step: the attack (their defence written beside, only your own dice thrown), then the exchange plays out; where it
   * lands (D10), and the blow lands on their outline; the damage, less armour, and it floats up; the serious wound's
   * D10 with the death roll and breaks. The log line for each step is written once its dice have landed.
   */
  async function showAttack(l: Attack): Promise<void> {
    const lv = ctx.level();
    const dice = !ctx.fast();
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
    const rolls: Roll[] = [{ ...l.attack, label: t('fight.attackroll', '{who}: attack', { who: ctx.Name(l.who) }) }];
    const mine = [atkMine];
    if (l.defend) { rolls.push({ ...l.defend, label: t('fight.defroll', '{who}: {how}', { who: ctx.Name(l.target), how }) }); mine.push(defMine); }
    const adv = l.advantages ? [l.advantages === 1 ? t('fight.adv1', '1 advantage: more damage') : t('fight.advn', '{n} advantages: more damage', { n: l.advantages })] : [];
    if (!dice) await exchange(l, true);
    await reveal(rolls, mine, [`${cap(verdict)}.`, ...adv]);
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
      if (s.deathRoll) { wRolls.push({ ...s.deathRoll, label: t('fight.deathroll', '{who}: death roll', { who: ctx.Name(l.target) }) }); wMine.push(defMine); }
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
    const fight = () => ctx.s.fight!;
    const foeId = ctx.s.foeId;
    for (const l of lines) {
      switch (l.k) {
        case 'move': {
          w.moveFighter(l.who, l.to.x, l.to.z);
          if (l.roll) await reveal([{ ...l.roll, label: `${ctx.Name(l.who)}: ${rollableName('attr:Förflyttning')}` }], [l.who === 'hero']);
          log(l.ran ? of(l.who, ['fight.ran.you', 'You run in.'], ['fight.ran', '{who} runs in.']) : of(l.who, ['fight.walked.you', 'You close in.'], ['fight.walked', '{who} closes in.']), l.who === 'hero' ? 'you' : 'they');
          break;
        }
        case 'draw':
          if (l.who === 'hero') w.drawOwn(l.item);
          log(of(l.who, ['fight.drew.you', 'You draw your {thing}.'], ['fight.drew', '{who} draws a {thing}.'], { thing: ctx.kindName(l.item) }), l.who === 'hero' ? 'you' : 'they');
          break;
        case 'pickUp':
          await settle(w);
          w.takeUp(l.who, l.item);
          log(of(l.who, ['fight.pickedup.you', 'You pick up the {thing}.'], ['fight.pickedup', '{who} picks up the {thing}.'], { thing: ctx.kindName(l.item) }), l.who === 'hero' ? 'you' : 'they');
          break;
        case 'initiative': {
          await settle(w);
          await reveal(l.rolls.map((r, i) => ({ ...r, label: `${ctx.Name(l.ids[i] ?? '')}: ${rollableName('attr:Reaktion')}` })), l.ids.map((id) => id === 'hero'));
          log(l.upper === 0
            ? t('fight.upper.you', 'You are quicker: you see what {who} means to do.', { who: ctx.nameOf(foeId) })
            : t('fight.upper.they', '{who} is quicker: they will see what you do.', { who: ctx.Name(foeId) }), 'info');
          break;
        }
        case 'open': {
          await settle(w);
          const ids = fight().fighters.map((f) => f.id);
          if (l.rolls.length) await reveal(l.rolls.map((r, i) => ({ ...r, label: `${ctx.Name(ids[i] ?? '')}: ${rollableName('attr:Reaktion')}` })), ids.map((id) => id === 'hero'));
          ctx.s.roleWhy = 'quicker';
          log(of(l.attacker === 0 ? 'hero' : foeId, ['fight.opens.you', 'Blades cross. You have the upper hand.'], ['fight.opens', 'Blades cross. {who} has the upper hand.']), 'info');
          break;
        }
        case 'attack':
          await settle(w);
          await showAttack(l);
          break;
        case 'drop':
          w.dropAt(l.who, l.item, l.at.x, l.at.z);
          log(of(l.who, ['fight.dropped.you', 'You drop the {thing}.'], ['fight.dropped', '{who} drops the {thing}.'], { thing: ctx.kindName(l.item) }), l.who === 'hero' ? 'bad' : 'good');
          break;
        case 'retreat':
          w.moveFighter(l.who, l.to.x, l.to.z);
          log(of(l.who, ['fight.retreats.you', 'You break off and step back.'], ['fight.retreats', '{who} breaks off and steps back.']), 'info');
          break;
        case 'roles':
          ctx.s.roleWhy = 'won';
          log(of(l.attacker === 0 ? 'hero' : foeId, ['fight.turns.you', 'Now you press the attack.'], ['fight.turns', 'Now {who} presses the attack.']), 'info');
          break;
        case 'end': {
          if (l.end.rolls.length) await reveal(l.end.rolls.map((r) => ({ ...r, label: `${ctx.Name(l.who)}: ${r.label ?? ''}` })), l.end.rolls.map(() => l.who === 'hero'));
          for (const n of l.end.notes) if (n !== 'stayed up') log(`${ctx.Name(l.who)}: ${t(`fight.note.${n.replace(/ /g, '')}`, n)}.`, l.who === 'hero' ? 'bad' : 'good');
          break;
        }
        case 'plead': {
          const mine = l.who === 'hero';
          const said = l.granted
            ? of(l.who, ['fight.spared.you', '{foe} lowers their weapon and lets you yield.'], ['fight.spared.they', 'You let {who} yield.'], { foe: ctx.Name(foeId) })
            : of(l.who, ['fight.refused.you', '{foe} won’t hear of it.'], ['fight.refused.they', '{who} begs; you fight on.'], { foe: ctx.Name(foeId) });
          log(of(l.who, ['fight.pleads.you', 'You ask to yield.'], ['fight.pleads', '{who} asks to yield.']), mine ? 'you' : 'they');
          await reveal([{ ...l.roll, label: t('fight.plearoll', '{who}: plea', { who: ctx.Name(l.who) }) }], [mine], [said]);
          log(said, l.granted ? 'info' : 'bad');
          if (l.granted && mine) w.noteYield(foeId);
          break;
        }
        case 'mercy':
          await settle(w);
          w.play(l.who, 'finish');
          if (ctx.fast()) await sleep(1300);
          log(of(l.who, ['fight.mercy.you', 'You give {target} the killing stroke.'], ['fight.mercy', '{who} gives {target} the killing stroke.'], { target: ctx.nameOf(l.target) }), l.who === 'hero' ? 'good' : 'bad');
          break;
        case 'over':
          log(l.winner === 0 ? t('fight.won', 'You have won.') : l.winner === 1 ? t('fight.lost', 'You are beaten.') : t('fight.nobody', 'No one is left standing.'), l.winner === 0 ? 'good' : 'bad');
          break;
      }
      // Injuries show on the bodies and the cards as they happen (lying down when out).
      if (l.k === 'attack' || l.k === 'end' || l.k === 'mercy') {
        for (const f of fight().fighters) w.setInjuries(f.id, f.injuries);
        cards(ctx);
      }
      flushRolls();
    }
    await settle(w);
  }

  return {
    log,
    show,
    reset() {
      logEl.replaceChildren();
      stash = [];
      lastLine = null;
    },
  };
}

import { rollableName } from '../content/rollables';
import { type Dice, diceText } from '../core/chargen/tables';
import { type ModWhy, type PoolWhy, poolMean } from '../core/combat';
import {
  BODY_PARTS, type Effect, type FatigueWhy, FATIGUE_WHYS, type Injuries, type PenaltyWhy, type RollUse, penaltyParts, totalFatigue, unhurt,
} from '../core/damage';
import { BROKEN_PART, type SeenHit, bodyOutline, lostPart } from './outline';

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
import { DIFFICULTY_RULES, REST_SPEED } from '../core/difficulty';
import type { Hero } from '../core/hero';
import type { SpikeWorld } from '../engine3d/world';
import { t } from '../i18n';
import { loadSettings } from '../ui/settings';

/**
 * How someone is, in words a player can follow (B8a, the director's notes after the first fight): fatigue and
 * where every point of it came from, the dice injuries take off each kind of roll and why, wounds, pain, bleeding.
 * The fight panel's cards use the short forms; the condition sheet (the "You" button, or tapping your card in a
 * fight) shows it all. How exact it is follows the difficulty: on hard your own fatigue is only words.
 */

export const PART: Record<string, string> = { head: 'head', torso: 'body', leftArm: 'left arm', rightArm: 'right arm', leftLeg: 'left leg', rightLeg: 'right leg' };
export const SHORT: Record<string, string> = { dazed: 'dazed', back: 'knocked back', drop: 'lost grip', fall: 'down', armour: 'armour torn', grabbed: 'grabbed' };

export const partName = (p: string): string => t(`fight.part.${p}`, PART[p] ?? p);

const WHY: Record<ModWhy, string> = {
  quick: 'quick strike', powerful: 'powerful strike', careful: 'careful defence', counter: 'counter', weak: 'too heavy for you',
  drew: 'picked up this round', flexible: 'their weapon bends round', fists: 'bare hands against a weapon', weakWeapon: 'weak weapon',
  load: 'armour’s load', shield: 'shield', pain: 'pain', ribs: 'broken ribs', grounded: 'on the ground (a broken leg)', blinded: 'blinded', eye: 'one eye',
  head: 'head wound', torso: 'body wound', leftArm: 'left arm wound', rightArm: 'right arm wound', leftLeg: 'left leg wound', rightLeg: 'right leg wound',
  dazed: 'dazed', back: 'knocked back', drop: 'lost grip', fall: 'down', armour: 'armour torn', grabbed: 'grabbed',
};
/** A reason a pool changed, in words. */
export const whyName = (w: ModWhy | PenaltyWhy): string => t(`fight.why.${w}`, WHY[w]);

const FATIGUE_WHY: Record<FatigueWhy, string> = {
  hits: 'blows taken', bleeding: 'bleeding', fire: 'burning', powerful: 'powerful strikes', quick: 'quick strikes', careful: 'careful defence', counter: 'counters',
};

const signed = (n: number): string => (n > 0 ? `+${n}D6` : `−${-n}D6`);

/** "3D6 (Sword 2D6, quick strike +1D6, pain −1D6)"; untrained says so. */
export function poolText(p: PoolWhy): string {
  const base = `${rollableName(p.skill)} ${diceText(p.base)}${p.untrained ? ` ${t('fight.untrainedtag', 'untrained')}` : ''}`;
  const mods = p.mods.map((m) => (m.why === 'shield' && m.dice ? `${whyName('shield')} +${diceText(m.dice)}` : `${whyName(m.why)} ${signed(m.n)}`));
  return `${diceText(p.dice)} (${[base, ...mods].join(', ')})`;
}

/** Fatigue in words, against what the shock roll is made with (Livskraft against fatigue). */
export function fatigueWord(i: Injuries, vitality: Dice): string {
  const r = totalFatigue(i) / Math.max(1, poolMean(vitality));
  if (r <= 0) return t('fight.tired0', 'not tired');
  if (r < 0.35) return t('fight.tired1', 'a little tired');
  if (r < 0.7) return t('fight.tired2', 'tired');
  if (r < 1) return t('fight.tired3', 'very tired');
  return t('fight.tired4', 'about to drop');
}

/** How full the fatigue bar is (1: the shock roll's mean, where most go down). */
export const fatigueShare = (i: Injuries, vitality: Dice): number => Math.min(1, totalFatigue(i) / Math.max(1, poolMean(vitality)));

/** The lasting harm in short words: "right arm 2 · pain 1 · bleeding 2 · broken ribs". */
export function harmBits(i: Injuries, exact: boolean): string[] {
  const bits: string[] = [];
  for (const [p, n] of Object.entries(i.wounds)) if (n) bits.push(exact ? `${partName(p)} ${n}` : partName(p));
  if (i.pain) bits.push(exact ? t('fight.pain', 'pain {n}', { n: i.pain }) : t('fight.painw', 'in pain'));
  if (i.bleed) bits.push(exact ? t('fight.bleed', 'bleeding {r}', { r: i.bleed.rate }) : t('fight.bleedw', 'bleeding'));
  for (const b of i.broken) bits.push(t('fight.brokenpart', 'broken {b}', { b }));
  for (const s of i.short) bits.push(t(`fight.short.${s}`, SHORT[s]));
  return bits;
}

const BONE: Record<string, string> = { neck: 'neck', skull: 'skull', ribs: 'ribs', spine: 'spine', hip: 'hip', leftArm: 'left arm', rightArm: 'right arm', leftLeg: 'left leg', rightLeg: 'right leg' };

/**
 * What one after-effect of a serious wound does, in a few words of our own (the director: "breaks ribs", rather than
 * a bare number): shown when the wound is dealt, in the fight's third step and the log.
 */
export function effectText(e: Effect): string {
  const p = 'part' in e && e.part ? partName(e.part) : '';
  switch (e.k) {
    case 'dazed': return t('fx.dazed', 'dazed');
    case 'back': return t('fx.back', 'knocked back');
    case 'drop': return p ? t('fx.dropin', 'loses grip with the {p}', { p }) : t('fx.drop', 'loses their grip');
    case 'fall': return t('fx.fall', 'knocked down');
    case 'armour': return p ? t('fx.armourin', 'armour torn from the {p}', { p }) : t('fx.armour', 'armour torn');
    case 'grabbed': return t('fx.grabbed', 'caught and held');
    case 'blinded': return t('fx.blinded', 'blinded by blood');
    case 'internal': return t('fx.internal', 'bleeding inside');
    case 'eye': return t('fx.eye', 'an eye lost');
    case 'feature': return t('fx.feature', 'a nose or ear ruined');
    case 'genitals': return t('fx.genitals', 'a crippling groin wound');
    case 'pain': return t('fx.pain', 'pain +{n}', { n: e.n });
    case 'wound': return e.n === 1 ? t('fx.wound1', 'a wound to the {p}', { p }) : t('fx.woundn', '{n} wounds to the {p}', { n: e.n, p });
    case 'bleed': return t('fx.bleed', 'bleeding {n} a round', { n: e.rate });
    case 'infect': return t('fx.infect', 'the wound may fester');
    case 'ignite': return t('fx.ignite', 'set alight');
    case 'break': return t('fx.break', 'may break the {b}', { b: BONE[e.area] ?? e.area });
    case 'cut': return t('fx.cut', 'may lose the {a}', { a: `${e.side ? `${e.side} ` : ''}${e.area}` });
    case 'teeth': return t('fx.teeth', '{n} teeth knocked out', { n: e.n });
    case 'attr': return t('fx.attr', '{a} lowered for good', { a: rollableName(`attr:${e.attr}`) });
    case 'hands': return t('fx.hands', 'hands crippled');
  }
}

/** The rolls injuries weigh on, for the sheet. */
const USES: { label: [string, string]; use: RollUse }[] = [
  { label: ['cond.use.right', 'Fighting (right hand)'], use: { kind: 'combat', arms: ['right'] } },
  { label: ['cond.use.both', 'Fighting (both hands)'], use: { kind: 'combat', arms: ['left', 'right'] } },
  { label: ['cond.use.move', 'Dodging, running'], use: { kind: 'movement' } },
  { label: ['cond.use.shock', 'Shock rolls'], use: { kind: 'shock' } },
  { label: ['cond.use.death', 'Death rolls'], use: { kind: 'death' } },
];

/**
 * Fill a box with everything about someone's condition. `exact`: numbers for fatigue (else words). Beside it their
 * body outline (the director: the outline in the details too), with the blows `seen` on it; pointing at a part (or
 * tapping it) lights the lines about it, and pointing at such a line lights its part.
 */
export function renderCondition(box: HTMLElement, i: Injuries, vitality: Dice, exact: boolean, restMinutes: number, seen: SeenHit[] = []): void {
  box.replaceChildren();
  const fig = bodyOutline(i, seen, true, null);
  fig.classList.add('cond-fig');
  box.appendChild(fig);
  /** Light a part and the lines about it (null: none). */
  const light = (part: string | null): void => {
    for (const r of fig.querySelectorAll<SVGElement>('[data-part]')) r.classList.toggle('hl', r.dataset.part === part);
    for (const p of box.querySelectorAll<HTMLElement>('p[data-parts]')) p.classList.toggle('hl', !!part && p.dataset.parts!.split(' ').includes(part));
  };
  let pinned: string | null = null;
  for (const r of fig.querySelectorAll<SVGElement>('[data-part]')) {
    const part = r.dataset.part!;
    r.addEventListener('pointerenter', () => light(part));
    r.addEventListener('pointerleave', () => light(pinned));
    r.addEventListener('click', () => light((pinned = pinned === part ? null : part)));
  }
  const sec = (title: string): HTMLElement => {
    const s = document.createElement('section');
    const h = document.createElement('h3');
    h.textContent = title;
    s.appendChild(h);
    box.appendChild(s);
    return s;
  };
  const line = (s: HTMLElement, text: string, cls = '', parts: string[] = []): void => {
    const p = document.createElement('p');
    if (cls) p.className = cls;
    p.textContent = text;
    if (parts.length) {
      p.dataset.parts = parts.join(' ');
      p.addEventListener('pointerenter', () => light(parts[0]));
      p.addEventListener('pointerleave', () => light(pinned));
    }
    s.appendChild(p);
  };
  if (i.dead) return line(sec(t('cond.state', 'State')), t('fight.dead', 'dead'));
  if (i.out) line(sec(t('cond.state', 'State')), i.dying ? t('cond.dying', 'Dying: knocked out and bled out.') : t('cond.out', 'Knocked out. You come round when your fatigue is gone.'), 'bad');

  // Fatigue, and where it came from.
  const total = totalFatigue(i);
  const f = sec(exact ? t('cond.fatigue', 'Fatigue {n}', { n: total }) : t('cond.fatiguew', 'Fatigue: {w}', { w: fatigueWord(i, vitality) }));
  const bar = document.createElement('div');
  bar.className = 'bar';
  const fill = document.createElement('i');
  fill.style.width = `${Math.round(fatigueShare(i, vitality) * 100)}%`;
  bar.appendChild(fill);
  f.appendChild(bar);
  const parts: [string, number][] = FATIGUE_WHYS.filter((w) => i.fatigueFrom[w]).map((w) => [t(`cond.from.${w}`, FATIGUE_WHY[w]), i.fatigueFrom[w] ?? 0]);
  if (i.baseFatigue) parts.push([t('cond.from.base', 'what you carry and wear'), i.baseFatigue]);
  if (i.infection) parts.push([t('cond.from.infection', 'infection'), i.infection.level]);
  for (const [what, n] of parts) line(f, exact ? t('cond.fromline', '{n} / {total} from {what}', { n, total, what }) : t('cond.fromword', 'from {what}', { what }));
  if (!parts.length) line(f, t('cond.nofatigue', 'None.'));
  line(f, exact
    ? t('cond.shock', 'When a blow gets through: a shock roll, {vit} against {n}. Fail and you go down.', { vit: `${rollableName('attr:Livskraft')} ${diceText(vitality)}`, n: total })
    : t('cond.shockw', 'When a blow gets through you roll {vit} against it; fail and you go down.', { vit: rollableName('attr:Livskraft') }), 'note');
  const mins = (m: number): string => (m === 1 ? t('cond.aminute', 'minute') : t('cond.minutes', '{m} minutes', { m: +m.toFixed(1) }));
  line(f, t('cond.rest', 'One point back every {m} of world time; sitting down, every {r}.', { m: mins(restMinutes), r: mins(restMinutes / REST_SPEED) }), 'note');

  // The dice taken off rolls, and why.
  const d = sec(t('cond.dice', 'Dice off your rolls'));
  let any = false;
  for (const u of USES) {
    const ps = penaltyParts(i, u.use);
    if (!ps.length) continue;
    any = true;
    const n = ps.reduce((s, p) => s + p.n, 0);
    const parts = ps.flatMap((p) => ((BODY_PARTS as string[]).includes(p.why) ? [p.why] : p.why === 'ribs' ? ['torso'] : []));
    line(d, `${t(u.label[0], u.label[1])}: −${n}D6 (${ps.map((p) => `${whyName(p.why)} −${p.n}D6`).join(', ')})`, '', parts);
  }
  if (!any) line(d, t('cond.nodice', 'Nothing holds you back.'));

  // What lasts: wounds, pain, bleeding, breaks.
  const w = sec(t('cond.harm', 'Wounds and the rest'));
  // Each with the part(s) of the body it is on, for the outline.
  const lasting: [string, string[]][] = [];
  for (const [p, n] of Object.entries(i.wounds)) if (n) lasting.push([t('cond.wound', '{part}: {n} of 3 wounds', { part: partName(p), n }), [p]]);
  if (i.pain) lasting.push([t('cond.pain', 'Pain {n}: −{n}D6 on fighting, moving and the attributes that need the body.', { n: i.pain }), []]);
  const bledAt = [...seen].reverse().find((h) => h.serious)?.part;
  if (i.bleed) lasting.push([t('cond.bleed', 'Bleeding: {r} fatigue a round, until stopped (difficulty {d}).', { r: i.bleed.rate, d: i.bleed.diff }), bledAt ? [bledAt] : []]);
  if (i.infection) lasting.push([t('cond.infection', 'Infection, level {n}.', { n: i.infection.level }), []]);
  if (i.internal) lasting.push([t('cond.internal', 'Internal injuries: {n}.', { n: i.internal }), ['torso']]);
  for (const b of i.broken) lasting.push([t('cond.broken', 'Broken: {b}.', { b }), [BROKEN_PART[b]]]);
  for (const l of i.lost) { const p = lostPart(l); lasting.push([t('cond.lost', 'Lost: {a}.', { a: `${l.side ? `${l.side} ` : ''}${l.area}` }), p ? [p] : []]); }
  for (const a of i.armourOff) lasting.push([t('cond.armouroff', 'Armour torn off the {part}.', { part: partName(a) }), [a]]);
  if (i.short.length) lasting.push([t('cond.short', 'Until your next turn: {s}.', { s: i.short.map((s) => t(`fight.short.${s}`, SHORT[s])).join(', ') }), []]);
  // Blows seen that left no lasting wound still show where they landed.
  for (const part of BODY_PARTS) {
    const n = seen.filter((h) => h.part === part).length;
    if (n && !i.wounds[part]) lasting.push([t('cond.blows', '{part}: hit {n}×, no lasting wound.', { part: cap(partName(part)), n }), [part]]);
  }
  for (const [text, parts] of lasting) line(w, text, '', parts);
  if (!lasting.length) line(w, t('cond.unhurt', 'Unhurt.'));
}

export interface ConditionSheet {
  /** Open the sheet on the hero (or someone in a fight, with their injuries). */
  open(i?: Injuries, vitality?: Dice, title?: string, seen?: SeenHit[]): void;
}

/** The hero's condition sheet: the "You" button at the bottom left, or a tap on your card in a fight. */
export function makeCondition(world: () => SpikeWorld, hero: Hero): ConditionSheet {
  const el = document.getElementById('condition')!, body = el.querySelector<HTMLElement>('.list')!, titleEl = el.querySelector<HTMLElement>('.head b')!;
  el.querySelector('.close')!.addEventListener('click', () => (el.hidden = true));
  const openBtn = document.getElementById('condition-open')!;
  const vit = (): Dice => hero.dice['attr:Livskraft'] ?? { n: 2, mod: 0 };
  function open(i?: Injuries, vitality?: Dice, title?: string, seen: SeenHit[] = []): void {
    const rules = DIFFICULTY_RULES[loadSettings().difficulty];
    const own = !title;
    titleEl.textContent = title ?? t('cond.title', 'Your condition');
    const inj = i ?? world().injuriesOf('hero');
    renderCondition(body, inj ?? unhurt(), vitality ?? vit(), own ? rules.ownExact : rules.foeExact, rules.restMinutes, seen);
    el.hidden = false;
  }
  openBtn.addEventListener('click', () => (el.hidden ? open() : (el.hidden = true)));
  return { open };
}

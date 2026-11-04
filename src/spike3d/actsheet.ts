import { CONTENT } from '../content/chargen';
import { THINGS } from '../content/things';
import { defaultHero, heroFromChar, rollableName } from '../content/rollables';
import { derive } from '../core/chargen/derive';
import { loadRoster } from '../core/chargen/state';
import { type Hero, diceOf } from '../core/hero';
import { type ActResult, type ActTarget, type Doer, thingName } from '../core/world3d/actions';
import { HAUL_SKILL, carryCapacity, kgText } from '../core/world3d/carry';
import type { SpikeWorld } from '../engine3d/world';
import { t } from '../i18n';
import { showRolls } from '../ui/dice';
import { loadSettings } from '../ui/settings';

/**
 * The page's side of actions (plan B3a): a tapped thing's sheet (what it is, what can be tried), walking up to it,
 * doing it through the world (`SpikeWorld.act`, the frame in `core/world3d/actions.ts`), then the dice and what
 * happened. The rules decide; this only shows and asks.
 */

/** How close the hero must be to act on a thing, metres (from its middle: a hearth is wide). */
const REACH = 2.1;

/** The hero who acts: the character open in the creator, if they have skills yet; else the default shepherd. */
export function pageHero(): Hero {
  try {
    const r = loadRoster();
    const s = r.chars.find((c) => c.id === r.current) ?? r.chars[0];
    if (s) {
      const h = heroFromChar(s.details?.name ?? '', derive(s, CONTENT));
      if (Object.keys(h.dice).some((k) => !k.startsWith('attr:'))) return h;
    }
  } catch {
    /* a character the creator can't read: the shepherd */
  }
  return defaultHero();
}

export interface Sheet {
  open(target: ActTarget | null): void;
  close(): void;
  /** Every frame: an action waiting for the hero to arrive is done once they stop. */
  tick(): void;
}

/**
 * Whose a place is, in a line (plan B3c): on easy the household by name, else just "someone's"; the room; whether it
 * is open to you. Null in the wild.
 */
export function whoseText(w: ReturnType<SpikeWorld['whoseAt']>, names: boolean): string | null {
  if (!w) return null;
  if ('town' in w) return t('own.town', 'The town\'s.');
  const who = names && w.members.length
    ? t('own.home', '{names}\'s house', { names: w.members.length > 1 ? `${w.members.slice(0, -1).join(', ')} and ${w.members[w.members.length - 1]}` : w.members[0] })
    : t('own.someone', 'Someone\'s house');
  const room = w.room && THINGS.has(w.room) ? `: ${t(`thing.${w.room}.name`, thingName(THINGS.get(w.room)))}` : '';
  const open = w.leave ? t('own.leave', 'You have leave here until midnight.')
    : w.open ? t('own.open', 'Open to anyone, {a} to {b}.', { a: w.open[0], b: w.open[1] })
    : t('own.closed', 'Not yours to be in without leave.');
  return `${who}${room}. ${open}`;
}

/** The hero as a doer: what they roll for a skill or an attribute. */
export const heroDoer = (hero: Hero): Doer => ({ id: 'hero', dice: (s) => diceOf(hero, s), load: hero.load ?? 0 });

export function makeSheet(world: () => SpikeWorld, notify: (text: string) => void, save: () => void, doer: Doer, onLead: () => void = () => {}): Sheet {
  const el = document.getElementById('act')!;
  const nameEl = el.querySelector<HTMLElement>('.name')!, lookEl = el.querySelector<HTMLElement>('.look')!, offersEl = el.querySelector<HTMLElement>('.offers')!;
  const notice = document.getElementById('notice')!;
  let pending: { offer: string; target: ActTarget | null } | null = null;

  const close = (): void => {
    el.hidden = true;
    notice.classList.remove('above');
  };
  el.querySelector('.close')!.addEventListener('click', close);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !el.hidden) close(); });

  /** Say what happened: the dice first (if it rolled), then the lines, and how long it took. */
  async function report(r: ActResult, offer: string): Promise<void> {
    if (!r.done) {
      notify(t(`act.no.${offer}`, r.reason ?? 'That cannot be done.'));
      return;
    }
    // (A hidden read shows no dice: you can't tell how it went.)
    if (r.roll && !r.hidden) await showRolls([{ ...r.roll, label: r.skill ? rollableName(r.skill) : r.roll.label }]);
    const lines: string[] = [];
    r.events.forEach((e, i) => {
      if (e.kind === 'say') lines.push(t(`act.${offer}.${i}`, e.line.text));
      if (e.kind === 'time' && e.minutes >= 5) lines.push(t('act.time', '({n} minutes pass.)', { n: e.minutes }));
      // On easy: who saw a wrong, and how far it moved their view of you (B3c).
      if (e.kind === 'seen' && loadSettings().difficulty === 'easy') {
        lines.push(t('act.seen', '(Seen by {who}.)', { who: e.by.map((s) => `${s.name} −${s.by}`).join(', ') }));
      }
    });
    if (lines.length) notify(lines.join(' '));
    if (r.events.some((e) => e.kind === 'lead')) onLead();
    save();
  }

  function doIt(offer: string, target: ActTarget | null): void {
    void report(world().act(offer, target, doer), offer);
  }

  function choose(offer: string, target: ActTarget | null): void {
    close();
    const w = world();
    if (!target || w.reachTo(target) <= REACH) return doIt(offer, target);
    // Walk up to it first; it is done when they stop (see `tick`).
    if (w.walkTo(target.x, target.z, target.level) === null) return notify(t('act.noway', 'You can\'t get there.'));
    pending = { offer, target };
  }

  function open(target: ActTarget | null): void {
    const w = world();
    const kind = target ? THINGS.get(target.kind) : null;
    nameEl.textContent = kind ? t(`thing.${kind.id}.name`, cap(thingName(kind))) : t('act.here', 'Where you stand');
    lookEl.textContent = kind ? t(`thing.${kind.id}.look`, kind.look ?? '') : w.heroIndoors ? t('act.hereIn', 'A floor of boards and beaten earth.') : t('act.hereOut', 'Open ground.');
    // Looking at something that carries a lead gives it (plan B11): what you know of it, as the look.
    const lead = target ? w.lookAt(target) : null;
    if (lead) lookEl.textContent = lead.look;
    // Whose it is (B3c): a tapped thing in someone's house or the town's; names on easy.
    const whose = target ? whoseText(w.whoseAt(target), loadSettings().difficulty === 'easy') : null;
    if (whose) lookEl.textContent = `${lookEl.textContent} ${whose}`.trim();
    // What you carry (B3b), said where you stand.
    const held = !target && w.holding && THINGS.has(w.holding) ? THINGS.get(w.holding) : null;
    if (held) lookEl.textContent = `${lookEl.textContent} ${t('act.holding', 'You are carrying the {name}.', { name: t(`thing.${held.id}.name`, thingName(held)) })}`.trim();
    // What it weighs, on what can be taken; where you stand, what you can carry (B6).
    const kg = kind?.size && kind.weight !== undefined ? kind.weight : null;
    if (kg !== null) lookEl.textContent = `${lookEl.textContent} ${t('act.weighs', 'It weighs about {kg}.', { kg: kgText(kg) })}`.trim();
    if (!target) {
      const can = carryCapacity(doer.dice('attr:Kroppsbyggnad'), doer.dice(HAUL_SKILL), doer.load ?? 0);
      lookEl.textContent = `${lookEl.textContent} ${t('act.capacity', 'You can carry {kg} without trouble.', { kg: kgText(can) })}`.trim();
    }
    if (lead?.added) {
      notify(t('act.leadadded', 'Lead added: {title}.', { title: lead.title }));
      onLead();
      save();
    }
    offersEl.replaceChildren();
    const list = w.offersFor(target, doer);
    for (const o of list) {
      const b = document.createElement('button');
      b.type = 'button';
      const label = document.createElement('span');
      label.textContent = t(`act.offer.${o.id}`, o.label);
      b.appendChild(label);
      if (o.skills.length) {
        const s = document.createElement('small');
        s.textContent = o.skills.map(rollableName).slice(0, 2).join(', ');
        b.appendChild(s);
      }
      b.addEventListener('click', () => choose(o.id, target));
      offersEl.appendChild(b);
    }
    if (!list.length) {
      const p = document.createElement('p');
      p.className = 'none';
      p.textContent = t('act.nothing', 'Nothing to try here.');
      offersEl.appendChild(p);
    }
    el.hidden = false;
    notice.classList.add('above');
  }

  return {
    open,
    close,
    tick() {
      if (!pending || world().walking) return;
      const { offer, target } = pending;
      pending = null;
      if (target && world().reachTo(target) > REACH) return notify(t('act.cantreach', 'You can\'t get close enough.'));
      doIt(offer, target);
    },
  };
}

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

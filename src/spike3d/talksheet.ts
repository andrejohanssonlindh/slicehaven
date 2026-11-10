import { FACETS } from '../content/people';
import { rollableName } from '../content/rollables';
import type { Hero } from '../core/hero';
import type { Doer } from '../core/world3d/actions';
import { ASK_BUY, ASK_LEADS, ASK_SELL, BUY, SELL, leadAsks, moodOf, patienceLeft, talkOffers, tradeAsks } from '../core/world3d/talk';
import { silverText } from '../core/world3d/trade';

/** The way back from the list of leads. */
const BACK = 'talk:back';
import type { SpikeWorld } from '../engine3d/world';
import { t } from '../i18n';
import { showRolls } from '../ui/dice';
import { loadSettings } from '../ui/settings';
import type * as THREE from 'three';

/**
 * Talking to someone in the 3D world (plan B3d): their portrait, the conversation's log, and the choices laid over it.
 * Tap a person: the hero walks up, the person stops and turns to them, and the panel opens. Each choice is a social
 * try through the talk rules (`core/world3d/talk.ts`), rolled with the hero's sheet; the dice show it (not for a hidden
 * read). What they think of you is kept in the world's save. The portrait is their own 3D body close up, rendered
 * finer than the world (Q39).
 */

/** How close the hero stands to talk, metres. */
const TALK_REACH = 2.6;
/** The portrait's size in pixels: their 3D body close up, rendered finer than the world (Q39). */
const PORTRAIT_PX = 88;

export interface Talk {
  open(id: string): void;
  close(): void;
  tick(): void;
  readonly open_: boolean;
}

export function makeTalk(world: () => SpikeWorld, renderer: () => THREE.WebGLRenderer, hero: Hero, doer: Doer, notify: (text: string) => void, save: () => void, onLead: () => void = () => {}, onFight?: (id: string) => void, onExamine?: (id: string) => void): Talk {
  const el = document.getElementById('talk')!;
  const canvas = el.querySelector<HTMLCanvasElement>('.portrait canvas')!;
  const nameEl = el.querySelector<HTMLElement>('.name')!, whatEl = el.querySelector<HTMLElement>('.what')!, moodEl = el.querySelector<HTMLElement>('.mood')!;
  const logEl = el.querySelector<HTMLElement>('.log')!, choicesEl = el.querySelector<HTMLElement>('.choices')!;
  const visitor = { kind: hero.kind, people: hero.people, tags: hero.tags };
  let who: string | null = null;
  let pending: string | null = null;
  let busy = false;
  /** Showing a list under a choice: leads to ask about (B11), what they sell, what of yours they'd buy (B6). */
  let listing: 'leads' | 'buy' | 'sell' | null = null;
  const LISTS: Record<string, 'leads' | 'buy' | 'sell'> = { [ASK_LEADS]: 'leads', [ASK_BUY]: 'buy', [ASK_SELL]: 'sell' };

  function drawPortrait(): void {
    if (!who) return;
    const data = world().talking.portrait(renderer(), who, PORTRAIT_PX);
    if (!data) return;
    canvas.width = canvas.height = PORTRAIT_PX;
    canvas.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(data), PORTRAIT_PX, PORTRAIT_PX), 0, 0);
  }

  function log(text: string, kind: 'you' | 'they' | 'info' | 'good' | 'bad' = 'they'): void {
    const p = document.createElement('p');
    p.className = kind;
    p.textContent = text;
    logEl.appendChild(p);
    logEl.scrollTop = logEl.scrollHeight;
  }

  /** The name, what they are, how they seem, and what can be tried now. */
  function refresh(): void {
    if (!who) return;
    const w = world(), p = w.talking.talkPerson(who);
    if (!p) return close();
    const c = w.talking.talkCase(visitor, p.id);
    nameEl.textContent = p.name;
    const calling = [...p.tags].reverse().find((id) => FACETS[id]?.dim === 'station' && FACETS[id]?.parent !== 'station');
    const people = [...p.tags].reverse().find((id) => FACETS[id]?.dim === 'people');
    whatEl.textContent = [people, calling].filter(Boolean).map((id) => FACETS[id!].label).join(', ');
    // On easy, how they see you on their scale too (B3c).
    const view = w.owners.regardOf(p.id);
    moodEl.textContent = [moodOf(p, c) ?? '', loadSettings().difficulty === 'easy' ? t('talk.view', '(Their view of you: {n})', { n: view > 0 ? `+${view}` : String(view) }) : ''].filter(Boolean).join(' ');
    choicesEl.replaceChildren();
    // "Ask about something you know…" opens the list of leads (B11), with a way back.
    const back = { id: BACK, label: t('talk.back', '← Something else'), skills: [] as string[] };
    const list = listing === 'leads' ? [...leadAsks(p, c), back] : listing ? [...tradeAsks(p, c, listing), back] : talkOffers(p, c);
    if (listing === 'buy' || listing === 'sell') log(t('talk.purse', 'You have {s}.', { s: silverText(w.pack.money) }), 'info');
    for (const o of list) {
      const b = document.createElement('button');
      b.type = 'button';
      const label = document.createElement('span');
      label.textContent = t(`talk.offer.${o.id.split('/').pop()}`, o.label);
      b.appendChild(label);
      if (o.skills.length) {
        const s = document.createElement('small');
        s.textContent = o.skills.map(rollableName).slice(0, 2).join(', ');
        b.appendChild(s);
      }
      b.addEventListener('click', () => void choose(o.id, o.label));
      choicesEl.appendChild(b);
    }
    // Anyone can be fought (B8a): the fight takes over from the talk.
    if (onFight && !listing) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'fight';
      b.textContent = t('talk.attack', 'Attack');
      const id = who;
      b.addEventListener('click', () => {
        close();
        onFight(id);
      });
      choicesEl.appendChild(b);
    }
    if (patienceLeft(p, c) === 0) log(t('talk.enough', '{name} has had enough of talking for now.', { name: p.name }), 'info');
  }

  async function choose(offer: string, label: string): Promise<void> {
    if (!who || busy) return;
    if (LISTS[offer] || offer === BACK) {
      listing = LISTS[offer] ?? null;
      return refresh();
    }
    // (Buying or selling keeps the list open, for the next one.)
    if (!(offer.startsWith(BUY) || offer.startsWith(SELL))) listing = null;
    busy = true;
    log(label, 'you');
    const r = world().talking.talkTo(offer, who, doer, visitor);
    if (!r.done) log(r.reason ?? '', 'info');
    else {
      if (r.roll && !r.hidden) await showRolls([{ ...r.roll, label: r.skill ? rollableName(r.skill) : r.roll.label }]);
      for (const l of r.lines) log(l.text, l.tone === 'good' ? 'good' : l.tone === 'bad' ? 'bad' : l.tone === 'info' ? 'info' : 'they');
      if (r.lead) onLead();
      if (r.leave) log(t('talk.leave', 'You have leave in their house until midnight.'), 'good');
      save();
    }
    busy = false;
    refresh();
    drawPortrait();
  }

  function start(id: string): void {
    const w = world();
    who = id;
    listing = null;
    w.talking.talkingWith = id;
    logEl.replaceChildren();
    el.hidden = false;
    const p = w.talking.talkPerson(id);
    if (p) log(t('talk.meet', 'You turn to {name}.', { name: p.name }), 'info');
    refresh();
    // (The person turns to face the hero first: draw them once they have.)
    drawPortrait();
    setTimeout(drawPortrait, 350);
  }

  /**
   * Someone tapped from afar: talk (walk up to them first) or attack from where you stand (the director: how far
   * away you are shouldn't matter for an attack; with a bow later it really won't).
   */
  function far(id: string, metres: number): void {
    const w = world(), p = w.talking.talkPerson(id);
    if (!p) return;
    nameEl.textContent = p.name;
    whatEl.textContent = '';
    moodEl.textContent = '';
    // Their face, as in a talk (drawn from where they stand).
    const data = w.talking.portrait(renderer(), id, PORTRAIT_PX);
    canvas.width = canvas.height = PORTRAIT_PX;
    if (data) canvas.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(data), PORTRAIT_PX, PORTRAIT_PX), 0, 0);
    else canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    logEl.replaceChildren();
    log(t('talk.far', '{name} is {m} m away.', { name: p.name, m: Math.round(metres) }), 'info');
    choicesEl.replaceChildren();
    const button = (label: string, cls: string, go: () => void): void => {
      const b = document.createElement('button');
      b.type = 'button';
      if (cls) b.className = cls;
      b.textContent = label;
      b.addEventListener('click', go);
      choicesEl.appendChild(b);
    };
    button(t('talk.walkup', 'Walk up and talk'), '', () => {
      close();
      const at = world().talking.personSpot(id);
      // Walk up to them; they stop for you once you're close (see `tick`).
      if (!at || world().walkTo(at.x, at.z, at.level) === null) return notify(t('talk.noway', 'You can\'t get to them.'));
      pending = id;
    });
    if (onFight) button(t('talk.attack', 'Attack'), 'fight', () => { close(); onFight(id); });
    el.hidden = false;
  }

  function close(): void {
    el.hidden = true;
    who = null;
    pending = null;
    world().talking.talkingWith = null;
  }
  el.querySelector('.close')!.addEventListener('click', close);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !el.hidden) close(); });

  return {
    get open_() {
      return !el.hidden;
    },
    open(id) {
      close();
      const w = world(), at = w.talking.personSpot(id);
      if (!at) return;
      // A tap on someone stops a walk under way (the director: walking on while choosing ended in a jump).
      w.stopHero();
      // The dead and the senseless don't talk (the director: "using skills on dead people works").
      const hurt = w.fights.injuriesOf(id);
      const name = w.talking.talkPerson(id)?.name ?? id;
      // A body: walk up and look over its wounds (the director: see the injuries of the dead).
      if (hurt?.dead && onExamine) {
        if (w.reachTo(at) <= TALK_REACH) return onExamine(id);
        if (w.walkTo(at.x, at.z, at.level) === null) return notify(t('talk.noway', 'You can\'t get to them.'));
        pending = id;
        return;
      }
      if (hurt?.dead) return notify(t('talk.dead', '{name} is dead.', { name }));
      if (hurt?.out && !onFight) return notify(t('talk.out', '{name} lies senseless.', { name }));
      // Someone lying senseless: walk up, then the fight panel offers the killing stroke or leaving them (the director).
      if (hurt?.out) {
        if (w.reachTo(at) <= TALK_REACH) return onFight!(id);
        if (w.walkTo(at.x, at.z, at.level) === null) return notify(t('talk.noway', 'You can\'t get to them.'));
        pending = id;
        return;
      }
      if (w.reachTo(at) <= TALK_REACH) return start(id);
      far(id, w.reachTo(at));
    },
    close,
    tick() {
      if (!pending) return;
      const w = world(), at = w.talking.personSpot(pending);
      if (!at) {
        pending = null;
        return;
      }
      // They may have walked on: close enough is enough; stopped short, walk on to where they are now.
      if (w.reachTo(at) <= TALK_REACH) {
        const id = pending;
        pending = null;
        w.walkTo(w.hero.x, w.hero.z);
        if (w.fights.injuriesOf(id)?.dead && onExamine) return onExamine(id);
        if (w.fights.injuriesOf(id)?.out && onFight) return onFight(id);
        return start(id);
      }
      if (!w.walking) {
        if (w.walkTo(at.x, at.z, at.level) === null) {
          pending = null;
          notify(t('talk.noway', 'You can\'t get to them.'));
        }
      }
    },
  };
}

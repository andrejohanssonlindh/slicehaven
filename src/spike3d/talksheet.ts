import { paintPortrait } from '../art/portrait';
import { FACETS } from '../content/people';
import { rollableName } from '../content/rollables';
import type { Hero } from '../core/hero';
import type { Doer } from '../core/world3d/actions';
import { moodOf, patienceLeft, talkOffers } from '../core/world3d/talk';
import type { SpikeWorld } from '../engine3d/world';
import { t } from '../i18n';
import { showRolls } from '../ui/dice';
import { PORTRAIT_STYLES, type PortraitStyle, loadSettings, saveSettings } from '../ui/settings';
import type * as THREE from 'three';

/**
 * Talking to someone in the 3D world (plan B3d): their portrait, the conversation's log, and the choices laid over it.
 * Tap a person: the hero walks up, the person stops and turns to them, and the panel opens. Each choice is a social
 * try through the talk rules (`core/world3d/talk.ts`), rolled with the hero's sheet; the dice show it (not for a hidden
 * read). What they think of you is kept in the world's save. The portrait can be switched between three styles to
 * choose from (Q37): the 3D body close up, the same finer, or painted.
 */

/** How close the hero stands to talk, metres. */
const TALK_REACH = 2.6;
/** The 3D portrait's size in pixels: plain, and finer. */
const PX: Record<Exclude<PortraitStyle, 'painted'>, number> = { '3d': 40, fine: 88 };

export interface Talk {
  open(id: string): void;
  close(): void;
  tick(): void;
  readonly open_: boolean;
}

export function makeTalk(world: () => SpikeWorld, renderer: () => THREE.WebGLRenderer, hero: Hero, doer: Doer, notify: (text: string) => void, save: () => void): Talk {
  const el = document.getElementById('talk')!;
  const canvas = el.querySelector<HTMLCanvasElement>('.portrait canvas')!;
  const pstyle = el.querySelector<HTMLButtonElement>('.pstyle')!;
  const nameEl = el.querySelector<HTMLElement>('.name')!, whatEl = el.querySelector<HTMLElement>('.what')!, moodEl = el.querySelector<HTMLElement>('.mood')!;
  const logEl = el.querySelector<HTMLElement>('.log')!, choicesEl = el.querySelector<HTMLElement>('.choices')!;
  const visitor = { kind: hero.kind, people: hero.people, tags: hero.tags };
  let who: string | null = null;
  let pending: string | null = null;
  let busy = false;

  const styleName: Record<PortraitStyle, string> = { '3d': t('talk.p3d', '3D'), fine: t('talk.pfine', '3D, finer'), painted: t('talk.ppainted', 'Painted') };

  function drawPortrait(): void {
    if (!who) return;
    const w = world(), style = loadSettings().portrait;
    pstyle.textContent = styleName[style];
    const ctx = canvas.getContext('2d')!;
    if (style === 'painted') {
      const b = w.bodyOf(who);
      if (!b) return;
      const pix = paintPortrait(b.spec, b.seed);
      canvas.width = pix.w;
      canvas.height = pix.h;
      ctx.fillStyle = '#2a2234';
      ctx.fillRect(0, 0, pix.w, pix.h);
      const img = new ImageData(new Uint8ClampedArray(pix.data), pix.w, pix.h);
      // (Drawn over a backdrop: putImageData would replace it.)
      const tmp = document.createElement('canvas');
      tmp.width = pix.w;
      tmp.height = pix.h;
      tmp.getContext('2d')!.putImageData(img, 0, 0);
      ctx.drawImage(tmp, 0, 0);
      return;
    }
    const px = PX[style];
    const data = w.portrait(renderer(), who, px, style === 'fine' ? 2 : 1);
    if (!data) return;
    canvas.width = canvas.height = px;
    ctx.putImageData(new ImageData(new Uint8ClampedArray(data), px, px), 0, 0);
  }
  pstyle.addEventListener('click', () => {
    const s = loadSettings().portrait;
    saveSettings({ portrait: PORTRAIT_STYLES[(PORTRAIT_STYLES.indexOf(s) + 1) % PORTRAIT_STYLES.length] });
    drawPortrait();
  });

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
    const w = world(), p = w.talkPerson(who);
    if (!p) return close();
    const c = w.talkCase(visitor);
    nameEl.textContent = p.name;
    const calling = [...p.tags].reverse().find((id) => FACETS[id]?.dim === 'station' && FACETS[id]?.parent !== 'station');
    const people = [...p.tags].reverse().find((id) => FACETS[id]?.dim === 'people');
    whatEl.textContent = [people, calling].filter(Boolean).map((id) => FACETS[id!].label).join(', ');
    moodEl.textContent = moodOf(p, c) ?? '';
    choicesEl.replaceChildren();
    for (const o of talkOffers(p, c)) {
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
    if (patienceLeft(p, c) === 0) log(t('talk.enough', '{name} has had enough of talking for now.', { name: p.name }), 'info');
  }

  async function choose(offer: string, label: string): Promise<void> {
    if (!who || busy) return;
    busy = true;
    log(label, 'you');
    const r = world().talkTo(offer, who, doer, visitor);
    if (!r.done) log(r.reason ?? '', 'info');
    else {
      if (r.roll && !r.hidden) await showRolls([{ ...r.roll, label: r.skill ? rollableName(r.skill) : r.roll.label }]);
      for (const l of r.lines) log(l.text, l.tone === 'good' ? 'good' : l.tone === 'bad' ? 'bad' : l.tone === 'info' ? 'info' : 'they');
      save();
    }
    busy = false;
    refresh();
    drawPortrait();
  }

  function start(id: string): void {
    const w = world();
    who = id;
    w.talkingWith = id;
    logEl.replaceChildren();
    el.hidden = false;
    const p = w.talkPerson(id);
    if (p) log(t('talk.meet', 'You turn to {name}.', { name: p.name }), 'info');
    refresh();
    // (The person turns to face the hero first: draw them once they have.)
    drawPortrait();
    setTimeout(drawPortrait, 350);
  }

  function close(): void {
    el.hidden = true;
    who = null;
    pending = null;
    world().talkingWith = null;
  }
  el.querySelector('.close')!.addEventListener('click', close);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !el.hidden) close(); });

  return {
    get open_() {
      return !el.hidden;
    },
    open(id) {
      close();
      const w = world(), at = w.personSpot(id);
      if (!at) return;
      if (w.reachTo(at) <= TALK_REACH) return start(id);
      // Walk up to them; they stop for you once you're close (see `tick`).
      if (w.walkTo(at.x, at.z, at.level) === null) return notify(t('talk.noway', 'You can\'t get to them.'));
      pending = id;
    },
    close,
    tick() {
      if (!pending) return;
      const w = world(), at = w.personSpot(pending);
      if (!at) {
        pending = null;
        return;
      }
      // They may have walked on: close enough is enough; stopped short, walk on to where they are now.
      if (w.reachTo(at) <= TALK_REACH) {
        const id = pending;
        pending = null;
        w.walkTo(w.hero.x, w.hero.z);
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

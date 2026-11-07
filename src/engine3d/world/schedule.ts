import * as THREE from 'three';
import { BEHAVIOURS } from '../../content/behaviours';
import { grounded } from '../../core/damage';
import { type Clock, fadeAnswer, newMind, stepMind } from '../../core/world3d/behave';
import type { CastMember, MapEvent } from '../../core/world3d/mapgen';
import type { Place } from '../../core/world3d/behave';
import { HEARD_FOR, lastHeard } from '../../core/world3d/perceive';
import { answerLines, fadeStanding } from '../../core/world3d/standing';
import { turnToward } from '../../core/world3d/vision';
import { blobShadow } from '../shadow';
import { personFigure } from './figures';
import { MIND_REACH } from './types';
import type { SpikeWorld } from './index';

/**
 * The map's people going about their day (`core/world3d/behave.ts`): each follows their schedule, a behaviour from
 * `content/behaviours` for the line whose `when` holds. Someone far from both the view and the hero waits; someone is
 * drawn only when the hero could see them. A few times a second they look and listen, and the world's answers to the
 * hero run (gossip, trespass, carrying, loans, strays). The clock and the map's events say what is going on.
 */

/** How often the map's people look and listen, seconds. */
const PERCEIVE_EVERY = 0.25;
/** On easy, the eye or question mark floats over anyone within this of the hero who noticed them, seen or not (Q43), metres. */
const MARK_REACH = 30;
/** A noise heard shows its question mark (on easy) for its first 8 seconds: while it has more than this left. */
const HEARD_SHOWN = HEARD_FOR - 8;

/** The marks over people's heads (on easy): drawn per pixel, 12 × 12. */
function markTexture(kind: 'eye' | 'heard'): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 12;
  const g = c.getContext('2d')!;
  const px = (x: number, y: number, col: string): void => { g.fillStyle = col; g.fillRect(x, y, 1, 1); };
  const rows = kind === 'eye'
    ? ['', '', '   ######   ', ' ##wwwwww## ', '#wwww##wwww#', '#www#pp#www#', '#wwww##wwww#', ' ##wwwwww## ', '   ######   ']
    : ['    ####    ', '   #yyyy#   ', '  #yy##yy#  ', '   ## #yy#  ', '     #yy#   ', '    #yy#    ', '    #yy#    ', '     ##     ', '    #yy#    ', '    #yy#    ', '     ##     '];
  const col: Record<string, string> = { '#': '#1b1410', w: '#f4ecd6', p: '#2a62c9', y: '#ffd24a' };
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (col[ch]) px(x, y, col[ch]); }));
  const t = new THREE.CanvasTexture(c);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Schedule {
  private readonly markMats = {
    eye: new THREE.SpriteMaterial({ map: markTexture('eye'), depthTest: false, transparent: true }),
    heard: new THREE.SpriteMaterial({ map: markTexture('heard'), depthTest: false, transparent: true }),
  };
  private perceiveIn = 0;
  /** Events started (true) or stopped (false) by hand, over what the map's hours say. */
  private eventsByHand = new Map<string, boolean>();

  constructor(private readonly w: SpikeWorld, private readonly places: Record<string, Place>, private readonly mapEvents: MapEvent[]) {}

  /** Put the map's people in the world, each with a mind that follows their schedule. */
  addCast(cast: readonly CastMember[]): void {
    const w = this.w;
    // Everyone answers what the hero does wrong as the place's culture says: its lines go at the top of every day (B3c).
    // (Answering a wrong comes first; then bringing a found thing home, B3b; then their own day.)
    const answering = [...answerLines(w.culture), { when: { tidying: true }, do: 'tidy' }];
    for (const one of cast) {
      const who = { ...one, does: [...answering, ...one.does] };
      const fig = personFigure(who, w.yaw), blob = blobShadow(0.32);
      fig.place.visible = blob.visible = false;
      const mark = new THREE.Sprite(this.markMats.eye);
      mark.scale.set(0.8, 0.8, 1);
      mark.renderOrder = 6;
      mark.visible = false;
      w.scene.add(mark);
      const mind = newMind(who.id, who.start[0], who.start[1], who.seed ?? 1, who.slot, who.home);
      w.cast.push({ who, fig, blob, mind, facing: Math.atan2(mind.actor.dir.z, mind.actor.dir.x), mark });
      // Only the hero shows through what stands in front of them: anyone else behind a tree or a wall is hidden by it.
      w.people.push({ id: who.id, spec: who, fig, reveals: false });
      w.scene.add(fig.place, blob);
    }
  }

  /** What time it is and what is going on, for people's schedules: the map's events by the hour, and those started or stopped by hand. */
  get clock(): Clock {
    const weather = this.w.weather;
    const hour = weather.hour ?? (weather.time === 'night' ? 0 : weather.time === 'dusk' ? 18.5 : 12);
    const events = new Set<string>();
    for (const e of this.mapEvents) {
      if (!e.hours) continue;
      const [a, b] = e.hours;
      if (a <= b ? hour >= a && hour < b : hour >= a || hour < b) events.add(e.id);
    }
    for (const [id, on] of this.eventsByHand) {
      if (on) events.add(id);
      else events.delete(id);
    }
    return { hour, events };
  }

  /** Start an event by hand (a script, a test): everyone whose schedule asks for it reacts. It runs until `endEvent`. */
  startEvent(id: string): void {
    this.eventsByHand.set(id, true);
  }

  /** Stop an event by hand (even inside its hours); `clearEvent` gives it back to the map's hours. */
  endEvent(id: string): void {
    this.eventsByHand.set(id, false);
  }

  clearEvent(id: string): void {
    this.eventsByHand.delete(id);
  }

  /** What each of the map's people is doing now (for tests and the debug hook): their schedule line and where they are. */
  get minds(): { id: string; doing: string | null; x: number; z: number; house: string | null; shown: boolean }[] {
    return this.w.cast.map((c) => ({
      id: c.who.id, doing: c.mind.entry >= 0 ? c.who.does[c.mind.entry].do : null,
      x: c.mind.actor.x, z: c.mind.actor.z, house: c.mind.actor.house, shown: c.fig.place.visible,
    }));
  }

  /**
   * The map's people follow their schedules: the line whose `when` holds is what they do. Someone far from both the
   * view and the hero waits. Someone is drawn only when the hero could see them: outdoors by sight, indoors when the
   * hero is in the same house on the same storey.
   */
  step(dt: number, night: number): void {
    const w = this.w, fights = w.fights;
    const sees = (x: number, z: number): boolean => w.vision.outer <= 0 || w.sight.seen(x, z) >= 0.25;
    const whereIs = (id: string): { x: number; z: number; house: string | null; level: number } | null => {
      if (id === 'hero') return { x: w.hero.x, z: w.hero.z, house: w.hero.house, level: w.hero.stair ? 0 : w.hero.level };
      const o = w.cast.find((x) => x.who.id === id);
      return o ? { x: o.mind.actor.x, z: o.mind.actor.z, house: o.mind.actor.house, level: o.mind.actor.level } : null;
    };
    const ctx = { walking: w.moves, places: this.places, clock: this.clock, acts: w.acting.acts, whereIs, answers: w.owners.answerHooks };
    // (People look and listen a few times a second, not every frame.)
    this.perceiveIn -= dt;
    // (While a fight lasts, no one looks about or gossips: the world waits.)
    const look = this.perceiveIn <= 0 && !fights.inFight;
    if (look) {
      this.perceiveIn = PERCEIVE_EVERY;
      w.owners.gossip();
      w.owners.checkTrespass();
      w.carrying.checkCarry();
      w.carrying.checkLoans();
      w.carrying.findStrays();
      // (Views fade back toward nothing, a little each world day: Q44.)
      fadeStanding(w.standing, w.weather.day, w.culture);
    }
    for (const c of w.cast) {
      const a = c.mind.actor;
      const far = Math.hypot(a.x - w.focus.x, a.z - w.focus.z) > MIND_REACH && Math.hypot(a.x - w.hero.x, a.z - w.hero.z) > MIND_REACH;
      if (far) {
        c.fig.place.visible = c.blob.visible = c.mark.visible = false;
        continue;
      }
      // (The knocked out, the dying and the dead notice nothing.)
      if (look && fights.canStand(c.who.id)) w.senses.perceive(c, PERCEIVE_EVERY, night);
      fadeAnswer(c.mind, dt);
      // Someone the hero is talking to stands and faces them; their day waits until the talk ends.
      const hurt = w.hurt[c.who.id];
      const pose = fights.inFight || hurt?.out || hurt?.dead || (hurt && grounded(hurt))
        ? fights.step(c, dt)
        : c.who.id === w.talking.talkingWith
          ? { dx: w.hero.x - a.x, dz: w.hero.z - a.z, moving: false }
          : stepMind(c.mind, c.who.does, BEHAVIOURS, ctx, dt);
      if (Math.abs(pose.dx) + Math.abs(pose.dz) > 1e-6) c.facing = turnToward(c.facing, Math.atan2(pose.dz, pose.dx), 7 * dt);
      const y = w.footY(a);
      w.figures.faceWalker(c.fig, pose.dx, pose.dz, pose.moving);
      c.fig.place.position.set(a.x, y, a.z);
      c.blob.position.set(a.x, y + 0.03, a.z);
      // (Indoors the roof is lifted only while the hero is in there, on the storey they look at.)
      const hs = a.house ? w.standingOf(a.house) : null;
      const shown = a.house ? !!hs && hs.open && hs.view === a.level : sees(a.x, a.z);
      c.fig.place.visible = c.blob.visible = shown;
      // On easy: an eye over whoever sees the hero, a question mark over whoever heard something lately. Over anyone
      // near, even someone the hero can't see (in the dark, behind a wall): just the mark, floating (Q43).
      const s = c.mind.senses, heard = lastHeard(s, 'any');
      const near = shown || Math.hypot(a.x - w.hero.x, a.z - w.hero.z) <= MARK_REACH;
      // (The senseless don't look any more, so what they last saw would hang on: no mark over them, and they see nothing.)
      const senseless = !!hurt && (hurt.out || hurt.dead || hurt.dying);
      if (senseless) s.sees = [];
      const mark = !w.senses.showSenses || !near || senseless ? null : s.sees.includes('hero') ? this.markMats.eye : heard && heard.left > HEARD_SHOWN ? this.markMats.heard : null;
      c.mark.visible = mark !== null;
      if (mark) {
        c.mark.material = mark;
        c.mark.position.set(a.x, y + 2.4, a.z);
      }
    }
  }
}

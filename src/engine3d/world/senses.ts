import * as THREE from 'three';
import { THINGS } from '../../content/things';
import { type Roll, rollOpen } from '../../core/dice';
import { sheetDice, unitsDice } from '../../core/npcsheet';
import { Rng } from '../../core/rng';
import type { Actor } from '../../core/world3d/actors';
import {
  type Noise, type Senses as HeroSenses, type SightRoll, type Where, canSee, fadeSenses, hears, newSenses, noteHeard, rollSight, sightBoost, sightDue, spotDifficulty,
} from '../../core/world3d/perceive';
import { visionOf } from '../../core/world3d/vision';
import type { P2 } from '../../core/world3d/space';
import { type CastCard, MIND_REACH } from './types';
import type { SpikeWorld } from './index';

/**
 * Perception (plan B5, `core/world3d/perceive.ts`): the hero's sight roll, sounds made and who hears them, what the
 * map's people see, and the hero noticing things lying about (plan B8: weapons on the sand, ringed once noticed).
 */

/** The hero's footsteps: heard this far by an ordinary ear, metres; one every so many metres walked. */
const STEPS_LOUD = 5;
const STEP_EVERY = 0.8;
/** Out of a fight, noticed things lying within this many metres of the hero are ringed. */
const RING_REACH = 20;

export class Senses {
  /**
   * The hero's senses: their sight roll (rolled on entering the map and every six world hours; `rerollSight` for
   * waking). Their Alertness is the world's `alertness`; darkvision 0..1 is `darkSight`.
   */
  readonly hero: HeroSenses = newSenses();
  darkSight = 0;
  /** Told of every sight roll made (the hero's and the people's), for the page to show on easy. */
  onSightRoll: ((who: string, roll: Roll, sight: SightRoll) => void) | null = null;
  /** Show over people's heads what they notice of the hero (on easy). */
  showSenses = false;
  /** The hero noticed something lying about (the page says so): its id, kind and the roll (null: it needs none). */
  onNotice: ((id: string, kind: string, roll: Roll | null) => void) | null = null;
  private stepFrom: P2 | null = null;
  private noticeAt = 0;
  /** Red rings round things noticed lying about, one each. */
  private spotRings: THREE.Mesh[] = [];

  constructor(private readonly w: SpikeWorld) {}

  /** Roll the hero's sight again now (entering a map, six hours on, waking): Alertness against 8. */
  rerollSight(): SightRoll {
    const w = this.w;
    const { roll, sight } = rollSight(unitsDice(w.alertness), w.actRng, 'Sight');
    this.hero.sight = sight;
    this.hero.rolledAt = w.worldHours;
    w.sight.recast();
    this.onSightRoll?.('hero', roll, sight);
    return sight;
  }

  /** Set the hero's sight as if just rolled (for tests: plain sight, whatever the dice would say). */
  holdSight(sight: SightRoll): void {
    this.hero.sight = { ...sight };
    this.hero.rolledAt = this.w.worldHours;
    this.w.sight.recast();
  }

  /** Roll the hero's sight if it is due (on entering the map, every six world hours). */
  stepHero(): void {
    if (sightDue(this.hero, this.w.worldHours)) this.rerollSight();
  }

  /** A sound in the world: everyone near enough to hear it (and not the one who made it) notes it. */
  makeNoise(n: Noise): void {
    const w = this.w;
    for (const c of w.cast) {
      const a = c.mind.actor;
      if (c.who.id === n.by || Math.hypot(a.x - w.hero.x, a.z - w.hero.z) > MIND_REACH) continue;
      if (hears(whereOf(a), c.who.sheet?.attrs.Vaksamhet ?? 10, n)) noteHeard(c.mind.senses, n);
    }
  }

  /** The hero's footsteps, a soft noise every few steps (not while sitting). */
  stepFootsteps(): void {
    const h = this.w.hero, f = this.stepFrom;
    if (!f || this.w.seated) {
      this.stepFrom = { x: h.x, z: h.z };
      return;
    }
    if (Math.hypot(h.x - f.x, h.z - f.z) < STEP_EVERY) return;
    this.stepFrom = { x: h.x, z: h.z };
    this.makeNoise({ ...whereOf(h), loud: STEPS_LOUD, kind: 'steps', by: 'hero' });
  }

  /** What each of the map's people notices (for tests and the debug hook): their sight, whom they see, what they heard. */
  get senses(): { id: string; sight: SightRoll; sees: string[]; heard: string[] }[] {
    return this.w.cast.map((c) => ({ id: c.who.id, sight: { ...c.mind.senses.sight }, sees: [...c.mind.senses.sees], heard: c.mind.senses.heard.map((h) => h.kind) }));
  }

  /** One of the map's people looks (their sight rolled when due; the hero seen or not) and lets what they heard fade. */
  perceive(c: CastCard, dt: number, night: number): void {
    const w = this.w;
    const s = c.mind.senses, a = c.mind.actor, sheet = c.who.sheet;
    if (sightDue(s, w.worldHours)) {
      const rng = new Rng(c.mind.rng);
      const { roll, sight } = rollSight(sheet ? sheetDice(sheet, 'attr:Vaksamhet') : unitsDice(10), rng, 'Sight');
      c.mind.rng = rng.seed;
      s.sight = sight;
      s.rolledAt = w.worldHours;
      this.onSightRoll?.(c.who.id, roll, sight);
    }
    fadeSenses(s, dt);
    const spec = visionOf({ alertness: sheet?.attrs.Vaksamhet ?? 10, night, boost: sightBoost(s.sight), darkSight: Math.min(1, (sheet?.skills['F:Mörkersyn'] ?? 0) / 12) });
    const me = whereOf(a), hero = whereOf(w.hero);
    // (A carried light is made out at most three times plain range: `lightReach`.)
    const near = Math.hypot(hero.x - me.x, hero.z - me.z) <= spec.range * 3;
    const sees = near && canSee(me, c.facing, spec, hero, w.sight.blockers(Math.min(spec.range * 3, 110), a), night, w.lights.carried);
    s.sees = sees ? ['hero'] : [];
  }

  /** Has the hero noticed this thing lying about? */
  hasNoticed(id: string): boolean {
    return this.w.noticed.has(id);
  }

  /** The hero has noticed it now, without a roll (seen falling, tapped, found by looking round). */
  notice(id: string): void {
    this.w.noticed.add(id);
  }

  /**
   * Noticing what lies about as it comes into view (plan B8, the director: as weapons come into vision, not when a
   * fight starts). Twice a second: each weapon or shield lying within sight range that the hero sees clearly and
   * hasn't noticed gets an Alertness roll against its kind's `spot`, harder further off (`spotDifficulty`). A failed
   * one is tried again only when it has got easier (nearer). `bonus` dice: looking round on purpose, now, everything
   * in view (the side action Look around). Returns what was noticed.
   */
  noticeLying(bonus = 0): { found: string[]; roll: Roll | null } {
    const w = this.w, h = w.hero, range = w.vision.outer > 0 ? w.spec.range : 30;
    const noticed = w.noticed, tried = w.noticeTried;
    const dice = unitsDice(w.alertness);
    let roll: Roll | null = null;
    const found: string[] = [];
    for (const g of w.gear.weaponsLying(h.x, h.z, range)) {
      if (noticed.has(g.id) || w.sight.seen(g.x, g.z) < 0.5) continue;
      const spot = THINGS.get(g.kind).spot;
      const diff = spotDifficulty(spot ?? 0, Math.hypot(g.x - h.x, g.z - h.z));
      if (spot === undefined) {
        noticed.add(g.id);
        found.push(g.id);
        this.onNotice?.(g.id, g.kind, null);
        continue;
      }
      if (!bonus && tried[g.id] !== undefined && diff >= tried[g.id]) continue;
      // (One roll for everything noticed at one look; a fresh one when the look is fresh.)
      roll ??= rollOpen({ n: dice.n + bonus, mod: dice.mod }, w.actRng, 'Alertness');
      tried[g.id] = diff;
      if (roll.total >= diff) {
        noticed.add(g.id);
        delete tried[g.id];
        found.push(g.id);
        this.onNotice?.(g.id, g.kind, { ...roll, target: diff, success: true });
      }
    }
    return { found, roll };
  }

  /**
   * Ring what the hero has noticed lying about (plan B8, the director: weapons on the ground are hard to see): a red
   * ring on the ground round each spot; an empty list takes them all away.
   */
  markSpotted(spots: { x: number; z: number }[]): void {
    const w = this.w;
    while (this.spotRings.length < spots.length) {
      const ring = new THREE.RingGeometry(0.42, 0.55, 20);
      ring.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(ring, new THREE.MeshBasicMaterial({ color: 0xe0402a, transparent: true, opacity: 0.85, depthWrite: false }));
      m.renderOrder = 3;
      w.scene.add(m);
      this.spotRings.push(m);
    }
    this.spotRings.forEach((m, i) => {
      const at = spots[i];
      m.visible = !!at;
      if (at) m.position.set(at.x, w.store.heightAt(at.x, at.z) + 0.03, at.z);
    });
  }

  /**
   * Each frame with vision on: the rings breathe a little, so they catch the eye on busy ground; twice a second, what
   * lies in view is noticed (and, out of a fight, what was noticed near the hero is ringed: in one, the fight page does).
   */
  stepNoticing(): void {
    const w = this.w;
    const k = 0.5 + 0.5 * Math.sin(w.time * 3);
    for (const m of this.spotRings) if (m.visible) {
      (m.material as THREE.MeshBasicMaterial).opacity = 0.6 + 0.35 * k;
      m.scale.setScalar(1 + 0.12 * k);
    }
    if (w.time - this.noticeAt < 0.5) return;
    this.noticeAt = w.time;
    this.noticeLying();
    if (!w.fights.inFight) this.markSpotted(w.gear.weaponsLying(w.hero.x, w.hero.z, RING_REACH).filter((g) => w.noticed.has(g.id)));
  }
}

/** Where someone is, as hearing and seeing ask it. */
export function whereOf(a: Actor): Where {
  return { x: a.x, z: a.z, house: a.house, level: a.stair ? 0 : a.level };
}

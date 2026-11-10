import * as THREE from 'three';
import { THINGS } from '../../content/things';
import { LIBRARY } from '../../content/skillweb';
import { LEADS } from '../../content/leads';
import { ACTIONS } from '../../content/actions';
import { type ActResult, type ActTarget, type ActWorld, type Doer, type Offer, type Spot, offers, perform } from '../../core/world3d/actions';
import type { Acts } from '../../core/world3d/behave';
import { studied } from '../../core/world3d/leads';
import { type RolledSheet, sheetDice } from '../../core/npcsheet';
import { hasLeave } from '../../core/world3d/standing';
import type { Tagged } from './types';
import type { SpikeWorld } from './index';

/**
 * Actions (plan B3a, `core/world3d/actions.ts`): what a tap on the screen points at (a thing, a person, the hero), and
 * doing things through the frame, as the hero or as one of the map's people (their behaviours act through it too,
 * rolling with their own sheets, plan B4). The world carries out what an outcome needs (time passes, a fire is made,
 * the hero sits or picks something up) and the witnesses answer a wrong.
 */

export class Acting {
  /** The last few things done in the world, by anyone (for tests now; for witnesses later, B3c). */
  readonly recentActs: { who: string; offer: string; target: string | null; skill: string | null; success: boolean; hour: number }[] = [];

  constructor(private readonly w: SpikeWorld) {}

  /** Note something done (kept to the last 30). */
  remember(a: { who: string; offer: string; target: string | null; skill: string | null; success: boolean }): void {
    this.recentActs.push({ ...a, hour: this.w.weather.hour ?? 0 });
    if (this.recentActs.length > 30) this.recentActs.shift();
  }

  /**
   * What a tap points at: a thing, the hero (`'hero'`: the spot they stand on), or nothing. What is right under the
   * finger wins, the nearer first (the hero on a stool, or the hearth behind them); then the hero within `slack`
   * (screen units, x and y) of their middle; then a thing within `slack` of its middle, so a thin torch is easy to hit
   * on a phone. Indoors only the furniture of the hero's house on the storey in view counts, outdoors what stands in
   * sight; a house nearer than the thing (its wall in front) means nothing.
   */
  tapped(ndcX: number, ndcY: number, slack: { x: number; y: number }): ActTarget | 'hero' | { person: string } | null {
    const w = this.w;
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), w.camera);
    const exact = this.thingAt(ndcX, ndcY, null);
    const onHero = ray.intersectObject(w.heroFig.place, true)[0];
    // Someone of the map, drawn now (seen), right under the finger, or near it.
    let person: { id: string; d: number } | null = null;
    for (const c of w.cast) {
      if (!c.fig.place.visible) continue;
      const h = ray.intersectObject(c.fig.place, true)[0];
      if (h && (!person || h.distance < person.d)) person = { id: c.who.id, d: h.distance };
    }
    const nearest = Math.min(onHero?.distance ?? Infinity, exact?.d ?? Infinity, person?.d ?? Infinity);
    if (nearest < Infinity) {
      if (onHero && onHero.distance === nearest) return 'hero';
      if (person && person.d === nearest) return { person: person.id };
      return exact!.t;
    }
    if (this.heroTapped(ndcX, ndcY, slack)) return 'hero';
    const v = new THREE.Vector3();
    for (const c of w.cast) {
      if (!c.fig.place.visible) continue;
      c.fig.place.getWorldPosition(v);
      v.y += 0.8;
      v.project(w.camera);
      if (Math.hypot((v.x - ndcX) / slack.x, (v.y - ndcY) / slack.y) < 1) return { person: c.who.id };
    }
    return this.thingAt(ndcX, ndcY, slack)?.t ?? null;
  }

  /** The thing a tap points at: right on it (`slack` null), or else within `slack` of its middle; and how far along the ray. */
  private thingAt(ndcX: number, ndcY: number, slack: { x: number; y: number } | null): { t: ActTarget; d: number } | null {
    const w = this.w;
    const inHouse = w.standingOf(w.hero.house);
    const groups: THREE.Object3D[] = [];
    if (inHouse) groups.push(...inHouse.furniture.filter((f) => f.visible));
    else {
      for (const d of w.carrying.looseDrawn.values()) if (!d.inst) groups.push(d.g);
      for (const lc of w.chunks.values()) for (const o of lc.standing.objects) if (o.userData.thing) groups.push(o);
      groups.push(...w.lights.campObjects());
    }
    const seenAt = (o: THREE.Object3D): boolean => inHouse !== null || w.sight.seen(o.position.x, o.position.z) >= 0.25;
    const tagged = groups.filter((g) => g.visible && seenAt(g));
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), w.camera);
    let best: { g: THREE.Object3D; d: number } | null = null;
    for (const g of tagged) {
      const tag = g.userData.thing as Tagged;
      const hit = ray.intersectObject(tag.pick ?? g, true).find((h) => h.object.visible);
      if (hit && (!best || hit.distance < best.d)) best = { g, d: hit.distance };
    }
    if (best && !inHouse) {
      // A house in front hides it.
      for (const hs of w.houses) {
        const h = ray.intersectObject(hs.group, true).find((x) => x.object.visible);
        if (h && h.distance < best.d - 0.3) return null;
      }
    }
    if (!best && slack) {
      // Near misses: the closest middle on screen within the slack.
      const box = new THREE.Box3(), v = new THREE.Vector3();
      let bestE = 1;
      for (const g of tagged) {
        if ((g.userData.thing as Tagged).exact) continue;
        box.setFromObject(g).getCenter(v).project(w.camera);
        const e = Math.hypot((v.x - ndcX) / slack.x, (v.y - ndcY) / slack.y);
        if (e < bestE) {
          bestE = e;
          best = { g, d: 0 };
        }
      }
    }
    return best ? { t: this.targetOf(best.g), d: best.d } : null;
  }

  /** A tagged group as something to act on, where it stands in the world now. */
  targetOf(g: THREE.Object3D): ActTarget {
    const tag = g.userData.thing as Tagged, at = g.getWorldPosition(new THREE.Vector3());
    return { id: tag.id, kind: tag.kind, x: at.x, z: at.z, level: tag.level, house: tag.house, rot: tag.rot };
  }

  /** Does a tap point at the hero (within `slack` of their middle on screen)? */
  private heroTapped(ndcX: number, ndcY: number, slack: { x: number; y: number }): boolean {
    const v = this.w.heroFig.place.getWorldPosition(new THREE.Vector3());
    v.y += 0.8;
    v.project(this.w.camera);
    return Math.hypot((v.x - ndcX) / slack.x, (v.y - ndcY) / slack.y) < 1;
  }

  /** What actions may read and change: the things' states, the world's flags, the weather and the houses. */
  get world(): ActWorld {
    const w = this.w, weather = w.weather, idx = w.houseIndex, gear = w.gear;
    return {
      things: THINGS, states: w.states, flags: w.flags, rng: w.actRng, library: LIBRARY, leads: w.leads,
      owners: {
        culture: w.culture,
        members: (house) => w.cast.filter((c) => c.who.home === house).map((c) => c.who.id),
        welcome: (at) => w.owners.welcomeAt(at),
        leave: (doer, house) => doer === 'hero' && hasLeave(w.standing, house, w.worldHours),
        wealth: (house) => w.owners.houseWealth(house),
        mine: (doer, id) => doer === 'hero' && !!w.carry.loose[id]?.mine,
      },
      carried: (doer) => (doer === 'hero' ? w.pack.carriedKg : 0),
      packRoom: (doer, kind) => doer === 'hero' && w.pack.hasRoom(kind),
      holding: (doer) => (doer === 'hero' ? w.carrying.holding : null),
      stowed: (doer) => (doer === 'hero' ? gear.stowed.map((s) => s.kind) : []),
      handFor: (doer, kind) => (doer === 'hero' ? gear.handFor(kind) : null),
      aHandFree: (doer) => doer === 'hero' && gear.aHandFree(),
      // (Any weapon or shield can be carried on you, a taken one too: the director, 2026-11-07.)
      holdsOwn: (doer) => doer === 'hero' && !!(w.carry.held ?? w.carry.left),
      leadStudy: (t) => {
        const id = w.journal.leadOf(t.id), def = id ? LEADS[id] : undefined, rec = id ? w.leads[id] : undefined;
        return id && def?.study && rec && !rec.studied ? { lead: id, study: def.study } : null;
      },
      view: {
        rain: weather.rain, hour: weather.hour ?? 12,
        watchers: w.cast.filter((c) => c.mind.senses.sees.includes('hero')).length,
        housesNear: (x, z, r) => idx.liteNear(x - r, z - r, x + r, z + r).filter((e) => Math.hypot(e.built.place.x - x, e.built.place.z - z) <= r).length,
      },
    };
  }

  /** What can be tried on a thing, or (null) on the spot the doer stands on. */
  offersFor(target: ActTarget | null, doer: Doer): Offer[] {
    return offers(target, target ?? this.w.heroSpot(), doer, this.world, ACTIONS);
  }

  /**
   * Do an offer through the frame, as `doer`, and carry out what needs the world: for the hero the clock moves on by
   * what it took, a campfire is built, they sit. Returns what happened, for the page to show (the roll, the lines).
   */
  act(offer: string, target: ActTarget | null, doer: Doer, at: Spot = target ?? this.w.heroSpot()): ActResult {
    const w = this.w;
    const r = perform(offer, target, at, doer, this.world, ACTIONS);
    if (r.done) this.remember({ who: doer.id, offer, target: target?.id ?? null, skill: r.skill ?? null, success: r.success ?? true });
    const hero = doer.id === 'hero';
    for (const e of r.events) {
      if (e.kind === 'time' && hero && w.weather.hour !== null) w.weather.advance(e.minutes / 60);
      else if (e.kind === 'make' && e.thing === 'campfire') w.lights.lightFire();
      else if (e.kind === 'sit' && hero) this.sitHero(e.target);
      // (Slipped away unseen, it goes into the pack when there's room, plan B6; else it is held out of sight.)
      else if (e.kind === 'carry' && hero) (e.hidden && w.pack.stash(e.target)) || (!e.pack && w.carrying.pickUp(e.target, e.hidden));
      else if (e.kind === 'pack' && hero) w.pack.stashHeld();
      else if (e.kind === 'putdown' && hero) w.carrying.putDown();
      else if (e.kind === 'stow' && hero) w.gear.stowHeld();
      else if (e.kind === 'noise') w.senses.makeNoise({ ...e.at, loud: e.loud, kind: e.sound, by: doer.id });
    }
    // A wrong by the hero is answered by whoever saw it (B3c); what the map's people do wrong waits for them to be watched too.
    if (hero && r.wrongs?.length) {
      const seen = w.owners.witness(r.wrongs);
      for (const s of seen) if (s.says) r.events.push({ kind: 'say', line: { text: `${s.name}: "${s.says}"`, tone: 'bad' } });
      if (seen.length) r.events.push({ kind: 'seen', by: seen.map(({ id, name, by }) => ({ id, name, by })) });
    }
    // A lead given is the hero's (someone else learning something waits for what people know).
    if (hero) {
      for (const e of [...r.events]) {
        if (e.kind === 'learn') {
          // What the study taught goes into the lead, true or not: you can't tell which.
          const got = studied(w.leads, LEADS, e.lead, e.truth, w.worldHours);
          for (const text of got?.lines ?? []) r.events.push({ kind: 'say', line: { text } });
          if (got?.next) r.events.push({ kind: 'lead', lead: got.next }, { kind: 'say', line: { text: `Lead added: ${LEADS[got.next].title}.`, tone: 'good' } });
        }
        const title = e.kind === 'lead' ? w.journal.giveLead(e.lead) : null;
        if (title) r.events.push({ kind: 'say', line: { text: `Lead added: ${title}.`, tone: 'good' } });
      }
    }
    return r;
  }

  /** Set the hero down on a seat: on its top, facing the way it faces, until they walk. */
  private sitHero(t: ActTarget): void {
    const w = this.w;
    const seat = THINGS.get(t.kind).seat;
    if (seat === undefined) return;
    const b = t.house ? w.moves.byId(t.house) : null;
    const floor = b ? w.houseBaseY(b) + b.model.levels[t.level].floorY : w.store.heightAt(t.x, t.z);
    w.seated = { x: t.x, z: t.z, y: floor + seat, floor, yaw: t.rot ?? 0, from: { x: w.hero.x, z: w.hero.z } };
  }

  /** Someone's own character sheet (plan B4), their gear in it; null for no one of that name. */
  sheetOf(id: string): RolledSheet | null {
    return this.w.cast.find((c) => c.who.id === id)?.who.sheet ?? null;
  }

  /** Someone in the map as a doer: they roll what their sheet says (nothing, for someone with no sheet). */
  doerOf(id: string): Doer {
    const sheet = this.sheetOf(id);
    return { id, dice: (skill) => (sheet ? sheetDice(sheet, skill) : { n: 0, mod: 0 }), load: sheet?.load ?? 0 };
  }

  /** What the map's people may do to things: their behaviours act through the same frame as the hero, rolling with their own sheets (plan B4). */
  readonly acts: Acts = {
    fireOf: (house) => this.w.housing.fireOf(house),
    lit: (t) => this.w.lights.fireLit(t),
    act: (mind, offer, t) => this.act(offer, t, this.doerOf(mind.id)),
    // Bringing found things home (the behaviour `tidy`, plan B3b).
    thingAt: (id) => this.w.carrying.whereLoose(id),
    thingHome: (id) => {
      const h = this.w.carry.loose[id]?.home;
      return h ? { x: h.x, z: h.z, house: h.house, level: h.level } : null;
    },
    lift: (mind, id) => this.w.carrying.lift(mind.id, id),
    putHome: (mind, id) => {
      if (this.w.carry.loose[id]?.by === mind.id) this.w.carrying.sendHome(id);
    },
  };
}

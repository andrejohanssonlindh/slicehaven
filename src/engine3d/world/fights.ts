import { PERSON_KINDS } from '../../content/people';
import { type Injuries, grounded, recoverFatigue } from '../../core/damage';
import { REST_SPEED } from '../../core/difficulty';
import type { PersonLevel } from '../../core/npcsheet';
import { walkOn } from '../../core/world3d/behave';
import type { CastCard } from './types';
import type { SpikeWorld } from './index';

/**
 * Fights in the world (plan B8a; the rules are `core/combat.ts`, the page runs the rounds: `src/spike3d/fight/`). While a
 * fight lasts the world waits: the clock, and everyone not in it. The rules decide each round; this part only walks the
 * fighters, keeps their injuries (saved, as the world's `hurt`) and lets fatigue come back with time.
 */

type Pose = { dx: number; dz: number; moving: boolean };

export class Fights {
  /** Who is in the fight going on, or null when there is none. */
  fighting: Set<string> | null = null;
  /** World minutes for one point of fatigue back (the difficulty's; the page sets it). */
  restMinutes = 2;
  /** Real seconds gathered toward the next fatigue recovery step (it runs a few times a second, not every frame). */
  private restIn = 0;
  /** Fighters called so far (each comes rolled afresh). */
  private called = 0;

  constructor(private readonly w: SpikeWorld) {}

  get inFight(): boolean {
    return this.fighting !== null;
  }

  /**
   * A fight begins between these people (`hero` among them): the clock stops and everyone else stands where they are
   * until it ends. The rules decide each round; the world only walks the fighters, holds their weapons and poses them.
   */
  beginFight(ids: string[]): void {
    const w = this.w;
    this.fighting = new Set(ids);
    w.follow = true;
    // Everyone stops where they stand: the rules start the fight from there.
    w.stopHero();
    for (const c of w.cast) if (ids.includes(c.who.id)) c.mind.actor.legs = [];
    w.talking.talkingWith = null;
    for (const id of ids) w.figures.play(id, 'guard');
    this.faceFight();
  }

  /** The fight is over: the world goes on. Those left lying stay down. */
  endFight(): void {
    const { motions } = this.w.figures;
    for (const id of this.fighting ?? []) if (!this.w.figures.isLying(id)) motions.delete(id);
    const h = this.w.hurt.hero;
    if (h && !h.out && !h.dead && !h.dying) motions.delete('hero'); // up on a crutch
    this.fighting = null;
    this.w.yawWant = null;
  }

  /**
   * Where the view looks in a fight, or null outside one: the middle between the hero and the others (the page zooms
   * out until both fit: the director, the view leaned to the hero and left the foe behind their card).
   */
  centre(): { x: number; z: number } | null {
    if (!this.fighting) return null;
    let x = 0, z = 0, n = 0;
    for (const id of this.fighting) {
      const p = id === 'hero' ? null : this.fighterAt(id);
      if (p) { x += p.x; z += p.z; n++; }
    }
    const h = this.w.hero;
    if (!n) return { x: h.x, z: h.z };
    return { x: (h.x + x / n) / 2, z: (h.z + z / n) / 2 };
  }

  /**
   * Frame the fight side-on (plan B8g): the view swings so the line from the hero to their foe runs left to right
   * across the screen, the hero on the left, and follows the fight again. Screen right in the world is
   * (cos yaw, −sin yaw). The ⚔ Back to fight button calls this too.
   */
  faceFight(): void {
    if (!this.fighting) return;
    const w = this.w;
    w.follow = true;
    const foe = [...this.fighting].map((id) => (id === 'hero' ? null : this.fighterAt(id))).find(Boolean);
    if (!foe) return;
    const dx = foe.x - w.hero.x, dz = foe.z - w.hero.z;
    if (Math.hypot(dx, dz) > 0.05) w.yawWant = Math.atan2(-dz, dx);
  }

  /** Not knocked out, dying or dead (after a fight). */
  canStand(id: string): boolean {
    const i = this.w.hurt[id];
    // (Knocked down in a fight, they stay lying till they are up again: no swing lifts them.)
    return !i || (!i.out && !i.dead && !i.dying && !(this.fighting && i.short.includes('fall')));
  }

  /** What fights have done to someone (`hero` too); null if nothing yet. */
  injuriesOf(id: string): Injuries | null {
    return this.w.hurt[id] ? structuredClone(this.w.hurt[id]) : null;
  }

  /** Someone's injuries after a round: kept (and saved), and they lie down if knocked out, dying or dead. */
  setInjuries(id: string, i: Injuries): void {
    const w = this.w, figs = w.figures;
    w.hurt[id] = structuredClone(i);
    // (A broken leg puts them on the ground for good: they lie there, awake. The hero, outside a fight, limps on as if
    // on a crutch, so they're never stuck before healing exists.)
    // (Knocked down in a fight, they lie there until the end of their next round, when they get up.)
    const down = (grounded(i) && (id !== 'hero' || this.fighting)) || (!!this.fighting && i.short.includes('fall'));
    const lying = i.dead ? 'dead' : i.out || i.dying || down ? 'down' : null;
    // Going down: they fall (in a fight), then lie still; already lying, they stay.
    const cur = figs.motions.get(id);
    if (lying && !figs.isLying(id)) {
      if (this.fighting) figs.play(id, 'fall');
      figs.play(id, lying, { after: true });
    } else if (lying && cur?.act === 'fall') cur.queue = [lying]; // still falling: lie as they are now at the end
    else if (lying && cur?.act !== lying) figs.play(id, lying);
    else if (!lying && figs.isLying(id)) figs.play(id, 'guard');
    if (lying) {
      const c = w.cast.find((x) => x.who.id === id);
      if (c) c.mind.actor.legs = [];
      if (id === 'hero') w.hero.legs = [];
    }
  }

  /** Those a loaded game left knocked out or killed lie where they fell (B8a). */
  layDown(): void {
    const figs = this.w.figures;
    figs.motions.clear();
    for (const [id, i] of Object.entries(this.w.hurt)) if (i.dead || i.out || i.dying || (grounded(i) && id !== 'hero')) figs.play(id, i.dead ? 'dead' : 'down');
  }

  /**
   * Time heals fatigue (Q49): outside a fight, everyone hurt gets a point back every `restMinutes` world minutes,
   * faster when the hero sits; the knocked out get up when it's all gone. With the clock stopped, a real second
   * counts as a world minute so it still comes back.
   */
  recover(dt: number): void {
    this.restIn += dt;
    if (this.restIn < 0.25) return;
    const secs = this.restIn, w = this.w;
    this.restIn = 0;
    const minutes = w.dayMinutes > 0 ? (secs * 24) / w.dayMinutes : secs;
    for (const [id, i] of Object.entries(w.hurt)) {
      if (i.dead || (i.fatigue <= 0 && !i.out)) continue;
      const per = this.restMinutes / (id === 'hero' && w.seated ? REST_SPEED : 1);
      const next = recoverFatigue(i, minutes, per);
      if (next === i) continue;
      w.hurt[id] = next;
      if (i.out && !next.out && !grounded(next)) w.figures.motions.delete(id); // up again (not on a broken leg)
    }
  }

  /** Where a fighter stands now (the hero or one of the map's people). */
  fighterAt(id: string): { x: number; z: number } | null {
    if (id === 'hero') return { x: this.w.hero.x, z: this.w.hero.z };
    const a = this.w.cast.find((c) => c.who.id === id)?.mind.actor;
    return a ? { x: a.x, z: a.z } : null;
  }

  /** Walk a fighter to a spot (the rules said how far they go this round); the paths go round pillars and walls. */
  moveFighter(id: string, x: number, z: number): void {
    if (id === 'hero') {
      this.w.walkTo(x, z);
      return;
    }
    const a = this.w.cast.find((c) => c.who.id === id)?.mind.actor;
    if (a) this.w.moves.walkTo(a, x, z);
  }

  /** Is a fighter still on their way? */
  fighterMoving(id: string): boolean {
    if (id === 'hero') return this.w.walking;
    return !!this.w.cast.find((c) => c.who.id === id)?.mind.actor.legs.length;
  }

  /**
   * Which way a fighter faces as they go (the director: stepping back, you kept your back to the foe): towards the
   * nearest other fighter when standing or going away from them (stepping back, still watching), else the way they go.
   */
  facing(id: string, pose: Pose): Pose {
    const me = this.fighterAt(id);
    if (!me || !this.fighting) return pose;
    let foe: { x: number; z: number } | null = null, best = Infinity;
    for (const o of this.fighting) {
      const h = this.w.hurt[o];
      if (o === id || h?.dead || h?.out) continue;
      const p = this.fighterAt(o);
      const d = p ? Math.hypot(p.x - me.x, p.z - me.z) : Infinity;
      if (p && d < best) { best = d; foe = p; }
    }
    if (!foe) return pose;
    const tx = foe.x - me.x, tz = foe.z - me.z;
    const going = Math.hypot(pose.dx, pose.dz) > 1e-6;
    return !going || pose.dx * tx + pose.dz * tz < 0 ? { dx: tx, dz: tz, moving: pose.moving } : pose;
  }

  /** One of the map's people in a fight: walk where the rules sent them, else face the nearest other fighter; lie still if down. */
  step(c: CastCard, dt: number): Pose {
    const a = c.mind.actor;
    if (!this.canStand(c.who.id) || !this.fighting?.has(c.who.id)) return { dx: a.dir.x, dz: a.dir.z, moving: false };
    const going = walkOn(c.mind, this.w.moves, dt, 1.6);
    if (going) return this.facing(c.who.id, going);
    let foe: { x: number; z: number } | null = null, best = Infinity;
    for (const id of this.fighting) {
      if (id === c.who.id) continue;
      const p = this.fighterAt(id);
      const d = p ? Math.hypot(p.x - a.x, p.z - a.z) : Infinity;
      if (p && d < best) { best = d; foe = p; }
    }
    return foe ? { dx: foe.x - a.x, dz: foe.z - a.z, moving: false } : { dx: a.dir.x, dz: a.dir.z, moving: false };
  }

  /**
   * A fresh fighter answers a gong (the director: pick the enemy's difficulty): the first of the map's people of that
   * kind is rolled again at this level, healed (dead or not), their old weapon left wherever it is, and stands at
   * their place again. Returns their name, or null if the map has no one of that kind.
   */
  callFighter(kind: string, level: PersonLevel): string | null {
    const w = this.w;
    const c = w.cast.find((x) => PERSON_KINDS.resolve(x.who).chain.includes(kind));
    if (!c || this.fighting) return null;
    this.called++;
    c.who.sheet = PERSON_KINDS.rolled({ ...c.who, level, seed: (c.who.seed ?? 0) + this.called * 101 }, c.who.id);
    delete w.hurt[c.who.id];
    w.figures.motions.delete(c.who.id);
    w.gear.freshFighter(c.who.id, this.called);
    const a = c.mind.actor;
    a.x = c.who.start[0];
    a.z = c.who.start[1];
    a.legs = [];
    w.gear.showHeld();
    return w.talking.talkPerson(c.who.id)?.name ?? c.who.id;
  }

  /** How often the hero has yielded to someone in a fight (each time, the next plea to them is harder). */
  yieldedTo(id: string): number {
    return this.w.standing.yielded?.[id] ?? 0;
  }

  /** The hero yielded to someone (their plea was granted). */
  noteYield(id: string): void {
    this.w.standing.yielded = { ...this.w.standing.yielded, [id]: this.yieldedTo(id) + 1 };
  }
}

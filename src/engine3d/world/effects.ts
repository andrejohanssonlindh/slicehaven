import * as THREE from 'three';
import { THINGS } from '../../content/things';
import { BURNING } from '../../content/effects/burning';
import { type Burnable, type FireSource, type PersonFireRound, burnRound, personFireRound, weatherWet } from '../../core/world3d/effects';
import { type Injuries, unhurt } from '../../core/damage';
import { WOUND_TABLES } from '../../content/wounds';
import { t } from '../../i18n';
import { Rng } from '../../core/rng';
import type { SpikeWorld } from './index';
import type { Tagged, Torch } from './types';

/**
 * Effects on what stands (plan B7; rules `core/world3d/effects.ts`, design director/design/effects.md): every round of
 * 4 seconds the fire rules run over what can burn among the things standing now (the streamed chunks, every standing
 * house's furniture, things lying loose, campfires: out of sight is out of mind, as for torches). The states they set
 * (`burning`, `burnt`) are saved like any state; this part draws them: a flame and a light on what burns, sized by its
 * dice, and black on what burnt.
 */
export class Effects {
  private acc = 0;
  /** Seconds each burning thing has burnt (not saved: a reload gives a fire its fuel back). */
  private readonly spent = new Map<string, number>();
  /** What burns now, drawn: its flame and light. */
  private readonly flames = new Map<string, { torch: Torch; dice: number }>();
  /** How damp things out of doors still are after rain, 0..1 (dries over a few minutes of play). */
  private damp = 0;
  private readonly rng = Rng.fromSeed('fire');
  private readonly charMat = new THREE.MeshLambertMaterial({ color: 0x1c1612 });

  constructor(private readonly w: SpikeWorld) {}

  /** Every tagged thing standing now, with its group. */
  private standing(): { g: THREE.Object3D; tag: Tagged }[] {
    const w = this.w, out: { g: THREE.Object3D; tag: Tagged }[] = [];
    const add = (g: THREE.Object3D): void => {
      const tag = g.userData.thing as Tagged | undefined;
      if (tag) out.push({ g, tag });
    };
    for (const hs of w.houses) for (const f of hs.furniture) add(f);
    for (const lc of w.chunks.values()) for (const o of lc.standing.objects) add(o);
    for (const d of w.carrying.looseDrawn.values()) add(d.g);
    for (const o of w.lights.campObjects()) add(o);
    return out;
  }

  step(dt: number): void {
    const w = this.w;
    const raining = w.weather.rain > 0.3;
    this.damp = raining ? 1 : Math.max(0, this.damp - dt / 240);
    if (this.people.size) this.follow();
    this.acc += dt;
    if (this.acc < BURNING.round) return;
    this.acc -= BURNING.round;
    if (this.acc > BURNING.round) this.acc = 0; // (a long pause doesn't run many rounds at once)
    this.round(raining);
  }

  /** One round: gather what can burn and the open fires, run the rules, set the states, draw the changes. */
  round(raining = this.w.weather.rain > 0.3): void {
    const w = this.w, states = w.states;
    const wetOut = weatherWet(raining ? w.weather.rain : 0, w.weather.sky === 'storm' && raining, this.damp);
    const things: Burnable[] = [];
    const sources: FireSource[] = [];
    const groups = new Map<string, THREE.Object3D>();
    const warm: { x: number; z: number; house: string | null }[] = [];
    const v = new THREE.Vector3();
    for (const { g, tag } of this.standing()) {
      if (!THINGS.has(tag.kind) || groups.has(tag.id)) continue;
      const k = THINGS.get(tag.kind);
      g.getWorldPosition(v);
      // Any lit fire warms and dries whoever is near it (a hearth too, which sets nothing alight).
      if (k.chain.includes('fire') && w.lights.fireLit({ id: tag.id, kind: tag.kind })) warm.push({ x: v.x, z: v.z, house: tag.house });
      if (k.spreads && w.lights.fireLit({ id: tag.id, kind: tag.kind })) {
        sources.push({ id: tag.id, x: v.x, z: v.z, house: tag.house, level: tag.level, dice: k.spreads });
      }
      if (!k.material) continue;
      groups.set(tag.id, g);
      const burnt = states.get(tag.id, tag.kind, 'burnt') === true;
      if (burnt) this.char(g);
      things.push({
        id: tag.id, kind: tag.kind, material: k.material, x: v.x, z: v.z, house: tag.house, level: tag.level,
        burning: Number(states.get(tag.id, tag.kind, 'burning')), burnt, spent: this.spent.get(tag.id) ?? 0,
        wet: tag.house ? 0 : wetOut,
      });
    }
    for (const c of burnRound(things, sources, BURNING, this.rng)) {
      states.set(c.id, c.kind, 'burning', c.burning);
      if (c.burnt) states.set(c.id, c.kind, 'burnt', true);
    }
    for (const t of things) if (t.burning > 0) this.spent.set(t.id, t.spent);
    // Draw what burns now; take down what no longer does.
    for (const t of things) {
      const dice = Number(states.get(t.id, t.kind, 'burning'));
      const g = groups.get(t.id)!;
      if (states.get(t.id, t.kind, 'burnt') === true) this.char(g);
      this.show(t.id, dice, g);
      if (!dice) this.spent.delete(t.id);
    }
    // A flame whose thing is no longer standing (streamed out, picked up) goes too.
    for (const id of [...this.flames.keys()]) if (!groups.has(id) && !this.people.has(id)) this.show(id, 0, null);
    this.weatherRound(warm);
    // People in fire, or alight (a fight runs its own rounds).
    if (w.fights.inFight) return;
    const fires: FireSource[] = [...sources, ...things.filter((t) => Number(states.get(t.id, t.kind, 'burning')) > 0).map((t) => ({ id: t.id, x: t.x, z: t.z, house: t.house, level: t.level, dice: Number(states.get(t.id, t.kind, 'burning')) }))];
    this.peopleRound(fires);
  }

  /** How soaked each person's clothes are, in dice against fire (0..2: the rules' soaked clothes −1D6, soaked through −2D6). Not saved. */
  private readonly soaked = new Map<string, number>();

  /**
   * Dice of wet on someone now: their soaked clothes, or the rain itself if they stand out in it and it's worse (a
   * downpour −4D6).
   */
  wetOf(id: string): number {
    const w = this.w;
    const a = id === 'hero' ? w.hero : w.cast.find((c) => c.who.id === id)?.mind.actor;
    const raining = w.weather.rain > 0.3;
    const now = a && !a.house && raining ? weatherWet(w.weather.rain, w.weather.sky === 'storm', 1) : 0;
    return Math.floor(Math.max(this.soaked.get(id) ?? 0, now));
  }

  /** A round of rain and drying: out in the rain clothes soak (through in about five minutes); under a roof they dry, by a lit fire fast. */
  private weatherRound(warm: { x: number; z: number; house: string | null }[]): void {
    const w = this.w, raining = w.weather.rain > 0.3, r = BURNING.round;
    const who = [{ id: 'hero', a: w.hero }, ...w.cast.map((c) => ({ id: c.who.id, a: c.mind.actor }))];
    for (const { id, a } of who) {
      let s = this.soaked.get(id) ?? 0;
      if (!a.house && raining) s = Math.min(2, s + (r / 150) * (w.weather.sky === 'storm' ? 2 : 1));
      else {
        const byFire = warm.some((f) => f.house === a.house && Math.hypot(f.x - a.x, f.z - a.z) < 2.5);
        s = Math.max(0, s - r / (byFire ? 60 : a.house ? 300 : 600));
      }
      if (s > 0) this.soaked.set(id, s);
      else this.soaked.delete(id);
    }
  }

  /** Rounds in a row each person has stood in fire. */
  private readonly exposed = new Map<string, number>();
  /** The flames on people alight, by id. */
  private readonly people = new Map<string, Torch>();

  private peopleRound(fires: FireSource[]): void {
    const w = this.w;
    const who = [{ id: 'hero', a: w.hero }, ...w.cast.map((c) => ({ id: c.who.id, a: c.mind.actor }))];
    for (const { id, a } of who) {
      const before = w.fights.injuriesOf(id);
      const near = fires.some((f) => f.house === a.house && f.level === a.level && Math.hypot(f.x - a.x, f.z - a.z) < 2);
      if (!near && !before?.ignited) {
        this.exposed.delete(id);
        this.showOnPerson(id, false);
        continue;
      }
      const doer = w.acting.doerOf(id);
      const held = w.acting.world.holding?.(id);
      const water = held && THINGS.has(held) ? THINGS.get(held).douses ?? 0 : 0;
      const r = personFireRound({
        x: a.x, z: a.z, house: a.house, level: a.level, injuries: before ?? unhurt(), vitality: doer.dice('attr:Livskraft'),
        speed: doer.dice('attr:Förflyttning'), wet: this.wetOf(id), water, exposed: this.exposed.get(id) ?? 0,
      }, fires, WOUND_TABLES, this.rng);
      if (r.exposed) this.exposed.set(id, r.exposed);
      else this.exposed.delete(id);
      if (r.hit || r.putOut || r.end) w.fights.setInjuries(id, r.injuries);
      this.showOnPerson(id, !!r.injuries.ignited && !r.injuries.dead);
      if (id === 'hero') this.tell(before, r);
    }
  }

  /** What the hero should hear of a round in fire. */
  private tell(before: Injuries | null, r: PersonFireRound): void {
    const say = (s: string): void => this.w.onNote?.(s);
    if (r.hit && r.hit.fatigue > 0) say(t('fx.burned', 'The fire burns you: {n} fatigue.', { n: r.hit.fatigue }));
    if (r.injuries.ignited && !before?.ignited) say(t('fx.alight', 'Your clothes catch fire!'));
    if (r.putOut?.success) say(t('fx.putout', 'You beat out the flames on you.'));
    for (const n of r.end?.notes ?? []) {
      if (n === 'knocked out') say(t('fx.out', 'You fall senseless.'));
      if (n === 'burned to death') say(t('fx.dead', 'You burn to death.'));
    }
  }

  /** A flame on someone alight, following them each frame; or none. */
  private showOnPerson(id: string, on: boolean): void {
    const w = this.w, have = this.people.get(id);
    if (!on) {
      if (have) {
        w.scene.remove(have.flame, have.light);
        w.lights.unlist(have);
        have.dispose?.();
        this.people.delete(id);
      }
      return;
    }
    if (!have) this.people.set(id, w.lights.placeTorch(0, 0, 0, null, { size: 0.55, power: 6, lightY: 0.9 }));
    this.follow();
  }

  /** Keep the flames on people where they are. */
  private follow(): void {
    const w = this.w;
    for (const [id, torch] of this.people) {
      const a = id === 'hero' ? w.hero : w.cast.find((c) => c.who.id === id)?.mind.actor;
      if (!a) continue;
      const y = w.footY(a);
      torch.flame.position.set(a.x, y + 0.35, a.z);
      torch.light.position.set(a.x, y + 1, a.z);
    }
  }

  /** A thing's `burning` or `burnt` changed by hand (set alight, put out): draw it now, not at the next round. */
  refresh(id: string): void {
    const s = this.standing().find((x) => x.tag.id === id);
    if (!s || !THINGS.has(s.tag.kind) || !THINGS.get(s.tag.kind).material) return;
    const states = this.w.states;
    if (states.get(id, s.tag.kind, 'burnt') === true) this.char(s.g);
    const dice = Number(states.get(id, s.tag.kind, 'burning'));
    this.show(id, dice, s.g);
    if (!dice) this.spent.delete(id);
  }

  /** Is this thing burning, by its id (for tests and the debug hook)? */
  burning(id: string): boolean {
    return this.flames.has(id);
  }

  /** Put a flame and light on a burning thing (bigger with its dice), or take it away. */
  private show(id: string, dice: number, g: THREE.Object3D | null): void {
    const w = this.w, have = this.flames.get(id);
    if (have && (have.dice === dice && dice > 0)) return;
    if (have) {
      w.scene.remove(have.torch.flame, have.torch.light);
      w.lights.unlist(have.torch);
      have.torch.dispose?.();
      this.flames.delete(id);
    }
    if (!dice || !g) return;
    const box = new THREE.Box3().setFromObject(g);
    const c = box.getCenter(new THREE.Vector3());
    const torch = w.lights.placeTorch(c.x, box.min.y, c.z, null, { size: 0.35 + dice * 0.22, power: 4 + dice * 2, lightY: 0.3 + dice * 0.15 });
    this.flames.set(id, { torch, dice });
  }

  /** What burnt is black (every part of it; once). */
  private char(g: THREE.Object3D): void {
    if (g.userData.charred) return;
    g.userData.charred = true;
    g.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).material = this.charMat;
    });
  }
}

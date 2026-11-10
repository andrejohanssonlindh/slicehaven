import type * as THREE from 'three';
import { THINGS } from '../../content/things';
import { PERSON_KINDS } from '../../content/people';
import { orderly } from '../../content/people/order';
import { type Loose, type LooseSpot, type Stage, actOfStage, stageOf, stray, turnedHalf, worthOf } from '../../core/world3d/carry';
import { type ActTarget, thingName } from '../../core/world3d/actions';
import { type ActKind, type Wrong, hasLeave, mayDo, shiftRegard, weightOf } from '../../core/world3d/standing';
import { pieceId, placedId } from '../../core/world3d/state';
import { modelOf } from '../../core/world3d/things';
import type { BuiltHouse } from '../../core/world3d/layout';
import { houseToLocal } from '../../core/world3d/layout';
import { footprints } from '../../core/world3d/roomplan';
import type { Shape } from '../../core/world3d/space';
import { thingGroup } from '../things';
import type { CastCard, HouseInst, Tagged } from './types';
import type { SpikeWorld } from './index';

/**
 * Taking and carrying (plan B3b, `core/world3d/carry.ts`): picking a thing up and putting it down, loose things drawn
 * where they lie (in a house or out of doors) and stopping feet there, things sent home, and what people make of what
 * the hero carries openly (moved, taken, a loan fallen due). Found things lying out of place are brought home.
 */

/** How fast the hero walks with something held in both hands (plan B3b): a share of their pace. */
const CARRY_PACE = 0.7;
/** How far in front of the hero a thing is put down, metres, past half its depth. */
const PUT_DOWN_AHEAD = 0.3;
/** How near a found thing must be for someone to notice it lying out of place and bring it home, metres. */
const TIDY_REACH = 10;
/** How far a carried thing has gone from home, in order. */
const STAGE_RANK: Record<Stage, number> = { home: 0, room: 1, out: 2 };

type Where = { x: number; z: number; house: string | null; level: number };

export class Carrying {
  /** Loose things drawn now, by id: in a standing house's group (`inst`), or out of doors. */
  readonly looseDrawn = new Map<string, { g: THREE.Object3D; inst: HouseInst | null }>();
  /** How far what the hero holds has gone from home, and who has already answered it (person ids). */
  private carryStage: Stage = 'home';
  private readonly sawCarry = new Set<string>();

  constructor(private readonly w: SpikeWorld) {}

  private get carry() {
    return this.w.carry;
  }

  /** How fast the hero walks: something held in both hands slows them. */
  get pace(): number {
    const carry = this.carry;
    return carry.held && !carry.hidden && !this.w.figures.inHand.has('hero') ? CARRY_PACE : 1;
  }

  /** What the hero holds (its kind), or null. */
  get holding(): string | null {
    const id = this.carry.held ?? this.carry.left;
    return id ? this.carry.loose[id]?.kind ?? null : null;
  }

  /**
   * A thing to pick up, as a loose thing: one already moved, a piece of furniture (its model's seed and variant, and its
   * home), or something the map laid outdoors that has a model (a sword on the sand; its home is the wild, no one's).
   */
  private looseOf(t: ActTarget): Loose | null {
    const have = this.carry.loose[t.id];
    if (have) return have;
    if (t.house === null) {
      const p = this.w.layout.props.find((q) => placedId(q) === t.id);
      if (!p || !modelOf(THINGS.get(p.kind))) return null;
      return { kind: p.kind, seed: p.seed ?? 0, home: { x: p.x, z: p.z, level: 0, house: null, rot: p.rot ?? 0, room: null }, at: null };
    }
    const [house, ri, piece] = t.id.split('/');
    const idx = this.w.houseIndex;
    const place = house && piece ? idx.byId(house) : null;
    const mp = place ? idx.entry(place).room[Number(ri)]?.models.get(piece) : undefined;
    if (!mp) return null;
    return { kind: t.kind, seed: mp.seed, ...(mp.variant ? { variant: mp.variant } : {}), home: { x: t.x, z: t.z, level: t.level, house: t.house, rot: t.rot ?? 0, room: Number(ri) }, at: null };
  }

  /** How far a thing at a spot has gone from its home (its room, its house). */
  private stageAt(l: Loose, at: Where): Stage {
    return stageOf(l.home, { house: at.house, room: at.house ? this.w.owners.roomAt(at)?.n ?? null : null });
  }

  /** The hero picks a thing up: it leaves where it was and is held (in their arms, or out of sight). */
  pickUp(t: ActTarget, hidden: boolean): boolean {
    const gear = this.w.gear, l = this.takeFromWorld(t);
    if (!l) return false;
    const hand = hidden ? 'right' : gear.handFor(l.kind) ?? 'right';
    gear.intoHand(t.id, hand);
    if (hand === 'right') this.carry.hidden = hidden;
    this.nowHolding();
    gear.showHeld();
    return true;
  }

  /**
   * Take a thing out of the world for the hero (to a hand or the pack): it is loose from now on, no longer drawn where
   * it was, nor stopping feet. Null if it can't be taken (someone else carries it, or it has no model).
   */
  takeFromWorld(t: ActTarget): Loose | null {
    const l = this.looseOf(t);
    if (!l || l.by) return null;
    this.feetChanged(l.at ?? l.home);
    l.at = null;
    this.carry.loose[t.id] = l;
    this.undraw(t.id);
    this.removePiece(t.id);
    return l;
  }

  /** What the hero holds changed (picked up, taken out of the pack): how far it has gone from home starts from here. */
  nowHolding(): void {
    const id = this.carry.held, l = id ? this.carry.loose[id] : null;
    this.sawCarry.clear();
    this.carryStage = l ? this.stageAt(l, this.w.heroSpot()) : 'home';
  }

  /** The hero puts down what they hold, just in front of them, turned the way they face. */
  putDown(): boolean {
    const carry = this.carry;
    const id = carry.held ?? carry.left;
    return id ? this.layDown(id) : false;
  }

  /**
   * Lay one of the hero's things on the ground just in front of them, turned the way they face: what they hold, or
   * something from their pockets or pack (plan B6).
   */
  layDown(id: string): boolean {
    const carry = this.carry, l = carry.loose[id];
    if (!l || l.at || l.worn) return false;
    const yaw = this.w.heroFig.want, s = this.w.heroSpot();
    // (Far enough ahead that the hero isn't standing in it once it stops feet.)
    const ahead = PUT_DOWN_AHEAD + (modelOf(THINGS.get(l.kind))?.d ?? 0) / 2;
    l.at = { x: s.x + Math.sin(yaw) * ahead, z: s.z + Math.cos(yaw) * ahead, level: s.level, house: s.house, rot: yaw };
    delete l.in;
    delete l.stowed;
    delete l.fitted;
    if (carry.held === id) {
      carry.held = null;
      carry.hidden = false;
    } else if (carry.left === id) carry.left = null;
    this.w.gear.showHeld();
    this.drawLoose(id, l);
    this.feetChanged(l.at);
    return true;
  }

  /** A thing goes back where it belongs (given back, or brought home by someone): drawn there, in no one's hands. */
  sendHome(id: string): void {
    const carry = this.carry, l = carry.loose[id];
    if (!l) return;
    if (carry.held === id) {
      carry.held = null;
      carry.hidden = false;
    }
    if (carry.left === id) carry.left = null;
    delete l.by;
    delete l.loan;
    this.feetChanged(l.at);
    l.at = { x: l.home.x, z: l.home.z, level: l.home.level, house: l.home.house, rot: l.home.rot };
    this.w.gear.showHeld();
    this.drawLoose(id, l);
    this.feetChanged(l.at);
  }

  /** Someone of the map lifts a thing lying out of place to bring it home (the behaviour `tidy`). */
  lift(by: string, id: string): boolean {
    const l = this.carry.loose[id];
    if (!l?.at || l.by || this.carry.held === id) return false;
    this.feetChanged(l.at);
    this.undraw(id);
    l.at = null;
    l.by = by;
    this.w.gear.showHeld();
    return true;
  }

  /** Draw a loose thing where it lies: in its house's group (if the house stands now), or on the ground. */
  drawLoose(id: string, l: Loose): void {
    this.undraw(id);
    const at: LooseSpot | null = l.at, model = modelOf(THINGS.get(l.kind));
    if (!at || !model) return;
    const g = thingGroup(model.draw(l.seed, l.variant));
    g.userData.thing = { id, kind: l.kind, house: at.house, level: at.level, rot: at.rot } satisfies Tagged;
    if (at.house) {
      const inst = this.w.houses.find((hs) => hs.built.place.id === at.house);
      if (!inst) return;
      const h = inst.built.place, p = houseToLocal(h, at.x, at.z);
      g.position.set(p.x, inst.built.model.levels[at.level]?.floorY ?? 0, p.z);
      g.rotation.y = at.rot - h.rot;
      inst.group.add(g);
      inst.furniture.push(g);
      inst.furnLevel.push(at.level);
      this.looseDrawn.set(id, { g, inst });
    } else {
      g.position.set(at.x, this.w.store.heightAt(at.x, at.z), at.z);
      g.rotation.y = at.rot;
      this.w.scene.add(g);
      this.looseDrawn.set(id, { g, inst: null });
    }
  }

  /** Take a drawn piece of furniture out of the world (and out of its house's list). */
  dropPiece(g: THREE.Object3D, inst: HouseInst | null): void {
    g.removeFromParent();
    if (inst) {
      const i = inst.furniture.indexOf(g);
      if (i >= 0) {
        inst.furniture.splice(i, 1);
        inst.furnLevel.splice(i, 1);
      }
    }
    g.traverse((o) => {
      const geo = (o as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
      if (geo && !geo.userData.shared) geo.dispose();
    });
  }

  undraw(id: string): void {
    const d = this.looseDrawn.get(id);
    if (!d) return;
    this.looseDrawn.delete(id);
    this.dropPiece(d.g, d.inst);
  }

  /** A house was taken down: the loose things lying in it went with its group (they're drawn again when it stands). */
  forgetHouse(hs: HouseInst): void {
    for (const [id, d] of this.looseDrawn) if (d.inst === hs) this.looseDrawn.delete(id);
  }

  /** The piece as the room's plan placed it, if its house stands now (once moved, it is drawn as a loose thing instead). */
  removePiece(id: string): void {
    for (const hs of this.w.houses) {
      const g = hs.furniture.find((f) => (f.userData.thing as Tagged | undefined)?.id === id);
      if (g) this.dropPiece(g, hs);
    }
    // (Or something the map laid outdoors, as its chunk stood it up.)
    for (const lc of this.w.chunks.values()) {
      const objs = lc.standing.objects, i = objs.findIndex((o) => (o.userData.thing as Tagged | undefined)?.id === id && !this.isLoose(o));
      if (i >= 0) this.dropPiece(objs.splice(i, 1)[0], null);
    }
  }

  /** Is this drawn group a loose thing (drawn where it lies now), not the map's own placing of it? */
  private isLoose(g: THREE.Object3D): boolean {
    for (const d of this.looseDrawn.values()) if (d.g === g) return true;
    return false;
  }

  /** The floor footprints of a house's furniture on a storey, house-local, for walking: the plan's pieces not moved, and loose things lying there. */
  furnitureRects(b: BuiltHouse, level: number): { x: number; z: number; hw: number; hd: number }[] {
    const out: { x: number; z: number; hw: number; hd: number }[] = [];
    this.w.houseIndex.entry(b.place).room.forEach((r, ri) => {
      if (r.level !== level) return;
      for (const f of footprints(r.plan)) if (!this.carry.loose[pieceId(b.place.id, ri, f.id)]) out.push(f);
    });
    for (const l of Object.values(this.carry.loose)) {
      const model = modelOf(THINGS.get(l.kind));
      if (!model || l.at?.house !== b.place.id || l.at.level !== level) continue;
      const p = houseToLocal(b.place, l.at.x, l.at.z);
      out.push({ x: p.x, z: p.z, ...turnedHalf(model.w, model.d, l.at.rot - b.place.rot) });
    }
    return out;
  }

  /** Loose things lying out of doors in a rectangle, as what stops feet. */
  looseOutdoors(x0: number, z0: number, x1: number, z1: number): Shape[] {
    const out: Shape[] = [];
    for (const l of Object.values(this.carry.loose)) {
      const at = l.at, model = modelOf(THINGS.get(l.kind));
      if (!at || at.house || !model || at.x < x0 - 2 || at.x > x1 + 2 || at.z < z0 - 2 || at.z > z1 + 2) continue;
      out.push({ kind: 'box', x: at.x, z: at.z, hw: model.w / 2, hd: model.d / 2, rot: at.rot });
    }
    return out;
  }

  /** A thing left a spot or came to one: walking there is worked out again (the ground's grid there, a house's upper storeys). */
  feetChanged(at: Where | null): void {
    if (!at) return;
    if (at.house && at.level > 0) this.w.moves.forgetHouse(at.house);
    else this.w.nav.invalidate(at.x - 1.5, at.z - 1.5, at.x + 1.5, at.z + 1.5);
  }

  /** Everything loose drawn again from `carry` (a loaded game): the plan's pieces that moved go, the loose ones come. */
  redraw(): void {
    for (const id of [...this.looseDrawn.keys()]) this.undraw(id);
    // (Walking is worked out again everywhere: what stops feet may lie elsewhere now.)
    this.w.nav.forget(() => false);
    for (const [id, l] of Object.entries(this.carry.loose)) {
      // Someone was carrying it home when the game was saved: it got there.
      if (l.by) {
        delete l.by;
        l.at = { x: l.home.x, z: l.home.z, level: l.home.level, house: l.home.house, rot: l.home.rot };
      }
      for (const h of [l.home.house, l.at?.house]) if (h) this.w.moves.forgetHouse(h);
      this.removePiece(id);
      this.drawLoose(id, l);
    }
    this.w.gear.showHeld();
    const id = this.carry.held, l = id ? this.carry.loose[id] : null;
    this.carryStage = l ? this.stageAt(l, this.w.heroSpot()) : 'home';
    this.sawCarry.clear();
  }

  /**
   * What the hero carries openly, as people see it (run when people look): carried out of its room is *move*, out of
   * its house *take*, for whoever sees it cross; once it is out, its household know it whenever they see it with you.
   * Something held out of sight is never noticed. Lines said go to the page.
   */
  checkCarry(): void {
    const w = this.w, carry = this.carry;
    const id = carry.held, l = id ? carry.loose[id] : null;
    if (!id || !l || carry.hidden || !l.home.house || l.mine) return;
    const house = l.home.house, kind = THINGS.get(l.kind);
    const stage = this.stageAt(l, w.heroSpot()), was = this.carryStage;
    this.carryStage = stage;
    // (Lent to you: no wrong until it is due.)
    const lent = l.loan !== undefined && w.worldHours < l.loan;
    const wrongs = (act: ActKind): Wrong[] =>
      lent || mayDo({ owner: { house }, act, member: false, leave: hasLeave(w.standing, house, w.worldHours), welcome: null, hour: w.weather.hour ?? 12, culture: w.culture })
        ? []
        : [{ act, owner: { house }, worth: worthOf(act, kind.value ?? 0, kind.importance ?? 0, w.owners.houseWealth(house), w.culture) }];
    const answer = (act: ActKind, only: (c: CastCard) => boolean, fallback: string | null): void => {
      const ws = wrongs(act);
      if (!ws.length) return;
      for (const s of w.owners.witness(ws, (c) => only(c) && !this.sawCarry.has(`${c.who.id}:${stage}`))) {
        this.sawCarry.add(`${s.id}:${stage}`);
        const says = s.says ?? fallback;
        if (says) w.onSpeak?.(s.id, s.name, says);
      }
    };
    const act = actOfStage(stage);
    if (act && STAGE_RANK[stage] > STAGE_RANK[was]) answer(act, () => true, null);
    if (stage === 'out') answer('take', (c) => c.who.home === house, `That's our ${thingName(kind)}!`);
  }

  /** Where a loose thing is now: where it lies, or where whoever holds it stands. */
  whereLoose(id: string): Where | null {
    const l = this.carry.loose[id];
    if (!l) return null;
    if (l.at) return l.at;
    if (this.carry.held === id) return this.w.heroSpot();
    const m = l.by ? this.w.cast.find((c) => c.who.id === l.by)?.mind.actor : null;
    return m ? { x: m.x, z: m.z, house: m.house, level: m.stair ? 0 : m.level } : null;
  }

  /**
   * A loan falls due: if the thing isn't home by then, its household know it was kept, seen or not, and think of it
   * as taken (B3b). Back home in time, the loan just ends. Lines said go to the page.
   */
  checkLoans(): void {
    const w = this.w;
    for (const [id, l] of Object.entries(this.carry.loose)) {
      if (l.loan === undefined || w.worldHours < l.loan || !l.home.house) continue;
      delete l.loan;
      const at = this.whereLoose(id);
      if (at && this.stageAt(l, at) === 'home') continue;
      const kind = THINGS.get(l.kind), house = l.home.house;
      const wrong: Wrong = { act: 'take', owner: { house }, worth: worthOf('take', kind.value ?? 0, kind.importance ?? 0, w.owners.houseWealth(house), w.culture) };
      for (const c of w.cast.filter((x) => x.who.home === house)) shiftRegard(w.standing, c.who.id, -weightOf(wrong, w.culture, true));
      w.onNote?.(`The ${thingName(kind)} you borrowed was due back. Its owners count it as taken.`);
      // (It's theirs again in their minds now: carried openly, they know it.)
      this.sawCarry.clear();
      if (this.carry.held === id) this.carryStage = 'home';
    }
  }

  /**
   * Someone near a thing lying out of place brings it home: its own household always, anyone who likes order
   * (`content/people/order.ts`) whatever its household. Run when people look; they set about it by the behaviour `tidy`.
   */
  findStrays(): void {
    const w = this.w;
    const loose = Object.entries(this.carry.loose).filter(([, l]) => l.at && stray(l, { house: l.at.house, room: l.at.house ? w.owners.roomAt(l.at)?.n ?? null : null }));
    if (!loose.length) return;
    const busy = new Set(w.cast.flatMap((c) => (c.mind.tidy ? [c.mind.tidy.thing] : [])));
    for (const c of w.cast) {
      const a = c.mind.actor;
      if (c.mind.tidy || c.mind.answer || w.talking.talkingWith === c.who.id) continue;
      const tidy = orderly(PERSON_KINDS.resolve(c.who).chain);
      for (const [id, l] of loose) {
        const at = l.at!;
        if (busy.has(id) || (!tidy && c.who.home !== l.home.house)) continue;
        if (at.house !== a.house || (at.house !== null && at.level !== a.level) || Math.hypot(at.x - a.x, at.z - a.z) > TIDY_REACH) continue;
        c.mind.tidy = { thing: id };
        busy.add(id);
        break;
      }
    }
  }
}

import type * as THREE from 'three';
import { THINGS } from '../../content/things';
import { type Loose, aHandFree, handFor } from '../../core/world3d/carry';
import type { ActTarget } from '../../core/world3d/actions';
import { placedId } from '../../core/world3d/state';
import { modelOf } from '../../core/world3d/things';
import { holdOnRig } from '../body';
import { thingGroup } from '../things';
import type { SpikeWorld } from './index';

/**
 * What people hold in their hands (plan B3b, B8a): the hero's held thing and shield, their own gear carried on them,
 * the weapons and shields the map's people draw for a fight, a rack's stock, and what falls to the ground and is
 * taken up again. All of it is loose things in the world's `carry` (saved); this part also draws them in the hands.
 */

/** A held thing is shrunk to at most this long, metres; its foot is held this high and this far ahead, as shares of the body's height. */
const HELD_SIZE = 0.7;
const HELD_Y = 0.4;
const HELD_AHEAD = 0.1;

export class Gear {
  /** The models of what is held, in the arms of whoever holds it (`hero`, or one of the map's people). */
  private readonly heldGs: THREE.Object3D[] = [];
  /** How often each called fighter has come afresh (not saved, as they aren't). */
  private freshGear: Record<string, number> = {};

  constructor(private readonly w: SpikeWorld) {}

  private get carry() {
    return this.w.carry;
  }

  /** The kind of a loose thing by id, if it has one the things know. */
  private defOf(id: string | null | undefined) {
    const l = id ? this.carry.loose[id] : null;
    return l && THINGS.has(l.kind) ? THINGS.get(l.kind) : null;
  }

  /** The weapon someone holds (a loose thing's id and kind): the hero's held thing if it is one, a person's wielded one. */
  wieldedBy(who: string): { id: string; kind: string } | null {
    const carry = this.carry;
    if (who === 'hero') {
      const id = carry.held, l = id ? carry.loose[id] : null;
      return id && l && !carry.hidden ? { id, kind: l.kind } : null;
    }
    for (const [id, l] of Object.entries(carry.loose)) if (l.wield === who && l.hand !== 'left') return { id, kind: l.kind };
    return null;
  }

  /** The shield someone wears on the left forearm (the hero's, or a person's), or null. */
  shieldOf(who: string): { id: string; kind: string } | null {
    const carry = this.carry;
    if (who === 'hero') {
      const id = carry.left, l = id ? carry.loose[id] : null;
      return id && l ? { id, kind: l.kind } : null;
    }
    for (const [id, l] of Object.entries(carry.loose)) if (l.wield === who && l.hand === 'left') return { id, kind: l.kind };
    return null;
  }

  /**
   * One of the map's people draws their own weapon (a kind of thing, from their sheet's gear) for a fight: it is a loose
   * thing from now on, theirs, held in their hand, and saved. Already drawn, or lost (lying somewhere), nothing changes.
   */
  drawWeapon(who: string, kind: string): string | null {
    return this.drawOwnGear(who, kind, 'weapon');
  }

  /** One of the map's people takes up their own shield (from their sheet's gear) for a fight, as `drawWeapon` does a weapon. */
  drawShield(who: string, kind: string): string | null {
    return this.drawOwnGear(who, kind, 'shield');
  }

  private drawOwnGear(who: string, kind: string, slot: 'weapon' | 'shield'): string | null {
    const id = this.ownGearId(who, slot), carry = this.carry;
    if (carry.loose[id]) return carry.loose[id].wield === who ? id : null;
    const a = this.w.cast.find((c) => c.who.id === who)?.mind.actor;
    if (!a || !THINGS.has(kind)) return null;
    carry.loose[id] = { kind, seed: 1, home: { x: a.x, z: a.z, level: 0, house: null, rot: 0, room: null }, at: null, wield: who, ...(slot === 'shield' ? { hand: 'left' as const } : {}) };
    this.showHeld();
    return id;
  }

  /**
   * The id of someone's own weapon or shield: `gladiator:weapon`. Someone called afresh (`callFighter`) comes with
   * their own gear: what the last one left lying, or what the hero took, stays where it is (`gladiator:weapon:2`).
   */
  private ownGearId(who: string, slot: 'weapon' | 'shield'): string {
    const n = this.freshGear[who] ?? 0;
    return n ? `${who}:${slot}:${n + 1}` : `${who}:${slot}`;
  }

  /** Someone comes afresh to a fight (the `n`th called): what they wielded is gone from them, and their own gear is new. */
  freshFighter(who: string, n: number): void {
    for (const [id, l] of Object.entries(this.carry.loose)) if (l.wield === who) delete this.carry.loose[id];
    this.freshGear[who] = n;
  }

  /**
   * The hero's own gear (plan B8a, the director: "use what you have from creation"): the weapons and shields they own,
   * carried at the belt or on the back, not in hand. Given once per hero (`key`: who they are and what they own); a
   * new hero or other gear replaces what the last one carried (anything dropped in the world stays where it lies).
   */
  outfit(kinds: string[], key: string): void {
    const carry = this.carry, hero = this.w.hero;
    if (carry.outfit === key) return;
    for (const [id, l] of Object.entries(carry.loose)) if (l.stowed || (id.startsWith('hero:own:') && (carry.held === id || carry.left === id))) delete carry.loose[id];
    if (carry.held && !carry.loose[carry.held]) carry.held = null;
    if (carry.left && !carry.loose[carry.left]) carry.left = null;
    kinds.forEach((kind, n) => {
      if (!THINGS.has(kind)) return;
      carry.loose[`hero:own:${kind}:${n}`] = { kind, seed: n + 1, home: { x: hero.x, z: hero.z, level: 0, house: null, rot: 0, room: null }, at: null, mine: true, stowed: true };
    });
    carry.outfit = key;
    this.showHeld();
  }

  /** Which of the hero's hands a thing of this kind would go in now (`handFor`), or null if none is free for it. */
  handFor(kind: string): 'right' | 'left' | null {
    return THINGS.has(kind) ? handFor(THINGS.get(kind), this.defOf(this.carry.held), this.defOf(this.carry.left)) : null;
  }

  /** Has the hero some hand free (for drawing or taking something)? */
  aHandFree(): boolean {
    return aHandFree(this.defOf(this.carry.held), this.defOf(this.carry.left));
  }

  /** Put a loose thing in the hero's hand (the one `handFor` gives). */
  intoHand(id: string, hand: 'right' | 'left'): void {
    if (hand === 'left') this.carry.left = id;
    else {
      this.carry.held = id;
      this.carry.hidden = false;
    }
  }

  /** What the hero carries on them, not in hand (their own gear): id and kind, in the order given. */
  get stowed(): { id: string; kind: string }[] {
    return Object.entries(this.carry.loose).filter(([, l]) => l.stowed).map(([id, l]) => ({ id, kind: l.kind }));
  }

  /** Draw one of the hero's own things into their hand (hands must be free). Returns false if it can't. */
  drawOwn(id: string): boolean {
    const l = this.carry.loose[id];
    const hand = l?.stowed ? this.handFor(l.kind) : null;
    if (!l || !hand) return false;
    delete l.stowed;
    this.intoHand(id, hand);
    this.showHeld();
    return true;
  }

  /**
   * Put the weapon or shield the hero holds away on them (the director: why put down one and put away the other?).
   * A taken one stays its owner's (`mine` unchanged): carried, not given.
   */
  stowHeld(which?: string): boolean {
    const carry = this.carry;
    const id = which && (carry.held === which || carry.left === which) ? which : carry.held ?? carry.left;
    const l = id ? carry.loose[id] : null;
    const def = this.defOf(id);
    if (!id || !l || !(def?.weapon || def?.shield)) return false;
    l.stowed = true;
    if (carry.held === id) carry.held = null;
    else carry.left = null;
    this.showHeld();
    return true;
  }

  /**
   * The hero takes one of a rack's stock (a weapon rack: any weapon): a new thing of that kind, in their hand, theirs
   * from now on (saved like anything loose). Their hands must be free. Returns its id, or null.
   */
  takeFromStock(rack: ActTarget, kind: string): string | null {
    const stock = THINGS.has(rack.kind) ? THINGS.get(rack.kind).stock : undefined;
    const hand = this.handFor(kind);
    if (!hand || !stock || !THINGS.has(kind) || !THINGS.get(kind).chain.includes(stock)) return null;
    let n = 1;
    while (this.carry.loose[`${rack.id}:${kind}:${n}`]) n++;
    const id = `${rack.id}:${kind}:${n}`;
    this.carry.loose[id] = { kind, seed: n, home: { x: rack.x, z: rack.z, level: rack.level, house: rack.house, rot: 0, room: null }, at: null, mine: true };
    this.intoHand(id, hand);
    this.showHeld();
    return id;
  }

  /** What kind a loose thing (or one the map laid) is, by its id. */
  thingKind(id: string): string | null {
    return this.carry.loose[id]?.kind ?? this.w.layout.props.find((p) => placedId(p) === id)?.kind ?? null;
  }

  /** Weapons lying on the ground outdoors within `r` metres of a spot: moved ones where they lie, and the map's own not yet touched. */
  weaponsLying(x: number, z: number, r: number): { id: string; kind: string; x: number; z: number }[] {
    const out: { id: string; kind: string; x: number; z: number }[] = [];
    const near = (px: number, pz: number) => Math.hypot(px - x, pz - z) <= r;
    const arms = (k: string) => THINGS.has(k) && !!(THINGS.get(k).weapon || THINGS.get(k).shield);
    for (const [id, l] of Object.entries(this.carry.loose)) if (l.at && !l.at.house && arms(l.kind) && near(l.at.x, l.at.z)) out.push({ id, kind: l.kind, x: l.at.x, z: l.at.z });
    for (const p of this.w.layout.props) {
      const id = placedId(p);
      if (!this.carry.loose[id] && arms(p.kind) && near(p.x, p.z)) out.push({ id, kind: p.kind, x: p.x, z: p.z });
    }
    return out;
  }

  /** What someone holds falls to the ground at a spot (a blow made them drop it, or they fell). */
  dropAt(who: string, id: string, x: number, z: number): void {
    const carry = this.carry, l = carry.loose[id];
    if (!l) return;
    if (who === 'hero' && carry.held === id) {
      carry.held = null;
      carry.hidden = false;
    }
    if (who === 'hero' && carry.left === id) carry.left = null;
    if (l.wield === who) {
      delete l.wield;
      delete l.hand;
    }
    const from = this.w.fights.fighterAt(who);
    l.at = { x, z, level: 0, house: null, rot: Math.atan2(x - (from?.x ?? x), z - (from?.z ?? z)) };
    this.showHeld();
    this.w.carrying.drawLoose(id, l);
  }

  /** Someone takes up a thing lying near them as their weapon (a side action in a fight): it leaves the ground for their hand. */
  takeUp(who: string, id: string): void {
    const carry = this.carry, carrying = this.w.carrying;
    let l = carry.loose[id];
    if (!l) {
      // Something the map laid there, never moved yet.
      const p = this.w.layout.props.find((q) => placedId(q) === id);
      if (!p) return;
      l = carry.loose[id] = { kind: p.kind, seed: p.seed ?? 0, home: { x: p.x, z: p.z, level: 0, house: null, rot: p.rot ?? 0, room: null }, at: null };
      carrying.removePiece(id);
    } else {
      if (!l.at) return;
      carrying.undraw(id);
      l.at = null;
    }
    if (who === 'hero') this.intoHand(id, this.handFor(l.kind) ?? 'right');
    else {
      l.wield = who;
      if (THINGS.get(l.kind).shield) l.hand = 'left';
    }
    this.showHeld();
  }

  /** Who holds what, openly: the hero (unless out of sight), the map's people carrying found things home, and their weapons. */
  holds(): [who: string, l: Loose][] {
    const carry = this.carry, out: [string, Loose][] = [];
    const id = carry.held, l = id ? carry.loose[id] : null;
    if (l && !carry.hidden) out.push(['hero', l]);
    const left = carry.left ? carry.loose[carry.left] : null;
    if (left) out.push(['hero', left]);
    for (const x of Object.values(carry.loose)) {
      if (x.by) out.push([x.by, x]);
      if (x.wield) out.push([x.wield, x]);
    }
    return out;
  }

  /**
   * What is held: something with a grip (a sword) in the right hand, at the hand's grip, the blade out along the
   * forearm's front; anything else in the holders' arms (the carrying pose: `Figures.step`), in front of the chest,
   * smaller than life so the body still shows.
   */
  showHeld(): void {
    const figs = this.w.figures;
    for (const g of this.heldGs) this.w.carrying.dropPiece(g, null);
    this.heldGs.length = 0;
    figs.inHand.clear();
    figs.inArms.clear();
    for (const [who, l] of this.holds()) {
      const model = modelOf(THINGS.get(l.kind)), fig = figs.figureOf(who);
      if (!model || !fig) continue;
      const g = thingGroup(model.draw(l.seed, l.variant));
      const shield = !!THINGS.get(l.kind).shield;
      if (holdOnRig(fig.rig, g, { grip: model.grip, shield })) {
        if (!shield) figs.inHand.add(who);
      } else {
        const s = Math.min(1, HELD_SIZE / Math.max(model.w, model.d)), H = fig.rig.model.height;
        g.scale.setScalar(s);
        g.position.set(0, HELD_Y * H, HELD_AHEAD * H + (model.d * s) / 2);
        fig.rig.group.add(g);
        figs.inArms.add(who);
      }
      this.heldGs.push(g);
    }
  }
}

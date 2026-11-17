import * as THREE from 'three';
import type { PersonSpec } from '../../core/persons';
import { PERSON_KINDS } from '../../content/people';
import { THINGS } from '../../content/things';
import { bodySpecOf } from '../../content/people/bodies';
import { ANIM, HOLDS, READY, SIT, STAND } from '../../content/people/poses';
import { MOTIONS } from '../../content/motions';
import { styleFor } from '../../content/combat';
import { LYING_ACTS, type Motion, type MotionAct, type Playing, type WayOfMoving, advance, findMotion } from '../../core/world3d/motion';
import { animate, mannerOf, newAnim } from '../../core/world3d/animate';
import { buildBody } from '../../core/world3d/body';
import { wrapAngle } from '../../core/world3d/view';
import { makeBodyRig, placeRoot } from '../body';
import type { Figure } from './types';
import type { SpikeWorld } from './index';

/**
 * People's bodies on screen (plan A2, B8g): each person's figure turns the way they go and walks while they move, holds
 * what they hold, and plays motions (`content/motions/`: on guard, a strike, lying down) over what the legs do. The
 * rules say what happens; this only shows it.
 */

/** A person's figure: their body, built from their kinds, on an anchor. */
export function personFigure(p: PersonSpec, yaw: number): Figure {
  const rig = makeBodyRig(buildBody(bodySpecOf(PERSON_KINDS.resolve(p), p.seed ?? 1)));
  const place = new THREE.Group();
  place.add(rig.group);
  const manner = mannerOf(p.seed ?? 1);
  return { place, rig, yaw, want: yaw, moving: false, lastX: 0, lastZ: 0, manner, anim: newAnim(manner) };
}

/** Someone this near, in front, draws a glance (metres). */
const NOTICE = 3;

export class Figures {
  /** The motion each person plays, and since when (`time`): on guard, a strike, lying down (`content/motions/`, B8g). */
  readonly motions = new Map<string, Playing>();
  /** Who carries something in both arms (the carrying pose); who holds something in the right hand (a sword). Set by `Gear.showHeld`. */
  readonly inArms = new Set<string>();
  readonly inHand = new Set<string>();

  constructor(private readonly w: SpikeWorld) {}

  /** The figure of the hero or one of the map's people. */
  figureOf(id: string): Figure | null {
    return id === 'hero' ? this.w.heroFig : this.w.cast.find((c) => c.who.id === id)?.fig ?? null;
  }

  /** A person faces the way they go (a standing still direction keeps the last), and walks or stands. */
  faceWalker(fig: Figure, dirX: number, dirZ: number, moving: boolean): void {
    if (Math.hypot(dirX, dirZ) > 1e-6) fig.want = Math.atan2(dirX, dirZ);
    fig.moving = moving;
  }

  /**
   * Someone acts (the rules said what happened: they strike, parry, fall): the motion for the act is looked up for the
   * weapon they hold and how they fight, and plays from now, or after what is playing (`after`). Standing acts are
   * skipped for someone lying (knocked out, dying, dead). Then it goes on to what the motion says follows (back on guard).
   */
  play(id: string, act: MotionAct, opts: { after?: boolean } = {}): void {
    if (!LYING_ACTS.has(act) && !this.w.fights.canStand(id)) return;
    const m = this.motionFor(id, act);
    if (!m) return;
    const cur = this.motions.get(id);
    if (opts.after && cur && !this.settled(cur)) cur.queue.push(act);
    else this.motions.set(id, { act, motion: m.id, since: this.w.time, queue: [] });
  }

  /**
   * How long the motion someone would play for an act takes, and when its `contact` comes (seconds from its start;
   * null if it has none), so the page can time one fighter's motion against the other's and the floating damage.
   */
  motionTiming(id: string, act: MotionAct): { seconds: number; contact: number | null } | null {
    const m = this.motionFor(id, act);
    if (!m) return null;
    const c = m.marks?.contact;
    return { seconds: m.seconds, contact: c === undefined ? null : c * m.seconds };
  }

  /**
   * Where someone is on the screen, `up` metres over their feet (their head by default): a share of the view across
   * (0 left, 1 right) and down (0 top, 1 bottom). Null if they aren't shown.
   */
  screenOf(id: string, up?: number): { x: number; y: number } | null {
    const f = this.figureOf(id);
    if (!f || !f.place.visible) return null;
    const v = f.place.getWorldPosition(new THREE.Vector3());
    v.y += up ?? (this.isLying(id) ? 0.4 : f.rig.model.height);
    v.project(this.w.camera);
    return { x: (v.x + 1) / 2, y: (1 - v.y) / 2 };
  }

  /** What someone's motion is showing now (`guard`, `strike`, `down` …), or null outside any. */
  actOf(id: string): MotionAct | null {
    return this.motions.get(id)?.act ?? null;
  }

  /** Is someone lying on the ground (falling, down, dead: a lying motion)? */
  isLying(id: string): boolean {
    const a = this.motions.get(id)?.act;
    return !!a && LYING_ACTS.has(a);
  }

  /** A motion that has played out and only holds (nothing queued, nothing follows). */
  private settled(p: Playing): boolean {
    const m = MOTIONS[p.motion];
    return !m || (!p.queue.length && m.then === 'hold' && this.w.time - p.since >= m.seconds);
  }

  /** How what someone holds in the right hand moves (their weapon kind's `moves`), else bare hands. */
  private wayOf(id: string): WayOfMoving {
    let way: WayOfMoving | undefined;
    for (const [who, l] of this.w.gear.holds()) {
      if (who !== id) continue;
      const k = THINGS.get(l.kind);
      if (k.shield) way ??= k.moves;
      else if (k.moves) way = k.moves;
    }
    return way ?? 'hands';
  }

  /** The fighting style someone fights by (their own, their kind's, the default); the hero has none yet. */
  private styleOf(id: string): string | undefined {
    if (id === 'hero') return undefined;
    const c = this.w.cast.find((x) => x.who.id === id);
    return c ? styleFor(PERSON_KINDS.resolve(c.who).chain, c.who.fights).id : undefined;
  }

  /** The motion someone plays for an act (`findMotion`: the most specific for their weapon and style). */
  private motionFor(id: string, act: MotionAct): Motion | null {
    return findMotion(MOTIONS, act, this.wayOf(id), this.styleOf(id));
  }

  /**
   * Who someone's head turns to, if anyone: in a fight the nearest fighter still standing; in a talk the other one;
   * else the hero passing close in front of them. As a direction from the way their body faces (`AnimInput.look`).
   */
  private lookOf(id: string, f: Figure): { yaw: number; pitch: number } | null {
    const w = this.w;
    let to: Figure | null = null, reach = Infinity;
    const fighting = w.fights.fighting;
    if (fighting?.has(id)) {
      let best = Infinity;
      for (const other of fighting) {
        const o = other === id ? null : this.figureOf(other);
        if (!o || !o.place.visible) continue;
        const d = o.place.position.distanceTo(f.place.position) + (this.isLying(other) ? 100 : 0);
        if (d < best) { best = d; to = o; }
      }
    } else if (w.talking.talkingWith && (id === 'hero' || id === w.talking.talkingWith)) {
      to = this.figureOf(id === 'hero' ? w.talking.talkingWith : 'hero');
    } else if (id !== 'hero') {
      to = w.heroFig;
      reach = NOTICE;
    }
    if (!to || !to.place.visible) return null;
    const a = f.place.position, b = to.place.position;
    const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
    if (d < 0.05 || d > reach) return null;
    const yaw = wrapAngle(Math.atan2(dx, dz) - f.yaw);
    // A passer-by behind or far to the side isn't turned to.
    if (reach < Infinity && Math.abs(yaw) > 1.4) return null;
    const eyes = (x: Figure): number => x.place.position.y + x.rig.model.height * 0.93;
    return { yaw, pitch: Math.atan2(eyes(to) - eyes(f), d) };
  }

  /**
   * Each person's body turns the way they go, and shows what the animator makes of what they are doing
   * (`core/world3d/animate.ts`): standing, walking or running by the ground covered, what they hold, a motion playing,
   * and the small movements of someone alive.
   */
  step(dt: number): void {
    const w = this.w, time = w.time;
    for (const p of w.people) {
      const f = p.fig, at = f.place.position;
      if (!f.place.visible) continue;
      const dx = at.x - f.lastX, dz = at.z - f.lastZ, d = Math.hypot(dx, dz);
      f.lastX = at.x;
      f.lastZ = at.z;
      // A jump (a load, a teleport) is not a step.
      const stepped = d > 0.001 && d < 1;
      if (stepped) f.want = Math.atan2(dx, dz);
      // The hero on a seat: set down so the hips rest on it, facing the way it faces.
      const seat = p.id === 'hero' ? w.seated : null;
      if (seat) {
        f.place.position.set(seat.x, seat.y + 0.04 - f.rig.model.joints.root.at[1], seat.z);
        f.lastX = seat.x;
        f.lastZ = seat.z;
        f.want = seat.yaw;
        w.heroBlob.position.set(seat.x, seat.floor + 0.03, seat.z);
      }
      const turning = wrapAngle(f.want - f.yaw);
      f.yaw += turning * (1 - Math.exp(-dt / 0.11));
      f.rig.group.rotation.y = f.yaw;
      // A motion playing (in a fight, or left lying after one: `content/motions/`): over what the legs do, or the whole
      // body with its root moved (tipped onto its back, a step back).
      let pl = this.motions.get(p.id);
      if (pl) {
        const next = advance(pl, time, MOTIONS, (a) => this.motionFor(p.id, a));
        if (next !== pl) this.motions.set(p.id, (pl = next));
      }
      const m = pl ? MOTIONS[pl.motion] : undefined;
      const shown = animate(f.anim, ANIM, {
        dt,
        moved: stepped && !seat ? d : 0,
        hip: f.rig.model.joints.root.at[1],
        // Seated; on guard while a fight's motions play; else at ease.
        stance: seat ? SIT : pl ? READY : STAND,
        // Holding something: the arms carry it, or the right hand holds it up (a sword), whatever the legs do (B3b, B8a).
        hold: this.inHand.has(p.id) ? HOLDS.wield : this.inArms.has(p.id) ? HOLDS.carry : null,
        motion: m && pl ? { motion: m, t: time - pl.since } : null,
        turning,
        look: this.lookOf(p.id, f),
        manner: f.manner,
      });
      placeRoot(f.rig, shown.root, f.yaw);
      f.rig.pose(shown.pose);
      f.rig.setShells(Math.min(2, w.settings.shells));
    }
  }
}

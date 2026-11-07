import * as THREE from 'three';
import { FACETS, PERSON_KINDS } from '../../content/people';
import { THINGS } from '../../content/things';
import { LIBRARY } from '../../content/skillweb';
import { LEADS } from '../../content/leads';
import { personName } from '../../content/people/naming';
import type { Visitor } from '../../core/skillweb';
import { type Doer, type Spot, thingName } from '../../core/world3d/actions';
import { returnedRegard, worthOf } from '../../core/world3d/carry';
import { answerFor, giveLeave, hasLeave, moodsFromScale, regardOf, shiftRegard, talkOntoScale } from '../../core/world3d/standing';
import { LOAN_HOURS, type TalkCase, type TalkPerson, type TalkResult, talk } from '../../core/world3d/talk';
import type { SpikeWorld } from './index';

/**
 * Talking in 3D (plan B3d, `core/world3d/talk.ts`): the map's people as the talk rules see them, their portrait close
 * up, and a try on someone (kept in what they remember of the hero: the world's `talkMemory`, saved).
 */

export class Talking {
  /** Who the hero is talking to: they stop and face the hero until the talk ends. */
  talkingWith: string | null = null;

  constructor(private readonly w: SpikeWorld) {}

  /** Where someone of the map stands, and their storey and house, as a spot; null if no one is called that. */
  personSpot(id: string): Spot | null {
    const c = this.w.cast.find((x) => x.who.id === id);
    if (!c) return null;
    const a = c.mind.actor;
    return { x: a.x, z: a.z, level: a.level, house: a.house };
  }

  /** Someone of the map as the talk rules see them: their name, people and facets. */
  talkPerson(id: string): TalkPerson | null {
    const c = this.w.cast.find((x) => x.who.id === id);
    if (!c) return null;
    const r = PERSON_KINDS.resolve(c.who);
    // Their work: the calling they carry (its name), and what their kinds say about it.
    const calling = r.facets.station && r.facets.station !== 'station' ? FACETS[r.facets.station]?.label : undefined;
    const about = r.chain.map((k) => PERSON_KINDS.def(k)?.about).filter(Boolean).pop();
    const ask = c.who.home ? this.w.owners.houseWelcome(c.who.home)?.ask : undefined;
    return {
      id, name: personName(r.chain, `${id}:${c.who.seed ?? 0}`), kind: r.facets.people ?? 'human', tags: r.chain,
      ...(calling ? { work: { calling, ...(about ? { about } : {}) } } : {}),
      ...(c.who.home ? { home: c.who.home } : {}),
      ...(c.who.fights ? { fights: c.who.fights } : {}),
      ...(ask ? { leaveAsk: ask } : {}),
    };
  }

  /** A person's name (one of the map's people), or null. */
  personNamed(id: string): string | null {
    return this.talkPerson(id)?.name ?? null;
  }

  /**
   * A close-up of someone's head and shoulders, from in front of their face, rendered from the world as it is (their
   * own body, lit where they stand): `px` square, as sRGB pixels, rows top first. Null if they aren't standing here.
   */
  portrait(renderer: THREE.WebGLRenderer, id: string, px: number): Uint8ClampedArray | null {
    const w = this.w;
    const c = w.cast.find((x) => x.who.id === id);
    if (!c) return null;
    const f = c.fig;
    // Aim between the shoulders and the crown, from the body's own joints (not what it holds: a spear held upright
    // reaches far above the head); from the way the body really faces.
    f.place.updateMatrixWorld(true);
    const J = f.rig.model.joints, H = f.rig.model.height;
    const shoulders = J.root.at[1] + J.spine.at[1] + J.neck.at[1];
    const at = f.place.getWorldPosition(new THREE.Vector3());
    const headH = Math.max(0.15, (H - shoulders) * 0.8);
    const aim = new THREE.Vector3(at.x, at.y + shoulders + (H - shoulders) * 0.4, at.z);
    const q = f.rig.group.getWorldQuaternion(new THREE.Quaternion());
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(q).setY(0).normalize();
    const side = new THREE.Vector3(fwd.z, 0, -fwd.x);
    // Head and shoulders fill the frame; a little to one side and above, so the face reads as a face.
    const fov = 26, dist = (headH * 1.6) / Math.tan((fov * Math.PI) / 360);
    const cam = new THREE.PerspectiveCamera(fov, 1, 0.05, 40);
    cam.position.copy(aim).addScaledVector(fwd, dist).addScaledVector(side, dist * 0.18).add(new THREE.Vector3(0, dist * 0.12, 0));
    cam.lookAt(aim);
    const rt = new THREE.WebGLRenderTarget(px, px, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    // (The hero stands where the camera looks from: out of the shot.)
    const was = f.place.visible, heroWas = w.heroFig.place.visible;
    f.place.visible = true;
    w.heroFig.place.visible = false;
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(rt);
    renderer.render(w.scene, cam);
    const buf = new Uint8Array(px * px * 4);
    renderer.readRenderTargetPixels(rt, 0, 0, px, px, buf);
    renderer.setRenderTarget(prev);
    f.place.visible = was;
    w.heroFig.place.visible = heroWas;
    rt.dispose();
    // Linear light to sRGB, and the rows the right way up.
    const out = new Uint8ClampedArray(px * px * 4);
    const toS = (v: number): number => {
      const l = v / 255;
      return 255 * (l <= 0.0031308 ? l * 12.92 : 1.055 * l ** (1 / 2.4) - 0.055);
    };
    for (let y = 0; y < px; y++) {
      for (let x = 0; x < px; x++) {
        const i = ((px - 1 - y) * px + x) * 4, o = (y * px + x) * 4;
        out[o] = toS(buf[i]);
        out[o + 1] = toS(buf[i + 1]);
        out[o + 2] = toS(buf[i + 2]);
        out[o + 3] = 255;
      }
    }
    return out;
  }

  /** Try something on someone, as the hero (their sheet is the page's): through the talk rules, kept in their memory. */
  talkTo(offer: string, id: string, doer: Doer, hero: Visitor): TalkResult {
    const w = this.w, owners = w.owners;
    const p = this.talkPerson(id);
    if (!p) return { done: false, reason: 'No one is there.', hidden: false, success: false, lines: [] };
    const c = this.talkCase(hero, id);
    const before = c.memory.social[id]?.mood ?? 0;
    const r = talk(offer, p, doer, c, w.actRng);
    // What it did to their mood goes onto their scale (scaled by the roll's advantages), and leave given is kept.
    talkOntoScale(w.standing, id, before, c.memory.social[id]?.mood ?? 0, r.roll?.advantages ?? 0);
    if (r.leave) giveLeave(w.standing, r.leave, w.worldHours);
    // The ways to take through talk (B3b): lent until tomorrow, given back, given to keep; a failed threat answered.
    const l = (r.borrow ?? r.giveBack ?? r.given) ? w.carry.loose[(r.borrow ?? r.giveBack ?? r.given)!] : null;
    if (l && r.borrow) l.loan = w.worldHours + LOAN_HOURS;
    if (l && r.given) {
      l.mine = true;
      delete l.loan;
    }
    if (l && r.giveBack) {
      shiftRegard(w.standing, id, returnedRegard(regardOf(w.standing, id), l.loan !== undefined));
      w.carrying.sendHome(r.giveBack);
    }
    const card = r.answer ? w.cast.find((x) => x.who.id === id) : null;
    const step = card ? answerFor(regardOf(w.standing, id), w.culture, owners.whoToThem(card)) : null;
    const says = card && step ? owners.startAnswer(card, step) : null;
    if (says) r.lines.push({ text: `${p.name}: "${says}"`, tone: 'bad' });
    if (r.done) w.acting.remember({ who: doer.id, offer, target: id, skill: r.skill ?? null, success: r.success });
    return r;
  }

  /** What a talk is about: the hero, the world's flags, the memory, the library, the hero's leads. */
  talkCase(hero: Visitor, person?: string): TalkCase {
    const w = this.w;
    // (The talk rules read each person's mood: a band of the view they hold, B3c.)
    moodsFromScale(w.talkMemory.social, w.standing);
    // What the hero holds, if it is a household's and not given to them (B3b); and whether this person fears them.
    const id = w.carry.held, l = id ? w.carry.loose[id] : null, kind = l ? THINGS.get(l.kind) : null;
    const holding = id && l && kind && l.home.house && !l.mine
      ? { id, name: thingName(kind), house: l.home.house, loan: l.loan ?? null, worth: worthOf('take', kind.value ?? 0, kind.importance ?? 0, w.owners.houseWealth(l.home.house), w.culture) }
      : undefined;
    const card = person ? w.cast.find((c) => c.who.id === person) : null;
    const who = card ? w.owners.whoToThem(card) : null;
    return {
      hero, flags: w.flags, memory: w.talkMemory, library: LIBRARY, leads: { state: w.leads, defs: LEADS, hours: w.worldHours },
      hasLeave: (house) => hasLeave(w.standing, house, w.worldHours),
      ...(holding ? { holding } : {}),
      ...(who ? { nerve: { afraid: who.afraid, bold: who.bold } } : {}),
    };
  }
}

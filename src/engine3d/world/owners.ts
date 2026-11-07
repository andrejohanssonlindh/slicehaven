import { THINGS } from '../../content/things';
import { PERSON_KINDS } from '../../content/people';
import { LIBRARY } from '../../content/skillweb';
import { temperOf } from '../../content/people/temper';
import { roomKindOf } from '../../content/furnish';
import { disposition } from '../../core/skillweb';
import type { Spot } from '../../core/world3d/actions';
import type { Answers } from '../../core/world3d/behave';
import { wealthOf } from '../../core/world3d/carry';
import { houseToLocal } from '../../core/world3d/layout';
import {
  type AnswerStep, type HeroLook, type Welcome, type WhoToThem, type Wrong, answerFor, hasLeave, mayDo, meet, regardOf, shiftRegard, sizeUp, weightOf, withinHours,
} from '../../core/world3d/standing';
import { type CastCard, MIND_REACH } from './types';
import type { SpikeWorld } from './index';

/**
 * Owners, the scale and consequences (plan B3c, `core/world3d/standing.ts`): whose a room or thing is, what each of the
 * map's people thinks of the hero (the world's `standing`, saved), wrongs seen and answered as the place's culture
 * says, trespass, fetching help, and word spreading when people meet.
 */

/** How close two people stand to talk of the hero, metres (plan B3c). */
const MEET_DIST = 2.5;

export class Owners {
  /** How the hero looks to people (physique, fearsome marks, weapons shown) and their rank: the page sets it from the sheet. */
  heroLook: HeroLook = { physique: 10, marks: 0, weapons: 0, tags: [] };
  /** Told when the hero steps into another room or out of doors (for the page to say whose it is). */
  onEnterPlace: ((at: Spot) => void) | null = null;
  /** The room the hero is in now (house/storey/room), and who has already seen them there while they weren't welcome. */
  private placeKey: string | null = null;
  private readonly sawTrespass = new Set<string>();
  /** When two people last talked of the hero (world hours), by the pair: word passes once an hour at most. */
  private readonly metAt = new Map<string, number>();

  constructor(private readonly w: SpikeWorld) {}

  /** The room at a spot in a house: its number in the house, and its kind (the inn's taproom, a guest room); null outdoors. */
  roomAt(at: Spot): { n: number; kind: string } | null {
    const idx = this.w.houseIndex;
    const place = at.house ? idx.byId(at.house) : null;
    if (!place) return null;
    const rooms = idx.entry(place).room;
    const p = houseToLocal(place, at.x, at.z);
    let best: { n: number; d: number } | null = null;
    rooms.forEach((r, n) => {
      if (r.level !== at.level) return;
      const q = r.room.rect;
      // (Outside every rect, on a wall or a stair: the nearest room.)
      const d = Math.hypot(Math.max(q.x0 - p.x, 0, p.x - q.x1), Math.max(q.z0 - p.z, 0, p.z - q.z1));
      if (!best || d < best.d) best = { n, d };
    });
    if (!best) return null;
    const n = (best as { n: number }).n;
    return { n, kind: roomKindOf(rooms[n].room.role, place.room ?? 'home', place.spec.plan) };
  }

  /** What the room at a spot welcomes without asking (its kind says: an inn's taproom, sit down, 6 to 24; its guest rooms nothing). */
  welcomeAt(at: Spot): Welcome | null {
    const r = this.roomAt(at);
    return r && THINGS.has(r.kind) ? THINGS.get(r.kind).welcome ?? null : null;
  }

  /** What a house's main room welcomes (how leave is asked there: a room for the night at the inn). */
  houseWelcome(house: string): Welcome | null {
    const room = this.w.layout.houses.find((h) => h.id === house)?.room ?? 'home';
    return THINGS.has(room) ? THINGS.get(room).welcome ?? null : null;
  }

  /** How well off a household is, from its people's facets (rich, poor). */
  houseWealth(house: string) {
    return wealthOf(this.w.cast.filter((c) => c.who.home === house).flatMap((c) => this.w.talking.talkPerson(c.who.id)?.tags ?? []));
  }

  /** Who the hero is to one of the map's people: how their people see yours, rank, whether they're afraid or bold. */
  whoToThem(c: CastCard): WhoToThem {
    const w = this.w, p = w.talking.talkPerson(c.who.id);
    const relation = p ? disposition({ kind: p.kind, tags: p.tags }, w.heroWho, LIBRARY).v : 0;
    return sizeUp(this.heroLook, { physique: c.who.sheet?.attrs.Kroppsbyggnad ?? 10, temper: temperOf(p?.tags ?? []) }, relation, w.culture);
  }

  /** Who the hero is to someone (for tests and the debug hook). */
  whoTo(id: string): WhoToThem | null {
    const c = this.w.cast.find((x) => x.who.id === id);
    return c ? this.whoToThem(c) : null;
  }

  /**
   * Whose a spot is, for the page to say (plan B3c): the town's, or a house's (its household by name, the kind of room,
   * whether it is open to anyone now, whether the hero has leave); null in the wild.
   */
  whoseAt(at: Spot): { town: true } | { house: string; members: string[]; room: string | null; open: [number, number] | null; leave: boolean } | null {
    const w = this.w;
    if (!at.house) return w.acting.world.view.housesNear(at.x, at.z, 20) >= 3 ? { town: true } : null;
    const welcome = this.welcomeAt(at);
    return {
      house: at.house,
      members: w.cast.filter((c) => c.who.home === at.house).map((c) => w.talking.talkPerson(c.who.id)?.name ?? c.who.id),
      room: this.roomAt(at)?.kind ?? null,
      open: welcome && welcome.acts.includes('enter') && withinHours(w.weather.hour ?? 12, welcome.hours) ? welcome.hours : null,
      leave: hasLeave(w.standing, at.house, w.worldHours),
    };
  }

  /**
   * Being where you aren't welcome is a wrong too (`enter`): whoever sees the hero in a room that isn't open to them,
   * once a visit. Stepping into another room is told to the page. Run when people look.
   */
  checkTrespass(): void {
    const w = this.w, at = w.heroSpot(), room = this.roomAt(at);
    const key = at.house && room ? `${at.house}/${at.level}/${room.n}` : null;
    if (key !== this.placeKey) {
      const was = this.placeKey;
      this.placeKey = key;
      this.sawTrespass.clear();
      // (Out of one house's door or into another: not every step round the street.)
      if (key !== null || was !== null) this.onEnterPlace?.(at);
    }
    if (!at.house || !key) return;
    if (mayDo({ owner: { house: at.house }, act: 'enter', member: false, leave: hasLeave(w.standing, at.house, w.worldHours), welcome: this.welcomeAt(at), hour: w.weather.hour ?? 12, culture: w.culture })) return;
    const seen = this.witness([{ act: 'enter', owner: { house: at.house } }], (c) => !this.sawTrespass.has(c.who.id));
    for (const s of seen) {
      this.sawTrespass.add(s.id);
      if (s.says) w.onSpeak?.(s.id, s.name, s.says);
    }
  }

  /** Someone starts answering the hero: the behaviour the culture says, for a while; the line they say, if any. */
  startAnswer(c: CastCard, step: AnswerStep): string | null {
    c.mind.answer = { id: step.id, left: step.for };
    const says = step.says ?? [];
    return says.length ? says[Math.floor(this.w.actRng.next() * says.length)] : null;
  }

  /**
   * The hero did wrong (the owner gate said so): everyone who sees the hero now thinks less of them, the owner most,
   * and answers as the culture says for where their view now stands. Returns who saw it, by how much, and what they said.
   */
  witness(wrongs: readonly Wrong[], only?: (c: CastCard) => boolean): { id: string; name: string; by: number; says: string | null }[] {
    const w = this.w, out: { id: string; name: string; by: number; says: string | null }[] = [];
    for (const c of w.cast) {
      if (!c.mind.senses.sees.includes('hero') || (only && !only(c))) continue;
      let by = 0;
      for (const wr of wrongs) by += weightOf(wr, w.culture, 'house' in wr.owner && c.who.home === wr.owner.house);
      if (by <= 0) continue;
      const now = shiftRegard(w.standing, c.who.id, -by);
      const step = answerFor(now, w.culture, this.whoToThem(c));
      const says = step ? this.startAnswer(c, step) : null;
      out.push({ id: c.who.id, name: w.talking.talkPerson(c.who.id)?.name ?? c.who.id, by: Math.round(by), says });
    }
    return out;
  }

  /** What someone thinks of the hero now (for the page on easy, tests and the debug hook). */
  regardOf(id: string): number {
    return regardOf(this.w.standing, id);
  }

  /** What each of the map's people is answering now (for tests and the debug hook). */
  get answers(): { id: string; answer: string | null }[] {
    return this.w.cast.map((c) => ({ id: c.who.id, answer: c.mind.answer?.id ?? null }));
  }

  /** Fetching help and handing it over (the `fetch` behaviour): the guard, else the nearest neighbour. */
  readonly answerHooks: Answers = {
    helperFor: (mind, calling) => {
      const me = mind.actor;
      let best: { id: string; d: number; fits: boolean } | null = null;
      for (const c of this.w.cast) {
        if (c.mind === mind) continue;
        const fits = PERSON_KINDS.resolve(c.who).chain.includes(calling);
        const d = Math.hypot(c.mind.actor.x - me.x, c.mind.actor.z - me.z);
        if (!best || (fits && !best.fits) || (fits === best.fits && d < best.d)) best = { id: c.who.id, d, fits };
      }
      return best?.id ?? null;
    },
    handOver: (mind, helper) => {
      const w = this.w;
      const c = w.cast.find((x) => x.who.id === helper);
      if (!c) return;
      // The one fetched takes the fetcher's word for it, nearly in full.
      const told = Math.round(regardOf(w.standing, mind.id) * 0.8);
      if (told < regardOf(w.standing, helper)) shiftRegard(w.standing, helper, told - regardOf(w.standing, helper));
      delete mind.answer;
      const says = this.startAnswer(c, w.culture.fetched);
      if (says) w.onSpeak?.(helper, w.talking.talkPerson(helper)?.name ?? helper, says);
    },
  };

  /** People standing together talk of the hero (once an hour a pair): word spreads, good or bad. */
  gossip(): void {
    const w = this.w;
    const near = w.cast.filter((c) => Math.hypot(c.mind.actor.x - w.hero.x, c.mind.actor.z - w.hero.z) <= MIND_REACH);
    for (let i = 0; i < near.length; i++) {
      for (let j = i + 1; j < near.length; j++) {
        const a = near[i].mind.actor, b = near[j].mind.actor;
        if (a.house !== b.house || (a.house !== null && a.level !== b.level) || Math.hypot(a.x - b.x, a.z - b.z) > MEET_DIST) continue;
        const key = `${near[i].who.id}|${near[j].who.id}`;
        if (w.worldHours - (this.metAt.get(key) ?? -Infinity) < 1) continue;
        this.metAt.set(key, w.worldHours);
        meet(w.standing, near[i].who.id, near[j].who.id);
      }
    }
  }
}

import { THINGS } from '../../content/things';
import { HERO_KIT } from '../../content/things/kit';
import { type Loose, onHero } from '../../core/world3d/carry';
import {
  type AddonDef, type Grid, type PackItem, type PackSpot, type Side, type Turn,
  SIDE, autoPack, cellsOf, findSpot, fits, freeSide, gridsOf,
} from '../../core/world3d/inventory';
import type { ActTarget } from '../../core/world3d/actions';
import type { SpikeWorld } from './index';

/**
 * The hero's pockets and pack (plan B6; rules `core/world3d/inventory.ts`, design `director/design/inventory.md`). What
 * is in them is loose things in the world's `carry` with `in` (where in which grid), the pack itself one with `worn`,
 * add-ons on its sides with `fitted`: all saved with the rest of `carry`. The page's pack sheet asks this part for the
 * grids and items and tells it what to move; the rules say whether it fits.
 */

/** The ids of the hero's kit things: `hero:kit:<kind>:<n>`. */
const KIT_ID = (kind: string, n: number): string => `hero:kit:${kind}:${n}`;

export class Pack {
  constructor(private readonly w: SpikeWorld) {}

  private get carry() {
    return this.w.carry;
  }

  /** The pack the hero wears (its id and loose record), or null. */
  get worn(): { id: string; l: Loose } | null {
    for (const [id, l] of Object.entries(this.carry.loose)) if (l.worn) return { id, l };
    return null;
  }

  /** The add-on fitted on each side of the worn pack, by side: its id and kind. */
  get fitted(): Partial<Record<Side, { id: string; kind: string }>> {
    const out: Partial<Record<Side, { id: string; kind: string }>> = {};
    for (const [id, l] of Object.entries(this.carry.loose)) if (l.fitted) out[l.fitted] = { id, kind: l.kind };
    return out;
  }

  /** The hero's grids now: pockets, the pack, add-ons fitted on its sides. */
  get grids(): Grid[] {
    const worn = this.worn, bag = worn ? THINGS.get(worn.l.kind).bag ?? null : null;
    const addons: Partial<Record<Side, AddonDef>> = {};
    for (const [side, f] of Object.entries(this.fitted) as [Side, { kind: string }][]) {
      const a = THINGS.get(f.kind).addon;
      if (a) addons[side] = a;
    }
    return gridsOf(HERO_KIT.pockets, bag, addons);
  }

  /** What lies in the hero's grids, as the rules see it (id, cells, size, where). */
  get items(): PackItem[] {
    const out: PackItem[] = [];
    for (const [id, l] of Object.entries(this.carry.loose)) {
      if (!l.in || !THINGS.has(l.kind)) continue;
      const def = THINGS.get(l.kind), cells = cellsOf(def.shape, def.size);
      if (cells) out.push({ id, cells, size: def.size!, at: l.in });
    }
    return out;
  }

  /** An item as the rules see it, by kind (for one not in the pack yet). */
  private itemOf(id: string, kind: string): PackItem | null {
    const def = THINGS.has(kind) ? THINGS.get(kind) : null;
    const cells = def ? cellsOf(def.shape, def.size) : null;
    return def && cells ? { id, cells, size: def.size! } : null;
  }

  /** Where a thing of this kind would go now, or null (no room, or too big). */
  spotFor(kind: string, id = '?'): PackSpot | null {
    const it = this.itemOf(id, kind);
    return it ? findSpot(this.grids, this.items, it) : null;
  }

  /** Is there room for a thing of this kind in the hero's pockets or pack now? */
  hasRoom(kind: string): boolean {
    return this.spotFor(kind) !== null;
  }

  /** Everything the hero carries, in kg: held, stowed, packed, the pack and its add-ons. */
  get carriedKg(): number {
    let kg = 0;
    for (const l of Object.values(this.carry.loose)) if (onHero(l) && THINGS.has(l.kind)) kg += THINGS.get(l.kind).weight ?? 0;
    return Math.round(kg * 100) / 100;
  }

  /**
   * The hero's kit (`content/things/kit.ts`): the pack on their back and what is in it, given with their gear
   * (`Gear.outfit`). What was the last hero's kit goes; things they put in the pack from the world stay, where they lie.
   */
  kitUp(): void {
    const carry = this.carry;
    for (const id of Object.keys(carry.loose)) if (id.startsWith('hero:kit:') && onHero(carry.loose[id])) delete carry.loose[id];
    if (carry.held && !carry.loose[carry.held]) carry.held = null;
    if (carry.left && !carry.loose[carry.left]) carry.left = null;
    if (!THINGS.has(HERO_KIT.pack)) return;
    const home = { x: this.w.hero.x, z: this.w.hero.z, level: 0, house: null, rot: 0, room: null };
    carry.loose[KIT_ID(HERO_KIT.pack, 0)] = { kind: HERO_KIT.pack, seed: 1, home, at: null, mine: true, worn: true };
    HERO_KIT.items.forEach((kind, n) => {
      const id = KIT_ID(kind, n), at = this.spotFor(kind, id);
      if (at) carry.loose[id] = { kind, seed: n + 1, home, at: null, mine: true, in: at };
    });
    // (Anything from the world left in a pocket or side that is gone now is laid in again where it fits.)
    for (const it of this.items) if (!this.grids.some((g) => g.id === it.at!.grid)) this.relay(it.id);
  }

  /** Lay a packed thing again where it first fits; if nowhere, it is put down. */
  private relay(id: string): void {
    const l = this.carry.loose[id];
    if (!l) return;
    delete l.in;
    const at = this.spotFor(l.kind, id);
    if (at) l.in = at;
    else this.w.carrying.layDown(id);
  }

  /** Put a thing from the world straight into the pack (the verb `pack`). */
  stash(t: ActTarget): boolean {
    const at = this.spotFor(t.kind, t.id);
    if (!at) return false;
    const l = this.w.carrying.takeFromWorld(t);
    if (!l) return false;
    l.in = at;
    return true;
  }

  /** Put what the hero holds (the right hand first) into the pack, where it first fits. */
  stashHeld(id = this.carry.held ?? this.carry.left ?? ''): boolean {
    const carry = this.carry, l = carry.loose[id];
    const at = l ? this.spotFor(l.kind, id) : null;
    if (!l || !at) return false;
    l.in = at;
    if (carry.held === id) {
      carry.held = null;
      carry.hidden = false;
    } else if (carry.left === id) carry.left = null;
    this.w.carrying.nowHolding();
    this.w.gear.showHeld();
    return true;
  }

  /** Move a packed thing to a spot (any grid, any turn) if it fits there. */
  move(id: string, at: PackSpot): boolean {
    const l = this.carry.loose[id], it = l?.in ? this.itemOf(id, l.kind) : null;
    if (!l || !it || !fits(this.grids, this.items, it, at)) return false;
    l.in = at;
    return true;
  }

  /** Turn a packed thing a quarter clockwise where it lies (or further, the first turn that fits). */
  turn(id: string): boolean {
    const l = this.carry.loose[id];
    if (!l?.in) return false;
    for (let k = 1; k < 4; k++) if (this.move(id, { ...l.in, turn: ((l.in.turn + k) % 4) as Turn })) return true;
    return false;
  }

  /** Lay everything in the pockets and pack again, biggest first (the auto-pack button). False if it can't all fit. */
  autoPack(): boolean {
    const spots = autoPack(this.grids, this.items);
    if (!spots) return false;
    for (const [id, at] of Object.entries(spots)) this.carry.loose[id].in = at;
    return true;
  }

  /** Take a packed thing out into the hero's hand (one must be free for it). */
  takeOut(id: string): boolean {
    const l = this.carry.loose[id], gear = this.w.gear;
    const hand = l?.in ? gear.handFor(l.kind) : null;
    if (!l || !hand) return false;
    delete l.in;
    gear.intoHand(id, hand);
    this.w.carrying.nowHolding();
    gear.showHeld();
    return true;
  }

  /** Put a packed thing down on the ground in front of the hero. */
  drop(id: string): boolean {
    return !!this.carry.loose[id]?.in && this.w.carrying.layDown(id);
  }

  /** Fit a packed add-on on a free side of the pack (the given one, or the first free). */
  fit(id: string, side?: Side): boolean {
    const l = this.carry.loose[id], worn = this.worn;
    if (!l?.in || !THINGS.get(l.kind).addon || !worn) return false;
    const bag = THINGS.get(worn.l.kind).bag ?? null, fitted = this.fitted;
    const s = side ?? freeSide(bag, fitted);
    if (!s || fitted[s] || !bag || !(['left', 'right'] as const).slice(0, bag.sides).includes(s)) return false;
    delete l.in;
    l.fitted = s;
    return true;
  }

  /** Take an add-on off its side (it must be empty) and put it in the pack where it fits. */
  unfit(side: Side): boolean {
    const f = this.fitted[side];
    if (!f || this.items.some((it) => it.at?.grid === SIDE(side))) return false;
    const l = this.carry.loose[f.id];
    delete l.fitted;
    const at = this.spotFor(l.kind, f.id);
    if (at) l.in = at;
    else this.w.carrying.layDown(f.id);
    return true;
  }
}

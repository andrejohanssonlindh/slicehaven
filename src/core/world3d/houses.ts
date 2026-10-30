import { CHUNK, chunkKey } from './chunks';
import type { FSource } from './filaments3d';
import { type BuiltHouse, type PlacedHouse, buildHouses, houseBox, houseOuterBox } from './layout';
import { type Shape, shapeDist } from './space';
import type { Things } from './things';

/**
 * The houses of a map, by chunk, so a city of any size is asked only about the streets that are looked at. The
 * list of places is light (a spot, a turn and a spec); a house's model, furnished room, walls and fires are worked
 * out the first time something near it asks (the renderer when its chunk streams in, walking and the filament field
 * when they come close) and kept. The renderer stands a house up when its chunk is resident and takes it down when
 * the chunk leaves. See `director/design/world3d-scale.md`.
 *
 * What is made for a house beyond its model (the room, with its art) is the owner's business: `make` is given the
 * built house and returns that, plus what blocks feet and what the room gives off to the filaments.
 */

export interface HouseMade<R> {
  room: R;
  /** What blocks feet: the walls and the furniture, in the world. */
  shapes: Shape[];
  /** What the room and its things give off (fires, books, pictures), in the world. */
  sources: FSource[];
}

/** What is known of a house without furnishing it: its model and its boxes. */
export interface HouseLite {
  built: BuiltHouse;
  /** The whole house with its porch (for "indoors" and shelter), and the room's box (for "is someone inside"). */
  outer: Shape;
  box: Shape;
}

export interface HouseEntry<R> extends HouseMade<R>, HouseLite {}

/** No house reaches farther than this from its centre (the largest, with roof and porch, is about 7 m). */
const REACH = 12;

export class HouseIndex<R> {
  private readonly byChunk = new Map<string, PlacedHouse[]>();
  private readonly ids = new Map<string, PlacedHouse>();
  private readonly entries = new Map<PlacedHouse, HouseEntry<R>>();
  private readonly lites = new Map<PlacedHouse, HouseLite>();

  constructor(readonly places: readonly PlacedHouse[], private readonly make: (b: BuiltHouse) => HouseMade<R>, private readonly things: Things) {
    for (const h of places) {
      this.ids.set(h.id, h);
      const k = chunkKey(Math.floor(h.x / CHUNK), Math.floor(h.z / CHUNK));
      const list = this.byChunk.get(k);
      if (list) list.push(h);
      else this.byChunk.set(k, [h]);
    }
  }

  /** The houses whose centre is in chunk (i, j). */
  inChunk(i: number, j: number): readonly PlacedHouse[] {
    return this.byChunk.get(chunkKey(i, j)) ?? [];
  }

  /** The place of the house with this id (ids are unique in a map: `compileMap` reports it if not). */
  byId(id: string): PlacedHouse | undefined {
    return this.ids.get(id);
  }

  /** A house's model and boxes (cheap: nothing is furnished). */
  lite(place: PlacedHouse): HouseLite {
    let l = this.lites.get(place);
    if (!l) {
      const built = buildHouses({ houses: [place] }, this.things)[0];
      this.lites.set(place, (l = { built, outer: houseOuterBox(built), box: houseBox(built) }));
    }
    return l;
  }

  /** A house, furnished if it has not been yet. */
  entry(place: PlacedHouse): HouseEntry<R> {
    let e = this.entries.get(place);
    if (!e) {
      const l = this.lite(place);
      this.entries.set(place, (e = { ...this.make(l.built), ...l }));
    }
    return e;
  }

  /** The places whose chunk is near a rectangle (the houses that may touch it). */
  private placesNear(x0: number, z0: number, x1: number, z1: number): PlacedHouse[] {
    const out: PlacedHouse[] = [];
    for (let j = Math.floor((z0 - REACH) / CHUNK); j <= Math.floor((z1 + REACH) / CHUNK); j++) {
      for (let i = Math.floor((x0 - REACH) / CHUNK); i <= Math.floor((x1 + REACH) / CHUNK); i++) {
        for (const h of this.inChunk(i, j)) if (h.x > x0 - REACH && h.x < x1 + REACH && h.z > z0 - REACH && h.z < z1 + REACH) out.push(h);
      }
    }
    return out;
  }

  /** The houses that may touch a rectangle, made. */
  near(x0: number, z0: number, x1: number, z1: number): HouseEntry<R>[] {
    return this.placesNear(x0, z0, x1, z1).map((p) => this.entry(p));
  }

  /** What blocks feet near a rectangle. */
  shapesNear(x0: number, z0: number, x1: number, z1: number): Shape[] {
    return this.near(x0, z0, x1, z1).flatMap((e) => e.shapes);
  }

  /** The houses that may touch a rectangle, not furnished (for sight, shelter and "indoors"). */
  liteNear(x0: number, z0: number, x1: number, z1: number): HouseLite[] {
    return this.placesNear(x0, z0, x1, z1).map((p) => this.lite(p));
  }

  /** The whole-house boxes within `r` metres of a point. */
  outerBoxesNear(x: number, z: number, r: number): Shape[] {
    return this.liteNear(x - r, z - r, x + r, z + r).map((e) => e.outer);
  }

  /** Is (x, z) inside a house's walls? The house, or null. */
  houseContaining(x: number, z: number, slack = 0): HouseLite | null {
    for (const e of this.liteNear(x, z, x, z)) if (shapeDist(e.box, x, z) < slack) return e;
    return null;
  }

  /** The fires, books and so on that stand in a rectangle. */
  sourcesIn(x0: number, z0: number, x1: number, z1: number): FSource[] {
    return this.near(x0, z0, x1, z1).flatMap((e) => e.sources.filter((s) => s.x >= x0 && s.x < x1 && s.z >= z0 && s.z < z1));
  }

  /**
   * Let go of the furnished rooms (their plans, walls and sources) and the models of houses `keep` says no to; they
   * are made again, the same, if asked for. Returns how many furnished rooms went.
   */
  forget(keep: (place: PlacedHouse) => boolean): number {
    let n = 0;
    for (const place of [...this.entries.keys()]) {
      if (keep(place)) continue;
      this.entries.delete(place);
      n++;
    }
    for (const place of [...this.lites.keys()]) if (!keep(place)) this.lites.delete(place);
    return n;
  }

  /** Houses furnished now (a measure of how much of the city is being held). */
  get made(): number {
    return this.entries.size;
  }

  /** Houses whose model is held now. */
  get modelled(): number {
    return this.lites.size;
  }
}

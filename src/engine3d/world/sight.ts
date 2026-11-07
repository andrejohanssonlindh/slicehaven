import * as THREE from 'three';
import { THINGS } from '../../content/things';
import type { Actor } from '../../core/world3d/actors';
import { CHUNK } from '../../core/world3d/chunks';
import { houseWalls, sightWalls } from '../../core/world3d/layout';
import type { Shape } from '../../core/world3d/space';
import { RAYS, type SightLight, angleGap, castSight, lightReach, litSeenAt, seenAt, visibleLights } from '../../core/world3d/vision';
import { EXPLORED_WINDOW, WORLD, exploredTexture, sightTexture } from '../materials';
import type { SpikeWorld } from './index';

/**
 * The hero's sight (plan B5, `core/world3d/vision.ts`): rays cast from their eye past trunks and walls, flames made out
 * from far off in the dark, and the ground they have seen remembered (the world's `explored`, saved). Sight is the
 * hero's, not the camera's: a cone ahead, a circle round, the dark shortening it. The world's `vision` sets how far
 * anything is drawn at all (off: everything).
 */

export class Sight {
  readonly rays = new Float32Array(RAYS);
  /** Torches and fires that can be made out from far away (see `refreshLights`), and how far that is now. */
  sightLights: SightLight[] = [];
  lightRange = 0;
  private lightCands: { x: number; z: number; radius: number }[] = [];
  private lightsAt: { x: number; z: number; f: number; night: number; at: number } | null = null;
  private lightsSeen = new Set<string>();
  private castAt: { x: number; z: number; range: number; house: string | null; level: number } | null = null;
  private markedAt: { x: number; z: number; f: number; t: number } | null = null;
  private exploredWin = { ox: 0, oz: 0, dirty: true };

  constructor(private readonly w: SpikeWorld) {}

  /** Forget everything seen (for testing). */
  forgetMap(): void {
    this.w.explored.clear();
    this.markedAt = null;
    this.lightsSeen.clear();
    this.exploredWin.dirty = true;
  }

  /** The rays are cast again next frame (the sight roll changed). */
  recast(): void {
    this.castAt = null;
  }

  /** What was seen has changed by hand (a loaded game): the window the shader reads is filled again. */
  refill(): void {
    this.exploredWin.dirty = true;
  }

  /** Is chunk (i, j) worth having: seen before, or inside the hero's sight now? (With vision off, always.) */
  worthLoading(i: number, j: number): boolean {
    const w = this.w;
    if (w.vision.outer <= 0 || w.explored.chunkSeen(i, j)) return true;
    const h = w.hero;
    const dx = Math.max(i * CHUNK - h.x, 0, h.x - (i + 1) * CHUNK), dz = Math.max(j * CHUNK - h.z, 0, h.z - (j + 1) * CHUNK);
    if (Math.hypot(dx, dz) <= w.vision.outer + 6) return true;
    // The ground round a flame that is in view is drawn, so it must be built.
    for (const l of this.sightLights) {
      const lx = Math.max(i * CHUNK - l.x, 0, l.x - (i + 1) * CHUNK), lz = Math.max(j * CHUNK - l.z, 0, l.z - (j + 1) * CHUNK);
      if (Math.hypot(lx, lz) <= l.radius + 2) return true;
    }
    return false;
  }

  /** What stops the eye near someone (the hero unless said): trunks and boulders, other houses whole, and the walls of the house they stand in. */
  blockers(range: number, h: Actor = this.w.hero): Shape[] {
    const w = this.w;
    const out: Shape[] = [...w.placed.sightNear(h.x - range, h.z - range, h.x + range, h.z + range)];
    // (Asked of the index, not of the standing houses: sight reaches past what has been stood up.)
    for (const l of w.houseIndex.liteNear(h.x - range, h.z - range, h.x + range, h.z + range)) out.push(...(l.built.place.id === h.house ? [...houseWalls(l.built, h.level === 0), ...sightWalls(l.built, h.level)] : [l.box]));
    return out;
  }

  /** Cast the rays again if the eye moved, the range changed or the hero stepped through a door. */
  private castRays(): void {
    const w = this.w, h = w.hero, range = w.spec.range;
    const c = this.castAt;
    if (c && c.range === range && c.house === h.house && c.level === h.level && Math.hypot(h.x - c.x, h.z - c.z) < 0.02) return;
    castSight({ x: h.x, z: h.z }, range, this.blockers(range), this.rays, 0.7);
    this.castAt = { x: h.x, z: h.z, range, house: h.house, level: h.level };
    const data = sightTexture.image.data as Uint16Array;
    for (let i = 0; i < RAYS; i++) data[i] = THREE.DataUtils.toHalfFloat(Math.min(1, this.rays[i] / range));
    sightTexture.needsUpdate = true;
    this.markedAt = null; // what is seen has changed
  }

  /** How clearly the hero sees a point on the ground, 0..1 (with vision off, fully). */
  seen(x: number, z: number): number {
    const w = this.w;
    if (w.vision.outer <= 0) return 1;
    return Math.max(seenAt(w.hero, w.facing, w.spec, this.rays, x, z), litSeenAt(this.sightLights, x, z));
  }

  /**
   * The torches and fires in view: asked for from the chunks within reach (rarely: when the hero has gone a few
   * metres or the light has changed), then checked against the cone and the solid things whenever the hero has
   * moved or turned. The patches they light are drawn and remembered however far away they are.
   */
  private refreshLights(night: number): void {
    const w = this.w, h = w.hero, c = this.lightsAt, time = w.time;
    const moved = !c || Math.hypot(h.x - c.x, h.z - c.z) >= 0.4 || angleGap(w.facing, c.f) > 0.12 || Math.abs(night - c.night) > 0.05;
    if (!moved && time - c.at < 1) return;
    const reach = Math.min(lightReach(w.spec, night), 110);
    this.lightRange = reach;
    const dayK = 0.25 + 0.75 * night; // by day a flame lights little
    const spots = this.lightCands;
    if (!c || Math.hypot(h.x - c.x, h.z - c.z) >= 3 || time - c.at >= 1) {
      spots.length = 0;
      for (let j = Math.floor((h.z - reach) / CHUNK); j <= Math.floor((h.z + reach) / CHUNK); j++) {
        for (let i = Math.floor((h.x - reach) / CHUNK); i <= Math.floor((h.x + reach) / CHUNK); i++) {
          for (const p of w.placed.chunk(i, j).props) if (THINGS.get(p.kind).flame) spots.push({ x: p.x, z: p.z, radius: 6.5 * dayK });
        }
      }
      for (const hs of w.houses) if (hs.hearthAt) spots.push({ x: hs.hearthAt.x, z: hs.hearthAt.z, radius: 6.5 * dayK });
      for (const k of w.lights.camps) spots.push({ x: k.p.x, z: k.p.z, radius: 9 * dayK });
    }
    const blockers = this.blockers(reach);
    this.sightLights = visibleLights(h, w.facing, w.spec, night, spots, blockers, 6);
    // What was seen by flame light is remembered like anything else seen.
    for (const l of this.sightLights) {
      const key = `${Math.round(l.x)},${Math.round(l.z)}`;
      if (this.lightsSeen.has(key)) continue;
      this.lightsSeen.add(key);
      if (w.explored.markWhere(l.x, l.z, l.radius * 0.8, () => true) > 0) this.exploredWin.dirty = true;
    }
    const slots = WORLD.uLights.value;
    slots.forEach((s, i) => {
      const l = this.sightLights[i];
      if (l) s.set(l.x, l.z, l.radius, l.strength);
      else s.set(0, 0, 0, 0);
    });
    this.lightsAt = { x: h.x, z: h.z, f: w.facing, night, at: time };
  }

  /** Record what the hero can see, and keep the window the shader reads centred on the view. */
  private stepExplored(): void {
    const w = this.w;
    if (w.vision.outer <= 0) return;
    const h = w.hero, m = this.markedAt, time = w.time;
    const turned = m ? angleGap(w.facing, m.f) : 1;
    if (!m || Math.hypot(h.x - m.x, h.z - m.z) >= 2 || (turned > 0.25 && time - m.t > 0.15)) {
      // The cells the eye reaches (their centres in the cone or close by, and in the clear) are remembered.
      if (w.explored.markWhere(h.x, h.z, w.spec.range * 0.95, (x, z) => this.seen(x, z) > 0.5) > 0) this.exploredWin.dirty = true;
      this.markedAt = { x: h.x, z: h.z, f: w.facing, t: time };
    }
    const half = EXPLORED_WINDOW / 2, win = this.exploredWin;
    const cx = Math.floor(w.focus.x), cz = Math.floor(w.focus.z);
    if (win.dirty || Math.abs(cx - (win.ox + half)) > 24 || Math.abs(cz - (win.oz + half)) > 24) {
      win.ox = Math.floor((cx - half) / 8) * 8;
      win.oz = Math.floor((cz - half) / 8) * 8;
      w.explored.fill(exploredTexture.image.data as Uint8Array, EXPLORED_WINDOW, win.ox, win.oz);
      exploredTexture.needsUpdate = true;
      WORLD.uExploredBox.value.set(win.ox, win.oz, EXPLORED_WINDOW, 0);
      win.dirty = false;
    }
  }

  /** With vision on, each frame: the rays, the flames in view, what is remembered; the shader told the sight's shape. */
  step(night: number): void {
    const w = this.w;
    this.castRays();
    this.refreshLights(night);
    const sp = w.spec;
    WORLD.uVision.value.set(w.hero.x, w.hero.z, sp.range * 0.55, sp.range);
    WORLD.uSight.value.set(w.facing, sp.fov / 2, sp.edge, sp.near);
    WORLD.uSightBack.value = sp.back;
    this.stepExplored();
  }
}

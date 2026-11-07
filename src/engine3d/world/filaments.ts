import type { AspectId, HexFilaments } from '../../core/filaments';
import type { FSource } from '../../core/world3d/filaments3d';
import { makeHeat } from '../heat';
import type { LoadedChunk } from './types';
import type { SpikeWorld } from './index';

/**
 * The filament field as the world feeds and shows it (magic: `core/world3d/filaments3d.ts`): what the weather and the
 * living are doing, the sources that aren't placed things (campfires lit by hand, scorched ground, magic lights), and
 * the heat map of one aspect painted over the ground and the floors.
 */

export class Filaments {
  /** Which aspect the heat map shows, if any. */
  private aspect: AspectId | null = null;
  private heatT = 0;

  constructor(private readonly w: SpikeWorld) {}

  /** The fixed sources that are not placed things: campfires lit by hand, ground burnt by lightning. */
  extras(): FSource[] {
    return [...this.w.lights.campSources(), ...this.w.sky.scorchSources()];
  }

  /** Show the heat map of one aspect over the ground (null hides it). */
  showFilaments(a: AspectId | null): void {
    const w = this.w;
    this.aspect = a;
    for (const lc of w.chunks.values()) this.syncHeat(lc);
    // The room inside each house shows it on its floor.
    for (const hs of w.houses) {
      if (a && !hs.floorHeat) w.housing.floorHeatFor(hs);
      else if (!a) w.housing.dropFloorHeat(hs);
    }
    this.heatT = 0;
  }

  get shownAspect(): AspectId | null {
    return this.aspect;
  }

  /** A chunk's heat map paint, there while an aspect is shown. */
  syncHeat(lc: LoadedChunk): void {
    const scene = this.w.scene;
    if (this.aspect && !lc.heat) {
      lc.heat = makeHeat(lc.id, lc.ground.geometry);
      scene.add(lc.heat.mesh);
    } else if (!this.aspect && lc.heat) {
      scene.remove(lc.heat.mesh);
      lc.heat.dispose();
      lc.heat = null;
    }
  }

  /** What the filaments are at the hero's feet. */
  heroReading(): HexFilaments {
    return this.w.field.readAt(this.w.hero.x, this.w.hero.z);
  }

  /** Twice a second: tell the field what the weather and the living are doing now, and repaint the heat map. */
  step(dt: number): void {
    const w = this.w;
    this.heatT -= dt;
    if (this.heatT > 0) return;
    this.heatT = 0.5;
    const env = w.env;
    w.field.setConditions({ env: w.weather.env(), isClouded: (x, z) => env.cloudShadow(x, z) > 0.5, sunDir: env.sunDir, cloudKey: w.sky.cloudKey });
    w.field.setMovers([
      { x: w.hero.x, z: w.hero.z, kind: 'friend' },
      ...w.cast.map((c) => ({ x: c.mind.actor.x, z: c.mind.actor.z, kind: 'friend' as const })),
      ...w.lights.magicLightSources(),
    ]);
    if (!this.aspect) return;
    for (const lc of w.chunks.values()) lc.heat?.paint(w.field, this.aspect);
    for (const hs of w.houses) hs.floorHeat?.paint(w.field, this.aspect);
  }
}

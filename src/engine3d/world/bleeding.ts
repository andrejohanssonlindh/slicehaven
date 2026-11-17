import * as THREE from 'three';
import { TIRED_BANDS } from '../../content/people/condition';
import { type Condition, PART_JOINTS, conditionOf } from '../../core/world3d/condition';
import type { BodyPart } from '../../core/damage';
import type { Joint } from '../../core/world3d/pose';
import { Blood } from '../blood';
import type { Figure } from './types';
import type { SpikeWorld } from './index';

/**
 * What injuries look like (the director, 2026-11-17): each person's condition, worked out from what the rules keep
 * (`world.hurt`, `core/world3d/condition.ts`) for the animator to show (a nursed arm, a limp, bent over when spent);
 * blood on the wounded parts of the body; and drops falling from whoever bleeds, staining the ground (`../blood.ts`).
 * Looks only: nothing here changes what happens.
 */
export class Bleeding {
  readonly blood = new Blood();
  /** Each person's condition, and what it was worked out from (so it is only redone when their injuries change). */
  private readonly seen = new Map<string, { from: string; is: Condition }>();
  private readonly at = new THREE.Vector3();

  constructor(private readonly w: SpikeWorld) {
    w.scene.add(this.blood.group);
  }

  /** The shape someone is in, as it shows; null if nothing ever happened to them. */
  conditionOf(id: string, fig: Figure): Condition | null {
    const inj = this.w.hurt[id];
    if (!inj) {
      if (this.seen.delete(id)) {
        fig.rig.stain({});
        fig.rig.lose({});
      }
      return null;
    }
    const from = `${inj.fatigue + inj.baseFatigue}|${JSON.stringify(inj.wounds)}|${inj.broken}|${inj.lost.length}|${inj.bleed?.rate ?? 0}|${inj.infection?.level ?? 0}`;
    let c = this.seen.get(id);
    if (!c || c.from !== from) {
      c = { from, is: conditionOf(inj, TIRED_BANDS) };
      this.seen.set(id, c);
      const marks: Partial<Record<Joint, number>> = {};
      for (const [part, k] of Object.entries(c.is.stains) as [BodyPart, number][]) for (const j of PART_JOINTS[part]) marks[j] = k;
      fig.rig.stain(marks);
      fig.rig.lose(c.is.gone);
    }
    return c.is;
  }

  /** Whoever bleeds drips (the dead have stopped); drops fall, stains dry. */
  step(dt: number): void {
    const w = this.w;
    for (const p of w.people) {
      const c = this.seen.get(p.id)?.is;
      if (!c || c.bleed <= 0 || !p.fig.place.visible || w.hurt[p.id]?.dead) continue;
      p.fig.place.updateWorldMatrix(true, true);
      this.blood.bleed(p.id, p.fig.rig.jointWorld(c.bleedFrom, this.at), p.fig.place.position.y, c.bleed, dt, !w.figures.indoors(p.id));
    }
    // Rain washes away what lies under the open sky.
    this.blood.step(dt, w.weather.rain);
  }
}

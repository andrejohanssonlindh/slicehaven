import { describe, expect, it } from 'vitest';
import { THINGS } from '../src/content/things';
import { MODELS } from '../src/content/things/models';
import { bounds, emptyMesh, merge } from '../src/core/world3d/mesh';
import { modelOf } from '../src/core/world3d/things';

/**
 * What every furniture model (`content/things/models/`) must get right; the how-to is
 * `director/design/models-authoring.md`. A model that breaks one of these says which and by how much.
 */
const VARIANTS: Record<string, (string | undefined)[]> = { shelf: [undefined, 'loaves', 'jars', 'bolts', 'tankards', 'wares', 'bottles'] };

describe('furniture models', () => {
  it('there are some, and each is the model of a kind of furniture', () => {
    expect(Object.keys(MODELS).length).toBeGreaterThan(0);
    for (const id of Object.keys(MODELS)) {
      expect(THINGS.has(id), `${id}.ts: no kind of thing is called ${id}`).toBe(true);
      expect(modelOf(THINGS.get(id)), `${id}: not a kind with a model`).toBe(MODELS[id]);
    }
  });

  for (const [id, model] of Object.entries(MODELS)) {
    for (const variant of VARIANTS[id] ?? [undefined]) {
      for (const seed of [0, 1, 7]) {
        it(`${id}${variant ? ` (${variant})` : ''}, seed ${seed}: on the floor, inside its footprint, cheap, the same every time`, () => {
          const parts = model.draw(seed, variant);
          expect(parts.meshes.length, 'it draws nothing').toBeGreaterThan(0);
          const all = emptyMesh();
          for (const p of parts.meshes) {
            expect(p.mesh.positions.every(Number.isFinite), `${p.material}: a position is not a number`).toBe(true);
            merge(all, p.mesh);
          }
          const b = bounds(all);
          const mount = THINGS.get(id).furniture?.mount ?? 'flat';
          // Nothing below the floor (or below its lowest point, for hung things), and it reaches up off it.
          expect(b.min[1], 'something is below y = 0').toBeGreaterThanOrEqual(-0.01);
          expect(b.max[1], 'nothing stands up off the floor').toBeGreaterThan(mount === 'flat' ? 0.002 : 0.05);
          // Inside its footprint (a few centimetres over is fine: a lip, a handle, a blanket's fold).
          const slack = 0.06;
          expect(b.max[0] - b.min[0], `wider than its w (${model.w})`).toBeLessThanOrEqual(model.w + slack);
          expect(b.max[2] - b.min[2], `deeper than its d (${model.d})`).toBeLessThanOrEqual(model.d + slack);
          expect(Math.abs(b.min[0] + b.max[0]) / 2, 'not centred on x').toBeLessThan(0.1);
          if (mount === 'hung') expect(b.min[2], 'a hung piece must have its back at z = -d/2').toBeGreaterThanOrEqual(-model.d / 2 - 0.02);
          // Cheap: a piece of furniture is a few hundred triangles.
          expect(all.indices.length / 3, 'too many triangles (aim for 50–300, at most 450)').toBeLessThanOrEqual(450);
          // The same seed gives the same model.
          expect(JSON.stringify(model.draw(seed, variant))).toBe(JSON.stringify(parts));
        });
      }
    }
  }
});

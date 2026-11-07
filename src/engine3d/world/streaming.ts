import * as THREE from 'three';
import { groundChunkPainter } from '../../art/textures3d';
import { CHUNK, chunkKey, chunksNear } from '../../core/world3d/chunks';
import { TEXELS_PER_M } from '../../core/world3d/tiers';
import { lit, pixTexture } from '../materials';
import { geometryOf } from '../things';
import { type LoadedChunk, type Standing, newStanding } from './types';
import type { SpikeWorld } from './index';

/**
 * Streaming the world in chunks round the view: each chunk's ground (its painting done a few ms a frame), its grass,
 * and the trees, props and houses that stand in it (built one at a time, spread over frames), taken down again when
 * the view has gone well past. Far off, what was made for the ground is forgotten and made again, the same, on return.
 */

export class Streaming {
  private builds = 0;
  private groundHold: THREE.DataTexture | null = null;
  private paintQueue: LoadedChunk[] = [];
  /** Work left to do for chunks that have loaded: one tree, prop or house at a time, spread over frames. */
  private fillQueue: { lc: LoadedChunk; run: () => void }[] = [];
  private forgetT = 3;

  constructor(private readonly w: SpikeWorld) {}

  /** Chunks built over the page's life (a streaming counter for the stats and tests). */
  get chunksBuilt(): number {
    return this.builds;
  }

  get chunkCount(): number {
    return this.w.chunks.size;
  }

  /** What is held for far-off ground, for the stats and the tests. */
  get held(): { furnished: number; generated: number } {
    return { furnished: this.w.houseIndex.made, generated: this.w.placed.generatedChunks };
  }

  /** Build one chunk's ground mesh, painted texture and grass, and add it to the scene. */
  private load(i: number, j: number): void {
    const w = this.w;
    const c = w.store.ensure(i, j);
    // The painting is the slow part (about 100 ms), so it is done a few ms a frame: a flat green stands in until it is finished.
    this.groundHold ??= pixTexture(new Uint8ClampedArray([62, 92, 42, 255]), 1, 1, { flip: false });
    const mesh = new THREE.Mesh(geometryOf(c.mesh), lit({ map: this.groundHold, ao: true, wettable: true, puddles: true }));
    mesh.receiveShadow = true;
    w.scene.add(mesh);
    const grass = w.grass.build(c);
    if (grass) w.scene.add(grass);
    const lc: LoadedChunk = { id: c, ground: mesh, grass, heat: null, standing: newStanding(), painter: groundChunkPainter(w.ground, i, j) };
    this.paintQueue.push(lc);
    w.chunks.set(chunkKey(i, j), lc);
    this.fill(i, j, lc);
    w.filaments.syncHeat(lc);
    this.builds++;
  }

  /** Queue what the placed index says is in chunk (i, j): trees, props, houses (built by `pumpFill`). */
  private fill(i: number, j: number, lc: LoadedChunk): void {
    const w = this.w, content = w.placed.chunk(i, j), st = lc.standing;
    for (const t of content.trees) this.fillQueue.push({ lc, run: () => w.trees.build(t, st) });
    for (const p of content.props) this.fillQueue.push({ lc, run: () => w.props.build(p, st) });
    for (const place of w.houseIndex.inChunk(i, j)) this.fillQueue.push({ lc, run: () => w.housing.stand(w.houseIndex.entry(place), st) });
  }

  /** Do queued chunk work for up to `budgetMs`, so a chunk streaming in costs a few frames of a little, not one long one. */
  private pumpFill(budgetMs: number): void {
    const t0 = performance.now();
    let n = 0;
    while (n < this.fillQueue.length && performance.now() - t0 < budgetMs) {
      const job = this.fillQueue[n++];
      if (!job.lc.dead) job.run();
    }
    this.fillQueue.splice(0, n);
  }

  /** Paint the grounds of loaded chunks for up to `budgetMs`, the nearest the view's centre first; a finished one gets its texture. */
  private pumpPaint(budgetMs: number): void {
    const t0 = performance.now();
    while (this.paintQueue.length && performance.now() - t0 < budgetMs) {
      const f = this.w.focus;
      let k = 0, best = Infinity;
      this.paintQueue.forEach((q, n) => {
        const d = Math.hypot(q.id.x0 + CHUNK / 2 - f.x, q.id.z0 + CHUNK / 2 - f.z);
        if (d < best) { best = d; k = n; }
      });
      const lc = this.paintQueue[k];
      if (lc.dead || !lc.painter) {
        this.paintQueue.splice(k, 1);
        continue;
      }
      if (!lc.painter.step(Math.max(0.5, budgetMs - (performance.now() - t0)))) continue;
      const n = Math.round(CHUNK * TEXELS_PER_M);
      const map = pixTexture(lc.painter.pix.data, n, n, { flip: false });
      map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
      // Mesh UVs are world metres; this chunk's texture covers x0..x0+CHUNK.
      map.repeat.set(1 / CHUNK, 1 / CHUNK);
      map.offset.set(-lc.id.x0 / CHUNK, -lc.id.z0 / CHUNK);
      (lc.ground.material as THREE.MeshLambertMaterial).map = map;
      lc.painter = undefined;
      this.paintQueue.splice(k, 1);
    }
  }

  /** Take down what a chunk (or a campfire) stood up. Geometry shared between things (the tree looks) stays. */
  takeDown(st: Standing): void {
    const w = this.w;
    for (const hs of st.houses) w.housing.drop(hs);
    st.houses.length = 0;
    for (const o of st.objects) {
      w.scene.remove(o);
      w.props.fixedTo.delete(o);
      o.traverse((c) => {
        const g = (c as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
        if (g && !g.userData.shared) g.dispose();
      });
    }
    w.lights.dropTorches(st);
    w.shells.drop(st.shells);
    st.objects.length = st.shells.length = st.torches.length = 0;
  }

  private unload(key: string): void {
    const w = this.w;
    const lc = w.chunks.get(key);
    if (!lc) return;
    w.scene.remove(lc.ground);
    lc.ground.geometry.dispose();
    const mat = lc.ground.material as THREE.MeshLambertMaterial;
    if (mat.map !== this.groundHold) mat.map?.dispose();
    mat.dispose();
    if (lc.heat) {
      w.scene.remove(lc.heat.mesh);
      lc.heat.dispose();
    }
    if (lc.grass) {
      w.scene.remove(lc.grass);
      lc.grass.dispose();
    }
    lc.dead = true;
    this.takeDown(lc.standing);
    w.chunks.delete(key);
    w.store.drop(lc.id.i, lc.id.j);
  }

  /**
   * Keep the chunks near the view resident. Builds at most one per call (a chunk costs a texture paint) unless `all`,
   * nearest first; drops those well outside. Only what has been seen, or can be seen now, is built (with vision on);
   * the rest of the view stays black.
   */
  stream(all = false): void {
    const w = this.w, sight = w.sight;
    const r = w.viewRadius();
    const want = chunksNear(w.ground, w.focus.x, w.focus.z, r).filter((c) => sight.worthLoading(c.i, c.j));
    for (const id of want) {
      if (w.chunks.has(chunkKey(id.i, id.j))) continue;
      this.load(id.i, id.j);
      if (!all) break;
    }
    // Hysteresis: a chunk is dropped only well past the load radius.
    const keep = new Set(chunksNear(w.ground, w.focus.x, w.focus.z, r + CHUNK * 0.75).filter((c) => sight.worthLoading(c.i, c.j)).map((c) => chunkKey(c.i, c.j)));
    for (const k of [...w.chunks.keys()]) if (!keep.has(k)) this.unload(k);
  }

  /** The first view is built whole, before the first frame. */
  buildAll(): void {
    this.stream(true);
    this.pumpPaint(Infinity);
    this.pumpFill(Infinity);
  }

  /**
   * Let go of what is made for ground far from the view: the furnished rooms of houses and the generated trees, props
   * and posts of chunks. They are made again, the same, if the hero comes back; what is on the screen is untouched.
   */
  private forgetFar(): number {
    const w = this.w, f = w.focus, keep = w.viewRadius() + Math.max(60, w.sight.lightRange);
    const near = (x: number, z: number, r: number): boolean => Math.hypot(x - f.x, z - f.z) < r;
    const stood = new Set(w.houses.map((h) => h.built.place));
    // (Whoever walks keeps the ground round them: the hero, and the people going their rounds.)
    const walkers = [w.hero, ...w.cast.map((c) => c.mind.actor)];
    const held = (x: number, z: number, r: number): boolean => near(x, z, r) || walkers.some((a) => Math.hypot(x - a.x, z - a.z) < r);
    const a = w.houseIndex.forget((p) => stood.has(p) || held(p.x, p.z, keep));
    const b = w.placed.forget((i, j) => near((i + 0.5) * CHUNK, (j + 0.5) * CHUNK, keep + CHUNK) || w.chunks.has(chunkKey(i, j)));
    w.nav.forget((x, z) => held(x, z, keep));
    w.field.forget((x, z) => held(x, z, keep));
    return a + b;
  }

  /** Each frame: a chunk streamed in or out, a little building and painting, and now and then far-off ground forgotten. */
  step(dt: number): void {
    this.stream();
    this.pumpFill(3);
    this.pumpPaint(4);
    this.forgetT -= dt;
    if (this.forgetT <= 0) {
      this.forgetT = 3;
      this.forgetFar();
    }
  }
}

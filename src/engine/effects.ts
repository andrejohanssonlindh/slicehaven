import { tinyText } from '../art/icons';
import { Pix } from '../art/pix';

/** Short-lived visual effects in world pixel coordinates. */
export type ParticleKind = 'fire' | 'smoke' | 'spark' | 'puff' | 'heal' | 'ember';

interface Particle {
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
}

interface Bolt {
  segments: [number, number][][];
  life: number;
}

interface Floater {
  x: number;
  y: number;
  pix: Pix;
  life: number;
}

interface Projectile {
  x0: number; y0: number; x1: number; y1: number;
  t: number;
  duration: number;
  done: () => void;
}

const FIRE_RAMP = ['#fff2a0', '#f2d75c', '#f2a24a', '#ef6a48', '#c43a2e', '#8a1e22'];

export class Effects {
  particles: Particle[] = [];
  bolts: Bolt[] = [];
  floaters: Floater[] = [];
  projectiles: Projectile[] = [];

  emit(kind: ParticleKind, x: number, y: number, vx: number, vy: number, life: number): void {
    this.particles.push({ kind, x, y, vx, vy, life, max: life });
  }

  burst(kind: ParticleKind, x: number, y: number, n: number, speed = 1): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = (0.3 + Math.random()) * speed;
      this.emit(kind, x, y, Math.cos(a) * s, Math.sin(a) * s * 0.6 - 0.5, 10 + Math.random() * 12);
    }
  }

  floatText(text: string, x: number, y: number, color: string): void {
    this.floaters.push({ x, y, pix: tinyText(text, color).scaled(2), life: 30 });
  }

  /** Jagged bolt from the sky to (x, y), with a couple of branches. */
  lightning(x: number, y: number): void {
    const main: [number, number][] = [];
    let cx = x + (Math.random() - 0.5) * 30;
    for (let cy = y - 120; cy < y; cy += 6) {
      main.push([Math.round(cx), cy]);
      cx += (Math.random() - 0.5) * 8;
      cx += (x - cx) * 0.15; // converge on the target
    }
    main.push([x, y]);
    const segments = [main];
    for (let b = 0; b < 2; b++) {
      const start = main[2 + Math.floor(Math.random() * (main.length - 6))];
      const branch: [number, number][] = [start];
      let [bx, by] = start;
      const dir = Math.random() < 0.5 ? -1 : 1;
      for (let i = 0; i < 4; i++) {
        bx += dir * (2 + Math.random() * 5);
        by += 4 + Math.random() * 4;
        branch.push([Math.round(bx), Math.round(by)]);
      }
      segments.push(branch);
    }
    this.bolts.push({ segments, life: 8 });
    this.burst('spark', x, y - 2, 18, 2);
  }

  shoot(x0: number, y0: number, x1: number, y1: number, done: () => void): void {
    const duration = 8 + Math.hypot(x1 - x0, y1 - y0) / 6;
    this.projectiles.push({ x0, y0, x1, y1, t: 0, duration, done });
  }

  update(dt: number, windX: number, windY = 0): void {
    const steps = dt / 33;
    for (const p of this.particles) {
      p.life -= steps;
      const blown = p.kind === 'smoke' || p.kind === 'fire' || p.kind === 'ember';
      p.x += (p.vx + (blown ? windX * 0.8 : 0)) * steps;
      p.y += (p.vy + (blown ? windY * 0.5 : 0)) * steps;
      if (p.kind === 'spark' || p.kind === 'puff') p.vy += 0.08 * steps;
      if (p.kind === 'smoke') p.vx *= 0.98;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const b of this.bolts) b.life -= steps;
    this.bolts = this.bolts.filter((b) => b.life > 0);
    for (const f of this.floaters) {
      f.life -= steps;
      f.y -= 0.35 * steps;
    }
    this.floaters = this.floaters.filter((f) => f.life > 0);
    for (const p of this.projectiles) {
      p.t += steps;
      if (p.t >= p.duration) p.done();
    }
    this.projectiles = this.projectiles.filter((p) => p.t < p.duration);
  }

  /** Particles that should be lit by the scene (fire glows on its own later). */
  drawParticles(buf: Pix): void {
    for (const p of this.particles) {
      const k = 1 - p.life / p.max; // 0 new .. 1 dying
      let c: string;
      switch (p.kind) {
        case 'fire':
          c = FIRE_RAMP[Math.min(FIRE_RAMP.length - 1, Math.floor(k * FIRE_RAMP.length))];
          if (k < 0.3) buf.set(p.x + 1, p.y, c);
          break;
        case 'ember':
          c = k < 0.5 ? '#f2a24a' : '#c43a2e';
          break;
        case 'smoke':
          c = k < 0.5 ? '#4a4450a0' : '#3a344060';
          if (k > 0.3) buf.set(p.x + 1, p.y, c);
          break;
        case 'spark':
          c = k < 0.5 ? '#fffbe0' : '#9fd8ff';
          break;
        case 'puff':
          c = k < 0.5 ? '#d8d0c8c0' : '#9a908880';
          break;
        case 'heal':
          c = k < 0.5 ? '#c8ffb0' : '#5aa040';
          break;
      }
      buf.set(p.x, p.y, c);
    }
    for (const p of this.projectiles) {
      const t = p.t / p.duration;
      const x = p.x0 + (p.x1 - p.x0) * t;
      const y = p.y0 + (p.y1 - p.y0) * t - Math.sin(t * Math.PI) * 10;
      buf.set(x, y, '#1b1424');
      buf.set(x + 1, y, '#8e93a1');
      buf.set(x, y + 1, '#686b7b');
    }
  }

  /** Unlit overlays: lightning and floating numbers. */
  drawOverlay(buf: Pix): void {
    for (const b of this.bolts) {
      const glow = b.life > 4;
      for (const seg of b.segments) {
        for (let i = 1; i < seg.length; i++) line(buf, seg[i - 1], seg[i], glow ? '#fffbe0' : '#b8d8ff', glow);
      }
    }
    for (const f of this.floaters) buf.blit(f.pix, Math.round(f.x - f.pix.w / 2), Math.round(f.y));
  }

  /** Light emitted by effects (bolts, sparks). */
  lights(): { x: number; y: number; r: number; color: [number, number, number] }[] {
    const out: { x: number; y: number; r: number; color: [number, number, number] }[] = [];
    for (const b of this.bolts) {
      const end = b.segments[0][b.segments[0].length - 1];
      out.push({ x: end[0], y: end[1], r: 60, color: [1.2 * (b.life / 8), 1.3 * (b.life / 8), 1.6 * (b.life / 8)] });
    }
    return out;
  }
}

function line(buf: Pix, a: [number, number], b: [number, number], color: string, glow: boolean): void {
  const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
  for (let i = 0; i <= n; i++) {
    const x = Math.round(a[0] + ((b[0] - a[0]) * i) / n);
    const y = Math.round(a[1] + ((b[1] - a[1]) * i) / n);
    if (glow) {
      buf.set(x - 1, y, '#6fb3ff80');
      buf.set(x + 1, y, '#6fb3ff80');
    }
    buf.set(x, y, color);
  }
}

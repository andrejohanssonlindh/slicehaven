import { type Environment, SKY_WIND, type Sky, type TimeOfDay } from '../core/environment';

export type { Sky, TimeOfDay };

/**
 * Weather and time of day. Everything eases toward its target so changes
 * roll in instead of snapping. Also owns rain drops and wind-blown leaves.
 */
export type RGB = [number, number, number];

const SKY: Record<Sky, { cloud: number; rain: number }> = {
  clear: { cloud: 0, rain: 0 },
  cloudy: { cloud: 0.65, rain: 0 },
  rain: { cloud: 0.9, rain: 0.55 },
  storm: { cloud: 1, rain: 1 },
};

const TIME: Record<TimeOfDay, number> = { day: 0, dusk: 1, night: 2 };
const TIME_LIGHT: RGB[] = [
  [1, 1, 1],
  [1.0, 0.74, 0.6],
  [0.3, 0.36, 0.6],
];

/** 8 compass directions the wind can blow toward (screen space: y grows down). */
export const WIND_DIRS = [
  { name: 'east', arrow: '→', angle: 0 },
  { name: 'south-east', arrow: '↘', angle: Math.PI / 4 },
  { name: 'south', arrow: '↓', angle: Math.PI / 2 },
  { name: 'south-west', arrow: '↙', angle: (3 * Math.PI) / 4 },
  { name: 'west', arrow: '←', angle: Math.PI },
  { name: 'north-west', arrow: '↖', angle: (-3 * Math.PI) / 4 },
  { name: 'north', arrow: '↑', angle: -Math.PI / 2 },
  { name: 'north-east', arrow: '↗', angle: -Math.PI / 4 },
];

interface Drop {
  x: number;
  y: number;
  life: number; // frames until it hits the ground
}

interface Leaf {
  x: number;
  y: number;
  speed: number;
  phase: number;
  color: string;
}

const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;

export class Weather {
  sky: Sky = 'clear';
  time: TimeOfDay = 'day';
  /** Wind force 0-6 (Eon scale). */
  windForce = SKY_WIND.clear;
  /** Index into WIND_DIRS: where the wind blows toward. */
  windDir = 0;
  cloud = 0;
  rain = 0;
  /** Smoothed wind strength, 0..1.2 (force / 5). */
  wind = SKY_WIND.clear / 5;
  /** Smoothed wind direction vector. */
  wx = 1;
  wy = 0;
  tod = 0; // 0 day, 1 dusk, 2 night (continuous)
  /** Lightning flash brightness, decays quickly. */
  flash = 0;
  /** How far the cloud shadows have drifted. */
  driftX = 0;
  driftY = 0;

  drops: Drop[] = [];
  splashes: { x: number; y: number; life: number }[] = [];
  leaves: Leaf[] = [];
  private nextStrike = 0;

  constructor(private w: number, private h: number) {}

  set(sky: Sky): void {
    this.sky = sky;
    this.windForce = SKY_WIND[sky];
  }

  setTime(t: TimeOfDay): void {
    this.time = t;
  }

  setWind(force: number, dir = this.windDir): void {
    this.windForce = Math.max(0, Math.min(6, force));
    this.windDir = ((dir % WIND_DIRS.length) + WIND_DIRS.length) % WIND_DIRS.length;
  }

  /** The conditions the rules see (targets, not the eased visuals). */
  env(): Environment {
    return { time: this.time, sky: this.sky, windForce: this.windForce };
  }

  /** Wind velocity components (strength × direction). */
  get windX(): number {
    return this.wind * this.wx;
  }

  get windY(): number {
    return this.wind * this.wy;
  }

  /** Returns true when the storm wants a lightning strike now. */
  update(dt: number, now: number): boolean {
    const k = 1 - Math.exp(-dt / 1500); // ~1.5 s easing
    const target = SKY[this.sky];
    this.cloud = lerp(this.cloud, target.cloud, k);
    this.rain = lerp(this.rain, target.rain, k);
    this.wind = lerp(this.wind, Math.min(1.2, this.windForce / 5), k);
    const a = WIND_DIRS[this.windDir].angle;
    this.wx = lerp(this.wx, Math.cos(a), k);
    this.wy = lerp(this.wy, Math.sin(a), k);
    this.tod = lerp(this.tod, TIME[this.time], 1 - Math.exp(-dt / 2000));
    this.flash *= Math.exp(-dt / 90);
    const drift = dt * (0.004 + this.wind * 0.02);
    this.driftX += drift * this.wx;
    this.driftY += drift * this.wy;

    this.updateRain(dt);
    this.updateLeaves(dt);

    if (this.sky === 'storm' && this.rain > 0.8) {
      if (this.nextStrike === 0) this.nextStrike = now + 4000 + Math.random() * 8000;
      if (now >= this.nextStrike) {
        this.nextStrike = now + 5000 + Math.random() * 10000;
        return true;
      }
    } else {
      this.nextStrike = 0;
    }
    return false;
  }

  /** Overall light colour multiplier (before point lights). */
  ambient(): RGB {
    const i = Math.min(1, Math.floor(this.tod));
    const f = this.tod - i;
    const t = TIME_LIGHT[i].map((v, c) => lerp(v, TIME_LIGHT[i + 1][c], f)) as RGB;
    const gloom = 0.45 * this.cloud + 0.4 * this.rain;
    const wx: RGB = [1 - gloom * 0.45, 1 - gloom * 0.4, 1 - gloom * 0.22];
    return [t[0] * wx[0], t[1] * wx[1], t[2] * wx[2]];
  }

  /** How washed-out colours are (rain makes things grey). */
  desaturation(): number {
    return 0.3 * this.rain + 0.12 * this.cloud;
  }

  private respawnDrop(d: Drop): void {
    // Start upwind so slanted rain still covers the whole map.
    const lead = 20 * this.windX;
    d.x = Math.random() * (this.w + 60) - 30 - lead;
    d.y = Math.random() * this.h * 0.85 - 30 - 10 * this.windY;
    d.life = 4 + Math.random() * 18;
  }

  private updateRain(dt: number): void {
    const steps = dt / 33;
    const want = Math.floor(this.rain * (this.w * this.h) / 220);
    while (this.drops.length < want) {
      const d = { x: 0, y: 0, life: 0 };
      this.respawnDrop(d);
      d.y = Math.random() * this.h - 20;
      this.drops.push(d);
    }
    if (this.drops.length > want) this.drops.length = want;
    const vx = this.windX * 2.2;
    const vy = 5 + this.windY * 1.5;
    for (const d of this.drops) {
      d.x += vx * steps;
      d.y += vy * steps;
      d.life -= steps;
      if (d.life <= 0) {
        if (Math.random() < 0.6) this.splashes.push({ x: Math.round(d.x), y: Math.round(d.y), life: 3 });
        this.respawnDrop(d);
      }
    }
    for (const s of this.splashes) s.life -= steps;
    this.splashes = this.splashes.filter((s) => s.life > 0);
  }

  private updateLeaves(dt: number): void {
    const steps = dt / 33;
    const want = this.wind > 0.55 ? Math.floor((this.wind - 0.55) * 60) : 0;
    while (this.leaves.length < want) {
      // Enter from the upwind edge.
      const fromSide = Math.abs(this.wx) >= Math.abs(this.wy);
      this.leaves.push({
        x: fromSide ? (this.wx > 0 ? -10 : this.w + 10) - Math.random() * 30 * Math.sign(this.wx || 1) : Math.random() * this.w,
        y: fromSide ? Math.random() * this.h : (this.wy > 0 ? -10 : this.h + 10) - Math.random() * 30 * Math.sign(this.wy || 1),
        speed: 1.5 + Math.random() * 2.5,
        phase: Math.random() * 6,
        color: ['#a35f2a', '#c98a3a', '#72a947', '#4f8a3a'][Math.floor(Math.random() * 4)],
      });
    }
    for (const l of this.leaves) {
      l.x += l.speed * steps * this.windX;
      l.y += l.speed * steps * this.windY * 0.7;
      l.phase += 0.2 * steps;
      // Flutter sideways to the wind.
      l.x += -Math.sin(l.phase) * 0.6 * steps * this.wy;
      l.y += Math.sin(l.phase) * 0.6 * steps * this.wx;
    }
    const inside = (l: Leaf): boolean => l.x > -50 && l.x < this.w + 50 && l.y > -50 && l.y < this.h + 50;
    this.leaves = this.leaves.filter((l, i) => inside(l) && i < Math.max(want, 1) * 2);
  }
}

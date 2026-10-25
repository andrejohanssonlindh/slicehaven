/**
 * Weather and time of day. Everything eases toward its target so changes
 * roll in instead of snapping. Also owns rain drops and wind-blown leaves.
 */
export type Sky = 'clear' | 'cloudy' | 'rain' | 'storm';
export type TimeOfDay = 'day' | 'dusk' | 'night';
export type RGB = [number, number, number];

const SKY: Record<Sky, { cloud: number; rain: number; wind: number }> = {
  clear: { cloud: 0, rain: 0, wind: 0.05 },
  cloudy: { cloud: 0.65, rain: 0, wind: 0.3 },
  rain: { cloud: 0.9, rain: 0.55, wind: 0.4 },
  storm: { cloud: 1, rain: 1, wind: 1 },
};

const TIME: Record<TimeOfDay, number> = { day: 0, dusk: 1, night: 2 };
const TIME_LIGHT: RGB[] = [
  [1, 1, 1],
  [1.0, 0.74, 0.6],
  [0.3, 0.36, 0.6],
];

interface Drop {
  x: number;
  y: number;
  life: number; // frames until it hits the ground
}

interface Leaf {
  x: number;
  y: number;
  vx: number;
  phase: number;
  color: string;
}

const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;

export class Weather {
  sky: Sky = 'clear';
  time: TimeOfDay = 'day';
  cloud = 0;
  rain = 0;
  wind = SKY.clear.wind;
  tod = 0; // 0 day, 1 dusk, 2 night (continuous)
  /** Lightning flash brightness, decays quickly. */
  flash = 0;
  /** Distance the cloud shadows have drifted. */
  drift = 0;

  drops: Drop[] = [];
  splashes: { x: number; y: number; life: number }[] = [];
  leaves: Leaf[] = [];
  private nextStrike = 0;

  constructor(private w: number, private h: number) {}

  set(sky: Sky): void {
    this.sky = sky;
  }

  setTime(t: TimeOfDay): void {
    this.time = t;
  }

  /** Returns true when the storm wants a lightning strike now. */
  update(dt: number, now: number): boolean {
    const k = 1 - Math.exp(-dt / 1500); // ~1.5 s easing
    const target = SKY[this.sky];
    this.cloud = lerp(this.cloud, target.cloud, k);
    this.rain = lerp(this.rain, target.rain, k);
    this.wind = lerp(this.wind, target.wind, k);
    this.tod = lerp(this.tod, TIME[this.time], 1 - Math.exp(-dt / 2000));
    this.flash *= Math.exp(-dt / 90);
    this.drift += dt * (0.004 + this.wind * 0.02);

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

  private updateRain(dt: number): void {
    const steps = dt / 33;
    const want = Math.floor(this.rain * (this.w * this.h) / 220);
    while (this.drops.length < want) {
      this.drops.push({ x: Math.random() * (this.w + 60) - 30, y: Math.random() * this.h - 20, life: 4 + Math.random() * 18 });
    }
    if (this.drops.length > want) this.drops.length = want;
    const vx = this.wind * 2.2;
    for (const d of this.drops) {
      d.x += vx * steps;
      d.y += 5 * steps;
      d.life -= steps;
      if (d.life <= 0) {
        if (Math.random() < 0.6) this.splashes.push({ x: Math.round(d.x), y: Math.round(d.y), life: 3 });
        d.x = Math.random() * (this.w + 60) - 30 - vx * 10;
        d.y = Math.random() * this.h * 0.8 - 30;
        d.life = 4 + Math.random() * 18;
      }
    }
    for (const s of this.splashes) s.life -= steps;
    this.splashes = this.splashes.filter((s) => s.life > 0);
  }

  private updateLeaves(dt: number): void {
    const steps = dt / 33;
    const want = this.wind > 0.55 ? Math.floor((this.wind - 0.55) * 60) : 0;
    while (this.leaves.length < want) {
      this.leaves.push({
        x: -10 - Math.random() * 40,
        y: Math.random() * this.h,
        vx: 1.5 + Math.random() * 2.5,
        phase: Math.random() * 6,
        color: ['#a35f2a', '#c98a3a', '#72a947', '#4f8a3a'][Math.floor(Math.random() * 4)],
      });
    }
    for (const l of this.leaves) {
      l.x += l.vx * steps * this.wind;
      l.phase += 0.2 * steps;
      l.y += Math.sin(l.phase) * 0.6 * steps;
    }
    this.leaves = this.leaves.filter((l, i) => l.x < this.w + 10 && i < Math.max(want, 1) * 2);
  }
}

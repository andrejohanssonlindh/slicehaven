import { type Environment, MOON_CYCLE, SKY_CLOUD, lightAt, timeOfDayAt, SKY_WIND, type Sky, type TimeOfDay, WIND_DIRS } from '../environment';

export type { Sky, TimeOfDay };
export { WIND_DIRS };

/**
 * Weather and the clock. Everything eases toward its target so changes roll in
 * instead of snapping. The rules read `env()` (the targets); the renderer reads
 * the eased values (`cloud`, `rain`, `wind`, `wx`/`wy`, `tod`, `flash`).
 */

const SKY_RAIN: Record<Sky, number> = { clear: 0, cloudy: 0, rain: 0.55, storm: 1 };

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
  /** The clock in hours 0..24; null until `setHour` starts it. */
  hour: number | null = null;
  /** The hour as drawn: follows `hour` (the short way round midnight) so a jump sweeps the sun across. */
  hourShown = 12;
  /** Whole days passed (the moon's phase follows): starts a few days after the new moon. */
  day = 4;
  tod = 0; // 0 day, 1 dusk, 2 night (continuous)
  /** Lightning flash brightness, decays quickly. */
  flash = 0;

  /** True once the wind has been fixed by hand (`pinWind`): changing the sky then leaves it alone. `unpinWind` hands it back to the sky. */
  windPinned = false;

  pinWind(force: number, dir = this.windDir): void {
    this.windPinned = true;
    this.setWind(force, dir);
  }

  set(sky: Sky): void {
    this.sky = sky;
    if (!this.windPinned) this.windForce = SKY_WIND[sky];
  }

  unpinWind(): void {
    this.windPinned = false;
    this.windForce = SKY_WIND[this.sky];
  }

  setTime(t: TimeOfDay): void {
    this.time = t;
    if (this.hour !== null) this.hour = t === 'day' ? 12 : t === 'dusk' ? 18.5 : 0;
  }

  /** What the sky is drawn from: the hour as shown, or null without a clock. */
  get lightHour(): number | null {
    return this.hour === null ? null : this.hourShown;
  }

  /** Give the world a clock and set it. */
  setHour(h: number): void {
    if (this.hour === null) this.hourShown = h; // first start: no sweep
    this.hour = ((h % 24) + 24) % 24;
    this.time = timeOfDayAt(this.hour);
  }

  /** Let hours pass (the clock must have been started with `setHour`). */
  advance(hours: number): void {
    if (this.hour === null) return;
    const next = this.hour + hours;
    this.day += Math.floor(next / 24);
    this.setHour(next);
  }

  setWind(force: number, dir = this.windDir): void {
    this.windForce = Math.max(0, Math.min(6, force));
    this.windDir = ((dir % WIND_DIRS.length) + WIND_DIRS.length) % WIND_DIRS.length;
  }

  /** The conditions the rules see (targets, not the eased visuals). */
  env(): Environment {
    const env: Environment = { time: this.time, sky: this.sky, windForce: this.windForce, windDir: this.windDir };
    if (this.hour !== null) {
      env.hour = this.hour;
      env.moon = (((this.day + this.hour / 24) % MOON_CYCLE) + MOON_CYCLE) % MOON_CYCLE / MOON_CYCLE;
    }
    return env;
  }

  /** Wind velocity components (strength × direction). */
  get windX(): number {
    return this.wind * this.wx;
  }

  get windY(): number {
    return this.wind * this.wy;
  }

  /** Ease toward the targets; `dt` in milliseconds. */
  update(dt: number): void {
    const k = 1 - Math.exp(-dt / 1500); // ~1.5 s easing
    this.cloud = lerp(this.cloud, SKY_CLOUD[this.sky], k);
    this.rain = lerp(this.rain, SKY_RAIN[this.sky], k);
    this.wind = lerp(this.wind, Math.min(1.2, this.windForce / 5), k);
    const a = WIND_DIRS[this.windDir].angle;
    this.wx = lerp(this.wx, Math.cos(a), k);
    this.wy = lerp(this.wy, Math.sin(a), k);
    if (this.hour !== null) {
      // The light follows the clock; a jump of hours sweeps across in about a second instead of cutting.
      const gap = ((this.hour - this.hourShown + 36) % 24) - 12;
      this.hourShown = (this.hourShown + gap * (1 - Math.exp(-dt / 350)) + 24) % 24;
      this.tod = lightAt(this.hourShown);
    } else this.tod = lerp(this.tod, { day: 0, dusk: 1, night: 2 }[this.time], 1 - Math.exp(-dt / 2000));
    this.flash *= Math.exp(-dt / 90);
  }
}

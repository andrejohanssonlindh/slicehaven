/**
 * The world's conditions: time of day, sky and wind. Shared by the rules
 * (filaments, world step) and the engine (weather rendering).
 */
export type Sky = 'clear' | 'cloudy' | 'rain' | 'storm';
export type TimeOfDay = 'day' | 'dusk' | 'night';

/** Wind force 0-6, as in Eon's wind table. */
export const WIND_NAMES = ['Calm', 'Light breeze', 'Fresh breeze', 'Strong breeze', 'Gale', 'Storm', 'Hurricane'] as const;

/** Typical wind force for each sky (used when the sky changes). */
export const SKY_WIND: Record<Sky, number> = { clear: 1, cloudy: 2, rain: 3, storm: 5 };

/** How much of the sky is cloud, 0..1. */
export const SKY_CLOUD: Record<Sky, number> = { clear: 0, cloudy: 0.65, rain: 0.9, storm: 1 };

/** 8 compass directions the wind can blow toward (screen/hex space: y grows down, i.e. south). */
export const WIND_DIRS = [
  { name: 'east', arrow: '→', angle: 0 },
  { name: 'south-east', arrow: '↘', angle: Math.PI / 4 },
  { name: 'south', arrow: '↓', angle: Math.PI / 2 },
  { name: 'south-west', arrow: '↙', angle: (3 * Math.PI) / 4 },
  { name: 'west', arrow: '←', angle: Math.PI },
  { name: 'north-west', arrow: '↖', angle: (-3 * Math.PI) / 4 },
  { name: 'north', arrow: '↑', angle: -Math.PI / 2 },
  { name: 'north-east', arrow: '↗', angle: -Math.PI / 4 },
] as const;

export interface Environment {
  time: TimeOfDay;
  sky: Sky;
  windForce: number;
  /** Index into WIND_DIRS. */
  windDir: number;
}

export function windVector(env: Pick<Environment, 'windDir'>): { x: number; y: number } {
  const a = WIND_DIRS[env.windDir].angle;
  return { x: Math.cos(a), y: Math.sin(a) };
}

/**
 * The clock of the free world: hours 0..24. Dawn and dusk are an hour and a half either side of the turn of the
 * light, so the three-way `TimeOfDay` the rules read is a reading of the clock.
 */
export function timeOfDayAt(hour: number): TimeOfDay {
  const h = ((hour % 24) + 24) % 24;
  if (h >= 7 && h < 17) return 'day';
  if ((h >= 5 && h < 7) || (h >= 17 && h < 20)) return 'dusk';
  return 'night';
}

/** The light's key frame at an hour as a continuous value: 0 full day, 1 dusk/dawn glow, 2 night. */
export function lightAt(hour: number): number {
  const h = ((hour % 24) + 24) % 24;
  if (h < 5) return 2;
  if (h < 6) return 2 - (h - 5); // first light
  if (h < 7) return 1 - (h - 6); // sunrise to full day
  if (h < 17) return 0;
  if (h < 18.5) return (h - 17) / 1.5; // afternoon to sunset
  if (h < 20) return 1 + (h - 18.5) / 1.5; // sunset to dark
  return 2;
}

/** "07:30" */
export const clockText = (hour: number): string => {
  const h = ((hour % 24) + 24) % 24;
  const m = Math.floor((h % 1) * 60);
  return `${String(Math.floor(h)).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

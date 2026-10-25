/**
 * The world's conditions: time of day, sky and wind. Shared by the rules
 * (filaments) and the engine (weather rendering).
 */
export type Sky = 'clear' | 'cloudy' | 'rain' | 'storm';
export type TimeOfDay = 'day' | 'dusk' | 'night';

/** Wind force 0-6, as in Eon's wind table. */
export const WIND_NAMES = ['Calm', 'Light breeze', 'Fresh breeze', 'Strong breeze', 'Gale', 'Storm', 'Hurricane'] as const;

/** Typical wind force for each sky (used when the sky changes). */
export const SKY_WIND: Record<Sky, number> = { clear: 1, cloudy: 2, rain: 3, storm: 5 };

export interface Environment {
  time: TimeOfDay;
  sky: Sky;
  windForce: number;
}

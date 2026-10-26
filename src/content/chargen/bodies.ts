/**
 * Typical height (cm) and weight (kg) per people, from the people descriptions.
 * Ages are our own guidance (the rules leave age free as long as it is reasonable).
 */
import type { Body } from '../../core/chargen/details';

type HW = [cm: number, kg: number];
const fm = (f: HW, m: HW): Body => ({ f, m });
const any = (x: HW): Body => ({ f: x, m: x });

const AGE = {
  manniska: { min: 14, typical: [16, 50], max: 90 },
  alv: { min: 20, typical: [25, 400], max: 1000 },
  dvarg: { min: 25, typical: [30, 150], max: 300 },
  tirak: { min: 12, typical: [14, 40], max: 70 },
  missla: { min: 15, typical: [18, 60], max: 100 },
} as const;

const BODIES: Record<string, Body> = {
  adasier: any([157, 50]),
  arkipelagier: fm([160, 58], [170, 68]),
  asharier: fm([160, 60], [170, 65]),
  cirefalier: fm([165, 60], [175, 65]),
  damarier: fm([160, 60], [170, 65]),
  ebhroniter: fm([150, 50], [160, 55]),
  fedaker: fm([155, 50], [165, 55]),
  forianer: fm([165, 60], [175, 70]),
  genver: fm([165, 65], [175, 75]),
  jahanner: fm([160, 55], [170, 65]),
  jargier: fm([160, 60], [170, 65]),
  kamorianer: fm([165, 65], [175, 70]),
  'kragg-eyrener': fm([195, 95], [205, 115]),
  muhadiner: fm([155, 55], [170, 65]),
  raunlanningar: fm([160, 65], [175, 75]),
  sabrier: fm([160, 60], [170, 70]),
  soldier: fm([160, 60], [170, 65]),
  tauper: fm([180, 65], [190, 65]),
  thalasker: fm([165, 55], [170, 65]),
  tosher: fm([135, 40], [145, 45]),
  veddo: fm([150, 60], [160, 70]),
  vastmarkare: fm([160, 55], [165, 65]),
  sanari: fm([175, 60], [165, 55]),
  thism: fm([185, 75], [190, 80]),
  kiriya: fm([170, 55], [175, 60]),
  pyar: fm([160, 55], [170, 65]),
  learam: fm([155, 55], [175, 75]),
  henea: fm([130, 35], [135, 40]),
  drezin: any([105, 30]),
  ghor: any([125, 45]),
  roghan: any([120, 45]),
  zolod: any([115, 35]),
  'zarakh-thad': any([115, 40]),
  missla: any([120, 30]),
};
const TIRAK: Record<string, HW> = { gurder: [110, 30], tiraker: [180, 85], trukher: [220, 190] };

export function bodyOf(peopleId: string | undefined, family: keyof typeof AGE | undefined): Body | undefined {
  if (!peopleId || !family) return undefined;
  const size = peopleId.split('-').pop() ?? '';
  const b = BODIES[peopleId] ?? (TIRAK[size] ? any(TIRAK[size]) : undefined);
  if (!b) return undefined;
  return { ...b, age: AGE[family] };
}

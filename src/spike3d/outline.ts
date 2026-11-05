import type { BodyPart, BreakArea, CutArea, DamageType, Injuries } from '../core/damage';
import { t } from '../i18n';
import { partName } from './condition';

/**
 * A fighter's body outline (plan B8g F3): the six hit locations of the D10 table, seen from the front (so their left
 * arm is on the right), each tinted by its wounds, with icons where blows landed (cut, crush, thrust), what is broken,
 * bleeding, and parts lost. A fatigue bar beside it. Drawn fresh from plain data each time.
 */

/** A blow someone saw land: where, and what kind of damage. */
export interface SeenHit {
  part: BodyPart;
  type: DamageType;
  serious: boolean;
}

const NS = 'http://www.w3.org/2000/svg';
/** Each part's shape (a 40 × 80 box) and the middle where its icons go. */
const SHAPES: Record<BodyPart, { d: [x: number, y: number, w: number, h: number, r: number]; at: [number, number] }> = {
  head: { d: [13, 2, 14, 14, 7], at: [20, 9] },
  torso: { d: [12, 17, 16, 26, 3], at: [20, 29] },
  rightArm: { d: [4, 18, 7, 24, 3], at: [7.5, 28] },
  leftArm: { d: [29, 18, 7, 24, 3], at: [32.5, 28] },
  rightLeg: { d: [12.5, 44, 7, 33, 3], at: [16, 60] },
  leftLeg: { d: [20.5, 44, 7, 33, 3], at: [24, 60] },
};
const TINT = ['#e6dbb918', '#d8a04099', '#d06030c0', '#b02020e0'];
const BROKEN_PART: Record<BreakArea, BodyPart> = { neck: 'head', skull: 'head', ribs: 'torso', spine: 'torso', hip: 'torso', leftArm: 'leftArm', rightArm: 'rightArm', leftLeg: 'leftLeg', rightLeg: 'rightLeg' };
const ARM: CutArea[] = ['hand', 'forearm', 'elbow', 'upperarm', 'shoulder'];
const LEG: CutArea[] = ['foot', 'calf', 'knee', 'thigh', 'hip'];

const el = <K extends keyof SVGElementTagNameMap>(name: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] => {
  const e = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
};

/** The small mark for a kind of blow, centred on (x, y). */
function icon(kind: 'cut' | 'crush' | 'thrust' | 'broken' | 'bleed', x: number, y: number): SVGElement {
  switch (kind) {
    case 'cut': return el('path', { d: `M${x - 3} ${y + 3} L${x + 3} ${y - 3}`, stroke: '#ff5a40', 'stroke-width': 1.6, 'stroke-linecap': 'round', class: 'i-cut' });
    case 'thrust': return el('circle', { cx: x, cy: y, r: 1.8, fill: '#ff5a40', stroke: '#1a1010', 'stroke-width': 0.6, class: 'i-thrust' });
    case 'crush': return el('path', { d: `M${x} ${y - 3.5} L${x + 1} ${y - 1} L${x + 3.5} ${y} L${x + 1} ${y + 1} L${x} ${y + 3.5} L${x - 1} ${y + 1} L${x - 3.5} ${y} L${x - 1} ${y - 1} Z`, fill: '#f09040', class: 'i-crush' });
    case 'broken': return el('path', { d: `M${x - 3.5} ${y - 1} L${x - 1.2} ${y + 1.5} L${x + 1.2} ${y - 1.5} L${x + 3.5} ${y + 1}`, stroke: '#f4ecd8', 'stroke-width': 1.3, fill: 'none', class: 'i-broken' });
    case 'bleed': return el('path', { d: `M${x} ${y - 3} C${x + 2.6} ${y + 0.5} ${x + 2} ${y + 3} ${x} ${y + 3} C${x - 2} ${y + 3} ${x - 2.6} ${y + 0.5} ${x} ${y - 3} Z`, fill: '#d02020', class: 'i-bleed' });
  }
}

const KIND: Record<DamageType, 'cut' | 'crush' | 'thrust'> = { cut: 'cut', thrust: 'thrust', crush: 'crush', brawl: 'crush', fall: 'crush', burn: 'crush' };

/**
 * The outline for someone: `exact` tints each part by its wounds (yours, or anyone's on easy); otherwise only the
 * blows `seen` count, as you could tell them from where you stand. `fatigue` (0–1) draws the bar; null leaves it out.
 */
export function bodyOutline(i: Injuries, seen: SeenHit[], exact: boolean, fatigue: number | null): HTMLElement {
  const box = document.createElement('div');
  box.className = 'outline';
  const svg = el('svg', { viewBox: '0 0 40 80', width: 30, height: 60, role: 'img' });
  const lost = new Set<BodyPart>();
  for (const l of i.lost) {
    const side = l.side === 'left' ? 'left' : 'right';
    if (ARM.includes(l.area)) lost.add(`${side}Arm`);
    else if (LEG.includes(l.area)) lost.add(`${side}Leg`);
  }
  const said: string[] = [];
  for (const [part, s] of Object.entries(SHAPES) as [BodyPart, (typeof SHAPES)[BodyPart]][]) {
    const n = exact ? i.wounds[part] ?? 0 : Math.min(3, seen.filter((h) => h.part === part && h.serious).length);
    const hit = seen.some((h) => h.part === part);
    const [x, y, w, h, r] = s.d;
    svg.appendChild(el('rect', {
      x, y, width: w, height: h, rx: r, 'data-part': part,
      fill: TINT[Math.min(3, n)] + '', stroke: lost.has(part) ? '#e6dbb944' : hit ? '#f0c080' : '#e6dbb988',
      'stroke-width': 0.9, ...(lost.has(part) ? { 'stroke-dasharray': '2 1.5', fill: 'none' } : {}),
    }));
    if (n || hit) said.push(`${partName(part)}${exact && n ? ` ${n}` : ''}`);
  }
  // The latest two blows on each part, a little apart.
  const byPart = new Map<BodyPart, SeenHit[]>();
  for (const h of seen) byPart.set(h.part, [...(byPart.get(h.part) ?? []), h].slice(-2));
  for (const [part, hs] of byPart) hs.forEach((h, k) => {
    const [x, y] = SHAPES[part].at;
    svg.appendChild(icon(KIND[h.type], x + (hs.length > 1 ? (k ? 2 : -2) : 0), y + (hs.length > 1 ? (k ? 3 : -3) : 0)));
  });
  for (const b of new Set(i.broken.map((b) => BROKEN_PART[b]))) {
    const [x, y] = SHAPES[b].at;
    svg.appendChild(icon('broken', x, y + 6));
  }
  if (i.bleed) {
    const last = [...seen].reverse().find((h) => h.serious)?.part ?? 'torso';
    const [x, y] = SHAPES[last].at;
    svg.appendChild(icon('bleed', x + 3, y - 5));
  }
  svg.setAttribute('aria-label', said.length ? t('fight.outline.hurt', 'Hurt: {parts}', { parts: said.join(', ') }) : t('fight.outline.whole', 'Unhurt'));
  box.appendChild(svg);
  if (fatigue !== null) {
    const bar = document.createElement('div');
    bar.className = 'vbar';
    const fill = document.createElement('i');
    fill.style.height = `${Math.round(Math.min(1, fatigue) * 100)}%`;
    bar.appendChild(fill);
    box.appendChild(bar);
  }
  return box;
}

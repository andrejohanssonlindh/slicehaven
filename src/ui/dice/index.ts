import { type DiceSkin, skinOf } from '../../content/dice/skins';
import { diceText } from '../../core/chargen/tables';
import type { Die, Roll } from '../../core/dice';
import { t } from '../../i18n';
import { type DiceClose, type DiceLevel, loadSettings } from '../settings';
import './dice.css';

/**
 * Showing rolls (plan item B2), at the level the player picks in the settings: dice thrown on glass over the game
 * (`glass.ts`, three.js, loaded when first needed), small spinning dice (`icons.ts`), or just the result. Every level
 * lands on the faces the rules rolled (`core/dice.ts`): the show never decides anything. A tap skips to the end.
 * Then the result stays until the player presses OK, or goes by itself (a setting).
 */

/** Where the pips sit on a face of a D6, on a 3 × 3 grid (0..2, 0..2). */
export const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
  6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
};

/** One line saying what a roll came to: "Search 3D6+1 vs 10: 14, success (1 advantage)"; a table roll "Homeland D100: 37". */
export function resultText(r: Roll): string {
  const what = r.kind === 'table' ? `D${r.sides}` : diceText(r.dice, r.sides);
  const head = `${r.label ? `${r.label} ` : ''}${what}${r.target !== undefined ? ` ${t('dice.vs', 'vs')} ${r.target}` : ''}`;
  let out = `${head}: ${r.total}`;
  if (r.success !== undefined) {
    out += r.success ? `, ${t('dice.success', 'success')}` : `, ${t('dice.failure', 'failure')}`;
    if (r.advantages) out += ` (${r.advantages === 1 ? t('dice.adv1', '1 advantage') : t('dice.advn', '{n} advantages', { n: r.advantages })})`;
  }
  return out;
}

/** One die of a throw, with when it starts to roll and when it lands (ms from the throw); `parent` is the global index of the six it split from. */
export interface Shown {
  roll: number;
  die: Die;
  parent: number | null;
  start: number;
  land: number;
}

/** When each die of a throw rolls: the first dice together (a little apart), and the two from a split six as it lands. */
export function schedule(rolls: Roll[], first = 700, child = 560, stagger = 90): Shown[] {
  const out: Shown[] = [];
  rolls.forEach((r, ri) => {
    const base = out.length;
    let k = 0;
    r.rolled.forEach((die) => {
      const parent = die.from === null ? null : base + die.from;
      const start = parent === null ? (k++) * stagger : out[parent].land + 120;
      out.push({ roll: ri, die, parent, start, land: start + (parent === null ? first : child) });
    });
  });
  return out;
}

export interface ShowOpts {
  level?: DiceLevel;
  skin?: string;
  close?: DiceClose;
}

/** What a level's show needs: the rolls, the skin, the overlay to draw in, and a signal that the player tapped to skip. */
export interface Stage {
  rolls: Roll[];
  skin: DiceSkin;
  root: HTMLElement;
  skipped: () => boolean;
  /** Resolves when the player taps. */
  skip: Promise<void>;
  /** What to let go of when the show is over (a renderer). */
  cleanup: (() => void)[];
}

/** At most this many dice are thrown at once, and this many result lines written (more become one line). */
const MAX_SHOWN = 18;
const MAX_LINES = 4;

const wait = (ms: number, skip: Promise<void>): Promise<void> => Promise.race([new Promise<void>((r) => setTimeout(r, ms)), skip]);

/** Show some rolls (one throw: they land together), then their results; resolves when the show is over. */
export async function showRolls(rolls: Roll[], opts: ShowOpts = {}): Promise<void> {
  if (!rolls.length) return;
  const set = loadSettings();
  const level = opts.level ?? set.dice;
  const skin = skinOf(opts.skin ?? set.diceSkin);
  const root = document.createElement('div');
  root.className = `dice-show dice-${level}`;
  document.body.append(root);
  let tapped = false;
  let waiting: (() => void)[] = [];
  /** Resolves on the next tap. */
  const nextTap = (): Promise<void> => new Promise((r) => waiting.push(r));
  root.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    tapped = true;
    const w = waiting;
    waiting = [];
    for (const r of w) r();
  });
  const skip = nextTap();
  // Many rolls at once (the creator's "roll everything"): the first throw's worth is shown as dice, all in the line.
  const thrown: Roll[] = [];
  for (const r of rolls) if (thrown.reduce((n, x) => n + x.rolled.length, 0) + r.rolled.length <= MAX_SHOWN) thrown.push(r);
  const stage: Stage = { rolls: thrown.length ? thrown : rolls.slice(0, 1), skin, root, skipped: () => tapped, skip, cleanup: [] };
  try {
    if (level === 'glass') {
      const { throwOnGlass } = await import('./glass');
      await throwOnGlass(stage);
    } else if (level === 'icons') {
      const { spinIcons } = await import('./icons');
      await spinIcons(stage);
    }
    const lines = document.createElement('div');
    lines.className = 'dice-lines';
    if (rolls.length > MAX_LINES) {
      const line = document.createElement('div');
      line.textContent = `${rolls.length} × D${rolls[0].sides}: ${rolls.map((r) => r.total).join(', ')}`;
      lines.append(line);
    } else {
      for (const r of rolls) {
        const line = document.createElement('div');
        line.textContent = resultText(r);
        if (r.success !== undefined) line.classList.add(r.success ? 'ok' : 'fail');
        lines.append(line);
      }
    }
    root.append(lines);
    if ((opts.close ?? set.diceClose) === 'ok') {
      // Stays until the player presses OK (floating at the right, above the result); a tap elsewhere does nothing.
      const ok = document.createElement('button');
      ok.className = 'dice-ok';
      ok.type = 'button';
      ok.textContent = t('dice.ok', 'OK');
      ok.style.bottom = `calc(${lines.offsetHeight + 36}px + env(safe-area-inset-bottom))`;
      ok.addEventListener('pointerdown', (e) => e.stopPropagation());
      root.append(ok);
      ok.focus({ preventScroll: true });
      await new Promise<void>((r) => ok.addEventListener('click', () => r(), { once: true }));
    } else {
      // A tap during the throw lands the dice; the next one closes the result.
      await wait(level === 'result' ? 2200 : 1600, nextTap());
    }
    root.classList.add('leaving');
    await new Promise((r) => setTimeout(r, 250));
  } finally {
    for (const c of stage.cleanup) c();
    root.remove();
  }
}

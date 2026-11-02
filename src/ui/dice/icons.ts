import { PIPS, type Stage, schedule } from '.';

/**
 * The middle level: small dice that spin in a row at the bottom of the screen and settle on what was rolled. A six
 * that splits glows as it lands and its two new dice spin in beside it.
 */

/** The inside of a die showing `face`: pips for a D6, the number for anything else. */
export function faceHtml(sides: number, face: number): string {
  // A D100 is two D10s, tens (00–90) and ones (0–9); 00 and 0 make 100.
  if (sides === 100) return `<b>${face === 100 ? '00' : face < 10 ? '00' : Math.floor(face / 10) * 10}</b><b>${face % 10}</b>`;
  if (sides !== 6) return `<b>${face}</b>`;
  return PIPS[face].map(([x, y]) => `<i style="grid-area:${y + 1}/${x + 1}"></i>`).join('');
}

export async function spinIcons(stage: Stage): Promise<void> {
  const { root, skin } = stage;
  const shown = schedule(stage.rolls);
  const tray = document.createElement('div');
  tray.className = 'dice-tray';
  tray.style.setProperty('--die-body', skin.body);
  tray.style.setProperty('--die-edge', skin.edge);
  tray.style.setProperty('--die-pip', skin.pip);
  tray.style.setProperty('--die-split', skin.split);
  root.append(tray);
  const els = shown.map((s) => {
    const el = document.createElement('span');
    el.className = `die-icon${s.die.sides === 6 ? '' : s.die.sides === 100 ? ' dn d100' : ' dn'}`;
    el.hidden = true;
    tray.append(el);
    return el;
  });
  const t0 = performance.now();
  const end = Math.max(...shown.map((s) => s.land));
  await new Promise<void>((done) => {
    const frame = (): void => {
      const now = stage.skipped() ? end : performance.now() - t0;
      shown.forEach((s, i) => {
        const el = els[i];
        if (now < s.start) return;
        el.hidden = false;
        if (now < s.land) {
          // Spinning: a new face every few frames, turning as it goes.
          el.classList.add('spin');
          if (!el.dataset.t || now - Number(el.dataset.t) > 70) {
            el.dataset.t = String(now);
            el.innerHTML = faceHtml(s.die.sides, 1 + Math.floor(Math.random() * s.die.sides));
          }
          return;
        }
        if (el.dataset.landed) return;
        el.dataset.landed = '1';
        el.classList.remove('spin');
        el.innerHTML = faceHtml(s.die.sides, s.die.face);
        if (!s.die.counts) el.classList.add('split');
      });
      if (now >= end) return done();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}

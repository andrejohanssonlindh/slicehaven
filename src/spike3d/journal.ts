import { FACETS } from '../content/people';
import type { Cares } from '../core/world3d/leads';
import type { SpikeWorld } from '../engine3d/world';
import { t } from '../i18n';
import { loadSettings } from '../ui/settings';

/**
 * The journal of leads (plan B11): what the hero knows that gives a reason to act, newest first, each with its lines
 * and where it stands. On easy it also says who might care (the design: harder settings leave that to you). The rules
 * are `core/world3d/leads.ts`; this only shows them.
 */
export interface Journal {
  /** Light up the button: a lead was added. */
  added(): void;
}

export function makeJournal(world: () => SpikeWorld): Journal {
  const el = document.getElementById('journal')!, list = el.querySelector<HTMLElement>('.list')!;
  const openBtn = document.getElementById('journal-open')!;

  const whoCares = (c: Cares): string => {
    if (c.person) return world().talking.personNamed(c.person) ?? c.person;
    const label = c.is ? FACETS[c.is]?.label ?? c.is : '';
    return t('journal.anyone', 'any {what}', { what: label.toLowerCase() });
  };

  function render(): void {
    list.replaceChildren();
    const leads = world().journal.entries;
    if (!leads.length) {
      const p = document.createElement('p');
      p.className = 'none';
      p.textContent = t('journal.none', 'Nothing yet. Look around: some things are worth asking about.');
      list.appendChild(p);
      return;
    }
    const easy = loadSettings().difficulty === 'easy';
    const statusName = { open: '', solved: t('journal.solved', 'solved'), spent: t('journal.spent', 'nothing more to learn') };
    for (const l of leads) {
      const box = document.createElement('section');
      box.className = `lead${l.status === 'open' ? '' : ' done'}`;
      const h = document.createElement('h3');
      h.textContent = t(`lead.${l.id}.title`, l.title);
      if (l.status !== 'open') {
        const s = document.createElement('span');
        s.className = 'status';
        s.textContent = `(${statusName[l.status]})`;
        h.appendChild(s);
      }
      box.appendChild(h);
      l.lines.forEach((line, i) => {
        const p = document.createElement('p');
        p.textContent = t(`lead.${l.id}.line${i}`, line);
        box.appendChild(p);
      });
      if (easy && l.status === 'open' && l.cares.length) {
        const p = document.createElement('p');
        p.className = 'cares';
        p.textContent = t('journal.cares', 'Might know more: {who}.', { who: l.cares.map(whoCares).join(', ') });
        box.appendChild(p);
      }
      list.appendChild(box);
    }
  }

  const notice = document.getElementById('notice')!;
  const close = (): void => {
    el.hidden = true;
    notice.classList.remove('above');
  };
  openBtn.addEventListener('click', () => {
    openBtn.classList.remove('new');
    render();
    el.hidden = false;
    notice.classList.add('above');
  });
  el.querySelector('.close')!.addEventListener('click', close);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !el.hidden) close(); });

  return { added: () => openBtn.classList.add('new') };
}

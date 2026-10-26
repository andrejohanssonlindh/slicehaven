/**
 * Bottom sheet over the map: a title, some text, and lists of choices. Used for
 * what you can do with a thing, conversations, skill pickers and roll results.
 * Everything is a big tappable button (phone first).
 */
export interface SheetOption {
  label: string;
  /** Second line, smaller. */
  sub?: string;
  /** Right-aligned chip, e.g. dice "3D6+2" or "locked". */
  tag?: string;
  disabled?: boolean;
  /** Styling: 'good' marks a useful choice, 'primary' the main one. */
  style?: 'good' | 'primary' | 'muted';
  onPick: () => void;
}

export interface SheetSection {
  title?: string;
  /** Starts folded away (tap the title to open). */
  folded?: boolean;
  options: SheetOption[];
}

export interface SheetContent {
  title: string;
  /** Trusted markup from our own code. */
  body?: string;
  sections: SheetSection[];
  /** Tapping outside / the × closes it (default true). */
  closable?: boolean;
}

export class Sheet {
  private onClose?: () => void;

  constructor(private root: HTMLElement) {
    root.hidden = true;
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  show(c: SheetContent, onClose?: () => void): void {
    this.onClose = onClose;
    const r = this.root;
    r.innerHTML = '';
    r.hidden = false;
    const head = el('div', 'sheet-head');
    head.appendChild(el('h2', '', c.title));
    if (c.closable !== false) {
      const x = el('button', 'sheet-x', '×') as HTMLButtonElement;
      x.type = 'button';
      x.setAttribute('aria-label', 'Close');
      x.addEventListener('click', () => this.close());
      head.appendChild(x);
    }
    r.appendChild(head);
    const scroll = el('div', 'sheet-body');
    if (c.body) {
      const b = el('div', 'sheet-text');
      b.innerHTML = c.body;
      scroll.appendChild(b);
    }
    for (const s of c.sections) {
      if (s.options.length === 0) continue;
      const sec = el('section', s.folded ? 'folded' : '');
      if (s.title) {
        const t = el('button', 'sheet-sec', s.title) as HTMLButtonElement;
        t.type = 'button';
        if (s.folded !== undefined) {
          t.classList.add('fold');
          t.addEventListener('click', () => sec.classList.toggle('folded'));
        }
        sec.appendChild(t);
      }
      const list = el('div', 'sheet-options');
      for (const o of s.options) {
        const b = el('button', `opt${o.style ? ' ' + o.style : ''}`) as HTMLButtonElement;
        b.type = 'button';
        b.disabled = !!o.disabled;
        const main = el('span', 'opt-main');
        main.appendChild(el('span', 'opt-label', o.label));
        if (o.sub) main.appendChild(el('small', 'opt-sub', o.sub));
        b.appendChild(main);
        if (o.tag) b.appendChild(el('span', 'opt-tag', o.tag));
        b.addEventListener('click', () => o.onPick());
        list.appendChild(b);
      }
      sec.appendChild(list);
      scroll.appendChild(sec);
    }
    r.appendChild(scroll);
    scroll.scrollTop = 0;
  }

  close(): void {
    if (this.root.hidden) return;
    this.root.hidden = true;
    this.root.innerHTML = '';
    const cb = this.onClose;
    this.onClose = undefined;
    cb?.();
  }
}

function el(tag: string, cls: string, text?: string): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** Escape text for use inside sheet/console markup. */
export const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

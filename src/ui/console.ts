/**
 * Expandable console at the bottom of the screen. Closed, it shows the last
 * couple of lines; tap the bar to open the whole log.
 */
export type LogTone = 'say' | 'speech' | 'roll' | 'good' | 'bad' | 'info' | 'you';

export class GameConsole {
  private lines: HTMLOListElement;
  private count: HTMLElement;
  private n = 0;

  constructor(private root: HTMLElement) {
    root.innerHTML = '<button type="button" class="console-head" aria-expanded="false">'
      + '<span>Log</span><span class="count"></span><b aria-hidden="true">▲</b></button><ol class="console-lines"></ol>';
    this.lines = root.querySelector('ol')!;
    this.count = root.querySelector('.count')!;
    const head = root.querySelector<HTMLButtonElement>('.console-head')!;
    head.addEventListener('click', () => this.toggle());
    // Tapping the closed log opens it too.
    this.lines.addEventListener('click', () => {
      if (!this.open) this.toggle();
    });
  }

  get open(): boolean {
    return this.root.classList.contains('open');
  }

  toggle(force?: boolean): void {
    const open = force ?? !this.open;
    this.root.classList.toggle('open', open);
    this.root.querySelector('.console-head')!.setAttribute('aria-expanded', String(open));
    this.root.querySelector('.console-head b')!.textContent = open ? '▼' : '▲';
    this.scroll();
  }

  /** Add a line. `html` is trusted markup from our own code. */
  add(text: string, tone: LogTone = 'say', html = false): void {
    const li = document.createElement('li');
    li.className = tone;
    if (html) li.innerHTML = text;
    else li.textContent = text;
    this.lines.appendChild(li);
    this.n++;
    this.count.textContent = `${this.n}`;
    this.scroll();
  }

  private scroll(): void {
    this.lines.scrollTop = this.lines.scrollHeight;
  }
}

/**
 * Camera: integer zoom (device pixels per art pixel) keeps pixels crisp.
 * Handles drag-to-pan, pinch, mouse wheel, and tells taps apart from drags.
 */
export class Camera {
  scale = 3;
  /** Device-pixel offset of the world origin on the screen canvas. */
  offX = 0;
  offY = 0;
  minScale = 1;
  maxScale = 12;

  private pointers = new Map<number, { x: number; y: number }>();
  private dragStart: { x: number; y: number; offX: number; offY: number } | null = null;
  private dragged = false;
  private pinchBase = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    private worldW: number,
    private worldH: number,
    private onTap: (wx: number, wy: number) => void,
  ) {
    canvas.addEventListener('pointerdown', (e) => this.down(e));
    canvas.addEventListener('pointermove', (e) => this.move(e));
    canvas.addEventListener('pointerup', (e) => this.up(e));
    canvas.addEventListener('pointercancel', (e) => this.up(e, true));
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const p = this.devicePoint(e);
      this.zoomAt(e.deltaY < 0 ? 1 : -1, p.x, p.y);
    }, { passive: false });
  }

  get dpr(): number {
    return window.devicePixelRatio || 1;
  }

  /** Resize the backing store to the element's CSS size. */
  resize(): void {
    const r = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.round(r.width * this.dpr);
    this.canvas.height = Math.round(r.height * this.dpr);
    this.clamp();
  }

  /** Largest integer zoom where the whole map width fits, centred. */
  fit(): void {
    this.resize();
    this.minScale = Math.max(1, Math.floor(Math.min(this.canvas.width / this.worldW, this.canvas.height / this.worldH)));
    // Fill the width (phones), unless that would crop more than a sliver of height.
    const byWidth = Math.floor(this.canvas.width / this.worldW);
    this.scale = Math.max(1, this.worldH * byWidth <= this.canvas.height * 1.15 ? byWidth : this.minScale);
    this.offX = (this.canvas.width - this.worldW * this.scale) / 2;
    this.offY = (this.canvas.height - this.worldH * this.scale) / 2;
    this.clamp();
  }

  zoomAt(step: number, px: number, py: number): void {
    const next = Math.min(this.maxScale, Math.max(this.minScale, this.scale + step));
    if (next === this.scale) return;
    // Keep the world point under (px, py) fixed.
    const wx = (px - this.offX) / this.scale;
    const wy = (py - this.offY) / this.scale;
    this.scale = next;
    this.offX = px - wx * next;
    this.offY = py - wy * next;
    this.clamp();
  }

  zoomCenter(step: number): void {
    this.zoomAt(step, this.canvas.width / 2, this.canvas.height / 2);
  }

  private clamp(): void {
    const w = this.worldW * this.scale;
    const h = this.worldH * this.scale;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    // Allow a little overscroll; centre when the map is smaller than the screen.
    const slack = 40 * this.dpr;
    this.offX = w <= cw ? (cw - w) / 2 : Math.min(slack, Math.max(cw - w - slack, this.offX));
    this.offY = h <= ch ? (ch - h) / 2 : Math.min(slack, Math.max(ch - h - slack, this.offY));
    this.offX = Math.round(this.offX);
    this.offY = Math.round(this.offY);
  }

  private devicePoint(e: { clientX: number; clientY: number }): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * this.dpr, y: (e.clientY - r.top) * this.dpr };
  }

  private down(e: PointerEvent): void {
    this.canvas.setPointerCapture(e.pointerId);
    const p = this.devicePoint(e);
    this.pointers.set(e.pointerId, p);
    if (this.pointers.size === 1) {
      this.dragStart = { ...p, offX: this.offX, offY: this.offY };
      this.dragged = false;
    } else if (this.pointers.size === 2) {
      this.pinchBase = this.pinchDistance();
      this.dragged = true;
    }
  }

  private move(e: PointerEvent): void {
    if (!this.pointers.has(e.pointerId)) return;
    const p = this.devicePoint(e);
    this.pointers.set(e.pointerId, p);
    if (this.pointers.size === 2) {
      const d = this.pinchDistance();
      const [a, b] = [...this.pointers.values()];
      if (d > this.pinchBase * 1.3) {
        this.zoomAt(1, (a.x + b.x) / 2, (a.y + b.y) / 2);
        this.pinchBase = d;
      } else if (d < this.pinchBase / 1.3) {
        this.zoomAt(-1, (a.x + b.x) / 2, (a.y + b.y) / 2);
        this.pinchBase = d;
      }
      return;
    }
    if (!this.dragStart) return;
    const dx = p.x - this.dragStart.x;
    const dy = p.y - this.dragStart.y;
    if (!this.dragged && Math.hypot(dx, dy) > 8 * this.dpr) this.dragged = true;
    if (this.dragged) {
      this.offX = this.dragStart.offX + dx;
      this.offY = this.dragStart.offY + dy;
      this.clamp();
    }
  }

  private up(e: PointerEvent, cancelled = false): void {
    const p = this.pointers.get(e.pointerId);
    this.pointers.delete(e.pointerId);
    if (this.pointers.size > 0) {
      // Finishing a pinch: restart drag from the remaining finger.
      const [rest] = [...this.pointers.values()];
      this.dragStart = { ...rest, offX: this.offX, offY: this.offY };
      return;
    }
    if (!cancelled && p && !this.dragged) {
      this.onTap((p.x - this.offX) / this.scale, (p.y - this.offY) / this.scale);
    }
    this.dragStart = null;
  }

  private pinchDistance(): number {
    const [a, b] = [...this.pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
}

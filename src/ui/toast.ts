let timer: number | undefined;

export function toast(message: string, ms = 1800): void {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => (el.hidden = true), ms);
}

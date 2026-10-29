import { marked } from 'marked';

/**
 * Director's Room: renders every markdown file under /director so the producer
 * can read design notes, questions and the devlog from a phone.
 * Images referenced in the notes should live in public/director-art/.
 */
const docs = import.meta.glob('/director/**/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

const ORDER = ['README', 'questions', 'devlog', 'decisions'];

function title(path: string): string {
  return path.replace('/director/', '').replace(/\.md$/, '');
}

const paths = Object.keys(docs).sort((a, b) => {
  const ia = ORDER.indexOf(title(a));
  const ib = ORDER.indexOf(title(b));
  return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b);
});

const select = document.getElementById('doc-select') as HTMLSelectElement;
const main = document.getElementById('doc') as HTMLElement;

for (const p of paths) select.add(new Option(title(p), title(p)));

function show(name: string): void {
  const path = paths.find((p) => title(p) === name) ?? paths[0];
  select.value = title(path);
  main.innerHTML = marked.parse(docs[path], { async: false });
  // Make relative .md links navigate inside the viewer.
  main.querySelectorAll<HTMLAnchorElement>('a[href$=".md"]').forEach((a) => {
    const target = new URL(a.getAttribute('href') ?? '', `https://x${path}`).pathname;
    a.href = `#${title(target)}`;
  });
  window.scrollTo(0, 0);
}

function route(): void {
  show(decodeURIComponent(location.hash.slice(1)) || 'README');
}

select.addEventListener('change', () => (location.hash = select.value));
window.addEventListener('hashchange', route);
route();

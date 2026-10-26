/**
 * Language support, groundwork only. The game is English; nothing is moved
 * into a language file yet. New text can be written as `t('scene.gate.guard.greet', 'Halt!')`:
 * the second argument is the English text, used until a language file has the key.
 * Later every string moves into `lang/en.ts`, and a translation is another file
 * with the same keys, registered in LANGS and chosen with setLang().
 */
import { en } from './lang/en';

export type Strings = Record<string, string>;

/** Registered languages. Add a file under lang/ and list it here. */
const LANGS: Record<string, Strings> = { en };

let current = 'en';

export function setLang(code: string): void {
  if (!LANGS[code]) throw new Error(`Unknown language: ${code}`);
  current = code;
}

export function getLang(): string {
  return current;
}

/**
 * Look up `key` in the current language, then English, then use `fallback`,
 * then the key itself. `{name}` placeholders are filled from `params`.
 */
export function t(key: string, fallback?: string, params?: Record<string, string | number>): string {
  const text = LANGS[current]?.[key] ?? en[key] ?? fallback ?? key;
  return params ? text.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m)) : text;
}

import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { t } from '../src/i18n';

describe('rng', () => {
  it('is deterministic per seed', () => {
    const a = Rng.fromSeed('dead forest');
    const b = Rng.fromSeed('dead forest');
    expect([a.next(), a.next(), a.int(6)]).toEqual([b.next(), b.next(), b.int(6)]);
  });
});

describe('i18n', () => {
  it('falls back to the fallback text, then the key, and fills in {params}', () => {
    expect(t('no.such.key')).toBe('no.such.key');
    expect(t('no.such.key', 'Hello')).toBe('Hello');
    expect(t('no.such.key', 'Hello {name}', { name: 'Åsa' })).toBe('Hello Åsa');
  });
});

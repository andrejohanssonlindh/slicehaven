import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { hex, hexDistance, hexKey, hexToPixel, pixelToHex, reachable } from '../src/core/hex';
import { exportSave, importSave, newSave } from '../src/core/save';
import { t } from '../src/i18n';

describe('rng', () => {
  it('is deterministic per seed', () => {
    const a = Rng.fromSeed('dead forest');
    const b = Rng.fromSeed('dead forest');
    expect([a.next(), a.next(), a.int(6)]).toEqual([b.next(), b.next(), b.int(6)]);
  });
});

describe('hex', () => {
  it('measures distance', () => {
    expect(hexDistance(hex(0, 0), hex(3, -1))).toBe(3);
  });
  it('round-trips pixel conversion', () => {
    const h = hex(2, -3);
    const p = hexToPixel(h, 24);
    expect(pixelToHex(p.x, p.y, 24)).toEqual(h);
  });
  it('finds reachable hexes around walls', () => {
    const wall = new Set([hexKey(hex(1, 0))]);
    const r = reachable(hex(0, 0), 1, (h) => !wall.has(hexKey(h)));
    expect(r.size).toBe(6); // start + 5 open neighbours
  });
});

describe('save', () => {
  it('round-trips export/import', () => {
    const s = newSave();
    s.campaign.flags['met_åsa'] = true;
    expect(importSave(exportSave(s))).toEqual(s);
  });
});

describe('i18n', () => {
  it('falls back to the fallback text, then the key, and fills in {params}', () => {
    expect(t('no.such.key')).toBe('no.such.key');
    expect(t('no.such.key', 'Hello')).toBe('Hello');
    expect(t('no.such.key', 'Hello {name}', { name: 'Åsa' })).toBe('Hello Åsa');
  });
});

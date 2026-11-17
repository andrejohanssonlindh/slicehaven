import { describe, expect, it } from 'vitest';
import { HERO_PERSON, heroPerson } from '../src/content/spike3d';

describe("the hero's body from the creator", () => {
  it('is their people, their sex if the gender field says one, a tirak their size; the shepherd stays the shepherd', () => {
    expect(heroPerson({ name: 'Shepherd', from: 'Default shepherd', kind: 'human' })).toBe(HERO_PERSON);
    expect(heroPerson({ name: 'Nobody' })).toBe(HERO_PERSON);
    const dwarf = heroPerson({ name: 'Brokk', kind: 'dwarf', people: 'x', gender: 'Female' });
    expect(dwarf.is[0]).toBe('dwarf');
    expect(dwarf.look?.sex).toBe('f');
    expect(heroPerson({ name: 'Ugg', kind: 'tirak', people: 'bazirk-trukher', gender: 'man' }).look).toEqual({ sex: 'm', size: 'trukher' });
    // The same name gives the same body.
    expect(heroPerson({ name: 'Ilse', kind: 'elf' })).toEqual(heroPerson({ name: 'Ilse', kind: 'elf' }));
  });
});

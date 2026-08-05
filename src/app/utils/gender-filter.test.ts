/**
 * Gender scoping for `/new` and `/sale`.
 *
 * This logic used to live inside both page components and ran on the server,
 * which is what forced those routes to `force-dynamic`. Moving it here (pure,
 * client-side) let both routes go back to ISR — so these tests guard the
 * behaviour the move had to preserve exactly.
 */
import { describe, expect, it } from 'vitest';
import { genderFilterFromQuery, matchesGender } from './gender-filter';

describe('genderFilterFromQuery', () => {
  it('maps the header switch values to OE taxonomy tags', () => {
    expect(genderFilterFromQuery('women')).toBe('W');
    expect(genderFilterFromQuery('men')).toBe('M');
  });

  it.each([
    ['missing param', null],
    ['undefined', undefined],
    ['empty string', ''],
    ['unknown value', 'unisex'],
    ['wrong case', 'Women'],
  ])('returns null (show all) for %s', (_label, input) => {
    expect(genderFilterFromQuery(input)).toBeNull();
  });
});

describe('matchesGender', () => {
  it('shows everything when no scope is active', () => {
    for (const tag of ['W', 'M', 'U', '', undefined] as const) {
      expect(matchesGender(tag, null)).toBe(true);
    }
  });

  it('shows unisex products in both feeds', () => {
    expect(matchesGender('U', 'W')).toBe(true);
    expect(matchesGender('U', 'M')).toBe(true);
  });

  it('matches the active scope', () => {
    expect(matchesGender('W', 'W')).toBe(true);
    expect(matchesGender('M', 'M')).toBe(true);
  });

  it('hides the opposite gender', () => {
    expect(matchesGender('M', 'W')).toBe(false);
    expect(matchesGender('W', 'M')).toBe(false);
  });

  it('hides untagged products while a scope is active', () => {
    // The adapter already falls back to the OE category path before leaving
    // `gender` empty, so an empty tag really means "no gender info anywhere".
    expect(matchesGender('', 'W')).toBe(false);
    expect(matchesGender(undefined, 'M')).toBe(false);
  });
});

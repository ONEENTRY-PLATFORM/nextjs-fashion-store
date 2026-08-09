import { describe, expect, it } from 'vitest';

import { dictMarkers, mergeDict, snakeKey } from '@/lib/oneentry/labels/dict';

describe('snakeKey — code key → OE marker suffix', () => {
  it('splits camelCase', () => {
    expect(snakeKey('useDifferentAddress')).toBe('use_different_address');
  });

  it('keeps an all-caps run together, splitting only before the next word', () => {
    expect(snakeKey('ctaSMS')).toBe('cta_sms');
    expect(snakeKey('SMSLabel')).toBe('sms_label');
  });

  it('leaves digits attached to their word', () => {
    expect(snakeKey('support2Title')).toBe('support2_title');
  });

  it('passes an already-snake key through', () => {
    expect(snakeKey('already_snake')).toBe('already_snake');
  });
});

describe('mergeDict', () => {
  const fallbacks = {
    title: 'Local title',
    ctaSend: 'Send',
    /** Structure, not copy — must survive untouched. */
    sizes: ['S', 'M', 'L'],
  } as const;

  it('returns the fallbacks unchanged when the set is missing', () => {
    expect(mergeDict(undefined, 'p_', fallbacks)).toBe(fallbacks);
  });

  it('overrides a string when the admin panel has a value', () => {
    const out = mergeDict({ p_title: 'CMS title' }, 'p_', fallbacks);
    expect(out.title).toBe('CMS title');
    expect(out.ctaSend).toBe('Send');
  });

  it('ignores blank admin values so an empty attribute is not published', () => {
    const out = mergeDict({ p_title: '' }, 'p_', fallbacks);
    expect(out.title).toBe('Local title');
  });

  it('never touches non-string entries', () => {
    const out = mergeDict({ p_sizes: 'XS' }, 'p_', fallbacks);
    expect(out.sizes).toEqual(['S', 'M', 'L']);
  });

  it('keeps object identity when nothing differs, so downstream memos do not churn', () => {
    expect(mergeDict({ p_title: 'Local title' }, 'p_', fallbacks)).toBe(fallbacks);
    expect(mergeDict({ unrelated: 'x' }, 'p_', fallbacks)).toBe(fallbacks);
  });

  it('scopes lookups by prefix', () => {
    const out = mergeDict({ other_title: 'Wrong set' }, 'p_', fallbacks);
    expect(out.title).toBe('Local title');
  });
});

describe('dictMarkers', () => {
  it('lists exactly the markers mergeDict would read', () => {
    expect(dictMarkers('checkout_delivery_', { useDifferentAddress: 'x', rows: [1, 2] })).toEqual([
      'checkout_delivery_use_different_address',
    ]);
  });
});

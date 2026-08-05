import { describe, it, expect } from 'vitest';
import {
  getCmsProductId,
  extractCmsProductId,
  getPlaygroundProductId,
} from '../../data/cms-product-id-map';

describe('getCmsProductId', () => {
  it('converts a numeric string to a number', () => {
    expect(getCmsProductId('1')).toBe(1);
    expect(getCmsProductId('42')).toBe(42);
    expect(getCmsProductId('100')).toBe(100);
  });

  it('returns null for non-numeric strings', () => {
    expect(getCmsProductId('abc')).toBeNull();
    expect(getCmsProductId('wc-1')).toBeNull();
    expect(getCmsProductId('mc-2')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(getCmsProductId('')).toBeNull();
  });

  it('returns null for strings with leading/trailing whitespace or decimals', () => {
    expect(getCmsProductId(' 5')).toBeNull();
    expect(getCmsProductId('5 ')).toBeNull();
    expect(getCmsProductId('1.5')).toBeNull();
  });
});

describe('extractCmsProductId', () => {
  it('extracts numeric prefix from a plain numeric string', () => {
    expect(extractCmsProductId('9054')).toBe(9054);
  });

  it('extracts numeric prefix when -fav suffix is appended', () => {
    expect(extractCmsProductId('9054-fav')).toBe(9054);
  });

  it('extracts numeric prefix when -quick suffix is appended', () => {
    expect(extractCmsProductId('9054-quick')).toBe(9054);
  });

  it('extracts numeric prefix when -auto suffix is appended', () => {
    expect(extractCmsProductId('9054-auto')).toBe(9054);
  });

  it('extracts numeric prefix when -item-N suffix is appended', () => {
    expect(extractCmsProductId('9054-item-3')).toBe(9054);
  });

  it('extracts numeric prefix when a bundle id suffix is appended', () => {
    expect(extractCmsProductId('9054-bundle-xyz')).toBe(9054);
  });

  it('returns null when the leading token is not numeric (wc-16)', () => {
    expect(extractCmsProductId('wc-16')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(extractCmsProductId('')).toBeNull();
  });

  it('extracts the leading numeric prefix even when digits and letters are adjacent', () => {
    // "9054abc" — leading digits win
    expect(extractCmsProductId('9054abc')).toBe(9054);
  });
});

describe('getCmsProductId — still requires a fully-numeric id', () => {
  it('returns null for a suffixed id that extractCmsProductId accepts', () => {
    expect(getCmsProductId('9054-fav')).toBeNull();
  });

  it('returns null for a wc-prefixed id', () => {
    expect(getCmsProductId('wc-16')).toBeNull();
  });

  it('still returns a number for a plain numeric string', () => {
    expect(getCmsProductId('9054')).toBe(9054);
  });
});

describe('getPlaygroundProductId', () => {
  it('converts a finite integer to a string', () => {
    expect(getPlaygroundProductId(1)).toBe('1');
    expect(getPlaygroundProductId(99)).toBe('99');
  });

  it('converts any finite float to a string', () => {
    expect(getPlaygroundProductId(1.5)).toBe('1.5');
  });

  it('returns null for NaN', () => {
    expect(getPlaygroundProductId(NaN)).toBeNull();
  });

  it('returns null for positive and negative Infinity', () => {
    expect(getPlaygroundProductId(Infinity)).toBeNull();
    expect(getPlaygroundProductId(-Infinity)).toBeNull();
  });
});

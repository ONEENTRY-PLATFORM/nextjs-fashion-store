import { describe, it, expect } from 'vitest';
import {
  getCmsProductId,
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

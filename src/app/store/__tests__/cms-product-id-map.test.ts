import { describe, it, expect } from 'vitest';
import {
  CMS_PRODUCT_ID_MAP,
  REVERSE_CMS_PRODUCT_ID_MAP,
  getCmsProductId,
  getPlaygroundProductId,
} from '../../data/cms-product-id-map';

describe('cms-product-id-map', () => {
  it('contains exactly 25 entries (one per seed-demo-prod-*)', () => {
    expect(Object.keys(CMS_PRODUCT_ID_MAP).length).toBe(25);
  });

  it('values are unique Platform product ids', () => {
    const values = Object.values(CMS_PRODUCT_ID_MAP);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
    expect(values.every((v) => Number.isInteger(v) && v >= 1)).toBe(true);
  });

  it('getCmsProductId resolves known playground ids', () => {
    expect(getCmsProductId('wc-1')).toBe(1);
    expect(getCmsProductId('mc-2')).toBe(7);
  });

  it('getCmsProductId returns null for unknown ids', () => {
    expect(getCmsProductId('does-not-exist')).toBeNull();
    expect(getCmsProductId('')).toBeNull();
  });

  it('reverse map is consistent', () => {
    Object.entries(CMS_PRODUCT_ID_MAP).forEach(([playgroundId, cmsId]) => {
      expect(REVERSE_CMS_PRODUCT_ID_MAP[cmsId]).toBe(playgroundId);
    });
  });

  it('getPlaygroundProductId resolves known Platform ids', () => {
    expect(getPlaygroundProductId(1)).toBe('wc-1');
    expect(getPlaygroundProductId(25)).toBe('wb-9');
  });

  it('getPlaygroundProductId returns null for unknown Platform ids', () => {
    expect(getPlaygroundProductId(9999)).toBeNull();
  });
});

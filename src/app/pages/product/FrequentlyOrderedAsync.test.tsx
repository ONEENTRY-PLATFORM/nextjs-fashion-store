import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

// ---- Mock the data loader ---------------------------------------------------
const loadFrequentlyOrderedBlock = vi.fn();
vi.mock('../../../lib/oneentry/blocks/page-blocks', () => ({
  loadFrequentlyOrderedBlock,
}));

// ---- Mock the client component (brings in hooks / context) -----------------
vi.mock('./FrequentlyOrderedClient', () => ({
  FrequentlyOrderedClient: (props: Record<string, unknown>) =>
    React.createElement('div', { 'data-testid': 'fo-client', ...props }),
}));

// Helper: build a minimal Product fixture
const makeProduct = (
  id: string,
  gender?: 'W' | 'M' | 'U' | '',
) => ({
  id,
  name: `Product ${id}`,
  price: '10.00',
  image: '/img.jpg',
  colors: [],
  gender,
});

const importFresh = async () => {
  vi.resetModules();
  return import('./FrequentlyOrderedAsync');
};

beforeEach(() => {
  loadFrequentlyOrderedBlock.mockReset();
});

describe('FrequentlyOrderedAsync — null cases', () => {
  it('returns null when loadFrequentlyOrderedBlock returns null', async () => {
    loadFrequentlyOrderedBlock.mockResolvedValue(null);
    const { FrequentlyOrderedAsync } = await importFresh();
    const result = await FrequentlyOrderedAsync({
      productId: 1,
      categoryViewAllHref: '/catalog',
    });
    expect(result).toBeNull();
  });

  it('returns null when the block has no products', async () => {
    loadFrequentlyOrderedBlock.mockResolvedValue({ products: [], title: 'FO' });
    const { FrequentlyOrderedAsync } = await importFresh();
    const result = await FrequentlyOrderedAsync({
      productId: 1,
      categoryViewAllHref: '/catalog',
    });
    expect(result).toBeNull();
  });

  it('returns null when all products are filtered out by gender', async () => {
    loadFrequentlyOrderedBlock.mockResolvedValue({
      products: [makeProduct('10', 'M'), makeProduct('11', 'M')],
      title: 'FO',
    });
    const { FrequentlyOrderedAsync } = await importFresh();
    const result = await FrequentlyOrderedAsync({
      productId: 1,
      categoryViewAllHref: '/catalog',
      productGender: 'W',
    });
    expect(result).toBeNull();
  });

  it('renders (not null) when duplicates reduce to one unique product', async () => {
    loadFrequentlyOrderedBlock.mockResolvedValue({
      products: [makeProduct('42'), makeProduct('42'), makeProduct('42')],
      title: 'FO',
    });
    const { FrequentlyOrderedAsync } = await importFresh();
    const result = await FrequentlyOrderedAsync({
      productId: 1,
      categoryViewAllHref: '/catalog',
    });
    // Three copies of id '42' dedupe to one unique product — still renders.
    expect(result).not.toBeNull();
    const props = (result as import('react').ReactElement).props as { products: Array<{ id: string }> };
    expect(props.products.map((p) => p.id)).toEqual(['42']);
  });
});

describe('FrequentlyOrderedAsync — gender filter', () => {
  it('passes through products matching productGender', async () => {
    loadFrequentlyOrderedBlock.mockResolvedValue({
      products: [makeProduct('1', 'W'), makeProduct('2', 'M'), makeProduct('3', 'W')],
      title: 'FO',
    });
    const { FrequentlyOrderedAsync } = await importFresh();
    const result = await FrequentlyOrderedAsync({
      productId: 99,
      categoryViewAllHref: '/catalog',
      productGender: 'W',
    });
    expect(result).not.toBeNull();
    // The rendered element's products prop should contain only W products
    const props = (result as React.ReactElement).props as { products: Array<{ id: string }> };
    expect(props.products.map((p) => p.id)).toEqual(['1', '3']);
  });

  it('passes through unisex products regardless of productGender', async () => {
    loadFrequentlyOrderedBlock.mockResolvedValue({
      products: [makeProduct('5', 'U'), makeProduct('6', 'M')],
      title: 'FO',
    });
    const { FrequentlyOrderedAsync } = await importFresh();
    const result = await FrequentlyOrderedAsync({
      productId: 99,
      categoryViewAllHref: '/catalog',
      productGender: 'W',
    });
    expect(result).not.toBeNull();
    const props = (result as React.ReactElement).props as { products: Array<{ id: string }> };
    expect(props.products.map((p) => p.id)).toEqual(['5']);
  });

  it('passes through products with no gender tag regardless of productGender', async () => {
    loadFrequentlyOrderedBlock.mockResolvedValue({
      products: [makeProduct('7', ''), makeProduct('8', 'M')],
      title: 'FO',
    });
    const { FrequentlyOrderedAsync } = await importFresh();
    const result = await FrequentlyOrderedAsync({
      productId: 99,
      categoryViewAllHref: '/catalog',
      productGender: 'W',
    });
    expect(result).not.toBeNull();
    const props = (result as React.ReactElement).props as { products: Array<{ id: string }> };
    expect(props.products.map((p) => p.id)).toEqual(['7']);
  });

  it('skips gender filter entirely when productGender is omitted', async () => {
    loadFrequentlyOrderedBlock.mockResolvedValue({
      products: [makeProduct('10', 'W'), makeProduct('11', 'M'), makeProduct('12', 'U')],
      title: 'FO',
    });
    const { FrequentlyOrderedAsync } = await importFresh();
    const result = await FrequentlyOrderedAsync({
      productId: 99,
      categoryViewAllHref: '/catalog',
      // productGender intentionally omitted
    });
    expect(result).not.toBeNull();
    const props = (result as React.ReactElement).props as { products: Array<{ id: string }> };
    expect(props.products.map((p) => p.id)).toEqual(['10', '11', '12']);
  });

  it('skips gender filter when productGender is "U" (caller is unisex)', async () => {
    loadFrequentlyOrderedBlock.mockResolvedValue({
      products: [makeProduct('20', 'W'), makeProduct('21', 'M')],
      title: 'FO',
    });
    const { FrequentlyOrderedAsync } = await importFresh();
    const result = await FrequentlyOrderedAsync({
      productId: 99,
      categoryViewAllHref: '/catalog',
      productGender: 'U',
    });
    expect(result).not.toBeNull();
    const props = (result as React.ReactElement).props as { products: Array<{ id: string }> };
    // productGender === 'U' means genderOk is always true
    expect(props.products.map((p) => p.id)).toEqual(['20', '21']);
  });
});

describe('FrequentlyOrderedAsync — deduplication', () => {
  it('removes duplicate ids, preserving first occurrence', async () => {
    loadFrequentlyOrderedBlock.mockResolvedValue({
      products: [
        makeProduct('30'),
        makeProduct('31'),
        makeProduct('30'), // duplicate
        makeProduct('32'),
        makeProduct('31'), // duplicate
      ],
      title: 'FO',
    });
    const { FrequentlyOrderedAsync } = await importFresh();
    const result = await FrequentlyOrderedAsync({
      productId: 99,
      categoryViewAllHref: '/catalog',
    });
    expect(result).not.toBeNull();
    const props = (result as React.ReactElement).props as { products: Array<{ id: string }> };
    expect(props.products.map((p) => p.id)).toEqual(['30', '31', '32']);
  });

  it('returns null when deduplication leaves zero products after gender filter', async () => {
    // Two entries of same male product on a women PDP — filtered AND deduped to zero
    loadFrequentlyOrderedBlock.mockResolvedValue({
      products: [makeProduct('40', 'M'), makeProduct('40', 'M')],
      title: 'FO',
    });
    const { FrequentlyOrderedAsync } = await importFresh();
    const result = await FrequentlyOrderedAsync({
      productId: 99,
      categoryViewAllHref: '/catalog',
      productGender: 'W',
    });
    expect(result).toBeNull();
  });
});

describe('FrequentlyOrderedAsync — JSX props forwarding', () => {
  it('forwards title and categoryViewAllHref to FrequentlyOrderedClient', async () => {
    loadFrequentlyOrderedBlock.mockResolvedValue({
      products: [makeProduct('50', 'W')],
      title: 'You May Also Like',
    });
    const { FrequentlyOrderedAsync } = await importFresh();
    const result = await FrequentlyOrderedAsync({
      productId: 1,
      categoryViewAllHref: '/women/coats',
      productGender: 'W',
    });
    expect(result).not.toBeNull();
    const props = (result as React.ReactElement).props as {
      title?: string;
      categoryViewAllHref: string;
    };
    expect(props.title).toBe('You May Also Like');
    expect(props.categoryViewAllHref).toBe('/women/coats');
  });

  it('passes title as undefined when block.title is an empty string', async () => {
    loadFrequentlyOrderedBlock.mockResolvedValue({
      products: [makeProduct('60')],
      title: '',
    });
    const { FrequentlyOrderedAsync } = await importFresh();
    const result = await FrequentlyOrderedAsync({
      productId: 1,
      categoryViewAllHref: '/catalog',
    });
    expect(result).not.toBeNull();
    const props = (result as React.ReactElement).props as { title?: string };
    // `block.title || undefined` coerces '' → undefined
    expect(props.title).toBeUndefined();
  });
});

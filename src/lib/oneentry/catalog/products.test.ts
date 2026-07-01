import { beforeEach, describe, expect, it, vi } from 'vitest';

const getProducts = vi.fn();

vi.mock('../index', () => ({
  oneentry: { Products: { getProducts } },
  isOneEntryEnabled: true,
}));

const importFresh = async () => {
  vi.resetModules();
  return import('./products');
};

beforeEach(() => { getProducts.mockReset(); });

describe('loadProducts', () => {
  it('normalises raw OneEntry product into CatalogProduct shape', async () => {
    getProducts.mockResolvedValue({
      total: 1,
      items: [
        {
          id: 42,
          identifier: 'wc-1',
          statusIdentifier: 'in_stock',
          price: 199.99,
          localizeInfos: { en_US: { title: 'Black T-shirt' } },
          attributeValues: {
            en_US: {
              sku_id2: { value: 'WC-1' },
              image_id3: [{ downloadLink: 'https://cdn/p.jpg' }],
            },
          },
        },
      ],
    });
    const { loadProducts } = await importFresh();
    const result = await loadProducts({ limit: 10 });
    expect(result.fromCms).toBe(true);
    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      id: 42,
      identifier: 'wc-1',
      title: 'Black T-shirt',
      statusIdentifier: 'in_stock',
      price: 199.99,
      sku: 'WC-1',
      preview: 'https://cdn/p.jpg',
    });
  });

  it('returns fromCms:false when SDK throws (e.g. 403)', async () => {
    getProducts.mockRejectedValue(new Error('forbidden'));
    const { loadProducts } = await importFresh();
    const result = await loadProducts();
    expect(result).toEqual({ total: 0, items: [], fromCms: false });
  });

  it('returns fromCms:false when SDK returns null items', async () => {
    getProducts.mockResolvedValue(null);
    const { loadProducts } = await importFresh();
    const result = await loadProducts();
    expect(result.fromCms).toBe(false);
  });
});

describe('loadProducts — disabled', () => {
  it('returns fromCms:false when SDK is disabled', async () => {
    vi.resetModules();
    vi.doMock('../index', () => ({ oneentry: null, isOneEntryEnabled: false }));
    const { loadProducts } = await import('./products');
    const result = await loadProducts();
    expect(result.fromCms).toBe(false);
    vi.doUnmock('../index');
  });
});

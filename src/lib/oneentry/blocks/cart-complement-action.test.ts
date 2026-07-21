import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---- SDK-level mocks --------------------------------------------------------
// vi.mock factories are hoisted to the top of the file, so they cannot close
// over module-scope `const` variables — use `vi.fn()` inline and grab refs
// via `vi.mocked()` after importing the real subjects.
vi.mock('../index', () => ({
  isOneEntryEnabled: true,
  getUserApi: vi.fn(),
  getGuestApi: vi.fn(),
  isError: (v: unknown) =>
    !!v && typeof v === 'object' && 'statusCode' in (v as Record<string, unknown>),
}));

vi.mock('../auth/session', () => ({
  readAccessOrRefresh: vi.fn(),
}));

vi.mock('../catalog/products', () => ({
  loadProducts: vi.fn(),
}));

vi.mock('../catalog/adapt', () => ({
  adaptCatalogProductToUiProduct: vi.fn(),
}));

// ---- Import subjects AFTER mocks are declared --------------------------------
import * as oeIndex from '../index';
import * as session from '../auth/session';
import * as products from '../catalog/products';
import * as adapt from '../catalog/adapt';
import { loadCartComplementProductsAction } from './cart-complement-action';

const getUserApi = vi.mocked(oeIndex.getUserApi);
const getGuestApi = vi.mocked(oeIndex.getGuestApi);
const readAccessOrRefresh = vi.mocked(session.readAccessOrRefresh);
const loadProducts = vi.mocked(products.loadProducts);
const adaptCatalogProductToUiProduct = vi.mocked(adapt.adaptCatalogProductToUiProduct);

// ---- Shared fake API instances ----------------------------------------------
// Both getUserApi and getGuestApi return objects whose `Blocks.getCartComplement`
// spy we can control per-test.
const getCartComplement = vi.fn();
const fakeApi = { Blocks: { getCartComplement } };

// ---- Helpers ----------------------------------------------------------------
const uiProduct = (id: number) => ({ id: String(id), name: 'ui' });
const sdkProduct = (id: number) => ({ id, title: `Product ${id}` });

beforeEach(() => {
  getUserApi.mockReset();
  getGuestApi.mockReset();
  readAccessOrRefresh.mockReset();
  loadProducts.mockReset();
  adaptCatalogProductToUiProduct.mockReset();
  getCartComplement.mockReset();
  // Wire both factory fns to return the same fakeApi by default.
  getUserApi.mockReturnValue(fakeApi as unknown as oeIndex.OneEntryClient);
  getGuestApi.mockReturnValue(fakeApi as unknown as oeIndex.OneEntryClient);
});

// =============================================================================

describe('loadCartComplementProductsAction — guard clauses', () => {
  it('returns [] and skips everything when marker is empty string', async () => {
    const result = await loadCartComplementProductsAction('');
    expect(result).toEqual([]);
    expect(readAccessOrRefresh).not.toHaveBeenCalled();
    expect(getCartComplement).not.toHaveBeenCalled();
  });

  it('returns [] and skips SDK when no access token AND no guestId', async () => {
    readAccessOrRefresh.mockResolvedValue(null);
    const result = await loadCartComplementProductsAction('some_marker');
    expect(result).toEqual([]);
    expect(getUserApi).not.toHaveBeenCalled();
    expect(getGuestApi).not.toHaveBeenCalled();
    expect(getCartComplement).not.toHaveBeenCalled();
  });
});

// =============================================================================

describe('loadCartComplementProductsAction — happy paths', () => {
  it('uses getUserApi when access token is present and returns mapped products', async () => {
    readAccessOrRefresh.mockResolvedValue('bearer-token');
    getCartComplement.mockResolvedValue({ items: [{ id: 10 }, { id: 20 }] });
    loadProducts.mockResolvedValue({
      total: 2,
      items: [sdkProduct(10), sdkProduct(20)],
      fromCms: true,
    });
    adaptCatalogProductToUiProduct.mockImplementation((p: { id: number }) => uiProduct(p.id));

    const result = await loadCartComplementProductsAction('cross_sell_block', undefined, 'en_US');

    expect(getUserApi).toHaveBeenCalledWith('bearer-token');
    expect(getGuestApi).not.toHaveBeenCalled();
    expect(getCartComplement).toHaveBeenCalledWith('cross_sell_block', 'en_US');
    expect(loadProducts).toHaveBeenCalledWith({ ids: [10, 20], limit: 2 });
    expect(result).toEqual([uiProduct(10), uiProduct(20)]);
  });

  it('uses getGuestApi (not getUserApi) when access token is null but guestId is provided', async () => {
    readAccessOrRefresh.mockResolvedValue(null);
    getCartComplement.mockResolvedValue({ items: [{ id: 55 }] });
    loadProducts.mockResolvedValue({
      total: 1,
      items: [sdkProduct(55)],
      fromCms: true,
    });
    adaptCatalogProductToUiProduct.mockImplementation((p: { id: number }) => uiProduct(p.id));

    const result = await loadCartComplementProductsAction('cross_sell_block', 'guest-abc', 'en_US');

    expect(getUserApi).not.toHaveBeenCalled();
    expect(getGuestApi).toHaveBeenCalledWith('guest-abc');
    expect(getCartComplement).toHaveBeenCalledWith('cross_sell_block', 'en_US');
    expect(result).toEqual([uiProduct(55)]);
  });

  it('normalizes a bare array response (not { items }) from the SDK', async () => {
    readAccessOrRefresh.mockResolvedValue('token');
    // SDK may return a plain array rather than the `{ items: [...] }` envelope.
    getCartComplement.mockResolvedValue([{ id: 77 }, { id: 88 }]);
    loadProducts.mockResolvedValue({
      total: 2,
      items: [sdkProduct(77), sdkProduct(88)],
      fromCms: true,
    });
    adaptCatalogProductToUiProduct.mockImplementation((p: { id: number }) => uiProduct(p.id));

    const result = await loadCartComplementProductsAction('cross_sell_block');

    expect(loadProducts).toHaveBeenCalledWith({ ids: [77, 88], limit: 2 });
    expect(result).toEqual([uiProduct(77), uiProduct(88)]);
  });
});

// =============================================================================

describe('loadCartComplementProductsAction — error / empty paths', () => {
  it('returns [] when SDK returns an IError (statusCode present)', async () => {
    readAccessOrRefresh.mockResolvedValue('token');
    getCartComplement.mockResolvedValue({ statusCode: 500, message: 'Server error' });

    const result = await loadCartComplementProductsAction('cross_sell_block');

    expect(result).toEqual([]);
    expect(loadProducts).not.toHaveBeenCalled();
  });

  it('returns [] when SDK returns { items: [] } (no products to fetch)', async () => {
    readAccessOrRefresh.mockResolvedValue('token');
    getCartComplement.mockResolvedValue({ items: [] });

    const result = await loadCartComplementProductsAction('cross_sell_block');

    expect(result).toEqual([]);
    expect(loadProducts).not.toHaveBeenCalled();
  });
});

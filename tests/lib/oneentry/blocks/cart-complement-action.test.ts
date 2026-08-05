import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---- SDK-level mocks --------------------------------------------------------
// vi.mock factories are hoisted to the top of the file, so they cannot close
// over module-scope `const` variables — use `vi.fn()` inline and grab refs
// via `vi.mocked()` after importing the real subjects.
vi.mock('@/lib/oneentry/index', async (importActual) => ({
  ...(await importActual<typeof import('@/lib/oneentry/index')>()),
  isOneEntryEnabled: true,
  getApiSafe: vi.fn(),
  hasStoredSession: vi.fn(),
}));

vi.mock('@/lib/oneentry/catalog/products-action', () => ({
  getProductsByIdsAction: vi.fn(),
}));

// ---- Import subjects AFTER mocks are declared --------------------------------
import * as oeIndex from '@/lib/oneentry/index';
import * as productsAction from '@/lib/oneentry/catalog/products-action';
import { loadCartComplementProductsAction } from '@/lib/oneentry/blocks/cart-complement-action';

const getApiSafe = vi.mocked(oeIndex.getApiSafe);
const hasStoredSession = vi.mocked(oeIndex.hasStoredSession);
const getProductsByIdsAction = vi.mocked(productsAction.getProductsByIdsAction);

// ---- Shared fake SDK instance ------------------------------------------------
const getCartComplement = vi.fn();
const setGuestId = vi.fn();
const fakeApi = { Blocks: { getCartComplement, setGuestId } };

// ---- Helpers ----------------------------------------------------------------
const uiProduct = (id: number) => ({ id: String(id), name: 'ui' });

beforeEach(() => {
  getApiSafe.mockReset();
  hasStoredSession.mockReset();
  getProductsByIdsAction.mockReset();
  getCartComplement.mockReset();
  setGuestId.mockReset();
  getApiSafe.mockReturnValue(fakeApi as unknown as oeIndex.OneEntryClient);
  hasStoredSession.mockReturnValue(false);
});

// =============================================================================

describe('loadCartComplementProductsAction — guard clauses', () => {
  it('returns [] and skips everything when marker is empty string', async () => {
    const result = await loadCartComplementProductsAction('');
    expect(result).toEqual([]);
    expect(getCartComplement).not.toHaveBeenCalled();
  });

  it('returns [] when the SDK is not configured', async () => {
    getApiSafe.mockReturnValue(null);
    const result = await loadCartComplementProductsAction('some_marker');
    expect(result).toEqual([]);
    expect(getCartComplement).not.toHaveBeenCalled();
  });
});

// =============================================================================

describe('loadCartComplementProductsAction — visitor context', () => {
  it('does not touch the guest id when the shopper is signed in', async () => {
    hasStoredSession.mockReturnValue(true);
    getCartComplement.mockResolvedValue({ items: [{ id: 10 }, { id: 20 }] });
    getProductsByIdsAction.mockResolvedValue([uiProduct(10), uiProduct(20)] as never);

    const result = await loadCartComplementProductsAction('cross_sell_block', 'guest-abc', 'en_US');

    expect(setGuestId).not.toHaveBeenCalled();
    expect(getCartComplement).toHaveBeenCalledWith('cross_sell_block', 'en_US');
    expect(getProductsByIdsAction).toHaveBeenCalledWith([10, 20]);
    expect(result).toEqual([uiProduct(10), uiProduct(20)]);
  });

  it('installs the guest id on the instance for anonymous visitors', async () => {
    getCartComplement.mockResolvedValue({ items: [{ id: 55 }] });
    getProductsByIdsAction.mockResolvedValue([uiProduct(55)] as never);

    const result = await loadCartComplementProductsAction('cross_sell_block', 'guest-abc', 'en_US');

    expect(setGuestId).toHaveBeenCalledWith('guest-abc');
    expect(result).toEqual([uiProduct(55)]);
  });

  it('normalizes a bare array response (not { items }) from the SDK', async () => {
    hasStoredSession.mockReturnValue(true);
    // SDK may return a plain array rather than the `{ items: [...] }` envelope.
    getCartComplement.mockResolvedValue([{ id: 77 }, { id: 88 }]);
    getProductsByIdsAction.mockResolvedValue([uiProduct(77), uiProduct(88)] as never);

    const result = await loadCartComplementProductsAction('cross_sell_block');

    expect(getProductsByIdsAction).toHaveBeenCalledWith([77, 88]);
    expect(result).toEqual([uiProduct(77), uiProduct(88)]);
  });
});

// =============================================================================

describe('loadCartComplementProductsAction — error / empty paths', () => {
  it('returns [] when SDK returns an IError (statusCode present)', async () => {
    hasStoredSession.mockReturnValue(true);
    getCartComplement.mockResolvedValue({ statusCode: 500, message: 'Server error' });

    const result = await loadCartComplementProductsAction('cross_sell_block');

    expect(result).toEqual([]);
    expect(getProductsByIdsAction).not.toHaveBeenCalled();
  });

  it('returns [] when SDK returns { items: [] } (no products to fetch)', async () => {
    hasStoredSession.mockReturnValue(true);
    getCartComplement.mockResolvedValue({ items: [] });

    const result = await loadCartComplementProductsAction('cross_sell_block');

    expect(result).toEqual([]);
    expect(getProductsByIdsAction).not.toHaveBeenCalled();
  });
});

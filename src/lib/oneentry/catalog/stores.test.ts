/**
 * Unit tests for the `normalize()` logic inside stores.ts.
 *
 * `normalize` is not exported directly, so we test it through `loadStores`
 * by controlling the SDK mock return value — the same pattern used in
 * products.test.ts and pages.test.ts.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---- SDK mock ---------------------------------------------------------------
const getChildPagesByParentUrl = vi.fn();
const fakeApi = {
  Pages: { getChildPagesByParentUrl },
};

vi.mock('../index', () => ({
  oneentry: fakeApi,
  isOneEntryEnabled: true,
  isError: (v: unknown) =>
    !!v && typeof v === 'object' && 'statusCode' in (v as Record<string, unknown>),
}));

// Strip the ISR cache wrapper so the underlying function runs directly.
vi.mock('next/cache', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  unstable_cache: (fn: any) => fn,
}));

// `loadStores` also imports MOCK_STORES from app/data/stores — keep as-is.
// The profiling wrapper is transparent to our assertions.
vi.mock('../../profiling', () => ({
  withTiming: (_label: string, fn: unknown) => fn,
}));

const importFresh = async () => {
  vi.resetModules();
  return import('./stores');
};

beforeEach(() => {
  getChildPagesByParentUrl.mockReset();
});

// ---------------------------------------------------------------------------
// Minimal RawPage factory
// ---------------------------------------------------------------------------
const makeRawPage = (overrides: {
  id: number;
  pageUrl?: string;
  position?: number;
  localizeInfos?: Record<string, unknown>;
  attributeValues?: Record<string, { value?: unknown }>;
}) => ({
  position: 0,
  localizeInfos: { title: 'Test Store' },
  attributeValues: {},
  ...overrides,
});

// ---------------------------------------------------------------------------
describe('normalize — oeId mapping', () => {
  it('sets oeId to raw.id from the OE page', async () => {
    getChildPagesByParentUrl.mockResolvedValue([
      makeRawPage({
        id: 169,
        pageUrl: 'oxford_street',
        localizeInfos: { title: 'Oxford Street Flagship' },
        attributeValues: {},
      }),
    ]);

    const { loadStores } = await importFresh();
    const stores = await loadStores('en_US');

    expect(stores[0].oeId).toBe(169);
  });

  it('uses pageUrl as the string id field when present', async () => {
    getChildPagesByParentUrl.mockResolvedValue([
      makeRawPage({ id: 169, pageUrl: 'oxford_street' }),
    ]);

    const { loadStores } = await importFresh();
    const stores = await loadStores('en_US');

    expect(stores[0].id).toBe('oxford_street');
  });

  it('falls back to "oe-<id>" for the string id when pageUrl is absent', async () => {
    getChildPagesByParentUrl.mockResolvedValue([
      makeRawPage({ id: 42 /* no pageUrl */ }),
    ]);

    const { loadStores } = await importFresh();
    const stores = await loadStores('en_US');

    expect(stores[0].id).toBe('oe-42');
    // oeId must still be set even without a pageUrl slug
    expect(stores[0].oeId).toBe(42);
  });
});

// ---------------------------------------------------------------------------
describe('normalize — attribute extraction', () => {
  it('extracts a UK postcode from a combined address+postcode string', async () => {
    getChildPagesByParentUrl.mockResolvedValue([
      makeRawPage({
        id: 1,
        pageUrl: 'store_a',
        attributeValues: {
          page_store_address: { value: '214 Oxford Street, W1C 1AX' },
        },
      }),
    ]);

    const { loadStores } = await importFresh();
    const [store] = await loadStores('en_US');

    expect(store.address).toBe('214 Oxford Street');
    expect(store.postcode).toBe('W1C 1AX');
  });

  it('detects flagship label from list attribute', async () => {
    getChildPagesByParentUrl.mockResolvedValue([
      makeRawPage({
        id: 2,
        pageUrl: 'flagship_store',
        attributeValues: {
          page_store_lable: { value: [{ title: 'FLAGSHIP', value: 'flagship' }] },
        },
      }),
    ]);

    const { loadStores } = await importFresh();
    const [store] = await loadStores('en_US');

    expect(store.isflagship).toBe(true);
    expect(store.tag).toBe('FLAGSHIP');
  });

  it('extracts opening hours from timeInterval structure', async () => {
    getChildPagesByParentUrl.mockResolvedValue([
      makeRawPage({
        id: 3,
        pageUrl: 'hours_store',
        attributeValues: {
          page_store_hours: {
            value: [
              {
                values: [
                  {
                    times: [
                      [
                        { hours: 9, minutes: 0 },
                        { hours: 21, minutes: 30 },
                      ],
                    ],
                  },
                ],
              },
            ],
          },
        },
      }),
    ]);

    const { loadStores } = await importFresh();
    const [store] = await loadStores('en_US');

    expect(store.hours).toEqual([{ day: 'Mon – Sun', time: '09:00 – 21:30' }]);
  });
});

// ---------------------------------------------------------------------------
describe('loadStores — error paths', () => {
  it('returns MOCK_STORES when SDK returns an error object', async () => {
    getChildPagesByParentUrl.mockResolvedValue({ statusCode: 500, message: 'Server error' });

    const { loadStores } = await importFresh();
    const stores = await loadStores('en_US');

    // Mock dataset has 6 entries
    expect(stores.length).toBeGreaterThan(0);
    // All mock fallbacks have no oeId
    expect(stores.every((s) => s.oeId === undefined)).toBe(true);
  });

  it('returns MOCK_STORES when SDK throws', async () => {
    getChildPagesByParentUrl.mockRejectedValue(new Error('network failure'));

    const { loadStores } = await importFresh();
    const stores = await loadStores('en_US');

    expect(stores.length).toBeGreaterThan(0);
  });

  it('returns MOCK_STORES when SDK returns an empty array', async () => {
    getChildPagesByParentUrl.mockResolvedValue([]);

    const { loadStores } = await importFresh();
    const stores = await loadStores('en_US');

    expect(stores.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
describe('loadStores — sort by position', () => {
  it('sorts results by position ascending', async () => {
    getChildPagesByParentUrl.mockResolvedValue([
      makeRawPage({ id: 10, pageUrl: 'c', position: 3 }),
      makeRawPage({ id: 11, pageUrl: 'a', position: 1 }),
      makeRawPage({ id: 12, pageUrl: 'b', position: 2 }),
    ]);

    const { loadStores } = await importFresh();
    const stores = await loadStores('en_US');

    expect(stores.map((s) => s.id)).toEqual(['a', 'b', 'c']);
    // oeIds must follow the sorted order
    expect(stores.map((s) => s.oeId)).toEqual([11, 12, 10]);
  });
});

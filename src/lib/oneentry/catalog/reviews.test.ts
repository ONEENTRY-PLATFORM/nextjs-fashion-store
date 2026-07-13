import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── SDK mock ──────────────────────────────────────────────────────────────────
const getFormsDataByMarker = vi.fn();
const fakeApi = { FormData: { getFormsDataByMarker } };

vi.mock('../index', () => ({
  oneentry: fakeApi,
  getApi: () => fakeApi,
  isOneEntryEnabled: true,
  isError: (v: unknown) =>
    !!v && typeof v === 'object' && 'statusCode' in (v as Record<string, unknown>),
}));

// unstable_cache is transparent in tests — call the wrapped fn directly.
vi.mock('next/cache', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  unstable_cache: (fn: any) => fn,
}));

// loadProductById is pulled in by loadProductReviews; stub it so there is no
// actual SDK call and we can control what it resolves with.
const loadProductById = vi.fn();
vi.mock('./products', () => ({ loadProductById }));

const importFresh = async () => {
  vi.resetModules();
  return import('./reviews');
};

beforeEach(() => {
  getFormsDataByMarker.mockReset();
  loadProductById.mockReset();
});

// ── timeout ceiling ───────────────────────────────────────────────────────────
describe('loadProductReviews — 2 s timeout ceiling', () => {
  it('returns [] when form-data fetch never resolves within 2 s', async () => {
    vi.useFakeTimers();

    // A promise that intentionally never settles — simulates a hung OE endpoint.
    getFormsDataByMarker.mockReturnValue(new Promise(() => { /* never */ }));
    loadProductById.mockReturnValue(new Promise(() => { /* never */ }));

    const { loadProductReviews } = await importFresh();
    const reviewsP = loadProductReviews(7730);

    // Advance fake clock past the 2 s ceiling; the async variant flushes
    // queued microtasks so Promise.race settles correctly.
    await vi.advanceTimersByTimeAsync(2001);

    const reviews = await reviewsP;
    expect(reviews).toEqual([]);

    vi.useRealTimers();
  });
});

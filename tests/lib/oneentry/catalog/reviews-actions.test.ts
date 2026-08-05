import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock './reviews' at the module boundary so no SDK / network calls are made.
const loadProductReviews = vi.fn();
vi.mock('./reviews', () => ({ loadProductReviews }));

// 'use server' files may reference next/cache — shim it so the import resolves.
vi.mock('next/cache', () => ({
  unstable_cache: (fn: any) => fn,
}));

const importFresh = async () => {
  vi.resetModules();
  return import('./reviews-actions');
};

beforeEach(() => {
  loadProductReviews.mockReset();
});

// Helper: build a minimal ProductReview-like object with only the `rating`
// field that getProductReviewSummary actually reads.
const fakeReviews = (ratings: number[]) =>
  ratings.map((rating, i) => ({ id: i + 1, rating } as any));

describe('getProductReviewSummary', () => {
  it('returns count=0 and avg=null when there are no reviews', async () => {
    loadProductReviews.mockResolvedValue([]);
    const { getProductReviewSummary } = await importFresh();
    const result = await getProductReviewSummary(42);
    expect(result).toEqual({ count: 0, avg: null });
  });

  it('passes limit=200 to loadProductReviews', async () => {
    loadProductReviews.mockResolvedValue([]);
    const { getProductReviewSummary } = await importFresh();
    await getProductReviewSummary(99);
    expect(loadProductReviews).toHaveBeenCalledWith(99, 200);
  });

  it('returns correct count for a single review', async () => {
    loadProductReviews.mockResolvedValue(fakeReviews([5]));
    const { getProductReviewSummary } = await importFresh();
    const result = await getProductReviewSummary(1);
    expect(result).toEqual({ count: 1, avg: 5 });
  });

  it('[5, 4] → count=2, avg=4.5 (exact one-decimal result)', async () => {
    loadProductReviews.mockResolvedValue(fakeReviews([5, 4]));
    const { getProductReviewSummary } = await importFresh();
    const result = await getProductReviewSummary(1);
    expect(result).toEqual({ count: 2, avg: 4.5 });
  });

  it('[5, 4, 4] → count=3, avg=4.3 (rounds to one decimal)', async () => {
    // mean = 13/3 = 4.333… → Math.round(4.333 * 10) / 10 = 4.3
    loadProductReviews.mockResolvedValue(fakeReviews([5, 4, 4]));
    const { getProductReviewSummary } = await importFresh();
    const result = await getProductReviewSummary(1);
    expect(result).toEqual({ count: 3, avg: 4.3 });
  });

  it('[5, 4, 4, 3] → count=4, avg=4 (whole-number average)', async () => {
    // mean = 16/4 = 4.0 → stored as 4
    loadProductReviews.mockResolvedValue(fakeReviews([5, 4, 4, 3]));
    const { getProductReviewSummary } = await importFresh();
    const result = await getProductReviewSummary(1);
    expect(result).toEqual({ count: 4, avg: 4 });
  });

  it('[1, 2] → count=2, avg=1.5 (low ratings)', async () => {
    loadProductReviews.mockResolvedValue(fakeReviews([1, 2]));
    const { getProductReviewSummary } = await importFresh();
    const result = await getProductReviewSummary(7);
    expect(result).toEqual({ count: 2, avg: 1.5 });
  });
});

'use server';
import { loadProductReviews } from './reviews';

export interface ProductReviewSummary {
  count: number;
  /** Average rating (1–5) rounded to one decimal. `null` when there are no
   *  reviews yet — callers should hide the star row entirely in that case. */
  avg: number | null;
}

/**
 * Lightweight summary of a product's reviews, callable from client
 * components (QuickView modal, product cards). Wraps `loadProductReviews`
 * so we don't serialize the full review objects to the client just to
 * render the rating pill.
 */
export async function getProductReviewSummary(
  productId: number,
): Promise<ProductReviewSummary> {
  const reviews = await loadProductReviews(productId, 200);
  if (reviews.length === 0) return { count: 0, avg: null };
  const sum = reviews.reduce((s, r) => s + r.rating, 0);
  const avg = Math.round((sum / reviews.length) * 10) / 10;
  return { count: reviews.length, avg };
}

'use server';
import { loadProductReviews } from './reviews';

export interface ProductReviewSummary {
  count: number;
  /** Average rating (1–5) rounded to one decimal. */
  avg: number | null;
}

/** Lightweight summary of a product's reviews, callable from client components (QuickView modal, product cards). */
export async function getProductReviewSummary(productId: number): Promise<ProductReviewSummary> {
  const reviews = await loadProductReviews(productId, 200);
  if (reviews.length === 0) return { count: 0, avg: null };
  const sum = reviews.reduce((s, r) => s + r.rating, 0);
  const avg = Math.round((sum / reviews.length) * 10) / 10;
  return { count: reviews.length, avg };
}

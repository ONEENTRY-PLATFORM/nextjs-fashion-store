import { loadProductReviews } from '@/lib/oneentry/catalog/reviews';

import { ReviewsClient } from './ReviewsClient';

/** Async server component that fetches a product's reviews from OE (`review_feedback` + `review_rating` form-data) and hands the result to a thin client wrapper for the interactive bits. */
export async function ReviewsAsync({ productId }: { productId: number }) {
  const reviews = await loadProductReviews(productId, 20);
  return <ReviewsClient productId={productId} reviews={reviews} />;
}

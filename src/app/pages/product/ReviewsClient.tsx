'use client'
import { useMemo, useState } from 'react';
import type { ProductReview } from '../../components/ProductCard';
import { ProductReviewsSection } from './ProductReviewsSection';
import { WriteReviewModal } from './WriteReviewModal';

/**
 * Client wrapper around `ProductReviewsSection`. Owns the show-all and
 * write-review modal toggles so the streamed reviews block stays a
 * self-contained island — no state has to live in the page-level component.
 */
export function ReviewsClient({
  productId,
  reviews,
}: {
  productId: number;
  reviews: ProductReview[];
}) {
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const avgRating = reviews.length > 0
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : 0;

  const ratingCounts = useMemo(() => {
    const buckets = [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      count: reviews.filter((r) => Math.round(r.rating) === stars).length,
      pct: 0,
    }));
    const total = reviews.length || 1;
    for (const b of buckets) b.pct = (b.count / total) * 100;
    return buckets;
  }, [reviews]);

  const visibleReviews = showAllReviews ? reviews : reviews.slice(0, 3);

  if (reviews.length === 0) return null;

  return (
    <>
      <ProductReviewsSection
        reviewsRef={{ current: null }}
        productReviews={reviews}
        avgRating={avgRating}
        ratingCounts={ratingCounts}
        visibleReviews={visibleReviews}
        showAllReviews={showAllReviews}
        setShowAllReviews={setShowAllReviews}
        setShowReviewModal={setShowReviewModal}
      />
      {showReviewModal && (
        <WriteReviewModal onClose={() => setShowReviewModal(false)} productId={productId} />
      )}
    </>
  );
}

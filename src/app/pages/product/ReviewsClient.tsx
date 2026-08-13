'use client';
import { useEffect, useMemo, useState } from 'react';

import type { ProductReview } from '@/app/components/product/ProductCard';
import { useAuth } from '@/app/context/AuthContext';
import { canReviewProduct } from '@/app/utils/review-eligibility';
import { useDict } from '@/lib/oneentry/labels/DictContext';

import { ProductReviewsSection } from './ProductReviewsSection';
import { WriteReviewModal } from './WriteReviewModal';

export const REVIEWS_CLIENT_LABELS = {
  purchaseRequired: 'Only shoppers who have received this product can leave a review.',
} as const;

/** Client wrapper around `ProductReviewsSection`. Owns the show-all and write-review modal toggles so the streamed reviews block stays a self-contained island. */
export function ReviewsClient({ productId, reviews }: { productId: number; reviews: ProductReview[] }) {
  const L = useDict('customer_reviews_', REVIEWS_CLIENT_LABELS);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showPurchaseNotice, setShowPurchaseNotice] = useState(false);
  const { isLoggedIn, openLoginModal, user } = useAuth();

  // Auto-dismiss the "purchase required" notice after 4 s so it doesn't linger under the CTA indefinitely.
  useEffect(() => {
    if (!showPurchaseNotice) return;
    const t = setTimeout(() => setShowPurchaseNotice(false), 4000);
    return () => clearTimeout(t);
  }, [showPurchaseNotice]);

  const avgRating =
    reviews.length > 0 ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10 : 0;

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

  // Callback shape matches the existing `setShowReviewModal(true)` call inside ProductReviewsSection; the boolean arg is intentionally ignored.
  const requestWriteReview = (_open: boolean) => {
    if (!isLoggedIn) {
      openLoginModal();
      return;
    }
    if (!canReviewProduct(user?.oeOrders, productId)) {
      setShowPurchaseNotice(true);
      return;
    }
    setShowPurchaseNotice(false);
    setShowReviewModal(true);
  };

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
        setShowReviewModal={requestWriteReview}
        purchaseNotice={showPurchaseNotice ? L.purchaseRequired : null}
      />
      {showReviewModal && <WriteReviewModal onClose={() => setShowReviewModal(false)} productId={productId} />}
    </>
  );
}

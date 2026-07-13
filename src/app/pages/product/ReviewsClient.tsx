'use client'
import { useEffect, useMemo, useState } from 'react';
import type { ProductReview } from '../../components/ProductCard';
import { useAuth } from '../../context/AuthContext';
import { canReviewProduct } from '../../utils/review-eligibility';
import { PRODUCT_REVIEWS_LABELS as L } from '../../data/productPageLabels';
import { ProductReviewsSection } from './ProductReviewsSection';
import { WriteReviewModal } from './WriteReviewModal';

/**
 * Client wrapper around `ProductReviewsSection`. Owns the show-all and
 * write-review modal toggles so the streamed reviews block stays a
 * self-contained island — no state has to live in the page-level component.
 * Renders even with zero reviews so shoppers still see the section shell,
 * the empty-state message and the "Write a Review" CTA. The CTA itself is
 * auth-gated: unauthed shoppers get the login modal (which offers
 * register), authed ones open the write-review modal directly.
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
  const [showPurchaseNotice, setShowPurchaseNotice] = useState(false);
  const { isLoggedIn, openLoginModal, user } = useAuth();

  // Auto-dismiss the "purchase required" notice after 4 s so it doesn't
  // linger under the CTA indefinitely.
  useEffect(() => {
    if (!showPurchaseNotice) return;
    const t = setTimeout(() => setShowPurchaseNotice(false), 4000);
    return () => clearTimeout(t);
  }, [showPurchaseNotice]);

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

  // Callback shape matches the existing `setShowReviewModal(true)` call
  // inside ProductReviewsSection; the boolean arg is intentionally
  // ignored — we only ever "open", and the section never asks us to close.
  // Reviews are gated twice: sign-in (redirect to login) and delivered-order
  // ownership (inline notice — the shopper is logged in but never actually
  // received the product).
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
      {showReviewModal && (
        <WriteReviewModal onClose={() => setShowReviewModal(false)} productId={productId} />
      )}
    </>
  );
}

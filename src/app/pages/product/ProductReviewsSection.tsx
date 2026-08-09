'use client';
import { Star } from 'lucide-react';
import React from 'react';

import { useDict, useT } from '../../../lib/oneentry/labels/DictContext';
import type { ProductReview } from '../../components/product/ProductCard';
import { PRODUCT_REVIEWS_LABELS } from '../../data/productPageLabels';
import { ReviewCard } from './ReviewCard';
import { StarRating } from './StarRating';

interface RatingCount {
  stars: number;
  count: number;
  pct: number;
}

interface ProductReviewsSectionProps {
  reviewsRef: React.RefObject<HTMLDivElement | null>;
  productReviews: ProductReview[];
  avgRating: number;
  ratingCounts: RatingCount[];
  visibleReviews: ProductReview[];
  showAllReviews: boolean;
  setShowAllReviews: (v: boolean) => void;
  setShowReviewModal: (v: boolean) => void;
  /**
   * Optional inline notice shown under the "Write a Review" button — used
   *  when the shopper is signed in but never actually received the product,
   *  so we block the write flow and explain why. `null` hides the row.
   */
  purchaseNotice?: string | null;
}

export function ProductReviewsSection({
  reviewsRef,
  productReviews,
  avgRating,
  ratingCounts,
  visibleReviews,
  showAllReviews,
  setShowAllReviews,
  setShowReviewModal,
  purchaseNotice = null,
}: ProductReviewsSectionProps) {
  const L = useDict('customer_reviews_', PRODUCT_REVIEWS_LABELS);
  const lReviewsCount = useT('reviews', L.reviewsCountSuffix);
  const lWriteReview = useT('write-a-review-cta', L.writeReview);
  const lShowAll = useT('show-all', L.showAllPrefix);
  return (
    <div ref={reviewsRef} className="mx-auto max-w-7xl border-t border-[#e5e7eb] px-4 py-12 lg:px-8">
      <h2 className="mb-8 text-[1.1rem] font-bold tracking-[0.15em] uppercase">{L.heading}</h2>

      <div className="flex flex-col gap-12 lg:flex-row">
        <div className="shrink-0 lg:w-64">
          <div className="mb-6 flex flex-col items-center">
            <span className="text-[3.5rem] leading-none font-bold">{avgRating.toFixed(1)}</span>
            <StarRating rating={avgRating} size={18} />
            <p className="mt-1 text-xs text-gray-400">
              {productReviews.length} {lReviewsCount}
            </p>
          </div>
          <div className="space-y-2">
            {ratingCounts.map((r) => (
              <div key={r.stars} className="flex items-center gap-2">
                <span className="w-6 text-right text-xs text-gray-500">{r.stars}</span>
                <Star size={10} fill="#000" stroke="none" />
                <div className="h-1.5 flex-1 bg-gray-100">
                  <div className="h-1.5 bg-black transition-all duration-500" style={{ width: `${r.pct}%` }} />
                </div>
                <span className="w-4 text-xs text-gray-400">{r.count}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowReviewModal(true)}
            className="mt-6 w-full rounded-none border border-black py-3 text-xs tracking-[0.15em] uppercase transition-colors hover:bg-black hover:text-white"
          >
            {lWriteReview}
          </button>
          {purchaseNotice && (
            <p role="status" className="mt-3 text-xs leading-relaxed text-[#B8860B]">
              {purchaseNotice}
            </p>
          )}
        </div>

        <div className="flex-1">
          {productReviews.length === 0 ? (
            <div className="flex h-full flex-col items-start justify-center rounded-none border border-dashed border-[#e5e7eb] p-8 text-left">
              <p className="mb-2 text-sm font-bold tracking-[0.15em] uppercase">{L.emptyHeading}</p>
              <p className="max-w-md text-sm text-gray-500">{L.emptyBody}</p>
            </div>
          ) : (
            <>
              {visibleReviews.map((r) => (
                <ReviewCard key={r.id} review={r} />
              ))}

              {!showAllReviews && productReviews.length > 3 && (
                <button
                  onClick={() => setShowAllReviews(true)}
                  className="mt-6 text-xs tracking-widest uppercase underline transition-colors hover:text-gray-600"
                >
                  {lShowAll} {productReviews.length} {L.showAllSuffix}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

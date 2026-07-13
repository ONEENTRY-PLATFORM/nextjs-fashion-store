'use client'
import React from 'react';
import { Star } from 'lucide-react';
import { StarRating } from './StarRating';
import { ReviewCard } from './ReviewCard';
import type { ProductReview } from '../../components/ProductCard';
import { PRODUCT_REVIEWS_LABELS as L } from '../../data/productPageLabels';
import { usePdpT } from '../../../lib/oneentry/labels/PdpLabelsContext';

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
  /** Optional inline notice shown under the "Write a Review" button — used
   *  when the shopper is signed in but never actually received the product,
   *  so we block the write flow and explain why. `null` hides the row. */
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
  const lReviewsCount = usePdpT('customer-reviews', 'reviews',             L.reviewsCountSuffix);
  const lWriteReview  = usePdpT('customer-reviews', 'write-a-review-cta',  L.writeReview);
  const lShowAll      = usePdpT('customer-reviews', 'show-all',            L.showAllPrefix);
  return (
    <div ref={reviewsRef} className="px-4 lg:px-8 py-12 max-w-screen-xl mx-auto border-t border-[#e5e7eb]">
      <h2 className="tracking-[0.15em] uppercase mb-8 text-[1.1rem] font-bold">
        {L.heading}
      </h2>

      <div className="flex flex-col lg:flex-row gap-12">
        <div className="lg:w-64 flex-shrink-0">
          <div className="flex flex-col items-center mb-6">
            <span className="text-[3.5rem] font-bold leading-none">
              {avgRating.toFixed(1)}
            </span>
            <StarRating rating={avgRating} size={18} />
            <p className="text-xs text-gray-400 mt-1">{productReviews.length} {lReviewsCount}</p>
          </div>
          <div className="space-y-2">
            {ratingCounts.map(r => (
              <div key={r.stars} className="flex items-center gap-2">
                <span className="text-xs w-6 text-right text-gray-500">{r.stars}</span>
                <Star size={10} fill="#000" stroke="none" />
                <div className="flex-1 h-1.5 bg-gray-100">
                  <div className="h-1.5 bg-black transition-all duration-500" style={{ width: `${r.pct}%` }} />
                </div>
                <span className="text-xs text-gray-400 w-4">{r.count}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowReviewModal(true)}
            className="w-full mt-6 py-3 text-xs tracking-[0.15em] uppercase border border-black hover:bg-black hover:text-white transition-colors rounded-none"
          >
            {lWriteReview}
          </button>
          {purchaseNotice && (
            <p role="status" className="mt-3 text-xs text-[#B8860B] leading-relaxed">
              {purchaseNotice}
            </p>
          )}
        </div>

        <div className="flex-1">
          {productReviews.length === 0 ? (
            <div className="h-full flex flex-col items-start justify-center text-left border border-dashed border-[#e5e7eb] p-8 rounded-none">
              <p className="tracking-[0.15em] uppercase text-sm font-bold mb-2">
                {L.emptyHeading}
              </p>
              <p className="text-sm text-gray-500 max-w-md">
                {L.emptyBody}
              </p>
            </div>
          ) : (
            <>
              {visibleReviews.map(r => <ReviewCard key={r.id} review={r} />)}

              {!showAllReviews && productReviews.length > 3 && (
                <button
                  onClick={() => setShowAllReviews(true)}
                  className="mt-6 text-xs tracking-widest uppercase underline hover:text-gray-600 transition-colors"
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

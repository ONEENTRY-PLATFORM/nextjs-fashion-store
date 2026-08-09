import { Check, ThumbsUp } from 'lucide-react';
import { useState } from 'react';

import { REVIEW_CARD_LABELS as RC } from '@/app/data/commonLabels';
import type { ProductReview } from '@/app/data/productCatalog';
import { PRODUCT_REVIEWS_LABELS } from '@/app/data/productPageLabels';
import { useDict, useT } from '@/lib/oneentry/labels/DictContext';

import { StarRating } from './StarRating';

export function ReviewCard({ review }: { review: ProductReview }) {
  const L = useDict('customer_reviews_', PRODUCT_REVIEWS_LABELS);
  const [helpful, setHelpful] = useState(review.helpful);
  const [voted, setVoted] = useState(false);
  const lVerified = useT('verified-purchase', RC.verifiedPurchase);
  const lHelpful = useT('helpful', L.helpfulPrefix);

  return (
    <div className="border-b border-gray-200 py-6">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <StarRating rating={review.rating} size={13} />
            {review.verified && (
              <span className="flex items-center gap-1 text-xs text-green-700">
                <Check size={11} /> {lVerified}
              </span>
            )}
          </div>
          <p className="text-sm font-semibold">{review.title}</p>
        </div>
        <span className="shrink-0 text-xs text-gray-400">{review.date}</span>
      </div>
      <p className="mb-3 text-sm leading-relaxed text-gray-700">{review.body}</p>
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          <span className="font-medium">{review.author}</span>
          <span className="mx-1.5">·</span>
          <span>
            {L.sizePrefix} {review.size}
          </span>
        </div>
        <button
          onClick={() => {
            if (!voted) {
              setHelpful((h) => h + 1);
              setVoted(true);
            }
          }}
          className={`flex items-center gap-1.5 text-xs transition-colors ${voted ? 'text-black' : 'text-gray-400 hover:text-black'}`}
          aria-label={voted ? L.helpfulMarkedAria : L.helpfulMarkAria}
        >
          <ThumbsUp size={12} fill={voted ? '#000' : 'none'} />
          {lHelpful} ({helpful})
        </button>
      </div>
    </div>
  );
}

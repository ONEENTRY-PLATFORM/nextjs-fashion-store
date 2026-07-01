import { useState } from 'react';
import { ThumbsUp, Check } from 'lucide-react';
import { StarRating } from './StarRating';
import type { ProductReview } from '../../data/productCatalog';
import { PRODUCT_REVIEWS_LABELS as L } from '../../data/productPageLabels';
import { REVIEW_CARD_LABELS as RC } from '../../data/commonLabels';
import { usePdpT } from '../../../lib/oneentry/labels/PdpLabelsContext';

export function ReviewCard({ review }: { review: ProductReview }) {
  const [helpful, setHelpful] = useState(review.helpful);
  const [voted, setVoted] = useState(false);
  const lVerified = usePdpT('customer-reviews', 'verified-purchase', RC.verifiedPurchase);
  const lHelpful  = usePdpT('customer-reviews', 'helpful',           L.helpfulPrefix);

  return (
    <div className="py-6 border-b border-gray-200">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <StarRating rating={review.rating} size={13} />
            {review.verified && (
              <span className="text-xs text-green-700 flex items-center gap-1">
                <Check size={11} /> {lVerified}
              </span>
            )}
          </div>
          <p className="text-sm font-semibold">{review.title}</p>
        </div>
        <span className="flex-shrink-0 text-xs text-gray-400">{review.date}</span>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed mb-3">{review.body}</p>
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          <span className="font-medium">{review.author}</span>
          <span className="mx-1.5">·</span>
          <span>{L.sizePrefix} {review.size}</span>
        </div>
        <button
          onClick={() => { if (!voted) { setHelpful(h => h + 1); setVoted(true); } }}
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

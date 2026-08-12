'use client';
import { Check, Star, X } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';

import { SALE_COLOR } from '@/app/constants/colors';
import { trackActivity } from '@/app/utils/track-activity';
import { useFormLabel, useFormMessage, useFormOptions } from '@/lib/oneentry/forms/FormPlaceholdersContext';
import { submitForm } from '@/lib/oneentry/forms/submit';
import { useDict, useList, useT } from '@/lib/oneentry/labels/DictContext';

export const WRITE_REVIEW_DYNAMIC_ARIA = {
  starSuffix: 'star',
} as const;

// ─── WriteReviewModal ───────────────────────────────────────────────────────
// Fields mirror the OE `review_feedback` (id 8) + `review_rating` (id 7)
// forms currently deployed on the tenant:
//   feedback → body (text) + occasions (list) + add_media (groupOfImages)
//   rating   → rating (integer)
// Legacy headline/name/email fields were removed from OE and dropped here.
export const WRITE_REVIEW_LABELS = {
  title: 'Share your thoughts',
  closeLabel: 'Close',
  emailBannerNote: 'TO EARN REWARDS POINTS, YOU MUST SUBMIT VIA THE AUTOMATIC REVIEW REQUEST EMAIL',
  submittedHeading: 'Review Submitted',
  submittedBody: 'Thank you! Your review is pending approval.',
  closeButton: 'Close',
  // Form
  rateLabel: 'Rate your experience',
  rateLabels: ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'] as const,
  writeReviewLabel: 'Write a review',
  writeReviewPlaceholder: 'Tell us what you like or dislike',
  mediaLabel: 'Add media',
  mediaUpload: 'Upload photos or videos',
  mediaHint: 'Up to 10 images and 3 videos (max. file size 2 GB)',
  occasionLabel: 'What occasion did you buy this for?',
  occasionHint: 'Choose 1',
  requiredFieldsNote: '* required fields',
  ctaSend: 'Send',
  // Value ↔ display label for the OE `occasions` `list` field. Values must
  // match the OE `listTitles` markers exactly (`everyday`, `work`, `party`,
  // `travel`, `sport`) — display labels are storefront copy.
  occasions: [
    { value: 'everyday', label: 'Everyday' },
    { value: 'work', label: 'Work' },
    { value: 'party', label: 'Party' },
    { value: 'travel', label: 'Travel' },
    { value: 'sport', label: 'Sport' },
  ] as const,
} as const;

/** Fallback option list — values must match the OE `listTitles` markers. */
const OCCASIONS_FALLBACK = WRITE_REVIEW_LABELS.occasions.map((o) => ({ title: o.label, value: o.value }));
/** Star captions 1–5; the shipped array is 1-based and starts with a blank. */
const RATE_LABELS_FALLBACK = WRITE_REVIEW_LABELS.rateLabels.filter(Boolean);

export function WriteReviewModal({ onClose, productId }: { onClose: () => void; productId?: number }) {
  const L = useDict('customer_reviews_write_', WRITE_REVIEW_LABELS);
  // Star captions. Stored without the leading blank the code used to carry
  // for 1-based indexing — `useList` drops empty entries, and a CSV that
  // starts with a comma is a trap for whoever edits it in the panel.
  const rateLabels = useList('customer_reviews_write_rate_labels', RATE_LABELS_FALLBACK);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [occasions, setOccasions] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [isPending, startTransition] = useTransition();
  const aStarSuffix = useT('customer_reviews_star_suffix', WRITE_REVIEW_DYNAMIC_ARIA.starSuffix);

  // Review copy belongs to the OE forms, not to a system-text set: the label,
  // the option list and the result messages are all authored on the form
  // itself (`review_feedback` / `review_rating`).
  const lTitle = useFormMessage('review_feedback', 'titleForSite', L.title);
  const lSuccess = useFormMessage('review_feedback', 'successMessage', L.submittedHeading);
  const lFailure = useFormMessage('review_feedback', 'unsuccessMessage', L.requiredFieldsNote);
  const lReviewLabel = useFormLabel('review_feedback', 'body', L.writeReviewLabel);
  const lMediaLabel = useFormLabel('review_feedback', 'add_media', L.mediaLabel);
  const lOccasion = useFormLabel('review_feedback', 'occasions', L.occasionLabel);
  const lRateLabel = useFormLabel('review_rating', 'rating', L.rateLabel);
  const OCCASIONS = useFormOptions('review_feedback', 'occasions', OCCASIONS_FALLBACK);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const toggleOccasion = (o: string) =>
    setOccasions((prev) => (prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!rating) e.rating = L.requiredFieldsNote;
    if (!reviewText.trim()) e.review = L.requiredFieldsNote;
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setSubmitError('');
    startTransition(async () => {
      // Bind both submissions to the same product-scoped module config
      // ids the READER uses (`reviews.ts::FEEDBACK_MODULE_CONFIG=13`,
      // `RATING_MODULE_CONFIG=12`) with `moduleEntityIdentifier` set to
      // the numeric product id — without these bindings OE stores the
      // submission with `formModuleConfigId=0` and the reader (which
      // filters on `configId + entityIdentifier=productId`) never sees
      // it. Result before the fix: reviews vanished into limbo.
      const productBinding =
        productId !== undefined ? { moduleConfigId: 12, moduleEntityIdentifier: String(productId) } : undefined;
      const feedbackBinding =
        productId !== undefined ? { moduleConfigId: 13, moduleEntityIdentifier: String(productId) } : undefined;
      const ratingRes = await submitForm(
        'review_rating',
        [{ marker: 'rating', value: String(rating), type: 'integer' }],
        productBinding,
      );
      if (!ratingRes.ok) {
        setSubmitError(ratingRes.error);
        return;
      }
      // OE `review_feedback` (id 8) — fields the tenant currently ships:
      //   body (text), occasions (list), add_media (groupOfImages)
      // `add_media` needs binary uploads that the storefront doesn't wire
      // yet — sending an empty payload keeps the form valid while the file
      // pipeline is a follow-up.
      const feedbackRes = await submitForm(
        'review_feedback',
        [
          { marker: 'body', value: reviewText.trim(), type: 'text' },
          { marker: 'occasions', value: occasions, type: 'list' },
        ],
        feedbackBinding,
      );
      if (!feedbackRes.ok) {
        setSubmitError(feedbackRes.error);
        return;
      }
      trackActivity({
        type: 'product_rating',
        ...(productId !== undefined && { productId }),
        meta: { rating },
      });
      setSubmitted(true);
    });
  };

  // Reusable styles
  const fieldLabel = 'block text-xs tracking-[0.12em] uppercase mb-2 font-semibold';
  const inputClass = (hasError: boolean) =>
    `w-full text-sm text-gray-700 placeholder-gray-300 focus-visible:outline-none px-3 py-2.5 border rounded-none ${
      hasError ? 'border-(--sale)' : 'border-[#e5e7eb]'
    }`;

  return (
    <div
      className="fixed inset-0 z-200 flex items-end justify-center sm:items-center"
      style={{ '--sale': SALE_COLOR } as React.CSSProperties}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative mx-0 flex max-h-[95vh] w-full flex-col rounded-none bg-white sm:mx-4 sm:max-w-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-sm font-bold tracking-[0.18em] uppercase">{lTitle}</h2>
          <button onClick={onClose} className="p-1 transition-opacity hover:opacity-50" aria-label={L.closeLabel}>
            <X size={20} />
          </button>
        </div>

        <div className="shrink-0 bg-[#FFF3CD] px-6 py-3">
          <p className="text-center text-xs font-semibold tracking-[0.03em] text-[#856404]">{L.emailBannerNote}</p>
        </div>

        {submitted ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-4 flex size-12 items-center justify-center bg-black">
              <Check size={22} className="text-white" />
            </div>
            <p className="mb-2 text-sm font-bold tracking-[0.15em] uppercase">{lSuccess}</p>
            <p className="text-xs text-gray-500">{L.submittedBody}</p>
            <button
              onClick={onClose}
              className="mt-8 rounded-none bg-black px-8 py-3 text-xs tracking-[0.15em] text-white uppercase transition-colors hover:bg-gray-800"
            >
              {L.closeButton}
            </button>
          </div>
        ) : (
          <div className="flex-1 space-y-5 overflow-y-auto p-6">
            <div>
              <label className="mb-2.5 block text-xs font-semibold tracking-[0.12em] uppercase">
                {lRateLabel} <span className="text-(--sale)">*</span>
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <button
                    key={i}
                    onMouseEnter={() => setHoverRating(i)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => {
                      setRating(i);
                      setErrors((e) => ({ ...e, rating: '' }));
                    }}
                    className="transition-transform hover:scale-110 focus-visible:outline-none"
                    aria-label={`${i} ${aStarSuffix}`}
                  >
                    <Star
                      size={28}
                      fill={(hoverRating || rating) >= i ? '#000' : 'none'}
                      stroke={(hoverRating || rating) >= i ? '#000' : '#d1d5db'}
                      strokeWidth={1.5}
                    />
                  </button>
                ))}
                {rating > 0 && <span className="ml-2 text-xs text-gray-400">{rateLabels[rating - 1]}</span>}
              </div>
              {errors.rating && <p className="mt-1 text-xs text-(--sale)">{errors.rating}</p>}
            </div>

            <div>
              <label className={fieldLabel}>
                {lReviewLabel} <span className="text-(--sale)">*</span>
              </label>
              <textarea
                value={reviewText}
                onChange={(e) => {
                  setReviewText(e.target.value);
                  setErrors((err) => ({ ...err, review: '' }));
                }}
                placeholder={L.writeReviewPlaceholder}
                rows={4}
                className={`${inputClass(!!errors.review)} resize-none`}
              />
              {errors.review && <p className="mt-0.5 text-xs text-(--sale)">{errors.review}</p>}
            </div>

            <div>
              <label className={fieldLabel}>{lMediaLabel}</label>
              <label className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-none border border-dashed border-gray-300 py-5 transition-colors hover:border-black">
                <input type="file" multiple accept="image/*,video/*" className="hidden" />
                <div className="flex size-8 items-center justify-center border border-gray-300">
                  <span className="text-lg leading-none text-gray-400">+</span>
                </div>
                <span className="text-xs text-gray-500">{L.mediaUpload}</span>
                <span className="px-4 text-center text-xs text-gray-400">{L.mediaHint}</span>
              </label>
            </div>

            <div>
              <label className="mb-2.5 block text-xs font-semibold tracking-[0.12em] uppercase">
                {lOccasion}{' '}
                <span className="font-normal tracking-normal text-gray-400 normal-case">{L.occasionHint}</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {OCCASIONS.map((o) => {
                  const active = occasions.includes(o.value);
                  return (
                    <button
                      key={o.value}
                      onClick={() => toggleOccasion(o.value)}
                      className={`rounded-none border px-3 py-1.5 text-xs whitespace-nowrap transition-colors ${
                        active ? 'border-black bg-black text-white' : 'border-[#d1d5db] bg-white text-black'
                      }`}
                    >
                      {o.title}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {!submitted && (
          <div className="flex shrink-0 items-center justify-between gap-4 border-t border-gray-200 px-6 py-4">
            <span className="text-xs text-gray-400">{submitError || lFailure}</span>
            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="shrink-0 rounded-none bg-black px-10 py-3 text-xs tracking-[0.2em] text-white uppercase transition-colors hover:bg-gray-800 disabled:opacity-50"
            >
              {isPending ? '...' : L.ctaSend}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

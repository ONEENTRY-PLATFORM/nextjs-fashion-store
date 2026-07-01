'use client'
import { useState, useEffect, useTransition } from 'react';
import { X, Star, Check } from 'lucide-react';
import { SALE_COLOR } from '../../constants/colors';
import { WRITE_REVIEW_LABELS as L } from '../../data/productPageLabels';
import { WRITE_REVIEW_DYNAMIC_ARIA } from '../../data/commonLabels';
import { submitForm } from '../../../lib/oneentry/forms/submit';
import { trackActivity } from '../../utils/track-activity';

const OCCASIONS = L.occasions;

export function WriteReviewModal({ onClose, productId }: { onClose: () => void; productId?: number }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [headline, setHeadline] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [occasions, setOccasions] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const toggleOccasion = (o: string) =>
    setOccasions(prev => prev.includes(o) ? prev.filter(x => x !== o) : [...prev, o]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!rating) e.rating = L.requiredFieldsNote;
    if (!reviewText.trim()) e.review = L.requiredFieldsNote;
    if (!headline.trim()) e.headline = L.requiredFieldsNote;
    if (!name.trim()) e.name = L.requiredFieldsNote;
    if (!email.trim()) e.email = L.requiredFieldsNote;
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = L.requiredFieldsNote;
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSubmitError('');
    startTransition(async () => {
      const ratingRes = await submitForm('review_rating', [
        { marker: 'rating', value: String(rating), type: 'string' },
      ]);
      if (!ratingRes.ok) { setSubmitError(ratingRes.error); return; }
      const feedbackRes = await submitForm('review_feedback', [
        { marker: 'headline',  value: headline.trim(),       type: 'string' },
        { marker: 'body',      value: reviewText.trim(),     type: 'string' },
        { marker: 'name',      value: name.trim(),           type: 'string' },
        { marker: 'email',     value: email.trim(),          type: 'string' },
        { marker: 'occasions', value: occasions.join(', '),  type: 'string' },
      ]);
      if (!feedbackRes.ok) { setSubmitError(feedbackRes.error); return; }
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
      hasError ? 'border-[var(--sale)]' : 'border-[#e5e7eb]'
    }`;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
      style={{ '--sale': SALE_COLOR } as React.CSSProperties}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative bg-white w-full sm:max-w-xl mx-0 sm:mx-4 max-h-[95vh] flex flex-col rounded-none"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="tracking-[0.18em] uppercase text-sm font-bold">{L.title}</h2>
          <button onClick={onClose} className="p-1 hover:opacity-50 transition-opacity" aria-label={L.closeLabel}><X size={20} /></button>
        </div>

        <div className="px-6 py-3 flex-shrink-0 bg-[#FFF3CD]">
          <p className="text-xs text-center text-[#856404] font-semibold tracking-[0.03em]">
            {L.emailBannerNote}
          </p>
        </div>

        {submitted ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="w-12 h-12 bg-black flex items-center justify-center mb-4">
              <Check size={22} className="text-white" />
            </div>
            <p className="tracking-[0.15em] uppercase text-sm mb-2 font-bold">{L.submittedHeading}</p>
            <p className="text-xs text-gray-500">{L.submittedBody}</p>
            <button
              onClick={onClose}
              className="mt-8 px-8 py-3 text-xs tracking-[0.15em] uppercase bg-black text-white hover:bg-gray-800 transition-colors rounded-none"
            >
              {L.closeButton}
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
            <div>
              <label className="block text-xs tracking-[0.12em] uppercase mb-2.5 font-semibold">
                {L.rateLabel} <span className="text-[var(--sale)]">*</span>
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map(i => (
                  <button
                    key={i}
                    onMouseEnter={() => setHoverRating(i)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => { setRating(i); setErrors(e => ({ ...e, rating: '' })); }}
                    className="focus-visible:outline-none transition-transform hover:scale-110"
                    aria-label={`${i} ${WRITE_REVIEW_DYNAMIC_ARIA.starSuffix}`}
                  >
                    <Star
                      size={28}
                      fill={(hoverRating || rating) >= i ? '#000' : 'none'}
                      stroke={(hoverRating || rating) >= i ? '#000' : '#d1d5db'}
                      strokeWidth={1.5}
                    />
                  </button>
                ))}
                {rating > 0 && (
                  <span className="ml-2 text-xs text-gray-400">
                    {L.rateLabels[rating]}
                  </span>
                )}
              </div>
              {errors.rating && <p className="text-xs mt-1 text-[var(--sale)]">{errors.rating}</p>}
            </div>

            <div>
              <label className={fieldLabel}>
                {L.writeReviewLabel} <span className="text-[var(--sale)]">*</span>
              </label>
              <textarea
                value={reviewText}
                onChange={e => { setReviewText(e.target.value); setErrors(err => ({ ...err, review: '' })); }}
                placeholder={L.writeReviewPlaceholder}
                rows={4}
                className={`${inputClass(!!errors.review)} resize-none`}
              />
              {errors.review && <p className="text-xs mt-0.5 text-[var(--sale)]">{errors.review}</p>}
            </div>

            <div>
              <label className={fieldLabel}>
                {L.headlineLabel} <span className="text-[var(--sale)]">*</span>
              </label>
              <input
                value={headline}
                onChange={e => { setHeadline(e.target.value); setErrors(err => ({ ...err, headline: '' })); }}
                placeholder={L.headlinePlaceholder}
                className={inputClass(!!errors.headline)}
              />
              {errors.headline && <p className="text-xs mt-0.5 text-[var(--sale)]">{errors.headline}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={fieldLabel}>
                  {L.nameLabel} <span className="text-[var(--sale)]">*</span>
                </label>
                <input
                  value={name}
                  onChange={e => { setName(e.target.value); setErrors(err => ({ ...err, name: '' })); }}
                  placeholder={L.namePlaceholder}
                  className={inputClass(!!errors.name)}
                />
                {errors.name && <p className="text-xs mt-0.5 text-[var(--sale)]">{errors.name}</p>}
              </div>
              <div>
                <label className={fieldLabel}>
                  {L.emailLabel} <span className="text-[var(--sale)]">*</span>
                </label>
                <input
                  value={email}
                  onChange={e => { setEmail(e.target.value); setErrors(err => ({ ...err, email: '' })); }}
                  placeholder={L.emailPlaceholder}
                  type="email"
                  className={inputClass(!!errors.email)}
                />
                {errors.email && <p className="text-xs mt-0.5 text-[var(--sale)]">{errors.email}</p>}
              </div>
            </div>

            <div>
              <label className={fieldLabel}>{L.mediaLabel}</label>
              <label className="flex flex-col items-center justify-center gap-2 w-full py-5 border border-dashed border-gray-300 cursor-pointer hover:border-black transition-colors rounded-none">
                <input type="file" multiple accept="image/*,video/*" className="hidden" />
                <div className="w-8 h-8 border border-gray-300 flex items-center justify-center">
                  <span className="text-gray-400 text-lg leading-none">+</span>
                </div>
                <span className="text-xs text-gray-500">{L.mediaUpload}</span>
                <span className="text-xs text-gray-400 text-center px-4">{L.mediaHint}</span>
              </label>
            </div>

            <div>
              <label className="block text-xs tracking-[0.12em] uppercase mb-2.5 font-semibold">
                {L.occasionLabel}{' '}
                <span className="normal-case tracking-normal text-gray-400 font-normal">{L.occasionHint}</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {OCCASIONS.map(o => {
                  const active = occasions.includes(o);
                  return (
                    <button
                      key={o}
                      onClick={() => toggleOccasion(o)}
                      className={`px-3 py-1.5 text-xs transition-colors border whitespace-nowrap rounded-none ${
                        active ? 'bg-black text-white border-black' : 'bg-white text-black border-[#d1d5db]'
                      }`}
                    >
                      {o}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {!submitted && (
          <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 flex items-center justify-between gap-4">
            <span className="text-xs text-gray-400">{submitError || L.requiredFieldsNote}</span>
            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="px-10 py-3 text-xs tracking-[0.2em] uppercase text-white bg-black hover:bg-gray-800 transition-colors flex-shrink-0 rounded-none disabled:opacity-50"
            >
              {isPending ? '...' : L.ctaSend}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

'use client'
import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Check, ChevronDown, MessageSquare } from 'lucide-react';
import { SectionTitle, ACCENT, fmt } from './shared';
import Image from 'next/image';
import { SALE_COLOR, BANNER_BG } from '../../constants/colors';
import { FEEDBACK_LABELS as L } from '../../data/accountLabels';
import { useT } from '../../../lib/oneentry/labels/AccountLabelsContext';

export function FeedbackSection() {
  const { user } = useAuth();
  // Orders for the feedback "select order" dropdown come from /me orders.
  const orders = useMemo(
    () => (user?.oeOrders ?? []).map((o) => ({
      id: `OE-${o.id}`,
      date: o.createdDate
        ? new Date(o.createdDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : '',
      total: parseFloat(o.totalSum) || 0,
    })),
    [user?.oeOrders],
  );
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [category, setCategory] = useState('');
  const [order, setOrder] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitHovered, setSubmitHovered] = useState(false);
  const [msgFocused, setMsgFocused] = useState(false);

  const title         = useT('user_account_feedback', 'user_account_feedback_top_banner_sub_title', L.title);
  const eyebrow       = useT('user_account_feedback', 'user_account_feedback_top_banner_sub_title', L.eyebrow);
  const bannerHead    = useT('user_account_feedback', 'user_account_feedback_top_banner_title',     L.bannerHeading);
  const bannerHint    = useT('user_account_feedback', 'user_account_feedback_top_banner_text',      L.bannerHint);
  const thankTitle    = useT('user_account_feedback', 'user_account_feedback_title',                L.thankTitle);
  const thankBody     = useT('user_account_feedback', 'user_account_feedback_text',                 L.thankBody);
  const submitAnother = useT('user_account_feedback', 'user_account_feedback_cta',                  L.submitAnother);
  const submitLabel   = useT('user_account_feedback', 'user_account_feedback_submit',               L.submit);
  const requiredNote  = useT('user_account_feedback', 'user_account_feedback_required_fields',      L.requiredNote);

  const categories = L.categories;
  const ratingLabels = L.rating;

  const sectionVars = {
    '--sale': SALE_COLOR,
    '--accent': ACCENT,
    '--banner-bg': BANNER_BG,
  } as React.CSSProperties;

  const labelClass = 'block text-xs uppercase tracking-[0.15em] mb-2 font-bold text-[#555]';

  if (submitted) {
    return (
      <div style={sectionVars}>
        <SectionTitle title={title} />
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-[var(--banner-bg)]">
          <div className="w-14 h-14 flex items-center justify-center bg-black">
            <Check size={28} color="#fff" />
          </div>
          <p className="text-sm tracking-widest uppercase font-bold">{thankTitle}</p>
          <p className="text-sm text-gray-500 text-center max-w-xs leading-relaxed">
            {thankBody}
          </p>
          <button
            onClick={() => { setSubmitted(false); setRating(0); setCategory(''); setOrder(''); setMessage(''); }}
            className="mt-2 px-8 py-3 text-xs tracking-[0.2em] uppercase text-white focus-visible:outline-none bg-black rounded-none font-bold"
          >
            {submitAnother}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={sectionVars}>
      <SectionTitle title={L.title} />

      {/* Header banner */}
      <div className="mb-8 px-8 py-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[var(--banner-bg)]">
        <div>
          <p className="text-xs tracking-[0.3em] uppercase text-gray-400 mb-1">{eyebrow}</p>
          <h2 className="tracking-widest uppercase text-[clamp(1rem,2vw,1.2rem)] font-bold">
            {bannerHead}
          </h2>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed max-w-xs">
          {bannerHint}
        </p>
      </div>

      <div className="space-y-8">

        {/* Star Rating */}
        <div>
          <label className="block text-xs uppercase tracking-[0.15em] mb-4 font-bold text-[#555]">
            {L.ratingLabel} <span className="text-[var(--sale)]">{L.requiredMark}</span>
          </label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                onClick={() => setRating(star)}
                className={`focus-visible:outline-none transition-transform duration-100 ${
                  (hoveredRating || rating) >= star ? 'scale-115' : 'scale-100'
                }`}
                aria-label={`${L.starAriaPrefix} ${star} ${L.starAriaSuffix}`}
              >
                <Image
                  src={(hoveredRating || rating) >= star ? '/icons/ui/star-filled.svg' : '/icons/ui/star-outline.svg'}
                  alt=""
                  width={32}
                  height={32}
                  unoptimized
                />
              </button>
            ))}
            {(hoveredRating || rating) > 0 && (
              <span className="ml-2 text-xs tracking-wide font-semibold text-[var(--accent)]">
                {ratingLabels[hoveredRating || rating]}
              </span>
            )}
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs uppercase tracking-[0.15em] mb-3 font-bold text-[#555]">
            {L.labelCategory}
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(c => c === cat ? '' : cat)}
                className={`px-4 py-2 text-xs tracking-wider uppercase focus-visible:outline-none transition-colors border rounded-none ${
                  category === cat
                    ? 'border-black bg-black text-white font-bold'
                    : 'border-[#d1d5db] bg-white text-[#555] font-normal'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Related Order */}
        <div>
          <label className={labelClass}>
            {L.labelOrder} <span className="text-gray-400 normal-case tracking-normal font-normal">{L.optionalSuffix}</span>
          </label>
          <div className="relative">
            <select
              value={order}
              onChange={e => setOrder(e.target.value)}
              className="w-full px-4 py-3 text-sm outline-none appearance-none bg-white cursor-pointer border border-[#d1d5db] rounded-none"
            >
              <option value="">{L.placeholderOrder}</option>
              {orders.map(o => (
                <option key={o.id} value={o.id}>{o.id} — {o.date} ({fmt(o.total)})</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
          </div>
        </div>

        {/* Message */}
        <div>
          <label className={labelClass}>
            {L.labelMessage} <span className="text-[var(--sale)]">{L.requiredMark}</span>
          </label>
          <p className="text-xs text-gray-400 mb-3">{L.messageHint}</p>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={L.placeholderMessage}
            rows={5}
            className={`w-full px-4 py-3 text-sm outline-none resize-none border rounded-none ${
              msgFocused ? 'border-black' : 'border-[#d1d5db]'
            }`}
            onFocus={() => setMsgFocused(true)}
            onBlur={() => setMsgFocused(false)}
          />
          <div className="flex justify-between mt-1">
            <span className={`text-xs ${message.length < 20 && message.length > 0 ? 'text-[var(--sale)]' : 'text-gray-400'}`}>
              {message.length < 20 && message.length > 0 ? `${20 - message.length} ${L.charsNeededTpl}` : ''}
            </span>
            <span className="text-xs text-gray-300">{message.length} {L.charsCounterTpl}</span>
          </div>
        </div>

        {/* How it works steps */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-white">
          {L.howSteps.map(s => (
            <div key={s.step} className="bg-white px-5 py-6">
              <p className="text-xs tracking-widest mb-2 font-extrabold text-[var(--accent)]">{s.step}</p>
              <p className="text-sm mb-1.5 font-bold">{s.title}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Submit */}
        <div className="flex items-center gap-4 pt-2">
          <button
            onMouseEnter={() => setSubmitHovered(true)}
            onMouseLeave={() => setSubmitHovered(false)}
            onClick={() => { if (rating && message.length >= 20) setSubmitted(true); }}
            disabled={!rating || message.length < 20}
            className={`px-10 py-3.5 text-xs tracking-[0.2em] uppercase text-white flex items-center gap-2 focus-visible:outline-none rounded-none font-bold transition-colors duration-200 ${
              !rating || message.length < 20
                ? 'bg-gray-400 cursor-not-allowed'
                : submitHovered
                  ? 'bg-[var(--accent)] cursor-pointer'
                  : 'bg-black cursor-pointer'
            }`}
          >
            <MessageSquare size={13} />
            {submitLabel}
          </button>
          <p className="text-xs text-gray-400">
            <span className="text-[var(--sale)]">{L.requiredMark}</span> {requiredNote}
          </p>
        </div>
      </div>
    </div>
  );
}

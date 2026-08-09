'use client';
import { Check, ChevronDown, MessageSquare } from 'lucide-react';
import Image from 'next/image';
import React, { useMemo, useState } from 'react';

import { useDict, useT } from '../../../lib/oneentry/labels/DictContext';
import { BANNER_BG, SALE_COLOR } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { FEEDBACK_LABELS } from '../../data/accountLabels';
import { ACCENT, fmt, SectionTitle } from './shared';

export function FeedbackSection() {
  const L = useDict('user_account_feedback_', FEEDBACK_LABELS);
  const { user } = useAuth();
  // Orders for the feedback "select order" dropdown come from /me orders.
  const orders = useMemo(
    () =>
      (user?.oeOrders ?? []).map((o) => ({
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

  const title = useT('user_account_feedback_top_banner_sub_title', L.title);
  const eyebrow = useT('user_account_feedback_top_banner_sub_title', L.eyebrow);
  const bannerHead = useT('user_account_feedback_top_banner_title', L.bannerHeading);
  const bannerHint = useT('user_account_feedback_top_banner_text', L.bannerHint);
  const thankTitle = useT('user_account_feedback_title', L.thankTitle);
  const thankBody = useT('user_account_feedback_text', L.thankBody);
  const submitAnother = useT('user_account_feedback_cta', L.submitAnother);
  const submitLabel = useT('user_account_feedback_submit', L.submit);
  const requiredNote = useT('user_account_feedback_required_fields', L.requiredNote);

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
        <div className="flex flex-col items-center justify-center gap-4 bg-(--banner-bg) py-20">
          <div className="flex size-14 items-center justify-center bg-black">
            <Check size={28} color="#fff" />
          </div>
          <p className="text-sm font-bold tracking-widest uppercase">{thankTitle}</p>
          <p className="max-w-xs text-center text-sm leading-relaxed text-gray-500">{thankBody}</p>
          <button
            onClick={() => {
              setSubmitted(false);
              setRating(0);
              setCategory('');
              setOrder('');
              setMessage('');
            }}
            className="mt-2 rounded-none bg-black px-8 py-3 text-xs font-bold tracking-[0.2em] text-white uppercase focus-visible:outline-none"
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
      <div className="mb-8 flex flex-col items-start justify-between gap-4 bg-(--banner-bg) px-8 py-7 sm:flex-row sm:items-center">
        <div>
          <p className="mb-1 text-xs tracking-[0.3em] text-gray-400 uppercase">{eyebrow}</p>
          <h2 className="text-[clamp(1rem,2vw,1.2rem)] font-bold tracking-widest uppercase">{bannerHead}</h2>
        </div>
        <p className="max-w-xs text-xs leading-relaxed text-gray-500">{bannerHint}</p>
      </div>

      <div className="space-y-8">
        {/* Star Rating */}
        <div>
          <label className="mb-4 block text-xs font-bold tracking-[0.15em] text-[#555] uppercase">
            {L.ratingLabel} <span className="text-(--sale)">{L.requiredMark}</span>
          </label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                onClick={() => setRating(star)}
                className={`transition-transform duration-100 focus-visible:outline-none ${
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
              <span className="ml-2 text-xs font-semibold tracking-wide text-accent">
                {ratingLabels[hoveredRating || rating]}
              </span>
            )}
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="mb-3 block text-xs font-bold tracking-[0.15em] text-[#555] uppercase">
            {L.labelCategory}
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory((c) => (c === cat ? '' : cat))}
                className={`rounded-none border px-4 py-2 text-xs tracking-wider uppercase transition-colors focus-visible:outline-none ${
                  category === cat
                    ? 'border-black bg-black font-bold text-white'
                    : 'border-[#d1d5db] bg-white font-normal text-[#555]'
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
            {L.labelOrder}{' '}
            <span className="font-normal tracking-normal text-gray-400 normal-case">{L.optionalSuffix}</span>
          </label>
          <div className="relative">
            <select
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              className="w-full cursor-pointer appearance-none rounded-none border border-[#d1d5db] bg-white px-4 py-3 text-sm outline-none"
            >
              <option value="">{L.placeholderOrder}</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.id} — {o.date} ({fmt(o.total)})
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-gray-400"
            />
          </div>
        </div>

        {/* Message */}
        <div>
          <label className={labelClass}>
            {L.labelMessage} <span className="text-(--sale)">{L.requiredMark}</span>
          </label>
          <p className="mb-3 text-xs text-gray-400">{L.messageHint}</p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={L.placeholderMessage}
            rows={5}
            className={`w-full resize-none rounded-none border px-4 py-3 text-sm outline-none ${
              msgFocused ? 'border-black' : 'border-[#d1d5db]'
            }`}
            onFocus={() => setMsgFocused(true)}
            onBlur={() => setMsgFocused(false)}
          />
          <div className="mt-1 flex justify-between">
            <span
              className={`text-xs ${message.length < 20 && message.length > 0 ? 'text-(--sale)' : 'text-gray-400'}`}
            >
              {message.length < 20 && message.length > 0 ? `${20 - message.length} ${L.charsNeededTpl}` : ''}
            </span>
            <span className="text-xs text-gray-300">
              {message.length} {L.charsCounterTpl}
            </span>
          </div>
        </div>

        {/* How it works steps */}
        <div className="grid grid-cols-1 gap-px bg-white sm:grid-cols-3">
          {L.howSteps.map((s) => (
            <div key={s.step} className="bg-white px-5 py-6">
              <p className="mb-2 text-xs font-extrabold tracking-widest text-accent">{s.step}</p>
              <p className="mb-1.5 text-sm font-bold">{s.title}</p>
              <p className="text-xs leading-relaxed text-gray-500">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Submit */}
        <div className="flex items-center gap-4 pt-2">
          <button
            onMouseEnter={() => setSubmitHovered(true)}
            onMouseLeave={() => setSubmitHovered(false)}
            onClick={() => {
              if (rating && message.length >= 20) setSubmitted(true);
            }}
            disabled={!rating || message.length < 20}
            className={`flex items-center gap-2 rounded-none px-10 py-3.5 text-xs font-bold tracking-[0.2em] text-white uppercase transition-colors duration-200 focus-visible:outline-none ${
              !rating || message.length < 20
                ? 'cursor-not-allowed bg-gray-400'
                : submitHovered
                  ? 'cursor-pointer bg-accent'
                  : 'cursor-pointer bg-black'
            }`}
          >
            <MessageSquare size={13} />
            {submitLabel}
          </button>
          <p className="text-xs text-gray-400">
            <span className="text-(--sale)">{L.requiredMark}</span> {requiredNote}
          </p>
        </div>
      </div>
    </div>
  );
}

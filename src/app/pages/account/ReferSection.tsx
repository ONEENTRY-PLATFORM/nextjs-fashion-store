'use client';
import { Check, Mail } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import { BANNER_BG, SALE_COLOR } from '@/app/constants/colors';
import { useAuth } from '@/app/context/AuthContext';
import { REFER_LABELS as L_FALLBACK } from '@/app/data/accountLabels';
import { CURRENCY } from '@/app/data/currencyConfig';
import { fillTokens } from '@/app/utils/fillTokens';
import { useDict } from '@/lib/oneentry/labels/DictContext';

import { ACCENT, SectionTitle } from './shared';

// OneEntry doesn't expose a referral programme for this tenant — config stays
// inline. Real stats / credits would come from a back-office system; for now
// the section operates as a share-link tool only.
const ref = {
  linkBase: 'https://oneentryfashion.com/ref/',
  creditAmount: 0,
  stats: { friendsInvited: 0, ordersPlaced: 0, creditsEarned: '$0' },
  minPurchase: 0,
  creditExpiryMonths: 0,
};

export function ReferSection() {
  const L = useDict('user_account_refer_', L_FALLBACK);
  const { user } = useAuth();
  const referralCode = `OE-${(user?.firstName ?? 'FRIEND').toUpperCase().slice(0, 4)}2026`;
  const referralLink = `${ref.linkBase}${referralCode}`;

  const [emails, setEmails] = useState('');
  const [sent, setSent] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const copyLinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyCodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyLinkTimerRef.current) clearTimeout(copyLinkTimerRef.current);
      if (copyCodeTimerRef.current) clearTimeout(copyCodeTimerRef.current);
      if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
    };
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink).catch(() => {});
    if (copyLinkTimerRef.current) clearTimeout(copyLinkTimerRef.current);
    setCopied(true);
    copyLinkTimerRef.current = setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode).catch(() => {});
    if (copyCodeTimerRef.current) clearTimeout(copyCodeTimerRef.current);
    setCodeCopied(true);
    copyCodeTimerRef.current = setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleSend = () => {
    if (!emails.trim()) return;
    if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
    setSent(true);
    setEmails('');
    sendTimerRef.current = setTimeout(() => setSent(false), 3000);
  };

  const sectionLabel = 'block text-xs uppercase tracking-[0.15em] mb-2 font-bold text-[#555]';

  // Rebuilt from the flat `howStepNTitle` / `howStepNDesc` keys. `%amount%` is
  // filled here because an admin-authored string cannot interpolate.
  const howSteps = [1, 2, 3].map((n) => ({
    step: String(n).padStart(2, '0'),
    title: fillTokens(L[`howStep${n}Title` as keyof typeof L] as string, {
      amount: CURRENCY.formatInteger(ref.creditAmount),
    }),
    desc: fillTokens(L[`howStep${n}Desc` as keyof typeof L] as string, {
      amount: CURRENCY.formatInteger(ref.creditAmount),
    }),
  }));

  return (
    <div
      style={
        {
          '--sale': SALE_COLOR,
          '--accent': ACCENT,
          '--banner-bg': BANNER_BG,
        } as React.CSSProperties
      }
    >
      <SectionTitle title={L.title} />

      {/* Hero banner */}
      <div className="mb-8 flex flex-col items-start justify-between gap-6 bg-(--banner-bg) p-8 sm:flex-row sm:items-center">
        <div>
          <p className="mb-1 text-xs tracking-[0.3em] text-gray-400 uppercase">{L.eyebrow}</p>
          <h2 className="mb-2 text-[clamp(1rem,2vw,1.3rem)] font-bold tracking-widest uppercase">
            {L.bannerHeadingTpl(CURRENCY.formatInteger(ref.creditAmount))}
          </h2>
          <p className="max-w-xs text-sm leading-relaxed text-gray-600">
            {L.bannerBodyPrefix}
            <strong>
              {L.bannerBodyCreditPrefix}
              {ref.creditAmount}
              {L.bannerBodyCreditSuffix}
            </strong>
            {L.bannerBodySuffix}
          </p>
        </div>
        <div className="shrink-0 text-center">
          <p className="mb-1 text-5xl font-extrabold text-accent">{CURRENCY.formatInteger(ref.creditAmount)}</p>
          <p className="text-xs tracking-widest text-gray-400 uppercase">{L.perReferral}</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="mb-8 grid grid-cols-3 gap-px bg-white">
        {[
          { label: L.statFriendsInvited, value: String(ref.stats.friendsInvited) },
          { label: L.statOrdersPlaced, value: String(ref.stats.ordersPlaced) },
          { label: L.statCreditsEarned, value: ref.stats.creditsEarned },
        ].map((stat) => (
          <div key={stat.label} className="bg-white px-4 py-5 text-center">
            <p className="mb-0.5 text-2xl font-bold text-black">{stat.value}</p>
            <p className="text-xs tracking-widest text-gray-400 uppercase">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        {/* Referral link */}
        <div>
          <label className={sectionLabel}>{L.linkLabel}</label>
          <div className="flex border border-[#d1d5db]">
            <span className="flex-1 truncate border-r border-[#d1d5db] bg-gray-50 px-4 py-3 text-sm text-gray-500">
              {referralLink}
            </span>
            <button
              onClick={handleCopyLink}
              className={`flex shrink-0 items-center gap-2 rounded-none px-5 py-3 text-xs font-semibold tracking-widest text-white uppercase transition-colors duration-200 focus-visible:outline-none ${
                copied ? 'bg-(--sale)' : 'bg-black'
              }`}
            >
              {copied ? <Check size={13} /> : null}
              {copied ? L.copied : L.copyLink}
            </button>
          </div>
        </div>

        {/* Referral code */}
        <div>
          <label className={sectionLabel}>{L.codeLabel}</label>
          <div className="flex items-center gap-4">
            <div className="border-2 border-dashed border-[#d1d5db] bg-[#fafafa] px-6 py-3 text-lg font-extrabold tracking-[0.35em] uppercase">
              {referralCode}
            </div>
            <button
              onClick={handleCopyCode}
              className={`flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase transition-opacity hover:opacity-70 focus-visible:outline-none ${
                codeCopied ? 'text-(--sale)' : 'text-black'
              }`}
            >
              {codeCopied ? <Check size={12} /> : null}
              {codeCopied ? L.copied : L.copyCode}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs tracking-widest text-gray-400 uppercase">{L.orInviteEmail}</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        {/* Email invite */}
        <div>
          <label className={sectionLabel}>{L.emailLabel}</label>
          <p className="mb-3 text-xs text-gray-400">{L.emailHint}</p>
          <textarea
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            placeholder={L.emailPlaceholder}
            rows={3}
            className={`w-full resize-none rounded-none border px-4 py-3 text-sm outline-none ${
              emailFocused ? 'border-black' : 'border-[#d1d5db]'
            }`}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
          />
          <button
            onClick={handleSend}
            className={`mt-3 flex items-center gap-2 rounded-none px-8 py-3 text-xs font-bold tracking-[0.2em] text-white uppercase transition-colors duration-200 focus-visible:outline-none ${
              sent ? 'bg-(--sale)' : 'bg-black'
            }`}
          >
            {sent ? <Check size={13} /> : <Mail size={13} />}
            {sent ? L.emailSent : L.emailCta}
          </button>
        </div>

        {/* How it works */}
        <div className="pt-4">
          <p className="mb-4 text-xs font-bold tracking-[0.15em] text-[#555] uppercase">{L.howItWorks}</p>
          <div className="grid grid-cols-1 gap-px bg-white sm:grid-cols-3">
            {howSteps.map((s) => (
              <div key={s.step} className="bg-white px-5 py-6">
                <p className="mb-2 text-xs font-extrabold tracking-widest text-accent">{s.step}</p>
                <p className="mb-1.5 text-sm font-bold">{s.title}</p>
                <p className="text-xs leading-relaxed text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Terms */}
        <p className="pt-2 text-xs leading-relaxed text-gray-400">
          {L.termsTpl(ref.minPurchase, ref.creditExpiryMonths)}
        </p>
      </div>
    </div>
  );
}

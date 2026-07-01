'use client'
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Check, Mail } from 'lucide-react';
import { SectionTitle, ACCENT } from './shared';
import { SALE_COLOR, BANNER_BG } from '../../constants/colors';
import { REFER_LABELS as L } from '../../data/accountLabels';
import { CURRENCY } from '../../data/currencyConfig';

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

  return (
    <div
      style={{
        '--sale': SALE_COLOR,
        '--accent': ACCENT,
        '--banner-bg': BANNER_BG,
      } as React.CSSProperties}
    >
      <SectionTitle title={L.title} />

      {/* Hero banner */}
      <div className="mb-8 p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 bg-[var(--banner-bg)]">
        <div>
          <p className="text-xs tracking-[0.3em] uppercase text-gray-400 mb-1">{L.eyebrow}</p>
          <h2 className="tracking-widest uppercase mb-2 text-[clamp(1rem,2vw,1.3rem)] font-bold">
            {L.bannerHeadingTpl(CURRENCY.formatInteger(ref.creditAmount))}
          </h2>
          <p className="text-sm text-gray-600 max-w-xs leading-relaxed">
            {L.bannerBodyPrefix}<strong>{L.bannerBodyCreditPrefix}{ref.creditAmount}{L.bannerBodyCreditSuffix}</strong>{L.bannerBodySuffix}
          </p>
        </div>
        <div className="flex-shrink-0 text-center">
          <p className="text-5xl mb-1 font-extrabold text-[var(--accent)]">{CURRENCY.formatInteger(ref.creditAmount)}</p>
          <p className="text-xs tracking-widest uppercase text-gray-400">{L.perReferral}</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-px bg-white mb-8">
        {[
          { label: L.statFriendsInvited, value: String(ref.stats.friendsInvited) },
          { label: L.statOrdersPlaced, value: String(ref.stats.ordersPlaced) },
          { label: L.statCreditsEarned, value: ref.stats.creditsEarned },
        ].map(stat => (
          <div key={stat.label} className="bg-white px-4 py-5 text-center">
            <p className="text-2xl mb-0.5 font-bold text-black">{stat.value}</p>
            <p className="text-xs text-gray-400 tracking-widest uppercase">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        {/* Referral link */}
        <div>
          <label className={sectionLabel}>
            {L.linkLabel}
          </label>
          <div className="flex border border-[#d1d5db]">
            <span className="flex-1 px-4 py-3 text-sm text-gray-500 bg-gray-50 truncate border-r border-[#d1d5db]">
              {referralLink}
            </span>
            <button
              onClick={handleCopyLink}
              className={`px-5 py-3 text-xs tracking-widest uppercase flex items-center gap-2 focus-visible:outline-none transition-colors duration-200 flex-shrink-0 text-white rounded-none font-semibold ${
                copied ? 'bg-[var(--sale)]' : 'bg-black'
              }`}
            >
              {copied ? <Check size={13} /> : null}
              {copied ? L.copied : L.copyLink}
            </button>
          </div>
        </div>

        {/* Referral code */}
        <div>
          <label className={sectionLabel}>
            {L.codeLabel}
          </label>
          <div className="flex items-center gap-4">
            <div className="px-6 py-3 text-lg uppercase border-2 border-dashed border-[#d1d5db] font-extrabold tracking-[0.35em] bg-[#fafafa]">
              {referralCode}
            </div>
            <button
              onClick={handleCopyCode}
              className={`text-xs tracking-widest uppercase flex items-center gap-1.5 focus-visible:outline-none hover:opacity-70 transition-opacity font-semibold ${
                codeCopied ? 'text-[var(--sale)]' : 'text-black'
              }`}
            >
              {codeCopied ? <Check size={12} /> : null}
              {codeCopied ? L.copied : L.copyCode}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 tracking-widest uppercase">{L.orInviteEmail}</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Email invite */}
        <div>
          <label className={sectionLabel}>
            {L.emailLabel}
          </label>
          <p className="text-xs text-gray-400 mb-3">{L.emailHint}</p>
          <textarea
            value={emails}
            onChange={e => setEmails(e.target.value)}
            placeholder={L.emailPlaceholder}
            rows={3}
            className={`w-full px-4 py-3 text-sm outline-none resize-none border rounded-none ${
              emailFocused ? 'border-black' : 'border-[#d1d5db]'
            }`}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
          />
          <button
            onClick={handleSend}
            className={`mt-3 px-8 py-3 text-xs tracking-[0.2em] uppercase text-white flex items-center gap-2 focus-visible:outline-none rounded-none font-bold transition-colors duration-200 ${
              sent ? 'bg-[var(--sale)]' : 'bg-black'
            }`}
          >
            {sent ? <Check size={13} /> : <Mail size={13} />}
            {sent ? L.emailSent : L.emailCta}
          </button>
        </div>

        {/* How it works */}
        <div className="pt-4">
          <p className="text-xs uppercase tracking-[0.15em] mb-4 font-bold text-[#555]">{L.howItWorks}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-white">
            {L.howSteps(ref.creditAmount).map(s => (
              <div key={s.step} className="bg-white px-5 py-6">
                <p className="text-xs tracking-widest mb-2 font-extrabold text-[var(--accent)]">{s.step}</p>
                <p className="text-sm mb-1.5 font-bold">{s.title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Terms */}
        <p className="text-xs text-gray-400 leading-relaxed pt-2">
          {L.termsTpl(ref.minPurchase, ref.creditExpiryMonths)}
        </p>
      </div>
    </div>
  );
}

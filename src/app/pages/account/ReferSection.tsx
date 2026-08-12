'use client';
import { Check, Mail } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import { BANNER_BG, SALE_COLOR } from '@/app/constants/colors';
import { useAuth } from '@/app/context/AuthContext';
import { CURRENCY } from '@/app/data/currencyConfig';
import { SITE_URL } from '@/app/data/seoData';
import { fillTokens } from '@/app/utils/fillTokens';
import { useDict } from '@/lib/oneentry/labels/DictContext';
import { useSiteSettings } from '@/lib/oneentry/SiteSettingsContext';

import { ACCENT, SectionTitle } from './shared';

// ─── Refer a Friend section ─────────────────────────────────────────────────
export const REFER_LABELS = {
  title: 'Refer a Friend',
  eyebrow: 'Exclusive Offer',
  bannerHeadingTpl: (amount: string) => `Give ${amount}, Get ${amount}`,
  bannerBodyPrefix: 'Invite a friend to KEKIMORO. When they place their first order, you both receive a ',
  // The currency symbol is not copy — it is rendered from the configured
  // currency at the call site, so a shop that switches to € does not have to
  // remember to reword this label too.
  bannerBodyCreditSuffix: ' store credit',
  bannerBodySuffix: '.',
  perReferral: 'per referral',
  // The `statFriendsInvited` / `statOrdersPlaced` / `statCreditsEarned` labels
  // were dropped with the stats row they titled: nothing on this tenant counts
  // referrals, so the row could only render fixed zeros.
  // Link
  linkLabel: 'Your Referral Link',
  copyLink: 'Copy Link',
  copied: 'Copied!',
  // Code
  codeLabel: 'Your Referral Code',
  copyCode: 'Copy Code',
  // Email
  orInviteEmail: 'or invite by email',
  emailLabel: 'Invite via Email',
  emailHint: 'Enter one or more email addresses, separated by commas.',
  emailPlaceholder: 'friend@example.com, another@example.com',
  emailCta: 'Send Invitations',
  emailSent: 'Invitations Sent!',
  // How it works
  howItWorks: 'How It Works',
  // Flat strings so the dictionary can reach them. The third step needs the
  // credit amount, which an admin-authored value cannot interpolate — hence a
  // `%amount%` placeholder filled by `fillTokens` at render time.
  howStep1Title: 'Share Your Link',
  howStep1Desc: 'Send your unique referral link or code to friends and family.',
  howStep2Title: 'Friend Signs Up',
  howStep2Desc: 'Your friend creates an account and places their first order.',
  howStep3Title: 'Both Get %amount%',
  howStep3Desc: 'You receive %amount% store credit. Your friend gets %amount% off their order.',
  // Terms
  termsTpl: (minPurchase: number, months: number) =>
    `* Store credit is applied after the referred friend completes their first purchase of ${CURRENCY.formatInteger(minPurchase)} or more. ` +
    `Credits expire ${months} months after being issued. Cannot be combined with other promotional offers.`,
} as const;

const L_FALLBACK = REFER_LABELS;

export function ReferSection() {
  const L = useDict('user_account_refer_', L_FALLBACK);
  const { user } = useAuth();
  // Programme terms are editor-owned (OE `site_settings` → `Referral — …`).
  // `enabled` is derived from the credit: zero means the shop is not paying
  // anything out, and the section then renders as what it actually is — a
  // share-your-link tool — instead of advertising a reward nobody honours.
  const { referral } = useSiteSettings();
  const referralCode = `OE-${(user?.firstName ?? 'FRIEND').toUpperCase().slice(0, 4)}2026`;
  // On our own origin: the base used to be a hard-coded third-party domain
  // that does not serve this storefront, so every shared link 404'd.
  const referralLink = `${SITE_URL}/ref/${referralCode}`;

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
  const creditLabel = CURRENCY.formatInteger(referral.creditAmount);
  const howSteps = [1, 2, 3].map((n) => ({
    step: String(n).padStart(2, '0'),
    title: fillTokens(L[`howStep${n}Title` as keyof typeof L] as string, { amount: creditLabel }),
    desc: fillTokens(L[`howStep${n}Desc` as keyof typeof L] as string, { amount: creditLabel }),
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

      {/* Reward banner — only when the admin panel actually funds a credit.
          The per-shopper stats row that used to sit under it was removed: no
          system on this tenant counts referrals, so it could only ever render
          three hard-coded zeros dressed up as a dashboard. */}
      {referral.enabled ? (
        <div
          className="mb-8 flex flex-col items-start justify-between gap-6 bg-(--banner-bg) p-8 sm:flex-row sm:items-center"
          data-testid="refer-reward-banner"
        >
          <div>
            <p className="mb-1 text-xs tracking-[0.3em] text-gray-400 uppercase">{L.eyebrow}</p>
            <h2 className="mb-2 text-[clamp(1rem,2vw,1.3rem)] font-bold tracking-widest uppercase">
              {L.bannerHeadingTpl(creditLabel)}
            </h2>
            <p className="max-w-xs text-sm leading-relaxed text-gray-600">
              {L.bannerBodyPrefix}
              <strong>
                {CURRENCY.symbol}
                {referral.creditAmount}
                {L.bannerBodyCreditSuffix}
              </strong>
              {L.bannerBodySuffix}
            </p>
          </div>
          <div className="shrink-0 text-center">
            <p className="mb-1 text-5xl font-extrabold text-accent">{creditLabel}</p>
            <p className="text-xs tracking-widest text-gray-400 uppercase">{L.perReferral}</p>
          </div>
        </div>
      ) : null}

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

        {/* How it works — describes earning a credit, so it follows the same
            switch as the banner. */}
        {referral.enabled ? (
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
        ) : null}

        {/* Terms */}
        {referral.enabled ? (
          <p className="pt-2 text-xs leading-relaxed text-gray-400">
            {L.termsTpl(referral.minPurchase, referral.creditExpiryMonths)}
          </p>
        ) : null}
      </div>
    </div>
  );
}

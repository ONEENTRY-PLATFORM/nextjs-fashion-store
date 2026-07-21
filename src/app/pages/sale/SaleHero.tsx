'use client'
import Image from 'next/image';
import { Tag, ChevronRight } from 'lucide-react';
import { CountdownUnit } from './SaleCountdown';
import { SALE_PAGE_LABELS as L } from '../../data/salePageLabels';
import { useSalePageT } from '../../../lib/oneentry/labels/SalePageLabelsContext';
import type { SalePageFromCms } from '../../../lib/oneentry/catalog/sale-page';

interface SaleHeroProps {
  countdown: { days: number; hours: number; minutes: number; seconds: number };
  /** Countdown target as an epoch ms — used to build the "Ends …" caption
   *  under the numbers when OE doesn't provide `timerEndsText`. */
  endsAt?: number;
  /** OE `sale` page attributes. When present, drives all banner copy /
   *  image / CTA. Missing fields degrade to the static `L.*` fallbacks. */
  cms?: SalePageFromCms | null;
}

const FALLBACK_HERO_IMAGE = 'https://images.unsplash.com/photo-1609017604163-e4ca9c619b9b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXNoaW9uJTIwc2FsZSUyMGRpc2NvdW50JTIwc2hvcHBpbmclMjB3b21lbiUyMGNsb3RoaW5nfGVufDF8fHx8MTc3MjAzMDY1MHww&ixlib=rb-4.1.0&q=80&w=1080';

const ENDS_AT_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** Parse the OE `text.plainValue` into the four visual slots of the
 *  original hero markup. Convention (documented for the admin panel):
 *    line 1 → giant title line 1
 *    line 2 → giant title line 2
 *    line 3 → discount line, split on `NN%` into { prefix, percent, suffix }
 *              e.g. `"UP TO 50% OFF"` → `{ prefix:"UP TO", percent:"50%", suffix:"OFF" }`.
 *              If no `NN%` is present the whole line renders as `prefix`.
 *    line 4+ (joined by space) → subtitle
 *
 *  Missing lines fall through to the static `L.*` labels so the banner
 *  keeps its shape even when the admin gives us less content. */
export function parseHeroPlain(plain: string) {
  const lines = plain.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const titleLine1 = lines[0] || L.heroTitleLine1;
  const titleLine2 = lines[1] || L.heroTitleLine2;
  const discountLine = lines[2] || '';
  const subtitle = lines.slice(3).join(' ') || (lines.length > 0 ? '' : L.heroSubtitle);
  const m = discountLine.match(/^(.*?)\s*(\d+%)\s*(.*)$/);
  const discount = m
    ? { prefix: m[1].trim(), percent: m[2], suffix: m[3].trim() }
    : discountLine
      ? { prefix: discountLine, percent: '', suffix: '' }
      : { prefix: L.heroUpTo, percent: L.heroPercent, suffix: L.heroOff };
  return { titleLine1, titleLine2, discount, subtitle };
}

export function SaleHero({ countdown, endsAt, cms }: SaleHeroProps) {
  const lDays    = useSalePageT('sale_page_top_banner_days',  L.countdownDays);
  const lHours   = useSalePageT('sale_page_top_banner_hours', L.countdownHours);
  const lMinutes = useSalePageT('sale_page_top_banner_min',   L.countdownMinutes);
  const lSeconds = useSalePageT('sale_page_top_banner_sec',   L.countdownSeconds);

  const heroImage    = cms?.hero.image || FALLBACK_HERO_IMAGE;
  const eyebrow      = cms?.hero.eyebrow || L.heroEyebrow;
  const contentHtml  = cms?.hero.contentHtml || '';
  const ctaLabel     = cms?.hero.ctaLabel || L.heroShopSale;
  const timerLabel   = cms?.hero.timerLabel || L.countdownLabel;
  const endsCaption  = cms?.hero.timerEndsText
    || (endsAt ? `Ends ${ENDS_AT_FORMATTER.format(new Date(endsAt))}` : L.countdownEndsAt);
  const parsed = parseHeroPlain(cms?.hero.contentPlain || '');

  return (
    <div className="relative overflow-hidden">
      <Image
        src={heroImage}
        alt={L.heroImageAlt}
        fill
        sizes="100vw"
        priority
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.1)_60%,transparent_100%)]" />

      <div className="relative z-10 px-4 lg:px-8 py-12 md:py-16 flex flex-col md:flex-row items-center justify-between gap-10">
        {/* Left */}
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-4">
            <Tag size={13} className="text-white opacity-80" />
            <span className="text-white text-xs tracking-[0.3em] uppercase opacity-80">{eyebrow}</span>
          </div>
          {contentHtml ? (
            // Admin filled the OE rich-text editor with actual HTML —
            // render as-is. Treated as trusted first-party content (same
            // as product descriptions in ProductDetailPage).
            <div
              className="oe-rich-text text-white mb-6"
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />
          ) : (
            // No HTML — reconstruct the original title / discount /
            // subtitle layout from `plainValue` so the banner keeps its
            // visual weight. Falls all the way through to static `L.*`
            // labels when the plain field is also blank.
            <>
              <h1 className="hero-h1 text-white uppercase mb-2">
                {parsed.titleLine1}<br />{parsed.titleLine2}
              </h1>
              <div className="flex items-baseline gap-2 mb-5">
                {parsed.discount.prefix && (
                  <span className="text-white tracking-widest text-[clamp(1.25rem,3vw,1.75rem)] font-normal">{parsed.discount.prefix}</span>
                )}
                {parsed.discount.percent && (
                  <span className="text-white text-[clamp(3rem,8vw,6rem)] font-semibold tracking-[-0.03em]">{parsed.discount.percent}</span>
                )}
                {parsed.discount.suffix && (
                  <span className="text-white tracking-widest text-[clamp(1.25rem,3vw,1.75rem)] font-normal">{parsed.discount.suffix}</span>
                )}
              </div>
              {parsed.subtitle && (
                <p className="text-white mb-6 text-[13px] opacity-70 max-w-[320px]">
                  {parsed.subtitle}
                </p>
              )}
            </>
          )}
          <a
            href={L.heroShopSaleHref}
            className="self-start flex items-center gap-2 px-6 py-3 text-xs tracking-widest uppercase text-white focus-visible:outline-none hover:gap-3 transition-all bg-[var(--sale)] rounded-lg font-semibold"
          >
            {ctaLabel} <ChevronRight size={13} />
          </a>
        </div>

        {/* Right: countdown */}
        <div className="flex flex-col items-center">
          <p className="text-white text-xs tracking-[0.25em] uppercase mb-4 opacity-65">
            {timerLabel}
          </p>
          <div className="flex items-end gap-2.5">
            <CountdownUnit value={countdown.days} label={lDays} />
            <span className="text-white mb-3.5 text-xl font-bold opacity-40">:</span>
            <CountdownUnit value={countdown.hours} label={lHours} />
            <span className="text-white mb-3.5 text-xl font-bold opacity-40">:</span>
            <CountdownUnit value={countdown.minutes} label={lMinutes} />
            <span className="text-white mb-3.5 text-xl font-bold opacity-40">:</span>
            <CountdownUnit value={countdown.seconds} label={lSeconds} />
          </div>
          <p className="text-white text-xs mt-3 opacity-45" suppressHydrationWarning>
            {endsCaption}
          </p>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--sale)]" />
    </div>
  );
}

'use client';
import { ChevronRight, Tag } from 'lucide-react';

import CmsImage from '@/app/components/ui/CmsImage';
import { SALE_PAGE_LABELS as L } from '@/app/pages/sale/copy';
import type { SalePageFromCms } from '@/lib/oneentry/catalog/sale-page';
import { useDict, useT } from '@/lib/oneentry/labels/DictContext';
import { sanitizeHtml } from '@/lib/sanitize-html';

import { CountdownUnit } from './SaleCountdown';

interface SaleHeroProps {
  countdown: { days: number; hours: number; minutes: number; seconds: number };
  /** Countdown target as an epoch ms. */
  endsAt?: number;
  /** OE `sale` page attributes. */
  cms?: SalePageFromCms | null;
}

const FALLBACK_HERO_IMAGE =
  'https://images.unsplash.com/photo-1609017604163-e4ca9c619b9b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXNoaW9uJTIwc2FsZSUyMGRpc2NvdW50JTIwc2hvcHBpbmclMjB3b21lbiUyMGNsb3RoaW5nfGVufDF8fHx8MTc3MjAzMDY1MHww&ixlib=rb-4.1.0&q=80&w=1080';

const ENDS_AT_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** Parse the OE `text.plainValue` into the four visual slots of the original hero markup. */
export function parseHeroPlain(plain: string) {
  const lines = plain
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
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
  // Whole-object overlay: every string in `SALE_PAGE_LABELS` is editable as `sale_page_<snake_case_key>`. `parseHeroPlain` keeps reading the static object because it runs outside React.
  const SP = useDict('sale_page_', L);
  const lEndsPrefix = useT('sale_page_countdown_ends_prefix', 'Ends');
  const lDays = useT('sale_page_top_banner_days', SP.countdownDays);
  const lHours = useT('sale_page_top_banner_hours', SP.countdownHours);
  const lMinutes = useT('sale_page_top_banner_min', SP.countdownMinutes);
  const lSeconds = useT('sale_page_top_banner_sec', SP.countdownSeconds);

  const heroImage = cms?.hero.image || FALLBACK_HERO_IMAGE;
  // Only the CMS picture has an LQIP; the bundled fallback has none.
  const heroBlur = cms?.hero.image ? cms.hero.imageBlur : undefined;
  const eyebrow = cms?.hero.eyebrow || SP.heroEyebrow;
  const contentHtml = cms?.hero.contentHtml || '';
  const ctaLabel = cms?.hero.ctaLabel || SP.heroShopSale;
  const timerLabel = cms?.hero.timerLabel || SP.countdownLabel;
  const endsCaption =
    cms?.hero.timerEndsText ||
    (endsAt ? `${lEndsPrefix} ${ENDS_AT_FORMATTER.format(new Date(endsAt))}` : SP.countdownEndsAt);
  const parsed = parseHeroPlain(cms?.hero.contentPlain || '');

  return (
    <div className="relative overflow-hidden">
      <CmsImage
        src={heroImage}
        blur={heroBlur}
        alt={SP.heroImageAlt}
        fill
        sizes="100vw"
        priority
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.1)_60%,transparent_100%)]" />

      <div className="relative z-10 flex flex-col items-center justify-between gap-10 px-4 py-12 md:flex-row md:py-16 lg:px-8">
        {/* Left */}
        <div className="flex flex-col justify-center">
          <div className="mb-4 flex items-center gap-2">
            <Tag size={13} className="text-white opacity-80" />
            <span className="text-xs tracking-[0.3em] text-white uppercase opacity-80">{eyebrow}</span>
          </div>
          {contentHtml ? (
            // Admin filled the OE rich-text editor with actual HTML.
            <div
              className="oe-rich-text mb-6 text-white"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(contentHtml) }}
            />
          ) : (
            // No HTML — reconstruct the original title / discount / subtitle layout from `plainValue` so the banner keeps its visual weight.
            <>
              <h1 className="hero-h1 mb-2 text-white uppercase">
                {parsed.titleLine1}
                <br />
                {parsed.titleLine2}
              </h1>
              <div className="mb-5 flex items-baseline gap-2">
                {parsed.discount.prefix && (
                  <span className="text-[clamp(1.25rem,3vw,1.75rem)] font-normal tracking-widest text-white">
                    {parsed.discount.prefix}
                  </span>
                )}
                {parsed.discount.percent && (
                  <span className="text-[clamp(3rem,8vw,6rem)] font-semibold tracking-[-0.03em] text-white">
                    {parsed.discount.percent}
                  </span>
                )}
                {parsed.discount.suffix && (
                  <span className="text-[clamp(1.25rem,3vw,1.75rem)] font-normal tracking-widest text-white">
                    {parsed.discount.suffix}
                  </span>
                )}
              </div>
              {parsed.subtitle && <p className="mb-6 max-w-80 text-[13px] text-white opacity-70">{parsed.subtitle}</p>}
            </>
          )}
          <a
            href={L.heroShopSaleHref}
            className="flex items-center gap-2 self-start rounded-lg bg-(--sale) px-6 py-3 text-xs font-semibold tracking-widest text-white uppercase transition-all hover:gap-3 focus-visible:outline-none"
          >
            {ctaLabel} <ChevronRight size={13} />
          </a>
        </div>

        {/* Right: countdown */}
        <div className="flex flex-col items-center">
          <p className="mb-4 text-xs tracking-[0.25em] text-white uppercase opacity-65">{timerLabel}</p>
          <div className="flex items-end gap-2.5">
            <CountdownUnit value={countdown.days} label={lDays} />
            <span className="mb-3.5 text-xl font-bold text-white opacity-40">:</span>
            <CountdownUnit value={countdown.hours} label={lHours} />
            <span className="mb-3.5 text-xl font-bold text-white opacity-40">:</span>
            <CountdownUnit value={countdown.minutes} label={lMinutes} />
            <span className="mb-3.5 text-xl font-bold text-white opacity-40">:</span>
            <CountdownUnit value={countdown.seconds} label={lSeconds} />
          </div>
          <p className="mt-3 text-xs text-white opacity-45" suppressHydrationWarning>
            {endsCaption}
          </p>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-1 bg-(--sale)" />
    </div>
  );
}

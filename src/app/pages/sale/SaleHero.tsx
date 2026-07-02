'use client'
import Image from 'next/image';
import { Tag, ChevronRight } from 'lucide-react';
import { CountdownUnit } from './SaleCountdown';
import { SALE_PAGE_LABELS as L } from '../../data/salePageLabels';
import { useSalePageT } from '../../../lib/oneentry/labels/SalePageLabelsContext';

interface SaleHeroProps {
  countdown: { days: number; hours: number; minutes: number; seconds: number };
  /** Countdown target as an epoch ms — used to build the "Ends …" caption
   *  under the numbers so the banner reflects whatever the OE admin set. */
  endsAt?: number;
}

const ENDS_AT_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function SaleHero({ countdown, endsAt }: SaleHeroProps) {
  const lDays    = useSalePageT('sale_page_top_banner_days',  L.countdownDays);
  const lHours   = useSalePageT('sale_page_top_banner_hours', L.countdownHours);
  const lMinutes = useSalePageT('sale_page_top_banner_min',   L.countdownMinutes);
  const lSeconds = useSalePageT('sale_page_top_banner_sec',   L.countdownSeconds);
  return (
    <div className="relative overflow-hidden">
      <Image
        src="https://images.unsplash.com/photo-1609017604163-e4ca9c619b9b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXNoaW9uJTIwc2FsZSUyMGRpc2NvdW50JTIwc2hvcHBpbmclMjB3b21lbiUyMGNsb3RoaW5nfGVufDF8fHx8MTc3MjAzMDY1MHww&ixlib=rb-4.1.0&q=80&w=1080"
        alt={L.heroImageAlt}
        fill
        sizes="100vw"
        priority
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(0,0,0,0.82)_0%,rgba(218,30,30,0.55)_60%,rgba(0,0,0,0.3)_100%)]" />

      <div className="relative z-10 px-4 lg:px-8 py-12 md:py-16 flex flex-col md:flex-row items-center justify-between gap-10">
        {/* Left */}
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-4">
            <Tag size={13} className="text-white opacity-80" />
            <span className="text-white text-xs tracking-[0.3em] uppercase opacity-80">{L.heroEyebrow}</span>
          </div>
          <h1 className="hero-h1 text-white uppercase mb-2">
            {L.heroTitleLine1}<br />{L.heroTitleLine2}
          </h1>
          <div className="flex items-baseline gap-2 mb-5">
            <span className="text-white tracking-widest text-[clamp(1.25rem,3vw,1.75rem)] font-normal">{L.heroUpTo}</span>
            <span className="text-white text-[clamp(3rem,8vw,6rem)] font-semibold tracking-[-0.03em]">{L.heroPercent}</span>
            <span className="text-white tracking-widest text-[clamp(1.25rem,3vw,1.75rem)] font-normal">{L.heroOff}</span>
          </div>
          <p className="text-white mb-6 text-[13px] opacity-70 max-w-[320px]">
            {L.heroSubtitle}
          </p>
          <a
            href={L.heroShopSaleHref}
            className="self-start flex items-center gap-2 px-6 py-3 text-xs tracking-widest uppercase text-white focus-visible:outline-none hover:gap-3 transition-all bg-[var(--sale)] rounded-lg font-semibold"
          >
            {L.heroShopSale} <ChevronRight size={13} />
          </a>
        </div>

        {/* Right: countdown */}
        <div className="flex flex-col items-center">
          <p className="text-white text-xs tracking-[0.25em] uppercase mb-4 opacity-65">
            {L.countdownLabel}
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
            {endsAt ? `Ends ${ENDS_AT_FORMATTER.format(new Date(endsAt))}` : L.countdownEndsAt}
          </p>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--sale)]" />
    </div>
  );
}

'use client'
import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Header } from '../components/header/Header';
import { Footer } from '../components/footer/Footer';
import { PageBlocksRenderer } from '../components/blocks/PageBlocksRenderer';
import type { PageBlock } from '../../lib/oneentry/blocks/page-blocks';
import { ChevronRight, Edit3, LayoutTemplate, Globe, Zap } from 'lucide-react';
import {
  INFO_PAGE_SECTIONS,
  INFO_PAGE_STATS,
  INFO_PAGE_FEATURE_CARDS,
} from '../data/infoPageLabels';
import { useInfoPageT } from '../../lib/oneentry/labels/InfoPageLabelsContext';
import {
  INFO_SECTION_BLOCK_PREFIX,
  infoSectionsFromBlocks,
} from '../../lib/oneentry/blocks/info-sections';

/* Offline fallbacks for the two long-form paragraphs. Short one-off strings are
   passed inline at the `useInfoPageT` call site — a separate dictionary file for
   a string used once only adds an indirection that drifts out of sync. These two
   are constants purely because a 300-character literal inside a hook call is
   unreadable. */
const FALLBACK_LEAD =
  "Kekimoro was born from a simple belief: great style should never come at the expense of quality or conscience. "
  + "Below you'll find everything about who we are, how we work, and how we can help — all managed and updated in real time through the OneEntry Platform.";
const FALLBACK_CTA_BODY =
  'Every section above — headings, body text, images, layout order — is stored in the OneEntry Platform and can be updated '
  + 'by your marketing team in real time, with no code changes and no redeployment required.';

interface InfoSection {
  eyebrow: string;
  heading: string;
  body: string;
  image: string;
  imageAlt: string;
  imageRight: boolean;
}

/**
 * Adapt OE section blocks to the layout's shape.
 *
 * Content extraction lives in `blocks/info-sections.ts` so the FAQ
 * structured-data builder describes exactly the sections rendered here.
 * `imageRight` is presentation only — the layout alternates sides, which keeps
 * the zig-zag intact no matter how many sections the tenant adds or reorders.
 */
function sectionsFromBlocks(blocks: PageBlock[] | undefined): InfoSection[] {
  return infoSectionsFromBlocks(blocks).map((s, i) => ({
    ...s,
    imageAlt: s.heading,
    imageRight: i % 2 === 1,
  }));
}

const ICON_MAP = {
  edit: <Edit3 size={20} />,
  layout: <LayoutTemplate size={20} />,
  zap: <Zap size={20} />,
  globe: <Globe size={20} />,
};
const FEATURE_CARDS = INFO_PAGE_FEATURE_CARDS.map(c => ({ ...c, icon: ICON_MAP[c.iconKey] }));

/* ─── Component ──────────────────────────────────────────────────────────── */
export function InfoPage({ pageBlocks }: { pageBlocks?: PageBlock[] } = {}) {
  const router = useRouter();

  // Editorial sections come from OE; the local dataset is the offline fallback.
  const cmsSections = sectionsFromBlocks(pageBlocks);
  const SECTIONS: readonly InfoSection[] = cmsSections.length > 0
    ? cmsSections
    : INFO_PAGE_SECTIONS.map((s, i) => ({ ...s, imageRight: i % 2 === 1 }));

  // Section blocks are rendered by the bespoke layout above, so keep them out
  // of the generic renderer at the bottom — otherwise they'd appear twice.
  const otherBlocks = (pageBlocks ?? []).filter((b) => !b.marker?.startsWith(INFO_SECTION_BLOCK_PREFIX));

  // Page chrome copy from the OE `info_page` set; the local dataset is the
  // offline fallback. Icon choice for the feature cards stays in code — it
  // selects a component, it is not copy.
  const heroHeading   = useInfoPageT('info_hero_heading', 'About Kekimoro');
  const heroSubtitle  = useInfoPageT('info_hero_subtitle', 'Our story, our values, delivery, returns, sizing and more — everything you need to know.');
  const heroImageAlt  = useInfoPageT('info_hero_image_alt', 'Kekimoro editorial');
  const crumbHome     = useInfoPageT('info_hero_breadcrumb_home', 'Home');
  const crumbCurrent  = useInfoPageT('info_hero_breadcrumb_current', 'Info');
  const demoStrong    = useInfoPageT('info_demo_strong', 'Demo page');
  const demoMid       = useInfoPageT('info_demo_mid', '— This content is managed through the');
  const demoPlatform  = useInfoPageT('info_demo_platform', 'OneEntry Platform');
  const demoSuffix    = useInfoPageT('info_demo_suffix', '. Edit text, images and layout from your dashboard — no code required.');
  const leadParagraph = useInfoPageT('info_lead_paragraph', FALLBACK_LEAD);
  const ctaEyebrow    = useInfoPageT('info_cta_eyebrow', 'Powered by OneEntry Platform');
  const ctaHeading    = useInfoPageT('info_cta_heading', 'This entire page is editable from the dashboard');
  const ctaBody       = useInfoPageT('info_cta_body', FALLBACK_CTA_BODY);
  const ctaExplore    = useInfoPageT('info_cta_explore_label', 'Explore OneEntry Platform');
  const ctaExploreShort = useInfoPageT('info_cta_explore_short', 'Explore OneEntry →');
  const ctaExploreHref  = useInfoPageT('info_cta_explore_href', 'https://oneentry.cloud');
  const ctaSdkLabel   = useInfoPageT('info_cta_sdk_label', 'View SDK Docs');
  const ctaSdkHref    = useInfoPageT('info_cta_sdk_href', 'https://js-sdk.oneentry.cloud/docs/index/');

  // Four stats and four cards are a fixed layout slot, so each key is read with
  // its own top-level hook call — a loop would break the rules of hooks.
  const stat1Value = useInfoPageT('info_stat_1_value', INFO_PAGE_STATS[0]?.value ?? '');
  const stat1Label = useInfoPageT('info_stat_1_label', INFO_PAGE_STATS[0]?.label ?? '');
  const stat2Value = useInfoPageT('info_stat_2_value', INFO_PAGE_STATS[1]?.value ?? '');
  const stat2Label = useInfoPageT('info_stat_2_label', INFO_PAGE_STATS[1]?.label ?? '');
  const stat3Value = useInfoPageT('info_stat_3_value', INFO_PAGE_STATS[2]?.value ?? '');
  const stat3Label = useInfoPageT('info_stat_3_label', INFO_PAGE_STATS[2]?.label ?? '');
  const stat4Value = useInfoPageT('info_stat_4_value', INFO_PAGE_STATS[3]?.value ?? '');
  const stat4Label = useInfoPageT('info_stat_4_label', INFO_PAGE_STATS[3]?.label ?? '');
  const stats = [
    { value: stat1Value, label: stat1Label },
    { value: stat2Value, label: stat2Label },
    { value: stat3Value, label: stat3Label },
    { value: stat4Value, label: stat4Label },
  ].filter((s) => s.value || s.label);

  const card1Title = useInfoPageT('info_card_1_title', FEATURE_CARDS[0]?.title ?? '');
  const card1Desc  = useInfoPageT('info_card_1_desc',  FEATURE_CARDS[0]?.desc ?? '');
  const card2Title = useInfoPageT('info_card_2_title', FEATURE_CARDS[1]?.title ?? '');
  const card2Desc  = useInfoPageT('info_card_2_desc',  FEATURE_CARDS[1]?.desc ?? '');
  const card3Title = useInfoPageT('info_card_3_title', FEATURE_CARDS[2]?.title ?? '');
  const card3Desc  = useInfoPageT('info_card_3_desc',  FEATURE_CARDS[2]?.desc ?? '');
  const card4Title = useInfoPageT('info_card_4_title', FEATURE_CARDS[3]?.title ?? '');
  const card4Desc  = useInfoPageT('info_card_4_desc',  FEATURE_CARDS[3]?.desc ?? '');
  const cards = [
    { icon: FEATURE_CARDS[0]?.icon, title: card1Title, desc: card1Desc },
    { icon: FEATURE_CARDS[1]?.icon, title: card2Title, desc: card2Desc },
    { icon: FEATURE_CARDS[2]?.icon, title: card3Title, desc: card3Desc },
    { icon: FEATURE_CARDS[3]?.icon, title: card4Title, desc: card4Desc },
  ].filter((c) => c.title || c.desc);

  return (
    <>
      <Header />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative w-full overflow-hidden h-[clamp(320px,48vw,560px)]">
        <Image
          src="https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1600&q=80"
          alt={heroImageAlt}
          fill
          sizes="100vw"
          priority
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 h-full flex flex-col justify-end max-w-7xl mx-auto px-4 lg:px-8 pb-10 lg:pb-16">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-white/55 text-[11px] tracking-widest uppercase mb-5">
            <button onClick={() => router.push('/')} className="hover:text-white transition-colors">
              {crumbHome}
            </button>
            <ChevronRight size={11} />
            <span className="text-white/90">{crumbCurrent}</span>
          </nav>
          <h1 className="text-white font-semibold uppercase text-[clamp(2rem,5vw,3.5rem)] leading-[1.1] tracking-[0.03em]">
            {heroHeading}
          </h1>
          <p className="text-white/65 mt-3 text-sm md:text-base tracking-wide max-w-xl">
            {heroSubtitle}
          </p>
        </div>
      </section>

      {/* ── OneEntry Demo Notice ──────────────────────────────────────── */}
      <div className="bg-[#f5f4f1] border-b border-[#e5e2db]">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3.5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <Edit3 size={13} className="text-[#8a8680] shrink-0" />
            <p className="text-[11px] tracking-[0.15em] uppercase text-[#8a8680]">
              <span className="font-semibold text-[#5a5652]">{demoStrong}</span>
              {' '}{demoMid}{' '}
              <span className="font-semibold text-[#5a5652]">{demoPlatform}</span>{demoSuffix}
            </p>
          </div>
          <a
            href={ctaExploreHref}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-[11px] font-semibold tracking-widest uppercase text-[#5a5652] border-b border-[#5a5652]/40 pb-px hover:border-[#5a5652] transition-colors whitespace-nowrap"
          >
            {ctaExploreShort}
          </a>
        </div>
      </div>

      {/* ── Lead ─────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-14">
        <p className="text-black/70 leading-relaxed max-w-3xl text-[clamp(1rem,1.4vw,1.15rem)] font-[Inter,sans-serif]">
          {leadParagraph}
        </p>
      </div>

      {/* ── Alternating Sections ─────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 space-y-0" data-testid="info-sections">
        {SECTIONS.map((s, i) => (
          <div
            key={i}
            data-testid="info-section"
            className={`py-14 ${i < SECTIONS.length - 1 ? 'border-b border-[#ebebeb]' : ''}`}
          >
            <div
              className={`flex flex-col gap-10 lg:gap-16 items-center ${
                s.imageRight ? 'lg:flex-row-reverse' : 'lg:flex-row'
              }`}
            >
              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] tracking-[0.2em] uppercase text-black/40 font-medium mb-3">{s.eyebrow}</p>
                <div className="w-8 h-px bg-black mb-5" />
                <h2 className="font-semibold uppercase mb-5 text-[clamp(1.25rem,2.5vw,1.875rem)] tracking-[0.03em] leading-tight">
                  {s.heading}
                </h2>
                <div className="space-y-4">
                  {s.body.split('\n\n').map((para, pi) => (
                    <p key={pi} className="text-[15px] text-black/60 leading-relaxed">
                      {para}
                    </p>
                  ))}
                </div>
              </div>
              {/* Image */}
              <div className="w-full lg:w-[45%] shrink-0">
                <div className="relative aspect-4/3 overflow-hidden bg-[#f2f1ef]">
                  <Image
                    src={s.image}
                    alt={s.imageAlt}
                    fill
                    sizes="(max-width: 1024px) 100vw, 45vw"
                    className="object-cover object-center transition-transform duration-700 hover:scale-105"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Stats strip ──────────────────────────────────────────────── */}
      <div className="bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="text-3xl md:text-4xl font-semibold tracking-tight mb-1">{stat.value}</p>
              <p className="text-xs tracking-widest uppercase text-white/45">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── OneEntry Platform CTA ─────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8 py-20">
        <div className="text-center mb-14">
          <p className="text-[11px] tracking-[0.22em] uppercase text-black/35 font-medium mb-3">
            {ctaEyebrow}
          </p>
          <h2 className="font-semibold uppercase mb-4 text-[clamp(1.5rem,3vw,2.25rem)] tracking-[0.04em]">
            {ctaHeading}
          </h2>
          <p className="text-[15px] text-black/55 leading-relaxed max-w-2xl mx-auto">
            {ctaBody}
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {cards.map((card) => (
            <div key={card.title} className="border border-[#e8e5e0] p-6 hover:border-black transition-colors duration-200">
              <div className="text-black/40 mb-4">{card.icon}</div>
              <p className="text-[12px] tracking-widest uppercase font-semibold mb-2">{card.title}</p>
              <p className="text-xs text-black/50 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href={ctaExploreHref}
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3.5 bg-black text-white text-xs tracking-widest uppercase font-semibold hover:bg-black/80 transition-colors"
          >
            {ctaExplore}
          </a>
          <a
            href={ctaSdkHref}
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3.5 border border-black text-black text-xs tracking-widest uppercase font-medium hover:bg-black hover:text-white transition-colors"
          >
            {ctaSdkLabel}
          </a>
        </div>
      </section>

      {/* OE-attached page blocks — rendered at the bottom, below the CTA. */}
      {otherBlocks.length > 0 && (
        <PageBlocksRenderer blocks={otherBlocks} />
      )}

      <Footer />
    </>
  );
}

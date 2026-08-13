'use client';
import { ChevronRight, Edit3, Globe, LayoutTemplate, Zap } from 'lucide-react';
import Image from 'next/image';
import React from 'react';

import { PageBlocksRenderer } from '@/app/components/blocks/PageBlocksRenderer';
import { useRouter } from '@/lib/i18n/navigation';
import { INFO_SECTION_BLOCK_PREFIX, infoSectionsFromBlocks } from '@/lib/oneentry/blocks/info-sections';
import type { PageBlock } from '@/lib/oneentry/blocks/page-blocks';
import { useT } from '@/lib/oneentry/labels/DictContext';

/** Feature cards — OE keys `info_card_{n}_title` / `info_card_{n}_desc`. `iconKey` is deliberately code-only: it selects a component, not copy. */
export const INFO_PAGE_FEATURE_CARDS = [
  {
    iconKey: 'edit' as const,
    title: 'Edit Any Content',
    desc: 'Update headings, paragraphs, images and entire sections directly from the OneEntry dashboard. No developer needed.',
  },
  {
    iconKey: 'layout' as const,
    title: 'Flexible Layouts',
    desc: 'Rearrange sections, change image positions and customise the page structure through a visual interface.',
  },
  {
    iconKey: 'zap' as const,
    title: 'Instant Publish',
    desc: 'Changes go live the moment you save them — no build process, no deployments, no waiting.',
  },
  {
    iconKey: 'globe' as const,
    title: 'Multi-Language',
    desc: 'Manage content in every language your customers speak, all from one unified dashboard.',
  },
] as const;

/** Stats strip — OE keys `info_stat_{n}_value` / `info_stat_{n}_label`. */
export const INFO_PAGE_STATS = [
  { value: '40+', label: 'Countries Shipped' },
  { value: '120+', label: 'Partner Brands' },
  { value: '30 days', label: 'Free Returns' },
  { value: '24 / 7', label: 'Customer Support' },
] as const;

/** Structural fallbacks for the info pages. */

/** Editorial sections — mirrors the OE `info_section_*` blocks. */
export const INFO_PAGE_SECTIONS = [
  {
    eyebrow: 'About Us',
    heading: 'Fashion Crafted with Purpose',
    body: "Founded in London in 2015, Kekimoro started as a small boutique with a curated edit of contemporary European designers. A decade later, we've grown into a global platform serving customers in over 40 countries — our obsession with quality and fit has never wavered.\n\nEvery piece in our collection is hand-selected by our in-house buying team, who travel to fashion weeks in Paris, Milan, Copenhagen and New York to discover the most forward-thinking designers alongside our own Kekimoro label.",
    image: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=900&q=80',
    imageAlt: 'Fashion boutique with curated clothing',
    imageRight: false,
  },
  {
    eyebrow: 'Sustainability',
    heading: 'Our Values, Our Responsibility',
    body: 'Over 60% of our collections are made from certified sustainable materials — organic cotton, recycled fibres, and traceable natural fabrics. We partner only with manufacturers who meet our strict social and environmental standards.\n\nOur packaging is 100% recyclable, our London warehouse runs on renewable energy, and our carbon offset programme covers every shipment we send worldwide.',
    image: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=900&q=80',
    imageAlt: 'Sustainable fabric production',
    imageRight: true,
  },
  {
    eyebrow: 'Delivery & Returns',
    heading: 'Fast Shipping. Hassle-Free Returns.',
    body: "Standard delivery in 3–5 working days, free on orders over $50. Next-day express available. We ship to 50+ countries worldwide.\n\nNot happy with your order? Return any item within 30 days for a full refund — no questions asked. Start a return from your account in seconds, and we'll email a prepaid label immediately.",
    image: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=900&q=80',
    imageAlt: 'Parcel delivery and logistics',
    imageRight: false,
  },
  {
    eyebrow: 'Sizing & Care',
    heading: 'Find Your Perfect Fit, Keep It for Years',
    body: 'Getting the right size matters. Every product page includes a detailed size chart and model measurements so you can order with confidence. When in doubt, our style team is available via live chat.\n\nGreat care extends the life of every garment. Wash at low temperatures, store knitwear folded, and follow the care label for each fabric type. The most sustainable item is the one you keep for years.',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=80',
    imageAlt: 'Clothing care and sizing',
    imageRight: true,
  },
] as const;

/* Offline fallbacks for the two long-form paragraphs. Short one-off strings are
   passed inline at the `useInfoPageT` call site — a separate dictionary file for
   a string used once only adds an indirection that drifts out of sync. These two
   are constants purely because a 300-character literal inside a hook call is
   unreadable. */
const FALLBACK_LEAD =
  'Kekimoro was born from a simple belief: great style should never come at the expense of quality or conscience. ' +
  "Below you'll find everything about who we are, how we work, and how we can help — all managed and updated in real time through the OneEntry Platform.";
const FALLBACK_CTA_BODY =
  'Every section above — headings, body text, images, layout order — is stored in the OneEntry Platform and can be updated ' +
  'by your marketing team in real time, with no code changes and no redeployment required.';

interface InfoSection {
  eyebrow: string;
  heading: string;
  body: string;
  image: string;
  imageAlt: string;
  imageRight: boolean;
}

/** Adapt OE section blocks to the layout's shape. */
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
const FEATURE_CARDS = INFO_PAGE_FEATURE_CARDS.map((c) => ({ ...c, icon: ICON_MAP[c.iconKey] }));

/* ─── Component ──────────────────────────────────────────────────────────── */
export function InfoPage({ pageBlocks }: { pageBlocks?: PageBlock[] } = {}) {
  const router = useRouter();

  // Editorial sections come from OE; the local dataset is the offline fallback.
  const cmsSections = sectionsFromBlocks(pageBlocks);
  const SECTIONS: readonly InfoSection[] =
    cmsSections.length > 0 ? cmsSections : INFO_PAGE_SECTIONS.map((s, i) => ({ ...s, imageRight: i % 2 === 1 }));

  // Section blocks are rendered by the bespoke layout above, so keep them out of the generic renderer at the bottom — otherwise they'd appear twice.
  const otherBlocks = (pageBlocks ?? []).filter((b) => !b.marker?.startsWith(INFO_SECTION_BLOCK_PREFIX));

  // Page chrome copy from the OE `info_page` set; the local dataset is the offline fallback.
  const heroHeading = useT('info_hero_heading', 'About Kekimoro');
  const heroSubtitle = useT(
    'info_hero_subtitle',
    'Our story, our values, delivery, returns, sizing and more — everything you need to know.',
  );
  const heroImageAlt = useT('info_hero_image_alt', 'Kekimoro editorial');
  const crumbHome = useT('info_hero_breadcrumb_home', 'Home');
  const crumbCurrent = useT('info_hero_breadcrumb_current', 'Info');
  const demoStrong = useT('info_demo_strong', 'Demo page');
  const demoMid = useT('info_demo_mid', '— This content is managed through the');
  const demoPlatform = useT('info_demo_platform', 'OneEntry Platform');
  const demoSuffix = useT('info_demo_suffix', '. Edit text, images and layout from your dashboard — no code required.');
  const leadParagraph = useT('info_lead_paragraph', FALLBACK_LEAD);
  const ctaEyebrow = useT('info_cta_eyebrow', 'Powered by OneEntry Platform');
  const ctaHeading = useT('info_cta_heading', 'This entire page is editable from the dashboard');
  const ctaBody = useT('info_cta_body', FALLBACK_CTA_BODY);
  const ctaExplore = useT('info_cta_explore_label', 'Explore OneEntry Platform');
  const ctaExploreShort = useT('info_cta_explore_short', 'Explore OneEntry →');
  const ctaExploreHref = useT('info_cta_explore_href', 'https://oneentry.cloud');
  const ctaSdkLabel = useT('info_cta_sdk_label', 'View SDK Docs');
  const ctaSdkHref = useT('info_cta_sdk_href', 'https://js-sdk.oneentry.cloud/docs/index/');

  // Four stats and four cards are a fixed layout slot, so each key is read with its own top-level hook call — a loop would break the rules of hooks.
  const stat1Value = useT('info_stat_1_value', INFO_PAGE_STATS[0]?.value ?? '');
  const stat1Label = useT('info_stat_1_label', INFO_PAGE_STATS[0]?.label ?? '');
  const stat2Value = useT('info_stat_2_value', INFO_PAGE_STATS[1]?.value ?? '');
  const stat2Label = useT('info_stat_2_label', INFO_PAGE_STATS[1]?.label ?? '');
  const stat3Value = useT('info_stat_3_value', INFO_PAGE_STATS[2]?.value ?? '');
  const stat3Label = useT('info_stat_3_label', INFO_PAGE_STATS[2]?.label ?? '');
  const stat4Value = useT('info_stat_4_value', INFO_PAGE_STATS[3]?.value ?? '');
  const stat4Label = useT('info_stat_4_label', INFO_PAGE_STATS[3]?.label ?? '');
  const stats = [
    { value: stat1Value, label: stat1Label },
    { value: stat2Value, label: stat2Label },
    { value: stat3Value, label: stat3Label },
    { value: stat4Value, label: stat4Label },
  ].filter((s) => s.value || s.label);

  const card1Title = useT('info_card_1_title', FEATURE_CARDS[0]?.title ?? '');
  const card1Desc = useT('info_card_1_desc', FEATURE_CARDS[0]?.desc ?? '');
  const card2Title = useT('info_card_2_title', FEATURE_CARDS[1]?.title ?? '');
  const card2Desc = useT('info_card_2_desc', FEATURE_CARDS[1]?.desc ?? '');
  const card3Title = useT('info_card_3_title', FEATURE_CARDS[2]?.title ?? '');
  const card3Desc = useT('info_card_3_desc', FEATURE_CARDS[2]?.desc ?? '');
  const card4Title = useT('info_card_4_title', FEATURE_CARDS[3]?.title ?? '');
  const card4Desc = useT('info_card_4_desc', FEATURE_CARDS[3]?.desc ?? '');
  const cards = [
    { icon: FEATURE_CARDS[0]?.icon, title: card1Title, desc: card1Desc },
    { icon: FEATURE_CARDS[1]?.icon, title: card2Title, desc: card2Desc },
    { icon: FEATURE_CARDS[2]?.icon, title: card3Title, desc: card3Desc },
    { icon: FEATURE_CARDS[3]?.icon, title: card4Title, desc: card4Desc },
  ].filter((c) => c.title || c.desc);

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative h-[clamp(320px,48vw,560px)] w-full overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1600&q=80"
          alt={heroImageAlt}
          fill
          sizes="100vw"
          priority
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-10 lg:px-8 lg:pb-16">
          {/* Breadcrumb */}
          <nav className="mb-5 flex items-center gap-1.5 text-[11px] tracking-widest text-white/55 uppercase">
            <button onClick={() => router.push('/')} className="transition-colors hover:text-white">
              {crumbHome}
            </button>
            <ChevronRight size={11} />
            <span className="text-white/90">{crumbCurrent}</span>
          </nav>
          <h1 className="leading-1.1 text-[clamp(2rem,5vw,3.5rem)] font-semibold tracking-[0.03em] text-white uppercase">
            {heroHeading}
          </h1>
          <p className="mt-3 max-w-xl text-sm tracking-wide text-white/65 md:text-base">{heroSubtitle}</p>
        </div>
      </section>

      {/* ── OneEntry Demo Notice ──────────────────────────────────────── */}
      <div className="border-b border-[#e5e2db] bg-[#f5f4f1]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 lg:px-8">
          <div className="flex items-center gap-2.5">
            <Edit3 size={13} className="shrink-0 text-[#8a8680]" />
            <p className="text-[11px] tracking-[0.15em] text-[#8a8680] uppercase">
              <span className="font-semibold text-[#5a5652]">{demoStrong}</span> {demoMid}{' '}
              <span className="font-semibold text-[#5a5652]">{demoPlatform}</span>
              {demoSuffix}
            </p>
          </div>
          <a
            href={ctaExploreHref}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 border-b border-[#5a5652]/40 pb-px text-[11px] font-semibold tracking-widest whitespace-nowrap text-[#5a5652] uppercase transition-colors hover:border-[#5a5652]"
          >
            {ctaExploreShort}
          </a>
        </div>
      </div>

      {/* ── Lead ─────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
        <p className="max-w-3xl font-sans text-[clamp(1rem,1.4vw,1.15rem)] leading-relaxed text-black/70">
          {leadParagraph}
        </p>
      </div>

      {/* ── Alternating Sections ─────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl space-y-0 px-4 lg:px-8" data-testid="info-sections">
        {SECTIONS.map((s, i) => (
          <div
            key={i}
            data-testid="info-section"
            className={`py-14 ${i < SECTIONS.length - 1 ? 'border-b border-[#ebebeb]' : ''}`}
          >
            <div
              className={`flex flex-col items-center gap-10 lg:gap-16 ${
                s.imageRight ? 'lg:flex-row-reverse' : 'lg:flex-row'
              }`}
            >
              {/* Text */}
              <div className="min-w-0 flex-1">
                <p className="mb-3 text-[11px] font-medium tracking-[0.2em] text-black/40 uppercase">{s.eyebrow}</p>
                <div className="mb-5 h-px w-8 bg-black" />
                <h2 className="mb-5 text-[clamp(1.25rem,2.5vw,1.875rem)] leading-tight font-semibold tracking-[0.03em] uppercase">
                  {s.heading}
                </h2>
                <div className="space-y-4">
                  {s.body.split('\n\n').map((para, pi) => (
                    <p key={pi} className="text-[15px] leading-relaxed text-black/60">
                      {para}
                    </p>
                  ))}
                </div>
              </div>
              {/* Image */}
              <div className="w-full shrink-0 lg:w-[45%]">
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
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-12 text-center md:grid-cols-4 lg:px-8">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="mb-1 text-3xl font-semibold tracking-tight md:text-4xl">{stat.value}</p>
              <p className="text-xs tracking-widest text-white/45 uppercase">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── OneEntry Platform CTA ─────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <div className="mb-14 text-center">
          <p className="mb-3 text-[11px] font-medium tracking-[0.22em] text-black/35 uppercase">{ctaEyebrow}</p>
          <h2 className="mb-4 text-[clamp(1.5rem,3vw,2.25rem)] font-semibold tracking-[0.04em] uppercase">
            {ctaHeading}
          </h2>
          <p className="mx-auto max-w-2xl text-[15px] leading-relaxed text-black/55">{ctaBody}</p>
        </div>

        {/* Feature cards */}
        <div className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <div
              key={card.title}
              className="border border-[#e8e5e0] p-6 transition-colors duration-200 hover:border-black"
            >
              <div className="mb-4 text-black/40">{card.icon}</div>
              <p className="mb-2 text-[12px] font-semibold tracking-widest uppercase">{card.title}</p>
              <p className="text-xs leading-relaxed text-black/50">{card.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href={ctaExploreHref}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-black px-8 py-3.5 text-xs font-semibold tracking-widest text-white uppercase transition-colors hover:bg-black/80"
          >
            {ctaExplore}
          </a>
          <a
            href={ctaSdkHref}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-black px-8 py-3.5 text-xs font-medium tracking-widest text-black uppercase transition-colors hover:bg-black hover:text-white"
          >
            {ctaSdkLabel}
          </a>
        </div>
      </section>

      {/* OE-attached page blocks — rendered at the bottom, below the CTA. */}
      {otherBlocks.length > 0 && <PageBlocksRenderer blocks={otherBlocks} />}
    </>
  );
}

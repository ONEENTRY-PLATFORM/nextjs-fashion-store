'use client'
import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { PageBlocksRenderer } from '../components/PageBlocksRenderer';
import type { PageBlock } from '../../lib/oneentry/blocks/page-blocks';
import { ChevronRight, Edit3, LayoutTemplate, Globe, Zap } from 'lucide-react';
import {
  INFO_PAGE_LABELS as IPL,
  INFO_PAGE_DEMO_NOTICE as IDN,
  INFO_PAGE_HERO as IH,
  INFO_PAGE_CTA as IC,
  INFO_PAGE_SECTIONS,
  INFO_PAGE_FEATURE_CARDS,
} from '../data/infoPageLabels';

const SECTIONS = INFO_PAGE_SECTIONS;

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

  return (
    <>
      <Header />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative w-full overflow-hidden h-[clamp(320px,48vw,560px)]">
        <Image
          src="https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1600&q=80"
          alt={IH.heroImageAlt}
          fill
          sizes="100vw"
          priority
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 h-full flex flex-col justify-end max-w-screen-xl mx-auto px-4 lg:px-8 pb-10 lg:pb-16">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-white/55 text-[11px] tracking-widest uppercase mb-5">
            <button onClick={() => router.push('/')} className="hover:text-white transition-colors">
              {IH.breadcrumbHome}
            </button>
            <ChevronRight size={11} />
            <span className="text-white/90">{IH.breadcrumbCurrent}</span>
          </nav>
          <h1 className="text-white font-semibold uppercase text-[clamp(2rem,5vw,3.5rem)] leading-[1.1] tracking-[0.03em]">
            {IH.heading}
          </h1>
          <p className="text-white/65 mt-3 text-sm md:text-base tracking-wide max-w-xl">
            {IH.subtitle}
          </p>
        </div>
      </section>

      {/* ── OneEntry Demo Notice ──────────────────────────────────────── */}
      <div className="bg-[#f5f4f1] border-b border-[#e5e2db]">
        <div className="max-w-screen-xl mx-auto px-4 lg:px-8 py-3.5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <Edit3 size={13} className="text-[#8a8680] flex-shrink-0" />
            <p className="text-[11px] tracking-[0.15em] uppercase text-[#8a8680]">
              <span className="font-semibold text-[#5a5652]">{IDN.demoPageStrong}</span>
              {' '}{IDN.demoPageMid}{' '}
              <span className="font-semibold text-[#5a5652]">{IDN.platformStrong}</span>{IDN.platformSuffix}
            </p>
          </div>
          <a
            href={IC.exploreOneEntryHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 text-[11px] font-semibold tracking-widest uppercase text-[#5a5652] border-b border-[#5a5652]/40 pb-px hover:border-[#5a5652] transition-colors whitespace-nowrap"
          >
            {IC.exploreOneEntryShort}
          </a>
        </div>
      </div>

      {/* ── Lead ─────────────────────────────────────────────────────── */}
      <div className="max-w-screen-xl mx-auto px-4 lg:px-8 py-14">
        <p className="text-black/70 leading-relaxed max-w-3xl text-[clamp(1rem,1.4vw,1.15rem)] font-[Inter,sans-serif]">
          {IC.leadParagraph}
        </p>
      </div>

      {/* ── Alternating Sections ─────────────────────────────────────── */}
      <div className="max-w-screen-xl mx-auto px-4 lg:px-8 space-y-0">
        {SECTIONS.map((s, i) => (
          <div
            key={i}
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
              <div className="w-full lg:w-[45%] flex-shrink-0">
                <div className="relative aspect-[4/3] overflow-hidden bg-[#f2f1ef]">
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
        <div className="max-w-screen-xl mx-auto px-4 lg:px-8 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {IPL.stats.map((stat) => (
            <div key={stat.label}>
              <p className="text-3xl md:text-4xl font-semibold tracking-tight mb-1">{stat.value}</p>
              <p className="text-xs tracking-widest uppercase text-white/45">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── OneEntry Platform CTA ─────────────────────────────────────── */}
      <section className="max-w-screen-xl mx-auto px-4 lg:px-8 py-20">
        <div className="text-center mb-14">
          <p className="text-[11px] tracking-[0.22em] uppercase text-black/35 font-medium mb-3">
            {IC.ctaEyebrow}
          </p>
          <h2 className="font-semibold uppercase mb-4 text-[clamp(1.5rem,3vw,2.25rem)] tracking-[0.04em]">
            {IC.ctaHeading}
          </h2>
          <p className="text-[15px] text-black/55 leading-relaxed max-w-2xl mx-auto">
            {IC.ctaBody}
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {FEATURE_CARDS.map((card) => (
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
            href={IC.exploreOneEntryHref}
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3.5 bg-black text-white text-xs tracking-widest uppercase font-semibold hover:bg-black/80 transition-colors"
          >
            {IC.ctaExplorePlatform}
          </a>
          <a
            href={IC.ctaSdkDocsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3.5 border border-black text-black text-xs tracking-widest uppercase font-medium hover:bg-black hover:text-white transition-colors"
          >
            {IC.ctaSdkDocs}
          </a>
        </div>
      </section>

      {/* OE-attached page blocks — rendered at the bottom, below the CTA. */}
      {pageBlocks && pageBlocks.length > 0 && (
        <PageBlocksRenderer blocks={pageBlocks} />
      )}

      <Footer />
    </>
  );
}

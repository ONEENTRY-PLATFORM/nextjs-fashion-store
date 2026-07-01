'use client'
import { useState, useEffect, useCallback, useRef, useId } from 'react';
import Image from 'next/image';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import type { HeroSlideFromCms } from '../../lib/oneentry/blocks/hero-slides';
type HeroSlide = HeroSlideFromCms;
import { ACCENT_WOMEN, ACCENT_MEN } from '../constants/colors';
import { TIMINGS } from '../constants/timings';
import { CAROUSEL_LABELS, HERO_SLIDER_DYNAMIC_ARIA } from '../data/commonLabels';


// ─── Gradient per alignment direction ────────────────────────────────────────
const GRADIENTS = {
  left: 'linear-gradient(to right, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)',
  right: 'linear-gradient(to left,  rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)',
  center: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.45) 100%)',
};

// ─── Horizontal alignment classes ─────────────────────────────────────────────
const ALIGN_OUTER = {
  left: 'justify-start',
  right: 'justify-end',
  center: 'justify-center',
};

const ALIGN_TEXT = {
  left: 'text-left  items-start',
  right: 'text-right items-end',
  center: 'text-center items-center',
};

// ─── CTA self-alignment per text alignment (doc: Alignment Rule Summary) ──────
const CTA_ALIGN = {
  left: 'self-start',
  center: 'self-center',
  right: 'self-end',
};

// ─── CTA background per gender ───────────────────────────────────────────────
const CTA_BG = {
  women: ACCENT_WOMEN,
  men: ACCENT_MEN,
};

export function HeroSlider({ initialSlides }: { initialSlides?: HeroSlideFromCms[] } = {}) {
  const slides: HeroSlide[] = (initialSlides ?? []).map((s) => ({
    id: s.id,
    image: s.image,
    eyebrow: s.eyebrow,
    headline: s.headline,
    subtext: s.subtext,
    cta: s.cta,
    href: s.href,
    align: s.align,
    gender: s.gender,
  }));
  if (slides.length === 0) return null;
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [paused, setPaused] = useState(false);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const regionId = useId();

  useEffect(() => {
    return () => { if (transitionTimer.current) clearTimeout(transitionTimer.current); };
  }, []);

  const goTo = useCallback((index: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrent(index);
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    transitionTimer.current = setTimeout(() => setIsTransitioning(false), TIMINGS.HERO_SLIDE_TRANSITION);
  }, [isTransitioning]);

  const next = useCallback(() => goTo((current + 1) % slides.length), [current, goTo, slides.length]);
  const prev = useCallback(() => goTo((current - 1 + slides.length) % slides.length), [current, goTo, slides.length]);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(next, TIMINGS.HERO_SLIDE_INTERVAL);
    return () => clearInterval(timer);
  }, [next, paused]);

  const slide = slides[current];

  return (
    // Layout rule: height 600px fixed, full width
    <div
      className="relative w-full overflow-hidden h-[600px]"
      role="region"
      aria-roledescription="carousel"
      aria-label={CAROUSEL_LABELS.featuredCollections}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >

      {/* ── Slide images ──────────────────────────────────────────────────── */}
      {slides.map((s, idx) => (
        <div
          key={s.id}
          role="group"
          aria-roledescription="slide"
          aria-label={HERO_SLIDER_DYNAMIC_ARIA.slideDescriptionTpl(idx + 1, slides.length, s.headline)}
          aria-hidden={idx !== current}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            idx === current ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <Image
            src={s.image}
            alt={s.headline}
            fill
            sizes="100vw"
            className="object-cover object-[center_20%]"
            priority={idx === 0}
          />
          {/* Directional gradient overlay per alignment */}
          <div
            className="absolute inset-0"
            style={{ background: GRADIENTS[s.align] }}
          />
        </div>
      ))}

      {/* ── Content block ─────────────────────────────────────────────────── */}
      {/*
          Vertical:   items-end pb-16  → content anchored to the bottom
          Horizontal: justify-start / center / end driven by slide.align
          Padding:    px-12 mobile / px-20 desktop
      */}
      <div
        className={`
          absolute inset-0
          flex items-end pb-16
          px-12 md:px-20
          ${ALIGN_OUTER[slide.align]}
          transition-opacity duration-[400ms] ease-in-out
          ${isTransitioning ? 'opacity-0' : 'opacity-100'}
        `}
      >
        {/* Inner container — max-w 512px */}
        <div className={`flex flex-col max-w-[512px] w-full ${ALIGN_TEXT[slide.align]}`}>

          {/* Eyebrow label
              12px / leading-[16px] / tracking-[0.3em] / weight 500 / uppercase
              color rgba(255,255,255,0.80) / mb-3 (≈12px) */}
          <p className="uppercase mb-3 text-xs leading-4 tracking-[0.3em] font-medium text-white/80">
            {slide.eyebrow}
          </p>

          {/* Hero H1
              clamp(32px,5vw,64px) / weight 700 / tracking -0.02em / lh 1
              color #fff / mb-4 (16px) — via .hero-h1 utility */}
          <h1 className="hero-h1 text-white mb-4">
            {slide.headline.replace(/\s+(\S+)$/, '\u00A0$1')}
          </h1>

          {/* Subtitle
              14px / lh 1.6 / weight 400 / color rgba(255,255,255,0.85)
              max-w 384px / mb-8 (32px) */}
          <p className="mb-8 text-sm leading-relaxed font-normal text-white/85 max-w-96">
            {slide.subtext}
          </p>

          {/* CTA button
              14px / weight 600 / uppercase / tracking 0.1em
              px-8 py-3.5 / white text / bg by gender / radius 0
              element: <a> per spec / self-alignment matches text alignment
              hover: opacity-90 + -translate-y-px / transition 200ms */}
          <a
            href={slide.href}
            className={`${CTA_ALIGN[slide.align]} px-8 py-3.5 text-white uppercase transition-all duration-200 hover:opacity-90 hover:-translate-y-px text-sm font-semibold tracking-[0.1em] rounded-none`}
            style={{ backgroundColor: CTA_BG[slide.gender] }}
          >
            {slide.cta}
          </a>
        </div>
      </div>

      {/* ── Navigation arrows ─────────────────────────────────────────────── */}
      <button
        onClick={prev}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/40 active:bg-white/60 text-white flex items-center justify-center transition-all duration-200 backdrop-blur-sm"
        aria-label={CAROUSEL_LABELS.previousSlide}
      >
        <ChevronLeftIcon className="w-5 h-5" />
      </button>
      <button
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/40 active:bg-white/60 text-white flex items-center justify-center transition-all duration-200 backdrop-blur-sm"
        aria-label={CAROUSEL_LABELS.nextSlide}
      >
        <ChevronRightIcon className="w-5 h-5" />
      </button>

      {/* ── Dot indicators ────────────────────────────────────────────────── */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2" role="tablist" aria-label={CAROUSEL_LABELS.slides}>
        {slides.map((_, idx) => (
          <button
            key={idx}
            role="tab"
            onClick={() => goTo(idx)}
            className={`h-1 transition-all duration-300 ${
              idx === current ? 'w-6 bg-white' : 'w-2 bg-white/50'
            }`}
            aria-selected={idx === current}
            aria-controls={`${regionId}-slide-${idx}`}
            aria-label={`${HERO_SLIDER_DYNAMIC_ARIA.slidePrefix} ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
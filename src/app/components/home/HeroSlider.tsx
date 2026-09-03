'use client';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

import type { HeroSlideFromCms } from '@/lib/oneentry/blocks/hero-slides';

type HeroSlide = HeroSlideFromCms;
import CmsImage from '@/app/components/ui/CmsImage';
import { ACCENT_MEN, ACCENT_WOMEN } from '@/app/constants/colors';
import { TIMINGS } from '@/app/constants/timings';
import { fillTokens } from '@/app/utils/fillTokens';
import { useT } from '@/lib/oneentry/labels/DictContext';

export const HERO_SLIDER_DYNAMIC_ARIA = {
  /** `%index%` / `%total%` / `%headline%` — slide position and its headline. */
  slideDescription: '%index% of %total%: %headline%',
  slidePrefix: 'Slide',
} as const;

export const HERO_SLIDER_CAROUSEL_LABELS = {
  previousSlide: 'Previous slide',
  nextSlide: 'Next slide',
  slides: 'Slides',
  featuredCollections: 'Featured collections',
  carouselRole: 'carousel',
  slideRole: 'slide',
} as const;

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
    // Was dropped by this mapping, so `s.imageBlur` below always read `undefined` and the hero rendered with no LQIP even when the CMS had one.
    imageBlur: s.imageBlur,
    eyebrow: s.eyebrow,
    headline: s.headline,
    subtext: s.subtext,
    cta: s.cta,
    href: s.href,
    align: s.align,
    gender: s.gender,
  }));
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [paused, setPaused] = useState(false);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const regionId = useId();
  // Slides 2 and 3 are full-bleed photos of the same weight as the first one, and they sit *inside* the viewport at `opacity-0`.
  const [preloadPending, setPreloadPending] = useState(true);

  const aCarouselRole = useT('interface_controls_carousel_role', HERO_SLIDER_CAROUSEL_LABELS.carouselRole);
  const aFeatured = useT('interface_controls_featured_collections', HERO_SLIDER_CAROUSEL_LABELS.featuredCollections);
  const aSlideRole = useT('interface_controls_slide_role', HERO_SLIDER_CAROUSEL_LABELS.slideRole);
  const aPreviousSlide = useT('interface_controls_previous_slide', HERO_SLIDER_CAROUSEL_LABELS.previousSlide);
  const aNextSlide = useT('interface_controls_next_slide', HERO_SLIDER_CAROUSEL_LABELS.nextSlide);
  const aSlides = useT('interface_controls_slides', HERO_SLIDER_CAROUSEL_LABELS.slides);
  const aSlidePrefix = useT('interface_controls_slide_prefix', HERO_SLIDER_DYNAMIC_ARIA.slidePrefix);
  const aSlideDescription = useT('interface_controls_slide_description', HERO_SLIDER_DYNAMIC_ARIA.slideDescription);

  useEffect(() => {
    return () => {
      if (transitionTimer.current) clearTimeout(transitionTimer.current);
    };
  }, []);

  // `requestIdleCallback` rather than a timer: it fires once the hero has painted and the hydration work has drained, which is exactly when the remaining slides stop competing for bandwidth.
  useEffect(() => {
    if (typeof window.requestIdleCallback !== 'function') {
      const timer = setTimeout(() => setPreloadPending(false), TIMINGS.HERO_SLIDE_TRANSITION);
      return () => clearTimeout(timer);
    }
    const handle = window.requestIdleCallback(() => setPreloadPending(false), { timeout: 2000 });
    return () => window.cancelIdleCallback?.(handle);
  }, []);

  const goTo = useCallback(
    (index: number) => {
      if (isTransitioning) return;
      setIsTransitioning(true);
      setCurrent(index);
      if (transitionTimer.current) clearTimeout(transitionTimer.current);
      transitionTimer.current = setTimeout(() => setIsTransitioning(false), TIMINGS.HERO_SLIDE_TRANSITION);
    },
    [isTransitioning],
  );

  const next = useCallback(() => {
    if (slides.length > 0) goTo((current + 1) % slides.length);
  }, [current, goTo, slides.length]);
  const prev = useCallback(() => {
    if (slides.length > 0) goTo((current - 1 + slides.length) % slides.length);
  }, [current, goTo, slides.length]);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const timer = setInterval(next, TIMINGS.HERO_SLIDE_INTERVAL);
    return () => clearInterval(timer);
  }, [next, paused, slides.length]);

  // Bail out only after every hook has run — hooks must be called in the same order on every render (MCP: `react-hooks/rules-of-hooks` is an error).
  if (slides.length === 0) return null;
  const slide = slides[current];

  return (
    // Layout rule: height 600px fixed, full width
    <div
      className="relative h-150 w-full overflow-hidden"
      role="region"
      aria-roledescription={aCarouselRole}
      aria-label={aFeatured}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* ── Slide images ──────────────────────────────────────────────────── */}
      {slides.map((s, idx) => (
        <div
          key={s.id}
          id={`${regionId}-slide-${idx}`}
          role="group"
          aria-roledescription={aSlideRole}
          aria-label={fillTokens(aSlideDescription, {
            index: idx + 1,
            total: slides.length,
            headline: s.headline,
          })}
          aria-hidden={idx !== current}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            idx === current ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {idx === current || !preloadPending ? (
            <CmsImage
              src={s.image}
              blur={s.imageBlur}
              alt={s.headline}
              fill
              sizes="100vw"
              className="object-cover object-[center_20%]"
              priority={idx === 0}
              fetchPriority={idx === 0 ? 'high' : undefined}
              data-testid={idx === 0 ? 'hero-slide-image' : undefined}
            />
          ) : null}
          {/* Directional gradient overlay per alignment */}
          <div className="absolute inset-0" style={{ background: GRADIENTS[s.align] }} />
        </div>
      ))}

      {/* ── Content block ─────────────────────────────────────────────────── */}
      {/*
          Vertical:   items-end pb-16  → content anchored to the bottom
          Horizontal: justify-start / center / end driven by slide.align
          Padding:    px-12 mobile / px-20 desktop
      */}
      <div
        className={`absolute inset-0 flex items-end px-12 pb-16 md:px-20 ${ALIGN_OUTER[slide.align]} transition-opacity duration-400 ease-in-out ${isTransitioning ? 'opacity-0' : 'opacity-100'} `}
      >
        {/* Inner container — max-w 512px */}
        <div className={`flex w-full max-w-lg flex-col ${ALIGN_TEXT[slide.align]}`}>
          {/* Eyebrow label
              12px / leading-4 / tracking-[0.3em] / weight 500 / uppercase
              color rgba(255,255,255,0.80) / mb-3 (≈12px) */}
          <p className="mb-3 text-xs leading-4 font-medium tracking-[0.3em] text-white/80 uppercase">{slide.eyebrow}</p>

          {/* Hero H1
              clamp(32px,5vw,64px) / weight 700 / tracking -0.02em / lh 1
              color #fff / mb-4 (16px) — via .hero-h1 utility */}
          <h1 className="hero-h1 mb-4 text-white">{slide.headline.replace(/\s+(\S+)$/, '\u00A0$1')}</h1>

          {/* Subtitle
              14px / lh 1.6 / weight 400 / color rgba(255,255,255,0.85)
              max-w 384px / mb-8 (32px) */}
          <p className="mb-8 max-w-96 text-sm leading-relaxed font-normal text-white/85">{slide.subtext}</p>

          {/* CTA button
              14px / weight 600 / uppercase / tracking 0.1em
              px-8 py-3.5 / white text / bg by gender / radius 0
              element: <a> per spec / self-alignment matches text alignment
              hover: opacity-90 + -translate-y-px / transition 200ms */}
          <a
            href={slide.href}
            className={`${CTA_ALIGN[slide.align]} rounded-none px-8 py-3.5 text-sm font-semibold tracking-widest text-white uppercase transition-all duration-200 hover:-translate-y-px hover:opacity-90`}
            style={{ backgroundColor: CTA_BG[slide.gender] }}
          >
            {slide.cta}
          </a>
        </div>
      </div>

      {/* ── Navigation arrows ─────────────────────────────────────────────── */}
      <button
        onClick={prev}
        className="absolute top-1/2 left-4 flex size-10 -translate-y-1/2 items-center justify-center bg-white/20 text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/40 active:bg-white/60"
        aria-label={aPreviousSlide}
      >
        <ChevronLeftIcon className="size-5" />
      </button>
      <button
        onClick={next}
        className="absolute top-1/2 right-4 flex size-10 -translate-y-1/2 items-center justify-center bg-white/20 text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/40 active:bg-white/60"
        aria-label={aNextSlide}
      >
        <ChevronRightIcon className="size-5" />
      </button>

      {/* ── Dot indicators ────────────────────────────────────────────────── */}
      <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2" role="tablist" aria-label={aSlides}>
        {slides.map((_, idx) => (
          <button
            key={idx}
            role="tab"
            onClick={() => goTo(idx)}
            data-testid="hero-slider-dot"
            className={`h-1 transition-all duration-300 ${idx === current ? 'w-6 bg-white' : 'w-2 bg-white/50'}`}
            aria-selected={idx === current}
            aria-controls={`${regionId}-slide-${idx}`}
            aria-label={`${aSlidePrefix} ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

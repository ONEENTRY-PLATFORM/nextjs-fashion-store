'use client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

import { CAROUSEL_LABELS } from '@/app/data/commonLabels';
import { Link } from '@/lib/i18n/navigation';
import { getImageUrl } from '@/lib/oneentry';
import { useT } from '@/lib/oneentry/labels/DictContext';

/**
 * Generic renderer for OE `slider_block` type. Reads each slide's
 * `attributeValues` heuristically (patterns for `*image*`, `*headline/title*`,
 * `*eyebrow/label*`, `*subtext/description/body*`, `*cta_text/button*`,
 * `*cta_link/href/link*`) — lets admins attach any slider marker without
 * hardcoding attribute names.
 *
 * Simple carousel: prev / next arrows + dot pagination. Auto-advance is
 * intentionally omitted for the generic case (avoid surprise motion on
 * pages that weren't hero-designed). Homepage keeps `<HeroSlider>` for the
 * hero-specific flow (auto-advance, gender toggle, full-height layout).
 */

type AttrValue = { value?: unknown } | undefined;
type Attrs = Record<string, AttrValue>;

const asString = (v: unknown): string => (typeof v === 'string' ? v : '');

function pickAttr<T = unknown>(attrs: Attrs, patterns: RegExp[]): T | undefined {
  for (const key of Object.keys(attrs)) {
    if (patterns.some((p) => p.test(key))) {
      return attrs[key]?.value as T | undefined;
    }
  }
  return undefined;
}

/**
 * Some tenants scope every attribute string index numerically
 *  (`string_id1`..`string_id6`, `image_id4`) with no semantic name. Fall
 *  back to positional guess only after the pattern search fails.
 */
function pickPositional(attrs: Attrs, prefix: string, index: number): unknown {
  return attrs[`${prefix}${index}`]?.value;
}

interface Slide {
  image: string;
  eyebrow: string;
  headline: string;
  subtext: string;
  cta: string;
  href: string;
}

function normalizeSlide(raw: { attributeValues?: Record<string, unknown> }): Slide {
  const attrs = (raw.attributeValues ?? {}) as Attrs;
  return {
    image: getImageUrl(pickAttr(attrs, [/image|_pic$|photo|_bg$/i])),
    headline: asString(pickAttr(attrs, [/headline|(^|_)title$/i]) ?? pickPositional(attrs, 'string_id', 1)),
    eyebrow: asString(pickAttr(attrs, [/eyebrow|label|lable/i]) ?? pickPositional(attrs, 'string_id', 2)),
    subtext: asString(
      pickAttr(attrs, [/subtext|subtitle|description|_body$|_text$/i]) ?? pickPositional(attrs, 'string_id', 3),
    ),
    cta: asString(pickAttr(attrs, [/cta_?text|button/i]) ?? pickPositional(attrs, 'string_id', 5)),
    href: asString(pickAttr(attrs, [/cta_?link|_href$|_link$/i]) ?? pickPositional(attrs, 'string_id', 6)),
  };
}

export function GenericSliderBlock({
  slides: rawSlides,
  title,
}: {
  slides?: Array<{ id?: number; attributeValues?: Record<string, unknown> }>;
  title?: string;
}) {
  const slides = (rawSlides ?? []).map(normalizeSlide).filter((s) => s.image || s.headline);
  const [index, setIndex] = useState(0);
  const lPrevSlide = useT('interface_controls_previous_slide', CAROUSEL_LABELS.previousSlide);
  const lNextSlide = useT('interface_controls_next_slide', CAROUSEL_LABELS.nextSlide);

  if (slides.length === 0) return null;
  // Slides can shrink (admin drops one) while `index` still points past the
  // end — clamp during render instead of correcting it from an effect, which
  // would be a synchronous `setState` and an extra render pass.
  const current = slides[Math.min(index, slides.length - 1)];
  const prev = () => setIndex((i) => (i - 1 + slides.length) % slides.length);
  const next = () => setIndex((i) => (i + 1) % slides.length);

  return (
    <section className="relative my-8 w-full overflow-hidden bg-gray-100" aria-label={title || undefined}>
      <div className="relative h-[clamp(320px,42vw,520px)]">
        {current.image ? (
          <Image
            src={current.image}
            alt={current.headline || title || 'Slide'}
            fill
            sizes="100vw"
            className="object-cover"
            priority={index === 0}
          />
        ) : null}
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-center px-6 text-white lg:px-12">
          {current.eyebrow ? (
            <p className="mb-3 text-xs tracking-[0.3em] text-white/80 uppercase">{current.eyebrow}</p>
          ) : null}
          {current.headline ? (
            <h2 className="max-w-2xl text-[clamp(1.5rem,4vw,3rem)] font-bold tracking-widest uppercase">
              {current.headline}
            </h2>
          ) : null}
          {current.subtext ? <p className="mt-4 max-w-lg text-base text-white/85">{current.subtext}</p> : null}
          {current.cta && current.href ? (
            <Link
              href={current.href}
              className="mt-8 inline-flex items-center gap-2 self-start bg-white px-6 py-3 text-xs font-bold tracking-widest text-black uppercase no-underline transition-colors hover:bg-gray-100"
            >
              {current.cta} <ChevronRight size={13} />
            </Link>
          ) : null}
        </div>

        {slides.length > 1 ? (
          <>
            <button
              type="button"
              aria-label={lPrevSlide}
              onClick={prev}
              className="absolute top-1/2 left-4 z-20 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-black transition-colors hover:bg-white"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              aria-label={lNextSlide}
              onClick={next}
              className="absolute top-1/2 right-4 z-20 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-black transition-colors hover:bg-white"
            >
              <ChevronRight size={18} />
            </button>
            <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index ? 'w-8 bg-white' : 'w-4 bg-white/50 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}

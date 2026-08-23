'use client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import type { IAttributeValues, IBlockSlideItem } from 'oneentry/types';
import { useState } from 'react';

import { Link } from '@/lib/i18n/navigation';
import { getImageUrl } from '@/lib/oneentry';
import { useT } from '@/lib/oneentry/labels/DictContext';

export const GENERIC_SLIDER_LABELS = {
  previousSlide: 'Previous slide',
  nextSlide: 'Next slide',
} as const;

/** Generic renderer for OE `slider_block` type. */

const asString = (v: unknown): string => (typeof v === 'string' ? v : '');

function pickAttr<T = unknown>(attrs: IAttributeValues, patterns: RegExp[]): T | undefined {
  for (const key of Object.keys(attrs)) {
    if (patterns.some((p) => p.test(key))) {
      return attrs[key]?.value as T | undefined;
    }
  }
  return undefined;
}

/** Some tenants scope every attribute string index numerically (`string_id1`..`string_id6`, `image_id4`) with no semantic name. */
function pickPositional(attrs: IAttributeValues, prefix: string, index: number): unknown {
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

/** What the renderer actually consumes out of an `IBlockSlideItem`; the loader hands over the full entity, Storybook only the attributes. */
type SlideInput = Pick<IBlockSlideItem, 'attributeValues'> & { id?: number | null };

function normalizeSlide(raw: SlideInput): Slide {
  const attrs = raw.attributeValues ?? {};
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

export function GenericSliderBlock({ slides: rawSlides, title }: { slides?: SlideInput[]; title?: string }) {
  const slides = (rawSlides ?? []).map(normalizeSlide).filter((s) => s.image || s.headline);
  const [index, setIndex] = useState(0);
  const lPrevSlide = useT('interface_controls_previous_slide', GENERIC_SLIDER_LABELS.previousSlide);
  const lNextSlide = useT('interface_controls_next_slide', GENERIC_SLIDER_LABELS.nextSlide);

  if (slides.length === 0) return null;
  // Slides can shrink (admin drops one) while `index` still points past the end.
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

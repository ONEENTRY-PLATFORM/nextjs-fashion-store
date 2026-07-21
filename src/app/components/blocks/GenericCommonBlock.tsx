'use client'
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

/**
 * Generic banner-style renderer for OE `common_block` type. Reads
 * `attributeValues` heuristically — admin picks attribute names per
 * `attributeSetIdentifier`, but they follow common patterns
 * (`*_lable/label/eyebrow`, `*_title`, `*_sub_title/subtitle`,
 * `*_description/text/body`, `*_pic/image/photo`, `*_cta_text/button`,
 * `*_cta_link/href/link`). Whatever pattern the admin uses, this component
 * finds it and renders a banner. Hides itself when neither an image nor a
 * headline is present so unconfigured blocks don't leak into the layout.
 *
 * Not a hero — a mid-page banner (similar shape to `<DiscountBanner>` but
 * unopinionated about attribute naming). Homepage keeps `<DiscountBanner>` /
 * `<HeroSlider>` for marker-specific hardcoded flows.
 */

type AttrValue = { value?: unknown } | undefined;
type Attrs = Record<string, AttrValue>;

const asString = (v: unknown): string => (typeof v === 'string' ? v : '');

const extractImage = (v: unknown): string => {
  if (!Array.isArray(v) || v.length === 0) return '';
  const first = v[0] as { downloadLink?: unknown };
  return typeof first?.downloadLink === 'string' ? first.downloadLink : '';
};

/** Find the first attribute value whose key matches any of `patterns`.
 *  Attribute value may itself be `{ value: T }` per OE shape — we unwrap. */
function pickAttr<T = unknown>(attrs: Attrs, patterns: RegExp[]): T | undefined {
  for (const key of Object.keys(attrs)) {
    if (patterns.some((p) => p.test(key))) {
      return attrs[key]?.value as T | undefined;
    }
  }
  return undefined;
}

/** OE `attributeValues` may arrive either flat (SDK-normalised for the
 *  requested lang) or wrapped under `{ [lang]: {...} }` (raw fetch path).
 *  Handle both — mirrors `discount-banner.ts` fallback logic. */
function flattenAttrs(av: unknown, lang: string): Attrs {
  if (!av || typeof av !== 'object') return {};
  const wrapped = (av as Record<string, Record<string, AttrValue>>)[lang];
  if (wrapped && typeof wrapped === 'object') return wrapped;
  return av as Attrs;
}

export function GenericCommonBlock({
  attributeValues,
  title: blockTitle,
  lang = 'en_US',
}: {
  attributeValues?: Record<string, unknown>;
  title: string;
  lang?: string;
}) {
  const attrs = flattenAttrs(attributeValues, lang);

  const label       = asString(pickAttr(attrs, [/lable$|label$|eyebrow/i]));
  const title       = asString(pickAttr(attrs, [/(^|_)title$/i])) || blockTitle;
  const subtitle    = asString(pickAttr(attrs, [/sub_?title/i]));
  const description = asString(pickAttr(attrs, [/description|_body$|_text$/i]));
  const image       = extractImage(pickAttr(attrs, [/_pic$|image|photo|_bg$/i]));
  const imageAlt    = title || subtitle || 'Banner';
  const ctaText     = asString(pickAttr(attrs, [/cta_?text|button/i]));
  const ctaLink     = asString(pickAttr(attrs, [/cta_?link|_href$|_link$/i]));

  // Nothing meaningful configured → hide entirely to avoid an empty box.
  if (!image && !title && !subtitle && !description) return null;

  const cta = ctaText && ctaLink ? (
    <Link
      href={ctaLink}
      className="inline-flex items-center gap-2 mt-6 px-6 py-3 text-white text-xs tracking-widest uppercase bg-black hover:gap-3 transition-all no-underline font-bold"
    >
      {ctaText} <ChevronRight size={13} />
    </Link>
  ) : null;

  return (
    <section className="relative w-full overflow-hidden bg-gray-100 my-8">
      <div className="relative flex flex-col md:flex-row items-stretch">
        {image ? (
          <div className="relative w-full md:w-1/2 min-h-[240px] md:min-h-[360px]">
            <Image
              src={image}
              alt={imageAlt}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        ) : null}
        <div className={`flex flex-col justify-center p-8 lg:p-12 ${image ? 'md:w-1/2' : 'w-full text-center'}`}>
          {label ? (
            <p className="text-xs tracking-[0.3em] uppercase text-gray-400 mb-3">{label}</p>
          ) : null}
          {title ? (
            <h2 className="tracking-widest uppercase text-[clamp(1.25rem,3vw,2rem)] font-bold mb-2">{title}</h2>
          ) : null}
          {subtitle ? (
            <p className="text-lg tracking-wide text-gray-700 mb-3">{subtitle}</p>
          ) : null}
          {description ? (
            <p className="text-sm text-gray-600 max-w-lg">{description}</p>
          ) : null}
          {cta}
        </div>
      </div>
    </section>
  );
}

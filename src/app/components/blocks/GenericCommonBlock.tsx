'use client';
import { ChevronRight } from 'lucide-react';
import Image from 'next/image';
import type { IAttributeValues } from 'oneentry/types';

import { Link } from '@/lib/i18n/navigation';
import { getImageUrl } from '@/lib/oneentry';
import { attributesForLang } from '@/lib/oneentry/attributes';
import { DEFAULT_LOCALE } from '@/lib/oneentry/locale';

/** Generic banner-style renderer for OE `common_block` type. */

const asString = (v: unknown): string => (typeof v === 'string' ? v : '');

/** Find the first attribute value whose key matches any of `patterns`. Attribute value may itself be `{ value: T }` per OE shape. */
function pickAttr<T = unknown>(attrs: IAttributeValues, patterns: RegExp[]): T | undefined {
  for (const key of Object.keys(attrs)) {
    if (patterns.some((p) => p.test(key))) {
      return attrs[key]?.value as T | undefined;
    }
  }
  return undefined;
}

export function GenericCommonBlock({
  attributeValues,
  title: blockTitle,
  lang = DEFAULT_LOCALE,
}: {
  attributeValues?: Record<string, unknown>;
  title: string;
  lang?: string;
}) {
  const attrs = attributesForLang(attributeValues, lang);

  const label = asString(pickAttr(attrs, [/lable$|label$|eyebrow/i]));
  const title = asString(pickAttr(attrs, [/(^|_)title$/i])) || blockTitle;
  const subtitle = asString(pickAttr(attrs, [/sub_?title/i]));
  const description = asString(pickAttr(attrs, [/description|_body$|_text$/i]));
  const image = getImageUrl(pickAttr(attrs, [/_pic$|image|photo|_bg$/i]));
  const imageAlt = title || subtitle || 'Banner';
  const ctaText = asString(pickAttr(attrs, [/cta_?text|button/i]));
  const ctaLink = asString(pickAttr(attrs, [/cta_?link|_href$|_link$/i]));

  // Nothing meaningful configured → hide entirely to avoid an empty box.
  if (!image && !title && !subtitle && !description) return null;

  const cta =
    ctaText && ctaLink ? (
      <Link
        href={ctaLink}
        className="mt-6 inline-flex items-center gap-2 bg-black px-6 py-3 text-xs font-bold tracking-widest text-white uppercase no-underline transition-all hover:gap-3"
      >
        {ctaText} <ChevronRight size={13} />
      </Link>
    ) : null;

  return (
    <section className="relative my-8 w-full overflow-hidden bg-gray-100">
      <div className="relative flex flex-col items-stretch md:flex-row">
        {image ? (
          <div className="relative min-h-60 w-full md:min-h-90 md:w-1/2">
            <Image src={image} alt={imageAlt} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
          </div>
        ) : null}
        <div className={`flex flex-col justify-center p-8 lg:p-12 ${image ? 'md:w-1/2' : 'w-full text-center'}`}>
          {label ? <p className="mb-3 text-xs tracking-[0.3em] text-gray-400 uppercase">{label}</p> : null}
          {title ? (
            <h2 className="mb-2 text-[clamp(1.25rem,3vw,2rem)] font-bold tracking-widest uppercase">{title}</h2>
          ) : null}
          {subtitle ? <p className="mb-3 text-lg tracking-wide text-gray-700">{subtitle}</p> : null}
          {description ? <p className="max-w-lg text-sm text-gray-600">{description}</p> : null}
          {cta}
        </div>
      </div>
    </section>
  );
}

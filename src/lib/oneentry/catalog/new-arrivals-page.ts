import { unstable_cache } from 'next/cache';

import { currentCmsLocale } from '@/lib/oneentry/current-locale';
import { getApi, getImage, isError, isOneEntryEnabled } from '@/lib/oneentry/index';
import type { Lang } from '@/lib/oneentry/system-text';

export interface NewArrivalsPageFromCms {
  hero: {
    eyebrow: string;
    heading: string;
    subheading: string;
    image: string;
    /**
     * Blur data URI for `next/image`'s `blurDataURL`. Only files uploaded
     *  through an OE preview template have one.
     */
    imageBlur?: string;
  };
  footer: {
    eyebrow: string;
    heading: string;
    body: string;
    image: string;
    /**
     * Blur data URI for `next/image`'s `blurDataURL`. Only files uploaded
     *  through an OE preview template have one.
     */
    imageBlur?: string;
  };
}

type RawAttr = { value?: unknown };
type RawPage = {
  attributeValues?: Record<string, Record<string, RawAttr>> | Record<string, RawAttr>;
};

const asString = (v: unknown): string => (typeof v === 'string' ? v : '');
async function fetchNewArrivalsPage(lang: Lang): Promise<NewArrivalsPageFromCms | null> {
  if (!isOneEntryEnabled) return null;
  try {
    const result = await getApi().Pages.getPageByUrl('new', lang);
    if (isError(result)) return null;
    const page = result as unknown as RawPage;
    const av = page.attributeValues ?? {};
    const wrapped = (av as Record<string, Record<string, RawAttr>>)[lang];
    const attrs: Record<string, RawAttr> =
      wrapped && typeof wrapped === 'object' ? wrapped : (av as Record<string, RawAttr>);
    const s = (k: string): string => asString(attrs[k]?.value);
    return {
      hero: {
        eyebrow: s('page_new_arrivals_top_banner_lable'),
        heading: s('page_new_arrivals_top_banner_title'),
        subheading: s('page_new_arrivals_top_banner_sub_title'),
        image: getImage(attrs['page_new_arrivals_top_banner_pictures']?.value).url,
        imageBlur: getImage(attrs['page_new_arrivals_top_banner_pictures']?.value).blur,
      },
      footer: {
        eyebrow: s('page_new_arrivals_footer_banner_lable'),
        heading: s('page_new_arrivals_footer_banner_title'),
        body: s('page_new_arrivals_footer_banner_sub_title'),
        image: getImage(attrs['page_new_arrivals_footer_banner_pictures']?.value).url,
        imageBlur: getImage(attrs['page_new_arrivals_footer_banner_pictures']?.value).blur,
      },
    };
  } catch {
    return null;
  }
}

/**
 * Cached loader — refresh every 60s so admin edits to the New Arrivals
 *  banners surface without a manual redeploy.
 *
 *  `lang` is a required argument rather than something the cached body reads
 *  for itself: `unstable_cache` keys on its arguments, so passing it in is
 *  what keeps one locale's banners out of another's cache entry.
 */
const loadNewArrivalsPageCached = unstable_cache((lang: Lang) => fetchNewArrivalsPage(lang), ['oe-new-arrivals-page'], {
  revalidate: 60,
  tags: ['oe-page'],
});

/**
 * New Arrivals page attributes for the current route's locale.
 *
 * @param [langArg] - Explicit OE locale; defaults to the route's.
 * @returns Page attributes, or `null`.
 */
export async function loadNewArrivalsPage(langArg?: Lang): Promise<Awaited<ReturnType<typeof fetchNewArrivalsPage>>> {
  return loadNewArrivalsPageCached(langArg ?? (await currentCmsLocale()));
}

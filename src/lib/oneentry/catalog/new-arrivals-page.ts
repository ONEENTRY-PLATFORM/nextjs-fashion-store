import { unstable_cache } from 'next/cache';

import { REVALIDATE_CATALOG } from '@/lib/isr';
import { attributesForLang } from '@/lib/oneentry/attributes';
import { currentCmsLocale } from '@/lib/oneentry/current-locale';
import { getApi, getImage, isError, isOneEntryEnabled } from '@/lib/oneentry/index';
import type { Lang } from '@/lib/oneentry/system-text';

export interface NewArrivalsPageFromCms {
  hero: {
    eyebrow: string;
    heading: string;
    subheading: string;
    image: string;
    /** Blur data URI for `next/image`'s `blurDataURL`. Only files uploaded through an OE preview template have one. */
    imageBlur?: string;
  };
  footer: {
    eyebrow: string;
    heading: string;
    body: string;
    image: string;
    /** Blur data URI for `next/image`'s `blurDataURL`. Only files uploaded through an OE preview template have one. */
    imageBlur?: string;
  };
}

const asString = (v: unknown): string => (typeof v === 'string' ? v : '');
async function fetchNewArrivalsPage(lang: Lang): Promise<NewArrivalsPageFromCms | null> {
  if (!isOneEntryEnabled) return null;
  try {
    const result = await getApi().Pages.getPageByUrl('new', lang);
    if (isError(result)) return null;
    const attrs = attributesForLang(result.attributeValues, lang);
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

/** Cached loader — admin edits to the New Arrivals banners surface without a manual redeploy. Shares `REVALIDATE_CATALOG`; see the note in `sale-page.ts` on why a hardcoded 60 s here overrides the route's own window. */
const loadNewArrivalsPageCached = unstable_cache((lang: Lang) => fetchNewArrivalsPage(lang), ['oe-new-arrivals-page'], {
  revalidate: REVALIDATE_CATALOG,
  tags: ['oe-page'],
});

/** New Arrivals page attributes for the current route's locale. */
export async function loadNewArrivalsPage(langArg?: Lang): Promise<Awaited<ReturnType<typeof fetchNewArrivalsPage>>> {
  return loadNewArrivalsPageCached(langArg ?? (await currentCmsLocale()));
}

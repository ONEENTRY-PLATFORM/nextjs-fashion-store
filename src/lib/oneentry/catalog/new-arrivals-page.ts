import { unstable_cache } from 'next/cache';
import { getApi, isError, isOneEntryEnabled } from '../index';
import type { Lang } from '../system-text';
import { DEFAULT_LOCALE } from '../locale';

export interface NewArrivalsPageFromCms {
  hero: {
    eyebrow: string;
    heading: string;
    subheading: string;
    image: string;
  };
  footer: {
    eyebrow: string;
    heading: string;
    body: string;
    image: string;
  };
}

type RawAttr = { value?: unknown };
type RawPage = {
  attributeValues?: Record<string, Record<string, RawAttr>> | Record<string, RawAttr>;
};

const asString = (v: unknown): string => (typeof v === 'string' ? v : '');
const extractImage = (v: unknown): string => {
  if (!Array.isArray(v) || v.length === 0) return '';
  const first = v[0] as { downloadLink?: unknown };
  return typeof first?.downloadLink === 'string' ? first.downloadLink : '';
};

async function fetchNewArrivalsPage(lang: Lang): Promise<NewArrivalsPageFromCms | null> {
  if (!isOneEntryEnabled) return null;
  try {
    const result = await getApi().Pages.getPageByUrl('new', lang);
    if (isError(result)) return null;
    const page = result as unknown as RawPage;
    const av = page.attributeValues ?? {};
    const wrapped = (av as Record<string, Record<string, RawAttr>>)[lang];
    const attrs: Record<string, RawAttr> = (wrapped && typeof wrapped === 'object')
      ? wrapped
      : (av as Record<string, RawAttr>);
    const s = (k: string): string => asString(attrs[k]?.value);
    return {
      hero: {
        eyebrow:    s('page_new_arrivals_top_banner_lable'),
        heading:    s('page_new_arrivals_top_banner_title'),
        subheading: s('page_new_arrivals_top_banner_sub_title'),
        image:      extractImage(attrs['page_new_arrivals_top_banner_pictures']?.value),
      },
      footer: {
        eyebrow: s('page_new_arrivals_footer_banner_lable'),
        heading: s('page_new_arrivals_footer_banner_title'),
        body:    s('page_new_arrivals_footer_banner_sub_title'),
        image:   extractImage(attrs['page_new_arrivals_footer_banner_pictures']?.value),
      },
    };
  } catch {
    return null;
  }
}

/** Cached loader — refresh every 60s so admin edits to the New Arrivals
 *  banners surface without a manual redeploy. */
export const loadNewArrivalsPage = unstable_cache(
  (lang: Lang = DEFAULT_LOCALE) => fetchNewArrivalsPage(lang),
  ['oe-new-arrivals-page'],
  { revalidate: 60, tags: ['oe-page'] },
);

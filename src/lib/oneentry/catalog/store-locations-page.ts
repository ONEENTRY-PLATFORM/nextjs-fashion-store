import { cache } from 'react';
import { getApi, isError, isOneEntryEnabled } from '../index';
import type { Lang } from '../system-text';
import { DEFAULT_LOCALE } from '../locale';

export interface StoreLocationsPageFromCms {
  hero: {
    eyebrow: string;
    title: string;
    text: string;
    image: string;
  };
  flagshipCallout: {
    subtitle: string;
    title: string;
    text: string;
    directionsHref: string;
  };
}

type RawAttr = { value?: unknown };
type RawPage = {
  pageUrl?: string;
  localizeInfos?: Record<string, { title?: string; menuTitle?: string }>;
  attributeValues?: Record<string, Record<string, RawAttr>> | Record<string, RawAttr>;
};

const asString = (v: unknown): string => (typeof v === 'string' ? v : '');
const extractImage = (v: unknown): string => {
  if (!Array.isArray(v) || v.length === 0) return '';
  const first = v[0] as { downloadLink?: unknown };
  return typeof first?.downloadLink === 'string' ? first.downloadLink : '';
};

export const loadStoreLocationsPage = cache(
  async (lang: Lang = DEFAULT_LOCALE): Promise<StoreLocationsPageFromCms | null> => {
    if (!isOneEntryEnabled) return null;
    try {
      // Prefer `getPageByUrl('stores', lang)` — the SDK-supported entry
      // point. If OE returns 404 for this specific page in the tenant, fall
      // back to iterating `getPages()` and finding the entry by pageUrl.
      // Note: `getPages()` is documented to strip `attributeValues` in some
      // SDK versions; if that becomes the case, this loader will return
      // empty text/image fields — the storefront currently degrades to
      // static labels for stores hero when this happens.
      let page: RawPage | null = null;
      const single = await getApi().Pages.getPageByUrl('stores', lang);
      if (!isError(single)) {
        page = single as unknown as RawPage;
      } else {
        const list = await getApi().Pages.getPages(lang);
        if (isError(list)) return null;
        const arr = list as unknown as RawPage[];
        page = arr.find((p) => p.pageUrl === 'stores') ?? null;
      }
      if (!page) return null;

      // `attributeValues` may be flat `{ marker: {value} }` or wrapped
      // `{ en_US: { marker: {value} } }` depending on the endpoint used.
      const av = page.attributeValues ?? {};
      const wrapped = (av as Record<string, Record<string, RawAttr>>)[lang];
      const attrs: Record<string, RawAttr> = (wrapped && typeof wrapped === 'object')
        ? wrapped
        : (av as Record<string, RawAttr>);
      const v = (k: string): string => asString(attrs[k]?.value);
      return {
        hero: {
          eyebrow: v('page_store_location_top_banner_sub_title'),
          title: v('page_store_location_top_banner_title'),
          text: v('page_store_location_top_banner_text'),
          image: extractImage(attrs['page_store_location_top_banner_image']?.value),
        },
        flagshipCallout: {
          subtitle: v('page_store_location_footer_banner_subtitle'),
          title: v('page_store_location_footer_banner_title'),
          text: v('page_store_location_footer_banner_text'),
          directionsHref: v('page_store_location_footer_banner_direction'),
        },
      };
    } catch {
      return null;
    }
  },
);

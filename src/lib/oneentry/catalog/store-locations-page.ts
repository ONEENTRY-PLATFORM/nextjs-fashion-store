import { cache } from 'react';
import type { Lang } from '../system-text';

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
  attributeValues?: Record<string, Record<string, RawAttr>>;
};

const asString = (v: unknown): string => (typeof v === 'string' ? v : '');
const extractImage = (v: unknown): string => {
  if (!Array.isArray(v) || v.length === 0) return '';
  const first = v[0] as { downloadLink?: unknown };
  return typeof first?.downloadLink === 'string' ? first.downloadLink : '';
};

export const loadStoreLocationsPage = cache(
  async (lang: Lang = 'en_US'): Promise<StoreLocationsPageFromCms | null> => {
    const url = process.env.ONEENTRY_URL;
    const token = process.env.ONEENTRY_TOKEN;
    if (!url || !token) return null;
    try {
      // SDK getPageByUrl returns 404 for this page; SDK getPages() strips attributeValues.
      // Raw list endpoint returns full data — find the entry by pageUrl.
      const u = new URL(`${url}/api/content/pages`);
      u.searchParams.set('langCode', lang);
      u.searchParams.set('limit', '200');
      const r = await fetch(u.toString(), {
        headers: { 'x-app-token': token, accept: 'application/json' },
      });
      if (!r.ok) return null;
      const data = (await r.json()) as RawPage[] | { items?: RawPage[] };
      const arr: RawPage[] = Array.isArray(data) ? data : data?.items ?? [];
      const page = arr.find((p) => p.pageUrl === 'stores');
      if (!page) return null;
      const attrs = page.attributeValues?.[lang] ?? {};
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

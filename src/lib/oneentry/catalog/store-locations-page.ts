import type { IPagesEntity } from 'oneentry/types';
import { cache } from 'react';

import { attributesForLang } from '@/lib/oneentry/attributes';
import { currentCmsLocale } from '@/lib/oneentry/current-locale';
import { getApi, getImage, isError, isOneEntryEnabled } from '@/lib/oneentry/index';
import type { Lang } from '@/lib/oneentry/system-text';

export interface StoreLocationsPageFromCms {
  hero: {
    eyebrow: string;
    title: string;
    text: string;
    image: string;
    /** Blur data URI for `next/image`'s `blurDataURL`. Only files uploaded through an OE preview template have one. */
    imageBlur?: string;
  };
  flagshipCallout: {
    subtitle: string;
    title: string;
    text: string;
    directionsHref: string;
  };
}

const asString = (v: unknown): string => (typeof v === 'string' ? v : '');

export const loadStoreLocationsPage = cache(async (langArg?: Lang): Promise<StoreLocationsPageFromCms | null> => {
  const lang = langArg ?? (await currentCmsLocale());
  if (!isOneEntryEnabled) return null;
  try {
    // Prefer `getPageByUrl('stores', lang)` — the SDK-supported entry point.
    let page: IPagesEntity | null = null;
    const single = await getApi().Pages.getPageByUrl('stores', lang);
    if (!isError(single)) {
      page = single;
    } else {
      const list = await getApi().Pages.getPages(lang);
      if (isError(list)) return null;
      page = list.find((p) => p.pageUrl === 'stores') ?? null;
    }
    if (!page) return null;

    const attrs = attributesForLang(page.attributeValues, lang);
    const v = (k: string): string => asString(attrs[k]?.value);
    return {
      hero: {
        eyebrow: v('page_store_location_top_banner_sub_title'),
        title: v('page_store_location_top_banner_title'),
        text: v('page_store_location_top_banner_text'),
        image: getImage(attrs['page_store_location_top_banner_image']?.value).url,
        imageBlur: getImage(attrs['page_store_location_top_banner_image']?.value).blur,
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
});

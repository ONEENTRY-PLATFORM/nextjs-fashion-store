import { unstable_cache } from 'next/cache';
import type { IBlockSlideItem, IBlockSlidesResponse } from 'oneentry/types';

import { REVALIDATE_BLOCK } from '@/lib/isr';
import { getApiForLang, getImage, isError } from '@/lib/oneentry/index';
import { DEFAULT_LOCALE } from '@/lib/oneentry/locale';
import { logCaught } from '@/lib/oneentry/log';
import { withTiming } from '@/lib/oneentry/profiling';
import type { Lang } from '@/lib/oneentry/system-text';

export interface HomepageCollectionItem {
  id: number;
  image: string;
  /** Blur data URI for `next/image`'s `blurDataURL`. Only files uploaded through an OE preview template have one. */
  imageBlur?: string;
  title: string;
  subtitle: string;
  buttonText: string;
  link: string;
}

/** `getSlides` is declared as `{ items }`; some tenants answer with the bare array. */
type RawSlidesResponse = IBlockSlidesResponse | IBlockSlideItem[] | null | undefined;

const asString = (v: unknown): string => (typeof v === 'string' ? v : '');

const normalize = (raw: IBlockSlideItem): HomepageCollectionItem => {
  const v = raw.attributeValues ?? {};
  const picture = getImage(v?.['image_id3']);
  return {
    id: raw.id,
    image: picture.url,
    imageBlur: picture.blur,
    title: asString(v['string_id1']),
    subtitle: asString(v['string_id2']),
    buttonText: asString(v['string_id4']),
    link: asString(v['string_id5']),
  };
};

export const loadHomepageCollections = withTiming(
  'loadHomepageCollections',
  unstable_cache(
    async (lang: Lang = DEFAULT_LOCALE): Promise<HomepageCollectionItem[]> => {
      // `getSlides` takes no locale argument — see `hero-slides.ts`.
      const api = getApiForLang(lang);
      if (!api) return [];
      try {
        const raw = await api.Blocks.getSlides('homepage_collections');
        if (isError(raw)) return [];
        const result = raw as RawSlidesResponse;
        const items = Array.isArray(result) ? result : (result?.items ?? []);
        return items.map(normalize).filter((s) => s.image.length > 0);
      } catch (err) {
        logCaught('homepage-collections.loadHomepageCollections', err);
        return [];
      }
    },
    ['oe-homepage-collections'],
    { revalidate: REVALIDATE_BLOCK, tags: ['oe-block'] },
  ),
);

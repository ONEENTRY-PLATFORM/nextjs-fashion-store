import { unstable_cache } from 'next/cache';
import type { IBlockEntity } from 'oneentry/types';

import { REVALIDATE_BLOCK } from '@/lib/isr';
import { attributesForLang } from '@/lib/oneentry/attributes';
import { currentCmsLocale } from '@/lib/oneentry/current-locale';
import { getApiSafe, getImage, isError } from '@/lib/oneentry/index';
import { logCaught } from '@/lib/oneentry/log';
import { withTiming } from '@/lib/oneentry/profiling';
import type { Lang } from '@/lib/oneentry/system-text';

export interface DiscountBannerFromCms {
  image: string;
  /** Blur data URI for `next/image`'s `blurDataURL`. Only files uploaded through an OE preview template have one. */
  imageBlur?: string;
  alt: string;
  badge: string;
  discountText: string;
  category: string;
  description: string;
  cta: string;
  href: string;
}

const asString = (v: unknown): string => (typeof v === 'string' ? v : '');

/** `lang` is an explicit argument, not something the cached body resolves: `unstable_cache` keys on its arguments, so passing it in is what stops two locales from sharing one cache entry. */
const loadDiscountBannerCached = withTiming(
  'loadDiscountBanner',
  unstable_cache(
    async (lang: Lang): Promise<DiscountBannerFromCms | null> => {
      const api = getApiSafe();
      if (!api) return null;
      try {
        const result = await api.Blocks.getBlockByMarker('discount_banner', lang);
        if (isError(result)) return null;
        // An unknown marker answers `200` with a `statusCode` body rather than the `IError` the signature promises.
        const raw: (Partial<IBlockEntity> & { statusCode?: number }) | null = result;
        if (!raw || raw.statusCode) return null;
        // SDK normalises by locale → `attributeValues` is already flat. The legacy `[lang]`-wrapped shape stays handled for the rare direct-fetch path.
        const attrs = attributesForLang(raw.attributeValues, lang);
        const picture = getImage(attrs.hp_b_b_pic?.value);
        const banner: DiscountBannerFromCms = {
          image: picture.url,
          imageBlur: picture.blur,
          alt: asString(attrs.hp_b_b_title?.value),
          badge: asString(attrs.hp_b_b_lable?.value),
          discountText: asString(attrs.hp_b_b_title?.value),
          category: asString(attrs.hp_b_b_sub_title?.value),
          // OneEntry currently ships a typo marker `ph_b_b_description` for this field (all the other markers on the block use `hp_b_b_…`).
          description: asString(attrs.hp_b_b_description?.value ?? attrs.ph_b_b_description?.value),
          cta: asString(attrs.hp_b_b_cta_text?.value),
          href: asString(attrs.hp_b_b_cta_link?.value),
        };
        if (!banner.image) return null;
        return banner;
      } catch (err) {
        logCaught(`discount-banner.loadDiscountBanner(${lang})`, err);
        return null;
      }
    },
    ['oe-discount-banner'],
    { revalidate: REVALIDATE_BLOCK, tags: ['oe-block'] },
  ),
);

/** Homepage discount banner for the current route's locale. */
export async function loadDiscountBanner(langArg?: Lang): Promise<DiscountBannerFromCms | null> {
  return loadDiscountBannerCached(langArg ?? (await currentCmsLocale()));
}

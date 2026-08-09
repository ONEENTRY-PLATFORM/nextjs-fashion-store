import { unstable_cache } from 'next/cache';

import { REVALIDATE_HOME } from '../../isr';
import { currentCmsLocale } from '../current-locale';
import { getApiSafe, getImage, isError } from '../index';
import { logCaught } from '../log';
import { withTiming } from '../profiling';
import type { Lang } from '../system-text';

export interface DiscountBannerFromCms {
  image: string;
  /**
   * Blur data URI for `next/image`'s `blurDataURL`. Only files uploaded
   *  through an OE preview template have one.
   */
  imageBlur?: string;
  alt: string;
  badge: string;
  discountText: string;
  category: string;
  description: string;
  cta: string;
  href: string;
}

type AttrValue<T = unknown> = { value?: T };

const asString = (v: unknown): string => (typeof v === 'string' ? v : '');

/**
 * `lang` is an explicit argument, not something the cached body resolves:
 *  `unstable_cache` keys on its arguments, so passing it in is what stops two
 *  locales from sharing one cache entry — and root params are unreadable in
 *  there anyway.
 */
const loadDiscountBannerCached = withTiming(
  'loadDiscountBanner',
  unstable_cache(
    async (lang: Lang): Promise<DiscountBannerFromCms | null> => {
      const api = getApiSafe();
      if (!api) return null;
      try {
        const result = await api.Blocks.getBlockByMarker('discount_banner', lang);
        if (isError(result)) return null;
        const raw = result as unknown as {
          // SDK normalises by locale → `attributeValues` is already a flat
          // `Record<marker, AttrValue>`. We keep the legacy `[lang]` wrapped
          // shape as a fallback for the rare direct-fetch path.
          attributeValues?: Record<string, AttrValue> | Record<string, Record<string, AttrValue>>;
          statusCode?: number;
        } | null;
        if (!raw || raw.statusCode) return null;
        const av = raw.attributeValues ?? {};
        const wrapped = (av as Record<string, Record<string, AttrValue>>)[lang];
        const attrs: Record<string, AttrValue> =
          wrapped && typeof wrapped === 'object' ? wrapped : (av as Record<string, AttrValue>);
        const picture = getImage(attrs.hp_b_b_pic?.value);
        const banner: DiscountBannerFromCms = {
          image: picture.url,
          imageBlur: picture.blur,
          alt: asString(attrs.hp_b_b_title?.value),
          badge: asString(attrs.hp_b_b_lable?.value),
          discountText: asString(attrs.hp_b_b_title?.value),
          category: asString(attrs.hp_b_b_sub_title?.value),
          // OneEntry currently ships a typo marker `ph_b_b_description` for
          // this field (all the other markers on the block use `hp_b_b_…`).
          // Accept EITHER so the storefront stays live if the admin later
          // fixes the typo without a code deploy.
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
    { revalidate: REVALIDATE_HOME, tags: ['oe-block'] },
  ),
);

/**
 * Homepage discount banner for the current route's locale.
 *
 * @param [langArg] - Explicit OE locale; defaults to the route's.
 * @returns Banner, or `null` when unset.
 */
export async function loadDiscountBanner(langArg?: Lang): Promise<DiscountBannerFromCms | null> {
  return loadDiscountBannerCached(langArg ?? (await currentCmsLocale()));
}

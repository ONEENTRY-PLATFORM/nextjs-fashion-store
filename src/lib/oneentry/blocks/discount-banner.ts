import { unstable_cache } from 'next/cache';
import { oneentry, isError } from '../index';
import { withTiming } from '../profiling';
import type { Lang } from '../system-text';
import { DEFAULT_LOCALE } from '../locale';
import { logCaught } from '../log';
import { REVALIDATE_HOME } from '../../isr';

export interface DiscountBannerFromCms {
  image: string;
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

const extractImage = (v: unknown): string => {
  if (!Array.isArray(v) || v.length === 0) return '';
  const first = v[0] as { downloadLink?: unknown };
  return typeof first?.downloadLink === 'string' ? first.downloadLink : '';
};

export const loadDiscountBanner = withTiming('loadDiscountBanner', unstable_cache(
  async (lang: Lang = DEFAULT_LOCALE): Promise<DiscountBannerFromCms | null> => {
    if (!oneentry) return null;
    try {
      const result = await oneentry.Blocks.getBlockByMarker('discount_banner', lang);
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
        wrapped && typeof wrapped === 'object'
          ? wrapped
          : (av as Record<string, AttrValue>);
      const banner: DiscountBannerFromCms = {
        image:        extractImage(attrs.hp_b_b_pic?.value),
        alt:          asString(attrs.hp_b_b_title?.value),
        badge:        asString(attrs.hp_b_b_lable?.value),
        discountText: asString(attrs.hp_b_b_title?.value),
        category:     asString(attrs.hp_b_b_sub_title?.value),
        // OneEntry currently ships a typo marker `ph_b_b_description` for
        // this field (all the other markers on the block use `hp_b_b_…`).
        // Accept EITHER so the storefront stays live if the admin later
        // fixes the typo without a code deploy.
        description:  asString(attrs.hp_b_b_description?.value ?? attrs.ph_b_b_description?.value),
        cta:          asString(attrs.hp_b_b_cta_text?.value),
        href:         asString(attrs.hp_b_b_cta_link?.value),
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
));

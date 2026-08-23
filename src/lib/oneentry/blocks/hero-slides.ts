import { unstable_cache } from 'next/cache';

import { REVALIDATE_BLOCK } from '@/lib/isr';
import { getApiForLang, getImage, isError } from '@/lib/oneentry/index';
import { DEFAULT_LOCALE } from '@/lib/oneentry/locale';
import { logCaught } from '@/lib/oneentry/log';
import { withTiming } from '@/lib/oneentry/profiling';
import type { Lang } from '@/lib/oneentry/system-text';

export interface HeroSlideFromCms {
  id: number;
  image: string;
  /** Blur data URI for `next/image`'s `blurDataURL`. Only files uploaded through an OE preview template have one. */
  imageBlur?: string;
  eyebrow: string;
  headline: string;
  subtext: string;
  cta: string;
  href: string;
  align: 'left' | 'right' | 'center';
  gender: 'women' | 'men';
}

type RawSlide = {
  id: number;
  position?: number;
  visible?: boolean;
  attributeValues?: Record<string, unknown>;
};

type RawSlidesResponse = { items?: RawSlide[]; total?: number } | RawSlide[] | null | undefined;

const asString = (v: unknown): string => (typeof v === 'string' ? v : '');

const ALIGN_BY_POSITION: Array<'left' | 'right' | 'center'> = ['left', 'right', 'center'];
const GENDER_BY_POSITION: Array<'women' | 'men'> = ['women', 'men', 'women'];

const normalize = (raw: RawSlide, idx: number): HeroSlideFromCms => {
  const v = raw.attributeValues ?? {};
  const picture = getImage(v?.['image_id4']);
  return {
    id: raw.id,
    image: picture.url,
    imageBlur: picture.blur,
    headline: asString(v['string_id1']),
    eyebrow: asString(v['string_id2']),
    subtext: asString(v['string_id3']),
    cta: asString(v['string_id5']),
    href: asString(v['string_id6']),
    align: ALIGN_BY_POSITION[idx] ?? 'left',
    gender: GENDER_BY_POSITION[idx] ?? 'women',
  };
};

export const loadHeroSlides = withTiming(
  'loadHeroSlides',
  unstable_cache(
    async (lang: Lang = DEFAULT_LOCALE): Promise<HeroSlideFromCms[]> => {
      // `getSlides` takes no locale argument.
      const api = getApiForLang(lang);
      if (!api) return [];
      try {
        const raw = await api.Blocks.getSlides('hero_slider');
        if (isError(raw)) return [];
        const result = raw as RawSlidesResponse;
        const items = Array.isArray(result) ? result : (result?.items ?? []);
        return items.map((s, i) => normalize(s, i)).filter((s) => s.image.length > 0);
      } catch (err) {
        logCaught('hero-slides.loadHeroSlides', err);
        return [];
      }
    },
    ['oe-hero-slides'],
    { revalidate: REVALIDATE_BLOCK, tags: ['oe-block'] },
  ),
);

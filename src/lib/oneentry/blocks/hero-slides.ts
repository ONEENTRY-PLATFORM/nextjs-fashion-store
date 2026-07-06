import { unstable_cache } from 'next/cache';
import { oneentry, isError } from '../index';
import { withTiming } from '../profiling';
import type { Lang } from '../system-text';
import { DEFAULT_LOCALE } from '../locale';
import { REVALIDATE_HOME } from '../../isr';

export interface HeroSlideFromCms {
  id: number;
  image: string;
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

const extractImage = (raw: Record<string, unknown> | undefined): string => {
  if (!raw) return '';
  const arr = raw['image_id4'];
  if (!Array.isArray(arr) || arr.length === 0) return '';
  const first = arr[0] as { downloadLink?: unknown };
  return typeof first?.downloadLink === 'string' ? first.downloadLink : '';
};

const ALIGN_BY_POSITION: Array<'left' | 'right' | 'center'> = ['left', 'right', 'center'];
const GENDER_BY_POSITION: Array<'women' | 'men'> = ['women', 'men', 'women'];

const normalize = (raw: RawSlide, idx: number): HeroSlideFromCms => {
  const v = raw.attributeValues ?? {};
  return {
    id: raw.id,
    image: extractImage(v),
    headline: asString(v['string_id1']),
    eyebrow: asString(v['string_id2']),
    subtext: asString(v['string_id3']),
    cta: asString(v['string_id5']),
    href: asString(v['string_id6']),
    align: ALIGN_BY_POSITION[idx] ?? 'left',
    gender: GENDER_BY_POSITION[idx] ?? 'women',
  };
};

export const loadHeroSlides = withTiming('loadHeroSlides', unstable_cache(
  async (_lang: Lang = DEFAULT_LOCALE): Promise<HeroSlideFromCms[]> => {
    if (!oneentry) return [];
    try {
      const raw = await oneentry.Blocks.getSlides('hero_slider');
      if (isError(raw)) return [];
      const result = raw as RawSlidesResponse;
      const items = Array.isArray(result) ? result : result?.items ?? [];
      return items.map((s, i) => normalize(s, i)).filter((s) => s.image.length > 0);
    } catch {
      return [];
    }
  },
  ['oe-hero-slides'],
  { revalidate: REVALIDATE_HOME, tags: ['oe-block'] },
));

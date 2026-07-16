import { unstable_cache } from 'next/cache';
import { oneentry, isError } from '../index';
import { withTiming } from '../profiling';
import type { Lang } from '../system-text';
import { DEFAULT_LOCALE } from '../locale';
import { logCaught } from '../log';
import { REVALIDATE_HOME } from '../../isr';

export interface CategoryItemFromCms {
  id: string;
  label: string;
  chip: string;
  image: string;
  href: string;
}

export interface CategorySectionFromCms {
  chips: string[];
  categories: CategoryItemFromCms[];
}

type RawSlide = {
  id: number;
  parentId: number | null;
  position?: number;
  // SDK Blocks.getSlides() returns attributeValues flat (already normalized for the requested lang),
  // not nested under a language key like Pages/Products do.
  attributeValues?: Record<string, unknown>;
};

type RawSlides = { items?: RawSlide[]; total?: number } | RawSlide[] | null | undefined;

const asString = (v: unknown): string => (typeof v === 'string' ? v : '');

const extractImage = (raw: Record<string, unknown>): string => {
  const arr = raw['image_id4'];
  if (!Array.isArray(arr) || arr.length === 0) return '';
  const first = arr[0] as { downloadLink?: unknown };
  return typeof first?.downloadLink === 'string' ? first.downloadLink : '';
};

const slugify = (s: string): string =>
  s.toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export const loadCategorySection = withTiming('loadCategorySection', unstable_cache(
  async (_lang: Lang = DEFAULT_LOCALE): Promise<CategorySectionFromCms> => {
    if (!oneentry) return { chips: [], categories: [] };
    try {
      const raw = await oneentry.Blocks.getSlides('category_section');
      if (isError(raw)) return { chips: [], categories: [] };
      const result = raw as RawSlides;
      const items = Array.isArray(result) ? result : result?.items ?? [];
      const parents = items.filter((it) => it.parentId === null);
      const chipById = new Map<number, string>();
      const chips: string[] = [];
      for (const p of parents) {
        const v = p.attributeValues ?? {};
        const label = asString(v['string_id1']);
        if (!label) continue;
        chipById.set(p.id, label);
        chips.push(label);
      }
      const categories: CategoryItemFromCms[] = [];
      for (const it of items) {
        if (it.parentId === null) continue;
        const chip = chipById.get(it.parentId);
        if (!chip) continue;
        const v = it.attributeValues ?? {};
        const label = asString(v['string_id1']);
        const image = extractImage(v);
        if (!label || !image) continue;
        const explicitHref = asString(v['string_id3']) || asString(v['string_id7']);
        const href = explicitHref || `/women/clothing?clothingType=${encodeURIComponent(label)}`;
        categories.push({
          id: `${slugify(chip)}-${slugify(label)}`,
          label,
          chip,
          image,
          href,
        });
      }
      return { chips, categories };
    } catch (err) {
      logCaught('category-section.loadCategorySection', err);
      return { chips: [], categories: [] };
    }
  },
  ['oe-category-section'],
  { revalidate: REVALIDATE_HOME, tags: ['oe-block'] },
));

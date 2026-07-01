import { cache } from 'react';
import { oneentry } from '../index';
import type { Lang } from '../system-text';

export interface HomepageCollectionItem {
  id: number;
  image: string;
  title: string;
  subtitle: string;
  buttonText: string;
  link: string;
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
  const arr = raw['image_id3'];
  if (!Array.isArray(arr) || arr.length === 0) return '';
  const first = arr[0] as { downloadLink?: unknown };
  return typeof first?.downloadLink === 'string' ? first.downloadLink : '';
};

const normalize = (raw: RawSlide): HomepageCollectionItem => {
  const v = raw.attributeValues ?? {};
  return {
    id: raw.id,
    image: extractImage(v),
    title: asString(v['string_id1']),
    subtitle: asString(v['string_id2']),
    buttonText: asString(v['string_id4']),
    link: asString(v['string_id5']),
  };
};

export const loadHomepageCollections = cache(
  async (_lang: Lang = 'en_US'): Promise<HomepageCollectionItem[]> => {
    if (!oneentry) return [];
    try {
      const result = (await oneentry.Blocks.getSlides('homepage_collections')) as RawSlidesResponse;
      const items = Array.isArray(result) ? result : result?.items ?? [];
      return items.map(normalize).filter((s) => s.image.length > 0);
    } catch {
      return [];
    }
  },
);

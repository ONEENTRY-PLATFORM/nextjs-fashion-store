import { cache } from 'react';
import { oneentry, isError } from '../index';
import type { Lang } from '../system-text';
import { DEFAULT_LOCALE } from '../locale';

export interface CmsPage {
  id: number;
  identifier: string;
  pageUrl: string;
  title: string;
  attributeValues: Record<string, unknown>;
}

const asString = (v: unknown): string => (typeof v === 'string' ? v : '');
const asNumber = (v: unknown): number => (typeof v === 'number' ? v : 0);

const normalize = (raw: Record<string, unknown>, lang: Lang): CmsPage => {
  type Localize = Record<string, { title?: string }>;
  const localize = (raw.localizeInfos ?? {}) as Localize;
  const langInfo = localize[lang] ?? Object.values(localize)[0] ?? {};
  // OE returns `attributeValues` either wrapped per-locale
  // (`{ en_US: { marker: {...} } }`) or flat (`{ marker: {...} }`) depending
  // on how the SDK unwrapped the response for `langCode`. Support both —
  // the flat form is detected by a value that is itself an object with a
  // `type`/`value` field (an attribute payload) rather than a locale-code
  // wrapper (whose values would be objects keyed by attribute markers).
  const rawAttrs = (raw.attributeValues ?? {}) as Record<string, unknown>;
  const localeSlice = rawAttrs[lang];
  const attrs: Record<string, unknown> = (localeSlice && typeof localeSlice === 'object' && !Array.isArray(localeSlice))
    ? (localeSlice as Record<string, unknown>)
    : rawAttrs;
  return {
    id: asNumber(raw.id),
    identifier: asString(raw.identifier),
    pageUrl: asString(raw.pageUrl),
    title: asString(langInfo.title),
    attributeValues: attrs,
  };
};

export const loadPageByUrl = cache(
  async (pageUrl: string, lang: Lang = DEFAULT_LOCALE): Promise<CmsPage | null> => {
    if (!oneentry) return null;
    try {
      const result = await oneentry.Pages.getPageByUrl(pageUrl, lang);
      if (isError(result)) return null;
      const raw = result as unknown as Record<string, unknown> | null;
      if (!raw || raw.statusCode) return null;
      return normalize(raw, lang);
    } catch {
      return null;
    }
  },
);

import { cache } from 'react';

import { currentCmsLocale } from '@/lib/oneentry/current-locale';
import { getApiSafe, isError } from '@/lib/oneentry/index';
import type { Lang } from '@/lib/oneentry/system-text';

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
  type Localize = Record<string, unknown> & { title?: unknown };
  const localize = (raw.localizeInfos ?? {}) as Localize;
  // Like `attributeValues` below, `localizeInfos` arrives either keyed by locale (`{ en_US: { title } }`) or already unwrapped (`{ title }`).
  const perLocale = localize[lang];
  const langInfo = (
    perLocale && typeof perLocale === 'object'
      ? perLocale
      : typeof localize.title === 'string'
        ? localize
        : (Object.values(localize).find((v) => v && typeof v === 'object') ?? {})
  ) as { title?: unknown };
  // OE returns `attributeValues` either wrapped per-locale (`{ en_US: { marker: {...} } }`) or flat (`{ marker: {...} }`) depending on how the SDK unwrapped the response for `langCode`. Support both.
  const rawAttrs = (raw.attributeValues ?? {}) as Record<string, unknown>;
  const localeSlice = rawAttrs[lang];
  const attrs: Record<string, unknown> =
    localeSlice && typeof localeSlice === 'object' && !Array.isArray(localeSlice)
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

export const loadPageByUrl = cache(async (pageUrl: string, langArg?: Lang): Promise<CmsPage | null> => {
  const lang = langArg ?? (await currentCmsLocale());
  const api = getApiSafe();
  if (!api) return null;
  try {
    const result = await api.Pages.getPageByUrl(pageUrl, lang);
    if (isError(result)) return null;
    const raw = result as unknown as Record<string, unknown> | null;
    if (!raw || raw.statusCode) return null;
    return normalize(raw, lang);
  } catch {
    return null;
  }
});

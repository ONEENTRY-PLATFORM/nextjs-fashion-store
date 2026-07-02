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
  const attrs =
    ((raw.attributeValues as Record<string, Record<string, unknown>>)?.[lang] ?? {}) as Record<string, unknown>;
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

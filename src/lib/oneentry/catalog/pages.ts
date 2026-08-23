import type { IAttributeValues, ILocalizeInfo, IPagesEntity } from 'oneentry/types';
import { cache } from 'react';

import { attributesForLang, type MaybeLocalizedAttributes } from '@/lib/oneentry/attributes';
import { currentCmsLocale } from '@/lib/oneentry/current-locale';
import { getApiSafe, isError } from '@/lib/oneentry/index';
import type { Lang } from '@/lib/oneentry/system-text';

export interface CmsPage {
  id: number;
  identifier: string;
  pageUrl: string;
  title: string;
  attributeValues: IAttributeValues;
}

/** `IPagesEntity` as it arrives here: fields can be missing, `localizeInfos` / `attributeValues` come flat or per-locale, and an unknown url answers `200` with a `statusCode` body rather than the `IError` the signature promises. */
type RawPage = Partial<Omit<IPagesEntity, 'localizeInfos' | 'attributeValues'>> & {
  identifier?: string;
  localizeInfos?: Partial<ILocalizeInfo> | Record<string, Partial<ILocalizeInfo>>;
  attributeValues?: MaybeLocalizedAttributes;
  statusCode?: number;
};

const asString = (v: unknown): string => (typeof v === 'string' ? v : '');
const asNumber = (v: unknown): number => (typeof v === 'number' ? v : 0);

const normalize = (raw: RawPage, lang: Lang): CmsPage => {
  const localize = (raw.localizeInfos ?? {}) as Record<string, unknown> & { title?: unknown };
  // Like `attributeValues`, `localizeInfos` arrives either keyed by locale (`{ en_US: { title } }`) or already unwrapped (`{ title }`).
  const perLocale = localize[lang];
  const langInfo = (
    perLocale && typeof perLocale === 'object'
      ? perLocale
      : typeof localize.title === 'string'
        ? localize
        : (Object.values(localize).find((v) => v && typeof v === 'object') ?? {})
  ) as Partial<ILocalizeInfo>;
  return {
    id: asNumber(raw.id),
    identifier: asString(raw.identifier),
    pageUrl: asString(raw.pageUrl),
    title: asString(langInfo.title),
    attributeValues: attributesForLang(raw.attributeValues, lang),
  };
};

export const loadPageByUrl = cache(async (pageUrl: string, langArg?: Lang): Promise<CmsPage | null> => {
  const lang = langArg ?? (await currentCmsLocale());
  const api = getApiSafe();
  if (!api) return null;
  try {
    const result = await api.Pages.getPageByUrl(pageUrl, lang);
    if (isError(result)) return null;
    const raw: RawPage | null = result;
    if (!raw || raw.statusCode) return null;
    return normalize(raw, lang);
  } catch {
    return null;
  }
});

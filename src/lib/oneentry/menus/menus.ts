import type { ILocalizeInfo, IMenusEntity, IMenusPages } from 'oneentry/types';
import { cache } from 'react';

import { currentCmsLocale } from '@/lib/oneentry/current-locale';
import { getApiSafe, isError } from '@/lib/oneentry/index';
import type { Lang } from '@/lib/oneentry/system-text';

export interface MenuPageNode {
  id: number;
  pageUrl: string;
  title: string;
  menuTitle: string;
  parentId: number | null;
  position: number;
  children: MenuPageNode[];
}

export interface CmsMenu {
  id: number;
  identifier: string;
  title: string;
  pages: MenuPageNode[];
}

/** Localization fields OE can carry on a page/menu node. */
type LocalizedFields = Partial<ILocalizeInfo>;

/** The SDK's `Menus.getMenusByMarker` docs promise a "normalized" payload: `localizeInfos` is unwrapped to a single locale, so it's `{ title, menuTitle }` directly. In practice OE also answers with the per-locale map, hence the union. */
type RawLocalize = LocalizedFields | Record<string, LocalizedFields>;

/** `IMenusPages` with every field optional — the wire payload omits plenty — and the two shapes it does not describe: the per-locale `localizeInfos` map, and `children` always arriving as an array. */
type RawNode = Partial<Omit<IMenusPages, 'localizeInfos' | 'children'>> & {
  id: number;
  localizeInfos?: RawLocalize;
  children?: RawNode[];
};

/** `statusCode` is not on `IMenusEntity`: an unknown marker answers `200` with an error body rather than the `IError` the signature promises. */
type RawMenu = Omit<IMenusEntity, 'localizeInfos' | 'pages'> & {
  localizeInfos?: RawLocalize;
  pages?: RawNode[];
  statusCode?: number;
};

const asString = (v: unknown): string => (typeof v === 'string' ? v : '');

/** Extract title/menuTitle regardless of whether OE returned the flat shape (SDK-normalized) or the raw per-locale map. */
const pickLocalized = (li: RawLocalize | undefined, lang: Lang): LocalizedFields => {
  if (!li || typeof li !== 'object') return {};
  // Flat shape: SDK already unwrapped for us.
  if ('title' in li || 'menuTitle' in li) return li as LocalizedFields;
  // Per-locale wrapper: prefer the requested locale, fall back to whichever the CMS filled in first.
  const map = li as Record<string, LocalizedFields>;
  return map[lang] ?? Object.values(map)[0] ?? {};
};

const normalizeNode = (raw: RawNode, lang: Lang): MenuPageNode => {
  const info = pickLocalized(raw.localizeInfos, lang);
  return {
    id: raw.id,
    pageUrl: asString(raw.pageUrl),
    title: asString(info.title),
    menuTitle: asString(info.menuTitle) || asString(info.title),
    parentId: raw.parentId ?? null,
    position: raw.position ?? 0,
    children: (raw.children ?? []).map((c) => normalizeNode(c, lang)),
  };
};

export const loadMenu = cache(async (marker: string, langArg?: Lang): Promise<CmsMenu | null> => {
  const lang = langArg ?? (await currentCmsLocale());
  const api = getApiSafe();
  if (!api) return null;
  try {
    const result = await api.Menus.getMenusByMarker(marker, lang);
    if (isError(result)) return null;
    // `IMenusPages.id` is `number | null` (a custom item has none) while every node this module keeps carries one, so the hop through `unknown` stays.
    const raw = result as unknown as RawMenu | null;
    if (!raw || raw.statusCode) return null;
    const info = pickLocalized(raw.localizeInfos, lang);
    return {
      id: raw.id,
      identifier: raw.identifier,
      title: asString(info.title),
      pages: (raw.pages ?? []).map((p) => normalizeNode(p, lang)),
    };
  } catch {
    return null;
  }
});

import { cache } from 'react';
import { oneentry, isError } from '../index';
import type { Lang } from '../system-text';
import { DEFAULT_LOCALE } from '../locale';

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
type LocalizedFields = { title?: string; menuTitle?: string };

/** The SDK's `Menus.getMenusByMarker` docs promise a "normalized" payload:
 *  `localizeInfos` is unwrapped to a single locale, so it's `{ title, menuTitle }`
 *  directly. Other OE endpoints return the raw per-locale map
 *  (`{ en_US: {...}, ru_RU: {...} }`), so `RawLocalize` covers both shapes. */
type RawLocalize = LocalizedFields | Record<string, LocalizedFields>;

type RawNode = {
  id: number;
  pageUrl?: string;
  parentId?: number | null;
  position?: number;
  localizeInfos?: RawLocalize;
  children?: RawNode[];
};

type RawMenu = {
  id: number;
  identifier: string;
  localizeInfos?: RawLocalize;
  pages?: RawNode[];
  statusCode?: number;
};

const asString = (v: unknown): string => (typeof v === 'string' ? v : '');

/** Extract title/menuTitle regardless of whether OE returned the flat shape
 *  (SDK-normalized) or the raw per-locale map. Without this fallback
 *  `menuTitle`/`title` came out empty because the wrapper-only code path
 *  landed on the string value of `title` instead of a locale object. */
const pickLocalized = (li: RawLocalize | undefined, lang: Lang): LocalizedFields => {
  if (!li || typeof li !== 'object') return {};
  // Flat shape: SDK already unwrapped for us.
  if ('title' in li || 'menuTitle' in li) return li as LocalizedFields;
  // Per-locale wrapper: prefer the requested locale, fall back to whichever
  // the CMS filled in first.
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

export const loadMenu = cache(
  async (marker: string, lang: Lang = DEFAULT_LOCALE): Promise<CmsMenu | null> => {
    if (!oneentry) return null;
    try {
      const result = await oneentry.Menus.getMenusByMarker(marker, lang);
      if (isError(result)) return null;
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
  },
);

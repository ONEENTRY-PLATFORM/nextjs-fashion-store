import { cache } from 'react';
import { oneentry } from '../index';
import type { Lang } from '../system-text';

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

type RawNode = {
  id: number;
  pageUrl?: string;
  parentId?: number | null;
  position?: number;
  localizeInfos?: Record<string, { title?: string; menuTitle?: string }>;
  children?: RawNode[];
};

type RawMenu = {
  id: number;
  identifier: string;
  localizeInfos?: Record<string, { title?: string }>;
  pages?: RawNode[];
  statusCode?: number;
};

const asString = (v: unknown): string => (typeof v === 'string' ? v : '');

const normalizeNode = (raw: RawNode, lang: Lang): MenuPageNode => {
  const li = raw.localizeInfos ?? {};
  const info = li[lang] ?? Object.values(li)[0] ?? {};
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
  async (marker: string, lang: Lang = 'en_US'): Promise<CmsMenu | null> => {
    if (!oneentry) return null;
    try {
      const result = await oneentry.Menus.getMenusByMarker(marker, lang);
      const raw = result as unknown as RawMenu | null;
      if (!raw || raw.statusCode) return null;
      const li = raw.localizeInfos ?? {};
      const info = li[lang] ?? Object.values(li)[0] ?? {};
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

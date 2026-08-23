import { unstable_cache } from 'next/cache';
import { cache } from 'react';

import { REVALIDATE_STRUCTURE } from '@/lib/isr';
import { currentCmsLocale } from '@/lib/oneentry/current-locale';
import { getApiSafe, isError } from '@/lib/oneentry/index';
import type { Lang } from '@/lib/oneentry/system-text';

/** Catalog routes discovered from the OneEntry page tree. */

/** One category reachable from the storefront. */
export interface CmsCatalogRoute {
  /** Storefront path without a leading slash, e.g. `women/clothing`. */
  path: string;
  /** Key used for filters, blocks and product queries, e.g. `women-clothing`. */
  catalogKey: string;
  /** OE product-category path, e.g. `/women/women_clothing`. */
  categoryPath: string;
  /** Parent segment — `women` / `men` on this tenant, but not assumed to be. */
  gender: string;
  /** The category's own title in the requested locale. */
  title: string;
  /** The parent's title, used for the middle breadcrumb. */
  parentTitle: string;
}

/** Shape of the fields this module reads off an OE page node. */
type RawPage = {
  pageUrl?: string;
  type?: string;
  position?: number;
  localizeInfos?: { title?: string } | null;
  title?: string;
};

/** OE page type marking a catalog node. */
const CATALOG_PAGE_TYPE = 'catalog_page';

/** Roots that are catalog pages but not gender taxonomies. */
const NON_TAXONOMY_ROOTS = new Set(['sale', 'new']);

/** Both list shapes the SDK returns depending on the endpoint. */
function toItems(result: unknown): RawPage[] {
  if (Array.isArray(result)) return result as RawPage[];
  const items = (result as { items?: unknown } | null)?.items;
  return Array.isArray(items) ? (items as RawPage[]) : [];
}

/** Page title in the requested locale, falling back to the bare `title`. */
function pageTitle(page: RawPage): string {
  const localized = page.localizeInfos?.title;
  if (typeof localized === 'string' && localized.trim().length > 0) return localized.trim();
  return typeof page.title === 'string' ? page.title.trim() : '';
}

/** Storefront path for a child page. */
export function catalogRoutePath(parentUrl: string, childUrl: string): string {
  const prefix = `${parentUrl}_`;
  const leaf = childUrl.startsWith(prefix) ? childUrl.slice(prefix.length) : childUrl;
  return `${parentUrl}/${leaf}`;
}

/** Read every category the CMS publishes under its catalog roots. */
const loadCatalogRoutesCached = unstable_cache(
  async (lang: Lang): Promise<CmsCatalogRoute[]> => {
    const api = getApiSafe();
    if (!api) return [];
    try {
      const rootsResult = await api.Pages.getRootPages(lang);
      if (isError(rootsResult)) return [];
      const roots = toItems(rootsResult).filter(
        (p) =>
          p.type === CATALOG_PAGE_TYPE && typeof p.pageUrl === 'string' && !NON_TAXONOMY_ROOTS.has(p.pageUrl.trim()),
      );

      const perRoot = await Promise.all(
        roots.map(async (root) => {
          const parentUrl = (root.pageUrl ?? '').trim();
          if (!parentUrl) return [];
          const childrenResult = await api.Pages.getChildPagesByParentUrl(parentUrl, lang);
          if (isError(childrenResult)) return [];
          return toItems(childrenResult)
            .filter((child) => child.type === CATALOG_PAGE_TYPE && typeof child.pageUrl === 'string')
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
            .map((child): CmsCatalogRoute => {
              const childUrl = (child.pageUrl ?? '').trim();
              return {
                path: catalogRoutePath(parentUrl, childUrl),
                // Filter markers and block urls use the underscore form; the storefront's own key is the hyphenated one.
                catalogKey: childUrl.replace(/_/g, '-'),
                categoryPath: `/${parentUrl}/${childUrl}`,
                gender: parentUrl,
                title: pageTitle(child),
                parentTitle: pageTitle(root),
              };
            });
        }),
      );
      return perRoot.flat();
    } catch {
      // A catalog the CMS cannot answer for must not take the route down — the static registry still covers every category that shipped.
      return [];
    }
  },
  ['oe-catalog-routes'],
  { revalidate: REVALIDATE_STRUCTURE, tags: ['oe-pages'] },
);

/** Every CMS-published catalog route, for the current (or given) locale. */
export async function loadCatalogRoutes(langArg?: Lang): Promise<CmsCatalogRoute[]> {
  const lang = langArg ?? (await currentCmsLocale());
  return loadCatalogRoutesCached(lang);
}

/** Resolve a catch-all path against the CMS catalog tree. */
export const resolveCatalogRoute = cache(async (path: string, langArg?: Lang): Promise<CmsCatalogRoute | null> => {
  const trimmed = (path ?? '').replace(/^\/+|\/+$/g, '');
  if (!trimmed || trimmed.split('/').length !== 2) return null;
  const routes = await loadCatalogRoutes(langArg);
  return routes.find((r) => r.path === trimmed) ?? null;
});

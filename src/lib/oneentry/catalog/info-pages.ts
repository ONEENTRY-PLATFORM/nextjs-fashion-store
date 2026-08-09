import { unstable_cache } from 'next/cache';
import { cache } from 'react';

import { REVALIDATE_CATALOG } from '../../isr';
import { currentCmsLocale } from '../current-locale';
import { getApiSafe, isError } from '../index';
import type { Lang } from '../system-text';
import { loadPageByUrl } from './pages';

/** OE page tree node under the `info` parent. */
type RawPage = {
  id: number;
  pageUrl?: string;
  position?: number;
};

/**
 * Normalise a catch-all route path to an info-page slug candidate.
 *
 * Info pages answer on both `/{slug}` and `/info/{slug}`, and they are always
 * a single segment — a deeper path belongs to the catalog tree, never here.
 * Returns `null` when the path cannot be an info slug at all, so the caller
 * can skip the OE round-trip.
 */
export function infoSlugCandidate(path: string): string | null {
  const trimmed = (path ?? '').replace(/^\/+|\/+$/g, '');
  if (!trimmed) return null;
  // `info` (and `info/`) is the hub landing, already in the static registry —
  // never treat it as a slug to resolve against the CMS.
  if (trimmed === 'info') return null;
  const slug = trimmed.startsWith('info/') ? trimmed.slice('info/'.length) : trimmed;
  if (!slug || slug.includes('/')) return null;
  return slug;
}

/**
 * Resolve a path that is absent from `PAGE_REGISTRY` against OneEntry.
 *
 * The static registry lists the info slugs known at build time; a page an
 * editor creates in the admin panel afterwards has no entry and used to 404
 * until someone shipped code. Asking OE for the slug closes that gap: if the
 * CMS knows the page, the storefront renders it.
 *
 * Wrapped in `React.cache` so `generateMetadata` and the page component share
 * one lookup per request.
 */
export const resolveInfoPageSlug = cache(async (path: string, langArg?: Lang): Promise<string | null> => {
  const lang = langArg ?? (await currentCmsLocale());
  const slug = infoSlugCandidate(path);
  if (!slug) return null;
  const page = await loadPageByUrl(slug, lang);
  return page ? slug : null;
});

/**
 * Slugs of every info page OE holds under the `info` parent, for the sitemap.
 *
 * Returns an empty array when the tenant has no such parent — the caller then
 * falls back to the statically registered slugs alone.
 */
/**
 * `lang` is an explicit argument so it forms part of the `unstable_cache`
 *  key; root params are also unreadable inside a cached function.
 */
const loadInfoPageSlugsCached = unstable_cache(
  async (lang: Lang): Promise<string[]> => {
    const api = getApiSafe();
    if (!api) return [];
    try {
      const result = await api.Pages.getChildPagesByParentUrl('info', lang);
      if (isError(result)) return [];
      const items = (
        Array.isArray(result) ? result : ((result as { items?: RawPage[] } | null)?.items ?? [])
      ) as RawPage[];
      return items
        .slice()
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((p) => (typeof p.pageUrl === 'string' ? p.pageUrl.trim() : ''))
        .filter((s) => s.length > 0);
    } catch {
      return [];
    }
  },
  ['oe-info-page-slugs'],
  { revalidate: REVALIDATE_CATALOG, tags: ['oe-pages'] },
);

/**
 * Info-page slugs published under the `info` parent, for the route's locale.
 *
 * @param [langArg] - Explicit OE locale; defaults to the route's.
 * @returns Slugs in admin-panel order, possibly empty.
 */
export async function loadInfoPageSlugs(langArg?: Lang): Promise<string[]> {
  return loadInfoPageSlugsCached(langArg ?? (await currentCmsLocale()));
}

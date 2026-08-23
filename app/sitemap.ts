import type { MetadataRoute } from 'next';

import { PAGE_REGISTRY } from '@/app/data/pageRegistry';
import { SITE_URL } from '@/app/data/seoData';
import { loadCatalogRoutes } from '@/lib/oneentry/catalog/catalog-routes';
import { loadInfoPageSlugs } from '@/lib/oneentry/catalog/info-pages';
import { loadProducts } from '@/lib/oneentry/catalog/products';
import { buildLanguageAlternates, localizeHref, SHORT_LOCALES } from '@/lib/oneentry/locale';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Frozen at build time by `next.config.ts`, because OE publishes no per-entity edit date: the
  // honest signal this storefront can give is "changed when it was deployed". Reading the clock
  // here instead would stamp every regeneration of this file as a fresh catalog-wide change.
  const buildTime = process.env.BUILD_TIME ?? new Date().toISOString();

  // Fixed pages that are not in PAGE_REGISTRY
  const fixedPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: buildTime, changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/sale`, lastModified: buildTime, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/new`, lastModified: buildTime, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/stores`, lastModified: buildTime, changeFrequency: 'weekly', priority: 0.6 },
  ];

  // Dynamic pages from registry
  const registryPages: MetadataRoute.Sitemap = Object.entries(PAGE_REGISTRY)
    .filter(([, entry]) => entry.type !== 'info' || (entry as { slug: string }).slug !== '__hub')
    .map(([path, entry]) => ({
      url: `${SITE_URL}/${path}`,
      lastModified: buildTime,
      changeFrequency: entry.type === 'catalog' ? ('daily' as const) : ('monthly' as const),
      priority: entry.type === 'catalog' ? 0.9 : 0.4,
    }));

  // Info pages the editor added in OE after the last deploy.
  const registryPaths = new Set(Object.keys(PAGE_REGISTRY));
  const cmsInfoPages: MetadataRoute.Sitemap = (await loadInfoPageSlugs())
    .filter((slug) => !registryPaths.has(slug))
    .map((slug) => ({
      url: `${SITE_URL}/${slug}`,
      lastModified: buildTime,
      changeFrequency: 'monthly' as const,
      priority: 0.4,
    }));

  // Catalog categories the editor added in OE after the last deploy.
  const cmsCatalogPages: MetadataRoute.Sitemap = (await loadCatalogRoutes())
    .filter((route) => !registryPaths.has(route.path))
    .map((route) => ({
      url: `${SITE_URL}/${route.path}`,
      // A category page changes when its products do, which is weekly at most — `daily` here was
      // an invitation to re-crawl every catalog URL every day.
      lastModified: buildTime,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    }));

  // Product pages — pulled from OE.
  const oeCatalog = await loadProducts({ unique: true, limit: 5000 });
  const productPages: MetadataRoute.Sitemap = oeCatalog.items.map((p) => ({
    url: `${SITE_URL}/product/${p.id}`,
    lastModified: buildTime,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const defaultLocaleEntries = [...fixedPages, ...registryPages, ...cmsInfoPages, ...cmsCatalogPages, ...productPages];

  // One entry per routed locale, each carrying the full `alternates.languages` set.
  return defaultLocaleEntries.flatMap((entry) => {
    const bare = entry.url.startsWith(SITE_URL) ? entry.url.slice(SITE_URL.length) || '/' : entry.url;
    const languages = buildLanguageAlternates(SITE_URL, bare);
    return SHORT_LOCALES.map((short) => {
      const localized = localizeHref(bare, short);
      return {
        ...entry,
        url: `${SITE_URL}${localized === '/' ? '' : localized}`,
        alternates: { languages },
      };
    });
  });
}

import type { MetadataRoute } from 'next';
import { SITE_URL } from '../src/app/data/seoData';
import { PRODUCT_CATALOG } from '../src/app/data/productCatalog';
import { PAGE_REGISTRY } from '../src/app/data/pageRegistry';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString();

  // Fixed pages that are not in PAGE_REGISTRY
  const fixedPages: MetadataRoute.Sitemap = [
    { url: SITE_URL,                      lastModified: now, changeFrequency: 'daily',  priority: 1.0 },
    { url: `${SITE_URL}/sale`,            lastModified: now, changeFrequency: 'daily',  priority: 0.8 },
    { url: `${SITE_URL}/new`,             lastModified: now, changeFrequency: 'daily',  priority: 0.8 },
    { url: `${SITE_URL}/stores`,          lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
  ];

  // Dynamic pages from registry
  const registryPages: MetadataRoute.Sitemap = Object.entries(PAGE_REGISTRY)
    .filter(([, entry]) => entry.type !== 'info' || (entry as { slug: string }).slug !== '__hub')
    .map(([path, entry]) => ({
      url: `${SITE_URL}/${path}`,
      lastModified: now,
      changeFrequency: entry.type === 'catalog' ? ('daily' as const) : ('monthly' as const),
      priority: entry.type === 'catalog' ? 0.9 : 0.4,
    }));

  // Product pages
  const productPages: MetadataRoute.Sitemap = Object.keys(PRODUCT_CATALOG).map(id => ({
    url: `${SITE_URL}/product/${id}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...fixedPages, ...registryPages, ...productPages];
}

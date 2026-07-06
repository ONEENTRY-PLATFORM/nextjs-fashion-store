import type { MetadataRoute } from 'next';
import { SITE_URL } from '../src/app/data/seoData';
import { PAGE_REGISTRY } from '../src/app/data/pageRegistry';
import { loadProducts } from '../src/lib/oneentry/catalog/products';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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

  // Product pages — pulled from OE. Use the aggregated (`unique`) catalog so
  // colour/size sibling variants don't produce duplicate URLs. `limit` is set
  // high enough to cover the tenant's current SKU count.
  const oeCatalog = await loadProducts({ unique: true, limit: 5000 });
  const productPages: MetadataRoute.Sitemap = oeCatalog.items.map((p) => ({
    url: `${SITE_URL}/product/${p.id}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...fixedPages, ...registryPages, ...productPages];
}

import type { Metadata } from 'next';
import { SEO, SITE_URL, SCHEMA_BREADCRUMBS as BC } from '../../src/app/data/seoData';
import { NewArrivalsPage } from '../../src/app/pages/NewArrivalsPage';
import { JsonLd } from '../../src/app/components/JsonLd';
import { loadNewArrivalsPageSystemTexts } from '../../src/lib/oneentry/labels/new-arrivals-page-labels';
import { NewArrivalsPageLabelsProvider } from '../../src/lib/oneentry/labels/NewArrivalsPageLabelsContext';
import { loadProducts } from '../../src/lib/oneentry/catalog/products';
import { adaptCatalogProductToUiProduct, newArrivalCategoryFor } from '../../src/lib/oneentry/catalog/adapt';

export const metadata: Metadata = SEO.newArrivals;

export const dynamic = 'force-dynamic';

const breadcrumb = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: BC.home, item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: BC.newArrivals, item: `${SITE_URL}/new` },
  ],
};

export default async function Page() {
  const [labels, products] = await Promise.all([
    loadNewArrivalsPageSystemTexts(),
    loadProducts({ tags: ['New'], limit: 200 }),
  ]);
  const initialProducts = products.items.length > 0
    ? products.items.map((p) => ({ ...adaptCatalogProductToUiProduct(p), category: newArrivalCategoryFor(p) }))
    : undefined;
  return (
    <>
      <JsonLd data={breadcrumb} />
      <NewArrivalsPageLabelsProvider data={labels}>
        <NewArrivalsPage initialProducts={initialProducts} />
      </NewArrivalsPageLabelsProvider>
    </>
  );
}

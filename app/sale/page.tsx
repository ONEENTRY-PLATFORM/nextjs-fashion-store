import type { Metadata } from 'next';
import { SEO, SITE_URL, SCHEMA_BREADCRUMBS as BC } from '../../src/app/data/seoData';
import { SalePage } from '../../src/app/pages/SalePage';
import { JsonLd } from '../../src/app/components/JsonLd';
import { loadSalePageSystemTexts } from '../../src/lib/oneentry/labels/sale-page-labels';
import { SalePageLabelsProvider } from '../../src/lib/oneentry/labels/SalePageLabelsContext';
import { loadProducts } from '../../src/lib/oneentry/catalog/products';
import { adaptCatalogProductToUiProduct, saleCategoryFor } from '../../src/lib/oneentry/catalog/adapt';

export const metadata: Metadata = SEO.sale;

export const dynamic = 'force-dynamic';

const breadcrumb = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: BC.home, item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: BC.sale, item: `${SITE_URL}/sale` },
  ],
};

export default async function Page() {
  const [labels, products] = await Promise.all([
    loadSalePageSystemTexts(),
    loadProducts({ tags: ['Sale'], limit: 200 }),
  ]);
  const initialProducts = products.items.length > 0
    ? products.items.map((p) => ({ ...adaptCatalogProductToUiProduct(p), category: saleCategoryFor(p) }))
    : undefined;
  return (
    <>
      <JsonLd data={breadcrumb} />
      <SalePageLabelsProvider data={labels}>
        <SalePage initialProducts={initialProducts} />
      </SalePageLabelsProvider>
    </>
  );
}

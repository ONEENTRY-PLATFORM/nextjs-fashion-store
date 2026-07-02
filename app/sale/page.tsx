import type { Metadata } from 'next';
import { SEO, SITE_URL, SCHEMA_BREADCRUMBS as BC } from '../../src/app/data/seoData';
import { SalePage } from '../../src/app/pages/SalePage';
import { JsonLd } from '../../src/app/components/JsonLd';
import { loadSalePageSystemTexts } from '../../src/lib/oneentry/labels/sale-page-labels';
import { SalePageLabelsProvider } from '../../src/lib/oneentry/labels/SalePageLabelsContext';
import { loadProducts } from '../../src/lib/oneentry/catalog/products';
import { adaptCatalogProductToUiProduct, saleCategoryFor } from '../../src/lib/oneentry/catalog/adapt';

async function loadSaleTimerFromOE(): Promise<number | null> {
  const url = process.env.ONEENTRY_URL;
  const token = process.env.ONEENTRY_TOKEN;
  if (!url || !token) return null;
  const res = await fetch(`${url}/api/content/pages/url/sale?langCode=en_US`, {
    headers: { 'x-app-token': token, accept: 'application/json' },
    // Refresh every 60s so admin edits to the timer surface without a
    // manual redeploy.
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    attributeValues?: Record<string, Record<string, { value?: { fullDate?: string } }>>;
  };
  const attrs = data.attributeValues?.['en_US'] ?? {};
  const iso = attrs.page_sale_top_banner_timer?.value?.fullDate;
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

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

interface Props { searchParams: Promise<{ gender?: string }> }

export default async function Page({ searchParams }: Props) {
  const { gender } = await searchParams;
  const genderFilter: 'W' | 'M' | null =
    gender === 'men' ? 'M' : gender === 'women' ? 'W' : null;
  const [labels, products] = await Promise.all([
    loadSalePageSystemTexts(),
    loadProducts({ tags: ['Sale'], limit: 200 }),
  ]);
  // OE stores the countdown target on the `sale` page as attribute
  // `page_sale_top_banner_timer` (type `dateTime`, `value.fullDate` in ISO).
  // The typed SDK loader strips `attributeValues` for this page shape, so we
  // hit the REST endpoint directly to keep the raw attribute.
  const saleEndsAt = await loadSaleTimerFromOE().catch(() => null);
  // Prefer the OE `gender` attribute; fall back to the OE category path
  // (`/women/...` vs `/men/...`) when the merchant left the flag blank.
  const matchGender = (p: typeof products.items[number]) => {
    if (!genderFilter) return true;
    if (p.gender === 'U') return true;
    if (p.gender === genderFilter) return true;
    if (!p.gender) {
      const catToken = genderFilter === 'W' ? '/women/' : '/men/';
      return p.categories.some((c) => c.toLowerCase().includes(catToken));
    }
    return false;
  };
  const filteredItems = products.items.filter(matchGender);
  const initialProducts = filteredItems.length > 0
    ? filteredItems.map((p) => ({ ...adaptCatalogProductToUiProduct(p), category: saleCategoryFor(p) }))
    : undefined;
  return (
    <>
      <JsonLd data={breadcrumb} />
      <SalePageLabelsProvider data={labels}>
        <SalePage initialProducts={initialProducts} saleEndsAt={saleEndsAt ?? undefined} />
      </SalePageLabelsProvider>
    </>
  );
}

import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { SEO, SITE_URL, SCHEMA_BREADCRUMBS as BC } from '../../src/app/data/seoData';
import { SalePage } from '../../src/app/pages/SalePage';
import { JsonLd } from '../../src/app/components/JsonLd';
import { loadSalePageSystemTexts } from '../../src/lib/oneentry/labels/sale-page-labels';
import { SalePageLabelsProvider } from '../../src/lib/oneentry/labels/SalePageLabelsContext';
import { loadProducts } from '../../src/lib/oneentry/catalog/products';
import { adaptCatalogProductToUiProduct, saleCategoryFor } from '../../src/lib/oneentry/catalog/adapt';
import { getApi, isError, isOneEntryEnabled } from '../../src/lib/oneentry';

const loadSaleTimerFromOE = unstable_cache(
  async (): Promise<number | null> => {
    if (!isOneEntryEnabled) return null;
    const result = await getApi().Pages.getPageByUrl('sale', 'en_US');
    if (isError(result)) return null;
    // SDK types `attributeValues` loosely — narrow to the shape we need.
    const raw = result as unknown as {
      attributeValues?: Record<string, Record<string, { value?: { fullDate?: string } } | undefined>>
        | Record<string, { value?: { fullDate?: string } } | undefined>;
    };
    const av = raw.attributeValues ?? {};
    // Handle both wrapped (`{ en_US: {...} }`) and flat (`{ marker: {...} }`).
    const wrapped = (av as Record<string, Record<string, { value?: { fullDate?: string } } | undefined>>).en_US;
    const attrs: Record<string, { value?: { fullDate?: string } } | undefined> =
      wrapped && typeof wrapped === 'object'
        ? wrapped
        : (av as Record<string, { value?: { fullDate?: string } } | undefined>);
    const iso = attrs.page_sale_top_banner_timer?.value?.fullDate;
    if (!iso) return null;
    const t = Date.parse(iso);
    return Number.isFinite(t) ? t : null;
  },
  ['oe-sale-timer'],
  // Refresh every 60s so admin edits to the timer surface without a
  // manual redeploy.
  { revalidate: 60, tags: ['oe-page'] },
);

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
        <SalePage initialProducts={initialProducts} saleEndsAt={saleEndsAt ?? undefined} gender={genderFilter} />
      </SalePageLabelsProvider>
    </>
  );
}

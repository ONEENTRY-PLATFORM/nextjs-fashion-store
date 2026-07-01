import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import {
  PAGE_REGISTRY,
  buildPageMetadata,
  buildBreadcrumbSchema,
  type CatalogPageEntry,
} from '../../src/app/data/pageRegistry';
import { PRODUCT_CATALOG } from '../../src/app/data/productCatalog';
import { SITE_URL } from '../../src/app/data/seoData';
import { INFO_PAGE_META, INFO_SLUGS } from '../../src/app/data/infoPages';
import { INFO_PAGE_SCHEMA } from '../../src/app/data/infoPageLabels';
import { FAQ_ITEMS } from '../../src/app/data/faqData';
import { JsonLd } from '../../src/app/components/JsonLd';
import { loadProducts, loadFilteredProducts } from '../../src/lib/oneentry/catalog/products';
import { adaptCatalogProductToUiProduct, catalogKeyToCategoryPath } from '../../src/lib/oneentry/catalog/adapt';
import { parseCatalogSearchParams, type CatalogFilters } from '../../src/lib/oneentry/catalog/filters';
import type { Product } from '../../src/app/components/ProductCard';
import { loadClothingFilter, type ClothingFilterGroup } from '../../src/lib/oneentry/blocks/clothing-filter';
import { loadBlockWithProducts, type PageBlock } from '../../src/lib/oneentry/blocks/page-blocks';

/* ─── Catalog page components (dataset configs) ─── */
import { WomenCatalogPage }     from '../../src/app/pages/WomenCatalogPage';
import { WomenShoesPage }       from '../../src/app/pages/WomenShoesPage';
import { WomenBagsPage }        from '../../src/app/pages/WomenBagsPage';
import { WomenAccessoriesPage } from '../../src/app/pages/WomenAccessoriesPage';
import { MenCatalogPage }       from '../../src/app/pages/MenCatalogPage';
import { MenShoesPage }         from '../../src/app/pages/MenShoesPage';
import { MenBagsPage }          from '../../src/app/pages/MenBagsPage';
import { MenAccessoriesPage }   from '../../src/app/pages/MenAccessoriesPage';
import { InfoPage }             from '../../src/app/pages/InfoPage';

/* ─── Map catalogKey → component ─── */
type CatalogProps = {
  initialProducts?: Product[];
  initialFilterGroups?: ClothingFilterGroup[];
  initialTotalStyles?: number;
  currentFilters?: CatalogFilters;
  currentPage?: number;
  total?: number;
  trendingBlock?: PageBlock | null;
};
const CATALOG_COMPONENTS: Record<string, React.ComponentType<CatalogProps>> = {
  'women-clothing':     WomenCatalogPage,
  'women-shoes':        WomenShoesPage,
  'women-bags':         WomenBagsPage,
  'women-accessories':  WomenAccessoriesPage,
  'men-clothing':       MenCatalogPage,
  'men-shoes':          MenShoesPage,
  'men-bags':           MenBagsPage,
  'men-accessories':    MenAccessoriesPage,
};

/* ─── Types ─── */
type Props = {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Server-side product page size. Matches the client default in
 *  `CatalogTemplate`. Per-catalog overrides can be added here later. */
const PRODUCTS_PER_PAGE = 16;

/* ─── generateStaticParams ─── */
// Pre-renders all known pages at build time.
// When API is ready: replace PAGE_REGISTRY keys with data from OneEntry.
export function generateStaticParams() {
  return Object.keys(PAGE_REGISTRY).map(path => ({
    slug: path.split('/'),
  }));
}

// Catalog pages use URL `searchParams` (filters/sort/page) + OE-fetchers with
// `cache: 'no-store'` — both require runtime rendering. Static prerender of
// the routes from `generateStaticParams` would crash with
// FUNCTION_INVOCATION_FAILED on the first OE block call.
export const dynamic = 'force-dynamic';

/* ─── generateMetadata ─── */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const path = slug.join('/');
  const entry = PAGE_REGISTRY[path];
  if (!entry) return {};
  return buildPageMetadata(entry);
}

/* ─── JSON-LD helpers ─── */
function buildCatalogSchemas(entry: CatalogPageEntry) {
  const products = Object.values(PRODUCT_CATALOG)
    .filter(p => p.id.startsWith(entry.productIdPrefix) && p.inStock !== false)
    .slice(0, 10);

  const breadcrumb = buildBreadcrumbSchema(entry.breadcrumbs);

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: entry.schemaName,
    url: `${SITE_URL}/${Object.keys(PAGE_REGISTRY).find(k => (PAGE_REGISTRY[k] as CatalogPageEntry).catalogKey === entry.catalogKey) ?? ''}`,
    numberOfItems: products.length,
    itemListElement: products.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/product/${p.id}`,
      name: p.name,
      image: p.image,
    })),
  };

  return { breadcrumb, itemList };
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map(item => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: { '@type': 'Answer', text: item.answer },
  })),
};

/* ─── Page component ─── */
export default async function Page({ params, searchParams }: Props) {
  const { slug } = await params;
  const path = slug.join('/');
  const entry = PAGE_REGISTRY[path];

  if (!entry) notFound();

  /* ── Catalog page ── */
  if (entry.type === 'catalog') {
    const CatalogComponent = CATALOG_COMPONENTS[entry.catalogKey];
    if (!CatalogComponent) notFound();
    const { breadcrumb, itemList } = buildCatalogSchemas(entry);

    // Parse the URL filters once on the server so we can issue a filtered OE
    // request and seed the client with the resolved state.
    const sp = await searchParams;
    const filters: CatalogFilters = parseCatalogSearchParams(sp);
    const currentPage = filters.page ?? 1;

    const categoryPath = catalogKeyToCategoryPath(entry.catalogKey) ?? undefined;

    // Visible slice: paged + filtered + sorted by OE. `loadFilteredProducts`
    // picks the cached-catalog fast path when no attribute filters are set.
    const filtered = await loadFilteredProducts({
      categoryPath,
      filters,
      page: currentPage,
      limit: PRODUCTS_PER_PAGE,
    });
    const initialProducts: Product[] | undefined =
      filtered.items.length > 0
        ? filtered.items.map(adaptCatalogProductToUiProduct)
        : undefined;
    const total = filtered.total;

    // Counts for filter options come from the full (unfiltered) category, so
    // empty options still show `(N)` and aren't hidden when active filters
    // narrow the visible grid.
    let countingProducts: Product[] = initialProducts ?? [];
    if (categoryPath) {
      const all = await loadProducts({ categoryPath, limit: 1000 });
      if (all.items.length > 0) {
        countingProducts = all.items.map(adaptCatalogProductToUiProduct);
      }
    }

    // The OE-managed `clothing` filter drives every catalog page now — its
    // shape (Style / Fit / Details / Brand / Color / Size / Material / Lining
    // / Care / Season / Country / Label / Price) is generic enough for every
    // category, and `adaptFilterToGroups` re-counts each option against the
    // products on the page so irrelevant rows stay empty.
    let initialFilterGroups: ClothingFilterGroup[] | undefined;
    const groups = await loadClothingFilter(countingProducts);
    if (groups && groups.length > 0) initialFilterGroups = groups;

    // OE-managed trending block shown under the product grid. One marker per
    // tenant for now — when admin wires per-catalog blocks we can route by
    // `entry.catalogKey`. The block is gender-scoped to the current catalog
    // (e.g. `women-*` keys never surface men's items even if the OE block
    // returns a mixed list). When OE returns no products at all, we fall back
    // to a slice of the unfiltered category so the carousel still has stock.
    const catalogGender: 'W' | 'M' | '' =
      entry.catalogKey.startsWith('women-') ? 'W'
      : entry.catalogKey.startsWith('men-') ? 'M'
      : '';
    let trendingBlock = await loadBlockWithProducts('catalog_trend_blocks', { categoryPath });
    if (trendingBlock && catalogGender) {
      const filteredByGender = trendingBlock.products.filter(p =>
        !p.gender || p.gender === catalogGender || p.gender === 'U',
      );
      trendingBlock = { ...trendingBlock, products: filteredByGender };
    }
    if ((!trendingBlock || trendingBlock.products.length === 0) && countingProducts.length > 0) {
      const fallbackProducts = countingProducts
        .filter(p => !catalogGender || !p.gender || p.gender === catalogGender || p.gender === 'U')
        .slice(0, 12);
      trendingBlock = {
        marker: 'catalog_trend_blocks',
        type: trendingBlock?.type ?? 'trending_block',
        title: trendingBlock?.title ?? "We Think You'll Love",
        position: trendingBlock?.position ?? 0,
        products: fallbackProducts,
      };
    }
    return (
      <>
        <JsonLd data={breadcrumb} />
        <JsonLd data={itemList} />
        <CatalogComponent
          initialProducts={initialProducts}
          initialFilterGroups={initialFilterGroups}
          initialTotalStyles={total || initialProducts?.length}
          currentFilters={filters}
          currentPage={currentPage}
          total={total}
          trendingBlock={trendingBlock}
        />
      </>
    );
  }

  /* ── Info page ── */
  if (entry.type === 'info') {
    const isHub = entry.slug === '__hub';
    const pageTitle = isHub ? INFO_PAGE_SCHEMA.hubTitle : (INFO_PAGE_META[entry.slug]?.title ?? entry.slug);
    const canonicalPath = isHub ? '/info' : `/${entry.slug}`;

    const breadcrumbSchema = buildBreadcrumbSchema(
      isHub
        ? [{ name: INFO_PAGE_SCHEMA.breadcrumbHome, href: '/' }, { name: INFO_PAGE_SCHEMA.breadcrumbInfo }]
        : [{ name: INFO_PAGE_SCHEMA.breadcrumbHome, href: '/' }, { name: pageTitle }]
    );

    return (
      <>
        <JsonLd data={breadcrumbSchema} />
        {entry.slug === 'faq' && <JsonLd data={faqSchema} />}
        <InfoPage />
      </>
    );
  }

  notFound();
}

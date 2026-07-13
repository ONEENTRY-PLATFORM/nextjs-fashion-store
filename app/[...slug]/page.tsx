import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import {
  PAGE_REGISTRY,
  buildPageMetadata,
  buildBreadcrumbSchema,
  type CatalogPageEntry,
} from '../../src/app/data/pageRegistry';
import { SITE_URL } from '../../src/app/data/seoData';
import { INFO_PAGE_META, INFO_SLUGS } from '../../src/app/data/infoPages';
import { INFO_PAGE_SCHEMA } from '../../src/app/data/infoPageLabels';
import { FAQ_ITEMS } from '../../src/app/data/faqData';
import { JsonLd } from '../../src/app/components/JsonLd';
import { loadProducts, loadFilteredProducts } from '../../src/lib/oneentry/catalog/products';
import { adaptCatalogProductToUiProduct, catalogKeyToCategoryPath } from '../../src/lib/oneentry/catalog/adapt';
import { parseCatalogSearchParams, type CatalogFilters } from '../../src/lib/oneentry/catalog/filters';
import { resolveSeasonalTrend, applySeasonalTrend } from '../../src/lib/oneentry/catalog/seasonal-trend';
import type { Product } from '../../src/app/components/ProductCard';
import { loadCatalogFilter, type ClothingFilterGroup } from '../../src/lib/oneentry/blocks/clothing-filter';
import { loadFilterChips, chipToFilterPatch } from '../../src/lib/oneentry/blocks/filter-chips';
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
  initialQuickChips?: string[];
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

// ISR + dynamic auto: catalog pages hit by a clean URL (`/women/shoes`
// with no query params) are served from cache for 60 s, then refreshed
// in the background. URLs carrying filters / sort / pagination fall
// through to per-request SSR because `searchParams` mark the render
// dynamic. Loader-level TTLs (`loadProducts` / `loadFilteredProducts`)
// are separately env-tunable via `ISR_CATALOG_TTL_SEC` in `src/lib/isr.ts`.
//
// This value MUST be a literal — Next.js statically analyses route
// segment config at build time and rejects imported / re-exported /
// computed values with "Invalid segment configuration export detected".
export const revalidate = 60;

/* ─── generateMetadata ─── */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const path = slug.join('/');
  const entry = PAGE_REGISTRY[path];
  if (!entry) return {};
  return buildPageMetadata(entry);
}

/* ─── JSON-LD helpers ─── */
async function buildCatalogSchemas(entry: CatalogPageEntry) {
  // Seed the schema.org ItemList with the first 10 in-stock products of this
  // catalog — pulled from OE by category path (no id-prefix heuristic).
  const categoryPath = catalogKeyToCategoryPath(entry.catalogKey);
  const productsResult = categoryPath
    ? await loadProducts({ categoryPath, limit: 10 })
    : { items: [] as Awaited<ReturnType<typeof loadProducts>>['items'] };
  const products = productsResult.items
    .filter((p) => p.statusIdentifier !== 'out_of_stock')
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
      name: p.title,
      image: p.preview,
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
  // OE hosting and mega-menu deep-links use a `/category/<slug>` suffix on
  // top of the base catalog path (e.g. `/women/clothing/category/outerwear`).
  // Redirect these to the canonical `?chip=<Prettified>` form so the client's
  // chip / breadcrumb / share-link machinery — which is query-driven — lights
  // up correctly. Preserves any other query params on the incoming URL.
  const entryFromExact = PAGE_REGISTRY[path];
  if (!entryFromExact) {
    const catIdx = slug.lastIndexOf('category');
    if (catIdx >= 0 && catIdx < slug.length - 1) {
      const basePath = slug.slice(0, catIdx).join('/');
      const baseEntry = PAGE_REGISTRY[basePath];
      if (baseEntry) {
        const chipLabel = (slug[catIdx + 1] ?? '')
          .split(/[-_]/)
          .filter(Boolean)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        const sp = await searchParams;
        const nextParams = new URLSearchParams();
        for (const [k, v] of Object.entries(sp)) {
          if (v == null) continue;
          if (Array.isArray(v)) {
            for (const item of v) if (typeof item === 'string') nextParams.append(k, item);
          } else if (typeof v === 'string') {
            nextParams.set(k, v);
          }
        }
        if (chipLabel && !nextParams.has('chip')) nextParams.set('chip', chipLabel);
        const qs = nextParams.toString();
        redirect(`/${basePath}${qs ? `?${qs}` : ''}`);
      }
    }
  }
  const entry = entryFromExact;

  if (!entry) notFound();

  /* ── Catalog page ── */
  if (entry.type === 'catalog') {
    const CatalogComponent = CATALOG_COMPONENTS[entry.catalogKey];
    if (!CatalogComponent) notFound();
    const { breadcrumb, itemList } = await buildCatalogSchemas(entry);

    // Parse the URL filters once on the server so we can issue a filtered OE
    // request and seed the client with the resolved state.
    const sp = await searchParams;
    let filters: CatalogFilters = parseCatalogSearchParams(sp);
    // SEASONAL TRENDS redirect: when the mega-menu clicked a leaf whose OE page
    // carries `st_type-of-trends` + `st_trends`, swap the raw `?category=`
    // filter for the real intent — either match a different category or an
    // attribute value (Material/Style/Brand/…). Pages without those attributes
    // fall through unchanged.
    if (filters.category) {
      const trend = await resolveSeasonalTrend(filters.category);
      if (trend) filters = applySeasonalTrend(filters, trend);
    }

    // Load OE quick-filter chip descriptors up-front — we need them both to
    // seed the client UI (rendered as labels only) and to translate a
    // `?chip=<label>` URL param into the real filter effect below.
    const chips = await loadFilterChips(entry.catalogKey);
    const initialQuickChips = chips && chips.length > 0
      ? chips.map((c) => c.label)
      : undefined;

    // Chip clicks land as `?chip=<label>`. Look up the descriptor and merge
    // its effect into `filters`:
    //   - `type: 'page'`      → `filters.category = <url>` (chip wins over
    //     any earlier category so a fresh chip click always narrows to that
    //     category page).
    //   - `type: 'attribute'` → append `value` into the list field matching
    //     the attribute marker (`material_14` → `filters.materials`).
    // `loadFilteredProducts` runs the resulting filter set through the
    // shared `matchesCatalogFilters` predicate.
    if (filters.chip) {
      const patch = chipToFilterPatch(filters.chip, chips);
      if (patch) {
        if (patch.category) filters = { ...filters, category: patch.category };
        if (patch.attributeField && patch.attributeValue) {
          const field = patch.attributeField as keyof CatalogFilters;
          const existing = (filters[field] as string[] | undefined) ?? [];
          if (!existing.some((v) => v.toLowerCase() === patch.attributeValue!.toLowerCase())) {
            filters = {
              ...filters,
              [field]: [...existing, patch.attributeValue],
            } as CatalogFilters;
          }
        }
      }
    }

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
    // Direct URL navigation to `?page=N` beyond the last valid page (e.g.
    // shared/bookmarked link, guess-and-type, changed catalog size) lands the
    // shopper on a `NoFilterResults` placeholder even though results DO exist —
    // just on other pages. Clamp to the last valid page and redirect, keeping
    // any other query params (color / size / sort / …) intact.
    if (currentPage > 1 && filtered.items.length === 0 && filtered.total > 0) {
      const totalPages = Math.max(1, Math.ceil(filtered.total / PRODUCTS_PER_PAGE));
      const targetPage = Math.min(currentPage, totalPages);
      if (targetPage !== currentPage) {
        const nextParams = new URLSearchParams();
        for (const [k, v] of Object.entries(sp)) {
          if (v == null || k === 'page') continue;
          if (Array.isArray(v)) {
            for (const item of v) if (typeof item === 'string') nextParams.append(k, item);
          } else if (typeof v === 'string') {
            nextParams.set(k, v);
          }
        }
        if (targetPage > 1) nextParams.set('page', String(targetPage));
        const qs = nextParams.toString();
        redirect(`/${path}${qs ? `?${qs}` : ''}`);
      }
    }
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
    // Filter marker in OE mirrors `catalogKey` with hyphens swapped for
    // underscores (`women-clothing` → `women_clothing`, `men-shoes` →
    // `men_shoes`). That's how the OE tenant currently ships the six
    // filter definitions — one per gender × category. Section-less catalogs
    // fall through to a `null` result and hide the row entirely.
    let initialFilterGroups: ClothingFilterGroup[] | undefined;
    const filterMarker = entry.catalogKey.replace(/-/g, '_');
    const groups = await loadCatalogFilter(countingProducts, filterMarker);
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
          initialQuickChips={initialQuickChips}
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

import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { CATALOG_PAGE_LABELS } from '@/app/components/catalog/copy';
import type { Product } from '@/app/components/product/ProductCard';
import { JsonLd } from '@/app/components/system/JsonLd';
import { INFO_PAGE_META } from '@/app/data/infoPages';
import {
  buildBreadcrumbSchema,
  buildPageMetadata,
  type CatalogPageEntry,
  PAGE_REGISTRY,
  type PageEntry,
} from '@/app/data/pageRegistry';
import { SITE_URL } from '@/app/data/seoData';
import { CmsCatalogPage } from '@/app/pages/CmsCatalogPage';
import { InfoPage } from '@/app/pages/InfoPage';
import { MenAccessoriesPage } from '@/app/pages/MenAccessoriesPage';
import { MenBagsPage } from '@/app/pages/MenBagsPage';
import { MenCatalogPage } from '@/app/pages/MenCatalogPage';
import { MenShoesPage } from '@/app/pages/MenShoesPage';
import { WomenAccessoriesPage } from '@/app/pages/WomenAccessoriesPage';
import { WomenBagsPage } from '@/app/pages/WomenBagsPage';
/* ─── Catalog page components (dataset configs) ─── */
import { WomenCatalogPage } from '@/app/pages/WomenCatalogPage';
import { WomenShoesPage } from '@/app/pages/WomenShoesPage';
import { type ClothingFilterGroup, loadCatalogFilter } from '@/lib/oneentry/blocks/clothing-filter';
import { chipToFilterPatch, loadFilterChips } from '@/lib/oneentry/blocks/filter-chips';
import { buildFaqSchema, faqItemsFromBlocks } from '@/lib/oneentry/blocks/info-sections';
import { loadBlockWithProducts, loadPageBlocksByUrl, type PageBlock } from '@/lib/oneentry/blocks/page-blocks';
import { adaptCatalogProductToUiProduct, catalogKeyToCategoryPath } from '@/lib/oneentry/catalog/adapt';
import { type CmsCatalogRoute, resolveCatalogRoute } from '@/lib/oneentry/catalog/catalog-routes';
import { type CatalogFilters, parseCatalogSearchParams } from '@/lib/oneentry/catalog/filters';
import { resolveInfoPageSlug } from '@/lib/oneentry/catalog/info-pages';
import { withCmsSeo } from '@/lib/oneentry/catalog/page-seo';
import { loadPageByUrl } from '@/lib/oneentry/catalog/pages';
import { loadFilteredProducts, loadProducts } from '@/lib/oneentry/catalog/products';
import { applySeasonalTrend, resolveSeasonalTrend } from '@/lib/oneentry/catalog/seasonal-trend';
import { getDictionary, getSiteSettings, translate } from '@/lib/oneentry/dictionary';

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
  pageBlocks?: PageBlock[];
};
const CATALOG_COMPONENTS: Record<string, React.ComponentType<CatalogProps>> = {
  'women-clothing': WomenCatalogPage,
  'women-shoes': WomenShoesPage,
  'women-bags': WomenBagsPage,
  'women-accessories': WomenAccessoriesPage,
  'men-clothing': MenCatalogPage,
  'men-shoes': MenShoesPage,
  'men-bags': MenBagsPage,
  'men-accessories': MenAccessoriesPage,
};

/**
 * Adapt a CMS-discovered category to the shape the registry-driven branch of
 * this route already understands, so both kinds of catalog page take exactly
 * the same code path.
 *
 * No `seoKey`: the category has no shipped copy, and its metadata comes from
 * the OE page's own `meta_*` attributes instead.
 *
 * @param   route - Category discovered in the OE page tree.
 * @returns         A catalog entry with the CMS titles as breadcrumbs.
 */
function catalogEntryFromCmsRoute(route: CmsCatalogRoute): CatalogPageEntry {
  return {
    type: 'catalog',
    catalogKey: route.catalogKey,
    categoryPath: route.categoryPath,
    schemaName: route.title,
    breadcrumbs: [
      { name: 'Home', href: '/' },
      { name: route.parentTitle, href: `/${route.gender}` },
      { name: route.title },
    ],
  };
}

/* ─── Types ─── */
type Props = {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Server-side product page size. Matches the client default in
 *  `CatalogTemplate`. Per-catalog overrides can be added here later.
 */
const PRODUCTS_PER_PAGE = 16;

// NOTE: this route is `ƒ Dynamic` in the build output, not ISR — the segment
// config below currently buys nothing. `Page` awaits `searchParams`
// unconditionally on the catalog branch (it needs the filters to issue the
// filtered OE query server-side), and reading `searchParams` opts the whole
// segment out of static generation, clean URL or not. The export is kept
// because it becomes live the moment the filter read is deferred behind its
// own Suspense boundary, which is the real fix — until then, do not read this
// line as "clean catalog URLs are cached for 60 s". They are not.
//
// What actually caches today is one level down: the loaders wrap their OE
// calls in `unstable_cache`, so repeat requests reuse OE responses for
// `ISR_CATALOG_TTL_SEC` (default 60 s, see `src/lib/isr.ts`) even though the
// HTML is rebuilt per request.
//
// This value MUST be a literal — Next.js statically analyses route
// segment config at build time and rejects imported / re-exported /
// computed values with "Invalid segment configuration export detected".
export const revalidate = 60;

/* ─── generateMetadata ─── */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const path = slug.join('/');
  // A path missing from the static registry may still be an info page the
  // editor created in OE after the last deploy — ask the CMS before giving up.
  const dynamicSlug = PAGE_REGISTRY[path] ? null : await resolveInfoPageSlug(path);
  // Still nothing? It may be a catalog category an editor added in OE after
  // the last deploy — the same courtesy info pages have had for a while.
  const cmsCatalog = PAGE_REGISTRY[path] || dynamicSlug ? null : await resolveCatalogRoute(path);
  const entry =
    PAGE_REGISTRY[path] ??
    (dynamicSlug ? { type: 'info' as const, slug: dynamicSlug } : undefined) ??
    (cmsCatalog ? catalogEntryFromCmsRoute(cmsCatalog) : undefined);
  if (!entry) return {};

  // Info pages carry their SEO on the OE page itself (`meta_title`,
  // `meta_description`, `meta_keywords`, `canonical`), so an editor can tune it
  // without a deploy. `buildPageMetadata` stays as the offline fallback and
  // still owns the catalog pages and the `/info` hub.
  if (entry.type === 'info' && entry.slug !== '__hub') {
    const page = await loadPageByUrl(entry.slug);
    const attr = (marker: string): string => {
      const v = (page?.attributeValues as Record<string, { value?: unknown }> | undefined)?.[marker]?.value;
      return typeof v === 'string' ? v.trim() : '';
    };
    const title = attr('meta_title');
    const description = attr('meta_description');
    const keywords = attr('meta_keywords');
    const canonical = attr('canonical');
    if (title || description || keywords || canonical) {
      const fallback = buildPageMetadata(entry);
      return {
        ...fallback,
        ...(title ? { title } : {}),
        ...(description ? { description } : {}),
        ...(keywords ? { keywords } : {}),
        ...(canonical ? { alternates: { canonical } } : {}),
      };
    }
    // CMS-only page with no `meta_*` attributes: `INFO_PAGE_META` has no entry
    // for it either, so fall back to the page's own title.
    if (page?.title && !INFO_PAGE_META[entry.slug]) {
      return {
        title: `${page.title} | ${(await getSiteSettings()).brand.siteName}`,
        alternates: { canonical: `${SITE_URL}/${entry.slug}` },
      };
    }
  }

  // Catalog pages have an OE page of their own — the same one the block loader
  // reads, under the `catalogKey` with hyphens swapped for underscores. Overlay
  // whatever `meta_*` the editor filled there; `buildPageMetadata` (i.e.
  // `seoData.ts`) stays the fallback for every field left blank.
  if (entry.type === 'catalog') {
    return withCmsSeo(entry.catalogKey.replace(/-/g, '_'), buildPageMetadata(entry));
  }

  return buildPageMetadata(entry);
}

/* ─── JSON-LD helpers ─── */
/**
 * Breadcrumb + ItemList JSON-LD for a catalog page.
 *
 * @param   entry - Registry entry, or one adapted from a CMS category.
 * @param   path  - The route's own path, used as the list's canonical url.
 * @returns         Both schema nodes.
 */
async function buildCatalogSchemas(entry: CatalogPageEntry, path: string) {
  // Seed the schema.org ItemList with the first 10 in-stock products of this
  // catalog — pulled from OE by category path (no id-prefix heuristic).
  const categoryPath = entry.categoryPath ?? catalogKeyToCategoryPath(entry.catalogKey);
  const productsResult = categoryPath
    ? await loadProducts({ categoryPath, limit: 10 })
    : { items: [] as Awaited<ReturnType<typeof loadProducts>>['items'] };
  const products = productsResult.items.filter((p) => p.statusIdentifier !== 'out_of_stock').slice(0, 10);

  const breadcrumb = buildBreadcrumbSchema(entry.breadcrumbs);

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: entry.schemaName,
    url: `${SITE_URL}/${path}`,
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
  // Same CMS-first resolution as `generateMetadata`: an info page created in
  // OE after the last deploy is absent from the static registry but must still
  // render. `React.cache` makes this the same lookup the metadata pass did.
  const dynamicSlug = entryFromExact ? null : await resolveInfoPageSlug(path);
  const cmsCatalog = entryFromExact || dynamicSlug ? null : await resolveCatalogRoute(path);
  const entry: PageEntry | undefined =
    entryFromExact ??
    (dynamicSlug ? { type: 'info', slug: dynamicSlug } : undefined) ??
    (cmsCatalog ? catalogEntryFromCmsRoute(cmsCatalog) : undefined);

  if (!entry) notFound();

  /* ── Catalog page ── */
  if (entry.type === 'catalog') {
    // A registry category renders its bespoke wrapper; one discovered in the
    // CMS renders the generic template built from the page's own titles.
    const CatalogComponent = CATALOG_COMPONENTS[entry.catalogKey];
    if (!CatalogComponent && !cmsCatalog) notFound();
    const { breadcrumb, itemList } = await buildCatalogSchemas(entry, path);

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
    const initialQuickChips = chips && chips.length > 0 ? chips.map((c) => c.label) : undefined;

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
          if (!existing.some((v) => v.toLowerCase() === patch.attributeValue?.toLowerCase())) {
            filters = {
              ...filters,
              [field]: [...existing, patch.attributeValue],
            } as CatalogFilters;
          }
        }
      }
    }

    const currentPage = filters.page ?? 1;

    const categoryPath = entry.categoryPath ?? catalogKeyToCategoryPath(entry.catalogKey) ?? undefined;

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
      filtered.items.length > 0 ? filtered.items.map(adaptCatalogProductToUiProduct) : undefined;
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
    const catalogGender: 'W' | 'M' | '' = entry.catalogKey.startsWith('women-')
      ? 'W'
      : entry.catalogKey.startsWith('men-')
        ? 'M'
        : '';
    // Heading for the trending carousel: OE block title → CMS dictionary →
    // local constant. Read here because the block below may be synthesised
    // from the catalog's own products.
    const trendingFallbackTitle = translate(
      await getDictionary(),
      'catalog_page_trending_title',
      CATALOG_PAGE_LABELS.trendingFallbackTitle,
    );
    let trendingBlock = await loadBlockWithProducts('catalog_trend_blocks', { categoryPath });
    if (trendingBlock && catalogGender) {
      const filteredByGender = trendingBlock.products.filter(
        (p) => !p.gender || p.gender === catalogGender || p.gender === 'U',
      );
      trendingBlock = { ...trendingBlock, products: filteredByGender };
    }
    if ((!trendingBlock || trendingBlock.products.length === 0) && countingProducts.length > 0) {
      const fallbackProducts = countingProducts
        .filter((p) => !catalogGender || !p.gender || p.gender === catalogGender || p.gender === 'U')
        .slice(0, 12);
      trendingBlock = {
        marker: 'catalog_trend_blocks',
        type: trendingBlock?.type ?? 'trending_block',
        title: trendingBlock?.title ?? trendingFallbackTitle,
        position: trendingBlock?.position ?? 0,
        products: fallbackProducts,
      };
    }

    // OE-attached page blocks for this catalog. The tenant's pageUrl mirrors
    // `catalogKey` with hyphens swapped for underscores (`women-clothing` →
    // `women_clothing`) — same convention already used for filter markers.
    // Empty when admin hasn't attached any blocks to the catalog page in OE.
    // Filter out `catalog_trend_blocks` because it is already loaded and
    // rendered separately via `trendingBlock` above (with a gender-scoped
    // fallback the generic loader doesn't do). Rendering it in both places
    // would double the "We Think You'll Love" carousel.
    const pageBlocksUrl = entry.catalogKey.replace(/-/g, '_');
    const pageBlocks = (await loadPageBlocksByUrl(pageBlocksUrl)).filter((b) => b.marker !== 'catalog_trend_blocks');

    return (
      <>
        <JsonLd data={breadcrumb} />
        <JsonLd data={itemList} />
        {CatalogComponent ? (
          <CatalogComponent
            initialProducts={initialProducts}
            initialFilterGroups={initialFilterGroups}
            initialQuickChips={initialQuickChips}
            initialTotalStyles={total || initialProducts?.length}
            currentFilters={filters}
            currentPage={currentPage}
            total={total}
            trendingBlock={trendingBlock}
            pageBlocks={pageBlocks}
          />
        ) : (
          <CmsCatalogPage
            catalogKey={entry.catalogKey}
            gender={cmsCatalog?.gender ?? ''}
            title={cmsCatalog?.title ?? entry.schemaName}
            parentTitle={cmsCatalog?.parentTitle ?? ''}
            initialProducts={initialProducts}
            initialFilterGroups={initialFilterGroups}
            initialQuickChips={initialQuickChips}
            initialTotalStyles={total || initialProducts?.length}
            currentFilters={filters}
            currentPage={currentPage}
            total={total}
            trendingBlock={trendingBlock}
            pageBlocks={pageBlocks}
          />
        )}
      </>
    );
  }

  /* ── Info page ── */
  if (entry.type === 'info') {
    const isHub = entry.slug === '__hub';

    // Page chrome + breadcrumb labels come from the CMS dictionary; the local
    // constants remain the offline fallback.
    const [dict, infoPageBlocks, cmsPage] = await Promise.all([
      getDictionary(),
      // `entry.slug` matches the OE pageUrl marker (e.g. 'about-us', 'faq').
      // The hub landing has no OE page — skip loading and pass empty.
      isHub ? Promise.resolve([] as PageBlock[]) : loadPageBlocksByUrl(entry.slug),
      // Cached per request alongside the metadata pass; supplies the crumb
      // label for pages that exist only in the CMS.
      isHub ? Promise.resolve(null) : loadPageByUrl(entry.slug),
    ]);
    const label = (key: string, fallback: string) => translate(dict, key, fallback);

    const pageTitle = isHub
      ? label('info_hub_title', 'Content Hub')
      // CMS first: `INFO_PAGE_META` is the offline fallback, so letting it win
      // meant a title an editor changed in OneEntry never reached the page.
      : (cmsPage?.title ?? INFO_PAGE_META[entry.slug]?.title ?? entry.slug);
    const crumbHome = label('info_breadcrumb_home', 'Home');

    const breadcrumbSchema = buildBreadcrumbSchema(
      isHub
        ? [{ name: crumbHome, href: '/' }, { name: label('info_breadcrumb_info', 'Info') }]
        : [{ name: crumbHome, href: '/' }, { name: pageTitle }],
    );

    // FAQ structured data is derived from the very blocks `<InfoPage>` renders
    // below, so the markup can never describe copy the visitor cannot see —
    // Google treats that mismatch as a structured-data violation. No
    // question-shaped section in OE means no `FAQPage` node at all.
    const faqItems = entry.slug === 'faq' ? faqItemsFromBlocks(infoPageBlocks) : [];

    return (
      <>
        <JsonLd data={breadcrumbSchema} />
        {faqItems.length > 0 && <JsonLd data={buildFaqSchema(faqItems)} />}
        <InfoPage pageBlocks={infoPageBlocks} />
      </>
    );
  }

  notFound();
}

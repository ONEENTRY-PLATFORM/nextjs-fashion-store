import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

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
import { SEO, SITE_URL } from '@/app/data/seoData';
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
import {
  type CatalogFilters,
  isFilteredCatalogView,
  parseCatalogSearchParams,
} from '@/lib/oneentry/catalog/filters';
import { resolveInfoPageSlug } from '@/lib/oneentry/catalog/info-pages';
import { withCmsSeo } from '@/lib/oneentry/catalog/page-seo';
import { loadPageByUrl } from '@/lib/oneentry/catalog/pages';
import { loadFilteredProducts, loadProducts } from '@/lib/oneentry/catalog/products';
import { applySeasonalTrend, resolveSeasonalTrend } from '@/lib/oneentry/catalog/seasonal-trend';
import { getDictionary, getSiteSettings, translate } from '@/lib/oneentry/dictionary';

export const CATALOG_ROUTE_LABELS = {
  // Heading of the trending carousel when OE has no `catalog_trend_blocks` block (or the block carries no title of its own).
  trendingFallbackTitle: "We Think You'll Love",
} as const;

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

/** Adapt a CMS-discovered category to the shape the registry-driven branch of this route already understands, so both kinds of catalog page take exactly the same code path. */
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

/** Server-side product page size. */
const PRODUCTS_PER_PAGE = 16;

// NOTE: this route is `ƒ Dynamic` in the build output, not ISR — the segment config below currently buys nothing.
export const revalidate = 60;

/* ─── generateMetadata ─── */
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const path = slug.join('/');
  // A path missing from the static registry may still be an info page the editor created in OE after the last deploy — ask the CMS before giving up.
  const dynamicSlug = PAGE_REGISTRY[path] ? null : await resolveInfoPageSlug(path);
  // Still nothing?
  const cmsCatalog = PAGE_REGISTRY[path] || dynamicSlug ? null : await resolveCatalogRoute(path);
  const entry =
    PAGE_REGISTRY[path] ??
    (dynamicSlug ? { type: 'info' as const, slug: dynamicSlug } : undefined) ??
    (cmsCatalog ? catalogEntryFromCmsRoute(cmsCatalog) : undefined);
  // Nothing matched: this request ends in `notFound()` below.
  if (!entry) {
    const dict = await getDictionary();
    return {
      ...SEO.notFound,
      // `absolute`, because both the CMS value and the coded fallback already carry the brand.
      title: { absolute: translate(dict, 'not_found_seo_title', SEO.notFound.title as string) },
      description: translate(dict, 'not_found_seo_description', SEO.notFound.description as string),
    };
  }

  // Info pages carry their SEO on the OE page itself (`meta_title`, `meta_description`, `meta_keywords`, `canonical`), so an editor can tune it without a deploy.
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
    // CMS-only page with no `meta_*` attributes: `INFO_PAGE_META` has no entry for it either, so fall back to the page's own title.
    if (page?.title && !INFO_PAGE_META[entry.slug]) {
      return {
        title: `${page.title} | ${(await getSiteSettings()).brand.siteName}`,
        alternates: { canonical: `${SITE_URL}/${entry.slug}` },
      };
    }
  }

  // Catalog pages have an OE page of their own — the same one the block loader reads, under the `catalogKey` with hyphens swapped for underscores.
  if (entry.type === 'catalog') {
    const meta = withCmsSeo(entry.catalogKey.replace(/-/g, '_'), buildPageMetadata(entry));
    /*
      Filtered variants are kept out of the index. Nothing in `robots.ts` blocks these URLs, so this
      `noindex` is actually read — unlike the sibling restaurant project, where the same URLs are
      disallowed outright and the directive can never be fetched. `follow` stays true: the links out
      of a filtered listing lead to real product pages, and pagination is how a crawler walks past the
      first screen. The canonical `buildPageMetadata` already emits points at the bare listing.
    */
    if (isFilteredCatalogView(await searchParams)) {
      return { ...meta, robots: { index: false, follow: true, googleBot: { index: false, follow: true } } };
    }
    return meta;
  }

  return buildPageMetadata(entry);
}

/* ─── JSON-LD helpers ─── */
/** Breadcrumb + ItemList JSON-LD for a catalog page. */
async function buildCatalogSchemas(entry: CatalogPageEntry, path: string) {
  // Seed the schema.org ItemList with the first 10 in-stock products of this catalog — pulled from OE by category path (no id-prefix heuristic).
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
  // OE hosting and mega-menu deep-links use a `/category/<slug>` suffix on top of the base catalog path (e.g. `/women/clothing/category/outerwear`).
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
  // Same CMS-first resolution as `generateMetadata`: an info page created in OE after the last deploy is absent from the static registry but must still render.
  const dynamicSlug = entryFromExact ? null : await resolveInfoPageSlug(path);
  const cmsCatalog = entryFromExact || dynamicSlug ? null : await resolveCatalogRoute(path);
  const entry: PageEntry | undefined =
    entryFromExact ??
    (dynamicSlug ? { type: 'info', slug: dynamicSlug } : undefined) ??
    (cmsCatalog ? catalogEntryFromCmsRoute(cmsCatalog) : undefined);

  if (!entry) notFound();

  /* ── Catalog page ── */
  if (entry.type === 'catalog') {
    // A registry category renders its bespoke wrapper; one discovered in the CMS renders the generic template built from the page's own titles.
    const CatalogComponent = CATALOG_COMPONENTS[entry.catalogKey];
    if (!CatalogComponent && !cmsCatalog) notFound();
    const { breadcrumb, itemList } = await buildCatalogSchemas(entry, path);

    // Parse the URL filters once on the server so we can issue a filtered OE request and seed the client with the resolved state.
    const sp = await searchParams;
    let filters: CatalogFilters = parseCatalogSearchParams(sp);
    // SEASONAL TRENDS redirect: when the mega-menu clicked a leaf whose OE page carries `st_type-of-trends` + `st_trends`, swap the raw `?category=` filter for the real intent.
    if (filters.category) {
      const trend = await resolveSeasonalTrend(filters.category);
      if (trend) filters = applySeasonalTrend(filters, trend);
    }

    // Load OE quick-filter chip descriptors up-front.
    const chips = await loadFilterChips(entry.catalogKey);
    const initialQuickChips = chips && chips.length > 0 ? chips.map((c) => c.label) : undefined;

    // Chip clicks land as `?chip=<label>`. Look up the descriptor and merge its effect into `filters`: - `type: 'page'` → `filters.category = <url>`.
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

    // Visible slice: paged + filtered + sorted by OE.
    const filtered = await loadFilteredProducts({
      categoryPath,
      filters,
      page: currentPage,
      limit: PRODUCTS_PER_PAGE,
    });
    // Direct URL navigation to `?page=N` beyond the last valid page (e.g. shared/bookmarked link, guess-and-type, changed catalog size) lands the shopper on a `NoFilterResults` placeholder even though results DO exist.
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

    // Counts for filter options come from the full (unfiltered) category, so empty options still show `(N)` and aren't hidden when active filters narrow the visible grid.
    let countingProducts: Product[] = initialProducts ?? [];
    if (categoryPath) {
      const all = await loadProducts({ categoryPath, limit: 1000 });
      if (all.items.length > 0) {
        countingProducts = all.items.map(adaptCatalogProductToUiProduct);
      }
    }

    // The OE-managed `clothing` filter drives every catalog page now.
    let initialFilterGroups: ClothingFilterGroup[] | undefined;
    const filterMarker = entry.catalogKey.replace(/-/g, '_');
    const groups = await loadCatalogFilter(countingProducts, filterMarker);
    if (groups && groups.length > 0) initialFilterGroups = groups;

    // OE-managed trending block shown under the product grid.
    const catalogGender: 'W' | 'M' | '' = entry.catalogKey.startsWith('women-')
      ? 'W'
      : entry.catalogKey.startsWith('men-')
        ? 'M'
        : '';
    // Heading for the trending carousel: OE block title → CMS dictionary → local constant.
    const trendingFallbackTitle = translate(
      await getDictionary(),
      'catalog_page_trending_title',
      CATALOG_ROUTE_LABELS.trendingFallbackTitle,
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

    // OE-attached page blocks for this catalog.
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

    // Page chrome + breadcrumb labels come from the CMS dictionary; the local constants remain the offline fallback.
    const [dict, infoPageBlocks, cmsPage] = await Promise.all([
      getDictionary(),
      // `entry.slug` matches the OE pageUrl marker (e.g. 'about-us', 'faq').
      isHub ? Promise.resolve([] as PageBlock[]) : loadPageBlocksByUrl(entry.slug),
      // Cached per request alongside the metadata pass; supplies the crumb label for pages that exist only in the CMS.
      isHub ? Promise.resolve(null) : loadPageByUrl(entry.slug),
    ]);
    const label = (key: string, fallback: string) => translate(dict, key, fallback);

    const pageTitle = isHub
      ? label('info_hub_title', 'Content Hub')
      : // CMS first: `INFO_PAGE_META` is the offline fallback, so letting it win meant a title an editor changed in OneEntry never reached the page.
        cmsPage?.title?.trim() || INFO_PAGE_META[entry.slug]?.title || entry.slug;
    const crumbHome = label('info_breadcrumb_home', 'Home');

    const breadcrumbSchema = buildBreadcrumbSchema(
      isHub
        ? [{ name: crumbHome, href: '/' }, { name: label('info_breadcrumb_info', 'Info') }]
        : [{ name: crumbHome, href: '/' }, { name: pageTitle }],
    );

    // FAQ structured data is derived from the very blocks `<InfoPage>` renders below, so the markup can never describe copy the visitor cannot see.
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

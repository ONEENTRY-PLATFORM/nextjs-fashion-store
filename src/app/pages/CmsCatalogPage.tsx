'use client';
import { CatalogTemplate, type FilterGroup } from '@/app/components/catalog/CatalogTemplate';
import type { Product } from '@/app/components/product/ProductCard';
import { ACCENT_MEN, ACCENT_WOMEN } from '@/app/constants/colors';
import { CATALOG_PAGE_LABELS as CL } from '@/app/data/catalogPageLabels';
import type { PageBlock } from '@/lib/oneentry/blocks/page-blocks';
import type { CatalogFilters } from '@/lib/oneentry/catalog/filters';
import { useT } from '@/lib/oneentry/labels/DictContext';

const PRODUCTS_PER_PAGE = 16;

/**
 * Catalog page for a category that exists in OneEntry but has no bespoke
 * component in the code.
 *
 * The eight categories that shipped each have their own thin wrapper
 * (`WomenShoesPage`, `MenBagsPage`, …) whose only job is to pick an accent
 * colour, a title and a breadcrumb trail. A ninth category created in the admin
 * panel has none of that, and used to 404. This renders the same
 * `CatalogTemplate` from what the CMS actually knows: the page's own title, its
 * parent's title, and the taxonomy position.
 *
 * The accent follows the parent segment, which is the one piece of styling the
 * wrappers vary; an unrecognised parent gets the women accent, matching the
 * default `ProductCard` uses everywhere else.
 */
export function CmsCatalogPage({
  catalogKey,
  gender,
  title,
  parentTitle,
  initialProducts,
  initialFilterGroups,
  initialQuickChips,
  initialTotalStyles,
  currentFilters,
  currentPage,
  total,
  trendingBlock,
  pageBlocks,
}: {
  /** Storefront catalog key, e.g. `women-jewellery`. */
  catalogKey: string;
  /** Parent segment of the route, e.g. `men`. */
  gender: string;
  /** The category's CMS title. */
  title: string;
  /** The parent's CMS title, shown as the middle breadcrumb. */
  parentTitle: string;
  initialProducts?: Product[];
  initialFilterGroups?: FilterGroup[];
  initialQuickChips?: string[];
  initialTotalStyles?: number;
  currentFilters?: CatalogFilters;
  currentPage?: number;
  total?: number;
  trendingBlock?: PageBlock | null;
  pageBlocks?: PageBlock[];
}) {
  const isMen = gender === 'men';
  const accent = isMen ? ACCENT_MEN : ACCENT_WOMEN;
  const lCrumbHome = useT('catalog_page_breadcrumb_home', CL.breadcrumbHome);
  return (
    <CatalogTemplate
      pageBlocks={pageBlocks}
      catalogKey={catalogKey}
      products={initialProducts ?? []}
      filterGroups={initialFilterGroups ?? []}
      quickChips={initialQuickChips ?? []}
      accentColor={accent}
      title={title}
      genderLabel={parentTitle}
      totalStyles={initialTotalStyles}
      total={total}
      trendingBlock={trendingBlock}
      currentPage={currentPage}
      currentFilters={currentFilters}
      productsPerPage={PRODUCTS_PER_PAGE}
      priceMax={500}
      priceDefault={[0, 500]}
      scrollbarClass={isMen ? 'scrollbar-red' : 'scrollbar-pink'}
      breadcrumbs={[{ label: lCrumbHome, href: '/' }, { label: parentTitle, href: `/${gender}` }, { label: title }]}
    />
  );
}

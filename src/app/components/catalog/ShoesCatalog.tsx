'use client';
/** ShoesCatalog — thin wrapper over CatalogTemplate. */
import type { Product } from '@/app/components/product/ProductCard';
import { ACCENT_MEN } from '@/app/constants/colors';
import type { PageBlock } from '@/lib/oneentry/blocks/page-blocks';
import type { CatalogFilters } from '@/lib/oneentry/catalog/filters';
import { useT } from '@/lib/oneentry/labels/DictContext';

import { CatalogTemplate, type CatalogTemplateProps } from './CatalogTemplate';

/* ── Re-export types used by page files and AccessoriesCatalog ── */
export type { BreadcrumbItem, CrossSellCategory, FilterGroup, FilterOption } from './CatalogTemplate';

export const SHOES_CATALOG_LABELS = {
  shoes: 'SHOES',
  women: 'WOMEN',
  men: 'MEN',
  breadcrumbShoes: 'Shoes',
} as const;

export interface ShoesCatalogProps {
  catalogKey: string;
  gender: 'women' | 'men';
  accentColor: string;
  /** Mock-era hint; real pages drive the count from `total` (server-reported). */
  totalStyles?: number;
  productsPerPage?: number;
  quickChips: string[];
  filterGroups: CatalogTemplateProps['filterGroups'];
  products: Product[];
  crossSell?: CatalogTemplateProps['crossSell'];
  priceMax?: number;
  /** Server-reported total products matching `currentFilters`. */
  total?: number;
  /** 1-based page index from the URL on the server. */
  currentPage?: number;
  /** Parsed filters object (from URL `searchParams`). */
  currentFilters?: CatalogFilters;
  trendingBlock?: PageBlock | null;
  /** All OE-attached page blocks (`Pages.getBlocksByPageUrl`). */
  pageBlocks?: PageBlock[];
  /** Override catalog title (default: "SHOES") */
  catalogTitle?: string;
  /** Override breadcrumb category label (default: "Shoes") */
  breadcrumbCategory?: string;
}

export function ShoesCatalog({
  catalogKey,
  gender,
  accentColor,
  totalStyles,
  productsPerPage = 16,
  quickChips,
  filterGroups,
  products,
  crossSell,
  priceMax = 500,
  total,
  currentPage,
  currentFilters,
  trendingBlock,
  pageBlocks,
  catalogTitle,
  breadcrumbCategory,
}: ShoesCatalogProps) {
  // Catalog chrome resolves through the OE `catalog_page` set; `CL` is the offline fallback.
  const lShoes = useT('catalog_page_shoes', SHOES_CATALOG_LABELS.shoes);
  const lCrumbShoes = useT('catalog_page_breadcrumb_shoes', SHOES_CATALOG_LABELS.breadcrumbShoes);
  const lWomen = useT('catalog_page_women', SHOES_CATALOG_LABELS.women);
  const lMen = useT('catalog_page_men', SHOES_CATALOG_LABELS.men);
  const title = catalogTitle ?? lShoes;
  const crumbCategory = breadcrumbCategory ?? lCrumbShoes;
  const genderLabel = gender === 'women' ? lWomen : lMen;
  const scrollbarClass = accentColor === ACCENT_MEN ? 'scrollbar-red' : 'scrollbar-pink';

  const breadcrumbs = [
    { label: genderLabel, href: gender === 'women' ? '/women/clothing' : '/men/clothing' },
    { label: crumbCategory },
  ];

  return (
    <CatalogTemplate
      catalogKey={catalogKey}
      products={products}
      filterGroups={filterGroups}
      quickChips={quickChips}
      accentColor={accentColor}
      title={title}
      genderLabel={genderLabel}
      totalStyles={totalStyles}
      total={total}
      currentPage={currentPage}
      currentFilters={currentFilters}
      trendingBlock={trendingBlock}
      pageBlocks={pageBlocks}
      productsPerPage={productsPerPage}
      breadcrumbs={breadcrumbs}
      priceMax={priceMax}
      scrollbarClass={scrollbarClass}
      crossSell={crossSell}
    />
  );
}

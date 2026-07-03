import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { getApi, isError, isOneEntryEnabled } from '../index';
import { loadProducts, type LoadProductsOptions } from '../catalog/products';
import { adaptCatalogProductToUiProduct } from '../catalog/adapt';
import type { Product } from '../../../app/components/ProductCard';
import { DEFAULT_LOCALE } from '../locale';
import { REVALIDATE_HOME } from '../../isr';

/** Block descriptor returned by `loadPageBlocks`. Generic enough that the
 *  consumer (HomePage) can switch on `type` + `marker` to pick the right
 *  storefront component. */
export interface PageBlock {
  marker: string;
  type: string;
  title: string;
  /** Position from OE — already used for sorting before return. */
  position: number;
  /** For product-list blocks (`trending_block`, `similar_products_block`,
   *  `product_block`) the resolved products. Empty array otherwise. */
  products: Product[];
}

const PRODUCT_BLOCK_TYPES = new Set([
  'trending_block',
  'similar_products_block',
  'product_block',
]);

/**
 * Cached SDK read of a block by marker. The SDK's `getBlockByMarker` already
 * populates `similarProducts` / `products` inline for the relevant block
 * types, so one call gives us everything we need. The SDK strips
 * `customSettings` internally, but lifts `productConfig.quantity` to the
 * top-level `quantity` field before it does.
 */
const getCachedBlock = unstable_cache(
  async (marker: string, lang: string, limit: number) => {
    const result = await getApi().Blocks.getBlockByMarker(marker, lang, 0, limit);
    if (isError(result)) return null;
    // The SDK typing doesn't expose the enriched `similarProducts`/`products`
    // arrays as raw items with ids — cast to a narrow local shape describing
    // just what we read below.
    return result as unknown as {
      type?: string;
      position?: number;
      quantity?: number;
      localizeInfos?: { title?: string } & Record<string, { title?: string } | undefined>;
      similarProducts?: { items?: Array<{ id?: number }> };
      products?: Array<{ id?: number }>;
    };
  },
  ['oe-block-by-marker'],
  { revalidate: REVALIDATE_HOME, tags: ['oe-block'] },
);

const getCachedFrequentlyOrdered = unstable_cache(
  async (marker: string, productId: number, lang: string) => {
    const result = await getApi().Blocks.getFrequentlyOrderedProducts(productId, marker, lang);
    if (isError(result)) return null;
    // The SDK types `items` with a rich shape, but for our use we only need
    // `id`. Narrow to that shape.
    return result as unknown as { items?: Array<{ id?: number }> };
  },
  ['oe-block-frequently-ordered'],
  { revalidate: REVALIDATE_HOME, tags: ['oe-block'] },
);

const getCachedPageById = unstable_cache(
  async (pageId: number, lang: string) => {
    const result = await getApi().Pages.getPageById(pageId, lang);
    if (isError(result)) return null;
    // The SDK typing may lag behind what OE actually ships for the `blocks`
    // field — treat it as an unknown-shaped list.
    return result as unknown as {
      blocks?: unknown;
    };
  },
  ['oe-page-by-id'],
  { revalidate: REVALIDATE_HOME, tags: ['oe-page'] },
);

/**
 * Resolve a single block by marker, including the product list for
 * product-list-typed blocks. Used internally by `loadPageBlocksById`, exported so
 * callers that need just one block can reuse it.
 *
 * Note: `similarProductRules` (used in the previous raw-fetch fallback) is
 * stripped by the SDK's block normalizer, so we trust the SDK's inline
 * `similarProducts` / `products` result and don't fall back to a
 * rule-based tag scan. Once the OE admin fixes the block rules to use
 * `in`/`exs` semantics the SDK path returns the right products directly.
 */
export async function loadBlockWithProducts(
  marker: string,
  options: { categoryPath?: string; lang?: string } = {},
): Promise<PageBlock | null> {
  if (!isOneEntryEnabled) return null;
  const lang = options.lang ?? DEFAULT_LOCALE;

  const block = await getCachedBlock(marker, lang, 12);
  if (!block) return null;

  const title = (
    block.localizeInfos?.en_US?.title
    ?? block.localizeInfos?.title
    ?? ''
  ).toString().trim();
  const type = block.type ?? '';
  const position = Number(block.position ?? 0);
  const limit = Number(block.quantity ?? 12) || 12;

  let products: Product[] = [];
  if (PRODUCT_BLOCK_TYPES.has(type)) {
    const inlineItems =
      block.similarProducts?.items
      ?? block.products
      ?? [];
    const ids = inlineItems
      .map((it) => Number(it?.id))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (ids.length > 0) {
      const { items } = await loadProducts({ ids, limit: ids.length });
      products = items.map(adaptCatalogProductToUiProduct);
    }
    // For blocks with a bigger admin-configured quantity than the default
    // page size, re-fetch with the actual limit.
    if (products.length === 0 && limit !== 12) {
      const bigger = await getCachedBlock(marker, lang, limit);
      const items =
        bigger?.similarProducts?.items
        ?? bigger?.products
        ?? [];
      const ids2 = items
        .map((it) => Number(it?.id))
        .filter((n) => Number.isFinite(n) && n > 0);
      if (ids2.length > 0) {
        const { items: catalogItems } = await loadProducts({ ids: ids2, limit: ids2.length });
        products = catalogItems.map(adaptCatalogProductToUiProduct);
      }
    }
    // Homepage `similar_products_block` markers (`homepage_new_arrivals`,
    // `homepage_best_sellers`, `homepage_sale`) return no items from OE
    // because there's no seed product to compute similarity against —
    // OE's similarity engine expects a source productId. Fall back to a
    // marker-derived slice of the catalog by matching the product `label`
    // ("NEW" / "BESTSELLER" / "SALE") — merchants already tag products
    // with these to drive the same visual badges elsewhere. For markers
    // outside the known set we leave `products` empty so the block quietly
    // hides instead of showing a random slice of the catalog.
    if (products.length === 0) {
      products = await loadHomepageBlockFallback(marker, limit, lang);
    }
  }

  return { marker, type, title, position, products };
}

/** Marker → product `label` used as the fallback tag when OE's similarity
 *  block returns no items. Order matters — the client renders however OE
 *  positions the block, but the fallback pulls only tagged products. */
const HOMEPAGE_FALLBACK_LABELS: Record<string, string> = {
  homepage_new_arrivals: 'NEW',
  homepage_best_sellers: 'BESTSELLER',
  homepage_sale: 'SALE',
};

async function loadHomepageBlockFallback(marker: string, limit: number, lang: string): Promise<Product[]> {
  const label = HOMEPAGE_FALLBACK_LABELS[marker];
  if (!label) return [];
  // `loadProducts` filters `p.tag` case-insensitively when `tags` is set.
  // OE stores label as "New" / "Sale" / "Bestseller"; storefront `p.tag` is
  // uppercased by the adapter — the lowercased-set match in `loadProducts`
  // makes any case work.
  const opts: LoadProductsOptions = { tags: [label], limit, lang: lang as LoadProductsOptions['lang'] };
  const { items } = await loadProducts(opts);
  return items.map(adaptCatalogProductToUiProduct);
}

/**
 * Fetch a page by id (the home page is `id=1` because its `pageUrl` is the
 * empty string and OE's `/pages/url/{url}/blocks` endpoint can't route an
 * empty segment). Returns each attached block with title, type and (for
 * product-list blocks) resolved products, in admin-defined order.
 */
export const loadPageBlocksById = cache(
  async (pageId: number, lang: string = DEFAULT_LOCALE): Promise<PageBlock[]> => {
    if (!isOneEntryEnabled) return [];
    const page = await getCachedPageById(pageId, lang);
    if (!page) return [];
    // OE has historically shipped `page.blocks` as `string[]` (marker names)
    // but the SDK-normalised payload now returns `Array<{ marker: string,
    // position: number, … }>`. Support both — extract the marker from either
    // shape, drop empties.
    const rawBlocks = Array.isArray(page.blocks) ? (page.blocks as unknown[]) : [];
    const markers = rawBlocks
      .map((b): string | null => {
        if (typeof b === 'string') return b.trim() || null;
        if (b && typeof b === 'object') {
          const marker = (b as { marker?: unknown; identifier?: unknown }).marker
            ?? (b as { identifier?: unknown }).identifier;
          return typeof marker === 'string' && marker.trim() ? marker.trim() : null;
        }
        return null;
      })
      .filter((m): m is string => m !== null);
    if (markers.length === 0) return [];
    const blocks = await Promise.all(
      markers.map((m) => loadBlockWithProducts(m, { lang })),
    );
    return blocks
      .filter((b): b is PageBlock => b !== null)
      .sort((a, b) => a.position - b.position || markers.indexOf(a.marker) - markers.indexOf(b.marker));
  },
);

export const HOME_PAGE_ID = 1;

/**
 * Resolve a `frequently_ordered_block` for a specific product. OE aggregates
 * cross-purchase stats from real orders and returns products commonly bought
 * together with `productId`. No similarProductRules involved — the result is
 * statistics-driven.
 */
export async function loadFrequentlyOrderedBlock(
  marker: string,
  productId: number,
  lang: string = DEFAULT_LOCALE,
): Promise<PageBlock | null> {
  if (!isOneEntryEnabled) return null;
  if (!Number.isFinite(productId) || productId <= 0) return null;

  const block = await getCachedBlock(marker, lang, 12);
  const title = (
    block?.localizeInfos?.en_US?.title
    ?? block?.localizeInfos?.title
    ?? ''
  ).toString().trim();
  const type = block?.type ?? 'frequently_ordered_block';
  const position = Number(block?.position ?? 0);

  const data = await getCachedFrequentlyOrdered(marker, productId, lang);
  const ids = (data?.items ?? [])
    .map((it) => Number(it?.id))
    .filter((n) => Number.isFinite(n) && n > 0);

  let products: Product[] = [];
  if (ids.length > 0) {
    const { items } = await loadProducts({ ids, limit: ids.length });
    products = items.map(adaptCatalogProductToUiProduct);
  }
  return { marker, type, title, position, products };
}

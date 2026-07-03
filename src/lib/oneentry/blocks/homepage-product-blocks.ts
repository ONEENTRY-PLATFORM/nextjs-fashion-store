import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { getApi, isError, isOneEntryEnabled } from '../index';
import { loadProducts } from '../catalog/products';
import { adaptCatalogProductToUiProduct } from '../catalog/adapt';
import type { Product } from '../../../app/components/ProductCard';
import { DEFAULT_LOCALE } from '../locale';
import { REVALIDATE_HOME } from '../../isr';

export interface HomepageProductBlockResult {
  /** Localised title configured in the OE block (`localizeInfos.en_US.title`). */
  title: string;
  /** Products that match the block's similarProductRules. */
  products: Product[];
}

/**
 * SDK-backed cached read. `Blocks.getBlockByMarker` internally populates the
 * `similarProducts` (for `similar_products_block`) or `products` (for
 * `product_block`) collection, so we don't need a second call. The SDK
 * strips `customSettings` after lifting `productConfig.quantity` to
 * top-level `quantity`.
 */
const getCachedBlock = unstable_cache(
  async (marker: string, lang: string, limit: number) => {
    const result = await getApi().Blocks.getBlockByMarker(marker, lang, 0, limit);
    if (isError(result)) return null;
    // The SDK typing hides the `similarProducts` / `products` payload behind
    // `IProductsResponse` shapes we only sample `id` from — narrow it down.
    return result as unknown as {
      quantity?: number;
      localizeInfos?: { title?: string } & Record<string, { title?: string } | undefined>;
      similarProducts?: { items?: Array<{ id?: number }> };
      products?: Array<{ id?: number }>;
    };
  },
  ['oe-homepage-product-block'],
  { revalidate: REVALIDATE_HOME, tags: ['oe-block'] },
);

/**
 * Fetch a single homepage product block (type `similar_products_block`) and
 * resolve the products it should display. Returns localised title plus the
 * product list ready for `<MenCollection>` / `<WomenCollection>` / etc.
 *
 * Note: The `similarProductRules` fallback used with raw fetch is not
 * available via the SDK (the block normalizer strips `customSettings`) —
 * we now trust the SDK's inline `similarProducts` / `products` result.
 * Once the OE admin fixes their rules to use `in`/`exs`, this returns the
 * correct products directly.
 */
export const loadHomepageProductBlock = cache(
  async (
    marker: string,
    options: { categoryPath?: string; limit?: number; lang?: string } = {},
  ): Promise<HomepageProductBlockResult | null> => {
    if (!isOneEntryEnabled) return null;
    const lang = options.lang ?? DEFAULT_LOCALE;
    const initialLimit = options.limit ?? 12;

    const block = await getCachedBlock(marker, lang, initialLimit);
    if (!block) return null;

    const title = (
      block.localizeInfos?.en_US?.title
      ?? block.localizeInfos?.title
      ?? ''
    ).toString().trim();
    const limit = options.limit
      ?? Number(block.quantity ?? 12)
      ?? 12;

    let products: Product[] = [];
    const inlineItems =
      block.similarProducts?.items
      ?? block.products
      ?? [];
    let ids = inlineItems
      .map((it) => Number(it?.id))
      .filter((n) => Number.isFinite(n) && n > 0);

    // If the block's admin-configured quantity differs from initialLimit
    // and the first call was truncated, re-request with the block's own limit.
    if (ids.length === 0 && limit !== initialLimit) {
      const wider = await getCachedBlock(marker, lang, limit);
      const items = wider?.similarProducts?.items ?? wider?.products ?? [];
      ids = items
        .map((it) => Number(it?.id))
        .filter((n) => Number.isFinite(n) && n > 0);
    }

    if (ids.length > 0) {
      const enriched = await loadProducts({ ids, limit: ids.length });
      products = enriched.items.map(adaptCatalogProductToUiProduct);
    }

    return { title, products };
  },
);

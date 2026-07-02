import { cache } from 'react';
import { loadProducts } from '../catalog/products';
import { adaptCatalogProductToUiProduct } from '../catalog/adapt';
import type { Product } from '../../../app/components/ProductCard';
import { DEFAULT_LOCALE } from '../locale';
import { REVALIDATE_HOME } from '../../isr';

interface RawSimilarRule {
  attributeMarker?: string;
  conditionMarker?: string;
  conditionValue?: string;
  pageUrls?: string[];
  statusMarker?: string;
}

interface RawBlock {
  id?: number;
  localizeInfos?: { en_US?: { title?: string } };
  customSettings?: {
    productConfig?: { quantity?: string | number };
    similarProductRules?: RawSimilarRule[];
  };
}

interface RawSimilarProductsResp {
  items?: unknown[];
  total?: number;
}

export interface HomepageProductBlockResult {
  /** Localised title configured in the OE block (`localizeInfos.en_US.title`). */
  title: string;
  /** Products that match the block's similarProductRules. */
  products: Product[];
}

/**
 * The OE `/blocks/{marker}/similar-products` endpoint returns 0 hits when
 * `similarProductRules` use `conditionMarker: "eq"` against a list-typed
 * attribute like `lable_23` (the eq comparison expects scalar, not array).
 * As a fallback we read the rules from the block definition and apply them
 * through `loadProducts` (which uses the local catalog and `in` semantics).
 */
function rulesToTags(rules: RawSimilarRule[] | undefined): string[] {
  if (!rules) return [];
  const tags = new Set<string>();
  for (const r of rules) {
    const m = r.attributeMarker ?? '';
    if (m === 'label' || m.startsWith('lable_') || m === 'label') {
      if (r.conditionValue) tags.add(r.conditionValue);
    }
  }
  return [...tags];
}

/**
 * Fetch a single homepage product block (type `similar_products_block`) and
 * resolve the products it should display. Returns localised title plus the
 * product list ready for `<MenCollection>` / `<WomenCollection>` / etc.
 */
export const loadHomepageProductBlock = cache(
  async (
    marker: string,
    options: { categoryPath?: string; limit?: number; lang?: string } = {},
  ): Promise<HomepageProductBlockResult | null> => {
    const url = process.env.ONEENTRY_URL;
    const appToken = process.env.ONEENTRY_TOKEN;
    if (!url || !appToken) return null;
    const lang = options.lang ?? DEFAULT_LOCALE;

    let block: RawBlock | null = null;
    try {
      const res = await fetch(
        `${url}/api/content/blocks/marker/${encodeURIComponent(marker)}?langCode=${lang}`,
        {
          headers: { 'x-app-token': appToken, accept: 'application/json' },
          next: { revalidate: REVALIDATE_HOME },
        },
      );
      const txt = await res.text();
      if (res.ok && txt.trim().startsWith('{')) {
        block = JSON.parse(txt) as RawBlock;
      }
    } catch { /* fall through */ }

    if (!block) return null;
    const title = block.localizeInfos?.en_US?.title?.trim() ?? '';
    const limit = options.limit
      ?? Number(block.customSettings?.productConfig?.quantity ?? 12)
      ?? 12;

    // 1) Try OE's own similar-products resolver first — when the admin
    //    eventually fixes the rule to use `in`/`exs` it'll work directly.
    let products: Product[] = [];
    try {
      const res = await fetch(
        `${url}/api/content/blocks/${encodeURIComponent(marker)}/similar-products?langCode=${lang}&offset=0&limit=${limit}`,
        {
          headers: { 'x-app-token': appToken, accept: 'application/json' },
          next: { revalidate: REVALIDATE_HOME },
        },
      );
      const txt = await res.text();
      if (res.ok && txt.trim().startsWith('{')) {
        const data = JSON.parse(txt) as RawSimilarProductsResp;
        const items = Array.isArray(data.items) ? data.items : [];
        if (items.length > 0) {
          const ids = items
            .map((it) => (typeof it === 'object' && it && 'id' in it ? Number((it as { id: unknown }).id) : NaN))
            .filter((n) => Number.isFinite(n));
          if (ids.length > 0) {
            const enriched = await loadProducts({ ids, limit: ids.length });
            products = enriched.items.map(adaptCatalogProductToUiProduct);
          }
        }
      }
    } catch { /* fall through */ }

    // 2) Fallback — derive the same filter from the block rules.
    if (products.length === 0) {
      const tags = rulesToTags(block.customSettings?.similarProductRules);
      if (tags.length > 0) {
        const { items } = await loadProducts({
          tags,
          categoryPath: options.categoryPath,
          limit,
        });
        products = items.map(adaptCatalogProductToUiProduct);
      }
    }
    return { title, products };
  },
);

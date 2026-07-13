import { loadFrequentlyOrderedBlock } from '../../../lib/oneentry/blocks/page-blocks';
import { FrequentlyOrderedClient } from './FrequentlyOrderedClient';
import type { Product } from '../../components/ProductCard';

/**
 * Async server component that resolves the OE `frequently_ordered_block` for
 * this product. Streamed in via `<Suspense>` so the user sees the main PDP
 * body immediately while OE aggregates "bought-together" stats.
 *
 * The block is statistics-driven — it needs real orders to have items. When
 * OE returns nothing (fresh tenant, product with no purchase history), the
 * carousel simply hides — previously we backfilled via `loadProducts(...)`
 * which tunnels through the 2000-item / ~30 MB `loadFullCatalog` dump for
 * every PDP, which under load queued at OE and pushed PDP p95 well above
 * threshold. Hiding an empty carousel is a much cheaper failure mode.
 */
export async function FrequentlyOrderedAsync({
  productId,
  marker = 'pdp_you_may_also_like',
  categoryViewAllHref,
  productGender,
}: {
  productId: number;
  marker?: string;
  categoryViewAllHref: string;
  /** Gender of the current PDP product. When set, the carousel only shows
   *  products of the same gender (or unisex) — keeps women/men feeds
   *  consistent even when OE block returns mixed results. */
  productGender?: 'W' | 'M' | 'U' | '';
}) {
  const block = await loadFrequentlyOrderedBlock(marker, productId);
  if (!block) return null;

  const genderOk = (p: Product) =>
    !productGender || productGender === 'U' || !p.gender || p.gender === productGender || p.gender === 'U';

  // Dedupe by id — OE can hand back the same product twice on tenants where
  // an item lives in two overlapping categories, and React chokes on
  // duplicate keys downstream.
  const seenIds = new Set<string>();
  const deduped: Product[] = [];
  for (const p of block.products) {
    if (!genderOk(p) || seenIds.has(p.id)) continue;
    seenIds.add(p.id);
    deduped.push(p);
  }

  if (deduped.length === 0) return null;
  return (
    <FrequentlyOrderedClient
      products={deduped}
      title={block.title || undefined}
      categoryViewAllHref={categoryViewAllHref}
    />
  );
}

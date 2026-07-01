import { loadFrequentlyOrderedBlock } from '../../../lib/oneentry/blocks/page-blocks';
import { FrequentlyOrderedClient } from './FrequentlyOrderedClient';

/**
 * Async server component that resolves the OE `frequently_ordered_block` for
 * this product. Streamed in via `<Suspense>` so the user sees the main PDP
 * body immediately while OE aggregates "bought-together" stats.
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
  const products = productGender && (productGender === 'W' || productGender === 'M')
    ? block.products.filter(p => !p.gender || p.gender === productGender || p.gender === 'U')
    : block.products;
  if (products.length === 0) return null;
  return (
    <FrequentlyOrderedClient
      products={products}
      title={block.title || undefined}
      categoryViewAllHref={categoryViewAllHref}
    />
  );
}

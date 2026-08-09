import type { Metadata } from 'next';

import { SEO } from '../../../src/app/data/seoData';
import { CartPage } from '../../../src/app/pages/CartPage';
import { loadPageBlocksByUrl } from '../../../src/lib/oneentry/blocks/page-blocks';
import { withCmsSeo } from '../../../src/lib/oneentry/catalog/page-seo';

/**
 * Title/description/keywords/canonical come from the OE `cart` page when an
 *  editor filled them; `SEO.cart` stays as the offline fallback.
 */
export async function generateMetadata(): Promise<Metadata> {
  return withCmsSeo('cart', SEO.cart);
}

export default async function Page() {
  const pageBlocks = await loadPageBlocksByUrl('cart');
  return <CartPage pageBlocks={pageBlocks} />;
}

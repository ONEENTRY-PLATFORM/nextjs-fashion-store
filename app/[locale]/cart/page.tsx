import type { Metadata } from 'next';
import { withCmsSeo } from '../../src/lib/oneentry/catalog/page-seo';
import { SEO } from '../../src/app/data/seoData';
import { CartPage } from '../../src/app/pages/CartPage';
import { loadCheckoutSystemTexts } from '../../src/lib/oneentry/labels/checkout-labels';
import { CheckoutLabelsProvider } from '../../src/lib/oneentry/labels/CheckoutLabelsContext';
import { loadPageBlocksByUrl } from '../../src/lib/oneentry/blocks/page-blocks';

/** Title/description/keywords/canonical come from the OE `cart` page when an
 *  editor filled them; `SEO.cart` stays as the offline fallback. */
export async function generateMetadata(): Promise<Metadata> {
  return withCmsSeo('cart', SEO.cart);
}

export default async function Page() {
  const [labels, pageBlocks] = await Promise.all([
    loadCheckoutSystemTexts(),
    loadPageBlocksByUrl('cart'),
  ]);
  return (
    <CheckoutLabelsProvider data={labels}>
      <CartPage pageBlocks={pageBlocks} />
    </CheckoutLabelsProvider>
  );
}

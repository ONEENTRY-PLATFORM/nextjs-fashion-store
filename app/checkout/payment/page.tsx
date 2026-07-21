import type { Metadata } from 'next';
import { SEO } from '../../../src/app/data/seoData';
import { PaymentPage } from '../../../src/app/pages/PaymentPage';
import { loadCheckoutSystemTexts } from '../../../src/lib/oneentry/labels/checkout-labels';
import { CheckoutLabelsProvider } from '../../../src/lib/oneentry/labels/CheckoutLabelsContext';
import { loadPageBlocksByUrl } from '../../../src/lib/oneentry/blocks/page-blocks';

export const metadata: Metadata = SEO.checkoutPayment;

export default async function Page() {
  const [labels, pageBlocks] = await Promise.all([
    loadCheckoutSystemTexts(),
    loadPageBlocksByUrl('payment'),
  ]);
  return (
    <CheckoutLabelsProvider data={labels}>
      <PaymentPage pageBlocks={pageBlocks} />
    </CheckoutLabelsProvider>
  );
}

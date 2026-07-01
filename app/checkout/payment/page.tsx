import type { Metadata } from 'next';
import { SEO } from '../../../src/app/data/seoData';
import { PaymentPage } from '../../../src/app/pages/PaymentPage';
import { loadCheckoutSystemTexts } from '../../../src/lib/oneentry/labels/checkout-labels';
import { CheckoutLabelsProvider } from '../../../src/lib/oneentry/labels/CheckoutLabelsContext';

export const metadata: Metadata = SEO.checkoutPayment;

export default async function Page() {
  const labels = await loadCheckoutSystemTexts();
  return (
    <CheckoutLabelsProvider data={labels}>
      <PaymentPage />
    </CheckoutLabelsProvider>
  );
}

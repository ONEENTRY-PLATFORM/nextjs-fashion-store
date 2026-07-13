import type { Metadata } from 'next';
import { SEO } from '../../../src/app/data/seoData';
import { ConfirmationPage } from '../../../src/app/pages/ConfirmationPage';
import { loadCheckoutSystemTexts } from '../../../src/lib/oneentry/labels/checkout-labels';
import { CheckoutLabelsProvider } from '../../../src/lib/oneentry/labels/CheckoutLabelsContext';
import { loadCheckoutSuccessMessage } from '../../../src/lib/oneentry/checkout/delivery-methods';

export const metadata: Metadata = SEO.checkoutConfirmation;

export default async function Page() {
  const [labels, successMessage] = await Promise.all([
    loadCheckoutSystemTexts(),
    loadCheckoutSuccessMessage(),
  ]);
  return (
    <CheckoutLabelsProvider data={labels}>
      <ConfirmationPage successMessage={successMessage} />
    </CheckoutLabelsProvider>
  );
}

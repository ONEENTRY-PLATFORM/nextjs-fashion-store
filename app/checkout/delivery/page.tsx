import type { Metadata } from 'next';
import { SEO } from '../../../src/app/data/seoData';
import { DeliveryPage } from '../../../src/app/pages/DeliveryPage';
import { loadCheckoutSystemTexts } from '../../../src/lib/oneentry/labels/checkout-labels';
import { CheckoutLabelsProvider } from '../../../src/lib/oneentry/labels/CheckoutLabelsContext';
import { loadFormPlaceholders } from '../../../src/lib/oneentry/forms/placeholders';
import { FormPlaceholdersProvider } from '../../../src/lib/oneentry/forms/FormPlaceholdersContext';

export const metadata: Metadata = SEO.checkoutDelivery;

export default async function Page() {
  const [labels, userAddresses] = await Promise.all([
    loadCheckoutSystemTexts(),
    loadFormPlaceholders('user_addresses'),
  ]);
  return (
    <CheckoutLabelsProvider data={labels}>
      <FormPlaceholdersProvider forms={{ user_addresses: userAddresses }}>
        <DeliveryPage />
      </FormPlaceholdersProvider>
    </CheckoutLabelsProvider>
  );
}

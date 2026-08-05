import type { Metadata } from 'next';
import { SEO } from '../../src/app/data/seoData';
import { AccountPage } from '../../src/app/pages/AccountPage';
import { loadAccountSystemTexts } from '../../src/lib/oneentry/labels/account-labels';
import { AccountLabelsProvider } from '../../src/lib/oneentry/labels/AccountLabelsContext';
import { loadFormContent } from '../../src/lib/oneentry/forms/placeholders';
import { FormPlaceholdersProvider } from '../../src/lib/oneentry/forms/FormPlaceholdersContext';

export const metadata: Metadata = SEO.account;

export default async function Page() {
  const [labels, userAddresses, serviceRequest] = await Promise.all([
    loadAccountSystemTexts(),
    loadFormContent('user_addresses'),
    loadFormContent('service_request'),
  ]);
  return (
    <AccountLabelsProvider data={labels}>
      <FormPlaceholdersProvider forms={{ user_addresses: userAddresses, service_request: serviceRequest }}>
        <AccountPage />
      </FormPlaceholdersProvider>
    </AccountLabelsProvider>
  );
}

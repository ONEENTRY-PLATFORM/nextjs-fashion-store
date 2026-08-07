import type { Metadata } from 'next';
import { withCmsSeo } from '../../src/lib/oneentry/catalog/page-seo';
import { SEO } from '../../src/app/data/seoData';
import { AccountPage } from '../../src/app/pages/AccountPage';
import { loadAccountSystemTexts } from '../../src/lib/oneentry/labels/account-labels';
import { AccountLabelsProvider } from '../../src/lib/oneentry/labels/AccountLabelsContext';
import { loadFormContent } from '../../src/lib/oneentry/forms/placeholders';
import { FormPlaceholdersProvider } from '../../src/lib/oneentry/forms/FormPlaceholdersContext';

/** Title/description/keywords/canonical come from the OE `account` page when an
 *  editor filled them; `SEO.account` stays as the offline fallback. */
export async function generateMetadata(): Promise<Metadata> {
  return withCmsSeo('account', SEO.account);
}

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

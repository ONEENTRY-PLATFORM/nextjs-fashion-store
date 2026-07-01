import type { Metadata } from 'next';
import { SEO } from '../../../src/app/data/seoData';
import { FilterSystemDownloadPage } from '../../../src/app/pages/FilterSystemDownloadPage';

export const metadata: Metadata = SEO.filterSystemDownload;

export default function Page() {
  return <FilterSystemDownloadPage />;
}

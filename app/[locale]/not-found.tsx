import type { Metadata } from 'next';

import { SEO } from '@/app/data/seoData';
import { NotFoundPage } from '@/app/pages/NotFoundPage';

export const metadata: Metadata = SEO.notFound;

export default function NotFound() {
  return <NotFoundPage />;
}

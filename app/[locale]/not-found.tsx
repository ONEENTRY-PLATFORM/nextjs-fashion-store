import type { Metadata } from 'next';
import { SEO } from '../src/app/data/seoData';
import { NotFoundPage } from '../src/app/pages/NotFoundPage';

export const metadata: Metadata = SEO.notFound;

export default function NotFound() {
  return <NotFoundPage />;
}

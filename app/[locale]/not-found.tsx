import type { Metadata } from 'next';

import { SEO } from '@/app/data/seoData';
import { NotFoundPage } from '@/app/pages/NotFoundPage';
import { getDictionary, translate } from '@/lib/oneentry/dictionary';

/**
 * The 404 has no OneEntry page of its own, so `withCmsSeo` has nothing to read.
 * Its title and description come from the `system_pages` set instead — the same
 * set that already holds the `not_found_*` copy this screen renders — with
 * `SEO.notFound` as the offline fallback.
 */
export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
    ...SEO.notFound,
    title: translate(dict, 'not_found_seo_title', SEO.notFound.title as string),
    description: translate(dict, 'not_found_seo_description', SEO.notFound.description as string),
  };
}

export default function NotFound() {
  return <NotFoundPage />;
}

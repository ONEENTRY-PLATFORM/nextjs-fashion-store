import { NotFoundPage } from '@/app/pages/NotFoundPage';

/**
 * Rendered when a segment calls `notFound()`.
 *
 * Deliberately without metadata: Next does not read `metadata` /
 * `generateMetadata` from `not-found.tsx` — the exported `SEO.notFound` that
 * used to sit here never reached the document, which is why a missing URL kept
 * the root layout's title. The 404 title and description are returned by
 * `generateMetadata` in `[...slug]/page.tsx`, the route that actually resolves
 * unknown paths, and they come from the OE `system_pages` set.
 */
export default function NotFound() {
  return <NotFoundPage />;
}

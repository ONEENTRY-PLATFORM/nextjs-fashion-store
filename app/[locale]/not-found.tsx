import { NotFoundPage } from '@/app/pages/NotFoundPage';

/** Rendered when a segment calls `notFound()`. Deliberately without metadata: Next does not read `metadata` / `generateMetadata` from `not-found.tsx`. */
export default function NotFound() {
  return <NotFoundPage />;
}

import { HomeSkeleton } from '@/app/components/home/HomeSkeleton';

/**
 * Loading UI for `/` only.
 *
 * Lives in the `(home)` route group — a group changes no URL, it just gives the
 * homepage its own Suspense boundary so the catalog-grid fallback in
 * `app/[locale]/loading.tsx` keeps serving every other route under `[locale]`.
 *
 * Content column only: the header and footer sit in the root layout and stay
 * mounted across a navigation (see `tests/e2e/page-transitions.spec.ts`).
 *
 * @returns The homepage-shaped skeleton.
 */
export default function HomeLoading() {
  return (
    <div className="flex-1 bg-white font-sans" data-testid="route-loading">
      <HomeSkeleton />
    </div>
  );
}

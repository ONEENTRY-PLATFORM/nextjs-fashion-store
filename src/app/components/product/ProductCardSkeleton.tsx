/**
 * Skeleton placeholder matching ProductCard dimensions.
 *  Shown on first client-side render (before JS hydration sets mounted=true).
 */
export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col bg-white" aria-hidden="true">
      {/* Image — 3/4 aspect ratio */}
      <div className="aspect-3/4 animate-pulse bg-gray-100" />
      {/* Info panel — fixed 96px */}
      <div className="flex h-24 flex-col gap-2 p-4">
        <div className="h-3 w-3/4 animate-pulse rounded bg-gray-100" />
        <div className="h-3 w-1/4 animate-pulse rounded bg-gray-100" />
        <div className="mt-auto flex gap-1.5">
          <div className="size-4 animate-pulse rounded-sm bg-gray-100" />
          <div className="size-4 animate-pulse rounded-sm bg-gray-100" />
          <div className="size-4 animate-pulse rounded-sm bg-gray-100" />
        </div>
      </div>
    </div>
  );
}

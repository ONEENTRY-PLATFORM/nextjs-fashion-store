/** Skeleton placeholder matching ProductCard dimensions.
 *  Shown on first client-side render (before JS hydration sets mounted=true).
 */
export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col bg-white" aria-hidden="true">
      {/* Image — 3/4 aspect ratio */}
      <div className="aspect-[3/4] bg-gray-100 animate-pulse" />
      {/* Info panel — fixed 96px */}
      <div className="flex flex-col px-4 pt-4 pb-4 h-24 gap-2">
        <div className="h-3 bg-gray-100 animate-pulse rounded w-3/4" />
        <div className="h-3 bg-gray-100 animate-pulse rounded w-1/4" />
        <div className="flex gap-1.5 mt-auto">
          <div className="w-4 h-4 bg-gray-100 animate-pulse rounded-sm" />
          <div className="w-4 h-4 bg-gray-100 animate-pulse rounded-sm" />
          <div className="w-4 h-4 bg-gray-100 animate-pulse rounded-sm" />
        </div>
      </div>
    </div>
  );
}

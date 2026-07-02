/**
 * Skeleton for the streamed "You May Also Like" carousel. Renders a row of
 * five product-card stubs while `frequently_ordered_block` resolves on OE.
 */
export function RecommendationsSkeleton() {
  return (
    <div className="py-12 border-t border-b border-black">
      <div className="px-4 lg:px-12">
        <div className="flex items-center justify-between mb-6">
          <div className="h-5 w-48 bg-gray-100 animate-pulse rounded-sm" />
          <div className="h-3 w-16 bg-gray-100 animate-pulse rounded-sm" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-[3/4] w-full bg-gray-100 animate-pulse" />
              <div className="h-3 w-3/4 bg-gray-100 animate-pulse rounded" />
              <div className="h-3 w-1/3 bg-gray-100 animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

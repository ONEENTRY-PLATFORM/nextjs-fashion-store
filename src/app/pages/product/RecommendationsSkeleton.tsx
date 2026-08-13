/** Skeleton for the streamed "You May Also Like" carousel. */
export function RecommendationsSkeleton() {
  return (
    <div className="border-y border-black py-12">
      <div className="px-4 lg:px-12">
        <div className="mb-6 flex items-center justify-between">
          <div className="h-5 w-48 animate-pulse rounded-sm bg-gray-100" />
          <div className="h-3 w-16 animate-pulse rounded-sm bg-gray-100" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-3/4 w-full animate-pulse bg-gray-100" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-gray-100" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

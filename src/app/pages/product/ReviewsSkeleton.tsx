/**
 * Skeleton placeholder rendered while `ReviewsAsync` is fetching OE
 * `review_feedback` + `review_rating` form-data. Mirrors the real reviews
 * section layout (heading, rating column, 3 review-card stubs) so the page
 * doesn't shift when the streamed content lands.
 */
export function ReviewsSkeleton() {
  return (
    <div className="px-4 lg:px-8 py-12 max-w-screen-xl mx-auto border-t border-[#e5e7eb]">
      <div className="h-5 w-48 mb-8 bg-gray-100 animate-pulse rounded-sm" />

      <div className="flex flex-col lg:flex-row gap-12">
        <div className="lg:w-64 flex-shrink-0">
          <div className="flex flex-col items-center mb-6">
            <div className="h-14 w-20 bg-gray-100 animate-pulse rounded mb-2" />
            <div className="h-4 w-24 bg-gray-100 animate-pulse rounded mb-2" />
            <div className="h-3 w-16 bg-gray-100 animate-pulse rounded" />
          </div>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((stars) => (
              <div key={stars} className="flex items-center gap-2">
                <span className="text-xs w-6 text-right text-gray-300">{stars}</span>
                <div className="h-1.5 w-2 bg-gray-100 animate-pulse rounded" />
                <div className="flex-1 h-1.5 bg-gray-100 animate-pulse" />
                <span className="text-xs text-gray-300 w-4">·</span>
              </div>
            ))}
          </div>
          <div className="h-11 w-full mt-6 bg-gray-100 animate-pulse rounded-sm" />
        </div>

        <div className="flex-1 space-y-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="py-6 border-b border-gray-100 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="h-3 w-28 bg-gray-100 animate-pulse rounded" />
                  <div className="h-4 w-3/5 bg-gray-100 animate-pulse rounded" />
                </div>
                <div className="h-3 w-20 bg-gray-100 animate-pulse rounded" />
              </div>
              <div className="space-y-1.5">
                <div className="h-3 w-full bg-gray-100 animate-pulse rounded" />
                <div className="h-3 w-11/12 bg-gray-100 animate-pulse rounded" />
                <div className="h-3 w-2/3 bg-gray-100 animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

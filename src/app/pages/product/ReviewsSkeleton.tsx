/**
 * Skeleton placeholder rendered while `ReviewsAsync` is fetching OE
 * `review_feedback` + `review_rating` form-data. Mirrors the real reviews
 * section layout (heading, rating column, 3 review-card stubs) so the page
 * doesn't shift when the streamed content lands.
 */
export function ReviewsSkeleton() {
  return (
    <div className="mx-auto max-w-7xl border-t border-[#e5e7eb] px-4 py-12 lg:px-8">
      <div className="mb-8 h-5 w-48 animate-pulse rounded-sm bg-gray-100" />

      <div className="flex flex-col gap-12 lg:flex-row">
        <div className="shrink-0 lg:w-64">
          <div className="mb-6 flex flex-col items-center">
            <div className="mb-2 h-14 w-20 animate-pulse rounded bg-gray-100" />
            <div className="mb-2 h-4 w-24 animate-pulse rounded bg-gray-100" />
            <div className="h-3 w-16 animate-pulse rounded bg-gray-100" />
          </div>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((stars) => (
              <div key={stars} className="flex items-center gap-2">
                <span className="w-6 text-right text-xs text-gray-300">{stars}</span>
                <div className="h-1.5 w-2 animate-pulse rounded bg-gray-100" />
                <div className="h-1.5 flex-1 animate-pulse bg-gray-100" />
                <span className="w-4 text-xs text-gray-300">·</span>
              </div>
            ))}
          </div>
          <div className="mt-6 h-11 w-full animate-pulse rounded-sm bg-gray-100" />
        </div>

        <div className="flex-1 space-y-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-3 border-b border-gray-100 py-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-28 animate-pulse rounded bg-gray-100" />
                  <div className="h-4 w-3/5 animate-pulse rounded bg-gray-100" />
                </div>
                <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
              </div>
              <div className="space-y-1.5">
                <div className="h-3 w-full animate-pulse rounded bg-gray-100" />
                <div className="h-3 w-11/12 animate-pulse rounded bg-gray-100" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

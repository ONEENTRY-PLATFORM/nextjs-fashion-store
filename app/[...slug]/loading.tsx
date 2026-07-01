export default function SlugLoading() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="h-[132px] bg-gray-100 animate-pulse" />

      <div className="max-w-screen-2xl mx-auto px-4 lg:px-8 py-6">
        {/* Breadcrumb skeleton */}
        <div className="flex gap-2 mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-3 w-16 bg-gray-100 animate-pulse rounded" />
          ))}
        </div>

        <div className="flex gap-8">
          {/* Filters sidebar skeleton */}
          <div className="hidden lg:block w-52 flex-shrink-0 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i}>
                <div className="h-3 w-24 bg-gray-200 animate-pulse rounded mb-3" />
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="h-3 w-full bg-gray-100 animate-pulse rounded" />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Grid skeleton */}
          <div className="flex-1">
            <div className="flex justify-between items-center mb-4">
              <div className="h-3 w-32 bg-gray-100 animate-pulse rounded" />
              <div className="h-8 w-36 bg-gray-100 animate-pulse rounded" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-px bg-gray-200">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="bg-white p-2">
                  <div
                    className="aspect-[3/4] bg-gray-100 animate-pulse mb-3"
                    style={{ animationDelay: `${i * 40}ms` }}
                  />
                  <div className="h-3 bg-gray-200 animate-pulse rounded mb-2 w-3/4" />
                  <div className="h-3 bg-gray-100 animate-pulse rounded w-1/2" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

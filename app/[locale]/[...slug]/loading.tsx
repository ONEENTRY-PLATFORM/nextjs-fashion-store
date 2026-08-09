export default function SlugLoading() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="h-33 animate-pulse bg-gray-100" />

      <div className="mx-auto max-w-384 px-4 py-6 lg:px-8">
        {/* Breadcrumb skeleton */}
        <div className="mb-6 flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-3 w-16 animate-pulse rounded bg-gray-100" />
          ))}
        </div>

        <div className="flex gap-8">
          {/* Filters sidebar skeleton */}
          <div className="hidden w-52 shrink-0 space-y-4 lg:block">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i}>
                <div className="mb-3 h-3 w-24 animate-pulse rounded bg-gray-200" />
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="h-3 w-full animate-pulse rounded bg-gray-100" />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Grid skeleton */}
          <div className="flex-1">
            <div className="mb-4 flex items-center justify-between">
              <div className="h-3 w-32 animate-pulse rounded bg-gray-100" />
              <div className="h-8 w-36 animate-pulse rounded bg-gray-100" />
            </div>
            <div className="grid grid-cols-2 gap-px bg-gray-200 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="bg-white p-2">
                  <div
                    className="mb-3 aspect-3/4 animate-pulse bg-gray-100"
                    style={{ animationDelay: `${i * 40}ms` }}
                  />
                  <div className="mb-2 h-3 w-3/4 animate-pulse rounded bg-gray-200" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

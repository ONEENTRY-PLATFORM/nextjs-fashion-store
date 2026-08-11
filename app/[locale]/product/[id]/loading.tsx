export default function ProductLoading() {
  return (
    // Content column only — the header lives in the root layout and is not
    // replaced during a navigation.
    <div className="flex-1 bg-white" style={{ fontFamily: 'Inter, sans-serif' }} data-testid="route-loading">
      <div className="px-4 py-6 lg:px-8 lg:py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row lg:gap-14">
          {/* Gallery skeleton */}
          <div className="w-full lg:w-[55%]">
            <div className="mb-3 aspect-4/5 animate-pulse bg-gray-100" />
            <div className="flex gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 w-16 animate-pulse bg-gray-100"
                  style={{ animationDelay: `${i * 50}ms` }}
                />
              ))}
            </div>
          </div>

          {/* Info skeleton */}
          <div className="w-full space-y-4 lg:w-[45%]">
            <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />
            <div className="h-7 w-3/4 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-32 animate-pulse rounded bg-gray-100" />
            <div className="mt-2 h-8 w-28 animate-pulse rounded bg-gray-200" />

            {/* Colors */}
            <div className="flex gap-2 pt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="size-8 animate-pulse rounded-full bg-gray-200" />
              ))}
            </div>

            {/* Sizes */}
            <div className="flex gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 w-12 animate-pulse rounded bg-gray-100" />
              ))}
            </div>

            {/* Buttons */}
            <div className="mt-4 h-14 animate-pulse rounded-lg bg-gray-200" />
            <div className="h-14 animate-pulse rounded-lg bg-gray-100" />
          </div>
        </div>
      </div>
    </div>
  );
}

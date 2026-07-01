export default function ProductLoading() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="h-[132px] bg-gray-100 animate-pulse" />

      <div className="px-4 lg:px-8 py-6 lg:py-10">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-14 max-w-screen-xl mx-auto">

          {/* Gallery skeleton */}
          <div className="w-full lg:w-[55%]">
            <div className="aspect-[4/5] bg-gray-100 animate-pulse mb-3" />
            <div className="flex gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="w-16 h-20 bg-gray-100 animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
              ))}
            </div>
          </div>

          {/* Info skeleton */}
          <div className="w-full lg:w-[45%] space-y-4">
            <div className="h-3 w-24 bg-gray-200 animate-pulse rounded" />
            <div className="h-7 w-3/4 bg-gray-200 animate-pulse rounded" />
            <div className="h-3 w-32 bg-gray-100 animate-pulse rounded" />
            <div className="h-8 w-28 bg-gray-200 animate-pulse rounded mt-2" />

            {/* Colors */}
            <div className="flex gap-2 pt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="w-8 h-8 bg-gray-200 animate-pulse rounded-full" />
              ))}
            </div>

            {/* Sizes */}
            <div className="flex gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="w-12 h-10 bg-gray-100 animate-pulse rounded" />
              ))}
            </div>

            {/* Buttons */}
            <div className="h-14 bg-gray-200 animate-pulse rounded-lg mt-4" />
            <div className="h-14 bg-gray-100 animate-pulse rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

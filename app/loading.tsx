export default function Loading() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header skeleton */}
      <div className="h-[132px] bg-gray-100 animate-pulse" />

      {/* Content skeleton */}
      <div className="max-w-screen-xl mx-auto px-4 lg:px-8 py-10">
        <div className="h-6 w-48 bg-gray-200 animate-pulse rounded mb-8" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-px bg-gray-200">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white p-2">
              <div className="aspect-[3/4] bg-gray-100 animate-pulse mb-3" style={{ animationDelay: `${i * 60}ms` }} />
              <div className="h-3 bg-gray-200 animate-pulse rounded mb-2 w-3/4" style={{ animationDelay: `${i * 60}ms` }} />
              <div className="h-3 bg-gray-100 animate-pulse rounded w-1/2" style={{ animationDelay: `${i * 60}ms` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

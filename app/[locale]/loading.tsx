export default function Loading() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header skeleton */}
      <div className="h-33 animate-pulse bg-gray-100" />

      {/* Content skeleton */}
      <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
        <div className="mb-8 h-6 w-48 animate-pulse rounded bg-gray-200" />
        <div className="grid grid-cols-2 gap-px bg-gray-200 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white p-2">
              <div className="mb-3 aspect-3/4 animate-pulse bg-gray-100" style={{ animationDelay: `${i * 60}ms` }} />
              <div
                className="mb-2 h-3 w-3/4 animate-pulse rounded bg-gray-200"
                style={{ animationDelay: `${i * 60}ms` }}
              />
              <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" style={{ animationDelay: `${i * 60}ms` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

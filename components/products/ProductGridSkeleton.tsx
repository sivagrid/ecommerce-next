export function ProductGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card overflow-hidden">
          <div className="aspect-square shimmer bg-gray-200" />
          <div className="p-4 space-y-3">
            <div className="h-3 w-1/3 shimmer rounded bg-gray-200" />
            <div className="h-4 w-3/4 shimmer rounded bg-gray-200" />
            <div className="h-3 w-1/2 shimmer rounded bg-gray-200" />
            <div className="h-5 w-1/4 shimmer rounded bg-gray-200" />
            <div className="h-9 w-full shimmer rounded-lg bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

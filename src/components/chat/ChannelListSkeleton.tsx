export function ChannelListSkeleton() {
  return (
    <div className="px-2">
      <div className="px-4 mb-2 flex items-center justify-between">
        <div className="h-4 w-24 bg-gray-700 rounded animate-pulse" />
        <div className="h-6 w-6 bg-gray-700 rounded animate-pulse" />
      </div>

      <div className="space-y-1">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="px-2">
            <div className="flex items-center gap-2 px-2 py-1.5">
              <div className="h-4 w-4 bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-32 bg-gray-700 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 
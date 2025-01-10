export default function Loading() {
  return (
    <div className="flex flex-col h-full">
      {/* Header skeleton */}
      <div className="px-6 py-4 border-b flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
        <div className="flex-1">
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>

      {/* Message area skeleton */}
      <div className="flex-1 p-6">
        <div className="max-w-sm mx-auto">
          <div className="h-4 bg-gray-200 rounded animate-pulse mb-3" />
          <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    </div>
  )
} 
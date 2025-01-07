export function ChatLoading() {
  return (
    <div className="p-6 space-y-4">
      {/* Channel name skeleton */}
      <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
      
      {/* Message skeletons */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white p-4 rounded-lg shadow-sm space-y-2">
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
      ))}
    </div>
  )
} 
export function ChannelPageSkeleton() {
  return (
    <div className="flex h-full w-full [--header-height:73px]">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex-shrink-0 h-[--header-height]">
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
        </div>

        {/* Message List */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 p-6 space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                {/* Avatar */}
                <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
                
                <div className="flex-1">
                  {/* Username and timestamp */}
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
                  </div>
                  
                  {/* Message content */}
                  <div className="space-y-2">
                    <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Message Input */}
          <div className="flex-shrink-0 border-t p-4">
            <div className="h-10 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  )
} 
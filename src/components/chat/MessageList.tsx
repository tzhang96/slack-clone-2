'use client'

import { useAuth } from '@/lib/auth'
import { VariableSizeList, ListChildComponentProps, areEqual } from 'react-window'
import { useRef, useEffect, memo, useState, useCallback } from 'react'
import { Message, MessageRowData } from '@/types/chat'

interface MessageListProps {
  messages: Message[]
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  onLoadMore: () => void
}

const MessageRow = memo(({ data, index, style }: ListChildComponentProps<MessageRowData>) => {
  const { messages, currentUserId } = data
  const message = messages[index]
  const messageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messageRef.current) {
      const height = messageRef.current.getBoundingClientRect().height
      data.setSize(index, height + 2)
    }
  }, [message.content, index, data])

  return (
    <div style={style}>
      <div className="py-[1px]">
        <div ref={messageRef} className="px-6 py-0.5 hover:bg-gray-100 transition-colors duration-100">
          <div className="flex items-start gap-x-2">
            <div className="w-8 h-8 rounded bg-gray-200 flex-shrink-0 flex items-center justify-center text-gray-500 text-sm font-medium uppercase">
              {message.user.fullName.charAt(0)}
            </div>
            
            <div className="flex-1 min-w-0 pr-8">
              <div className="flex items-baseline gap-x-2">
                <span className="font-bold text-gray-900">
                  {message.user.fullName}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(message.createdAt).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </span>
              </div>
              <div className="text-gray-900 whitespace-pre-wrap break-words">
                {message.content}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}, areEqual)

export function MessageList({ 
  messages, 
  isLoading, 
  isLoadingMore, 
  hasMore, 
  onLoadMore 
}: MessageListProps) {
  const { user } = useAuth()
  const listRef = useRef<VariableSizeList>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const sizeMap = useRef<{[key: number]: number}>({})
  const [containerHeight, setContainerHeight] = useState(0)
  const [isNearTop, setIsNearTop] = useState(false)
  const prevMessagesLength = useRef(messages.length)
  const scrollOffsetRef = useRef<number>(0)
  const isLoadingMoreRef = useRef(isLoadingMore)
  const pendingScrollRef = useRef<number | null>(null)
  const pendingSizesRef = useRef<Set<number>>(new Set())
  const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isResettingRef = useRef(false)

  // Update loading ref when prop changes
  useEffect(() => {
    isLoadingMoreRef.current = isLoadingMore
  }, [isLoadingMore])

  // Update container height when window resizes
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.offsetHeight)
      }
    }

    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

  const getSize = (index: number) => {
    return sizeMap.current[index] || 56 // Reduced default height to match compact layout
  }

  // Handle scroll events
  const handleScroll = useCallback(({ scrollOffset, scrollDirection }: { scrollOffset: number, scrollDirection: 'forward' | 'backward' }) => {
    // Don't update scroll position during size resets
    if (isResettingRef.current) return

    scrollOffsetRef.current = scrollOffset

    // Check if we're near the top (for loading more)
    const isNearTopNow = scrollOffset < 1000
    setIsNearTop(isNearTopNow)

    // Load more if we're near the top and not already loading
    if (isNearTopNow && hasMore && !isLoadingMore) {
      onLoadMore()
    }
  }, [hasMore, isLoadingMore, onLoadMore])

  const setSize = (index: number, size: number) => {
    const prevSize = sizeMap.current[index]
    
    // If size hasn't changed, do nothing
    if (prevSize === size) return
    
    // Update size in map
    sizeMap.current[index] = size

    // Only batch updates and force resets during pagination
    if (isLoadingMoreRef.current) {
      pendingSizesRef.current.add(index)

      // Clear existing timeout
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current)
      }

      // Set new timeout to batch process all size updates
      resetTimeoutRef.current = setTimeout(() => {
        if (listRef.current && pendingSizesRef.current.size > 0) {
          isResettingRef.current = true
          
          // Force a single reset after all sizes are collected
          listRef.current.resetAfterIndex(0, true)
          pendingSizesRef.current.clear()

          // Adjust scroll position after sizes are updated
          requestAnimationFrame(() => {
            if (pendingScrollRef.current !== null && listRef.current) {
              listRef.current.scrollTo(pendingScrollRef.current)
              pendingScrollRef.current = null
            }
            isResettingRef.current = false
          })
        }
      }, 32)
    }
    // During normal scrolling, just let React-Window use getSize naturally
    // No need to force any resets
  }

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current)
      }
    }
  }, [])

  // Handle message updates
  useEffect(() => {
    if (!listRef.current) return

    const messageCountDiff = messages.length - prevMessagesLength.current

    if (messageCountDiff > 0) {
      if (isLoadingMoreRef.current) {
        // Calculate total height of existing messages
        const existingHeight = messages.slice(messageCountDiff).reduce((total, _, index) => {
          return total + getSize(index)
        }, 0)

        // Store target scroll position based on actual heights
        pendingScrollRef.current = existingHeight
      } else {
        // If these are new messages, scroll to bottom immediately
        listRef.current.scrollToItem(messages.length - 1, 'end')
      }
    }

    prevMessagesLength.current = messages.length
  }, [messages.length])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading messages...</div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="h-full relative">
      {isLoadingMore && (
        <div className="absolute top-0 left-0 right-0 p-2 text-center bg-gray-100 z-10">
          Loading more messages...
        </div>
      )}
      
      {/* @ts-ignore */}
      <VariableSizeList<MessageRowData>
        ref={listRef}
        height={containerHeight}
        width="100%"
        itemCount={messages.length}
        itemSize={getSize}
        onScroll={handleScroll}
        itemData={{
          messages,
          currentUserId: user?.id,
          setSize
        }}
      >
        {/* @ts-ignore */}
        {MessageRow}
      </VariableSizeList>

      {hasMore && !isLoadingMore && (
        <div className="absolute top-0 left-0 right-0 p-2 text-center text-gray-500 text-sm">
          Scroll up to load more messages
        </div>
      )}
    </div>
  )
} 
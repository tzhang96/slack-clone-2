'use client'

import { useAuth } from '@/lib/auth'
import { VariableSizeList, ListChildComponentProps, areEqual } from 'react-window'
import { useRef, useEffect, memo, useState, useCallback } from 'react'
import { Message, MessageRowData } from '@/types/chat'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { MessageReactions } from '@/components/shared/MessageReactions'
import { EmojiPicker } from '@/components/shared/EmojiPicker'
import { useReactionMutations } from '@/hooks/useReactionMutations'
import { FilePreview } from '@/components/shared/FilePreview'

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
  const { toggleReaction, isLoading: isMutating } = useReactionMutations()
  const [imageLoaded, setImageLoaded] = useState(false)

  const updateHeight = useCallback(() => {
    if (messageRef.current) {
      const height = messageRef.current.getBoundingClientRect().height
      data.setSize(index, height + 2)
    }
  }, [data, index])

  // Update height when content or file changes
  useEffect(() => {
    updateHeight()
  }, [message.content, message.file, imageLoaded, updateHeight])

  // Update height when window resizes
  useEffect(() => {
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [updateHeight])

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true)
  }, [])

  return (
    <div style={style}>
      <div className="py-[1px]">
        <div ref={messageRef} className="group px-6 py-0.5 hover:bg-gray-100 transition-colors duration-100">
          <div className="flex items-start gap-x-2">
            <UserAvatar 
              userId={message.user.id} 
              name={message.user.fullName} 
              lastSeen={message.user.lastSeen}
              showStatus={false}
            />
            
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
              {message.content && (
                <div className="text-gray-900 whitespace-pre-wrap break-words">
                  {message.content}
                </div>
              )}
              {message.file && (
                <div className="mt-2">
                  <FilePreview file={message.file} onImageLoad={handleImageLoad} />
                </div>
              )}
              <div className="mt-0.5 flex items-center gap-2">
                <MessageReactions messageId={message.id} />
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <EmojiPicker
                    onEmojiSelect={(emoji) => toggleReaction(message.id, emoji)}
                    disabled={isMutating}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}, areEqual)

const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
  </div>
)

const LoadingBanner = ({ children }: { children: React.ReactNode }) => (
  <div className="sticky top-0 left-0 right-0 p-2 text-center text-sm bg-white/90 backdrop-blur-sm z-10">
    {children}
  </div>
)

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
  const isLoadingMoreRef = useRef(isLoadingMore)
  const prevMessagesLength = useRef(messages.length)

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
    return sizeMap.current[index] || 56
  }

  const setSize = (index: number, size: number) => {
    const prevSize = sizeMap.current[index]
    if (prevSize === size) return
    
    sizeMap.current[index] = size
    
    if (listRef.current) {
      listRef.current.resetAfterIndex(index)
    }
  }

  const handleScroll = useCallback(({ scrollOffset }: { scrollOffset: number, scrollDirection: 'forward' | 'backward' }) => {
    if (scrollOffset < 1000 && hasMore && !isLoadingMore) {
      onLoadMore()
    }
  }, [hasMore, isLoadingMore, onLoadMore])

  useEffect(() => {
    if (!listRef.current) return

    const messageCountDiff = messages.length - prevMessagesLength.current

    if (messageCountDiff > 0) {
      if (isLoadingMoreRef.current) {
        listRef.current.scrollToItem(messageCountDiff, 'smart')
      } else {
        listRef.current.scrollToItem(messages.length - 1, 'end')
      }
    }

    prevMessagesLength.current = messages.length
  }, [messages.length])

  if (isLoading) {
    return <LoadingSpinner />
  }

  return (
    <div ref={containerRef} className="h-full overflow-hidden">
      {isLoadingMore && (
        <LoadingBanner>Loading more messages...</LoadingBanner>
      )}
      
      <VariableSizeList
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
        overscanCount={5}
      >
        {MessageRow}
      </VariableSizeList>

      {hasMore && !isLoadingMore && (
        <LoadingBanner>Scroll up to load more messages</LoadingBanner>
      )}
    </div>
  )
} 
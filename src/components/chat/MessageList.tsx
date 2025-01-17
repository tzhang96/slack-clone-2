'use client'

import { useAuth } from '@/lib/auth'
import { VariableSizeList, ListChildComponentProps, areEqual } from 'react-window'
import { useRef, useEffect, memo, useState, useCallback, useImperativeHandle, forwardRef } from 'react'
import { Message } from '@/types/chat'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { MessageReactions } from '@/components/shared/MessageReactions'
import { EmojiPicker } from '@/components/shared/EmojiPicker'
import { useReactionMutations } from '@/hooks/useReactionMutations'
import { FilePreview } from '@/components/shared/FilePreview'
import { ThreadPreview } from '@/components/thread/ThreadPreview'
import { MessageCircle } from 'lucide-react'

interface MessageListProps {
  messages: Message[]
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  onLoadMore: () => void
  context?: 'channel' | 'dm' | 'thread'
  onThreadClick?: (message: Message) => void
}

export interface MessageListHandle {
  scrollToMessage: (messageId: string) => void
}

interface MessageRowData {
  messages: Message[]
  currentUserId?: string
  setSize: (index: number, size: number) => void
  onThreadClick?: (message: Message) => void
  context: 'channel' | 'dm' | 'thread'
}

interface MessageRowProps {
  index: number
  style: React.CSSProperties
  data: MessageRowData
  onThreadClick: ((message: Message) => void) | null
}

const MessageRow = memo(function MessageRow({ data, index, style }: ListChildComponentProps<MessageRowData>) {
  const { messages, currentUserId, onThreadClick, context } = data
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
        <div 
          ref={messageRef} 
          data-message-id={message.id}
          className="group px-6 py-0.5 hover:bg-gray-50 transition-colors duration-100"
        >
          <div className="flex items-start gap-x-2">
            <UserAvatar 
              userId={message.user.id} 
              name={message.user.fullName} 
              lastSeen={message.user.lastSeen || undefined}
              size="sm"
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
                <div className="flex items-center gap-2">
                  {context !== 'thread' && (!message.replyCount || message.replyCount === 0) && (
                    <button
                      onClick={() => onThreadClick?.(message)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm py-1 px-2 rounded hover:bg-gray-100"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Reply in Thread</span>
                    </button>
                  )}
                  {message.replyCount ? (
                    <ThreadPreview
                      messageId={message.id}
                      replyCount={message.replyCount}
                      participants={message.threadParticipants?.map(p => ({
                        id: p.id,
                        username: p.user?.username || 'Unknown',
                        fullName: p.user?.fullName || 'Unknown User',
                        lastSeen: p.user?.lastSeen || undefined
                      })) || []}
                      onClick={() => onThreadClick?.(message)}
                    />
                  ) : null}
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
    </div>
  )
}, areEqual)

MessageRow.displayName = 'MessageRow'

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

export const MessageList = forwardRef<MessageListHandle, MessageListProps>(({
  messages, 
  isLoading, 
  isLoadingMore,
  hasMore,
  onLoadMore,
  context = 'channel',
  onThreadClick
}, ref) => {
  const { user } = useAuth()
  const listRef = useRef<VariableSizeList>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const sizeMap = useRef<{[key: number]: number}>({})
  const [containerHeight, setContainerHeight] = useState(0)
  const isLoadingMoreRef = useRef(isLoadingMore)
  const prevMessagesLength = useRef(messages.length)

  // Add method to scroll to message by ID
  const scrollToMessage = useCallback((messageId: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex !== -1 && listRef.current) {
      listRef.current.scrollToItem(messageIndex, 'center');
      
      // Add highlight effect
      requestAnimationFrame(() => {
        const messageElement = containerRef.current?.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
          messageElement.classList.add('highlight-message');
          messageElement.addEventListener('animationend', () => {
            messageElement.classList.remove('highlight-message');
          }, { once: true });
        }
      });
    }
  }, [messages]);

  // Expose scrollToMessage method to parent
  useImperativeHandle(ref, () => ({
    scrollToMessage
  }), [scrollToMessage]);

  useEffect(() => {
    console.log('MessageList received messages:', messages)
    console.log('MessageList state:', {
      isLoading,
      isLoadingMore,
      hasMore,
      containerHeight,
      messageCount: messages.length
    })
  }, [messages, isLoading, isLoadingMore, hasMore, containerHeight])

  // Update loading ref when prop changes
  useEffect(() => {
    isLoadingMoreRef.current = isLoadingMore
  }, [isLoadingMore])

  // Update container height when component mounts and on resize
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const height = containerRef.current.getBoundingClientRect().height
        console.log('Container height calculation:', {
          offsetHeight: containerRef.current.offsetHeight,
          clientHeight: containerRef.current.clientHeight,
          boundingHeight: height
        })
        if (height > 0) {
          setContainerHeight(height)
        }
      }
    }

    // Initial update
    updateHeight()

    // Update after a short delay to ensure layout is complete
    const timeoutId = setTimeout(updateHeight, 100)

    // Update on resize
    window.addEventListener('resize', updateHeight)

    // Cleanup
    return () => {
      window.removeEventListener('resize', updateHeight)
      clearTimeout(timeoutId)
    }
  }, [])

  // Force height update when messages change
  useEffect(() => {
    if (containerRef.current) {
      const height = containerRef.current.getBoundingClientRect().height
      if (height > 0) {
        setContainerHeight(height)
      }
    }
  }, [messages])

  const getSize = (index: number) => {
    return sizeMap.current[index] || 56
  }

  const setSize = (index: number, size: number) => {
    const prevSize = sizeMap.current[index]
    sizeMap.current[index] = size
    if (prevSize !== size && listRef.current) {
      console.log(`Updating size for message ${index}: ${prevSize} -> ${size}`)
      listRef.current.resetAfterIndex(index)
    }
  }

  const handleScroll = useCallback(({ scrollOffset, scrollDirection }: { scrollOffset: number, scrollDirection: 'forward' | 'backward' }) => {
    console.log('Scroll event:', { scrollOffset, scrollDirection, hasMore, isLoadingMore: isLoadingMoreRef.current })
    if (scrollDirection === 'backward' && scrollOffset === 0 && !isLoadingMoreRef.current && hasMore && onLoadMore) {
      onLoadMore()
    }
  }, [hasMore, onLoadMore])

  if (isLoading) {
    console.log('MessageList showing loading spinner')
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  if (!messages.length) {
    console.log('MessageList showing empty state')
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-gray-600">
          No messages yet
        </span>
      </div>
    )
  }

  // Don't render the list until we have a valid height
  if (containerHeight === 0) {
    return (
      <div ref={containerRef} className="h-full overflow-hidden flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  console.log('MessageList rendering message list with height:', containerHeight)
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
          currentUserId: user?.id || undefined,
          setSize,
          onThreadClick: onThreadClick || undefined,
          context
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
})

MessageList.displayName = 'MessageList' 
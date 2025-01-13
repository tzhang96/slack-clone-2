import { useEffect, useRef } from 'react'
import { MessageList } from '@/components/chat/MessageList'
import { MessageInput } from '@/components/chat/MessageInput'
import { useUnifiedMessages } from '@/hooks/useUnifiedMessages'
import { Message } from '@/types/chat'
import { FileMetadata } from '@/hooks/useFileUpload'

interface DMChatProps {
  conversationId: string
  activeThread: Message | null
  onThreadClick: (message: Message) => void
  onCloseThread: () => void
}

export function DMChat({ 
  conversationId, 
  activeThread,
  onThreadClick,
  onCloseThread 
}: DMChatProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const {
    messages,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    sendMessage,
    loadMore,
    handleMessagesChange,
    isAtBottom,
    checkIsAtBottom,
    scrollToBottom,
  } = useUnifiedMessages({
    type: 'dm',
    id: conversationId,
    enabled: !!conversationId
  })

  // Handle message changes and scrolling
  useEffect(() => {
    if (!conversationId) return;
    handleMessagesChange(containerRef.current, messages)
  }, [messages, handleMessagesChange, conversationId])

  const handleSendMessage = async (content: string, file: FileMetadata | null = null) => {
    try {
      await sendMessage(content, file)
      // Scroll to bottom after sending
      if (containerRef.current) {
        scrollToBottom(containerRef.current, true)
      }
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  return (
    <div className="flex h-full w-full">
      <div className="flex-1 flex flex-col">
        <div className="flex-1 min-h-0 flex flex-col relative" ref={containerRef}>
          <div className="absolute inset-0 flex flex-col">
            <div className="flex-1 min-h-0">
              <MessageList
                messages={messages}
                isLoading={isLoading}
                isLoadingMore={isLoadingMore}
                hasMore={hasMore}
                onLoadMore={loadMore}
                context="dm"
                onThreadClick={onThreadClick}
              />
            </div>
            <div className="flex-shrink-0 bg-white border-t">
              <MessageInput
                onSend={handleSendMessage}
                context="dm"
                placeholder="Message"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 
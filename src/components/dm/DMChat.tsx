import { useEffect, useRef } from 'react'
import { MessageList } from '@/components/chat/MessageList'
import { MessageInput } from '@/components/chat/MessageInput'
import { useDMMessages } from '@/hooks/useDMMessages'

interface DMChatProps {
  conversationId: string
}

export function DMChat({ conversationId }: DMChatProps) {
  const {
    messages,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMoreMessages,
    sendMessage
  } = useDMMessages(conversationId)

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    console.log('DMChat messages:', messages)
  }, [messages])

  // Handle scroll to load more messages
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      if (container.scrollTop === 0 && !isLoadingMore && hasMore) {
        console.log('Loading more messages...')
        loadMoreMessages()
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [isLoadingMore, hasMore, loadMoreMessages])

  const handleSendMessage = async (content: string, file?: any) => {
    try {
      console.log('Sending message in DMChat:', { content, file })
      await sendMessage(content, file)
    } catch (error) {
      console.error('Error sending message in DMChat:', error)
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
    <div className="flex flex-col h-full">
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto"
      >
        <MessageList
          messages={messages}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          hasMore={hasMore}
          onLoadMore={loadMoreMessages}
          context="dm"
        />
      </div>
      <div className="flex-shrink-0 p-4 border-t">
        <MessageInput
          onSend={handleSendMessage}
          context="dm"
          placeholder="Message"
        />
      </div>
    </div>
  )
} 
import { useEffect, useRef, useState } from 'react'
import { MessageList } from '@/components/chat/MessageList'
import { MessageInput } from '@/components/chat/MessageInput'
import { useUnifiedMessages } from '@/hooks/useUnifiedMessages'
import { ThreadSidebar } from '@/components/thread/ThreadSidebar'
import { Message } from '@/types/chat'
import { FileMetadata } from '@/hooks/useFileUpload'

interface DMChatProps {
  conversationId: string
}

export function DMChat({ conversationId }: DMChatProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeThread, setActiveThread] = useState<Message | null>(null)

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
    scrollToBottom
  } = useUnifiedMessages({
    type: 'dm',
    id: conversationId
  })

  useEffect(() => {
    console.log('DMChat messages:', messages)
  }, [messages])

  // Handle message changes and scrolling
  useEffect(() => {
    if (!conversationId) {
      console.log('No conversation ID, skipping message changes')
      return
    }
    console.log('Handling message changes:', {
      containerRef: !!containerRef.current,
      messageCount: messages.length
    })
    handleMessagesChange(containerRef.current, messages)
  }, [messages, handleMessagesChange, conversationId])

  const handleSendMessage = async (content: string, file: FileMetadata | null) => {
    try {
      console.log('Sending message in DMChat:', { content, file })
      await sendMessage(content, file)
      // Scroll to bottom after sending
      if (containerRef.current) {
        scrollToBottom(containerRef.current, true)
      }
    } catch (error) {
      console.error('Error sending message in DMChat:', error)
    }
  }

  const handleThreadClick = (message: Message) => {
    console.log('Opening thread for message:', message)
    setActiveThread(message)
  }

  const handleCloseThread = () => {
    console.log('Closing thread')
    setActiveThread(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  return (
    <div className="flex h-full">
      <div className={`flex-1 flex flex-col ${activeThread ? 'lg:mr-[400px]' : ''}`}>
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
                onThreadClick={handleThreadClick}
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

      {/* Thread Sidebar */}
      {activeThread && (
        <div className="hidden lg:block fixed top-0 right-0 bottom-0 w-[400px] border-l">
          <ThreadSidebar
            parentMessage={activeThread}
            onClose={handleCloseThread}
          />
        </div>
      )}

      {/* Mobile Thread View */}
      {activeThread && (
        <div className="lg:hidden fixed inset-0 bg-white z-50">
          <ThreadSidebar
            parentMessage={activeThread}
            onClose={handleCloseThread}
          />
        </div>
      )}
    </div>
  )
} 
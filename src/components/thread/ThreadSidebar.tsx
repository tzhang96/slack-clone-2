import { useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import { Message } from '@/types/chat'
import { MessageList } from '@/components/chat/MessageList'
import { MessageInput } from '@/components/chat/MessageInput'
import { useUnifiedMessages } from '@/hooks/useUnifiedMessages'
import { FileMetadata } from '@/hooks/useFileUpload'

interface ThreadSidebarProps {
  parentMessage: Message
  onClose: () => void
}

export function ThreadSidebar({ parentMessage, onClose }: ThreadSidebarProps) {
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
    jumpToMessage
  } = useUnifiedMessages({
    type: 'thread',
    id: parentMessage.id,
    parentMessage: {
      channelId: parentMessage.channelId,
      conversationId: parentMessage.conversationId
    },
    enabled: true
  })

  // Handle message changes and scrolling
  useEffect(() => {
    handleMessagesChange(containerRef.current, messages)
  }, [messages, handleMessagesChange])

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

  return (
    <div className="flex flex-col h-full">
      {/* Thread header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="text-lg font-semibold">Thread</h2>
        <button
          onClick={onClose}
          className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          aria-label="Close thread"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Parent message */}
      <div className="px-4 py-3 border-b bg-gray-50">
        <div className="text-sm text-gray-500 mb-1">
          {parentMessage.user.fullName} started a thread
        </div>
        <div className="text-gray-900 whitespace-pre-wrap break-words">
          {parentMessage.content}
        </div>
      </div>

      {/* Thread messages */}
      <div className="flex-1 min-h-0 flex flex-col relative" ref={containerRef}>
        <div className="absolute inset-0 flex flex-col">
          <div className="flex-1 min-h-0">
            <MessageList
              messages={messages}
              isLoading={isLoading}
              isLoadingMore={isLoadingMore}
              hasMore={hasMore}
              onLoadMore={loadMore}
              context="thread"
            />
          </div>
          <div className="flex-shrink-0 bg-white border-t">
            <MessageInput
              onSend={handleSendMessage}
              context="thread"
              placeholder="Reply in thread"
            />
          </div>
        </div>
      </div>
    </div>
  )
} 
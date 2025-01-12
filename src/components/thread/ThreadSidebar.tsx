import { useUnifiedMessages } from '@/hooks/useUnifiedMessages'
import { ThreadHeader } from './ThreadHeader'
import { MessageList } from '../chat/MessageList'
import { ThreadMessageInput } from './ThreadMessageInput'
import { FileMetadata } from '@/hooks/useFileUpload'
import { Message } from '@/types/chat'

interface ThreadSidebarProps {
  parentMessage: Message
  onClose: () => void
}

export function ThreadSidebar({ parentMessage, onClose }: ThreadSidebarProps) {
  const {
    messages,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    sendMessage,
  } = useUnifiedMessages({
    type: 'thread',
    id: parentMessage.id,
    parentMessage: {
      channelId: parentMessage.channelId,
      conversationId: parentMessage.conversationId,
    },
  })

  const handleSendMessage = async (content: string, file: FileMetadata | null) => {
    await sendMessage(content, file)
  }

  return (
    <div className="flex flex-col h-full border-l bg-white">
      <ThreadHeader parentMessage={parentMessage} onClose={onClose} />
      
      <div className="flex-1 overflow-hidden">
        <MessageList
          messages={messages}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          hasMore={hasMore}
          onLoadMore={loadMore}
          context="thread"
        />
      </div>

      <ThreadMessageInput
        onSend={handleSendMessage}
        disabled={isLoading}
      />
    </div>
  )
} 
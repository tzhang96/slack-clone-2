import { Message } from '@/types/chat'
import { MessageList } from '../chat/MessageList'

interface ThreadMessageListProps {
  messages: Message[]
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  onLoadMore: (() => void) | null
}

export function ThreadMessageList({
  messages,
  isLoading,
  isLoadingMore,
  hasMore,
  onLoadMore = null
}: ThreadMessageListProps) {
  return (
    <div className="flex-1 min-h-0">
      <MessageList
        messages={messages}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        onLoadMore={onLoadMore || undefined}
        context="thread"
      />
    </div>
  )
} 
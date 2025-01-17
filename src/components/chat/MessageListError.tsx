import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { MessageList } from './MessageList'
import type { Message } from '@/types/chat'

interface MessageListProps {
  messages: Message[]
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  onLoadMore: () => void
  context: 'channel' | 'dm' | 'thread'
  onThreadClick?: (message: Message) => void
}

export function MessageListWithError(props: MessageListProps) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-red-600 mb-2">
              Failed to load messages
            </h3>
            <p className="text-sm text-gray-600">
              There was an error loading messages. Please try refreshing the page.
            </p>
          </div>
        </div>
      }
    >
      <MessageList {...props} />
    </ErrorBoundary>
  )
} 
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { MessageListWithError } from '@/components/chat/MessageListError'
import { MessageInput } from '@/components/chat/MessageInput'
import { useUnifiedMessages } from '@/hooks/useUnifiedMessages'
import { useChannelContext } from '@/components/providers/ChannelProvider'
import { ThreadSidebar } from '@/components/thread/ThreadSidebar'
import { Message } from '@/types/chat'
import { FileMetadata } from '@/hooks/useFileUpload'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { LoadingState } from '@/components/shared/LoadingSpinner'
import { ChannelPageSkeleton } from '@/components/chat/ChannelPageSkeleton'

interface ChannelPageProps {
  params: {
    channelId: string
  }
}

function ChannelPageContent({ params }: ChannelPageProps) {
  const router = useRouter()
  const { getChannelByName, isLoading: isLoadingChannel } = useChannelContext()
  const channel = getChannelByName(params.channelId)
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeThread, setActiveThread] = useState<Message | null>(null)

  const { 
    messages, 
    isLoading: isLoadingMessages, 
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
    type: 'channel',
    id: channel?.id,
    parentMessage: null,
    enabled: !isLoadingChannel && !!channel
  })

  // Extract message ID from URL hash and thread parameter
  useEffect(() => {
    if (isLoadingChannel || !channel) return;

    const searchParams = new URLSearchParams(window.location.search);
    const shouldOpenThread = searchParams.get('thread') === 'true';
    const messageId = window.location.hash.replace('#message-', '');

    // If there's no thread parameter, ensure thread is closed
    if (!shouldOpenThread && activeThread) {
      setActiveThread(null);
      return;
    }

    if (!messageId) return;

    // Find the message in the current messages array
    const targetMessage = messages.find(m => m.id === messageId);
    
    if (targetMessage && shouldOpenThread && !activeThread) {
      setActiveThread(targetMessage);
    }
    
    if (containerRef.current) {
      jumpToMessage(messageId, containerRef.current);
    }
  }, [channel, isLoadingChannel, jumpToMessage, messages, setActiveThread, activeThread]);

  // Redirect to general if channel doesn't exist
  useEffect(() => {
    if (!isLoadingChannel && !channel) {
      router.replace('/chat/general')
    }
  }, [channel, isLoadingChannel, router])

  // Handle message changes and scrolling
  useEffect(() => {
    if (!channel?.id) return;
    handleMessagesChange(containerRef.current, messages)
  }, [messages, handleMessagesChange, channel?.id, isAtBottom])

  const handleSendMessage = async (content: string, file: FileMetadata | null = null) => {
    try {
      await sendMessage(content, file ?? null)
      // Scroll to bottom after sending
      if (containerRef.current) {
        scrollToBottom(containerRef.current, true)
      }
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleThreadClick = (message: Message) => {
    router.replace(`/chat/${params.channelId}?thread=true#message-${message.id}`);
  }

  const handleCloseThread = useCallback(() => {
    router.replace(`/chat/${params.channelId}`);
  }, [router, params.channelId]);

  if (isLoadingChannel) {
    return <ChannelPageSkeleton />
  }

  if (!channel) {
    return null // Let the redirect effect handle this case
  }

  return (
    <div className="flex h-full w-full [--header-height:73px] [--thread-width:400px]">
      <div className={`flex-1 flex flex-col ${activeThread ? 'lg:mr-[--thread-width]' : ''}`}>
        <div className="px-6 py-4 border-b flex-shrink-0 h-[--header-height]">
          <h1 className="text-xl font-semibold">#{channel.name}</h1>
          <p className="text-sm text-gray-500">{channel.description}</p>
        </div>
        
        <div className="flex-1 min-h-0 flex flex-col relative" ref={containerRef}>
          <div className="absolute inset-0 flex flex-col">
            <div className="flex-1 min-h-0">
              <MessageListWithError
                messages={messages}
                isLoading={isLoadingMessages}
                isLoadingMore={isLoadingMore}
                hasMore={hasMore}
                onLoadMore={loadMore}
                onThreadClick={handleThreadClick}
                context="channel"
              />
            </div>
            <div className="flex-shrink-0 bg-white border-t">
              <MessageInput
                onSend={handleSendMessage}
                context="channel"
                placeholder="Message"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Thread Sidebar - Responsive */}
      {activeThread && (
        <div className="fixed inset-0 bg-white z-50 lg:w-[--thread-width] lg:right-0 lg:left-auto lg:border-l lg:top-[--header-height]">
          <ErrorBoundary
            fallback={
              <div className="p-4 text-red-600">
                Failed to load thread. Please try closing and reopening it.
              </div>
            }
          >
            <ThreadSidebar
              parentMessage={activeThread}
              onClose={handleCloseThread}
            />
          </ErrorBoundary>
        </div>
      )}
    </div>
  )
}

export default function ChannelPage(props: ChannelPageProps) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-red-600 mb-2">
              Failed to load channel
            </h3>
            <p className="text-sm text-gray-600">
              There was an error loading this channel. Please try refreshing the page.
            </p>
          </div>
        </div>
      }
    >
      <ChannelPageContent {...props} />
    </ErrorBoundary>
  )
} 
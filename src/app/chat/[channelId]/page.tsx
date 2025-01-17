'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useChannelContext } from '@/components/providers/ChannelProvider'
import { ThreadSidebar } from '@/components/thread/ThreadSidebar'
import { Message } from '@/types/chat'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { ChannelPageSkeleton } from '@/components/chat/ChannelPageSkeleton'
import { ChannelChat, ChannelChatHandle } from '@/components/chat/ChannelChat'
import { useUnifiedMessages } from '@/hooks/useUnifiedMessages'

interface ChannelPageProps {
  params: {
    channelId: string
  }
}

function ChannelPageContent({ params }: ChannelPageProps) {
  const router = useRouter()
  const { getChannelByName, isLoading: isLoadingChannel } = useChannelContext()
  const channel = getChannelByName(params.channelId)
  const [activeThread, setActiveThread] = useState<Message | null>(null)
  const chatRef = useRef<ChannelChatHandle>(null)

  const { messages } = useUnifiedMessages({
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

    // Jump to message if ID is present
    if (chatRef.current) {
      chatRef.current.handleJumpToMessage(messageId);
    }

    // Set active thread if needed
    const targetMessage = messages.find((m: Message) => m.id === messageId);
    if (targetMessage && shouldOpenThread && !activeThread) {
      setActiveThread(targetMessage);
    }
  }, [channel, isLoadingChannel, messages, activeThread]);

  // Redirect to general if channel doesn't exist
  useEffect(() => {
    if (!isLoadingChannel && !channel) {
      router.replace('/chat/general')
    }
  }, [channel, isLoadingChannel, router])

  const handleThreadClick = (message: Message) => {
    router.replace(`/chat/${params.channelId}?thread=true#message-${message.id}`);
    setActiveThread(message);
  }

  const handleCloseThread = useCallback(() => {
    router.replace(`/chat/${params.channelId}`);
    setActiveThread(null);
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
        
        <div className="flex-1 min-h-0 flex flex-col relative">
          <div className="absolute inset-0">
            <ChannelChat
              ref={chatRef}
              channelId={channel.id}
              activeThread={activeThread}
              onThreadClick={handleThreadClick}
              onCloseThread={handleCloseThread}
            />
          </div>
        </div>
      </div>

      {/* Thread Sidebar - Responsive */}
      {activeThread && (
        <>
          {/* Desktop Thread */}
          <div className="hidden lg:block fixed right-0 top-[--header-height] bottom-0 w-[--thread-width] border-l bg-white">
            <ThreadSidebar
              parentMessage={activeThread}
              onClose={handleCloseThread}
            />
          </div>
          {/* Mobile Thread */}
          <div className="lg:hidden fixed inset-0 bg-white z-50">
            <ThreadSidebar
              parentMessage={activeThread}
              onClose={handleCloseThread}
            />
          </div>
        </>
      )}
    </div>
  )
}

export default function ChannelPage({ params }: ChannelPageProps) {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-4 text-red-500">
          <h3 className="font-semibold mb-2">Error loading channel</h3>
          <p className="text-sm">Please try refreshing the page</p>
        </div>
      }
    >
      <ChannelPageContent params={params} />
    </ErrorBoundary>
  )
} 
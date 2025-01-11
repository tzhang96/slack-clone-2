'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageList } from '@/components/chat/MessageList'
import { MessageInput } from '@/components/chat/MessageInput'
import { useUnifiedMessages } from '@/hooks/useUnifiedMessages'
import { useChannelContext } from '@/components/providers/ChannelProvider'
import { ThreadSidebar } from '@/components/thread/ThreadSidebar'
import { Message } from '@/types/chat'

const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
  </div>
)

interface ChannelPageProps {
  params: {
    channelId: string
  }
}

interface FileMetadata {
  bucket_path: string
  file_name: string
  file_size: number
  content_type: string
  is_image: boolean
  image_width?: number
  image_height?: number
}

export default function ChannelPage({ params }: ChannelPageProps) {
  const router = useRouter()
  const { getChannelByName, isLoading: isLoadingChannel } = useChannelContext()
  const channel = getChannelByName(params.channelId)
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeThread, setActiveThread] = useState<Message | null>(null)

  useEffect(() => {
    console.log('ChannelPage state:', {
      channelId: params.channelId,
      channel,
      isLoadingChannel
    })
  }, [params.channelId, channel, isLoadingChannel])

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
    scrollToBottom
  } = useUnifiedMessages({
    type: 'channel',
    id: channel?.id || ''
  })

  useEffect(() => {
    console.log('Message state updated:', {
      messageCount: messages.length,
      isLoadingMessages,
      isLoadingMore,
      hasMore,
      error: error?.message
    })
  }, [messages, isLoadingMessages, isLoadingMore, hasMore, error])

  // Redirect to general if channel doesn't exist
  useEffect(() => {
    if (!isLoadingChannel && !channel) {
      console.log('Channel not found, redirecting to general')
      router.replace('/chat/general')
      return
    }
  }, [channel, isLoadingChannel, router])

  // Handle message changes and scrolling
  useEffect(() => {
    console.log('Handling message changes:', {
      containerRef: !!containerRef.current,
      messageCount: messages.length,
      channelId: channel?.id
    })
    
    handleMessagesChange(containerRef.current, channel?.id ? messages : [])
  }, [messages, handleMessagesChange, channel?.id])

  const handleSendMessage = async (content: string, file?: FileMetadata) => {
    if (!channel?.id) {
      console.log('No channel ID, cannot send message')
      return
    }

    console.log('Sending message:', { content, file })
    try {
      await sendMessage(content, file)
      // Scroll to bottom after sending
      if (containerRef.current) {
        scrollToBottom(containerRef.current)
      }
    } catch (error) {
      console.error('Error sending message:', error)
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

  if (isLoadingChannel) {
    console.log('Showing channel loading spinner')
    return <LoadingSpinner />
  }

  if (!channel) {
    console.log('No channel, returning null')
    return null // Let the redirect effect handle this case
  }

  console.log('Rendering channel page:', {
    channelName: channel.name,
    messageCount: messages.length,
    hasActiveThread: !!activeThread
  })

  return (
    <div className="flex h-full">
      <div className={`flex-1 flex flex-col ${activeThread ? 'lg:mr-[400px]' : ''}`}>
        <div className="px-6 py-4 border-b flex-shrink-0">
          <h1 className="text-xl font-semibold">#{channel.name}</h1>
          <p className="text-sm text-gray-500">{channel.description}</p>
        </div>
        
        <div className="flex-1 min-h-0 flex flex-col relative" ref={containerRef}>
          <div className="absolute inset-0 flex flex-col">
            <div className="flex-1 min-h-0">
              <MessageList 
                messages={messages} 
                isLoading={isLoadingMessages}
                isLoadingMore={isLoadingMore}
                hasMore={hasMore}
                onLoadMore={loadMore}
                onThreadClick={handleThreadClick}
              />
            </div>
            <div className="flex-shrink-0 bg-white border-t">
              <MessageInput onSend={handleSendMessage} disabled={!channel?.id} />
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
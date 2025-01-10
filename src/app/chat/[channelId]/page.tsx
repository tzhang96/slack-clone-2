'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MessageList } from '@/components/chat/MessageList'
import { MessageInput } from '@/components/chat/MessageInput'
import { useMessages } from '@/hooks/useMessages'
import { useChannelContext } from '@/components/providers/ChannelProvider'

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
  const { 
    messages, 
    isLoading: isLoadingMessages, 
    isLoadingMore,
    hasMore,
    error, 
    sendMessage,
    fetchMessages,
    loadMoreMessages 
  } = useMessages(channel?.id)

  // Redirect to general if channel doesn't exist
  useEffect(() => {
    if (!isLoadingChannel && !channel) {
      router.replace('/chat/general')
    }
  }, [channel, isLoadingChannel, router])

  // Fetch messages when channel changes
  useEffect(() => {
    if (channel?.id) {
      fetchMessages()
    }
  }, [channel?.id, fetchMessages])

  const handleSendMessage = (content: string, file?: FileMetadata) => {
    console.log('Sending message:', content, file)
    if (typeof sendMessage === 'function') {
      sendMessage(content, file)
    } else {
      console.error('sendMessage is not a function:', sendMessage)
    }
  }

  if (isLoadingChannel || !channel) {
    return <LoadingSpinner />
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b flex-shrink-0">
        <h1 className="text-xl font-semibold">#{channel.name}</h1>
        <p className="text-sm text-gray-500">{channel.description}</p>
      </div>
      
      <div className="flex-1 min-h-0 flex flex-col">
        {isLoadingMessages ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-red-500 mb-4">Failed to load messages</p>
            <button
              onClick={() => channel?.id && fetchMessages()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 min-h-0">
              <MessageList 
                messages={messages} 
                isLoading={isLoadingMessages}
                isLoadingMore={isLoadingMore}
                hasMore={hasMore}
                onLoadMore={loadMoreMessages}
              />
            </div>
            <div className="flex-shrink-0 bg-white border-t">
              <MessageInput onSend={handleSendMessage} disabled={!channel?.id} />
            </div>
          </>
        )}
      </div>
    </div>
  )
} 
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MessageList } from '@/components/chat/MessageList'
import { MessageInput } from '@/components/chat/MessageInput'
import { useMessages } from '@/hooks/useMessages'
import { useChannelContext } from '@/components/providers/ChannelProvider'

interface ChannelPageProps {
  params: {
    channelId: string
  }
}

export default function ChannelPage({ params }: ChannelPageProps) {
  const router = useRouter()
  const { getChannelByName, isLoading: isLoadingChannel } = useChannelContext()
  const channel = getChannelByName(params.channelId)
  const { messages, isLoading: isLoadingMessages, error, sendMessage, fetchMessages } = useMessages(channel?.id)

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

  const handleSendMessage = (content: string) => {
    console.log('Sending message:', content)
    if (typeof sendMessage === 'function') {
      sendMessage(content)
    } else {
      console.error('sendMessage is not a function:', sendMessage)
    }
  }

  if (isLoadingChannel || !channel) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b">
        <h1 className="text-xl font-semibold">#{channel.name}</h1>
        <p className="text-sm text-gray-500">{channel.description}</p>
      </div>
      <div className="flex-1 overflow-hidden">
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
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
          <MessageList messages={messages} />
        )}
      </div>
      <div className="p-4 border-t">
        <MessageInput onSend={handleSendMessage} disabled={!channel?.id} />
      </div>
    </div>
  )
} 
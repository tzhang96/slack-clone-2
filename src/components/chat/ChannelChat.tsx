import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { MessageList, MessageListHandle } from '../chat/MessageList'
import { MessageInput } from '../chat/MessageInput'
import { useUnifiedMessages } from '../../hooks/useUnifiedMessages'
import { Message } from '../../types/chat'
import { FileMetadata } from '../../hooks/useFileUpload'

interface ChannelChatProps {
  channelId: string
  activeThread: Message | null
  onThreadClick: (message: Message) => void
  onCloseThread: () => void
}

export interface ChannelChatHandle {
  handleJumpToMessage: (messageId: string) => void
}

export const ChannelChat = forwardRef<ChannelChatHandle, ChannelChatProps>(({ 
  channelId, 
  activeThread,
  onThreadClick,
  onCloseThread 
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const messageListRef = useRef<MessageListHandle>(null)

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
  } = useUnifiedMessages({
    type: 'channel',
    id: channelId,
    parentMessage: null,
    enabled: !!channelId
  })

  // Handle message changes and scrolling
  useEffect(() => {
    if (!channelId) return;
    handleMessagesChange(containerRef.current, messages)
  }, [messages, handleMessagesChange, channelId])

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

  // Expose jump to message method
  useImperativeHandle(ref, () => ({
    handleJumpToMessage: (messageId: string) => {
      if (messageListRef.current) {
        messageListRef.current.scrollToMessage(messageId);
      }
    }
  }), []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  return (
    <div className="flex h-full w-full">
      <div className="flex-1 flex flex-col">
        <div className="flex-1 min-h-0 flex flex-col relative" ref={containerRef}>
          <div className="absolute inset-0 flex flex-col">
            <div className="flex-1 min-h-0">
              <MessageList
                ref={messageListRef}
                messages={messages}
                isLoading={isLoading}
                isLoadingMore={isLoadingMore}
                hasMore={hasMore}
                onLoadMore={loadMore}
                context="channel"
                onThreadClick={onThreadClick}
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
    </div>
  )
})

ChannelChat.displayName = 'ChannelChat'; 
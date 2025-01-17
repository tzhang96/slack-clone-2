import { useEffect, useRef, useState } from 'react'
import { MessageList } from '@/components/chat/MessageList'
import { MessageInput } from '@/components/chat/MessageInput'
import { useUnifiedMessages } from '@/hooks/useUnifiedMessages'
import { Message } from '@/types/chat'
import { FileMetadata } from '@/hooks/useFileUpload'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { Bot } from 'lucide-react'
import { toast } from 'sonner'

interface User {
  id: string
  full_name: string
  is_bot: boolean
  bot_owner_id: string | null
}

interface DMConversation {
  is_ai_chat: boolean
  user1_id: string
  user2_id: string
  user1: User
  user2: User
}

interface DMChatProps {
  conversationId: string
  activeThread: Message | null
  onThreadClick: (message: Message) => void
  onCloseThread: () => void
}

export function DMChat({ 
  conversationId, 
  activeThread,
  onThreadClick,
  onCloseThread 
}: DMChatProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isAIChat, setIsAIChat] = useState(false)
  const [botName, setBotName] = useState<string | null>(null)
  const { supabase } = useSupabase()

  const {
    messages,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    sendMessage: sendUnifiedMessage,
    loadMore,
    handleMessagesChange,
    isAtBottom,
    checkIsAtBottom,
    scrollToBottom,
  } = useUnifiedMessages({
    type: 'dm',
    id: conversationId,
    enabled: !!conversationId
  })

  // Fetch conversation details
  useEffect(() => {
    const fetchConversationDetails = async () => {
      if (!conversationId) return

      try {
        // Get conversation details
        const { data: conversation } = await supabase
          .from('dm_conversations')
          .select(`
            is_ai_chat,
            user1_id,
            user2_id,
            user1:users!dm_conversations_user1_id_fkey (
              id,
              full_name,
              is_bot,
              bot_owner_id
            ),
            user2:users!dm_conversations_user2_id_fkey (
              id,
              full_name,
              is_bot,
              bot_owner_id
            )
          `)
          .eq('id', conversationId)
          .single()

        if (conversation) {
          const typedConversation = conversation as unknown as DMConversation
          setIsAIChat(typedConversation.is_ai_chat)
          
          // If it's an AI chat, find the bot user and get their name
          if (typedConversation.is_ai_chat) {
            const botUser = [typedConversation.user1, typedConversation.user2].find(u => u.is_bot)
            if (botUser) {
              setBotName(botUser.full_name)
            }
          }
        }
      } catch (error) {
        console.error('Error fetching conversation details:', error)
      }
    }

    fetchConversationDetails()
  }, [conversationId, supabase])

  // Handle message changes and scrolling
  useEffect(() => {
    if (!conversationId) return;
    handleMessagesChange(containerRef.current, messages)
  }, [messages, handleMessagesChange, conversationId])

  const handleSendMessage = async (content: string, file: FileMetadata | null = null) => {
    try {
      // First send the user's message
      await sendUnifiedMessage(content, file)
      
      // If this is an AI chat, trigger the AI response
      if (isAIChat) {
        const loadingToast = toast.loading('AI is thinking...')
        
        try {
          // Call AI endpoint to generate response
          const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              conversationId,
              userMessage: content
            })
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to get AI response')
          }

          // Wait a bit to show the typing indicator
          await new Promise(resolve => setTimeout(resolve, 500))
        } catch (error) {
          console.error('AI response error:', error)
          toast.error(error instanceof Error ? error.message : 'Failed to get AI response')
        } finally {
          toast.dismiss(loadingToast)
        }
      }

      // Scroll to bottom after sending
      if (containerRef.current) {
        scrollToBottom(containerRef.current, true)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col">
      {isAIChat && (
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b">
          <Bot className="w-5 h-5 text-blue-500" />
          <span className="font-medium">
            {botName || 'AI Reply Guy'} - AI Chat
          </span>
          <span className="text-sm text-gray-500">
            (Trained on user's message history)
          </span>
        </div>
      )}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 min-h-0 flex flex-col relative" ref={containerRef}>
          <div className="absolute inset-0 flex flex-col">
            <div className="flex-1 min-h-0">
              <MessageList
                messages={messages}
                isLoading={isLoading}
                isLoadingMore={isLoadingMore}
                hasMore={hasMore}
                onLoadMore={loadMore}
                context="dm"
                onThreadClick={onThreadClick}
              />
            </div>
            <div className="flex-shrink-0 bg-white border-t">
              <MessageInput
                onSend={handleSendMessage}
                context="dm"
                placeholder={isAIChat ? "Chat with AI..." : "Message"}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 
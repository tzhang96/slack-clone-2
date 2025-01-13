'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { useAuth } from '@/lib/auth'
import { DMConversation } from '@/types/dm'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { DMChat } from '@/components/dm/DMChat'
import { useRouter } from 'next/navigation'
import { Message } from '@/types/chat'
import { ThreadSidebar } from '@/components/thread/ThreadSidebar'
import { useUnifiedMessages } from '@/hooks/useUnifiedMessages'

interface DMPageProps {
  params: {
    conversationId: string
  }
}

export default function DMPage({ params }: DMPageProps) {
  const [conversation, setConversation] = useState<DMConversation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { supabase } = useSupabase()
  const { user: currentUser } = useAuth()
  const [activeThread, setActiveThread] = useState<Message | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const { messages, jumpToMessage } = useUnifiedMessages({
    type: 'dm',
    id: params.conversationId,
    enabled: true
  })

  const handleThreadClick = useCallback((message: Message) => {
    router.replace(`/dm/${params.conversationId}?thread=true#message-${message.id}`);
    setActiveThread(message);
  }, [router, params.conversationId]);

  const handleCloseThread = useCallback(() => {
    router.replace(`/dm/${params.conversationId}`);
    setActiveThread(null);
  }, [router, params.conversationId]);

  // Handle URL parameters for thread
  useEffect(() => {
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
  }, [messages, activeThread, jumpToMessage]);

  useEffect(() => {
    const fetchConversation = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('dm_conversations')
          .select(`
            *,
            user1:user1_id (*),
            user2:user2_id (*)
          `)
          .eq('id', params.conversationId)
          .single()

        if (fetchError) throw fetchError
        if (!data) throw new Error('Conversation not found')

        setConversation(data)
      } catch (err) {
        console.error('Error fetching conversation:', err)
        setError(err instanceof Error ? err : new Error('Failed to fetch conversation'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchConversation()
  }, [supabase, params.conversationId])

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="h-16 border-b animate-pulse bg-gray-100" />
        <div className="flex-1" />
      </div>
    )
  }

  if (error || !conversation) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-red-500 mb-4">
          {error?.message || 'Conversation not found'}
        </p>
      </div>
    )
  }

  const otherUser = currentUser?.id === conversation.user1_id 
    ? conversation.user2 
    : conversation.user1

  if (!otherUser) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-red-500">User not found</p>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full [--header-height:73px] [--thread-width:400px]">
      <div className={`flex-1 flex flex-col ${activeThread ? 'lg:mr-[--thread-width]' : ''}`}>
        {/* Header */}
        <div className="px-6 py-4 border-b flex-shrink-0 h-[--header-height] flex items-center gap-3">
          <UserAvatar 
            userId={otherUser.id}
            name={otherUser.full_name}
            showStatus
            lastSeen={otherUser.last_seen}
          />
          <div>
            <h1 className="font-semibold">{otherUser.full_name}</h1>
            <p className="text-sm text-gray-500">@{otherUser.username}</p>
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 min-h-0 flex flex-col relative" ref={containerRef}>
          <div className="absolute inset-0">
            <DMChat 
              conversationId={params.conversationId} 
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
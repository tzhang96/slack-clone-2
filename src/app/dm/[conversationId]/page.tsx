'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { useAuth } from '@/lib/auth'
import { DMConversation } from '@/types/dm'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { DMChat } from '@/components/dm/DMChat'

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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center gap-3">
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
      <div className="flex-1">
        <DMChat conversationId={params.conversationId} />
      </div>
    </div>
  )
} 
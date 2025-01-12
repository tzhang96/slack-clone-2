import { useState, useEffect, useCallback } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { useAuth } from '@/lib/auth'
import type { Message, Thread, ThreadParticipant } from '@/types/models'
import type { DbMessage, DbJoinedMessage } from '@/types/database'
import { MessageRepository, MESSAGE_SELECT } from '@/lib/data-access'
import { DataTransformer } from '@/lib/transformers'

interface UseThreadReturn {
  parentMessage: Message | null
  replies: Message[]
  participants: ThreadParticipant[]
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  loadMore: () => Promise<void>
  sendReply: (content: string) => Promise<void>
}

export function useThread(threadId: string): UseThreadReturn {
  const [parentMessage, setParentMessage] = useState<Message | null>(null)
  const [replies, setReplies] = useState<Message[]>([])
  const [participants, setParticipants] = useState<ThreadParticipant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const { supabase } = useSupabase()
  const { user } = useAuth()

  // Fetch thread data
  const fetchThread = useCallback(async () => {
    if (!threadId) return

    try {
      setIsLoading(true)
      const thread = await MessageRepository.getThreadMessages(threadId)
      
      if (thread) {
        setParentMessage(thread.parentMessage)
        setReplies(thread.replies)
        setParticipants(thread.participants)
        setHasMore(thread.replies.length === 50)
      }
    } catch (err) {
      console.error('Error fetching thread:', err)
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [threadId])

  // Load more replies
  const loadMore = async () => {
    if (!threadId || isLoadingMore || !hasMore) return

    try {
      setIsLoadingMore(true)
      const oldestReply = replies[0]

      const { data, error } = await supabase
        .from('messages')
        .select(MESSAGE_SELECT)
        .eq('parent_message_id', threadId)
        .lt('created_at', oldestReply.createdAt)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      const newReplies = (data as DbJoinedMessage[])
        .map(msg => DataTransformer.toMessage(msg))
        .filter((msg): msg is Message => msg !== null)

      setReplies(prev => [...newReplies, ...prev])
      setHasMore(data.length === 50)
    } catch (err) {
      console.error('Error loading more replies:', err)
      setError(err as Error)
    } finally {
      setIsLoadingMore(false)
    }
  }

  // Send a reply
  const sendReply = async (content: string) => {
    if (!threadId || !user || !content.trim()) return

    try {
      const newReply = await MessageRepository.sendReply(threadId, content, user.id)
      if (newReply) {
        setReplies(prev => [...prev, newReply])
      }
    } catch (err) {
      console.error('Error sending reply:', err)
      setError(err as Error)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchThread()
  }, [fetchThread])

  // Set up real-time subscriptions
  useEffect(() => {
    if (!threadId) return

    // Subscribe to new replies
    const repliesSubscription = supabase
      .channel(`thread-${threadId}-replies`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `parent_message_id=eq.${threadId}`
        },
        async (payload) => {
          if (!payload.new?.id) return

          const newMessage = await MessageRepository.getMessage(payload.new.id)
          if (newMessage) {
            setReplies(prev => [...prev, newMessage])
          }
        }
      )
      .subscribe()

    // Subscribe to participant changes
    const participantsSubscription = supabase
      .channel(`thread-${threadId}-participants`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'thread_participants',
          filter: `thread_id=eq.${threadId}`
        },
        () => {
          // Refetch participants on any change
          fetchThread()
        }
      )
      .subscribe()

    return () => {
      repliesSubscription.unsubscribe()
      participantsSubscription.unsubscribe()
    }
  }, [threadId, supabase, fetchThread])

  return {
    parentMessage,
    replies,
    participants,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    sendReply
  }
} 
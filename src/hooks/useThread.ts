import { useState, useEffect, useCallback } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { useAuth } from '@/lib/auth'
import { ThreadMessage, ThreadParticipant, ThreadReaction, ThreadFile } from '@/types/thread'
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

interface SupabaseUser {
  id: string
  username: string
  full_name: string
  last_seen: string | null
}

interface SupabaseMessage {
  id: string
  content: string
  created_at: string
  channel_id: string | null
  conversation_id: string | null
  users: SupabaseUser
  reactions?: Array<{
    id: string
    emoji: string
    user_id: string
    users: SupabaseUser
  }>
  files?: Array<{
    id: string
    message_id: string
    bucket_path: string
    file_name: string
    file_size: number
    content_type: string
    is_image: boolean
    image_width: number | null
    image_height: number | null
    created_at: string
  }>
}

interface SupabaseParticipant {
  id: string
  thread_id: string
  user_id: string
  last_read_at: string
  created_at: string
  users: SupabaseUser
}

interface UseThreadReturn {
  parentMessage: ThreadMessage | null
  replies: ThreadMessage[]
  participants: ThreadParticipant[]
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  loadMore: () => Promise<void>
  sendReply: (content: string) => Promise<void>
}

function transformUser(user: SupabaseUser) {
  return {
    id: user.id,
    username: user.username,
    fullName: user.full_name,
    lastSeen: user.last_seen || undefined
  }
}

function transformMessage(message: SupabaseMessage): ThreadMessage {
  return {
    id: message.id,
    content: message.content,
    createdAt: message.created_at,
    channelId: message.channel_id || undefined,
    conversationId: message.conversation_id || undefined,
    user: transformUser(message.users),
    reactions: message.reactions?.map(reaction => ({
      id: reaction.id,
      emoji: reaction.emoji,
      userId: reaction.user_id,
      user: transformUser(reaction.users)
    })) || [],
    file: message.files?.[0] ? {
      id: message.files[0].id,
      messageId: message.files[0].message_id,
      bucketPath: message.files[0].bucket_path,
      fileName: message.files[0].file_name,
      fileSize: message.files[0].file_size,
      contentType: message.files[0].content_type,
      isImage: message.files[0].is_image,
      imageWidth: message.files[0].image_width || undefined,
      imageHeight: message.files[0].image_height || undefined,
      createdAt: message.files[0].created_at
    } : undefined
  }
}

function transformParticipant(participant: SupabaseParticipant): ThreadParticipant {
  return {
    id: participant.id,
    threadId: participant.thread_id,
    userId: participant.user_id,
    lastReadAt: participant.last_read_at,
    createdAt: participant.created_at,
    user: participant.users ? transformUser(participant.users) : undefined
  }
}

function transformSupabaseResponse<T>(data: any): T {
  return data as unknown as T
}

export function useThread(threadId: string): UseThreadReturn {
  const [parentMessage, setParentMessage] = useState<ThreadMessage | null>(null)
  const [replies, setReplies] = useState<ThreadMessage[]>([])
  const [participants, setParticipants] = useState<ThreadParticipant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const { supabase } = useSupabase()
  const { user } = useAuth()

  // Fetch parent message and initial replies
  const fetchThread = useCallback(async () => {
    if (!threadId) return

    try {
      setIsLoading(true)

      // Fetch parent message
      const { data: parentData, error: parentError } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          channel_id,
          conversation_id,
          users:users!inner (
            id,
            username,
            full_name,
            last_seen
          )
        `)
        .eq('id', threadId)
        .single()

      if (parentError) throw parentError

      // Fetch initial replies
      const { data: repliesData, error: repliesError } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          channel_id,
          conversation_id,
          users:users!inner (
            id,
            username,
            full_name,
            last_seen
          ),
          reactions (
            id,
            emoji,
            user_id,
            users:users!inner (
              id,
              username,
              full_name,
              last_seen
            )
          ),
          files (
            id,
            message_id,
            bucket_path,
            file_name,
            file_size,
            content_type,
            is_image,
            image_width,
            image_height,
            created_at
          )
        `)
        .eq('parent_message_id', threadId)
        .order('created_at', { ascending: true })
        .limit(50)

      if (repliesError) throw repliesError

      // Fetch participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('thread_participants')
        .select(`
          id,
          thread_id,
          user_id,
          last_read_at,
          created_at,
          users:users!inner (
            id,
            username,
            full_name,
            last_seen
          )
        `)
        .eq('thread_id', threadId)

      if (participantsError) throw participantsError

      // Transform data
      const transformedParent = parentData ? transformMessage(transformSupabaseResponse<SupabaseMessage>(parentData)) : null
      const transformedReplies = transformSupabaseResponse<SupabaseMessage[]>(repliesData).map(transformMessage)
      const transformedParticipants = transformSupabaseResponse<SupabaseParticipant[]>(participantsData).map(transformParticipant)

      setParentMessage(transformedParent)
      setReplies(transformedReplies)
      setParticipants(transformedParticipants)
      setHasMore(repliesData.length === 50)
    } catch (err) {
      console.error('Error fetching thread:', err)
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [threadId, supabase])

  // Load more replies
  const loadMore = async () => {
    if (!threadId || isLoadingMore || !hasMore) return

    try {
      setIsLoadingMore(true)
      const oldestReply = replies[0]

      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          channel_id,
          conversation_id,
          users:users!inner (
            id,
            username,
            full_name,
            last_seen
          ),
          reactions (
            id,
            emoji,
            user_id,
            users:users!inner (
              id,
              username,
              full_name,
              last_seen
            )
          ),
          files (
            id,
            message_id,
            bucket_path,
            file_name,
            file_size,
            content_type,
            is_image,
            image_width,
            image_height,
            created_at
          )
        `)
        .eq('parent_message_id', threadId)
        .lt('created_at', oldestReply.createdAt)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      const transformedReplies = transformSupabaseResponse<SupabaseMessage[]>(data).map(transformMessage)
      setReplies(prev => [...transformedReplies, ...prev])
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
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          content,
          parent_message_id: threadId,
          user_id: user.id,
          channel_id: parentMessage?.channelId,
          conversation_id: parentMessage?.conversationId
        })
        .select(`
          id,
          content,
          created_at,
          channel_id,
          conversation_id,
          users:users!inner (
            id,
            username,
            full_name,
            last_seen
          )
        `)
        .single()

      if (error) throw error

      const newReply = transformMessage(transformSupabaseResponse<SupabaseMessage>(message))
      setReplies(prev => [...prev, newReply])
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
      .on<{ id: string }>('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `parent_message_id=eq.${threadId}`
      }, async (payload: RealtimePostgresChangesPayload<{ id: string }>) => {
        if (!payload.new?.id) return

        // Fetch the complete message data with user info
        const { data, error } = await supabase
          .from('messages')
          .select(`
            id,
            content,
            created_at,
            channel_id,
            conversation_id,
            users:users!inner (
              id,
              username,
              full_name,
              last_seen
            )
          `)
          .eq('id', payload.new.id)
          .single()

        if (error) {
          console.error('Error fetching new reply:', error)
          return
        }

        const newReply = transformMessage(transformSupabaseResponse<SupabaseMessage>(data))
        setReplies(prev => [...prev, newReply])
      })
      .subscribe()

    // Subscribe to participant changes
    const participantsSubscription = supabase
      .channel(`thread-${threadId}-participants`)
      .on<{ thread_id: string }>('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'thread_participants',
        filter: `thread_id=eq.${threadId}`
      }, () => {
        // Refetch participants on any change
        fetchThread()
      })
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
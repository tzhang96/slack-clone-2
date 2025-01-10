import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { Message, SupabaseMessage } from '@/types/chat'
import { ReactionWithUser } from '@/types/supabase'

// Helper function to transform Supabase message to our Message type
const transformMessage = (msg: SupabaseMessage): Message => {
  const defaultUser = {
    id: msg.user_id,
    username: 'Unknown User',
    fullName: 'Unknown User',
    lastSeen: undefined
  }

  const userInfo = msg.users?.[0]
  const user = userInfo ? {
    id: msg.user_id,
    username: userInfo.username,
    fullName: userInfo.full_name,
    lastSeen: userInfo.last_seen
  } : defaultUser

  const reactions = msg.reactions?.map(reaction => {
    const reactionUser = reaction.user?.[0]
    if (!reactionUser) {
      console.warn(`No user data found for reaction ${reaction.id}`)
      return {
        id: reaction.id,
        emoji: reaction.emoji,
        user: {
          id: 'unknown',
          full_name: 'Unknown User',
          username: 'unknown'
        }
      }
    }
    return {
      id: reaction.id,
      emoji: reaction.emoji,
      user: reactionUser
    }
  }) || []

  return {
    id: msg.id,
    content: msg.content,
    createdAt: msg.created_at,
    channelId: msg.channel_id,
    user,
    reactions
  }
}

// Helper function to count Unicode characters correctly
const getUnicodeLength = (str: string) => {
  return Array.from(str).length
}

export function useMessages(channelId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const { user } = useAuth()
  const { supabase } = useSupabase()

  const MESSAGES_PER_PAGE = 25
  const SCROLL_THRESHOLD = 100

  // Function to check if scroll position is at bottom
  const checkIsAtBottom = useCallback((container: HTMLElement) => {
    const { scrollHeight, scrollTop, clientHeight } = container
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    return distanceFromBottom <= SCROLL_THRESHOLD
  }, [])

  // Function to scroll to bottom
  const scrollToBottom = useCallback((container: HTMLElement, smooth = true) => {
    container.scrollTo({
      top: container.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto'
    })
  }, [])

  // Update isAtBottom state when messages change
  const handleMessagesChange = useCallback((container: HTMLElement | null, newMessages: Message[]) => {
    if (!container) return

    const wasAtBottom = checkIsAtBottom(container)
    setIsAtBottom(wasAtBottom)

    // If we were at bottom, scroll to bottom after messages update
    if (wasAtBottom) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        scrollToBottom(container)
      })
    }
  }, [checkIsAtBottom, scrollToBottom])

  const fetchMessages = useCallback(async () => {
    if (!channelId) {
      setMessages([])
      setIsLoading(false)
      setCursor(null)
      setHasMore(true)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('Fetching messages for channel:', channelId)
      
      // First, let's try a simple query without joins
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          channel_id,
          user_id
        `)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
        .limit(MESSAGES_PER_PAGE)

      if (error) {
        console.error('Error fetching messages:', error)
        throw error
      }

      console.log('Fetched messages:', data)

      // If we got the basic data, let's fetch users separately
      const userIds = Array.from(new Set(data.map(msg => msg.user_id)))
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, username, full_name, last_seen')
        .in('id', userIds)

      if (userError) {
        console.error('Error fetching users:', userError)
        throw userError
      }

      console.log('Fetched users:', userData)

      // Combine messages with user data
      const messagesWithUsers = data.map(msg => ({
        ...msg,
        users: [userData.find(u => u.id === msg.user_id)].filter(Boolean)
      }))

      // Now fetch reactions
      const messageIds = data.map(msg => msg.id)
      const { data: reactionsData, error: reactionsError } = await supabase
        .from('reactions')
        .select(`
          id,
          emoji,
          message_id,
          user_id,
          users!reactions_user_id_fkey (
            id,
            full_name,
            username
          )
        `)
        .in('message_id', messageIds)

      if (reactionsError) {
        console.error('Error fetching reactions:', reactionsError)
        throw reactionsError
      }

      console.log('Fetched reactions:', reactionsData)

      // Combine everything
      const completeMessages = messagesWithUsers.map(msg => ({
        ...msg,
        reactions: reactionsData
          .filter(r => r.message_id === msg.id)
          .map(r => ({
            id: r.id,
            emoji: r.emoji,
            user: r.users[0]
          }))
      }))

      const messagesData = completeMessages as unknown as SupabaseMessage[]
      
      setHasMore(messagesData.length === MESSAGES_PER_PAGE)
      
      if (messagesData.length > 0) {
        setCursor(messagesData[messagesData.length - 1].created_at)
      } else {
        setCursor(null)
      }

      setMessages(messagesData.map(transformMessage).reverse())
    } catch (error) {
      console.error('Error in fetchMessages:', error)
      setError(error as Error)
    } finally {
      setIsLoading(false)
    }
  }, [channelId, supabase])

  // Load initial messages when component mounts or channel changes
  useEffect(() => {
    console.log('Fetching initial messages for channel:', channelId)
    fetchMessages()
  }, [channelId, fetchMessages])

  // Subscribe to real-time message changes
  useEffect(() => {
    if (!channelId) return

    const messageSubscription = supabase
      .channel(`messages:${channelId}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`
        },
        async (payload) => {
          console.log('Message change received:', payload)

          if (payload.eventType === 'INSERT') {
            const { data: messageData, error: messageError } = await supabase
              .from('messages')
              .select(`
                *,
                users!messages_user_id_fkey (
                  id,
                  username,
                  full_name,
                  last_seen
                ),
                reactions (
                  id,
                  emoji,
                  user:users!reactions_user_id_fkey (
                    id,
                    full_name,
                    username
                  )
                )
              `)
              .eq('id', payload.new.id)
              .single()

            if (messageError) {
              console.error('Error fetching message data:', messageError)
              return
            }

            console.log('Fetched new message data:', messageData)
            setMessages(prev => {
              const withoutOptimistic = prev.filter(m => 
                !(m.id.startsWith('temp-') && m.content === payload.new.content)
              )
              
              if (withoutOptimistic.some(m => m.id === payload.new.id)) {
                return withoutOptimistic
              }
              
              return [...withoutOptimistic, transformMessage(messageData as unknown as SupabaseMessage)]
            })
          }
        }
      )
      .subscribe()

    return () => {
      console.log('Unsubscribing from message changes')
      messageSubscription.unsubscribe()
    }
  }, [channelId, supabase, fetchMessages])

  const sendMessage = async (content: string) => {
    console.log('sendMessage called with:', content)
    if (!user || !channelId) return

    // Validate message length using Unicode-aware counting
    const MAX_LENGTH = 4000
    const contentLength = getUnicodeLength(content)
    if (contentLength > MAX_LENGTH) {
      const error = new Error(`Message exceeds maximum length of ${MAX_LENGTH} characters (current length: ${contentLength})`)
      console.error('Message length error:', error)
      setError(error)
      return
    }

    // Create optimistic message
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      content,
      createdAt: new Date().toISOString(),
      channelId,
      user: {
        id: user.id,
        username: user.email?.split('@')[0] || 'user',
        fullName: user.user_metadata?.full_name || 'Anonymous'
      }
    }

    // Add optimistic message to state
    setMessages(prev => [...prev, optimisticMessage])

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          content,
          channel_id: channelId,
          user_id: user.id
        })

      if (error) throw error

      // Don't update state here - let the subscription handle it
    } catch (error) {
      console.error('Error sending message:', error)
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id))
      setError(error as Error)
    }
  }

  const loadMoreMessages = useCallback(async () => {
    if (!channelId || !cursor || !hasMore || isLoadingMore) return

    setIsLoadingMore(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          channel_id,
          user_id,
          users (
            id,
            username,
            full_name,
            last_seen
          ),
          reactions (
            id,
            emoji,
            user:users (
              id,
              full_name,
              username
            )
          )
        `)
        .eq('channel_id', channelId)
        .lt('created_at', cursor)
        .order('created_at', { ascending: false })
        .limit(MESSAGES_PER_PAGE)

      if (error) throw error

      const messagesData = data as unknown as SupabaseMessage[]

      setHasMore(messagesData.length === MESSAGES_PER_PAGE)

      if (messagesData.length > 0) {
        setCursor(messagesData[messagesData.length - 1].created_at)
      }

      setMessages(prev => [...messagesData.map(transformMessage).reverse(), ...prev])
    } catch (error) {
      console.error('Error loading more messages:', error)
      setError(error as Error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [channelId, cursor, hasMore, isLoadingMore, supabase])

  return {
    messages,
    isLoading,
    error,
    hasMore,
    isLoadingMore,
    isAtBottom,
    sendMessage,
    loadMoreMessages,
    handleMessagesChange,
    fetchMessages
  }
} 
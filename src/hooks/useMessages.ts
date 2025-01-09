import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { Message, SupabaseMessage } from '@/types/chat'

// Helper function to transform Supabase message to our Message type
const transformMessage = (msg: SupabaseMessage): Message => {
  const userInfo = Array.isArray(msg.users) ? msg.users[0] : msg.users
  return {
    id: msg.id,
    content: msg.content,
    createdAt: msg.created_at,
    user: {
      id: msg.user_id,
      username: userInfo.username,
      fullName: userInfo.full_name,
      lastSeen: userInfo.last_seen
    }
  }
}

// Helper function to count Unicode characters correctly
const getUnicodeLength = (str: string) => {
  return Array.from(str).length // Uses Array.from instead of spread operator
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

  const MESSAGES_PER_PAGE = 25
  const SCROLL_THRESHOLD = 100 // pixels from bottom to consider "at bottom"

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
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          user_id,
          users (
            id,
            username,
            full_name,
            last_seen
          )
        `)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false }) // Get newest messages first
        .limit(MESSAGES_PER_PAGE)

      if (error) throw error

      const messagesData = data as SupabaseMessage[]
      
      // If we got less than the limit, there are no more messages
      setHasMore(messagesData.length === MESSAGES_PER_PAGE)
      
      // Set cursor to oldest message's timestamp
      if (messagesData.length > 0) {
        setCursor(messagesData[messagesData.length - 1].created_at)
      } else {
        setCursor(null)
      }

      // Transform and reverse messages for display (oldest first)
      setMessages(messagesData.map(transformMessage).reverse())
    } catch (error) {
      console.error('Error fetching messages:', error)
      setError(error as Error)
    } finally {
      setIsLoading(false)
    }
  }, [channelId])

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
            // Fetch the complete message with user data
            const { data: messageData, error: messageError } = await supabase
              .from('messages')
              .select(`
                id,
                content,
                created_at,
                user_id,
                users (
                  id,
                  username,
                  full_name,
                  last_seen
                )
              `)
              .eq('id', payload.new.id)
              .single()

            if (messageError) {
              console.error('Error fetching message data:', messageError)
              return
            }

            setMessages(prev => {
              // Remove any optimistic version of this message (temp-*)
              const withoutOptimistic = prev.filter(m => 
                !(m.id.startsWith('temp-') && m.content === payload.new.content)
              )
              
              // Only add if we don't already have the real message ID
              if (withoutOptimistic.some(m => m.id === payload.new.id)) {
                return withoutOptimistic
              }
              
              // Add new message to end (maintaining oldest to newest order)
              return [...withoutOptimistic, transformMessage(messageData as SupabaseMessage)]
            })
          }
        }
      )
      .subscribe()

    return () => {
      console.log('Unsubscribing from message changes')
      messageSubscription.unsubscribe()
    }
  }, [channelId])

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
          user_id,
          users (
            id,
            username,
            full_name,
            last_seen
          )
        `)
        .eq('channel_id', channelId)
        .lt('created_at', cursor) // Get messages older than cursor
        .order('created_at', { ascending: false })
        .limit(MESSAGES_PER_PAGE)

      if (error) throw error

      const messagesData = data as SupabaseMessage[]
      
      // Update hasMore based on whether we got a full page
      setHasMore(messagesData.length === MESSAGES_PER_PAGE)
      
      // Update cursor to oldest message's timestamp
      if (messagesData.length > 0) {
        setCursor(messagesData[messagesData.length - 1].created_at)
      }

      // Transform and add messages to start of list (maintaining oldest to newest order)
      setMessages(prev => [...messagesData.map(transformMessage).reverse(), ...prev])
    } catch (error) {
      console.error('Error loading more messages:', error)
      setError(error as Error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [channelId, cursor, hasMore, isLoadingMore])

  return {
    messages,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    sendMessage,
    loadMoreMessages,
    fetchMessages,
    isAtBottom,
    checkIsAtBottom,
    scrollToBottom,
    handleMessagesChange
  }
} 
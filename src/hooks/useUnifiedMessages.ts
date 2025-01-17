import { useState, useEffect, useCallback, useRef } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { useAuth } from '@/lib/auth'
import { Message } from '@/types/chat'
import { DataTransformer } from '@/lib/transformers'
import { DbJoinedMessage } from '@/types/database'
import { FileMetadata } from '@/hooks/useFileUpload'
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

interface MessageContext {
  type: 'channel' | 'dm' | 'thread'
  id: string | undefined
  parentMessage?: {
    channelId: string | null
    conversationId: string | null
  } | null
  enabled?: boolean
}

const MESSAGES_PER_PAGE = 50
const SCROLL_THRESHOLD = 150
const MESSAGE_SELECT = `
  id,
  content,
  created_at,
  channel_id,
  conversation_id,
  parent_message_id,
  user_id,
  reply_count,
  latest_reply_at,
  is_thread_parent,
  users (
    id,
    username,
    full_name,
    last_seen,
    status
  ),
  reactions (
    id,
    emoji,
    user:users (
      id,
      username,
      full_name
    )
  ),
  files (
    id,
    message_id,
    user_id,
    bucket_path,
    file_name,
    file_size,
    content_type,
    is_image,
    image_width,
    image_height,
    created_at
  ),
  thread_participants (
    id,
    user_id,
    last_read_at,
    created_at,
    users (
      id,
      username,
      full_name,
      last_seen
    )
  )
`

interface MessagePayload {
  id: string
  channel_id: string | null
  conversation_id: string | null
  parent_message_id: string | null
  content: string
  created_at: string
  user_id: string
}

type MessageChangePayload = RealtimePostgresChangesPayload<MessagePayload> & {
  new: MessagePayload
}

// Main hook for unified message handling
export function useUnifiedMessages(context: MessageContext) {
  const { supabase } = useSupabase()
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [cursor, setCursor] = useState<string | null>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)

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

  // Subscribe to real-time updates
  useEffect(() => {
    if (!context.enabled || !context.id) {
      console.log('[useUnifiedMessages] Skip subscription:', {
        enabled: context.enabled,
        contextId: context.id,
        timestamp: new Date().toISOString()
      })
      return
    }

    console.log('[useUnifiedMessages] Setting up subscription:', {
      contextType: context.type,
      contextId: context.id,
      timestamp: new Date().toISOString()
    })

    const channelName = `messages_${context.id}`
    const messageChannel = supabase
      .channel(channelName)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: context.type === 'thread'
            ? `parent_message_id=eq.${context.id}`
            : context.type === 'channel'
            ? `channel_id=eq.${context.id}`
            : `conversation_id=eq.${context.id}`
        },
        async (payload) => {
          console.log('[useUnifiedMessages] Change received:', {
            eventType: payload.eventType,
            table: payload.table,
            schema: payload.schema,
            new: payload.new,
            contextType: context.type,
            contextId: context.id,
            timestamp: new Date().toISOString()
          })

          if (payload.eventType === 'INSERT') {
            // For channels, skip DM messages
            if (context.type === 'channel' && payload.new.conversation_id !== null) {
              return
            }

            // For DMs, skip channel messages
            if (context.type === 'dm' && payload.new.channel_id !== null) {
              return
            }

            // Fetch complete message data including all joins
            const { data: messageData, error: fetchError } = await supabase
              .from('messages')
              .select(MESSAGE_SELECT)
              .eq('id', payload.new.id)
              .single()

            if (fetchError) {
              console.error('[useUnifiedMessages] Error fetching complete message:', {
                error: fetchError,
                messageId: payload.new.id,
                timestamp: new Date().toISOString()
              })
              return
            }

            if (!messageData) {
              console.error('[useUnifiedMessages] No message data found:', {
                messageId: payload.new.id,
                timestamp: new Date().toISOString()
              })
              return
            }

            console.log('[useUnifiedMessages] Raw message data:', {
              messageData,
              messageId: payload.new.id,
              timestamp: new Date().toISOString()
            })

            const transformedMessage = DataTransformer.toMessage(messageData as unknown as DbJoinedMessage)
            if (!transformedMessage) {
              console.error('[useUnifiedMessages] Failed to transform message:', {
                messageData,
                messageId: payload.new.id,
                timestamp: new Date().toISOString()
              })
              return
            }

            console.log('[useUnifiedMessages] Transformed message:', {
              message: transformedMessage,
              messageId: payload.new.id,
              timestamp: new Date().toISOString()
            })

            setMessages(prev => {
              // Check if message already exists
              const exists = prev.some(msg => msg.id === transformedMessage.id)
              if (exists) return prev

              console.log('[useUnifiedMessages] Updating messages state:', {
                prevCount: prev.length,
                newId: transformedMessage.id,
                timestamp: new Date().toISOString()
              })

              const newMessages = [...prev, transformedMessage]
              return newMessages
            })
          }
        }
      )
      .subscribe((status) => {
        console.log('[useUnifiedMessages] Subscription status:', {
          status,
          contextType: context.type,
          contextId: context.id,
          channelName,
          timestamp: new Date().toISOString()
        })
      })

    return () => {
      console.log('[useUnifiedMessages] Cleanup subscription:', {
        contextType: context.type,
        contextId: context.id,
        channelName,
        timestamp: new Date().toISOString()
      })
      messageChannel.unsubscribe()
    }
  }, [context.enabled, context.id, context.type, supabase])

  // Send a message
  const sendMessage = useCallback(async (content: string, file: FileMetadata | null = null) => {
    if (!user || !content.trim() || !context.id) {
      console.log('[useUnifiedMessages] Skip sending message:', {
        hasUser: !!user,
        hasContent: !!content.trim(),
        hasContextId: !!context.id,
        timestamp: new Date().toISOString()
      })
      return
    }

    console.log('[useUnifiedMessages] Sending message:', {
      content,
      hasFile: !!file,
      contextType: context.type,
      contextId: context.id,
      timestamp: new Date().toISOString()
    })

    // Fetch user data from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, username, full_name, last_seen, status')
      .eq('id', user.id)
      .single()

    if (userError) {
      console.error('[useUnifiedMessages] Error fetching user data:', userError)
      return
    }

    // Create optimistic message
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      content: content.trim(),
      createdAt: new Date().toISOString(),
      user_id: user.id,
      channelId: context.type === 'thread' ? context.parentMessage?.channelId ?? null : context.type === 'channel' ? context.id : null,
      conversationId: context.type === 'thread' ? context.parentMessage?.conversationId ?? null : context.type === 'dm' ? context.id : null,
      parentMessageId: context.type === 'thread' ? context.id : null,
      replyCount: 0,
      latestReplyAt: null,
      isThreadParent: false,
      user: {
        id: userData.id,
        username: userData.username,
        fullName: userData.full_name,
        lastSeen: userData.last_seen,
        status: userData.status
      },
      reactions: [],
      file: null,
      threadParticipants: null
    }

    console.log('[useUnifiedMessages] Adding optimistic message:', {
      message: optimisticMessage,
      timestamp: new Date().toISOString()
    })

    // Add optimistic message to state
    setMessages(prev => [...prev, optimisticMessage])

    try {
      // Insert the message
      const { data: newMessage, error: insertError } = await supabase
        .from('messages')
        .insert({
          content: content.trim(),
          channel_id: context.type === 'thread' ? context.parentMessage?.channelId ?? null : context.type === 'channel' ? context.id : null,
          conversation_id: context.type === 'thread' ? context.parentMessage?.conversationId ?? null : context.type === 'dm' ? context.id : null,
          parent_message_id: context.type === 'thread' ? context.id : null,
          user_id: user.id
        })
        .select()
        .single()

      if (insertError) throw insertError

      console.log('[useUnifiedMessages] Message inserted:', {
        messageId: newMessage.id,
        timestamp: new Date().toISOString()
      })

      // If we have a file, upload it
      if (file) {
        console.log('[useUnifiedMessages] Uploading file:', {
          messageId: newMessage.id,
          fileName: file.file_name,
          timestamp: new Date().toISOString()
        })

        const { error: fileError } = await supabase
          .from('files')
          .insert({
            message_id: newMessage.id,
            user_id: user.id,
            bucket_path: file.bucket_path,
            file_name: file.file_name,
            file_size: file.file_size,
            content_type: file.content_type,
            is_image: file.is_image,
            image_width: file.image_width,
            image_height: file.image_height
          })

        if (fileError) throw fileError
      }

      // Fetch the complete message with all joins
      const { data: completeMessage, error: fetchError } = await supabase
        .from('messages')
        .select(MESSAGE_SELECT)
        .eq('id', newMessage.id)
        .single()

      if (fetchError) throw fetchError

      if (completeMessage) {
        const messageData = completeMessage as unknown as DbJoinedMessage
        const transformedMessage = DataTransformer.toMessage(messageData)
        if (transformedMessage) {
          console.log('[useUnifiedMessages] Replacing optimistic message:', {
            oldId: optimisticMessage.id,
            newId: transformedMessage.id,
            timestamp: new Date().toISOString()
          })

          // Replace optimistic message with real one
          setMessages(prev => prev.map(msg => 
            msg.id === optimisticMessage.id ? transformedMessage : msg
          ))
        }
      }
    } catch (err) {
      console.error('[useUnifiedMessages] Error sending message:', err)
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id))
      setError(err as Error)
    }
  }, [user, context.id, context.type, context.parentMessage, supabase])

  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    if (!context.enabled || !context.id) {
      console.log('[useUnifiedMessages] Skip Fetch:', {
        enabled: context.enabled,
        contextId: context.id,
        timestamp: new Date().toISOString()
      })
      return
    }

    console.log('[useUnifiedMessages] Fetch Start:', {
      contextType: context.type,
      contextId: context.id,
      timestamp: new Date().toISOString()
    })

    setIsLoading(true)
    setError(null)

    try {
      const query = supabase
        .from('messages')
        .select(MESSAGE_SELECT)

      // Add filters based on context type
      if (context.type === 'thread') {
        query.eq('parent_message_id', context.id)
      } else {
        query
          .eq(context.type === 'channel' ? 'channel_id' : 'conversation_id', context.id)
          .is('parent_message_id', null)
          .is(context.type === 'channel' ? 'conversation_id' : 'channel_id', null)
      }

      // Add ordering and limit
      query
        .order('created_at', { ascending: false })
        .limit(MESSAGES_PER_PAGE)

      const { data, error } = await query

      if (error) throw error

      if (!data || data.length === 0) {
        setMessages([])
        setHasMore(false)
        setCursor(null)
        return
      }

      // Transform the data to the correct type
      const messagesData = data as unknown as DbJoinedMessage[]
      const validMessages = messagesData
        .map(msg => DataTransformer.toMessage(msg))
        .filter((msg): msg is Message => msg !== null)
        .reverse()

      setMessages(validMessages)
      setHasMore(validMessages.length === MESSAGES_PER_PAGE)
      setCursor(data[data.length - 1].created_at)
    } catch (err) {
      console.error('[useUnifiedMessages] Fetch Error:', err)
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [context.enabled, context.id, context.type, supabase])

  // Load initial messages
  useEffect(() => {
    if (context.enabled && context.id) {
      fetchMessages()
    }
  }, [context.enabled, context.id, fetchMessages])

  // Log messages state changes
  useEffect(() => {
    console.log('[useUnifiedMessages] Messages state updated:', {
      count: messages.length,
      messageIds: messages.map(m => m.id),
      contextType: context.type,
      contextId: context.id,
      timestamp: new Date().toISOString()
    })
  }, [messages, context.type, context.id])

  return {
    messages,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    isAtBottom,
    sendMessage,
    loadMore: undefined, // Will be implemented later
    checkIsAtBottom,
    scrollToBottom,
    handleMessagesChange
  }
} 
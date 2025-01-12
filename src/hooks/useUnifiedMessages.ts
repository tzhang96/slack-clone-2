import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import type { Message } from '@/types/models'
import type { DbJoinedMessage } from '@/types/database'
import { useMessageMutation } from '@/hooks/useMessageMutation'
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { DataTransformer } from '@/lib/transformers'
import { MESSAGE_SELECT } from '@/lib/data-access'

interface MessageContext {
  type: 'channel' | 'dm' | 'thread'
  id: string
  parentMessage?: {
    channelId: string | null
    conversationId: string | undefined
  }
}

interface UseUnifiedMessagesReturn {
  messages: Message[]
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  error: Error | null
  isAtBottom: boolean
  sendMessage: (content: string, file?: FileMetadata) => Promise<void>
  loadMore: () => Promise<void>
  checkIsAtBottom: (container: HTMLElement) => boolean
  scrollToBottom: (container: HTMLElement, smooth?: boolean) => void
  handleMessagesChange: (container: HTMLElement | null, newMessages: Message[]) => void
}

interface FileMetadata {
  bucket_path: string
  file_name: string
  file_size: number
  content_type: string
  is_image: boolean
  image_width?: number
  image_height?: number
}

export function useUnifiedMessages(context: MessageContext): UseUnifiedMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [cursor, setCursor] = useState<string | undefined>(undefined)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const { user } = useAuth()
  const { supabase } = useSupabase()
  const { sendMessage: sendMessageMutation } = useMessageMutation()

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

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!context.id) {
      console.log('No context.id provided, skipping fetch')
      setMessages([])
      setIsLoading(false)
      setCursor(undefined)
      setHasMore(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('Building fetch query for context:', {
        type: context.type,
        id: context.id
      })

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

      console.log('Executing query with filters:', {
        type: context.type,
        id: context.id,
        filters: context.type === 'thread' 
          ? { parent_message_id: context.id }
          : {
              [context.type === 'channel' ? 'channel_id' : 'conversation_id']: context.id,
              parent_message_id: null,
              [context.type === 'channel' ? 'conversation_id' : 'channel_id']: null
            }
      })
      const { data, error } = await query

      console.log('Query results:', {
        error,
        dataLength: data?.length,
        firstMessage: data?.[0],
        rawData: data
      })

      if (error) throw error

      if (!data || data.length === 0) {
        console.log('No messages found')
        setMessages([])
        setHasMore(false)
        setCursor(undefined)
        return
      }

      const validMessages = (data as DbJoinedMessage[])
        .map(msg => {
          console.log('Processing message:', {
            id: msg.id,
            content: msg.content,
            users: msg.users,
            user_id: msg.user_id
          })
          return DataTransformer.toMessage(msg)
        })
        .filter((msg): msg is Message => {
          if (!msg) {
            console.log('Message was filtered out due to null')
            return false
          }
          return true
        })
        .reverse()

      console.log('Final transformed messages:', {
        count: validMessages.length,
        messages: validMessages.map(msg => ({
        id: msg.id,
        content: msg.content,
          user: {
            id: msg.user.id,
            username: msg.user.username,
            fullName: msg.user.fullName
          }
        }))
      })

      setMessages(validMessages)
      setHasMore(validMessages.length === MESSAGES_PER_PAGE)
      setCursor(data[data.length - 1].created_at)
    } catch (err) {
      console.error('Error in fetchMessages:', err)
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [context.id, context.type, supabase])

  // Load more messages
  const loadMore = async () => {
    if (!context.id || isLoadingMore || !hasMore || !cursor) return

    setIsLoadingMore(true)

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

      // Add cursor pagination
      query
        .lt('created_at', cursor)
        .order('created_at', { ascending: false })
        .limit(MESSAGES_PER_PAGE)

      const { data, error } = await query

      if (error) throw error

      if (!data || data.length === 0) {
        setHasMore(false)
        return
      }

      const validMessages = (data as DbJoinedMessage[])
        .map(msg => DataTransformer.toMessage(msg))
        .filter((msg): msg is Message => msg !== null)
        .reverse()

      setMessages(prev => [...prev, ...validMessages])
      setHasMore(validMessages.length === MESSAGES_PER_PAGE)
      setCursor(data[data.length - 1].created_at)
    } catch (err) {
      console.error('Error loading more messages:', err)
      setError(err as Error)
    } finally {
      setIsLoadingMore(false)
    }
  }

  // Send a message
  const sendMessage = async (content: string, file?: FileMetadata) => {
    if (!user || !content.trim()) return

    try {
      const initialMessageData = {
        content,
        user_id: user.id,
        ...(context.type === 'thread' ? {
          parent_message_id: context.id,
          channel_id: context.parentMessage?.channelId,
          conversation_id: context.parentMessage?.conversationId
        } : {
          [context.type === 'channel' ? 'channel_id' : 'conversation_id']: context.id
        })
      }

      // First insert the message
      const { data: newMessage, error: messageError } = await supabase
        .from('messages')
        .insert(initialMessageData)
        .select(MESSAGE_SELECT)
        .single()

      if (messageError) throw messageError

      // If we have a file, create the file record
      if (file && newMessage) {
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
          ...(file.is_image ? {
            image_width: file.image_width,
            image_height: file.image_height,
          } : {})
      })

      if (fileError) {
        console.error('Error creating file record:', fileError)
        // If file record creation fails, delete the message
        await supabase
          .from('messages')
          .delete()
            .eq('id', newMessage.id)
        throw fileError
      }

        // Fetch the complete message with the file
        const { data: updatedMessage, error: fetchError } = await supabase
          .from('messages')
          .select(MESSAGE_SELECT)
          .eq('id', newMessage.id)
          .single()

        if (fetchError) throw fetchError

        if (updatedMessage) {
          const transformedMessage = DataTransformer.toMessage(updatedMessage as DbJoinedMessage)
          if (transformedMessage) {
            setMessages(prev => [...prev, transformedMessage])
          }
        }
      } else if (newMessage) {
        // If no file, just transform and add the message
        const transformedMessage = DataTransformer.toMessage(newMessage as DbJoinedMessage)
        if (transformedMessage) {
          setMessages(prev => [...prev, transformedMessage])
        }
      }
    } catch (err) {
      console.error('Error sending message:', err)
      setError(err as Error)
    }
  }

  // Load initial messages
  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  // Set up real-time subscriptions
  useEffect(() => {
    if (!context.id) return

    // Filter for new messages in current context
    const insertFilter = (() => {
      switch (context.type) {
        case 'channel':
          return `channel_id=eq.${context.id}`
        case 'dm':
          return `conversation_id=eq.${context.id}`
        case 'thread':
          return `parent_message_id=eq.${context.id}`
        default:
          return null
      }
    })()

    // Filter for updates to any message in current channel/DM
    const updateFilter = (() => {
      switch (context.type) {
        case 'channel':
          return `channel_id=eq.${context.id}`
        case 'dm':
          return `conversation_id=eq.${context.id}`
        case 'thread':
          // In thread view, we only care about updates to replies
          return `parent_message_id=eq.${context.id}`
        default:
          return null
      }
    })()

    if (!insertFilter || !updateFilter) return

    // Message subscription
    const messageChannel = supabase
      .channel(`messages:${context.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: insertFilter
        },
        async (payload) => {
          if (!payload.new?.id) return

          // Ignore messages we sent ourselves (we already have them from optimistic update)
          if (payload.new.user_id === user?.id) return

          const { data: messageData } = await supabase
            .from('messages')
            .select(MESSAGE_SELECT)
            .eq('id', payload.new.id)
            .single()

          if (messageData) {
            const transformedMessage = DataTransformer.toMessage(messageData as DbJoinedMessage)
            if (transformedMessage) {
              // Only add the message if it belongs in the current context
              const belongsInContext = context.type === 'thread' 
                ? transformedMessage.parentMessageId === context.id
                : (context.type === 'channel' 
                    ? transformedMessage.channelId === context.id && !transformedMessage.parentMessageId
                    : transformedMessage.conversationId === context.id && !transformedMessage.parentMessageId)

              if (belongsInContext) {
                setMessages(prev => [...prev, transformedMessage])
              }
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: updateFilter
        },
        async (payload) => {
          console.log('Received UPDATE event:', {
            payload,
            filter: updateFilter,
            contextType: context.type,
            contextId: context.id
          })

          if (!payload.new?.id) return

          // For thread replies, we only care about updates to messages in the thread
          if (context.type === 'thread' && payload.new.parent_message_id !== context.id) {
              return
            }

          // For channel/DM views, we want to catch all message updates including thread metadata
          const { data: messageData } = await supabase
              .from('messages')
            .select(MESSAGE_SELECT)
            .eq('id', payload.new.id)
              .single()

          console.log('Fetched updated message:', messageData)

          if (messageData) {
            const transformedMessage = DataTransformer.toMessage(messageData as DbJoinedMessage)
            console.log('Transformed message:', transformedMessage)
            
            if (transformedMessage) {
              setMessages(prev => {
                const messageIndex = prev.findIndex(msg => msg.id === transformedMessage.id)
                console.log('Updating messages:', {
                  messageId: transformedMessage.id,
                  foundAtIndex: messageIndex,
                  currentMessages: prev.length
                })

                // Message exists in our current view
                if (messageIndex !== -1) {
                  const newMessages = [...prev]
                  newMessages[messageIndex] = transformedMessage
                  return newMessages
                }

                // Message doesn't exist in our view but should be included
                const belongsInContext = context.type === 'thread'
                  ? transformedMessage.parentMessageId === context.id
                  : (context.type === 'channel'
                    ? transformedMessage.channelId === context.id && !transformedMessage.parentMessageId
                    : transformedMessage.conversationId === context.id && !transformedMessage.parentMessageId)

                if (belongsInContext) {
                  // Add the message in the correct position based on timestamp
                  const newMessages = [...prev]
                  const insertIndex = newMessages.findIndex(msg => 
                    new Date(msg.createdAt) < new Date(transformedMessage.createdAt)
                  )
                  if (insertIndex === -1) {
                    newMessages.push(transformedMessage)
                  } else {
                    newMessages.splice(insertIndex, 0, transformedMessage)
                  }
                  return newMessages
                }

                return prev
              })
            }
          }
        }
      )
      .subscribe()

    return () => {
      messageChannel.unsubscribe()
    }
  }, [context.id, context.type, supabase])

  return {
    messages,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    isAtBottom,
    sendMessage,
    loadMore,
    checkIsAtBottom,
    scrollToBottom,
    handleMessagesChange
  }
} 